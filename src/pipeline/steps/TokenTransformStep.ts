import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import type { PipelineContext } from '../../domain/types.js';
import { logger } from '../../ui/logger.js';

export async function executeTokenTransformStep(ctx: PipelineContext): Promise<void> {
  const { replacements } = ctx.template.config;
  if (!replacements) return;

  const answers = ctx.answers;

  // Si scope está definido en answers o en options, asegurar formato con arroba (@org)
  const rawScope = (answers.scope ?? ctx.options.scope ?? '') as string;
  const scope = rawScope ? (rawScope.startsWith('@') ? rawScope : `@${rawScope}`) : '';
  const projectName = String(answers.PROJECT_NAME ?? ctx.options.projectName ?? '');
  const scopedName = scope ? `${scope}/${projectName}` : projectName;

  // Extracción de devPort si existe
  const devPort = answers.devPort ?? answers.DEV_PORT ?? '';

  const enrichedAnswers: Record<string, string | boolean> = {
    ...answers,
    ...(scope ? { scope, SCOPE: scope } : {}),
    ...(scopedName ? { scopedName, SCOPED_NAME: scopedName } : {}),
    ...(devPort ? { devPort: String(devPort), DEV_PORT: String(devPort) } : {}),
  };

  const globalTokens: Record<string, string> = {};
  for (const [key, val] of Object.entries(enrichedAnswers)) {
    const strVal = String(val);
    globalTokens[`{{${key}}}`] = strVal;
    globalTokens[`__${key}__`] = strVal;
    globalTokens[`$${key}`] = strVal;
  }

  // Tokens adicionales explícitos para Handlebars / Mustache
  if (scope) {
    globalTokens['{{scope}}'] = scope;
    globalTokens['{{scopedName}}'] = scopedName;
  }
  if (devPort) {
    globalTokens['{{devPort}}'] = String(devPort);
  }

  if (ctx.options.dryRun) {
    logger.dryRunNotice(`[TokenTransformStep] Simulación de reemplazo de tokens: ${Object.keys(globalTokens).join(', ')}`);
    return;
  }

  if ('files' in replacements && 'tokens' in replacements) {
    const filePatterns = replacements.files;
    const tokenMap = replacements.tokens;

    const matchedFiles = findTargetFiles(ctx.targetPath, filePatterns);

    for (const filePath of matchedFiles) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      for (const [tokenPlaceholder, varName] of Object.entries(tokenMap)) {
        const replacementVal = answers[varName] !== undefined ? String(answers[varName]) : globalTokens[tokenPlaceholder];
        if (replacementVal !== undefined && content.includes(tokenPlaceholder)) {
          content = content.replaceAll(tokenPlaceholder, replacementVal);
          modified = true;
        }
      }

      for (const [token, val] of Object.entries(globalTokens)) {
        if (content.includes(token)) {
          content = content.replaceAll(token, val);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }

  if (Array.isArray(replacements)) {
    for (const rule of replacements) {
      const matchedFiles = findTargetFiles(ctx.targetPath, rule.files);

      let targetTo = rule.to;
      for (const [token, val] of Object.entries(globalTokens)) {
        targetTo = targetTo.replaceAll(token, val);
      }

      for (const filePath of matchedFiles) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(rule.from)) {
          if (rule.all !== false) {
            content = content.replaceAll(rule.from, targetTo);
          } else {
            content = content.replace(rule.from, targetTo);
          }
          fs.writeFileSync(filePath, content, 'utf8');
        }
      }
    }
  }

  const commonFiles = ['package.json', 'README.md', 'infrastructure/package.json'];
  for (const relPath of commonFiles) {
    const absPath = path.join(ctx.targetPath, relPath);
    if (fs.existsSync(absPath)) {
      let content = fs.readFileSync(absPath, 'utf8');
      let modified = false;
      for (const [token, val] of Object.entries(globalTokens)) {
        if (content.includes(token)) {
          content = content.replaceAll(token, val);
          modified = true;
        }
      }

      // Si es el package.json principal y se especificó un scope explícito,
      // asegurar que "name" quede como "{{scope}}/{{projectName}}" si no fue ya reemplazado
      if (relPath === 'package.json' && scope) {
        try {
          const pkg = JSON.parse(content);
          if (pkg.name && !pkg.name.startsWith('@')) {
            pkg.name = `${scope}/${pkg.name.replace(/^@[^/]+\//, '')}`;
            content = JSON.stringify(pkg, null, 2) + '\n';
            modified = true;
          }
        } catch {
          // Si el archivo no es JSON válido (o aún tiene tokens), continuar con reemplazo de texto
        }
      }

      if (modified) {
        fs.writeFileSync(absPath, content, 'utf8');
      }
    }
  }
}

function findTargetFiles(baseDir: string, patterns: string[]): string[] {
  const results: Set<string> = new Set();
  for (const pattern of patterns) {
    const directPath = path.join(baseDir, pattern);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
      results.add(directPath);
      continue;
    }

    try {
      const matched = fg.sync(pattern, {
        cwd: baseDir,
        absolute: true,
        onlyFiles: true,
        ignore: ['**/node_modules/**', '**/.git/**'],
      });
      matched.forEach((file: string) => results.add(file));
    } catch {
      // Ignorar patrones invalidos
    }
  }
  return Array.from(results);
}

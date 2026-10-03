import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import type { PipelineContext } from '../../domain/types.js';
import { logger } from '../../ui/logger.js';

export async function executeTokenTransformStep(ctx: PipelineContext): Promise<void> {
  const { replacements } = ctx.template.config;
  if (!replacements) return;

  const answers = ctx.answers;

  const globalTokens: Record<string, string> = {};
  for (const [key, val] of Object.entries(answers)) {
    const strVal = String(val);
    globalTokens[`{{${key}}}`] = strVal;
    globalTokens[`__${key}__`] = strVal;
    globalTokens[`$${key}`] = strVal;
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

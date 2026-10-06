import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { ScaffoldOptions, Template } from '../domain/types.js';
import type { PromptDefinition } from '../domain/schemas.js';
import { GitHubTemplateProvider } from '../infrastructure/github-provider.js';
import { LocalTemplateProvider } from '../infrastructure/local-provider.js';
import { GitExtractor } from '../infrastructure/git-extractor.js';
import { ExecaShellRunner } from '../infrastructure/shell-runner.js';
import { ScaffoldPipeline } from '../pipeline/pipeline.js';
import { getBanner } from '../ui/banner.js';
import { renderPreflightSummary, renderSuccessBox, renderErrorCard } from '../ui/boxes.js';
import { renderProjectTree } from '../ui/tree.js';
import { renderContextBadge } from '../ui/badge.js';
import { theme } from '../ui/theme.js';

declare const __PKG_VERSION__: string;

export interface CreateCommandOptions {
  template?: string;
  dryRun?: boolean;
  verbose?: boolean;
  yes?: boolean;
  nonInteractive?: boolean;
  var?: string[];
  targetDir?: string;
}

export function parseCliVars(rawVars?: string | string[]): Record<string, string> {
  const cliVars: Record<string, string> = {};
  if (!rawVars) return cliVars;

  const entries = Array.isArray(rawVars) ? rawVars : [rawVars];
  for (const entry of entries) {
    if (!entry) continue;
    const separatorIdx = entry.indexOf('=');
    if (separatorIdx === -1) {
      const key = entry.trim();
      if (key) {
        cliVars[key] = '';
      }
    } else {
      const key = entry.slice(0, separatorIdx).trim();
      const value = entry.slice(separatorIdx + 1).trim();
      if (key) {
        cliVars[key] = value;
      }
    }
  }

  return cliVars;
}

export interface ResolveAnswersParams {
  projectName: string;
  prompts: PromptDefinition[];
  cliVars?: Record<string, string>;
  isNonInteractive?: boolean;
}

export async function resolvePromptAnswers(
  params: ResolveAnswersParams,
  askHooks?: {
    askSelect?: (prompt: PromptDefinition) => Promise<string | symbol>;
    askConfirm?: (prompt: PromptDefinition) => Promise<boolean | symbol>;
    askText?: (prompt: PromptDefinition) => Promise<string | symbol>;
  },
): Promise<Record<string, string | boolean>> {
  const { projectName, prompts, cliVars = {}, isNonInteractive = false } = params;

  const answers: Record<string, string | boolean> = {
    PROJECT_NAME: projectName,
    ...cliVars,
  };

  for (const promptDef of prompts) {
    if (promptDef.name === 'PROJECT_NAME' && projectName) {
      continue;
    }

    // 1. Si vino por --var, usarlo directamente (máxima prioridad)
    if (cliVars[promptDef.name] !== undefined) {
      const rawVal = cliVars[promptDef.name]!;
      if (promptDef.type === 'confirm') {
        const lower = rawVal.toLowerCase();
        answers[promptDef.name] = lower === 'true' || lower === '1' || lower === 'yes';
      } else {
        answers[promptDef.name] = rawVal;
      }

      if (promptDef.validate && typeof answers[promptDef.name] === 'string') {
        const reg = new RegExp(promptDef.validate);
        if (!reg.test(answers[promptDef.name] as string)) {
          throw new Error(
            `El valor '${answers[promptDef.name]}' para '${promptDef.name}' no cumple con el formato requerido /${promptDef.validate}/.`,
          );
        }
      }
      continue;
    }

    // 2. Si estamos en modo no interactivo (--yes o --non-interactive)
    if (isNonInteractive) {
      if (promptDef.default !== undefined) {
        answers[promptDef.name] = promptDef.default;
        continue;
      }
      throw new Error(
        `Falta el valor requerido para '${promptDef.name}' en modo no interactivo. Suminístralo mediante --var ${promptDef.name}=<valor>.`,
      );
    }

    // 3. Flujo interactivo normal con @clack/prompts
    if (promptDef.type === 'select') {
      const choices = (promptDef.choices || []).map((c) => ({ value: c, label: c }));
      const ans = askHooks?.askSelect
        ? await askHooks.askSelect(promptDef)
        : await p.select({
            message: promptDef.message,
            options: choices,
            initialValue: promptDef.default as string,
          });

      if (p.isCancel(ans)) {
        throw new Error('CANCELED_BY_USER');
      }
      answers[promptDef.name] = ans as string;
    } else if (promptDef.type === 'confirm') {
      const ans = askHooks?.askConfirm
        ? await askHooks.askConfirm(promptDef)
        : await p.confirm({
            message: promptDef.message,
            initialValue: promptDef.default !== false,
          });

      if (p.isCancel(ans)) {
        throw new Error('CANCELED_BY_USER');
      }
      answers[promptDef.name] = ans as boolean;
    } else {
      const ans = askHooks?.askText
        ? await askHooks.askText(promptDef)
        : await p.text({
            message: promptDef.message,
            placeholder: String(promptDef.default ?? ''),
            defaultValue: String(promptDef.default ?? ''),
            validate: (val) => {
              if (promptDef.validate && val) {
                const reg = new RegExp(promptDef.validate);
                if (!reg.test(val)) {
                  return `Formato inválido. Debe cumplir con /${promptDef.validate}/`;
                }
              }
              return undefined;
            },
          });

      if (p.isCancel(ans)) {
        throw new Error('CANCELED_BY_USER');
      }
      answers[promptDef.name] = ans as string;
    }
  }

  return answers;
}

export async function runCreateCommand(
  rawName?: string,
  rawOptions: CreateCommandOptions = {},
): Promise<void> {
  const version = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '1.0.0';
  console.log(getBanner(version));

  const isNonInteractive = Boolean(rawOptions.yes || rawOptions.nonInteractive);
  const cliVars = parseCliVars(rawOptions.var);

  try {
    let projectName = rawName;
    if (!projectName) {
      if (isNonInteractive) {
        console.log(
          renderErrorCard(
            new Error('Falta el nombre del proyecto en modo no interactivo. Usa `scaffolder create <name>`.'),
          ),
        );
        process.exitCode = 1;
        return;
      }

      const input = await p.text({
        message: '¿Cuál es el nombre del nuevo proyecto?',
        placeholder: 'my-awesome-service',
        defaultValue: 'my-service',
        validate: (value) => {
          if (!value || value.trim().length === 0) return 'El nombre no puede estar vacío';
          if (!/^[a-z0-9-]+$/.test(value)) return 'Usa kebab-case (ej: my-awesome-service)';
          return undefined;
        },
      });

      if (p.isCancel(input)) {
        p.cancel('Operación cancelada.');
        return;
      }
      projectName = input as string;
    }

    if (!/^[a-z0-9-]+$/.test(projectName)) {
      console.log(
        renderErrorCard(
          new Error(`Nombre de proyecto inválido '${projectName}'. Usa kebab-case (ej: my-awesome-service).`),
        ),
      );
      process.exitCode = 1;
      return;
    }

    const githubProvider = new GitHubTemplateProvider('ricardogenaro99');
    const localProvider = new LocalTemplateProvider();

    let githubResult;
    let localResult;

    if (isNonInteractive) {
      try {
        githubResult = await githubProvider.listTemplates();
      } catch {
        githubResult = { templates: [], source: 'github' as const };
      }
      localResult = await localProvider.listTemplates();
    } else {
      const spin = p.spinner();
      spin.start('Cargando plantillas desde GitHub y almacén local...');
      try {
        githubResult = await githubProvider.listTemplates();
      } catch {
        githubResult = { templates: [], source: 'github' as const };
      }
      localResult = await localProvider.listTemplates();
      spin.stop('Plantillas cargadas.');
    }

    console.log(`  ${renderContextBadge({ source: 'github', user: 'ricardogenaro99', rateLimit: githubResult.rateLimit })}`);
    if (localResult.templates.length > 0) {
      console.log(`  ${renderContextBadge({ source: 'local' })}`);
    }
    console.log('');

    const allTemplates = [...localResult.templates, ...githubResult.templates];
    if (allTemplates.length === 0) {
      console.log(renderErrorCard(new Error('No hay plantillas disponibles en este momento.')));
      process.exitCode = 1;
      return;
    }

    let selectedTemplate: Template | undefined;
    if (rawOptions.template) {
      selectedTemplate = allTemplates.find(
        (t) =>
          t.id.toLowerCase() === rawOptions.template?.toLowerCase() ||
          t.id.endsWith(`/${rawOptions.template}`) ||
          t.name.toLowerCase() === rawOptions.template?.toLowerCase() ||
          t.id.replace('local:', '').toLowerCase() === rawOptions.template?.toLowerCase(),
      );
      if (!selectedTemplate) {
        console.log(
          renderErrorCard({
            name: 'TemplateNotFoundError',
            message: `No se encontró la plantilla '${rawOptions.template}'.`,
            suggestion: 'Ejecuta `scaffolder list` para ver los IDs de plantillas válidos.',
          }),
        );
        process.exitCode = 1;
        return;
      }
    } else {
      if (isNonInteractive) {
        console.log(
          renderErrorCard(
            new Error('Falta especificar la plantilla (--template <id>) en modo no interactivo.'),
          ),
        );
        process.exitCode = 1;
        return;
      }

      const templateChoices = allTemplates.map((t) => {
        const tagsFormatted = t.tags.map((tag) => theme.tag(tag)).join(' ');
        const sourceBadge = t.source === 'local' ? pc.blue('[Local]') : pc.cyan('[GitHub]');
        return {
          value: t,
          label: `${t.name} ${sourceBadge}`,
          hint: `${t.description} ${tagsFormatted}`,
        };
      });

      const selected = await p.select({
        message: 'Selecciona una plantilla para instanciar:',
        options: templateChoices,
      });

      if (p.isCancel(selected)) {
        p.cancel('Operación cancelada.');
        return;
      }
      selectedTemplate = selected as Template;
    }

    const promptsDef = selectedTemplate.config.prompts || [];

    let answers: Record<string, string | boolean>;
    try {
      answers = await resolvePromptAnswers({
        projectName,
        prompts: promptsDef,
        cliVars,
        isNonInteractive,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'CANCELED_BY_USER') {
        p.cancel('Operación cancelada.');
        return;
      }
      throw err;
    }

    const options: ScaffoldOptions = {
      projectName,
      templateId: selectedTemplate.id,
      dryRun: rawOptions.dryRun,
      verbose: rawOptions.verbose,
      yes: rawOptions.yes,
      nonInteractive: rawOptions.nonInteractive,
      targetDir: rawOptions.targetDir,
    };

    console.log(renderPreflightSummary(selectedTemplate, options, answers));

    if (!isNonInteractive && !rawOptions.dryRun) {
      const shouldProceed = await p.confirm({
        message: '¿Deseas proceder con la creación del proyecto?',
        initialValue: true,
      });

      if (p.isCancel(shouldProceed) || !shouldProceed) {
        p.cancel('Instanciación cancelada por el usuario.');
        return;
      }
    }

    const extractor = new GitExtractor();
    const shellRunner = new ExecaShellRunner();
    const pipeline = new ScaffoldPipeline(extractor, shellRunner);

    console.log('');
    const resultCtx = await pipeline.execute(selectedTemplate, options, answers);

    if (!options.dryRun) {
      console.log('');
      console.log(pc.bold(pc.cyan('📁 Estructura Generada (Project Tree View):')));
      console.log(renderProjectTree(resultCtx.targetPath, { injectedKeys: Object.keys(answers) }));

      const postInstall = selectedTemplate.config.postInstall;
      console.log(
        renderSuccessBox(
          projectName,
          resultCtx.targetPath,
          postInstall?.welcomeMessage,
          postInstall?.nextSteps,
        ),
      );
    } else {
      console.log(`\n  ${pc.bold(pc.yellow('✔ Simulación completada sin modificaciones en disco.'))}\n`);
    }
  } catch (err) {
    console.log('');
    const errorObj = err instanceof Error ? err : new Error(String(err));
    console.log(renderErrorCard(errorObj));
    process.exitCode = 1;
  }
}

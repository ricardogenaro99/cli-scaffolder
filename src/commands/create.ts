import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { ScaffoldOptions, Template } from '../domain/types.js';
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

export async function runCreateCommand(
  rawName?: string,
  rawOptions: { template?: string; dryRun?: boolean; verbose?: boolean } = {},
): Promise<void> {
  const version = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '1.0.0';
  console.log(getBanner(version));

  let projectName = rawName;
  if (!projectName) {
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

  const githubProvider = new GitHubTemplateProvider('ricardogenaro99');
  const localProvider = new LocalTemplateProvider();

  const spin = p.spinner();
  spin.start('Cargando plantillas desde GitHub y almacén local...');

  let githubResult;
  try {
    githubResult = await githubProvider.listTemplates();
  } catch {
    githubResult = { templates: [], source: 'github' as const };
  }
  const localResult = await localProvider.listTemplates();
  spin.stop('Plantillas cargadas.');

  console.log(`  ${renderContextBadge({ source: 'github', user: 'ricardogenaro99', rateLimit: githubResult.rateLimit })}`);
  if (localResult.templates.length > 0) {
    console.log(`  ${renderContextBadge({ source: 'local' })}`);
  }
  console.log('');

  const allTemplates = [...localResult.templates, ...githubResult.templates];
  if (allTemplates.length === 0) {
    console.log(renderErrorCard(new Error('No hay plantillas disponibles en este momento.')));
    return;
  }

  let selectedTemplate: Template | undefined;
  if (rawOptions.template) {
    selectedTemplate = allTemplates.find(
      (t) =>
        t.id.toLowerCase() === rawOptions.template?.toLowerCase() ||
        t.id.endsWith(`/${rawOptions.template}`) ||
        t.name.toLowerCase() === rawOptions.template?.toLowerCase(),
    );
    if (!selectedTemplate) {
      console.log(
        renderErrorCard({
          name: 'TemplateNotFoundError',
          message: `No se encontró la plantilla '${rawOptions.template}'.`,
          suggestion: 'Ejecuta `scaffold list` para ver los IDs de plantillas válidos.',
        }),
      );
      return;
    }
  } else {
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

  const answers: Record<string, string | boolean> = {
    PROJECT_NAME: projectName,
  };

  const promptsDef = selectedTemplate.config.prompts || [];

  for (const promptDef of promptsDef) {
    if (promptDef.name === 'PROJECT_NAME' && projectName) {
      continue;
    }

    if (promptDef.type === 'select') {
      const choices = (promptDef.choices || []).map((c) => ({ value: c, label: c }));
      const ans = await p.select({
        message: promptDef.message,
        options: choices,
        initialValue: promptDef.default as string,
      });
      if (p.isCancel(ans)) {
        p.cancel('Operación cancelada.');
        return;
      }
      answers[promptDef.name] = ans as string;
    } else if (promptDef.type === 'confirm') {
      const ans = await p.confirm({
        message: promptDef.message,
        initialValue: promptDef.default !== false,
      });
      if (p.isCancel(ans)) {
        p.cancel('Operación cancelada.');
        return;
      }
      answers[promptDef.name] = ans as boolean;
    } else {
      const ans = await p.text({
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
        p.cancel('Operación cancelada.');
        return;
      }
      answers[promptDef.name] = ans as string;
    }
  }

  const options: ScaffoldOptions = {
    projectName,
    templateId: selectedTemplate.id,
    dryRun: rawOptions.dryRun,
    verbose: rawOptions.verbose,
  };

  console.log(renderPreflightSummary(selectedTemplate, options, answers));

  if (!rawOptions.dryRun) {
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
  try {
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

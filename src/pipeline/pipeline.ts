import fs from 'node:fs';
import path from 'node:path';
import type { PipelineContext, ScaffoldOptions, Template } from '../domain/types.js';
import type { ITemplateExtractor } from '../ports/ITemplateExtractor.js';
import type { IShellRunner } from '../ports/IShellRunner.js';
import { executeValidationStep } from './steps/ValidationStep.js';
import { executeExtractionStep } from './steps/ExtractionStep.js';
import { executeTokenTransformStep } from './steps/TokenTransformStep.js';
import { executeEnvSetupStep } from './steps/EnvSetupStep.js';
import { executeGitInitStep } from './steps/GitInitStep.js';
import { executeHooksStep } from './steps/HooksStep.js';
import { executeCleanupStep } from './steps/CleanupStep.js';
import { logger } from '../ui/logger.js';
import pc from 'picocolors';

export class ScaffoldPipeline {
  constructor(
    private readonly extractor: ITemplateExtractor,
    private readonly shellRunner: IShellRunner,
  ) {}

  async execute(
    template: Template,
    options: ScaffoldOptions,
    answers: Record<string, string | boolean>,
  ): Promise<PipelineContext> {
    const targetPath = options.targetDir
      ? path.resolve(options.targetDir)
      : path.resolve(process.cwd(), options.projectName);

    const ctx: PipelineContext = {
      options,
      template,
      targetPath,
      answers: {
        PROJECT_NAME: options.projectName,
        ...answers,
      },
      createdTargetDir: false,
      logs: [],
    };

    const steps = [
      { name: 'Validación de entorno y parámetros', fn: () => executeValidationStep(ctx) },
      { name: 'Descarga y extracción de plantilla', fn: () => executeExtractionStep(ctx, this.extractor) },
      { name: 'Transformación y sustitución de tokens', fn: () => executeTokenTransformStep(ctx) },
      { name: 'Configuración de variables de entorno (.env)', fn: () => executeEnvSetupStep(ctx) },
      { name: 'Inicialización de repositorio Git virgen', fn: () => executeGitInitStep(ctx, this.shellRunner) },
      { name: 'Ejecución de hooks post-scaffold', fn: () => executeHooksStep(ctx, this.shellRunner) },
      { name: 'Limpieza de temporales y metadata', fn: () => executeCleanupStep(ctx) },
    ];

    const total = steps.length;

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]!;
        logger.startStep(i + 1, total, step.name);
        await step.fn();
        logger.successStep(step.name);
      }
      return ctx;
    } catch (err) {
      // Rollback automático si falló a mitad del proceso y creamos el directorio
      if (ctx.createdTargetDir && !options.dryRun && fs.existsSync(ctx.targetPath)) {
        console.log(`\n  ${pc.yellow('⚠ Deshaciendo cambios (Rollback): Eliminando directorio creado parcialmente...')} `);
        try {
          fs.rmSync(ctx.targetPath, { recursive: true, force: true });
        } catch {
          // Ignorar error al limpiar directorio
        }
      }
      throw err;
    }
  }
}

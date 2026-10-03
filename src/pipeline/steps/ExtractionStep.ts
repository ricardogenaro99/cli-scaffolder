import fs from 'node:fs';
import type { PipelineContext } from '../../domain/types.js';
import type { ITemplateExtractor } from '../../ports/ITemplateExtractor.js';
import { logger } from '../../ui/logger.js';

export async function executeExtractionStep(
  ctx: PipelineContext,
  extractor: ITemplateExtractor,
): Promise<void> {
  if (ctx.options.dryRun) {
    logger.dryRunNotice(`[ExtractionStep] Simulación: Copia/Clonación de plantilla de '${ctx.template.id}' a '${ctx.targetPath}'`);
    return;
  }

  if (!fs.existsSync(ctx.targetPath)) {
    fs.mkdirSync(ctx.targetPath, { recursive: true });
    ctx.createdTargetDir = true;
  }

  await extractor.extract(ctx.template, ctx.targetPath, { verbose: ctx.options.verbose });
}

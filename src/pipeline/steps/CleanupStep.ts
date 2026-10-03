import fs from 'node:fs';
import path from 'node:path';
import type { PipelineContext } from '../../domain/types.js';
import { logger } from '../../ui/logger.js';

export async function executeCleanupStep(ctx: PipelineContext): Promise<void> {
  const cleanupItems = ctx.template.config.cleanup;
  if (!cleanupItems || cleanupItems.length === 0) return;

  for (const item of cleanupItems) {
    const absPath = path.join(ctx.targetPath, item);

    if (ctx.options.dryRun) {
      logger.dryRunNotice(`[CleanupStep] Simulación: Eliminando '${item}'`);
      continue;
    }

    if (fs.existsSync(absPath)) {
      try {
        fs.rmSync(absPath, { recursive: true, force: true });
      } catch {
        // Ignorar fallos de eliminación de temporales
      }
    }
  }
}

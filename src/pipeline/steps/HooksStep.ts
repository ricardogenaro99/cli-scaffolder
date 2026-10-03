import type { PipelineContext } from '../../domain/types.js';
import type { IShellRunner } from '../../ports/IShellRunner.js';
import { HookExecutionError } from '../../domain/errors.js';
import { logger } from '../../ui/logger.js';

export async function executeHooksStep(
  ctx: PipelineContext,
  shellRunner: IShellRunner,
): Promise<void> {
  const hooks = ctx.template.config.hooks;
  if (!hooks?.postScaffold || hooks.postScaffold.length === 0) return;

  for (const command of hooks.postScaffold) {
    if (ctx.options.dryRun) {
      logger.dryRunNotice(`[HooksStep] Simulación: Ejecución de hook '${command}'`);
      continue;
    }

    const res = await shellRunner.run(command, {
      cwd: ctx.targetPath,
      verbose: ctx.options.verbose,
    });

    if (res.exitCode !== 0) {
      throw new HookExecutionError(command, res.stderr || res.stdout);
    }
  }
}

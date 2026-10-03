import type { PipelineContext } from '../../domain/types.js';
import type { IShellRunner } from '../../ports/IShellRunner.js';
import { logger } from '../../ui/logger.js';

export async function executeGitInitStep(
  ctx: PipelineContext,
  shellRunner: IShellRunner,
): Promise<void> {
  const postInstall = ctx.template.config.postInstall;
  const shouldInit = postInstall?.initGit ?? true;

  if (!shouldInit) return;

  if (ctx.options.dryRun) {
    logger.dryRunNotice(`[GitInitStep] Simulación: git init -b master`);
    return;
  }

  const branch = ctx.template.defaultBranch || 'master';
  const initResult = await shellRunner.run(`git init -b ${branch}`, {
    cwd: ctx.targetPath,
    verbose: ctx.options.verbose,
  });

  if (initResult.exitCode === 0 && postInstall?.initialCommit) {
    await shellRunner.run('git add .', { cwd: ctx.targetPath, verbose: ctx.options.verbose });
    const commitMsg = postInstall.initialCommit.replaceAll('{{PROJECT_NAME}}', ctx.options.projectName);
    await shellRunner.run(`git commit -m "${commitMsg}"`, {
      cwd: ctx.targetPath,
      verbose: ctx.options.verbose,
    });
  }
}

import { execa } from 'execa';
import type { IShellRunner, RunCommandOptions, RunCommandResult } from '../ports/IShellRunner.js';

export class ExecaShellRunner implements IShellRunner {
  async run(command: string, options: RunCommandOptions): Promise<RunCommandResult> {
    try {
      const result = await execa(command, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdout: options.verbose ? 'inherit' : 'pipe',
        stderr: options.verbose ? 'inherit' : 'pipe',
        shell: true,
        reject: false,
      });

      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.exitCode ?? 0,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        stdout: '',
        stderr: errorMsg,
        exitCode: 1,
      };
    }
  }
}

export interface RunCommandOptions {
  cwd: string;
  verbose?: boolean;
  env?: Record<string, string>;
}

export interface RunCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface IShellRunner {
  run(command: string, options: RunCommandOptions): Promise<RunCommandResult>;
}

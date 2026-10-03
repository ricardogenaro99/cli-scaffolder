import pc from 'picocolors';
import figures from 'figures';

export class StepLogger {
  private startTime: number = 0;

  startStep(stepNum: number, totalSteps: number, name: string): void {
    this.startTime = Date.now();
    const prefix = pc.bold(pc.cyan(`[${stepNum}/${totalSteps}]`));
    console.log(`${prefix} ${pc.bold(name)}...`);
  }

  successStep(name: string, detail?: string): void {
    const elapsedSec = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const timeStr = pc.dim(`(${elapsedSec}s)`);
    const detailStr = detail ? ` ${pc.dim(`• ${detail}`)}` : '';
    console.log(`  ${pc.green(figures.tick)} ${pc.bold(name)}${detailStr} ${timeStr}`);
  }

  skipStep(name: string, reason: string): void {
    console.log(`  ${pc.yellow(figures.warning)} ${pc.bold(name)} ${pc.dim(`(omiso: ${reason})`)}`);
  }

  failStep(name: string, error: string): void {
    console.log(`  ${pc.red(figures.cross)} ${pc.bold(name)} - ${pc.red(error)}`);
  }

  dryRunNotice(action: string): void {
    console.log(`  ${pc.bold(pc.yellow('[DRY-RUN]'))} ${pc.dim(action)}`);
  }
}

export const logger = new StepLogger();

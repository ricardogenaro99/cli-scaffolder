import pc from 'picocolors';

export const theme = {
  brand: (text: string) => pc.cyan(pc.bold(text)),
  accent: (text: string) => pc.magenta(text),
  success: (text: string) => pc.green(text),
  warning: (text: string) => pc.yellow(text),
  error: (text: string) => pc.red(text),
  info: (text: string) => pc.blue(text),
  dim: (text: string) => pc.dim(text),
  bold: (text: string) => pc.bold(text),
  
  // Formatters
  title: (text: string) => pc.cyan(pc.bold(`\n=== ${text} ===\n`)),
  step: (stepNum: number, totalSteps: number, name: string) =>
    `${pc.cyan(pc.bold(`[${stepNum}/${totalSteps}]`))} ${pc.bold(name)}`,
  
  // Tag styling for fuzzy selector
  tag: (tag: string) => {
    const lower = tag.toLowerCase();
    if (lower.includes('node') || lower.includes('express') || lower.includes('vue')) {
      return pc.green(`[${tag}]`);
    }
    if (lower.includes('aws') || lower.includes('cdk') || lower.includes('cloud')) {
      return pc.yellow(`[${tag}]`);
    }
    if (lower.includes('nestjs') || lower.includes('serverless') || lower.includes('react')) {
      return pc.magenta(`[${tag}]`);
    }
    if (lower.includes('ts') || lower.includes('typescript')) {
      return pc.blue(`[${tag}]`);
    }
    return pc.cyan(`[${tag}]`);
  },
};

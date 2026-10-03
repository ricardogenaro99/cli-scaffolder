import pc from 'picocolors';
import type { RateLimitInfo } from '../domain/types.js';

export function renderContextBadge(options: {
  source: 'github' | 'local' | 'hybrid';
  user?: string;
  localPath?: string;
  rateLimit?: RateLimitInfo;
}): string {
  const { source, user = 'ricardogenaro99', localPath, rateLimit } = options;

  if (source === 'local') {
    return `${pc.blue('💻 Local')} ${pc.dim('•')} ${pc.dim(localPath ?? process.cwd())}`;
  }

  let apiInfo = '';
  if (rateLimit) {
    const remainingStr = `${rateLimit.remaining}/${rateLimit.limit}`;
    const colorFn = rateLimit.remaining < 100 ? pc.yellow : pc.green;
    apiInfo = ` ${pc.dim('•')} API: ${colorFn(remainingStr)}`;
  }

  return `${pc.cyan('☁️  GitHub')} ${pc.dim(`(@${user})`)}${apiInfo}`;
}

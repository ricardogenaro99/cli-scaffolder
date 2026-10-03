import pc from 'picocolors';

export function getBanner(version: string = '1.0.0'): string {
  const logo = `
  ███████╗ ██████╗ █████╗ ███████╗███████╗██████╗ ██╗     ██████╗ ███████╗██████╗ 
  ██╔════╝██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗██║     ██╔══██╗██╔════╝██╔══██╗
  ███████╗██║     ███████║█████╗  █████╗  ██║  ██║██║     ██║  ██║█████╗  ██████╔╝
  ╚════██║██║     ██╔══██║██╔══╝  ██╔══╝  ██║  ██║██║     ██║  ██║██╔══╝  ██╔══██╗
  ███████║╚██████╗██║  ██║██║     ██║     ██████╔╝███████╗██████╔╝███████╗██║  ██║
  ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═════╝ ╚══════╝╚═════╝ ╚══════╝╚═╝  ╚═╝
  `;

  const lines = logo.split('\n');
  const gradient = lines
    .map((line, idx) => {
      if (idx % 2 === 0) return pc.cyan(line);
      return pc.magenta(line);
    })
    .join('\n');

  const meta = `${pc.bold(pc.cyan('CLI Scaffolder'))} ${pc.dim(`v${version}`)} • ${pc.magenta('by @ricardogenaro99')}`;

  return `${gradient}\n  ${meta}\n`;
}

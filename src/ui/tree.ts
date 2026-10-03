import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';

export interface TreeOptions {
  maxDepth?: number;
  ignore?: string[];
  injectedKeys?: string[];
}

export function renderProjectTree(
  dirPath: string,
  options: TreeOptions = {},
): string {
  const { maxDepth = 3, ignore = ['node_modules', '.git', 'dist', 'coverage'], injectedKeys = [] } = options;

  if (!fs.existsSync(dirPath)) {
    return pc.dim(' (directorio no creado)');
  }

  const lines: string[] = [pc.bold(pc.cyan(`📁 ${path.basename(dirPath)}/`))];

  function walk(currentDir: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;

    let items: string[];
    try {
      items = fs.readdirSync(currentDir).filter((item) => !ignore.includes(item));
    } catch {
      return;
    }

    items.sort((a, b) => {
      const aIsDir = fs.statSync(path.join(currentDir, a)).isDirectory();
      const bIsDir = fs.statSync(path.join(currentDir, b)).isDirectory();
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const pointer = isLast ? '└── ' : '├── ';
      const itemPath = path.join(currentDir, item);
      const isDir = fs.statSync(itemPath).isDirectory();

      let formattedItem: string;
      if (isDir) {
        formattedItem = pc.bold(pc.blue(`📁 ${item}/`));
      } else {
        const ext = path.extname(item);
        if (item === 'package.json' || item === 'template.config.json' || item === '.env') {
          formattedItem = pc.green(pc.bold(`📄 ${item}`));
        } else if (ext === '.ts' || ext === '.js' || ext === '.json') {
          formattedItem = pc.cyan(`📄 ${item}`);
        } else {
          formattedItem = pc.dim(`📄 ${item}`);
        }
      }

      lines.push(`${prefix}${pointer}${formattedItem}`);

      if (isDir) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        walk(itemPath, nextPrefix, depth + 1);
      }
    });
  }

  walk(dirPath, '', 1);

  if (injectedKeys.length > 0) {
    lines.push('');
    lines.push(pc.dim(`  Tokens inyectados: ${injectedKeys.map((k) => pc.cyan(`{{${k}}}`)).join(', ')}`));
  }

  return lines.join('\n');
}

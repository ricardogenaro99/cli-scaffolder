import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type { ITemplateExtractor } from '../ports/ITemplateExtractor.js';
import type { Template } from '../domain/types.js';
import { ScaffolderError } from '../domain/errors.js';

export class GitExtractor implements ITemplateExtractor {
  async extract(template: Template, targetPath: string, options: { verbose?: boolean } = {}): Promise<void> {
    if (template.source === 'local' && template.localPath) {
      this.copyLocalDir(template.localPath, targetPath);
      return;
    }

    if (template.source === 'github') {
      const cloneUrl = template.repositoryUrl
        ? `${template.repositoryUrl}.git`
        : `https://github.com/${template.id}.git`;

      const branch = template.defaultBranch || 'master';

      try {
        const quietFlag = options.verbose ? '' : '--quiet';
        const cmd = `git clone --depth 1 --branch ${branch} ${quietFlag} "${cloneUrl}" "${targetPath}"`;
        execSync(cmd, { stdio: options.verbose ? 'inherit' : 'pipe' });

        // Eliminar directorio .git para dejar el repo virgen
        const gitFolder = path.join(targetPath, '.git');
        if (fs.existsSync(gitFolder)) {
          fs.rmSync(gitFolder, { recursive: true, force: true });
        }
      } catch (err) {
        throw new ScaffolderError(
          `Fallo al clonar la plantilla remota '${template.id}': ${err instanceof Error ? err.message : String(err)}`,
          'GIT_CLONE_FAILED',
          'Verifica tu conexión a internet o los permisos de acceso al repositorio en GitHub.',
        );
      }
    }
  }

  private copyLocalDir(srcDir: string, destDir: string): void {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const ignoreList = ['node_modules', '.git', 'dist', 'coverage', '.DS_Store'];

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      if (ignoreList.includes(entry.name)) continue;

      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        this.copyLocalDir(srcPath, destPath);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

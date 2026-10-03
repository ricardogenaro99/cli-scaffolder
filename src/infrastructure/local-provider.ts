import fs from 'node:fs';
import path from 'node:path';
import type { ITemplateProvider } from '../ports/ITemplateProvider.js';
import type { Template, TemplateDiscoveryResult } from '../domain/types.js';
import { TemplateConfigSchema } from '../domain/schemas.js';
import { TemplateNotFoundError } from '../domain/errors.js';

export class LocalTemplateProvider implements ITemplateProvider {
  private readonly searchDir: string;

  constructor(customDir?: string) {
    this.searchDir = customDir ?? process.env['LOCAL_TEMPLATES_DIR'] ?? path.join(process.cwd(), 'repos-templates');
  }

  async listTemplates(): Promise<TemplateDiscoveryResult> {
    const templates: Template[] = [];

    if (!fs.existsSync(this.searchDir)) {
      return { templates: [], source: 'local' };
    }

    try {
      const entries = fs.readdirSync(this.searchDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dirPath = path.join(this.searchDir, entry.name);
        const configPath = path.join(dirPath, 'template.config.json');

        if (fs.existsSync(configPath)) {
          try {
            const rawContent = fs.readFileSync(configPath, 'utf8');
            const parsedJson = JSON.parse(rawContent);
            const parsedConfig = TemplateConfigSchema.safeParse(parsedJson);

            if (parsedConfig.success) {
              const cfg = parsedConfig.data;
              templates.push({
                id: `local:${entry.name}`,
                name: cfg.name,
                description: cfg.description,
                category: cfg.category ?? 'Local Templates',
                order: cfg.order ?? 99,
                tags: cfg.tags.length > 0 ? cfg.tags : ['local'],
                source: 'local',
                defaultBranch: cfg.defaultBranch ?? 'master',
                config: cfg,
                localPath: dirPath,
              });
            }
          } catch {
            // Ignorar directorio con JSON corrupto
          }
        }
      }
    } catch {
      // Ignorar error al leer directorio local
    }

    templates.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

    return {
      templates,
      source: 'local',
    };
  }

  async getTemplate(id: string): Promise<Template> {
    const listResult = await this.listTemplates();
    const found = listResult.templates.find(
      (t) => t.id.toLowerCase() === id.toLowerCase() || t.id.replace('local:', '') === id,
    );
    if (!found) {
      throw new TemplateNotFoundError(id);
    }
    return found;
  }
}

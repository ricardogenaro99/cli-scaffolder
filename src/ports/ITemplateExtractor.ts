import type { Template } from '../domain/types.js';

export interface ITemplateExtractor {
  extract(template: Template, targetPath: string, options?: { verbose?: boolean }): Promise<void>;
}

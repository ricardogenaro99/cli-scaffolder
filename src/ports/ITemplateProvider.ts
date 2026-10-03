import type { Template, TemplateDiscoveryResult } from '../domain/types.js';

export interface ITemplateProvider {
  listTemplates(): Promise<TemplateDiscoveryResult>;
  getTemplate(id: string): Promise<Template>;
}

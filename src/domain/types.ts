import type { TemplateConfig } from './schemas.js';

export interface Template {
  id: string; // ej: "ricardogenaro99/aws-cdk-nestjs-archetype-template" o "local:my-template"
  name: string;
  description: string;
  category: string;
  order: number;
  tags: string[];
  source: 'github' | 'local';
  repositoryUrl?: string;
  defaultBranch: string;
  config: TemplateConfig;
  localPath?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface TemplateDiscoveryResult {
  templates: Template[];
  source: 'github' | 'local' | 'hybrid';
  rateLimit?: RateLimitInfo;
}

export interface ScaffoldOptions {
  projectName: string;
  templateId?: string;
  answers?: Record<string, string | boolean>;
  dryRun?: boolean;
  verbose?: boolean;
  targetDir?: string;
  yes?: boolean;
  nonInteractive?: boolean;
  var?: string[];
}

export interface StepLog {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  durationMs?: number;
  message?: string;
}

export interface PipelineContext {
  options: ScaffoldOptions;
  template: Template;
  targetPath: string;
  tempPath?: string;
  answers: Record<string, string | boolean>;
  createdTargetDir: boolean;
  logs: StepLog[];
}

import { z } from 'zod';

export const PromptTypeSchema = z.enum(['text', 'select', 'confirm']);

export const PromptDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[A-Z0-9_]+$/, 'El nombre de la variable debe estar en MAYÚSCULAS con guiones bajos (ej: PROJECT_NAME)'),
  type: PromptTypeSchema.default('text'),
  message: z.string().min(1, 'El mensaje del prompt es requerido'),
  default: z.union([z.string(), z.boolean()]).optional(),
  choices: z.array(z.string()).optional(),
  validate: z.string().optional(),
});

export const ReplacementRuleLegacySchema = z.object({
  files: z.array(z.string()).min(1),
  from: z.string(),
  to: z.string(),
  all: z.boolean().optional(),
});

export const ReplacementMapSchema = z.object({
  files: z.array(z.string()).min(1),
  tokens: z.record(z.string(), z.string()),
});

export const ReplacementsSchema = z.union([
  ReplacementMapSchema,
  z.array(ReplacementRuleLegacySchema),
]);

export const EnvSetupSchema = z.object({
  copyExample: z.boolean().default(true),
  source: z.string().default('.env.example'),
  target: z.string().default('.env'),
  tokens: z.record(z.string(), z.string()).optional(),
  set: z.record(z.string(), z.string()).optional(),
});

export const HooksSchema = z.object({
  postScaffold: z.array(z.string()).optional(),
});

export const PostInstallSchema = z.object({
  initGit: z.boolean().default(true),
  initialCommit: z.string().optional(),
  welcomeMessage: z.string().optional(),
  nextSteps: z.array(z.string()).optional(),
});

export const RequirementsSchema = z.object({
  node: z.string().optional(),
  packageManager: z.enum(['pnpm', 'npm', 'yarn', 'bun']).optional(),
});

export const TemplateConfigSchema = z.object({
  $schema: z.string().optional(),
  version: z.string().default('1.0.0'),
  schemaVersion: z.number().optional(),
  name: z.string().min(3, 'El nombre de la plantilla debe tener al menos 3 caracteres'),
  description: z.string().min(5, 'La descripción debe tener al menos 5 caracteres'),
  category: z.string().default('General'),
  order: z.number().int().default(99),
  defaultBranch: z.string().default('master'),
  tags: z.array(z.string()).default([]),
  requirements: RequirementsSchema.optional(),
  prompts: z.array(PromptDefinitionSchema).default([]),
  replacements: ReplacementsSchema.optional(),
  envSetup: EnvSetupSchema.optional(),
  hooks: HooksSchema.optional(),
  postInstall: PostInstallSchema.optional(),
  cleanup: z.array(z.string()).default([]),
});

export type PromptDefinition = z.infer<typeof PromptDefinitionSchema>;
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;
export type ReplacementMap = z.infer<typeof ReplacementMapSchema>;
export type ReplacementRuleLegacy = z.infer<typeof ReplacementRuleLegacySchema>;

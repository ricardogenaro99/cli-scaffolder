import { describe, it, expect } from 'vitest';
import { TemplateConfigSchema, PromptDefinitionSchema } from '../src/domain/schemas.js';

describe('Domain Schemas', () => {
  it('debe validar un prompt bien formado', () => {
    const validPrompt = {
      name: 'PROJECT_NAME',
      type: 'text',
      message: 'Nombre del proyecto:',
      default: 'my-app',
      validate: '^[a-z0-9-]+$',
    };

    const parsed = PromptDefinitionSchema.safeParse(validPrompt);
    expect(parsed.success).toBe(true);
  });

  it('debe rechazar nombres de variables en minúsculas en prompts', () => {
    const invalidPrompt = {
      name: 'project_name',
      message: 'Nombre:',
    };

    const parsed = PromptDefinitionSchema.safeParse(invalidPrompt);
    expect(parsed.success).toBe(false);
  });

  it('debe validar template.config.json con remplazos de mapa', () => {
    const rawConfig = {
      name: 'AWS CDK + NestJS Archetype',
      description: 'Plantilla serverless empresarial',
      category: 'Backend & Cloud',
      order: 1,
      prompts: [
        {
          name: 'PROJECT_NAME',
          message: 'Nombre:',
          default: 'my-service',
        },
      ],
      replacements: {
        files: ['package.json', 'README.md'],
        tokens: {
          '{{PROJECT_NAME}}': 'PROJECT_NAME',
        },
      },
      envSetup: {
        copyExample: true,
        source: '.env.example',
        target: '.env',
      },
      hooks: {
        postScaffold: ['pnpm install'],
      },
      postInstall: {
        initGit: true,
      },
      cleanup: ['template.config.json'],
    };

    const parsed = TemplateConfigSchema.safeParse(rawConfig);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('AWS CDK + NestJS Archetype');
      expect(parsed.data.category).toBe('Backend & Cloud');
    }
  });

  it('debe validar template.config.json con remplazos de array legacy', () => {
    const rawConfig = {
      name: 'Legacy Archetype',
      description: 'Plantilla legacy',
      replacements: [
        {
          files: ['package.json'],
          from: '"name": "old-name"',
          to: '"name": "{{PROJECT_NAME}}"',
          all: true,
        },
      ],
    };

    const parsed = TemplateConfigSchema.safeParse(rawConfig);
    expect(parsed.success).toBe(true);
  });
});

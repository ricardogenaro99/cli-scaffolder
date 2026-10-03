import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { LocalTemplateProvider } from '../src/infrastructure/local-provider.js';

describe('LocalTemplateProvider', () => {
  let tmpStore: string;

  beforeEach(() => {
    tmpStore = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffolder-templates-'));
    const tplDir = path.join(tmpStore, 'demo-template');
    fs.mkdirSync(tplDir, { recursive: true });
    fs.writeFileSync(
      path.join(tplDir, 'template.config.json'),
      JSON.stringify({
        name: 'Demo Local Template',
        description: 'Plantilla de prueba local',
        tags: ['demo', 'local'],
      }),
      'utf8',
    );
  });

  afterEach(() => {
    if (fs.existsSync(tmpStore)) {
      fs.rmSync(tmpStore, { recursive: true, force: true });
    }
  });

  it('debe descubrir plantillas locales con su template.config.json', async () => {
    const provider = new LocalTemplateProvider(tmpStore);
    const result = await provider.listTemplates();

    expect(result.source).toBe('local');
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0]!.name).toBe('Demo Local Template');
    expect(result.templates[0]!.tags).toContain('demo');
  });
});

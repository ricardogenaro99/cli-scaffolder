import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { executeTokenTransformStep } from '../src/pipeline/steps/TokenTransformStep.js';
import type { PipelineContext } from '../src/domain/types.js';

describe('TokenTransformStep', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffolder-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('debe reemplazar tokens {{PROJECT_NAME}} y {{STACK_PREFIX}} en archivos mapeados', async () => {
    const pkgPath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ name: '{{PROJECT_NAME}}', description: 'Stack {{STACK_PREFIX}}' }), 'utf8');

    const ctx: PipelineContext = {
      options: { projectName: 'my-cool-app' },
      template: {
        id: 'test-template',
        name: 'Test',
        description: 'Test',
        category: 'Test',
        order: 1,
        tags: [],
        source: 'local',
        defaultBranch: 'main',
        config: {
          version: '1.0.0',
          name: 'Test',
          description: 'Test',
          category: 'General',
          order: 1,
          defaultBranch: 'main',
          tags: [],
          prompts: [],
          cleanup: [],
          replacements: {
            files: ['package.json'],
            tokens: {
              '{{PROJECT_NAME}}': 'PROJECT_NAME',
              '{{STACK_PREFIX}}': 'STACK_PREFIX',
            },
          },
        },
      },
      targetPath: tmpDir,
      answers: {
        PROJECT_NAME: 'my-cool-app',
        STACK_PREFIX: 'MyCoolAppStack',
      },
      createdTargetDir: false,
      logs: [],
    };

    await executeTokenTransformStep(ctx);

    const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    expect(updatedPkg.name).toBe('my-cool-app');
    expect(updatedPkg.description).toBe('Stack MyCoolAppStack');
  });
});

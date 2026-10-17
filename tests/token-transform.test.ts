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

  it('debe propagar {{scope}}, {{scopedName}} y asegurar name scoped en package.json sin corromper sintaxis', async () => {
    const pkgPath = path.join(tmpDir, 'package.json');
    const initialPkg = {
      name: '{{scopedName}}',
      version: '1.0.0',
      description: 'Paquete de organización {{scope}}',
      scripts: {
        dev: 'next dev -p {{devPort}}',
        start: 'node dist/index.js',
      },
    };
    fs.writeFileSync(pkgPath, JSON.stringify(initialPkg, null, 2), 'utf8');

    const ctx: PipelineContext = {
      options: { projectName: 'billing-service', scope: '@genaryth' },
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
            tokens: {},
          },
        },
      },
      targetPath: tmpDir,
      answers: {
        PROJECT_NAME: 'billing-service',
        scope: '@genaryth',
        devPort: '3001',
      },
      createdTargetDir: false,
      logs: [],
    };

    await executeTokenTransformStep(ctx);

    const updatedRaw = fs.readFileSync(pkgPath, 'utf8');
    // Verificar que el JSON es válido sintácticamente
    expect(() => JSON.parse(updatedRaw)).not.toThrow();
    const updatedPkg = JSON.parse(updatedRaw);

    expect(updatedPkg.name).toBe('@genaryth/billing-service');
    expect(updatedPkg.description).toBe('Paquete de organización @genaryth');
    expect(updatedPkg.scripts.dev).toBe('next dev -p 3001');
  });

  it('debe anteponer arroba @ automáticamente si el scope se pasa sin arroba (genaryth -> @genaryth)', async () => {
    const pkgPath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ name: '{{PROJECT_NAME}}', org: '{{scope}}' }), 'utf8');

    const ctx: PipelineContext = {
      options: { projectName: 'auth-service', scope: 'genaryth' },
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
            },
          },
        },
      },
      targetPath: tmpDir,
      answers: {
        PROJECT_NAME: 'auth-service',
      },
      createdTargetDir: false,
      logs: [],
    };

    await executeTokenTransformStep(ctx);

    const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    // Al tener scope definido en options, package.json name debe transformarse a scoped
    expect(updatedPkg.name).toBe('@genaryth/auth-service');
    expect(updatedPkg.org).toBe('@genaryth');
  });

  it('debe sustituir variables de puerto NestJS PORT={{devPort}} correctamente', async () => {
    const envPath = path.join(tmpDir, 'env-config.txt');
    fs.writeFileSync(envPath, 'PORT={{devPort}}\nHOST=0.0.0.0\nAPP_NAME={{scopedName}}\n', 'utf8');

    const ctx: PipelineContext = {
      options: { projectName: 'hub-web' },
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
            files: ['env-config.txt'],
            tokens: {},
          },
        },
      },
      targetPath: tmpDir,
      answers: {
        PROJECT_NAME: 'hub-web',
        scope: '@genaryth',
        devPort: '3002',
      },
      createdTargetDir: false,
      logs: [],
    };

    await executeTokenTransformStep(ctx);

    const content = fs.readFileSync(envPath, 'utf8');
    expect(content).toContain('PORT=3002');
    expect(content).toContain('APP_NAME=@genaryth/hub-web');
  });
});


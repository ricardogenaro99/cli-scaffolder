import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { parseCliVars, resolvePromptAnswers } from '../src/commands/create.js';
import type { PromptDefinition } from '../src/domain/schemas.js';
import { LocalTemplateProvider } from '../src/infrastructure/local-provider.js';
import { GitExtractor } from '../src/infrastructure/git-extractor.js';
import { ScaffoldPipeline } from '../src/pipeline/pipeline.js';
import type { IShellRunner } from '../src/ports/IShellRunner.js';

describe('Modo No Interactivo (--yes, --non-interactive) e Inyección de Variables (--var)', () => {
  describe('parseCliVars', () => {
    it('debe retornar objeto vacío si no se pasan variables', () => {
      expect(parseCliVars()).toEqual({});
      expect(parseCliVars(undefined)).toEqual({});
      expect(parseCliVars([])).toEqual({});
    });

    it('debe parsear lista de pares clave=valor correctamente', () => {
      const input = ['REPO_ABREV=KINPET', 'STACK_NAME=KinpetApiStack', 'AWS_REGION=us-east-1'];
      const result = parseCliVars(input);
      expect(result).toEqual({
        REPO_ABREV: 'KINPET',
        STACK_NAME: 'KinpetApiStack',
        AWS_REGION: 'us-east-1',
      });
    });

    it('debe soportar valores con signos de igualdad embebidos (=)', () => {
      const input = ['DATABASE_URL=postgres://user:pass@host:5432/db?ssl=true&timeout=10'];
      const result = parseCliVars(input);
      expect(result).toEqual({
        DATABASE_URL: 'postgres://user:pass@host:5432/db?ssl=true&timeout=10',
      });
    });

    it('debe limpiar espacios en blanco innecesarios en claves y valores', () => {
      const input = ['  REPO_ABREV  =  KINPET  '];
      const result = parseCliVars(input);
      expect(result).toEqual({
        REPO_ABREV: 'KINPET',
      });
    });

    it('debe aceptar un único string como argumento', () => {
      const result = parseCliVars('STAGE=production');
      expect(result).toEqual({
        STAGE: 'production',
      });
    });
  });

  describe('resolvePromptAnswers', () => {
    const prompts: PromptDefinition[] = [
      {
        name: 'REPO_ABREV',
        type: 'text',
        message: 'Abreviatura del repositorio',
        default: 'DEFAULT_ABREV',
        validate: '^[A-Z0-9_]+$',
      },
      {
        name: 'STACK_NAME',
        type: 'text',
        message: 'Nombre del stack',
        default: 'DefaultStack',
      },
      {
        name: 'AWS_REGION',
        type: 'select',
        message: 'Región de AWS',
        choices: ['us-east-1', 'us-west-2'],
        // Sin default a propósito
      },
      {
        name: 'ENABLE_AUTH',
        type: 'confirm',
        message: '¿Habilitar autenticación?',
        default: true,
      },
    ];

    it('en modo no interactivo, debe usar default para prompts que lo posean', async () => {
      const answers = await resolvePromptAnswers({
        projectName: 'my-service',
        prompts: [prompts[0]!, prompts[1]!],
        isNonInteractive: true,
      });

      expect(answers.PROJECT_NAME).toBe('my-service');
      expect(answers.REPO_ABREV).toBe('DEFAULT_ABREV');
      expect(answers.STACK_NAME).toBe('DefaultStack');
    });

    it('en modo no interactivo, variables en --var deben tener máxima prioridad sobre el default', async () => {
      const answers = await resolvePromptAnswers({
        projectName: 'my-service',
        prompts,
        cliVars: {
          REPO_ABREV: 'CUSTOM_ABREV',
          AWS_REGION: 'us-west-2',
          ENABLE_AUTH: 'false',
        },
        isNonInteractive: true,
      });

      expect(answers.REPO_ABREV).toBe('CUSTOM_ABREV');
      expect(answers.AWS_REGION).toBe('us-west-2');
      expect(answers.STACK_NAME).toBe('DefaultStack'); // Tomado del default
      expect(answers.ENABLE_AUTH).toBe(false); // Parseado de 'false' a booleano
    });

    it('en modo no interactivo, si falta una variable sin default y no se pasó en --var, debe lanzar error con el nombre de la variable', async () => {
      await expect(
        resolvePromptAnswers({
          projectName: 'my-service',
          prompts, // AWS_REGION no tiene default
          cliVars: {},
          isNonInteractive: true,
        }),
      ).rejects.toThrow(/Falta el valor requerido para 'AWS_REGION' en modo no interactivo/);
    });

    it('debe validar regex contra variables inyectadas mediante --var', async () => {
      await expect(
        resolvePromptAnswers({
          projectName: 'my-service',
          prompts,
          cliVars: {
            REPO_ABREV: 'invalid-lowercase!', // Falla regex ^[A-Z0-9_]+$
            AWS_REGION: 'us-east-1',
          },
          isNonInteractive: true,
        }),
      ).rejects.toThrow(/no cumple con el formato requerido/);
    });
  });

  describe('Instanciación E2E en Modo No Interactivo', () => {
    let tmpDir: string;
    let templatesDir: string;
    let targetProjectDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffolder-e2e-'));
      templatesDir = path.join(tmpDir, 'templates');
      targetProjectDir = path.join(tmpDir, 'output-project');
      fs.mkdirSync(templatesDir, { recursive: true });

      // Crear plantilla de prueba
      const sampleTplDir = path.join(templatesDir, 'demo-archetype');
      fs.mkdirSync(sampleTplDir, { recursive: true });

      fs.writeFileSync(
        path.join(sampleTplDir, 'template.config.json'),
        JSON.stringify({
          name: 'Demo Archetype',
          description: 'Plantilla de prueba para modo no interactivo',
          tags: ['test', 'e2e'],
          defaultBranch: 'main',
          prompts: [
            {
              name: 'REPO_ABREV',
              type: 'text',
              message: 'Abreviatura del repositorio',
              default: 'DEFAULT_ABREV',
            },
            {
              name: 'CUSTOM_VAR',
              type: 'text',
              message: 'Variable personalizada',
              // Sin default
            },
          ],
          replacements: {
            files: ['README.md', 'service.json'],
            tokens: {
              '{{REPO_ABREV}}': 'REPO_ABREV',
              '{{CUSTOM_VAR}}': 'CUSTOM_VAR',
            },
          },
          postInstall: {
            initGit: false,
          },
        }),
        'utf8',
      );

      fs.writeFileSync(
        path.join(sampleTplDir, 'README.md'),
        '# {{PROJECT_NAME}}\n\nRepo: {{REPO_ABREV}}\nVar: {{CUSTOM_VAR}}',
        'utf8',
      );

      fs.writeFileSync(
        path.join(sampleTplDir, 'service.json'),
        JSON.stringify({ project: '{{PROJECT_NAME}}', abrev: '{{REPO_ABREV}}' }),
        'utf8',
      );
    });

    afterEach(() => {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('debe ejecutar el pipeline completo con --yes y sustitución de tokens desde defaults y --var', async () => {
      const localProvider = new LocalTemplateProvider(templatesDir);
      const list = await localProvider.listTemplates();
      expect(list.templates.length).toBe(1);

      const template = list.templates[0]!;

      // Simular respuestas resueltas con --yes y --var
      const cliVars = parseCliVars(['CUSTOM_VAR=INJECTED_VALUE', 'REPO_ABREV=OVERRIDDEN_ABREV']);
      const answers = await resolvePromptAnswers({
        projectName: 'my-e2e-service',
        prompts: template.config.prompts,
        cliVars,
        isNonInteractive: true,
      });

      const extractor = new GitExtractor();
      const mockShellRunner: IShellRunner = {
        run: async () => ({ stdout: '', stderr: '', exitCode: 0 }),
      };
      const pipeline = new ScaffoldPipeline(extractor, mockShellRunner);

      const ctx = await pipeline.execute(
        template,
        {
          projectName: 'my-e2e-service',
          targetDir: targetProjectDir,
          yes: true,
        },
        answers,
      );

      expect(fs.existsSync(ctx.targetPath)).toBe(true);

      const readmeContent = fs.readFileSync(path.join(targetProjectDir, 'README.md'), 'utf8');
      expect(readmeContent).toContain('# my-e2e-service');
      expect(readmeContent).toContain('Repo: OVERRIDDEN_ABREV');
      expect(readmeContent).toContain('Var: INJECTED_VALUE');

      const jsonContent = JSON.parse(fs.readFileSync(path.join(targetProjectDir, 'service.json'), 'utf8'));
      expect(jsonContent.project).toBe('my-e2e-service');
      expect(jsonContent.abrev).toBe('OVERRIDDEN_ABREV');
    });

    it('debe ejecutar exitosamente el binario compilado dist/index.js con subcomando create y flags -y y --var', () => {
      const binPath = path.resolve(process.cwd(), 'dist/index.js');

      // Invocamos CLI en un subproceso real headless
      const cmd = `node "${binPath}" create cli-test-app --template "local:demo-archetype" --yes --var CUSTOM_VAR=FROM_CLI --dry-run`;
      
      const stdout = execSync(cmd, {
        env: {
          ...process.env,
          LOCAL_TEMPLATES_DIR: templatesDir,
        },
        encoding: 'utf8',
      });

      expect(stdout).toContain('Simulación completada sin modificaciones en disco');
      expect(stdout).toContain('FROM_CLI');
    });

    it('debe fallar con código de salida 1 en CLI si falta una variable requerida en modo --yes', () => {
      const binPath = path.resolve(process.cwd(), 'dist/index.js');

      // Invocamos CLI omitiendo CUSTOM_VAR (que no tiene default)
      const cmd = `node "${binPath}" create cli-test-app --template "local:demo-archetype" --yes --dry-run`;

      let errorThrown = false;
      try {
        execSync(cmd, {
          env: {
            ...process.env,
            LOCAL_TEMPLATES_DIR: templatesDir,
          },
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (err: unknown) {
        errorThrown = true;
        const execErr = err as { status?: number; stdout?: string | Buffer; stderr?: string | Buffer };
        expect(execErr.status).toBe(1);
        const combinedOutput = String(execErr.stdout || '') + String(execErr.stderr || '');
        expect(combinedOutput).toContain("Falta el valor requerido para 'CUSTOM_VAR' en modo no interactivo");
      }

      expect(errorThrown).toBe(true);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { getBundledSkillContent, installSkill } from '../src/commands/skill.js';

describe('Comando scaffolder skill (Agent-Native DX)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffolder-skill-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('debe obtener el contenido del skill empaquetado con frontmatter válido', () => {
    const content = getBundledSkillContent();
    expect(content).toContain('name: scaffolder');
    expect(content).toContain('Scaffolder CLI Integration & Archetype Automation');
    expect(content).toContain('ricardogenaro99/aws-cdk-nestjs-archetype-template');
  });

  it('debe instalar el skill localmente con la opción local y flag -y', async () => {
    const cwdBackup = process.cwd();
    try {
      process.chdir(tmpDir);

      await installSkill({ local: true, yes: true });

      const targetPath = path.join(tmpDir, '.agents', 'skills', 'scaffolder', 'SKILL.md');
      expect(fs.existsSync(targetPath)).toBe(true);

      const content = fs.readFileSync(targetPath, 'utf8');
      expect(content).toContain('name: scaffolder');
    } finally {
      process.chdir(cwdBackup);
    }
  });

  it('debe ejecutar el subproceso CLI con "scaffolder skill show" e imprimir el skill', () => {
    const binPath = path.resolve(process.cwd(), 'dist/index.js');
    const stdout = execSync(`node "${binPath}" skill show`, { encoding: 'utf8' });

    expect(stdout).toContain('name: scaffolder');
    expect(stdout).toContain('scaffolder create <name>');
  });

  it('debe ejecutar "scaffolder skill status" e informar el estado correctamente', () => {
    const binPath = path.resolve(process.cwd(), 'dist/index.js');
    const stdout = execSync(`node "${binPath}" skill status`, { encoding: 'utf8' });

    expect(stdout).toContain('Estado de Instalación del Skill de Scaffolder');
    expect(stdout).toContain('Global');
    expect(stdout).toContain('Local');
  });
});

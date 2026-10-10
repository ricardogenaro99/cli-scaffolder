import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import figures from 'figures';
import boxen from 'boxen';
import { renderErrorCard } from '../ui/boxes.js';

export interface SkillCommandOptions {
  global?: boolean;
  local?: boolean;
  yes?: boolean;
}

export function getBundledSkillPath(): string {
  const candidate1 = path.resolve(import.meta.dirname, '../skills/scaffolder/SKILL.md');
  if (fs.existsSync(candidate1)) return candidate1;

  const candidate2 = path.resolve(process.cwd(), 'skills/scaffolder/SKILL.md');
  if (fs.existsSync(candidate2)) return candidate2;

  return candidate1;
}

export function getBundledSkillContent(): string {
  const skillPath = getBundledSkillPath();
  if (fs.existsSync(skillPath)) {
    return fs.readFileSync(skillPath, 'utf8');
  }

  // Fallback si por alguna razón no se encuentra el archivo en disco
  return `---
name: scaffolder
description: >
  Uso y automatización del CLI @ricardogenaro99/scaffolder (v1.1.1+) para instanciar proyectos,
  microservicios e infraestructura desde plantillas de GitHub y almacén local.
---

# Scaffolder CLI Integration & Archetype Automation

Ejecución headless:
\`scaffolder create <name> --template <id> --yes --var KEY=VAL\`
`;
}

export async function runSkillCommand(
  action?: string,
  options: SkillCommandOptions = {},
): Promise<void> {
  const normalizedAction = action?.toLowerCase() || 'install';

  if (normalizedAction === 'show' || normalizedAction === 'cat') {
    const content = getBundledSkillContent();
    process.stdout.write(content + '\n');
    return;
  }

  if (normalizedAction === 'path') {
    const skillPath = getBundledSkillPath();
    console.log(skillPath);
    return;
  }

  if (normalizedAction === 'status') {
    const globalPath = path.join(os.homedir(), '.agents', 'skills', 'scaffolder', 'SKILL.md');
    const localPath = path.resolve(process.cwd(), '.agents', 'skills', 'scaffolder', 'SKILL.md');

    console.log('');
    console.log(pc.bold(pc.cyan('🤖 Estado de Instalación del Skill de Scaffolder:')));
    console.log(`  ${fs.existsSync(globalPath) ? pc.green(figures.tick) : pc.red(figures.cross)} Global (~/.agents/skills/scaffolder/SKILL.md): ${fs.existsSync(globalPath) ? pc.green('Instalado') : pc.dim('No instalado')}`);
    console.log(`  ${fs.existsSync(localPath) ? pc.green(figures.tick) : pc.yellow(figures.warning)} Local (.agents/skills/scaffolder/SKILL.md): ${fs.existsSync(localPath) ? pc.green('Instalado') : pc.dim('No instalado')}`);
    console.log('');
    return;
  }

  if (normalizedAction === 'install' || !action) {
    await installSkill(options);
    return;
  }

  console.log(
    renderErrorCard({
      name: 'UnknownSkillActionError',
      message: `Acción desconocida '${action}'.`,
      suggestion: 'Usa `scaffolder skill install`, `scaffolder skill show` o `scaffolder skill status`.',
    }),
  );
  process.exitCode = 1;
}

export async function installSkill(options: SkillCommandOptions = {}): Promise<void> {
  const isNonInteractive = Boolean(options.yes);
  let targetLocation: 'global' | 'local' = options.local ? 'local' : 'global';

  if (!isNonInteractive && !options.global && !options.local) {
    p.intro(pc.bold(pc.cyan('🤖 Instalador de Agent Skill (@ricardogenaro99/scaffolder)')));

    const choice = await p.select({
      message: '¿Dónde deseas instalar el skill para Agentes de IA?',
      options: [
        {
          value: 'global',
          label: '🌐 Global en ~/.agents/skills/scaffolder/SKILL.md (Recomendado)',
          hint: 'Disponible para Antigravity, Claude Code, Cursor, OpenClaw, Shelbot en todo tu sistema',
        },
        {
          value: 'local',
          label: '📁 Local en .agents/skills/scaffolder/SKILL.md',
          hint: 'Disponible solo dentro del repositorio actual',
        },
        {
          value: 'cancel',
          label: '🚪 Cancelar',
          hint: 'No realizar cambios',
        },
      ],
    });

    if (p.isCancel(choice) || choice === 'cancel') {
      p.cancel('Instalación del skill cancelada por el usuario.');
      return;
    }

    targetLocation = choice as 'global' | 'local';
  }

  const destinationDir =
    targetLocation === 'global'
      ? path.join(os.homedir(), '.agents', 'skills', 'scaffolder')
      : path.resolve(process.cwd(), '.agents', 'skills', 'scaffolder');

  const destinationFile = path.join(destinationDir, 'SKILL.md');
  const alreadyExists = fs.existsSync(destinationFile);

  if (alreadyExists && !isNonInteractive) {
    const shouldOverwrite = await p.confirm({
      message: `El skill ya existe en '${destinationFile}'. ¿Deseas sobreescribirlo con la última versión?`,
      initialValue: true,
    });

    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      p.cancel('Operación cancelada sin modificar el skill existente.');
      return;
    }
  }

  try {
    fs.mkdirSync(destinationDir, { recursive: true });
    const content = getBundledSkillContent();
    fs.writeFileSync(destinationFile, content, 'utf8');

    const lines = [
      `${pc.bold(pc.green(`${figures.tick} ¡Skill de Scaffolder instalado exitosamente!`))}`,
      '',
      `${pc.dim('Ubicación:')} ${pc.cyan(destinationFile)}`,
      `${pc.dim('Tipo:')}      ${targetLocation === 'global' ? pc.magenta('Global (~/.agents/skills/)') : pc.blue('Local del proyecto')}`,
      '',
      `${pc.bold(pc.cyan('Compatibilidad Detectada:'))}`,
      `  ${pc.green('✔')} Google DeepMind Antigravity`,
      `  ${pc.green('✔')} Claude Code (Anthropic)`,
      `  ${pc.green('✔')} OpenClaw / Shelbot`,
      `  ${pc.green('✔')} Cursor & Windsurf`,
      '',
      `${pc.dim('Cualquier agente de IA ahora puede instanciar plantillas con:')}`,
      `  ${pc.yellow('scaffolder create <name> --template <id> --yes --var KEY=VAL')}`,
    ];

    console.log(
      boxen(lines.join('\n'), {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderColor: 'cyan',
        borderStyle: 'round',
      }),
    );
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    console.log(renderErrorCard(errorObj));
    process.exitCode = 1;
  }
}

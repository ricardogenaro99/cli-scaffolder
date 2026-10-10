import { Command } from 'commander';
import { runMainMenu } from './commands/menu.js';
import { runCreateCommand, type CreateCommandOptions } from './commands/create.js';
import { runInitCommand } from './commands/init.js';
import { runListCommand } from './commands/list.js';
import { runSkillCommand, type SkillCommandOptions } from './commands/skill.js';

declare const __PKG_VERSION__: string;
declare const __PKG_NAME__: string;

const version = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '1.0.0';
const name = typeof __PKG_NAME__ !== 'undefined' ? __PKG_NAME__ : '@ricardogenaro99/scaffolder';

const program = new Command();

program
  .name('scaffolder')
  .description('CLI interactivo con arquitectura dinámica y DX de alto nivel para instanciar proyectos desde plantillas de GitHub y configurar repositorios como plantillas.')
  .version(`${name} v${version}`, '-v, --version', 'Muestra la versión actual del CLI');

// Subcomando explícito: create
program
  .command('create [name]')
  .description('Instancia un nuevo proyecto a partir de una plantilla')
  .option('-t, --template <id>', 'ID o nombre de la plantilla a instanciar (ej: ricardogenaro99/aws-cdk-nestjs-archetype-template)')
  .option('-d, --dry-run', 'Simula la ejecución sin modificar archivos en disco')
  .option('--verbose', 'Muestra la salida detallada de comandos y descargas')
  .option('-y, --yes', 'Modo no interactivo: usa defaults sin solicitar entradas por teclado')
  .option('--non-interactive', 'Alias de --yes')
  .option('--var <keyValuePair...>', 'Inyecta variables clave=valor (ej: --var KEY=VAL)')
  .action(async (name?: string, options?: CreateCommandOptions) => {
    await runCreateCommand(name, options);
  });

// Subcomando explícito: init
program
  .command('init')
  .description('Asistente interactivo para configurar el repositorio actual como plantilla (template.config.json)')
  .action(async () => {
    await runInitCommand();
  });

// Subcomando explícito: list
program
  .command('list')
  .description('Lista las plantillas disponibles en GitHub y en el almacén local')
  .action(async () => {
    await runListCommand();
  });

// Subcomando explícito: skill
program
  .command('skill [action]')
  .description('Instala o muestra el skill oficial de scaffolder para Agentes de IA (Antigravity, Claude Code, Cursor, Shelbot, etc.)')
  .option('-g, --global', 'Instala el skill globalmente en ~/.agents/skills/scaffolder/SKILL.md')
  .option('-l, --local', 'Instala el skill localmente en .agents/skills/scaffolder/SKILL.md')
  .option('-y, --yes', 'Instala sin solicitar confirmación interactiva')
  .action(async (action?: string, options?: SkillCommandOptions) => {
    await runSkillCommand(action, options);
  });

// Manejador por defecto (Invocación sin subcomando directo o atajo scaffolder <project-name>)
program.action(async (options, cmd) => {
  const args: string[] = cmd.args || [];
  
  if (args.length === 0) {
    // Modo Menú Principal
    await runMainMenu();
  } else {
    // Modo Directo / Atajo: scaffolder <project-name>
    const projectName = args[0];
    await runCreateCommand(projectName, options);
  }
});

program.parseAsync(process.argv).catch((err) => {
  console.error('Error fatal no controlado:', err);
  process.exit(1);
});

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { runCreateCommand } from './create.js';
import { runInitCommand } from './init.js';
import { runListCommand } from './list.js';

export async function runMainMenu(): Promise<void> {
  p.intro(pc.bold(pc.cyan('🚀 bienvenido a CLI Scaffolder (@ricardogenaro99/scaffolder)')));

  const action = await p.select({
    message: '¿Qué deseas hacer?',
    options: [
      {
        value: 'create',
        label: '🚀 Crear nuevo proyecto',
        hint: 'Inicia el selector de plantillas y preguntas dinámicas',
      },
      {
        value: 'init',
        label: '⚙️  Configurar repo como template',
        hint: 'Inicia el asistente de creación de template.config.json',
      },
      {
        value: 'list',
        label: '📋 Listar templates disponibles',
        hint: 'Muestra resumen de plantillas remotas en GitHub y locales',
      },
      {
        value: 'exit',
        label: '🚪 Salir',
        hint: 'Finalizar la sesión',
      },
    ],
  });

  if (p.isCancel(action) || action === 'exit') {
    p.outro(pc.dim('¡Hasta luego!'));
    return;
  }

  if (action === 'create') {
    await runCreateCommand();
  } else if (action === 'init') {
    await runInitCommand();
  } else if (action === 'list') {
    await runListCommand();
  }
}

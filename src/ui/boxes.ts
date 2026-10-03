import boxen from 'boxen';
import pc from 'picocolors';
import figures from 'figures';
import type { ScaffoldOptions, Template } from '../domain/types.js';

export function renderPreflightSummary(
  template: Template,
  options: ScaffoldOptions,
  answers: Record<string, string | boolean>,
): string {
  const lines: string[] = [
    `${pc.bold(pc.cyan('📋 Resumen Pre-Vuelo de Instanciación'))}`,
    '',
    `${pc.dim('Plantilla:')}     ${pc.magenta(template.name)} ${pc.dim(`(${template.id})`)}`,
    `${pc.dim('Proyecto:')}      ${pc.bold(pc.green(options.projectName))}`,
    `${pc.dim('Destino:')}       ${pc.dim(options.targetDir ?? `./${options.projectName}`)}`,
  ];

  if (options.dryRun) {
    lines.push(`${pc.dim('Modo:')}          ${pc.bold(pc.yellow('⚠ DRY-RUN (Simulación sin escribir a disco)'))}`);
  }

  const answerKeys = Object.keys(answers);
  if (answerKeys.length > 0) {
    lines.push('');
    lines.push(`${pc.bold(pc.cyan('Variables a Inyectar:'))}`);
    for (const key of answerKeys) {
      const val = String(answers[key]);
      lines.push(`  ${pc.dim('•')} ${pc.cyan(key)}: ${pc.green(val)}`);
    }
  }

  return boxen(lines.join('\n'), {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderColor: options.dryRun ? 'yellow' : 'cyan',
    borderStyle: 'round',
  });
}

export function renderErrorCard(error: Error & { code?: string; suggestion?: string }): string {
  const title = `${pc.bold(pc.red(`${figures.cross} Error: ${error.name || 'ScaffolderError'}`))}`;
  const codeStr = error.code ? pc.dim(` [${error.code}]`) : '';
  
  const lines: string[] = [
    `${title}${codeStr}`,
    '',
    pc.white(error.message),
  ];

  if (error.suggestion) {
    lines.push('');
    lines.push(`${pc.bold(pc.yellow(`${figures.warning} Sugerencia:`))}`);
    lines.push(pc.yellow(error.suggestion));
  }

  return boxen(lines.join('\n'), {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderColor: 'red',
    borderStyle: 'round',
  });
}

export function renderSuccessBox(
  projectName: string,
  targetDir: string,
  welcomeMessage?: string,
  nextSteps?: string[],
): string {
  const lines: string[] = [
    `${pc.bold(pc.green(`${figures.tick} ¡Proyecto '${projectName}' creado exitosamente!`))}`,
    `${pc.dim(`Ubicación: ${targetDir}`)}`,
  ];

  if (welcomeMessage) {
    lines.push('');
    lines.push(pc.cyan(welcomeMessage));
  }

  lines.push('');
  lines.push(`${pc.bold(pc.cyan('Próximos pasos sugeridos:'))}`);
  lines.push(`  ${pc.dim('1.')} cd ${projectName}`);

  if (nextSteps && nextSteps.length > 0) {
    nextSteps.forEach((step, idx) => {
      lines.push(`  ${pc.dim(`${idx + 2}.`)} ${step}`);
    });
  } else {
    lines.push(`  ${pc.dim('2.')} pnpm install`);
    lines.push(`  ${pc.dim('3.')} pnpm dev`);
  }

  return boxen(lines.join('\n'), {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderColor: 'green',
    borderStyle: 'round',
  });
}

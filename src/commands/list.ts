import pc from 'picocolors';
import { GitHubTemplateProvider } from '../infrastructure/github-provider.js';
import { LocalTemplateProvider } from '../infrastructure/local-provider.js';
import { getBanner } from '../ui/banner.js';
import { renderContextBadge } from '../ui/badge.js';
import { theme } from '../ui/theme.js';

declare const __PKG_VERSION__: string;

export async function runListCommand(_options: { verbose?: boolean } = {}): Promise<void> {
  const version = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '1.0.0';
  console.log(getBanner(version));

  const githubProvider = new GitHubTemplateProvider('ricardogenaro99');
  const localProvider = new LocalTemplateProvider();

  let githubResult;
  try {
    githubResult = await githubProvider.listTemplates();
  } catch {
    githubResult = { templates: [], source: 'github' as const };
  }

  const localResult = await localProvider.listTemplates();

  console.log(`  ${renderContextBadge({ source: 'github', user: 'ricardogenaro99', rateLimit: githubResult.rateLimit })}`);
  if (localResult.templates.length > 0) {
    console.log(`  ${renderContextBadge({ source: 'local' })}`);
  }
  console.log('');

  const allTemplates = [...localResult.templates, ...githubResult.templates];

  if (allTemplates.length === 0) {
    console.log(pc.yellow('  ⚠ No se encontraron plantillas disponibles.'));
    console.log(pc.dim('  Asegúrate de tener repositorios públicos en GitHub con el topic `scaffold-template`'));
    console.log(pc.dim('  o plantillas locales en el directorio `repos-templates/`.'));
    return;
  }

  console.log(pc.bold(pc.cyan('📋 Plantillas Disponibles para Instanciar:\n')));

  let currentCategory = '';
  allTemplates.forEach((template, index) => {
    if (template.category !== currentCategory) {
      currentCategory = template.category;
      console.log(`  ${pc.bold(pc.magenta(`── ${currentCategory} ──`))}`);
    }

    const sourceBadge = template.source === 'local' ? pc.blue('[Local]') : pc.cyan('[GitHub]');
    const tagsStr = template.tags.map((t) => theme.tag(t)).join(' ');

    console.log(`  ${pc.bold(pc.green(`${index + 1}. ${template.name}`))} ${sourceBadge}`);
    console.log(`     ${pc.dim('ID:')}          ${pc.cyan(template.id)}`);
    console.log(`     ${pc.dim('Descripción:')} ${template.description}`);
    if (tagsStr) {
      console.log(`     ${pc.dim('Tags:')}        ${tagsStr}`);
    }
    console.log('');
  });

  console.log(pc.dim('💡 Para instanciar una plantilla ejecuta:'));
  console.log(pc.cyan('   scaffold <nombre-proyecto> --template <id>'));
}

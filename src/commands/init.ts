import fs from 'node:fs';
import path from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import boxen from 'boxen';
import figures from 'figures';
import { TemplateConfigSchema, type PromptDefinition } from '../domain/schemas.js';
import { getBanner } from '../ui/banner.js';
import { renderErrorCard } from '../ui/boxes.js';

declare const __PKG_VERSION__: string;

export async function runInitCommand(): Promise<void> {
  const version = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '1.0.0';
  console.log(getBanner(version));

  console.log(pc.bold(pc.cyan('⚙️  Asistente de Autoría: Configuración de Repositorio como Plantilla\n')));

  const currentDir = process.cwd();
  const configPath = path.join(currentDir, 'template.config.json');

  if (fs.existsSync(configPath)) {
    const overwrite = await p.confirm({
      message: 'Ya existe un archivo template.config.json en este directorio. ¿Deseas sobrescribirlo?',
      initialValue: false,
    });
    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Operación cancelada.');
      return;
    }
  }

  const detected = {
    name: path.basename(currentDir),
    description: 'Plantilla de arquitectura de proyecto',
    hasPackageJson: fs.existsSync(path.join(currentDir, 'package.json')),
    hasEnvExample: fs.existsSync(path.join(currentDir, '.env.example')),
    hasCdk: fs.existsSync(path.join(currentDir, 'cdk.json')),
    pm: fs.existsSync(path.join(currentDir, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm',
  };

  if (detected.hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8'));
      if (pkg.name) detected.name = pkg.name;
      if (pkg.description) detected.description = pkg.description;
    } catch {
      // Usar valores detectados por defecto
    }
  }

  p.note(
    `Estructura auto-detectada:\n` +
      `  • Package Name: ${pc.cyan(detected.name)}\n` +
      `  • Gestor:       ${pc.green(detected.pm)}\n` +
      `  • .env.example: ${detected.hasEnvExample ? pc.green('Detectado') : pc.dim('No encontrado')}\n` +
      `  • AWS CDK:      ${detected.hasCdk ? pc.yellow('Detectado') : pc.dim('No encontrado')}`,
    'Inspección del Proyecto',
  );

  const nameAns = await p.text({
    message: 'Nombre visible de la plantilla:',
    initialValue: detected.name,
    validate: (val) => (!val || val.length < 3 ? 'Mínimo 3 caracteres' : undefined),
  });
  if (p.isCancel(nameAns)) return;

  const descAns = await p.text({
    message: 'Descripción clara de la plantilla:',
    initialValue: detected.description,
    validate: (val) => (!val || val.length < 5 ? 'Mínimo 5 caracteres' : undefined),
  });
  if (p.isCancel(descAns)) return;

  const categoryAns = await p.select({
    message: 'Categoría principal de la plantilla:',
    options: [
      { value: 'Backend & Cloud', label: 'Backend & Cloud (APIs, Serverless, AWS)' },
      { value: 'Frontend & UI', label: 'Frontend & UI (React, Next.js, Vue)' },
      { value: 'CLI & Tooling', label: 'CLI & Tooling (Herramientas de línea de comandos)' },
      { value: 'Microservices', label: 'Arquitectura de Microservicios' },
      { value: 'General', label: 'General / Otros' },
    ],
  });
  if (p.isCancel(categoryAns)) return;

  const defaultTags: string[] = [detected.pm];
  if (detected.hasCdk) defaultTags.push('aws-cdk');
  defaultTags.push('typescript');

  const tagsAns = await p.text({
    message: 'Etiquetas tecnológicas (separadas por comas):',
    initialValue: defaultTags.join(', '),
  });
  if (p.isCancel(tagsAns)) return;

  const tagsList = (tagsAns as string)
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const prompts: PromptDefinition[] = [
    {
      name: 'PROJECT_NAME',
      type: 'text',
      message: 'Nombre del proyecto (kebab-case):',
      default: 'my-service',
      validate: '^[a-z0-9-]+$',
    },
  ];

  const askExtraPrompts = await p.confirm({
    message: '¿Deseas agregar más variables dinámicas (ej: STACK_PREFIX, AWS_REGION)?',
    initialValue: true,
  });

  if (!p.isCancel(askExtraPrompts) && askExtraPrompts) {
    let addMore = true;
    while (addMore) {
      const varName = await p.text({
        message: 'Nombre de la variable en MAYÚSCULAS (ej: STACK_PREFIX):',
        validate: (v) => (!v || !/^[A-Z0-9_]+$/.test(v) ? 'Debe usar solo MAYÚSCULAS y guiones bajos' : undefined),
      });
      if (p.isCancel(varName)) break;

      const varMessage = await p.text({
        message: `Mensaje a mostrar para ${varName}:`,
        initialValue: `Ingrese el valor para ${varName}:`,
      });
      if (p.isCancel(varMessage)) break;

      const varDefault = await p.text({
        message: `Valor por defecto para ${varName} (opcional):`,
      });
      if (p.isCancel(varDefault)) break;

      prompts.push({
        name: varName as string,
        type: 'text',
        message: varMessage as string,
        default: (varDefault as string) || undefined,
      });

      const confirmMore = await p.confirm({
        message: '¿Agregar otra variable?',
        initialValue: false,
      });
      if (p.isCancel(confirmMore) || !confirmMore) {
        addMore = false;
      }
    }
  }

  const tokenMap: Record<string, string> = {
    '{{PROJECT_NAME}}': 'PROJECT_NAME',
  };
  prompts.forEach((pr) => {
    if (pr.name !== 'PROJECT_NAME') {
      tokenMap[`{{${pr.name}}}`] = pr.name;
    }
  });

  const templateConfigRaw = {
    $schema:
      'https://raw.githubusercontent.com/ricardogenaro99/cli-scaffolder/main/schemas/template.config.schema.json',
    version: '1.0.0',
    name: nameAns as string,
    description: descAns as string,
    category: categoryAns as string,
    order: 1,
    defaultBranch: 'master',
    tags: tagsList,
    requirements: {
      packageManager: detected.pm as 'pnpm' | 'npm',
    },
    prompts,
    replacements: {
      files: ['package.json', 'README.md'],
      tokens: tokenMap,
    },
    envSetup: detected.hasEnvExample
      ? {
          copyExample: true,
          source: '.env.example',
          target: '.env',
        }
      : undefined,
    hooks: {
      postScaffold: [`${detected.pm} install`],
    },
    postInstall: {
      initGit: true,
      welcomeMessage: '🚀 ¡Proyecto instanciado con éxito!',
    },
    cleanup: ['template.config.json', '.DS_Store'],
  };

  const validation = TemplateConfigSchema.safeParse(templateConfigRaw);
  if (!validation.success) {
    console.log(
      renderErrorCard({
        name: 'ValidationError',
        message: 'La configuración generada no cumple con la especificación.',
        suggestion: validation.error.message,
      }),
    );
    return;
  }

  fs.writeFileSync(configPath, JSON.stringify(validation.data, null, 2) + '\n', 'utf8');

  const instructions = [
    `${pc.bold(pc.green(`${figures.tick} ¡Archivo 'template.config.json' generado exitosamente!`))}`,
    '',
    `${pc.bold(pc.cyan('📌 Siguientes pasos para publicar tu plantilla en GitHub:'))}`,
    '',
    `1. ${pc.white('Haz commit y sube el archivo a GitHub:')}`,
    `   ${pc.cyan('git add template.config.json && git commit -m "feat: add template config" && git push')}`,
    '',
    `2. ${pc.white('Agrega el topic ')}${pc.bold(pc.yellow('scaffold-template'))}${pc.white(' al repositorio para que sea descubierto:')}`,
    `   ${pc.green('gh repo edit --add-topic scaffold-template')}`,
    '',
    `3. ${pc.white('Prueba tu plantilla localmente ejecutando:')}`,
    `   ${pc.cyan('scaffold create mi-prueba --template local:' + path.basename(currentDir))}`,
  ].join('\n');

  console.log(
    boxen(instructions, {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderColor: 'green',
      borderStyle: 'round',
    }),
  );
}

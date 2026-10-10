# 🚀 `@ricardogenaro99/scaffolder` (`scaffolder`)

> **CLI interactivo con Arquitectura Dinámica, Menú Interactivo, Paleta de Colores Semántica y High-End DX para instanciar proyectos desde plantillas de GitHub y convertir cualquier repositorio en plantilla.**

[![npm version](https://img.shields.io/npm/v/@ricardogenaro99/scaffolder.svg?color=cyan)](https://www.npmjs.com/package/@ricardogenaro99/scaffolder)
[![License: MIT](https://img.shields.io/badge/License-MIT-magenta.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.12.0-green)](https.nodejs.org)

---

## 📦 1. Identidad y Modos de Distribución

- **Repositorio en GitHub:** `ricardogenaro99/cli-scaffolder`
- **Nombre de Paquete en npm:** `@ricardogenaro99/scaffolder`
- **Comando Binario en Terminal:** `scaffolder`

### Vías de Ejecución Soportadas:
1. **Ejecución al vuelo vía `npx` (Recomendado):**
   ```bash
   npx @ricardogenaro99/scaffolder [command|project-name] [options]
   ```
2. **Instalación Global desde NPM:**
   ```bash
   pnpm add -g @ricardogenaro99/scaffolder
   # o bien: npm install -g @ricardogenaro99/scaffolder
   scaffolder --help
   ```
3. **Instalación Global Directa desde GitHub:**
   ```bash
   npm install -g ricardogenaro99/cli-scaffolder
   # o usando la URL de Git:
   npm install -g git+https://github.com/ricardogenaro99/cli-scaffolder.git
   ```
4. **Desarrollo Local:**
   ```bash
   git clone git@github.com:ricardogenaro99/cli-scaffolder.git
   cd cli-scaffolder
   pnpm install
   pnpm build
   pnpm link --global
   ```

---

## 🎯 2. Tres Modos de Entrada (User Entrypoints)

### Modo 1: Menú Principal Interactivo (`scaffolder`)
Invoca el comando `scaffolder` sin argumentos para desplegar un hub interactivo guiado por teclado:
```bash
scaffolder
```
- `🚀 Crear nuevo proyecto` → Inicia el selector fuzzy de plantillas y preguntas dinámicas.
- `⚙️  Configurar repo como template` → Inicia el asistente de creación de `template.config.json`.
- `📋 Listar templates disponibles` → Muestra tabla de plantillas remotas y locales.
- `🤖 Instalar / Gestionar Skill para Agentes de IA` → Asistente interactivo para configurar el skill para agentes.
- `🚪 Salir` → Finaliza la sesión limpiamente.

### Modo 2: Atajo Directo (`scaffolder <project-name>`)
Salta directo al selector de plantillas y preguntas dinámicas para dicho proyecto, omitiendo el menú principal:
```bash
scaffolder my-awesome-backend
```

### Modo 3: Subcomandos Explícitos & Automatización CI/CD / Headless
- **Instanciación interactiva directa:**
  ```bash
  scaffolder create my-service --template ricardogenaro99/aws-cdk-nestjs-archetype-template
  ```
- **Instanciación 100% desatendida / No interactiva (CI/CD, Agentes de IA, Scripts):**
  ```bash
  # Usando valores default declarados en template.config.json:
  scaffolder create billing-service --template ricardogenaro99/aws-cdk-nestjs-archetype-template --yes

  # Sobreescribiendo variables específicas con --var:
  scaffolder create kinpet-api \
    --template ricardogenaro99/aws-cdk-nestjs-archetype-template \
    --yes \
    --var REPO_ABREV=KINPET \
    --var STACK_NAME=KinpetApiStack \
    --var AWS_REGION=us-east-1
  ```
  - `-y, --yes` / `--non-interactive`: Omite spinners interactivos y confirmaciones de teclado. Resuelve prompts automáticamente con sus defaults o flags `--var`.
  - `--var <key=val...>`: Inyecta o sobreescribe variables dinámicas (soporta múltiples `--var` en la misma invocación).
  - `--dry-run`: Simula la ejecución sin modificar archivos en disco.
  - `--verbose`: Muestra salida detallada y streaming de comandos.
- **Gestión de Skill para Agentes de IA:**
  ```bash
  # Instalar skill globalmente (~/.agents/skills/scaffolder/SKILL.md):
  scaffolder skill install --global

  # Instalar skill en el repo actual (.agents/skills/scaffolder/SKILL.md):
  scaffolder skill install --local

  # Mostrar el contenido íntegro del skill para lectura directa por LLMs:
  scaffolder skill show

  # Consultar estado de instalación:
  scaffolder skill status
  ```
- **Asistente de autoría:**
  ```bash
  scaffolder init
  ```
- **Exploración de plantillas:**
  ```bash
  scaffolder list
  ```

---

## 🎨 3. Sistema de Diseño Visual y DX

El CLI incorpora una paleta de colores semántica construida con `picocolors`, `boxen`, `@clack/prompts` y `figures`:

- **Banner Inicial:** Logo ASCII degradado en cian/magenta con indicación de versión y autoría (`by @ricardogenaro99`).
- **Context Badge:** `☁️  GitHub (@ricardogenaro99) • API: 4980/5000` (verde/cian) o `💻 Local • <path>`.
- **Selector con Fuzzy Search & Tags:** Badges coloreados por tecnología (`[NodeJS]` en verde, `[AWS-CDK]` en amarillo, `[Serverless]` en magenta).
- **Summary Box Pre-Vuelo:** Tarjeta formateada con bordes redondeados (`boxen`) que resume las variables capturadas en cian antes de modificar el disco.
- **Barra de Progreso por Pasos:** Etapas numeradas (`[1/5]`) con cronómetro por paso en gris tenue (`✔ (1.1s)`).
- **Project Tree View Post-Scaffold:** Vista en árbol visual (`📁/📄`) destacando archivos clave en verde y tokens inyectados en cian.
- **Actionable Error Cards:** Tarjetas de error con borde rojo y bloque de sugerencia en amarillo (`💡 Sugerencia:`).
- **Rollback Automático:** Ante cualquier fallo en los hooks o extracción, se eliminan automáticamente las carpetas creadas parcialmente.

---

## ⚙️ 4. Contrato de Referencia (`template.config.json`)

Toda plantilla compatible incluye en la raíz el archivo `template.config.json` validado contra el esquema público:

```json
{
  "$schema": "https://raw.githubusercontent.com/ricardogenaro99/cli-scaffolder/main/schemas/template.config.schema.json",
  "version": "1.0.0",
  "name": "AWS CDK + NestJS Archetype",
  "description": "Plantilla empresarial backend con NestJS, TypeScript y AWS CDK v2",
  "category": "Backend & Cloud",
  "order": 1,
  "defaultBranch": "master",
  "tags": ["nestjs", "aws-cdk", "typescript", "serverless", "pnpm"],
  "prompts": [
    {
      "name": "PROJECT_NAME",
      "type": "text",
      "message": "Nombre del proyecto (kebab-case):",
      "default": "my-service",
      "validate": "^[a-z0-9-]+$"
    },
    {
      "name": "STACK_PREFIX",
      "type": "text",
      "message": "Prefijo de Stacks CDK (PascalCase):",
      "default": "MyService",
      "validate": "^[A-Z][a-zA-Z0-9]+$"
    }
  ],
  "replacements": {
    "files": ["package.json", "cdk.json", "README.md"],
    "tokens": {
      "{{PROJECT_NAME}}": "PROJECT_NAME",
      "{{STACK_PREFIX}}": "STACK_PREFIX"
    }
  },
  "envSetup": {
    "copyExample": true,
    "source": ".env.example",
    "target": ".env"
  },
  "hooks": {
    "postScaffold": [
      "pnpm install"
    ]
  },
  "postInstall": {
    "initGit": true,
    "welcomeMessage": "🚀 ¡Proyecto instanciado con éxito! Ejecuta 'pnpm start:local' para comenzar."
  },
  "cleanup": ["template.config.json", ".DS_Store"]
}
```

---

## 🤖 5. Soporte Nativo para Agentes de IA (Agent-Native DX)

`@ricardogenaro99/scaffolder` está diseñado como un **CLI Agent-First**. Incluye un skill oficial (`SKILL.md`) que dota a cualquier agente de IA de conocimiento completo sobre el CLI, la matriz de decisiones para variables y el protocolo de ejecución desatendida.

### Vía A: Instalación Automática mediante el CLI
1. **Desde el menú interactivo:** Ejecuta `scaffolder` y selecciona `🤖 Instalar / Gestionar Skill para Agentes de IA`. El CLI te preguntará si deseas instalarlo de forma global o local en el proyecto actual.
2. **Por comando de terminal:**
   ```bash
   # Instalación global (Recomendado para todo el sistema):
   scaffolder skill install --global -y

   # Instalación local (Para compartir dentro de un repositorio monorepo/equipo):
   scaffolder skill install --local -y

   # Mostrar el contenido para lectura directa de un LLM:
   scaffolder skill show
   ```

### Vía B: Configuración Manual desde el Repositorio
Si prefieres no utilizar el comando del CLI, puedes copiar el archivo fuente que reside en este repositorio:
* **Archivo fuente SSOT:** [`skills/scaffolder/SKILL.md`](skills/scaffolder/SKILL.md)
* **Destino Global:** Copia el archivo a `~/.agents/skills/scaffolder/SKILL.md` (o `~/.gemini/skills/` / `~/.claude/skills/`).
* **Destino Local:** Copia el archivo a `.agents/skills/scaffolder/SKILL.md` en la raíz de tu proyecto.

### Ecosistemas de IA Soportados:
- **Google DeepMind Antigravity:** Descubrimiento automático en `~/.agents/skills/` y `.gemini/skills/`.
- **Claude Code (Anthropic):** Reconocimiento inmediato de skills en la bóveda de herramientas.
- **OpenClaw / Shelbot:** Acceso nativo para orquestación personal y subprocesos.
- **Cursor & Windsurf:** Lectura de reglas y prompts de arquitectura para scaffolding autónomo.

---

## 🔑 6. Variables de Entorno

- **`GITHUB_TOKEN` / `GH_TOKEN`:** Token de acceso personal de GitHub para evitar límites de tasa (Rate Limit). El CLI también detecta automáticamente tokens activos vía `gh auth token`.
- **`LOCAL_TEMPLATES_DIR`:** Ruta personalizada para almacenamiento y prueba offline de plantillas locales.

---

## 🛠️ 6. Desarrollo y Testing

```bash
# Compilación rápida ESM con tsup
pnpm build

# Ejecutar suite de pruebas con Vitest
pnpm test

# Verificación de tipos y linting
pnpm typecheck
pnpm lint
```

---

## 📄 Licencia

Desarrollado por [Ricardo Genaro](https://github.com/ricardogenaro99) bajo la Licencia MIT.

---
name: scaffolder
description: >
  Uso y automatización del CLI `@ricardogenaro99/scaffolder` (v1.1.1+) para instanciar proyectos,
  microservicios e infraestructura desde plantillas de GitHub y almacén local.
  Actívala cuando el usuario mencione "scaffolder", "plantilla", "template", "archetype",
  "instanciar proyecto", "aws-cdk-nestjs-archetype-template", o cuando se requiera crear
  un nuevo microservicio backend con la arquitectura estándar de Ricardo Genaro / Genaryth.
---

# Scaffolder CLI Integration & Archetype Automation (`@ricardogenaro99/scaffolder`)

Este skill documenta la arquitectura, especificación de comandos y el protocolo de ejecución autónoma del CLI `@ricardogenaro99/scaffolder` (v1.1.1+, desarrollado por Ricardo Genaro). Está optimizado para que agentes de IA ejecuten tareas de scaffolding de forma desatendida (*headless*), con cero alucinación, sin bloqueos de teclado y con consumo mínimo de tokens.

---

## 1. Identidad, Distribución y Ejecución

* **Paquete npm:** [`@ricardogenaro99/scaffolder`](https://www.npmjs.com/package/@ricardogenaro99/scaffolder)
* **Binario en Terminal:** `scaffolder`
* **Vías de Ejecución Recomendadas:**
  1. **Al vuelo con `npx` (Siempre obtiene la última versión sin instalación previa):**
     ```bash
     npx @ricardogenaro99/scaffolder@latest create <name> [opciones]
     ```
  2. **Instalado globalmente (`scaffolder`):**
     ```bash
     scaffolder create <name> [opciones]
     ```

---

## 2. Comandos y Banderas del CLI

### `scaffolder list`
Lista las plantillas disponibles tanto en GitHub (repositorios del usuario `ricardogenaro99` con topic `scaffold-template`) como en el almacén local (`LOCAL_TEMPLATES_DIR` o `./repos-templates`). Muestra cuota restante de la GitHub API y badges con etiquetas tecnológicas.

### `scaffolder create [name] [opciones]`
Instancia un nuevo proyecto a partir de una plantilla.

| Opción | Alias | Descripción |
| :--- | :--- | :--- |
| `-t, --template <id>` | | ID o nombre de la plantilla (ej: `ricardogenaro99/aws-cdk-nestjs-archetype-template` o `local:<nombre>`). |
| `-y, --yes` | `--non-interactive` | **Modo Headless / No interactivo.** Suprime spinners interactivos y confirmaciones de teclado. Resuelve prompts automáticamente con `default` o `--var`. |
| `--var <key=value...>` | | **Inyección de variables.** Repetible. Sobreescribe variables dinámicas requeridas por la plantilla. Máxima prioridad. |
| `-d, --dry-run` | | Simula la ejecución sin realizar modificaciones en disco. |
| `--verbose` | | Salida detallada y streaming de comandos del pipeline. |

### `scaffolder init`
Asistente interactivo para analizar un repositorio existente y generar su archivo descriptor `template.config.json`.

### `scaffolder skill [action]`
Gestión del skill para agentes de IA:
* `scaffolder skill install [--global | --local] [-y]`: Instala el skill en `~/.agents/skills/scaffolder/SKILL.md` o en `.agents/skills/scaffolder/SKILL.md`.
* `scaffolder skill show`: Imprime el contenido íntegro del skill en Markdown por stdout.
* `scaffolder skill path`: Muestra la ruta física del archivo `SKILL.md` empaquetado en el CLI.

---

## 3. Contrato de Plantillas (`template.config.json`)

Toda plantilla compatible implementa un archivo `template.config.json` en su raíz con el siguiente contrato validado por esquema Zod:

1. **`prompts`:** Variables dinámicas requeridas por la plantilla (`name`, `type`, `message`, `default`, `validate`, `choices`).
2. **`replacements`:** Reglas de búsqueda y sustitución (`files`, `tokens` o reglas `from` -> `to`).
3. **`envSetup`:** Inicialización de `.env` a partir de `.env.example` y asignación de variables.
4. **`hooks`:** Scripts ejecutados post-scaffold (ej. `postScaffold: ["pnpm install", "pnpm run format"]`).
5. **`postInstall`:** Configuración de Git (`initGit: true`, `initialCommit`, `welcomeMessage`, `nextSteps`).
6. **`cleanup`:** Archivos/carpetas a eliminar tras instanciar (ej. `template.config.json`).

---

## 4. Matriz de Decisiones Autónomas para Inputs

Cuando un agente de IA requiera instanciar una plantilla sin consultar interactivamente al usuario, debe aplicar las siguientes convenciones estándar de Ricardo Genaro / Genaryth:

| Variable | Tipo | Regla de Formato | Convención / Significado | Ejemplo |
| :--- | :--- | :--- | :--- | :--- |
| **`PROJECT_NAME`** | `text` | `^[a-z0-9-]+$` | Prefijo del producto/servicio en `kebab-case`. | `kinpet-api`, `billing-service` |
| **`PROJECT_DESCRIPTION`** | `text` | Texto formal | Propósito + Stack + Organización. | `Backend API e infraestructura con NestJS y AWS CDK para Kinpet (Genaryth)` |
| **`REPO_ABREV`** | `text` | `^[A-Z0-9_]+$` | 3 a 10 letras en MAYÚSCULAS sin guiones. Usado para rutas de SSM (`/<ABREV>/<STAGE>/`) y tags de CloudFormation. | `KINPET`, `BILLING` |
| **`STACK_NAME`** | `text` | `PascalCase` | Nombre del stack raíz en AWS CloudFormation. | `KinpetApiStack`, `BillingStack` |
| **`OWNER`** | `text` | Texto | Nombre de usuario o entidad responsable. | `ricardogenaro99` |
| **`AWS_REGION`** | `select` | Cadena | Región de despliegue en AWS (por defecto `us-east-1`). | `us-east-1` |

---

## 5. Protocolo de Ejecución para Agentes de IA (Modo Headless)

El CLI implementa modo desatendido nativo con resolución estricta de precedencia:
1. **Valor en `--var KEY=VALUE`** (máxima prioridad).
2. **Valor `default` declarado en `template.config.json`**.
3. **Código de salida 1 con error explícito** si una variable no tiene default y no se pasó por `--var`.

### Caso 1: Instanciación como Proyecto Independiente (Nuevo Repositorio)

```bash
scaffolder create billing-service \
  --template ricardogenaro99/aws-cdk-nestjs-archetype-template \
  --yes \
  --var REPO_ABREV=BILLING \
  --var STACK_NAME=BillingServiceStack \
  --var AWS_REGION=us-east-1
```

### Caso 2: Instanciación Dentro de un Monorepo Existente (ej. en `apps/api`)

Si la plantilla se instancia como un paquete/servicio dentro de un monorepo existente (ej. pnpm workspaces):

1. **Ejecutar Scaffolding en Carpeta Destino:**
   ```bash
   scaffolder create api \
     --template ricardogenaro99/aws-cdk-nestjs-archetype-template \
     --yes \
     --var PROJECT_NAME=api \
     --var REPO_ABREV=KINPET \
     --var STACK_NAME=KinpetApiStack \
     --var AWS_REGION=us-east-1
   ```
   *(O mover la carpeta resultante a `apps/api`).*

2. **Ajustes Críticos de Compatibilidad de Monorepo (Post-Scaffold):**
   * **Remover Script Bloqueante:** En el `package.json` de la subcarpeta creada, remover `"preinstall": "npx only-allow pnpm"` si existe, para evitar conflictos de instalación desde la raíz del monorepo.
   * **Empaquetador de Lambdas (`prepareBuild.ts`):** En `prepareBuild.ts`, asegurarse de que cualquier paquete interno del monorepo (con prefijo `workspace:*` o `@organizacion/`) sea empaquetado o excluido de `dependencies` antes de que el comando de build de Lambda ejecute `npm install` interno, evitando el error `EUNSUPPORTEDPROTOCOL`.
   * **Workspaces:** Registrar la ruta en el archivo `pnpm-workspace.yaml` raíz (incluyendo tanto `apps/api` como `apps/api/infrastructure`).
   * **Compilación Limpia:** Ejecutar `pnpm install` desde la raíz del monorepo y validar `pnpm run build` en el workspace generado.

---

## 6. Manejo de Errores y Diagnóstico Común

* **`TemplateValidationError` (Falta valor requerido):** Ocurre si un prompt no tiene `default` y no se suministró `--var NOMBRE=VALOR`. **Solución:** Agregar el flag `--var <NOMBRE>=<VALOR>` correspondiente.
* **`DirectoryNotEmptyError`:** La carpeta de destino ya existe y contiene archivos. **Solución:** Limpiar el directorio o especificar un nuevo nombre.
* **Rollback Automático:** Si el CLI falla a mitad del proceso (por ejemplo, en un hook post-scaffold o validación), elimina automáticamente los archivos creados parcialmente para evitar estados inconsistentes en disco.

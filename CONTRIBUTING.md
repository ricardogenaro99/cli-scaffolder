# 📖 Guía de Contribución: Creación de Repositorios Plantilla

Esta guía explica el flujo para crear, probar y registrar nuevos repositorios plantilla compatibles con `@ricardogenaro99/scaffolder` (`scaffold`).

---

## 🛠️ Pasos para Publicar una Nueva Plantilla

### Paso 1: Estructurar tu Repositorio
Crea un repositorio en GitHub con la estructura base de tu proyecto. Asegúrate de incluir un archivo `.env.example` si la plantilla requiere variables de entorno.

### Paso 2: Generar `template.config.json`
Ejecuta el asistente interactivo en la raíz del repositorio de tu plantilla:
```bash
npx @ricardogenaro99/scaffolder init
```
El asistente auto-detectará la presencia de `package.json`, `.env.example`, gestores de paquetes (`pnpm`/`npm`) y te guiará para registrar:
1. Nombre legible, descripción y categoría.
2. Etiquetas tecnológicas (`tags`) para la búsqueda con resaltado de color.
3. Variables dinámicas (`prompts`) en MAYÚSCULAS.
4. Mapeo de reemplazos de tokens en archivos (`package.json`, `cdk.json`, etc.).
5. Hooks de instalación (`pnpm install`, `pnpm run format`).

### Paso 3: Enlazar con el JSON Schema Público
Asegúrate de que tu `template.config.json` incluya la propiedad `$schema`:
```json
{
  "$schema": "https://raw.githubusercontent.com/ricardogenaro99/cli-scaffolder/main/schemas/template.config.schema.json",
  "name": "Mi Nueva Plantilla",
  "description": "..."
}
```
Esto habilita el autocompletado y validación de sintaxis en tiempo de edición en VS Code y editores compatibles.

### Paso 4: Publicar el Topic en GitHub
Para que el CLI descubra tu repositorio automáticamente vía GitHub API, asigna el topic `scaffold-template`:

```bash
gh repo edit --add-topic scaffold-template
```
O agrégalo manualmente desde la interfaz web de GitHub en la sección **About -> Topics**.

### Paso 5: Probar tu Plantilla Localmente
Puedes probar tu plantilla antes de hacer push o publicarla clonándola en tu directorio de plantillas locales o probándola con `--dry-run`:
```bash
export LOCAL_TEMPLATES_DIR="/ruta/a/tus/plantillas"
scaffolder create mi-prueba --template local:mi-nueva-plantilla --dry-run
```

---

## 🔬 Calidad y Reglas de Código para `cli-scaffolder`

Si deseas contribuir con cambios al motor del CLI:
1. Mantén la separación en capas (**Clean Architecture**): `domain/`, `ports/`, `infrastructure/`, `pipeline/`, `commands/`, `ui/`.
2. Escribe TypeScript estricto.
3. Asegúrate de incluir tests unitarios o de integración en Vitest para cada paso del pipeline o esquema nuevo.
4. Ejecuta la suite de comprobación antes de enviar un Pull Request:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test
   ```

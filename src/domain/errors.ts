export class ScaffolderError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'SCAFFOLDER_ERROR',
    public readonly suggestion?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class GitHubAuthError extends ScaffolderError {
  constructor(message: string, suggestion?: string) {
    super(
      message,
      'GITHUB_AUTH_ERROR',
      suggestion ?? 'Define la variable de entorno GITHUB_TOKEN o autentícate con `gh auth login`.',
    );
  }
}

export class TemplateNotFoundError extends ScaffolderError {
  constructor(templateId: string) {
    super(
      `No se encontró la plantilla '${templateId}'.`,
      'TEMPLATE_NOT_FOUND',
      'Ejecuta `scaffold list` para explorar las plantillas disponibles.',
    );
  }
}

export class TemplateValidationError extends ScaffolderError {
  constructor(message: string, suggestion?: string) {
    super(
      message,
      'TEMPLATE_VALIDATION_ERROR',
      suggestion ?? 'Verifica la estructura y sintaxis del archivo template.config.json.',
    );
  }
}

export class HookExecutionError extends ScaffolderError {
  constructor(command: string, details: string) {
    super(
      `Error al ejecutar el hook '${command}': ${details}`,
      'HOOK_EXECUTION_ERROR',
      'Revisa que los ejecutables y dependencias del proyecto estén instalados correctamente.',
    );
  }
}

export class DirectoryNotEmptyError extends ScaffolderError {
  constructor(targetDir: string) {
    super(
      `El directorio destino '${targetDir}' no está vacío.`,
      'DIRECTORY_NOT_EMPTY',
      'Elige un nombre de directorio diferente o vacía el directorio existente.',
    );
  }
}

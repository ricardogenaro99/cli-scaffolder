import fs from 'node:fs';
import type { PipelineContext } from '../../domain/types.js';
import { DirectoryNotEmptyError, TemplateValidationError } from '../../domain/errors.js';

export async function executeValidationStep(ctx: PipelineContext): Promise<void> {
  const { options, targetPath, template } = ctx;

  if (!options.dryRun && fs.existsSync(targetPath)) {
    const files = fs.readdirSync(targetPath);
    if (files.length > 0) {
      throw new DirectoryNotEmptyError(targetPath);
    }
  }

  // Validar respuestas obligatorias contra las definiciones de prompts
  for (const promptDef of template.config.prompts) {
    const answerVal = ctx.answers[promptDef.name];
    if (answerVal === undefined || answerVal === '') {
      if (promptDef.default !== undefined) {
        ctx.answers[promptDef.name] = promptDef.default;
      } else {
        throw new TemplateValidationError(
          `La variable obligatoria '${promptDef.name}' no fue proporcionada.`,
          `Proporciona un valor para '${promptDef.name}' o define un valor por defecto en la plantilla.`,
        );
      }
    }

    // Validar regex si está presente
    if (promptDef.validate && typeof ctx.answers[promptDef.name] === 'string') {
      const regex = new RegExp(promptDef.validate);
      const strVal = ctx.answers[promptDef.name] as string;
      if (!regex.test(strVal)) {
        throw new TemplateValidationError(
          `El valor '${strVal}' para '${promptDef.name}' no cumple con el patrón requerido: /${promptDef.validate}/`,
          `Ingresa un valor válido para '${promptDef.name}'.`,
        );
      }
    }
  }
}

import fs from 'node:fs';
import path from 'node:path';
import type { PipelineContext } from '../../domain/types.js';
import { logger } from '../../ui/logger.js';

export async function executeEnvSetupStep(ctx: PipelineContext): Promise<void> {
  const envSetup = ctx.template.config.envSetup;
  if (!envSetup) return;

  const sourceRel = envSetup.source ?? '.env.example';
  const targetRel = envSetup.target ?? '.env';

  const sourceAbs = path.join(ctx.targetPath, sourceRel);
  const targetAbs = path.join(ctx.targetPath, targetRel);

  if (ctx.options.dryRun) {
    logger.dryRunNotice(`[EnvSetupStep] Simulación: Copiando '${sourceRel}' a '${targetRel}'`);
    return;
  }

  if (envSetup.copyExample !== false && fs.existsSync(sourceAbs)) {
    let content = fs.readFileSync(sourceAbs, 'utf8');

    // Inyectar variables desde respuestas o configuraciones
    const setVars = { ...envSetup.tokens, ...envSetup.set };
    for (const [envKey, varPlaceholderOrVal] of Object.entries(setVars)) {
      let finalVal = varPlaceholderOrVal;

      // Si es un token {{NAME}}, resolverlo desde respuestas
      if (typeof varPlaceholderOrVal === 'string' && varPlaceholderOrVal.startsWith('{{') && varPlaceholderOrVal.endsWith('}}')) {
        const promptKey = varPlaceholderOrVal.slice(2, -2).trim();
        if (ctx.answers[promptKey] !== undefined) {
          finalVal = String(ctx.answers[promptKey]);
        }
      }

      const regex = new RegExp(`^${envKey}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${envKey}=${finalVal}`);
      } else {
        content += `\n${envKey}=${finalVal}`;
      }
    }

    fs.writeFileSync(targetAbs, content.trim() + '\n', 'utf8');
  }
}

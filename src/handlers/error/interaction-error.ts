import type { Interaction, RepliableInteraction } from "discord.js";
import { logger } from "../../libs/logger/index.ts";
import { AppError, toLogContext, toUserMessage } from "../../libs/errors/index.ts";
import { replyEphemeralError } from "../../libs/discord/index.ts";

const log = logger.child("interaction-error");

export interface InteractionErrorContext {
  scope: string;
  action?: string;
  fallbackMessage: string;
}

export async function handleInteractionError(
  interaction: Interaction,
  err: unknown,
  ctx: InteractionErrorContext,
): Promise<void> {
  const base = {
    scope: ctx.scope,
    action: ctx.action,
    guildId: interaction.guildId ?? undefined,
    userId: interaction.user.id,
    type: interaction.type,
    ...toLogContext(err),
  };

  if (err instanceof AppError && err.isUserSafe) {
    log.warn(`${ctx.scope} rejected`, base);
  } else {
    log.error(`${ctx.scope} failed`, base);
  }

  if (isRepliable(interaction)) {
    await replyEphemeralError(interaction, toUserMessage(err, ctx.fallbackMessage));
  }
}

function isRepliable(interaction: Interaction): interaction is RepliableInteraction {
  return "reply" in interaction && typeof (interaction as RepliableInteraction).reply === "function";
}

import {
  MessageFlags,
  type BaseMessageOptions,
  type Interaction,
  type InteractionReplyOptions,
  type Message,
  type MessageCreateOptions,
  type RepliableInteraction,
} from "discord.js";
import { logger } from "../logger/index.ts";

const log = logger.child("discord:safe");

type Sendable = { send(options: MessageCreateOptions | string): Promise<unknown> } | null | undefined;

export async function safeReply(
  interaction: RepliableInteraction,
  options: InteractionReplyOptions | string,
): Promise<void> {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(options as InteractionReplyOptions);
    } else {
      await interaction.reply(options as InteractionReplyOptions);
    }
  } catch (err) {
    log.warn("safeReply failed", err);
  }
}

export async function safeEditReply(
  interaction: RepliableInteraction,
  options: BaseMessageOptions | string,
): Promise<void> {
  try {
    await interaction.editReply(options);
  } catch (err) {
    log.warn("safeEditReply failed", err);
  }
}

export async function safeFollowUp(
  interaction: RepliableInteraction,
  options: InteractionReplyOptions | string,
): Promise<void> {
  try {
    await interaction.followUp(options);
  } catch (err) {
    log.warn("safeFollowUp failed", err);
  }
}

export async function replyEphemeralError(
  interaction: Interaction | RepliableInteraction,
  content: string,
): Promise<void> {
  if (!interaction.isRepliable()) return;
  await safeReply(interaction, { content, flags: MessageFlags.Ephemeral });
}

export async function safeSend(channel: Sendable, options: MessageCreateOptions | string): Promise<void> {
  if (!channel || typeof channel.send !== "function") return;
  try {
    await channel.send(options);
  } catch (err) {
    log.warn("safeSend failed", err);
  }
}

export async function safeMessageReply(message: Message, content: string): Promise<void> {
  try {
    await message.reply({ content, allowedMentions: { repliedUser: false, parse: [] } });
  } catch (err) {
    log.warn("safeMessageReply failed", err);
  }
}

import { EmbedBuilder } from "discord.js";
import { branding } from "../config/branding.ts";
import { colors, type ColorName } from "../config/colors.ts";
import { emojis } from "../emojis/index.ts";

export interface EmbedOptions {
  title?: string;
  description?: string;
  color?: ColorName;
  footer?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: boolean;
}

export function createEmbed(options: EmbedOptions): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(colors[options.color ?? "primary"]);
  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.fields?.length) embed.addFields(options.fields);
  embed.setFooter({ text: options.footer ?? branding.footers.default });
  if (options.timestamp) embed.setTimestamp();
  return embed;
}

export function createSuccessEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    color: "success",
    title: title ? `${emojis.success} ${title}` : undefined,
    description,
  });
}

export function createErrorEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    color: "error",
    title: title ? `${emojis.error} ${title}` : undefined,
    description,
  });
}

export function createInfoEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({ color: "info", title, description });
}

export const embeds = {
  create: createEmbed,
  success: createSuccessEmbed,
  error: createErrorEmbed,
  info: createInfoEmbed,
} as const;

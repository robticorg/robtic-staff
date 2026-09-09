import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { commonMessages } from "../../data/messages/common.ts";

const CONTENT_LIMIT = 1900;

function body(title: string, lines: (string | undefined)[]): string {
  return [title, "", ...lines.filter((l): l is string => l !== undefined)].join("\n");
}

function chunkContent(content: string): string[] {
  if (content.length <= CONTENT_LIMIT) return [content];
  const chunks: string[] = [];
  let current = "";
  for (const line of content.split("\n")) {
    if (line.length > CONTENT_LIMIT) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < line.length; i += CONTENT_LIMIT) {
        chunks.push(line.slice(i, i + CONTENT_LIMIT));
      }
      continue;
    }
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > CONTENT_LIMIT) {
      if (current) chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function replySuccess(
  interaction: ChatInputCommandInteraction,
  title: string,
  ...lines: (string | undefined)[]
): Promise<void> {
  await sendChunked(interaction, body(`${commonMessages.prefix.success} ${title}`, lines));
}

export async function replyFailure(
  interaction: ChatInputCommandInteraction,
  title: string,
  reason?: string,
): Promise<void> {
  await sendChunked(
    interaction,
    body(`${commonMessages.prefix.error} ${title}`, reason ? ["Reason:", reason] : []),
  );
}

export async function replyInfo(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  await sendChunked(interaction, content);
}

async function sendChunked(
  interaction: ChatInputCommandInteraction,
  content: string,
): Promise<void> {
  for (const chunk of chunkContent(content)) {
    await send(interaction, chunk);
  }
}

async function send(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
  if (interaction.deferred && !interaction.replied) {
    await interaction.editReply({ content });
  } else if (interaction.deferred || interaction.replied) {
    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
}

import type { TranscriptPayload } from "../services/transcript.service.ts";

interface EmbedLike {
  title?: string;
  description?: string;
  url?: string;
  image?: { url?: string };
  thumbnail?: { url?: string };
}

export function renderTranscriptText(payload: TranscriptPayload): string {
  const header = [
    `Ticket: ${payload.ticket.ticketId}`,
    `Panel: ${payload.ticket.panelId}`,
    `Opened by: ${payload.ticket.ownerId}`,
    payload.ticket.claimedByDiscordId ? `Claimed by: ${payload.ticket.claimedByDiscordId}` : undefined,
    `Status: ${payload.ticket.status}`,
    `Opened at: ${payload.ticket.createdAt}`,
    payload.ticket.closedAt ? `Closed at: ${payload.ticket.closedAt}` : undefined,
    "",
    "--- Conversation ---",
    "",
  ].filter((line): line is string => line !== undefined);

  const body: string[] = [];
  for (const m of payload.messages) {
    body.push(`[${m.createdAt}] ${m.authorTag}${m.bot ? " (bot)" : ""}:`);
    if (m.content) body.push(m.content);
    for (const a of m.attachments) body.push(`  [attachment] ${a.name}: ${a.url}`);
    for (const raw of m.embeds) {
      const e = raw as EmbedLike;
      const summary = [e.title, e.description].filter(Boolean).join(" — ");
      body.push(`  [embed] ${summary || "(embed)"}`);
      if (e.url) body.push(`    url: ${e.url}`);
      if (e.image?.url) body.push(`    image: ${e.image.url}`);
      if (e.thumbnail?.url) body.push(`    thumbnail: ${e.thumbnail.url}`);
    }
    body.push("");
  }

  return [...header, ...body].join("\n");
}

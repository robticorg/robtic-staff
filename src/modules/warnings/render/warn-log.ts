import type { EmbedBuilder } from "discord.js";
import { createEmbed } from "../../../data/embeds/index.ts";
import { warningMessages } from "../../../data/messages/warnings.ts";

const L = warningMessages.log;

export interface WarnLogInput {
  kind: "USER" | "VERBAL" | "REAL";
  targetId: string;
  issuerId: string;
  reason: string;
  level?: number;
  convertedFrom?: number;
  evidence: string[];
  warningId: string;
}

function titleFor(kind: WarnLogInput["kind"]): string {
  if (kind === "VERBAL") return L.titleVerbal;
  if (kind === "REAL") return L.titleReal;
  return L.titleUser;
}

export function buildWarnLogEmbed(input: WarnLogInput): EmbedBuilder {
  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: L.target, value: `<@${input.targetId}>`, inline: true },
    { name: L.issuer, value: `<@${input.issuerId}>`, inline: true },
  ];
  if (input.kind !== "USER") {
    fields.push({ name: L.warnType, value: L.typeName[input.kind] ?? input.kind, inline: true });
  }
  if (input.kind === "REAL" && input.level) {
    fields.push({ name: L.level, value: L.levelName(input.level), inline: true });
  }
  fields.push({ name: L.reason, value: input.reason.slice(0, 1024) || "—" });
  if (input.kind === "REAL" && input.convertedFrom) {
    fields.push({ name: L.convertedFrom, value: String(input.convertedFrom), inline: true });
  }
  if (input.evidence.length) {
    fields.push({
      name: L.evidence,
      value: input.evidence.slice(0, 5).join("\n").slice(0, 1024),
    });
  }
  fields.push({ name: L.warnId, value: `\`${input.warningId}\``, inline: true });

  return createEmbed({
    color: input.kind === "REAL" ? "error" : "warning",
    title: titleFor(input.kind),
    fields,
    timestamp: true,
    footer: L.footer,
  });
}

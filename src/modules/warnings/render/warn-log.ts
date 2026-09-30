import type { MessageCreateOptions } from "discord.js";
import { buildLogCard, type LogCardInput, type LogField } from "../../../libs/discord/index.ts";
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

/** What the WARNING_LOG entry says — separate from the layout so it can be checked on its own. */
export function warnLogContent(input: WarnLogInput): LogCardInput & { fields: LogField[] } {
  const fields: LogField[] = [
    { label: L.target, value: `<@${input.targetId}>` },
    { label: L.issuer, value: `<@${input.issuerId}>` },
  ];
  if (input.kind !== "USER") {
    fields.push({ label: L.warnType, value: L.typeName[input.kind] ?? input.kind });
  }
  if (input.kind === "REAL" && input.level) {
    fields.push({ label: L.level, value: L.levelName(input.level) });
  }
  fields.push({ label: L.reason, value: input.reason.slice(0, 1024) || "—" });
  if (input.kind === "REAL" && input.convertedFrom) {
    fields.push({ label: L.convertedFrom, value: String(input.convertedFrom) });
  }
  if (input.evidence.length) {
    fields.push({ label: L.evidence, value: `\n${input.evidence.slice(0, 5).join("\n")}` });
  }
  fields.push({ label: L.warnId, value: `\`${input.warningId}\`` });

  return {
    title: `### ${titleFor(input.kind)}`,
    tone: input.kind === "REAL" ? "error" : "warning",
    fields,
    footer: L.footer,
  };
}

export function buildWarnLogCard(input: WarnLogInput): MessageCreateOptions {
  return buildLogCard(warnLogContent(input));
}

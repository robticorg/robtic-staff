export {
  isSnowflake,
  extractUserIds,
  extractRoleIds,
  firstUserTarget,
  parseCount,
} from "../../../libs/validation/index.ts";

export interface ParsedPrefix {
  commandName: string;
  args: string[];
  rest: string;
}

export function parsePrefixMessage(content: string, prefix: string): ParsedPrefix | null {
  if (!content.startsWith(prefix)) return null;
  return parseBareMessage(content.slice(prefix.length));
}

export function parseBareMessage(content: string): ParsedPrefix | null {
  const trimmed = content.trimStart();
  if (trimmed.length === 0) return null;

  const match = trimmed.match(/^(\S+)(?:\s+([\s\S]*))?$/);
  if (!match) return null;

  const commandName = match[1]!.toLowerCase();
  const rest = (match[2] ?? "").trim();
  const args = rest.length > 0 ? rest.split(/\s+/) : [];
  return { commandName, args, rest };
}

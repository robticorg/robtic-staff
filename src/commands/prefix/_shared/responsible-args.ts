import { extractUserIds } from "./parse.ts";

export const RESPONSIBILITY_REMOVE_KEYWORDS: ReadonlySet<string> = new Set(["ازالة", "إزالة", "remove"]);

export interface ParsedResponsibleArgs {
  remove: boolean;
  targetId: string | null;
}

export function parseResponsibleArgs(args: readonly string[]): ParsedResponsibleArgs {
  const remove = args.some((arg) => RESPONSIBILITY_REMOVE_KEYWORDS.has(arg.trim().toLowerCase()));
  return { remove, targetId: extractUserIds(args)[0] ?? null };
}

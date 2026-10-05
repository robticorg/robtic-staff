export const HIDDEN_MODE_KEYWORDS: ReadonlySet<string> = new Set(["hidden", "starter", "مخفية", "ستريتر"]);

export const HIDDEN_REMOVE_KEYWORDS: ReadonlySet<string> = new Set(["remove", "ازالة", "إزالة"]);

export const HiddenConfigSlot = {
  START: "HIDDEN_START",
  END: "HIDDEN_END",
  IGNORE: "HIDDEN_IGNORE",
  UNIGNORE: "HIDDEN_UNIGNORE",
} as const;
export type HiddenConfigSlot = (typeof HiddenConfigSlot)[keyof typeof HiddenConfigSlot];
export const HIDDEN_CONFIG_SLOT_VALUES: readonly string[] = Object.values(HiddenConfigSlot);

export function isHiddenModeKeyword(token: string): boolean {
  return HIDDEN_MODE_KEYWORDS.has(token.trim().toLowerCase());
}

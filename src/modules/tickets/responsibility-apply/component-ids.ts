export const RESPONSIBILITY_APPLY_NS = "rap";

export const ResponsibilityApplyCustomId = {
  open: () => `${RESPONSIBILITY_APPLY_NS}:open`,
  submit: () => `${RESPONSIBILITY_APPLY_NS}:submit`,
} as const;

export const ResponsibilityApplyField = {
  responsibility: "responsibility",
  explain: "explain",
  job: "job",
  situation: "situation",
  commit: "commit",
} as const;

export function parseResponsibilityApplyCustomId(raw: string): string | null {
  if (!raw.startsWith(`${RESPONSIBILITY_APPLY_NS}:`)) return null;
  return raw.split(":")[1] ?? null;
}

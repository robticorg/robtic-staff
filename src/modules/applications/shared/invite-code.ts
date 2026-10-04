const CODE = /^[A-Za-z0-9-]{2,32}$/;
const LINK = /^(?:https?:\/\/)?(?:www\.)?(?:(?:discord|discordapp)\.(?:gg|com\/invite|io|me)|\.?gg)\/([A-Za-z0-9-]{2,32})\/?(?:[?#].*)?$/i;

export function parseInviteCode(raw: string | null | undefined): string | null {
  const value = raw?.trim().replace(/^<|>$/g, "") ?? "";
  if (!value) return null;
  const fromLink = LINK.exec(value);
  if (fromLink) return fromLink[1]!;
  return CODE.test(value) ? value : null;
}

export function inviteLink(code: string): string {
  return `https://discord.gg/${code}`;
}

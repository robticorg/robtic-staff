import type { GuildMember } from "discord.js";
import type { PrefixContext } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { PrefixAbort } from "./guards.ts";
import { extractUserIds, firstUserTarget } from "./parse.ts";

export function requireTargetId(ctx: PrefixContext, usage: string): string {
  const fromMention = ctx.mentionedUsers[0]?.id;
  const id = fromMention ?? firstUserTarget(ctx.args);
  if (!id) throw new PrefixAbort(usage);
  return id;
}

export async function requireTargetMember(
  ctx: PrefixContext,
  usage: string,
): Promise<GuildMember> {
  const id = requireTargetId(ctx, usage);
  return resolveMember(ctx, id);
}

/**
 * Two ordered targets, as `!transfer @from @to` needs. Mentions come first (in
 * the order Discord reports them); raw ids in the arguments are the fallback so
 * the command works without pinging anyone.
 */
export async function requireTwoTargetMembers(
  ctx: PrefixContext,
  usage: string,
): Promise<[GuildMember, GuildMember]> {
  // The arguments carry the order the manager typed; the mention list is only a
  // fallback (a reply-mention never appears in the text).
  const fromArgs = extractUserIds(ctx.args);
  const ids = fromArgs.length >= 2 ? fromArgs : ctx.mentionedUsers.map((user) => user.id);
  const [firstId, secondId] = ids;
  if (!firstId || !secondId) throw new PrefixAbort(usage);

  const first = await resolveMember(ctx, firstId);
  const second = await resolveMember(ctx, secondId);
  return [first, second];
}

async function resolveMember(ctx: PrefixContext, id: string): Promise<GuildMember> {
  const member =
    ctx.guild.members.cache.get(id) ?? (await ctx.guild.members.fetch(id).catch(() => null));
  if (!member) throw new PrefixAbort(prefixMessages.staff.memberNotFound);
  return member;
}

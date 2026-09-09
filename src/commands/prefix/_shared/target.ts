import type { GuildMember } from "discord.js";
import type { PrefixContext } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { PrefixAbort } from "./guards.ts";
import { firstUserTarget } from "./parse.ts";

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
  const cached = ctx.mentionedUsers[0]?.id === id ? ctx.guild.members.cache.get(id) : undefined;
  const member = cached ?? (await ctx.guild.members.fetch(id).catch(() => null));
  if (!member) throw new PrefixAbort(prefixMessages.staff.memberNotFound);
  return member;
}

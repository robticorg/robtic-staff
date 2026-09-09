import type { Guild, GuildMember, GuildTextBasedChannel, Message, Role, User } from "discord.js";

export type PrefixCategory = "ticket" | "modmail" | "staff";

export interface PrefixContext {
  message: Message<true>;
  guild: Guild;
  member: GuildMember;
  channel: GuildTextBasedChannel;

  commandName: string;
  args: string[];
  rest: string;

  mentionedUsers: User[];
  mentionedRoles: Role[];

  reply: (content: string) => Promise<Message>;
}

export interface PrefixCommand {
  name: string;
  aliases?: string[];
  category: PrefixCategory;
  execute: (ctx: PrefixContext) => Promise<void>;
}

export function definePrefixCommand(command: PrefixCommand): PrefixCommand {
  return command;
}

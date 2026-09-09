import type { GuildTextBasedChannel, Message } from "discord.js";
import { config } from "../../config/index.ts";
import type { PrefixCommand, PrefixContext } from "../../discord/prefix-command.ts";
import { AppError } from "../../libs/errors/index.ts";
import { safeMessageReply } from "../../libs/discord/index.ts";
import { logger } from "../../libs/logger/index.ts";
import { prefixMessages } from "../../data/messages/prefix.ts";
import { prefixCommandAliases } from "../../data/commands/prefix-aliases.ts";
import { prefixlessCommands } from "../../data/commands/prefixless.ts";
import { prefixCommands } from "./index.ts";
import { PrefixAbort } from "./_shared/guards.ts";
import { parseBareMessage, parsePrefixMessage } from "./_shared/parse.ts";

const log = logger.child("prefix");

const commandMap = new Map<string, PrefixCommand>();
for (const command of prefixCommands) {
  commandMap.set(command.name, command);
  for (const alias of command.aliases ?? []) commandMap.set(alias, command);
}
for (const [name, aliases] of Object.entries(prefixCommandAliases)) {
  const command = commandMap.get(name);
  if (!command) continue;
  for (const alias of aliases) commandMap.set(alias, command);
}

const prefixlessMap = new Map<string, PrefixCommand>();
for (const name of prefixlessCommands) {
  const command = commandMap.get(name);
  if (!command) continue;
  prefixlessMap.set(command.name, command);
  for (const alias of command.aliases ?? []) prefixlessMap.set(alias, command);
  for (const alias of prefixCommandAliases[name] ?? []) prefixlessMap.set(alias, command);
}

export function prefixCommandNames(): string[] {
  return [...new Set(prefixCommands.map((c: PrefixCommand) => c.name))];
}

export async function runPrefixCommand(message: Message): Promise<boolean> {
  if (message.author.bot || !message.inGuild()) return false;

  let parsed = parsePrefixMessage(message.content, config.prefix);
  let command: PrefixCommand | undefined;

  if (parsed) {
    command = commandMap.get(parsed.commandName);
    if (!command) return true;
  } else {
    const bare = parseBareMessage(message.content);
    if (!bare) return false;
    command = prefixlessMap.get(bare.commandName);
    if (!command) return false;
    parsed = bare;
  }

  const member =
    message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!member) {
    await safeMessageReply(message, prefixMessages.common.guildOnly);
    return true;
  }

  const ctx: PrefixContext = {
    message: message as Message<true>,
    guild: message.guild,
    member,
    channel: message.channel as GuildTextBasedChannel,
    commandName: parsed.commandName,
    args: parsed.args,
    rest: parsed.rest,
    mentionedUsers: [...message.mentions.users.values()],
    mentionedRoles: [...message.mentions.roles.values()],
    reply: (content: string) =>
      message.reply({ content, allowedMentions: { repliedUser: false, parse: [] } }),
  };

  try {
    await command.execute(ctx);
  } catch (err) {
    if (err instanceof PrefixAbort) {
      if (err.message) await safeMessageReply(message, err.message);
    } else if (err instanceof AppError) {
      await safeMessageReply(message, err.userMessage);
    } else {
      log.error(`!${parsed.commandName} failed`, err);
      await safeMessageReply(message, prefixMessages.common.genericError);
    }
  }
  return true;
}

import { ChannelConfigType } from "../../modules/configuration/types/enums.ts";

/** Commands with a dedicated log room. Anything not listed goes to COMMAND_LOG. */
export const PREFIX_COMMAND_LOG_SLOTS: Readonly<Record<string, ChannelConfigType>> = {
  jail: ChannelConfigType.JAIL_LOG,
  unjail: ChannelConfigType.JAIL_LOG,

  accept: ChannelConfigType.STAFF_LOG,
  refuse: ChannelConfigType.STAFF_LOG,
  from: ChannelConfigType.STAFF_LOG,
  verify: ChannelConfigType.STAFF_LOG,
  come: ChannelConfigType.STAFF_LOG,
  transfer: ChannelConfigType.STAFF_LOG,
  fire: ChannelConfigType.STAFF_LOG,
  prompt: ChannelConfigType.STAFF_LOG,
  demote: ChannelConfigType.STAFF_LOG,
  break: ChannelConfigType.STAFF_LOG,
  unbreak: ChannelConfigType.STAFF_LOG,
  gift: ChannelConfigType.STAFF_LOG,
  back: ChannelConfigType.STAFF_LOG,
  responsible: ChannelConfigType.STAFF_LOG,

  warn: ChannelConfigType.WARN_COMMAND_LOG,
  unwarn: ChannelConfigType.WARN_COMMAND_LOG,
  warnings: ChannelConfigType.WARN_COMMAND_LOG,
  warns: ChannelConfigType.WARN_COMMAND_LOG,
};

export const PREFIX_CATEGORY_LOG_SLOTS: Readonly<Record<string, ChannelConfigType>> = {
  ticket: ChannelConfigType.TICKET_LOG,
  modmail: ChannelConfigType.TICKET_LOG,
};

export const commandLogConfig = {
  invocationMaxLength: 900,
  detailMaxLength: 400,
  maxTargets: 10,
} as const;

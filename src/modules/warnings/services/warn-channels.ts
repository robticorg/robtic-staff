export type WarnChannelKind = "USER" | "STAFF" | null;

export interface WarnChannelConfig {
  userWarnsChannelId: string | null;
  staffWarnsChannelId: string | null;
}

export function classifyWarnChannel(channelId: string, cfg: WarnChannelConfig): WarnChannelKind {
  if (cfg.userWarnsChannelId && channelId === cfg.userWarnsChannelId) return "USER";
  if (cfg.staffWarnsChannelId && channelId === cfg.staffWarnsChannelId) return "STAFF";
  return null;
}

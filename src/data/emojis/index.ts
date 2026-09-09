export const emojis = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  loading: "⏳",

  lock: "🔒",
  locked: "🔐",

  report: "🚨",
  staff: "🛡️",
  user: "👤",

  attachment: "📎",
  inbound: "📨",
  note: "📝",
  system: "⚙️",
} as const;

export type EmojiName = keyof typeof emojis;
export type Emojis = typeof emojis;

export function withEmoji(name: EmojiName, text: string): string {
  return `${emojis[name]} ${text}`;
}

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
  transfer: "🔁",

  attachment: "📎",
  inbound: "📨",
  note: "📝",
  system: "⚙️",
} as const;

export const customEmojis = {
  attention: "<:Attention:1486103485756870726>",
} as const;

export type EmojiName = keyof typeof emojis;
export type Emojis = typeof emojis;
export type CustomEmojiName = keyof typeof customEmojis;

export function withEmoji(name: EmojiName, text: string): string {
  return `${emojis[name]} ${text}`;
}

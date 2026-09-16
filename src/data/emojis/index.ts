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

/**
 * Guild-specific custom emoji. These are raw Discord emoji tokens, so the id
 * must match an emoji the bot can actually see, and the exact literal matters —
 * the Staff Warn channel message is specified down to this token.
 */
export const customEmojis = {
  attention: "<:Attention:1486103485756870726>",
} as const;

export type EmojiName = keyof typeof emojis;
export type Emojis = typeof emojis;
export type CustomEmojiName = keyof typeof customEmojis;

export function withEmoji(name: EmojiName, text: string): string {
  return `${emojis[name]} ${text}`;
}

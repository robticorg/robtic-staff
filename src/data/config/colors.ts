export const colors = {
  primary: 0x5865f2,
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
  info: 0x5865f2,
  report: 0xeb4034,
  neutral: 0x2b2d31,
} as const;

export type ColorName = keyof typeof colors;
export type Colors = typeof colors;

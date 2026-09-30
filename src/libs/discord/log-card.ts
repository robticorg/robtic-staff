import {
  ContainerBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  type AttachmentBuilder,
  type MessageCreateOptions,
} from "discord.js";
import { colors } from "../../data/config/colors.ts";

export type LogTone = "success" | "error" | "warning" | "info" | "neutral";

const TONE_COLOR: Record<LogTone, number> = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.info,
  neutral: colors.neutral,
};

/** Discord's limit for one text display. */
const TEXT_MAX = 4000;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;

export interface LogField {
  label: string;
  value: string;
}

export interface LogCardInput {
  title: string;
  tone?: LogTone;
  /** Free lines (already formatted), shown under the title. */
  lines?: readonly string[];
  /** "**label:** value" rows. */
  fields?: readonly LogField[];
  /** Adds a "-# <time>" line at the bottom (defaults to now). */
  at?: Date | null;
  footer?: string;
  /** Files sent with the log — shown inside the card (images as a gallery). */
  files?: readonly AttachmentBuilder[];
}

const clip = (text: string) => (text.length > TEXT_MAX ? `${text.slice(0, TEXT_MAX - 1)}…` : text);
const stamp = (at: Date) => `<t:${Math.floor(at.getTime() / 1000)}:f>`;

/**
 * Every log room uses this card: coloured bar → title → details → proof → time.
 * Components V2 only show attachments that a component points at, so any files
 * passed in are referenced here (images in a gallery, anything else as a file).
 */
export function buildLogCard(input: LogCardInput): MessageCreateOptions {
  const container = new ContainerBuilder().setAccentColor(TONE_COLOR[input.tone ?? "info"]);
  container.addTextDisplayComponents((t) => t.setContent(clip(input.title)));

  const body = [
    ...(input.lines ?? []),
    ...(input.fields ?? []).map((f) => `**${f.label}:** ${f.value}`),
  ].filter((line) => line.trim().length > 0);
  if (body.length > 0) {
    container.addSeparatorComponents((s) => s.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents((t) => t.setContent(clip(body.join("\n"))));
  }

  const files = input.files ?? [];
  const names = files.map((f) => f.name).filter((n): n is string => !!n);
  const images = names.filter((n) => IMAGE_EXT.test(n)).slice(0, 10);
  const others = names.filter((n) => !IMAGE_EXT.test(n));
  if (images.length > 0) {
    container.addMediaGalleryComponents((g) =>
      g.addItems(images.map((name) => new MediaGalleryItemBuilder().setURL(`attachment://${name}`))),
    );
  }
  for (const name of others) container.addFileComponents((f) => f.setURL(`attachment://${name}`));

  const tail = [
    input.footer ? `-# ${input.footer}` : null,
    input.at === null ? null : `-# ${stamp(input.at ?? new Date())}`,
  ].filter((l): l is string => !!l);
  if (tail.length > 0) container.addTextDisplayComponents((t) => t.setContent(tail.join("\n")));

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
    ...(files.length > 0 ? { files: [...files] } : {}),
  };
}

/**
 * For logs already written as text: the first line becomes the title, the rest the
 * body. Keeps the existing Arabic wording (and its tests) while moving to V2.
 */
export function logCardFromText(
  text: string,
  tone: LogTone = "info",
  extra: Pick<LogCardInput, "files" | "at" | "footer"> = {},
): MessageCreateOptions {
  const [title = "", ...rest] = text.split("\n");
  return buildLogCard({ title, tone, lines: rest, ...extra });
}

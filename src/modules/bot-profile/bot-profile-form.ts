import {
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Attachment,
  type Guild,
  type GuildMemberEditMeOptions,
  type ModalSubmitInteraction,
} from "discord.js";
import { botProfileMessages as M } from "../../data/messages/bot-profile.ts";

export const BOT_PROFILE_MODAL_ID = "bot-profile:config";

export const BOT_PROFILE_FIELDS = {
  avatar: "bot-profile-avatar",
  banner: "bot-profile-banner",
  nick: "bot-profile-nick",
  bio: "bot-profile-bio",
} as const;

/** Discord's limits for a server profile. */
const NICK_MAX = 32;
const BIO_MAX = 190;
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

/** The `/profile config` form: the bot's logo, banner, nickname and bio in this server only. */
export function buildBotProfileModal(currentNick: string | null): ModalBuilder {
  const nick = new TextInputBuilder()
    .setCustomId(BOT_PROFILE_FIELDS.nick)
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(NICK_MAX);
  if (currentNick) nick.setValue(currentNick);

  const upload = (customId: string) =>
    new FileUploadBuilder().setCustomId(customId).setRequired(false).setMaxValues(1);

  return new ModalBuilder()
    .setCustomId(BOT_PROFILE_MODAL_ID)
    .setTitle(M.modal.title)
    .addLabelComponents(
      new LabelBuilder()
        .setLabel(M.modal.avatar)
        .setDescription(M.modal.imageHint)
        .setFileUploadComponent(upload(BOT_PROFILE_FIELDS.avatar)),
      new LabelBuilder()
        .setLabel(M.modal.banner)
        .setDescription(M.modal.imageHint)
        .setFileUploadComponent(upload(BOT_PROFILE_FIELDS.banner)),
      new LabelBuilder().setLabel(M.modal.nick).setDescription(M.modal.nickHint).setTextInputComponent(nick),
      new LabelBuilder()
        .setLabel(M.modal.bio)
        .setDescription(M.modal.bioHint)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(BOT_PROFILE_FIELDS.bio)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(BIO_MAX),
        ),
    );
}

export type BotProfileResult = { ok: true; changed: string[] } | { ok: false; problem: string };

function imageProblem(file: Attachment, what: string): string | null {
  const type = file.contentType?.split(";")[0]?.trim();
  if (!type || !IMAGE_TYPES.has(type)) return M.badImage(what);
  if (file.size > IMAGE_MAX_BYTES) return M.tooBig(what);
  return null;
}

/** Applies the submitted form to the bot's profile in this server only; untouched fields stay as they are. */
export async function applyBotProfile(guild: Guild, interaction: ModalSubmitInteraction): Promise<BotProfileResult> {
  const avatar = interaction.fields.getUploadedFiles(BOT_PROFILE_FIELDS.avatar)?.first() ?? null;
  const banner = interaction.fields.getUploadedFiles(BOT_PROFILE_FIELDS.banner)?.first() ?? null;
  const nick = interaction.fields.getTextInputValue(BOT_PROFILE_FIELDS.nick).trim();
  const bio = interaction.fields.getTextInputValue(BOT_PROFILE_FIELDS.bio).trim();

  for (const [file, what] of [[avatar, M.field.avatar], [banner, M.field.banner]] as const) {
    const problem = file && imageProblem(file, what);
    if (problem) return { ok: false, problem };
  }

  const me = guild.members.me ?? (await guild.members.fetchMe());
  const changes: GuildMemberEditMeOptions = {};
  const changed: string[] = [];

  if (avatar) {
    changes.avatar = avatar.url;
    changed.push(M.field.avatar);
  }
  if (banner) {
    changes.banner = banner.url;
    changed.push(M.field.banner);
  }
  if ((nick || null) !== me.nickname) {
    changes.nick = nick || null;
    changed.push(M.field.nick);
  }
  if (bio) {
    changes.bio = bio;
    changed.push(M.field.bio);
  }

  if (!changed.length) return { ok: true, changed };

  try {
    await guild.members.editMe({ ...changes, reason: `Bot profile set by ${interaction.user.tag}` });
    return { ok: true, changed };
  } catch (err) {
    return { ok: false, problem: M.refused((err as Error).message) };
  }
}

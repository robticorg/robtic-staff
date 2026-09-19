import {
  ChannelType,
  MessageFlags,
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  type User,
} from "discord.js";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { WarnPanelAction, warnPanelConfig } from "../../../data/warn-panel/config.ts";
import { warnPanelMessages } from "../../../data/warn-panel/messages.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import {
  durationService,
  TIMEOUT_MAX_MS,
  TIMEOUT_MIN_MS,
} from "../../punishment/services/duration.service.ts";
import { moderationActionService } from "../../punishment/services/moderation-action.service.ts";
import { staffManagementAuthorizationService } from "../../staff/services/staff-management-authorization.service.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import {
  warningActionService,
  type WarningConsequence,
} from "../../warnings/services/warning-actions.service.ts";
import { WarningPanelDeploymentModel } from "../models/warning-panel-deployment.model.ts";
import { warningPanelRefreshService } from "./warning-panel-refresh.service.ts";
import {
  buildJailModal,
  buildStaffWarnModal,
  buildTimeoutModal,
  buildUserWarnModal,
} from "../render/modals.ts";
import { buildWarningPanel } from "../render/panel.ts";
import { WarnPanelField } from "../handlers/component-ids.ts";

const log = logger.child("warn-panel");
const M = warnPanelMessages;

export class WarnPanelError extends DomainError {
  constructor(message: string) {
    super("WARN_PANEL", message);
  }
}

export interface PanelDeployResult {
  channelId: string;
  created: boolean;
}

export interface SubmittedFields {
  target: GuildMember;
  reason: string;
  evidence: string[];
  durationInput?: string;
}

/**
 * Blocks a second submission of the same action against the same target while the
 * first is still running. The database services are already atomic per record;
 * this stops a double-click from producing two *different* records.
 */
const inFlight = new Map<string, number>();

function lockKey(guildId: string, actorId: string, targetId: string, action: string): string {
  return `${guildId}:${actorId}:${targetId}:${action}`;
}

function acquire(key: string): boolean {
  const now = Date.now();
  const heldUntil = inFlight.get(key);
  if (heldUntil !== undefined && heldUntil > now) return false;
  inFlight.set(key, now + warnPanelConfig.submitLockMs);
  return true;
}

function release(key: string): void {
  inFlight.delete(key);
}

/** Warn 3 costs a demotion, or removal when there is no level left to drop to. */
function consequenceLines(mention: string, consequence: WarningConsequence): string[] {
  if (consequence.fired) return [M.success.fired(mention)];
  if (consequence.demoted) {
    return [M.success.demoted(mention, consequence.fromLevel ?? 0, consequence.toLevel ?? 0)];
  }
  return [];
}

/** An absent checkbox reads as unchecked rather than throwing. */
function readCheckbox(interaction: ModalSubmitInteraction, customId: string): boolean {
  try {
    return interaction.fields.getCheckbox(customId);
  } catch {
    return false;
  }
}

/**
 * The interaction layer for the warning panel. It resolves and revalidates every
 * input, delegates the decision to the existing authorization service and the
 * action to the existing punishment / warning services, then logs through the
 * existing log service. No punishment rule lives here.
 */
export class WarningPanelService {
  // ---------------------------------------------------------------- panel

  async createPanel(guild: Guild): Promise<PanelDeployResult> {
    const channelId = await channelConfigService.getChannelId(
      guild.id,
      ChannelConfigType.WARN_PANEL,
    );
    if (!channelId) throw new WarnPanelError(M.setup.channelNotConfigured);

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      throw new WarnPanelError(M.setup.channelUnavailable);
    }

    return this.updatePanel(guild, channel as GuildTextBasedChannel);
  }

  async updatePanel(guild: Guild, channel: GuildTextBasedChannel): Promise<PanelDeployResult> {
    const payload = buildWarningPanel();
    const existing = await WarningPanelDeploymentModel.findOne({
      guildId: guild.id,
      key: "main",
    }).exec();

    if (existing && existing.channelId === channel.id) {
      const message = await channel.messages.fetch(existing.messageId).catch(() => null);
      if (message) {
        await message.edit(payload);
        return { channelId: channel.id, created: false };
      }
    }

    const sent = await channel.send(payload);
    await WarningPanelDeploymentModel.findOneAndUpdate(
      { guildId: guild.id, key: "main" },
      { $set: { channelId: channel.id, messageId: sent.id } },
      { upsert: true, returnDocument: "after" },
    ).exec();

    if (existing && existing.channelId !== channel.id) {
      const old = await guild.channels.fetch(existing.channelId).catch(() => null);
      if (old?.isTextBased()) {
        await old.messages
          .fetch(existing.messageId)
          .then((m) => m.delete())
          .catch(() => undefined);
      }
    }

    log.info(`warning panel deployed in ${guild.id} (#${channel.id})`);
    return { channelId: channel.id, created: true };
  }

  // ------------------------------------------------------------ selection

  /**
   * Opens the modal for the chosen action. The bar checked here is only what keeps
   * the modal from opening — every submission is authorized again from scratch,
   * because component visibility proves nothing.
   */
  async handleSelection(
    interaction: StringSelectMenuInteraction<"cached">,
    action: string,
  ): Promise<void> {
    if (!(await staffPermissionService.canActAsStaff(interaction.member))) {
      await interaction.reply({ content: M.errors.notStaff, flags: MessageFlags.Ephemeral });
      return;
    }

    switch (action) {
      case WarnPanelAction.TIMEOUT:
        await this.openTimeoutModal(interaction);
        break;
      case WarnPanelAction.JAIL:
        await this.openJailModal(interaction);
        break;
      case WarnPanelAction.USER_WARN:
        await this.openUserWarningModal(interaction);
        break;
      case WarnPanelAction.STAFF_WARN:
        await this.openStaffWarningModal(interaction);
        break;
      default:
        await interaction.reply({ content: M.errors.unknownAction, flags: MessageFlags.Ephemeral });
        return;
    }

    // `showModal` is the interaction response, so the message can't also be
    // updated through it. Editing it separately clears the option the manager
    // just picked — without this the select stays stuck on their last choice.
    void warningPanelRefreshService
      .refreshDeployment(
        {
          guildId: interaction.guild.id,
          channelId: interaction.channelId,
          messageId: interaction.message.id,
        },
        { force: true, client: interaction.client },
      )
      .catch(() => undefined);
  }

  async openTimeoutModal(interaction: StringSelectMenuInteraction): Promise<void> {
    await interaction.showModal(buildTimeoutModal());
  }

  async openJailModal(interaction: StringSelectMenuInteraction): Promise<void> {
    await interaction.showModal(buildJailModal());
  }

  async openUserWarningModal(interaction: StringSelectMenuInteraction): Promise<void> {
    await interaction.showModal(buildUserWarnModal());
  }

  async openStaffWarningModal(interaction: StringSelectMenuInteraction): Promise<void> {
    await interaction.showModal(buildStaffWarnModal());
  }

  // ------------------------------------------------------- input handling

  /**
   * Re-reads every value from the submission and resolves the target as a live
   * member. Nothing from the modal is trusted beyond being a starting point.
   */
  async readFields(
    interaction: ModalSubmitInteraction<"cached">,
    options: { withDuration?: boolean } = {},
  ): Promise<SubmittedFields> {
    const selected = interaction.fields.getSelectedUsers(WarnPanelField.user, false);
    const user: User | undefined = selected?.first();
    if (!user) throw new WarnPanelError(M.errors.userRequired);

    if (user.id === interaction.user.id) throw new WarnPanelError(M.errors.targetIsSelf);
    if (user.bot) throw new WarnPanelError(M.errors.targetIsBot);

    const target = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!target) throw new WarnPanelError(M.errors.targetLeft);

    const reason = interaction.fields.getTextInputValue(WarnPanelField.reason).trim();
    if (!reason) throw new WarnPanelError(M.errors.reasonRequired);

    const files = interaction.fields.getUploadedFiles(WarnPanelField.evidence, false);
    const evidence = [...(files?.values() ?? [])]
      .map((a) => a.url)
      .filter((url) => url.trim().length > 0)
      .slice(0, warnPanelConfig.maxEvidenceFiles);
    if (evidence.length === 0) throw new WarnPanelError(M.errors.evidenceRequired);

    const durationInput = options.withDuration
      ? interaction.fields.getTextInputValue(WarnPanelField.duration).trim()
      : undefined;

    return { target, reason, evidence, durationInput };
  }

  /** Parses through the shared duration utility, then enforces Discord's own cap. */
  parseTimeoutDuration(input: string | undefined): number {
    if (!input) throw new WarnPanelError(M.errors.durationRequired);

    const ms = durationService.parse(input);
    if (ms === null) throw new WarnPanelError(M.errors.durationInvalid);
    if (ms < TIMEOUT_MIN_MS) {
      throw new WarnPanelError(M.errors.durationTooShort(durationService.format(TIMEOUT_MIN_MS)));
    }
    if (ms > TIMEOUT_MAX_MS) {
      throw new WarnPanelError(M.errors.durationTooLong(durationService.format(TIMEOUT_MAX_MS)));
    }
    return ms;
  }

  // ---------------------------------------------------------- submissions

  async submitTimeout(interaction: ModalSubmitInteraction<"cached">): Promise<string> {
    const fields = await this.readFields(interaction, { withDuration: true });
    const durationMs = this.parseTimeoutDuration(fields.durationInput);

    return this.guarded(interaction, fields.target.id, WarnPanelAction.TIMEOUT, async () => {
      const result = await moderationActionService.timeout({
        guild: interaction.guild,
        target: fields.target,
        actor: interaction.member,
        reason: fields.reason,
        evidence: fields.evidence,
        durationMs,
      });

      if (!result.executed) {
        throw new WarnPanelError(M.errors.timeoutFailed(result.failureReason ?? ""));
      }
      return M.success.timeout(`<@${fields.target.id}>`, result.duration ?? "");
    });
  }

  async submitJail(interaction: ModalSubmitInteraction<"cached">): Promise<string> {
    const fields = await this.readFields(interaction);

    return this.guarded(interaction, fields.target.id, WarnPanelAction.JAIL, async () => {
      const result = await moderationActionService.jail({
        guild: interaction.guild,
        target: fields.target,
        actor: interaction.member,
        reason: fields.reason,
        evidence: fields.evidence,
      });

      if (result.denied) throw new WarnPanelError(M.errors.jailDenied[result.denied] ?? "");
      if (!result.executed) {
        throw new WarnPanelError(M.errors.jailFailed(result.failureReason ?? ""));
      }
      return M.success.jail(`<@${fields.target.id}>`);
    });
  }

  async submitUserWarning(interaction: ModalSubmitInteraction<"cached">): Promise<string> {
    const fields = await this.readFields(interaction);

    // issueUserWarning owns the point award, the embed log and the warning-channel
    // entry — the panel adds nothing, so `!warn` and the panel behave identically.
    return this.guarded(interaction, fields.target.id, WarnPanelAction.USER_WARN, async () => {
      await warningActionService.issueUserWarning({
        guildId: interaction.guild.id,
        targetId: fields.target.id,
        reason: fields.reason,
        issuer: interaction.member,
        evidence: fields.evidence,
      });

      return M.success.userWarn(`<@${fields.target.id}>`);
    });
  }

  async submitStaffWarning(interaction: ModalSubmitInteraction<"cached">): Promise<string> {
    const fields = await this.readFields(interaction);

    // The one authorization gate. It recomputes the target's level from the live
    // hierarchy and decides STAFF vs OWNER reach — never the manager's choice.
    const decision = await staffManagementAuthorizationService.canWarn(
      interaction.member,
      fields.target,
    );
    if (!decision.allowed) throw new WarnPanelError(decision.message);

    // Unchecked means a real warning — the same default `!warn` has without its
    // trailing `=` marker. The category (STAFF vs OWNER) is never chosen here;
    // the warning service derives it from the target's level.
    const isVerbal = readCheckbox(interaction, WarnPanelField.verbal);

    return this.guarded(interaction, fields.target.id, WarnPanelAction.STAFF_WARN, async () => {
      const mention = `<@${fields.target.id}>`;

      if (!isVerbal) {
        const real = await warningActionService.issueDirectRealStaffWarning({
          guild: interaction.guild,
          target: fields.target,
          reason: fields.reason,
          issuer: interaction.member,
          evidence: fields.evidence,
        });
        const lines = [M.success.staffWarnReal(mention, real.level)];
        lines.push(...consequenceLines(mention, real.consequence));
        return lines.join("\n");
      }

      const result = await warningActionService.issueVerbalStaffWarning({
        guild: interaction.guild,
        target: fields.target,
        reason: fields.reason,
        issuer: interaction.member,
        evidence: fields.evidence,
      });

      const lines = [M.success.staffWarnVerbal(mention)];
      if (result.escalation) {
        lines.push(M.success.convertedToReal(result.escalation.convertedVerbalCount));
        lines.push(M.success.staffWarnReal(mention, result.escalation.level));
        lines.push(...consequenceLines(mention, result.escalation.consequence));
      }
      return lines.join("\n");
    });
  }

  private async guarded(
    interaction: ModalSubmitInteraction<"cached">,
    targetId: string,
    action: WarnPanelAction,
    run: () => Promise<string>,
  ): Promise<string> {
    const key = lockKey(interaction.guild.id, interaction.user.id, targetId, action);
    if (!acquire(key)) throw new WarnPanelError(M.errors.inFlight);
    try {
      return await run();
    } finally {
      release(key);
    }
  }
}

export const warningPanelService = new WarningPanelService();

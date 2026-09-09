import {
  ChannelType,
  type AnyThreadChannel,
  type Guild,
  type GuildMember,
  type Message,
  type NewsChannel,
  type TextChannel,
} from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { ConflictError, DomainError, NotFoundError, ValidationError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { limits } from "../../../data/config/limits.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import { StaffActivityType, staffActivityService, staffService } from "../../staff/index.ts";
import { applyClaimCredit } from "./claim-credit.ts";
import type { ModmailCaseDocument } from "../models/modmail-case.model.ts";
import { ModmailCaseStatus, ModmailSenderType, type ModmailCaseStatus as CaseStatus } from "../types/enums.ts";
import { ModmailAuditAction, ModmailActorType } from "../types/enums.ts";
import { requireModmailClient } from "../runtime.ts";
import {
  buildReportMessage,
  buildThreadOpener,
  renderReporterMessageForThread,
  renderStaffMessageForDm,
  renderSystemNote,
} from "../render/index.ts";
import { buildCaseClosedNotice, buildReportSubmitted } from "../render/dm-messages.ts";
import { attachmentService, type IncomingAttachment } from "./attachment.service.ts";
import { modmailAuditService } from "./modmail-audit.service.ts";
import { modmailCaseService } from "./modmail-case.service.ts";
import { modmailMessageService } from "./modmail-message.service.ts";
import { reportPermissionService } from "./report-permissions.service.ts";
import type { ReportDraft } from "../session/dm-session-store.ts";

const log = logger.child("modmail");
const M = modmailMessages;

type ThreadParent = TextChannel | NewsChannel;

type Sendable = { send: (options: any) => Promise<Message> };

export interface SubmitReportResult {
  case: ModmailCaseDocument;
}

export interface ClaimResult {
  case: ModmailCaseDocument;
  pointAwarded: boolean;
}

export class ModmailService {
  async submitReport(
    draft: ReportDraft,
    reporter: { id: UserId },
  ): Promise<SubmitReportResult> {
    if (!draft.targetId || !draft.caseType) {
      throw new ValidationError(M.errors.targetMissing);
    }
    if (!draft.reason?.trim() || !draft.description?.trim()) {
      throw new ValidationError(M.errors.reasonOrDescriptionMissing);
    }

    const guild = this.getGuild(draft.guildId);
    const channel = await this.getReportsChannel(guild.id);

    const kase = await modmailCaseService.create({
      guildId: guild.id,
      userId: reporter.id,
      type: draft.caseType,
      reportedUserId: draft.targetId,
      reason: draft.reason,
      description: draft.description,
    });

    const attachmentDocs = await attachmentService.persistMany(kase.caseId, draft.evidence);
    if (attachmentDocs.length > 0) {
      await modmailCaseService.setEvidenceCount(kase.caseId, attachmentDocs.length);
      kase.evidenceCount = attachmentDocs.length;
    }

    const initial = await modmailMessageService.append({
      caseId: kase.caseId,
      senderType: ModmailSenderType.USER,
      senderId: reporter.id,
      content: `السبب: ${draft.reason}\n\nالتفاصيل: ${draft.description}`,
      attachmentIds: attachmentService.idsOf(attachmentDocs),
    });
    if (attachmentDocs.length > 0) {
      await attachmentService.linkToMessage(attachmentService.idsOf(attachmentDocs), initial._id);
    }

    const reportMessage = await channel.send(
      buildReportMessage(kase, { evidenceCount: kase.evidenceCount }),
    );

    const thread = await this.openThread(reportMessage, kase);
    await modmailCaseService.attachThread(kase.caseId, {
      threadId: thread.id,
      reportMessageId: reportMessage.id,
    });
    kase.threadId = thread.id;
    kase.reportMessageId = reportMessage.id;

    await thread.send(buildThreadOpener(kase)).catch((err) => log.warn("thread opener failed", err));
    if (draft.evidence.length > 0) {
      await this.postAttachments(thread, renderSystemNote(M.thread.evidenceSubmittedNote), draft.evidence);
    }

    await modmailAuditService.record({
      caseId: kase.caseId,
      action: ModmailAuditAction.CASE_CREATED,
      actorType: ModmailActorType.USER,
      actorId: reporter.id,
      metadata: { type: kase.type },
    });
    if (attachmentDocs.length > 0) {
      await modmailAuditService.record({
        caseId: kase.caseId,
        action: ModmailAuditAction.EVIDENCE_ADDED,
        actorType: ModmailActorType.USER,
        actorId: reporter.id,
        metadata: { count: attachmentDocs.length },
      });
    }

    await this.dmUser(reporter.id, buildReportSubmitted(kase.caseId)).catch(() => undefined);
    return { case: kase };
  }

  async claim(caseId: string, member: GuildMember): Promise<ClaimResult> {
    const kase = await modmailCaseService.getByCaseIdOrThrow(caseId);

    const gate = await reportPermissionService.canClaimReport(member, kase);
    if (!gate.ok) throw new ValidationError(gate.reason ?? M.errors.cannotClaim);

    const staff = await staffService.ensure(member.id, kase.guildId);

    const claimed = await modmailCaseService.claimAtomic(caseId, staff._id, member.id);
    if (!claimed) throw new ConflictError(M.errors.caseAlreadyClaimed);

    const { pointAwarded } = await applyClaimCredit(staff._id, caseId);

    await modmailAuditService.record({
      caseId,
      action: ModmailAuditAction.CASE_CLAIMED,
      actorType: ModmailActorType.STAFF,
      actorId: member.id,
    });

    await this.refreshReportMessage(claimed, `<@${member.id}>`);
    const thread = await this.ensureThread(claimed).catch(() => null);
    await thread?.send({
      content: renderSystemNote(M.thread.claimedNote(`<@${member.id}>`)),
      allowedMentions: { parse: [] },
    });

    return { case: claimed, pointAwarded };
  }

  async relayStaffToUser(params: {
    caseId: string;
    member: GuildMember;
    content: string;
    attachments: IncomingAttachment[];
    sourceMessageId: string;
    thread: AnyThreadChannel;
  }): Promise<void> {
    const kase = await modmailCaseService.getByCaseIdOrThrow(params.caseId);

    if (!modmailCaseService.isOpen(kase.status)) {
      await params.thread.send(renderSystemNote(M.thread.caseClosedNoDelivery));
      return;
    }
    if (!(await reportPermissionService.canManageReport(params.member, kase))) {
      return;
    }

    const internal = params.content.trimStart().startsWith("//");
    const cleaned = internal ? params.content.replace(/^\s*\/\/\s?/, "") : params.content;

    const stored = await modmailMessageService.append({
      caseId: kase.caseId,
      senderType: ModmailSenderType.STAFF,
      senderId: params.member.id,
      content: cleaned,
      internal,
      sourceMessageId: params.sourceMessageId,
    });

    if (internal) {
      await params.thread.messages
        .fetch(params.sourceMessageId)
        .then((m) => m.react(M.reactions.internalNote))
        .catch(() => undefined);
      return;
    }

    try {
      const relayed = await this.dmUser(
        kase.userId,
        renderStaffMessageForDm(kase.caseId, cleaned),
        params.attachments,
      );
      if (relayed) await modmailMessageService.setRelayedMessageId(stored._id, relayed.id);
    } catch {
      await params.thread.send(renderSystemNote(M.thread.deliveryFailed));
      return;
    }

    await modmailAuditService.record({
      caseId: kase.caseId,
      action: ModmailAuditAction.MESSAGE_FROM_STAFF,
      actorType: ModmailActorType.STAFF,
      actorId: params.member.id,
    });

    if (kase.status === ModmailCaseStatus.CLAIMED) {
      await modmailCaseService
        .changeStatus(kase.caseId, ModmailCaseStatus.INVESTIGATING)
        .catch(() => undefined);
    }
  }

  async relayUserToStaff(params: {
    caseId: string;
    reporterId: UserId;
    content: string;
    attachments: IncomingAttachment[];
    sourceMessageId: string;
  }): Promise<void> {
    const kase = await modmailCaseService.getByCaseIdOrThrow(params.caseId);

    if (!modmailCaseService.isOpen(kase.status)) {
      await this.dmUser(params.reporterId, buildCaseClosedNotice(kase.caseId)).catch(() => undefined);
      return;
    }

    const thread = await this.ensureThread(kase);

    const attachmentDocs = await attachmentService.persistMany(kase.caseId, params.attachments);
    const stored = await modmailMessageService.append({
      caseId: kase.caseId,
      senderType: ModmailSenderType.USER,
      senderId: params.reporterId,
      content: params.content,
      attachmentIds: attachmentService.idsOf(attachmentDocs),
      sourceMessageId: params.sourceMessageId,
    });
    if (attachmentDocs.length > 0) {
      await attachmentService.linkToMessage(attachmentService.idsOf(attachmentDocs), stored._id);
      await modmailCaseService.incEvidenceCount(kase.caseId, attachmentDocs.length);
    }

    const relayed = await this.postAttachments(
      thread,
      renderReporterMessageForThread(params.content),
      params.attachments,
    );
    if (relayed) await modmailMessageService.setRelayedMessageId(stored._id, relayed.id);

    await modmailAuditService.record({
      caseId: kase.caseId,
      action: ModmailAuditAction.MESSAGE_FROM_USER,
      actorType: ModmailActorType.USER,
      actorId: params.reporterId,
    });
    if (attachmentDocs.length > 0) {
      await modmailAuditService.record({
        caseId: kase.caseId,
        action: ModmailAuditAction.EVIDENCE_ADDED,
        actorType: ModmailActorType.USER,
        actorId: params.reporterId,
        metadata: { count: attachmentDocs.length },
      });
    }

    if (kase.status === ModmailCaseStatus.WAITING_USER) {
      await modmailCaseService
        .changeStatus(kase.caseId, ModmailCaseStatus.INVESTIGATING)
        .catch(() => undefined);
    }
  }

  async transition(caseId: string, member: GuildMember, to: CaseStatus): Promise<ModmailCaseDocument> {
    const kase = await modmailCaseService.getByCaseIdOrThrow(caseId);
    if (!(await reportPermissionService.canManageReport(member, kase))) {
      throw new ValidationError(M.errors.notAllowedToManage);
    }

    const updated = await modmailCaseService.changeStatus(caseId, to, {
      closedByDiscordId: to === ModmailCaseStatus.CLOSED ? member.id : undefined,
    });

    await modmailAuditService.record({
      caseId,
      action:
        to === ModmailCaseStatus.RESOLVED
          ? ModmailAuditAction.CASE_RESOLVED
          : to === ModmailCaseStatus.CLOSED
            ? ModmailAuditAction.CASE_CLOSED
            : ModmailAuditAction.STATE_CHANGED,
      actorType: ModmailActorType.STAFF,
      actorId: member.id,
      metadata: { to },
    });

    if (to === ModmailCaseStatus.RESOLVED && updated.claimedBy) {
      await staffActivityService.create({
        staffId: updated.claimedBy,
        type: StaffActivityType.REPORT_COMPLETE,
        referenceId: caseId,
        metadata: { caseId },
      });
      await staffService.incrementCounters(updated.claimedBy, { reportsCompleted: 1 });
    }

    const thread = await this.ensureThread(updated).catch(() => null);
    await thread?.send({
      content: renderSystemNote(M.thread.statusNote(to, `<@${member.id}>`)),
      allowedMentions: { parse: [] },
    });

    if (to === ModmailCaseStatus.CLOSED) {
      await this.dmUser(updated.userId, buildCaseClosedNotice(updated.caseId)).catch(() => undefined);
      if (thread) {
        await thread.setLocked(true).catch(() => undefined);
        await thread.setArchived(true).catch(() => undefined);
      }
    }
    return updated;
  }

  async endInvestigation(
    caseId: string,
    member: GuildMember,
    note?: string,
  ): Promise<ModmailCaseDocument> {
    const kase = await modmailCaseService.getByCaseIdOrThrow(caseId);
    if (!(await reportPermissionService.canManageReport(member, kase))) {
      throw new DomainError("MODMAIL_END_FORBIDDEN", M.errors.notAllowedToManage);
    }
    if (kase.status === ModmailCaseStatus.CLOSED) {
      throw new DomainError("MODMAIL_END_CLOSED", M.errors.stateChangedRetry);
    }
    if (kase.status === ModmailCaseStatus.PENDING) {
      throw new DomainError("MODMAIL_END_UNCLAIMED", M.errors.cannotClaim);
    }
    if (kase.status === ModmailCaseStatus.RESOLVED) {
      return kase;
    }
    if (kase.status === ModmailCaseStatus.CLAIMED || kase.status === ModmailCaseStatus.WAITING_USER) {
      await modmailCaseService.changeStatus(caseId, ModmailCaseStatus.INVESTIGATING).catch(() => undefined);
    }

    const resolved = await this.transition(caseId, member, ModmailCaseStatus.RESOLVED);
    if (note?.trim()) {
      await modmailCaseService
        .updateOne({ caseId }, { $set: { resolutionNote: note.trim() } })
        .catch(() => undefined);
    }
    return resolved;
  }

  async reporterInfo(
    caseId: string,
    member: GuildMember,
  ): Promise<{ mention: string; userId: UserId; tag: string; createdAt: Date }> {
    const kase = await modmailCaseService.getByCaseIdOrThrow(caseId);
    if (!reportPermissionService.canViewReporterInfo(member)) {
      throw new ValidationError(M.errors.reporterInfoAdminOnly);
    }

    const client = requireModmailClient();
    const user = await client.users.fetch(kase.userId).catch(() => null);

    await modmailAuditService.record({
      caseId,
      action: ModmailAuditAction.REPORTER_INFO_VIEWED,
      actorType: ModmailActorType.ADMIN,
      actorId: member.id,
    });

    return {
      mention: `<@${kase.userId}>`,
      userId: kase.userId,
      tag: user?.tag ?? M.info.unknownTag,
      createdAt: kase.createdAt,
    };
  }

  private getGuild(guildId: GuildId): Guild {
    const client = requireModmailClient();
    const guild = client.guilds.cache.get(guildId);
    if (!guild) throw new DomainError("GUILD_UNAVAILABLE", M.errors.guildUnavailable);
    return guild;
  }

  private async getReportsChannel(guildId: GuildId): Promise<ThreadParent> {
    const channelId = await channelConfigService.getChannelId(guildId, ChannelConfigType.REPORTS);
    if (!channelId) {
      throw new DomainError("REPORTS_NOT_CONFIGURED", M.errors.reportsNotConfigured);
    }
    const client = requireModmailClient();
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      throw new DomainError("REPORTS_CHANNEL_INVALID", M.errors.reportsChannelInvalid);
    }
    return channel as ThreadParent;
  }

  private async openThread(reportMessage: Message, kase: { caseId: string }): Promise<AnyThreadChannel> {
    return reportMessage.startThread({
      name: kase.caseId,
      autoArchiveDuration: limits.threadAutoArchiveMinutes,
      reason: M.threadReason(kase.caseId),
    });
  }

  private async ensureThread(kase: ModmailCaseDocument): Promise<AnyThreadChannel> {
    const client = requireModmailClient();
    if (kase.threadId) {
      const existing = await client.channels.fetch(kase.threadId).catch(() => null);
      if (existing?.isThread()) return existing;
    }
    if (!kase.reportMessageId) {
      throw new NotFoundError("report thread", { caseId: kase.caseId });
    }
    const channel = await this.getReportsChannel(kase.guildId);
    const message = await channel.messages.fetch(kase.reportMessageId);
    const thread = await this.openThread(message, kase);
    await modmailCaseService.attachThread(kase.caseId, {
      threadId: thread.id,
      reportMessageId: message.id,
    });
    return thread;
  }

  private async refreshReportMessage(kase: ModmailCaseDocument, handlerMention: string): Promise<void> {
    if (!kase.reportMessageId) return;
    try {
      const channel = await this.getReportsChannel(kase.guildId);
      const message = await channel.messages.fetch(kase.reportMessageId);
      await message.edit(
        buildReportMessage(kase, {
          evidenceCount: kase.evidenceCount,
          claimed: true,
          handlerMention,
        }),
      );
    } catch (err) {
      log.warn("could not refresh report message", err);
    }
  }

  private async dmUser(
    userId: UserId,
    content: string,
    attachments: IncomingAttachment[] = [],
  ): Promise<Message | null> {
    const client = requireModmailClient();
    const user = await client.users.fetch(userId);
    const dm = await user.createDM();
    return this.sendMaybeWithFiles(dm, content, attachments);
  }

  private async postAttachments(
    channel: Sendable,
    content: string,
    attachments: IncomingAttachment[],
  ): Promise<Message | null> {
    return this.sendMaybeWithFiles(channel, content, attachments);
  }

  private async sendMaybeWithFiles(
    channel: Sendable,
    content: string,
    attachments: IncomingAttachment[],
  ): Promise<Message | null> {
    const base = { content, allowedMentions: { parse: [] as never[] } };
    if (attachments.length === 0) {
      return channel.send(base);
    }
    const files = attachments.map((a) => ({ attachment: a.url, name: a.filename }));
    try {
      return await channel.send({ ...base, files });
    } catch {
      const links = attachments.map((a) => a.url).join("\n");
      return channel.send({
        content: `${content}\n${links}`.slice(0, limits.dmLinkFallbackLength),
        allowedMentions: base.allowedMentions,
      });
    }
  }
}

export const modmailService = new ModmailService();

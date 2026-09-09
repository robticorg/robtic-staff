import { type AnyThreadChannel, type GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import { DomainError, ValidationError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { punishmentConfig } from "../../../data/config/punishment.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { attachmentService } from "../../modmail/services/attachment.service.ts";
import { modmailCaseService } from "../../modmail/services/modmail-case.service.ts";
import { modmailService } from "../../modmail/services/modmail.service.ts";
import { reportPermissionService } from "../../modmail/services/report-permissions.service.ts";
import { ModmailCaseStatus } from "../../modmail/types/enums.ts";
import { warningActionService } from "../../warnings/index.ts";
import type { Punishment } from "../models/punishment.model.ts";
import { buildPunishmentDm } from "../render/dm.ts";
import { buildResolutionPrompt } from "../render/resolution-ui.ts";
import {
  PunishmentAuditAction,
  PunishmentStatus,
  PunishmentType,
} from "../types/enums.ts";
import { punishmentApprovalService, ApprovalChannelMissingError } from "./punishment-approval.service.ts";
import { punishmentAuditService } from "./punishment-audit.service.ts";
import { punishmentLogService } from "./punishment-log.service.ts";
import { punishmentService } from "./punishment.service.ts";
import { requirePunishmentClient } from "../runtime.ts";

const log = logger.child("punishment:resolution");
const M = punishmentMessages.resolution;

export interface ResolveInput {
  caseId: string;
  member: GuildMember;
  type: PunishmentType;
  reason: string;
  durationMs?: number;
}

export interface ResolveResult {
  punishment: HydratedDocument<Punishment>;
  executed: boolean;
  pendingApproval: boolean;
  approvalChannelId?: string;
  failureReason?: string;
}

export class ResolutionService {
  async openResolution(
    caseId: string,
    member: GuildMember,
    thread: AnyThreadChannel,
  ): Promise<void> {
    const kase = await modmailCaseService.getByThreadId(thread.id);
    if (!kase || kase.caseId !== caseId || kase.guildId !== member.guild.id) {
      throw new DomainError("RESOLUTION_NOT_THREAD", M.notInThread);
    }
    if (!(await reportPermissionService.canManageReport(member, kase))) {
      throw new DomainError("RESOLUTION_FORBIDDEN", M.notAllowed);
    }
    if (kase.status === ModmailCaseStatus.CLOSED) {
      throw new DomainError("RESOLUTION_CLOSED", M.alreadyClosed);
    }
    if (kase.status === ModmailCaseStatus.PENDING) {
      throw new DomainError("RESOLUTION_UNCLAIMED", M.claimFirst);
    }

    await thread.send(buildResolutionPrompt(caseId, member.id));
  }

  async resolve(input: ResolveInput): Promise<ResolveResult> {
    const { caseId, member, type, reason } = input;
    const kase = await modmailCaseService.getByCaseIdOrThrow(caseId);
    if (!(await reportPermissionService.canManageReport(member, kase))) {
      throw new DomainError("RESOLUTION_FORBIDDEN", M.notAllowed);
    }
    if (kase.status === ModmailCaseStatus.CLOSED) {
      throw new DomainError("RESOLUTION_CLOSED", M.alreadyClosed);
    }

    const targetId = kase.reportedUserId;
    if (targetId === member.id) throw new ValidationError(M.targetIsSelf);

    const client = requirePunishmentClient();
    const targetUser = await client.users.fetch(targetId).catch(() => null);
    if (targetUser?.bot) throw new ValidationError(M.targetIsBot);
    const targetMember = await member.guild.members.fetch(targetId).catch(() => null);

    const evidence = (await attachmentService.listForCase(caseId))
      .map((a) => a.url)
      .slice(0, punishmentConfig.maxEvidenceShown);

    if (type === PunishmentType.WARN) {
      return this.resolveWarn(input, targetId, evidence);
    }

    const punishment = await punishmentService.createPunishment({
      guildId: member.guild.id,
      userId: targetId,
      type,
      reason,
      evidence,
      reportId: caseId,
      issuedBy: member.id,
      durationMs: input.durationMs,
    });

    if (punishmentService.needsApproval(type)) {
      try {
        const approval = await punishmentApprovalService.requestApproval(punishment, member.id);
        await this.finaliseReport(caseId, member, type, punishment.punishmentId);
        await punishmentLogService.record(await punishmentService.getPunishmentOrThrow(punishment.punishmentId));
        return {
          punishment,
          executed: false,
          pendingApproval: true,
          approvalChannelId: approval.channelId,
        };
      } catch (err) {
        if (err instanceof ApprovalChannelMissingError) {
          await punishmentService
            .updateOne(
              { punishmentId: punishment.punishmentId },
              { $set: { status: PunishmentStatus.FAILED, failureReason: err.message } },
            )
            .catch(() => undefined);
          await punishmentAuditService.record({
            punishmentId: punishment.punishmentId,
            action: PunishmentAuditAction.FAILED,
            error: err.message,
          });
          await punishmentLogService.record(
            await punishmentService.getPunishmentOrThrow(punishment.punishmentId),
          );
        }
        throw err;
      }
    }

    const result = await punishmentService.executeAction(punishment, {
      guild: member.guild,
      target: targetMember,
      targetUser,
      executorId: member.id,
    });

    await this.finaliseReport(caseId, member, type, punishment.punishmentId);
    await punishmentLogService.record(result.punishment);

    if (result.executed && type !== PunishmentType.NO_ACTION) {
      await this.dmPunishedUser(result.punishment);
    }

    return {
      punishment: result.punishment,
      executed: result.executed,
      pendingApproval: false,
      failureReason: result.failureReason,
    };
  }

  private async resolveWarn(
    input: ResolveInput,
    targetId: string,
    evidence: string[],
  ): Promise<ResolveResult> {
    const { caseId, member, reason } = input;

    const warn = await warningActionService.issueUserWarning({
      guildId: member.guild.id,
      targetId,
      reason,
      issuer: member,
      evidence,
    });

    const punishment = await punishmentService.createPunishment({
      guildId: member.guild.id,
      userId: targetId,
      type: PunishmentType.WARN,
      reason,
      evidence,
      reportId: caseId,
      issuedBy: member.id,
      metadata: { warningId: warn.warningId },
    });
    const executed = await punishmentService.executeAction(punishment, {
      guild: member.guild,
      target: await member.guild.members.fetch(targetId).catch(() => null),
      targetUser: null,
      executorId: member.id,
    });

    await this.finaliseReport(caseId, member, PunishmentType.WARN, punishment.punishmentId);
    await punishmentLogService.record(executed.punishment);
    if (executed.executed) await this.dmPunishedUser(executed.punishment);

    return { punishment: executed.punishment, executed: executed.executed, pendingApproval: false };
  }

  private async finaliseReport(
    caseId: string,
    member: GuildMember,
    type: PunishmentType,
    punishmentId: string,
  ): Promise<void> {
    await modmailService.endInvestigation(caseId, member).catch((err) => {
      log.warn(`endInvestigation for ${caseId} failed`, err);
    });
    await modmailCaseService.attachResolution(caseId, {
      resolutionType: type,
      punishmentId,
      resolvedBy: member.id,
    });
  }

  async dmPunishedUser(punishment: Punishment): Promise<void> {
    try {
      const user = await requirePunishmentClient().users.fetch(punishment.userId);
      const dm = await user.createDM();
      await dm.send(buildPunishmentDm(punishment));
      await punishmentAuditService.record({
        punishmentId: punishment.punishmentId,
        action: PunishmentAuditAction.DM_SENT,
      });
    } catch (err) {
      await punishmentAuditService.record({
        punishmentId: punishment.punishmentId,
        action: PunishmentAuditAction.DM_FAILED,
        error: err instanceof Error ? err.message : String(err),
      });
      log.warn(`punishment DM to ${punishment.userId} failed`, err);
    }
  }

  async executeApproved(punishmentId: string, approverId: string): Promise<ResolveResult> {
    const punishment = await punishmentService.getPunishmentOrThrow(punishmentId);
    if (punishment.status !== PunishmentStatus.APPROVED) {
      throw new DomainError("PUNISH_NOT_APPROVED", punishmentMessages.approval.alreadyDecided);
    }
    const client = requirePunishmentClient();
    const guild = client.guilds.cache.get(punishment.guildId);
    if (!guild) throw new DomainError("GUILD_UNAVAILABLE", M.notInThread);

    const targetMember = await guild.members.fetch(punishment.userId).catch(() => null);
    const targetUser = await client.users.fetch(punishment.userId).catch(() => null);

    const result = await punishmentService.executeAction(punishment, {
      guild,
      target: targetMember,
      targetUser,
      executorId: guild.members.me?.id ?? approverId,
    });

    await punishmentLogService.record(result.punishment);
    if (result.executed) await this.dmPunishedUser(result.punishment);

    return {
      punishment: result.punishment,
      executed: result.executed,
      pendingApproval: false,
      failureReason: result.failureReason,
    };
  }

  async getWhyInfo(
    punishmentId: string,
    requesterId: string,
  ): Promise<{ ok: true; text: string } | { ok: false; text: string }> {
    const punishment = await punishmentService.getPunishment(punishmentId);
    if (!punishment) return { ok: false, text: punishmentMessages.dm.gone };
    if (punishment.userId !== requesterId) {
      return { ok: false, text: punishmentMessages.dm.notYours };
    }
    if (
      !punishment.evidenceAvailableUntil ||
      punishment.evidenceAvailableUntil.getTime() <= Date.now()
    ) {
      return { ok: false, text: punishmentMessages.dm.windowExpired };
    }
    return {
      ok: true,
      text: punishmentMessages.dm.whyInfo(
        punishmentMessages.labels[punishment.type] ?? punishment.type,
        punishment.reason,
        punishment.evidence,
        punishment.executedAt,
      ),
    };
  }
}

export const resolutionService = new ResolutionService();

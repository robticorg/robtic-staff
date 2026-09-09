import type { Guild, GuildMember } from "discord.js";
import { Types } from "mongoose";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { channelConfigService, roleConfigService } from "../../configuration/index.ts";
import { ChannelConfigType, RoleConfigType } from "../../configuration/types/enums.ts";
import { buildWarnLogEmbed, type WarnLogInput } from "../render/warn-log.ts";
import {
  StaffActivityType,
  StaffHistoryAction,
  StaffPointTransactionType,
  staffActivityService,
  staffHistoryService,
  staffPointService,
  staffService,
} from "../../staff/index.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import { staffManagementService } from "../../staff/services/staff-management.service.ts";
import { StaffWarningModel } from "../models/staff-warning.model.ts";
import { UserWarningModel, type UserWarningDocument } from "../models/user-warning.model.ts";
import type { StaffWarningDocument } from "../models/staff-warning.model.ts";
import { staffWarningService, warningTypeOf } from "./staff-warning.service.ts";
import { userWarningService } from "./user-warning.service.ts";
import {
  STAFF_WARNING_FIRE_LEVEL,
  StaffWarningRealSource,
  StaffWarningType,
  WarningStatus,
  type StaffWarningLevel,
} from "../types/enums.ts";

const log = logger.child("warn-actions");

class WarnError extends DomainError {
  constructor(message: string) {
    super("WARN_ACTION", message);
  }
}

const WARN_ROLE_TYPE = {
  1: RoleConfigType.WARN_1,
  2: RoleConfigType.WARN_2,
  3: RoleConfigType.WARN_3,
} as const;

async function warnRoleIds(guildId: string): Promise<Record<1 | 2 | 3, string | null>> {
  const rows = await Promise.all(
    ([1, 2, 3] as const).map((lvl) => roleConfigService.getByType(guildId, WARN_ROLE_TYPE[lvl])),
  );
  return { 1: rows[0]?.roleId ?? null, 2: rows[1]?.roleId ?? null, 3: rows[2]?.roleId ?? null };
}

async function reconcileStaffWarnRoles(
  member: GuildMember,
  activeLevel: 0 | 1 | 2 | 3,
  reason: string,
): Promise<void> {
  const ids = await warnRoleIds(member.guild.id);
  const keep = activeLevel === 0 ? null : ids[activeLevel];
  for (const lvl of [1, 2, 3] as const) {
    const roleId = ids[lvl];
    if (!roleId || !member.guild.roles.cache.has(roleId)) continue;
    const shouldHave = roleId === keep;
    const has = member.roles.cache.has(roleId);
    if (shouldHave && !has) {
      await member.roles.add(roleId, reason).catch((err) => log.warn("warn role add failed", err));
    }
    if (!shouldHave && has) {
      await member.roles.remove(roleId, reason).catch((err) => log.warn("warn role remove failed", err));
    }
  }
}

export interface IssueUserWarnResult {
  warningId: string;
}

export interface EscalationResult {
  realWarningId: string;
  level: StaffWarningLevel;
  convertedVerbalCount: number;
  fired: boolean;
  blacklisted: boolean;
}

export interface IssueVerbalStaffWarnResult {
  verbalWarningId: string;
  verbalActiveCount: number;
  verbalConvertedCount: number;
  escalation?: EscalationResult;
}

export class WarningActionService {
  private async postWarnLog(guild: Guild, input: WarnLogInput): Promise<void> {
    try {
      const channelId = await channelConfigService.getChannelId(
        guild.id,
        ChannelConfigType.WARNING_LOG,
      );
      if (!channelId) return;
      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) return;
      await channel.send({ embeds: [buildWarnLogEmbed(input)] });
    } catch (err) {
      log.warn("warn log post failed", err);
    }
  }

  async issueUserWarning(params: {
    guildId: string;
    targetId: string;
    reason: string;
    issuer: GuildMember;
    evidence: string[];
  }): Promise<IssueUserWarnResult> {
    if (!params.reason?.trim()) throw new WarnError(prefixMessages.warn.reasonRequired);

    const warning = await userWarningService.issue({
      userId: params.targetId,
      guildId: params.guildId,
      reason: params.reason,
      issuedBy: params.issuer.id,
      evidence: params.evidence,
    });

    const issuerStaff = await staffService.ensure(params.issuer.id, params.guildId);
    const ref = warning._id.toString();
    const award = await staffPointService.add({
      staffId: issuerStaff._id,
      amount: 1,
      type: StaffPointTransactionType.USER_WARNING,
      referenceId: ref,
      reason: `User warning ${ref}`,
    });
    if (!award.duplicate) {
      await staffActivityService.create({
        staffId: issuerStaff._id,
        type: StaffActivityType.USER_WARNING,
        referenceId: ref,
        metadata: { targetId: params.targetId },
      });
      await staffService.incrementCounters(issuerStaff._id, { warningsIssued: 1 });
    }

    await this.postWarnLog(params.issuer.guild, {
      kind: "USER",
      targetId: params.targetId,
      issuerId: params.issuer.id,
      reason: params.reason,
      evidence: params.evidence,
      warningId: ref,
    });

    return { warningId: ref };
  }

  async issueVerbalStaffWarning(params: {
    guild: Guild;
    target: GuildMember;
    reason: string;
    issuer: GuildMember;
    evidence: string[];
  }): Promise<IssueVerbalStaffWarnResult> {
    const guildId = params.guild.id;
    if (!params.reason?.trim()) throw new WarnError(prefixMessages.warn.reasonRequired);

    const targetStaff = await staffService.get(params.target.id, guildId);
    if (!targetStaff) {
      throw new WarnError(prefixMessages.warn.staffWarnTargetNotStaff(`<@${params.target.id}>`));
    }
    if (targetStaff.status !== StaffStatus.ACTIVE) {
      throw new WarnError(prefixMessages.warn.staffWarnTargetInactive(`<@${params.target.id}>`));
    }

    const verbal = await staffWarningService.issueVerbal({
      guildId,
      staffId: targetStaff._id,
      reason: params.reason,
      issuedBy: params.issuer.id,
      evidence: params.evidence,
    });
    const ref = verbal._id.toString();

    const issuerStaff = await staffService.ensure(params.issuer.id, guildId);
    const award = await staffPointService.add({
      staffId: issuerStaff._id,
      amount: 1,
      type: StaffPointTransactionType.STAFF_WARNING,
      referenceId: ref,
      reason: `Staff verbal warning ${ref}`,
    });
    if (!award.duplicate) {
      await staffActivityService.create({
        staffId: issuerStaff._id,
        type: StaffActivityType.STAFF_WARNING,
        referenceId: ref,
        metadata: { targetId: params.target.id, kind: "VERBAL" },
      });
      await staffService.incrementCounters(issuerStaff._id, { staffWarningsIssued: 1 });
    }

    await this.postWarnLog(params.guild, {
      kind: "VERBAL",
      targetId: params.target.id,
      issuerId: params.issuer.id,
      reason: params.reason,
      evidence: params.evidence,
      warningId: ref,
    });

    const escalation = await this.escalate({
      guild: params.guild,
      target: params.target,
      staffObjectId: targetStaff._id,
      staffRoleLevel: targetStaff.currentRoleLevel ?? 0,
      actorId: params.issuer.id,
    });

    const [verbalActiveCount, verbalConvertedCount] = await Promise.all([
      staffWarningService.countActiveVerbal(targetStaff._id),
      staffWarningService.countConvertedVerbal(targetStaff._id),
    ]);

    return { verbalWarningId: ref, verbalActiveCount, verbalConvertedCount, escalation };
  }

  private async escalate(input: {
    guild: Guild;
    target: GuildMember;
    staffObjectId: Types.ObjectId;
    staffRoleLevel: number;
    actorId: string;
  }): Promise<EscalationResult | undefined> {
    const claimed = await staffWarningService.claimVerbalTriplet(input.staffObjectId);
    if (!claimed) return undefined;

    const currentLevel = await staffWarningService.currentRealLevel(input.staffObjectId);
    if (currentLevel >= STAFF_WARNING_FIRE_LEVEL) {
      log.warn(
        `staff ${input.staffObjectId.toString()} already at real warning level ${currentLevel}; skipping a 4th`,
      );
      await staffWarningService.linkConverted(claimed, new Types.ObjectId());
      return undefined;
    }
    const level = Math.min(STAFF_WARNING_FIRE_LEVEL, currentLevel + 1) as StaffWarningLevel;

    const real = await staffWarningService.issueReal({
      guildId: input.guild.id,
      staffId: input.staffObjectId,
      level,
      reason: "تحويل تلقائي من 3 تحذيرات شفوية",
      issuedBy: "SYSTEM",
      evidence: [],
      source: StaffWarningRealSource.VERBAL_ESCALATION,
      sourceVerbalWarningIds: claimed,
    });
    await staffWarningService.linkConverted(claimed, real._id as Types.ObjectId);

    await staffHistoryService.record({
      staffId: input.staffObjectId,
      action: StaffHistoryAction.STAFF_WARNING,
      performedBy: input.actorId,
      reason: real.reason,
      metadata: { level, warningId: real._id.toString(), source: StaffWarningRealSource.VERBAL_ESCALATION },
    });

    const fired = input.staffRoleLevel === 0 || level >= STAFF_WARNING_FIRE_LEVEL;

    await this.postWarnLog(input.guild, {
      kind: "REAL",
      targetId: input.target.id,
      issuerId: input.actorId,
      reason: real.reason,
      level,
      convertedFrom: claimed.length,
      evidence: [],
      warningId: real._id.toString(),
    });

    if (fired) {
      await staffManagementService.fire(input.target, "SYSTEM", true);
      return {
        realWarningId: real._id.toString(),
        level,
        convertedVerbalCount: claimed.length,
        fired: true,
        blacklisted: true,
      };
    }

    await reconcileStaffWarnRoles(input.target, level, `Real staff warning ${level}`);
    return {
      realWarningId: real._id.toString(),
      level,
      convertedVerbalCount: claimed.length,
      fired: false,
      blacklisted: false,
    };
  }

  async findWarning(
    warningId: string,
  ): Promise<
    | { kind: "USER"; doc: UserWarningDocument }
    | { kind: "STAFF"; doc: StaffWarningDocument }
    | null
  > {
    if (!Types.ObjectId.isValid(warningId)) return null;
    const [user, staff] = await Promise.all([
      UserWarningModel.findById(warningId).exec(),
      StaffWarningModel.findById(warningId).exec(),
    ]);
    if (user) return { kind: "USER", doc: user };
    if (staff) return { kind: "STAFF", doc: staff };
    return null;
  }

  async revokeWarning(params: {
    guild: Guild;
    warningId: string;
    targetId: string;
    actor: GuildMember;
    isStaffManager: boolean;
    reason?: string;
  }): Promise<{ kind: "USER" | "STAFF_VERBAL" | "STAFF_REAL" }> {
    const found = await this.findWarning(params.warningId);
    if (!found) throw new WarnError(prefixMessages.warn.warningNotFound);

    if (found.kind === "USER") {
      if (found.doc.userId !== params.targetId) {
        throw new WarnError(prefixMessages.warn.warningWrongUser);
      }
      if (found.doc.status !== WarningStatus.ACTIVE) {
        throw new WarnError(prefixMessages.warn.warningAlreadyInactive);
      }
      await userWarningService.revoke({
        warningId: found.doc._id,
        revokedBy: params.actor.id,
        revokeReason: params.reason,
      });
      return { kind: "USER" };
    }

    if (!params.isStaffManager) throw new WarnError(prefixMessages.warn.staffWarnManagerOnly);
    const targetStaff = await staffService.get(params.targetId, params.guild.id);
    if (!targetStaff || found.doc.staffId.toString() !== targetStaff._id.toString()) {
      throw new WarnError(prefixMessages.warn.warningWrongUser);
    }
    if (found.doc.status !== WarningStatus.ACTIVE) {
      throw new WarnError(prefixMessages.warn.warningAlreadyInactive);
    }

    const isVerbal = warningTypeOf(found.doc) === StaffWarningType.VERBAL;

    if (isVerbal) {
      await staffWarningService.remove({
        warningId: found.doc._id,
        removedBy: params.actor.id,
        removalReason: params.reason,
        status: WarningStatus.REVOKED,
      });
      await staffHistoryService.record({
        staffId: targetStaff._id,
        action: StaffHistoryAction.STAFF_WARNING_REMOVED,
        performedBy: params.actor.id,
        reason: params.reason,
        metadata: { warningId: found.doc._id.toString(), kind: StaffWarningType.VERBAL },
      });
      return { kind: "STAFF_VERBAL" };
    }

    const level = (found.doc.level ?? 0) as 0 | 1 | 2 | 3;
    await staffWarningService.remove({
      warningId: found.doc._id,
      removedBy: params.actor.id,
      removalReason: params.reason,
      status: WarningStatus.REMOVED,
    });

    const member = await params.guild.members.fetch(params.targetId).catch(() => null);
    if (member) {
      const newLevel = await staffWarningService.currentRealLevel(targetStaff._id);
      await reconcileStaffWarnRoles(
        member,
        Math.min(3, Math.max(0, newLevel)) as 0 | 1 | 2 | 3,
        `Real staff warning removed by ${params.actor.id}`,
      );
    }

    await staffHistoryService.record({
      staffId: targetStaff._id,
      action: StaffHistoryAction.STAFF_WARNING_REMOVED,
      performedBy: params.actor.id,
      reason: params.reason,
      metadata: { level, warningId: found.doc._id.toString(), kind: StaffWarningType.REAL },
    });

    return { kind: "STAFF_REAL" };
  }
}

export const warningActionService = new WarningActionService();

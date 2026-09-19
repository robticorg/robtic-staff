import type { Guild, GuildMember } from "discord.js";
import { Types } from "mongoose";
import { DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { channelConfigService, roleConfigService } from "../../configuration/index.ts";
import { ChannelConfigType, RoleConfigType } from "../../configuration/types/enums.ts";
import { buildWarnLogEmbed, type WarnLogInput } from "../render/warn-log.ts";
import { ModerationLogKind } from "../render/moderation-log-message.ts";
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
import {
  SYSTEM_ACTOR,
  staffManagementService,
} from "../../staff/services/staff-management.service.ts";
import { StaffWarningModel } from "../models/staff-warning.model.ts";
import { UserWarningModel, type UserWarningDocument } from "../models/user-warning.model.ts";
import type { StaffWarningDocument } from "../models/staff-warning.model.ts";
import { staffWarningService, warningTypeOf } from "./staff-warning.service.ts";
import { staffWarningLogService } from "./staff-warning-log.service.ts";
import { userWarningService } from "./user-warning.service.ts";
import {
  STAFF_WARNING_FIRE_LEVEL,
  StaffWarningRealSource,
  StaffWarningType,
  WarningCategory,
  WarningStatus,
  type StaffWarningLevel,
} from "../types/enums.ts";
import {
  OTHER_CATEGORY,
  decideWarningCategory,
  warnRoleTypes,
  warningCategoryOf,
} from "./warning-category.ts";
import { getHierarchy, highestLevelFromRoleIds } from "../../configuration/utils/staff-levels.ts";
import { StaffTier } from "../../configuration/types/enums.ts";

const log = logger.child("warn-actions");

class WarnError extends DomainError {
  constructor(message: string) {
    super("WARN_ACTION", message);
  }
}

async function warnRoleIds(
  guildId: string,
  category: WarningCategory,
): Promise<Record<1 | 2 | 3, string | null>> {
  const types = warnRoleTypes(category);
  const rows = await Promise.all(
    ([1, 2, 3] as const).map((lvl) => roleConfigService.getByType(guildId, types[lvl])),
  );
  return { 1: rows[0]?.roleId ?? null, 2: rows[1]?.roleId ?? null, 3: rows[2]?.roleId ?? null };
}

async function reconcileStaffWarnRoles(
  member: GuildMember,
  activeLevel: 0 | 1 | 2 | 3,
  reason: string,
  category: WarningCategory,
): Promise<void> {
  const ids = await warnRoleIds(member.guild.id, category);
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

export async function resolveWarningCategory(
  member: GuildMember,
): Promise<WarningCategory> {
  const hierarchy = await getHierarchy(member.guild.id);
  const level = highestLevelFromRoleIds(hierarchy, member.roles.cache.keys());
  if (level === null) return WarningCategory.STAFF;
  return decideWarningCategory(level, hierarchy.boundaryLevels[StaffTier.OWNER]);
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

export interface IssueDirectRealStaffWarnResult {
  realWarningId: string;
  level: StaffWarningLevel;
  fired: boolean;
  blacklisted: boolean;
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

    // The plain-text entry in the shared warning channel, so a user warning reads
    // the same whether it came from `!warn` or the warning panel.
    await staffWarningLogService.sendModerationAction({
      guild: params.issuer.guild,
      kind: ModerationLogKind.USER_WARN,
      targetId: params.targetId,
      reason: params.reason,
      evidence: params.evidence,
      moderatorId: params.issuer.id,
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
    if (!params.evidence?.length) throw new WarnError(prefixMessages.warn.proofRequired);

    const targetStaff = await staffService.get(params.target.id, guildId);
    if (!targetStaff) {
      throw new WarnError(prefixMessages.warn.staffWarnTargetNotStaff(`<@${params.target.id}>`));
    }
    if (targetStaff.status !== StaffStatus.ACTIVE) {
      throw new WarnError(prefixMessages.warn.staffWarnTargetInactive(`<@${params.target.id}>`));
    }

    const category = await resolveWarningCategory(params.target);

    const verbal = await staffWarningService.issueVerbal({
      guildId,
      staffId: targetStaff._id,
      category,
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

    await staffWarningLogService.sendVerbal({
      guild: params.guild,
      warningId: verbal._id,
      targetId: params.target.id,
    });

    const escalation = await this.escalate({
      guild: params.guild,
      target: params.target,
      staffObjectId: targetStaff._id,
      staffRoleLevel: targetStaff.currentRoleLevel ?? 0,
      actorId: params.issuer.id,
      category,
    });

    const [verbalActiveCount, verbalConvertedCount] = await Promise.all([
      staffWarningService.countActiveVerbal(targetStaff._id, category),
      staffWarningService.countConvertedVerbal(targetStaff._id, category),
    ]);

    return { verbalWarningId: ref, verbalActiveCount, verbalConvertedCount, escalation };
  }

  async issueDirectRealStaffWarning(params: {
    guild: Guild;
    target: GuildMember;
    reason: string;
    issuer: GuildMember;
    evidence: string[];
  }): Promise<IssueDirectRealStaffWarnResult> {
    const guildId = params.guild.id;
    if (!params.reason?.trim()) throw new WarnError(prefixMessages.warn.reasonRequired);
    if (!params.evidence?.length) throw new WarnError(prefixMessages.warn.proofRequired);

    const targetStaff = await staffService.get(params.target.id, guildId);
    if (!targetStaff) {
      throw new WarnError(prefixMessages.warn.staffWarnTargetNotStaff(`<@${params.target.id}>`));
    }
    if (targetStaff.status !== StaffStatus.ACTIVE) {
      throw new WarnError(prefixMessages.warn.staffWarnTargetInactive(`<@${params.target.id}>`));
    }

    const category = await resolveWarningCategory(params.target);
    const currentLevel = await staffWarningService.currentRealLevel(targetStaff._id, category);
    const level = Math.min(STAFF_WARNING_FIRE_LEVEL, currentLevel + 1) as StaffWarningLevel;

    const real = await staffWarningService.issueReal({
      guildId,
      staffId: targetStaff._id,
      category,
      level,
      reason: params.reason,
      issuedBy: params.issuer.id,
      evidence: params.evidence,
      source: StaffWarningRealSource.MANUAL,
    });
    const ref = real._id.toString();

    const issuerStaff = await staffService.ensure(params.issuer.id, guildId);
    const award = await staffPointService.add({
      staffId: issuerStaff._id,
      amount: 1,
      type: StaffPointTransactionType.STAFF_WARNING,
      referenceId: ref,
      reason: `Staff real warning ${ref}`,
    });
    if (!award.duplicate) {
      await staffActivityService.create({
        staffId: issuerStaff._id,
        type: StaffActivityType.STAFF_WARNING,
        referenceId: ref,
        metadata: { targetId: params.target.id, kind: "REAL" },
      });
      await staffService.incrementCounters(issuerStaff._id, { staffWarningsIssued: 1 });
    }

    await staffHistoryService.record({
      staffId: targetStaff._id,
      action: StaffHistoryAction.STAFF_WARNING,
      performedBy: params.issuer.id,
      reason: params.reason,
      metadata: { level, warningId: ref, source: StaffWarningRealSource.MANUAL, category },
    });

    await this.postWarnLog(params.guild, {
      kind: "REAL",
      targetId: params.target.id,
      issuerId: params.issuer.id,
      reason: params.reason,
      level,
      evidence: params.evidence,
      warningId: ref,
    });

    await staffWarningLogService.send({
      guild: params.guild,
      warningId: real._id,
      targetId: params.target.id,
    });

    const fired = (targetStaff.currentRoleLevel ?? 0) === 0 || level >= STAFF_WARNING_FIRE_LEVEL;

    if (fired) {
      await staffManagementService.fire(params.target, SYSTEM_ACTOR, true);
      return { realWarningId: ref, level, fired: true, blacklisted: true };
    }

    await reconcileStaffWarnRoles(params.target, level, `Real staff warning ${level}`, category);
    return { realWarningId: ref, level, fired: false, blacklisted: false };
  }

  private async escalate(input: {
    guild: Guild;
    target: GuildMember;
    staffObjectId: Types.ObjectId;
    staffRoleLevel: number;
    actorId: string;
    category: WarningCategory;
  }): Promise<EscalationResult | undefined> {
    const claimed = await staffWarningService.claimVerbalTriplet(
      input.staffObjectId,
      input.category,
    );
    if (!claimed) return undefined;

    const currentLevel = await staffWarningService.currentRealLevel(
      input.staffObjectId,
      input.category,
    );
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
      category: input.category,
      level,
      reason: "حصل على 3 تحذيرات شفوية",
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
      metadata: {
        level,
        warningId: real._id.toString(),
        source: StaffWarningRealSource.VERBAL_ESCALATION,
        category: input.category,
      },
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

    await staffWarningLogService.send({
      guild: input.guild,
      warningId: real._id,
      targetId: input.target.id,
    });

    if (fired) {
      await staffManagementService.fire(input.target, SYSTEM_ACTOR, true);
      return {
        realWarningId: real._id.toString(),
        level,
        convertedVerbalCount: claimed.length,
        fired: true,
        blacklisted: true,
      };
    }

    await reconcileStaffWarnRoles(
      input.target,
      level,
      `Real staff warning ${level}`,
      input.category,
    );
    return {
      realWarningId: real._id.toString(),
      level,
      convertedVerbalCount: claimed.length,
      fired: false,
      blacklisted: false,
    };
  }

  async syncWarningCategoryRoles(member: GuildMember, reason: string): Promise<void> {
    const staff = await staffService.get(member.id, member.guild.id);
    if (!staff) return;

    const category = await resolveWarningCategory(member);
    const level = await staffWarningService.currentRealLevel(staff._id, category);
    const active = Math.min(3, Math.max(0, level)) as 0 | 1 | 2 | 3;

    await reconcileStaffWarnRoles(member, active, reason, category);
    await reconcileStaffWarnRoles(member, 0, reason, OTHER_CATEGORY[category]);
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
  }): Promise<{ kind: "USER" | "STAFF_VERBAL" | "STAFF_REAL"; category?: WarningCategory }> {
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
        metadata: {
        warningId: found.doc._id.toString(),
        kind: StaffWarningType.VERBAL,
        category: warningCategoryOf(found.doc),
      },
      });
      return { kind: "STAFF_VERBAL", category: warningCategoryOf(found.doc) };
    }

    const category = warningCategoryOf(found.doc);
    const level = (found.doc.level ?? 0) as 0 | 1 | 2 | 3;
    await staffWarningService.remove({
      warningId: found.doc._id,
      removedBy: params.actor.id,
      removalReason: params.reason,
      status: WarningStatus.REMOVED,
    });

    const member = await params.guild.members.fetch(params.targetId).catch(() => null);
    if (member) {
      const newLevel = await staffWarningService.currentRealLevel(targetStaff._id, category);
      await reconcileStaffWarnRoles(
        member,
        Math.min(3, Math.max(0, newLevel)) as 0 | 1 | 2 | 3,
        `Real staff warning removed by ${params.actor.id}`,
        category,
      );
    }

    await staffHistoryService.record({
      staffId: targetStaff._id,
      action: StaffHistoryAction.STAFF_WARNING_REMOVED,
      performedBy: params.actor.id,
      reason: params.reason,
      metadata: {
        level,
        warningId: found.doc._id.toString(),
        kind: StaffWarningType.REAL,
        category,
      },
    });

    return { kind: "STAFF_REAL", category };
  }
}

export const warningActionService = new WarningActionService();

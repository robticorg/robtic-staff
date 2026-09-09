import { ChannelType, type Guild, type GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { ConflictError, DomainError, isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { vacationConfig } from "../../../data/vacation/config.ts";
import { vacationMessages } from "../../../data/vacation/messages.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { staffService } from "../../staff/services/staff.service.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import { staffActivityService } from "../../staff/services/staff-activity.service.ts";
import { staffHistoryService } from "../../staff/services/staff-history.service.ts";
import { StaffActivityType, StaffHistoryAction, StaffStatus } from "../../staff/types/enums.ts";
import { VacationModel, type Vacation, type VacationDocument } from "../models/vacation.model.ts";
import { buildRequestCard } from "../render/request-card.ts";
import { VacationSource, VacationStatus, VacationType } from "../types/enums.ts";
import {
  formatDuration,
  parseApplicationDuration,
  parseBreakDuration,
  resolveWindow,
} from "./duration.ts";
import { vacationRoleService } from "./vacation-roles.service.ts";
import { requireVacationClient } from "../runtime.ts";

const log = logger.child("vacation");
const M = vacationMessages;
const BOT_ACTOR = "BOT";

export class VacationError extends DomainError {}

export interface ManualBreakInput {
  guildId: GuildId;
  member: GuildMember;
  actorId: UserId;
  durationInput: string;
  reason?: string;
}

export interface ApplicationInput {
  guildId: GuildId;
  member: GuildMember;
  reasonInput: string;
  durationInput: string;
}

export interface DecisionInput {
  vacationId: string;
  manager: GuildMember;
  reason?: string;
}

export interface UnbreakInput {
  guildId: GuildId;
  staffId: UserId;
  member: GuildMember | null;
  actorId: UserId;
}

export type ExpiryOutcome =
  | "completed"
  | "completed-no-restore"
  | "deferred"
  | "already"
  | "skipped";

export class VacationService extends BaseRepository<Vacation> {
  constructor() {
    super(VacationModel);
  }

  getByVacationId(vacationId: string): Promise<VacationDocument | null> {
    return this.findOne({ vacationId });
  }

  getActiveVacation(guildId: GuildId, staffId: UserId): Promise<VacationDocument | null> {
    return this.findOne({ guildId, staffId, status: VacationStatus.ACTIVE });
  }

  getOpenVacation(guildId: GuildId, staffId: UserId): Promise<VacationDocument | null> {
    return this.findOne({ guildId, staffId, isOpen: true });
  }

  getPendingApplications(guildId: GuildId): Promise<VacationDocument[]> {
    return VacationModel.find({
      guildId,
      type: VacationType.APPLICATION,
      status: VacationStatus.PENDING,
    })
      .sort({ createdAt: 1 })
      .exec();
  }

  listExpirable(now: Date, limit: number): Promise<VacationDocument[]> {
    return VacationModel.find({ status: VacationStatus.ACTIVE, endsAt: { $lte: now } })
      .sort({ endsAt: 1 })
      .limit(limit)
      .exec();
  }

  async createManualBreak(input: ManualBreakInput): Promise<{ vacation: VacationDocument }> {
    const { guildId, member, actorId } = input;

    const duration = parseBreakDuration(input.durationInput);
    if (!duration) throw new VacationError("VACATION_BAD_DURATION", M.break.invalidDuration);

    const vacationRoleId = await vacationRoleService.getVacationRoleId(guildId);
    if (!vacationRoleId) {
      throw new VacationError("VACATION_ROLE_UNSET", M.break.roleNotConfigured);
    }

    if (await this.getOpenVacation(guildId, member.id)) {
      throw new VacationError("VACATION_ALREADY_OPEN", M.break.alreadyOnVacation(`<@${member.id}>`));
    }

    if (!(await staffPermissionService.isStaff(member))) {
      throw new VacationError("VACATION_TARGET_NOT_STAFF", M.break.targetNotStaff(`<@${member.id}>`));
    }

    const snapshot = await vacationRoleService.snapshot(member, guildId);
    await vacationRoleService.preflight(member.guild, vacationRoleId, snapshot);

    const now = new Date();
    const window = resolveWindow(now, duration);
    const reason = (input.reason?.trim() || M.break.reasonPlaceholder).slice(
      0,
      vacationConfig.maxReasonLength,
    );

    let vacation: VacationDocument;
    try {
      vacation = await VacationModel.create({
        guildId,
        staffId: member.id,
        type: VacationType.MANUAL,
        status: VacationStatus.PENDING,
        source: VacationSource.MANUAL_COMMAND,
        reason,
        duration: duration.value,
        durationUnit: duration.unit,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        requestedAt: now,
        savedRoleIds: snapshot,
        isOpen: true,
        metadata: { actorId },
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new VacationError(
          "VACATION_ALREADY_OPEN",
          M.break.alreadyOnVacation(`<@${member.id}>`),
        );
      }
      throw err;
    }

    try {
      await vacationRoleService.removeStaffRoles(member, snapshot, `Break: ${reason}`);
      await vacationRoleService.applyVacationRole(member, vacationRoleId, `Break: ${reason}`);
    } catch (err) {
      await this.abortActivation(vacation, member, vacationRoleId, snapshot, err);
      throw err;
    }

    const active = await VacationModel.findOneAndUpdate(
      { _id: vacation._id, status: VacationStatus.PENDING },
      { $set: { status: VacationStatus.ACTIVE, savedRoleIds: snapshot } },
      { returnDocument: "after" },
    ).exec();
    if (!active) throw new ConflictError(M.break.alreadyOnVacation(`<@${member.id}>`));

    await this.bookkeepingBreak(member.id, guildId, active, actorId, StaffActivityType.BREAK);
    await this.dm(member.id, {
      content: M.dm.startedByManager(formatDuration(duration), active.endsAt),
    });

    return { vacation: active };
  }

  async createApplication(input: ApplicationInput): Promise<{ vacation: VacationDocument }> {
    const { guildId, member } = input;

    if (await this.getOpenVacation(guildId, member.id)) {
      throw new VacationError("VACATION_ALREADY_OPEN", M.application.alreadyOnVacation);
    }

    if (!(await staffPermissionService.isStaff(member))) {
      throw new VacationError("VACATION_NOT_STAFF", M.application.notStaff);
    }

    const reason = input.reasonInput.trim();
    if (!reason) throw new VacationError("VACATION_REASON_REQUIRED", M.application.reasonRequired);

    const duration = parseApplicationDuration(input.durationInput);
    if (!duration) throw new VacationError("VACATION_BAD_DURATION", M.application.invalidDuration);

    const vacationRoleId = await vacationRoleService.getVacationRoleId(guildId);
    if (!vacationRoleId) {
      throw new VacationError("VACATION_ROLE_UNSET", M.application.roleNotConfigured);
    }

    const channelId = await channelConfigService.getChannelId(
      guildId,
      ChannelConfigType.VACATION_REQUESTS,
    );
    if (!channelId) {
      throw new VacationError("VACATION_CHANNEL_UNSET", M.application.channelNotConfigured);
    }
    const channel = await requireVacationClient().channels.fetch(channelId).catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      throw new VacationError("VACATION_CHANNEL_BAD", M.application.channelUnavailable);
    }

    if (await this.getOpenVacation(guildId, member.id)) {
      throw new VacationError("VACATION_ALREADY_OPEN", M.application.alreadyOnVacation);
    }

    const now = new Date();
    const window = resolveWindow(now, duration);

    let vacation: VacationDocument;
    try {
      vacation = await VacationModel.create({
        guildId,
        staffId: member.id,
        type: VacationType.APPLICATION,
        status: VacationStatus.PENDING,
        source: VacationSource.APPLICATION,
        reason: reason.slice(0, vacationConfig.maxReasonLength),
        duration: duration.value,
        durationUnit: duration.unit,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        requestedAt: now,
        savedRoleIds: [],
        isOpen: true,
        channelId,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new VacationError("VACATION_ALREADY_OPEN", M.application.alreadyOnVacation);
      }
      throw err;
    }

    try {
      const message = await channel.send(buildRequestCard(vacation));
      vacation.messageId = message.id;
      await vacation.save();
    } catch (err) {
      await VacationModel.deleteOne({ _id: vacation._id }).exec();
      throw new VacationError("VACATION_CHANNEL_BAD", M.application.channelUnavailable, {
        cause: String(err),
      });
    }

    const staff = await staffService.ensure(member.id, guildId);
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.VACATION_REQUEST,
      referenceId: vacation.vacationId,
      metadata: this.activityMeta(vacation),
    });

    await this.dm(member.id, { content: M.dm.submitted(formatDuration(duration)) });

    return { vacation };
  }

  async approveApplication(input: DecisionInput): Promise<{ vacation: VacationDocument }> {
    const { manager } = input;
    const vacation = await this.getByVacationId(input.vacationId);
    if (!vacation) throw new VacationError("VACATION_GONE", M.request.gone);
    if (vacation.guildId !== manager.guild.id) throw new VacationError("VACATION_GONE", M.request.gone);
    if (!(await staffPermissionService.isStaffManager(manager))) {
      throw new VacationError("VACATION_FORBIDDEN", M.request.notAuthorized);
    }
    if (vacation.status !== VacationStatus.PENDING) {
      throw new ConflictError(M.request.alreadyDecided, { vacationId: vacation.vacationId });
    }

    const target = await manager.guild.members.fetch(vacation.staffId).catch(() => null);
    if (!target) throw new VacationError("VACATION_APPLICANT_GONE", M.request.applicantGone);
    if (!(await staffPermissionService.isStaff(target))) {
      throw new VacationError("VACATION_APPLICANT_NOT_STAFF", M.request.applicantNotStaff);
    }

    const vacationRoleId = await vacationRoleService.getVacationRoleId(vacation.guildId);
    if (!vacationRoleId) {
      throw new VacationError("VACATION_ROLE_UNSET", M.application.roleNotConfigured);
    }

    const snapshot = await vacationRoleService.snapshot(target, vacation.guildId);
    await vacationRoleService.preflight(manager.guild, vacationRoleId, snapshot);

    const claimed = await VacationModel.findOneAndUpdate(
      { _id: vacation._id, status: VacationStatus.PENDING },
      {
        $set: {
          status: VacationStatus.APPROVED,
          approvedBy: manager.id,
          approvedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!claimed) throw new ConflictError(M.request.alreadyDecided);

    let active: VacationDocument;
    try {
      await vacationRoleService.removeStaffRoles(target, snapshot, `Vacation: ${vacation.reason}`);
      await vacationRoleService.applyVacationRole(
        target,
        vacationRoleId,
        `Vacation: ${vacation.reason}`,
      );

      const window = resolveWindow(new Date(), {
        value: vacation.duration,
        unit: vacation.durationUnit,
      });
      const updated = await VacationModel.findOneAndUpdate(
        { _id: vacation._id, status: VacationStatus.APPROVED },
        {
          $set: {
            status: VacationStatus.ACTIVE,
            savedRoleIds: snapshot,
            startsAt: window.startsAt,
            endsAt: window.endsAt,
          },
        },
        { returnDocument: "after" },
      ).exec();
      if (!updated) throw new ConflictError(M.request.alreadyDecided);
      active = updated;
    } catch (err) {
      await vacationRoleService.removeVacationRole(target, vacationRoleId, "Vacation activation failed");
      await vacationRoleService.rollbackStaffRoles(target, snapshot, "Vacation activation failed");
      await VacationModel.findOneAndUpdate(
        { _id: vacation._id, status: VacationStatus.APPROVED },
        { $set: { status: VacationStatus.PENDING }, $unset: { approvedBy: "", approvedAt: "" } },
      ).exec();
      await this.refreshRequestCard(vacation.vacationId);
      log.warn(`vacation ${vacation.vacationId} activation failed`, err);
      throw new VacationError("VACATION_ACTIVATION_FAILED", M.request.activationFailed);
    }

    await this.bookkeepingBreak(
      target.id,
      vacation.guildId,
      active,
      manager.id,
      StaffActivityType.VACATION_APPROVED,
    );
    await this.refreshRequestCard(vacation.vacationId);
    await this.dm(target.id, { content: M.dm.approved(active.endsAt) });

    return { vacation: active };
  }

  async rejectApplication(input: DecisionInput): Promise<{ vacation: VacationDocument }> {
    const { manager } = input;
    const vacation = await this.getByVacationId(input.vacationId);
    if (!vacation) throw new VacationError("VACATION_GONE", M.request.gone);
    if (vacation.guildId !== manager.guild.id) throw new VacationError("VACATION_GONE", M.request.gone);
    if (!(await staffPermissionService.isStaffManager(manager))) {
      throw new VacationError("VACATION_FORBIDDEN", M.request.notAuthorized);
    }

    const reason = (input.reason ?? "").trim();
    if (!reason) throw new VacationError("VACATION_REASON_REQUIRED", M.request.refuseReasonRequired);

    const rejected = await VacationModel.findOneAndUpdate(
      { _id: vacation._id, status: VacationStatus.PENDING },
      {
        $set: {
          status: VacationStatus.REJECTED,
          rejectedBy: manager.id,
          rejectedAt: new Date(),
          rejectionReason: reason.slice(0, 1000),
          isOpen: false,
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!rejected) throw new ConflictError(M.request.alreadyDecided);

    const staff = await staffService.ensure(vacation.staffId, vacation.guildId);
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.VACATION_REJECTED,
      referenceId: vacation.vacationId,
      metadata: { ...this.activityMeta(rejected), reason },
    });

    await this.refreshRequestCard(vacation.vacationId);
    await this.dm(vacation.staffId, { content: M.dm.rejected(reason) });

    return { vacation: rejected };
  }

  async unbreak(
    input: UnbreakInput,
  ): Promise<{ vacation: VacationDocument; restoredCount: number; missingCount: number }> {
    const { guildId, staffId, member, actorId } = input;

    const cancelled = await VacationModel.findOneAndUpdate(
      { guildId, staffId, status: VacationStatus.ACTIVE },
      {
        $set: {
          status: VacationStatus.CANCELLED,
          endedBy: actorId,
          endedAt: new Date(),
          isOpen: false,
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!cancelled) {
      throw new VacationError("VACATION_NOT_ACTIVE", M.unbreak.notOnVacation(`<@${staffId}>`));
    }

    let restoredCount = 0;
    let missingCount = 0;
    if (member) {
      const vacationRoleId = await vacationRoleService.getVacationRoleId(guildId);
      if (vacationRoleId) {
        await vacationRoleService.removeVacationRole(member, vacationRoleId, "Break ended by manager");
      }
      const outcome = await vacationRoleService.restoreSavedRoles(
        member,
        cancelled.savedRoleIds,
        "Break ended by manager",
      );
      restoredCount = outcome.restored.length;
      missingCount = outcome.missing.length;
      await VacationModel.updateOne({ _id: cancelled._id }, { $set: { rolesRestored: true } }).exec();
      await this.dm(staffId, { content: M.dm.brokenByManager });
    } else {
      await VacationModel.updateOne(
        { _id: cancelled._id },
        { $set: { rolesRestored: false, restoreDeferredAt: new Date() } },
      ).exec();
    }

    await this.bookkeepingReturn(staffId, guildId, cancelled, actorId);
    return { vacation: cancelled, restoredCount, missingCount };
  }

  async expireVacation(vacation: VacationDocument): Promise<ExpiryOutcome> {
    if (vacation.status !== VacationStatus.ACTIVE) return "already";

    const client = requireVacationClient();
    const guild = client.guilds.cache.get(vacation.guildId);
    if (!guild) return "skipped";

    const member = await guild.members.fetch(vacation.staffId).catch(() => null);

    if (!member) {
      const overGrace = Date.now() - vacation.endsAt.getTime() > vacationConfig.absentGraceMs;
      if (!overGrace) {
        if (!vacation.restoreDeferredAt) {
          await VacationModel.updateOne(
            { _id: vacation._id, status: VacationStatus.ACTIVE },
            { $set: { restoreDeferredAt: new Date() } },
          ).exec();
        }
        return "deferred";
      }
      const forced = await VacationModel.findOneAndUpdate(
        { _id: vacation._id, status: VacationStatus.ACTIVE },
        {
          $set: {
            status: VacationStatus.COMPLETED,
            endedBy: BOT_ACTOR,
            endedAt: new Date(),
            isOpen: false,
            rolesRestored: false,
          },
        },
        { returnDocument: "after" },
      ).exec();
      if (!forced) return "already";
      await this.bookkeepingReturn(vacation.staffId, vacation.guildId, forced, BOT_ACTOR);
      log.warn(
        `vacation ${vacation.vacationId} force-completed — member ${vacation.staffId} absent past grace`,
      );
      return "completed-no-restore";
    }

    const completed = await VacationModel.findOneAndUpdate(
      { _id: vacation._id, status: VacationStatus.ACTIVE },
      {
        $set: {
          status: VacationStatus.COMPLETED,
          endedBy: BOT_ACTOR,
          endedAt: new Date(),
          isOpen: false,
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!completed) return "already";

    const vacationRoleId = await vacationRoleService.getVacationRoleId(vacation.guildId);
    if (vacationRoleId) {
      await vacationRoleService.removeVacationRole(member, vacationRoleId, "Vacation ended");
    }
    await vacationRoleService.restoreSavedRoles(member, completed.savedRoleIds, "Vacation ended");
    await VacationModel.updateOne({ _id: completed._id }, { $set: { rolesRestored: true } }).exec();

    await this.bookkeepingReturn(vacation.staffId, vacation.guildId, completed, BOT_ACTOR);
    await this.dm(vacation.staffId, { content: M.dm.completed });

    return "completed";
  }

  private async abortActivation(
    vacation: VacationDocument,
    member: GuildMember,
    vacationRoleId: string,
    snapshot: readonly string[],
    err: unknown,
  ): Promise<void> {
    await vacationRoleService.removeVacationRole(member, vacationRoleId, "Break activation failed");
    await vacationRoleService.rollbackStaffRoles(member, snapshot, "Break activation failed");
    await VacationModel.findOneAndUpdate(
      { _id: vacation._id, status: VacationStatus.PENDING },
      {
        $set: {
          status: VacationStatus.CANCELLED,
          isOpen: false,
          endedBy: BOT_ACTOR,
          endedAt: new Date(),
          metadata: { ...(vacation.metadata ?? {}), activationError: String(err) },
        },
      },
    ).exec();
  }

  private activityMeta(vacation: Vacation): Record<string, unknown> {
    return {
      vacationId: vacation.vacationId,
      duration: vacation.duration,
      durationUnit: vacation.durationUnit,
      startsAt: vacation.startsAt,
      endsAt: vacation.endsAt,
      source: vacation.source,
    };
  }

  private async bookkeepingBreak(
    staffId: UserId,
    guildId: GuildId,
    vacation: Vacation,
    actorId: string,
    activityType: StaffActivityType,
  ): Promise<void> {
    const staff = await staffService.ensure(staffId, guildId);
    if (staff.status === StaffStatus.ACTIVE) {
      await staffService.update(staff._id, { status: StaffStatus.BREAK });
    }
    await staffHistoryService.record({
      staffId: staff._id,
      action: StaffHistoryAction.BREAK,
      performedBy: actorId,
      previousRoleLevel: staff.currentRoleLevel,
      newRoleLevel: staff.currentRoleLevel,
      reason: vacation.reason,
      metadata: this.activityMeta(vacation),
    });
    if (activityType !== StaffActivityType.BREAK) {
      await staffActivityService.create({
        staffId: staff._id,
        type: activityType,
        referenceId: vacation.vacationId,
        metadata: this.activityMeta(vacation),
      });
    }
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.BREAK,
      referenceId: vacation.vacationId,
      metadata: this.activityMeta(vacation),
    });
  }

  private async bookkeepingReturn(
    staffId: UserId,
    guildId: GuildId,
    vacation: Vacation,
    endedBy: string,
  ): Promise<void> {
    const staff = await staffService.ensure(staffId, guildId);
    if (staff.status === StaffStatus.BREAK) {
      await StaffModel.findOneAndUpdate(
        { _id: staff._id, status: StaffStatus.BREAK },
        { $set: { status: StaffStatus.ACTIVE } },
      ).exec();
    }
    await staffHistoryService.record({
      staffId: staff._id,
      action: StaffHistoryAction.RETURN_FROM_BREAK,
      performedBy: endedBy,
      previousRoleLevel: staff.currentRoleLevel,
      newRoleLevel: staff.currentRoleLevel,
      metadata: this.activityMeta(vacation),
    });
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.RETURN_FROM_BREAK,
      referenceId: vacation.vacationId,
      metadata: { ...this.activityMeta(vacation), endedBy },
    });
  }

  private async refreshRequestCard(vacationId: string): Promise<void> {
    try {
      const vacation = await this.getByVacationId(vacationId);
      if (!vacation?.channelId || !vacation.messageId) return;
      const channel = await requireVacationClient()
        .channels.fetch(vacation.channelId)
        .catch(() => null);
      if (!channel || !("messages" in channel)) return;
      const message = await channel.messages.fetch(vacation.messageId).catch(() => null);
      if (!message) return;
      await message.edit(buildRequestCard(vacation));
    } catch (err) {
      log.warn(`request card refresh failed for ${vacationId}`, err);
    }
  }

  private async dm(userId: UserId, payload: { content: string }): Promise<void> {
    try {
      const user = await requireVacationClient().users.fetch(userId);
      const channel = await user.createDM();
      await channel.send({ ...payload, allowedMentions: { parse: [] } });
    } catch (err) {
      log.warn(`vacation DM to ${userId} failed`, err);
    }
  }
}

export const vacationService = new VacationService();

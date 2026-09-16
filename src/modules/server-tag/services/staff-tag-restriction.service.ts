import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { serverTagConfig } from "../../../data/server-tag/config.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffStatus } from "../../staff/types/enums.ts";
import {
  StaffTagRestrictionModel,
  type StaffTagRestriction,
  type StaffTagRestrictionDocument,
} from "../models/staff-tag-restriction.model.ts";
import { StaffTagRestorationReason, StaffTagRestrictionStatus } from "../types/enums.ts";

const log = logger.child("server-tag:restriction");

export interface CreateRestrictionInput {
  guildId: GuildId;
  staffId: UserId;
  savedRoleIds: readonly RoleId[];
  /** Defaults to `serverTagConfig.restrictionDurationMs`. */
  durationMs?: number;
  now?: Date;
}

export type CreateRestrictionResult =
  | { outcome: "created"; restriction: StaffTagRestrictionDocument }
  | { outcome: "already-active"; restriction: StaffTagRestrictionDocument | null };

export interface CloseRestrictionInput {
  restriction: StaffTagRestrictionDocument;
  status: StaffTagRestrictionStatus;
  reason: StaffTagRestorationReason;
  restoredBy: string;
  now?: Date;
}

export class StaffTagRestrictionService extends BaseRepository<StaffTagRestriction> {
  constructor() {
    super(StaffTagRestrictionModel);
  }

  getByRestrictionId(restrictionId: string): Promise<StaffTagRestrictionDocument | null> {
    return this.findOne({ restrictionId });
  }

  /** §19 — only an ACTIVE restriction may trigger an early restore. */
  getActiveRestriction(
    guildId: GuildId,
    staffId: UserId,
  ): Promise<StaffTagRestrictionDocument | null> {
    return this.findOne({ guildId, staffId, isActive: true });
  }

  listExpirable(now: Date, limit: number): Promise<StaffTagRestrictionDocument[]> {
    return StaffTagRestrictionModel.find({ isActive: true, expiresAt: { $lte: now } })
      .sort({ expiresAt: 1 })
      .limit(limit)
      .exec();
  }

  countActive(guildId: GuildId): Promise<number> {
    return this.count({ guildId, isActive: true });
  }

  /**
   * §20 — the partial unique index is the arbiter. Two concurrent tag-remove
   * events race here and exactly one wins; the loser reports `already-active`
   * and must not take a second snapshot.
   */
  async createRestriction(input: CreateRestrictionInput): Promise<CreateRestrictionResult> {
    const now = input.now ?? new Date();
    const durationMs = input.durationMs ?? serverTagConfig.restrictionDurationMs;
    const expiresAt = new Date(now.getTime() + durationMs);

    try {
      const restriction = await StaffTagRestrictionModel.create({
        guildId: input.guildId,
        staffId: input.staffId,
        savedRoleIds: [...input.savedRoleIds],
        startedAt: now,
        expiresAt,
        status: StaffTagRestrictionStatus.ACTIVE,
        isActive: true,
      });
      return { outcome: "created", restriction };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await this.getActiveRestriction(input.guildId, input.staffId);
        return { outcome: "already-active", restriction: existing };
      }
      throw err;
    }
  }

  /**
   * Atomically claim an ACTIVE restriction so only one caller performs the
   * Discord role writes. Returns null when someone else already closed it.
   */
  async claimForClosure(input: CloseRestrictionInput): Promise<StaffTagRestrictionDocument | null> {
    const now = input.now ?? new Date();
    return StaffTagRestrictionModel.findOneAndUpdate(
      {
        _id: input.restriction._id,
        status: StaffTagRestrictionStatus.ACTIVE,
        isActive: true,
      },
      {
        $set: {
          status: input.status,
          isActive: false,
          restoredAt: now,
          restoredBy: input.restoredBy,
          restorationReason: input.reason,
        },
      },
      { returnDocument: "after" },
    ).exec();
  }

  async markRolesRestored(
    restriction: StaffTagRestrictionDocument,
    rolesRestored: boolean,
    missingRoleIds: readonly RoleId[] = [],
  ): Promise<void> {
    await StaffTagRestrictionModel.updateOne(
      { _id: restriction._id },
      {
        $set: {
          rolesRestored,
          ...(missingRoleIds.length > 0 ? { missingRoleIds: [...missingRoleIds] } : {}),
        },
      },
    ).exec();
  }

  /**
   * §12 — a restriction may only hand roles back if the Staff lifecycle still
   * allows it. A member fired or blacklisted mid-restriction must not get
   * their Staff roles back just because a timer elapsed.
   */
  async canRestoreStaffRoles(
    guildId: GuildId,
    staffId: UserId,
  ): Promise<{ allowed: boolean; status: string | null }> {
    const staff = await StaffModel.findOne({ guildId, userId: staffId })
      .select({ status: 1 })
      .exec();
    if (!staff) return { allowed: true, status: null };
    const blocked: string[] = [StaffStatus.FIRED, StaffStatus.BLACKLISTED];
    return { allowed: !blocked.includes(staff.status), status: staff.status };
  }

  /** Used when the tag role config disappears, or for operator cleanup. */
  async cancelRestriction(
    restriction: StaffTagRestrictionDocument,
    restoredBy: string,
    reason: StaffTagRestorationReason = StaffTagRestorationReason.MANUAL,
  ): Promise<StaffTagRestrictionDocument | null> {
    const cancelled = await this.claimForClosure({
      restriction,
      status: StaffTagRestrictionStatus.CANCELLED,
      reason,
      restoredBy,
    });
    if (cancelled) {
      log.info(`restriction ${cancelled.restrictionId} cancelled (${reason})`);
      await this.markRolesRestored(cancelled, false);
    }
    return cancelled;
  }
}

export const staffTagRestrictionService = new StaffTagRestrictionService();

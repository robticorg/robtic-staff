import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, IdLike, UserId } from "../../../shared/types/index.ts";
import { NotFoundError, ValidationError } from "../../../shared/utils/errors.ts";
import { StaffModel, type Staff } from "../models/staff.model.ts";
import { STAFF_STATUS_VALUES, StaffStatus } from "../types/enums.ts";

export interface CreateStaffInput {
  userId: UserId;
  guildId: GuildId;
  currentRoleLevel?: number;
  status?: StaffStatus;
  acceptedBy?: UserId;
  acceptedAt?: Date;
}

export type StaffCounter =
  | "reportsClaimed"
  | "reportsCompleted"
  | "ticketsClaimed"
  | "ticketsCompleted"
  | "giftClaimsHandled"
  | "warningsIssued"
  | "staffWarningsIssued";

export interface StaffStats {
  points: number;
  reportsClaimed: number;
  reportsCompleted: number;
  ticketsClaimed: number;
  ticketsCompleted: number;
  giftClaimsHandled: number;
  warningsIssued: number;
  staffWarningsIssued: number;
}

export class StaffService extends BaseRepository<Staff> {
  constructor() {
    super(StaffModel);
  }

  get(userId: UserId, guildId: GuildId): Promise<HydratedDocument<Staff> | null> {
    return this.findOne({ userId, guildId });
  }

  async getOrThrow(userId: UserId, guildId: GuildId): Promise<HydratedDocument<Staff>> {
    const staff = await this.get(userId, guildId);
    if (!staff) throw new NotFoundError("staff", { userId, guildId });
    return staff;
  }

  async getByIdOrThrow(id: IdLike): Promise<HydratedDocument<Staff>> {
    const staff = await this.findById(id);
    if (!staff) throw new NotFoundError("staff", { id: String(id) });
    return staff;
  }

  listByGuild(guildId: GuildId, status?: StaffStatus): Promise<HydratedDocument<Staff>[]> {
    return this.find(status ? { guildId, status } : { guildId });
  }

  async create(input: CreateStaffInput): Promise<HydratedDocument<Staff>> {
    if (!input.userId || !input.guildId) {
      throw new ValidationError("userId and guildId are required to create a staff member");
    }
    const level = input.currentRoleLevel ?? 0;
    if (!Number.isInteger(level) || level < 0) {
      throw new ValidationError("currentRoleLevel must be a non-negative integer", { level });
    }
    return this.insert({
      userId: input.userId,
      guildId: input.guildId,
      currentRoleLevel: level,
      status: input.status ?? StaffStatus.ACTIVE,
      acceptedBy: input.acceptedBy,
      acceptedAt: input.acceptedAt ?? (input.acceptedBy ? new Date() : undefined),
    });
  }

  update(id: IdLike, patch: Partial<Staff>): Promise<HydratedDocument<Staff> | null> {
    return this.updateById(id, { $set: patch });
  }

  async ensure(
    userId: UserId,
    guildId: GuildId,
    defaults: { currentRoleLevel?: number } = {},
  ): Promise<HydratedDocument<Staff>> {
    const existing = await this.get(userId, guildId);
    if (existing) return existing;
    try {
      return await this.create({ userId, guildId, currentRoleLevel: defaults.currentRoleLevel ?? 0 });
    } catch (err) {
      const raced = await this.get(userId, guildId);
      if (raced) return raced;
      throw err;
    }
  }

  setStatus(id: IdLike, status: StaffStatus): Promise<HydratedDocument<Staff> | null> {
    if (!STAFF_STATUS_VALUES.includes(status)) {
      throw new ValidationError("Unknown staff status", { status });
    }
    return this.updateById(id, { $set: { status } });
  }

  setRoleLevel(id: IdLike, level: number): Promise<HydratedDocument<Staff> | null> {
    if (!Number.isInteger(level) || level < 0) {
      throw new ValidationError("Role level must be a non-negative integer", { level });
    }
    return this.updateById(id, { $set: { currentRoleLevel: level } });
  }

  incrementCounters(
    id: IdLike,
    deltas: Partial<Record<StaffCounter, number>>,
  ): Promise<HydratedDocument<Staff> | null> {
    const inc: Record<string, number> = {};
    for (const [key, value] of Object.entries(deltas)) {
      if (typeof value === "number" && value !== 0) inc[key] = value;
    }
    if (Object.keys(inc).length === 0) return this.findById(id);
    return this.updateById(id, { $inc: inc });
  }

  async getStats(id: IdLike): Promise<StaffStats> {
    const staff = await this.getByIdOrThrow(id);
    return {
      points: staff.points,
      reportsClaimed: staff.reportsClaimed,
      reportsCompleted: staff.reportsCompleted,
      ticketsClaimed: staff.ticketsClaimed,
      ticketsCompleted: staff.ticketsCompleted,
      giftClaimsHandled: staff.giftClaimsHandled,
      warningsIssued: staff.warningsIssued,
      staffWarningsIssued: staff.staffWarningsIssued,
    };
  }
}

export const staffService = new StaffService();

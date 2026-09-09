import type { HydratedDocument } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, IdLike, MongoFilter, UserId } from "../../../shared/types/index.ts";
import { NotFoundError, ValidationError } from "../../../shared/utils/errors.ts";
import { FastAccessModel, type FastAccess } from "../models/fast-access.model.ts";
import { FAST_ACCESS_CONTEXT_VALUES, type FastAccessContext } from "../types/enums.ts";

export interface CreateFastAccessInput {
  guildId: GuildId;
  command: string;
  message: string;
  contextType: FastAccessContext;
  createdBy: UserId;
  enabled?: boolean;
}

export interface UpdateFastAccessInput {
  id: IdLike;
  message?: string;
  enabled?: boolean;
}

const COMMAND_PATTERN = /^[a-z0-9_-]{1,32}$/;

export function normaliseFastAccessCommand(raw: string): string {
  const command = raw.trim().replace(/^\$/, "").toLowerCase();
  if (!COMMAND_PATTERN.test(command)) {
    throw new ValidationError("الأمر لازم يكون من 1 إلى 32 حرف من a-z و 0-9 و '-' أو '_'", {
      command: raw,
    });
  }
  return command;
}

export function tryNormaliseFastAccessCommand(raw: string): string | null {
  const command = raw.trim().replace(/^\$/, "").toLowerCase();
  return COMMAND_PATTERN.test(command) ? command : null;
}

export class FastAccessService extends BaseRepository<FastAccess> {
  constructor() {
    super(FastAccessModel);
  }

  private normaliseCommand(raw: string): string {
    return normaliseFastAccessCommand(raw);
  }

  create(input: CreateFastAccessInput): Promise<HydratedDocument<FastAccess>> {
    if (!FAST_ACCESS_CONTEXT_VALUES.includes(input.contextType)) {
      throw new ValidationError("Unknown fast-access context", { contextType: input.contextType });
    }
    if (!input.message?.trim()) throw new ValidationError("لازم تكتب رسالة");
    if (!input.createdBy) throw new ValidationError("createdBy is required");

    return this.insert({
      guildId: input.guildId,
      command: this.normaliseCommand(input.command),
      message: input.message,
      contextType: input.contextType,
      createdBy: input.createdBy,
      enabled: input.enabled ?? true,
    });
  }

  get(
    guildId: GuildId,
    contextType: FastAccessContext,
    command: string,
  ): Promise<HydratedDocument<FastAccess> | null> {
    return this.findOne({
      guildId,
      contextType,
      command: this.normaliseCommand(command),
    });
  }

  getByCommand(guildId: GuildId, command: string): Promise<HydratedDocument<FastAccess> | null> {
    const normalised = tryNormaliseFastAccessCommand(command);
    if (!normalised) return Promise.resolve(null);
    return this.findOne({ guildId, command: normalised });
  }

  existsForCommand(guildId: GuildId, command: string): Promise<boolean> {
    const normalised = tryNormaliseFastAccessCommand(command);
    if (!normalised) return Promise.resolve(false);
    return this.exists({ guildId, command: normalised });
  }

  listByContext(
    guildId: GuildId,
    contextType: FastAccessContext,
    onlyEnabled = false,
  ): Promise<HydratedDocument<FastAccess>[]> {
    const filter: MongoFilter<FastAccess> = { guildId, contextType };
    if (onlyEnabled) filter.enabled = true;
    return this.model.find(filter).sort({ command: 1 }).exec();
  }

  listByGuild(guildId: GuildId): Promise<HydratedDocument<FastAccess>[]> {
    return this.model.find({ guildId }).sort({ contextType: 1, command: 1 }).exec();
  }

  async update(input: UpdateFastAccessInput): Promise<HydratedDocument<FastAccess>> {
    const patch: Partial<FastAccess> = {};
    if (input.message !== undefined) {
      if (!input.message.trim()) throw new ValidationError("الرسالة ما تقدر تكون فاضية");
      patch.message = input.message;
    }
    if (input.enabled !== undefined) patch.enabled = input.enabled;
    const updated = await this.updateById(input.id, { $set: patch });
    if (!updated) throw new NotFoundError("fast access", { id: String(input.id) });
    return updated;
  }

  setEnabled(id: IdLike, enabled: boolean): Promise<HydratedDocument<FastAccess> | null> {
    return this.updateById(id, { $set: { enabled } });
  }

  remove(id: IdLike): Promise<HydratedDocument<FastAccess> | null> {
    return this.deleteById(id);
  }
}

export const fastAccessService = new FastAccessService();

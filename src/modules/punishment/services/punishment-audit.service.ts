import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import { PunishmentAuditModel, type PunishmentAudit } from "../models/punishment-audit.model.ts";
import type { PunishmentAuditAction } from "../types/enums.ts";

export interface RecordPunishmentAuditInput {
  punishmentId: string;
  action: PunishmentAuditAction;
  actorId?: UserId;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class PunishmentAuditService {
  record(input: RecordPunishmentAuditInput): Promise<HydratedDocument<PunishmentAudit>> {
    return PunishmentAuditModel.create({
      punishmentId: input.punishmentId,
      action: input.action,
      actorId: input.actorId,
      error: input.error,
      metadata: input.metadata,
    });
  }

  listForPunishment(punishmentId: string): Promise<HydratedDocument<PunishmentAudit>[]> {
    return PunishmentAuditModel.find({ punishmentId }).sort({ createdAt: 1 }).exec();
  }
}

export const punishmentAuditService = new PunishmentAuditService();

import type { HydratedDocument } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import { ModmailAuditModel, type ModmailAudit } from "../models/modmail-audit.model.ts";
import { ModmailActorType, type ModmailAuditAction } from "../types/enums.ts";

export interface RecordAuditInput {
  caseId: string;
  action: ModmailAuditAction;
  actorType?: ModmailActorType;
  actorId?: UserId;
  metadata?: Record<string, unknown>;
}

export class ModmailAuditService {
  record(input: RecordAuditInput): Promise<HydratedDocument<ModmailAudit>> {
    return ModmailAuditModel.create({
      caseId: input.caseId,
      action: input.action,
      actorType: input.actorType ?? ModmailActorType.SYSTEM,
      actorId: input.actorId,
      metadata: input.metadata,
    });
  }

  listForCase(caseId: string): Promise<HydratedDocument<ModmailAudit>[]> {
    return ModmailAuditModel.find({ caseId }).sort({ createdAt: 1 }).exec();
  }
}

export const modmailAuditService = new ModmailAuditService();

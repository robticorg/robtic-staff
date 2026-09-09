import type { HydratedDocument } from "mongoose";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { GiftClaimAuditModel, type GiftClaimAudit } from "../models/gift-claim-audit.model.ts";
import type { GiftClaimAuditAction } from "../types/enums.ts";

const log = logger.child("gift-claim:audit");

export interface RecordGiftAuditInput {
  claimId: string;
  guildId?: GuildId;
  action: GiftClaimAuditAction;
  actorId?: UserId;
  userId?: UserId;
  metadata?: Record<string, unknown>;
}

export class GiftClaimAuditService {
  async record(input: RecordGiftAuditInput): Promise<HydratedDocument<GiftClaimAudit> | null> {
    const metadata = {
      ...(input.metadata ?? {}),
      ...(input.userId ? { userId: input.userId } : {}),
    };
    log.info(`${input.action} claim=${input.claimId} actor=${input.actorId ?? "-"}`, metadata);
    try {
      return await GiftClaimAuditModel.create({
        claimId: input.claimId,
        guildId: input.guildId,
        action: input.action,
        actorId: input.actorId,
        metadata: Object.keys(metadata).length ? metadata : undefined,
      });
    } catch (err) {
      log.warn("gift claim audit write failed", err);
      return null;
    }
  }

  listForClaim(claimId: string): Promise<HydratedDocument<GiftClaimAudit>[]> {
    return GiftClaimAuditModel.find({ claimId }).sort({ createdAt: 1 }).exec();
  }
}

export const giftClaimAuditService = new GiftClaimAuditService();

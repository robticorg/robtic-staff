import type { ChannelId, GuildId, UserId } from "../../../../shared/types/index.ts";
import {
  GiftDeliveryModel,
  type GiftDelivery,
  type GiftDeliveryDocument,
  type GiftDeliveryProofRef,
} from "../../models/gift-delivery.model.ts";
import {
  GiftDeliveryStatus,
  GiftDeliveryType,
  RETRYABLE_DELIVERY_STATUSES,
  type LinkDeliveryPath,
} from "../../types/enums.ts";

export interface DeliveryLocation {
  deliveryPath: LinkDeliveryPath;
  deliveryChannelId: ChannelId;
  deliveryMessageId: string;
}

export class GiftDeliveryRepository {
  findById(deliveryId: string): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOne({ deliveryId }).exec();
  }

  findByClaim(claimId: string): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOne({ claimId }).exec();
  }

  findByChannel(channelId: ChannelId): Promise<GiftDeliveryDocument[]> {
    return GiftDeliveryModel.find({
      deliveryChannelId: channelId,
      status: GiftDeliveryStatus.READY,
    }).exec();
  }

  findByMessage(messageId: string): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOne({
      deliveryMessageId: messageId,
      status: GiftDeliveryStatus.READY,
    }).exec();
  }

  listReadyLinks(): Promise<GiftDeliveryDocument[]> {
    return GiftDeliveryModel.find({
      type: GiftDeliveryType.LINK,
      status: GiftDeliveryStatus.READY,
    }).exec();
  }

  async openForClaim(input: {
    guildId: GuildId;
    claimId: string;
    userId: UserId;
    type: GiftDeliveryType;
    amount?: string;
  }): Promise<GiftDeliveryDocument> {
    const doc = await GiftDeliveryModel.findOneAndUpdate(
      { claimId: input.claimId },
      {
        $setOnInsert: {
          guildId: input.guildId,
          claimId: input.claimId,
          userId: input.userId,
          type: input.type,
          status: GiftDeliveryStatus.PENDING,
          ...(input.amount ? { amount: input.amount } : {}),
        },
      },
      { upsert: true, returnDocument: "after" },
    ).exec();
    return doc!;
  }

  lockForProcessing(deliveryId: string): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOneAndUpdate(
      { deliveryId, status: { $in: [...RETRYABLE_DELIVERY_STATUSES] } },
      {
        $set: { status: GiftDeliveryStatus.PROCESSING, lastAttemptAt: new Date() },
        $inc: { attempts: 1 },
        $unset: { error: "" },
      },
      { returnDocument: "after" },
    ).exec();
  }

  markFailed(deliveryId: string, error: string): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOneAndUpdate(
      { deliveryId, status: GiftDeliveryStatus.PROCESSING },
      { $set: { status: GiftDeliveryStatus.FAILED, error: error.slice(0, 300) } },
      { returnDocument: "after" },
    ).exec();
  }

  markFulfilled(
    deliveryId: string,
    fields: Pick<GiftDelivery, "deliveredBy"> &
      Partial<Pick<GiftDelivery, "additionalInfo" | "auditMessageId">>,
  ): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOneAndUpdate(
      { deliveryId, status: GiftDeliveryStatus.PROCESSING },
      { $set: { ...fields, status: GiftDeliveryStatus.FULFILLED, deliveredAt: new Date() } },
      { returnDocument: "after" },
    ).exec();
  }

  async addProof(deliveryId: string, refs: readonly GiftDeliveryProofRef[]): Promise<void> {
    if (refs.length === 0) return;
    await GiftDeliveryModel.updateOne(
      { deliveryId },
      { $push: { proof: { $each: [...refs] } } },
    ).exec();
  }

  storeSecret(
    deliveryId: string,
    fields: { secret: string; additionalInfo: string | null; deliveredBy: UserId },
  ): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOneAndUpdate(
      { deliveryId, status: GiftDeliveryStatus.PROCESSING },
      {
        $set: {
          secret: fields.secret,
          deliveredBy: fields.deliveredBy,
          deliveredAt: new Date(),
          ...(fields.additionalInfo ? { additionalInfo: fields.additionalInfo } : {}),
        },
        ...(fields.additionalInfo ? {} : { $unset: { additionalInfo: "" } }),
      },
      { returnDocument: "after" },
    ).exec();
  }

  markReady(deliveryId: string, location: DeliveryLocation): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOneAndUpdate(
      { deliveryId, status: GiftDeliveryStatus.PROCESSING },
      { $set: { ...location, status: GiftDeliveryStatus.READY } },
      { returnDocument: "after" },
    ).exec();
  }

  moveLocation(
    deliveryId: string,
    expectedMessageId: string | undefined,
    location: DeliveryLocation,
  ): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOneAndUpdate(
      {
        deliveryId,
        status: GiftDeliveryStatus.READY,
        deliveryMessageId: expectedMessageId ?? { $exists: false },
      },
      { $set: location },
      { returnDocument: "after" },
    ).exec();
  }

  claimReady(deliveryId: string, userId: UserId): Promise<GiftDeliveryDocument | null> {
    return GiftDeliveryModel.findOneAndUpdate(
      { deliveryId, userId, status: GiftDeliveryStatus.READY },
      {
        $set: { status: GiftDeliveryStatus.CLAIMED, claimedBy: userId, claimedAt: new Date() },
      },
      { returnDocument: "after" },
    )
      .select("+secret")
      .exec();
  }

  async releaseInterrupted(startedBefore: Date): Promise<number> {
    const result = await GiftDeliveryModel.updateMany(
      { status: GiftDeliveryStatus.PROCESSING, lastAttemptAt: { $lt: startedBefore } },
      { $set: { status: GiftDeliveryStatus.FAILED, error: "INTERRUPTED" } },
    ).exec();
    return result.modifiedCount;
  }
}

export const giftDeliveryRepository = new GiftDeliveryRepository();

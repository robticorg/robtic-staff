import type { HydratedDocument, Types } from "mongoose";
import type { UserId } from "../../../shared/types/index.ts";
import { isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import {
  ModmailMessageModel,
  type ModmailMessage,
} from "../models/modmail-message.model.ts";
import { ModmailSenderType, type ModmailSenderType as SenderType } from "../types/enums.ts";

export interface AppendMessageInput {
  caseId: string;
  senderType: SenderType;
  senderId?: UserId;
  content?: string;
  attachmentIds?: Types.ObjectId[];
  internal?: boolean;
  sourceMessageId?: string;
  relayedMessageId?: string;
}

export class ModmailMessageService {
  async append(input: AppendMessageInput): Promise<HydratedDocument<ModmailMessage>> {
    try {
      return await ModmailMessageModel.create({
        caseId: input.caseId,
        senderType: input.senderType,
        senderId: input.senderId,
        content: input.content ?? "",
        attachments: input.attachmentIds ?? [],
        internal: input.internal ?? false,
        sourceMessageId: input.sourceMessageId,
        relayedMessageId: input.relayedMessageId,
      });
    } catch (err) {
      if (input.sourceMessageId && isDuplicateKeyError(err)) {
        const existing = await ModmailMessageModel.findOne({
          sourceMessageId: input.sourceMessageId,
        }).exec();
        if (existing) return existing;
      }
      throw err;
    }
  }

  async hasProcessed(sourceMessageId: string): Promise<boolean> {
    const found = await ModmailMessageModel.exists({ sourceMessageId }).exec();
    return found !== null;
  }

  setRelayedMessageId(id: Types.ObjectId, relayedMessageId: string): Promise<unknown> {
    return ModmailMessageModel.updateOne({ _id: id }, { $set: { relayedMessageId } }).exec();
  }

  listForCase(caseId: string): Promise<HydratedDocument<ModmailMessage>[]> {
    return ModmailMessageModel.find({ caseId }).sort({ createdAt: 1 }).exec();
  }

  countFromUser(caseId: string): Promise<number> {
    return ModmailMessageModel.countDocuments({
      caseId,
      senderType: ModmailSenderType.USER,
    }).exec();
  }
}

export const modmailMessageService = new ModmailMessageService();

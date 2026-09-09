import type { HydratedDocument, Types } from "mongoose";
import type { IdLike, UserId } from "../../../shared/types/index.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import {
  ModmailAttachmentModel,
  type ModmailAttachment,
} from "../models/modmail-attachment.model.ts";
import { AttachmentStorageKind } from "../types/enums.ts";

export interface IncomingAttachment {
  attachmentId: string;
  url: string;
  filename: string;
  contentType?: string | null;
  size?: number | null;
  uploadedBy: UserId;
}

export interface StoredAttachmentRef {
  storage: AttachmentStorageKind;
  url: string;
  filename: string;
  contentType?: string;
  size?: number;
  attachmentId: string;
}

export interface AttachmentStore {
  persist(input: IncomingAttachment): Promise<StoredAttachmentRef>;
}

export class DiscordCdnAttachmentStore implements AttachmentStore {
  async persist(input: IncomingAttachment): Promise<StoredAttachmentRef> {
    return {
      storage: AttachmentStorageKind.DISCORD_CDN,
      url: input.url,
      filename: input.filename,
      contentType: input.contentType ?? undefined,
      size: input.size ?? undefined,
      attachmentId: input.attachmentId,
    };
  }
}

export class AttachmentService {
  constructor(private store: AttachmentStore = new DiscordCdnAttachmentStore()) {}

  useStore(store: AttachmentStore): void {
    this.store = store;
  }

  async persistMany(
    caseId: string,
    attachments: readonly IncomingAttachment[],
    opts: { messageId?: IdLike } = {},
  ): Promise<HydratedDocument<ModmailAttachment>[]> {
    if (attachments.length === 0) return [];
    const messageId = opts.messageId ? toObjectId(opts.messageId) : undefined;
    const rows = await Promise.all(
      attachments.map(async (incoming) => {
        const ref = await this.store.persist(incoming);
        return {
          caseId,
          messageId,
          storage: ref.storage,
          url: ref.url,
          filename: ref.filename,
          contentType: ref.contentType,
          size: ref.size,
          attachmentId: ref.attachmentId,
          uploadedBy: incoming.uploadedBy,
        };
      }),
    );
    return ModmailAttachmentModel.insertMany(rows) as unknown as Promise<
      HydratedDocument<ModmailAttachment>[]
    >;
  }

  linkToMessage(attachmentIds: readonly IdLike[], messageId: IdLike): Promise<unknown> {
    if (attachmentIds.length === 0) return Promise.resolve(null);
    return ModmailAttachmentModel.updateMany(
      { _id: { $in: attachmentIds.map(toObjectId) } },
      { $set: { messageId: toObjectId(messageId) } },
    ).exec();
  }

  listForCase(caseId: string): Promise<HydratedDocument<ModmailAttachment>[]> {
    return ModmailAttachmentModel.find({ caseId }).sort({ createdAt: 1 }).exec();
  }

  countForCase(caseId: string): Promise<number> {
    return ModmailAttachmentModel.countDocuments({ caseId }).exec();
  }

  idsOf(docs: readonly HydratedDocument<ModmailAttachment>[]): Types.ObjectId[] {
    return docs.map((d) => d._id);
  }
}

export const attachmentService = new AttachmentService();

import { AttachmentBuilder } from "discord.js";
import { ConflictError } from "../../../../shared/utils/errors.ts";
import { logger } from "../../../../shared/utils/logger.ts";
import { giftClaimConfig } from "../../../../data/gift-claim/config.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import { GiftDeliveryProofModel } from "../../models/gift-delivery-proof.model.ts";
import type { GiftDeliveryDocument, GiftDeliveryProofRef } from "../../models/gift-delivery.model.ts";
import { GiftClaimError } from "../gift-claim.service.ts";
import { assertDeliveryNotBusy } from "./credit-delivery.service.ts";
import { cleanAdditionalInfo } from "./gift-delivery-input.ts";
import { giftDeliveriesChannel } from "./gift-deliveries-channel.ts";
import { giftDeliveryRepository } from "./gift-delivery.repository.ts";

const log = logger.child("gift-delivery:manual");
const M = giftDeliveryMessages;

export interface UploadedProof {
  name: string;
  url: string;
  contentType: string | null;
  size: number;
}

export interface StoredProofFile {
  filename: string;
  contentType: string;
  data: Buffer;
}

export type ProofProblem = "MISSING" | "TOO_LARGE";

export function checkProof(uploads: readonly UploadedProof[]): ProofProblem | null {
  if (uploads.length === 0) return "MISSING";
  if (uploads.some((u) => u.size > giftClaimConfig.delivery.maxProofBytes)) return "TOO_LARGE";
  return null;
}

export type Downloader = (url: string) => Promise<Buffer | null>;

const defaultDownloader: Downloader = async (url) => {
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;
  return Buffer.from(await response.arrayBuffer());
};

export class ManualGiftDeliveryService {
  constructor(private download: Downloader = defaultDownloader) {}

  useDownloader(download: Downloader): void {
    this.download = download;
  }

  async deliver(
    delivery: GiftDeliveryDocument,
    staffId: string,
    uploads: readonly UploadedProof[],
    rawInfo: string | null,
  ): Promise<{ delivery: GiftDeliveryDocument; files: StoredProofFile[] }> {
    const problem = checkProof(uploads);
    if (problem === "MISSING") throw new GiftClaimError("GIFT_PROOF_MISSING", M.errors.proofRequired);
    if (problem === "TOO_LARGE") throw new GiftClaimError("GIFT_PROOF_TOO_LARGE", M.errors.proofTooLarge);

    await giftDeliveriesChannel.resolve(delivery.guildId);
    const files = await this.fetchFiles(uploads);

    const locked = await giftDeliveryRepository.lockForProcessing(delivery.deliveryId);
    if (!locked) {
      const fresh = await giftDeliveryRepository.findById(delivery.deliveryId);
      assertDeliveryNotBusy(fresh ?? delivery);
      throw new ConflictError(M.errors.inProgress);
    }

    const info = cleanAdditionalInfo(rawInfo);
    let refs: GiftDeliveryProofRef[];
    try {
      const rows = await GiftDeliveryProofModel.insertMany(
        files.map((file) => ({
          ...file,
          size: file.data.length,
          deliveryId: locked.deliveryId,
          guildId: locked.guildId,
          uploadedBy: staffId,
        })),
      );
      refs = rows.map((row) => ({
        proofId: row.proofId,
        filename: row.filename,
        contentType: row.contentType,
        size: row.size,
      }));
    } catch (err) {
      await giftDeliveryRepository.markFailed(locked.deliveryId, "PROOF_SAVE_FAILED");
      throw err;
    }

    const auditMessageId = await giftDeliveriesChannel.post(locked.guildId, {
      content: [
        M.log.otherDelivered(locked.userId, staffId, locked.claimId),
        ...(info ? [M.log.info(info)] : []),
      ].join("\n"),
      files: files.map((file) => new AttachmentBuilder(file.data, { name: file.filename })),
    });

    const fulfilled = await giftDeliveryRepository.markFulfilled(locked.deliveryId, {
      deliveredBy: staffId,
      proof: refs,
      ...(info ? { additionalInfo: info } : {}),
      ...(auditMessageId ? { auditMessageId } : {}),
    });
    log.info(`manual delivery ${locked.deliveryId} fulfilled by ${staffId} (${refs.length} proof file(s))`);
    return { delivery: fulfilled ?? locked, files };
  }

  private async fetchFiles(uploads: readonly UploadedProof[]): Promise<StoredProofFile[]> {
    const files: StoredProofFile[] = [];
    for (const upload of uploads.slice(0, giftClaimConfig.delivery.maxProofFiles)) {
      const data = await this.download(upload.url);
      if (!data) throw new GiftClaimError("GIFT_PROOF_DOWNLOAD", M.errors.proofDownloadFailed);
      if (data.length > giftClaimConfig.delivery.maxProofBytes) {
        throw new GiftClaimError("GIFT_PROOF_TOO_LARGE", M.errors.proofTooLarge);
      }
      files.push({
        filename: upload.name.slice(0, 200) || `proof-${files.length + 1}`,
        contentType: upload.contentType ?? "application/octet-stream",
        data,
      });
    }
    return files;
  }
}

export const manualGiftDeliveryService = new ManualGiftDeliveryService();

import { AttachmentBuilder } from "discord.js";
import { giftClaimConfig } from "../../../../data/gift-claim/config.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import { GiftDeliveryProofModel } from "../../models/gift-delivery-proof.model.ts";
import type { GiftDeliveryProofRef } from "../../models/gift-delivery.model.ts";
import { GiftClaimError } from "../gift-claim.service.ts";
import { giftDeliveryRepository } from "./gift-delivery.repository.ts";

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

export type ProofProblem = "MISSING" | "TOO_MANY" | "TOO_LARGE";

export type Downloader = (url: string) => Promise<Buffer | null>;

export function checkProof(uploads: readonly UploadedProof[]): ProofProblem | null {
  if (uploads.length === 0) return "MISSING";
  if (uploads.length > giftClaimConfig.delivery.maxProofFiles) return "TOO_MANY";
  if (uploads.some((u) => u.size > giftClaimConfig.delivery.maxProofBytes)) return "TOO_LARGE";
  return null;
}

const defaultDownloader: Downloader = async (url) => {
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;
  return Buffer.from(await response.arrayBuffer());
};

export class GiftDeliveryProofService {
  constructor(private download: Downloader = defaultDownloader) {}

  useDownloader(download: Downloader): void {
    this.download = download;
  }

  assertValid(uploads: readonly UploadedProof[]): void {
    const problem = checkProof(uploads);
    if (problem === "MISSING") throw new GiftClaimError("GIFT_PROOF_MISSING", M.errors.proofRequired);
    if (problem === "TOO_MANY") throw new GiftClaimError("GIFT_PROOF_TOO_MANY", M.errors.proofTooMany);
    if (problem === "TOO_LARGE") throw new GiftClaimError("GIFT_PROOF_TOO_LARGE", M.errors.proofTooLarge);
  }

  async fetch(uploads: readonly UploadedProof[]): Promise<StoredProofFile[]> {
    this.assertValid(uploads);
    const files: StoredProofFile[] = [];
    for (const upload of uploads) {
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

  async attach(
    delivery: { deliveryId: string; guildId: string },
    uploadedBy: string,
    files: readonly StoredProofFile[],
  ): Promise<GiftDeliveryProofRef[]> {
    if (files.length === 0) return [];
    const rows = await GiftDeliveryProofModel.insertMany(
      files.map((file) => ({
        ...file,
        size: file.data.length,
        deliveryId: delivery.deliveryId,
        guildId: delivery.guildId,
        uploadedBy,
      })),
    );
    const refs = rows.map((row) => ({
      proofId: row.proofId,
      filename: row.filename,
      contentType: row.contentType,
      size: row.size,
    }));
    await giftDeliveryRepository.addProof(delivery.deliveryId, refs);
    return refs;
  }

  attachments(files: readonly StoredProofFile[]): AttachmentBuilder[] {
    return files.map((file) => new AttachmentBuilder(file.data, { name: file.filename }));
  }
}

export const giftDeliveryProofService = new GiftDeliveryProofService();

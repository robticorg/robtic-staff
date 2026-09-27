import { AttachmentBuilder, type GuildTextBasedChannel } from "discord.js";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffApplicationConfig } from "../../../data/staff-application/config.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { ApplicationError } from "../shared/application-error.ts";
import { ApplicationEvidenceModel } from "../shared/application-evidence.model.ts";

const log = logger.child("applications:evidence");
const T = staffApplicationMessages.transfer;
const PER_MESSAGE = 10;

export interface UploadedEvidence {
  name: string;
  url: string;
  contentType: string | null;
  size: number;
}

export interface EvidenceFile {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}

export type EvidenceProblem = "TOO_FEW" | "NOT_IMAGE" | "TOO_LARGE";

export function checkEvidence(uploads: readonly UploadedEvidence[]): EvidenceProblem | null {
  const rules = staffApplicationConfig.evidence;
  if (uploads.length < rules.minFiles) return "TOO_FEW";
  if (uploads.some((upload) => !upload.contentType?.startsWith("image/"))) return "NOT_IMAGE";
  if (uploads.some((upload) => upload.size > rules.maxFileBytes)) return "TOO_LARGE";
  return null;
}

export class TransferEvidenceService {
  assertValid(uploads: readonly UploadedEvidence[]): void {
    const problem = checkEvidence(uploads);
    if (problem === "TOO_FEW") {
      throw new ApplicationError(
        "EVIDENCE_TOO_FEW",
        T.evidenceTooFew(staffApplicationConfig.evidence.minFiles),
      );
    }
    if (problem === "NOT_IMAGE") throw new ApplicationError("EVIDENCE_NOT_IMAGE", T.evidenceNotImage);
    if (problem === "TOO_LARGE") throw new ApplicationError("EVIDENCE_TOO_LARGE", T.evidenceTooLarge);
  }

  async download(uploads: readonly UploadedEvidence[]): Promise<EvidenceFile[]> {
    const files: EvidenceFile[] = [];
    for (const upload of uploads.slice(0, staffApplicationConfig.evidence.maxFiles)) {
      const response = await fetch(upload.url).catch(() => null);
      if (!response?.ok) {
        throw new ApplicationError("EVIDENCE_DOWNLOAD_FAILED", T.evidenceDownloadFailed);
      }
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length > staffApplicationConfig.evidence.maxFileBytes) {
        throw new ApplicationError("EVIDENCE_TOO_LARGE", T.evidenceTooLarge);
      }
      files.push({
        filename: upload.name.slice(0, 200) || `evidence-${files.length + 1}.png`,
        contentType: upload.contentType ?? "image/png",
        size: data.length,
        data,
      });
    }
    return files;
  }

  async save(
    guildId: GuildId,
    applicationId: string,
    uploadedBy: UserId,
    files: readonly EvidenceFile[],
  ): Promise<number> {
    if (files.length === 0) return 0;
    await ApplicationEvidenceModel.insertMany(
      files.map((file, position) => ({ ...file, guildId, applicationId, uploadedBy, position })),
    );
    return files.length;
  }

  async deleteFor(applicationId: string): Promise<void> {
    await ApplicationEvidenceModel.deleteMany({ applicationId }).exec();
  }

  async postToChannel(channel: GuildTextBasedChannel, applicationId: string): Promise<void> {
    const rows = await ApplicationEvidenceModel.find({ applicationId }).sort({ position: 1 }).exec();
    for (let start = 0; start < rows.length; start += PER_MESSAGE) {
      const files = rows
        .slice(start, start + PER_MESSAGE)
        .map((row) => new AttachmentBuilder(row.data, { name: row.filename }));
      await channel
        .send({ files, allowedMentions: { parse: [] } })
        .catch((err) => log.warn(`evidence post for ${applicationId} failed`, err));
    }
  }
}

export const transferEvidenceService = new TransferEvidenceService();

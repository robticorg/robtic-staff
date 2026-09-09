import { ChannelType, type GuildMember } from "discord.js";
import type { HydratedDocument } from "mongoose";
import { ConflictError, DomainError, NotFoundError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { punishmentMessages } from "../../../data/messages/punishment.ts";
import { channelConfigService } from "../../configuration/index.ts";
import { ChannelConfigType } from "../../configuration/types/enums.ts";
import {
  StaffActivityType,
  staffActivityService,
  staffService,
} from "../../staff/index.ts";
import type { Punishment } from "../models/punishment.model.ts";
import {
  PunishmentApprovalModel,
  type PunishmentApprovalDocument,
} from "../models/punishment-approval.model.ts";
import { PunishmentApprovalStatus } from "../types/enums.ts";
import { buildApprovalCard } from "../render/approval-card.ts";
import { canDecideApproval, isSelfApproval } from "./punishment-permissions.ts";
import { punishmentService } from "./punishment.service.ts";
import { requirePunishmentClient } from "../runtime.ts";

const log = logger.child("punishment:approval");
const A = punishmentMessages.approval;

export class ApprovalChannelMissingError extends DomainError {
  constructor(public readonly punishmentType: "KICK" | "BAN") {
    super("APPROVAL_CHANNEL_MISSING", punishmentMessages.resolution.approvalChannelMissing(punishmentType));
  }
}

export interface DecideResult {
  approval: PunishmentApprovalDocument;
  punishment: HydratedDocument<Punishment>;
  decision: "APPROVE" | "REJECT";
}

export class PunishmentApprovalService {
  getByApprovalId(approvalId: string): Promise<PunishmentApprovalDocument | null> {
    return PunishmentApprovalModel.findOne({ approvalId }).exec();
  }

  getByMessageId(messageId: string): Promise<PunishmentApprovalDocument | null> {
    return PunishmentApprovalModel.findOne({ messageId }).exec();
  }

  getForPunishment(punishmentId: string): Promise<PunishmentApprovalDocument | null> {
    return PunishmentApprovalModel.findOne({ punishmentId }).sort({ createdAt: -1 }).exec();
  }

  async requestApproval(
    punishment: HydratedDocument<Punishment>,
    requestedBy: string,
  ): Promise<PunishmentApprovalDocument> {
    const type = punishment.type as "KICK" | "BAN";
    const channelType =
      type === "BAN" ? ChannelConfigType.BAN_APPROVAL : ChannelConfigType.KICK_APPROVAL;

    const channelId = await channelConfigService.getChannelId(punishment.guildId, channelType);
    if (!channelId) {
      log.error(`${channelType} not configured for guild ${punishment.guildId}`);
      throw new ApprovalChannelMissingError(type);
    }

    const client = requirePunishmentClient();
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      log.error(`${channelType} channel invalid for guild ${punishment.guildId}`);
      throw new ApprovalChannelMissingError(type);
    }

    const approval = await PunishmentApprovalModel.create({
      guildId: punishment.guildId,
      punishmentId: punishment.punishmentId,
      type,
      status: PunishmentApprovalStatus.PENDING,
      requestedBy,
      channelId,
      messageId: "pending",
    });

    const message = await channel.send(buildApprovalCard(punishment, approval));
    approval.messageId = message.id;
    await approval.save();

    await punishmentService.markApprovalRequested(punishment.punishmentId);

    const staff = await staffService.ensure(requestedBy, punishment.guildId);
    await staffActivityService.create({
      staffId: staff._id,
      type: StaffActivityType.PUNISHMENT_REQUEST,
      referenceId: punishment.punishmentId,
      metadata: { type },
    });

    return approval;
  }

  async decide(
    approvalId: string,
    member: GuildMember,
    decision: "APPROVE" | "REJECT",
    reason?: string,
  ): Promise<DecideResult> {
    const approval = await this.getByApprovalId(approvalId);
    if (!approval) throw new NotFoundError("punishment approval", { approvalId });
    if (approval.guildId !== member.guild.id) {
      throw new DomainError("APPROVAL_WRONG_GUILD", A.gone);
    }

    if (!(await canDecideApproval(member, approval.type))) {
      throw new DomainError(
        "APPROVAL_FORBIDDEN",
        approval.type === "BAN" ? A.notAuthorizedBan : A.notAuthorizedKick,
      );
    }
    if (isSelfApproval({ requestedBy: approval.requestedBy, deciderId: member.id })) {
      throw new DomainError("APPROVAL_SELF", A.selfApproval);
    }

    const nextStatus =
      decision === "APPROVE"
        ? PunishmentApprovalStatus.APPROVED
        : PunishmentApprovalStatus.REJECTED;

    const decided = await PunishmentApprovalModel.findOneAndUpdate(
      { approvalId, status: PunishmentApprovalStatus.PENDING },
      {
        $set: {
          status: nextStatus,
          decidedBy: member.id,
          decidedAt: new Date(),
          decisionReason: reason,
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!decided) throw new ConflictError(A.alreadyDecided, { approvalId });

    const punishment =
      decision === "APPROVE"
        ? await punishmentService.markApproved(approval.punishmentId, member.id)
        : await punishmentService.markRejected(approval.punishmentId, member.id, reason);

    const staff = await staffService.ensure(member.id, member.guild.id);
    await staffActivityService.create({
      staffId: staff._id,
      type:
        decision === "APPROVE"
          ? StaffActivityType.PUNISHMENT_APPROVED
          : StaffActivityType.PUNISHMENT_REJECTED,
      referenceId: approval.punishmentId,
      metadata: { type: approval.type },
    });

    return { approval: decided, punishment, decision };
  }

  async refreshCard(
    approval: PunishmentApprovalDocument,
    punishment: Punishment,
    statusOverride?: string,
  ): Promise<void> {
    try {
      const channel = await requirePunishmentClient().channels.fetch(approval.channelId).catch(() => null);
      if (!channel || !("messages" in channel)) return;
      const message = await channel.messages.fetch(approval.messageId).catch(() => null);
      if (!message) return;
      await message.edit(buildApprovalCard(punishment, approval, { disabled: true, statusOverride }));
    } catch (err) {
      log.warn("approval card refresh failed", err);
    }
  }
}

export const punishmentApprovalService = new PunishmentApprovalService();

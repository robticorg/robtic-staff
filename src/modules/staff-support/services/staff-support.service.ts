import { ChannelType, type Guild, type GuildMember, type GuildTextBasedChannel } from "discord.js";
import type { ChannelId, GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { ConflictError, DomainError } from "../../../shared/utils/errors.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { staffSupportConfig } from "../../../data/staff-support/config.ts";
import { staffSupportMessages } from "../../../data/staff-support/messages.ts";
import { StaffSupportWorkflow } from "../../../data/staff-support/panels.ts";
import { channelConfigService, roleConfigService } from "../../configuration/index.ts";
import {
  ChannelConfigType,
  RoleConfigType,
  StaffTier,
} from "../../configuration/types/enums.ts";
import {
  getHierarchy,
  getTierForLevel,
  highestLevelFromRoleIds,
} from "../../configuration/utils/staff-levels.ts";
import { staffPermissionService } from "../../staff/services/staff-permissions.service.ts";
import { staffManagementAuthorizationService } from "../../staff/services/staff-management-authorization.service.ts";
import {
  preauthorizedActor,
  staffManagementService,
} from "../../staff/services/staff-management.service.ts";
import { staffService } from "../../staff/services/staff.service.ts";
import { ticketConfigService } from "../../tickets/services/ticket-config.service.ts";
import { ticketService } from "../../tickets/services/ticket.service.ts";
import {
  StaffSupportRequestModel,
  StaffSupportRequestStatus,
  StaffSupportRequestType,
  type StaffSupportRequestDocument,
} from "../models/staff-support-request.model.ts";
import { buildDemissionCard } from "../render/demission-card.ts";
import { buildSupportTicketMessage } from "../render/support-ticket-message.ts";
import {
  SupportAudience,
  decideSupportVisibility,
} from "./staff-support-visibility.ts";

const log = logger.child("staff-support");
const M = staffSupportMessages;

export class StaffSupportError extends DomainError {}

export interface CreateSupportInput {
  guild: Guild;
  member: GuildMember;
  reason: string;
}

export interface SupportVisibility {
  audience: SupportAudience;

  roleIds: RoleId[];
  level: number;
  tier: StaffTier;
}

export interface CreateSupportResult {
  ticketId: string;
  channelId: ChannelId;
  visibility: SupportVisibility;
}

export interface CreateDemissionResult {
  request: StaffSupportRequestDocument;
}

export type DemissionFireOutcome =
  | { ok: true; targetId: UserId }
  | { ok: false; reason: "ALREADY_HANDLED" | "NOT_AUTHORIZED" | "GONE" | "NOT_STAFF"; message: string };

export class StaffSupportService {
  async getSupportVisibility(member: GuildMember): Promise<SupportVisibility> {
    const guildId = member.guild.id;
    const hierarchy = await getHierarchy(guildId);
    const level = highestLevelFromRoleIds(hierarchy, member.roles.cache.keys()) ?? 0;

    const audience = decideSupportVisibility({
      applicantLevel: level,
      ownerStartLevel: hierarchy.boundaryLevels[StaffTier.OWNER],
      shipStartLevel: hierarchy.boundaryLevels[StaffTier.SHIP],
    });

    const roleIds = await this.rolesForAudience(guildId, audience);
    return { audience, roleIds, level, tier: getTierForLevel(hierarchy, level) };
  }

  private async rolesForAudience(
    guildId: GuildId,
    audience: SupportAudience,
  ): Promise<RoleId[]> {
    if (audience === SupportAudience.ADMINISTRATORS_ONLY) return [];

    const wanted =
      audience === SupportAudience.OWNER_MANAGER_ONLY
        ? [RoleConfigType.OWNER_MANAGER]
        : [RoleConfigType.STAFF_MANAGER, RoleConfigType.OWNER_MANAGER];

    const rows = await Promise.all(
      wanted.map((type) => roleConfigService.getByType(guildId, type)),
    );
    return rows.filter((r): r is NonNullable<typeof r> => !!r).map((r) => r.roleId);
  }

  async createSupportTicket(input: CreateSupportInput): Promise<CreateSupportResult> {
    const { guild, member } = input;

    if (!(await staffPermissionService.canActAsStaff(member))) {
      throw new StaffSupportError("STAFF_SUPPORT_NOT_STAFF", M.support.notStaff);
    }
    const reason = input.reason.trim();
    if (!reason) {
      throw new StaffSupportError("STAFF_SUPPORT_REASON_REQUIRED", M.support.reasonRequired);
    }

    const panel = ticketConfigService.getPanel(StaffSupportWorkflow.STAFF_SUPPORT);
    if (!panel) {
      throw new StaffSupportError("STAFF_SUPPORT_PANEL_MISSING", M.support.categoryMissing);
    }

    const visibility = await this.getSupportVisibility(member);

    const { ticket, channel } = await ticketService.createTicket({
      guild,
      panel,
      member,
      answers: [],
      additionalRoleIds: visibility.roleIds,

      duplicateScope: "PANEL",
      metadata: {
        workflow: StaffSupportWorkflow.STAFF_SUPPORT,
        staffLevel: visibility.level,
        staffTier: visibility.tier,
        audience: visibility.audience,
        reason: reason.slice(0, staffSupportConfig.maxReasonLength),
      },
    });

    await channel
      .send(
        buildSupportTicketMessage({
          ticketId: ticket.ticketId,
          userId: member.id,
          reason,
          audience: visibility.audience,
        }),
      )
      .catch((err) => log.warn("staff support ticket message failed", err));

    log.info(
      `staff support ticket ${ticket.ticketId} opened by ${member.id} ` +
        `(level ${visibility.level}, ${visibility.audience})`,
    );

    return { ticketId: ticket.ticketId, channelId: channel.id, visibility };
  }

  async createDemissionRequest(input: CreateSupportInput): Promise<CreateDemissionResult> {
    const { guild, member } = input;
    const guildId = guild.id;

    if (!(await staffPermissionService.canActAsStaff(member))) {
      throw new StaffSupportError("DEMISSION_NOT_STAFF", M.demission.notStaff);
    }
    const reason = input.reason.trim();
    if (!reason) {
      throw new StaffSupportError("DEMISSION_REASON_REQUIRED", M.demission.reasonRequired);
    }

    const existing = await StaffSupportRequestModel.findOne({
      guildId,
      staffId: member.id,
      type: StaffSupportRequestType.DEMISSION_APPLY,
      status: StaffSupportRequestStatus.OPEN,
    }).exec();
    if (existing) {
      throw new ConflictError(M.demission.alreadyOpen, { requestId: existing.requestId });
    }

    const channel = await this.requestsChannel(guild);
    const visibility = await this.getSupportVisibility(member);

    const request = await StaffSupportRequestModel.create({
      guildId,
      staffId: member.id,
      type: StaffSupportRequestType.DEMISSION_APPLY,
      status: StaffSupportRequestStatus.OPEN,
      reason: reason.slice(0, staffSupportConfig.maxReasonLength),
      channelId: channel.id,
      snapshotLevel: visibility.level,
      snapshotTier: visibility.tier,
    });

    const card = await channel.send(buildDemissionCard(request)).catch((err) => {
      log.error("demission card post failed", err);
      return null;
    });

    if (card) {
      request.messageId = card.id;
      await request.save().catch((err) => log.warn("storing demission messageId failed", err));
    }

    log.info(`demission request ${request.requestId} filed by ${member.id} in ${guildId}`);

    return { request };
  }

  private async requestsChannel(guild: Guild): Promise<GuildTextBasedChannel> {
    const channelId = await channelConfigService.getChannelId(
      guild.id,
      ChannelConfigType.VACATION_REQUESTS,
    );
    if (!channelId) {
      throw new StaffSupportError("DEMISSION_CHANNEL_UNSET", M.demission.channelNotConfigured);
    }
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement)
    ) {
      throw new StaffSupportError("DEMISSION_CHANNEL_BAD", M.demission.channelUnavailable);
    }
    return channel as GuildTextBasedChannel;
  }

  getDemissionAuthority(manager: GuildMember, applicant: GuildMember) {
    return staffManagementAuthorizationService.canHandleDemission(manager, applicant);
  }

  getRequest(requestId: string): Promise<StaffSupportRequestDocument | null> {
    return StaffSupportRequestModel.findOne({ requestId }).exec();
  }

  async handleDemissionFire(input: {
    guild: Guild;
    requestId: string;
    manager: GuildMember;
  }): Promise<DemissionFireOutcome> {
    const { guild, manager } = input;

    const request = await this.getRequest(input.requestId);
    if (!request || request.guildId !== guild.id) {
      return { ok: false, reason: "GONE", message: M.demission.requestGone };
    }
    if (request.status !== StaffSupportRequestStatus.OPEN) {
      return { ok: false, reason: "ALREADY_HANDLED", message: M.demission.alreadyHandled };
    }

    const applicant = await guild.members.fetch(request.staffId).catch(() => null);
    if (!applicant) {
      return { ok: false, reason: "GONE", message: M.demission.targetGone };
    }

    const decision = await this.getDemissionAuthority(manager, applicant);
    if (!decision.allowed) {
      return { ok: false, reason: "NOT_AUTHORIZED", message: decision.message };
    }

    const staff = await staffService.get(applicant.id, guild.id);
    if (!staff) {
      return { ok: false, reason: "NOT_STAFF", message: M.demission.targetNotStaff };
    }

    const claimed = await StaffSupportRequestModel.findOneAndUpdate(
      { requestId: request.requestId, status: StaffSupportRequestStatus.OPEN },
      {
        $set: {
          status: StaffSupportRequestStatus.COMPLETED,
          handledBy: manager.id,
          handledAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).exec();
    if (!claimed) {
      return { ok: false, reason: "ALREADY_HANDLED", message: M.demission.alreadyHandled };
    }

    try {
      await staffManagementService.fire(applicant, preauthorizedActor(manager.id), false);
    } catch (err) {
      await StaffSupportRequestModel.updateOne(
        { requestId: request.requestId },
        {
          $set: { status: StaffSupportRequestStatus.OPEN },
          $unset: { handledBy: "", handledAt: "" },
        },
      ).exec();
      log.error(`demission fire failed for ${applicant.id} in ${guild.id}`, err);
      throw err;
    }

    log.info(
      `demission ${request.requestId}: ${applicant.id} fired by ${manager.id} in ${guild.id}`,
    );
    return { ok: true, targetId: applicant.id };
  }
}

export const staffSupportService = new StaffSupportService();

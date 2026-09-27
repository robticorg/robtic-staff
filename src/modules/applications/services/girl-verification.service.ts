import type { GuildMember } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { staffApplicationMessages } from "../../../data/staff-application/messages.ts";
import { roleConfigService } from "../../configuration/services/role-config.service.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { buildTicketNotice } from "../../tickets/render/notice.ts";
import { memberIsAdministrator } from "../../tickets/services/ticket-permissions.ts";
import { ticketService } from "../../tickets/services/ticket.service.ts";
import { ApplicationError } from "../shared/application-error.ts";
import {
  ApplicantGender,
  GirlVerificationStatus,
  OPEN_APPLICATION_STATUSES,
  type ApplicationStatus,
} from "../shared/enums.ts";
import { StaffApplicationModel } from "../shared/staff-application.model.ts";
import { applicationTicketService } from "./application-ticket.service.ts";

const log = logger.child("applications:girls");
const V = staffApplicationMessages.verify;

export class GirlVerificationService {
  async markPending(member: GuildMember): Promise<GirlVerificationStatus> {
    const guildId = member.guild.id;
    const [verified, notVerified] = await Promise.all([
      roleConfigService.getByType(guildId, RoleConfigType.GIRL_VERIFIED),
      roleConfigService.getByType(guildId, RoleConfigType.GIRL_NOT_VERIFIED),
    ]);
    if (verified && member.roles.cache.has(verified.roleId)) return GirlVerificationStatus.VERIFIED;

    if (
      notVerified &&
      member.guild.roles.cache.has(notVerified.roleId) &&
      !member.roles.cache.has(notVerified.roleId)
    ) {
      await member.roles
        .add(notVerified.roleId, "Staff application — awaiting girls verification")
        .catch((err) => log.warn(`girl-not-verified role grant failed for ${member.id}`, err));
    }
    return GirlVerificationStatus.PENDING;
  }

  async verify(actor: GuildMember, target: GuildMember): Promise<void> {
    const guildId = actor.guild.id;
    const [manager, verified, notVerified] = await Promise.all([
      roleConfigService.getByType(guildId, RoleConfigType.GIRLS_MANAGER),
      roleConfigService.getByType(guildId, RoleConfigType.GIRL_VERIFIED),
      roleConfigService.getByType(guildId, RoleConfigType.GIRL_NOT_VERIFIED),
    ]);

    const authorized =
      memberIsAdministrator(actor) || (!!manager && actor.roles.cache.has(manager.roleId));
    if (!authorized) throw new ApplicationError("VERIFY_NOT_ALLOWED", V.notAllowed);
    if (!verified || !actor.guild.roles.cache.has(verified.roleId)) {
      throw new ApplicationError("VERIFY_ROLE_UNSET", V.verifiedRoleMissing);
    }

    const holdsNotVerified = !!notVerified && target.roles.cache.has(notVerified.roleId);
    if (target.roles.cache.has(verified.roleId) && !holdsNotVerified) {
      throw new ApplicationError("VERIFY_ALREADY", V.alreadyVerified(target.id));
    }

    try {
      if (holdsNotVerified && notVerified) {
        await target.roles.remove(notVerified.roleId, `Girls verification by ${actor.id}`);
      }
      if (!target.roles.cache.has(verified.roleId)) {
        await target.roles.add(verified.roleId, `Girls verification by ${actor.id}`);
      }
    } catch (err) {
      log.error(`girls verification role update failed for ${target.id}`, err);
      throw new ApplicationError("VERIFY_ROLE_WRITE_FAILED", V.failed);
    }

    await this.recordOnApplications(actor, target);
    log.info(`girls verification: ${target.id} verified by ${actor.id} in ${guildId}`);
  }

  private async recordOnApplications(actor: GuildMember, target: GuildMember): Promise<void> {
    const open = await StaffApplicationModel.find({
      guildId: actor.guild.id,
      userId: target.id,
      gender: ApplicantGender.FEMALE,
      applicationStatus: { $in: OPEN_APPLICATION_STATUSES as ApplicationStatus[] },
    }).exec();

    for (const application of open) {
      await StaffApplicationModel.updateOne(
        { applicationId: application.applicationId },
        {
          $set: {
            girlVerification: GirlVerificationStatus.VERIFIED,
            girlVerifiedBy: actor.id,
            girlVerifiedAt: new Date(),
          },
        },
      ).exec();

      if (!application.ticketId) continue;
      const ticket = await ticketService.getTicket(application.ticketId);
      const channel = ticket
        ? await actor.guild.channels.fetch(ticket.channelId).catch(() => null)
        : null;
      if (channel?.isTextBased() && "send" in channel) {
        await channel
          .send(buildTicketNotice([V.ticketNotice(actor.id)], { tone: "success" }))
          .catch(() => undefined);
      }
      await applicationTicketService.refreshPanel(actor.guild, application.applicationId);
    }
  }
}

export const girlVerificationService = new GirlVerificationService();

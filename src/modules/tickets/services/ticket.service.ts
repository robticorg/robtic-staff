import {
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type CategoryChannel,
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
  type OverwriteResolvable,
} from "discord.js";
import type { HydratedDocument, Types } from "mongoose";
import { BaseRepository } from "../../../shared/repository/base.repository.ts";
import type { GuildId, IdLike, MongoFilter, RoleId, UserId } from "../../../shared/types/index.ts";
import {
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from "../../../shared/utils/errors.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { nextSequence } from "../../../shared/sequence.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import type { TicketPanelConfig } from "../../../data/tickets/index.ts";
import { StaffActivityType, staffActivityService, staffService } from "../../staff/index.ts";
import { TicketModel, type Ticket, type TicketAnswer } from "../models/ticket.model.ts";
import {
  ACTIVE_TICKET_STATUSES,
  TicketLogAction,
  TicketStatus,
  assertTicketTransition,
} from "../types/enums.ts";
import { applyTicketClaimCredit } from "./ticket-claim-credit.ts";
import { canClaimTicket } from "./ticket-permissions.ts";
import { protectedTicketPrincipals } from "./ticket-permissions.ts";
import { ticketLogService } from "./ticket-log.service.ts";
import { transcriptService } from "./transcript.service.ts";

const log = logger.child("tickets");
const M = ticketMessages;

const GRANT_ACCESS = {
  ViewChannel: true,
  SendMessages: true,
  ReadMessageHistory: true,
  AttachFiles: true,
  EmbedLinks: true,
} as const;

export interface CreateTicketInput {
  guild: Guild;
  panel: TicketPanelConfig;
  member: GuildMember;
  answers: TicketAnswer[];
}

export interface CreateTicketResult {
  ticket: TicketDoc;
  channel: GuildTextBasedChannel;
}

export interface ClaimTicketResult {
  ticket: TicketDoc;
  pointAwarded: boolean;
}

export interface CloseTicketResult {
  ticket: TicketDoc;
  deleted: boolean;
  transcriptId?: string;
}

export interface RemoveTargetsInput {
  users: UserId[];
  roles: RoleId[];
}

type TicketDoc = HydratedDocument<Ticket>;

export class TicketService extends BaseRepository<Ticket> {
  constructor() {
    super(TicketModel);
  }

  getTicket(ticketId: string): Promise<TicketDoc | null> {
    return this.findOne({ ticketId });
  }

  async getTicketOrThrow(ticketId: string): Promise<TicketDoc> {
    const t = await this.getTicket(ticketId);
    if (!t) throw new NotFoundError("ticket", { ticketId });
    return t;
  }

  getTicketByChannel(channelId: string): Promise<TicketDoc | null> {
    return this.findOne({ channelId });
  }

  getTicketById(id: IdLike): Promise<TicketDoc | null> {
    return this.findById(id);
  }

  getOpenTicketForUser(guildId: GuildId, userId: UserId): Promise<TicketDoc | null> {
    return this.model
      .findOne({ guildId, userId, status: { $in: ACTIVE_TICKET_STATUSES as TicketStatus[] } })
      .sort({ createdAt: -1 })
      .exec();
  }

  listForGuild(guildId: GuildId, status?: TicketStatus): Promise<TicketDoc[]> {
    const filter: MongoFilter<Ticket> = { guildId };
    if (status) filter.status = status;
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  getPanel(ticket: Pick<Ticket, "panelId">): string {
    return ticket.panelId;
  }

  async nextTicketId(guildId: GuildId): Promise<string> {
    const seq = await nextSequence(`ticket:${guildId}`);
    return `ticket-${seq}`;
  }

  async createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
    const { guild, panel, member } = input;

    const existing = await this.getOpenTicketForUser(guild.id, member.id);
    if (existing) {
      throw new ConflictError(M.create.alreadyOpen(existing.channelId), {
        ticketId: existing.ticketId,
      });
    }

    const category = await guild.channels.fetch(panel.categoryId).catch(() => null);
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new DomainError("TICKET_CATEGORY_INVALID", M.create.categoryMissing);
    }

    const ticketId = await this.nextTicketId(guild.id);

    const channel = await guild.channels.create({
      name: ticketId,
      type: ChannelType.GuildText,
      parent: (category as CategoryChannel).id,
      permissionOverwrites: this.baseOverwrites(guild, panel, member.id),
      reason: `Ticket ${ticketId} (${panel.id}) for ${member.id}`,
    });

    let ticket: TicketDoc;
    try {
      ticket = await this.insert({
        ticketId,
        guildId: guild.id,
        channelId: channel.id,
        userId: member.id,
        panelId: panel.id,
        status: TicketStatus.OPEN,
        answers: input.answers,
        addedUsers: [],
        addedRoles: [],
      });
    } catch (err) {
      await channel.delete("ticket DB write failed").catch(() => undefined);
      throw err;
    }

    await ticketLogService.record(TicketLogAction.TICKET_CREATED, {
      guild,
      panel,
      ticketId,
      actorId: member.id,
    });

    return { ticket, channel: channel as GuildTextBasedChannel };
  }

  private baseOverwrites(
    guild: Guild,
    panel: TicketPanelConfig,
    creatorId: UserId,
  ): OverwriteResolvable[] {
    return [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: panel.supportRoleId, allow: accessBits(), type: OverwriteType.Role },
      { id: creatorId, allow: accessBits(), type: OverwriteType.Member },
      {
        id: guild.members.me?.id ?? guild.client.user.id,
        allow: [...accessBits(), PermissionFlagsBits.ManageChannels],
        type: OverwriteType.Member,
      },
    ];
  }

  async claimTicket(
    ticketId: string,
    member: GuildMember,
    panel: TicketPanelConfig,
  ): Promise<ClaimTicketResult> {
    const ticket = await this.getTicketOrThrow(ticketId);

    const gate = canClaimTicket(member, panel, ticket);
    if (!gate.ok) {
      if (gate.reason === "ALREADY_CLAIMED") {
        throw new ConflictError(M.claim.alreadyClaimed(ticket.claimedByDiscordId ?? "someone"));
      }
      if (gate.reason === "NOT_OPEN") throw new ValidationError(M.claim.notOpen);
      throw new ValidationError(M.claim.notEligible);
    }

    const staff = await staffService.ensure(member.id, ticket.guildId);

    const claimed = await this.model
      .findOneAndUpdate(
        { ticketId, status: TicketStatus.OPEN, claimedBy: { $exists: false } },
        {
          $set: {
            claimedBy: staff._id,
            claimedByDiscordId: member.id,
            status: TicketStatus.CLAIMED,
            claimedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      )
      .exec();

    if (!claimed) {
      const fresh = await this.getTicket(ticketId);
      throw new ConflictError(M.claim.alreadyClaimed(fresh?.claimedByDiscordId ?? "someone"));
    }

    const { pointAwarded } = await applyTicketClaimCredit(staff._id, ticketId);

    await this.applyClaimOverwrites(member.guild, panel, claimed, member.id).catch((err) =>
      log.warn("claim overwrite update failed", err),
    );

    await ticketLogService.record(TicketLogAction.TICKET_CLAIMED, {
      guild: member.guild,
      panel,
      ticketId,
      actorId: member.id,
    });

    return { ticket: claimed, pointAwarded };
  }

  private async applyClaimOverwrites(
    guild: Guild,
    panel: TicketPanelConfig,
    ticket: Ticket,
    claimerId: UserId,
  ): Promise<void> {
    const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
    if (!channel || !("permissionOverwrites" in channel)) return;
    await channel.permissionOverwrites.edit(panel.supportRoleId, { ViewChannel: false });
    await channel.permissionOverwrites.edit(claimerId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    });
  }

  async addUser(
    ticketId: string,
    actor: GuildMember,
    panel: TicketPanelConfig,
    targets: RemoveTargetsInput,
  ): Promise<{ ticket: TicketDoc; users: number; roles: number }> {
    const ticket = await this.getTicketOrThrow(ticketId);
    const channel = await actor.guild.channels.fetch(ticket.channelId).catch(() => null);
    if (!channel || !("permissionOverwrites" in channel)) {
      throw new NotFoundError("ticket channel", { ticketId });
    }

    for (const userId of targets.users) {
      await channel.permissionOverwrites.edit(userId, GRANT_ACCESS);
      await ticketLogService.record(TicketLogAction.USER_ADDED, {
        guild: actor.guild,
        panel,
        ticketId,
        actorId: actor.id,
        targetId: userId,
      });
    }
    for (const roleId of targets.roles) {
      await channel.permissionOverwrites.edit(roleId, GRANT_ACCESS);
      await ticketLogService.record(TicketLogAction.ROLE_ADDED, {
        guild: actor.guild,
        panel,
        ticketId,
        actorId: actor.id,
        roleId,
      });
    }

    const updated = await this.model
      .findOneAndUpdate(
        { ticketId },
        {
          $addToSet: {
            addedUsers: { $each: targets.users },
            addedRoles: { $each: targets.roles },
          },
        },
        { returnDocument: "after" },
      )
      .exec();

    return { ticket: updated ?? ticket, users: targets.users.length, roles: targets.roles.length };
  }

  addRole(ticketId: string, actor: GuildMember, panel: TicketPanelConfig, roleIds: RoleId[]) {
    return this.addUser(ticketId, actor, panel, { users: [], roles: roleIds });
  }

  async removeUser(
    ticketId: string,
    actor: GuildMember,
    panel: TicketPanelConfig,
    targets: RemoveTargetsInput,
  ): Promise<{ ticket: TicketDoc; removed: number; skipped: number }> {
    const ticket = await this.getTicketOrThrow(ticketId);
    const channel = await actor.guild.channels.fetch(ticket.channelId).catch(() => null);
    if (!channel || !("permissionOverwrites" in channel)) {
      throw new NotFoundError("ticket channel", { ticketId });
    }

    const protectedIds = protectedTicketPrincipals(ticket, panel);
    let removed = 0;
    let skipped = 0;

    for (const userId of targets.users) {
      if (protectedIds.has(userId)) { skipped++; continue; }
      await channel.permissionOverwrites.delete(userId).catch(() => undefined);
      removed++;
      await ticketLogService.record(TicketLogAction.USER_REMOVED, {
        guild: actor.guild, panel, ticketId, actorId: actor.id, targetId: userId,
      });
    }
    for (const roleId of targets.roles) {
      if (protectedIds.has(roleId)) { skipped++; continue; }
      await channel.permissionOverwrites.delete(roleId).catch(() => undefined);
      removed++;
      await ticketLogService.record(TicketLogAction.ROLE_REMOVED, {
        guild: actor.guild, panel, ticketId, actorId: actor.id, roleId,
      });
    }

    const updated = await this.model
      .findOneAndUpdate(
        { ticketId },
        { $pull: { addedUsers: { $in: targets.users }, addedRoles: { $in: targets.roles } } },
        { returnDocument: "after" },
      )
      .exec();

    return { ticket: updated ?? ticket, removed, skipped };
  }

  removeRole(ticketId: string, actor: GuildMember, panel: TicketPanelConfig, roleIds: RoleId[]) {
    return this.removeUser(ticketId, actor, panel, { users: [], roles: roleIds });
  }

  async renameTicket(ticketId: string, newName: string, actor: GuildMember): Promise<TicketDoc> {
    const ticket = await this.getTicketOrThrow(ticketId);
    const clean = newName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 90) || ticketId;
    const channel = await actor.guild.channels.fetch(ticket.channelId).catch(() => null);
    if (channel && "setName" in channel) {
      await channel.setName(clean, `renamed by ${actor.id}`).catch((err) => log.warn("rename failed", err));
    }
    await ticketLogService.record(TicketLogAction.TICKET_RENAMED, {
      guild: actor.guild,
      panel: await this.panelFor(ticket),
      ticketId,
      actorId: actor.id,
      name: clean,
    });
    return ticket;
  }

  async closeTicket(
    ticketId: string,
    actorId: UserId,
    panel: TicketPanelConfig,
    guild: Guild,
  ): Promise<CloseTicketResult> {
    const ticket = await this.getTicketOrThrow(ticketId);
    assertTicketTransition(ticket.status, TicketStatus.CLOSED);

    const channel = (await guild.channels.fetch(ticket.channelId).catch(() => null)) as
      | GuildTextBasedChannel
      | null;

    let transcriptId: string | undefined;
    if (panel.close.transcript) {
      const transcript = await transcriptService.generate(ticket, channel).catch((err) => {
        log.warn("transcript generation failed", err);
        return null;
      });
      transcriptId = transcript?.transcriptId;
    }

    const closed = await this.model
      .findOneAndUpdate(
        { ticketId, status: { $in: ACTIVE_TICKET_STATUSES as TicketStatus[] } },
        {
          $set: {
            status: TicketStatus.CLOSED,
            closedAt: new Date(),
            closedBy: actorId,
            ...(transcriptId ? { transcriptId } : {}),
          },
        },
        { returnDocument: "after" },
      )
      .exec();
    if (!closed) throw new ConflictError(M.common.ticketGone, { ticketId });

    await ticketLogService.record(TicketLogAction.TICKET_CLOSED, {
      guild,
      panel,
      ticketId,
      actorId,
    });

    let deleted = false;
    if (panel.close.delete) {
      await this.deleteTicket(ticketId, actorId, guild, panel);
      deleted = true;
    }

    return { ticket: closed, deleted, transcriptId };
  }

  async deleteTicket(
    ticketId: string,
    actorId: UserId,
    guild: Guild,
    panel?: TicketPanelConfig,
  ): Promise<TicketDoc> {
    const ticket = await this.getTicketOrThrow(ticketId);

    const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
    if (channel) {
      await channel.delete(`ticket ${ticketId} deleted by ${actorId}`).catch((err) =>
        log.warn("ticket channel delete failed", err),
      );
    }

    const updated = await this.model
      .findOneAndUpdate(
        { ticketId },
        { $set: { status: TicketStatus.DELETED, deletedAt: new Date(), deletedBy: actorId } },
        { returnDocument: "after" },
      )
      .exec();

    await ticketLogService.record(TicketLogAction.TICKET_DELETED, {
      guild,
      panel: panel ?? (await this.panelFor(ticket)),
      ticketId,
      actorId,
    });

    return updated ?? ticket;
  }

  async removableEntries(
    ticket: Ticket,
    guild: Guild,
  ): Promise<{ value: string; label: string }[]> {
    const out: { value: string; label: string }[] = [];
    for (const userId of ticket.addedUsers) {
      const member = await guild.members.fetch(userId).catch(() => null);
      out.push({ value: `user:${userId}`, label: `@${member?.user.tag ?? userId}` });
    }
    for (const roleId of ticket.addedRoles) {
      const role = await guild.roles.fetch(roleId).catch(() => null);
      out.push({ value: `role:${roleId}`, label: `@${role?.name ?? roleId} (role)` });
    }
    return out;
  }

  async recordCompletionCredit(ticket: Ticket): Promise<void> {
    if (!ticket.claimedBy) return;
    await staffActivityService.create({
      staffId: ticket.claimedBy as Types.ObjectId,
      type: StaffActivityType.TICKET_COMPLETE,
      referenceId: ticket.ticketId,
      metadata: { ticketId: ticket.ticketId },
    });
    await staffService.incrementCounters(ticket.claimedBy as Types.ObjectId, {
      ticketsCompleted: 1,
    });
  }

  private async panelFor(ticket: Pick<Ticket, "panelId">): Promise<TicketPanelConfig> {
    const { getPanel } = await import("../../../data/tickets/index.ts");
    const panel = getPanel(ticket.panelId);
    if (!panel) {
      throw new DomainError("TICKET_PANEL_GONE", M.create.unknownPanel, { panelId: ticket.panelId });
    }
    return panel;
  }
}

function accessBits() {
  return [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
  ];
}

export const ticketService = new TicketService();

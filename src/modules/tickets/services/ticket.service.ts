import {
  AuditLogEvent,
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
import type {
  ChannelId,
  GuildId,
  IdLike,
  MongoFilter,
  RoleId,
  UserId,
} from "../../../shared/types/index.ts";
import {
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from "../../../shared/utils/errors.ts";
import { toObjectId } from "../../../shared/utils/id.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { nextSequence } from "../../../shared/sequence.ts";
import { limits } from "../../../data/config/limits.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import { panelIsAdminOnly, type TicketPanelConfig } from "../../../data/tickets/index.ts";
import { StaffActivityType, staffActivityService, staffService } from "../../staff/index.ts";
import { TicketModel, type Ticket, type TicketAnswer } from "../models/ticket.model.ts";
import {
  ACTIVE_TICKET_STATUSES,
  TicketLogAction,
  TicketStatus,
  assertTicketTransition,
} from "../types/enums.ts";
import { buildClosedTicketPanel } from "../render/closed-panel.ts";
import { applyTicketClaimCredit } from "./ticket-claim-credit.ts";
import { canClaimTicket, canTransferTicket } from "./ticket-permissions.ts";
import { protectedTicketPrincipals } from "./ticket-permissions.ts";
import { ticketLogService } from "./ticket-log.service.ts";
import { transcriptService } from "./transcript.service.ts";
import { transcriptCache } from "./transcript-cache.ts";

const log = logger.child("tickets");
const M = ticketMessages;
const AUDIT_LOOKBACK_MS = 60_000;

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

  additionalRoleIds?: readonly RoleId[];

  metadata?: Record<string, unknown>;

  duplicateScope?: "GUILD" | "PANEL";
}

export interface CreateTicketResult {
  ticket: TicketDoc;
  channel: GuildTextBasedChannel;
}

export interface ClaimTicketResult {
  ticket: TicketDoc;
  pointAwarded: boolean;
}

export interface TransferTicketInput {
  ticketId: string;
  actor: GuildMember;
  target: GuildMember;
  panel: TicketPanelConfig;
  reason: string;
}

export interface TransferTicketResult {
  ticket: TicketDoc;
  previousClaimerId: UserId;
  reason: string;

  /** False when the new claimer already held this ticket before. */
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

  getOpenTicketForUserInPanel(
    guildId: GuildId,
    userId: UserId,
    panelId: string,
  ): Promise<TicketDoc | null> {
    return this.model
      .findOne({
        guildId,
        userId,
        panelId,
        status: { $in: ACTIVE_TICKET_STATUSES as TicketStatus[] },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  listForGuild(guildId: GuildId, status?: TicketStatus): Promise<TicketDoc[]> {
    const filter: MongoFilter<Ticket> = { guildId };
    if (status) filter.status = status;
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  async listAllActiveChannelIds(): Promise<string[]> {
    const rows = await this.model
      .find({ status: { $in: ACTIVE_TICKET_STATUSES as TicketStatus[] } }, { channelId: 1 })
      .exec();
    return rows.map((r) => r.channelId);
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

    const existing =
      input.duplicateScope === "PANEL"
        ? await this.getOpenTicketForUserInPanel(guild.id, member.id, panel.id)
        : await this.getOpenTicketForUser(guild.id, member.id);
    if (existing) {
      throw new ConflictError(M.create.alreadyOpen(existing.channelId), {
        ticketId: existing.ticketId,
      });
    }

    const category = panel.categoryId
      ? await guild.channels.fetch(panel.categoryId).catch(() => null)
      : null;
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new DomainError("TICKET_CATEGORY_INVALID", M.create.categoryMissing);
    }

    const ticketId = await this.nextTicketId(guild.id);

    const channel = await guild.channels.create({
      name: ticketId,
      type: ChannelType.GuildText,
      parent: (category as CategoryChannel).id,
      permissionOverwrites: this.baseOverwrites(
        guild,
        panel,
        member.id,
        input.additionalRoleIds ?? [],
      ),
      reason: `Ticket ${ticketId} (${panel.id}) for ${member.id}`,
    });

    transcriptCache.track(channel.id);

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
        ...(input.metadata ? { metadata: input.metadata } : {}),
      });
    } catch (err) {
      transcriptCache.untrack(channel.id);
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
    additionalRoleIds: readonly RoleId[] = [],
  ): OverwriteResolvable[] {
    const extra = [...new Set(additionalRoleIds)].filter(
      (id) => id !== panel.supportRoleId && guild.roles.cache.has(id),
    );

    return [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },

      ...(panelIsAdminOnly(panel)
        ? []
        : [
            {
              id: panel.supportRoleId,
              allow: accessBits(),
              type: OverwriteType.Role,
            } as OverwriteResolvable,
          ]),
      ...extra.map(
        (id) =>
          ({ id, allow: accessBits(), type: OverwriteType.Role }) as OverwriteResolvable,
      ),
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
      if (gate.reason === "IS_OWNER") throw new ValidationError(M.claim.cantClaimOwn);
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

  async transferTicket(input: TransferTicketInput): Promise<TransferTicketResult> {
    const { ticketId, actor, target, panel } = input;
    const ticket = await this.getTicketOrThrow(ticketId);

    const gate = await canTransferTicket(actor, target, panel, ticket);
    if (!gate.ok) throw transferError(gate.reason);

    const reason = input.reason.trim().slice(0, limits.reasonMaxLength);
    if (!reason) throw new ValidationError(M.transfer.reasonMissing);

    const previousClaimerId = ticket.claimedByDiscordId as UserId;
    const staff = await staffService.ensure(target.id, ticket.guildId);

    const transferred = await this.model
      .findOneAndUpdate(
        { ticketId, status: TicketStatus.CLAIMED, claimedByDiscordId: previousClaimerId },
        {
          $set: {
            claimedBy: staff._id,
            claimedByDiscordId: target.id,
            claimedAt: new Date(),
            transferredFrom: previousClaimerId,
            transferredAt: new Date(),
            transferReason: reason,
          },
        },
        { returnDocument: "after" },
      )
      .exec();
    if (!transferred) throw new ConflictError(M.transfer.raced, { ticketId });

    // The new claimer now owns the ticket, so they earn the claim point the same
    // way a direct `!claim` earns it. The `staffId + type + referenceId` unique
    // index keeps this to one point per person per ticket, so handing a ticket
    // back to someone who already held it awards nothing the second time. The
    // previous claimer keeps the point they already earned.
    const { pointAwarded } = await applyTicketClaimCredit(staff._id, ticketId);

    await this.applyTransferOverwrites(
      actor.guild,
      transferred,
      previousClaimerId,
      target.id,
    ).catch((err) => log.warn("transfer overwrite update failed", err));

    await ticketLogService.record(TicketLogAction.TICKET_TRANSFERRED, {
      guild: actor.guild,
      panel,
      ticketId,
      actorId: actor.id,
      fromId: previousClaimerId,
      targetId: target.id,
      reason,
    });

    return { ticket: transferred, previousClaimerId, reason, pointAwarded };
  }

  private async applyTransferOverwrites(
    guild: Guild,
    ticket: Ticket,
    previousClaimerId: UserId,
    newClaimerId: UserId,
  ): Promise<void> {
    const channel = await guild.channels.fetch(ticket.channelId).catch(() => null);
    if (!channel || !("permissionOverwrites" in channel)) return;

    await channel.permissionOverwrites.edit(newClaimerId, GRANT_ACCESS);

    if (previousClaimerId !== ticket.userId) {
      await channel.permissionOverwrites.edit(previousClaimerId, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: false,
        AddReactions: false,
      });
    }
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

    const clean =
      newName.trim().toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, "-").slice(0, 90) || ticketId;
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

    const transcriptId = await this.ensureTranscript(ticket, guild, channel, panel);

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
    } else {
      transcriptCache.untrack(ticket.channelId);
      await this.postClosedPanel(closed, channel);
    }

    return { ticket: closed, deleted, transcriptId };
  }

  /**
   * The channel survives a close when `panel.close.delete` is off, so it is left
   * with a card the remaining staff can act from: transcript / reopen / delete.
   */
  private async postClosedPanel(
    ticket: TicketDoc,
    channel: GuildTextBasedChannel | null,
  ): Promise<void> {
    if (!channel || !("send" in channel)) return;
    await channel.send(buildClosedTicketPanel(ticket)).catch((err) => {
      log.warn(`closed-ticket panel for ${ticket.ticketId} could not be posted`, err);
    });
  }

  async reopenTicket(
    ticketId: string,
    actor: GuildMember,
    panel?: TicketPanelConfig,
  ): Promise<TicketDoc> {
    const ticket = await this.getTicketOrThrow(ticketId);
    if (ticket.status !== TicketStatus.CLOSED) {
      throw new ValidationError(M.closedPanel.notClosed, { ticketId, status: ticket.status });
    }
    assertTicketTransition(ticket.status, TicketStatus.OPEN);

    const reopened = await this.model
      .findOneAndUpdate(
        { ticketId, status: TicketStatus.CLOSED },
        {
          $set: {
            status: TicketStatus.OPEN,
            reopenedAt: new Date(),
            reopenedBy: actor.id,
          },
          // The ticket goes back into the pool, and the next close writes a fresh
          // transcript rather than reusing the one cut at the previous close.
          $unset: {
            claimedBy: "",
            claimedByDiscordId: "",
            claimedAt: "",
            closedAt: "",
            closedBy: "",
            transcriptId: "",
          },
        },
        { returnDocument: "after" },
      )
      .exec();
    if (!reopened) throw new ConflictError(M.reopen.raced, { ticketId });

    transcriptCache.track(reopened.channelId);

    await ticketLogService.record(TicketLogAction.TICKET_REOPENED, {
      guild: actor.guild,
      panel: panel ?? (await this.panelFor(reopened)),
      ticketId,
      actorId: actor.id,
    });

    return reopened;
  }

  async deleteTicket(
    ticketId: string,
    actorId: UserId,
    guild: Guild,
    panel?: TicketPanelConfig,
  ): Promise<TicketDoc> {
    const ticket = await this.getTicketOrThrow(ticketId);
    const resolvedPanel = panel ?? (await this.panelFor(ticket));

    const channel = (await guild.channels.fetch(ticket.channelId).catch(() => null)) as
      | GuildTextBasedChannel
      | null;
    const transcriptId = await this.ensureTranscript(ticket, guild, channel, resolvedPanel);

    if (channel) {
      await channel.delete(`ticket ${ticketId} deleted by ${actorId}`).catch((err) =>
        log.warn("ticket channel delete failed", err),
      );
    }
    transcriptCache.untrack(ticket.channelId);

    const updated = await this.model
      .findOneAndUpdate(
        { ticketId },
        {
          $set: {
            status: TicketStatus.DELETED,
            deletedAt: new Date(),
            deletedBy: actorId,
            ...(transcriptId ? { transcriptId } : {}),
          },
        },
        { returnDocument: "after" },
      )
      .exec();

    await ticketLogService.record(TicketLogAction.TICKET_DELETED, {
      guild,
      panel: resolvedPanel,
      ticketId,
      actorId,
    });

    return updated ?? ticket;
  }

  async handleManualChannelDelete(input: {
    guild: Guild;
    channelId: ChannelId;
  }): Promise<{ handled: boolean; ticketId?: string; actorId?: UserId }> {
    const ticket = await this.getTicketByChannel(input.channelId);
    if (!ticket || ticket.guildId !== input.guild.id) return { handled: false };

    if (ticket.status === TicketStatus.DELETED) {
      transcriptCache.untrack(input.channelId);
      return { handled: false, ticketId: ticket.ticketId };
    }

    const panel = await this.panelFor(ticket).catch(() => null);
    if (!panel) {
      transcriptCache.untrack(input.channelId);
      log.warn(
        `ticket ${ticket.ticketId} channel was deleted but its panel "${ticket.panelId}" is gone`,
      );
      return { handled: false, ticketId: ticket.ticketId };
    }

    const actorId = await this.resolveChannelDeleter(input.guild, input.channelId);

    const transcriptId = await this.ensureTranscript(ticket, input.guild, null, panel);

    const updated = await this.model
      .findOneAndUpdate(
        { ticketId: ticket.ticketId, status: { $ne: TicketStatus.DELETED } },
        {
          $set: {
            status: TicketStatus.DELETED,
            deletedAt: new Date(),
            deletedBy: actorId ?? "UNKNOWN",
            ...(transcriptId ? { transcriptId } : {}),
          },
          $unset: { sleepDueAt: "", sleepStartedBy: "", sleepStartedAt: "", sleepDurationMs: "" },
        },
        { returnDocument: "after" },
      )
      .exec();

    transcriptCache.untrack(input.channelId);

    if (!updated) return { handled: false, ticketId: ticket.ticketId };

    await ticketLogService.record(TicketLogAction.TICKET_DELETED_MANUALLY, {
      guild: input.guild,
      panel,
      ticketId: ticket.ticketId,
      actorId: actorId ?? "UNKNOWN",
      targetId: actorId ?? undefined,
    });

    log.warn(
      `ticket ${ticket.ticketId} channel deleted outside the bot by ${actorId ?? "an unknown actor"} ` +
        `— transcript ${transcriptId ? "saved" : "unavailable"}`,
    );

    return { handled: true, ticketId: ticket.ticketId, actorId: actorId ?? undefined };
  }

  private async resolveChannelDeleter(
    guild: Guild,
    channelId: ChannelId,
  ): Promise<UserId | null> {
    try {
      const logs = await guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 10,
      });
      const entry = logs.entries.find(
        (e) =>
          e.targetId === channelId && Date.now() - e.createdTimestamp < AUDIT_LOOKBACK_MS,
      );
      return entry?.executor?.id ?? null;
    } catch (err) {
      log.warn("audit log lookup for the deleted ticket channel failed", err);
      return null;
    }
  }

  private async ensureTranscript(
    ticket: Ticket,
    guild: Guild,
    channel: GuildTextBasedChannel | null,
    panel: TicketPanelConfig,
  ): Promise<string | undefined> {
    if (ticket.transcriptId) return ticket.transcriptId;
    if (!panel.close.transcript) return undefined;

    const transcript = await transcriptService.generate(ticket, channel).catch((err) => {
      log.warn("transcript generation failed", err);
      return null;
    });
    if (!transcript) return undefined;

    await transcriptService.sendToChannel(guild, transcript);
    return transcript.transcriptId;
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

    // A reopened ticket can be closed again; the completion is credited once.
    const claimed = await this.model
      .findOneAndUpdate(
        { ticketId: ticket.ticketId, completionCreditedAt: { $exists: false } },
        { $set: { completionCreditedAt: new Date() } },
      )
      .exec();
    if (!claimed) return;

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

function transferError(reason?: string): DomainError {
  switch (reason) {
    case "NOT_TRANSFERABLE":
      return new ValidationError(M.transfer.notTransferable);
    case "NOT_CLAIMED":
      return new ValidationError(M.transfer.notClaimed);
    case "NOT_ALLOWED":
      return new ValidationError(M.transfer.notAllowed);
    case "TARGET_IS_BOT":
      return new ValidationError(M.transfer.targetIsBot);
    case "TARGET_IS_CLAIMER":
      return new ValidationError(M.transfer.targetIsClaimer);
    case "TARGET_IS_OWNER":
      return new ValidationError(M.transfer.targetIsOwner);
    default:
      return new ValidationError(M.transfer.targetNotStaff);
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

import { PermissionFlagsBits, type GuildMember } from "discord.js";
import { TtlCache } from "../../../../libs/cache/index.ts";
import type { ChannelId, UserId } from "../../../../shared/types/index.ts";
import { shortId } from "../../../../shared/utils/id.ts";
import { giftClaimConfig } from "../../../../data/gift-claim/config.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import { staffPermissionService } from "../../../staff/services/staff-permissions.service.ts";
import { ticketService } from "../../../tickets/services/ticket.service.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../../../tickets/types/enums.ts";
import { GiftDeliveryType } from "../../types/enums.ts";
import { GiftClaimError, giftClaimService } from "../gift-claim.service.ts";
import { extractCreditAmount } from "./gift-delivery-input.ts";

const C = giftDeliveryMessages.command;

export interface GiftCommandDraft {
  draftId: string;
  guildId: string;
  channelId: ChannelId;
  ticketId: string | null;
  staffId: UserId;
  userId: UserId;
  info: string | null;
}

export interface GiftCommandContext {
  ticket: { ticketId: string; ownerId: UserId } | null;
  isAdministrator: boolean;
}

export type GiftCommandRoute =
  | { kind: "TICKET"; userId: UserId; ticketId: string }
  | { kind: "DIRECT"; userId: UserId }
  | { kind: "REQUEST"; userId: UserId; ticketId: string | null };

export function routeGiftCommand(context: GiftCommandContext, mentionedId: UserId | null): GiftCommandRoute {
  if (context.ticket) {
    if (mentionedId && mentionedId !== context.ticket.ownerId) {
      throw new GiftClaimError("GIFT_COMMAND_NOT_OWNER", C.onlyTicketOwner);
    }
    const { ownerId, ticketId } = context.ticket;
    return context.isAdministrator
      ? { kind: "TICKET", userId: ownerId, ticketId }
      : { kind: "REQUEST", userId: ownerId, ticketId };
  }
  if (!mentionedId) throw new GiftClaimError("GIFT_COMMAND_USAGE", C.usage);
  return context.isAdministrator
    ? { kind: "DIRECT", userId: mentionedId }
    : { kind: "REQUEST", userId: mentionedId, ticketId: null };
}

const cleanInfo = (info: string | null): string | null => (info?.trim() ? info.trim().slice(0, 200) : null);

export class GiftCommandService {
  private readonly drafts = new TtlCache<GiftCommandDraft>({
    defaultTtlMs: giftClaimConfig.delivery.commandDraftTtlMs,
  });

  async context(member: GuildMember, channelId: ChannelId): Promise<GiftCommandContext> {
    if (!(await staffPermissionService.canActAsStaff(member))) {
      throw new GiftClaimError("GIFT_COMMAND_NOT_STAFF", C.notStaff);
    }
    const ticket = await ticketService.getTicketByChannel(channelId);
    const active =
      ticket &&
      ticket.guildId === member.guild.id &&
      (ACTIVE_TICKET_STATUSES as TicketStatus[]).includes(ticket.status);
    return {
      ticket: active ? { ticketId: ticket.ticketId, ownerId: ticket.userId } : null,
      isAdministrator: member.permissions.has(PermissionFlagsBits.Administrator),
    };
  }

  private async requireTarget(staff: GuildMember, userId: UserId): Promise<void> {
    if (userId === staff.id) throw new GiftClaimError("GIFT_COMMAND_SELF", C.selfGift);
    const target = await staff.guild.members.fetch(userId).catch(() => null);
    if (!target || target.user.bot) {
      throw new GiftClaimError("GIFT_COMMAND_USER_GONE", giftDeliveryMessages.errors.userGone);
    }
  }

  async start(input: {
    staff: GuildMember;
    channelId: ChannelId;
    route: Exclude<GiftCommandRoute, { kind: "REQUEST" }>;
    info: string | null;
  }): Promise<GiftCommandDraft> {
    await this.requireTarget(input.staff, input.route.userId);
    const draft: GiftCommandDraft = {
      draftId: shortId(8),
      guildId: input.staff.guild.id,
      channelId: input.channelId,
      ticketId: input.route.kind === "TICKET" ? input.route.ticketId : null,
      staffId: input.staff.id,
      userId: input.route.userId,
      info: cleanInfo(input.info),
    };
    this.drafts.set(draft.draftId, draft);
    return draft;
  }

  async request(input: {
    staff: GuildMember;
    channelId: ChannelId;
    userId: UserId;
    ticketId?: string | null;
    info: string | null;
  }): Promise<{ claimId: string; orderChannelId: string }> {
    await this.requireTarget(input.staff, input.userId);
    const info = cleanInfo(input.info);
    const { claim, channelId } = await giftClaimService.createRequest({
      guildId: input.staff.guild.id,
      staffId: input.staff.id,
      userId: input.userId,
      ticketId: input.ticketId ?? null,
      info,
      originChannelId: input.channelId,
      ...(extractCreditAmount(info) ? { deliveryType: GiftDeliveryType.CREDITS } : {}),
    });
    return { claimId: claim.claimId, orderChannelId: channelId };
  }

  private async reauthorize(draft: GiftCommandDraft, actor: GuildMember): Promise<void> {
    const context = await this.context(actor, draft.channelId);
    const stillValid = draft.ticketId
      ? context.ticket?.ticketId === draft.ticketId
      : context.isAdministrator;
    if (!stillValid) throw new GiftClaimError("GIFT_COMMAND_NOT_IN_TICKET", C.notInTicket);
  }

  private own(draftId: string, actor: GuildMember): GiftCommandDraft {
    const draft = this.drafts.get(draftId);
    if (!draft || draft.guildId !== actor.guild.id) {
      throw new GiftClaimError("GIFT_COMMAND_EXPIRED", C.expired);
    }
    if (draft.staffId !== actor.id) throw new GiftClaimError("GIFT_COMMAND_NOT_AUTHOR", C.notAuthor);
    return draft;
  }

  async resume(draftId: string, actor: GuildMember): Promise<GiftCommandDraft> {
    const draft = this.own(draftId, actor);
    await this.reauthorize(draft, actor);
    return draft;
  }

  async take(draftId: string, actor: GuildMember): Promise<GiftCommandDraft> {
    const draft = this.own(draftId, actor);
    this.drafts.delete(draftId);
    await this.reauthorize(draft, actor);
    return draft;
  }
}

export const giftCommandService = new GiftCommandService();

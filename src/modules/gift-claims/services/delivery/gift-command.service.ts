import type { GuildMember } from "discord.js";
import { TtlCache } from "../../../../libs/cache/index.ts";
import type { ChannelId, UserId } from "../../../../shared/types/index.ts";
import { shortId } from "../../../../shared/utils/id.ts";
import { giftClaimConfig } from "../../../../data/gift-claim/config.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import { staffPermissionService } from "../../../staff/services/staff-permissions.service.ts";
import { ticketService } from "../../../tickets/services/ticket.service.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../../../tickets/types/enums.ts";
import { GiftClaimError } from "../gift-claim.service.ts";

const C = giftDeliveryMessages.command;

export interface GiftCommandDraft {
  draftId: string;
  guildId: string;
  channelId: ChannelId;
  ticketId: string;
  staffId: UserId;
  userId: UserId;
  info: string | null;
}

export class GiftCommandService {
  private readonly drafts = new TtlCache<GiftCommandDraft>({
    defaultTtlMs: giftClaimConfig.delivery.commandDraftTtlMs,
  });

  async authorize(member: GuildMember, channelId: ChannelId): Promise<{ ticketId: string }> {
    if (!(await staffPermissionService.canActAsStaff(member))) {
      throw new GiftClaimError("GIFT_COMMAND_NOT_STAFF", C.notStaff);
    }
    const ticket = await ticketService.getTicketByChannel(channelId);
    if (
      !ticket ||
      ticket.guildId !== member.guild.id ||
      !(ACTIVE_TICKET_STATUSES as TicketStatus[]).includes(ticket.status)
    ) {
      throw new GiftClaimError("GIFT_COMMAND_NOT_IN_TICKET", C.notInTicket);
    }
    return { ticketId: ticket.ticketId };
  }

  async start(input: {
    staff: GuildMember;
    channelId: ChannelId;
    userId: UserId;
    info: string | null;
  }): Promise<GiftCommandDraft> {
    const { ticketId } = await this.authorize(input.staff, input.channelId);
    if (input.userId === input.staff.id) throw new GiftClaimError("GIFT_COMMAND_SELF", C.selfGift);
    const target = await input.staff.guild.members.fetch(input.userId).catch(() => null);
    if (!target || target.user.bot) {
      throw new GiftClaimError("GIFT_COMMAND_USER_GONE", giftDeliveryMessages.errors.userGone);
    }

    const draft: GiftCommandDraft = {
      draftId: shortId(8),
      guildId: input.staff.guild.id,
      channelId: input.channelId,
      ticketId,
      staffId: input.staff.id,
      userId: input.userId,
      info: input.info?.trim() ? input.info.trim().slice(0, 200) : null,
    };
    this.drafts.set(draft.draftId, draft);
    return draft;
  }

  async resume(draftId: string, actor: GuildMember): Promise<GiftCommandDraft> {
    const draft = this.drafts.get(draftId);
    if (!draft || draft.guildId !== actor.guild.id) {
      throw new GiftClaimError("GIFT_COMMAND_EXPIRED", C.expired);
    }
    if (draft.staffId !== actor.id) throw new GiftClaimError("GIFT_COMMAND_NOT_AUTHOR", C.notAuthor);
    await this.authorize(actor, draft.channelId);
    return draft;
  }

  async take(draftId: string, actor: GuildMember): Promise<GiftCommandDraft> {
    const draft = this.drafts.get(draftId);
    if (!draft || draft.guildId !== actor.guild.id) {
      throw new GiftClaimError("GIFT_COMMAND_EXPIRED", C.expired);
    }
    if (draft.staffId !== actor.id) throw new GiftClaimError("GIFT_COMMAND_NOT_AUTHOR", C.notAuthor);
    this.drafts.delete(draftId);
    await this.authorize(actor, draft.channelId);
    return draft;
  }
}

export const giftCommandService = new GiftCommandService();

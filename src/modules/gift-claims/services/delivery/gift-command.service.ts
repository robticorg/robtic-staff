import { type GuildMember } from "discord.js";
import { TtlCache } from "../../../../libs/cache/index.ts";
import type { ChannelId, UserId } from "../../../../shared/types/index.ts";
import { shortId } from "../../../../shared/utils/id.ts";
import { giftClaimConfig } from "../../../../data/gift-claim/config.ts";
import { giftDeliveryMessages } from "../../../../data/gift-claim/delivery-messages.ts";
import { hasAdminAccess } from "../../../access/index.ts";
import { staffPermissionService } from "../../../staff/services/staff-permissions.service.ts";
import { ticketService } from "../../../tickets/services/ticket.service.ts";
import { ACTIVE_TICKET_STATUSES, type TicketStatus } from "../../../tickets/types/enums.ts";
import { GiftDeliveryType } from "../../types/enums.ts";
import { GiftClaimError, giftClaimService } from "../gift-claim.service.ts";
import { giftCommandCooldown } from "./gift-command-cooldown.ts";
import { parseCreditAmount } from "./gift-delivery-input.ts";
import { giftDeliveryProofService, type UploadedProof } from "./gift-delivery-proof.service.ts";

const C = giftDeliveryMessages.command;
const LIMITS = giftClaimConfig.delivery;

export const GiftCommandMode = {
  DIRECT: "DIRECT",
  REQUEST: "REQUEST",
} as const;
export type GiftCommandMode = (typeof GiftCommandMode)[keyof typeof GiftCommandMode];

export interface GiftCommandDraft {
  draftId: string;
  guildId: string;
  channelId: ChannelId;
  ticketId: string | null;
  staffId: UserId;
  userId: UserId;
  info: string | null;
  mode: GiftCommandMode;
}

export interface GiftCommandContext {
  ticket: { ticketId: string; ownerId: UserId } | null;
  isAdministrator: boolean;
}

export type GiftCommandRoute =
  | { kind: "TICKET"; userId: UserId; ticketId: string }
  | { kind: "DIRECT"; userId: UserId }
  | { kind: "REQUEST"; userId: UserId; ticketId: string | null };

export interface GiftRequestForm {
  type: GiftDeliveryType;
  amount: string | null;
  item: string | null;
  account: string | null;
  proof: readonly UploadedProof[];
}

export interface ValidGiftRequest {
  type: GiftDeliveryType;
  amount: string | null;
  item: string | null;
  account: string | null;
}

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

export function validateGiftRequest(form: Omit<GiftRequestForm, "proof">): ValidGiftRequest {
  const item = form.item?.trim().slice(0, LIMITS.maxItemLength) || null;
  const account = form.account?.trim().slice(0, LIMITS.maxAccountLength) || null;
  if (form.type === GiftDeliveryType.CREDITS) {
    const amount = parseCreditAmount(form.amount);
    if (!amount) throw new GiftClaimError("GIFT_AMOUNT_INVALID", giftDeliveryMessages.errors.amountInvalid);
    return { type: form.type, amount, item: null, account: null };
  }
  if (!item) throw new GiftClaimError("GIFT_ITEM_REQUIRED", C.itemRequired);
  return {
    type: form.type,
    amount: null,
    item,
    account: form.type === GiftDeliveryType.OTHER ? account : null,
  };
}

const cleanInfo = (info: string | null): string | null => (info?.trim() ? info.trim().slice(0, 200) : null);

export class GiftCommandService {
  private readonly drafts = new TtlCache<GiftCommandDraft>({
    defaultTtlMs: LIMITS.commandDraftTtlMs,
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
      isAdministrator: hasAdminAccess(member),
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
    route: GiftCommandRoute;
    info: string | null;
  }): Promise<GiftCommandDraft> {
    const { route } = input;
    const mode = route.kind === "REQUEST" ? GiftCommandMode.REQUEST : GiftCommandMode.DIRECT;
    const ticketId = route.kind === "DIRECT" ? null : route.ticketId;
    if (mode === GiftCommandMode.REQUEST && ticketId) {
      await giftCommandCooldown.assertReady(input.staff.guild.id, ticketId);
    }
    await this.requireTarget(input.staff, route.userId);
    const draft: GiftCommandDraft = {
      draftId: shortId(8),
      guildId: input.staff.guild.id,
      channelId: input.channelId,
      ticketId,
      staffId: input.staff.id,
      userId: route.userId,
      info: cleanInfo(input.info),
      mode,
    };
    this.drafts.set(draft.draftId, draft);
    return draft;
  }

  async submitRequest(
    draftId: string,
    actor: GuildMember,
    form: GiftRequestForm,
  ): Promise<{ claimId: string; orderChannelId: string; draft: GiftCommandDraft }> {
    const valid = validateGiftRequest(form);
    giftDeliveryProofService.assertValid(form.proof);

    const draft = this.own(draftId, actor);
    if (draft.mode !== GiftCommandMode.REQUEST) throw new GiftClaimError("GIFT_COMMAND_EXPIRED", C.expired);
    await this.reauthorize(draft, actor);
    if (draft.ticketId) await giftCommandCooldown.assertReady(draft.guildId, draft.ticketId);
    this.drafts.delete(draftId);

    const { claim, channelId } = await giftClaimService.createRequest({
      guildId: draft.guildId,
      staffId: draft.staffId,
      userId: draft.userId,
      ticketId: draft.ticketId,
      info: valid.item ?? draft.info,
      originChannelId: draft.channelId,
      deliveryType: valid.type,
      amount: valid.amount,
      account: valid.account,
      proofUrls: form.proof.map((file) => file.url),
    });
    return { claimId: claim.claimId, orderChannelId: channelId, draft };
  }

  private async reauthorize(draft: GiftCommandDraft, actor: GuildMember): Promise<void> {
    const context = await this.context(actor, draft.channelId);
    const stillValid = draft.ticketId
      ? context.ticket?.ticketId === draft.ticketId
      : draft.mode === GiftCommandMode.REQUEST || context.isAdministrator;
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
    if (draft.mode !== GiftCommandMode.DIRECT) throw new GiftClaimError("GIFT_COMMAND_EXPIRED", C.expired);
    this.drafts.delete(draftId);
    await this.reauthorize(draft, actor);
    return draft;
  }
}

export const giftCommandService = new GiftCommandService();

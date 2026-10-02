import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { accessMessages } from "../../../data/access/messages.ts";
import { giftDeliveryMessages } from "../../../data/gift-claim/delivery-messages.ts";
import { whitelistService } from "../../../modules/access/index.ts";
import { giftDeliveryService } from "../../../modules/gift-claims/services/delivery/gift-delivery.service.ts";
import { GiftDeliveryType } from "../../../modules/gift-claims/types/enums.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { extractUserIds } from "../_shared/parse.ts";
import { requireTargetId } from "../_shared/target.ts";

const M = giftDeliveryMessages;

export const SEND_GIFT_KEYWORDS: ReadonlySet<string> = new Set(["gift", "هدية", "جائزة"]);

export interface SendArgs {
  amountText: string;
  toDeliveryChannel: boolean;
}

export function parseSendArgs(args: readonly string[]): SendArgs {
  const rest = args.filter((arg) => extractUserIds([arg]).length === 0);
  const isKeyword = (arg: string) => SEND_GIFT_KEYWORDS.has(arg.trim().toLowerCase());
  return {
    amountText: rest.filter((arg) => !isKeyword(arg)).join(" ").trim(),
    toDeliveryChannel: rest.some(isKeyword),
  };
}

export default definePrefixCommand({
  name: "send",
  category: "staff",
  async execute(ctx) {
    if (!(await whitelistService.canUseRestricted(ctx.guild.id, ctx.member.id))) {
      throw new PrefixAbort(accessMessages.restrictedOnly);
    }

    const userId = requireTargetId(ctx, M.send.usage);
    const { amountText, toDeliveryChannel } = parseSendArgs(ctx.args);
    if (!amountText) throw new PrefixAbort(M.send.usage);
    const amount = giftDeliveryService.requireAmount(amountText);

    const target = await ctx.guild.members.fetch(userId).catch(() => null);
    if (!target || target.user.bot) throw new PrefixAbort(M.errors.userGone);

    const claim = await giftDeliveryService.createCommandClaim({
      staff: ctx.member,
      userId,
      ticketId: null,
      originChannelId: ctx.channel.id,
      rewardName: M.send.rewardName(amount),
      type: GiftDeliveryType.CREDITS,
      amount,
      untracked: true,
      transferChannelId: toDeliveryChannel ? null : ctx.channel.id,
    });
    await giftDeliveryService.deliverCredits(claim.claimId, ctx.member);
  },
});

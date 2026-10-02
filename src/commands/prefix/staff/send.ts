import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { giftDeliveryMessages } from "../../../data/gift-claim/delivery-messages.ts";
import { giftDeliveryService } from "../../../modules/gift-claims/services/delivery/gift-delivery.service.ts";
import { GiftDeliveryType } from "../../../modules/gift-claims/types/enums.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { extractUserIds } from "../_shared/parse.ts";
import { requireTargetId } from "../_shared/target.ts";

const M = giftDeliveryMessages;

export function sendAmountText(args: readonly string[]): string {
  return args.filter((arg) => extractUserIds([arg]).length === 0).join(" ").trim();
}

export default definePrefixCommand({
  name: "send",
  category: "staff",
  async execute(ctx) {
    if (!staffPermissionService.isAdministrator(ctx.member)) throw new PrefixAbort(M.send.adminOnly);

    const userId = requireTargetId(ctx, M.send.usage);
    const rawAmount = sendAmountText(ctx.args);
    if (!rawAmount) throw new PrefixAbort(M.send.usage);
    const amount = giftDeliveryService.requireAmount(rawAmount);

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
    });
    await giftDeliveryService.deliverCredits(claim.claimId, ctx.member);
  },
});

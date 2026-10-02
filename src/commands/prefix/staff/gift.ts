import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { giftDeliveryMessages } from "../../../data/gift-claim/delivery-messages.ts";
import { GiftClaimCustomId } from "../../../modules/gift-claims/handlers/component-ids.ts";
import { buildGiftCommandMenu } from "../../../modules/gift-claims/render/delivery-components.ts";
import {
  giftCommandService,
  routeGiftCommand,
} from "../../../modules/gift-claims/services/delivery/gift-command.service.ts";
import { PrefixAbort } from "../_shared/guards.ts";
import { extractUserIds, firstUserTarget } from "../_shared/parse.ts";

const M = giftDeliveryMessages;

export default definePrefixCommand({
  name: "gift",
  category: "staff",
  async execute(ctx) {
    const context = await giftCommandService.context(ctx.member, ctx.channel.id);
    const mentionedId = ctx.mentionedUsers[0]?.id ?? firstUserTarget(ctx.args) ?? null;
    const route = routeGiftCommand(context, mentionedId);
    const info = ctx.args.filter((arg) => extractUserIds([arg]).length === 0).join(" ") || null;

    if (route.kind === "REQUEST") {
      const { orderChannelId } = await giftCommandService.request({
        staff: ctx.member,
        channelId: ctx.channel.id,
        userId: route.userId,
        ticketId: route.ticketId,
        info,
      });
      await ctx.reply(M.command.requestSent(route.userId, orderChannelId));
      return;
    }

    const draft = await giftCommandService.start({
      staff: ctx.member,
      channelId: ctx.channel.id,
      route,
      info,
    });

    const target = await ctx.guild.members.fetch(route.userId).catch(() => null);
    if (!target) throw new PrefixAbort(M.command.ticketOwnerGone);
    await ctx.replyWith(
      buildGiftCommandMenu({
        selectCustomId: GiftClaimCustomId.cmdType(draft.draftId),
        userId: route.userId,
        avatarUrl: target.displayAvatarURL({ size: 128 }),
        info: draft.info,
      }),
    );
  },
});

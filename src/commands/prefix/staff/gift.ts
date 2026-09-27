import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { giftDeliveryMessages } from "../../../data/gift-claim/delivery-messages.ts";
import { GiftClaimCustomId } from "../../../modules/gift-claims/handlers/component-ids.ts";
import { buildDeliveryTypeMenuMessage } from "../../../modules/gift-claims/render/delivery-components.ts";
import { giftCommandService } from "../../../modules/gift-claims/services/delivery/gift-command.service.ts";
import { extractUserIds } from "../_shared/parse.ts";
import { requireTargetId } from "../_shared/target.ts";

const M = giftDeliveryMessages;

export default definePrefixCommand({
  name: "gift",
  category: "staff",
  async execute(ctx) {
    await giftCommandService.authorize(ctx.member, ctx.channel.id);
    const userId = requireTargetId(ctx, M.command.usage);

    const info = ctx.args.filter((arg) => extractUserIds([arg]).length === 0).join(" ");

    const draft = await giftCommandService.start({
      staff: ctx.member,
      channelId: ctx.channel.id,
      userId,
      info: info || null,
    });

    await ctx.replyWith(
      buildDeliveryTypeMenuMessage(M.typeMenu.commandHint(userId, draft.info), (type) =>
        GiftClaimCustomId.cmdType(draft.draftId, type),
      ),
    );
  },
});

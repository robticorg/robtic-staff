import type { PrefixContext } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
import { STAFF_TIER_KEYWORD_DEFINITIONS, STAFF_TIER_SLUGS } from "../../../data/staff-tiers/index.ts";
import { getLevelForTier } from "../../../modules/configuration/utils/staff-levels.ts";
import { resolveEndLevel } from "../../../modules/staff/services/staff-accept-request.ts";
import type { LevelMove } from "../../../modules/staff/services/staff-level-math.ts";
import {
  memberActor,
  staffManagementService,
} from "../../../modules/staff/services/staff-management.service.ts";
import { hiddenStaffMessages } from "../../../data/hidden-staff/messages.ts";
import { hiddenStaffService } from "../../../modules/staff/hidden/index.ts";
import { PrefixAbort, requireRankManager } from "./guards.ts";
import { splitHiddenMode } from "./hidden-mode.ts";
import { parseMoveArgs } from "./move-args.ts";
import { requireTargetMember } from "./target.ts";

const M = prefixMessages.staff;

async function runHiddenMove(ctx: PrefixContext, direction: "promote" | "demote"): Promise<void> {
  const target = await requireTargetMember(ctx, direction === "promote" ? M.promoteUsage : M.demoteUsage);
  const result = await hiddenStaffService.move(ctx.member, target, direction);
  if (result.kind === "AT_LIMIT") {
    await ctx.reply(hiddenStaffService.limitMessage(target, direction));
    return;
  }
  const MV = hiddenStaffMessages.moves;
  await ctx.reply(
    direction === "promote"
      ? MV.promoted(target.id, result.from.roleId, result.to.roleId)
      : MV.demoted(target.id, result.from.roleId, result.to.roleId),
  );
}

/** Shared body of !promote and !demote: a number of levels, or a tier name. */
export async function runLevelMove(
  ctx: PrefixContext,
  direction: "promote" | "demote",
): Promise<void> {
  if (splitHiddenMode(ctx.args).hidden) return runHiddenMove(ctx, direction);
  await requireRankManager(ctx);
  const target = await requireTargetMember(
    ctx,
    direction === "promote" ? M.promoteUsage : M.demoteUsage,
  );

  const parsed = parseMoveArgs(ctx.args);
  if (parsed.unknown) {
    throw new PrefixAbort(M.tierTokenUnknown(parsed.unknown, [...STAFF_TIER_SLUGS, "max"].join(", ")));
  }

  let move: LevelMove = parsed.amount;
  if (parsed.max) {
    const level = await resolveEndLevel(ctx.guild.id);
    if (level === null) throw new PrefixAbort(M.rolesNotConfigured);
    move = { level };
  }
  if (parsed.tier) {
    const level = await getLevelForTier(ctx.guild.id, parsed.tier);
    if (level === null) {
      const slug =
        STAFF_TIER_KEYWORD_DEFINITIONS.find((d) => d.tier === parsed.tier)?.slug ?? parsed.tier;
      throw new PrefixAbort(M.tierNotConfigured(STAFF_TIER_LABELS[parsed.tier], slug));
    }
    move = { level };
  }

  const actor = memberActor(ctx.member);
  const result =
    direction === "promote"
      ? await staffManagementService.promote(target, actor, move)
      : await staffManagementService.demote(target, actor, move);

  const mention = `<@${target.id}>`;
  if (result.wrongWay) {
    // "max" pointing the wrong way just means they're already at the top.
    if (!parsed.tier) {
      await ctx.reply(direction === "promote" ? M.alreadyMaxLevel(mention) : M.alreadyMinLevel(mention));
      return;
    }
    const label = STAFF_TIER_LABELS[parsed.tier];
    await ctx.reply(
      direction === "promote"
        ? M.promoteTierNotHigher(mention, label, result.from)
        : M.demoteTierNotLower(mention, label, result.from),
    );
    return;
  }

  if (direction === "promote") {
    await ctx.reply(
      result.changed ? M.promoted(mention, result.from, result.to) : M.alreadyMaxLevel(mention),
    );
  } else {
    await ctx.reply(
      result.changed ? M.demoted(mention, result.from, result.to) : M.alreadyMinLevel(mention),
    );
  }
}

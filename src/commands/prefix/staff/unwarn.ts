import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { staffService } from "../../../modules/staff/index.ts";
import { staffPermissionService } from "../../../modules/staff/services/staff-permissions.service.ts";
import { staffWarningService } from "../../../modules/warnings/index.ts";
import {
  classifyWarnChannel,
  type WarnChannelKind,
} from "../../../modules/warnings/services/warn-channels.ts";
import {
  resolveWarningCategory,
  warningActionService,
} from "../../../modules/warnings/services/warning-actions.service.ts";
import { staffManagementAuthorizationService } from "../../../modules/staff/services/staff-management-authorization.service.ts";
import { PrefixAbort, requireStaff } from "../_shared/guards.ts";
import { requireTargetId } from "../_shared/target.ts";
import { loadWarnChannels, textAfterTarget } from "../_shared/warn-config.ts";

const M = prefixMessages.warn;

/** `!unwarn @user staff` — lift the member's active staff warning. */
const STAFF_KEYWORDS = new Set(["staff", "ستاف", "الستاف"]);

/**
 * Deliberately stricter than `Types.ObjectId.isValid`, which also accepts any
 * 12-character string — that would swallow the first word of a reason as if it
 * were an id. A warning id as shown by `!warns` is always 24 hex characters.
 */
const WARNING_ID = /^[0-9a-fA-F]{24}$/;

type UnwarnMode =
  | { kind: "STAFF"; reason?: string }
  | { kind: "ID"; warningId: string; reason?: string };

/**
 * The argument decides what gets removed, not the channel:
 *  - `staff`     → the member's current staff warning
 *  - a warning id → exactly that warning, user or staff
 *
 * With neither, the channel still decides, so the old muscle memory of running
 * a bare `!unwarn @user` inside the staff-warns room keeps working.
 */
function resolveMode(tokens: string[], channelKind: WarnChannelKind): UnwarnMode {
  const [first, ...rest] = tokens;
  const reason = rest.join(" ") || undefined;

  if (first && STAFF_KEYWORDS.has(first.toLowerCase())) return { kind: "STAFF", reason };
  if (first && WARNING_ID.test(first)) return { kind: "ID", warningId: first, reason };

  if (channelKind === "STAFF") return { kind: "STAFF", reason: tokens.join(" ") || undefined };
  if (channelKind === "USER") throw new PrefixAbort(M.unwarnWarningIdRequired);
  throw new PrefixAbort(M.unwarnUsage);
}

export default definePrefixCommand({
  name: "unwarn",
  category: "staff",
  async execute(ctx) {
    const channelKind = classifyWarnChannel(
      ctx.channel.id,
      await loadWarnChannels(ctx.guild.id),
    );

    // Administrators are not tied to the warn rooms; everyone else still is, and
    // stays silent outside them so the command doesn't leak into normal chat.
    if (!staffPermissionService.isAdministrator(ctx.member) && channelKind === null) {
      throw new PrefixAbort();
    }

    const targetId = requireTargetId(ctx, M.unwarnUsage);
    const mention = `<@${targetId}>`;
    const mode = resolveMode(textAfterTarget(ctx.rest).split(/\s+/).filter(Boolean), channelKind);

    if (mode.kind === "ID") {
      await requireStaff(ctx);

      const result = await warningActionService.revokeWarning({
        guild: ctx.guild,
        warningId: mode.warningId,
        targetId,
        actor: ctx.member,
        isStaffManager: await staffPermissionService.isStaffManager(ctx.member),
        reason: mode.reason,
      });

      await ctx.reply(
        result.kind === "STAFF_VERBAL"
          ? M.unwarnedVerbal(mention)
          : result.kind === "STAFF_REAL"
            ? M.unwarnedReal(mention)
            : M.unwarnedUser(mention),
      );
      return;
    }

    const targetMember = await ctx.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) throw new PrefixAbort(prefixMessages.staff.memberNotFound);

    const decision = await staffManagementAuthorizationService.canWarn(ctx.member, targetMember);
    if (!decision.allowed) throw new PrefixAbort(decision.message);

    const targetStaff = await staffService.get(targetId, ctx.guild.id);
    if (!targetStaff) throw new PrefixAbort(M.staffWarnTargetNotStaff(mention));

    const category = await resolveWarningCategory(targetMember);
    const activeReal = await staffWarningService.activeRealForStaff(targetStaff._id, category);
    const latest = activeReal.at(-1);
    if (!latest) throw new PrefixAbort(M.noActiveRealWarning(mention));

    await warningActionService.revokeWarning({
      guild: ctx.guild,
      warningId: latest._id.toString(),
      targetId,
      actor: ctx.member,
      isStaffManager: true,
      reason: mode.reason,
    });
    await ctx.reply(M.unwarnedReal(mention));
  },
});

export { resolveMode as resolveUnwarnMode };

import { serverTagMessages } from "../../../data/server-tag/messages.ts";
import { formatArabicDuration } from "../../../data/server-tag/duration.ts";
import type { RoleId, UserId } from "../../../shared/types/index.ts";
import type { StaffTagRestorationReason } from "../types/enums.ts";

const L = serverTagMessages.log;
const LB = L.labels;

export type ServerTagLogEvent =
  | { kind: "TAG_ENABLED"; userId: UserId; tagRoleId?: RoleId | null }
  | { kind: "TAG_DISABLED"; userId: UserId; tagRoleId?: RoleId | null }
  | {
      kind: "RESTRICTED";
      userId: UserId;
      savedRoleIds: readonly RoleId[];
      removedRoleIds: readonly RoleId[];
      blockedRoleIds: readonly RoleId[];
      durationMs: number;
      expiresAt: Date;
    }
  | {
      kind: "RESTORED";
      userId: UserId;
      reason: StaffTagRestorationReason;
      restoredRoleIds: readonly RoleId[];
      missingRoleIds: readonly RoleId[];
      blockedRoleIds: readonly RoleId[];
      failed: boolean;
    }
  | { kind: "BLOCKED"; userId: UserId; staffStatus: string }
  | { kind: "PROBLEM"; userId?: UserId; detail: string };

/** Composes one log-channel card — heading plus labelled lines. */
export function buildServerTagLog(event: ServerTagLogEvent): string {
  switch (event.kind) {
    case "TAG_ENABLED": {
      const lines = [L.headings.tagEnabled, L.line(LB.member, L.target(event.userId))];
      if (event.tagRoleId) {
        lines.push(L.line(LB.tagRole, `<@&${event.tagRoleId}>`));
        lines.push(L.line(LB.result, L.results.granted));
      }
      return lines.join("\n");
    }

    case "TAG_DISABLED": {
      const lines = [L.headings.tagDisabled, L.line(LB.member, L.target(event.userId))];
      if (event.tagRoleId) {
        lines.push(L.line(LB.tagRole, `<@&${event.tagRoleId}>`));
        lines.push(L.line(LB.result, L.results.removed));
      }
      return lines.join("\n");
    }

    case "RESTRICTED": {
      const lines = [
        L.headings.restricted,
        L.line(LB.member, L.target(event.userId)),
        L.line(LB.savedRoles, L.roles(event.savedRoleIds)),
        L.line(LB.removedRoles, L.roles(event.removedRoleIds)),
        L.line(LB.duration, formatArabicDuration(event.durationMs)),
        L.line(LB.expiresAt, `${L.absolute(event.expiresAt)} (${L.relative(event.expiresAt)})`),
      ];
      if (event.blockedRoleIds.length > 0) {
        lines.push(L.line(LB.blockedRoles, L.roles(event.blockedRoleIds)));
      }
      return lines.join("\n");
    }

    case "RESTORED": {
      const lines = [
        L.headings.restored,
        L.line(LB.member, L.target(event.userId)),
        L.line(LB.reason, L.reasons[event.reason] ?? event.reason),
        L.line(LB.restoredRoles, L.roles(event.restoredRoleIds)),
      ];
      if (event.missingRoleIds.length > 0) {
        lines.push(L.line(LB.missingRoles, L.roles(event.missingRoleIds)));
      }
      if (event.blockedRoleIds.length > 0) {
        lines.push(L.line(LB.blockedRoles, L.roles(event.blockedRoleIds)));
      }
      lines.push(
        L.line(
          LB.result,
          event.failed
            ? L.results.restoreFailed
            : event.missingRoleIds.length > 0 || event.blockedRoleIds.length > 0
              ? L.results.partial
              : L.results.done,
        ),
      );
      return lines.join("\n");
    }

    case "BLOCKED":
      return [
        L.headings.blocked,
        L.line(LB.member, L.target(event.userId)),
        L.line(LB.staffStatus, L.staffStatus[event.staffStatus] ?? event.staffStatus),
        L.line(LB.reason, L.reasons.STAFF_LIFECYCLE),
      ].join("\n");

    case "PROBLEM":
      return [
        L.headings.problem,
        event.userId ? L.line(LB.member, L.target(event.userId)) : undefined,
        L.line(LB.detail, event.detail),
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n");
  }
}

import type { ChatInputCommandInteraction, Guild } from "discord.js";
import { RoleConfigType, roleConfigService } from "../../modules/configuration/index.ts";
import type { RoleConfig } from "../../modules/configuration/index.ts";
import { branding } from "../../data/config/branding.ts";
import { configMessages } from "../../data/messages/config.ts";
import { STAFF_TIER_LABELS } from "../../data/messages/hierarchy.ts";
import { ROLE_SLOT_LABELS } from "../../data/roles/index.ts";
import { STAFF_TYPE_BY_ID } from "../../data/staff-types/index.ts";
import { requireGuild } from "../_shared/guards.ts";
import { replyInfo } from "../_shared/responses.ts";

const O = configMessages.roleOverview;

/** Single-role slots, in the order they read best. The ladder, ranges and the */
/** multi-role slots are rendered separately below. */
const SINGLETON_SLOTS: readonly RoleConfigType[] = [
  RoleConfigType.STAFF,
  RoleConfigType.BLACKLIST,
  RoleConfigType.STAFF_MANAGER,
  RoleConfigType.OWNER_MANAGER,
  RoleConfigType.TRANSFER_MANAGER,
  RoleConfigType.APPLY_MANAGER,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIFT_MANAGER,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.WARN_1,
  RoleConfigType.WARN_2,
  RoleConfigType.WARN_3,
  RoleConfigType.OWNER_WARN_1,
  RoleConfigType.OWNER_WARN_2,
  RoleConfigType.OWNER_WARN_3,
  RoleConfigType.MUTE,
  RoleConfigType.JAIL,
  RoleConfigType.VACATION,
  RoleConfigType.TAG,
];

function mention(guild: Guild, roleId: string): string {
  return guild.roles.cache.has(roleId) ? O.roleMention(roleId) : O.missingRole(roleId);
}

function isLadderRung(row: RoleConfig): boolean {
  return typeof row.level === "number";
}

export function renderRoleOverview(guild: Guild, rows: readonly RoleConfig[]): string {
  if (rows.length === 0) return `${O.title(branding.botName)}\n\n${O.nothingConfigured}`;

  const out: string[] = [O.title(branding.botName)];

  const ladder = rows.filter(isLadderRung).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  out.push("", O.group(O.ladderHeading));
  if (ladder.length === 0) {
    out.push(O.ladderEmpty);
  } else {
    for (const rung of ladder) {
      out.push(configMessages.role.ladderRung(rung.level as number, rung.roleId));
    }
    const end = ladder.at(-1);
    if (end) out.push(configMessages.role.endLevelLine(end.level as number));
  }

  out.push("", O.group(O.tiersHeading));
  const boundaries = rows.filter((r) => r.boundary);
  if (boundaries.length === 0) {
    out.push(O.empty);
  } else {
    for (const row of boundaries) {
      out.push(
        O.tierLine(STAFF_TIER_LABELS[row.boundary!], row.roleId, row.level ?? null),
      );
    }
  }

  out.push("", O.group(O.singletonsHeading));
  for (const type of SINGLETON_SLOTS) {
    const row = rows.find(
      (r) => r.type === type && (type !== RoleConfigType.STAFF || !isLadderRung(r)),
    );
    out.push(
      O.entry(
        ROLE_SLOT_LABELS[type],
        row ? mention(guild, row.roleId) : O.notConfigured,
      ),
    );
  }

  const access = rows.filter((r) => r.type === RoleConfigType.ACCESS);
  out.push("", O.group(O.accessHeading));
  out.push(access.length ? access.map((r) => mention(guild, r.roleId)).join(" ") : O.empty);

  const ignored = rows.filter((r) => r.type === RoleConfigType.IGNORE);
  out.push("", O.group(O.ignoredHeading));
  out.push(ignored.length ? ignored.map((r) => mention(guild, r.roleId)).join(" ") : O.empty);

  const ranged = rows.filter(
    (r) => r.type === RoleConfigType.ASSIGN || r.type === RoleConfigType.ACCEPTED,
  );
  out.push("", O.group(O.assignHeading));
  if (ranged.length === 0) {
    out.push(O.empty);
  } else {
    for (const row of ranged) {
      out.push(
        O.rangeLine(row.roleId, row.rangeFromLevel ?? null, row.rangeToLevel ?? null),
      );
    }
  }

  const staffTypes = rows.filter((r) => r.type === RoleConfigType.STAFF_TYPE && r.staffType);
  out.push("", O.group(O.staffTypesHeading));
  if (staffTypes.length === 0) {
    out.push(O.empty);
  } else {
    for (const row of staffTypes) {
      out.push(
        O.entry(
          STAFF_TYPE_BY_ID[row.staffType!]?.label ?? row.staffType!,
          mention(guild, row.roleId),
        ),
      );
    }
  }

  return out.join("\n");
}

export async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = requireGuild(interaction);
  const rows = await roleConfigService.listByGuild(guild.id);
  await replyInfo(interaction, renderRoleOverview(guild, rows));
}

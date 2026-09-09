import type { Guild, GuildMember } from "discord.js";
import type { GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType } from "../../configuration/types/enums.ts";
import { ModmailCaseType } from "../types/enums.ts";

export const TargetKind = {
  NOT_IN_GUILD: "NOT_IN_GUILD",
  USER: "USER",
  STAFF: "STAFF",
} as const;
export type TargetKind = (typeof TargetKind)[keyof typeof TargetKind];

export interface ClassifyTargetInput {
  inGuild: boolean;
  memberRoleIds: readonly RoleId[];
  staffRoleIds: readonly RoleId[];
}

export function classifyTarget(input: ClassifyTargetInput): TargetKind {
  if (!input.inGuild) return TargetKind.NOT_IN_GUILD;
  const staff = new Set(input.staffRoleIds);
  const isStaff = input.memberRoleIds.some((id) => staff.has(id));
  return isStaff ? TargetKind.STAFF : TargetKind.USER;
}

export function caseTypeForTarget(kind: TargetKind): ModmailCaseType | null {
  if (kind === TargetKind.USER) return ModmailCaseType.USER_REPORT;
  if (kind === TargetKind.STAFF) return ModmailCaseType.STAFF_REPORT;
  return null;
}

export interface ResolvedTarget {
  kind: TargetKind;
  caseType: ModmailCaseType | null;
  member: GuildMember | null;
}

const SNOWFLAKE = /^\d{17,20}$/;

export function isSnowflake(value: string): boolean {
  return SNOWFLAKE.test(value.trim());
}

async function staffRoleIds(guildId: GuildId): Promise<RoleId[]> {
  const [ladder, general] = await Promise.all([
    roleConfigService.getStaffRoleLevels(guildId),
    roleConfigService.getByType(guildId, RoleConfigType.STAFF),
  ]);
  const ids = ladder.map((r) => r.roleId);
  if (general) ids.push(general.roleId);
  return ids;
}

export async function resolveReportTarget(
  guild: Guild,
  targetId: UserId,
): Promise<ResolvedTarget> {
  let member: GuildMember | null = null;
  try {
    member = await guild.members.fetch(targetId);
  } catch {
    member = null;
  }

  if (!member) {
    return { kind: TargetKind.NOT_IN_GUILD, caseType: null, member: null };
  }

  const kind = classifyTarget({
    inGuild: true,
    memberRoleIds: [...member.roles.cache.keys()],
    staffRoleIds: await staffRoleIds(guild.id),
  });
  return { kind, caseType: caseTypeForTarget(kind), member };
}

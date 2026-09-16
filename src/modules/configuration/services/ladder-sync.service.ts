import type { Guild } from "discord.js";
import type { GuildId, RoleId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { configurationConfig } from "../../../data/config/configuration.ts";
import { RoleConfigType } from "../types/enums.ts";
import { orderLadderRoles, sameLadder, type LadderProblem } from "../utils/ladder-order.ts";
import { roleConfigService, type StaffRoleLevel } from "./role-config.service.ts";

const log = logger.child("config:ladder-sync");

const OFF_LADDER_TYPES: readonly RoleConfigType[] = [
  RoleConfigType.BLACKLIST,
  RoleConfigType.STAFF_MANAGER,
  RoleConfigType.OWNER_MANAGER,
  RoleConfigType.TRANSFER_MANAGER,
  RoleConfigType.WARN_1,
  RoleConfigType.WARN_2,
  RoleConfigType.WARN_3,
  RoleConfigType.MUTE,
  RoleConfigType.JAIL,
  RoleConfigType.CHAT_MANAGER,
  RoleConfigType.VACATION,
  RoleConfigType.APPEAL_MANAGER,
  RoleConfigType.GIFT_MANAGER,
  RoleConfigType.APPLY_MANAGER,
  RoleConfigType.TAG,
  RoleConfigType.ACCEPTED,
  RoleConfigType.ASSIGN,
  RoleConfigType.STAFF_TYPE,
  RoleConfigType.IGNORE,
  RoleConfigType.ACCESS,
];

export type LadderSyncResult =
  | { changed: true; ladder: StaffRoleLevel[]; previous: RoleId[] }
  | { changed: false; reason: "UNCHANGED" | "NOT_CONFIGURED" | LadderProblem };

export class LadderSyncService {
  private pending = new Map<GuildId, ReturnType<typeof setTimeout>>();

  async excludedRoleIds(guildId: GuildId): Promise<Set<RoleId>> {
    const [generalStaff, ...lists] = await Promise.all([
      roleConfigService.getGeneralStaffRole(guildId),
      ...OFF_LADDER_TYPES.map((type) => roleConfigService.listByType(guildId, type)),
    ]);

    const excluded = new Set<RoleId>();
    if (generalStaff) excluded.add(generalStaff.roleId);
    for (const list of lists) for (const row of list) excluded.add(row.roleId);
    return excluded;
  }

  async computeLadder(
    guild: Guild,
    startRoleId: RoleId,
    endRoleId: RoleId,
  ): Promise<RoleId[] | LadderProblem> {
    const result = orderLadderRoles({
      roles: guild.roles.cache.values(),
      startRoleId,
      endRoleId,
      everyoneRoleId: guild.id,
      excludedRoleIds: await this.excludedRoleIds(guild.id),
    });
    return result.ok ? result.ordered : result.problem;
  }

  async sync(guild: Guild): Promise<LadderSyncResult> {
    const [start, end] = await Promise.all([
      roleConfigService.getStartRole(guild.id),
      roleConfigService.getEndRole(guild.id),
    ]);

    if (!start || !end) return { changed: false, reason: "NOT_CONFIGURED" };

    const computed = await this.computeLadder(guild, start.roleId, end.roleId);
    if (typeof computed === "string") {
      log.warn(`ladder sync for ${guild.id} skipped — ${computed}`);
      return { changed: false, reason: computed };
    }

    const current = (await roleConfigService.getStaffRoleLevels(guild.id))
      .sort((a, b) => a.level - b.level)
      .map((r) => r.roleId);
    if (sameLadder(current, computed)) return { changed: false, reason: "UNCHANGED" };

    const ladder = await roleConfigService.rebuildLadder(guild.id, computed);
    log.info(
      `ladder rebuilt for ${guild.id}: ${current.length} → ${ladder.length} rung(s) ` +
        `(role created, moved or deleted inside the START…END range)`,
    );
    return { changed: true, ladder, previous: current };
  }

  schedule(guild: Guild): void {
    const existing = this.pending.get(guild.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.pending.delete(guild.id);
      void this.sync(guild).catch((err) => log.error(`ladder sync failed for ${guild.id}`, err));
    }, configurationConfig.ladderSyncDebounceMs);
    if (typeof timer === "object" && "unref" in timer) timer.unref();

    this.pending.set(guild.id, timer);
  }

  stop(): void {
    for (const timer of this.pending.values()) clearTimeout(timer);
    this.pending.clear();
  }
}

export const ladderSyncService = new LadderSyncService();

import type { Guild, GuildMember } from "discord.js";
import { TtlCache } from "../../../../libs/cache/index.ts";
import type { GuildId, RoleId } from "../../../../shared/types/index.ts";
import { roleConfigService } from "../../../configuration/index.ts";
import { ladderSyncService } from "../../../configuration/services/ladder-sync.service.ts";
import { hiddenStaffConfigRepository, type HiddenConfigView } from "../repositories/hidden-staff-config.repository.ts";
import {
  buildHiddenHierarchy,
  hiddenLevelOfRole,
  hiddenMaxLevel,
  hiddenRoleForLevel,
  hiddenRolesForLevel,
  highestHiddenLevel,
  type HiddenHierarchy,
  type HiddenLevel,
} from "./hidden-staff-hierarchy.ts";

const CACHE_TTL_MS = 15_000;

export class HiddenStaffHierarchyService {
  private readonly cache = new TtlCache<HiddenHierarchy>({ defaultTtlMs: CACHE_TTL_MS });

  invalidate(guildId: GuildId): void {
    this.cache.delete(guildId);
  }

  async excludedFor(guildId: GuildId): Promise<Set<RoleId>> {
    const [offLadder, normalIgnored] = await Promise.all([
      ladderSyncService.excludedRoleIds(guildId),
      roleConfigService.getIgnoredRoleIds(guildId),
    ]);
    for (const roleId of normalIgnored) offLadder.delete(roleId);
    return offLadder;
  }

  async compute(guild: Guild, config?: HiddenConfigView): Promise<HiddenHierarchy> {
    const [view, excluded] = await Promise.all([
      config ? Promise.resolve(config) : hiddenStaffConfigRepository.get(guild.id),
      this.excludedFor(guild.id),
    ]);
    return buildHiddenHierarchy({
      roles: [...(guild.roles?.cache?.values() ?? [])].map((role) => ({
        id: role.id,
        position: role.position,
        managed: role.managed,
        name: role.name,
      })),
      everyoneRoleId: guild.id,
      config: view,
      excludedRoleIds: excluded,
    });
  }

  getHiddenHierarchy(guild: Guild): Promise<HiddenHierarchy> {
    return this.cache.getOrSet(guild.id, () => this.compute(guild));
  }

  async getHiddenStaffRoles(guild: Guild): Promise<HiddenLevel[]> {
    return (await this.getHiddenHierarchy(guild)).levels;
  }

  async getHiddenStaffLevel(guild: Guild, roleId: RoleId): Promise<number | null> {
    return hiddenLevelOfRole(await this.getHiddenHierarchy(guild), roleId);
  }

  async getHighestHiddenStaffLevel(member: GuildMember): Promise<number> {
    return highestHiddenLevel(await this.getHiddenHierarchy(member.guild), member.roles.cache.keys());
  }

  async getHiddenRoleForLevel(guild: Guild, level: number): Promise<HiddenLevel | null> {
    return hiddenRoleForLevel(await this.getHiddenHierarchy(guild), level);
  }

  async getHiddenRolesForLevel(guild: Guild, level: number): Promise<RoleId[]> {
    return hiddenRolesForLevel(await this.getHiddenHierarchy(guild), level);
  }

  async getHiddenMaxLevel(guild: Guild): Promise<number> {
    return hiddenMaxLevel(await this.getHiddenHierarchy(guild));
  }

  async isHiddenStaffRole(guild: Guild, roleId: RoleId): Promise<boolean> {
    return (await this.getHiddenStaffLevel(guild, roleId)) !== null;
  }

  async isHiddenIgnoredRole(guild: Guild, roleId: RoleId): Promise<boolean> {
    return (await this.getHiddenHierarchy(guild)).ignoredRoleIds.has(roleId);
  }
}

export const hiddenStaffHierarchyService = new HiddenStaffHierarchyService();

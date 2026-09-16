import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { GuildId } from "../../../shared/types/index.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType, StaffTier } from "../../configuration/types/enums.ts";
import {
  getHierarchy,
  highestLevelFromRoleIds,
  validateHierarchy,
  type StaffHierarchy,
} from "../../configuration/utils/staff-levels.ts";

export const ManagementAuthority = {
  ADMINISTRATOR: "ADMINISTRATOR",
  OWNER_MANAGER: "OWNER_MANAGER",
  STAFF_MANAGER: "STAFF_MANAGER",
  NONE: "NONE",
} as const;
export type ManagementAuthority =
  (typeof ManagementAuthority)[keyof typeof ManagementAuthority];

export const DenyReason = {
  NOT_A_MANAGER: "NOT_A_MANAGER",
  NOT_A_MANAGER_DEMOTE: "NOT_A_MANAGER_DEMOTE",
  SELF_PROMOTE: "SELF_PROMOTE",
  SELF_DEMOTE: "SELF_DEMOTE",
  SELF_ACCEPT: "SELF_ACCEPT",
  SELF_FIRE: "SELF_FIRE",
  TARGET_ABOVE_ACTOR: "TARGET_ABOVE_ACTOR",
  TARGET_ABOVE_ACTOR_DEMOTE: "TARGET_ABOVE_ACTOR_DEMOTE",
  LEVEL_ABOVE_ACTOR: "LEVEL_ABOVE_ACTOR",
  LEVEL_ABOVE_AUTHORITY: "LEVEL_ABOVE_AUTHORITY",
  TARGET_IN_OWNER: "TARGET_IN_OWNER",
  TARGET_IN_SHIP: "TARGET_IN_SHIP",
  TARGET_IN_SHIP_MANAGE: "TARGET_IN_SHIP_MANAGE",
  LEVEL_IN_SHIP: "LEVEL_IN_SHIP",
  ACCEPT_IN_SHIP: "ACCEPT_IN_SHIP",
  ACTOR_NOT_STAFF: "ACTOR_NOT_STAFF",
  HIERARCHY_INVALID: "HIERARCHY_INVALID",
  BELOW_MIN_LEVEL: "BELOW_MIN_LEVEL",
} as const;
export type DenyReason = (typeof DenyReason)[keyof typeof DenyReason];

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; reason: DenyReason; message: string };

export function denialMessage(reason: DenyReason): string {
  return staffMessages.authorization[reason];
}

const allow = (): AuthorizationDecision => ({ allowed: true });
const deny = (reason: DenyReason): AuthorizationDecision => ({
  allowed: false,
  reason,
  message: denialMessage(reason),
});

export interface ActorAuthority {
  kind: ManagementAuthority;
  /** Calculated Staff level of the actor — never a Discord role position. */
  actorLevel: number | null;
  /** Highest level this actor may ever target. `null` means unlimited. */
  maxTargetLevel: number | null;
  ownerStartLevel: number | null;
  shipStartLevel: number | null;
  endLevel: number | null;
  canTargetSelf: boolean;
}

/**
 * The single decision point for "may this actor do this to that Staff member?".
 *
 * Authority is composed of the configured management role, the actor's
 * calculated Staff level and the configured tier boundaries. Discord role
 * position is never consulted — the Staff Manager role may sit anywhere in the
 * role list without changing what its holder is allowed to do.
 */
export class StaffManagementAuthorizationService {
  isAdministrator(actor: GuildMember): boolean {
    const perms = actor.permissions;
    return typeof perms !== "string" && perms.has(PermissionFlagsBits.Administrator);
  }

  async isOwnerManager(actor: GuildMember): Promise<boolean> {
    const row = await roleConfigService.getByType(
      actor.guild.id,
      RoleConfigType.OWNER_MANAGER,
    );
    return row ? actor.roles.cache.has(row.roleId) : false;
  }

  async isStaffManager(actor: GuildMember): Promise<boolean> {
    const row = await roleConfigService.getByType(
      actor.guild.id,
      RoleConfigType.STAFF_MANAGER,
    );
    return row ? actor.roles.cache.has(row.roleId) : false;
  }

  /**
   * §6 — Administrator > Owner Manager > Staff Manager > none. Resolved from
   * live Discord roles on every call; authorization is never cached.
   */
  async getAuthority(actor: GuildMember, guildId: GuildId = actor.guild.id): Promise<ActorAuthority> {
    const hierarchy = await getHierarchy(guildId);
    const ownerStartLevel = hierarchy.boundaryLevels[StaffTier.OWNER];
    const shipStartLevel = hierarchy.boundaryLevels[StaffTier.SHIP];
    const endLevel = hierarchy.endLevel;

    // A configured Ship tier is the hard ceiling for every non-administrator.
    const belowShip = shipStartLevel !== null ? shipStartLevel - 1 : endLevel;

    if (this.isAdministrator(actor)) {
      return {
        kind: ManagementAuthority.ADMINISTRATOR,
        actorLevel: highestLevelFromRoleIds(hierarchy, actor.roles.cache.keys()),
        maxTargetLevel: null,
        ownerStartLevel,
        shipStartLevel,
        endLevel,
        canTargetSelf: true,
      };
    }

    const actorLevel = highestLevelFromRoleIds(hierarchy, actor.roles.cache.keys());

    if (await this.isOwnerManager(actor)) {
      return {
        kind: ManagementAuthority.OWNER_MANAGER,
        actorLevel,
        maxTargetLevel: belowShip,
        ownerStartLevel,
        shipStartLevel,
        endLevel,
        canTargetSelf: false,
      };
    }

    if (await this.isStaffManager(actor)) {
      // §6 — min(actor level, last level before Ship). A Staff Manager with no
      // numbered role has no promotion authority at all.
      const ceiling =
        actorLevel === null
          ? null
          : belowShip === null
            ? actorLevel
            : Math.min(actorLevel, belowShip);
      return {
        kind: ManagementAuthority.STAFF_MANAGER,
        actorLevel,
        maxTargetLevel: ceiling,
        ownerStartLevel,
        shipStartLevel,
        endLevel,
        canTargetSelf: false,
      };
    }

    return {
      kind: ManagementAuthority.NONE,
      actorLevel,
      maxTargetLevel: null,
      ownerStartLevel,
      shipStartLevel,
      endLevel,
      canTargetSelf: false,
    };
  }

  /** §11 — the highest level this actor may promote or accept someone to. */
  async getPromotionLimit(actor: GuildMember): Promise<number | null> {
    return (await this.getAuthority(actor)).maxTargetLevel;
  }

  private hierarchyGuard(hierarchy: StaffHierarchy): AuthorizationDecision | null {
    // §24 — refuse to authorize against a hierarchy that cannot be trusted.
    return validateHierarchy(hierarchy).length > 0 ? deny(DenyReason.HIERARCHY_INVALID) : null;
  }

  /**
   * Base check shared by demote and fire: may this actor touch a Staff member
   * who is *currently* at `targetLevel`?
   */
  private canTouch(
    authority: ActorAuthority,
    targetLevel: number,
    reasons: {
      inShip: DenyReason;
      inOwner: DenyReason;
      aboveActor: DenyReason;
    },
  ): AuthorizationDecision {
    if (authority.kind === ManagementAuthority.ADMINISTRATOR) return allow();

    if (authority.shipStartLevel !== null && targetLevel >= authority.shipStartLevel) {
      return deny(reasons.inShip);
    }

    if (authority.kind === ManagementAuthority.OWNER_MANAGER) return allow();

    // Staff Manager from here down.
    if (authority.ownerStartLevel !== null && targetLevel >= authority.ownerStartLevel) {
      return deny(reasons.inOwner);
    }
    if (authority.actorLevel === null) return deny(DenyReason.ACTOR_NOT_STAFF);
    if (targetLevel > authority.actorLevel) return deny(reasons.aboveActor);
    return allow();
  }

  /** §12 — validates the *requested* level, not just the current one. */
  async canPromote(
    actor: GuildMember,
    target: GuildMember,
    requestedLevel: number,
    targetCurrentLevel: number,
  ): Promise<AuthorizationDecision> {
    const hierarchy = await getHierarchy(actor.guild.id);
    const invalid = this.hierarchyGuard(hierarchy);
    if (invalid) return invalid;

    const authority = await this.getAuthority(actor);
    if (authority.kind === ManagementAuthority.NONE) return deny(DenyReason.NOT_A_MANAGER);
    if (actor.id === target.id && !authority.canTargetSelf) return deny(DenyReason.SELF_PROMOTE);
    if (authority.kind === ManagementAuthority.ADMINISTRATOR) return allow();

    // §16 — a target already above the actor is untouchable, regardless of
    // where the manager's role physically sits in Discord.
    if (
      authority.kind === ManagementAuthority.STAFF_MANAGER &&
      authority.actorLevel !== null &&
      targetCurrentLevel > authority.actorLevel
    ) {
      return deny(DenyReason.TARGET_ABOVE_ACTOR);
    }
    if (authority.kind === ManagementAuthority.STAFF_MANAGER && authority.actorLevel === null) {
      return deny(DenyReason.ACTOR_NOT_STAFF);
    }

    // §17 — no manager may ever promote into Ship.
    if (authority.shipStartLevel !== null && requestedLevel >= authority.shipStartLevel) {
      return deny(DenyReason.LEVEL_IN_SHIP);
    }
    if (authority.maxTargetLevel !== null && requestedLevel > authority.maxTargetLevel) {
      return deny(
        authority.kind === ManagementAuthority.STAFF_MANAGER
          ? DenyReason.LEVEL_ABOVE_ACTOR
          : DenyReason.LEVEL_ABOVE_AUTHORITY,
      );
    }
    return allow();
  }

  /**
   * §19 — deliberately stricter than promotion: a Staff Manager may not touch
   * anyone already in the Owner tier, even downwards.
   */
  async canDemote(
    actor: GuildMember,
    target: GuildMember,
    requestedLevel: number,
    targetCurrentLevel: number,
  ): Promise<AuthorizationDecision> {
    const hierarchy = await getHierarchy(actor.guild.id);
    const invalid = this.hierarchyGuard(hierarchy);
    if (invalid) return invalid;

    const authority = await this.getAuthority(actor);
    if (authority.kind === ManagementAuthority.NONE) return deny(DenyReason.NOT_A_MANAGER_DEMOTE);
    if (actor.id === target.id && !authority.canTargetSelf) return deny(DenyReason.SELF_DEMOTE);

    if (requestedLevel < 0) return deny(DenyReason.BELOW_MIN_LEVEL);
    if (authority.kind === ManagementAuthority.ADMINISTRATOR) return allow();

    const touch = this.canTouch(authority, targetCurrentLevel, {
      inShip: DenyReason.TARGET_IN_SHIP,
      inOwner: DenyReason.TARGET_IN_OWNER,
      aboveActor: DenyReason.TARGET_ABOVE_ACTOR_DEMOTE,
    });
    if (!touch.allowed) return touch;

    // The resulting level must also sit inside the actor's authority.
    if (authority.maxTargetLevel !== null && requestedLevel > authority.maxTargetLevel) {
      return deny(DenyReason.LEVEL_ABOVE_AUTHORITY);
    }
    return allow();
  }

  /** §20 — accepting is a promotion from outside the ladder. */
  async canAccept(
    actor: GuildMember,
    target: GuildMember,
    requestedLevel: number,
  ): Promise<AuthorizationDecision> {
    const hierarchy = await getHierarchy(actor.guild.id);
    const invalid = this.hierarchyGuard(hierarchy);
    if (invalid) return invalid;

    const authority = await this.getAuthority(actor);
    if (authority.kind === ManagementAuthority.NONE) return deny(DenyReason.NOT_A_MANAGER);
    if (actor.id === target.id && !authority.canTargetSelf) return deny(DenyReason.SELF_ACCEPT);
    if (authority.kind === ManagementAuthority.ADMINISTRATOR) return allow();

    if (authority.shipStartLevel !== null && requestedLevel >= authority.shipStartLevel) {
      return deny(DenyReason.ACCEPT_IN_SHIP);
    }
    if (authority.kind === ManagementAuthority.STAFF_MANAGER && authority.actorLevel === null) {
      return deny(DenyReason.ACTOR_NOT_STAFF);
    }
    if (authority.maxTargetLevel !== null && requestedLevel > authority.maxTargetLevel) {
      return deny(
        authority.kind === ManagementAuthority.STAFF_MANAGER
          ? DenyReason.LEVEL_ABOVE_ACTOR
          : DenyReason.LEVEL_ABOVE_AUTHORITY,
      );
    }
    return allow();
  }

  /** §21 — firing uses the same ceiling as demotion. */
  async canFire(
    actor: GuildMember,
    target: GuildMember,
    targetCurrentLevel: number,
  ): Promise<AuthorizationDecision> {
    const authority = await this.getAuthority(actor);
    if (authority.kind === ManagementAuthority.NONE) return deny(DenyReason.NOT_A_MANAGER);
    if (actor.id === target.id && !authority.canTargetSelf) return deny(DenyReason.SELF_FIRE);

    return this.canTouch(authority, targetCurrentLevel, {
      inShip: DenyReason.TARGET_IN_SHIP_MANAGE,
      inOwner: DenyReason.TARGET_IN_OWNER,
      aboveActor: DenyReason.TARGET_ABOVE_ACTOR,
    });
  }

  /** Generic "may this actor manage this Staff member at all?" (§11). */
  async canManageStaff(
    actor: GuildMember,
    target: GuildMember,
    targetCurrentLevel: number,
  ): Promise<AuthorizationDecision> {
    const authority = await this.getAuthority(actor);
    if (authority.kind === ManagementAuthority.NONE) return deny(DenyReason.NOT_A_MANAGER);
    return this.canTouch(authority, targetCurrentLevel, {
      inShip: DenyReason.TARGET_IN_SHIP_MANAGE,
      inOwner: DenyReason.TARGET_IN_OWNER,
      aboveActor: DenyReason.TARGET_ABOVE_ACTOR,
    });
  }
}

export const staffManagementAuthorizationService = new StaffManagementAuthorizationService();

import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { GuildId } from "../../../shared/types/index.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import { roleConfigService } from "../../configuration/index.ts";
import { RoleConfigType, StaffTier } from "../../configuration/types/enums.ts";
import {
  getHierarchy,
  getTierForLevel,
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
  ACTOR_NOT_STAFF: "ACTOR_NOT_STAFF",
  HIERARCHY_INVALID: "HIERARCHY_INVALID",
  BELOW_MIN_LEVEL: "BELOW_MIN_LEVEL",
  NOT_A_TRANSFER_MANAGER: "NOT_A_TRANSFER_MANAGER",
  TRANSFER_SAME_MEMBER: "TRANSFER_SAME_MEMBER",
  SELF_WARN: "SELF_WARN",
  NOT_A_DEMISSION_MANAGER: "NOT_A_DEMISSION_MANAGER",
  DEMISSION_TARGET_IN_OWNER: "DEMISSION_TARGET_IN_OWNER",
  DEMISSION_TARGET_IN_SHIP: "DEMISSION_TARGET_IN_SHIP",
  DEMISSION_TARGET_BELOW_OWNER: "DEMISSION_TARGET_BELOW_OWNER",
  DEMISSION_TARGET_NOT_STAFF: "DEMISSION_TARGET_NOT_STAFF",
  NOT_A_WARN_MANAGER: "NOT_A_WARN_MANAGER",
  WARN_TARGET_IN_OWNER: "WARN_TARGET_IN_OWNER",
  WARN_TARGET_IN_SHIP: "WARN_TARGET_IN_SHIP",
  WARN_TARGET_BELOW_OWNER: "WARN_TARGET_BELOW_OWNER",
  WARN_TARGET_NOT_STAFF: "WARN_TARGET_NOT_STAFF",
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

export interface DemissionContextInput {
  actorIsAdministrator: boolean;
  actorIsStaffManager: boolean;
  actorIsOwnerManager: boolean;
  /** Calculated Staff level of the applicant — never a Discord role position. */
  targetLevel: number;
  ownerStartLevel: number | null;
  shipStartLevel: number | null;
}

export interface WarnContextInput {
  actorIsAdministrator: boolean;
  actorIsStaffManager: boolean;
  actorIsOwnerManager: boolean;
  isSelf: boolean;
  /** Calculated Staff level of the target — never a Discord role position. */
  targetLevel: number;
  /** First level of the Owner tier, or null when no boundary is configured. */
  ownerStartLevel: number | null;
  shipStartLevel: number | null;
}

export interface ActorAuthority {
  kind: ManagementAuthority;

  actorLevel: number | null;

  maxTargetLevel: number | null;
  ownerStartLevel: number | null;
  shipStartLevel: number | null;
  endLevel: number | null;
  canTargetSelf: boolean;
}

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

  async isApplyManager(actor: GuildMember): Promise<boolean> {
    const row = await roleConfigService.getByType(
      actor.guild.id,
      RoleConfigType.APPLY_MANAGER,
    );
    return row ? actor.roles.cache.has(row.roleId) : false;
  }

  async getAuthority(actor: GuildMember, guildId: GuildId = actor.guild.id): Promise<ActorAuthority> {
    const hierarchy = await getHierarchy(guildId);
    const ownerStartLevel = hierarchy.boundaryLevels[StaffTier.OWNER];
    const shipStartLevel = hierarchy.boundaryLevels[StaffTier.SHIP];
    const endLevel = hierarchy.endLevel;

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

  async getPromotionLimit(actor: GuildMember): Promise<number | null> {
    return (await this.getAuthority(actor)).maxTargetLevel;
  }

  private hierarchyGuard(hierarchy: StaffHierarchy): AuthorizationDecision | null {
    return validateHierarchy(hierarchy).length > 0 ? deny(DenyReason.HIERARCHY_INVALID) : null;
  }

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

    if (authority.ownerStartLevel !== null && targetLevel >= authority.ownerStartLevel) {
      return deny(reasons.inOwner);
    }
    if (authority.actorLevel === null) return deny(DenyReason.ACTOR_NOT_STAFF);
    if (targetLevel > authority.actorLevel) return deny(reasons.aboveActor);
    return allow();
  }

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

    if (authority.maxTargetLevel !== null && requestedLevel > authority.maxTargetLevel) {
      return deny(DenyReason.LEVEL_ABOVE_AUTHORITY);
    }
    return allow();
  }

  async canAccept(
    actor: GuildMember,
    target: GuildMember,
    requestedLevel: number,
  ): Promise<AuthorizationDecision> {
    const hierarchy = await getHierarchy(actor.guild.id);
    const invalid = this.hierarchyGuard(hierarchy);
    if (invalid) return invalid;

    if (this.isAdministrator(actor)) return allow();
    if (!(await this.isApplyManager(actor))) return deny(DenyReason.NOT_A_MANAGER);
    if (actor.id === target.id) return deny(DenyReason.SELF_ACCEPT);

    const actorLevel = highestLevelFromRoleIds(hierarchy, actor.roles.cache.keys());
    if (actorLevel === null) return deny(DenyReason.ACTOR_NOT_STAFF);

    const actorTier = getTierForLevel(hierarchy, actorLevel);
    const actorTierStart = hierarchy.boundaryLevels[actorTier] ?? 0;
    if (requestedLevel >= actorTierStart) return deny(DenyReason.LEVEL_ABOVE_AUTHORITY);

    return allow();
  }

  /**
   * §Demission — who may action a resignation for an applicant at `targetLevel`.
   *
   * Deliberately its own decision rather than `canFire`: `!fire` is an
   * unsolicited dismissal and stays restricted to Administrators and Owner
   * Managers, while a resignation the member asked for is actioned by whoever
   * manages that member's tier. Pure, so the whole matrix is testable.
   */
  decideDemissionAuthorization(input: DemissionContextInput): AuthorizationDecision {
    if (input.actorIsAdministrator) return allow();

    if (!input.actorIsStaffManager && !input.actorIsOwnerManager) {
      return deny(DenyReason.NOT_A_DEMISSION_MANAGER);
    }

    // Ship and above is administrator-only, whatever the actor holds.
    if (input.shipStartLevel !== null && input.targetLevel >= input.shipStartLevel) {
      return deny(DenyReason.DEMISSION_TARGET_IN_SHIP);
    }

    const inOwner =
      input.ownerStartLevel !== null && input.targetLevel >= input.ownerStartLevel;

    if (inOwner) {
      return input.actorIsOwnerManager
        ? allow()
        : deny(DenyReason.DEMISSION_TARGET_IN_OWNER);
    }
    // Below Owner: either manager role may action it.
    return allow();
  }

  /**
   * `canHandleDemission(actor, target)` — the applicant's level is re-read from
   * the hierarchy on every call, so a tier change while the request sits open
   * is picked up rather than trusted from stale request metadata.
   */
  async canHandleDemission(
    actor: GuildMember,
    target: GuildMember,
  ): Promise<AuthorizationDecision> {
    const hierarchy = await getHierarchy(actor.guild.id);
    const invalid = this.hierarchyGuard(hierarchy);
    if (invalid) return invalid;

    const targetLevel = highestLevelFromRoleIds(hierarchy, target.roles.cache.keys());
    if (targetLevel === null) return deny(DenyReason.DEMISSION_TARGET_NOT_STAFF);

    const [isStaffManager, isOwnerManager] = await Promise.all([
      this.isStaffManager(actor),
      this.isOwnerManager(actor),
    ]);

    return this.decideDemissionAuthorization({
      actorIsAdministrator: this.isAdministrator(actor),
      actorIsStaffManager: isStaffManager,
      actorIsOwnerManager: isOwnerManager,
      targetLevel,
      ownerStartLevel: hierarchy.boundaryLevels[StaffTier.OWNER],
      shipStartLevel: hierarchy.boundaryLevels[StaffTier.SHIP],
    });
  }

  async isTransferManager(actor: GuildMember): Promise<boolean> {
    const row = await roleConfigService.getByType(
      actor.guild.id,
      RoleConfigType.TRANSFER_MANAGER,
    );
    return row ? actor.roles.cache.has(row.roleId) : false;
  }

  /**
   * §Warnings — who may warn a Staff member sitting at `targetLevel`.
   *
   * Pure, so the whole matrix is testable without Discord or MongoDB. The two
   * manager roles are independent inputs because holding both genuinely grants
   * both authorities; "Owner Manager cannot warn normal Staff" describes
   * somebody who is *only* an Owner Manager.
   */
  decideWarnAuthorization(input: WarnContextInput): AuthorizationDecision {
    if (input.isSelf) return deny(DenyReason.SELF_WARN);
    if (input.actorIsAdministrator) return allow();

    if (!input.actorIsStaffManager && !input.actorIsOwnerManager) {
      return deny(DenyReason.NOT_A_WARN_MANAGER);
    }

    // Ship is administrator-only, whatever manager roles the actor holds.
    if (input.shipStartLevel !== null && input.targetLevel >= input.shipStartLevel) {
      return deny(DenyReason.WARN_TARGET_IN_SHIP);
    }

    const inOwner =
      input.ownerStartLevel !== null && input.targetLevel >= input.ownerStartLevel;

    if (inOwner) {
      return input.actorIsOwnerManager ? allow() : deny(DenyReason.WARN_TARGET_IN_OWNER);
    }
    return input.actorIsStaffManager ? allow() : deny(DenyReason.WARN_TARGET_BELOW_OWNER);
  }

  /**
   * `canWarn(actor, target)` — the target's level is read from the hierarchy,
   * never from Discord role positions, and no caller can override it.
   */
  async canWarn(actor: GuildMember, target: GuildMember): Promise<AuthorizationDecision> {
    const hierarchy = await getHierarchy(actor.guild.id);
    const invalid = this.hierarchyGuard(hierarchy);
    if (invalid) return invalid;

    const targetLevel = highestLevelFromRoleIds(hierarchy, target.roles.cache.keys());
    if (targetLevel === null) return deny(DenyReason.WARN_TARGET_NOT_STAFF);

    const [isStaffManager, isOwnerManager] = await Promise.all([
      this.isStaffManager(actor),
      this.isOwnerManager(actor),
    ]);

    return this.decideWarnAuthorization({
      actorIsAdministrator: this.isAdministrator(actor),
      actorIsStaffManager: isStaffManager,
      actorIsOwnerManager: isOwnerManager,
      isSelf: actor.id === target.id,
      targetLevel,
      ownerStartLevel: hierarchy.boundaryLevels[StaffTier.OWNER],
      shipStartLevel: hierarchy.boundaryLevels[StaffTier.SHIP],
    });
  }

  async canTransfer(
    actor: GuildMember,
    source: GuildMember,
    target: GuildMember,
  ): Promise<AuthorizationDecision> {
    if (source.id === target.id) return deny(DenyReason.TRANSFER_SAME_MEMBER);
    if (this.isAdministrator(actor)) return allow();
    if (await this.isTransferManager(actor)) return allow();
    return deny(DenyReason.NOT_A_TRANSFER_MANAGER);
  }

  async canFire(
    actor: GuildMember,
    target: GuildMember,
    targetCurrentLevel: number,
  ): Promise<AuthorizationDecision> {
    const authority = await this.getAuthority(actor);
    if (
      authority.kind !== ManagementAuthority.ADMINISTRATOR &&
      authority.kind !== ManagementAuthority.OWNER_MANAGER
    ) {
      return deny(DenyReason.NOT_A_MANAGER);
    }
    if (actor.id === target.id && !authority.canTargetSelf) return deny(DenyReason.SELF_FIRE);
    if (authority.kind === ManagementAuthority.ADMINISTRATOR) return allow();

    if (authority.ownerStartLevel !== null && targetCurrentLevel >= authority.ownerStartLevel) {
      return deny(DenyReason.TARGET_IN_OWNER);
    }
    return allow();
  }

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

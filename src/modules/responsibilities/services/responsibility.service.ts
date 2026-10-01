import type { Guild } from "discord.js";
import type { GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import {
  RESPONSIBILITY_PERMISSIONS,
  responsibilityLimits as L,
} from "../../../data/responsibilities/config.ts";
import { responsibilityMessages } from "../../../data/responsibilities/messages.ts";
import type { RoleConfigType } from "../../configuration/types/enums.ts";
import type { ResponsibilityDocument } from "../models/responsibility.model.ts";
import { responsibilityRepository } from "../repositories/responsibility.repository.ts";
import { ResponsibilityError } from "../shared/responsibility-error.ts";
import { RESPONSIBILITY_CATEGORY_VALUES, ResponsibilityCategory } from "../types/enums.ts";
import { responsibilityPermissionService } from "./responsibility-permission.service.ts";

const C = responsibilityMessages.create;

export interface CreateResponsibilityInput {
  guild: Guild;
  roleId: RoleId | null;
  permission: string | null;
  title: string;
  description: string;
  durationMs: number | null;
  createdBy: UserId;
}

export function isResponsibilityPermission(value: string | null | undefined): value is RoleConfigType {
  return !!value && (RESPONSIBILITY_PERMISSIONS as readonly string[]).includes(value);
}

export class ResponsibilityService {
  validateRole(guild: Guild, roleId: RoleId | null): void {
    if (!roleId) throw new ResponsibilityError("RESP_ROLE_REQUIRED", C.roleRequired);
    if (roleId === guild.id) throw new ResponsibilityError("RESP_ROLE_EVERYONE", C.roleEveryone);
    const role = guild.roles.cache.get(roleId);
    if (!role) throw new ResponsibilityError("RESP_ROLE_REQUIRED", C.roleRequired);
    if (role.managed) throw new ResponsibilityError("RESP_ROLE_MANAGED", C.roleManaged);
    const me = guild.members.me;
    if (!me || me.roles.highest.comparePositionTo(role) <= 0) {
      throw new ResponsibilityError("RESP_ROLE_UNMANAGEABLE", C.roleUnmanageable);
    }
  }

  async createResponsibility(input: CreateResponsibilityInput): Promise<ResponsibilityDocument> {
    const title = input.title.trim().slice(0, L.titleMaxLength);
    const description = input.description.trim().slice(0, L.descriptionMaxLength);
    if (!title || !description) throw new ResponsibilityError("RESP_FIELDS", C.fieldsRequired);
    if (!isResponsibilityPermission(input.permission)) {
      throw new ResponsibilityError("RESP_PERMISSION_INVALID", C.permissionInvalid);
    }
    this.validateRole(input.guild, input.roleId);
    const roleId = input.roleId!;
    if (input.durationMs !== null && (input.durationMs <= 0 || input.durationMs > L.maxDurationMs)) {
      throw new ResponsibilityError("RESP_DURATION", C.durationInvalid);
    }

    const byRole = await responsibilityRepository.byRole(input.guild.id, roleId);
    if (byRole) throw new ResponsibilityError("RESP_ROLE_TAKEN", C.roleTaken(byRole.title));
    const byTitle = await responsibilityRepository.byTitle(input.guild.id, title);
    if (byTitle) throw new ResponsibilityError("RESP_TITLE_TAKEN", C.titleTaken(title));

    try {
      return await responsibilityRepository.insert({
        guildId: input.guild.id,
        roleId,
        permission: input.permission,
        title,
        description,
        category: ResponsibilityCategory.OTHER,
        isTemporary: input.durationMs !== null,
        defaultDuration: input.durationMs,
        disabled: false,
        createdBy: input.createdBy,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) throw new ResponsibilityError("RESP_TITLE_TAKEN", C.titleTaken(title));
      throw err;
    }
  }

  getResponsibility(guildId: GuildId, responsibilityId: string): Promise<ResponsibilityDocument | null> {
    return responsibilityRepository.byId(guildId, responsibilityId);
  }

  getResponsibilities(guildId: GuildId): Promise<ResponsibilityDocument[]> {
    return responsibilityRepository.listEnabled(guildId);
  }

  async updateResponsibility(
    guildId: GuildId,
    responsibilityId: string,
    changes: { category?: string; title?: string; description?: string },
  ): Promise<ResponsibilityDocument> {
    const set: Record<string, unknown> = {};
    if (changes.category !== undefined) {
      if (!(RESPONSIBILITY_CATEGORY_VALUES as readonly string[]).includes(changes.category)) {
        throw new ResponsibilityError("RESP_NOT_FOUND", responsibilityMessages.errors.notFound);
      }
      set.category = changes.category;
    }
    if (changes.title !== undefined) set.title = changes.title.trim().slice(0, L.titleMaxLength);
    if (changes.description !== undefined) {
      set.description = changes.description.trim().slice(0, L.descriptionMaxLength);
    }
    const updated = await responsibilityRepository.updateOne(
      { guildId, responsibilityId, disabled: false },
      { $set: set },
    );
    if (!updated) throw new ResponsibilityError("RESP_NOT_FOUND", responsibilityMessages.errors.notFound);
    responsibilityPermissionService.invalidate(guildId);
    return updated;
  }

  async disableResponsibility(guildId: GuildId, responsibilityId: string): Promise<ResponsibilityDocument> {
    const updated = await responsibilityRepository.updateOne(
      { guildId, responsibilityId, disabled: false },
      { $set: { disabled: true } },
    );
    if (!updated) throw new ResponsibilityError("RESP_NOT_FOUND", responsibilityMessages.errors.notFound);
    responsibilityPermissionService.invalidate(guildId);
    return updated;
  }
}

export const responsibilityService = new ResponsibilityService();

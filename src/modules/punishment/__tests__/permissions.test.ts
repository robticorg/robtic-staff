import { describe, expect, it } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import { requiredBotPermission } from "../services/punishment-permissions.ts";
import { PunishmentType } from "../types/enums.ts";

describe("requiredBotPermission", () => {
  it("maps each executable type to the Discord permission the bot needs", () => {
    expect(requiredBotPermission(PunishmentType.TIMEOUT)).toBe(PermissionFlagsBits.ModerateMembers);
    expect(requiredBotPermission(PunishmentType.MUTE)).toBe(PermissionFlagsBits.ManageRoles);
    expect(requiredBotPermission(PunishmentType.JAIL)).toBe(PermissionFlagsBits.ManageRoles);
    expect(requiredBotPermission(PunishmentType.KICK)).toBe(PermissionFlagsBits.KickMembers);
    expect(requiredBotPermission(PunishmentType.BAN)).toBe(PermissionFlagsBits.BanMembers);
  });

  it("needs no special permission for WARN / NO_ACTION", () => {
    expect(requiredBotPermission(PunishmentType.WARN)).toBeNull();
    expect(requiredBotPermission(PunishmentType.NO_ACTION)).toBeNull();
  });
});

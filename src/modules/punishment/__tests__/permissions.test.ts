import { describe, expect, it } from "bun:test";
import { PermissionFlagsBits } from "discord.js";
import {
  decideApprovalAuthorization,
  isSelfApproval,
  requiredBotPermission,
} from "../services/punishment-permissions.ts";
import { PunishmentType } from "../types/enums.ts";

describe("decideApprovalAuthorization", () => {
  it("BAN can only be decided by an Administrator", () => {
    expect(
      decideApprovalAuthorization({ type: "BAN", isAdministrator: true, hasChatManagerRole: false }),
    ).toBe(true);
    expect(
      decideApprovalAuthorization({ type: "BAN", isAdministrator: false, hasChatManagerRole: true }),
    ).toBe(false);
  });

  it("KICK can be decided by an Administrator or a Chat Manager", () => {
    expect(
      decideApprovalAuthorization({ type: "KICK", isAdministrator: false, hasChatManagerRole: true }),
    ).toBe(true);
    expect(
      decideApprovalAuthorization({ type: "KICK", isAdministrator: true, hasChatManagerRole: false }),
    ).toBe(true);
    expect(
      decideApprovalAuthorization({
        type: "KICK",
        isAdministrator: false,
        hasChatManagerRole: false,
      }),
    ).toBe(false);
  });
});

describe("isSelfApproval", () => {
  it("blocks the requester from deciding their own request", () => {
    expect(isSelfApproval({ requestedBy: "u1", deciderId: "u1" })).toBe(true);
    expect(isSelfApproval({ requestedBy: "u1", deciderId: "u2" })).toBe(false);
  });
});

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

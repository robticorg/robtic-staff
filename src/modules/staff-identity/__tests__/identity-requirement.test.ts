import { describe, expect, it } from "bun:test";
import {
  IdentityComplianceReason,
  StaffIdentityRequirementService,
} from "../services/staff-identity-requirement.service.ts";

const service = new StaffIdentityRequirementService();
const GUILD = "robtic-guild";

const found = (name: string | null | undefined) => service.containsOfficialIdentifier(name);

describe("display name identifiers", () => {
  it.each([
    ["RobTic Name", "robtic"],
    ["robtic Name", "robtic"],
    ["Name RobTic", "robtic"],
    ["Name Robtic", "robtic"],
    ["NameRobTic", "robtic"],
    ["NameRC", "rc"],
    ["Name Rc", "rc"],
    ["RTC Name", "rtc"],
    ["RTCName", "rtc"],
    ["RCName", "rc"],
    ["RcName", "rc"],
    ["Name,RobTic", "robtic"],
  ])("recognises %p", (name, identifier) => {
    expect(found(name)).toBe(identifier);
  });

  it.each([
    "『RobTic』 Name",
    "Name | RobTic",
    "「RobTic」Name",
    "RobTic丨Name",
    "⚡ RobTic ⚡",
    "محمد | RobTic",
    "Rob​Tic Name",
  ])("sees through decorations in %p", (name) => {
    expect(found(name)).toBe("robtic");
  });

  it("sees through decorations around a short identifier", () => {
    expect(found("Name • RC")).toBe("rc");
    expect(found("[RTC] Name")).toBe("rtc");
    expect(found("🇷🇨 Name")).toBe("rc");
  });

  it.each([
    "ʳᵒᵇᵗᶤᶜ",
    "𝓇𝑜𝒷𝓉𝒾𝒸",
    "𝕣𝕠𝕓𝕥𝕚𝕔",
    "𝗿𝗼𝗯𝘁𝗶𝗰",
    "𝙧𝙤𝙗𝙩𝙞𝙘",
    "Ｒｏｂｔｉｃ",
    "ⓡⓞⓑⓣⓘⓒ",
    "🅁🄾🄱🅃🄸🄲",
    "🅡🅞🅑🅣🅘🅒",
    "⒭⒪⒝⒯⒤⒞",
    "ʀᴏʙᴛɪᴄ",
    "𝐑𝐨𝐛𝐓𝐢𝐜",
    "Rоbtіс", // Cyrillic о, і, с
    "Róbtíc",
  ])("folds the styled form %p back to robtic", (name) => {
    expect(found(`${name} Name`)).toBe("robtic");
  });

  it("folds styled short identifiers too", () => {
    expect(found("𝐑𝐂 Name")).toBe("rc");
    expect(found("Name ʀᴛᴄ")).toBe("rtc");
  });

  it.each([
    "Marc",
    "ARC",
    "Arcade",
    "Circle",
    "Force Name",
    "namerc",
    "rtcname",
    "Orca",
    "ARCTIC",
    "Carter",
    "Mercy",
    "Robert Tice",
    "Rob Tic",
    "R C",
    "Rcola",
    "RCA",
    "",
  ])("does not treat %p as carrying an identifier", (name) => {
    expect(found(name)).toBeNull();
  });

  it("ignores a missing display name", () => {
    expect(found(null)).toBeNull();
    expect(found(undefined)).toBeNull();
  });
});

describe("identity compliance", () => {
  const member = (displayName: string | undefined, tagged: boolean) => ({
    guild: { id: GUILD },
    user: {
      primaryGuild: tagged ? { identityEnabled: true, identityGuildId: GUILD, tag: "RTC" } : null,
    },
    displayName,
  });

  it("is compliant through the official Server Tag first", () => {
    expect(service.isIdentityCompliant(member("RobTic Name", true))).toEqual({
      compliant: true,
      reason: IdentityComplianceReason.SERVER_TAG,
    });
  });

  it("is compliant through the display name without the tag", () => {
    expect(service.isIdentityCompliant(member("Name | RTC", false))).toEqual({
      compliant: true,
      reason: IdentityComplianceReason.DISPLAY_NAME,
      identifier: "rtc",
    });
  });

  it("is not compliant with neither", () => {
    expect(service.isIdentityCompliant(member("Marc", false))).toEqual({
      compliant: false,
      reason: IdentityComplianceReason.NONE,
    });
    expect(service.getComplianceReason(member(undefined, false))).toBe(
      IdentityComplianceReason.NONE,
    );
  });

  it("does not accept another guild's tag or a disabled identity", () => {
    const other = {
      guild: { id: GUILD },
      user: { primaryGuild: { identityEnabled: true, identityGuildId: "other", tag: "RTC" } },
      displayName: "Name",
    };
    const disabled = {
      guild: { id: GUILD },
      user: { primaryGuild: { identityEnabled: false, identityGuildId: GUILD, tag: "RTC" } },
      displayName: "Name",
    };
    expect(service.isIdentityCompliant(other).compliant).toBe(false);
    expect(service.isIdentityCompliant(disabled).compliant).toBe(false);
  });

  it("never reads the visible tag text", () => {
    const textOnly = {
      guild: { id: GUILD },
      user: { primaryGuild: { identityEnabled: false, identityGuildId: null, tag: "RobTic" } },
      displayName: "Name",
    };
    expect(service.hasServerTag(textOnly)).toBe(false);
  });
});

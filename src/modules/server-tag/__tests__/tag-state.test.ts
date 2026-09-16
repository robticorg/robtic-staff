import { describe, expect, it } from "bun:test";
import {
  affectedGuildIds,
  isUsingGuildTag,
  serverTagService,
} from "../services/server-tag.service.ts";
import {
  StaffTagRestrictionStatus,
  TagTransition,
  assertRestrictionTransition,
  canRestrictionTransition,
} from "../types/enums.ts";

const OURS = "guild-ours";
const THEIRS = "guild-theirs";

const using = (guildId: string, tag = "ROBT") => ({
  primaryGuild: { identityEnabled: true, identityGuildId: guildId, tag },
});
const notUsing = (guildId: string, tag = "ROBT") => ({
  primaryGuild: { identityEnabled: false, identityGuildId: guildId, tag },
});
const noIdentity = () => ({ primaryGuild: null });
const unknown = () => ({});

describe("isUsingGuildTag", () => {
  it("is true only when identity is enabled AND points at this guild", () => {
    expect(isUsingGuildTag(using(OURS), OURS)).toBe(true);
  });

  it("is false when the identity is disabled even though the guild matches", () => {
    expect(isUsingGuildTag(notUsing(OURS), OURS)).toBe(false);
  });

  it("is false for another server's tag", () => {
    expect(isUsingGuildTag(using(THEIRS), OURS)).toBe(false);
  });

  it("ignores the visible tag string — tags are not globally unique", () => {
    // Same 4-character tag, different server: must NOT count as ours.
    expect(isUsingGuildTag(using(THEIRS, "ROBT"), OURS)).toBe(false);
    // Different visible tag but our guild id: still ours.
    expect(isUsingGuildTag(using(OURS, "ZZZZ"), OURS)).toBe(true);
  });

  it("is false for null/absent primaryGuild", () => {
    expect(isUsingGuildTag(noIdentity(), OURS)).toBe(false);
    expect(isUsingGuildTag(unknown(), OURS)).toBe(false);
    expect(isUsingGuildTag(null, OURS)).toBe(false);
  });
});

describe("detectTagState", () => {
  const detect = (o: unknown, n: unknown) =>
    serverTagService.detectTagState(o as never, n as never, OURS);

  it("reports ENABLED when the tag is switched on", () => {
    expect(detect(noIdentity(), using(OURS))).toBe(TagTransition.ENABLED);
    expect(detect(notUsing(OURS), using(OURS))).toBe(TagTransition.ENABLED);
  });

  it("reports DISABLED when the tag is switched off", () => {
    expect(detect(using(OURS), notUsing(OURS))).toBe(TagTransition.DISABLED);
    expect(detect(using(OURS), noIdentity())).toBe(TagTransition.DISABLED);
  });

  it("reports UNCHANGED for unrelated profile updates", () => {
    // §4 — an avatar or username change must not re-trigger role writes.
    expect(detect(using(OURS), using(OURS))).toBe(TagTransition.UNCHANGED);
    expect(detect(noIdentity(), noIdentity())).toBe(TagTransition.UNCHANGED);
    expect(detect(notUsing(OURS), notUsing(OURS))).toBe(TagTransition.UNCHANGED);
  });

  it("reports UNCHANGED when another server's tag changes", () => {
    expect(detect(using(THEIRS), noIdentity())).toBe(TagTransition.UNCHANGED);
    expect(detect(noIdentity(), using(THEIRS))).toBe(TagTransition.UNCHANGED);
  });

  it("treats a switch away from our tag to another server's as DISABLED", () => {
    expect(detect(using(OURS), using(THEIRS))).toBe(TagTransition.DISABLED);
  });

  it("treats a switch from another server's tag to ours as ENABLED", () => {
    expect(detect(using(THEIRS), using(OURS))).toBe(TagTransition.ENABLED);
  });

  it("never infers the destructive edge from an unknown previous state", () => {
    // A partial/uncached old user must not cost a staff member their roles.
    expect(detect(unknown(), noIdentity())).toBe(TagTransition.UNCHANGED);
    expect(detect(null, noIdentity())).toBe(TagTransition.UNCHANGED);
    // The additive edge is safe, so it is still allowed.
    expect(detect(unknown(), using(OURS))).toBe(TagTransition.ENABLED);
    expect(detect(null, using(OURS))).toBe(TagTransition.ENABLED);
  });
});

describe("affectedGuildIds", () => {
  it("returns both sides when the identity moves between servers", () => {
    expect([...affectedGuildIds(using(OURS), using(THEIRS))].sort()).toEqual(
      [OURS, THEIRS].sort(),
    );
  });

  it("returns a single guild when only one side has an identity", () => {
    expect([...affectedGuildIds(noIdentity(), using(OURS))]).toEqual([OURS]);
    expect([...affectedGuildIds(using(OURS), noIdentity())]).toEqual([OURS]);
  });

  it("returns nothing when neither side has an identity", () => {
    expect([...affectedGuildIds(noIdentity(), noIdentity())]).toEqual([]);
  });
});

describe("restriction status transitions", () => {
  const { ACTIVE, RESTORED, EXPIRED, CANCELLED } = StaffTagRestrictionStatus;

  it("allows ACTIVE to reach every terminal state", () => {
    expect(canRestrictionTransition(ACTIVE, RESTORED)).toBe(true);
    expect(canRestrictionTransition(ACTIVE, EXPIRED)).toBe(true);
    expect(canRestrictionTransition(ACTIVE, CANCELLED)).toBe(true);
  });

  it("treats terminal states as final", () => {
    expect(canRestrictionTransition(RESTORED, ACTIVE)).toBe(false);
    expect(canRestrictionTransition(EXPIRED, RESTORED)).toBe(false);
    expect(canRestrictionTransition(CANCELLED, ACTIVE)).toBe(false);
    expect(() => assertRestrictionTransition(RESTORED, EXPIRED)).toThrow();
  });

  it("treats a no-op transition as legal so retries stay idempotent", () => {
    expect(canRestrictionTransition(RESTORED, RESTORED)).toBe(true);
  });
});

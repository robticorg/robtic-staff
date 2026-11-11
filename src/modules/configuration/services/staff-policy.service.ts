import { IANAZone } from "luxon";
import { config } from "../../../config/index.ts";
import { appData } from "../../../data/config/index.ts";
import { ACCEPTED_IDENTIFIERS, IdentifierStrictness } from "../../../data/staff-identity/config.ts";
import { staffApplicationConfig, staffRecruitmentRules, staffTransferRules, type CountBonus } from "../../../data/staff-application/config.ts";
import { serverTagConfig } from "../../../data/server-tag/config.ts";
import { vacationConfig } from "../../../data/vacation/config.ts";
import { CACHE_ENABLED, CONFIG_CACHE_TTL_MS, TtlCache } from "../../../libs/cache/index.ts";
import type { GuildId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { StaffPolicyModel, STAFF_FEATURE_KEYS, type StaffFeatureKey, type StaffPolicyDoc } from "../models/staff-policy.model.ts";
import { StaffTier } from "../types/enums.ts";

const log = logger.child("staff-policy");
const DAY_MS = 86_400_000;

export interface StaffIdentifierRule {
  text: string;
  strictness: IdentifierStrictness;
}

/** A server's rules, every field filled in. */
export interface StaffPolicy {
  features: Record<StaffFeatureKey, boolean>;
  timezone: string;
  identity: {
    acceptServerTag: boolean;
    identifiers: StaffIdentifierRule[];
    graceDays: number;
    resetPointsOnRemoval: boolean;
  };
  applications: {
    minimumAge: number;
    maximumAge: number;
    evidenceMinFiles: number;
    evidenceMaxFiles: number;
    recruiterMinimumTier: StaffTier;
    transfer: {
      minimumSourceMemberCount: number;
      targetTier: StaffTier;
      memberCountBonus: CountBonus[];
      onlineCountBonus: CountBonus[];
      membershipBonus: CountBonus[];
    };
  };
  vacations: { maxDays: number; absentGraceDays: number };
  prefix: string;
  fastAccessPrefix: string;
  modmail: { casePrefix: string };
}

/** What the bot did before rules were per server, so a server that never touched the dashboard sees no change. */
export const STAFF_POLICY_DEFAULTS: StaffPolicy = {
  features: Object.fromEntries(STAFF_FEATURE_KEYS.map((k) => [k, true])) as Record<StaffFeatureKey, boolean>,
  timezone: config.timezone,
  identity: {
    acceptServerTag: true,
    identifiers: ACCEPTED_IDENTIFIERS.map((i) => ({ text: i.id, strictness: i.strictness })),
    graceDays: Math.round(serverTagConfig.restrictionDurationMs / DAY_MS),
    resetPointsOnRemoval: true,
  },
  applications: {
    minimumAge: staffApplicationConfig.minimumAge,
    maximumAge: staffApplicationConfig.maximumAge,
    evidenceMinFiles: staffApplicationConfig.evidence.minFiles,
    evidenceMaxFiles: staffApplicationConfig.evidence.maxFiles,
    recruiterMinimumTier: staffRecruitmentRules.recruiterMinimumTier,
    transfer: {
      minimumSourceMemberCount: staffTransferRules.minimumSourceMemberCount,
      targetTier: staffTransferRules.targetTier,
      memberCountBonus: [...staffTransferRules.memberCountBonus],
      onlineCountBonus: [...staffTransferRules.onlineCountBonus],
      membershipBonus: [...staffTransferRules.membershipBonus],
    },
  },
  vacations: { maxDays: 180, absentGraceDays: Math.round(vacationConfig.absentGraceMs / DAY_MS) },
  prefix: config.prefix,
  fastAccessPrefix: config.fastAccessPrefix,
  modmail: { casePrefix: process.env.MODMAIL_CASE_PREFIX ?? appData.caseIdPrefix },
};

/* ------------------------------------------------------------------ reading a stored document safely */

const TIERS = new Set<string>(Object.values(StaffTier));
const int = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const tier = (v: unknown, fallback: StaffTier) => (typeof v === "string" && TIERS.has(v) ? (v as StaffTier) : fallback);
const bands = (v: unknown, fallback: CountBonus[]): CountBonus[] =>
  Array.isArray(v)
    ? v
        .filter((b): b is CountBonus => !!b && Number.isInteger(b.min) && b.min >= 0 && Number.isInteger(b.levels) && b.levels >= 0)
        .map((b) => ({ min: b.min, levels: b.levels }))
    : fallback;
const IDENTIFIER = /^[\p{L}\p{N}]{1,20}$/u;
const PREFIX = /^\S{1,5}$/;
const CASE_PREFIX = /^[A-Za-z0-9_-]{0,10}$/;

/** A server's two prefixes; they must differ (a message can't be both a command and a macro), else the defaults. */
function prefixes(prefix: unknown, fast: unknown): { prefix: string; fastAccessPrefix: string } {
  const d = STAFF_POLICY_DEFAULTS;
  const p = typeof prefix === "string" && PREFIX.test(prefix) ? prefix : d.prefix;
  const f = typeof fast === "string" && PREFIX.test(fast) ? fast : d.fastAccessPrefix;
  return p === f ? { prefix: d.prefix, fastAccessPrefix: d.fastAccessPrefix } : { prefix: p, fastAccessPrefix: f };
}

/** A stored document (any age, any gaps, any junk) → a complete policy. Bad values fall back to the default. */
export function resolveStaffPolicy(doc: Partial<StaffPolicyDoc> | null | undefined): StaffPolicy {
  const d = STAFF_POLICY_DEFAULTS;
  if (!doc) return d;
  const f = doc.features ?? {};
  const id = doc.identity ?? {};
  const ap = doc.applications ?? {};
  const tr = ap.transfer ?? {};
  const va = doc.vacations ?? {};

  const identifiers = Array.isArray(id.identifiers)
    ? id.identifiers
        .filter((i) => i && typeof i.text === "string" && IDENTIFIER.test(i.text))
        .map((i) => ({
          text: i.text.toLowerCase(),
          strictness: i.strictness === IdentifierStrictness.LONG ? IdentifierStrictness.LONG : IdentifierStrictness.SHORT,
        }))
    : d.identity.identifiers;

  const minimumAge = int(ap.minimumAge, 13, 120, d.applications.minimumAge);
  const evidenceMinFiles = int(ap.evidenceMinFiles, 0, 10, d.applications.evidenceMinFiles);

  return {
    features: Object.fromEntries(STAFF_FEATURE_KEYS.map((k) => [k, bool(f[k], d.features[k])])) as Record<StaffFeatureKey, boolean>,
    timezone: typeof doc.timezone === "string" && IANAZone.isValidZone(doc.timezone) ? doc.timezone : d.timezone,
    identity: {
      acceptServerTag: bool(id.acceptServerTag, d.identity.acceptServerTag),
      identifiers,
      graceDays: int(id.graceDays, 1, 30, d.identity.graceDays),
      resetPointsOnRemoval: bool(id.resetPointsOnRemoval, d.identity.resetPointsOnRemoval),
    },
    applications: {
      minimumAge,
      maximumAge: Math.max(minimumAge, int(ap.maximumAge, 13, 120, d.applications.maximumAge)),
      evidenceMinFiles,
      evidenceMaxFiles: Math.max(evidenceMinFiles, 1, int(ap.evidenceMaxFiles, 1, 10, d.applications.evidenceMaxFiles)),
      recruiterMinimumTier: tier(ap.recruiterMinimumTier, d.applications.recruiterMinimumTier),
      transfer: {
        minimumSourceMemberCount: int(tr.minimumSourceMemberCount, 0, 10_000_000, d.applications.transfer.minimumSourceMemberCount),
        targetTier: tier(tr.targetTier, d.applications.transfer.targetTier),
        memberCountBonus: bands(tr.memberCountBonus, d.applications.transfer.memberCountBonus),
        onlineCountBonus: bands(tr.onlineCountBonus, d.applications.transfer.onlineCountBonus),
        membershipBonus: bands(tr.membershipBonus, d.applications.transfer.membershipBonus),
      },
    },
    vacations: {
      maxDays: int(va.maxDays, 1, 365, d.vacations.maxDays),
      absentGraceDays: int(va.absentGraceDays, 1, 90, d.vacations.absentGraceDays),
    },
    ...prefixes(doc.prefix, doc.fastAccessPrefix),
    modmail: { casePrefix: typeof doc.modmail?.casePrefix === "string" && CASE_PREFIX.test(doc.modmail.casePrefix) ? doc.modmail.casePrefix : d.modmail.casePrefix },
  };
}

/* ------------------------------------------------------------------ the service */

const cache = new TtlCache<StaffPolicy>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });

export class StaffPolicyService {
  /** Last policy seen per server, for code that can't wait (rendering, sync checks). Kept fresh by start(). */
  private readonly latest = new Map<GuildId, StaffPolicy>();
  private timer: ReturnType<typeof setInterval> | null = null;

  async get(guildId: GuildId): Promise<StaffPolicy> {
    const load = async () => {
      const doc = await StaffPolicyModel.findOne({ guildId }).lean().exec();
      return resolveStaffPolicy(doc);
    };
    const policy = CACHE_ENABLED ? await cache.getOrSet(guildId, load) : await load();
    this.latest.set(guildId, policy);
    return policy;
  }

  /**
   * The policy without waiting: the last one loaded, or the defaults if this server hasn't been seen yet (and a
   * load starts in the background). Everything is preloaded at start-up, so this is the real policy in practice.
   */
  peek(guildId: GuildId | null | undefined): StaffPolicy {
    if (!guildId) return STAFF_POLICY_DEFAULTS;
    const known = this.latest.get(guildId);
    if (known) return known;
    void this.get(guildId).catch((err) => log.warn(`policy load failed for ${guildId}`, err));
    return STAFF_POLICY_DEFAULTS;
  }

  async isOn(guildId: GuildId, feature: StaffFeatureKey): Promise<boolean> {
    return (await this.get(guildId)).features[feature];
  }

  /** Loads every server's policy now and again each cache period, so peek() and dashboard edits stay current. */
  start(): void {
    if (this.timer) return;
    const reload = async () => {
      try {
        const docs = await StaffPolicyModel.find({}).lean().exec();
        for (const doc of docs) {
          const policy = resolveStaffPolicy(doc);
          cache.set(doc.guildId, policy);
          this.latest.set(doc.guildId, policy);
        }
      } catch (err) {
        log.warn("could not preload staff policies", err);
      }
    };
    void reload();
    this.timer = setInterval(() => void reload(), CONFIG_CACHE_TTL_MS);
    this.timer.unref?.();
  }

  invalidate(guildId: GuildId): void {
    cache.delete(guildId);
    this.latest.delete(guildId);
  }
}

export const staffPolicyService = new StaffPolicyService();

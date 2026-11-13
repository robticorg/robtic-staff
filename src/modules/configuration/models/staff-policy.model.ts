import mongoose, { Schema, type Model } from "mongoose";
import type { HydratedDocument } from "mongoose";
import type { GuildId } from "../../../shared/types/index.ts";

/**
 * The per-server rules that used to be one hardcoded set for every server (data/staff-identity, data/staff-application,
 * data/vacation, the STAFF_TIMEZONE env). Written by the Robtic Discord dashboard. Every part is optional: whatever a
 * server hasn't set reads as the default in STAFF_POLICY_DEFAULTS (staff-policy.service.ts), which is exactly what the
 * bot did before this collection existed.
 */
export interface StaffPolicyDoc {
  guildId: GuildId;
  /** Which systems run in this server. A system that's off ignores its buttons, panels and DMs here. */
  features?: Partial<Record<StaffFeatureKey, boolean>>;
  /** IANA time zone for daily / weekly points and stats. */
  timezone?: string;
  /** The language the bot answers in here (dashboard → General → Language). Unset: Arabic. */
  language?: "en" | "ar";
  identity?: Partial<{
    acceptServerTag: boolean;
    identifiers: { text: string; strictness: "LONG" | "SHORT" }[];
    graceDays: number;
    resetPointsOnRemoval: boolean;
  }>;
  applications?: Partial<{
    minimumAge: number;
    maximumAge: number;
    evidenceMinFiles: number;
    evidenceMaxFiles: number;
    recruiterMinimumTier: string;
    transfer: Partial<{
      minimumSourceMemberCount: number;
      targetTier: string;
      memberCountBonus: { min: number; levels: number }[];
      onlineCountBonus: { min: number; levels: number }[];
      membershipBonus: { min: number; levels: number }[];
    }>;
  }>;
  vacations?: Partial<{ maxDays: number; absentGraceDays: number }>;
  /** Text commands start with this here (was the PREFIX env). */
  prefix?: string;
  /** Fast Access macros start with this here (was the FAST_ACCESS_PREFIX env). */
  fastAccessPrefix?: string;
  modmail?: Partial<{ casePrefix: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export const STAFF_FEATURE_KEYS = [
  "reports",
  "punishments",
  "appeals",
  "giftClaims",
  "vacations",
  "applications",
  "identityCheck",
] as const;
export type StaffFeatureKey = (typeof STAFF_FEATURE_KEYS)[number];

export type StaffPolicyDocument = HydratedDocument<StaffPolicyDoc>;

// Sub-documents are Mixed: the service validates and fills defaults on read, so a partial or older document is
// always safe, and the dashboard can add a field without a migration here.
const staffPolicySchema = new Schema<StaffPolicyDoc>(
  {
    guildId: { type: String, required: true },
    features: { type: Schema.Types.Mixed, default: undefined },
    timezone: { type: String },
    language: { type: String, enum: ["en", "ar"] },
    identity: { type: Schema.Types.Mixed, default: undefined },
    applications: { type: Schema.Types.Mixed, default: undefined },
    vacations: { type: Schema.Types.Mixed, default: undefined },
    prefix: { type: String },
    fastAccessPrefix: { type: String },
    modmail: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true, collection: "staff_policies", minimize: false },
);

staffPolicySchema.index({ guildId: 1 }, { unique: true });

export const StaffPolicyModel: Model<StaffPolicyDoc> =
  (mongoose.models.StaffPolicy as Model<StaffPolicyDoc> | undefined) ??
  mongoose.model<StaffPolicyDoc>("StaffPolicy", staffPolicySchema);

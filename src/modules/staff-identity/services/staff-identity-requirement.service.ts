import type { GuildId } from "../../../shared/types/index.ts";
import {
  ACCEPTED_IDENTIFIERS,
  IdentifierStrictness,
  type AcceptedIdentifier,
} from "../../../data/staff-identity/config.ts";
import {
  CONFUSABLE_LETTERS,
  ENCLOSED_LETTER_RANGES,
} from "../../../data/staff-identity/confusables.ts";

export interface PrimaryGuildLike {
  identityEnabled?: boolean | null;
  identityGuildId?: string | null;
  tag?: string | null;
}

export interface TagUserLike {
  primaryGuild?: PrimaryGuildLike | null;
}

export function isUsingGuildTag(user: TagUserLike | null | undefined, guildId: GuildId): boolean {
  const pg = user?.primaryGuild;
  if (!pg) return false;
  return pg.identityEnabled === true && pg.identityGuildId === guildId;
}

export interface IdentityMemberLike {
  guild: { id: GuildId };
  user: TagUserLike;
  displayName?: string | null;
}

export const IdentityComplianceReason = {
  SERVER_TAG: "SERVER_TAG",
  DISPLAY_NAME: "DISPLAY_NAME",
  NONE: "NONE",
} as const;
export type IdentityComplianceReason =
  (typeof IdentityComplianceReason)[keyof typeof IdentityComplianceReason];

export type IdentityCompliance =
  | { compliant: true; reason: typeof IdentityComplianceReason.SERVER_TAG }
  | { compliant: true; reason: typeof IdentityComplianceReason.DISPLAY_NAME; identifier: string }
  | { compliant: false; reason: typeof IdentityComplianceReason.NONE };

const FORMAT_CHARS = /\p{Cf}/gu;
const COMBINING_MARKS = /\p{M}/gu;
const NOT_ALPHANUMERIC = /[^A-Za-z0-9]+/g;

function caseSegments(token: string): string[] {
  return token.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|[0-9]+/g) ?? [];
}

function foldEnclosedLetter(codePoint: number): string | null {
  for (const range of ENCLOSED_LETTER_RANGES) {
    if (codePoint >= range.from && codePoint <= range.to) {
      return String.fromCharCode(range.base.charCodeAt(0) + (codePoint - range.from));
    }
  }
  return null;
}

export class StaffIdentityRequirementService {
  constructor(private readonly identifiers: readonly AcceptedIdentifier[] = ACCEPTED_IDENTIFIERS) {}

  normalizeUnicode(value: string): string {
    let folded = "";
    for (const char of value) {
      folded += foldEnclosedLetter(char.codePointAt(0) ?? 0) ?? char;
    }
    return folded
      .normalize("NFKC")
      .replace(FORMAT_CHARS, "")
      .normalize("NFD")
      .replace(COMBINING_MARKS, "")
      .normalize("NFC");
  }

  normalizeConfusables(value: string): string {
    let out = "";
    for (const char of value) out += CONFUSABLE_LETTERS[char] ?? char;
    return out;
  }

  normalizeDecorations(value: string): string {
    return value.replace(NOT_ALPHANUMERIC, " ").trim();
  }

  normalizeDisplayName(displayName: string): string {
    return this.normalizeDecorations(
      this.normalizeConfusables(this.normalizeUnicode(displayName)),
    );
  }

  containsOfficialIdentifier(displayName: string | null | undefined): string | null {
    if (!displayName) return null;
    const words = this.normalizeDisplayName(displayName).split(" ").filter(Boolean);

    for (const word of words) {
      const lower = word.toLowerCase();
      const segments = caseSegments(word).map((s) => s.toLowerCase());

      for (const identifier of this.identifiers) {
        if (lower === identifier.id) return identifier.id;
        if (identifier.strictness === IdentifierStrictness.LONG && lower.includes(identifier.id)) {
          return identifier.id;
        }
        if (segments.includes(identifier.id)) return identifier.id;
      }
    }
    return null;
  }

  hasServerTag(member: Pick<IdentityMemberLike, "guild" | "user">): boolean {
    return isUsingGuildTag(member.user, member.guild.id);
  }

  isIdentityCompliant(member: IdentityMemberLike): IdentityCompliance {
    if (this.hasServerTag(member)) {
      return { compliant: true, reason: IdentityComplianceReason.SERVER_TAG };
    }
    const identifier = this.containsOfficialIdentifier(member.displayName);
    if (identifier) {
      return { compliant: true, reason: IdentityComplianceReason.DISPLAY_NAME, identifier };
    }
    return { compliant: false, reason: IdentityComplianceReason.NONE };
  }

  getComplianceReason(member: IdentityMemberLike): IdentityComplianceReason {
    return this.isIdentityCompliant(member).reason;
  }
}

export const staffIdentityRequirementService = new StaffIdentityRequirementService();

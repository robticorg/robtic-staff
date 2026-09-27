import type { GuildId } from "../../../shared/types/index.ts";
import { DomainError } from "../../../shared/utils/errors.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
import { STAFF_TIER_KEYWORD_DEFINITIONS } from "../../../data/staff-tiers/index.ts";
import { staffTypeLabel } from "../../../data/staff-types/index.ts";
import type { StaffTier } from "../../configuration/types/enums.ts";
import { getLevelForTier, getMaxLevel } from "../../configuration/utils/staff-levels.ts";
import type { StaffType } from "../types/enums.ts";
import { AcceptArgProblem, parseAcceptArguments } from "./staff-accept-args.ts";
import { staffTypeService } from "./staff-type.service.ts";

const M = prefixMessages.staff;

export interface AcceptRequest {
  level: number | null;
  max: boolean;
  tier: StaffTier | null;
  staffType: StaffType | null;
}

export interface ResolvedAcceptRequest {
  level: number | null;
  tier: StaffTier | null;
  staffType: StaffType | null;
}

export class AcceptRequestError extends DomainError {
  constructor(message: string) {
    super("ACCEPT_REQUEST", message);
  }
}

export function acceptRequestFromArgs(
  args: readonly string[],
  targetId: string,
): AcceptRequest {
  const parsed = parseAcceptArguments(args, targetId);
  switch (parsed.problem) {
    case AcceptArgProblem.UNKNOWN_TOKEN: {
      const available = [
        ...staffTypeService.getAvailableKeywords(),
        ...STAFF_TIER_KEYWORD_DEFINITIONS.map((d) => d.slug),
      ].join(", ");
      throw new AcceptRequestError(M.unknownStaffType(parsed.token ?? "", available));
    }
    case AcceptArgProblem.DUPLICATE_LEVEL:
      throw new AcceptRequestError(M.duplicateStaffLevel);
    case AcceptArgProblem.DUPLICATE_TYPE:
      throw new AcceptRequestError(M.duplicateStaffType);
    case AcceptArgProblem.DUPLICATE_TIER:
      throw new AcceptRequestError(M.duplicateStaffTier);
    case AcceptArgProblem.LEVEL_AND_TIER:
      throw new AcceptRequestError(M.levelAndTier);
  }
  return {
    level: parsed.level,
    max: parsed.max,
    tier: parsed.tier,
    staffType: parsed.staffType,
  };
}

export function isEmptyAcceptRequest(request: AcceptRequest): boolean {
  return (
    request.level === null && !request.max && request.tier === null && request.staffType === null
  );
}

export async function resolveAcceptRequest(
  guildId: GuildId,
  request: AcceptRequest,
): Promise<ResolvedAcceptRequest> {
  let level = request.level;

  if (request.max) {
    const maxLevel = await getMaxLevel(guildId);
    if (maxLevel === null) throw new AcceptRequestError(M.rolesNotConfigured);
    level = maxLevel;
  }

  if (request.tier) {
    const tierLevel = await getLevelForTier(guildId, request.tier);
    if (tierLevel === null) {
      const slug =
        STAFF_TIER_KEYWORD_DEFINITIONS.find((d) => d.tier === request.tier)?.slug ??
        request.tier.toLowerCase();
      throw new AcceptRequestError(M.tierNotConfigured(STAFF_TIER_LABELS[request.tier], slug));
    }
    level = tierLevel;
  }

  if (request.staffType) {
    const roleId = await staffTypeService.getConfiguredRole(guildId, request.staffType);
    if (!roleId) {
      const definition = staffTypeService.definition(request.staffType);
      throw new AcceptRequestError(
        M.staffTypeRoleMissing(
          staffTypeLabel(request.staffType),
          definition?.slug ?? request.staffType.toLowerCase(),
        ),
      );
    }
  }

  return { level, tier: request.tier, staffType: request.staffType };
}

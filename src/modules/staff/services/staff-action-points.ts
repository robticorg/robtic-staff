import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { logger } from "../../../shared/utils/logger.ts";
import { DEFAULT_POINT_VALUES } from "../config/points.ts";
import type { StaffPointTransactionType } from "../types/enums.ts";
import { staffPointService } from "./staff-point.service.ts";
import { staffService } from "./staff.service.ts";

const log = logger.child("staff:action-points");

/**
 * Gives the staff member who did something the points it's worth (see
 * config/points.ts). `referenceId` makes it once per thing — jailing the same
 * punishment or accepting the same person twice never pays twice. Someone with
 * no staff record (e.g. an admin who isn't staff) gets nothing. Never throws:
 * the action already happened, a points hiccup must not undo or fail it.
 */
export async function awardActionPoints(input: {
  guildId: GuildId;
  userId: UserId;
  type: StaffPointTransactionType;
  referenceId: string;
  reason: string;
}): Promise<boolean> {
  try {
    const amount = DEFAULT_POINT_VALUES[input.type];
    if (!amount) return false;
    const staff = await staffService.get(input.userId, input.guildId);
    if (!staff) return false;
    const result = await staffPointService.add({
      staffId: staff._id,
      amount,
      type: input.type,
      referenceId: input.referenceId,
      reason: input.reason,
    });
    return !result.duplicate;
  } catch (err) {
    log.warn(`${input.type} points for ${input.userId} not awarded`, err);
    return false;
  }
}

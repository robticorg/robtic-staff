import { colors } from "../config/colors.ts";
import { AppealStatus } from "../../modules/appeals/types/enums.ts";

export const appealConfig = {
  maxEvidence: 10,
  maxReasonLength: 2000,
  reviewAccentColor: {
    [AppealStatus.PENDING]: colors.warning,
    [AppealStatus.CLAIMED]: colors.info,
    [AppealStatus.UNDER_REVIEW]: colors.info,
    [AppealStatus.ACCEPTED]: colors.success,
    [AppealStatus.REJECTED]: colors.error,
    [AppealStatus.CANCELLED]: colors.neutral,
  } as Record<AppealStatus, number>,
} as const;

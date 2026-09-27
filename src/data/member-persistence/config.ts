import { RoleConfigType } from "../../modules/configuration/types/enums.ts";

export const PERSISTENT_ROLE_TYPES: readonly RoleConfigType[] = [
  RoleConfigType.TICKET_BLACKLIST,
  RoleConfigType.BLACKLIST,
  RoleConfigType.GIFT_BLACKLIST,
];

import { ladderSyncService } from "../../configuration/services/ladder-sync.service.ts";
import { hiddenStaffHierarchyService } from "./services/hidden-staff-hierarchy.service.ts";

let registered = false;

export function registerHiddenStaff(): void {
  if (registered) return;
  registered = true;
  ladderSyncService.addExclusionSource(async (guild) =>
    (await hiddenStaffHierarchyService.compute(guild)).levels.map((rung) => rung.roleId),
  );
}

export { HiddenStaffModel, type HiddenStaff, type HiddenStaffDocument } from "./models/hidden-staff.model.ts";
export { HiddenStaffConfigModel, type HiddenStaffConfig } from "./models/hidden-staff-config.model.ts";
export { hiddenStaffRepository } from "./repositories/hidden-staff.repository.ts";
export { hiddenStaffConfigRepository } from "./repositories/hidden-staff-config.repository.ts";
export { hiddenStaffHierarchyService } from "./services/hidden-staff-hierarchy.service.ts";
export { hiddenStaffAuthorizationService } from "./services/hidden-staff-authorization.service.ts";
export { hiddenStaffVisibilityService } from "./services/hidden-staff-visibility.service.ts";
export { hiddenStaffLevelSyncService } from "./services/hidden-staff-level-sync.service.ts";
export { hiddenStaffConfigService } from "./services/hidden-staff-config.service.ts";
export { HiddenStaffError, hiddenStaffService } from "./services/hidden-staff.service.ts";

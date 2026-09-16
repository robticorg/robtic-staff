import v8 from "node:v8";

const snapshot = (v8 as { startupSnapshot?: { isBuildingSnapshot?: () => boolean } })
  .startupSnapshot;

if (snapshot) {
  try {
    snapshot.isBuildingSnapshot?.();
  } catch {
    snapshot.isBuildingSnapshot = () => false;
  }
}

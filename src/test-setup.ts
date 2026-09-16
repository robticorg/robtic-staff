/**
 * Test-only environment shim.
 *
 * bson >= 7 probes `v8.startupSnapshot.isBuildingSnapshot()` at module load.
 * Bun exposes the property but throws ERR_NOT_IMPLEMENTED when it is called,
 * so *every* file that transitively imports mongoose dies on import before a
 * single test runs. Stubbing it to `false` (we are never inside a V8 snapshot
 * build) restores the suite; nothing else in the codebase touches node:v8.
 */
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

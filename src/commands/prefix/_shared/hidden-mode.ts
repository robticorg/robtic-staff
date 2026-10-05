import { isHiddenModeKeyword } from "../../../data/hidden-staff/config.ts";

export function splitHiddenMode(args: readonly string[]): { hidden: boolean; args: string[] } {
  const rest = args.filter((arg) => !isHiddenModeKeyword(arg));
  return { hidden: rest.length !== args.length, args: rest };
}

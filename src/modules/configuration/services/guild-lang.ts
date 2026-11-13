import { DEFAULT_LANG, runWithLang, type Lang } from "../../../shared/utils/lang-context.ts";
import { staffPolicyService } from "./staff-policy.service.ts";

/** A server's language (dashboard → General → Language, cached by the policy service); the default if unknown. */
export async function langOf(guildId: string | null | undefined): Promise<Lang> {
  if (!guildId) return DEFAULT_LANG;
  return (await staffPolicyService.get(guildId).catch(() => null))?.language ?? DEFAULT_LANG;
}

/**
 * Runs `fn` in a server's language. Events get theirs in discord/client.ts; this is for the timers and sweeps that act
 * on a server outside any event (expiring vacations, jails, tags, responsibilities, ticket auto-close…).
 */
export async function inGuildLang<T>(guildId: string, fn: () => T | Promise<T>): Promise<T> {
  return runWithLang(await langOf(guildId), fn, guildId);
}

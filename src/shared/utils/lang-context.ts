import { AsyncLocalStorage } from "node:async_hooks";

/**
 * The language of whatever the bot is handling right now: the language of the server the event, command or button
 * came from (dashboard → General → Language). It's set once where events enter the bot (discord/client.ts) and
 * follows every await from there, so text anywhere below picks the right language without being handed it.
 *
 * Outside any server (a DM, a timer not tied to one) it's the default. Same idea as robtic-system's lang-context.
 */

export type Lang = "en" | "ar";

/** What a server that never picked a language gets: the bot was Arabic-only before the choice existed. */
export const DEFAULT_LANG: Lang = "ar";

const store = new AsyncLocalStorage<{ lang: Lang; guildId: string | null }>();

/** The language outside any server: the default, unless a script or test changed it (enterLang). */
let fallback: Lang = DEFAULT_LANG;

export const currentLang = (): Lang => store.getStore()?.lang ?? fallback;

/** The server whatever the bot is handling came from, when it came from one. */
export const currentGuildId = (): string | null => store.getStore()?.guildId ?? null;

/** Runs `fn` with `lang` as the current language (and `guildId` as the current server, when there is one). */
export const runWithLang = <T>(lang: Lang, fn: () => T, guildId: string | null = null): T => store.run({ lang, guildId }, fn);

/** Sets the language outside any server for the rest of the run (scripts and tests). Never used by the bot. */
export const enterLang = (lang: Lang): void => { fallback = lang; };

/** One piece of text in both languages: the current one is returned. */
export const L = (en: string, ar: string): string => (currentLang() === "ar" ? ar : en);

/**
 * A message list in both languages, used exactly like the plain object it replaces (`MSG.staff.accepted(...)`): every
 * read returns the current language's entry. Both sides must have the same keys, which the type enforces.
 *
 * Deep: a nested group read once and kept (`const M = prefixMessages.staff` at the top of a file) is a live view too,
 * so each message is still picked in the language of the moment it's read.
 */
export function bilingual<T extends object>(en: T, ar: NoInfer<T>): T {
  pairStrings(en, ar);
  const views = new Map<string, object>();
  const at = (root: object, path: readonly PropertyKey[]) => path.reduce<unknown>((o, k) => (o as Record<PropertyKey, unknown> | undefined)?.[k], root) as object;
  const view = (path: readonly PropertyKey[]): object => {
    const id = path.map(String).join("\u0000");
    const hit = views.get(id);
    if (hit) return hit;
    const pick = () => at(currentLang() === "ar" ? ar : en, path) ?? at(en, path);
    const proxy = new Proxy(at(en, path), {
      get: (_target, key) => {
        const value = Reflect.get(pick(), key);
        return value && typeof value === "object" && !Array.isArray(value) ? view([...path, key]) : value;
      },
      has: (_target, key) => key in pick(),
      ownKeys: () => Reflect.ownKeys(pick()),
      getOwnPropertyDescriptor: (_target, key) => {
        const d = Reflect.getOwnPropertyDescriptor(pick(), key);
        return d ? { ...d, configurable: true } : undefined;
      },
    });
    views.set(id, proxy);
    return proxy;
  };
  return view([]) as T;
}

/**
 * Every fixed Arabic string next to its English one, from all the bilingual lists. Slash commands are built when the
 * bot loads (so in the default language, Arabic); registration uses this to send English as the base text with the
 * Arabic as Discord's `ar` localization (discord/register-commands.ts).
 */
export const arabicToEnglish = new Map<string, string>();

function pairStrings(en: unknown, ar: unknown): void {
  if (typeof en === "string" && typeof ar === "string") {
    if (en !== ar) arabicToEnglish.set(ar, en);
    return;
  }
  if (!en || !ar || typeof en !== "object" || typeof ar !== "object") return;
  for (const key of Object.keys(en)) pairStrings((en as Record<string, unknown>)[key], (ar as Record<string, unknown>)[key]);
}

/** The server an event is about, from its arguments: an interaction, message, member, channel, role, guild… */
export function guildIdOf(args: readonly unknown[]): string | null {
  for (const arg of args) {
    if (!arg || typeof arg !== "object") continue;
    const a = arg as { guildId?: unknown; guild?: { id?: unknown }; id?: unknown; members?: unknown; channels?: unknown };
    if (typeof a.guildId === "string") return a.guildId;
    if (a.guild && typeof a.guild.id === "string") return a.guild.id;
    // A Guild itself (guildCreate): it has members and channels managers.
    if (a.members && a.channels && typeof a.id === "string") return a.id;
  }
  return null;
}

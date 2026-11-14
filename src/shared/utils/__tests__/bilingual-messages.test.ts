import { describe, expect, test } from "bun:test";
import { runWithLang } from "../lang-context.ts";
import { prefixMessages } from "../../../data/messages/prefix.ts";
import { serverTagMessages } from "../../../data/server-tag/messages.ts";

// The messages from the screenshot that started this: short, and in the server's language.
const ARABIC = /[\u0600-\u06FF]/;

describe("staff messages follow the server language", () => {
  test("accept, English", () => {
    const text = runWithLang("en", () => prefixMessages.staff.accepted("<@1>", 25));
    expect(text).toContain("<@1> accepted at level **25**");
    expect(ARABIC.test(text)).toBe(false);
  });
  test("accept, Arabic", () => {
    expect(runWithLang("ar", () => prefixMessages.staff.accepted("<@1>", 25))).toContain("تم قبول <@1>");
  });
  test("waiting for the tag is one short line in each language", () => {
    const en = runWithLang("en", () => serverTagMessages.notice.awaitingIdentity("1", true));
    const ar = runWithLang("ar", () => serverTagMessages.notice.awaitingIdentity("1", true));
    expect(en).toContain("They'll get their roles after wearing the tag or adding the identifier.");
    expect(ARABIC.test(en)).toBe(false);
    expect(ar).toContain("الشعار أو يحط المعرّف");
    expect(en.length).toBeLessThan(140);
    expect(ar.length).toBeLessThan(140);
  });
});

import { describe, expect, test } from "bun:test";
import { bilingual, L, runWithLang } from "../lang-context.ts";

const M = bilingual(
  { staff: { accepted: (u: string) => `${u} accepted`, title: "Staff" }, list: ["a"] as string[] },
  { staff: { accepted: (u: string) => `تم قبول ${u}`, title: "الطاقم" }, list: ["ا"] },
);
// Read once at the top of a file, the way commands keep `const M = prefixMessages.staff`.
const staff = M.staff;

describe("lang-context", () => {
  test("L picks the current language", () => {
    expect(runWithLang("en", () => L("Hi", "هلا"))).toBe("Hi");
    expect(runWithLang("ar", () => L("Hi", "هلا"))).toBe("هلا");
  });
  test("a nested group kept at load time still follows the language", () => {
    expect(runWithLang("en", () => staff.accepted("@a"))).toBe("@a accepted");
    expect(runWithLang("ar", () => staff.accepted("@a"))).toBe("تم قبول @a");
    expect(runWithLang("en", () => staff.title)).toBe("Staff");
  });
  test("arrays come from the current language", () => {
    expect(runWithLang("ar", () => M.list[0])).toBe("ا");
  });
  test("the language follows awaits", async () => {
    expect(await runWithLang("en", async () => { await Bun.sleep(1); return staff.title; })).toBe("Staff");
  });
  test("keys and spreading work", () => {
    expect(Object.keys(staff).sort()).toEqual(["accepted", "title"]);
    expect(runWithLang("ar", () => ({ ...staff }).title)).toBe("الطاقم");
  });
});

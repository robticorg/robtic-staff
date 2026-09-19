import { describe, expect, it } from "bun:test";
import { DomainError } from "../../../shared/utils/errors.ts";
import { resolveUnwarnMode } from "../staff/unwarn.ts";

const ID = "507f1f77bcf86cd799439011";
const tokens = (input: string) => input.split(/\s+/).filter(Boolean);

describe("!unwarn — the argument picks the target, not the channel", () => {
  it("`staff` lifts the staff warning from any channel", () => {
    for (const keyword of ["staff", "STAFF", "ستاف", "الستاف"]) {
      expect(resolveUnwarnMode(tokens(keyword), null)).toMatchObject({ kind: "STAFF" });
    }
  });

  it("a warning id removes that exact warning, user or staff", () => {
    expect(resolveUnwarnMode(tokens(ID), null)).toEqual({
      kind: "ID",
      warningId: ID,
      reason: undefined,
    });
  });

  it("keeps the rest of the line as the reason", () => {
    expect(resolveUnwarnMode(tokens(`${ID} غلط مني`), null)).toMatchObject({
      kind: "ID",
      warningId: ID,
      reason: "غلط مني",
    });
    expect(resolveUnwarnMode(tokens("staff غلط مني"), null)).toMatchObject({
      kind: "STAFF",
      reason: "غلط مني",
    });
  });

  it("an id beats the channel it was typed in", () => {
    expect(resolveUnwarnMode(tokens(ID), "STAFF")).toMatchObject({ kind: "ID" });
    expect(resolveUnwarnMode(tokens(ID), "USER")).toMatchObject({ kind: "ID" });
  });
});

describe("!unwarn — falling back to the channel", () => {
  it("a bare call in the staff room still lifts the staff warning", () => {
    expect(resolveUnwarnMode([], "STAFF")).toMatchObject({ kind: "STAFF" });
  });

  it("a bare call in the staff room keeps the whole line as the reason", () => {
    expect(resolveUnwarnMode(tokens("غلط مني"), "STAFF")).toMatchObject({
      kind: "STAFF",
      reason: "غلط مني",
    });
  });

  it("a bare call in the user room asks for an id", () => {
    expect(() => resolveUnwarnMode([], "USER")).toThrow(DomainError);
  });

  it("a bare call anywhere else shows the usage", () => {
    expect(() => resolveUnwarnMode([], null)).toThrow(DomainError);
  });

  it("junk that is neither `staff` nor an id is not treated as an id", () => {
    expect(() => resolveUnwarnMode(tokens("not-an-id"), null)).toThrow(DomainError);
  });

  it("a 12-character reason word is not mistaken for an id", () => {
    // Types.ObjectId.isValid() accepts any 12-char string; the id check must not.
    expect(resolveUnwarnMode(tokens("abcdefghijkl"), "STAFF")).toMatchObject({
      kind: "STAFF",
      reason: "abcdefghijkl",
    });
    expect(() => resolveUnwarnMode(tokens("abcdefghijkl"), "USER")).toThrow(DomainError);
  });

  it("only accepts a full 24-character hex id", () => {
    expect(() => resolveUnwarnMode(tokens(ID.slice(0, 23)), null)).toThrow(DomainError);
    expect(() => resolveUnwarnMode(tokens(`${ID}0`), null)).toThrow(DomainError);
    expect(() => resolveUnwarnMode(tokens(ID.replace("0", "z")), null)).toThrow(DomainError);
  });
});

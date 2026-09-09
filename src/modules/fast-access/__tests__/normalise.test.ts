import { describe, expect, it } from "bun:test";
import {
  normaliseFastAccessCommand,
  tryNormaliseFastAccessCommand,
} from "../../configuration/services/fast-access.service.ts";
import { ValidationError } from "../../../shared/utils/errors.ts";

describe("Fast Access command normalisation", () => {
  it("`rules`, `RULES`, `$rules`, ` Rules ` all collapse to `rules`", () => {
    for (const input of ["rules", "RULES", "$rules", " Rules ", "$RULES "]) {
      expect(tryNormaliseFastAccessCommand(input)).toBe("rules");
      expect(normaliseFastAccessCommand(input)).toBe("rules");
    }
  });

  it("allows a-z 0-9 - _ up to 32 chars", () => {
    expect(tryNormaliseFastAccessCommand("faq-2_final")).toBe("faq-2_final");
    expect(tryNormaliseFastAccessCommand("x".repeat(32))).toBe("x".repeat(32));
  });

  it("rejects spaces, symbols and over-long names", () => {
    expect(tryNormaliseFastAccessCommand("two words")).toBeNull();
    expect(tryNormaliseFastAccessCommand("bad!")).toBeNull();
    expect(tryNormaliseFastAccessCommand("")).toBeNull();
    expect(tryNormaliseFastAccessCommand("x".repeat(33))).toBeNull();
    expect(() => normaliseFastAccessCommand("bad!")).toThrow(ValidationError);
  });
});

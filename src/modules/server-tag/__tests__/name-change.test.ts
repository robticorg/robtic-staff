import { describe, expect, it } from "bun:test";
import { userNameChanged } from "../handlers/server-tag.handler.ts";

describe("userNameChanged", () => {
  it("notices a global display name or username change", () => {
    expect(userNameChanged({ globalName: "A", username: "a" }, { globalName: "B", username: "a" })).toBe(true);
    expect(userNameChanged({ globalName: null, username: "a" }, { globalName: "RobTic A", username: "a" })).toBe(true);
    expect(userNameChanged({ globalName: "A", username: "a" }, { globalName: "A", username: "b" })).toBe(true);
  });

  it("ignores updates that leave the name alone (avatar, tag, …)", () => {
    expect(userNameChanged({ globalName: "A", username: "a" }, { globalName: "A", username: "a" })).toBe(false);
  });

  it("cannot tell without the previous user", () => {
    expect(userNameChanged(null, { globalName: "A", username: "a" })).toBe(false);
  });
});

import { describe, expect, it } from "bun:test";
import { parseTicketRef } from "../ticket/info.ts";

describe("!ticket <number>", () => {
  it("reads the number in every common form", () => {
    for (const written of ["12", "#12", "ticket-12", "TICKET-12", "012"]) {
      expect(parseTicketRef(written)).toEqual({ ticketId: "ticket-12" });
    }
  });

  it("reads a ticket channel mention", () => {
    expect(parseTicketRef("<#123456789012345678>")).toEqual({ channelId: "123456789012345678" });
  });

  it("gives nothing for no argument or something that isn't a ticket number", () => {
    expect(parseTicketRef(undefined)).toBeNull();
    expect(parseTicketRef("")).toBeNull();
    expect(parseTicketRef("abc")).toBeNull();
    expect(parseTicketRef("ticket-")).toBeNull();
  });
});

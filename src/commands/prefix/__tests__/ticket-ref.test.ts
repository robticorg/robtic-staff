import { describe, expect, it } from "bun:test";
import { parseTicketRef } from "../ticket/info.ts";

describe("!ticket <number>", () => {
  it("reads the number in every common form", () => {
    for (const written of ["12", "#12", "ticket-12", "TICKET-12", "012"]) {
      expect(parseTicketRef(written)).toEqual({ ticketId: "ticket-12" });
    }
  });

  it("reads a ticket channel mention, a raw channel id or a channel link", () => {
    for (const written of [
      "<#123456789012345678>",
      "123456789012345678",
      "https://discord.com/channels/987654321098765432/123456789012345678",
    ]) {
      expect(parseTicketRef(written)).toEqual({ channelId: "123456789012345678" });
    }
  });

  it("gives nothing for no argument or something that isn't a ticket number", () => {
    expect(parseTicketRef(undefined)).toBeNull();
    expect(parseTicketRef("")).toBeNull();
    expect(parseTicketRef("abc")).toBeNull();
    expect(parseTicketRef("ticket-")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  formatTicketId,
  parseEmailAddress,
  parseTicketRef,
  stripTicketRef,
  ticketSubjectWithRef,
} from "@/lib/tickets";

describe("tickets helpers", () => {
  it("formats ticket ids", () => {
    expect(formatTicketId(101)).toBe("T-101");
    expect(formatTicketId(1)).toBe("T-1");
  });

  it("parses ticket refs from subjects", () => {
    expect(parseTicketRef("Re: [T-101] Problem z serwerem")).toBe(101);
    expect(parseTicketRef("[t-42] test")).toBe(42);
    expect(parseTicketRef("Bez numeru")).toBeNull();
    expect(parseTicketRef("[T-0] zero")).toBeNull();
  });

  it("strips reply prefixes and ticket refs", () => {
    expect(stripTicketRef("Re: [T-101] Problem z serwerem")).toBe(
      "Problem z serwerem",
    );
    expect(stripTicketRef("FW: [T-7] Awaria")).toBe("Awaria");
  });

  it("builds reply subjects with ticket refs", () => {
    expect(ticketSubjectWithRef(101, "Problem z serwerem")).toBe(
      "Re: [T-101] Problem z serwerem",
    );
    expect(ticketSubjectWithRef(7, "Re: [T-7] Awaria")).toBe(
      "Re: [T-7] Awaria",
    );
  });

  it("parses email addresses with optional display names", () => {
    expect(parseEmailAddress("Jan Kowalski <jan@firma.pl>")).toEqual({
      email: "jan@firma.pl",
      name: "Jan Kowalski",
    });
    expect(parseEmailAddress("IT@PWGINFO.PL")).toEqual({
      email: "it@pwginfo.pl",
      name: null,
    });
  });
});

import { describe, expect, it } from "vitest";

import { ticketStatusLabel } from "@/lib/ticket-status";

describe("ticketStatusLabel", () => {
  it("returns Polish labels", () => {
    expect(ticketStatusLabel("OPEN")).toBe("Otwarte");
    expect(ticketStatusLabel("IN_PROGRESS")).toBe("W trakcie");
    expect(ticketStatusLabel("RESOLVED")).toBe("Rozwiązane");
    expect(ticketStatusLabel("CLOSED")).toBe("Zamknięte");
    expect(ticketStatusLabel("ON_HOLD")).toBe("Na później");
  });
});

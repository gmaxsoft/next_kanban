import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ticketMessageFindUnique,
  ticketFindUnique,
  ticketCreate,
  ticketUpdate,
  ticketUpdateMany,
  transaction,
  teamFindMany,
} = vi.hoisted(() => ({
  ticketMessageFindUnique: vi.fn(),
  ticketFindUnique: vi.fn(),
  ticketCreate: vi.fn(),
  ticketUpdate: vi.fn(),
  ticketUpdateMany: vi.fn(),
  transaction: vi.fn(),
  teamFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticketMessage: {
      findUnique: ticketMessageFindUnique,
      create: vi.fn(),
    },
    ticket: {
      findUnique: ticketFindUnique,
      create: ticketCreate,
      update: ticketUpdate,
      updateMany: ticketUpdateMany,
    },
    team: {
      findMany: teamFindMany,
    },
    $transaction: transaction,
  },
}));

import {
  normalizeInboundPayload,
  processIncomingEmail,
} from "@/lib/inbound-email";

describe("processIncomingEmail (integration)", () => {
  beforeEach(() => {
    ticketMessageFindUnique.mockReset();
    ticketFindUnique.mockReset();
    ticketCreate.mockReset();
    ticketUpdate.mockReset();
    ticketUpdateMany.mockReset();
    transaction.mockReset();
    teamFindMany.mockReset();
    teamFindMany.mockResolvedValue([]);
  });

  it("creates a new ticket for a fresh message", async () => {
    ticketMessageFindUnique.mockResolvedValue(null);
    ticketCreate.mockResolvedValue({ id: "ticket-1", number: 101 });

    const result = await processIncomingEmail({
      fromEmail: "klient@example.com",
      fromName: "Klient",
      toAddresses: ["it@pwginfo.pl"],
      subject: "Problem z serwerem",
      text: "Serwer nie odpowiada",
      html: null,
      messageId: "<msg-1@example.com>",
    });

    expect(result).toEqual({
      ticketId: "ticket-1",
      created: true,
      duplicate: false,
    });
    expect(ticketCreate).toHaveBeenCalledOnce();
    expect(ticketCreate.mock.calls[0]?.[0]?.data?.subject).toBe(
      "Problem z serwerem",
    );
  });

  it("returns duplicate when Message-ID already exists", async () => {
    ticketMessageFindUnique.mockResolvedValue({
      id: "m1",
      ticketId: "ticket-existing",
    });

    const result = await processIncomingEmail({
      fromEmail: "klient@example.com",
      fromName: null,
      toAddresses: ["it@pwginfo.pl"],
      subject: "Problem",
      text: "treść",
      html: null,
      messageId: "<dup@example.com>",
    });

    expect(result).toEqual({
      ticketId: "ticket-existing",
      created: false,
      duplicate: true,
    });
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it("appends to an existing ticket when subject contains [T-n]", async () => {
    ticketMessageFindUnique.mockResolvedValue(null);
    ticketFindUnique.mockResolvedValue({ id: "ticket-101", status: "OPEN" });
    transaction.mockResolvedValue([{}, {}]);

    const result = await processIncomingEmail({
      fromEmail: "klient@example.com",
      fromName: null,
      toAddresses: ["it@pwginfo.pl"],
      subject: "Re: [T-101] Problem z serwerem",
      text: "Dodatkowe info",
      html: null,
      messageId: "<msg-2@example.com>",
    });

    expect(result).toEqual({
      ticketId: "ticket-101",
      created: false,
      duplicate: false,
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it("uses preferredTeamId when provided (IMAP path)", async () => {
    ticketMessageFindUnique.mockResolvedValue(null);
    ticketCreate.mockResolvedValue({ id: "ticket-2", number: 102 });

    await processIncomingEmail(
      {
        fromEmail: "klient@example.com",
        fromName: null,
        toAddresses: [],
        subject: "Awaria VPN",
        text: "Brak dostępu",
        html: null,
        messageId: "<msg-3@example.com>",
      },
      { preferredTeamId: "team-imap-1" },
    );

    expect(ticketCreate.mock.calls[0]?.[0]?.data?.teamId).toBe("team-imap-1");
  });
});

describe("normalizeInboundPayload (integration)", () => {
  it("normalizes flat JSON payloads", async () => {
    const email = await normalizeInboundPayload({
      from: "Jan Kowalski <jan@firma.pl>",
      to: ["it@pwginfo.pl"],
      subject: "Test",
      text: "Treść",
      messageId: "<id@example.com>",
    });

    expect(email).toMatchObject({
      fromEmail: "jan@firma.pl",
      fromName: "Jan Kowalski",
      subject: "Test",
      text: "Treść",
      messageId: "<id@example.com>",
    });
    expect(email?.toAddresses).toContain("it@pwginfo.pl");
  });

  it("returns null for unsupported payloads", async () => {
    expect(await normalizeInboundPayload(null)).toBeNull();
    expect(await normalizeInboundPayload({ foo: "bar" })).toBeNull();
  });
});

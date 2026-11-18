import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ticketMessageFindUnique,
  ticketFindUnique,
  ticketCreate,
  ticketUpdate,
  ticketUpdateMany,
  ticketMessageCreate,
  transaction,
  teamFindMany,
  userFindMany,
} = vi.hoisted(() => ({
  ticketMessageFindUnique: vi.fn(),
  ticketFindUnique: vi.fn(),
  ticketCreate: vi.fn(),
  ticketUpdate: vi.fn(),
  ticketUpdateMany: vi.fn(),
  ticketMessageCreate: vi.fn(),
  transaction: vi.fn(),
  teamFindMany: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticketMessage: {
      findUnique: ticketMessageFindUnique,
      create: ticketMessageCreate,
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
    user: {
      findMany: userFindMany,
    },
    $transaction: transaction,
  },
}));

vi.mock("@/lib/auto-provision-user", () => ({
  maybeAutoProvisionUserFromInbound: vi.fn().mockResolvedValue({
    provisioned: false,
    reason: "domain",
  }),
}));

vi.mock("@/lib/mail", () => ({
  sendTicketAcknowledgementEmail: vi.fn().mockResolvedValue(undefined),
  ticketUrl: (id: string) => `/tickets/${id}`,
}));

vi.mock("@/lib/ticket-notifications", () => ({
  notifyTicketParticipants: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ticket-attachments.server", () => ({
  storeTicketAttachments: vi.fn().mockResolvedValue(undefined),
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
    ticketMessageCreate.mockReset();
    transaction.mockReset();
    teamFindMany.mockReset();
    userFindMany.mockReset();
    teamFindMany.mockResolvedValue([]);
    userFindMany.mockResolvedValue([]);
    ticketFindUnique.mockResolvedValue(null);
  });

  it("creates a new ticket for a fresh message", async () => {
    ticketMessageFindUnique.mockResolvedValue(null);
    ticketCreate.mockResolvedValue({
      id: "ticket-1",
      number: 101,
      messages: [{ id: "msg-1" }],
    });

    const result = await processIncomingEmail({
      fromEmail: "klient@example.com",
      fromName: "Klient",
      toAddresses: ["it@pwginfo.pl"],
      subject: "Problem z serwerem",
      text: "Serwer nie odpowiada",
      html: null,
      messageId: "<msg-1@example.com>",
    });

    expect(result).toMatchObject({
      ticketId: "ticket-1",
      created: true,
      duplicate: false,
      taskCreated: false,
    });
    expect(ticketCreate).toHaveBeenCalledOnce();
    expect(ticketCreate.mock.calls[0]?.[0]?.data?.subject).toBe(
      "Problem z serwerem",
    );
    expect(ticketCreate.mock.calls[0]?.[0]?.data?.assigneeId).toBeNull();
  });

  it("assigns new ticket from @mention in body when team members match", async () => {
    ticketMessageFindUnique.mockResolvedValue(null);
    userFindMany.mockResolvedValue([
      { id: "u-lukasz", name: "Łukasz Nowak" },
      { id: "u-grzegorz", name: "Grzegorz Miśków" },
    ]);
    ticketCreate.mockResolvedValue({
      id: "ticket-mention",
      number: 200,
      messages: [{ id: "msg-m" }],
    });

    await processIncomingEmail(
      {
        fromEmail: "anna@pwginfo.pl",
        fromName: "Anna",
        toAddresses: ["it@pwginfo.pl"],
        subject: "Drukarka",
        text: "Cześć, @Łukasz — nie działa drukarka w biurze.",
        html: null,
        messageId: "<msg-mention@example.com>",
      },
      { preferredTeamId: "team-it" },
    );

    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teamId: "team-it",
          isActive: true,
        }),
      }),
    );
    expect(ticketCreate.mock.calls[0]?.[0]?.data?.assigneeId).toBe("u-lukasz");
  });

  it("does not assign when first name is ambiguous in the team", async () => {
    ticketMessageFindUnique.mockResolvedValue(null);
    userFindMany.mockResolvedValue([
      { id: "u-1", name: "Łukasz Nowak" },
      { id: "u-2", name: "Łukasz Kowalski" },
    ]);
    ticketCreate.mockResolvedValue({
      id: "ticket-amb",
      number: 201,
      messages: [{ id: "msg-a" }],
    });

    await processIncomingEmail(
      {
        fromEmail: "anna@pwginfo.pl",
        fromName: "Anna",
        toAddresses: ["it@pwginfo.pl"],
        subject: "VPN",
        text: "Proszę @Łukasz o pomoc z VPN.",
        html: null,
        messageId: "<msg-amb@example.com>",
      },
      { preferredTeamId: "team-it" },
    );

    expect(ticketCreate.mock.calls[0]?.[0]?.data?.assigneeId).toBeNull();
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

    expect(result).toMatchObject({
      ticketId: "ticket-existing",
      created: false,
      duplicate: true,
      taskCreated: false,
    });
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it("appends to an existing ticket when subject contains [T-n]", async () => {
    ticketMessageFindUnique.mockResolvedValue(null);
    ticketFindUnique.mockResolvedValue({
      id: "ticket-101",
      status: "OPEN",
      statusLocked: false,
      mergedIntoId: null,
    });
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

    expect(result).toMatchObject({
      ticketId: "ticket-101",
      created: false,
      duplicate: false,
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(ticketCreate).not.toHaveBeenCalled();
  });

  it("uses preferredTeamId when provided (IMAP path)", async () => {
    ticketMessageFindUnique.mockResolvedValue(null);
    ticketCreate.mockResolvedValue({
      id: "ticket-2",
      number: 102,
      messages: [{ id: "msg-2" }],
    });

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

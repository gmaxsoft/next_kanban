import { beforeEach, describe, expect, it, vi } from "vitest";

const processIncomingEmail = vi.fn();
const normalizeInboundPayload = vi.fn();
const verifyInboundWebhook = vi.fn();
const ticketFindUnique = vi.fn();
const pollAllImapInboxes = vi.fn();

vi.mock("@/lib/inbound-email", () => ({
  processIncomingEmail,
  normalizeInboundPayload,
  verifyInboundWebhook,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findUnique: ticketFindUnique,
    },
  },
}));

vi.mock("@/lib/imap-inbox", () => ({
  pollAllImapInboxes,
}));

describe("POST /api/webhooks/inbound-email", () => {
  beforeEach(() => {
    processIncomingEmail.mockReset();
    normalizeInboundPayload.mockReset();
    verifyInboundWebhook.mockReset();
    ticketFindUnique.mockReset();
  });

  it("rejects unauthorized webhooks", async () => {
    verifyInboundWebhook.mockReturnValue(false);
    const { POST } = await import("@/app/api/webhooks/inbound-email/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/inbound-email", {
        method: "POST",
        body: JSON.stringify({ subject: "x" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("creates a ticket from a valid payload", async () => {
    verifyInboundWebhook.mockReturnValue(true);
    normalizeInboundPayload.mockResolvedValue({
      fromEmail: "klient@example.com",
      fromName: null,
      toAddresses: ["it@pwginfo.pl"],
      subject: "Problem",
      text: "Treść",
      html: null,
      messageId: "<ok@example.com>",
    });
    processIncomingEmail.mockResolvedValue({
      ticketId: "ticket-1",
      created: true,
      duplicate: false,
    });
    ticketFindUnique.mockResolvedValue({ id: "ticket-1", number: 101 });

    const { POST } = await import("@/app/api/webhooks/inbound-email/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/inbound-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: "klient@example.com",
          subject: "Problem",
          text: "Treść",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      created: true,
      displayId: "T-101",
    });
  });

  it("ignores non email.received Resend events", async () => {
    verifyInboundWebhook.mockReturnValue(true);
    const { POST } = await import("@/app/api/webhooks/inbound-email/route");

    const response = await POST(
      new Request("http://localhost/api/webhooks/inbound-email", {
        method: "POST",
        body: JSON.stringify({ type: "email.sent" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      ignored: true,
    });
    expect(processIncomingEmail).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/check-imap", () => {
  beforeEach(() => {
    pollAllImapInboxes.mockReset();
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.NODE_ENV = "test";
  });

  it("rejects requests without CRON_SECRET bearer", async () => {
    const { GET } = await import("@/app/api/cron/check-imap/route");
    const response = await GET(
      new Request("http://localhost/api/cron/check-imap"),
    );

    expect(response.status).toBe(401);
    expect(pollAllImapInboxes).not.toHaveBeenCalled();
  });

  it("polls mailboxes when authorized", async () => {
    pollAllImapInboxes.mockResolvedValue({
      mailboxes: [],
      totals: {
        teams: 0,
        fetched: 0,
        created: 0,
        appended: 0,
        duplicates: 0,
        errors: 0,
      },
    });

    const { GET } = await import("@/app/api/cron/check-imap/route");
    const response = await GET(
      new Request("http://localhost/api/cron/check-imap", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(pollAllImapInboxes).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      totals: { teams: 0 },
    });
  });
});

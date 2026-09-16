import { NextResponse } from "next/server";

import {
  processIncomingEmail,
  normalizeInboundPayload,
  verifyInboundWebhook,
} from "@/lib/inbound-email";
import { formatTicketId } from "@/lib/tickets";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyInboundWebhook(request, rawBody)) {
    return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    payload &&
    typeof payload === "object" &&
    "type" in payload &&
    typeof (payload as { type: unknown }).type === "string" &&
    (payload as { type: string }).type !== "email.received"
  ) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const email = await normalizeInboundPayload(payload);

  if (!email) {
    return NextResponse.json({ error: "Unsupported payload" }, { status: 400 });
  }

  try {
    const result = await processIncomingEmail(email);
    const ticket = await prisma.ticket.findUnique({
      where: { id: result.ticketId },
      select: { id: true, number: true },
    });

    return NextResponse.json({
      ok: true,
      created: result.created,
      duplicate: result.duplicate,
      ticketId: result.ticketId,
      displayId: ticket ? formatTicketId(ticket.number) : null,
    });
  } catch (error) {
    console.error("[inbound-email] ingest failed", error);
    return NextResponse.json({ error: "Failed to ingest email" }, { status: 500 });
  }
}

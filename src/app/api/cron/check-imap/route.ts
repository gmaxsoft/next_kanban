import { NextResponse } from "next/server";

import { pollAllImapInboxes } from "@/lib/imap-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[cron/check-imap] brak CRON_SECRET — pomijam weryfikację (dev)",
      );
      return true;
    }
    return false;
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pollAllImapInboxes();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/check-imap] failed", error);
    return NextResponse.json(
      { error: "IMAP poll failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}

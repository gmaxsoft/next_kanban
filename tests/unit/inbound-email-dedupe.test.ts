import { describe, expect, it } from "vitest";

import {
  collisionExternalMessageId,
  EXTERNAL_MESSAGE_ID_MAX,
  fingerprintsMatch,
  inboundBodyText,
  inboundContentFingerprint,
  truncateExternalMessageId,
} from "@/lib/inbound-email-dedupe";

describe("inboundBodyText", () => {
  it("prefers plain text over html", () => {
    expect(
      inboundBodyText({ text: "  hello  ", html: "<p>ignored</p>" }),
    ).toBe("hello");
  });

  it("strips html when text is empty", () => {
    expect(
      inboundBodyText({ text: null, html: "<p>Hi <b>there</b></p>" }),
    ).toBe("Hi there");
  });
});

describe("inboundContentFingerprint", () => {
  it("is stable for the same content", () => {
    const a = inboundContentFingerprint({
      fromEmail: "IOD@Pwginfo.pl",
      subject: "Zgłoszenie",
      bodyText: "Treść A",
    });
    const b = inboundContentFingerprint({
      fromEmail: "iod@pwginfo.pl",
      subject: "Zgłoszenie",
      bodyText: "Treść A",
    });
    expect(a).toBe(b);
  });

  it("changes when body differs", () => {
    const a = inboundContentFingerprint({
      fromEmail: "iod@pwginfo.pl",
      subject: "Zgłoszenie",
      bodyText: "Treść A",
    });
    const b = inboundContentFingerprint({
      fromEmail: "iod@pwginfo.pl",
      subject: "Zgłoszenie",
      bodyText: "Treść B",
    });
    expect(a).not.toBe(b);
  });
});

describe("collisionExternalMessageId", () => {
  it("appends a short fingerprint and stays within column limit", () => {
    const fp = "abcdef0123456789ffff";
    const id = collisionExternalMessageId("<same@msg.id>", fp);
    expect(id).toBe("<same@msg.id>#abcdef0123456789");
    expect(id.length).toBeLessThanOrEqual(EXTERNAL_MESSAGE_ID_MAX);
  });

  it("truncates long raw ids before the suffix", () => {
    const raw = `<${"x".repeat(300)}@example.com>`;
    const id = collisionExternalMessageId(raw, "0123456789abcdefzzzz");
    expect(id.endsWith("#0123456789abcdef")).toBe(true);
    expect(id.length).toBe(EXTERNAL_MESSAGE_ID_MAX);
  });
});

describe("helpers", () => {
  it("truncates and compares fingerprints", () => {
    expect(truncateExternalMessageId("a".repeat(300)).length).toBe(
      EXTERNAL_MESSAGE_ID_MAX,
    );
    expect(fingerprintsMatch("aa", "aa")).toBe(true);
    expect(fingerprintsMatch("aa", "bb")).toBe(false);
    expect(fingerprintsMatch(null, "aa")).toBe(false);
  });
});

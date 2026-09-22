import { describe, expect, it } from "vitest";

import { verifySimpleWebhookSecret } from "@/lib/inbound-email";

function requestWith(headers: Record<string, string>) {
  return new Request("http://localhost/api/webhooks/inbound-email", {
    method: "POST",
    headers,
  });
}

describe("verifySimpleWebhookSecret", () => {
  it("accepts bearer and x-webhook-secret headers", () => {
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET = "test-inbound-secret";

    expect(
      verifySimpleWebhookSecret(
        requestWith({ authorization: "Bearer test-inbound-secret" }),
      ),
    ).toBe(true);

    expect(
      verifySimpleWebhookSecret(
        requestWith({ "x-webhook-secret": "test-inbound-secret" }),
      ),
    ).toBe(true);
  });

  it("rejects invalid secrets", () => {
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET = "test-inbound-secret";

    expect(
      verifySimpleWebhookSecret(
        requestWith({ authorization: "Bearer wrong" }),
      ),
    ).toBe(false);
  });

  it("returns null when secret is not configured", () => {
    delete process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
    expect(verifySimpleWebhookSecret(requestWith({}))).toBeNull();
  });
});

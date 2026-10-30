import { describe, expect, it } from "vitest";

import {
  isEmailSignatureNoiseAttachment,
  withoutEmailSignatureNoiseAttachments,
} from "@/lib/ticket-attachments";

describe("email signature attachment noise filter", () => {
  it("filters Outlook signature images by name", () => {
    expect(
      isEmailSignatureNoiseAttachment({
        filename: "image001.png",
        contentType: "image/png",
      }),
    ).toBe(true);
    expect(
      isEmailSignatureNoiseAttachment({
        originalName: "image002.jpg",
        mimeType: "image/jpeg",
      }),
    ).toBe(true);
    expect(
      isEmailSignatureNoiseAttachment({
        filename: "IMAGE010.GIF",
        contentType: "image/gif",
      }),
    ).toBe(true);
  });

  it("keeps real attachments", () => {
    expect(
      isEmailSignatureNoiseAttachment({
        filename: "faktura.pdf",
        contentType: "application/pdf",
      }),
    ).toBe(false);
    expect(
      isEmailSignatureNoiseAttachment({
        filename: "screenshot.png",
        contentType: "image/png",
      }),
    ).toBe(false);
    expect(
      isEmailSignatureNoiseAttachment({
        filename: "logo-firmy.png",
        contentType: "image/png",
      }),
    ).toBe(false);
  });

  it("filters lists used in UI", () => {
    const filtered = withoutEmailSignatureNoiseAttachments([
      { originalName: "image001.png", mimeType: "image/png" },
      { originalName: "umowa.pdf", mimeType: "application/pdf" },
      { originalName: "image002.png", mimeType: "image/png" },
    ]);

    expect(filtered.map((item) => item.originalName)).toEqual(["umowa.pdf"]);
  });
});

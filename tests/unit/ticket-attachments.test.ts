import { describe, expect, it } from "vitest";

import {
  isEmailSignatureNoiseAttachment,
  withoutEmailSignatureNoiseAttachments,
} from "@/lib/ticket-attachments";

describe("email signature attachment noise filter", () => {
  it("filters Outlook signature images image001–image004 only", () => {
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
        filename: "IMAGE003.GIF",
        contentType: "image/gif",
      }),
    ).toBe(true);
    expect(
      isEmailSignatureNoiseAttachment({
        filename: "image004.webp",
        contentType: "image/webp",
      }),
    ).toBe(true);
  });

  it("keeps real attachments including image005+", () => {
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
    expect(
      isEmailSignatureNoiseAttachment({
        filename: "image005.png",
        contentType: "image/png",
      }),
    ).toBe(false);
    expect(
      isEmailSignatureNoiseAttachment({
        filename: "IMAGE010.GIF",
        contentType: "image/gif",
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

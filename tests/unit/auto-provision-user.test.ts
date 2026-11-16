import { describe, expect, it } from "vitest";

import {
  emailDomain,
  isAutoProvisionEmailDomain,
} from "@/lib/auto-provision-user";

describe("auto-provision email domain gate", () => {
  it("allows pwg.info.pl and pwginfo.pl", () => {
    expect(isAutoProvisionEmailDomain("ilona@pwg.info.pl")).toBe(true);
    expect(isAutoProvisionEmailDomain("ilona.gorzkowska@pwginfo.pl")).toBe(
      true,
    );
    expect(isAutoProvisionEmailDomain("IT@PWG.INFO.PL")).toBe(true);
  });

  it("blocks other domains", () => {
    expect(isAutoProvisionEmailDomain("spam@gmail.com")).toBe(false);
    expect(isAutoProvisionEmailDomain("user@evil-pwg.info.pl")).toBe(false);
    expect(isAutoProvisionEmailDomain("not-an-email")).toBe(false);
  });

  it("parses domain", () => {
    expect(emailDomain("a@pwg.info.pl")).toBe("pwg.info.pl");
  });
});

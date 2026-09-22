import { afterEach, describe, expect, it } from "vitest";

import { getAppLicense } from "@/lib/license";

const ENV_KEYS = [
  "LICENSE_COMPANY_NAME",
  "LICENSE_VENDOR_NAME",
  "LICENSE_AUTHOR_NAME",
  "LICENSE_YEAR",
  "LICENSE_NOTICE",
] as const;

describe("getAppLicense", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("uses defaults when env is empty", () => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }

    const license = getAppLicense();
    expect(license.companyName).toBe("Licencjobiorca");
    expect(license.vendorName).toBe("MaxSoft.pl");
    expect(license.authorName).toBe("MaxSoft.pl");
    expect(license.notice).toContain("Licencjobiorca");
    expect(license.notice).toContain("MaxSoft.pl");
  });

  it("reads company and vendor from env", () => {
    process.env.LICENSE_COMPANY_NAME = "PWG Info Sp. z o.o.";
    process.env.LICENSE_VENDOR_NAME = "MaxSoft.pl";
    process.env.LICENSE_AUTHOR_NAME = "MaxSoft.pl";
    process.env.LICENSE_YEAR = "2026";

    const license = getAppLicense();
    expect(license.companyName).toBe("PWG Info Sp. z o.o.");
    expect(license.year).toBe(2026);
    expect(license.notice).toContain("PWG Info Sp. z o.o.");
    expect(license.notice).toContain("Autor: MaxSoft.pl");
  });

  it("allows a custom license notice", () => {
    process.env.LICENSE_NOTICE = "Własna klauzula licencyjna.";
    expect(getAppLicense().notice).toBe("Własna klauzula licencyjna.");
  });
});

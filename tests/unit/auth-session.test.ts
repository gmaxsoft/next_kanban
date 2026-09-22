import { describe, expect, it } from "vitest";

import {
  isAuthSessionCookieName,
  isRememberMeChecked,
  sessionMaxAgeSeconds,
  SESSION_MAX_AGE_REMEMBERED,
  SESSION_MAX_AGE_TEMPORARY,
} from "@/lib/auth-session";

describe("auth-session", () => {
  it("detects remember-me checkbox values", () => {
    expect(isRememberMeChecked("on")).toBe(true);
    expect(isRememberMeChecked("true")).toBe(true);
    expect(isRememberMeChecked("1")).toBe(true);
    expect(isRememberMeChecked(null)).toBe(false);
    expect(isRememberMeChecked("off")).toBe(false);
  });

  it("returns longer max-age when remembered", () => {
    expect(sessionMaxAgeSeconds(true)).toBe(SESSION_MAX_AGE_REMEMBERED);
    expect(sessionMaxAgeSeconds(false)).toBe(SESSION_MAX_AGE_TEMPORARY);
    expect(SESSION_MAX_AGE_REMEMBERED).toBeGreaterThan(SESSION_MAX_AGE_TEMPORARY);
  });

  it("recognizes Auth.js session cookie names including chunks", () => {
    expect(isAuthSessionCookieName("authjs.session-token")).toBe(true);
    expect(isAuthSessionCookieName("authjs.session-token.0")).toBe(true);
    expect(isAuthSessionCookieName("__Secure-authjs.session-token")).toBe(true);
    expect(isAuthSessionCookieName("nk.remember-me")).toBe(false);
  });
});

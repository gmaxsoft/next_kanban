/** Preference cookie set at login — used only if we need to re-apply persistence. */
export const REMEMBER_ME_COOKIE = "nk.remember-me";

/** Long-lived session when "Zapamiętaj mnie" is checked. */
export const SESSION_MAX_AGE_REMEMBERED = 60 * 60 * 24 * 30; // 30 days

/** Shorter session when the checkbox is unchecked. */
export const SESSION_MAX_AGE_TEMPORARY = 60 * 60 * 12; // 12 hours

export function isRememberMeChecked(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export function sessionMaxAgeSeconds(rememberMe: boolean) {
  return rememberMe ? SESSION_MAX_AGE_REMEMBERED : SESSION_MAX_AGE_TEMPORARY;
}

export function isAuthSessionCookieName(name: string) {
  return (
    name === "authjs.session-token" ||
    name.startsWith("authjs.session-token.") ||
    name === "__Secure-authjs.session-token" ||
    name.startsWith("__Secure-authjs.session-token.")
  );
}

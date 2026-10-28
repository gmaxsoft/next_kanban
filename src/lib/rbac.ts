export const SYSTEM_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000001";
export const SYSTEM_USER_ROLE_ID = "00000000-0000-4000-8000-000000000002";
export const SYSTEM_RESTRICTED_ROLE_ID =
  "00000000-0000-4000-8000-000000000003";
export const DEFAULT_TEAM_ID = "00000000-0000-4000-8000-000000000010";
/** Existing Biuro team id in this database */
export const BIURO_TEAM_ID = "bd4e01cd-9c6f-4682-b4c0-fb412b0ee07d";

export const SYSTEM_ADMIN_SLUG = "ADMIN";
export const SYSTEM_USER_SLUG = "USER";
export const SYSTEM_RESTRICTED_SLUG = "RESTRICTED";

export type RolePermission = "admin" | "standard" | "restricted";

export function rolePermissionFromFlags(input: {
  isAdmin: boolean;
  isRestricted?: boolean;
}): RolePermission {
  if (input.isAdmin) {
    return "admin";
  }
  if (input.isRestricted) {
    return "restricted";
  }
  return "standard";
}

export function roleFlagsFromPermission(permission: RolePermission) {
  return {
    isAdmin: permission === "admin",
    isRestricted: permission === "restricted",
  };
}

export function rolePermissionLabel(permission: RolePermission) {
  switch (permission) {
    case "admin":
      return "Administrator";
    case "restricted":
      return "Ograniczone";
    default:
      return "Standardowe";
  }
}

/** Paths allowed for restricted (tickets-only) users. */
export function isRestrictedAllowedPath(pathname: string) {
  if (pathname === "/tickets" || pathname.startsWith("/tickets/")) {
    return true;
  }
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return true;
  }
  if (pathname.startsWith("/api/auth")) {
    return true;
  }
  if (pathname.startsWith("/api/tickets/")) {
    return true;
  }
  // Notifications bell on tickets layout
  if (pathname.startsWith("/api/notifications")) {
    return true;
  }
  return false;
}

export function slugifyRoleName(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);

  return base || "ROLE";
}

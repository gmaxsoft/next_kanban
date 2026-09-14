export const SYSTEM_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000001";
export const SYSTEM_USER_ROLE_ID = "00000000-0000-4000-8000-000000000002";
export const DEFAULT_TEAM_ID = "00000000-0000-4000-8000-000000000010";
/** Existing Biuro team id in this database */
export const BIURO_TEAM_ID = "bd4e01cd-9c6f-4682-b4c0-fb412b0ee07d";

export const SYSTEM_ADMIN_SLUG = "ADMIN";
export const SYSTEM_USER_SLUG = "USER";

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

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEFAULT_PAGE_SIZE = 15;
export const MAX_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;

export type PaginationState = {
  page: number;
  pageSize: number;
};

export type PaginationMeta = PaginationState & {
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export function parseSearchQuery(value?: string | string[], max = 80) {
  return firstParam(value).trim().slice(0, max);
}

export function parseUuidParam(value?: string | string[]) {
  const next = firstParam(value).trim();
  return uuidPattern.test(next) ? next : "";
}

export function parseEnumParam<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): T | "" {
  const next = firstParam(value).trim();
  return (allowed as readonly string[]).includes(next) ? (next as T) : "";
}

export function parsePagination(searchParams: {
  page?: string | string[];
  pageSize?: string | string[];
}): PaginationState {
  const rawPage = Number.parseInt(firstParam(searchParams.page), 10);
  const rawSize = Number.parseInt(firstParam(searchParams.pageSize), 10);

  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize)
    ? rawSize
    : DEFAULT_PAGE_SIZE;

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { page, pageSize };
}

export function buildPaginationMeta(
  total: number,
  pagination: PaginationState,
): PaginationMeta {
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(total, 0) / pagination.pageSize),
  );
  const page = Math.min(pagination.page, totalPages);

  return {
    total,
    page,
    pageSize: pagination.pageSize,
    totalPages,
    skip: (page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  };
}

export function buildListPath(
  pathname: string,
  values: Record<string, string | number | undefined | null>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      continue;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      continue;
    }
    if (key === "page" && trimmed === "1") {
      continue;
    }
    if (key === "pageSize" && Number(trimmed) === DEFAULT_PAGE_SIZE) {
      continue;
    }
    params.set(key, trimmed);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export type BoardsListFilters = {
  q: string;
  team: string;
};

export function parseBoardsListSearch(searchParams: {
  q?: string | string[];
  team?: string | string[];
}): BoardsListFilters {
  return {
    q: parseSearchQuery(searchParams.q),
    team: parseUuidParam(searchParams.team),
  };
}

export type UsersListFilters = {
  q: string;
  team: string;
  role: string;
  status: "" | "active" | "inactive";
};

export function parseUsersListSearch(searchParams: {
  q?: string | string[];
  team?: string | string[];
  role?: string | string[];
  status?: string | string[];
}): UsersListFilters {
  return {
    q: parseSearchQuery(searchParams.q),
    team: parseUuidParam(searchParams.team),
    role: parseUuidParam(searchParams.role),
    status: parseEnumParam(searchParams.status, ["active", "inactive"] as const),
  };
}

export type TasksListFilters = {
  q: string;
  team: string;
  board: string;
  priority: "" | "LOW" | "MEDIUM" | "HIGH";
};

export function parseTasksListSearch(searchParams: {
  q?: string | string[];
  team?: string | string[];
  board?: string | string[];
  priority?: string | string[];
}): TasksListFilters {
  return {
    q: parseSearchQuery(searchParams.q),
    team: parseUuidParam(searchParams.team),
    board: parseUuidParam(searchParams.board),
    priority: parseEnumParam(searchParams.priority, [
      "LOW",
      "MEDIUM",
      "HIGH",
    ] as const),
  };
}

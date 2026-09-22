import { describe, expect, it } from "vitest";

import {
  buildListPath,
  buildPaginationMeta,
  parsePagination,
  parseSearchQuery,
  parseTicketsListSearch,
  parseUuidParam,
} from "@/lib/list-query";

describe("list-query helpers", () => {
  it("parses and truncates search queries", () => {
    expect(parseSearchQuery("  hello  ")).toBe("hello");
    expect(parseSearchQuery(["a", "b"])).toBe("a");
    expect(parseSearchQuery("x".repeat(100)).length).toBe(80);
  });

  it("validates uuid params", () => {
    expect(
      parseUuidParam("550e8400-e29b-41d4-a716-446655440000"),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(parseUuidParam("not-a-uuid")).toBe("");
  });

  it("parses pagination with defaults and clamps", () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 15 });
    expect(parsePagination({ page: "3", pageSize: "50" })).toEqual({
      page: 3,
      pageSize: 50,
    });
    expect(parsePagination({ page: "0", pageSize: "7" })).toEqual({
      page: 1,
      pageSize: 15,
    });
  });

  it("builds pagination meta", () => {
    expect(buildPaginationMeta(40, { page: 2, pageSize: 15 })).toEqual({
      total: 40,
      page: 2,
      pageSize: 15,
      totalPages: 3,
      skip: 15,
      take: 15,
    });
  });

  it("parses tickets list search", () => {
    expect(
      parseTicketsListSearch({
        q: " serwer ",
        status: "OPEN",
        team: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toEqual({
      q: "serwer",
      status: "OPEN",
      team: "550e8400-e29b-41d4-a716-446655440000",
    });

    expect(parseTicketsListSearch({ status: "DONE" }).status).toBe("");
  });

  it("builds list paths without default page params", () => {
    expect(buildListPath("/tickets", { q: "api", page: 1, pageSize: 15 })).toBe(
      "/tickets?q=api",
    );
    expect(buildListPath("/tickets", { page: 2, status: "OPEN" })).toBe(
      "/tickets?page=2&status=OPEN",
    );
  });
});

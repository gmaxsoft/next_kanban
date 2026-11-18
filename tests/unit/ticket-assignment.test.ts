import { describe, expect, it } from "vitest";

import {
  assigneeDisplayLabel,
  buildPeopleChangeHistoryNote,
  missingTeamMemberIds,
  requesterDisplayLabel,
} from "@/lib/ticket-assignment";

describe("missingTeamMemberIds", () => {
  it("returns empty when all ids are found", () => {
    expect(
      missingTeamMemberIds(["a", "b"], ["a", "b", "c"]),
    ).toEqual([]);
  });

  it("lists ids that are inactive / outside team", () => {
    expect(missingTeamMemberIds(["a", "b", "c"], ["a"])).toEqual([
      "b",
      "c",
    ]);
  });

  it("handles empty requested list", () => {
    expect(missingTeamMemberIds([], ["a"])).toEqual([]);
  });
});

describe("buildPeopleChangeHistoryNote", () => {
  const base = {
    assigneeId: null as string | null,
    assigneeName: null as string | null,
    requestedBy: "Anna Biuro",
    requesterEmail: "anna@pwginfo.pl",
    requesterName: "Anna Biuro",
  };

  it("returns null when nothing changed", () => {
    expect(
      buildPeopleChangeHistoryNote({
        previous: base,
        next: { ...base },
        actorName: "Admin",
      }),
    ).toBeNull();
  });

  it("describes assignee change", () => {
    const note = buildPeopleChangeHistoryNote({
      previous: base,
      next: {
        ...base,
        assigneeId: "u-1",
        assigneeName: "Łukasz Nowak",
      },
      actorName: "Grzegorz",
    });
    expect(note).toContain("Grzegorz zmienił przypisanie.");
    expect(note).toContain(
      "Odpowiedzialny: nieprzypisany → Łukasz Nowak.",
    );
  });

  it("describes requester change with email", () => {
    const note = buildPeopleChangeHistoryNote({
      previous: base,
      next: {
        ...base,
        requestedBy: "Piotr",
        requesterName: "Piotr",
        requesterEmail: "piotr@pwginfo.pl",
      },
      actorName: "Admin",
    });
    expect(note).toContain("Zgłaszający:");
    expect(note).toContain("anna@pwginfo.pl");
    expect(note).toContain("piotr@pwginfo.pl");
  });

  it("combines assignee and requester changes", () => {
    const note = buildPeopleChangeHistoryNote({
      previous: {
        ...base,
        assigneeId: "u-old",
        assigneeName: "Stary",
      },
      next: {
        assigneeId: "u-new",
        assigneeName: "Nowy",
        requestedBy: "Inny",
        requesterName: "Inny",
        requesterEmail: "inny@pwginfo.pl",
      },
      actorName: "Admin",
    });
    expect(note).toContain("Odpowiedzialny: Stary → Nowy.");
    expect(note).toContain("Zgłaszający:");
  });
});

describe("display labels", () => {
  it("formats requester and assignee labels", () => {
    expect(
      requesterDisplayLabel({
        requestedBy: null,
        requesterName: null,
        requesterEmail: "a@b.pl",
      }),
    ).toBe("a@b.pl");
    expect(assigneeDisplayLabel(null)).toBe("nieprzypisany");
    expect(assigneeDisplayLabel("  Jan  ")).toBe("Jan");
  });
});

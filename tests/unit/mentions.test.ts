import { describe, expect, it } from "vitest";

import {
  extractMentionedUserIds,
  findFirstMentionedUserId,
} from "@/lib/mentions";

const lukasz = { id: "u-lukasz", name: "Łukasz Nowak" };
const grzegorz = { id: "u-grzegorz", name: "Grzegorz Miśków" };
const lukasz2 = { id: "u-lukasz-2", name: "Łukasz Kowalski" };

describe("findFirstMentionedUserId", () => {
  const team = [lukasz, grzegorz];

  it("picks the earliest mention in the body", () => {
    expect(
      findFirstMentionedUserId(
        "Proszę o pomoc @Grzegorz, potem @Łukasz też.",
        team,
      ),
    ).toBe(grzegorz.id);
  });

  it("matches unique first name", () => {
    expect(
      findFirstMentionedUserId("Hej @Łukasz — padł drukarka.", team),
    ).toBe(lukasz.id);
  });

  it("does not use first name when ambiguous", () => {
    expect(
      findFirstMentionedUserId("Do @Łukasz", [lukasz, lukasz2, grzegorz]),
    ).toBeNull();
    expect(
      findFirstMentionedUserId("Do @Łukasz Nowak", [lukasz, lukasz2, grzegorz]),
    ).toBe(lukasz.id);
  });

  it("returns null without mentions", () => {
    expect(findFirstMentionedUserId("Zwykły mail bez osób.", team)).toBeNull();
  });

  it("matches mention after HTML stripping noise", () => {
    const stripped =
      "Proszę  @Łukasz  o sprawdzenie drukarki.";
    expect(findFirstMentionedUserId(stripped, team)).toBe(lukasz.id);
  });

  it("ignores emails that look similar but are not mentions", () => {
    expect(
      findFirstMentionedUserId("Kontakt: lukasz@firma.pl", team),
    ).toBeNull();
  });

  it("requires word boundary before @", () => {
    expect(
      findFirstMentionedUserId("nie@Łukasz", team),
    ).toBeNull();
  });
});

describe("extractMentionedUserIds first-name alias", () => {
  it("includes unique first-name mentions", () => {
    expect(
      extractMentionedUserIds("Ping @Grzegorz", [lukasz, grzegorz]),
    ).toEqual([grzegorz.id]);
  });
});

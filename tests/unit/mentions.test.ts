import { describe, expect, it } from "vitest";

import {
  extractMentionedUserIds,
  findFirstInboundAssigneeUserId,
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

describe("findFirstInboundAssigneeUserId", () => {
  const lukaszMail = {
    id: "u-lukasz",
    email: "lukasz.nowak@pwginfo.pl",
  };
  const grzegorzMail = {
    id: "u-grzegorz",
    email: "grzegorz.miskow@pwginfo.pl",
  };
  const zbyszekMail = {
    id: "u-zbyszek",
    email: "zbyszek.koskowski@pwginfo.pl",
  };
  const grzegorzOther = {
    id: "u-grzegorz-2",
    email: "grzegorz.kowalski@pwginfo.pl",
  };

  it("assigns from full @user@domain mention", () => {
    expect(
      findFirstInboundAssigneeUserId(
        "Proszę @grzegorz.miskow@pwginfo.pl o pomoc.",
        [lukaszMail, grzegorzMail],
      ),
    ).toBe(grzegorzMail.id);
  });

  it("assigns from unique @local-part", () => {
    expect(
      findFirstInboundAssigneeUserId("Cześć @lukasz.nowak — drukarka.", [
        lukaszMail,
        grzegorzMail,
      ]),
    ).toBe(lukaszMail.id);
  });

  it("does not assign ambiguous local-part", () => {
    const twin = {
      id: "u-lukasz-2",
      email: "lukasz.nowak@other.pl",
    };
    expect(
      findFirstInboundAssigneeUserId("Do @lukasz.nowak", [
        lukaszMail,
        twin,
        grzegorzMail,
      ]),
    ).toBeNull();
  });

  it("ignores first-name mentions", () => {
    expect(
      findFirstInboundAssigneeUserId("Hej @Grzegorz, potrzebuję pomocy.", [
        lukaszMail,
        grzegorzMail,
      ]),
    ).toBeNull();
  });

  it("picks the earliest email mention", () => {
    expect(
      findFirstInboundAssigneeUserId(
        "Najpierw @zbyszek.koskowski potem @grzegorz.miskow@pwginfo.pl",
        [lukaszMail, grzegorzMail, zbyszekMail],
      ),
    ).toBe(zbyszekMail.id);
  });

  it("prefers full email over local when both could match same user", () => {
    expect(
      findFirstInboundAssigneeUserId(
        "Ping @grzegorz.miskow@pwginfo.pl dzięki",
        [grzegorzMail, grzegorzOther],
      ),
    ).toBe(grzegorzMail.id);
  });

  it("requires boundary before @", () => {
    expect(
      findFirstInboundAssigneeUserId("nie@lukasz.nowak", [
        lukaszMail,
        grzegorzMail,
      ]),
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { getAllPlayers, getCountsByDecade } from "./dataLoader";
import {
  ALBUM_DECADES,
  TROPHIES,
  getAlbumSections,
  getPointsForSection,
  getSurnameInitials,
  matchesPlayerName,
} from "../shared/figutrivia";

describe("FiguTrivia scoring & name matching", () => {
  it("computes hint points by album section (1..4)", () => {
    expect(getPointsForSection(1)).toBe(1);
    expect(getPointsForSection(150)).toBe(1);
    expect(getPointsForSection(151)).toBe(2);
    expect(getPointsForSection(300)).toBe(2);
    expect(getPointsForSection(301)).toBe(3);
    expect(getPointsForSection(450)).toBe(3);
    expect(getPointsForSection(451)).toBe(4);
    expect(getPointsForSection(561)).toBe(4);
  });

  it("matches full names and surnames ignoring accents and special characters (ø, ł, æ, ß, ı)", () => {
    expect(matchesPlayerName("Paolo Maldini", "Paolo Maldini")).toBe(true);
    expect(matchesPlayerName("Maldini", "Paolo Maldini")).toBe(true);
    expect(matchesPlayerName("Alvarez", "Édgar Álvarez")).toBe(true);
    expect(matchesPlayerName("Di Natale", "Antonio Di Natale")).toBe(true);
    expect(matchesPlayerName("Jorgensen", "Martin Jørgensen")).toBe(true);
    expect(matchesPlayerName("Hojlund", "Rasmus Højlund")).toBe(true);
    expect(matchesPlayerName("Ostigard", "Leo Østigård")).toBe(true);
    expect(matchesPlayerName("Sorensen", "Frederik Sørensen")).toBe(true);
    expect(matchesPlayerName("Wszolek", "Paweł Wszołek")).toBe(true);
    expect(matchesPlayerName("Yildiz", "Kenan Yıldız")).toBe(true);
    expect(matchesPlayerName("Elkjaer", "Preben Elkjær")).toBe(true);
    expect(matchesPlayerName("Elkjar", "Preben Elkjær")).toBe(true);
    expect(matchesPlayerName("Hassler", "Thomas Häßler")).toBe(true);
    expect(matchesPlayerName("Tressoldi", "Ruan Tressoldi")).toBe(true);
    expect(matchesPlayerName("Gianluigi", "Gianluigi Buffon")).toBe(false);
  });

  it("extracts surname initials preserving prepositions and apostrophes", () => {
    expect(getSurnameInitials("Antonio Di Natale")).toBe("D. N.");
    expect(getSurnameInitials("Danilo D'Ambrosio")).toBe("D'A.");
    expect(getSurnameInitials("Gian Marco Ferrari")).toBe("F.");
  });
});

describe("FiguTrivia 1979/80-oggi dataset integrity", () => {
  it("contains only >50 appearance players sorted per decade album with valid metadata", () => {
    const players = getAllPlayers();
    expect(players.length).toBe(2517);

    const counts = getCountsByDecade();
    for (const d of ALBUM_DECADES) {
      expect(counts[d.key]).toBeGreaterThan(0);
      const inDecade = players.filter((p) => p.album_decade === d.key);
      expect(inDecade.length).toBe(counts[d.key]);
      for (let i = 0; i < inDecade.length; i++) {
        const cur = inDecade[i];
        expect(cur.serie_a_apps).toBeGreaterThan(50);
        expect(cur.numero).toBe(i + 1);
        expect(cur.birth_year).not.toBeNull();
        expect(cur.photo_url.length).toBeGreaterThan(0);
        expect([
          "Portiere",
          "Difensore",
          "Centrocampista",
          "Attaccante",
        ]).toContain(cur.position);
        if (i > 0) {
          expect(inDecade[i - 1].serie_a_apps).toBeGreaterThanOrEqual(
            cur.serie_a_apps
          );
        }
      }
    }
    const milestones = TROPHIES.filter((t) => t.category === "milestone");
    expect(milestones.map((m) => m.id)).toEqual([
      "found_100",
      "found_500",
      "found_1000",
      "found_all",
    ]);
    const secs2020 = getAlbumSections("2020-oggi", counts["2020-oggi"]);
    expect(secs2020.length).toBe(4);
    expect(secs2020[0]).toMatchObject({
      index: 1,
      id: "album_2020-oggi_sec_1",
      label: "1–150",
      min: 1,
      max: 150,
      count: 150,
    });
  });
});

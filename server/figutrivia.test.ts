import { describe, expect, it } from "vitest";
import { getAllPlayers, getCountsByDecade } from "./dataLoader";
import {
  ALBUM_DECADES,
  getPointsForAppearances,
  getSurnameInitials,
  matchesPlayerName,
} from "../shared/figutrivia";

describe("FiguTrivia scoring & name matching", () => {
  it("computes hint points by Serie A appearances", () => {
    expect(getPointsForAppearances(657)).toBe(1);
    expect(getPointsForAppearances(400)).toBe(1);
    expect(getPointsForAppearances(399)).toBe(2);
    expect(getPointsForAppearances(300)).toBe(2);
    expect(getPointsForAppearances(250)).toBe(3);
    expect(getPointsForAppearances(200)).toBe(3);
    expect(getPointsForAppearances(150)).toBe(4);
    expect(getPointsForAppearances(100)).toBe(4);
    expect(getPointsForAppearances(99)).toBe(5);
    expect(getPointsForAppearances(51)).toBe(5);
  });

  it("matches full names and surnames ignoring accents", () => {
    expect(matchesPlayerName("Paolo Maldini", "Paolo Maldini")).toBe(true);
    expect(matchesPlayerName("Maldini", "Paolo Maldini")).toBe(true);
    expect(matchesPlayerName("Alvarez", "Édgar Álvarez")).toBe(true);
    expect(matchesPlayerName("Di Natale", "Antonio Di Natale")).toBe(true);
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
  });
});

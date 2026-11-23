export type AlbumDecadeKey =
  | "1980-89"
  | "1990-99"
  | "2000-09"
  | "2010-19"
  | "2020-oggi";

export interface AlbumDecadeInfo {
  key: AlbumDecadeKey;
  label: string;
  subtitle: string;
  badgeColor: string;
}

export const ALBUM_DECADES: AlbumDecadeInfo[] = [
  {
    key: "1980-89",
    label: "1979–89",
    subtitle: "Stagioni 1979/80 – 1989/90 (e presenze prec.)",
    badgeColor: "bg-amber-400",
  },
  {
    key: "1990-99",
    label: "1990–99",
    subtitle: "Stagioni 1990/91 – 1999/00",
    badgeColor: "bg-emerald-400",
  },
  {
    key: "2000-09",
    label: "2000–09",
    subtitle: "Stagioni 2000/01 – 2009/10",
    badgeColor: "bg-sky-400",
  },
  {
    key: "2010-19",
    label: "2010–19",
    subtitle: "Stagioni 2010/11 – 2019/20",
    badgeColor: "bg-violet-400",
  },
  {
    key: "2020-oggi",
    label: "2020–oggi",
    subtitle: "Stagioni 2020/21 – oggi",
    badgeColor: "bg-rose-400",
  },
];

export interface FigurinaPlayer {
  numero: number;
  global_rank: number;
  player_id: string;
  name: string;
  birth_year: number | null;
  photo_url: string;
  serie_a_apps: number;
  decade_apps: Record<AlbumDecadeKey, number>;
  album_decade: AlbumDecadeKey;
  nationality: string;
  position: string;
}

export const HINT_COSTS = {
  anno_ruolo: 1,
  nazionalita_presenze: 1,
  iniziali: 3,
} as const;

export type HintType = keyof typeof HINT_COSTS;

export const MAX_MANCOLISTA_SIZE = 50;
export const MAX_DAILY_GIFTS = 5;
export const PACK_COST = 20;
export const PACK_SIZE = 5;
export const TROPHY_REWARD_POINTS = 100;

/**
 * Calcola i punti indizio guadagnati indovinando un giocatore in base alla sezione dell'album:
 * - 1ª sezione (1..150): 1 pt
 * - 2ª sezione (151..300): 2 pt
 * - 3ª sezione (301..450): 3 pt
 * - 4ª sezione (451+): 4 pt
 */
export function getPointsForSection(numero: number): number {
  if (numero <= 150) return 1;
  if (numero <= 300) return 2;
  if (numero <= 450) return 3;
  return 4;
}

export function getPointsForAppearances(numero: number): number {
  return getPointsForSection(numero);
}

export const ALBUM_SECTION_SIZE = 150;

export interface AlbumSectionInfo {
  index: number;
  id: string;
  label: string;
  min: number;
  max: number;
  count: number;
}

export function getAlbumSections(
  decade: AlbumDecadeKey,
  totalInDecade: number
): AlbumSectionInfo[] {
  const out: AlbumSectionInfo[] = [];
  if (totalInDecade <= 0) return out;
  let idx = 1;
  for (let start = 1; start <= totalInDecade; start += ALBUM_SECTION_SIZE) {
    const end = Math.min(totalInDecade, start + ALBUM_SECTION_SIZE - 1);
    out.push({
      index: idx,
      id: `album_${decade}_sec_${idx}`,
      label: `${start}–${end}`,
      min: start,
      max: end,
      count: end - start + 1,
    });
    idx++;
  }
  return out;
}

export interface TrophyDefinition {
  id: string;
  title: string;
  description: string;
  category: "milestone" | "album";
  threshold?: number;
  isAllPlayers?: boolean;
  decade?: AlbumDecadeKey;
  icon: string;
}

export const TROPHIES: TrophyDefinition[] = [
  {
    id: "found_100",
    title: "Primo Centinaio",
    description: "Trova 100 giocatori negli album FiguTrivia",
    category: "milestone",
    threshold: 100,
    icon: "🥉",
  },
  {
    id: "found_500",
    title: "Collezionista Esperto",
    description: "Trova 500 giocatori negli album FiguTrivia",
    category: "milestone",
    threshold: 500,
    icon: "🥈",
  },
  {
    id: "found_1000",
    title: "Mille Figurine",
    description: "Trova 1.000 giocatori negli album FiguTrivia",
    category: "milestone",
    threshold: 1000,
    icon: "🥇",
  },
  {
    id: "found_all",
    title: "Leggenda Assoluta",
    description: "Trova tutti i giocatori presenti sul sito",
    category: "milestone",
    isAllPlayers: true,
    icon: "👑",
  },
  ...ALBUM_DECADES.map((d) => ({
    id: `album_${d.key}`,
    title: `Album ${d.label} Completo`,
    description: `Completa tutte le sezioni dell'album ${d.label} per comporre il trofeo`,
    category: "album" as const,
    decade: d.key,
    icon: "🏆",
  })),
];

export function normalizePlayerStr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[øǿ]/g, "o")
    .replace(/ł/g, "l")
    .replace(/ı/g, "i")
    .replace(/[đð]/g, "d")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/þ/g, "th")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const COMPOUND_GIVEN_NAMES = new Set([
  "gian marco",
  "jose luis",
  "fabian natale",
  "antonio carlos",
  "john arne",
  "marc oliver",
  "tore andre",
  "juan pablo",
  "joseph dayo",
  "ramos borges",
  "pier luigi",
  "gian luca",
  "jean pierre",
  "jan vennegoor",
  "luis antonio",
  "marco antonio",
  "carlos alberto",
  "paulo cesar",
  "paulo roberto",
  "pedro pablo",
  "mikael egill",
  "pietro paolo",
  "gian pietro",
  "salvatore antonio",
  "gian piero",
  "antonio elia",
  "pier giuseppe",
  "juan sebastian",
  "miguel angel",
  "rufo emiliano",
  "juan manuel",
  "luis pedro",
]);

export function extractSurname(fullName: string): string {
  const cleaned = fullName.replace(/\s+Jr\.?$/i, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length <= 1) return parts[0] || fullName;
  if (parts.length === 2) return parts[1];
  const firstTwo = normalizePlayerStr(`${parts[0]} ${parts[1]}`);
  if (COMPOUND_GIVEN_NAMES.has(firstTwo)) {
    return parts.slice(2).join(" ");
  }
  return parts.slice(1).join(" ");
}

export function matchesPlayerName(guess: string, fullName: string): boolean {
  const normGuess = normalizePlayerStr(guess);
  const normFull = normalizePlayerStr(fullName);
  const normSurname = normalizePlayerStr(extractSurname(fullName));
  if (!normGuess) return false;
  if (normGuess === normFull || normGuess === normSurname) return true;
  if (normFull === "samir" && normGuess === "samir caetano") return true;
  // Also allow "a" for "ae" (e.g. Elkjar / Elkjaer for Elkjær), "oe" for "o" (e.g. Joergensen / Jorgensen), and "ellertson" for "ellertsson"
  const altGuess = normGuess
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ellertsson/g, "ellertson");
  const altFull = normFull
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ellertsson/g, "ellertson");
  const altSurname = normSurname
    .replace(/ae/g, "a")
    .replace(/oe/g, "o")
    .replace(/ellertsson/g, "ellertson");
  return altGuess === altFull || altGuess === altSurname;
}

export function getSurnameInitials(fullName: string): string {
  const surname = extractSurname(fullName);
  return surname
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.includes("-")) {
        return word
          .split("-")
          .filter(Boolean)
          .map((w) => w[0].toUpperCase() + ".")
          .join("-");
      }
      const apoIdx = word.search(/['’]/);
      if (apoIdx > 0 && apoIdx <= 4 && word.length - 1 - apoIdx >= 2) {
        const prefix = word.slice(0, apoIdx);
        const after = word.slice(apoIdx + 1);
        return prefix[0].toUpperCase() + "'" + after[0].toUpperCase() + ".";
      }
      return word[0].toUpperCase() + ".";
    })
    .join(" ");
}

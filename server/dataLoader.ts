import fs from "node:fs";
import path from "node:path";
import type { AlbumDecadeKey, FigurinaPlayer } from "../shared/figutrivia";

let cachedPlayers: FigurinaPlayer[] | null = null;
let cachedById: Map<string, FigurinaPlayer> | null = null;
let cachedCountsByDecade: Record<AlbumDecadeKey, number> | null = null;
let cachedMtimeMs = 0;

function resolvePlayersPath(): string {
  const candidates = [
    path.join(process.cwd(), "client", "public", "data", "figutrivia_players.json"),
    path.join(process.cwd(), "dist", "public", "data", "figutrivia_players.json"),
    path.join(process.cwd(), "public", "data", "figutrivia_players.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("figutrivia_players.json not found");
}

function ensureLoaded() {
  const filePath = resolvePlayersPath();
  const stat = fs.statSync(filePath);
  if (cachedPlayers && stat.mtimeMs === cachedMtimeMs) return;
  cachedMtimeMs = stat.mtimeMs;
  const raw = fs.readFileSync(filePath, "utf8");
  const list = JSON.parse(raw) as FigurinaPlayer[];
  cachedPlayers = list;
  cachedById = new Map();
  cachedCountsByDecade = {
    "1980-89": 0,
    "1990-99": 0,
    "2000-09": 0,
    "2010-19": 0,
    "2020-oggi": 0,
  };
  for (const p of list) {
    cachedById.set(p.player_id, p);
    cachedCountsByDecade[p.album_decade] =
      (cachedCountsByDecade[p.album_decade] || 0) + 1;
  }
}

export function getAllPlayers(): FigurinaPlayer[] {
  ensureLoaded();
  return cachedPlayers!;
}

export function getPlayerById(playerId: string): FigurinaPlayer | undefined {
  ensureLoaded();
  return cachedById!.get(playerId);
}

export function getCountsByDecade(): Record<AlbumDecadeKey, number> {
  ensureLoaded();
  return cachedCountsByDecade!;
}

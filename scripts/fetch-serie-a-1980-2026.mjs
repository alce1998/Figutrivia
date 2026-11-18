import fs from "node:fs";
import path from "node:path";

const CACHE_DIR = path.resolve("scripts/cache");
const SEASONS_DIR = path.join(CACHE_DIR, "seasons");
const CLUBS_DIR = path.join(CACHE_DIR, "clubs");
fs.mkdirSync(SEASONS_DIR, { recursive: true });
fs.mkdirSync(CLUBS_DIR, { recursive: true });

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchCached(url, cachePath, retries = 3) {
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, "utf8");
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * attempt);
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      const text = await res.text();
      if (text.length < 2000) {
        await sleep(1500 * attempt);
        continue;
      }
      fs.writeFileSync(cachePath, text, "utf8");
      return text;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000 * attempt);
    }
  }
}

function extractTopTds(trHtml) {
  const tds = [];
  let depth = 0;
  let start = -1;
  const re = /<\/?(?:table|td)\b[^>]*>/gi;
  let m;
  while ((m = re.exec(trHtml))) {
    const tag = m[0].toLowerCase();
    if (tag.startsWith("<table")) {
      depth++;
    } else if (tag.startsWith("</table")) {
      depth--;
    } else if (depth === 0) {
      if (tag.startsWith("<td")) {
        if (start === -1) start = m.index + m[0].length;
      } else if (tag.startsWith("</td")) {
        if (start !== -1) {
          tds.push(trHtml.slice(start, m.index));
          start = -1;
        }
      }
    }
  }
  return tds;
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function normalizePosition(rawPos, tdHtml = "") {
  const s = (rawPos || "").toLowerCase();
  if (s.includes("portiere") || tdHtml.includes("bg_Torwart")) return "Portiere";
  if (
    s.includes("difens") ||
    s.includes("terzino") ||
    s.includes("libero") ||
    tdHtml.includes("bg_Abwehr")
  )
    return "Difensore";
  if (
    s.includes("centrocamp") ||
    s.includes("mediano") ||
    s.includes("trequartist") ||
    s.includes("mezzala") ||
    s.includes("interno") ||
    s.includes("ala ") ||
    s === "ala" ||
    s.includes("esterno") ||
    tdHtml.includes("bg_Mittelfeld")
  ) {
    // Note: on Transfermarkt Italian, Ala destra / Ala sinistra can be Sturm (Attaccante) if bg_Sturm
    if (tdHtml.includes("bg_Sturm")) return "Attaccante";
    return "Centrocampista";
  }
  if (
    s.includes("attacc") ||
    s.includes("punta") ||
    s.includes("seconda punta") ||
    tdHtml.includes("bg_Sturm")
  )
    return "Attaccante";
  return rawPos || "Centrocampista";
}

function getDecade(seasonYear) {
  if (seasonYear <= 1989) return "1980-89";
  if (seasonYear >= 1990 && seasonYear <= 1999) return "1990-99";
  if (seasonYear >= 2000 && seasonYear <= 2009) return "2000-09";
  if (seasonYear >= 2010 && seasonYear <= 2019) return "2010-19";
  return "2020-oggi";
}

async function runPool(items, concurrency, fn) {
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const cur = items[idx++];
      await fn(cur);
    }
  });
  await Promise.all(workers);
}

async function main() {
  // Fetch from 1955 so pre-1979 career Serie A appearances are counted
  // for everyone who played >= 1 match from 1979/80 onward.
  const startSeason = 1955;
  const endSeason = 2026;
  const clubTasks = [];

  for (let y = startSeason; y <= endSeason; y++) {
    const url = `https://www.transfermarkt.it/serie-a/startseite/wettbewerb/IT1/plus/?saison_id=${y}`;
    const html = await fetchCached(url, path.join(SEASONS_DIR, `${y}.html`));
    const matches = [
      ...html.matchAll(
        new RegExp(`href="\\/([^/"]+)\\/startseite\\/verein\\/(\\d+)\\/saison_id\\/${y}"`, "g")
      ),
    ];
    const unique = new Map();
    for (const m of matches) unique.set(m[2], m[1]);
    for (const [clubId, slug] of unique.entries()) {
      clubTasks.push({ season: y, clubId, slug });
    }
    if (y % 10 === 0) console.log(`Season ${y}: ${unique.size} clubs`);
  }

  console.log(`Total club-season pages to process: ${clubTasks.length}`);

  let done = 0;
  const players = new Map(); // player_id -> record

  await runPool(clubTasks, 6, async ({ season, clubId, slug }) => {
    const url = `https://www.transfermarkt.it/${slug}/leistungsdaten/verein/${clubId}/reldata/IT1%26${season}/plus/1`;
    const cacheFile = path.join(CLUBS_DIR, `${season}_${clubId}.html`);
    try {
      const html = await fetchCached(url, cacheFile);
      const tbodyMatch = html.match(/<table class="items">[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/);
      if (tbodyMatch) {
        const tbody = tbodyMatch[1];
        const trStarts = [...tbody.matchAll(/<tr class="(?:odd|even)">/g)].map(
          (m) => m.index
        );
        const decade = getDecade(season);

        for (let k = 0; k < trStarts.length; k++) {
          const tr = tbody.slice(trStarts[k], trStarts[k + 1] ?? tbody.length);
          const tds = extractTopTds(tr);
          if (tds.length < 6) continue;

          const id = (tds[1]?.match(/\/profil\/spieler\/(\d+)/) || [])[1];
          const rawName = (tds[1]?.match(
            /class="hide-for-small"><a[^>]*>([^<]+)<\/a>/
          ) || [])[1];
          if (!id || !rawName) continue;

          const appsStr = tds[5]?.replace(/<[^>]+>/g, "").trim();
          const apps = /^\d+$/.test(appsStr) ? parseInt(appsStr, 10) : 0;
          if (apps <= 0) continue;

          const name = decodeHtml(rawName);
          const rawPos = decodeHtml(
            (tds[1]?.match(/<tr><td>([^<]+)<\/td><\/tr>/) || [])[1] || ""
          );
          const position = normalizePosition(rawPos, tds[0] || "");
          const ageStr = tds[2]?.replace(/<[^>]+>/g, "").trim();
          const age = /^\d+$/.test(ageStr) ? parseInt(ageStr, 10) : null;
          const approxBirthYear = age !== null ? season - age : null;
          const nats = [
            ...(tds[3]?.matchAll(/title="([^"]+)"/g) || []),
          ]
            .map((m) => decodeHtml(m[1]))
            .filter(Boolean)
            .join(" ");
          const rawImg = (tds[1]?.match(/<img[^>]+src="([^"]+)"/) || [])[1] || "";
          const img = rawImg.includes("/portrait/") && !rawImg.includes("default.jpg")
            ? rawImg.replace("/small/", "/big/")
            : "";

          let rec = players.get(id);
          if (!rec) {
            rec = {
              player_id: id,
              name,
              birth_year: approxBirthYear,
              position,
              nationality: nats || "Italia",
              tm_img: img,
              total_apps: 0,
              active_since_1979: false,
              decade_apps: {
                "1980-89": 0,
                "1990-99": 0,
                "2000-09": 0,
                "2010-19": 0,
                "2020-oggi": 0,
              },
              seasons: {},
            };
            players.set(id, rec);
          }

          if (season >= 1979) rec.active_since_1979 = true;
          rec.total_apps += apps;
          rec.decade_apps[decade] += apps;
          rec.seasons[season] = (rec.seasons[season] || 0) + apps;
          if (!rec.tm_img && img) rec.tm_img = img;
          if (nats && (!rec.nationality || rec.nationality.length < nats.length)) {
            rec.nationality = nats;
          }
          if (position) rec.position = position;
          if (!rec.birth_year && approxBirthYear) rec.birth_year = approxBirthYear;
        }
      }
    } catch (e) {
      console.error(`Failed ${season}/${clubId}:`, e.message);
    }
    done++;
    if (done % 100 === 0 || done === clubTasks.length) {
      console.log(`Processed ${done}/${clubTasks.length} club-season pages (${players.size} unique players)`);
    }
  });

  const allPlayers = [...players.values()];
  const over50 = allPlayers
    .filter((p) => p.active_since_1979 && p.total_apps > 50)
    .sort((a, b) => b.total_apps - a.total_apps);

  const byDecade = {
    "1980-89": [],
    "1990-99": [],
    "2000-09": [],
    "2010-19": [],
    "2020-oggi": [],
  };

  for (const p of over50) {
    let bestDecade = "1980-89";
    let bestApps = -1;
    for (const dec of ["1980-89", "1990-99", "2000-09", "2010-19", "2020-oggi"]) {
      if (p.decade_apps[dec] > bestApps) {
        bestApps = p.decade_apps[dec];
        bestDecade = dec;
      }
    }
    p.album_decade = bestDecade;
    byDecade[bestDecade].push(p);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total players with >=1 app (1955-2026): ${allPlayers.length}`);
  console.log(`Total players active >=1979/80 with >50 career Serie A apps: ${over50.length}`);
  for (const dec of Object.keys(byDecade)) {
    console.log(`  ${dec}: ${byDecade[dec].length} players`);
  }

  fs.mkdirSync("scripts/output", { recursive: true });
  fs.writeFileSync(
    "scripts/output/raw_players_over50.json",
    JSON.stringify(over50, null, 2),
    "utf8"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

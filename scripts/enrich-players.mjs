import fs from "node:fs";
import path from "node:path";

const RAW_PATH = path.resolve("scripts/output/raw_players_over50.json");
const KO_FIG_PATH = path.resolve(
  "C:/Users/AlCe/Desktop/KickOff-trivia/client/public/data/figurine_players.json"
);
const KO_CAREERS_PATH = path.resolve(
  "C:/Users/AlCe/Desktop/KickOff-trivia/client/public/data/serie_a_players_careers_2000_2025.json"
);
const PROFILES_DIR = path.resolve("scripts/cache/profiles");
const WD_CACHE_PATH = path.resolve("scripts/cache/wikidata_p2446.json");
const WP_CACHE_PATH = path.resolve("scripts/cache/wiki_images.json");
fs.mkdirSync(PROFILES_DIR, { recursive: true });

const HEADERS = {
  "User-Agent": "FiguTriviaBot/1.0 (https://figutrivia.local; info@figutrivia.local)",
};
const TM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BAD_IMG_RE =
  /\.(svg|gif)(\?|$)|drawing|sketch|caricature|cartoon|signature|autografo|logo|crest|flag|wappen|map|monument|statue|gravestone|tomb|silhouette|default\.jpg|no_?image|placeholder|Edgard_Alvarez_28/i;

function isGoodPhotoUrl(url, width, height) {
  if (!url || BAD_IMG_RE.test(url)) return false;
  if (width && height) {
    if (width < 120 || height < 120) return false;
    // avoid ultra-wide team group banners (> 1.6 ratio) when portrait options exist
    if (width > height * 1.6) return false;
  }
  return true;
}

function stripUtm(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("utm_source");
    u.searchParams.delete("utm_campaign");
    u.searchParams.delete("utm_content");
    return u.toString();
  } catch {
    return url;
  }
}

async function fetchWikidataBatch(tmIds) {
  const sparql = `SELECT ?item ?tm ?birth ?p18 ?itTitle ?enTitle WHERE {
    VALUES ?tm { ${tmIds.map((id) => `"${id}"`).join(" ")} }
    ?item wdt:P2446 ?tm .
    OPTIONAL { ?item wdt:P569 ?birth . }
    OPTIONAL { ?item wdt:P18 ?p18 . }
    OPTIONAL { ?itArticle schema:about ?item ; schema:isPartOf <https://it.wikipedia.org/> ; schema:name ?itTitle . }
    OPTIONAL { ?enArticle schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?enTitle . }
  }`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(
        "https://query.wikidata.org/sparql?format=json&query=" +
          encodeURIComponent(sparql),
        { headers: HEADERS, signal: AbortSignal.timeout(25000) }
      );
      if (!r.ok) {
        await sleep(1500 * attempt);
        continue;
      }
      const d = await r.json();
      return d.results?.bindings || [];
    } catch {
      await sleep(1500 * attempt);
    }
  }
  return [];
}

async function fetchWikiPageImages(lang, titles) {
  if (titles.length === 0) return {};
  const out = {};
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      batch.join("|")
    )}&prop=pageimages&piprop=original|thumbnail&pithumbsize=500&redirects=1&format=json`;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(url, {
          headers: HEADERS,
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) {
          await sleep(1000 * attempt);
          continue;
        }
        const d = await r.json();
        const normMap = new Map();
        for (const n of d.query?.normalized || []) normMap.set(n.to, n.from);
        for (const red of d.query?.redirects || []) normMap.set(red.to, red.from);

        for (const page of Object.values(d.query?.pages || {})) {
          const origTitle =
            normMap.get(page.title) || page.title;
          const img = page.original || page.thumbnail;
          if (img?.source) {
            out[page.title] = {
              url: stripUtm(img.source),
              width: img.width || 0,
              height: img.height || 0,
            };
            out[origTitle] = out[page.title];
          }
        }
        break;
      } catch {
        await sleep(1000 * attempt);
      }
    }
    await sleep(120);
  }
  return out;
}

async function fetchTmProfile(playerId) {
  const cacheFile = path.join(PROFILES_DIR, `${playerId}.html`);
  let html = "";
  if (fs.existsSync(cacheFile)) {
    html = fs.readFileSync(cacheFile, "utf8");
  } else {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const r = await fetch(
          `https://www.transfermarkt.it/spieler/profil/spieler/${playerId}`,
          { headers: TM_HEADERS, signal: AbortSignal.timeout(12000) }
        );
        if (r.status === 429 || r.status >= 500) {
          await sleep(1200 * attempt);
          continue;
        }
        if (!r.ok) break;
        html = await r.text();
        if (html.length > 2000) {
          fs.writeFileSync(cacheFile, html, "utf8");
        }
        break;
      } catch {
        await sleep(800 * attempt);
      }
    }
  }
  if (!html) return null;

  // Birth date: dd/mm/yyyy inside itemprop="birthDate" or info-table
  let birthYear = null;
  const bdMatch =
    html.match(/itemprop="birthDate"[^>]*>\s*(\d{2}\/\d{2}\/(\d{4}))/) ||
    html.match(/Data di nascita:[\s\S]{0,300}?(\d{2}\/\d{2}\/(\d{4}))/) ||
    html.match(/(\d{2}\/\d{2}\/(\d{4}))\s*\(\d+\)/);
  if (bdMatch) {
    birthYear = parseInt(bdMatch[2], 10);
  }

  // Portrait image in header
  let portrait = "";
  const imgMatches = [
    ...html.matchAll(
      /https:\/\/img\.a\.transfermarkt\.technology\/portrait\/(?:header|big|medium)\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)[^"'\s<>]*/gi
    ),
  ].map((m) => m[0]);
  const validPortrait = imgMatches.find(
    (u) => !u.includes("default.jpg") && !u.includes("wappen")
  );
  if (validPortrait) {
    portrait = validPortrait
      .replace("/portrait/header/", "/portrait/big/")
      .replace("/portrait/medium/", "/portrait/big/");
  }

  return { birthYear, portrait };
}

async function runPool(items, concurrency, fn) {
  let idx = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (idx < items.length) {
        const cur = items[idx++];
        await fn(cur);
      }
    })
  );
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));
  const koFig = JSON.parse(fs.readFileSync(KO_FIG_PATH, "utf8"));
  const koCareers = JSON.parse(fs.readFileSync(KO_CAREERS_PATH, "utf8"));

  const koById = new Map(koFig.map((p) => [String(p.player_id), p]));
  const careerById = new Map(koCareers.map((p) => [String(p.player_id), p]));

  // 1. Wikidata P2446 lookup for all players not yet cached in wdMap
  let wdMap = {};
  if (fs.existsSync(WD_CACHE_PATH)) {
    wdMap = JSON.parse(fs.readFileSync(WD_CACHE_PATH, "utf8"));
  }
  const missingWdIds = raw
    .map((p) => p.player_id)
    .filter((id) => !Object.prototype.hasOwnProperty.call(wdMap, id));
  if (missingWdIds.length > 0) {
    console.log(`Querying Wikidata P2446 for ${missingWdIds.length} uncached player IDs...`);
    for (let i = 0; i < missingWdIds.length; i += 100) {
      const batch = missingWdIds.slice(i, i + 100);
      const rows = await fetchWikidataBatch(batch);
      for (const id of batch) {
        if (!wdMap[id]) wdMap[id] = null; // mark checked even if absent on Wikidata
      }
      for (const b of rows) {
        const tm = b.tm?.value;
        if (!tm) continue;
        if (!wdMap[tm]) {
          wdMap[tm] = {
            birth_year: b.birth?.value
              ? parseInt(b.birth.value.slice(0, 4), 10)
              : null,
            p18: b.p18?.value || null,
            itTitle: b.itTitle?.value || null,
            enTitle: b.enTitle?.value || null,
          };
        } else {
          if (!wdMap[tm].itTitle && b.itTitle?.value)
            wdMap[tm].itTitle = b.itTitle.value;
          if (!wdMap[tm].enTitle && b.enTitle?.value)
            wdMap[tm].enTitle = b.enTitle.value;
          if (!wdMap[tm].p18 && b.p18?.value) wdMap[tm].p18 = b.p18.value;
        }
      }
      console.log(`Wikidata P2446 batch ${Math.min(i + 100, missingWdIds.length)}/${missingWdIds.length}`);
      await sleep(250);
    }
    fs.writeFileSync(WD_CACHE_PATH, JSON.stringify(wdMap, null, 2), "utf8");
  }

  // 2. Fetch Wikipedia pageimages for any uncached titles
  let wpCache = { it: {}, en: {} };
  if (fs.existsSync(WP_CACHE_PATH)) {
    wpCache = JSON.parse(fs.readFileSync(WP_CACHE_PATH, "utf8"));
    wpCache.it = wpCache.it || {};
    wpCache.en = wpCache.en || {};
  }
  const needWp = raw.filter((p) => !koById.has(p.player_id));
  const missingItTitles = [
    ...new Set(
      needWp
        .map((p) => wdMap[p.player_id]?.itTitle)
        .filter((t) => t && !Object.prototype.hasOwnProperty.call(wpCache.it, t))
    ),
  ];
  const missingEnTitles = [
    ...new Set(
      needWp
        .map((p) => wdMap[p.player_id]?.enTitle)
        .filter((t) => t && !Object.prototype.hasOwnProperty.call(wpCache.en, t))
    ),
  ];
  if (missingItTitles.length > 0 || missingEnTitles.length > 0) {
    console.log(`Fetching missing pageimages: itwiki (${missingItTitles.length}), enwiki (${missingEnTitles.length})...`);
    const itImgs = await fetchWikiPageImages("it", missingItTitles);
    const enImgs = await fetchWikiPageImages("en", missingEnTitles);
    for (const t of missingItTitles) wpCache.it[t] = itImgs[t] || null;
    for (const t of missingEnTitles) wpCache.en[t] = enImgs[t] || null;
    Object.assign(wpCache.it, itImgs);
    Object.assign(wpCache.en, enImgs);
    fs.writeFileSync(WP_CACHE_PATH, JSON.stringify(wpCache, null, 2), "utf8");
  }

  // 3. Identify players needing exact birth_year or photo from Transfermarkt profile
  const needProfile = raw.filter((p) => {
    const ko = koById.get(p.player_id);
    const car = careerById.get(p.player_id);
    const wd = wdMap[p.player_id];
    const hasExactBirth =
      Boolean(ko?.birth_year) ||
      Boolean(car?.birth_date && /\d{4}/.test(car.birth_date)) ||
      Boolean(wd?.birth_year);
    const itImg = wd?.itTitle ? wpCache.it?.[wd.itTitle] : null;
    const enImg = wd?.enTitle ? wpCache.en?.[wd.enTitle] : null;
    const hasPhoto =
      Boolean(ko?.photo_url) ||
      (itImg && isGoodPhotoUrl(itImg.url, itImg.width, itImg.height)) ||
      (enImg && isGoodPhotoUrl(enImg.url, enImg.width, enImg.height)) ||
      Boolean(p.tm_img);
    return !hasExactBirth || !hasPhoto;
  });

  console.log(`Fetching Transfermarkt profiles for ${needProfile.length} players...`);
  let pDone = 0;
  const tmProfiles = new Map();
  await runPool(needProfile, 5, async (p) => {
    const info = await fetchTmProfile(p.player_id);
    if (info) tmProfiles.set(p.player_id, info);
    pDone++;
    if (pDone % 50 === 0 || pDone === needProfile.length) {
      console.log(`Profiles: ${pDone}/${needProfile.length}`);
    }
  });

  // 4. Assemble enriched players
  let stats = { ko: 0, itwiki: 0, enwiki: 0, tm: 0, p18: 0, missing: 0 };
  const enriched = raw.map((p) => {
    const ko = koById.get(p.player_id);
    const car = careerById.get(p.player_id);
    const wd = wdMap[p.player_id];
    const tmProf = tmProfiles.get(p.player_id);

    let exactBirthYear = p.birth_year;
    if (ko?.birth_year) exactBirthYear = ko.birth_year;
    else if (car?.birth_date && /(\d{2})\/(\d{2})\/(\d{4})/.test(car.birth_date)) {
      exactBirthYear = parseInt(car.birth_date.match(/(\d{4})/)[1], 10);
    } else if (wd?.birth_year) {
      exactBirthYear = wd.birth_year;
    } else if (tmProf?.birthYear) {
      exactBirthYear = tmProf.birthYear;
    }

    let photoSource = null;
    let photoKind = "none";

    if (ko?.photo_url) {
      photoSource = ko.photo_url; // already obfuscated or /players/p_...
      photoKind = "ko";
      stats.ko++;
    } else {
      const itImg = wd?.itTitle ? wpCache.it?.[wd.itTitle] : null;
      const enImg = wd?.enTitle ? wpCache.en?.[wd.enTitle] : null;
      const tmImg = tmProf?.portrait || p.tm_img || "";

      // Prefer it.wikipedia.org classic player card photos when portrait-ish, OR Transfermarkt clean portrait
      // Note: For older players (1980-99), itwiki almost always has playing-kit photos, whereas tm often has current-age suit photos.
      // For modern players (2010-oggi), Transfermarkt portraits are super crisp jersey headshots!
      if (
        p.album_decade !== "2020-oggi" &&
        p.album_decade !== "2010-19" &&
        itImg &&
        isGoodPhotoUrl(itImg.url, itImg.width, itImg.height)
      ) {
        photoSource = itImg.url;
        photoKind = "itwiki";
        stats.itwiki++;
      } else if (tmImg && isGoodPhotoUrl(tmImg)) {
        photoSource = tmImg;
        photoKind = "tm";
        stats.tm++;
      } else if (itImg && isGoodPhotoUrl(itImg.url, itImg.width, itImg.height)) {
        photoSource = itImg.url;
        photoKind = "itwiki";
        stats.itwiki++;
      } else if (enImg && isGoodPhotoUrl(enImg.url, enImg.width, enImg.height)) {
        photoSource = enImg.url;
        photoKind = "enwiki";
        stats.enwiki++;
      } else if (wd?.p18 && isGoodPhotoUrl(wd.p18)) {
        photoSource = wd.p18.replace("http://", "https://");
        photoKind = "p18";
        stats.p18++;
      } else {
        stats.missing++;
      }
    }

    return {
      player_id: p.player_id,
      name: ko?.name || p.name,
      birth_year: exactBirthYear,
      nationality: ko?.nationality || p.nationality,
      position: ko?.position || p.position,
      serie_a_apps: p.total_apps,
      decade_apps: p.decade_apps,
      album_decade: p.album_decade,
      photo_source: photoSource,
      photo_kind: photoKind,
      wd_birth_year: wd?.birth_year || null,
      itTitle: wd?.itTitle || null,
    };
  });

  console.log("Enrichment photo breakdown:", stats);
  const missingList = enriched.filter((p) => !p.photo_source);
  console.log("Top 25 missing photo:", missingList.slice(0, 25).map((p) => `${p.player_id} ${p.name} (${p.serie_a_apps}, ${p.album_decade}, by=${p.birth_year})`));

  fs.writeFileSync(
    "scripts/output/enriched_players.json",
    JSON.stringify(enriched, null, 2),
    "utf8"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

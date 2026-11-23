import fs from "node:fs";
import path from "node:path";

const ENRICHED_PATH = path.resolve("scripts/output/enriched_players.json");
const RAW_PATH = path.resolve("scripts/output/raw_players_over50.json");
const PLAYERS_IMG_DIR = path.resolve("client/public/players");
const OUT_JSON_PATH = path.resolve("client/public/data/figutrivia_players.json");

fs.mkdirSync(PLAYERS_IMG_DIR, { recursive: true });
fs.mkdirSync(path.dirname(OUT_JSON_PATH), { recursive: true });

const OBF_KEY = "KOT2026";
function encodeObf(url) {
  if (!url) return "";
  if (url.startsWith("obf:")) return url;
  const buf = Buffer.from(url, "utf8");
  return (
    "obf:" +
    Buffer.from(
      buf.map((v, i) => v ^ OBF_KEY.charCodeAt(i % OBF_KEY.length))
    ).toString("base64")
  );
}

function normalizeFinalPosition(pos) {
  const s = (pos || "").toLowerCase();
  if (s === "porta" || s.includes("portier")) return "Portiere";
  if (s === "difesa" || s.includes("difens") || s.includes("terzin") || s.includes("libero")) return "Difensore";
  if (s === "attacco" || s.includes("attacc") || s.includes("punta")) return "Attaccante";
  return "Centrocampista";
}

function isValidImageBuffer(buf) {
  if (!buf || buf.length < 400) return false;
  // JPEG FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return true;
  // RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  )
    return true;
  return false;
}

const OVERRIDES = {
  "223470": {
    photo_source:
      "https://upload.wikimedia.org/wikipedia/it/4/42/Roberto_Lorenzini_-_Milan_AC_1986-87.png",
    photo_kind: "itwiki",
  },
  "240934": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/240934-1661515180.jpg",
    photo_kind: "tm",
  },
  "555015": {
    name: "Ruan Tressoldi",
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/555015-1695028065.jpg",
    photo_kind: "tm",
  },
  "255744": {
    name: "Samir",
  },
  "102150": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/s_102150_123_2013_10_02_1.jpg",
    photo_kind: "tm",
  },
  "101046": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/s_101046_123_2012_1.jpg",
    photo_kind: "tm",
  },
  "226495": {
    birth_year: 1965,
    photo_source:
      "https://upload.wikimedia.org/wikipedia/it/c/c7/Alessandro_Nista_-_Ancona_Calcio_1991-92.jpg",
    photo_kind: "itwiki",
  },
  "631139": {
    birth_year: 1967,
    photo_source:
      "https://upload.wikimedia.org/wikipedia/it/c/cb/Francesco_Palmieri_US_Lecce.jpg",
    photo_kind: "itwiki",
  },
  "12565": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/47827-1468587325.jpg",
    photo_kind: "tm",
  },
  "6016": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/45055-1539438607.jpg",
    photo_kind: "tm",
  },
  "20982": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/42092-1441286675.png",
    photo_kind: "tm",
  },
  "17149": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/39093-1441282978.jpg",
    photo_kind: "tm",
  },
  "169647": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/4823-1716543758.png",
    photo_kind: "tm",
  },
  "22248": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/38585-1724690236.jpg",
    photo_kind: "tm",
  },
  "227707": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/54415-1673222330.jpg",
    photo_kind: "tm",
  },
  "223479": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/_1396853109.jpg",
    photo_kind: "tm",
  },
  "21868": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/_1366792959.jpg",
    photo_kind: "tm",
  },
  "223473": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/61741-1746181235.jpg",
    photo_kind: "tm",
  },
  "6406": {
    photo_source:
      "https://img.a.transfermarkt.technology/portrait/big/50687-1739448039.jpg",
    photo_kind: "tm",
  },
  "395796": {
    photo_source:
      "https://upload.wikimedia.org/wikipedia/it/c/c9/Antonio_Logozzo_-_Cagliari_Calcio_1981-82.jpg",
    photo_kind: "itwiki",
  },
  "145345": {
    photo_source:
      "https://upload.wikimedia.org/wikipedia/commons/e/ef/Fabio_Capello_Novara_-_Milan_1976.jpg",
    photo_kind: "itwiki",
  },
  "148438": {
    photo_source:
      "https://upload.wikimedia.org/wikipedia/commons/a/ab/Marcello_Lippi_-_1970s_-_UC_Sampdoria.jpg",
    photo_kind: "itwiki",
  },
  "148416": {
    photo_source:
      "https://upload.wikimedia.org/wikipedia/it/8/8b/Luigi_Delneri_-_Udinese_Calcio.jpg",
    photo_kind: "itwiki",
  },
  "301985": {
    photo_source:
      "https://upload.wikimedia.org/wikipedia/commons/2/2f/Juventus_FC_-_1974_-_Fernando_Viola.jpg",
    photo_kind: "itwiki",
  },
  "431087": {
    photo_source:
      "https://upload.wikimedia.org/wikipedia/commons/9/90/Ernesto_Galli_al_Brescia.jpg",
    photo_kind: "itwiki",
  },
  // 26 missing photos (1980-89, 1990-99, 2000-09) downloaded locally for CORS-safe Canvas rendering
  "227679": {
    photo_source:
      "https://www.carrierecalciatori.it/data/public/image/mozzini%20roberto.jpg",
    photo_kind: "tm",
  },
  "227392": {
    photo_source:
      "https://www.carrierecalciatori.it/data/public/image/imgres_147.jpg",
    photo_kind: "tm",
  },
  "226435": {
    photo_source:
      "https://www.carrierecalciatori.it/data/public/image/a_2.jpg",
    photo_kind: "tm",
  },
  "336552": {
    photo_source:
      "https://www.carrierecalciatori.it/data/public/image/salvioni.jpg",
    photo_kind: "tm",
  },
  "6753": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/sacchetti_ste.jpg",
    photo_kind: "tm",
  },
  "227673": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/2367MANIGHETTI.jpg",
    photo_kind: "tm",
  },
  "22200": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/lamacchi%20gianluca.jpg",
    photo_kind: "tm",
  },
  "226405": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/bianchinidavid.jpg",
    photo_kind: "tm",
  },
  "223334": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/bellucci%20francesco.jpg",
    photo_kind: "tm",
  },
  "222792": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/marangonnicola.jpg",
    photo_kind: "tm",
  },
  "228242": {
    photo_source:
      "https://www.carrierecalciatori.it/data/public/image/ricci%20gianluca.jpg",
    photo_kind: "tm",
  },
  "6063": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/falsini.jpg",
    photo_kind: "tm",
  },
  "6037": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/balestri_jac.jpg",
    photo_kind: "tm",
  },
  "5932": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/24-FEDERICO-COSSATO(1).jpg",
    photo_kind: "tm",
  },
  "20739": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/langellalutunt.jpg",
    photo_kind: "tm",
  },
  "16747": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/balli%20daniele.jpg",
    photo_kind: "tm",
  },
  "5919": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/lazeticnikola.jpg",
    photo_kind: "tm",
  },
  "6064": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/morabito.jpg",
    photo_kind: "tm",
  },
  "192805": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/giorgettirodolfo.jpg",
    photo_kind: "tm",
  },
  "21788": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/edusei_mar.jpg",
    photo_kind: "tm",
  },
  "22189": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/brevi%20ezio.jpg",
    photo_kind: "tm",
  },
  "20725": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/abeijon%20123.jpg",
    photo_kind: "tm",
  },
  "21147": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/devezze.jpg",
    photo_kind: "tm",
  },
  "19441": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/gonnella.jpg",
    photo_kind: "tm",
  },
  "20729": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/capone%20andrea%20123.jpg",
    photo_kind: "tm",
  },
  "21190": {
    photo_source:
      "https://www.tuttocalciatori.net/fotocalciatori/vanigli.jpg",
    photo_kind: "tm",
  },
};

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
  const enriched = JSON.parse(fs.readFileSync(ENRICHED_PATH, "utf8"));
  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));
  const rawById = new Map(raw.map((r) => [r.player_id, r]));

  // Apply overrides
  for (const p of enriched) {
    const ov = OVERRIDES[p.player_id];
    if (ov) {
      if (ov.name) p.name = ov.name;
      if (ov.birth_year) p.birth_year = ov.birth_year;
      if (ov.photo_source) p.photo_source = ov.photo_source;
      if (ov.photo_kind) p.photo_kind = ov.photo_kind;
    }
  }

  // Download all Transfermarkt / TuttoCalciatori / CarriereCalciatori portraits locally
  const tmPlayers = enriched.filter(
    (p) =>
      p.photo_source &&
      (p.photo_source.includes("transfermarkt.technology") ||
        p.photo_source.includes("tuttocalciatori.net") ||
        p.photo_source.includes("carrierecalciatori.it"))
  );
  console.log(`Downloading ${tmPlayers.length} Transfermarkt portraits locally...`);
  let okCount = 0;
  let failCount = 0;
  let done = 0;

  await runPool(tmPlayers, 6, async (p) => {
    const localName = `p_${p.player_id}.jpg`;
    const localPath = path.join(PLAYERS_IMG_DIR, localName);
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      if (isValidImageBuffer(buf)) {
        p.photo_source = `/players/${localName}`;
        okCount++;
        done++;
        return;
      }
    }
    try {
      const r = await fetch(p.photo_source, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (isValidImageBuffer(buf)) {
          fs.writeFileSync(localPath, buf);
          p.photo_source = `/players/${localName}`;
          okCount++;
        } else {
          failCount++;
          p.photo_source = "";
        }
      } else {
        failCount++;
        p.photo_source = "";
      }
    } catch {
      failCount++;
      p.photo_source = "";
    }
    done++;
    if (done % 100 === 0 || done === tmPlayers.length) {
      console.log(`TM download progress: ${done}/${tmPlayers.length} (ok=${okCount}, fail=${failCount})`);
    }
  });

  // Sort globally by serie_a_apps descending to compute global_rank
  enriched.sort((a, b) => b.serie_a_apps - a.serie_a_apps || a.name.localeCompare(b.name));

  const DECADES = ["1980-89", "1990-99", "2000-09", "2010-19", "2020-oggi"];
  const numeroByDecade = Object.fromEntries(DECADES.map((d) => [d, 0]));

  const finalPlayers = enriched.map((p, idx) => {
    const dec = p.album_decade;
    numeroByDecade[dec] = (numeroByDecade[dec] || 0) + 1;
    const rawRec = rawById.get(p.player_id);
    return {
      numero: numeroByDecade[dec],
      global_rank: idx + 1,
      player_id: p.player_id,
      name: p.name,
      birth_year: p.birth_year,
      photo_url: encodeObf(p.photo_source || ""),
      serie_a_apps: p.serie_a_apps,
      decade_apps: rawRec?.decade_apps || p.decade_apps,
      album_decade: dec,
      nationality: p.nationality || "Italia",
      position: normalizeFinalPosition(p.position),
    };
  });

  // Sort final output grouped by album decade in chronological order, then numero ascending
  const decOrder = Object.fromEntries(DECADES.map((d, i) => [d, i]));
  finalPlayers.sort(
    (a, b) =>
      decOrder[a.album_decade] - decOrder[b.album_decade] || a.numero - b.numero
  );

  fs.writeFileSync(OUT_JSON_PATH, JSON.stringify(finalPlayers, null, 2), "utf8");

  const withPhoto = finalPlayers.filter((p) => p.photo_url).length;
  console.log(`\n=== FINAL DATASET ===`);
  console.log(`Total players (active >=1979/80, >50 career Serie A apps): ${finalPlayers.length}`);
  console.log(`With verified photo: ${withPhoto}/${finalPlayers.length}`);
  for (const d of DECADES) {
    console.log(`  ${d}: ${numeroByDecade[d]} players`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

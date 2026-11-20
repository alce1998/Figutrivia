import React from "react";

const FLAG_BY_COUNTRY: Record<string, string> = {
  Italia: "🇮🇹",
  Argentina: "🇦🇷",
  Slovenia: "🇸🇮",
  "Macedonia del Nord": "🇲🇰",
  Francia: "🇫🇷",
  Polonia: "🇵🇱",
  Slovacchia: "🇸🇰",
  Colombia: "🇨🇴",
  Inghilterra: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Olanda: "🇳🇱",
  "Paesi Bassi": "🇳🇱",
  Suriname: "🇸🇷",
  Cile: "🇨🇱",
  Germania: "🇩🇪",
  "Germania Ovest": "🇩🇪",
  "Germania Est": "🇩🇪",
  Serbia: "🇷🇸",
  "Serbia e Montenegro": "🇷🇸",
  Jugoslavia: "🇷🇸",
  Belgio: "🇧🇪",
  Spagna: "🇪🇸",
  "Repubblica Ceca": "🇨🇿",
  Cecoslovacchia: "🇨🇿",
  Canada: "🇨🇦",
  Croazia: "🇭🇷",
  Brasile: "🇧🇷",
  Romania: "🇷🇴",
  Danimarca: "🇩🇰",
  Svezia: "🇸🇪",
  Ghana: "🇬🇭",
  Albania: "🇦🇱",
  Uruguay: "🇺🇾",
  Montenegro: "🇲🇪",
  Svizzera: "🇨🇭",
  Finlandia: "🇫🇮",
  Kosovo: "🇽🇰",
  Turchia: "🇹🇷",
  Somalia: "🇸🇴",
  Venezuela: "🇻🇪",
  "Bosnia-Erzegovina": "🇧🇦",
  Lussemburgo: "🇱🇺",
  Portogallo: "🇵🇹",
  Australia: "🇦🇺",
  Martinica: "🇲🇶",
  Senegal: "🇸🇳",
  "Guinea-Bissau": "🇬🇼",
  "Guinea Equatoriale": "🇬🇶",
  Guinea: "🇬🇳",
  Ucraina: "🇺🇦",
  "Unione Sovietica": "🇷🇺",
  Grecia: "🇬🇷",
  Armenia: "🇦🇲",
  Moldavia: "🇲🇩",
  "Costa d'Avorio": "🇨🇮",
  Indonesia: "🇮🇩",
  Guadalupa: "🇬🇵",
  Austria: "🇦🇹",
  Nigeria: "🇳🇬",
  Bulgaria: "🇧🇬",
  Ungheria: "🇭🇺",
  Giappone: "🇯🇵",
  "Stati Uniti": "🇺🇸",
  Islanda: "🇮🇸",
  Algeria: "🇩🇿",
  Messico: "🇲🇽",
  "Guiana francese": "🇬🇫",
  Marocco: "🇲🇦",
  Russia: "🇷🇺",
  Norvegia: "🇳🇴",
  "RD del Congo": "🇨🇩",
  Congo: "🇨🇬",
  Perù: "🇵🇪",
  Honduras: "🇭🇳",
  Gambia: "🇬🇲",
  Uzbekistan: "🇺🇿",
  "Sierra Leone": "🇸🇱",
  Costarica: "🇨🇷",
  "Costa Rica": "🇨🇷",
  Cipro: "🇨🇾",
  Camerun: "🇨🇲",
  Ecuador: "🇪🇨",
  Lituania: "🇱🇹",
  Giamaica: "🇯🇲",
  Liechtenstein: "🇱🇮",
  Mali: "🇲🇱",
  Scozia: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Zambia: "🇿🇲",
  Tunisia: "🇹🇳",
  Paraguay: "🇵🇾",
  "Nuova Zelanda": "🇳🇿",
  Georgia: "🇬🇪",
  Egitto: "🇪🇬",
  Guyana: "🇬🇾",
  Sudafrica: "🇿🇦",
  "Burkina Faso": "🇧🇫",
  Kenia: "🇰🇪",
  Kenya: "🇰🇪",
  Angola: "🇦🇴",
  Iraq: "🇮🇶",
  Panama: "🇵🇦",
  Estonia: "🇪🇪",
  Zimbabwe: "🇿🇼",
  Chad: "🇹🇩",
  "Repubblica Centrafricana": "🇨🇫",
  "San Marino": "🇸🇲",
  "Capo Verde": "🇨🇻",
  Riunione: "🇷🇪",
  "Corea del Sud": "🇰🇷",
  Togo: "🇹🇬",
  Bielorussia: "🇧🇾",
  Kazakistan: "🇰🇿",
  Iran: "🇮🇷",
  Galles: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Irlanda del Nord": "🇬🇧",
  Irlanda: "🇮🇪",
  Liberia: "🇱🇷",
  Israele: "🇮🇱",
  Mozambico: "🇲🇿",
  Cina: "🇨🇳",
  Libia: "🇱🇾",
  Libano: "🇱🇧",
  Aruba: "🇦🇼",
  Benin: "🇧🇯",
};

const COUNTRY_NAMES = Object.keys(FLAG_BY_COUNTRY).sort(
  (a, b) => b.length - a.length
);

export interface ParsedCountry {
  name: string;
  emoji: string;
  isoCode: string;
}

function emojiToIsoCode(emoji: string): string {
  if (emoji === "🏴󠁧󠁢󠁥󠁮󠁧󠁿") return "gb-eng";
  if (emoji === "🏴󠁧󠁢󠁳󠁣󠁴󠁿") return "gb-sct";
  if (emoji === "🏴󠁧󠁢󠁷󠁬󠁳󠁿") return "gb-wls";
  const chars = Array.from(emoji);
  if (chars.length === 2) {
    const c1 = chars[0].codePointAt(0) ?? 0;
    const c2 = chars[1].codePointAt(0) ?? 0;
    if (c1 >= 0x1f1e6 && c1 <= 0x1f1ff && c2 >= 0x1f1e6 && c2 <= 0x1f1ff) {
      return (
        String.fromCharCode(c1 - 0x1f1e6 + 97) +
        String.fromCharCode(c2 - 0x1f1e6 + 97)
      );
    }
  }
  return "it";
}

export function parseCountries(nationality: string): ParsedCountry[] {
  let rest = nationality || "";
  const out: ParsedCountry[] = [];
  while (rest.trim()) {
    const r = rest.trim();
    const hit = COUNTRY_NAMES.find((n) => r.startsWith(n));
    if (hit) {
      const emoji = FLAG_BY_COUNTRY[hit];
      out.push({
        name: hit,
        emoji,
        isoCode: emojiToIsoCode(emoji),
      });
      rest = r.slice(hit.length);
    } else {
      const i = r.indexOf(" ");
      rest = i === -1 ? "" : r.slice(i + 1);
    }
  }
  return out;
}

export function getFlags(nationality: string): string {
  return parseCountries(nationality)
    .map((c) => c.emoji)
    .join(" ");
}

export function getFirstFlag(nationality: string): string {
  const first = parseCountries(nationality)[0];
  return first ? first.emoji : "🏳️";
}

export function getFirstCountryName(nationality: string): string {
  const first = parseCountries(nationality)[0];
  return first ? first.name : (nationality || "").split(" ")[0] || "Italia";
}

/**
 * Renders real SVG/PNG flag image(s) (works on Windows PC where Unicode flag emojis are not supported,
 * as well as Mac, Android, and iOS).
 */
export function CountryFlag({
  nationality,
  onlyFirst = false,
  showNameOnDesktop = false,
  size = "md",
}: {
  nationality: string;
  onlyFirst?: boolean;
  showNameOnDesktop?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const countries = parseCountries(nationality);
  const list = onlyFirst ? countries.slice(0, 1) : countries;
  if (list.length === 0) {
    return <span>{nationality}</span>;
  }

  const dim =
    size === "sm"
      ? "w-3.5 h-2.5"
      : size === "lg"
        ? "w-5 h-3.5"
        : "w-4 h-3";

  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {list.map((c, idx) => (
        <span key={`${c.isoCode}-${idx}`} className="inline-flex items-center gap-1">
          <img
            src={`https://flagcdn.com/w40/${c.isoCode}.png`}
            alt={c.name}
            title={c.name}
            className={`${dim} object-cover border border-black/40 inline-block flex-shrink-0`}
          />
          {showNameOnDesktop && (
            <span className="hidden sm:inline">{c.name}</span>
          )}
        </span>
      ))}
    </span>
  );
}

type OverlayProps = {
  playerName: string;
  nationality: string;
  role: string;
  size?: "sm" | "lg";
};

export function FigurinaSolvedOverlay({
  playerName,
  nationality,
  role,
  size = "sm",
}: OverlayProps) {
  const sm = size === "sm";
  const serif = { fontFamily: "'Georgia', 'Times New Roman', serif" };
  return (
    <div className="absolute inset-0 z-[15] pointer-events-none">
      <div
        className="absolute inset-0 border-[#f1e4c3]"
        style={{
          borderWidth: sm ? 3 : 8,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6)",
        }}
      />
      <div
        className="absolute left-1 top-1 bg-[#f1e4c3] text-black border border-black px-1 py-0.5 leading-tight flex items-center"
        style={{ ...serif }}
      >
        <CountryFlag nationality={nationality} size={sm ? "sm" : "lg"} />
      </div>
      <div
        className="absolute right-1 top-1 bg-[#f1e4c3] text-black border border-black px-1 uppercase font-bold tracking-wide leading-tight"
        style={{ ...serif, fontSize: sm ? 8 : 12 }}
      >
        {role}
      </div>
      <div
        className="absolute bottom-0 left-0 w-full bg-black text-white text-center uppercase font-bold tracking-wider truncate"
        style={{
          ...serif,
          fontSize: sm ? 10 : 18,
          padding: sm ? "4px 2px" : "10px 6px",
          borderTop: "2px solid #f1e4c3",
        }}
      >
        {playerName}
      </div>
    </div>
  );
}

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
  Serbia: "🇷🇸",
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
  "Guinea Equatoriale": "🇬🇶",
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
  Irlanda: "🇮🇪",
  "Irlanda del Nord": "🇬🇧",
  Liberia: "🇱🇷",
  Israele: "🇮🇱",
  Mozambico: "🇲🇿",
  Cina: "🇨🇳",
};

const COUNTRY_NAMES = Object.keys(FLAG_BY_COUNTRY).sort(
  (a, b) => b.length - a.length
);

export function getFlags(nationality: string): string {
  let rest = nationality || "";
  const flags: string[] = [];
  while (rest.trim()) {
    const r = rest.trim();
    const hit = COUNTRY_NAMES.find((n) => r.startsWith(n));
    if (hit) {
      flags.push(FLAG_BY_COUNTRY[hit]);
      rest = r.slice(hit.length);
    } else {
      const i = r.indexOf(" ");
      rest = i === -1 ? "" : r.slice(i + 1);
    }
  }
  return flags.join(" ");
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
  const flags = getFlags(nationality);
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
        className="absolute left-1 top-1 bg-[#f1e4c3] text-black border border-black px-1 leading-tight"
        style={{ ...serif, fontSize: sm ? 10 : 16 }}
      >
        {flags}
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

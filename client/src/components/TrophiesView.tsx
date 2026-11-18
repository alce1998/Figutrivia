import React from "react";
import { CheckCircle2, Lock, Puzzle, Trophy } from "lucide-react";
import {
  ALBUM_DECADES,
  TROPHIES,
  getAlbumSections,
  type AlbumDecadeKey,
  type FigurinaPlayer,
} from "@shared/figutrivia";

interface TrophiesViewProps {
  players: FigurinaPlayer[];
  solvedSet: Set<string>;
  totalSolved: number;
  solvedByDecade: Record<AlbumDecadeKey, number>;
  totalsByDecade: Record<AlbumDecadeKey, number>;
  unlockedIds: Set<string>;
}

/**
 * Renders a trophy split into `totalParts` horizontal bands (from bottom base = part 1 up to top cup/crown = part N)
 * that light up in gold as each section of the album is completed.
 */
function SegmentedTrophyGraphic({
  completedFlags,
}: {
  completedFlags: boolean[];
}) {
  const n = Math.max(1, completedFlags.length);
  const uid = React.useId().replace(/:/g, "");

  return (
    <div className="relative w-12 h-14 flex-shrink-0 border-2 border-black bg-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden">
      <svg viewBox="0 0 64 72" className="w-10 h-12">
        <defs>
          {completedFlags.map((_, idx) => {
            // Part 0 (first section 1-150) lights up the top band or bottom-up band:
            // Let's map section idx (0..n-1) from top to bottom of the trophy so Part 1 (1-150) is the top Rim/Crown,
            // Part 2 is Upper Cup, Part 3 is Stem, Part 4 is Base — or each completed section lights up its corresponding piece!
            const bandH = 72 / n;
            const y = idx * bandH;
            return (
              <clipPath key={idx} id={`clip-${uid}-${idx}`}>
                <rect x="0" y={y} width="64" height={bandH + 0.5} />
              </clipPath>
            );
          })}
        </defs>

        {completedFlags.map((done, idx) => {
          const fill = done ? "#fbbf24" : "#374151";
          const accent = done ? "#f59e0b" : "#4b5563";
          const stroke = "#000000";
          return (
            <g key={idx} clipPath={`url(#clip-${uid}-${idx})`}>
              {/* Left & right handles */}
              <path
                d="M14 14 H6 V26 C6 33 12 37 18 37 H20 V31 H17 C14 31 12 29 12 25 V20 H14 Z"
                fill={accent}
                stroke={stroke}
                strokeWidth="2"
              />
              <path
                d="M50 14 H58 V26 C58 33 52 37 46 37 H44 V31 H47 C50 31 52 29 52 25 V20 H50 Z"
                fill={accent}
                stroke={stroke}
                strokeWidth="2"
              />
              {/* Main cup body */}
              <path
                d="M14 8 H50 V26 C50 39 42 46 32 46 C22 46 14 39 14 26 Z"
                fill={fill}
                stroke={stroke}
                strokeWidth="2.5"
              />
              {/* Star on cup */}
              <polygon
                points="32,16 34.9,22 41.5,22.9 36.7,27.5 37.9,34 32,30.9 26.1,34 27.3,27.5 22.5,22.9 29.1,22"
                fill={done ? "#ffffff" : "#6b7280"}
                stroke={stroke}
                strokeWidth="1.5"
              />
              {/* Stem */}
              <rect
                x="28"
                y="45"
                width="8"
                height="12"
                fill={accent}
                stroke={stroke}
                strokeWidth="2.5"
              />
              {/* Pedestal step */}
              <rect
                x="20"
                y="56"
                width="24"
                height="5"
                fill={fill}
                stroke={stroke}
                strokeWidth="2.5"
              />
              {/* Base */}
              <rect
                x="14"
                y="61"
                width="36"
                height="7"
                fill={accent}
                stroke={stroke}
                strokeWidth="2.5"
              />
            </g>
          );
        })}

        {/* Horizontal puzzle slice lines showing the trophy parts */}
        {Array.from({ length: n - 1 }).map((_, i) => {
          const y = Math.round(((i + 1) * 72) / n);
          return (
            <line
              key={i}
              x1="4"
              y1={y}
              x2="60"
              y2={y}
              stroke="#111827"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          );
        })}
      </svg>
    </div>
  );
}

export function TrophiesView({
  players,
  solvedSet,
  totalSolved,
  solvedByDecade,
  totalsByDecade,
  unlockedIds,
}: TrophiesViewProps) {
  const milestones = TROPHIES.filter((t) => t.category === "milestone");
  const albumTrophies = TROPHIES.filter((t) => t.category === "album");
  const totalSitePlayers = players.length || 2517;

  return (
    <div className="space-y-6">
      {/* Punteggi per fascia presenze */}
      <div className="bg-amber-50 border-4 border-black p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="font-display font-black uppercase text-sm mb-2">
          Sistema Punteggio Punti Indizio per Presenze in Serie A
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {[
            { range: "+400 presenze", pts: "1 pt" },
            { range: "300–399 presenze", pts: "2 pt" },
            { range: "200–299 presenze", pts: "3 pt" },
            { range: "100–199 presenze", pts: "4 pt" },
            { range: "51–99 presenze", pts: "5 pt" },
          ].map((row) => (
            <div
              key={row.range}
              className="bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="text-[10px] font-bold uppercase text-gray-600">
                {row.range}
              </div>
              <div className="font-display font-black text-base text-amber-600">
                +{row.pts}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestone nomi trovati */}
      <section className="space-y-3">
        <h3 className="font-display font-black uppercase text-base flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Milestone Giocatori Trovati ({totalSolved} / {totalSitePlayers})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {milestones.map((t) => {
            const target = t.isAllPlayers
              ? totalSitePlayers
              : (t.threshold ?? 100);
            const desc = t.isAllPlayers
              ? `Trova tutti i ${totalSitePlayers.toLocaleString("it-IT")} giocatori presenti sul sito`
              : t.description;
            const unlocked = unlockedIds.has(t.id) || totalSolved >= target;
            const pct =
              target > 0
                ? Math.min(100, Math.round((totalSolved / target) * 100))
                : 0;
            return (
              <div
                key={t.id}
                className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  unlocked ? "bg-emerald-50" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <div className="font-display font-black uppercase text-sm">
                        {t.title}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">
                        {desc}
                      </div>
                    </div>
                  </div>
                  {unlocked ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span>
                      {Math.min(totalSolved, target)} / {target}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 border border-black">
                    <div
                      className={`h-full ${
                        unlocked ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Completamento Album per Decennio con Parti di Trofeo per Sezione */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-black uppercase text-base flex items-center gap-2">
            <Trophy className="w-5 h-5 text-rose-600" />
            Trofei Album per Decennio (Componibili per Sezione)
          </h3>
          <span className="text-xs font-bold bg-amber-100 border-2 border-black px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            🧩 Completa ogni sezione (1–150, 151–300…) per sbloccare una parte
            del trofeo!
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {albumTrophies.map((t) => {
            const dec = t.decade!;
            const info = ALBUM_DECADES.find((d) => d.key === dec)!;
            const solved = solvedByDecade[dec] || 0;
            const total = totalsByDecade[dec] || 0;
            const unlocked =
              unlockedIds.has(t.id) || (total > 0 && solved >= total);
            const pct = total > 0 ? Math.round((solved / total) * 100) : 0;

            const decPlayers = players.filter((p) => p.album_decade === dec);
            const sections = getAlbumSections(dec, total);
            const sectionStats = sections.map((sec) => {
              const solvedInSec = decPlayers.filter(
                (p) =>
                  p.numero >= sec.min &&
                  p.numero <= sec.max &&
                  solvedSet.has(p.player_id)
              ).length;
              const secUnlocked =
                unlockedIds.has(sec.id) ||
                (sec.count > 0 && solvedInSec >= sec.count);
              const secPct =
                sec.count > 0
                  ? Math.min(100, Math.round((solvedInSec / sec.count) * 100))
                  : 0;
              return {
                ...sec,
                solvedInSec,
                secUnlocked,
                secPct,
              };
            });

            const completedParts = sectionStats.filter(
              (s) => s.secUnlocked
            ).length;

            return (
              <div
                key={t.id}
                className={`border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between ${
                  unlocked ? "bg-emerald-50" : "bg-white"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <SegmentedTrophyGraphic
                        completedFlags={sectionStats.map((s) => s.secUnlocked)}
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-black uppercase px-1.5 py-0.5 border border-black ${info.badgeColor}`}
                          >
                            {info.label}
                          </span>
                          <span className="text-[11px] font-black uppercase bg-gray-900 text-amber-400 px-2 py-0.5 border border-black">
                            Parti Trofeo: {completedParts}/{sectionStats.length}
                          </span>
                        </div>
                        <div className="font-display font-black uppercase text-sm mt-1">
                          {t.title}
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          {info.subtitle}
                        </div>
                      </div>
                    </div>
                    {unlocked ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Barra progresso intero album */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span>
                         Totale Album: {solved} / {total} figurine
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 border border-black">
                      <div
                        className={`h-full ${
                          unlocked ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestone interne per ogni sezione dell'album */}
                  <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300 space-y-2">
                    <div className="text-[11px] font-black uppercase text-gray-700 flex items-center gap-1">
                      <Puzzle className="w-3.5 h-3.5 text-amber-600" />
                      Sezioni del Trofeo ({completedParts}/{sectionStats.length}{" "}
                      completate)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {sectionStats.map((sec) => (
                        <div
                          key={sec.id}
                          className={`border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                            sec.secUnlocked
                              ? "bg-amber-300 text-black"
                              : "bg-gray-50 text-gray-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-display font-black text-[10px] uppercase">
                              Parte {sec.index}/{sectionStats.length}
                            </span>
                            {sec.secUnlocked ? (
                              <span className="text-xs" title="Parte sbloccata">
                                🏆
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-500">
                                {sec.secPct}%
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-black mt-0.5">
                            Sez. {sec.label}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-gray-700">
                            {sec.solvedInSec}/{sec.count}
                          </div>
                          <div className="w-full h-1.5 bg-white border border-black mt-1">
                            <div
                              className={`h-full ${
                                sec.secUnlocked
                                  ? "bg-emerald-600"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${sec.secPct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

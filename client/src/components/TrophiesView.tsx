import React from "react";
import { CheckCircle2, Lock, Trophy } from "lucide-react";
import {
  ALBUM_DECADES,
  TROPHIES,
  type AlbumDecadeKey,
} from "@shared/figutrivia";

interface TrophiesViewProps {
  totalSolved: number;
  solvedByDecade: Record<AlbumDecadeKey, number>;
  totalsByDecade: Record<AlbumDecadeKey, number>;
  unlockedIds: Set<string>;
}

export function TrophiesView({
  totalSolved,
  solvedByDecade,
  totalsByDecade,
  unlockedIds,
}: TrophiesViewProps) {
  const milestones = TROPHIES.filter((t) => t.category === "milestone");
  const albumTrophies = TROPHIES.filter((t) => t.category === "album");

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
          Milestone Giocatori Trovati ({totalSolved})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {milestones.map((t) => {
            const target = t.threshold ?? 100;
            const unlocked = unlockedIds.has(t.id) || totalSolved >= target;
            const pct = Math.min(100, Math.round((totalSolved / target) * 100));
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
                        {t.description}
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

      {/* Completamento Album per Decennio */}
      <section className="space-y-3">
        <h3 className="font-display font-black uppercase text-base flex items-center gap-2">
          <Trophy className="w-5 h-5 text-rose-600" />
          Completamento Album per Decennio
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {albumTrophies.map((t) => {
            const dec = t.decade!;
            const info = ALBUM_DECADES.find((d) => d.key === dec)!;
            const solved = solvedByDecade[dec] || 0;
            const total = totalsByDecade[dec] || 0;
            const unlocked =
              unlockedIds.has(t.id) || (total > 0 && solved >= total);
            const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
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
                        {info.subtitle}
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
                      {solved} / {total}
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
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

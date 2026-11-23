import React, { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  PackageOpen,
  RotateCw,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  ALBUM_DECADES,
  PACK_COST,
  type FigurinaPlayer,
} from "@shared/figutrivia";
import {
  CountryFlag,
  FigurinaSolvedOverlay,
  getFirstCountryName,
} from "@/components/FigurineCard";
import { ProtectedImage } from "@/components/ProtectedImage";

export interface DrawnPackCard {
  player: FigurinaPlayer;
  isNew: boolean;
}

interface PackOpeningModalProps {
  cards: DrawnPackCard[];
  currentPoints: number;
  isBuyingAnother: boolean;
  onBuyAnother: () => void;
  onClose: () => void;
  onOpenPlayerInAlbum: (player: FigurinaPlayer) => void;
}

const CONFETTI_PARTICLES = [
  { tx: "-115px", ty: "-125px", rot: "-45deg", bg: "#10b981", delay: "0ms" },
  { tx: "115px", ty: "-120px", rot: "55deg", bg: "#fbbf24", delay: "20ms" },
  { tx: "-135px", ty: "-30px", rot: "-110deg", bg: "#f43f5e", delay: "40ms" },
  { tx: "135px", ty: "-25px", rot: "95deg", bg: "#38bdf8", delay: "10ms" },
  { tx: "-110px", ty: "95px", rot: "-75deg", bg: "#a855f7", delay: "30ms" },
  { tx: "110px", ty: "100px", rot: "80deg", bg: "#10b981", delay: "50ms" },
  { tx: "-45px", ty: "-145px", rot: "-25deg", bg: "#fbbf24", delay: "15ms" },
  { tx: "50px", ty: "-145px", rot: "35deg", bg: "#f43f5e", delay: "25ms" },
  { tx: "-55px", ty: "135px", rot: "-60deg", bg: "#38bdf8", delay: "35ms" },
  { tx: "55px", ty: "135px", rot: "65deg", bg: "#fbbf24", delay: "45ms" },
  { tx: "-145px", ty: "40px", rot: "-130deg", bg: "#10b981", delay: "20ms" },
  { tx: "145px", ty: "45px", rot: "125deg", bg: "#a855f7", delay: "30ms" },
];

export function PackOpeningModal({
  cards,
  currentPoints,
  isBuyingAnother,
  onBuyAnother,
  onClose,
  onOpenPlayerInAlbum,
}: PackOpeningModalProps) {
  const [cardIdx, setCardIdx] = useState(0);
  const [viewMode, setViewMode] = useState<"card" | "summary">("card");
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [animRunId, setAnimRunId] = useState(0);

  // Reset to first card whenever a brand new pack is passed
  const packSignature = cards.map((c) => `${c.player.player_id}:${c.isNew}`).join("|");
  useEffect(() => {
    setCardIdx(0);
    setViewMode("card");
  }, [packSignature]);

  useEffect(() => {
    if (viewMode !== "card") return;
    setSpinning(false);
    setRevealed(false);

    const tSpin = setTimeout(() => {
      setSpinning(true);
    }, 350);

    const tReveal = setTimeout(() => {
      setRevealed(true);
    }, 900);

    return () => {
      clearTimeout(tSpin);
      clearTimeout(tReveal);
    };
  }, [cardIdx, viewMode, animRunId, packSignature]);

  if (cards.length === 0) return null;

  const currentCard = cards[cardIdx] ?? cards[0];
  const player = currentCard.player;
  const isNew = currentCard.isNew;
  const decadeInfo = ALBUM_DECADES.find((d) => d.key === player.album_decade);
  const newCardsCount = cards.filter((c) => c.isNew).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Custom keyframes for the "MANCA!" stamp slam and confetti burst */}
      <style>{`
        @keyframes mancaStampSlam {
          0% {
            opacity: 0;
            transform: scale(3.2) rotate(-28deg);
          }
          55% {
            opacity: 1;
            transform: scale(0.88) rotate(-9deg);
          }
          75% {
            transform: scale(1.1) rotate(-14deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(-12deg);
          }
        }
        @keyframes mancaCardShake {
          0%, 100% { transform: rotateY(360deg) translate(0, 0); }
          20% { transform: rotateY(360deg) translate(-5px, 3px); }
          40% { transform: rotateY(360deg) translate(5px, -3px); }
          60% { transform: rotateY(360deg) translate(-3px, -2px); }
          80% { transform: rotateY(360deg) translate(3px, 2px); }
        }
        @keyframes mancaConfettiShoot {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(0.3) rotate(0deg);
          }
          70% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) scale(1.15) rotate(var(--rot));
          }
        }
        @keyframes mancaPulseGlow {
          0%, 100% {
            box-shadow: 6px 6px 0px 0px rgba(0,0,0,1), 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% {
            box-shadow: 6px 6px 0px 0px rgba(0,0,0,1), 0 0 28px 10px rgba(251, 191, 36, 0.85);
          }
        }
      `}</style>

      <div className="bg-amber-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full p-3.5 sm:p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-amber-400 border-3 border-black px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-black min-w-0">
            <PackageOpen className="w-5 h-5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-display font-black uppercase text-xs sm:text-sm leading-tight truncate">
                {viewMode === "card"
                  ? `Apertura Pacchetto • Figurina ${cardIdx + 1} di ${cards.length}`
                  : `Riepilogo Pacchetto (${newCardsCount} ${
                      newCardsCount === 1 ? "Manca!" : "Mancano!"
                    })`}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-black/80">
                {viewMode === "card"
                  ? `Album ${decadeInfo?.label ?? player.album_decade} • Figurina #${player.numero}`
                  : "Clicca su una figurina per vederla nell'Album"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {viewMode === "card" && (
              <button
                type="button"
                onClick={() => setViewMode("summary")}
                className="px-2 py-1 bg-white hover:bg-gray-100 text-black font-display font-black uppercase text-[10px] sm:text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Rivela tutte (5)
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Chiudi"
              className="p-1 bg-black text-white border-2 border-black hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewMode === "card" ? (
          <>
            {/* Progress pills 1..5 */}
            <div className="flex items-center justify-center gap-1.5">
              {cards.map((c, idx) => {
                const isPast = idx < cardIdx;
                const isCurrent = idx === cardIdx;
                const showStatus = isPast || (isCurrent && revealed);
                return (
                  <button
                    key={`${c.player.player_id}-${idx}`}
                    type="button"
                    onClick={() => setCardIdx(idx)}
                    className={`px-2.5 py-0.5 text-[10px] sm:text-xs font-display font-black uppercase border-2 border-black transition-all ${
                      isCurrent
                        ? "bg-black text-amber-400 scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : showStatus && c.isNew
                          ? "bg-emerald-400 text-black"
                          : showStatus
                            ? "bg-gray-200 text-gray-700"
                            : "bg-white text-black"
                    }`}
                  >
                    #{idx + 1}{" "}
                    {showStatus ? (c.isNew ? "★" : "•") : ""}
                  </button>
                );
              })}
            </div>

            {/* 3D Card Stage with "MANCA!" Burst Effect */}
            <div
              className="relative flex flex-col items-center justify-center py-2 overflow-visible"
              style={{ perspective: "1100px" }}
            >
              {/* Confetti explosion when revealed && isNew */}
              {revealed && isNew && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  {CONFETTI_PARTICLES.map((p, i) => (
                    <span
                      key={i}
                      style={
                        {
                          "--tx": p.tx,
                          "--ty": p.ty,
                          "--rot": p.rot,
                          backgroundColor: p.bg,
                          animation: `mancaConfettiShoot 950ms cubic-bezier(0.16, 1, 0.3, 1) ${p.delay} forwards`,
                        } as React.CSSProperties
                      }
                      className="absolute w-3.5 h-3.5 border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    />
                  ))}
                </div>
              )}

              {/* Rotating 3:4 Sticker */}
              <div
                style={{
                  transform: spinning ? "rotateY(360deg)" : "rotateY(0deg)",
                  transition: spinning
                    ? "transform 1.1s cubic-bezier(0.22, 1, 0.36, 1)"
                    : "none",
                  transformStyle: "preserve-3d",
                  animation:
                    revealed && isNew
                      ? "mancaPulseGlow 1.6s ease-in-out infinite"
                      : undefined,
                }}
                className={`relative aspect-[3/4] w-52 sm:w-60 border-4 border-black bg-gray-200 overflow-hidden select-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
                  revealed
                    ? isNew
                      ? "ring-4 ring-emerald-500"
                      : "ring-2 ring-gray-400"
                    : ""
                }`}
              >
                <ProtectedImage
                  src={player.photo_url}
                  objectPosition="top"
                  canvasWidth={360}
                  canvasHeight={480}
                  className="w-full h-full"
                />

                {/* Top-left number badge */}
                <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
                  <span className="bg-black/90 text-white font-mono font-bold text-xs px-2 py-0.5 border border-white/50">
                    #{player.numero}
                  </span>
                  <span
                    className={`${
                      decadeInfo?.badgeColor ?? "bg-amber-400"
                    } text-black font-display font-black uppercase text-[10px] px-1.5 py-0.5 border border-black`}
                  >
                    {decadeInfo?.label ?? player.album_decade}
                  </span>
                </div>

                {/* Animated "MANCA!" or "CE L'HO" stamp on the card */}
                {revealed && isNew && (
                  <div
                    style={{
                      animation:
                        "mancaStampSlam 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
                    }}
                    className="absolute top-10 right-2 z-30 pointer-events-none"
                  >
                    <div className="bg-emerald-400 text-black border-3 border-black px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                      <Sparkles className="w-4 h-4 fill-amber-300 text-black animate-spin" />
                      <span className="font-display font-black uppercase text-lg sm:text-xl tracking-tight leading-none">
                        MANCA!
                      </span>
                    </div>
                  </div>
                )}

                {revealed && !isNew && (
                  <div className="absolute top-10 right-2 z-30 pointer-events-none rotate-6 animate-in zoom-in-75 duration-200">
                    <div className="bg-gray-200/95 text-gray-800 border-2 border-black px-2.5 py-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <span className="font-display font-black uppercase text-xs tracking-tight">
                        CE L'HO (DOPPIONE)
                      </span>
                    </div>
                  </div>
                )}

                {revealed && (
                  <FigurinaSolvedOverlay
                    playerName={player.name}
                    nationality={player.nationality}
                    role={player.position}
                    size="lg"
                  />
                )}
              </div>
            </div>

            {/* Revealed Status Banner & Player Details */}
            <div
              className={`transition-all duration-300 ${
                revealed
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2 pointer-events-none"
              }`}
            >
              {isNew ? (
                <div className="bg-emerald-400 border-3 border-black p-2.5 sm:p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="bg-black text-amber-400 font-display font-black uppercase text-xs sm:text-sm px-2 py-0.5 border border-black flex-shrink-0">
                      MANCA!
                    </span>
                    <div className="min-w-0">
                      <div className="font-display font-black uppercase text-sm sm:text-base text-black truncate">
                        {player.name}
                      </div>
                      <div className="text-[11px] font-bold text-black/85">
                        Nuova figurina incollata nell'Album{" "}
                        {decadeInfo?.label ?? player.album_decade} (#
                        {player.numero})!
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 bg-white border-2 border-black px-2 py-1 text-xs font-black flex-shrink-0">
                    <CountryFlag
                      nationality={player.nationality}
                      onlyFirst
                      size="sm"
                    />
                    <span>{player.serie_a_apps} pres.</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white border-3 border-black p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="bg-gray-200 text-gray-800 font-display font-black uppercase text-xs px-2 py-0.5 border border-black flex-shrink-0">
                      CE L'HO
                    </span>
                    <div className="min-w-0">
                      <div className="font-display font-black uppercase text-sm sm:text-base text-black truncate">
                        {player.name}
                      </div>
                      <div className="text-[11px] font-bold text-gray-600">
                        Doppione • Già presente nell'Album{" "}
                        {decadeInfo?.label ?? player.album_decade} (#
                        {player.numero})
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 bg-gray-50 border border-black px-2 py-1 text-xs font-bold flex-shrink-0">
                    <CountryFlag
                      nationality={player.nationality}
                      onlyFirst
                      size="sm"
                    />
                    <span>{getFirstCountryName(player.nationality)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Controls for Card-by-Card View */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAnimRunId((n) => n + 1)}
                title="Rivedi animazione"
                className="px-3 py-2 bg-white hover:bg-gray-100 text-black font-display font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rivedi</span>
              </button>

              {cardIdx < cards.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCardIdx((i) => i + 1)}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-display font-black uppercase text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5"
                >
                  <span>
                    Prossima Figurina ({cardIdx + 2}/{cards.length})
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setViewMode("summary")}
                  className="flex-1 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-black font-display font-black uppercase text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Vedi Riepilogo 5 Figurine</span>
                </button>
              )}
            </div>
          </>
        ) : (
          /* 5-Card Pack Summary View */
          <div className="space-y-4">
            <div
              className={`border-3 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-2 ${
                newCardsCount > 0 ? "bg-emerald-100" : "bg-white"
              }`}
            >
              <div className="font-display font-black uppercase text-xs sm:text-sm">
                {newCardsCount > 0
                  ? `🎉 Hai trovato ${newCardsCount} ${
                      newCardsCount === 1
                        ? "figurina che ti mancava"
                        : "figurine che ti mancavano"
                    } su 5!`
                  : "Tutte e 5 le figurine erano già presenti nel tuo album (doppioni)."}
              </div>
              <span className="bg-white border-2 border-black px-2.5 py-0.5 font-black text-xs flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {currentPoints} pt rimasti
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {cards.map((c, idx) => {
                const dec = ALBUM_DECADES.find(
                  (d) => d.key === c.player.album_decade
                );
                return (
                  <button
                    key={`${c.player.player_id}-${idx}`}
                    type="button"
                    onClick={() => onOpenPlayerInAlbum(c.player)}
                    className={`group relative aspect-[3/4] border-3 border-black bg-gray-200 overflow-hidden select-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all text-left ${
                      c.isNew ? "ring-3 ring-emerald-500" : "opacity-90"
                    }`}
                  >
                    <ProtectedImage
                      src={c.player.photo_url}
                      objectPosition="top"
                      canvasWidth={240}
                      canvasHeight={320}
                      className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Top badges */}
                    <div className="absolute top-1.5 left-1.5 right-1.5 z-20 flex items-center justify-between gap-1 pointer-events-none">
                      <span className="bg-black/85 text-white font-mono font-bold text-[10px] px-1.5 py-0.5">
                        #{c.player.numero}
                      </span>
                      <span
                        className={`${
                          dec?.badgeColor ?? "bg-amber-400"
                        } text-black font-display font-black uppercase text-[9px] px-1 py-0.5 border border-black`}
                      >
                        {dec?.label ?? c.player.album_decade}
                      </span>
                    </div>

                    {/* MANCA! or CE L'HO badge */}
                    <div className="absolute top-8 right-1.5 z-30 pointer-events-none">
                      {c.isNew ? (
                        <span className="inline-flex items-center gap-0.5 bg-emerald-400 text-black font-display font-black uppercase text-[11px] px-2 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -rotate-6">
                          <Sparkles className="w-3 h-3 fill-amber-300" />
                          MANCA!
                        </span>
                      ) : (
                        <span className="inline-block bg-gray-200 text-gray-800 font-display font-black uppercase text-[9px] px-1.5 py-0.5 border border-black rotate-3">
                          CE L'HO
                        </span>
                      )}
                    </div>

                    <FigurinaSolvedOverlay
                      playerName={c.player.name}
                      nationality={c.player.nationality}
                      role={c.player.position}
                      size="sm"
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCardIdx(0);
                  setViewMode("card");
                }}
                className="px-3 py-2 bg-white hover:bg-gray-100 text-black font-display font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rivedi 1 ad 1
              </button>

              <button
                type="button"
                disabled={currentPoints < PACK_COST || isBuyingAnother}
                onClick={onBuyAnother}
                className="flex-1 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-display font-black uppercase text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-45 flex items-center justify-center gap-1.5"
              >
                <PackageOpen className="w-4 h-4" />
                <span>
                  {isBuyingAnother
                    ? "Apertura in corso..."
                    : `Apri altro pacchetto (⭐ ${PACK_COST} pt)`}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-display font-black uppercase text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { Check, Gift, RotateCw, Sparkles } from "lucide-react";
import { ALBUM_DECADES, type FigurinaPlayer } from "@shared/figutrivia";
import {
  CountryFlag,
  FigurinaSolvedOverlay,
  getFirstCountryName,
} from "@/components/FigurineCard";
import { ProtectedImage } from "@/components/ProtectedImage";

export interface ReceivedGiftItem {
  id: number;
  playerId: string;
  senderUsername: string;
  createdAt?: Date | string;
}

interface GiftRevealModalProps {
  gift: ReceivedGiftItem;
  player: FigurinaPlayer;
  remainingCount: number;
  onConfirm: () => void;
  onOpenPlayerInAlbum: (player: FigurinaPlayer) => void;
}

export function GiftRevealModal({
  gift,
  player,
  remainingCount,
  onConfirm,
  onOpenPlayerInAlbum,
}: GiftRevealModalProps) {
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [animRunId, setAnimRunId] = useState(0);

  useEffect(() => {
    setSpinning(false);
    setRevealed(false);

    // 1) Show unsolved card for 650ms, then start 360° rotation
    const tSpin = setTimeout(() => {
      setSpinning(true);
    }, 650);

    // 2) Halfway through the 360° rotation (~1250ms total), switch card face from unsolved to revealed!
    const tReveal = setTimeout(() => {
      setRevealed(true);
    }, 1250);

    return () => {
      clearTimeout(tSpin);
      clearTimeout(tReveal);
    };
  }, [gift.id, animRunId]);

  const decadeInfo = ALBUM_DECADES.find((d) => d.key === player.album_decade);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-amber-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Banner Top */}
        <div className="bg-emerald-500 border-3 border-black px-3 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-black">
            <Gift className="w-5 h-5 flex-shrink-0 animate-bounce" />
            <div>
              <div className="font-display font-black uppercase text-xs sm:text-sm leading-tight">
                Figurina Regalata!
              </div>
              <div className="text-[11px] font-bold">
                Da <span className="underline">@{gift.senderUsername}</span> •{" "}
                Album {decadeInfo?.label ?? player.album_decade} #{player.numero}
              </div>
            </div>
          </div>
          {remainingCount > 1 && (
            <span className="bg-black text-amber-400 font-mono font-bold text-[10px] px-2 py-0.5 border border-white">
              +{remainingCount - 1}
            </span>
          )}
        </div>

        {/* 3D 360° Card Stage */}
        <div
          className="flex flex-col items-center justify-center py-2"
          style={{ perspective: "1100px" }}
        >
          <div
            style={{
              transform: spinning ? "rotateY(360deg)" : "rotateY(0deg)",
              transition: spinning
                ? "transform 1.25s cubic-bezier(0.22, 1, 0.36, 1)"
                : "none",
              transformStyle: "preserve-3d",
            }}
            className={`relative aspect-[3/4] w-52 sm:w-60 border-4 border-black bg-gray-200 overflow-hidden select-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
              revealed ? "ring-4 ring-emerald-500" : ""
            }`}
          >
            <ProtectedImage
              src={player.photo_url}
              objectPosition="top"
              canvasWidth={360}
              canvasHeight={480}
              className="w-full h-full"
            />

            {/* Prima del giro: mostrata come figurina NON ancora indovinata */}
            {!revealed && (
              <div className="absolute top-2 left-2 z-20 bg-black/85 text-white font-mono font-bold text-xs px-2 py-0.5 border border-white/50">
                #{player.numero}
              </div>
            )}

            {/* Durante/dopo il giro di 360°: riappare con tutte le informazioni rivelate */}
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

        {/* Informazioni Rivelate dopo la rotazione 360° */}
        <div
          className={`transition-all duration-300 ${
            revealed
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          <div className="bg-white border-3 border-black p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-1.5">
              <div>
                <div className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Identità Rivelata
                </div>
                <div className="font-display font-black uppercase text-base sm:text-lg leading-tight">
                  {player.name}
                </div>
              </div>
              <span className="bg-amber-400 border-2 border-black px-2 py-0.5 font-mono font-black text-xs">
                #{player.numero}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="bg-gray-50 border border-black px-2 py-1">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">
                  Ruolo / Anno
                </span>
                <span className="font-black">
                  {player.position} • {player.birth_year ?? "—"}
                </span>
              </div>
              <div className="bg-gray-50 border border-black px-2 py-1">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">
                  Nazionalità
                </span>
                <span className="font-black inline-flex items-center gap-1.5">
                  <CountryFlag
                    nationality={player.nationality}
                    onlyFirst
                    size="md"
                  />
                  <span>{getFirstCountryName(player.nationality)}</span>
                </span>
              </div>
              <div className="bg-gray-50 border border-black px-2 py-1 col-span-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-gray-500">
                  Presenze in Serie A
                </span>
                <span className="font-display font-black text-sm text-amber-600">
                  {player.serie_a_apps} presenze
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Azioni */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setAnimRunId((n) => n + 1)}
            title="Rivedi animazione 360°"
            className="px-3 py-2 bg-white hover:bg-gray-100 text-black font-display font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rivedi</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenPlayerInAlbum(player)}
            className="flex-1 px-3 py-2 bg-amber-400 hover:bg-amber-500 text-black font-display font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            Vedi nell'Album
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-display font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1"
          >
            <Check className="w-4 h-4" />
            Incolla!
          </button>
        </div>
      </div>
    </div>
  );
}

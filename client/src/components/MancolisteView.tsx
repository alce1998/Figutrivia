import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  Gift,
  Heart,
  Lock,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ALBUM_DECADES,
  HINT_COSTS,
  MAX_DAILY_GIFTS,
  MAX_MANCOLISTA_SIZE,
  TROPHIES,
  getAlbumSections,
  getPointsForSection,
  getSurnameInitials,
  normalizePlayerStr,
  type AlbumDecadeKey,
  type FigurinaPlayer,
  type HintType,
} from "@shared/figutrivia";
import {
  CountryFlag,
  FigurinaSolvedOverlay,
  getFirstCountryName,
} from "@/components/FigurineCard";
import { ProtectedImage } from "@/components/ProtectedImage";
import { trpc } from "@/lib/trpc";

interface ProgressEntry {
  solved: boolean;
  hintsUsed: string[];
  pointsAwarded: number;
  unlockedByUsername: string | null;
}

interface MancolisteViewProps {
  playersById: Map<string, FigurinaPlayer>;
  allPlayerNames: string[];
  solvedSet: Set<string>;
  progressMap: Map<string, ProgressEntry>;
  currentPoints: number;
  totalsByDecade: Record<AlbumDecadeKey, number>;
  onSelectPlayer: (player: FigurinaPlayer) => void;
  onAfterMutate: () => void | Promise<unknown>;
}

export function MancolisteView({
  playersById,
  allPlayerNames,
  solvedSet,
  progressMap,
  currentPoints,
  totalsByDecade,
  onSelectPlayer,
  onAfterMutate,
}: MancolisteViewProps) {
  const { data, isLoading, refetch } = trpc.mancolista.listAll.useQuery();
  const toggleMutation = trpc.mancolista.toggle.useMutation();
  const giftMutation = trpc.mancolista.giftSticker.useMutation();
  const guessMutation = trpc.album.guessPlayer.useMutation();
  const hintMutation = trpc.album.useHint.useMutation();

  // Modal state for clicking a player inside another user's Mancolista
  const [activeTarget, setActiveTarget] = useState<{
    player: FigurinaPlayer;
    recipientUserId: number;
    recipientUsername: string;
  } | null>(null);
  const [guess, setGuess] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [justGifted, setJustGifted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGuess("");
    setShowDropdown(false);
    setJustGifted(false);
  }, [activeTarget?.player.player_id, activeTarget?.recipientUserId]);

  const handleRemove = async (playerId: string) => {
    try {
      await toggleMutation.mutateAsync({ playerId });
      await refetch();
      await onAfterMutate();
      toast.success("Rimossa dalla tua Mancolista");
    } catch (err: any) {
      toast.error(err?.message || "Errore nella rimozione");
    }
  };

  const handleGift = async (
    recipientUserId: number,
    playerId: string,
    fromModal = false
  ) => {
    try {
      const res = await giftMutation.mutateAsync({ recipientUserId, playerId });
      await refetch();
      await onAfterMutate();
      toast.success(
        `Figurina regalata! Ti restano ${res.dailyGiftsRemaining}/${MAX_DAILY_GIFTS} regali oggi.`
      );
      if (fromModal) {
        setJustGifted(true);
        setTimeout(() => {
          setActiveTarget(null);
        }, 900);
      }
    } catch (err: any) {
      toast.error(err?.message || "Impossibile regalare questa figurina.");
    }
  };

  const handleModalUseHint = async (hintType: HintType) => {
    if (!activeTarget) return;
    try {
      const res = await hintMutation.mutateAsync({
        playerId: activeTarget.player.player_id,
        hintType,
      });
      await onAfterMutate();
      toast.success(`Indizio svelato! Punti rimasti: ${res.newPoints} pt`);
    } catch (err: any) {
      toast.error(err?.message || "Punti indizio insufficienti.");
    }
  };

  const handleModalGuess = async () => {
    if (!activeTarget || !guess.trim()) return;
    const player = activeTarget.player;
    const trimmed = guess.trim();
    try {
      const res = await guessMutation.mutateAsync({
        playerId: player.player_id,
        guess: trimmed,
      });
      setGuess("");
      setShowDropdown(false);

      if (!res.correct) {
        toast.error("Nome errato, riprova!");
        return;
      }

      await onAfterMutate();
      await refetch();

      if (!res.alreadySolved) {
        toast.success(
          `🏆 ${player.name} sbloccato nel tuo album! +${res.pointsAwarded} pt`,
          { duration: 4000 }
        );
        for (const tid of res.newlyUnlockedTrophies) {
          const t = TROPHIES.find((x) => x.id === tid);
          if (t) {
            toast.success(`${t.icon} Trofeo sbloccato: ${t.title}!`, {
              duration: 5000,
            });
          } else if (tid.startsWith("album_") && tid.includes("_sec_")) {
            const m = tid.match(/^album_(.+)_sec_(\d+)$/);
            if (m) {
              const decKey = m[1] as AlbumDecadeKey;
              const secIdx = Number(m[2]);
              const decInfo = ALBUM_DECADES.find((d) => d.key === decKey);
              const secs = getAlbumSections(
                decKey,
                totalsByDecade[decKey] || 0
              );
              const secInfo = secs.find((s) => s.index === secIdx);
              toast.success(
                `🧩 Parte ${secIdx}/${secs.length} del Trofeo Album ${decInfo?.label ?? decKey} sbloccata (Sez. ${secInfo?.label ?? secIdx})!`,
                { duration: 5500 }
              );
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Errore durante la verifica.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center font-bold uppercase text-sm">
        Caricamento mancoliste...
      </div>
    );
  }

  const lists = data?.lists ?? [];
  const myList = lists.find((l) => l.isSelf);
  const otherLists = lists.filter((l) => !l.isSelf);
  const dailyRemaining = data?.dailyGiftsRemaining ?? MAX_DAILY_GIFTS;

  const modalPlayer = activeTarget?.player ?? null;
  const modalIsSolved = modalPlayer
    ? solvedSet.has(modalPlayer.player_id)
    : false;
  const modalHints = modalPlayer
    ? progressMap.get(modalPlayer.player_id)?.hintsUsed ?? []
    : [];
  const modalDecadeInfo = modalPlayer
    ? ALBUM_DECADES.find((d) => d.key === modalPlayer.album_decade)
    : null;

  return (
    <div className="space-y-6">
      {/* Banner quota giornaliera */}
      <div className="bg-amber-100 border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-600 text-white border-2 border-black flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black uppercase text-base">
              Mancoliste & Scambi Giornalieri
            </h3>
            <p className="text-xs font-medium text-gray-700">
              Inserisci fino a {MAX_MANCOLISTA_SIZE} figurine mancanti con il
              cuore ❤️ e clicca sulle figurine mancanti degli altri giocatori
              per indovinarle subito e regalarle (max {MAX_DAILY_GIFTS}/giorno).
            </p>
          </div>
        </div>
        <div className="bg-black text-white px-3 py-1.5 font-display font-black text-xs uppercase border-2 border-black">
          Regali oggi: {dailyRemaining} / {MAX_DAILY_GIFTS}
        </div>
      </div>

      {/* La mia Mancolista */}
      <section className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 space-y-3">
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <h4 className="font-display font-black uppercase text-base flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
            La tua Mancolista
          </h4>
          <span className="font-mono font-bold text-xs bg-amber-400 border-2 border-black px-2 py-0.5">
            {myList?.items.length ?? 0} / {MAX_MANCOLISTA_SIZE}
          </span>
        </div>

        {!myList || myList.items.length === 0 ? (
          <p className="text-xs text-muted-foreground font-medium py-4 text-center">
            Non hai ancora aggiunto figurine alla tua Mancolista. Clicca sul
            cuore ❤️ su qualsiasi figurina non ancora indovinata!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {myList.items.map((item) => {
              const p = playersById.get(item.playerId);
              if (!p) return null;
              return (
                <div
                  key={p.player_id}
                  className="border-2 border-black bg-gray-50 flex flex-col overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <button
                    type="button"
                    onClick={() => onSelectPlayer(p)}
                    className="relative aspect-[3/4] w-full overflow-hidden bg-gray-200"
                  >
                    <ProtectedImage
                      src={p.photo_url}
                      canvasWidth={210}
                      canvasHeight={280}
                    />
                  </button>
                  <div className="p-1.5 flex items-center justify-between gap-1 bg-white border-t-2 border-black">
                    <div className="min-w-0">
                      <div className="font-black text-[11px] leading-tight">
                        #{p.numero}
                      </div>
                      <div className="text-[10px] font-bold text-gray-600 truncate">
                        {p.album_decade}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(p.player_id)}
                      title="Rimuovi dalla Mancolista"
                      className="p-1 text-rose-600 hover:bg-rose-50 border border-black"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Mancoliste degli altri utenti */}
      <section className="space-y-4">
        <h4 className="font-display font-black uppercase text-base flex items-center gap-2">
          <Users className="w-5 h-5" />
          Mancoliste degli altri giocatori ({otherLists.length})
        </h4>

        {otherLists.length === 0 ? (
          <div className="bg-white border-4 border-black p-6 text-center text-xs font-bold text-muted-foreground uppercase">
            Nessun altro utente ha inserito figurine in mancolista al momento.
          </div>
        ) : (
          otherLists.map((other) => (
            <div
              key={other.userId}
              className="bg-white border-4 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black uppercase text-sm bg-black text-white px-2.5 py-0.5">
                    @{other.username}
                  </span>
                  <span className="text-xs font-bold text-gray-600">
                    {other.solvedCount} figurine sbloccate
                  </span>
                </div>
                <span className="text-xs font-bold uppercase bg-rose-100 text-rose-800 border border-black px-2 py-0.5">
                  Cerca {other.items.length} figurine
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {other.items.map((item) => {
                  const p = playersById.get(item.playerId);
                  if (!p) return null;
                  const iHaveSolved = solvedSet.has(p.player_id);
                  return (
                    <div
                      key={p.player_id}
                      onClick={() =>
                        setActiveTarget({
                          player: p,
                          recipientUserId: other.userId,
                          recipientUsername: other.username,
                        })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveTarget({
                            player: p,
                            recipientUserId: other.userId,
                            recipientUsername: other.username,
                          });
                        }
                      }}
                      title={
                        iHaveSolved
                          ? `Clicca per vedere o regalare ${p.name} a @${other.username}`
                          : `Clicca per inserire il nome di questa figurina nel tuo album e regalarla a @${other.username}`
                      }
                      className="border-2 border-black p-2 bg-gray-50 hover:bg-amber-50/70 flex items-center gap-2.5 cursor-pointer transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 group"
                    >
                      <div className="w-12 h-16 flex-shrink-0 border-2 border-black overflow-hidden bg-gray-200 relative">
                        <ProtectedImage
                          src={p.photo_url}
                          canvasWidth={120}
                          canvasHeight={160}
                          className="w-full h-full transition-transform duration-200 group-hover:scale-105"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs uppercase truncate">
                          {iHaveSolved ? p.name : `Figurina #${p.numero}`}
                        </div>
                        <div className="text-[11px] font-bold text-gray-600">
                          Album {p.album_decade} • #{p.numero}
                        </div>
                        {iHaveSolved ? (
                          <button
                            type="button"
                            disabled={
                              dailyRemaining <= 0 || giftMutation.isPending
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGift(other.userId, p.player_id);
                            }}
                            className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40"
                          >
                            <Gift className="w-3 h-3" />
                            Regala figurina
                          </button>
                        ) : (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-400 group-hover:bg-amber-300 text-black text-[10px] font-black uppercase border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                            <Lock className="w-2.5 h-2.5" />
                            Clicca per indovinare e regalare
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Modal per indovinare direttamente dalla Mancolista altrui e regalare subito */}
      {activeTarget && modalPlayer && (
        <div
          onClick={() => setActiveTarget(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-amber-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-3.5 sm:p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`${
                      modalDecadeInfo?.badgeColor ?? "bg-amber-400"
                    } px-2 py-0.5 border-2 border-black font-display font-black uppercase text-xs`}
                  >
                    Album {modalDecadeInfo?.label ?? modalPlayer.album_decade} #
                    {modalPlayer.numero}
                  </span>
                  <span className="bg-black text-white font-display font-black uppercase text-[11px] px-2 py-0.5">
                    Cercata da @{activeTarget.recipientUsername}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTarget(null)}
                aria-label="Chiudi"
                className="p-1 bg-white hover:bg-gray-100 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Figurina 3:4 */}
            <div
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="relative w-56 sm:w-64 mx-auto aspect-[3/4] border-4 border-black bg-white select-none shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <ProtectedImage
                src={modalPlayer.photo_url}
                objectPosition="top"
                canvasWidth={420}
                canvasHeight={560}
              />
              {modalIsSolved && (
                <FigurinaSolvedOverlay
                  size="lg"
                  playerName={modalPlayer.name}
                  nationality={modalPlayer.nationality}
                  role={modalPlayer.position}
                />
              )}
            </div>

            {/* Se non ancora indovinata nel proprio album: Indizi + Input Nome */}
            {!modalIsSolved ? (
              <div className="space-y-2">
                {/* 3 Indizi in riga */}
                <div className="bg-white border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-gray-600 mb-1.5">
                    <span>Indizi per il tuo Album</span>
                    <span className="text-amber-600 font-black">
                      ⭐ {currentPoints} pt disponibili
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Indizio 1 */}
                    <div
                      className={`border border-black p-1 text-center flex flex-col justify-between ${
                        modalHints.includes("anno_ruolo")
                          ? "bg-amber-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase text-gray-500">
                        Anno & Ruolo
                      </div>
                      {modalHints.includes("anno_ruolo") ? (
                        <div className="font-bold text-[10px] leading-tight py-0.5">
                          {modalPlayer.birth_year ?? "N/D"} •{" "}
                          {modalPlayer.position}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleModalUseHint("anno_ruolo")}
                          disabled={hintMutation.isPending}
                          className="mt-0.5 w-full py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] border border-black"
                        >
                          ⭐ {HINT_COSTS.anno_ruolo} pt
                        </button>
                      )}
                    </div>

                    {/* Indizio 2 */}
                    <div
                      className={`border border-black p-1 text-center flex flex-col justify-between ${
                        modalHints.includes("nazionalita_presenze")
                          ? "bg-amber-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase text-gray-500">
                        Nazione & Pres.
                      </div>
                      {modalHints.includes("nazionalita_presenze") ? (
                        <div className="font-bold text-[10px] leading-tight py-0.5 flex items-center justify-center gap-1 flex-wrap">
                          <CountryFlag
                            nationality={modalPlayer.nationality}
                            onlyFirst
                            size="sm"
                          />
                          <span>• {modalPlayer.serie_a_apps}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleModalUseHint("nazionalita_presenze")
                          }
                          disabled={hintMutation.isPending}
                          className="mt-0.5 w-full py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] border border-black"
                        >
                          ⭐ {HINT_COSTS.nazionalita_presenze} pt
                        </button>
                      )}
                    </div>

                    {/* Indizio 3 */}
                    <div
                      className={`border border-black p-1 text-center flex flex-col justify-between ${
                        modalHints.includes("iniziali")
                          ? "bg-amber-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase text-gray-500">
                        Iniziali
                      </div>
                      {modalHints.includes("iniziali") ? (
                        <div className="font-mono font-bold text-xs tracking-wider py-0.5">
                          {getSurnameInitials(modalPlayer.name)}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleModalUseHint("iniziali")}
                          disabled={hintMutation.isPending}
                          className="mt-0.5 w-full py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] border border-black"
                        >
                          ⭐ {HINT_COSTS.iniziali} pt
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Inserimento Nome */}
                <div className="bg-white border-2 border-black p-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-1.5">
                  <div className="text-[11px] font-bold uppercase text-gray-700">
                    Inserisci il nome per sbloccarla nel tuo album (+
                    {getPointsForSection(modalPlayer.numero)} pt):
                  </div>
                  <div className="relative flex gap-1.5">
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={guess}
                        onChange={(e) => {
                          setGuess(e.target.value);
                          setShowDropdown(e.target.value.trim().length >= 2);
                        }}
                        onFocus={() => {
                          if (guess.trim().length >= 2) setShowDropdown(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowDropdown(false), 150);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleModalGuess();
                          if (e.key === "Escape") setShowDropdown(false);
                        }}
                        placeholder="Scrivi il nome del calciatore..."
                        className="w-full border-2 border-black px-2.5 py-1.5 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                        autoComplete="off"
                      />

                      {showDropdown &&
                        (() => {
                          const normG = normalizePlayerStr(guess);
                          const altG = normG
                            .replace(/ae/g, "a")
                            .replace(/oe/g, "o")
                            .replace(/ellertsson/g, "ellertson");
                          const matches = allPlayerNames
                            .filter((n) => {
                              const normN = normalizePlayerStr(n);
                              if (normN.includes(normG)) return true;
                              return normN
                                .replace(/ae/g, "a")
                                .replace(/oe/g, "o")
                                .replace(/ellertsson/g, "ellertson")
                                .includes(altG);
                            })
                            .slice(0, 8);
                          return matches.length > 0 ? (
                            <div className="absolute z-50 bottom-full mb-1 left-0 right-0 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-40 overflow-y-auto">
                              {matches.map((name) => (
                                <button
                                  key={name}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setGuess(name);
                                    setShowDropdown(false);
                                    inputRef.current?.focus();
                                  }}
                                  className="w-full text-left px-3 py-1.5 font-bold text-xs hover:bg-amber-50 border-b border-gray-100 last:border-b-0"
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          ) : null;
                        })()}
                    </div>

                    <button
                      type="button"
                      onClick={handleModalGuess}
                      disabled={!guess.trim() || guessMutation.isPending}
                      className="bg-black hover:bg-gray-800 text-white font-bold uppercase text-xs px-3.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                    >
                      Conferma
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Se già sbloccata (o appena indovinata!): pulsante diretto per regalarla subito */
              <div className="bg-emerald-50 border-3 border-emerald-600 p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-display font-black uppercase text-sm">
                    <Trophy className="w-4 h-4" />
                    <span>{modalPlayer.name}</span>
                  </div>
                  <span className="bg-white border border-black px-2 py-0.5 text-[10px] font-bold inline-flex items-center gap-1">
                    <CountryFlag
                      nationality={modalPlayer.nationality}
                      onlyFirst
                      size="sm"
                    />
                    <span>{getFirstCountryName(modalPlayer.nationality)}</span>
                  </span>
                </div>

                {justGifted ? (
                  <div className="w-full py-2 bg-emerald-600 text-white font-display font-black uppercase text-xs border-2 border-black flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Regalata a @{activeTarget.recipientUsername}!
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={dailyRemaining <= 0 || giftMutation.isPending}
                    onClick={() =>
                      handleGift(
                        activeTarget.recipientUserId,
                        modalPlayer.player_id,
                        true
                      )
                    }
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-display font-black uppercase text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Gift className="w-4 h-4" />
                    Regala ora a @{activeTarget.recipientUsername} (
                    {dailyRemaining}/{MAX_DAILY_GIFTS})
                  </button>
                )}
              </div>
            )}

            {/* Footer: link rapido per aprirla nell'album se si desidera */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  const targetPlayer = modalPlayer;
                  setActiveTarget(null);
                  onSelectPlayer(targetPlayer);
                }}
                className="text-[11px] font-bold uppercase text-gray-700 hover:text-black underline inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Apri scheda completa nell'Album
              </button>
              <button
                type="button"
                onClick={() => setActiveTarget(null)}
                className="px-3 py-1 bg-white hover:bg-gray-100 border-2 border-black font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

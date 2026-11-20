import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toaster, toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Globe,
  Heart,
  LogIn,
  LogOut,
  Star,
  Trophy,
  User,
  X,
} from "lucide-react";
import {
  ALBUM_DECADES,
  HINT_COSTS,
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
import { AuthModal } from "@/components/AuthModal";
import { ErrorReportModal } from "@/components/ErrorReportModal";
import {
  CountryFlag,
  FigurinaSolvedOverlay,
  getFirstCountryName,
} from "@/components/FigurineCard";
import {
  GiftRevealModal,
  type ReceivedGiftItem,
} from "@/components/GiftRevealModal";
import { MancolisteView } from "@/components/MancolisteView";
import { ProtectedImage } from "@/components/ProtectedImage";
import { TrophiesView } from "@/components/TrophiesView";
import { trpc } from "@/lib/trpc";

type MainTab = "album" | "mancoliste" | "trofei";
type StatusFilter = "all" | "unsolved" | "solved" | "mancolista";

function FigurinaThumb({
  player,
  isSolved,
  inMancolista,
  onClick,
  onToggleMancolista,
}: {
  player: FigurinaPlayer;
  isSolved: boolean;
  inMancolista: boolean;
  onClick: () => void;
  onToggleMancolista: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      title={`#${player.numero}`}
      className={`relative aspect-[3/4] cursor-pointer border-3 border-black bg-gray-200 overflow-hidden select-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all group ${
        isSolved ? "ring-3 ring-emerald-500" : ""
      }`}
    >
      {visible && (
        <ProtectedImage
          src={player.photo_url}
          objectPosition="top"
          canvasWidth={300}
          canvasHeight={400}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Numero figurina */}
      {!isSolved && (
        <div className="absolute top-1.5 left-1.5 z-20 bg-black/85 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 border border-white/40 pointer-events-none">
          #{player.numero}
        </div>
      )}

      {/* Tasto Cuore Mancolista sulle figurine non sbloccate */}
      {!isSolved && (
        <button
          type="button"
          onClick={onToggleMancolista}
          title={
            inMancolista
              ? "Rimuovi dalla Mancolista"
              : "Aggiungi alla Mancolista"
          }
          className={`absolute top-1.5 right-1.5 z-20 w-7 h-7 flex items-center justify-center border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-transform hover:scale-110 ${
            inMancolista
              ? "bg-rose-500 text-white"
              : "bg-white/90 text-gray-800 hover:bg-rose-50"
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 ${inMancolista ? "fill-white" : ""}`}
          />
        </button>
      )}

      {isSolved && (
        <FigurinaSolvedOverlay
          size="sm"
          playerName={player.name}
          nationality={player.nationality}
          role={player.position}
        />
      )}
    </div>
  );
}

export default function App() {
  const [players, setPlayers] = useState<FigurinaPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [activeTab, setActiveTab] = useState<MainTab>("album");
  const [activeDecade, setActiveDecade] = useState<AlbumDecadeKey>("1980-89");
  const [selectedRangeIdx, setSelectedRangeIdx] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedPlayer, setSelectedPlayer] = useState<FigurinaPlayer | null>(
    null
  );

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reportPlayer, setReportPlayer] = useState<FigurinaPlayer | null>(null);

  const [guess, setGuess] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [attempts, setAttempts] = useState<
    { value: string; correct: boolean }[]
  >([]);
  const [lastSolvedPct, setLastSolvedPct] = useState<{
    solvers: number;
    totalUsers: number;
    pct: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll preservation when navigating between grid and detail
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollTopByDecade = useRef<Record<string, number>>({});
  const lastScrollYRef = useRef<number>(0);
  const [compactMobileFilters, setCompactMobileFilters] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const loadPlayers = () => {
      fetch("/data/figutrivia_players.json", { cache: "no-cache" })
        .then((r) => r.json())
        .then((data: FigurinaPlayer[]) => {
          setPlayers(data);
          setLoadingPlayers(false);
        })
        .catch(() => {
          toast.error("Errore nel caricamento del database giocatori.");
          setLoadingPlayers(false);
        });
    };
    loadPlayers();

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const {
    data: user,
    isLoading: loadingUser,
    refetch: refetchMe,
  } = trpc.auth.me.useQuery();

  const { data: albumState, refetch: refetchAlbumState } =
    trpc.album.getState.useQuery(undefined, {
      enabled: !!user,
      refetchInterval: 12000,
      refetchOnWindowFocus: true,
    });

  const [seenGiftIds, setSeenGiftIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user) {
      setSeenGiftIds(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(`figutrivia_seen_gifts_${user.id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        setSeenGiftIds(new Set(parsed));
      } else {
        setSeenGiftIds(new Set());
      }
    } catch {
      setSeenGiftIds(new Set());
    }
  }, [user?.id]);

  const markGiftSeen = (giftId: number) => {
    if (!user) return;
    setSeenGiftIds((prev) => {
      const next = new Set(prev);
      next.add(giftId);
      try {
        localStorage.setItem(
          `figutrivia_seen_gifts_${user.id}`,
          JSON.stringify(Array.from(next))
        );
      } catch {}
      return next;
    });
  };

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await refetchMe();
      toast.success("Disconnesso da FiguTrivia.");
    },
  });

  const guessMutation = trpc.album.guessPlayer.useMutation();
  const hintMutation = trpc.album.useHint.useMutation();
  const toggleMancoMutation = trpc.mancolista.toggle.useMutation();

  const playersById = useMemo(
    () => new Map(players.map((p) => [p.player_id, p])),
    [players]
  );

  const allPlayerNames = useMemo(
    () =>
      Array.from(new Set(players.map((p) => p.name))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [players]
  );

  const progressMap = useMemo(() => {
    const map = new Map<
      string,
      {
        solved: boolean;
        hintsUsed: string[];
        pointsAwarded: number;
        unlockedByUsername: string | null;
      }
    >();
    for (const row of albumState?.progress ?? []) {
      map.set(row.playerId, row);
    }
    return map;
  }, [albumState]);

  const solvedSet = useMemo(() => {
    const s = new Set<string>();
    for (const [pid, row] of progressMap.entries()) {
      if (row.solved) s.add(pid);
    }
    return s;
  }, [progressMap]);

  const mancolistaSet = useMemo(
    () => new Set(albumState?.mancolista ?? []),
    [albumState]
  );

  const unlockedTrophiesSet = useMemo(
    () => new Set((albumState?.achievements ?? []).map((a) => a.achievementId)),
    [albumState]
  );

  const totalsByDecade = useMemo(() => {
    const counts: Record<AlbumDecadeKey, number> = {
      "1980-89": 0,
      "1990-99": 0,
      "2000-09": 0,
      "2010-19": 0,
      "2020-oggi": 0,
    };
    for (const p of players) counts[p.album_decade]++;
    return counts;
  }, [players]);

  const solvedByDecade = useMemo(() => {
    const counts: Record<AlbumDecadeKey, number> = {
      "1980-89": 0,
      "1990-99": 0,
      "2000-09": 0,
      "2010-19": 0,
      "2020-oggi": 0,
    };
    for (const p of players) {
      if (solvedSet.has(p.player_id)) counts[p.album_decade]++;
    }
    return counts;
  }, [players, solvedSet]);

  const decadePlayers = useMemo(
    () => players.filter((p) => p.album_decade === activeDecade),
    [players, activeDecade]
  );

  const ranges = useMemo(() => {
    const total = decadePlayers.length;
    const step = 150;
    const out: { label: string; min: number; max: number }[] = [];
    for (let start = 1; start <= total; start += step) {
      const end = Math.min(total, start + step - 1);
      out.push({ label: `${start}–${end}`, min: start, max: end });
    }
    out.push({ label: "Tutte", min: 1, max: 999999 });
    return out;
  }, [decadePlayers.length]);

  const activeRange = ranges[selectedRangeIdx] || ranges[0] || {
    label: "Tutte",
    min: 1,
    max: 999999,
  };

  const filteredPlayers = useMemo(() => {
    return decadePlayers.filter((p) => {
      if (p.numero < activeRange.min || p.numero > activeRange.max) return false;
      const isSolved = solvedSet.has(p.player_id);
      if (statusFilter === "solved" && !isSolved) return false;
      if (statusFilter === "unsolved" && isSolved) return false;
      if (statusFilter === "mancolista" && !mancolistaSet.has(p.player_id))
        return false;
      return true;
    });
  }, [decadePlayers, activeRange, statusFilter, solvedSet, mancolistaSet]);

  // Restore scroll position when returning to the album grid
  useLayoutEffect(() => {
    if (activeTab !== "album" || selectedPlayer) return;
    const el = gridContainerRef.current;
    const saved = savedScrollTopByDecade.current[activeDecade] ?? 0;
    if (!el || saved <= 0) return;
    el.scrollTop = saved;
    const rafId = requestAnimationFrame(() => {
      if (el.scrollTop === 0) el.scrollTop = saved;
    });
    return () => cancelAnimationFrame(rafId);
  }, [activeTab, activeDecade, selectedPlayer]);

  // Reset detail input state on player change
  useEffect(() => {
    setGuess("");
    setShowDropdown(false);
    setAttempts([]);
    setLastSolvedPct(null);
  }, [selectedPlayer?.player_id]);

  const openPlayerDetail = (p: FigurinaPlayer) => {
    if (gridContainerRef.current) {
      savedScrollTopByDecade.current[activeDecade] =
        gridContainerRef.current.scrollTop;
    }
    setActiveDecade(p.album_decade);
    setActiveTab("album");
    setSelectedPlayer(p);
  };

  const handleBackToAlbum = () => {
    setSelectedPlayer(null);
  };

  const requireAuth = (): boolean => {
    if (user) return true;
    setAuthModalOpen(true);
    toast.info("Crea un account o accedi per salvare i tuoi progressi.");
    return false;
  };

  const handleToggleMancolista = async (
    playerId: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    if (!requireAuth()) return;
    try {
      const res = await toggleMancoMutation.mutateAsync({ playerId });
      await refetchAlbumState();
      toast.success(
        res.inMancolista
          ? "Aggiunta alla tua Mancolista ❤️"
          : "Rimossa dalla tua Mancolista"
      );
    } catch (err: any) {
      toast.error(err?.message || "Errore Mancolista.");
    }
  };

  const handleUseHint = async (hintType: HintType) => {
    if (!selectedPlayer || !requireAuth()) return;
    try {
      const res = await hintMutation.mutateAsync({
        playerId: selectedPlayer.player_id,
        hintType,
      });
      await refetchAlbumState();
      toast.success(`Indizio svelato! Punti rimasti: ${res.newPoints} pt`);
    } catch (err: any) {
      toast.error(err?.message || "Punti indizio insufficienti.");
    }
  };

  const handleGuess = async () => {
    if (!selectedPlayer || !guess.trim()) return;
    if (!requireAuth()) return;

    const trimmed = guess.trim();
    try {
      const res = await guessMutation.mutateAsync({
        playerId: selectedPlayer.player_id,
        guess: trimmed,
      });
      setAttempts((prev) => [{ value: trimmed, correct: res.correct }, ...prev]);
      setGuess("");
      setShowDropdown(false);

      if (!res.correct) {
        toast.error("Nome errato, riprova!");
        return;
      }

      if (res.discoveryStats) {
        setLastSolvedPct(res.discoveryStats);
      }

      await refetchAlbumState();

      if (!res.alreadySolved) {
        const pctStr = res.discoveryStats
          ? ` • Trovato dal ${res.discoveryStats.pct}% dei giocatori`
          : "";
        toast.success(
          `🏆 ${selectedPlayer.name} sbloccato! +${res.pointsAwarded} pt${pctStr}`,
          { duration: 4500 }
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

  const currentIdxInDecade = useMemo(() => {
    if (!selectedPlayer) return -1;
    return decadePlayers.findIndex(
      (p) => p.player_id === selectedPlayer.player_id
    );
  }, [decadePlayers, selectedPlayer]);

  const currentPoints = albumState?.points ?? 0;
  const totalPlayersCount = players.length;
  const totalSolvedCount = solvedSet.size;

  const selectedProgress = selectedPlayer
    ? progressMap.get(selectedPlayer.player_id)
    : undefined;
  const isSelectedSolved = Boolean(selectedProgress?.solved);
  const selectedHints = selectedProgress?.hintsUsed ?? [];
  const selectedInMancolista = selectedPlayer
    ? mancolistaSet.has(selectedPlayer.player_id)
    : false;

  const selectedDiscoveryStats = useMemo(() => {
    if (lastSolvedPct) return lastSolvedPct;
    if (!selectedPlayer || !albumState) return null;
    const totalUsers = albumState.totalUsers || 1;
    const solvers =
      albumState.discoveryCounts[selectedPlayer.player_id] ??
      (isSelectedSolved ? 1 : 0);
    const pct = Math.round((solvers / totalUsers) * 1000) / 10;
    return { solvers, totalUsers, pct };
  }, [lastSolvedPct, selectedPlayer, albumState, isSelectedSolved]);

  return (
    <div className="h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="bg-amber-400 border-b-2 sm:border-b-4 border-black px-2.5 py-1.5 sm:px-4 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-10 sm:h-10 bg-black text-amber-400 border-2 border-black flex items-center justify-center font-display font-black text-sm sm:text-xl shadow-[2px_2px_0px_0px_rgba(255,255,255,0.6)] flex-shrink-0">
            FT
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-black uppercase text-base sm:text-xl md:text-2xl tracking-tight text-black leading-none truncate">
                FiguTrivia
              </h1>
              <span className="sm:hidden bg-black text-amber-400 font-mono font-bold text-[10px] px-1.5 py-0.5 leading-none">
                {totalSolvedCount}/{totalPlayersCount || "—"}
              </span>
            </div>
            <p className="hidden sm:block text-[11px] font-bold uppercase text-black/80 mt-0.5">
              Serie A +50 presenze dalla 1979/80 ad oggi • {totalSolvedCount}/
              {totalPlayersCount || "—"} sbloccate
            </p>
          </div>
        </div>

        {/* Nav Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("album");
              setSelectedPlayer(null);
              if (user) refetchAlbumState();
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 font-display font-black uppercase text-[11px] sm:text-xs border-2 border-black flex items-center gap-1 sm:gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              activeTab === "album"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-amber-100"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Album</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!requireAuth()) return;
              setActiveTab("mancoliste");
              setSelectedPlayer(null);
              refetchAlbumState();
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 font-display font-black uppercase text-[11px] sm:text-xs border-2 border-black flex items-center gap-1 sm:gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              activeTab === "mancoliste"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-amber-100"
            }`}
          >
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 fill-rose-500" />
            <span className="hidden sm:inline">Mancoliste</span>
            <span>
              ({mancolistaSet.size}/{MAX_MANCOLISTA_SIZE})
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!requireAuth()) return;
              setActiveTab("trofei");
              setSelectedPlayer(null);
              refetchAlbumState();
            }}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 font-display font-black uppercase text-[11px] sm:text-xs border-2 border-black flex items-center gap-1 sm:gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              activeTab === "trofei"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-amber-100"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            <span className="hidden xs:inline sm:inline">Trofei</span>
          </button>
        </nav>

        {/* User / Points */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {installPrompt && (
            <button
              type="button"
              onClick={async () => {
                installPrompt.prompt();
                const res = await installPrompt.userChoice;
                if (res?.outcome === "accepted") {
                  setInstallPrompt(null);
                }
              }}
              title="Installa l'App FiguTrivia sul tuo dispositivo"
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-display font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Installa App</span>
            </button>
          )}
          {user ? (
            <>
              <div
                title="Punti Indizio disponibili"
                className="flex items-center gap-0.5 sm:gap-1 bg-white border-2 border-black px-1.5 py-0.5 sm:px-2.5 sm:py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 fill-amber-500" />
                <span className="font-black text-xs sm:text-sm">
                  {currentPoints}
                </span>
                <span className="hidden sm:inline text-[10px] font-bold uppercase text-gray-600">
                  pt
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 bg-white border-2 border-black px-2.5 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black">
                <User className="w-3.5 h-3.5" />@{user.username}
              </div>
              <button
                type="button"
                onClick={() => logoutMutation.mutate()}
                title="Esci"
                className="p-1 sm:p-1.5 bg-black text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={loadingUser}
              onClick={() => setAuthModalOpen(true)}
              className="px-2 py-1 sm:px-3 sm:py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-display font-black uppercase text-[11px] sm:text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Accedi / Registrati</span>
              <span className="sm:hidden">Accedi</span>
            </button>
          )}
        </div>
      </header>

      {/* Banner account obbligatorio per salvare progressi */}
      {!loadingUser && !user && (
        <div className="bg-rose-600 text-white border-b-2 sm:border-b-4 border-black px-2.5 py-1 sm:px-4 sm:py-2 flex items-center justify-between gap-2 flex-shrink-0">
          <p className="text-[11px] sm:text-xs font-bold truncate">
            <span className="sm:hidden">
              Crea un account gratuito per salvare album, trofei e Mancolista.
            </span>
            <span className="hidden sm:inline">
              Crea un account gratuito per iniziare la collezione, salvare i tuoi
              album per decennio, sbloccare i trofei e creare la tua Mancolista.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="px-2 py-0.5 sm:px-3 sm:py-1 bg-amber-400 text-black font-black text-[10px] sm:text-xs uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0"
          >
            Crea Account
          </button>
        </div>
      )}

      {/* Main content */}
      {activeTab === "mancoliste" && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-6xl w-full mx-auto">
          <MancolisteView
            playersById={playersById}
            solvedSet={solvedSet}
            onSelectPlayer={openPlayerDetail}
            onAfterMutate={() => refetchAlbumState()}
          />
        </div>
      )}

      {activeTab === "trofei" && (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-6xl w-full mx-auto">
          <TrophiesView
            players={players}
            solvedSet={solvedSet}
            totalSolved={totalSolvedCount}
            solvedByDecade={solvedByDecade}
            totalsByDecade={totalsByDecade}
            unlockedIds={unlockedTrophiesSet}
          />
        </div>
      )}

      {activeTab === "album" && !selectedPlayer && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Decade Selector + Progress + Filters (ultra-compact on mobile) */}
          <div className="bg-white border-b-2 sm:border-b-4 border-black px-2 py-1.5 sm:px-4 sm:py-3 space-y-1.5 sm:space-y-2.5 flex-shrink-0">
            <div className="max-w-7xl mx-auto space-y-1.5 sm:space-y-2.5">
              {/* Row 1: 5 Decade Albums (single horizontal scroll row on mobile) */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap pb-0.5 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {ALBUM_DECADES.map((d) => {
                  const totalD = totalsByDecade[d.key] || 0;
                  const solvedD = solvedByDecade[d.key] || 0;
                  const active = activeDecade === d.key;
                  const shortLabel = d.label.replace(/^19|^20/, "");
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => {
                        setActiveDecade(d.key);
                        setSelectedRangeIdx(0);
                        setCompactMobileFilters(false);
                      }}
                      className={`px-2 py-1 sm:px-3 sm:py-1.5 border-2 border-black font-display font-black uppercase text-[11px] sm:text-xs flex items-center gap-1.5 sm:gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex-shrink-0 ${
                        active
                          ? "bg-black text-white"
                          : "bg-gray-100 text-black hover:bg-amber-100"
                      }`}
                    >
                      <span className="hidden sm:inline">Album {d.label}</span>
                      <span className="sm:hidden">{shortLabel}</span>
                      <span
                        className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold leading-tight ${
                          active
                            ? "bg-amber-400 text-black"
                            : "bg-white text-black border border-black"
                        }`}
                      >
                        {solvedD}/{totalD}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Desktop full progress bar; Mobile thin 4px progress bar */}
              <div className="hidden sm:block">
                <div className="flex items-center justify-between text-xs font-bold uppercase mb-1">
                  <span>
                    Album{" "}
                    {ALBUM_DECADES.find((d) => d.key === activeDecade)?.label ||
                      activeDecade}{" "}
                    ({ALBUM_DECADES.find((d) => d.key === activeDecade)?.subtitle})
                    {" "}— ordinato per presenze in Serie A
                  </span>
                  <span>
                    {solvedByDecade[activeDecade]}/{totalsByDecade[activeDecade]}{" "}
                    (
                    {totalsByDecade[activeDecade] > 0
                      ? Math.round(
                          (solvedByDecade[activeDecade] /
                            totalsByDecade[activeDecade]) *
                            100
                        )
                      : 0}
                    %)
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 border-2 border-black">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                    style={{
                      width: `${
                        totalsByDecade[activeDecade] > 0
                          ? (solvedByDecade[activeDecade] /
                              totalsByDecade[activeDecade]) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Ranges & Status filter (single compact row on mobile, auto-hides when scrolling down on mobile) */}
              <div
                className={`items-center justify-between gap-1.5 sm:gap-2 ${
                  compactMobileFilters ? "hidden sm:flex" : "flex"
                } sm:flex-wrap`}
              >
                <div className="flex items-center gap-1 overflow-x-auto sm:flex-wrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-w-0">
                  {ranges.map((r, idx) => {
                    const isSecComplete =
                      r.label !== "Tutte" &&
                      decadePlayers.length > 0 &&
                      decadePlayers
                        .filter((p) => p.numero >= r.min && p.numero <= r.max)
                        .every((p) => solvedSet.has(p.player_id));
                    return (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => {
                          savedScrollTopByDecade.current[activeDecade] = 0;
                          if (gridContainerRef.current)
                            gridContainerRef.current.scrollTop = 0;
                          setSelectedRangeIdx(idx);
                        }}
                        className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase border-2 border-black flex items-center gap-1 flex-shrink-0 ${
                          selectedRangeIdx === idx
                            ? "bg-black text-white"
                            : "bg-gray-100 text-black hover:bg-amber-100"
                        }`}
                      >
                        <span>{r.label}</span>
                        {isSecComplete && <span title="Sezione completata">🏆</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Mobile compact status dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    savedScrollTopByDecade.current[activeDecade] = 0;
                    if (gridContainerRef.current)
                      gridContainerRef.current.scrollTop = 0;
                    setStatusFilter(e.target.value as StatusFilter);
                  }}
                  aria-label="Filtra stato figurine"
                  className="sm:hidden px-1.5 py-0.5 text-[10px] font-black uppercase border-2 border-black bg-amber-400 text-black flex-shrink-0"
                >
                  <option value="all">Tutte</option>
                  <option value="unsolved">Da trovare</option>
                  <option value="solved">Indovinate</option>
                  <option value="mancolista">❤️ Manco</option>
                </select>

                {/* Desktop status filter buttons */}
                <div className="hidden sm:flex flex-wrap gap-1">
                  {(
                    [
                      { key: "all", label: "Tutte" },
                      { key: "unsolved", label: "Da indovinare" },
                      { key: "solved", label: "Indovinate" },
                      { key: "mancolista", label: "❤️ Mancolista" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        savedScrollTopByDecade.current[activeDecade] = 0;
                        if (gridContainerRef.current)
                          gridContainerRef.current.scrollTop = 0;
                        setStatusFilter(f.key);
                      }}
                      className={`px-2.5 py-0.5 text-[11px] font-bold uppercase border-2 border-black ${
                        statusFilter === f.key
                          ? "bg-amber-400 text-black"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div
            ref={gridContainerRef}
            onScroll={(e) => {
              const top = e.currentTarget.scrollTop;
              savedScrollTopByDecade.current[activeDecade] = top;
              const delta = top - lastScrollYRef.current;
              lastScrollYRef.current = top;
              if (top > 70 && delta > 8 && !compactMobileFilters) {
                setCompactMobileFilters(true);
              } else if ((top <= 25 || delta < -12) && compactMobileFilters) {
                setCompactMobileFilters(false);
              }
            }}
            className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-50"
          >
            <div className="max-w-7xl mx-auto">
              {loadingPlayers ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] bg-gray-200 animate-pulse border-2 border-black"
                    />
                  ))}
                </div>
              ) : filteredPlayers.length === 0 ? (
                <div className="py-16 text-center font-bold uppercase text-sm text-gray-500">
                  Nessuna figurina corrisponde a questo filtro.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                  {filteredPlayers.map((p) => (
                    <FigurinaThumb
                      key={p.player_id}
                      player={p}
                      isSolved={solvedSet.has(p.player_id)}
                      inMancolista={mancolistaSet.has(p.player_id)}
                      onClick={() => openPlayerDetail(p)}
                      onToggleMancolista={(e) =>
                        handleToggleMancolista(p.player_id, e)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Player Detail View */}
      {activeTab === "album" && selectedPlayer && (
        <div className="flex-1 overflow-y-auto bg-gray-50 px-2.5 pt-1.5 pb-6 sm:p-4 md:p-5">
          <div className="max-w-xl w-full mx-auto space-y-1.5 sm:space-y-3">
            {/* Top Navigation Bar inside Detail: [<-]   [ <- | #numero | -> ]   [ ] */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleBackToAlbum}
                title="Torna all'album"
                aria-label="Torna all'album"
                className="p-1 sm:p-1.5 bg-white hover:bg-gray-100 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentIdxInDecade <= 0}
                  onClick={() =>
                    currentIdxInDecade > 0 &&
                    setSelectedPlayer(decadePlayers[currentIdxInDecade - 1])
                  }
                  title="Figurina precedente"
                  aria-label="Figurina precedente"
                  className="p-1 sm:p-1.5 bg-white hover:bg-gray-100 border-2 border-black font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-display font-black text-xs sm:text-sm uppercase bg-amber-400 px-3 py-0.5 sm:py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] min-w-[60px] text-center">
                  #{selectedPlayer.numero}
                </span>

                <button
                  type="button"
                  disabled={
                    currentIdxInDecade < 0 ||
                    currentIdxInDecade >= decadePlayers.length - 1
                  }
                  onClick={() =>
                    currentIdxInDecade < decadePlayers.length - 1 &&
                    setSelectedPlayer(decadePlayers[currentIdxInDecade + 1])
                  }
                  title="Figurina successiva"
                  aria-label="Figurina successiva"
                  className="p-1 sm:p-1.5 bg-white hover:bg-gray-100 border-2 border-black font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="w-7" />
            </div>

            {/* Enlarged Sticker: large 3:4 card (268x357px on mobile, ~70px shorter than original 320x427px max-w-xs so it stays big with ~1cm bottom margin and 0 distortion) */}
            <div
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              className="relative w-[268px] sm:w-72 mx-auto aspect-[3/4] border-3 sm:border-4 border-black bg-white select-none shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              <ProtectedImage
                src={selectedPlayer.photo_url}
                objectPosition="top"
                canvasWidth={480}
                canvasHeight={640}
              />
              {isSelectedSolved && (
                <FigurinaSolvedOverlay
                  size="lg"
                  playerName={selectedPlayer.name}
                  nationality={selectedPlayer.nationality}
                  role={selectedPlayer.position}
                />
              )}
            </div>

            {/* Action buttons: ❤️ (count/50) + ⚠️ icon */}
            <div className="flex items-center justify-center gap-2 flex-shrink-0">
              {!isSelectedSolved && (
                <button
                  type="button"
                  onClick={() =>
                    handleToggleMancolista(selectedPlayer.player_id)
                  }
                  title={
                    selectedInMancolista
                      ? "Rimuovi dalla Mancolista"
                      : "Aggiungi alla Mancolista"
                  }
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 border-2 border-black font-bold text-xs flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    selectedInMancolista
                      ? "bg-rose-600 text-white"
                      : "bg-white hover:bg-rose-50 text-black"
                  }`}
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      selectedInMancolista
                        ? "fill-white text-white"
                        : "fill-rose-600 text-rose-600"
                    }`}
                  />
                  <span>
                    ({mancolistaSet.size}/{MAX_MANCOLISTA_SIZE})
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!requireAuth()) return;
                  setReportPlayer(selectedPlayer);
                }}
                title="Segnala errore"
                aria-label="Segnala errore"
                className="p-1 sm:p-1.5 bg-white hover:bg-amber-50 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              </button>
            </div>

            {/* Solved Card Info + Global Discovery % */}
            {isSelectedSolved && (
              <div className="bg-emerald-50 border-3 sm:border-4 border-emerald-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base sm:text-xl font-display font-black uppercase text-emerald-900 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                    {selectedPlayer.name}
                  </h3>
                  <span className="bg-amber-400 border-2 border-black px-2 py-0.5 text-[11px] font-black uppercase">
                    +{getPointsForSection(selectedPlayer.numero)} pt indizio
                  </span>
                </div>

                {selectedProgress?.unlockedByUsername && (
                  <div className="bg-white border-2 border-black px-2.5 py-1 text-xs font-bold text-rose-700">
                    🎁 Figurina regalata da @{selectedProgress.unlockedByUsername}{" "}
                    tramite la tua Mancolista!
                  </div>
                )}

                {selectedDiscoveryStats && (
                  <div className="bg-white border-2 border-black px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] sm:text-xs font-bold uppercase flex items-center gap-1.5 text-gray-800">
                      <Globe className="w-3.5 h-3.5 text-sky-600" />
                      Trovato dai giocatori:
                    </span>
                    <span className="font-display font-black text-sm sm:text-base text-sky-700">
                      {selectedDiscoveryStats.pct}% (
                      {selectedDiscoveryStats.solvers}/
                      {selectedDiscoveryStats.totalUsers})
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-white border-2 border-black p-2">
                    <div className="text-[9px] font-bold uppercase text-gray-500">
                      Presenze Serie A
                    </div>
                    <div className="font-black text-sm sm:text-base">
                      {selectedPlayer.serie_a_apps}
                    </div>
                  </div>
                  <div className="bg-white border-2 border-black p-2">
                    <div className="text-[9px] font-bold uppercase text-gray-500">
                      Anno di Nascita
                    </div>
                    <div className="font-black text-sm sm:text-base">
                      {selectedPlayer.birth_year ?? "N/D"}
                    </div>
                  </div>
                  <div className="bg-white border-2 border-black p-2">
                    <div className="text-[9px] font-bold uppercase text-gray-500">
                      Ruolo
                    </div>
                    <div className="font-bold text-xs sm:text-sm">
                      {selectedPlayer.position}
                    </div>
                  </div>
                  <div className="bg-white border-2 border-black p-2">
                    <div className="text-[9px] font-bold uppercase text-gray-500">
                      Nazionalità
                    </div>
                    <div className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                      <CountryFlag
                        nationality={selectedPlayer.nationality}
                        onlyFirst
                        size="md"
                      />
                      <span>
                        {getFirstCountryName(selectedPlayer.nationality)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Breakdown presenze per decennio */}
                <div className="bg-white border-2 border-black p-2">
                  <div className="text-[9px] font-bold uppercase text-gray-500 mb-1">
                    Presenze Serie A per decennio
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {ALBUM_DECADES.map((d) => (
                      <div
                        key={d.key}
                        className={`p-1 border border-black text-[10px] font-bold ${
                          d.key === selectedPlayer.album_decade
                            ? "bg-amber-200"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="text-[8px] text-gray-600">{d.label}</div>
                        <div>{selectedPlayer.decade_apps[d.key] || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Unsolved Hints (1 single line of 3 columns) & Guess Form */}
            {!isSelectedSolved && (
              <div className="flex-shrink-0 space-y-1.5">
                <div className="bg-white border-3 sm:border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-1.5 sm:p-3">
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
                    {/* Indizio 1: Anno & Ruolo */}
                    <div
                      className={`border-2 border-black p-1 sm:p-2 flex flex-col justify-between text-center ${
                        selectedHints.includes("anno_ruolo")
                          ? "bg-amber-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500 leading-tight mb-0.5">
                        Anno & Ruolo
                      </div>
                      {selectedHints.includes("anno_ruolo") ? (
                        <div className="font-bold text-[10px] sm:text-xs leading-tight py-0.5">
                          {selectedPlayer.birth_year ?? "N/D"} •{" "}
                          {selectedPlayer.position}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUseHint("anno_ruolo")}
                          disabled={hintMutation.isPending}
                          className="w-full py-0.5 sm:py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] sm:text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          ⭐ {HINT_COSTS.anno_ruolo} pt
                        </button>
                      )}
                    </div>

                    {/* Indizio 2: Nazione (solo bandiera 1ª nazionalità) & Presenze */}
                    <div
                      className={`border-2 border-black p-1 sm:p-2 flex flex-col justify-between text-center ${
                        selectedHints.includes("nazionalita_presenze")
                          ? "bg-amber-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500 leading-tight mb-0.5">
                        Nazione & Pres.
                      </div>
                      {selectedHints.includes("nazionalita_presenze") ? (
                        <div className="font-bold text-[11px] sm:text-xs leading-tight py-0.5 flex items-center justify-center gap-1 flex-wrap">
                          <CountryFlag
                            nationality={selectedPlayer.nationality}
                            onlyFirst
                            showNameOnDesktop
                            size="md"
                          />
                          <span>• {selectedPlayer.serie_a_apps}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleUseHint("nazionalita_presenze")
                          }
                          disabled={hintMutation.isPending}
                          className="w-full py-0.5 sm:py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] sm:text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          ⭐ {HINT_COSTS.nazionalita_presenze} pt
                        </button>
                      )}
                    </div>

                    {/* Indizio 3: Iniziali Cognome */}
                    <div
                      className={`border-2 border-black p-1 sm:p-2 flex flex-col justify-between text-center ${
                        selectedHints.includes("iniziali")
                          ? "bg-amber-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-500 leading-tight mb-0.5">
                        Iniziali
                      </div>
                      {selectedHints.includes("iniziali") ? (
                        <div className="font-mono font-bold text-xs sm:text-sm tracking-wider py-0.5">
                          {getSurnameInitials(selectedPlayer.name)}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUseHint("iniziali")}
                          disabled={hintMutation.isPending}
                          className="w-full py-0.5 sm:py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] sm:text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          ⭐ {HINT_COSTS.iniziali} pt
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border-3 sm:border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-1.5 sm:p-3">
                  <div className="relative flex gap-1.5 sm:gap-2">
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
                          if (e.key === "Enter") handleGuess();
                          if (e.key === "Escape") setShowDropdown(false);
                        }}
                        placeholder="Scrivi il nome del calciatore..."
                        className="w-full border-2 border-black px-2.5 py-1.5 sm:py-2 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                        autoComplete="off"
                      />

                      {showDropdown &&
                        (() => {
                          const normG = normalizePlayerStr(guess);
                          const altG = normG
                            .replace(/ae/g, "a")
                            .replace(/oe/g, "o");
                          const matches = allPlayerNames
                            .filter((n) => {
                              const normN = normalizePlayerStr(n);
                              if (normN.includes(normG)) return true;
                              return normN
                                .replace(/ae/g, "a")
                                .replace(/oe/g, "o")
                                .includes(altG);
                            })
                            .slice(0, 8);
                          return matches.length > 0 ? (
                            <div className="absolute z-50 bottom-full mb-1 left-0 right-0 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-44 overflow-y-auto">
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
                      onClick={handleGuess}
                      disabled={!guess.trim() || guessMutation.isPending}
                      className="bg-black hover:bg-gray-800 text-white font-bold uppercase text-xs px-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                    >
                      Conferma
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={async () => {
          await refetchMe();
          await refetchAlbumState();
        }}
      />

      <ErrorReportModal
        player={reportPlayer}
        onClose={() => setReportPlayer(null)}
      />

      {(() => {
        const unseenGifts: ReceivedGiftItem[] = (
          albumState?.receivedGifts ?? []
        ).filter((g) => !seenGiftIds.has(g.id) && playersById.has(g.playerId));
        const currentGift = unseenGifts[0];
        if (!currentGift) return null;
        const giftedPlayer = playersById.get(currentGift.playerId);
        if (!giftedPlayer) return null;
        return (
          <GiftRevealModal
            gift={currentGift}
            player={giftedPlayer}
            remainingCount={unseenGifts.length}
            onConfirm={() => markGiftSeen(currentGift.id)}
            onOpenPlayerInAlbum={(p) => {
              markGiftSeen(currentGift.id);
              openPlayerDetail(p);
            }}
          />
        );
      })()}
    </div>
  );
}

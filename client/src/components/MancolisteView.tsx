import React from "react";
import { Gift, Heart, Lock, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  MAX_DAILY_GIFTS,
  MAX_MANCOLISTA_SIZE,
  type FigurinaPlayer,
} from "@shared/figutrivia";
import { ProtectedImage } from "@/components/ProtectedImage";
import { trpc } from "@/lib/trpc";

interface MancolisteViewProps {
  playersById: Map<string, FigurinaPlayer>;
  solvedSet: Set<string>;
  onSelectPlayer: (player: FigurinaPlayer) => void;
  onAfterMutate: () => void;
}

export function MancolisteView({
  playersById,
  solvedSet,
  onSelectPlayer,
  onAfterMutate,
}: MancolisteViewProps) {
  const { data, isLoading, refetch } = trpc.mancolista.listAll.useQuery();
  const toggleMutation = trpc.mancolista.toggle.useMutation();
  const giftMutation = trpc.mancolista.giftSticker.useMutation();

  const handleRemove = async (playerId: string) => {
    try {
      await toggleMutation.mutateAsync({ playerId });
      await refetch();
      onAfterMutate();
      toast.success("Rimossa dalla tua Mancolista");
    } catch (err: any) {
      toast.error(err?.message || "Errore nella rimozione");
    }
  };

  const handleGift = async (recipientUserId: number, playerId: string) => {
    try {
      const res = await giftMutation.mutateAsync({ recipientUserId, playerId });
      await refetch();
      onAfterMutate();
      toast.success(
        `Figurina regalata! Ti restano ${res.dailyGiftsRemaining}/${MAX_DAILY_GIFTS} regali oggi.`
      );
    } catch (err: any) {
      toast.error(err?.message || "Impossibile regalare questa figurina.");
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
              cuore ❤️ e aiuta gli altri utenti sbloccando fino a{" "}
              {MAX_DAILY_GIFTS} figurine al giorno che hai già trovato.
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
                      className="border-2 border-black p-2 bg-gray-50 flex items-center gap-2.5"
                    >
                      <div className="w-12 h-16 flex-shrink-0 border-2 border-black overflow-hidden bg-gray-200 relative">
                        <ProtectedImage
                          src={p.photo_url}
                          canvasWidth={120}
                          canvasHeight={160}
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
                            onClick={() => handleGift(other.userId, p.player_id)}
                            className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40"
                          >
                            <Gift className="w-3 h-3" />
                            Regala figurina
                          </button>
                        ) : (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
                            <Lock className="w-3 h-3" />
                            Trovala prima nel tuo album
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
    </div>
  );
}

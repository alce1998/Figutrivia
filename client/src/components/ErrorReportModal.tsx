import React, { useState } from "react";
import { AlertTriangle, X, Send } from "lucide-react";
import { toast } from "sonner";
import type { FigurinaPlayer } from "@shared/figutrivia";
import { trpc } from "@/lib/trpc";

interface ErrorReportModalProps {
  player: FigurinaPlayer | null;
  onClose: () => void;
}

const PRESET_REASONS = [
  "Foto sbagliata / omonimo / non è il giocatore",
  "Foto sfocata, di spalle o ritratto disegnato",
  "Ruolo / Anno di nascita / Nazionalità errati",
  "Numero presenze o decennio errato",
];

export function ErrorReportModal({ player, onClose }: ErrorReportModalProps) {
  const [reason, setReason] = useState(PRESET_REASONS[0]);
  const [notes, setNotes] = useState("");
  const reportMutation = trpc.album.reportError.useMutation();

  if (!player) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullDesc = notes.trim() ? `${reason} — ${notes.trim()}` : reason;
    try {
      const res = await reportMutation.mutateAsync({
        playerId: player.player_id,
        description: fullDesc,
      });
      if (res.emailSent) {
        toast.success(
          `Segnalazione inviata a ${res.recipient}! Grazie per il contributo.`
        );
      } else {
        toast.success(
          `Segnalazione registrata per ${res.recipient}. Grazie per il contributo!`
        );
      }
      setNotes("");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Errore durante l'invio della segnalazione.");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-rose-600 text-white border-b-4 border-black px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <h3 className="font-display font-black uppercase text-sm">
                Segnala Errore Figurina #{player.numero}
              </h3>
              <p className="text-[11px] font-bold opacity-90">
                Album {player.album_decade} • Invio a alessandro.centra10@gmail.com
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 bg-black text-white flex items-center justify-center border border-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase mb-1.5">
              Tipo di problema
            </label>
            <div className="space-y-1.5">
              {PRESET_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2 p-2 border-2 border-black text-xs font-bold cursor-pointer ${
                    reason === r ? "bg-amber-100" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Dettagli aggiuntivi (opzionale)
            </label>
            <textarea
              rows={3}
              maxLength={1500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descrivi cosa non va nella figurina..."
              className="w-full border-2 border-black p-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border-2 border-black font-bold text-xs uppercase"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={reportMutation.isPending}
              className="flex-1 py-2 bg-black hover:bg-gray-800 text-white border-2 border-black font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {reportMutation.isPending ? "Invio..." : "Invia Segnalazione"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { X, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onClose?: () => void;
  canClose?: boolean;
  onSuccess: () => void;
}

export function AuthModal({
  open,
  onClose,
  canClose = true,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      const endpoint =
        mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? { username: username.trim(), email: email.trim(), password }
          : { identifier: identifier.trim(), password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || "Operazione non riuscita.");
        setSubmitting(false);
        return;
      }
      toast.success(
        mode === "register"
          ? `Benvenuto su FiguTrivia, ${data.user.username}!`
          : `Bentornato, ${data.user.username}!`
      );
      onSuccess();
      onClose?.();
    } catch {
      setErrorMsg("Errore di connessione al server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="relative w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-amber-400 border-b-4 border-black px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="font-display font-black uppercase text-lg text-black">
              {mode === "register"
                ? "Crea il tuo Account"
                : "Accedi a FiguTrivia"}
            </h2>
            <p className="text-[11px] font-bold uppercase text-black/75">
              Salva i tuoi album, trofei e mancoliste
            </p>
          </div>
          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-black text-white border-2 border-black"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 border-b-4 border-black">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg("");
            }}
            className={`py-2.5 font-display font-black uppercase text-xs flex items-center justify-center gap-1.5 border-r-2 border-black ${
              mode === "register"
                ? "bg-black text-white"
                : "bg-gray-100 text-black hover:bg-amber-50"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Registrati
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg("");
            }}
            className={`py-2.5 font-display font-black uppercase text-xs flex items-center justify-center gap-1.5 ${
              mode === "login"
                ? "bg-black text-white"
                : "bg-gray-100 text-black hover:bg-amber-50"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Accedi
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 border-2 border-red-600 text-red-700 px-3 py-2 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {mode === "register" ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={24}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Es. Baggio_10"
                  className="w-full border-2 border-black px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  className="w-full border-2 border-black px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                Email o Username
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email o Username"
                className="w-full border-2 border-black px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caratteri"
              className="w-full border-2 border-black px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-display font-black uppercase text-sm border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
          >
            {submitting
              ? "Attendere..."
              : mode === "register"
                ? "Crea Account e Inizia"
                : "Entra in FiguTrivia"}
          </button>
        </form>
      </div>
    </div>
  );
}

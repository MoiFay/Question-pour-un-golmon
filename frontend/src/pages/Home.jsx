import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { Logo, ConnectionBadge, ErrorToast } from "../components/UI";

const TABS = ["join", "create"];

export default function Home() {
  const { code: urlCode } = useParams();
  const { connected, createRoom, joinRoom, error, clearError } = useSocket();

  const [tab, setTab] = useState(urlCode ? "join" : "join");
  const [pseudo, setPseudo] = useState("");
  const [roomCode, setRoomCode] = useState(urlCode || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlCode) {
      setRoomCode(urlCode.toUpperCase());
      setTab("join");
    }
  }, [urlCode]);

  // Clear loading on error
  useEffect(() => {
    if (error) setLoading(false);
  }, [error]);

  function handleCreate(e) {
    e.preventDefault();
    if (!pseudo.trim() || !connected) return;
    setLoading(true);
    createRoom(pseudo.trim());
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!pseudo.trim() || !roomCode.trim() || !connected) return;
    setLoading(true);
    joinRoom(roomCode.trim().toUpperCase(), pseudo.trim());
  }

  return (
    <div className="min-h-screen bg-golmon-bg flex flex-col items-center justify-center px-4 py-10">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <Logo size="xl" />
          <p className="text-golmon-neutral text-lg font-semibold tracking-wide">
            Battle Royale de questions 🎮 Twitch / Kick
          </p>
          <ConnectionBadge connected={connected} />
        </div>

        {/* Card */}
        <div className="card w-full shadow-2xl">
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden border border-golmon-border mb-6">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 font-display font-bold text-sm uppercase tracking-widest transition-all duration-200 ${
                  tab === t
                    ? "bg-golmon-gold text-black"
                    : "bg-golmon-card text-golmon-neutral hover:text-white"
                }`}
              >
                {t === "join" ? "🔑 Rejoindre" : "🏠 Créer"}
              </button>
            ))}
          </div>

          <form onSubmit={tab === "join" ? handleJoin : handleCreate} className="space-y-4">
            {/* Pseudo */}
            <div>
              <label className="text-golmon-neutral text-sm font-semibold uppercase tracking-widest block mb-2">
                Ton pseudo
              </label>
              <input
                className="input-field"
                placeholder="Ex: DarkGolmon42"
                maxLength={20}
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Room code (join only) */}
            {tab === "join" && (
              <div>
                <label className="text-golmon-neutral text-sm font-semibold uppercase tracking-widest block mb-2">
                  Code de la room
                </label>
                <input
                  className="input-field uppercase tracking-[0.4em] text-center text-2xl font-display font-bold"
                  placeholder="ABC123"
                  maxLength={6}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={
                !connected ||
                !pseudo.trim() ||
                (tab === "join" && roomCode.trim().length !== 6) ||
                loading
              }
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  Chargement…
                </span>
              ) : tab === "join" ? (
                "Rejoindre la room →"
              ) : (
                "Créer la room →"
              )}
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="text-center text-golmon-neutral/60 text-sm space-y-1">
          <p>Jusqu'à 50+ joueurs simultanés</p>
          <p>Dernier survivant = 👑 Roi des Golmons</p>
        </div>
      </div>

      <ErrorToast message={error} onClose={clearError} />
    </div>
  );
}

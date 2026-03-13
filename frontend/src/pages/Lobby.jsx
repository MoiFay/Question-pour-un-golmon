import React, { useState } from "react";
import { useSocket } from "../context/SocketContext";
import { Logo, PlayerGrid, ErrorToast, Spinner } from "../components/UI";

export default function Lobby() {
  const {
    roomCode,
    room,
    mySid,
    isHost,
    startGame,
    leaveRoom,
    kickPlayer,
    error,
    clearError,
  } = useSocket();

  const [copied, setCopied] = useState(false);

  if (!room) return <div className="min-h-screen bg-golmon-bg flex items-center justify-center"><Spinner /></div>;

  const players = room.players || {};
  const aliveCount = Object.values(players).filter((p) => p.status === "alive").length;
  const shareUrl = `${window.location.origin}/room/${roomCode}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-golmon-bg flex flex-col px-4 py-8">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 30% at 50% 100%, rgba(245,200,66,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Logo size="sm" />
          <button
            onClick={leaveRoom}
            className="text-golmon-neutral hover:text-white transition-colors text-sm font-semibold uppercase tracking-widest"
          >
            ← Quitter
          </button>
        </div>

        {/* Room code + share */}
        <div className="card text-center space-y-4">
          <p className="text-golmon-neutral text-sm font-semibold uppercase tracking-widest">
            Code de la Room
          </p>
          <div className="font-display font-black text-6xl tracking-[0.3em] text-golmon-gold glow-gold">
            {roomCode}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={copyLink}
              className={`btn-secondary text-sm py-2 px-6 ${copied ? "border-green-500 text-green-400" : ""}`}
            >
              {copied ? "✓ Lien copié !" : "📋 Copier le lien"}
            </button>
            <div className="text-golmon-neutral/50 text-xs self-center font-mono truncate max-w-xs">
              {shareUrl}
            </div>
          </div>

          <p className="text-golmon-neutral text-sm">
            Partage ce code sur Twitch/Kick pour que les viewers rejoignent !
          </p>
        </div>

        {/* Players section */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-white">
              Joueurs{" "}
              <span className="text-golmon-gold">({aliveCount})</span>
            </h2>
            {aliveCount < 2 && (
              <span className="text-golmon-neutral text-sm animate-pulse">
                En attente de joueurs…
              </span>
            )}
          </div>

          <PlayerGrid
            players={players}
            mySid={mySid}
            isHost={isHost}
            onKick={kickPlayer}
          />
        </div>

        {/* Host controls */}
        {isHost ? (
          <div className="space-y-3">
            {aliveCount < 2 && (
              <p className="text-center text-golmon-neutral text-sm">
                Il faut au moins <span className="text-golmon-gold font-bold">2 joueurs</span> pour
                démarrer.
              </p>
            )}
            <button
              onClick={startGame}
              disabled={aliveCount < 2}
              className="btn-primary w-full text-xl py-4"
            >
              🚀 Lancer la partie ({aliveCount} joueur{aliveCount > 1 ? "s" : ""})
            </button>
          </div>
        ) : (
          <div className="card text-center text-golmon-neutral">
            <span className="animate-pulse">⏳</span> En attente du host pour lancer la partie…
          </div>
        )}
      </div>

      <ErrorToast message={error} onClose={clearError} />
    </div>
  );
}

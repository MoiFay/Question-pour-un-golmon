import React from "react";

// ── Logo / Title ──────────────────────────────────────────────────────────────
export function Logo({ size = "lg" }) {
  const cls =
    size === "xl"
      ? "text-5xl md:text-7xl"
      : size === "lg"
      ? "text-3xl md:text-5xl"
      : "text-xl md:text-2xl";
  return (
    <div className={`font-display font-black tracking-tight leading-none ${cls}`}>
      <span className="text-white">Question pour un </span>
      <span className="text-golmon-gold glow-gold">GOLMON</span>
      <span className="ml-2 text-golmon-gold">👑</span>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ className = "" }) {
  return (
    <div
      className={`w-8 h-8 border-4 border-golmon-border border-t-golmon-gold rounded-full animate-spin ${className}`}
    />
  );
}

// ── Error toast ───────────────────────────────────────────────────────────────
export function ErrorToast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-red-950 border border-red-600 rounded-xl px-6 py-4 flex items-center gap-4 shadow-2xl max-w-sm">
        <span className="text-red-400 text-2xl">⚠️</span>
        <p className="text-red-300 font-semibold text-base flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-red-400 hover:text-white transition-colors text-xl leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Connection badge ──────────────────────────────────────────────────────────
export function ConnectionBadge({ connected }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-widest ${
        connected ? "text-green-400" : "text-red-400"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          connected ? "bg-green-400 animate-pulse" : "bg-red-400"
        }`}
      />
      {connected ? "Connecté" : "Déconnecté"}
    </div>
  );
}

// ── Player grid ───────────────────────────────────────────────────────────────
export function PlayerGrid({ players, mySid, roundResult, isHost, onKick }) {
  if (!players) return null;
  const list = Object.values(players);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {list.map((p) => {
        let tileClass = "player-tile";
        let badge = null;

        if (roundResult) {
          if (roundResult.survived?.includes(p.sid)) {
            tileClass = "player-tile result-correct";
            badge = <span className="ml-auto text-green-400 text-lg">✓</span>;
          } else if (roundResult.eliminated?.includes(p.sid)) {
            tileClass = "player-tile result-wrong";
            badge = <span className="ml-auto text-red-400 text-lg">✗</span>;
          } else {
            tileClass = `player-tile ${p.status}`;
          }
        } else {
          tileClass = `player-tile ${p.status}`;
        }

        return (
          <div key={p.sid} className={tileClass}>
            <span className="text-lg leading-none">
              {p.status === "eliminated"
                ? "💀"
                : p.status === "spectator"
                ? "👁"
                : p.isHost
                ? "👑"
                : "🎮"}
            </span>
            <span className="font-semibold truncate flex-1 text-sm">
              {p.pseudo}
              {p.sid === mySid && (
                <span className="text-golmon-gold/80 ml-1">(vous)</span>
              )}
            </span>
            {badge}
            {isHost && p.sid !== mySid && onKick && p.status !== "eliminated" && (
              <button
                onClick={() => onKick(p.sid)}
                className="text-golmon-neutral/40 hover:text-red-400 transition-colors text-xs ml-1"
                title="Expulser"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Round counter ─────────────────────────────────────────────────────────────
export function RoundBadge({ current, total }) {
  return (
    <div className="inline-flex items-center gap-2 bg-golmon-card border border-golmon-border rounded-full px-5 py-1.5">
      <span className="text-golmon-neutral font-semibold text-sm uppercase tracking-widest">
        Question
      </span>
      <span className="font-display font-bold text-golmon-gold text-lg">
        {current + 1}
      </span>
      <span className="text-golmon-neutral text-sm">/ {total}</span>
    </div>
  );
}

// ── Circular timer ────────────────────────────────────────────────────────────
export function CircularTimer({ value, max = 20 }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const fraction = value / max;
  const dashOffset = circumference * (1 - fraction);

  const color =
    value > 10 ? "#f5c842" : value > 5 ? "#f97316" : "#ef4444";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#1e1e2e"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="timer-ring"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
        />
      </svg>
      <span
        className="font-display font-black text-2xl relative z-10"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

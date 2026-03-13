import React, { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";

const CONFETTI_COLORS = ["#f5c842", "#7c3aed", "#22c55e", "#ef4444", "#3b82f6", "#f97316"];

function Particle({ x, color, delay, duration, size }) {
  return (
    <div
      className="fixed rounded-sm pointer-events-none"
      style={{
        left: `${x}%`,
        top: "-10px",
        width: size,
        height: size * 1.5,
        backgroundColor: color,
        animation: `fall ${duration}s ${delay}s linear infinite`,
        opacity: 0.9,
      }}
    />
  );
}

export default function Winner() {
  const { winner, room, mySid, leaveRoom, resetState } = useSocket();
  const [particles, setParticles] = useState([]);

  const isWinner = winner?.winnerSid === mySid;
  const isDraw = winner?.draw;

  useEffect(() => {
    const ps = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 3,
      duration: 2.5 + Math.random() * 2,
      size: 6 + Math.random() * 8,
    }));
    setParticles(ps);
  }, []);

  return (
    <div className="min-h-screen bg-golmon-bg flex flex-col items-center justify-center px-4 py-10 overflow-hidden relative">
      {/* CSS for falling confetti */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.3; }
        }
        @keyframes crown-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
        .crown-anim {
          animation: crown-bounce 1.5s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #f5c842 0%, #fff 40%, #f5c842 60%, #f97316 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Confetti */}
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}

      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(245,200,66,0.15) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-lg w-full">
        {/* Crown */}
        <div className="crown-anim text-8xl md:text-9xl">👑</div>

        {/* Title */}
        {isDraw ? (
          <div className="space-y-2">
            <h1 className="font-display font-black text-4xl md:text-6xl text-white">
              Égalité !
            </h1>
            <p className="text-golmon-neutral text-xl">Les derniers survivants sont :</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-golmon-neutral text-lg font-semibold uppercase tracking-[0.3em]">
              Le Roi des Golmons est
            </p>
            <h1 className="font-display font-black text-5xl md:text-7xl shimmer-text leading-none">
              {winner?.winnerPseudo}
            </h1>
          </div>
        )}

        {/* Personal message */}
        {isWinner && !isDraw && (
          <div className="bg-golmon-gold/20 border-2 border-golmon-gold rounded-2xl px-8 py-5 animate-pop">
            <p className="text-golmon-gold font-display font-black text-2xl glow-gold">
              🎉 C'EST TOI ! TU ES LE ROI DES GOLMONS !
            </p>
          </div>
        )}

        {!isWinner && !isDraw && winner?.winnerSid && (
          <div className="bg-golmon-card border border-golmon-border rounded-2xl px-8 py-5">
            <p className="text-golmon-neutral font-semibold text-lg">
              💀 Mieux vaut réviser pour la prochaine fois…
            </p>
          </div>
        )}

        {/* Player list recap */}
        {room && (
          <div className="card w-full">
            <h3 className="font-display font-bold text-white text-lg mb-4">
              Classement final
            </h3>
            <div className="space-y-2">
              {Object.values(room.players || {})
                .sort((a, b) => {
                  // Winner first, then by status
                  if (a.sid === winner?.winnerSid) return -1;
                  if (b.sid === winner?.winnerSid) return 1;
                  if (a.status === "alive" && b.status !== "alive") return -1;
                  if (b.status === "alive" && a.status !== "alive") return 1;
                  return 0;
                })
                .map((p, i) => (
                  <div
                    key={p.sid}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2 ${
                      p.sid === winner?.winnerSid
                        ? "bg-golmon-gold/20 border border-golmon-gold/50"
                        : "bg-golmon-bg border border-golmon-border/30"
                    }`}
                  >
                    <span className="text-golmon-neutral/60 text-sm w-6 text-right font-bold">
                      {i + 1}.
                    </span>
                    <span className="text-xl">
                      {p.sid === winner?.winnerSid
                        ? "👑"
                        : p.status === "eliminated"
                        ? "💀"
                        : "🎮"}
                    </span>
                    <span
                      className={`font-semibold flex-1 text-left ${
                        p.sid === winner?.winnerSid
                          ? "text-golmon-gold"
                          : p.status === "eliminated"
                          ? "text-golmon-neutral/50"
                          : "text-white"
                      }`}
                    >
                      {p.pseudo}
                    </span>
                    {p.sid === mySid && (
                      <span className="text-golmon-neutral/50 text-xs">(moi)</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={() => { leaveRoom(); resetState(); }}
            className="btn-primary flex-1"
          >
            🔄 Rejouer
          </button>
          <button
            onClick={() => { leaveRoom(); resetState(); }}
            className="btn-secondary flex-1"
          >
            🏠 Accueil
          </button>
        </div>
      </div>
    </div>
  );
}

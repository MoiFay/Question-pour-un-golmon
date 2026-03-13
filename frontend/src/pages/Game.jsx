import React, { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import {
  CircularTimer,
  PlayerGrid,
  RoundBadge,
  Logo,
  Spinner,
} from "../components/UI";

const ANSWER_LABELS = ["A", "B", "C", "D"];
const ANSWER_COLORS = [
  "hover:border-blue-400 hover:bg-blue-900/20 hover:text-blue-300",
  "hover:border-orange-400 hover:bg-orange-900/20 hover:text-orange-300",
  "hover:border-purple-400 hover:bg-purple-900/20 hover:text-purple-300",
  "hover:border-cyan-400 hover:bg-cyan-900/20 hover:text-cyan-300",
];
const ANSWER_SELECTED_COLORS = [
  "border-blue-500 bg-blue-900/40 text-blue-300",
  "border-orange-500 bg-orange-900/40 text-orange-300",
  "border-purple-500 bg-purple-900/40 text-purple-300",
  "border-cyan-500 bg-cyan-900/40 text-cyan-300",
];

export default function Game() {
  const {
    gamePhase,
    question,
    selectedAnswer,
    answerLocked,
    timerValue,
    roundResult,
    room,
    mySid,
    isSpectator,
    submitAnswer,
    leaveRoom,
  } = useSocket();

  const myStatus = room?.players?.[mySid]?.status;
  const isEliminated = myStatus === "eliminated";
  const isActualSpectator = isSpectator || myStatus === "spectator";

  // ── Waiting for question (starting or between rounds) ────────────────────
  if (!question || gamePhase === "starting") {
    return (
      <div className="min-h-screen bg-golmon-bg flex flex-col items-center justify-center gap-6">
        <Logo size="lg" />
        <div className="text-4xl font-display font-black text-white animate-pulse-fast">
          {gamePhase === "starting" ? "La partie commence…" : "Chargement…"}
        </div>
        <Spinner />
      </div>
    );
  }

  const isResult = gamePhase === "result";
  const canAnswer = !isEliminated && !isActualSpectator && !answerLocked && !isResult;

  function getAnswerClass(idx) {
    if (isResult && roundResult) {
      if (idx === roundResult.correctIndex) return "answer-btn correct";
      if (selectedAnswer === idx && idx !== roundResult.correctIndex) return "answer-btn wrong";
      return "answer-btn disabled";
    }
    if (answerLocked) {
      if (selectedAnswer === idx) return `answer-btn border-2 ${ANSWER_SELECTED_COLORS[idx]}`;
      return "answer-btn disabled";
    }
    if (selectedAnswer === idx) return `answer-btn border-2 ${ANSWER_SELECTED_COLORS[idx]}`;
    return `answer-btn border-2 ${ANSWER_COLORS[idx]}`;
  }

  const aliveCount = room
    ? Object.values(room.players || {}).filter((p) => p.status === "alive").length
    : 0;

  return (
    <div className="min-h-screen bg-golmon-bg flex flex-col">
      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 30% at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row h-full min-h-screen">
        {/* ── Main game area ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
          {/* Top bar */}
          <div className="w-full max-w-2xl flex items-center justify-between flex-wrap gap-3">
            <Logo size="sm" />
            <div className="flex items-center gap-4">
              <RoundBadge
                current={question.round ?? 0}
                total={question.total ?? 30}
              />
              <div className="text-golmon-neutral text-sm font-semibold">
                <span className="text-green-400 font-bold">{aliveCount}</span> survivant
                {aliveCount > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Eliminated banner */}
          {isEliminated && (
            <div className="w-full max-w-2xl bg-red-950/70 border border-red-700 rounded-xl px-6 py-3 text-center animate-fade-in">
              <p className="text-red-400 font-display font-bold text-lg">
                💀 Tu es éliminé — mode spectateur activé
              </p>
            </div>
          )}
          {isActualSpectator && !isEliminated && (
            <div className="w-full max-w-2xl bg-golmon-card border border-golmon-border rounded-xl px-6 py-3 text-center animate-fade-in">
              <p className="text-golmon-neutral font-display font-bold text-lg">
                👁 Mode spectateur
              </p>
            </div>
          )}

          {/* Timer + Question */}
          <div className="w-full max-w-2xl card space-y-6 animate-slide-up">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display font-bold text-xl md:text-2xl text-white leading-snug flex-1">
                {question.question}
              </h2>
              {!isResult && <CircularTimer value={timerValue} max={20} />}
              {isResult && (
                <div className="flex flex-col items-center">
                  <span className="text-3xl">
                    {roundResult &&
                    (selectedAnswer === roundResult.correctIndex ||
                      isEliminated ||
                      isActualSpectator)
                      ? roundResult.survived?.includes(mySid)
                        ? "✅"
                        : roundResult.eliminated?.includes(mySid)
                        ? "❌"
                        : "📊"
                      : "📊"}
                  </span>
                  <span className="text-golmon-neutral text-xs mt-1 font-semibold uppercase tracking-widest">
                    Résultats
                  </span>
                </div>
              )}
            </div>

            {/* Answers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {question.answers.map((ans, idx) => (
                <button
                  key={idx}
                  onClick={() => canAnswer && submitAnswer(idx)}
                  className={getAnswerClass(idx)}
                  disabled={!canAnswer && !isResult}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="font-display font-black text-lg opacity-60">
                      {ANSWER_LABELS[idx]}
                    </span>
                    {ans}
                  </span>
                </button>
              ))}
            </div>

            {/* Answer status */}
            {answerLocked && !isResult && (
              <p className="text-center text-golmon-neutral/70 text-sm animate-fade-in">
                ⏳ Réponse enregistrée — en attente des autres joueurs…
              </p>
            )}
            {isResult && roundResult && (
              <div className="text-center animate-fade-in">
                <p className="text-golmon-neutral text-sm">
                  Bonne réponse :{" "}
                  <span className="text-green-400 font-bold">
                    {ANSWER_LABELS[roundResult.correctIndex]} —{" "}
                    {question.answers[roundResult.correctIndex]}
                  </span>
                </p>
                <p className="text-golmon-neutral/60 text-xs mt-1">
                  {roundResult.eliminated?.length ?? 0} éliminé
                  {(roundResult.eliminated?.length ?? 0) > 1 ? "s" : ""} ce round
                </p>
              </div>
            )}
          </div>

          {/* Leave button */}
          <button
            onClick={leaveRoom}
            className="btn-secondary text-sm py-2 px-6"
          >
            Quitter la partie
          </button>
        </div>

        {/* ── Player sidebar ───────────────────────────────────────────────── */}
        <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-golmon-border bg-golmon-card/50 p-4 flex flex-col gap-4">
          <h3 className="font-display font-bold text-white text-lg">
            Joueurs{" "}
            <span className="text-golmon-gold">
              ({Object.keys(room?.players || {}).length})
            </span>
          </h3>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[60vh] lg:max-h-full">
            {Object.values(room?.players || {}).map((p) => {
              let icon = p.status === "eliminated" ? "💀" : p.status === "spectator" ? "👁" : p.isHost ? "👑" : "🎮";
              let textClass =
                p.status === "eliminated"
                  ? "text-red-400/50"
                  : p.status === "spectator"
                  ? "text-golmon-neutral/40 italic"
                  : "text-white";

              // result highlight
              if (isResult && roundResult) {
                if (roundResult.survived?.includes(p.sid)) {
                  textClass = "text-green-400 font-bold";
                  icon = "✅";
                } else if (roundResult.eliminated?.includes(p.sid)) {
                  textClass = "text-red-400";
                  icon = "💥";
                }
              }

              return (
                <div
                  key={p.sid}
                  className={`flex items-center gap-2 text-sm ${textClass}`}
                >
                  <span>{icon}</span>
                  <span className="truncate flex-1">{p.pseudo}</span>
                  {p.sid === mySid && (
                    <span className="text-golmon-gold/60 text-xs">(moi)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

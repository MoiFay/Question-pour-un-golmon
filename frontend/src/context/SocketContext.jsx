import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

// En production Railway, frontend et backend partagent le même domaine.
// On se connecte à window.location.origin sauf si une URL explicite est définie.
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // ── Game state ───────────────────────────────────────────────────────────
  const [roomCode, setRoomCode] = useState(null);
  const [room, setRoom] = useState(null); // full room snapshot
  const [mySid, setMySid] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);

  // current question
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerLocked, setAnswerLocked] = useState(false);

  // timer
  const [timerValue, setTimerValue] = useState(20);

  // result of last round
  const [roundResult, setRoundResult] = useState(null);

  // game phase: idle | lobby | starting | question | result | finished
  const [gamePhase, setGamePhase] = useState("idle");

  // winner info
  const [winner, setWinner] = useState(null);

  // error message
  const [error, setError] = useState(null);

  // ── Socket init ─────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setMySid(socket.id);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    // ── Room events ──────────────────────────────────────────────────────
    socket.on("room_created", ({ code, room }) => {
      setRoomCode(code);
      setRoom(room);
      setIsHost(true);
      setIsSpectator(false);
      setGamePhase("lobby");
      setError(null);
    });

    socket.on("room_joined", ({ code, room }) => {
      setRoomCode(code);
      setRoom(room);
      setIsHost(false);
      setIsSpectator(false);
      setGamePhase("lobby");
      setError(null);
    });

    socket.on("joined_as_spectator", ({ code, room }) => {
      setRoomCode(code);
      setRoom(room);
      setIsHost(false);
      setIsSpectator(true);
      setGamePhase(room.state === "finished" ? "finished" : "question");
      setError(null);
    });

    socket.on("room_update", (snap) => {
      setRoom(snap);
      // Keep isHost in sync if host changed
      setIsHost(snap.hostSid === socket.id);
    });

    socket.on("player_joined", () => {});
    socket.on("player_left", () => {});

    socket.on("new_host", ({ sid }) => {
      if (sid === socket.id) setIsHost(true);
    });

    // ── Gameplay events ──────────────────────────────────────────────────
    socket.on("game_starting", () => {
      setGamePhase("starting");
      setRoundResult(null);
      setWinner(null);
    });

    socket.on("new_question", (q) => {
      setQuestion(q);
      setSelectedAnswer(null);
      setAnswerLocked(false);
      setRoundResult(null);
      setTimerValue(20);
      setGamePhase("question"); // force phase even if still "starting"
    });

    socket.on("connect_error", (err) => {
      console.error("[Socket] connect error:", err.message);
    });

    socket.on("timer_tick", ({ remaining }) => {
      setTimerValue(remaining);
    });

    socket.on("answer_received", () => {
      setAnswerLocked(true);
    });

    socket.on("round_result", (result) => {
      setRoundResult(result);
      setGamePhase("result");
    });

    socket.on("game_over", (data) => {
      setWinner(data);
      setGamePhase("finished");
    });

    // ── Misc ─────────────────────────────────────────────────────────────
    socket.on("error", ({ message }) => {
      setError(message);
    });

    socket.on("kicked", () => {
      resetState();
      setError("Tu as été expulsé de la room.");
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const createRoom = useCallback((pseudo) => {
    socketRef.current?.emit("create_room", { pseudo });
  }, []);

  const joinRoom = useCallback((code, pseudo) => {
    socketRef.current?.emit("join_room", { code, pseudo });
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit("start_game", {});
  }, []);

  const submitAnswer = useCallback(
    (answerIdx) => {
      if (answerLocked) return;
      setSelectedAnswer(answerIdx);
      socketRef.current?.emit("submit_answer", { answer: answerIdx });
    },
    [answerLocked]
  );

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit("leave_room", {});
    resetState();
  }, []);

  const kickPlayer = useCallback((sid) => {
    socketRef.current?.emit("kick_player", { sid });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  function resetState() {
    setRoomCode(null);
    setRoom(null);
    setIsHost(false);
    setIsSpectator(false);
    setQuestion(null);
    setSelectedAnswer(null);
    setAnswerLocked(false);
    setRoundResult(null);
    setTimerValue(20);
    setGamePhase("idle");
    setWinner(null);
  }

  const value = {
    socket: socketRef.current,
    connected,
    mySid,
    // room
    roomCode,
    room,
    isHost,
    isSpectator,
    // gameplay
    question,
    selectedAnswer,
    answerLocked,
    timerValue,
    roundResult,
    gamePhase,
    winner,
    error,
    // actions
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    leaveRoom,
    kickPlayer,
    clearError,
    resetState,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

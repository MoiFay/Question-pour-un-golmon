import React from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { SocketProvider, useSocket } from "./context/SocketContext";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Winner from "./pages/Winner";

function AppRoutes() {
  const { gamePhase, isSpectator } = useSocket();

  return (
    <div className="scanlines">
      <Routes>
        <Route
          path="/"
          element={
            gamePhase === "idle" ? (
              <Home />
            ) : gamePhase === "lobby" ? (
              <Navigate to="/lobby" replace />
            ) : gamePhase === "starting" ? (
              <Navigate to="/game" replace />
            ) : gamePhase === "question" || gamePhase === "result" ? (
              <Navigate to="/game" replace />
            ) : gamePhase === "finished" ? (
              <Navigate to="/winner" replace />
            ) : (
              <Home />
            )
          }
        />
        <Route
          path="/lobby"
          element={
            gamePhase === "lobby" ? (
              <Lobby />
            ) : gamePhase === "idle" ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/game" replace />
            )
          }
        />
        <Route
          path="/game"
          element={
            gamePhase === "idle" || gamePhase === "lobby" ? (
              <Navigate to="/" replace />
            ) : gamePhase === "finished" ? (
              <Navigate to="/winner" replace />
            ) : (
              <Game />
            )
          }
        />
        <Route
          path="/winner"
          element={
            gamePhase === "finished" ? (
              <Winner />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        {/* Deep-link: share room code via URL */}
        <Route path="/room/:code" element={<Home />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </BrowserRouter>
  );
}

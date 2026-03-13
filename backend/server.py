import asyncio
import json
import os
import random
import string
import time
from pathlib import Path
from typing import Dict, List, Optional

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ─── Config ───────────────────────────────────────────────────────────────────
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
QUESTION_TIMER = int(os.environ.get("QUESTION_TIMER", "20"))
RESULT_DELAY = int(os.environ.get("RESULT_DELAY", "4"))

# ─── Load questions ────────────────────────────────────────────────────────────
QUESTIONS_PATH = Path(__file__).parent / "questions.json"
with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
    ALL_QUESTIONS: List[dict] = json.load(f)

# ─── FastAPI + Socket.IO setup ─────────────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=CORS_ORIGINS,
    ping_timeout=60,
    ping_interval=25,
)

app = FastAPI(title="Question pour un GOLMON API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


@app.get("/health")
async def health():
    return {"status": "healthy", "rooms": len(rooms)}


@app.get("/api/status")
async def status():
    return {"status": "ok", "game": "Question pour un GOLMON"}


# ─── In-memory state ───────────────────────────────────────────────────────────
rooms: Dict[str, dict] = {}
player_room: Dict[str, str] = {}


def make_room_code() -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if code not in rooms:
            return code


def room_snapshot(room: dict) -> dict:
    players_out = {}
    for sid, p in room["players"].items():
        players_out[sid] = {
            "sid": sid,
            "pseudo": p["pseudo"],
            "status": p["status"],
            "isHost": p.get("isHost", False),
        }
    return {
        "code": room["code"],
        "state": room["state"],
        "players": players_out,
        "hostSid": room["hostSid"],
        "currentRound": room["currentRound"],
        "totalQuestions": len(room["questions"]),
    }


def get_alive_players(room: dict) -> List[str]:
    return [sid for sid, p in room["players"].items() if p["status"] == "alive"]


async def broadcast_room(code: str):
    room = rooms.get(code)
    if not room:
        return
    await sio.emit("room_update", room_snapshot(room), room=code)


# ─── Timer task ────────────────────────────────────────────────────────────────
async def run_question_timer(code: str, round_idx: int):
    room = rooms.get(code)
    if not room:
        return

    duration = QUESTION_TIMER
    for remaining in range(duration, -1, -1):
        if rooms.get(code) is None:
            return
        room = rooms[code]
        if room["state"] != "question" or room["currentRound"] != round_idx:
            return
        await sio.emit("timer_tick", {"remaining": remaining}, room=code)
        if remaining == 0:
            break
        await asyncio.sleep(1)

    await resolve_round(code, round_idx)


async def resolve_round(code: str, round_idx: int):
    room = rooms.get(code)
    if not room or room["state"] != "question":
        return

    room["state"] = "result"
    question = room["questions"][round_idx]
    correct_idx = question["correct"]

    eliminated_this_round = []
    survived_this_round = []

    for sid in get_alive_players(room):
        answer = room["answers"].get(sid)
        if answer is None or answer != correct_idx:
            room["players"][sid]["status"] = "eliminated"
            eliminated_this_round.append(sid)
        else:
            survived_this_round.append(sid)

    await sio.emit(
        "round_result",
        {
            "correctIndex": correct_idx,
            "eliminated": eliminated_this_round,
            "survived": survived_this_round,
            "question": question,
        },
        room=code,
    )
    await broadcast_room(code)

    await asyncio.sleep(RESULT_DELAY)

    alive = get_alive_players(room)

    if len(alive) == 1:
        winner_sid = alive[0]
        winner_pseudo = room["players"][winner_sid]["pseudo"]
        room["state"] = "finished"
        await sio.emit(
            "game_over",
            {"winnerSid": winner_sid, "winnerPseudo": winner_pseudo},
            room=code,
        )
        await broadcast_room(code)
        return

    if len(alive) == 0:
        room["state"] = "finished"
        await sio.emit(
            "game_over",
            {"winnerSid": None, "winnerPseudo": "Personne – égalité !", "draw": True},
            room=code,
        )
        await broadcast_room(code)
        return

    next_round = round_idx + 1
    if next_round >= len(room["questions"]):
        room["state"] = "finished"
        alive_pseudos = [room["players"][s]["pseudo"] for s in alive]
        await sio.emit(
            "game_over",
            {
                "winnerSid": alive[0] if len(alive) == 1 else None,
                "winnerPseudo": room["players"][alive[0]]["pseudo"] if len(alive) == 1 else ", ".join(alive_pseudos),
                "draw": len(alive) > 1,
            },
            room=code,
        )
        await broadcast_room(code)
        return

    await send_next_question(code, next_round)


async def send_next_question(code: str, round_idx: int):
    room = rooms.get(code)
    if not room:
        return

    room["state"] = "question"
    room["currentRound"] = round_idx
    room["answers"] = {}

    question = room["questions"][round_idx]
    q_data = {
        "id": question["id"],
        "question": question["question"],
        "answers": question["answers"],
        "round": round_idx,
        "total": len(room["questions"]),
    }
    await sio.emit("new_question", q_data, room=code)
    await broadcast_room(code)

    task = asyncio.create_task(run_question_timer(code, round_idx))
    room["timer_task"] = task


# ─── Socket.IO event handlers ──────────────────────────────────────────────────

@sio.event
async def connect(sid, environ):
    print(f"[CONNECT] {sid}")


@sio.event
async def disconnect(sid):
    print(f"[DISCONNECT] {sid}")
    code = player_room.pop(sid, None)
    if not code or code not in rooms:
        return

    room = rooms[code]
    player = room["players"].pop(sid, None)
    if not player:
        return

    pseudo = player.get("pseudo", "?")
    was_host = player.get("isHost", False)

    await sio.emit("player_left", {"sid": sid, "pseudo": pseudo}, room=code)

    if was_host:
        remaining = list(room["players"].keys())
        if remaining:
            new_host = remaining[0]
            room["players"][new_host]["isHost"] = True
            room["hostSid"] = new_host
            await sio.emit(
                "new_host",
                {"sid": new_host, "pseudo": room["players"][new_host]["pseudo"]},
                room=code,
            )
        else:
            if room.get("timer_task"):
                room["timer_task"].cancel()
            del rooms[code]
            return

    if room["state"] == "question":
        alive_after = get_alive_players(room)
        if len(alive_after) == 1:
            if room.get("timer_task"):
                room["timer_task"].cancel()
            winner_sid = alive_after[0]
            room["state"] = "finished"
            await sio.emit(
                "game_over",
                {"winnerSid": winner_sid, "winnerPseudo": room["players"][winner_sid]["pseudo"]},
                room=code,
            )

    await broadcast_room(code)


@sio.event
async def create_room(sid, data):
    pseudo = (data.get("pseudo") or "Host").strip()[:20]
    code = make_room_code()

    room = {
        "code": code,
        "state": "waiting",
        "hostSid": sid,
        "players": {
            sid: {"sid": sid, "pseudo": pseudo, "status": "alive", "isHost": True}
        },
        "questions": [],
        "currentRound": 0,
        "answers": {},
        "timer_task": None,
    }

    rooms[code] = room
    player_room[sid] = code
    await sio.enter_room(sid, code)
    await sio.emit("room_created", {"code": code, "room": room_snapshot(room)}, to=sid)
    print(f"[ROOM CREATED] {code} by {pseudo}")


@sio.event
async def join_room(sid, data):
    code = (data.get("code") or "").strip().upper()
    pseudo = (data.get("pseudo") or "Player").strip()[:20]

    if not code or code not in rooms:
        await sio.emit("error", {"message": "Room introuvable."}, to=sid)
        return

    room = rooms[code]

    if room["state"] != "waiting":
        room["players"][sid] = {"sid": sid, "pseudo": pseudo, "status": "spectator", "isHost": False}
        player_room[sid] = code
        await sio.enter_room(sid, code)
        await sio.emit("joined_as_spectator", {"code": code, "room": room_snapshot(room)}, to=sid)
        await broadcast_room(code)
        return

    existing_pseudos = [p["pseudo"].lower() for p in room["players"].values()]
    if pseudo.lower() in existing_pseudos:
        pseudo = pseudo + str(random.randint(10, 99))

    room["players"][sid] = {"sid": sid, "pseudo": pseudo, "status": "alive", "isHost": False}
    player_room[sid] = code
    await sio.enter_room(sid, code)
    await sio.emit("room_joined", {"code": code, "room": room_snapshot(room)}, to=sid)
    await sio.emit("player_joined", {"sid": sid, "pseudo": pseudo}, room=code, skip_sid=sid)
    await broadcast_room(code)
    print(f"[JOINED] {pseudo} → {code}")


@sio.event
async def start_game(sid, data):
    code = player_room.get(sid)
    if not code or code not in rooms:
        return

    room = rooms[code]
    if room["hostSid"] != sid:
        await sio.emit("error", {"message": "Seul le host peut lancer la partie."}, to=sid)
        return
    if room["state"] != "waiting":
        return

    alive = get_alive_players(room)
    if len(alive) < 2:
        await sio.emit("error", {"message": "Il faut au moins 2 joueurs."}, to=sid)
        return

    questions = random.sample(ALL_QUESTIONS, min(len(ALL_QUESTIONS), 30))
    room["questions"] = questions

    await sio.emit("game_starting", {"totalPlayers": len(alive)}, room=code)
    await asyncio.sleep(2)
    await send_next_question(code, 0)
    print(f"[GAME START] {code} with {len(alive)} players")


@sio.event
async def submit_answer(sid, data):
    code = player_room.get(sid)
    if not code or code not in rooms:
        return

    room = rooms[code]
    if room["state"] != "question":
        return

    player = room["players"].get(sid)
    if not player or player["status"] != "alive":
        return

    answer_idx = data.get("answer")
    if answer_idx is None or not isinstance(answer_idx, int) or answer_idx not in range(4):
        return

    if sid not in room["answers"]:
        room["answers"][sid] = answer_idx
        await sio.emit("answer_received", {"sid": sid}, to=sid)

        alive = get_alive_players(room)
        answered = [s for s in alive if s in room["answers"]]
        if len(answered) == len(alive):
            if room.get("timer_task"):
                room["timer_task"].cancel()
            await resolve_round(code, room["currentRound"])


@sio.event
async def leave_room(sid, data):
    await disconnect(sid)


@sio.event
async def kick_player(sid, data):
    code = player_room.get(sid)
    if not code or code not in rooms:
        return
    room = rooms[code]
    if room["hostSid"] != sid:
        return
    target_sid = data.get("sid")
    if target_sid and target_sid in room["players"]:
        await sio.emit("kicked", {}, to=target_sid)
        await sio.leave_room(target_sid, code)
        player = room["players"].pop(target_sid, None)
        player_room.pop(target_sid, None)
        if player:
            await sio.emit("player_left", {"sid": target_sid, "pseudo": player["pseudo"]}, room=code)
        await broadcast_room(code)


# ─── Static file serving (React build) ────────────────────────────────────────
# Mounted AFTER all API routes so /health is never shadowed.
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

STATIC_BUILD_PATH = Path(__file__).parent.parent / "frontend" / "build"

if STATIC_BUILD_PATH.exists() and (STATIC_BUILD_PATH / "index.html").exists():
    try:
        static_assets = STATIC_BUILD_PATH / "static"
        if static_assets.exists():
            app.mount("/static", StaticFiles(directory=str(static_assets)), name="react-static")

        @app.get("/{full_path:path}")
        async def serve_react(full_path: str):
            return FileResponse(str(STATIC_BUILD_PATH / "index.html"))

        print(f"[STATIC] Serving React build from {STATIC_BUILD_PATH}")
    except Exception as e:
        print(f"[WARN] Static mount failed: {e}")
else:
    print("[INFO] No React build found – running API-only mode")

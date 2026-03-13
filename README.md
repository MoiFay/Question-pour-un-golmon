# 👑 Question pour un GOLMON

> **Battle Royale de questions multijoueur en temps réel pour les streams Twitch / Kick.**
> Dernier survivant = Roi des Golmons.

![Battle Royale](https://img.shields.io/badge/Genre-Battle%20Royale-gold?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-white?style=for-the-badge&logo=socket.io)
![Railway](https://img.shields.io/badge/Deploy-Railway-7c3aed?style=for-the-badge)

---

## 🎮 Concept

| Étape | Description |
|-------|-------------|
| 1 | Le **host** crée une room et partage le code à 6 caractères |
| 2 | Les **viewers** rejoignent via le code ou le lien direct |
| 3 | Le host lance la partie |
| 4 | Chaque round : 1 question QCM, 4 réponses, **20 secondes** |
| 5 | Bonne réponse → 🟢 survie / Mauvaise → 🔴 élimination |
| 6 | Les éliminés passent en **mode spectateur** |
| 7 | Dernier survivant = **👑 ROI DES GOLMONS** |

---

## 🏗️ Architecture

```
golmon/
├── backend/
│   ├── server.py          # FastAPI + Socket.IO (toute la logique)
│   ├── questions.json     # 60 questions QCM
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── context/
│   │   │   └── SocketContext.jsx  # État global + Socket.IO
│   │   ├── components/
│   │   │   └── UI.jsx             # Composants partagés
│   │   ├── pages/
│   │   │   ├── Home.jsx           # Accueil / rejoindre / créer
│   │   │   ├── Lobby.jsx          # Salle d'attente
│   │   │   ├── Game.jsx           # Gameplay principal
│   │   │   └── Winner.jsx         # Écran victoire + confettis
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── index.css              # Tailwind + styles globaux
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env.example
├── Dockerfile                     # Build multi-stage (React + Python)
├── railway.json                   # Config Railway
├── nixpacks.toml                  # Build Nixpacks (Railway)
├── .gitignore
└── README.md
```

---

## ⚡ Installation locale

### Prérequis

- Python 3.11+
- Node.js 18+
- npm ou yarn

---

### 1. Cloner le repo

```bash
git clone https://github.com/TON_USERNAME/golmon.git
cd golmon
```

---

### 2. Backend

```bash
cd backend

# Copier les variables d'environnement
cp .env.example .env

# Installer les dépendances Python
pip install -r requirements.txt

# Lancer le serveur (développement)
uvicorn server:socket_app --reload --port 8000
```

Le backend tourne sur **http://localhost:8000**

> API health check : http://localhost:8000/health

---

### 3. Frontend

Dans un **nouveau terminal** :

```bash
cd frontend

# Copier les variables d'environnement
cp .env.example .env
# Éditer .env → REACT_APP_BACKEND_URL=http://localhost:8000

# Installer les dépendances Node
npm install

# Lancer en développement
npm start
```

Le frontend tourne sur **http://localhost:3000**

---

### 4. Variables d'environnement

#### `backend/.env`

```env
PORT=8000
CORS_ORIGINS=*
QUESTION_TIMER=20
RESULT_DELAY=4
```

#### `frontend/.env`

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 🐳 Docker (tout-en-un)

```bash
# Build l'image
docker build -t golmon .

# Lancer le conteneur
docker run -p 8000:8000 \
  -e CORS_ORIGINS="*" \
  golmon
```

Accède à **http://localhost:8000** — frontend + backend dans un seul conteneur.

---

## 🚀 Déploiement GitHub + Railway

### Étape 1 — Pousser sur GitHub

```bash
# Dans le dossier racine du projet
git init
git add .
git commit -m "🎮 Initial commit – Question pour un GOLMON"

# Créer un repo sur github.com puis :
git remote add origin https://github.com/TON_USERNAME/golmon.git
git branch -M main
git push -u origin main
```

---

### Étape 2 — Déployer sur Railway

1. Va sur **https://railway.app** → **New Project**
2. Clique **Deploy from GitHub repo**
3. Sélectionne ton repo `golmon`
4. Railway détecte automatiquement `railway.json` ✅

#### Variables d'environnement Railway (onglet Variables)

| Variable | Valeur |
|----------|--------|
| `CORS_ORIGINS` | `https://TON-APP.railway.app` |
| `QUESTION_TIMER` | `20` |
| `RESULT_DELAY` | `4` |

> Railway génère automatiquement la variable `PORT` — ne la définis pas manuellement.

---

### Étape 3 — Frontend sur Vercel (optionnel, performances maximales)

Si tu veux séparer frontend et backend :

```bash
cd frontend
npm install -g vercel
vercel
# Ajouter la variable : REACT_APP_BACKEND_URL=https://TON-BACKEND.railway.app
```

---

## 🔌 Architecture Socket.IO — Événements

### Client → Serveur

| Événement | Payload | Description |
|-----------|---------|-------------|
| `create_room` | `{ pseudo }` | Crée une room |
| `join_room` | `{ code, pseudo }` | Rejoint une room |
| `start_game` | `{}` | Lance la partie (host only) |
| `submit_answer` | `{ answer: 0-3 }` | Envoie une réponse |
| `kick_player` | `{ sid }` | Expulse un joueur (host only) |
| `leave_room` | `{}` | Quitte la room |

### Serveur → Client

| Événement | Payload | Description |
|-----------|---------|-------------|
| `room_created` | `{ code, room }` | Room créée avec succès |
| `room_joined` | `{ code, room }` | Room rejointe |
| `room_update` | `RoomSnapshot` | Mise à jour complète de la room |
| `game_starting` | `{ totalPlayers }` | La partie démarre |
| `new_question` | `{ id, question, answers, round, total }` | Nouvelle question |
| `timer_tick` | `{ remaining }` | Tick du timer (chaque seconde) |
| `answer_received` | `{}` | Réponse enregistrée |
| `round_result` | `{ correctIndex, eliminated[], survived[] }` | Résultats du round |
| `game_over` | `{ winnerSid, winnerPseudo, draw? }` | Fin de partie |
| `error` | `{ message }` | Message d'erreur |
| `kicked` | `{}` | Expulsé de la room |

---

## 🎨 Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Python 3.11, FastAPI, python-socketio |
| Frontend | React 18, React Router v6, Socket.IO Client |
| Style | TailwindCSS 3, Exo 2 + Rajdhani (Google Fonts) |
| Temps réel | WebSocket via Socket.IO |
| Déploiement | Railway (backend) / Vercel (frontend optionnel) |
| Conteneur | Docker multi-stage |

---

## 📊 Scalabilité

- Architecture **stateless** en mémoire → scalable horizontalement avec Redis adapter (extension future)
- Optimisé pour **50+ joueurs simultanés** par room
- Connexion WebSocket persistante avec fallback polling
- Reconnexion automatique (5 tentatives) côté client

---

## 🤝 Contribution

Les PR sont les bienvenues ! Pour ajouter des questions :

1. Édite `backend/questions.json`
2. Respecte le format :
```json
{
  "id": 61,
  "question": "Ta question ici ?",
  "answers": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
  "correct": 0
}
```
3. `correct` = index (0-3) de la bonne réponse

---

## 📄 Licence

MIT — Fais-en ce que tu veux. 👑

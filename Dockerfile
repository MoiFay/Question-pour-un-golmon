# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy only package files first (layer cache)
COPY frontend/package.json frontend/package-lock.json* ./

RUN npm install

# Copy the rest of the frontend source
COPY frontend/ .

# Inject backend URL at build time (override with --build-arg or Railway env)
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – Python backend + serve static frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built React app into backend static folder
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Patch server.py to serve the React build for any non-API route
# (handled inside server.py via StaticFiles mount – see STATIC_SERVING below)

EXPOSE 8000

ENV PORT=8000
ENV CORS_ORIGINS=*
ENV PYTHONUNBUFFERED=1

CMD uvicorn backend.server:socket_app --host 0.0.0.0 --port $PORT

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json ./

RUN npm install

COPY frontend/ .

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – Python backend + serve static frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/build ./frontend/build

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV CORS_ORIGINS=*

# exec form with sh so $PORT is expanded at container runtime
CMD ["sh", "-c", "python -m uvicorn backend.server:socket_app --host 0.0.0.0 --port ${PORT:-8000} --log-level info"]

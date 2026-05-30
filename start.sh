#!/bin/sh
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
DOCKER="/usr/local/bin/docker"

echo "🛑  Stopping any existing containers and volumes..."
$DOCKER compose -f "$REPO/docker-compose.yml" down -v 2>/dev/null || true

echo "🔨  Building and starting services..."
$DOCKER compose -f "$REPO/docker-compose.yml" up --build -d

echo "⏳  Waiting for backend to be healthy (up to 90s)..."
i=0
until $DOCKER inspect --format='{{.State.Health.Status}}' eventstormstudio-backend-1 2>/dev/null | grep -q healthy; do
  i=$((i+1))
  if [ $i -ge 90 ]; then
    echo "❌  Backend did not become healthy in time."
    echo "    Run: docker compose logs backend"
    exit 1
  fi
  printf '.'
  sleep 1
done
echo ""

echo "⏳  Waiting for frontend to be running (up to 30s)..."
i=0
until $DOCKER inspect --format='{{.State.Status}}' eventstormstudio-frontend-1 2>/dev/null | grep -q running; do
  i=$((i+1))
  if [ $i -ge 30 ]; then echo "❌  Frontend not running"; exit 1; fi
  sleep 1
done

sleep 3  # Let Vite finish binding

echo ""
echo "✅  All services ready!"
echo ""
echo "   🌐  Frontend : http://localhost:3000"
echo "   🔌  Backend  : http://localhost:4000/health"
echo "   🗄️   Postgres : localhost:5432"
echo ""
echo "Open http://localhost:3000 in your browser."

#!/usr/bin/env bash
# Start ChoreoStudio WITHOUT Docker (requires Node 20+ and Postgres 16)
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$(pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

# 1. Check Node
node_ver=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
[[ "${node_ver:-0}" -ge 20 ]] && ok "Node $(node --version)" || fail "Node 20+ required (found: $(node --version 2>/dev/null || echo none))"

# 2. .env
if [[ ! -f .env ]]; then
  cp .env.example .env
  warn "Created .env from .env.example — edit DATABASE_URL if needed"
fi

# 3. Install deps
if [[ ! -d node_modules ]]; then
  echo "Installing dependencies…"
  npm install --ignore-scripts
fi
ok "Dependencies ready"

# 4. Check Postgres
source .env 2>/dev/null || true
DB_URL="${DATABASE_URL:-postgres://choreostudio:choreostudio_dev@localhost:5432/choreostudio}"
if psql "$DB_URL" -c '\q' &>/dev/null; then
  ok "Postgres reachable"
else
  fail "Cannot connect to Postgres at $DB_URL — start Postgres first (brew services start postgresql@16)"
fi

# 5. Apply migrations
echo "Applying DB migrations…"
for f in infra/db/init/*.sql; do
  psql "$DB_URL" -f "$f" &>/dev/null && ok "  $f" || warn "  $f may already be applied"
done

# 6. Start backend and frontend in background
echo ""
echo "Starting backend on :4000 and frontend on :3000…"
echo "(Press Ctrl+C to stop both)"
echo ""

DATABASE_URL="$DB_URL" PORT=4000 npm run dev -w packages/backend &
BACKEND_PID=$!

sleep 3
npm run dev -w packages/frontend &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait

#!/usr/bin/env bash
# ChoreoStudio Docker diagnostics
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

echo "=== ChoreoStudio Docker Diagnostics ==="
echo ""

# 1. Docker running?
if docker info &>/dev/null; then
  ok "Docker daemon is running"
else
  fail "Docker daemon is NOT running — start Docker Desktop first"
  exit 1
fi

# 2. Containers running?
echo ""
echo "--- Container status ---"
docker compose ps 2>/dev/null || { fail "Could not read docker compose status. Are you in the repo directory?"; exit 1; }

# 3. Check logs for errors
echo ""
echo "--- Last 20 lines of frontend logs ---"
docker compose logs --tail=20 frontend 2>/dev/null || warn "No frontend logs (container may not have started)"

echo ""
echo "--- Last 20 lines of backend logs ---"
docker compose logs --tail=20 backend 2>/dev/null || warn "No backend logs"

# 4. Port check
echo ""
echo "--- Port bindings ---"
docker compose port frontend 3000 2>/dev/null && ok "Frontend port 3000 mapped" || fail "Frontend port 3000 NOT mapped"
docker compose port backend  4000 2>/dev/null && ok "Backend port 4000 mapped"  || fail "Backend port 4000 NOT mapped"

# 5. Connectivity test
echo ""
echo "--- HTTP connectivity ---"
if curl -sf http://localhost:4000/health &>/dev/null; then
  ok "Backend responding at http://localhost:4000/health"
else
  fail "Backend NOT responding at http://localhost:4000"
fi
if curl -sf http://localhost:3000 &>/dev/null; then
  ok "Frontend responding at http://localhost:3000"
else
  fail "Frontend NOT responding at http://localhost:3000"
fi

echo ""
echo "=== Done. If all red, run: docker compose down -v && docker compose up --build ==="

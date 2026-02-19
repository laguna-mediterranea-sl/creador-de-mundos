#!/bin/bash
# ─────────────────────────────────────────────────────────────
# WorldEngine SDK — Script de deploy para VDS
# ─────────────────────────────────────────────────────────────
#
# Uso:
#   ./deploy/deploy.sh                    # deploy en puerto 3000
#   PORT=8080 ./deploy/deploy.sh          # deploy en puerto 8080
#   ./deploy/deploy.sh --rebuild          # forzar rebuild
#
# Requisitos en el VDS:
#   - Docker >= 20.10
#   - Docker Compose v2
#   - Git
# ─────────────────────────────────────────────────────────────

set -euo pipefail

PORT="${PORT:-3000}"
REBUILD=""

for arg in "$@"; do
  case $arg in
    --rebuild) REBUILD="--no-cache" ;;
  esac
done

echo "╔══════════════════════════════════════════╗"
echo "║   WorldEngine SDK — Deploy to VDS       ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Puerto: ${PORT}"
echo ""

# 1. Pull latest code
echo "→ Pulling latest code..."
git pull origin "$(git branch --show-current)"

# 2. Build & start
echo "→ Building Docker image..."
PORT="${PORT}" docker compose up -d --build ${REBUILD}

# 3. Wait for health check
echo "→ Waiting for health check..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/health" > /dev/null 2>&1; then
    echo ""
    echo "✓ WorldEngine SDK running on port ${PORT}"
    echo ""
    echo "  Local:   http://localhost:${PORT}"
    echo "  Health:  http://localhost:${PORT}/health"
    echo ""
    echo "  Conectar desde las plataformas:"
    echo "  - Tu Cuento Mágico  → http://TU-VDS-IP:${PORT}"
    echo "  - Aulas Mágicas     → http://TU-VDS-IP:${PORT}"
    echo ""
    exit 0
  fi
  sleep 1
  printf "."
done

echo ""
echo "✗ Health check failed after 30s"
echo "  Check logs: docker compose logs worldengine"
exit 1

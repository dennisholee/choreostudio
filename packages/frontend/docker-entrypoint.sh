#!/bin/sh
set -e
echo "[entrypoint] Building @choreostudio/shared..."
npm run build -w packages/shared
echo "[entrypoint] Starting frontend..."
exec npm run dev -w packages/frontend

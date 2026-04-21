#!/usr/bin/env bash
# Start the Freedom Dispatcher daemon.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV="${SCRIPT_DIR}/.venv"

if [[ ! -f "${VENV}/bin/python" ]]; then
  echo "[freedom-dispatcher] Creating virtual environment..."
  python3 -m venv "$VENV"
fi

if ! "${VENV}/bin/python" -c "import fastapi, uvicorn, yaml" 2>/dev/null; then
  echo "[freedom-dispatcher] Installing dependencies..."
  "${VENV}/bin/pip" install -r requirements.txt --quiet
fi

echo "[freedom-dispatcher] Starting on http://127.0.0.1:4317"
exec "${VENV}/bin/python" main.py

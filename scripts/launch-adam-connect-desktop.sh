#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
log_dir="${XDG_STATE_HOME:-$HOME/.local/state}/adam-connect"
log_file="$log_dir/desktop-launch.log"
gateway_port="${GATEWAY_PORT:-43111}"

mkdir -p "$log_dir"

unset ELECTRON_RUN_AS_NODE

kill_if_running() {
  local signal="$1"
  shift
  if [[ $# -eq 0 ]]; then
    return
  fi
  kill "-$signal" "$@" >/dev/null 2>&1 || true
}

collect_port_pids() {
  if ! command -v lsof >/dev/null 2>&1; then
    return
  fi
  lsof -tiTCP:"$gateway_port" -sTCP:LISTEN 2>/dev/null || true
}

if ! command -v npm >/dev/null 2>&1 && [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  # Load just enough shell state to find npm without inheriting unrelated developer exports.
  # shellcheck disable=SC1090
  source "$HOME/.nvm/nvm.sh"
  nvm use default >/dev/null 2>&1 || true
fi

if ! command -v npm >/dev/null 2>&1; then
  printf '[%s] npm was not found while launching Freedom Desktop.\n' "$(date --iso-8601=seconds)" >>"$log_file"
  exit 127
fi

cd "$repo_root"
printf '[%s] Launching Freedom Desktop from %s\n' "$(date --iso-8601=seconds)" "$repo_root" >>"$log_file"

# During active local development the shell stays resident in the tray, so clicking
# the launcher again can otherwise reopen an older process that still has stale code.
pkill -f "$repo_root/apps/desktop/dist/main.js" >/dev/null 2>&1 || true
pkill -f "npm run dev --workspace @freedom/gateway" >/dev/null 2>&1 || true
pkill -f "npm run dev --workspace @freedom/desktop-host" >/dev/null 2>&1 || true
pkill -f "$repo_root/node_modules/tsx/dist/loader.mjs src/index.ts" >/dev/null 2>&1 || true
pkill -f "$repo_root/node_modules/tsx/dist/loader.mjs src/host/cli.ts" >/dev/null 2>&1 || true
pkill -f "$repo_root/apps/gateway.*src/index.ts" >/dev/null 2>&1 || true
pkill -f "$repo_root/apps/desktop-host.*src/host/cli.ts" >/dev/null 2>&1 || true
mapfile -t port_pids < <(collect_port_pids)
if ((${#port_pids[@]})); then
  kill_if_running TERM "${port_pids[@]}"
fi
sleep 1
mapfile -t stubborn_port_pids < <(collect_port_pids)
if ((${#stubborn_port_pids[@]})); then
  printf '[%s] Forcing stale Freedom listener off port %s: %s\n' "$(date --iso-8601=seconds)" "$gateway_port" "${stubborn_port_pids[*]}" >>"$log_file"
  kill_if_running KILL "${stubborn_port_pids[@]}"
  sleep 1
fi

exec npm run app:desktop >>"$log_file" 2>&1

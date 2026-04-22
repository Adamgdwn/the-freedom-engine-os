#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
log_dir="${XDG_STATE_HOME:-$HOME/.local/state}/freedom-desktop"
log_file="$log_dir/desktop-launch.log"
gateway_port="${GATEWAY_PORT:-43111}"
gateway_data_dir="$repo_root/apps/gateway/.local-data/gateway"
desktop_data_dir="$repo_root/apps/desktop-host/.local-data/desktop"
desktop_gateway_url="http://127.0.0.1:${gateway_port}"

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

# Force the Freedom-owned runtime paths so stale legacy exports cannot
# silently reattach this launcher to the wrong backend state.
export DESKTOP_APPROVED_ROOTS="${DESKTOP_APPROVED_ROOTS:-$repo_root}"
export DESKTOP_HOST_NAME="Freedom Desktop"
export DESKTOP_GATEWAY_URL="$desktop_gateway_url"
export DESKTOP_DATA_DIR="$desktop_data_dir"
export GATEWAY_DATA_DIR="$gateway_data_dir"

# During active local development the shell stays resident in the tray, so clicking
# the launcher again can otherwise reopen an older process that still has stale code.
cleanup_patterns=(
  "$repo_root/apps/desktop/dist/main.js"
  "npm run dev --workspace @freedom/desktop"
  "npm run dev --workspace @freedom/gateway"
  "npm run dev --workspace @freedom/desktop-host"
  "npm run dev --workspace .*desktop-shell"
  "npm run dev --workspace .*gateway"
  "npm run dev --workspace .*desktop-extension"
  "$repo_root/node_modules/tsx/dist/cli.mjs src/index.ts"
  "$repo_root/node_modules/tsx/dist/cli.mjs src/host/cli.ts"
  "$repo_root/node_modules/tsx/dist/loader.mjs src/index.ts"
  "$repo_root/node_modules/tsx/dist/loader.mjs src/host/cli.ts"
  "$repo_root/apps/gateway.*src/index.ts"
  "$repo_root/apps/desktop-host.*src/host/cli.ts"
  "../../node_modules/tsx/dist/cli.mjs src/index.ts"
  "../../node_modules/tsx/dist/cli.mjs src/host/cli.ts"
  "../../node_modules/tsx/dist/loader.mjs src/index.ts"
  "../../node_modules/tsx/dist/loader.mjs src/host/cli.ts"
  "/apps/desktop-shell/dist/main.js"
  "/apps/gateway.*src/index.ts"
  "/apps/desktop-extension.*src/host/cli.ts"
  "/node_modules/tsx/dist/cli.mjs src/index.ts"
  "/node_modules/tsx/dist/cli.mjs src/host/cli.ts"
  "/node_modules/tsx/dist/loader.mjs src/index.ts"
  "/node_modules/tsx/dist/loader.mjs src/host/cli.ts"
)

for pattern in "${cleanup_patterns[@]}"; do
  pkill -f "$pattern" >/dev/null 2>&1 || true
done

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

exec npm run app:desktop:electron >>"$log_file" 2>&1

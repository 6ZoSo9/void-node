#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

ALIEN_HOST="${ALIEN_HOST:-zoso@100.122.79.39}"
REMOTE_REPO="${REMOTE_REPO:-\$HOME/dev/void-node}"
REMOTE_SCRIPT="${REMOTE_SCRIPT:-ops/alienware-update-node-helper-relayer.sh}"
WC_SYNC_FROM_LOCAL="${WC_SYNC_FROM_LOCAL:-0}"
LOCAL_RPC_URL="${LOCAL_RPC_URL:-http://127.0.0.1:8545}"
REMOTE_RPC_URL="${REMOTE_RPC_URL:-http://127.0.0.1:8545}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[fail] missing $1" >&2; exit 1; }; }
need bash
need ssh

echo "=== [0] remote target ==="
echo "host=$ALIEN_HOST"
echo "repo=$REMOTE_REPO"
echo "script=$REMOTE_SCRIPT"
echo "wc_sync_from_local=$WC_SYNC_FROM_LOCAL"
echo

ssh -t "$ALIEN_HOST" "bash -lc '
set -euo pipefail
set +H
set +o histexpand

cd \"$REMOTE_REPO\"
git fetch origin
git reset --hard origin/main
bash \"$REMOTE_SCRIPT\"
'"

if [ "$WC_SYNC_FROM_LOCAL" = "1" ]; then
  need scp
  need rsync
  need wc
  if [ ! -x "$HOME/.foundry/bin/cast" ]; then
    echo "[fail] missing $HOME/.foundry/bin/cast for WC sync" >&2
    exit 1
  fi

  echo
  echo "=== [9] WC sync from local ==="
  STATE_FILE="/tmp/void-local-anvil-state-2050.hex"
  "$HOME/.foundry/bin/cast" rpc --rpc-url "$LOCAL_RPC_URL" anvil_dumpState > "$STATE_FILE"
  wc -c "$STATE_FILE"
  scp "$STATE_FILE" "$ALIEN_HOST:/tmp/void-local-anvil-state-2050.hex"

  ssh -t "$ALIEN_HOST" "bash -lc '
  set -euo pipefail
  export PATH=\"$HOME/.foundry/bin:\$PATH\"
  \"$HOME/.foundry/bin/cast\" chain-id --rpc-url \"$REMOTE_RPC_URL\"
  \"$HOME/.foundry/bin/cast\" rpc --rpc-url \"$REMOTE_RPC_URL\" anvil_loadState \"\$(cat /tmp/void-local-anvil-state-2050.hex)\"
  '"

  rsync -av --delete data_a/wc_v1/ "$ALIEN_HOST:$REMOTE_REPO/data_a/wc_v1/"

  ssh -t "$ALIEN_HOST" "bash -lc '
  set -euo pipefail
  systemctl --user restart void-workcredits-devnet-http.service || true
  sleep 3
  curl -fsS http://127.0.0.1:4312/workcredits/devnet/pool.json
  echo
  curl -fsS http://127.0.0.1:4312/workcredits/devnet/account/0xdf994e1b8c1ac9078c66892b589c8aa76c3be592.json
  '"
fi

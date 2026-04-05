#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

align_workcredits_state_for_live_anvil() {
  echo "=== [align] workcredits state vs live anvil ==="
  local cast_bin="$HOME/.foundry/bin/cast"
  local rpc="http://127.0.0.1:8545"

  if [ ! -x "$cast_bin" ]; then
    echo "[align] skip: cast not present at $cast_bin"
    return 0
  fi

  local chain_id
  chain_id="$("$cast_bin" chain-id --rpc-url "$rpc" 2>/dev/null || true)"
  echo "[align] rpc chain_id=${chain_id:-<unknown>}"

  if [ "${chain_id:-}" = "2050" ]; then
    echo "[align] note: live WC/devnet chain is 2050 on :8545"
    echo "[align] note: this updater does not realign anvil/ledger state by itself"
    echo "[align] note: use local->remote anvil_dumpState/anvil_loadState plus rsync data_a/wc_v1 when strict parity is required"
    return 0
  fi

  echo "[align] skip: rpc chain is not 2050"
  return 0
}


REPO="${REPO:-$HOME/dev/void-node}"
NODE_BASE="${NODE_BASE:-http://127.0.0.1:4100}"
HELPER_BASE="${HELPER_BASE:-http://127.0.0.1:4312/workcredits/devnet}"
RELAYER_BASE="${RELAYER_BASE:-http://127.0.0.1:4313/api/wc-relayer/v1}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[fail] missing $1" >&2; exit 1; }; }
need bash
need git
need curl
need ss
need node
need npm
need fuser

if [ ! -d "$REPO" ]; then
  echo "[fail] missing repo: $REPO" >&2
  exit 1
fi

cd "$REPO"

echo "=== [0] current repo state ==="
pwd
OLD_HEAD="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
OLD_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
echo "branch=$OLD_BRANCH"
echo "old_head=$OLD_HEAD"
git log --oneline --decorate -n 3 || true
SNAP_DIR="/tmp/void-update-snapshots"
mkdir -p "$SNAP_DIR"
SNAP_FILE="$SNAP_DIR/alienware-update-last-head.txt"
{
  echo "ts=$(date -Is)"
  echo "host=$(hostname)"
  echo "role=alienware-node-helper-relayer"
  echo "branch=$OLD_BRANCH"
  echo "old_head=$OLD_HEAD"
} > "$SNAP_FILE"
echo "snapshot_file=$SNAP_FILE"
echo

echo "=== [1] runtime ==="
node -v
npm -v
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "${NODE_MAJOR:-0}" -lt 22 ] || [ "${NODE_MAJOR:-0}" -ge 23 ]; then
  echo "[warn] node version is outside package target (wanted >=22 <23)"
else
  echo "[ok] node version in expected range"
fi
echo

echo "=== [2] sync to origin/main ==="
git fetch origin
git reset --hard origin/main
NEW_HEAD="$(git rev-parse --short HEAD)"
echo "new_head=$NEW_HEAD"
git log --oneline --decorate -n 5
{
  echo "new_head=$NEW_HEAD"
} >> "$SNAP_FILE"
echo

echo "=== [3] install deps ==="
npm install
echo

echo "=== [4] stop service + clear stale ports ==="
systemctl --user stop void-node.service || true
sleep 2
for p in 4100 4700; do
  fuser -k "${p}/tcp" || true
done
sleep 2
echo

echo "=== [5] restart node service ==="
systemctl --user restart void-node.service
sleep 6
echo

echo "=== [5b] restart helper if present ==="
systemctl --user restart void-workcredits-devnet-http.service || true
sleep 3
echo

align_workcredits_state_for_live_anvil

echo "=== [6] probes ==="
echo "--- node /health"
curl -fsS --max-time 6 "$NODE_BASE/health" | tee /tmp/alienware.node-health.$$.json
echo
echo "--- node /participant"
curl -fsS --max-time 6 "$NODE_BASE/participant" > /tmp/alienware.participant.$$
head -c 200 /tmp/alienware.participant.$$ || true
rm -f /tmp/alienware.participant.$$
echo
echo "--- node /ready gate"
READY_OK=0
for i in $(seq 1 15); do
  READY_JSON="$(curl -fsS --max-time 6 "$NODE_BASE/__void/ready.json" || true)"
  printf '%s\n' "$READY_JSON" | tee /tmp/alienware.ready.$$.json >/dev/null
  if python3 - "$READY_JSON" <<'PY2'
import json, sys
try:
    o = json.loads(sys.argv[1])
except Exception:
    raise SystemExit(1)
assert o.get("ready") is True
assert int(o.get("gap", -1)) == 0
assert int(o.get("txroot_live", 0)) == 1
print("ok")
PY2
  then
    READY_OK=1
    echo "[ok] ready gate passed on poll=$i"
    break
  fi
  echo "[wait] ready gate not passed yet poll=$i"
  sleep 2
done
if [ "$READY_OK" != "1" ]; then
  echo "[fail] ready gate did not pass" >&2
  exit 1
fi
cat /tmp/alienware.ready.$$.json
echo
echo "--- helper /pool.json"
curl -fsS --max-time 6 "$HELPER_BASE/pool.json" | tee /tmp/alienware.helper.$$.json
echo
echo "--- relayer /health"
curl -fsS --max-time 6 "$RELAYER_BASE/health" | tee /tmp/alienware.relayer.$$.json
echo
echo "--- rpc chain id"
curl -fsS --max-time 6 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  "$RPC_URL"
echo
echo

echo "=== [7] listeners ==="
ss -ltnp | grep -E ':4100 |:4312 |:4313 |:4700 |:8545 ' || true
echo

echo "=== [8] update summary ==="
echo "PASS alienware-update"
echo "old_head=$OLD_HEAD"
echo "new_head=$NEW_HEAD"
if [ "$OLD_HEAD" = "$NEW_HEAD" ]; then
  echo "changed=no"
else
  echo "changed=yes"
fi
echo "rollback_hint=git reset --hard $OLD_HEAD"
echo "- repo synced to origin/main"
echo "- deps installed"
echo "- stale 4100/4700 holders cleared"
echo "- node restarted and serving"
echo "- helper reachable"
echo "- relayer reachable"
echo "- anvil rpc reachable"
echo "- role remains node + helper + relayer"

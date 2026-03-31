#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

align_workcredits_state_for_live_anvil() {
  echo "=== [align] workcredits state vs live anvil ==="
  local cast_bin="$HOME/.foundry/bin/cast"
  local rpc="http://127.0.0.1:8545"
  local state_json="$HOME/dev/void-node/docs/VOID-DEVNET-PROTOCOL-STATE.json"
  local wc_state_json="$HOME/dev/void-node/docs/VOID-WORKCREDITS-DEVNET-STATE.json"
  local b31337="$HOME/dev/void-node/broadcast/WorkCreditsDevnetDeploy.s.sol/31337/run-latest.json"

  if [ ! -x "$cast_bin" ]; then
    echo "[align] skip: cast not present at $cast_bin"
    return 0
  fi
  if [ ! -f "$state_json" ] || [ ! -f "$wc_state_json" ]; then
    echo "[align] skip: missing state json(s)"
    return 0
  fi
  if [ ! -f "$b31337" ]; then
    echo "[align] skip: missing 31337 broadcast file"
    return 0
  fi

  local chain_id
  chain_id="$("$cast_bin" chain-id --rpc-url "$rpc" 2>/dev/null || true)"
  echo "[align] rpc chain_id=${chain_id:-<unknown>}"
  if [ "${chain_id:-}" != "31337" ]; then
    echo "[align] skip: rpc chain is not 31337"
    return 0
  fi

  python3 - "$state_json" "$wc_state_json" "$b31337" <<'PY2'
import json, sys, pathlib
state_p = pathlib.Path(sys.argv[1])
wc_p = pathlib.Path(sys.argv[2])
b_p = pathlib.Path(sys.argv[3])

state = json.loads(state_p.read_text())
wc = json.loads(wc_p.read_text())
b = json.loads(b_p.read_text())
txs = b.get("transactions", [])

def addr_for(name: str):
    for t in txs:
        if t.get("contractName") == name:
            return t.get("contractAddress")
    return None

void_addr = addr_for("DevnetVoidToken")
wc_addr = addr_for("WorkCreditsToken")
pool_addr = addr_for("WorkCreditsPoolV1")
relayer_addr = addr_for("WorkCreditsRelayerV1")
changed = False

def set_if(obj, key, val):
    global changed
    if val and obj.get(key) != val:
        obj[key] = val
        changed = True

set_if(state, "chain", "devnet")
set_if(state, "rpc_url", "http://127.0.0.1:8545")
set_if(state, "voidToken", void_addr)
set_if(state, "workCreditsToken", wc_addr)
set_if(state, "workCreditsPoolV1", pool_addr)
if relayer_addr:
    set_if(state, "workCreditsRelayerV1", relayer_addr)

set_if(wc, "chain", "devnet")
set_if(wc, "rpc_url", "http://127.0.0.1:8545")
set_if(wc, "pool_address", pool_addr)

if changed:
    state_p.write_text(json.dumps(state, indent=2) + "\n")
    wc_p.write_text(json.dumps(wc, indent=2) + "\n")
    print("[align] updated state jsons from 31337 broadcast")
else:
    print("[align] state jsons already aligned")
PY2
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

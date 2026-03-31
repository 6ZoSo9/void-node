#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

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

if [ ! -d "$REPO" ]; then
  echo "[fail] missing repo: $REPO" >&2
  exit 1
fi

cd "$REPO"

echo "=== [0] repo ==="
pwd
git rev-parse --abbrev-ref HEAD
git log --oneline --decorate -n 3 || true
echo

echo "=== [1] node version ==="
node -v
npm -v
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "${NODE_MAJOR:-0}" -lt 22 ] || [ "${NODE_MAJOR:-0}" -ge 23 ]; then
  echo "[warn] node version is outside package target (wanted >=22 <23)"
else
  echo "[ok] node version in expected range"
fi
echo

echo "=== [2] sync repo to origin/main ==="
git fetch origin
git reset --hard origin/main
git log --oneline --decorate -n 5
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

echo "=== [6] probes ==="
echo "--- node /health"
curl -fsS --max-time 5 "$NODE_BASE/health" || { echo "[fail] node health"; exit 1; }
echo
echo "--- node /participant"
curl -fsS --max-time 5 "$NODE_BASE/participant" > /tmp/alienware.participant.$$ || { echo "[fail] participant page"; exit 1; }
head -c 200 /tmp/alienware.participant.$$ || true
rm -f /tmp/alienware.participant.$$
echo
echo "--- helper /pool.json"
curl -fsS --max-time 5 "$HELPER_BASE/pool.json" || { echo "[fail] helper pool"; exit 1; }
echo
echo "--- relayer /health"
curl -fsS --max-time 5 "$RELAYER_BASE/health" || { echo "[fail] relayer health"; exit 1; }
echo
echo "--- rpc chain id"
curl -fsS --max-time 5 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' \
  "$RPC_URL" || { echo "[fail] rpc chain id"; exit 1; }
echo
echo

echo "=== [7] listeners ==="
ss -ltnp | grep -E ':4100 |:4312 |:4313 |:4700 |:8545 ' || true
echo

echo "=== [8] role summary ==="
echo "PASS alienware-bootstrap"
echo "- repo synced to origin/main"
echo "- node service restarted"
echo "- node/participant reachable"
echo "- helper reachable"
echo "- relayer reachable"
echo "- anvil rpc reachable"
echo "- this role is node + helper + relayer"
echo "- this role does not require isolated 4110 preflight"

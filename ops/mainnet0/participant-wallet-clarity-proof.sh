#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-wallet-clarity-proof.html"

echo "=== Participant Wallet clarity proof ==="

echo
echo "=== [1] build ==="
npm run build

echo
echo "=== [2] restart node to serve current source ==="
systemctl --user restart void-node.service

READY_OK=0
for i in $(seq 1 120); do
  if curl -fsS "$BASE/__void/ready.json" > /tmp/void-participant-wallet-clarity-ready.json; then
    READY_OK=1
    break
  fi
  sleep 1
done
test "$READY_OK" = "1"

cat /tmp/void-participant-wallet-clarity-ready.json
echo

python3 - /tmp/void-participant-wallet-clarity-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] rendered Wallet backup clarity copy ==="
curl -fsS "$BASE/participant" > "$HTML"

grep -q 'VOID_WALLET_BACKUP_CLARITY_V1' "$HTML"
grep -q 'Local self-custody wallet' "$HTML"
grep -q 'export and back up your keystore' "$HTML"
grep -q 'cannot recover your wallet if you lose the password or local files' "$HTML"
grep -q 'Export Keystore' "$HTML"
grep -q 'Manage Wallet' "$HTML"

echo "[ok] Wallet backup clarity copy rendered"

echo
echo "=== [4] final path/status stay green ==="
bash ops/mainnet/mainnet0-final-path-proof.sh
bash ops/mainnet/mainnet0-status-smoke.sh

echo
echo "[ok] Participant Wallet clarity proof passed"

#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-public-clarity-proof.html"

echo "=== Participant public clarity rollup proof ==="

echo
echo "=== [1] build ==="
npm run build

echo
echo "=== [2] restart node to serve current source ==="
systemctl --user restart void-node.service

READY_OK=0
for i in $(seq 1 120); do
  if curl -fsS "$BASE/__void/ready.json" > /tmp/void-participant-public-clarity-ready.json; then
    READY_OK=1
    break
  fi
  sleep 1
done
test "$READY_OK" = "1"

cat /tmp/void-participant-public-clarity-ready.json
echo

python3 - /tmp/void-participant-public-clarity-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap",-1)) == 0, j
assert int(j.get("txroot_live",0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] rendered participant public clarity markers ==="
curl -fsS "$BASE/participant" > "$HTML"

# Home / Start Here
grep -q 'VOID_HOME_START_PUBLIC_CLARITY_V1' "$HTML"
grep -q 'Mainnet-0 preview • not public launch' "$HTML"
grep -q 'Use Manage Wallet first' "$HTML"
grep -q 'guided participant-page request flow' "$HTML"

# Buy VOID
grep -q 'VOID_BUY_PUBLIC_SAFETY_CLARITY_V1' "$HTML"
grep -q 'create a Buy VOID request first' "$HTML"
grep -q 'payment confirmation is not VOID fulfillment' "$HTML"

# Stake/Register
grep -q 'VOID_STAKE_PUBLIC_CLARITY_V1' "$HTML"
grep -q 'Public Registration ≠ Active Validator Admission' "$HTML"
grep -q 'does not make this wallet an active validator' "$HTML"

# Wallet backup
grep -q 'VOID_WALLET_BACKUP_CLARITY_V1' "$HTML"
grep -q 'Local self-custody wallet' "$HTML"
grep -q 'export and back up your keystore' "$HTML"
grep -q 'cannot recover your wallet if you lose the password or local files' "$HTML"

echo "[ok] all public clarity markers rendered"

echo
echo "=== [4] final path/status stay green ==="
bash ops/mainnet/mainnet0-final-path-proof.sh
bash ops/mainnet/mainnet0-status-smoke.sh

echo
echo "[ok] Participant public clarity rollup proof passed"

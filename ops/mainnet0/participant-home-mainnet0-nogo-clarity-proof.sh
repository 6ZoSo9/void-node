#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-home-nogo-clarity.html"

echo "=== participant Home Mainnet-0 public-live clarity proof ==="

echo
echo "=== [1] source markers ==="
grep -q 'VOID_HOME_MAINNET0_PUBLIC_LIVE_CLARITY_V1' src/index.ts
grep -q 'Mainnet-0 public-live' src/index.ts
grep -q 'Mainnet-0 is public-live' src/index.ts
grep -q 'Start with Wallet' src/index.ts
grep -q 'Buy VOID must use the guided request flow' src/index.ts
grep -q 'validator registration is candidate/waiting only' src/index.ts
grep -q 'active admission stays disabled unless a later guarded proof lane changes it' src/index.ts
echo "[ok] source has explicit Home public-live clarity"

echo
echo "=== [2] build + restart ==="
npm run build
systemctl --user restart void-node.service
sleep 4

echo
echo "=== [3] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-home-nogo-ready.json
echo
python3 - /tmp/void-home-nogo-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [4] served participant HTML ==="
curl -fsS "$BASE/participant" > "$HTML"
grep -q 'VOID_HOME_MAINNET0_PUBLIC_LIVE_CLARITY_V1' "$HTML"
grep -q 'Mainnet-0 public-live' "$HTML"
grep -q 'Mainnet-0 is public-live' "$HTML"
grep -q 'Start with Wallet' "$HTML"
grep -q 'Buy VOID must use the guided request flow' "$HTML"
grep -q 'validator registration is candidate/waiting only' "$HTML"
grep -q 'active admission stays disabled unless a later guarded proof lane changes it' "$HTML"
grep -q 'VOID_HOME_ACTIONS_WALLET_FIRST_V1' "$HTML"
grep -q 'VOID_BUY_PUBLIC_SAFETY_CLARITY_V1' "$HTML"
grep -q 'VOID_STAKE_PUBLIC_CLARITY_V1' "$HTML"
echo "[ok] served Home clarity is present"

echo
echo "=== [5] launch posture remains fail-closed ==="
grep -q '^status: public_mainnet0_live' ops/mainnet/mainnet0-final-gonogo-map.current.md
grep -q '^decision: GO_PUBLIC_MAINNET0' ops/mainnet/mainnet0-final-gonogo-map.current.md
grep -q '^launch_approval: true' ops/mainnet/mainnet0-final-gonogo-map.current.md
grep -q '^mutation_allowed: true' ops/mainnet/mainnet0-final-gonogo-map.current.md
echo "[ok] launch docs remain public-live and guarded"

echo
echo "[ok] participant Home Mainnet-0 public-live clarity proof passed"

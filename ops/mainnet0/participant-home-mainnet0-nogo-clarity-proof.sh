#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-participant-home-nogo-clarity.html"

echo "=== participant Home Mainnet-0 NO-GO clarity proof ==="

echo
echo "=== [1] source markers ==="
grep -q 'VOID_HOME_MAINNET0_NOGO_CLARITY_V1' src/index.ts
grep -q 'Mainnet-0 preview' src/index.ts
grep -q 'public launch is still NO-GO' src/index.ts
grep -q 'Start with Wallet' src/index.ts
grep -q 'Buy VOID must use the guided request flow' src/index.ts
grep -q 'validator registration is candidate/waiting only' src/index.ts
grep -q 'active admission stays disabled until explicit launch approval' src/index.ts
echo "[ok] source has explicit Home NO-GO clarity"

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
grep -q 'VOID_HOME_MAINNET0_NOGO_CLARITY_V1' "$HTML"
grep -q 'Mainnet-0 preview' "$HTML"
grep -q 'public launch is still NO-GO' "$HTML"
grep -q 'Start with Wallet' "$HTML"
grep -q 'Buy VOID must use the guided request flow' "$HTML"
grep -q 'validator registration is candidate/waiting only' "$HTML"
grep -q 'active admission stays disabled until explicit launch approval' "$HTML"
grep -q 'VOID_HOME_ACTIONS_WALLET_FIRST_V1' "$HTML"
grep -q 'VOID_BUY_PUBLIC_SAFETY_CLARITY_V1' "$HTML"
grep -q 'VOID_STAKE_PUBLIC_CLARITY_V1' "$HTML"
echo "[ok] served Home clarity is present"

echo
echo "=== [5] launch posture remains fail-closed ==="
grep -q '^status: not_go_for_public_mainnet0' ops/mainnet/mainnet0-final-gonogo-map.current.md
grep -q '^decision: NO_GO' ops/mainnet/mainnet0-final-gonogo-map.current.md
grep -q '^launch_approval: false' ops/mainnet/mainnet0-final-gonogo-map.current.md
grep -q '^mutation_allowed: false' ops/mainnet/mainnet0-final-gonogo-map.current.md
echo "[ok] launch docs remain NO-GO"

echo
echo "[ok] participant Home Mainnet-0 NO-GO clarity proof passed"

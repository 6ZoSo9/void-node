#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
OUT="/tmp/public-first60-user-journey-proof-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "=== public first-60 user journey proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] build ==="
npm run build

echo
echo "=== [3] ready ==="
curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready.json"
cat "$OUT/ready.json"
echo
python3 - "$OUT/ready.json" <<'PY'
import json
import sys

j = json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
assert int(j.get("head", 0)) > 0, j
print("[ok] ready/head/gap/txroot")
PY

echo
echo "=== [4] root redirects to participant ==="
ROOT_CODE="$(curl -sS --max-time 8 \
  -D "$OUT/root.headers" \
  -o "$OUT/root.body" \
  -w '%{http_code}' \
  "$BASE/")"

test "$ROOT_CODE" = "302"
grep -qi '^Location: /participant' "$OUT/root.headers"
grep -q 'Found. Redirecting to /participant' "$OUT/root.body"
echo "[ok] / redirects to /participant"

echo
echo "=== [5] participant first-screen markers ==="
HTML="$OUT/participant.html"
curl -fsS --max-time 8 "$BASE/participant" > "$HTML"

needles=(
  '<title>VOID Participant</title>'
  'VOID_HOME_TOPSTRIP_PUBLIC_LIVE_V1'
  'Mainnet-0: public-live'
  'VOID_HOME_START_PUBLIC_CLARITY_V1'
  'Start Here'
  'Set up Account Wallet'
  'Fund or earn'
  'Check balances'
  'Preview staking'
  'Open Wallet'
  'Buy VOID'
  'Preview Staking'
  'Guided Base or Ethereum USDC request only'
  'Candidate/waiting preview only; active admission disabled.'
  'VOID_HOME_MAINNET0_PUBLIC_LIVE_CLARITY_V1'
  'Start with Wallet'
  'Buy VOID uses the guided request flow'
  'validator registration is candidate/waiting only'
  'active admission disabled'
  'VOID_BUY_PUBLIC_SAFETY_CLARITY_V1'
  'payment confirmation is not VOID fulfillment'
  'VOID_STAKE_PUBLIC_CLARITY_V1'
  'Public Registration ≠ Active Validator Admission.'
)

for n in "${needles[@]}"; do
  grep -q "$n" "$HTML"
  echo "[ok] $n"
done

echo
echo "=== [6] sensitive route GET safety ==="
for path in \
  /__void/status \
  /__void/participant/stake/next-onboard \
  /__void/operator/buy-void/fulfill \
  /__void/operator/buy-void/claim-tx \
  /__void/treasury \
  /__void/admin; do
  code="$(curl -sS --max-time 8 -o "$OUT/safety.body" -w '%{http_code}' "$BASE$path")"
  if [ "$code" != "404" ]; then
    echo "[ERR] expected 404 for $path, got $code"
    exit 1
  fi
  echo "[ok] $path -> 404"
done

echo
echo "=== [7] status smoke ==="
make mainnet0-status-smoke

echo
echo "=== [8] ready after ==="
curl -fsS --max-time 8 "$BASE/__void/ready.json" > "$OUT/ready-after.json"
cat "$OUT/ready-after.json"
echo
python3 - "$OUT/ready-after.json" <<'PY'
import json
import sys

j = json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot still green")
PY

echo
echo "=== [9] summary ==="
python3 - <<'PY'
print({
  "public_first60_user_journey": "green",
  "root_get": "redirects_to_participant",
  "wallet_first": True,
  "buy_void_guided_only": True,
  "validator_candidate_waiting_only": True,
  "sensitive_get_routes": "404",
  "mutation_lanes": "not_touched",
})
PY

echo
echo "[ok] public first-60 user journey proof passed"
echo "out=$OUT"

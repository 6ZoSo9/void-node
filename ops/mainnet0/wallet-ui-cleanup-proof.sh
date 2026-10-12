#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
HTML="/tmp/void-wallet-ui-cleanup-proof.html"

echo "=== Wallet UI cleanup proof ==="

echo
echo "=== [1] build ==="
npm run build

echo
echo "=== [2] ready ==="
READY_JSON="$(curl -fsS "$BASE/__void/ready.json")"
echo "$READY_JSON"
python3 - "$READY_JSON" <<'PY'
import json, sys
j=json.loads(sys.argv[1])
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] served participant HTML ==="
curl -fsS "$BASE/participant" > "$HTML"
echo "html=$HTML"

echo
echo "=== [4] required wallet markers ==="
grep -q "VOID_WALLET_SETUP_STEPS_V1" "$HTML"
grep -q "VOID_WALLET_SEND_WC_ADVANCED_V1" "$HTML"
grep -q "VOID_WALLET_SEND_VOID_ADVANCED_V1" "$HTML"
grep -q "VOID_HOME_TOPSTRIP_PUBLIC_LIVE_V1" "$HTML"
grep -q "Wallet Setup Path" "$HTML"
grep -q "Advanced: Send Local WC" "$HTML"
grep -q "Advanced: Send VOID" "$HTML"
grep -q "Wallet History" "$HTML"
grep -q "Wallet diagnostics" "$HTML"
echo "[ok] required wallet markers present"

echo
echo "=== [5] marker count guard ==="
python3 - "$HTML" <<'PY'
import sys
from pathlib import Path

html = Path(sys.argv[1]).read_text()
expected_once = [
  "VOID_WALLET_SETUP_STEPS_V1",
  "VOID_WALLET_SEND_WC_ADVANCED_V1",
  "VOID_WALLET_SEND_VOID_ADVANCED_V1",
  "VOID_HOME_TOPSTRIP_PUBLIC_LIVE_V1",
  "Wallet Setup Path",
  "Advanced: Send Local WC",
  "Advanced: Send VOID",
  "Wallet History",
  "Wallet diagnostics",
]
counts = {m: html.count(m) for m in expected_once}
bad = {k:v for k,v in counts.items() if v != 1}
assert not bad, {"bad_counts": bad, "counts": counts}
print("[ok] marker counts", counts)
PY

echo
echo "=== [6] advanced actions preserve JS ids ==="
grep -q 'id="sendTo"' "$HTML"
grep -q 'id="sendAmount"' "$HTML"
grep -q 'id="sendWcBtn"' "$HTML"
grep -q 'id="sendOut"' "$HTML"
grep -q 'id="voidSendTo"' "$HTML"
grep -q 'id="voidSendAmount"' "$HTML"
grep -q 'id="voidSendBtn"' "$HTML"
grep -q 'id="voidSendOut"' "$HTML"
echo "[ok] send action DOM ids preserved"

echo
echo "=== [7] normal wallet cleanup expectations ==="
grep -q '<details class="adv wallet-send-wc-advanced"' "$HTML"
grep -q '<details class="adv wallet-send-void-advanced"' "$HTML"
grep -q 'wallet action' "$HTML"
grep -q 'does not approve launch' "$HTML"
echo "[ok] send actions are tucked behind advanced details"

echo
echo "=== [8] launch remains fail-closed ==="
grep -q 'VOID_HOME_TOPSTRIP_PUBLIC_LIVE_V1' "$HTML"
grep -q 'Mainnet-0: public-live' "$HTML"
grep -q 'VOID_HOME_MAINNET0_PUBLIC_LIVE_CLARITY_V1' "$HTML"
grep -q 'Public-live status does not open guarded actions' "$HTML"
grep -q "candidate/waiting only" "$HTML"
echo "[ok] participant UI is public-live and guarded"

echo
echo "[ok] Wallet UI cleanup proof passed"

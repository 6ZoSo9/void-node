#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
PROM="${PROM:-http://127.0.0.1:9090}"
STATUS_FILE="ops/mainnet/mainnet0-status.current.md"
VALIDATOR_STATUS="ops/mainnet/validator-status.current.yaml"

echo "=== Mainnet-0 status proof ==="

echo
echo "=== [1] required files ==="
test -f "$STATUS_FILE"
test -f "$VALIDATOR_STATUS"
grep -q 'status: not_go_for_public_mainnet0' "$STATUS_FILE"
grep -q 'Buy VOID real payment claim has not been run' "$STATUS_FILE"
grep -q 'Buy VOID hard-stop composite proof is wired into Mainnet-0 prelaunch safety' "$STATUS_FILE"
grep -q 'Buy VOID hard-stop proof target: make buy-void-hardstop-proof' "$STATUS_FILE"
grep -q 'Payment confirmation does not equal VOID sent' "$STATUS_FILE"
grep -q 'Public validator candidate promotion/admission remains blocked' "$STATUS_FILE"
grep -q 'Operator/bootstrap validator runtime truth is green through epoch125' "$STATUS_FILE"
grep -q 'Durable local RPC restore lane is green for epoch125' "$STATUS_FILE"
grep -q 'Ready signals are not the same as launch approval' "$STATUS_FILE"
grep -q 'Mainnet-0 go/no-go NO-GO proof is green' "$STATUS_FILE"
grep -q 'Mainnet-0 blockers proof includes validator admission blocker proof and validator promotion plan proof' "$STATUS_FILE"
grep -q 'status: plan_only_candidate_declared' "$VALIDATOR_STATUS"
grep -q 'not active or live admitted' "$VALIDATOR_STATUS"
echo "[ok] status files encode not-go state"

echo
echo "=== [2] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-mainnet0-status-ready.json
python3 - /tmp/void-mainnet0-status-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] update safety metric ==="
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=void_mainnet0_update_safety_ok == 1' \
  | tee /tmp/void-mainnet0-status-update-safety.json
python3 - /tmp/void-mainnet0-status-update-safety.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("status") == "success", j
assert (j.get("data") or {}).get("result"), j
print("[ok] update safety green")
PY

echo
echo "=== [4] validator lifecycle metric ==="
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=void_mainnet_validator_lifecycle_composite_ok == 1' \
  | tee /tmp/void-mainnet0-status-validator-lifecycle.json
python3 - /tmp/void-mainnet0-status-validator-lifecycle.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("status") == "success", j
assert (j.get("data") or {}).get("result"), j
print("[ok] validator lifecycle green")
PY

curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=(time() - void_mainnet_validator_lifecycle_composite_timestamp_seconds) < 86400' \
  | tee /tmp/void-mainnet0-status-validator-lifecycle-fresh.json
python3 - /tmp/void-mainnet0-status-validator-lifecycle-fresh.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("status") == "success", j
assert (j.get("data") or {}).get("result"), j
print("[ok] validator lifecycle fresh")
PY

echo
echo "=== [5] Buy VOID status is configured; real claim/send remains blocked ==="
curl -fsS "$BASE/__void/operator/buy-void/base-watcher/status" \
  | tee /tmp/void-mainnet0-status-buy-void.json
python3 - /tmp/void-mainnet0-status-buy-void.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
cfg=j.get("config") or {}
w=j.get("latest_watch") or {}
assert j.get("ok") is True, j
assert cfg.get("enabled") is True, cfg
assert cfg.get("chain") == "base", cfg
assert cfg.get("asset") == "base_native_usdc", cfg
assert cfg.get("receiver_address") == "0x45dd104e3F7CC2A080F2edA094D011D09c51960B", cfg
assert cfg.get("token_address") == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", cfg

if w:
    payment_ref = str(w.get("payment_ref") or "")
    void_tx_ref = str(w.get("void_tx_ref") or "")

    assert not void_tx_ref, w
    if payment_ref:
        assert payment_ref.startswith("base_tx_confirmed_manual_"), w

print("[ok] Buy VOID configured; no VOID send recorded; only manual proof payment refs are allowed")
PY

echo
echo "=== [6] status summary ==="
python3 - <<'PY'
import json, pathlib
ready=json.load(open("/tmp/void-mainnet0-status-ready.json"))
buy=json.load(open("/tmp/void-mainnet0-status-buy-void.json"))
w=buy.get("latest_watch") or {}
payment_ref = str(w.get("payment_ref") or "")
manual_payment_ref = bool(payment_ref and payment_ref.startswith("base_tx_confirmed_manual_"))
real_claim_run = bool(payment_ref and not manual_payment_ref)

print({
  "status": "not_go_for_public_mainnet0",
  "node_ready": ready.get("ready"),
  "head": ready.get("head"),
  "buy_void_pending_count": buy.get("pending_count"),
  "latest_watch_id": w.get("watch_id"),
  "buy_void_real_claim_run": real_claim_run,
  "buy_void_manual_proof_payment_ref": manual_payment_ref,
  "buy_void_void_sent": bool(w.get("void_tx_ref")),
  "validator_status": "public_candidate_waiting_operator_epoch125_green",
})
PY

echo
echo "[ok] Mainnet-0 status proof passed"

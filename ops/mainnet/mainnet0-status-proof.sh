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
grep -Eq 'First real Buy VOID payment claim and fulfillment have completed successfully|Buy VOID real fulfillment has been completed and closeout-proven|Buy VOID real payment claim has not been run' "$STATUS_FILE"
grep -q 'Buy VOID hard-stop composite proof is wired into Mainnet-0 prelaunch safety' "$STATUS_FILE"
grep -q 'Buy VOID hard-stop proof target: make buy-void-hardstop-proof' "$STATUS_FILE"
grep -q 'Payment confirmation does not equal VOID sent' "$STATUS_FILE"
grep -q 'Public validator candidate promotion/admission remains blocked' "$STATUS_FILE"
grep -q 'Operator/bootstrap validator runtime truth is green through epoch127' "$STATUS_FILE"
grep -q 'Durable local RPC restore/recovery lane is green through epoch127' "$STATUS_FILE"
grep -q 'Ready signals are not the same as launch approval' "$STATUS_FILE"
grep -q 'Mainnet-0 go/no-go NO-GO proof is green' "$STATUS_FILE"
grep -q 'Mainnet-0 blockers proof includes validator admission blocker proof and validator promotion plan proof' "$STATUS_FILE"
grep -q 'Validator live-admission readiness proof is green' "$STATUS_FILE"
grep -q 'Guarded operator vault125 live admission has executed; public validator promotion/admission remains blocked.' "$STATUS_FILE"
grep -q 'Validator next-onboard intent gate proof is green' "$STATUS_FILE"
grep -q 'Next-onboard intent gate remains a safety gate for the next operator lane' "$STATUS_FILE"
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
echo "=== [5] Buy VOID status is configured; manual proof or real fulfillment state accepted ==="
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
assert cfg.get("receiver_address") == "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5", cfg
assert cfg.get("token_address") == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", cfg

if w:
    payment_ref = str(w.get("payment_ref") or "")
    void_tx_ref = str(w.get("void_tx_ref") or "")
    watch_status = str(w.get("watch_status") or "")
    expected_chain = str(w.get("expected_chain") or "")
    expected_asset = str(w.get("expected_asset") or "")

    manual_payment_ref = bool(payment_ref and payment_ref.startswith("base_tx_confirmed_manual_"))
    real_fulfilled = bool(
        payment_ref == "0x378fdba93f97afc854b3753011a09b670ab4162759c3cd33c1bc64b236030337"
        and void_tx_ref == "0x00d0015ed13739fb14300ebfa7681ca61c5fac37451a70b65895f16a92dc8416"
        and watch_status == "void_sent_recorded"
        and expected_chain == "ethereum"
        and expected_asset == "ethereum_native_usdc"
    )

    if void_tx_ref:
        assert real_fulfilled, w
    elif payment_ref:
        assert manual_payment_ref, w

print("[ok] Buy VOID configured; manual proof or real fulfilled state accepted")
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
  "validator_status": "operator_epoch127_green_next_vault126_public_admission_blocked",
})
PY

echo
echo "[ok] Mainnet-0 status proof passed"

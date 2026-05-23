#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

BASE="${BASE:-http://127.0.0.1:4100}"
STATUS_FILE="ops/mainnet/mainnet0-status.current.md"
VALIDATOR_STATUS="ops/mainnet/validator-status.current.yaml"

echo "=== Mainnet-0 status smoke ==="

echo
echo "=== [1] status files ==="
test -f "$STATUS_FILE"
test -f "$VALIDATOR_STATUS"
grep -q 'status: not_go_for_public_mainnet0' "$STATUS_FILE"
grep -q 'Launch approval prep baseline-reference checkpoint is cross-box proven at 10a14b6d / ckpt-launch-approval-prep-baseline-ref-green-20260523-071451.' "$STATUS_FILE"
grep -q 'Launch approval artifact prep is plan-only/not-approved and cross-box proven; approval_artifact_created=false.' "$STATUS_FILE"
grep -q 'WC devnet local-state runtime is cross-box proven at e0637a17 / ckpt-wc-devnet-local-state-runtime-green-20260523-081804; per-machine WC deploy addresses live under .runtime/mainnet0/wc-devnet-local/current and tracked WC state files stay clean.' "$STATUS_FILE"
grep -Eq 'First real Buy VOID payment claim and fulfillment have completed successfully|Buy VOID real fulfillment has been completed and closeout-proven|Buy VOID real payment claim has not been run' "$STATUS_FILE"
grep -q 'Public validator candidate promotion/admission remains blocked' "$STATUS_FILE"
grep -q 'Operator/bootstrap validator runtime truth is green through epoch127' "$STATUS_FILE"
grep -q 'Durable local RPC restore/recovery lane is green through epoch127' "$STATUS_FILE"
grep -q 'Launch approval prep baseline-reference checkpoint is cross-box proven at 10a14b6d / ckpt-launch-approval-prep-baseline-ref-green-20260523-071451.' "$STATUS_FILE"
grep -q 'Ready signals are not the same as launch approval' "$STATUS_FILE"
grep -q 'status: plan_only_candidate_declared' "$VALIDATOR_STATUS"
grep -q 'not active or live admitted' "$VALIDATOR_STATUS"
echo "[ok] status files encode not-go state"

echo
echo "=== [2] node ready ==="
curl -fsS "$BASE/__void/ready.json" | tee /tmp/void-mainnet0-status-smoke-ready.json
python3 - /tmp/void-mainnet0-status-smoke-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [3] Buy VOID watcher config ==="
curl -fsS "$BASE/__void/operator/buy-void/base-watcher/status" | tee /tmp/void-mainnet0-status-smoke-buy.json
python3 - /tmp/void-mainnet0-status-smoke-buy.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
cfg=j.get("config") or {}
assert j.get("ok") is True, j
assert cfg.get("enabled") is True, cfg
assert cfg.get("chain") == "base", cfg
assert cfg.get("asset") == "base_native_usdc", cfg
assert cfg.get("receiver_address") == "0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5", cfg
assert cfg.get("token_address") == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", cfg
print("[ok] Buy VOID watcher config present")
PY

echo
echo "=== [4] smoke summary ==="
python3 - <<'PY'
import json
ready=json.load(open("/tmp/void-mainnet0-status-smoke-ready.json"))
buy=json.load(open("/tmp/void-mainnet0-status-smoke-buy.json"))
print({
  "status": "not_go_for_public_mainnet0",
  "node_ready": ready.get("ready"),
  "head": ready.get("head"),
  "buy_void_configured": bool((buy.get("config") or {}).get("enabled")),
  "buy_void_pending_count": buy.get("pending_count"),
  "validator_status": "operator_epoch127_green_next_vault126_public_admission_blocked",
  "prometheus_required": False,
})
PY

echo
echo "[ok] Mainnet-0 status smoke passed"

#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

DOC="ops/mainnet/mainnet0-public-live-closeout.20260524-075712.md"
STATUS="ops/mainnet/mainnet0-status.current.md"
GONOGO="ops/mainnet/mainnet0-final-gonogo-map.current.md"
BASELINE="ops/mainnet/mainnet0-current-baseline.current.md"
PROMOTION="ops/mainnet/mainnet0-public-launch-promotion.20260524-071500.md"
LIVE_SEED="ops/mainnet/mainnet0-ops-treasury-seed-live.20260524-115943.md"

RPC="${RPC:-http://127.0.0.1:8545}"
TOKEN="0x470075B85352Eb86F7d089FB9ba88945f12AAd94"
VT="0x554eCc7be6f0b7cC3d1c578c2BB848e535c02514"
OT="0xf0D64c62A87034e1838dB8ec1e2e33666814E7D9"
TX="0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2"

echo "=== Mainnet-0 public live closeout proof ==="

echo
echo "=== [1] required files ==="
for f in "$DOC" "$STATUS" "$GONOGO" "$BASELINE" "$PROMOTION" "$LIVE_SEED"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] closeout artifact truth ==="
grep -q '^status: public_mainnet0_live_cross_box_green$' "$DOC"
grep -q '^public_live_checkpoint: 7e9d26b7 / ckpt-mainnet0-public-live-status-green-20260524-074155$' "$DOC"
grep -q '^launch_state: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q '^launch_approval: true$' "$DOC"
grep -q '^mutation_allowed_scope: launch_state_public_surface_status_only$' "$DOC"
grep -q '^precision_ready: true$' "$DOC"
grep -q '^alienware_ready: true$' "$DOC"
grep -q "$TX" "$DOC"
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Vault126 onboarding has not been executed.' "$DOC"
grep -q 'No additional treasury spend is authorized by this closeout.' "$DOC"
grep -q 'No private keys, seed phrases, wallet secrets, or credential material are included.' "$DOC"
echo "[ok] closeout artifact records public-live truth and guardrails"

echo
echo "=== [3] active current docs agree ==="
grep -q '^status: public_mainnet0_live$' "$STATUS"
grep -q '^status: public_mainnet0_live$' "$GONOGO"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$GONOGO"
grep -q '^launch_state: public_mainnet0_live$' "$BASELINE"
grep -q '^launch_approval: true$' "$BASELINE"
grep -q '^mutation_allowed_scope: launch_state_public_surface_status_only$' "$BASELINE"
grep -q 'Public active validator admission remains disabled' "$STATUS"
grep -q 'vault126' "$STATUS"
echo "[ok] active current docs agree"

echo
echo "=== [4] prerequisite artifacts agree ==="
grep -q '^status: public_launch_promotion_ready$' "$PROMOTION"
grep -q '^requested_launch_state: public_mainnet0_live$' "$PROMOTION"
grep -q '^launch_approval: true$' "$PROMOTION"
grep -q '^mutation_allowed_scope: launch_state_public_surface_status_only$' "$PROMOTION"
grep -q '^status: live_execution_green$' "$LIVE_SEED"
grep -q "^tx_hash: $TX$" "$LIVE_SEED"
grep -q '^live_tx_recorded: true$' "$LIVE_SEED"
grep -q '^balance_delta_verified: true$' "$LIVE_SEED"
echo "[ok] prerequisite artifacts agree"

echo
echo "=== [5] chain receipt and balances ==="
cast receipt --rpc-url "$RPC" "$TX" | grep -q 'status               1 (success)'
VT_BAL="$(cast call --rpc-url "$RPC" "$TOKEN" 'balanceOf(address)(uint256)' "$VT" | awk '{print $1}')"
OT_BAL="$(cast call --rpc-url "$RPC" "$TOKEN" 'balanceOf(address)(uint256)' "$OT" | awk '{print $1}')"
test "$VT_BAL" = "332207333000000000000000000"
test "$OT_BAL" = "1000000000000000000000000"
echo "[ok] receipt and balances match closeout"

echo
echo "=== [6] local node ready ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json > /tmp/void-public-live-closeout-ready.json
python3 - /tmp/void-public-live-closeout-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [7] git truth ==="
test "$(git rev-parse --short HEAD)" = "7e9d26b7"
git tag --points-at HEAD | grep -q '^ckpt-mainnet0-public-live-status-green-20260524-074155$'
echo "[ok] git HEAD matches public-live status checkpoint/tag"

echo
echo "=== [8] summary ==="
python3 - <<'PY'
print({
  "public_live_closeout": "green",
  "launch_state": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "precision": "ready_gap0_txroot",
  "alienware": "cross_box_green",
  "public_active_validator_admission": "disabled",
  "vault126_onboarding_executed": False,
  "additional_treasury_spend_authorized": False
})
PY

echo "[ok] Mainnet-0 public live closeout proof passed"

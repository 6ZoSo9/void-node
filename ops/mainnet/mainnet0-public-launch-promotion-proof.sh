#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

DOC="ops/mainnet/mainnet0-public-launch-promotion.20260524-071500.md"
APPROVAL="ops/mainnet/mainnet0-launch-approval-artifact.20260524-071550.md"
LIVE="ops/mainnet/mainnet0-ops-treasury-seed-live.20260524-115943.md"
CLOSEOUT="ops/mainnet/mainnet0-post-ops-seed-launch-state.20260524-070500.md"

RPC="${RPC:-http://127.0.0.1:8545}"
TOKEN="0x470075B85352Eb86F7d089FB9ba88945f12AAd94"
VT="0x554eCc7be6f0b7cC3d1c578c2BB848e535c02514"
OT="0xf0D64c62A87034e1838dB8ec1e2e33666814E7D9"
TX="0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2"

echo "=== Mainnet-0 public launch promotion proof ==="

echo
echo "=== [1] required files ==="
test -f "$DOC"
test -f "$APPROVAL"
test -f "$LIVE"
test -f "$CLOSEOUT"
echo "[ok] required files exist"

echo
echo "=== [2] promotion artifact ==="
grep -q '^status: public_launch_promotion_ready$' "$DOC"
grep -q '^requested_launch_state: public_mainnet0_live$' "$DOC"
grep -q '^launch_approval: true$' "$DOC"
grep -q '^mutation_allowed: true$' "$DOC"
grep -q '^mutation_allowed_scope: launch_state_public_surface_status_only$' "$DOC"
grep -q 'Mainnet-0 launch approval artifact is committed and tagged.' "$DOC"
grep -q 'OpsTreasury has been seeded with 1,000,000 VOID.' "$DOC"
grep -q 'Precision and Alienware are synced and cross-box green after the live seed.' "$DOC"
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only.' "$DOC"
grep -q 'vault126 / epoch128 / expectedValidatorCount=127' "$DOC"
grep -q 'No additional treasury spend is authorized by this promotion.' "$DOC"
grep -q 'No additional authority transfer is authorized by this promotion.' "$DOC"
grep -q 'It does not admit public active validators.' "$DOC"
grep -q 'It does not execute vault126 onboarding.' "$DOC"
grep -q 'It does not spend additional treasury funds.' "$DOC"
grep -q 'It does not send additional VOID.' "$DOC"
echo "[ok] promotion artifact requests public launch state while preserving guards"

echo
echo "=== [3] prerequisite artifacts ==="
grep -q '^status: operator_approved_pending_live_execution$' "$APPROVAL"
grep -q '^approval_intent: OPERATOR_APPROVES_PUBLIC_MAINNET0_LAUNCH$' "$APPROVAL"
grep -q '^launch_approval_requested: true$' "$APPROVAL"
grep -q '^mutation_allowed_requested: true$' "$APPROVAL"

grep -q '^status: live_execution_green$' "$LIVE"
grep -q "^tx_hash: $TX$" "$LIVE"
grep -q '^live_tx_recorded: true$' "$LIVE"
grep -q '^balance_delta_verified: true$' "$LIVE"

grep -q '^status: post_ops_seed_live_green_public_launch_promotion_pending$' "$CLOSEOUT"
grep -q 'Public active validator admission remains disabled.' "$CLOSEOUT"
grep -q 'No additional treasury spend is authorized by this artifact.' "$CLOSEOUT"
echo "[ok] prerequisites agree"

echo
echo "=== [4] chain truth ==="
cast receipt --rpc-url "$RPC" "$TX" | grep -q 'status               1 (success)'
VT_BAL="$(cast call --rpc-url "$RPC" "$TOKEN" 'balanceOf(address)(uint256)' "$VT" | awk '{print $1}')"
OT_BAL="$(cast call --rpc-url "$RPC" "$TOKEN" 'balanceOf(address)(uint256)' "$OT" | awk '{print $1}')"
test "$VT_BAL" = "332207333000000000000000000"
test "$OT_BAL" = "1000000000000000000000000"
echo "[ok] live seed receipt and balances remain correct"

echo
echo "=== [5] node ready ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json > /tmp/void-public-launch-promotion-ready.json
python3 - /tmp/void-public-launch-promotion-ready.json <<'PY'
import json, sys
j=json.load(open(sys.argv[1]))
assert j.get("ready") is True, j
assert int(j.get("gap", 999)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [6] summary ==="
python3 - <<'PY'
print({
  "public_launch_promotion_artifact": "green",
  "requested_launch_state": "public_mainnet0_live",
  "launch_approval": True,
  "mutation_allowed_scope": "launch_state_public_surface_status_only",
  "public_active_validator_admission": "disabled",
  "additional_treasury_spend_authorized": False,
  "vault126_onboarding_executed": False
})
PY

echo "[ok] Mainnet-0 public launch promotion proof passed"

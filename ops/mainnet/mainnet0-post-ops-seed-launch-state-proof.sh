#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

DOC="ops/mainnet/mainnet0-post-ops-seed-launch-state.20260524-070500.md"
APPROVAL="ops/mainnet/mainnet0-launch-approval-artifact.20260524-071550.md"
LIVE="ops/mainnet/mainnet0-ops-treasury-seed-live.20260524-115943.md"
RPC="${RPC:-http://127.0.0.1:8545}"
TOKEN="0x470075B85352Eb86F7d089FB9ba88945f12AAd94"
VT="0x554eCc7be6f0b7cC3d1c578c2BB848e535c02514"
OT="0xf0D64c62A87034e1838dB8ec1e2e33666814E7D9"
TX="0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2"

echo "=== Mainnet-0 post OpsTreasury seed launch-state proof ==="

echo
echo "=== [1] required files ==="
test -f "$DOC"
test -f "$APPROVAL"
test -f "$LIVE"
echo "[ok] required files exist"

echo
echo "=== [2] closeout artifact truth ==="
grep -q '^status: post_ops_seed_live_green_public_launch_promotion_pending$' "$DOC"
grep -q '^launch_approval_checkpoint: ffe62f39 / ckpt-mainnet0-launch-approval-green-20260524-071550$' "$DOC"
grep -q '^ops_treasury_seed_checkpoint: c79cde2b / ckpt-ops-treasury-seed-live-green-20260524-115943$' "$DOC"
grep -q "^ops_treasury_seed_tx: $TX$" "$DOC"
grep -q '^ops_treasury_seed_amount_void: 1000000$' "$DOC"
grep -q '^precision_ready: true$' "$DOC"
grep -q '^alienware_ready: true$' "$DOC"
grep -q 'Public active validator admission remains disabled.' "$DOC"
grep -q 'Public validator registration remains candidate/waiting only.' "$DOC"
grep -q 'vault126 / epoch128 / expectedValidatorCount=127' "$DOC"
grep -q 'This artifact does not itself promote the public launch state.' "$DOC"
grep -q 'No additional treasury spend is authorized by this artifact.' "$DOC"
echo "[ok] closeout artifact records post-seed truth and remaining guards"

echo
echo "=== [3] approval + live seed artifacts agree ==="
grep -q '^status: operator_approved_pending_live_execution$' "$APPROVAL"
grep -q '^approval_intent: OPERATOR_APPROVES_PUBLIC_MAINNET0_LAUNCH$' "$APPROVAL"
grep -q '^launch_approval_requested: true$' "$APPROVAL"
grep -q '^mutation_allowed_requested: true$' "$APPROVAL"
grep -q '^status: live_execution_green$' "$LIVE"
grep -q "^tx_hash: $TX$" "$LIVE"
grep -q '^live_tx_recorded: true$' "$LIVE"
grep -q '^balance_delta_verified: true$' "$LIVE"
echo "[ok] launch approval and live seed artifacts agree"

echo
echo "=== [4] chain receipt and balances ==="
cast receipt --rpc-url "$RPC" "$TX" | grep -q 'status               1 (success)'
VT_BAL="$(cast call --rpc-url "$RPC" "$TOKEN" 'balanceOf(address)(uint256)' "$VT" | awk '{print $1}')"
OT_BAL="$(cast call --rpc-url "$RPC" "$TOKEN" 'balanceOf(address)(uint256)' "$OT" | awk '{print $1}')"
test "$VT_BAL" = "332207333000000000000000000"
test "$OT_BAL" = "1000000000000000000000000"
echo "[ok] tx receipt success and balances match post-seed truth"

echo
echo "=== [5] node ready ==="
curl -fsS http://127.0.0.1:4100/__void/ready.json > /tmp/void-post-ops-seed-ready.json
python3 - /tmp/void-post-ops-seed-ready.json <<'PY'
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
  "post_ops_seed_launch_state": "green",
  "launch_approval": "recorded",
  "ops_treasury_seed": "live_green",
  "public_launch_promotion": "pending_separate_checkpoint",
  "public_active_validator_admission": "disabled",
  "next_operator_selector": "vault126_epoch128_count127",
  "additional_treasury_spend_authorized": False
})
PY

echo "[ok] Mainnet-0 post OpsTreasury seed launch-state proof passed"

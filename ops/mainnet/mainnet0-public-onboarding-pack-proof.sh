#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

LAUNCH="docs/public/mainnet0-launch-notes.md"
NODE="docs/public/run-a-node.md"
PARTICIPANT="docs/public/participant-onboarding.md"
CLOSEOUT="ops/mainnet/mainnet0-public-live-closeout.20260524-075712.md"
STATUS="ops/mainnet/mainnet0-status.current.md"

echo "=== Mainnet-0 public onboarding pack proof ==="

echo
echo "=== [1] required files ==="
for f in "$LAUNCH" "$NODE" "$PARTICIPANT" "$CLOSEOUT" "$STATUS"; do
  test -f "$f"
done
echo "[ok] required files exist"

echo
echo "=== [2] launch notes ==="
grep -q '^status: public_mainnet0_live$' "$LAUNCH"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$LAUNCH"
grep -q 'ckpt-mainnet0-public-live-closeout-green-20260524-075712' "$LAUNCH"
grep -q 'Public active validator admission remains disabled.' "$LAUNCH"
grep -q 'Vault126 onboarding has not been executed.' "$LAUNCH"
grep -q 'No additional treasury spend is authorized by launch status.' "$LAUNCH"
grep -q '0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2' "$LAUNCH"
echo "[ok] launch notes encode public-live truth and guardrails"

echo
echo "=== [3] run node docs ==="
grep -q 'git clone https://github.com/6ZoSo9/void-node.git' "$NODE"
grep -q 'npm install' "$NODE"
grep -q 'npm run build' "$NODE"
grep -q 'http://127.0.0.1:4100/participant' "$NODE"
grep -q 'WSL2' "$NODE"
grep -q 'Do not expose private keys.' "$NODE"
echo "[ok] node-running docs present"

echo
echo "=== [4] participant onboarding docs ==="
grep -q 'Public validator registration is candidate/waiting only for Mainnet-0.' "$PARTICIPANT"
grep -q 'Payment confirmation does not equal VOID sent.' "$PARTICIPANT"
grep -q 'Do not send blind direct deposits.' "$PARTICIPANT"
grep -q 'vault126 / epoch128 / expectedValidatorCount=127' "$PARTICIPANT"
grep -q 'Do not share private keys or seed phrases.' "$PARTICIPANT"
echo "[ok] participant onboarding docs preserve safety boundaries"

echo
echo "=== [5] closeout/status agreement ==="
grep -q '^status: public_mainnet0_live_cross_box_green$' "$CLOSEOUT"
grep -q '^status: public_mainnet0_live$' "$STATUS"
grep -q 'This public launch state does not authorize public active validator admission' "$STATUS"
echo "[ok] closeout and status agree"

echo
echo "=== [6] no obvious secret material in public docs ==="
if grep -RInE 'private_key|seed phrase:|mnemonic|BEGIN PRIVATE' docs/public; then
  echo "[ERR] possible secret-like material found in public docs"
  exit 1
fi
echo "[ok] no obvious secret material found"

echo
echo "=== [7] summary ==="
python3 - <<'PY'
print({
  "public_onboarding_pack": "green",
  "launch_notes": "present",
  "run_node_docs": "present",
  "participant_onboarding": "present",
  "launch_state": "public_mainnet0_live",
  "public_active_validator_admission": "disabled",
  "additional_treasury_spend_authorized": False
})
PY

echo "[ok] Mainnet-0 public onboarding pack proof passed"

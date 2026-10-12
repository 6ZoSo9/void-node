#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

DOC="docs/public/mainnet0-public-release-status-summary.md"
INDEX="docs/public/index.md"

echo "=== Mainnet-0 public release status summary proof ==="
echo "mutation=false"
echo

echo "=== [1] required files ==="
test -f "$DOC"
echo "[ok] summary doc exists"
echo

echo "=== [2] identity and current public-live status ==="
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q 'current_checkpoint: 569789bb / ckpt-current-status-public-trust-boundary-stack-pointer-green-20260603-123811' "$DOC"
grep -q 'public_trust_boundary_stack_checkpoint: ckpt-public-trust-boundary-stack-proof-green-20260603-123044' "$DOC"
grep -q 'current_status_stack_pointer_closeout: /tmp/current-status-public-trust-boundary-stack-pointer-crossbox-closeout-20260603-124052.log' "$DOC"
echo "[ok] current public-live status summary identity present"
echo

echo "=== [3] safe-now and guarded boundary copy ==="
grep -q '## What is safe now' "$DOC"
grep -q 'Run a VOID node' "$DOC"
grep -q 'Set up or unlock an Account Wallet' "$DOC"
grep -q 'Earn WC through approved useful work' "$DOC"
grep -q 'Use DataNet publish/read/verify flows' "$DOC"
grep -q 'Create a guided Buy VOID request from the participant page' "$DOC"
grep -q 'Preview staking and validator candidate/waiting status' "$DOC"
grep -q '## What is guarded' "$DOC"
grep -q 'Buy VOID payment confirmation is not VOID fulfillment' "$DOC"
grep -q 'VOID delivery requires operator verification and an explicit recorded VOID tx ref' "$DOC"
grep -q 'Wallet sends and WC-to-VOID swaps require explicit unlock/sign confirmation' "$DOC"
grep -q 'Active validator admission remains capped, proof-backed, and operator-governed' "$DOC"
grep -q 'Blind deposits, exchange sends, and custodial sends are not supported' "$DOC"
echo "[ok] safe-now and guarded copy present"
echo

echo "=== [4] proof stack and safety line ==="
grep -q '## Proof stack green' "$DOC"
grep -q 'current public status pointer' "$DOC"
grep -q 'public first-60 user journey trust-boundary requirement' "$DOC"
grep -q 'participant first-screen trust-boundary marker and copy' "$DOC"
grep -q 'public onboarding docs trust-boundary copy' "$DOC"
grep -q 'no Buy VOID fulfillment' "$DOC"
grep -q 'no validator mutation' "$DOC"
grep -q '^buy_void_fulfillment: false$' "$DOC"
grep -q '^validator_mutation: false$' "$DOC"
grep -q '^public_active_validator_admission: disabled$' "$DOC"
grep -q '^public_validator_registration: candidate_waiting_only$' "$DOC"
grep -q '^runtime_ready: true$' "$DOC"
grep -q '^runtime_gap: 0$' "$DOC"
grep -q '^txroot_live: 1$' "$DOC"
echo "[ok] proof stack and safety line present"
echo

echo "=== [5] public docs index link ==="
if [ -f "$INDEX" ]; then
  grep -q 'mainnet0-public-release-status-summary.md' "$INDEX"
  echo "[ok] docs index links summary"
else
  echo "[skip] docs/public/index.md not present"
fi
echo

echo "=== [6] current proof stack ==="
make mainnet0-current-public-status-proof
make public-trust-boundary-stack-proof
make mainnet0-status-smoke
echo

echo "=== [7] no obvious secret material in summary ==="
if grep -RInE '(PRIVATE KEY|BEGIN .*PRIVATE|keystore|mnemonic|secret=|password=|api[_-]?key=)' "$DOC"; then
  echo "[ERR] possible secret-like material found in summary"
  exit 1
fi
echo "[ok] no obvious secret-like material found"
echo

echo "=== [8] summary ==="
python3 - <<'PY'
summary = {
  "public_release_status_summary": "green",
  "status": "public_mainnet0_live",
  "decision": "GO_PUBLIC_MAINNET0",
  "safe_now_copy": True,
  "guarded_copy": True,
  "no_blind_deposits_copy": True,
  "public_trust_boundary_stack": "green",
  "buy_void_fulfillment": False,
  "validator_mutation": False,
}
print(summary)
PY

echo "[ok] Mainnet-0 public release status summary proof passed"

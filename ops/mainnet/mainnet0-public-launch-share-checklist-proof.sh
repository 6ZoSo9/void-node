#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

DOC="docs/public/mainnet0-public-launch-share-checklist.md"
SUMMARY="docs/public/mainnet0-public-release-status-summary.md"
ROOT="README.md"
PUB="docs/public/README.md"

echo "=== Mainnet-0 public launch/share checklist proof ==="
echo "mutation=false"
echo

echo "=== [1] required files ==="
test -f "$DOC"
test -f "$SUMMARY"
test -f "$ROOT"
test -f "$PUB"
echo "[ok] required files exist"
echo

echo "=== [2] identity and canonical path ==="
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q 'base_checkpoint: d9c29433 / ckpt-current-status-public-release-summary-discoverability-pointer-green-20260603-132008' "$DOC"
grep -q 'summary_doc: docs/public/mainnet0-public-release-status-summary.md' "$DOC"
grep -q 'participant_entry: /participant' "$DOC"
grep -q 'README.md -> docs/public/README.md -> docs/public/mainnet0-public-release-status-summary.md -> /participant' "$DOC"
echo "[ok] identity and canonical path present"
echo

echo "=== [3] safe things to say ==="
grep -q 'VOID Network Mainnet-0 is public-live' "$DOC"
grep -q 'Users can run a node' "$DOC"
grep -q 'Users can open the participant page' "$DOC"
grep -q 'Users can create or unlock an Account Wallet' "$DOC"
grep -q 'Users can earn WC through approved useful work' "$DOC"
grep -q 'Users can use DataNet publish/read/verify flows' "$DOC"
grep -q 'Users can create a guided Buy VOID request from the participant page' "$DOC"
grep -q 'Users can preview staking and validator candidate/waiting status' "$DOC"
grep -q 'The public trust-boundary stack is green' "$DOC"
echo "[ok] safe public claims present"
echo

echo "=== [4] required warnings ==="
grep -q 'Buy VOID payment confirmation is not VOID fulfillment' "$DOC"
grep -q 'VOID delivery requires operator verification and an explicit recorded VOID tx ref' "$DOC"
grep -q 'Use the participant page before sending anything' "$DOC"
grep -q 'Use a self-custody wallet' "$DOC"
grep -q 'Blind deposits, exchange sends, and custodial sends are not supported' "$DOC"
grep -q 'Wallet sends and WC-to-VOID swaps require explicit unlock/sign confirmation' "$DOC"
grep -q 'Public validator registration is candidate/waiting only' "$DOC"
grep -q 'Active validator admission remains capped, proof-backed, and operator-governed' "$DOC"
echo "[ok] required warnings present"
echo

echo "=== [5] do-not-say guardrails ==="
grep -q 'Do not say exchange or custodial sends are supported' "$DOC"
grep -q 'Do not say payment confirmation automatically sends VOID' "$DOC"
grep -q 'Do not say public validator registration makes someone an active validator' "$DOC"
grep -q 'Do not ask users to send blind deposits' "$DOC"
grep -q 'Do not paste private keys, secrets, seed phrases, or operator-only data' "$DOC"
echo "[ok] do-not-say guardrails present"
echo

echo "=== [6] proof-backed safety line ==="
grep -q '^public_release_summary_discoverability: green$' "$DOC"
grep -q '^public_trust_boundary_stack: green$' "$DOC"
grep -q '^root_readme_link: true$' "$DOC"
grep -q '^public_docs_readme_link: true$' "$DOC"
grep -q '^buy_void_fulfillment: false$' "$DOC"
grep -q '^validator_mutation: false$' "$DOC"
grep -q '^public_active_validator_admission: disabled$' "$DOC"
grep -q '^public_validator_registration: candidate_waiting_only$' "$DOC"
grep -q '^runtime_ready: true$' "$DOC"
grep -q '^runtime_gap: 0$' "$DOC"
grep -q '^txroot_live: 1$' "$DOC"
echo "[ok] proof-backed safety line present"
echo

echo "=== [7] discoverability links ==="
grep -q 'docs/public/mainnet0-public-launch-share-checklist.md' "$ROOT"
grep -q 'mainnet0-public-launch-share-checklist.md' "$PUB"
grep -q 'guided actions only' "$ROOT"
grep -q 'required warnings' "$PUB"
echo "[ok] checklist discoverable from root and public README"
echo

echo "=== [8] dependent proof stack ==="
make mainnet0-current-public-status-proof
make mainnet0-public-release-summary-discoverability-proof
make mainnet0-public-release-status-summary-proof
make public-trust-boundary-stack-proof
make mainnet0-public-onboarding-pack-proof
make mainnet0-status-smoke
echo

echo "=== [9] no obvious secret material in touched docs ==="
if grep -RInE '(PRIVATE KEY|BEGIN .*PRIVATE|keystore|mnemonic|secret=|password=|api[_-]?key=)' "$DOC" "$SUMMARY" "$ROOT" "$PUB"; then
  echo "[ERR] possible secret-like material found"
  exit 1
fi
echo "[ok] no obvious secret-like material found"
echo

echo "=== [10] summary ==="
python3 - <<'PY'
summary = {
  "public_launch_share_checklist": "green",
  "safe_path": "README -> summary -> participant -> guided actions only",
  "required_warnings": True,
  "do_not_say_guardrails": True,
  "public_trust_boundary_stack": "green",
  "buy_void_fulfillment": False,
  "validator_mutation": False,
}
print(summary)
PY

echo "[ok] Mainnet-0 public launch/share checklist proof passed"

#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

DOC="docs/public/mainnet0-public-share-posts.md"
CHECKLIST="docs/public/mainnet0-public-launch-share-checklist.md"
SUMMARY="docs/public/mainnet0-public-release-status-summary.md"
ROOT="README.md"
PUB="docs/public/README.md"

echo "=== Mainnet-0 public share posts proof ==="
echo "mutation=false"
echo

echo "=== [1] required files ==="
test -f "$DOC"
test -f "$CHECKLIST"
test -f "$SUMMARY"
test -f "$ROOT"
test -f "$PUB"
echo "[ok] required files exist"
echo

echo "=== [2] identity and safe path ==="
grep -q '^status: public_mainnet0_live$' "$DOC"
grep -q '^decision: GO_PUBLIC_MAINNET0$' "$DOC"
grep -q 'base_checkpoint: da55e010 / ckpt-current-status-public-launch-share-checklist-pointer-green-20260603-135414' "$DOC"
grep -q 'checklist_doc: docs/public/mainnet0-public-launch-share-checklist.md' "$DOC"
grep -q 'summary_doc: docs/public/mainnet0-public-release-status-summary.md' "$DOC"
grep -q 'README -> public release status summary -> participant page -> guided actions only' "$DOC"
echo "[ok] identity and safe path present"
echo

echo "=== [3] templates exist ==="
grep -q '## Reddit post template' "$DOC"
grep -q '## X/Twitter short post' "$DOC"
grep -q '## X/Twitter thread template' "$DOC"
grep -q '## Discord / community reply template' "$DOC"
grep -q '## GitHub announcement template' "$DOC"
echo "[ok] public share templates present"
echo

echo "=== [4] required warnings preserved ==="
grep -q 'No blind deposits' "$DOC"
grep -q 'Payment confirmation is not VOID fulfillment' "$DOC"
grep -q 'Buy VOID payment confirmation is not VOID fulfillment' "$DOC"
grep -q 'VOID delivery requires operator verification and an explicit recorded VOID tx ref' "$DOC"
grep -q 'Public validator registration is candidate/waiting only' "$DOC"
grep -q 'Active validator admission remains capped, proof-backed, and operator-governed' "$DOC"
grep -q 'unsupported exchange/custodial sending paths are allowed' "$DOC"
grep -q 'Do not send blind deposits' "$DOC"
echo "[ok] required warnings present"
echo

echo "=== [5] unsafe promotional claims absent ==="
if grep -RInE '(guaranteed return|guaranteed profit|risk-free|moon|100x|financial advice|automatic VOID delivery|payment confirmation automatically sends VOID)' "$DOC"; then
  echo "[ERR] unsafe promotional claim found"
  exit 1
fi
echo "[ok] unsafe promotional claims absent"
echo

echo "=== [6] proof-backed safety line ==="
grep -q '^public_launch_share_checklist: green$' "$DOC"
grep -q '^public_release_summary_discoverability: green$' "$DOC"
grep -q '^public_trust_boundary_stack: green$' "$DOC"
grep -q '^safe_path: README_to_summary_to_participant_to_guided_actions_only$' "$DOC"
grep -q '^required_warnings: true$' "$DOC"
grep -q '^do_not_say_guardrails: true$' "$DOC"
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
grep -q 'docs/public/mainnet0-public-share-posts.md' "$ROOT"
grep -q 'mainnet0-public-share-posts.md' "$PUB"
grep -q 'mainnet0-public-share-posts.md' "$CHECKLIST"
echo "[ok] public share posts discoverable"
echo

echo "=== [8] dependent proof stack ==="
make mainnet0-public-launch-share-checklist-proof
make mainnet0-current-public-status-proof
make mainnet0-public-release-summary-discoverability-proof
make public-trust-boundary-stack-proof
make mainnet0-status-smoke
echo

echo "=== [9] no obvious secret material in touched docs ==="
if grep -RInE '(PRIVATE KEY|BEGIN .*PRIVATE|keystore|mnemonic|secret=|password=|api[_-]?key=)' "$DOC" "$CHECKLIST" "$SUMMARY" "$ROOT" "$PUB"; then
  echo "[ERR] possible secret-like material found"
  exit 1
fi
echo "[ok] no obvious secret-like material found"
echo

echo "=== [10] summary ==="
python3 - <<'PY'
summary = {
  "public_share_posts": "green",
  "templates": ["reddit", "x_short", "x_thread", "discord", "github"],
  "safe_path": "README -> summary -> participant -> guided actions only",
  "required_warnings": True,
  "unsafe_promotional_claims": False,
  "buy_void_fulfillment": False,
  "validator_mutation": False,
}
print(summary)
PY

echo "[ok] Mainnet-0 public share posts proof passed"

#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

STATUS="docs/public/mainnet0-current-public-status.md"
SHARE="docs/public/mainnet0-public-share-posts.md"
CHECKLIST="docs/public/mainnet0-public-launch-share-checklist.md"
SUMMARY="docs/public/mainnet0-public-release-status-summary.md"
ROOT="README.md"
PUB="docs/public/README.md"

echo "=== Mainnet-0 public communications stack proof ==="
echo "mutation=false"
echo

echo "=== [1] required public communication docs ==="
test -f "$STATUS"
test -f "$SHARE"
test -f "$CHECKLIST"
test -f "$SUMMARY"
test -f "$ROOT"
test -f "$PUB"
echo "[ok] required docs exist"
echo

echo "=== [2] current git/runtime truth ==="
git branch --show-current
git rev-parse --short HEAD
git describe --tags --always --dirty
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > /tmp/public-communications-stack-ready.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/public-communications-stack-ready.json"))
assert j.get("ready") is True, j
assert int(j.get("gap", -1)) == 0, j
assert int(j.get("txroot_live", 0)) == 1, j
print("[ok] ready/gap/txroot")
PY
echo

echo "=== [3] canonical public status map ==="
make mainnet0-current-public-status-proof
echo

echo "=== [4] public share/checklist/summary proof stack ==="
make mainnet0-public-share-posts-proof
make mainnet0-public-launch-share-checklist-proof
make mainnet0-public-release-summary-discoverability-proof
make mainnet0-public-release-status-summary-proof
echo

echo "=== [5] trust-boundary and onboarding proof stack ==="
make public-trust-boundary-stack-proof
make mainnet0-public-onboarding-pack-proof
echo

echo "=== [6] status smoke ==="
make mainnet0-status-smoke
echo

echo "=== [7] public communications safety invariants ==="
grep -q 'public_share_posts_pack_checkpoint: 7f622630 / ckpt-public-share-posts-pack-green-20260603-143632' "$STATUS"
grep -q 'public_share_posts_pack_crossbox: green' "$STATUS"
grep -q 'templates: reddit,x_short,x_thread,discord,github' "$STATUS"
grep -q 'unsafe_promotional_claims: false' "$STATUS"
grep -q 'safe_path: README_to_summary_to_participant_to_guided_actions_only' "$STATUS"
grep -q 'buy_void_fulfillment: false' "$STATUS"
grep -q 'validator_mutation: false' "$STATUS"

grep -q '## Reddit post template' "$SHARE"
grep -q '## X/Twitter short post' "$SHARE"
grep -q '## X/Twitter thread template' "$SHARE"
grep -q '## Discord / community reply template' "$SHARE"
grep -q '## GitHub announcement template' "$SHARE"

grep -q 'No blind deposits' "$SHARE"
grep -q 'Payment confirmation is not VOID fulfillment' "$SHARE"
grep -q 'Public validator registration is candidate/waiting only' "$SHARE"
grep -q 'Guided actions only' "$SHARE"

grep -q 'mainnet0-public-share-posts.md' "$ROOT"
grep -q 'mainnet0-public-share-posts.md' "$PUB"
grep -q 'mainnet0-public-share-posts.md' "$CHECKLIST"
echo "[ok] public communications invariants present"
echo

echo "=== [8] unsafe promotional claims absent ==="
if grep -RInE '(guaranteed return|guaranteed profit|risk-free|moon|100x|financial advice|automatic VOID delivery|payment confirmation automatically sends VOID)' "$SHARE" "$CHECKLIST" "$SUMMARY" "$ROOT" "$PUB"; then
  echo "[ERR] unsafe promotional claim found"
  exit 1
fi
echo "[ok] unsafe promotional claims absent"
echo

echo "=== [9] no obvious secret material in public communication docs ==="
if grep -RInE '(PRIVATE KEY|BEGIN .*PRIVATE|keystore|mnemonic|secret=|password=|api[_-]?key=)' "$SHARE" "$CHECKLIST" "$SUMMARY" "$ROOT" "$PUB"; then
  echo "[ERR] possible secret-like material found"
  exit 1
fi
echo "[ok] no obvious secret-like material found"
echo

echo "=== [10] summary ==="
python3 - <<'PY'
summary = {
  "public_communications_stack": "green",
  "current_public_status": "green",
  "share_templates": ["reddit", "x_short", "x_thread", "discord", "github"],
  "safe_path": "README -> summary -> participant -> guided actions only",
  "required_warnings": True,
  "unsafe_promotional_claims": False,
  "public_trust_boundary_stack": "green",
  "buy_void_fulfillment": False,
  "validator_mutation": False,
}
print(summary)
PY

echo "[ok] Mainnet-0 public communications stack proof passed"

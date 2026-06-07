#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

DOC="ops/mainnet0/datanet-store-serve-live-service-crossbox-closeout.md"
SRC="src/index.ts"
PROOF="ops/mainnet0/participant-datanet-store-serve-demo-proof.sh"

expect_grep() {
  local name="$1"
  local pattern="$2"
  local file="$3"
  if ! grep -q "$pattern" "$file"; then
    echo "[fatal] missing $name in $file"
    echo "pattern=$pattern"
    exit 1
  fi
  echo "[ok] $name"
}

echo "=== DataNet Store & Serve live-service cross-box closeout proof ==="

test -f "$DOC"
test -f "$SRC"
test -x "$PROOF"

echo
echo "=== [1] closeout artifact markers ==="
expect_grep "artifact marker" "VOID_DATANET_STORE_SERVE_LIVE_SERVICE_CROSSBOX_CLOSEOUT_V1" "$DOC"
expect_grep "cross-box green result" "result: cross_box_green" "$DOC"
expect_grep "source commit" "source_commit: 58de7d51" "$DOC"
expect_grep "source tag" "ckpt-datanet-store-serve-demo-green-20260607-195742" "$DOC"

echo
echo "=== [2] feature/source markers ==="
expect_grep "participant source marker" "VOID_DATANET_STORE_SERVE_DEMO_V1" "$SRC"
expect_grep "store serve copy" "Store &amp; Serve demo" "$SRC"
expect_grep "publish route source" "/datanet/v1/publish" "$SRC"
expect_grep "fetch route source" "/datanet/v1/fetch" "$SRC"
expect_grep "proof green marker" "VOID_DATANET_STORE_SERVE_DEMO_V1_GREEN" "$PROOF"

echo
echo "=== [3] precision proof recorded ==="
expect_grep "precision green marker" "VOID_DATANET_STORE_SERVE_DEMO_V1_GREEN" "$DOC"
expect_grep "precision dataset" "77216c13649923c5d6ff3e40f04721a3" "$DOC"

echo
echo "=== [4] Alienware live-service truth recorded ==="
expect_grep "live service name" "void-node-live.service" "$DOC"
expect_grep "legacy duplicate service warning" "void-node.service" "$DOC"
expect_grep "safe runtime drop-in" "96-public-safe-runtime-live.conf" "$DOC"
expect_grep "safe terminal flag" "VOID_DISABLE_TERMINAL_SAVEBLOCK_V2=1" "$DOC"
expect_grep "safe background flag" "VOID_DISABLE_BACKGROUND_LOOPS=1" "$DOC"
expect_grep "ready truth" "ready=true, gap=0, txroot_live=1" "$DOC"

echo
echo "=== [5] Alienware live-service cross-box proof recorded ==="
expect_grep "alienware green marker" "VOID_DATANET_STORE_SERVE_DEMO_V1_LIVE_SERVICE_CROSSBOX_GREEN" "$DOC"
expect_grep "alienware dataset" "7e899e4ecdd34a9bf75b4ff7c592c678" "$DOC"
expect_grep "alienware proof out" "/tmp/datanet-store-serve-live-service-crossbox-20260607-154505" "$DOC"
expect_grep "fetch ok recorded" "fetch/readback result returned ok=true" "$DOC"

echo
echo "=== [6] safety markers ==="
expect_grep "no money movement" "money_movement: false" "$DOC"
expect_grep "no validator mutation" "validator_mutation: false" "$DOC"
expect_grep "no buy void fulfillment" "buy_void_fulfillment: false" "$DOC"

echo
echo "VOID_DATANET_STORE_SERVE_LIVE_SERVICE_CROSSBOX_CLOSEOUT_GREEN"

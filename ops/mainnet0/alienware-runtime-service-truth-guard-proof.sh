#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

DOC="ops/mainnet0/alienware-runtime-service-truth-guard.md"
STORE_PROOF="ops/mainnet0/participant-datanet-store-serve-demo-proof.sh"
CLOSEOUT_DOC="ops/mainnet0/datanet-store-serve-live-service-crossbox-closeout.md"

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

echo "=== Alienware runtime service truth guard proof ==="

test -f "$DOC"
test -x "$STORE_PROOF"
test -f "$CLOSEOUT_DOC"

echo
echo "=== [1] guard doc markers ==="
expect_grep "guard artifact" "VOID_ALIENWARE_RUNTIME_SERVICE_TRUTH_GUARD_V1" "$DOC"
expect_grep "live service truth" "void-node-live.service" "$DOC"
expect_grep "legacy duplicate warning" "void-node.service" "$DOC"
expect_grep "runtime cgroup truth" "app.slice/void-node-live.service" "$DOC"
expect_grep "safe runtime drop-in" "96-public-safe-runtime-live.conf" "$DOC"

echo
echo "=== [2] Store & Serve proof now guards service selection ==="
expect_grep "runtime guard marker" "VOID_RUNTIME_SERVICE_GUARD_V1" "$STORE_PROOF"
expect_grep "runtime service env" "VOID_RUNTIME_SERVICE" "$STORE_PROOF"
expect_grep "live service selection" "void-node-live.service" "$STORE_PROOF"
expect_grep "legacy fallback only" "void-node.service" "$STORE_PROOF"
expect_grep "skip restart supported" "VOID_PROOF_SKIP_RESTART" "$STORE_PROOF"
expect_grep "restart selected runtime" 'systemctl --user restart "$RUNTIME_SERVICE"' "$STORE_PROOF"

echo
echo "=== [3] closeout still records DataNet green lane ==="
expect_grep "datanet closeout green" "VOID_DATANET_STORE_SERVE_LIVE_SERVICE_CROSSBOX_CLOSEOUT_GREEN" "$CLOSEOUT_DOC"
expect_grep "alienware dataset" "7e899e4ecdd34a9bf75b4ff7c592c678" "$CLOSEOUT_DOC"
expect_grep "closeout service truth" "void-node-live.service" "$CLOSEOUT_DOC"

echo
echo "=== [4] optional live Alienware service check ==="
if [ "${LIVE_SERVICE_CHECK:-0}" = "1" ]; then
  systemctl --user is-active --quiet void-node-live.service
  echo "[ok] void-node-live.service active"

  if systemctl --user is-active --quiet void-node.service; then
    echo "[fatal] duplicate void-node.service is active"
    exit 1
  fi
  echo "[ok] duplicate void-node.service inactive"

  curl -fsS --max-time 15 http://127.0.0.1:4100/__void/ready.json | grep -q '"ready":true'
  echo "[ok] live ready endpoint responds"
else
  echo "[ok] LIVE_SERVICE_CHECK not requested"
fi

echo
echo "VOID_ALIENWARE_RUNTIME_SERVICE_TRUTH_GUARD_GREEN"

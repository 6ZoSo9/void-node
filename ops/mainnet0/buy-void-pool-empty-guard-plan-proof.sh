#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand 2>/dev/null || true

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DOC="docs/public/buy-void-pool-empty-guard-plan.md"

echo "=== Buy VOID pool-empty guard plan proof ==="

echo
echo "=== [1] plan doc exists ==="
test -s "$DOC"
echo "[ok] $DOC exists"

echo
echo "=== [2] required plan terms ==="
grep -q "fail closed" "$DOC"
grep -q "sellable inventory" "$DOC"
grep -q "zero inventory" "$DOC"
grep -q "Missing inventory fails closed" "$DOC"
grep -q "Invalid inventory fails closed" "$DOC"
grep -q "Oversized requested amount fails closed" "$DOC"
grep -q "Existing requests and history remain visible" "$DOC"
grep -q "No Buy VOID auto-send behavior is introduced" "$DOC"
grep -q "VOID_BUY_POOL_EMPTY_GUARD_V1" "$DOC"
grep -q "VOID_BUY_POOL_SOLD_OUT_UI_V1" "$DOC"
grep -q "VOID_BUY_POOL_INVENTORY_FAIL_CLOSED_V1" "$DOC"
echo "[ok] required terms present"

echo
echo "=== [3] no live implementation changed ==="
CHANGED="$(git diff --name-only HEAD --)"
echo "$CHANGED"
BAD="$(echo "$CHANGED" | grep -Ev '^(docs/public/buy-void-pool-empty-guard-plan\.md|ops/mainnet0/buy-void-pool-empty-guard-plan-proof\.sh|Makefile)$' || true)"
if [ -n "$BAD" ]; then
  echo "[fail] unexpected changed files:"
  echo "$BAD"
  exit 1
fi
echo "[ok] only plan/proof files changed"

echo
echo "=== [4] node ready ==="
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json > /tmp/buy-void-pool-empty-ready.json
cat /tmp/buy-void-pool-empty-ready.json
python3 - <<'PY'
import json
j=json.load(open("/tmp/buy-void-pool-empty-ready.json"))
assert j.get("ready") is True
assert int(j.get("gap", 999999)) == 0
assert int(j.get("txroot_live", 0)) == 1
print("[ok] ready/gap/txroot")
PY

echo
echo "[ok] Buy VOID pool-empty guard plan proof passed"

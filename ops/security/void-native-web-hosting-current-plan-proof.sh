#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DOC="docs/public/void-native-web-hosting-current-plan.md"
MAKEFILE="Makefile"

echo "=== VOID native web-hosting current plan proof ==="

test -f "$DOC"

grep -q "VOID_NATIVE_WEB_HOSTING_CURRENT_PLAN_V1" "$DOC"
grep -q "VOID_WEB_HOSTING_NO_STALE_BRANCH_RESURRECTION_V1" "$DOC"
grep -q "VOID_WEB_HOSTING_DATANET_FIRST_POLICY_V1" "$DOC"
grep -q "VOID_WEB_HOSTING_NO_RUNTIME_MUTATION_THIS_CHECKPOINT_V1" "$DOC"

grep -q "Do not resurrect stale branches" "$DOC"
grep -q "Do not delete current public launch, Buy VOID, participant, wallet, DataNet, or security proof files" "$DOC"
grep -q "Do not patch \`src/index.ts\` with a large blind replacement" "$DOC"
grep -q "Buy VOID fulfillment fail-closed" "$DOC"
grep -q "money movement last and explicit" "$DOC"

test -f "$MAKEFILE"
grep -q "void-native-web-hosting-current-plan-proof" "$MAKEFILE"

echo "=== route smoke if local node is available ==="
BASE_URL="${BASE_URL:-http://127.0.0.1:4100}"

if curl -fsS --max-time 5 "$BASE_URL/__void/ready.json" >/tmp/void-web-hosting-current-plan-ready.json 2>/dev/null; then
  python3 - <<'PY'
import json
from pathlib import Path
p = Path("/tmp/void-web-hosting-current-plan-ready.json")
data = json.loads(p.read_text())
assert data.get("ready") is True, data
assert int(data.get("gap", -1)) == 0, data
assert int(data.get("txroot_live", 0)) == 1, data
print("ready_json_ok=true")
PY

  for route in /version /participant-file /participant /site/voidchain /site/nullfeed; do
    echo "checking route=$route"
    curl -fsS --max-time 8 "$BASE_URL$route" >/tmp/void-web-hosting-current-plan-route.out
    test -s /tmp/void-web-hosting-current-plan-route.out
  done
else
  echo "warning: local node unavailable; skipped route smoke"
fi

echo "void_native_web_hosting_current_plan_proof=green"

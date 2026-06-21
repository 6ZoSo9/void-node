#!/usr/bin/env bash
set -euo pipefail

doc="docs/public/public-surface-safety-index-readiness-rollup-route-accounting-repair-v1.md"
src="src/index.ts"
safety="ops/mainnet0/public-surface-safety-index-v1-proof.sh"

echo "VOID_PUBLIC_SURFACE_SAFETY_INDEX_READINESS_ROLLUP_ROUTE_ACCOUNTING_REPAIR_V1_PROOF_BEGIN"

test -f "$doc"

grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_READINESS_ROLLUP_ROUTE_ACCOUNTING_REPAIR_V1" "$doc" >/dev/null
grep -F "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json" "$doc" >/dev/null
grep -F "remove the earlier non-live duplicate route registration" "$doc" >/dev/null
grep -F "keep the runtime-mounted read-only route" "$doc" >/dev/null
grep -F "duplicate public route count at zero" "$doc" >/dev/null
grep -F "does not add public mutation" "$doc" >/dev/null

grep -F "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1" "$src" >/dev/null
grep -F 'runtimeApp.get("/public-node/usdc-void-buy-pool/readiness-rollup-v1.json"' "$src" >/dev/null
grep -F 'runtime_mount_repair_marker: "VOID_USDC_VOID_BUY_POOL_PUBLIC_READINESS_ROLLUP_RUNTIME_MOUNT_REPAIR_V1"' "$src" >/dev/null

python3 - <<'PY'
from pathlib import Path
import re

s = Path("src/index.ts").read_text()
route = "/public-node/usdc-void-buy-pool/readiness-rollup-v1.json"

registrations = re.findall(
    r'([A-Za-z0-9_$.\]\[\(\)"\'?]+)\.get\(\s*["\']'
    + re.escape(route)
    + r'["\']',
    s,
)

if registrations != ["runtimeApp"]:
    raise SystemExit(f"readiness_rollup_route_registration_not_single_runtimeApp={registrations}")

if 'app.get("/public-node/usdc-void-buy-pool/readiness-rollup-v1.json"' in s:
    raise SystemExit("non_live_app_get_readiness_rollup_route_still_present")

print("readiness_rollup_single_runtime_registration_green=true")
PY

bash ops/mainnet0/public-surface-route-registry-safety-audit-v1.sh >/tmp/void-public-safety-index-readiness-rollup-accounting-route-audit.out

grep -F "VOID_PUBLIC_SURFACE_ROUTE_REGISTRY_SAFETY_AUDIT_V1_GREEN" /tmp/void-public-safety-index-readiness-rollup-accounting-route-audit.out >/dev/null
grep -F "public_literal_get_duplicate_count=0" /tmp/void-public-safety-index-readiness-rollup-accounting-route-audit.out >/dev/null

expected_count="$(grep -Eo 'public_literal_get_count=[0-9]+' "$safety" | head -1 | cut -d= -f2)"
expected_unique="$(grep -Eo 'public_literal_get_unique_count=[0-9]+' "$safety" | head -1 | cut -d= -f2)"

grep -F "public_literal_get_count=$expected_count" /tmp/void-public-safety-index-readiness-rollup-accounting-route-audit.out >/dev/null
grep -F "public_literal_get_unique_count=$expected_unique" /tmp/void-public-safety-index-readiness-rollup-accounting-route-audit.out >/dev/null

bash ops/mainnet0/public-surface-safety-index-v1-proof.sh >/tmp/void-public-safety-index-readiness-rollup-accounting-safety.out
grep -F "VOID_PUBLIC_SURFACE_SAFETY_INDEX_V1_GREEN" /tmp/void-public-safety-index-readiness-rollup-accounting-safety.out >/dev/null

if grep -F 'post("/public-node/usdc-void-buy-pool/readiness-rollup-v1.json' "$src" >/dev/null; then
  echo "readiness_rollup_public_post_route_present=true"
  exit 1
fi

if grep -R "VOID_USDC_VOID_BUY_POOL_OPERATOR_MANUAL_EXECUTION_PACKET_HOLD_V1" src docs/public fixtures/public 2>/dev/null; then
  echo "private_hold_marker_leaked_to_public_surface=true"
  exit 1
fi

echo "VOID_PUBLIC_SURFACE_SAFETY_INDEX_READINESS_ROLLUP_ROUTE_ACCOUNTING_REPAIR_V1_ASSERT_GREEN"
echo "VOID_PUBLIC_SURFACE_SAFETY_INDEX_READINESS_ROLLUP_ROUTE_ACCOUNTING_REPAIR_V1_GREEN"

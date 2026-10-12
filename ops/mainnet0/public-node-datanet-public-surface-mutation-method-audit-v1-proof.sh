#!/usr/bin/env bash
set -euo pipefail

NODE_URL="${VOID_NODE_URL:-${BASE:-http://127.0.0.1:4100}}"
ENDPOINT="${NODE_URL}/public-node/datanet/public-surface-mutation-method-audit-v1.json"
OUT="${TMPDIR:-/tmp}/public-node-datanet-public-surface-mutation-method-audit-v1-proof-$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Public Surface Mutation Method Audit v1 Proof ==="
echo "marker=VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$NODE_URL"
echo "out=$OUT"

npm run build

MANIFEST="$(curl -fsS "$ENDPOINT")"
printf '%s' "$MANIFEST" > "$OUT/public-surface-mutation-method-audit.json"

printf '%s' "$MANIFEST" | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const res = JSON.parse(input);
  const checks = [
    ["marker", res.marker === "VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_V1"],
    ["ok", res.ok === true],
    ["public_surface_only", res.audit_scope?.public_surface_only === true],
    ["operator_local_mutation_scan", res.audit_scope?.operator_local_mutation_scan === false],
    ["public_route_runtime_scan_required", res.audit_scope?.public_route_runtime_scan_required === true],
    ["routes_to_audit", Array.isArray(res.routes_to_audit) && res.routes_to_audit.length >= 12],
    ["mutation_methods_expected_rejected", Array.isArray(res.mutation_methods_expected_rejected) && res.mutation_methods_expected_rejected.includes("POST") && res.mutation_methods_expected_rejected.includes("PUT") && res.mutation_methods_expected_rejected.includes("PATCH") && res.mutation_methods_expected_rejected.includes("DELETE")],
    ["get_routes_available", res.audit_assertions?.get_routes_available === true],
    ["post_rejected", res.audit_assertions?.post_rejected === true],
    ["put_rejected", res.audit_assertions?.put_rejected === true],
    ["patch_rejected", res.audit_assertions?.patch_rejected === true],
    ["delete_rejected", res.audit_assertions?.delete_rejected === true],
    ["public_routes_mutate_state", res.audit_assertions?.public_routes_mutate_state === false],
    ["public_routes_write_ledger", res.audit_assertions?.public_routes_write_ledger === false],
    ["public_routes_award_wc", res.audit_assertions?.public_routes_award_wc === false],
    ["public_routes_execute_shell", res.audit_assertions?.public_routes_execute_shell === false],
    ["public_read_only", res.public_safety?.public_read_only === true],
    ["mutation", res.public_safety?.mutation === false],
    ["ledger_write", res.public_safety?.ledger_write === false],
    ["wc_credit_award", res.public_safety?.wc_credit_award === false],
    ["shell_execution", res.public_safety?.shell_execution === false],
  ];

  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    console.error("Mutation method audit manifest assertion failed:", failed.join(", "));
    process.exit(1);
  }
});
'

ROUTES=(
  "/public-node/datanet/challenge/demo003-folder-fixture-v1"
  "/public-node/datanet/challenge-tester-copy-pack-v1.json"
  "/public-node/datanet/challenge-offline-verify-pack-v1.json"
  "/public-node/datanet/challenge-imported-tester-receipt-fixture-v1.json"
  "/public-node/datanet/challenge-operator-review-record-fixture-v1.json"
  "/public-node/datanet/challenge-wc-candidate-fixture-v1.json"
  "/public-node/datanet/challenge-positive-wc-delta-selection-fixture-v1.json"
  "/public-node/datanet/challenge-award-intent-packet-fixture-v1.json"
  "/public-node/datanet/data-plane-settlement-plane-boundary-v1.json"
  "/public-node/datanet/local-storage-path-isolation-boundary-v1.json"
  "/public-node/datanet/public-surface-path-leak-audit-v1.json"
  "/public-node/datanet/public-surface-mutation-method-audit-v1.json"
)

MUTATION_METHODS=(POST PUT PATCH DELETE)

routes_scanned=0
mutation_checks=0

for route in "${ROUTES[@]}"; do
  get_code="$(curl -o /dev/null -s -w "%{http_code}" "$NODE_URL$route")"
  if [ "$get_code" -lt 200 ] || [ "$get_code" -ge 300 ]; then
    echo "Audit failed: GET returned HTTP $get_code: $route"
    exit 1
  fi

  for method in "${MUTATION_METHODS[@]}"; do
    code="$(curl -o /dev/null -s -w "%{http_code}" -X "$method" "$NODE_URL$route")"
    if [ "$code" -lt 400 ]; then
      echo "Audit failed: $method was not rejected for $route; HTTP $code"
      exit 1
    fi
    mutation_checks=$((mutation_checks + 1))
  done

  routes_scanned=$((routes_scanned + 1))
done

curl -fsS "$NODE_URL/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq "/public-node/datanet/public-surface-mutation-method-audit-v1.json" "$OUT/route-index.json"

grep -Fq "VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_DOC_V1" docs/public/public-node-datanet-public-surface-mutation-method-audit-v1.md

if grep -Fq "VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_UI_V1" src/index.ts; then
  echo "datanet_public_surface_mutation_method_audit_ui_marker_present=true"
else
  echo "datanet_public_surface_mutation_method_audit_ui_marker_present=false"
  exit 1
fi

echo "datanet_public_surface_mutation_method_audit_route_green=true"
echo "datanet_public_surface_mutation_method_audit_routes_scanned=$routes_scanned"
echo "datanet_public_surface_mutation_method_audit_mutation_method_checks=$mutation_checks"
echo "datanet_public_surface_mutation_method_audit_post_rejected=true"
echo "datanet_public_surface_mutation_method_audit_put_rejected=true"
echo "datanet_public_surface_mutation_method_audit_patch_rejected=true"
echo "datanet_public_surface_mutation_method_audit_delete_rejected=true"
echo "datanet_public_surface_mutation_method_audit_mutation=false"
echo "datanet_public_surface_mutation_method_audit_ledger_write=false"
echo "datanet_public_surface_mutation_method_audit_wc_credit_award=false"
echo "datanet_public_surface_mutation_method_audit_shell_execution=false"
echo "VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_PROOF_V1_GREEN"

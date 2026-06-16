#!/usr/bin/env bash
set -euo pipefail

NODE_URL="${VOID_NODE_URL:-${BASE:-http://127.0.0.1:4100}}"
ENDPOINT="${NODE_URL}/public-node/datanet/public-surface-path-leak-audit-v1.json"
OUT="${TMPDIR:-/tmp}/public-node-datanet-public-surface-path-leak-audit-v1-proof-$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$OUT"

echo "=== VOID Public Node DataNet Public Surface Path Leak Audit v1 Proof ==="
echo "marker=VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$NODE_URL"
echo "out=$OUT"

npm run build

MANIFEST="$(curl -fsS "$ENDPOINT")"
printf '%s' "$MANIFEST" > "$OUT/public-surface-path-leak-audit.json"

printf '%s' "$MANIFEST" | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const res = JSON.parse(input);
  const checks = [
    ["marker", res.marker === "VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_V1"],
    ["ok", res.ok === true],
    ["public_surface_only", res.audit_scope?.public_surface_only === true],
    ["operator_local_filesystem_scan", res.audit_scope?.operator_local_filesystem_scan === false],
    ["public_route_runtime_scan_required", res.audit_scope?.public_route_runtime_scan_required === true],
    ["routes_to_scan", Array.isArray(res.routes_to_scan) && res.routes_to_scan.length >= 10],
    ["concrete_private_path_leak_found", res.audit_assertions?.concrete_private_path_leak_found === false],
    ["concrete_command_hook_leak_found", res.audit_assertions?.concrete_command_hook_leak_found === false],
    ["concrete_key_material_leak_found", res.audit_assertions?.concrete_key_material_leak_found === false],
    ["concrete_token_like_value_leak_found", res.audit_assertions?.concrete_token_like_value_leak_found === false],
    ["public_routes_mutate_state", res.audit_assertions?.public_routes_mutate_state === false],
    ["public_routes_write_ledger", res.audit_assertions?.public_routes_write_ledger === false],
    ["public_routes_award_wc", res.audit_assertions?.public_routes_award_wc === false],
    ["public_read_only", res.public_safety?.public_read_only === true],
    ["ledger_write", res.public_safety?.ledger_write === false],
    ["wc_credit_award", res.public_safety?.wc_credit_award === false],
    ["shell_execution", res.public_safety?.shell_execution === false],
    ["private_path_disclosure", res.public_safety?.private_path_disclosure === false],
    ["storage_root_disclosure", res.public_safety?.storage_root_disclosure === false],
  ];

  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) {
    console.error("Audit manifest assertion failed:", failed.join(", "));
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
)

LEAK_RE='"/(home|root|etc|var)/|/home/|/root/|/etc/|/var/|process\.env|child_process|spawn\(|exec\(|BEGIN (RSA |EC |OPENSSH |PRIVATE )?KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{20,}|xox[baprs]-'

scanned=0

for route in "${ROUTES[@]}"; do
  safe_name="$(printf '%s' "$route" | sed 's#[^A-Za-z0-9._-]#_#g')"
  body_file="$OUT/${safe_name}.body"
  code="$(curl -o "$body_file" -s -w "%{http_code}" "$NODE_URL$route")"

  if [ "$code" -lt 200 ] || [ "$code" -ge 300 ]; then
    echo "Audit failed: route returned HTTP $code: $route"
    exit 1
  fi

  if grep -E -q "$LEAK_RE" "$body_file"; then
    echo "Audit failed: concrete private path, command hook, key material, or token-like value leaked by $route"
    exit 1
  fi

  scanned=$((scanned + 1))
done

curl -fsS "$NODE_URL/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq "/public-node/datanet/public-surface-path-leak-audit-v1.json" "$OUT/route-index.json"

grep -Fq "VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_DOC_V1" docs/public/public-node-datanet-public-surface-path-leak-audit-v1.md

if grep -Fq "VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_UI_V1" src/index.ts; then
  echo "datanet_public_surface_path_leak_audit_ui_marker_present=true"
else
  echo "datanet_public_surface_path_leak_audit_ui_marker_present=false"
  exit 1
fi

HTTP_CODE="$(curl -o /dev/null -s -w "%{http_code}" -X POST "$ENDPOINT")"
if [ "$HTTP_CODE" -lt 400 ]; then
  echo "Security Assertion Failed: POST request was not rejected."
  exit 1
fi

echo "datanet_public_surface_path_leak_audit_route_green=true"
echo "datanet_public_surface_path_leak_audit_routes_scanned=$scanned"
echo "datanet_public_surface_path_leak_audit_concrete_private_path_leak_found=false"
echo "datanet_public_surface_path_leak_audit_concrete_command_hook_leak_found=false"
echo "datanet_public_surface_path_leak_audit_concrete_key_material_leak_found=false"
echo "datanet_public_surface_path_leak_audit_concrete_token_like_value_leak_found=false"
echo "datanet_public_surface_path_leak_audit_ledger_write=false"
echo "datanet_public_surface_path_leak_audit_wc_credit_award=false"
echo "VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_PROOF_V1_GREEN"

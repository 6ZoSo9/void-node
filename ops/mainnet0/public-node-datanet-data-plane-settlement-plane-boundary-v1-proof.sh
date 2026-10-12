#!/usr/bin/env bash
set -euo pipefail

NODE_URL="${VOID_NODE_URL:-${BASE:-http://127.0.0.1:4100}}"
ENDPOINT="${NODE_URL}/public-node/datanet/data-plane-settlement-plane-boundary-v1.json"
OUT="${TMPDIR:-/tmp}/public-node-datanet-data-plane-settlement-plane-boundary-v1-proof-$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$OUT"

echo "=== VOID Public Node Data Plane / Settlement Plane Boundary v1 Proof ==="
echo "marker=VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$NODE_URL"
echo "out=$OUT"

npm run build

RESPONSE="$(curl -fsS "$ENDPOINT")"
printf '%s' "$RESPONSE" > "$OUT/boundary.json"

printf '%s' "$RESPONSE" | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  try {
    const res = JSON.parse(input);

    const checks = [
      ["marker", res.marker === "VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_V1"],
      ["ok", res.ok === true],
      ["raw_datanet_payload_written_to_ledger", res.invariants?.raw_datanet_payload_written_to_ledger === false],
      ["public_route_can_mutate_ledger", res.invariants?.public_route_can_mutate_ledger === false],
      ["public_route_can_execute_shell", res.invariants?.public_route_can_execute_shell === false],
      ["current_mainnet0_financial_execution_claim", res.claims_and_boundaries?.current_mainnet0_financial_execution_claim === false],
      ["production_consensus_claim", res.claims_and_boundaries?.production_consensus_claim === false],
      ["future_hardening_required", res.claims_and_boundaries?.future_hardening_required === true],
      ["public_read_only", res.public_safety?.public_read_only === true],
      ["ledger_write", res.public_safety?.ledger_write === false],
      ["wc_credit_award", res.public_safety?.wc_credit_award === false],
      ["shell_execution", res.public_safety?.shell_execution === false],
      ["raw_payload_disclosure", res.public_safety?.raw_payload_disclosure === false],
      ["private_path_disclosure", res.public_safety?.private_path_disclosure === false],
    ];

    const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) {
      console.error("Boundary invariant assertion failed:", failed.join(", "));
      process.exit(1);
    }
  } catch (e) {
    console.error("Failed to parse boundary response as JSON:", e.message);
    process.exit(1);
  }
});
'

HTTP_CODE="$(curl -o /dev/null -s -w "%{http_code}" -X POST "$ENDPOINT")"
if [ "$HTTP_CODE" -lt 400 ]; then
  echo "Security Assertion Failed: POST request was not rejected."
  exit 1
fi

if printf '%s' "$RESPONSE" | grep -E -qi '(/home/|/root/|/etc/|process\.env|child_process|spawn\(|exec\(|PRIVATE_KEY|SECRET|TOKEN|PASSWORD)'; then
  echo "Security Assertion Failed: Internal context leaked in public JSON output."
  exit 1
fi

curl -fsS "$NODE_URL/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq "/public-node/datanet/data-plane-settlement-plane-boundary-v1.json" "$OUT/route-index.json"

grep -Fq "VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_DOC_V1" docs/public/public-node-datanet-data-plane-settlement-plane-boundary-v1.md

if grep -Fq "VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_UI_V1" src/index.ts; then
  echo "datanet_data_plane_settlement_plane_boundary_ui_marker_present=true"
else
  echo "datanet_data_plane_settlement_plane_boundary_ui_marker_present=false"
  echo "UI marker missing; add UI card/marker before final commit."
  exit 1
fi

echo "datanet_data_plane_settlement_plane_boundary_route_green=true"
echo "datanet_data_plane_settlement_plane_boundary_raw_payload_written_to_ledger=false"
echo "datanet_data_plane_settlement_plane_boundary_public_route_can_mutate_ledger=false"
echo "datanet_data_plane_settlement_plane_boundary_public_route_can_execute_shell=false"
echo "datanet_data_plane_settlement_plane_boundary_current_mainnet0_financial_execution_claim=false"
echo "datanet_data_plane_settlement_plane_boundary_production_consensus_claim=false"
echo "datanet_data_plane_settlement_plane_boundary_future_hardening_required=true"
echo "VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_PROOF_V1_GREEN"

#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-${NODE_URL:-http://127.0.0.1:4100}}"
OUT="${TMPDIR:-/tmp}/public-node-datanet-published-retrieval-duplicate-guard-decision-boundary-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
DATASET_ID="datanet-published-retrieval-receipt-proof-fixture-v1"
SRC="$OUT/source"

mkdir -p "$SRC/nested"

echo "=== VOID Public Node DataNet Published Retrieval Duplicate Guard Decision Boundary v1 Proof ==="
echo "marker=VOID_DATANET_PUBLISHED_RETRIEVAL_DUPLICATE_GUARD_DECISION_BOUNDARY_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID published retrieval receipt fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_FIXTURE_V1","ok":true}\n' > "$SRC/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id "$DATASET_ID" \
  --source "$SRC" \
  > "$OUT/publish.log"

grep -Fq "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN" "$OUT/publish.log"
grep -Fq "public_safe_manifest_written=true" "$OUT/publish.log"
grep -Fq "public_mutation=false" "$OUT/publish.log"
grep -Fq "ledger_write=false" "$OUT/publish.log"
grep -Fq "wc_credit_award=false" "$OUT/publish.log"

curl -fsS "$BASE/public-node/datanet/published-retrieval-operator-approval-decision-boundary-v1.json" > "$OUT/approval-boundary.json"
curl -fsS "$BASE/public-node/datanet/published-retrieval-duplicate-guard-decision-boundary-v1.json" > "$OUT/duplicate-boundary.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

node - "$OUT/approval-boundary.json" "$OUT/duplicate-boundary.json" <<'NODE'
const fs = require("node:fs");
const [approvalFile, duplicateFile] = process.argv.slice(2);
const approval = JSON.parse(fs.readFileSync(approvalFile, "utf8"));
const duplicate = JSON.parse(fs.readFileSync(duplicateFile, "utf8"));

const checks = [
  ["approval_marker", approval.marker === "VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_APPROVAL_DECISION_BOUNDARY_V1"],
  ["approval_ok", approval.ok === true],
  ["approval_separate_action", approval.operator_approval_decision_boundary?.approval_is_separate_operator_action === true],
  ["approval_not_recorded", approval.operator_approval_decision_boundary?.operator_approval_recorded_now === false],
  ["approval_duplicate_guard_required", approval.operator_approval_decision_boundary?.duplicate_guard_required_before_approval === true],
  ["duplicate_marker", duplicate.marker === "VOID_DATANET_PUBLISHED_RETRIEVAL_DUPLICATE_GUARD_DECISION_BOUNDARY_V1"],
  ["duplicate_ok", duplicate.ok === true],
  ["review_packet_valid", duplicate.review_packet_input?.candidate_valid === true],
  ["duplicate_guard_required", duplicate.duplicate_guard_decision_boundary?.duplicate_guard_required === true],
  ["duplicate_guard_performed_now", duplicate.duplicate_guard_decision_boundary?.duplicate_guard_performed_now === true],
  ["duplicate_found", duplicate.duplicate_guard_decision_boundary?.duplicate_found === false],
  ["duplicate_record_written_now", duplicate.duplicate_guard_decision_boundary?.duplicate_record_written_now === false],
  ["operator_approval_recorded_now", duplicate.duplicate_guard_decision_boundary?.operator_approval_recorded_now === false],
  ["settlement_plane_required_before_award", duplicate.duplicate_guard_decision_boundary?.settlement_plane_required_before_award === true],
  ["settlement_plane_performed_now", duplicate.duplicate_guard_decision_boundary?.settlement_plane_performed_now === false],
  ["automatic_award", duplicate.duplicate_guard_decision_boundary?.automatic_award === false],
  ["award_intent_created_now", duplicate.duplicate_guard_decision_boundary?.award_intent_created_now === false],
  ["award_record_created_now", duplicate.duplicate_guard_decision_boundary?.award_record_created_now === false],
  ["wc_delta_now", duplicate.duplicate_guard_decision_boundary?.wc_delta_now === 0],
  ["ledger_write_now", duplicate.duplicate_guard_decision_boundary?.ledger_write_now === false],
  ["wc_credit_award_now", duplicate.duplicate_guard_decision_boundary?.wc_credit_award_now === false],
  ["public_route_can_award_wc", duplicate.decision_boundary?.public_route_can_award_wc === false],
  ["public_route_can_write_ledger", duplicate.decision_boundary?.public_route_can_write_ledger === false],
  ["public_mutation", duplicate.public_safety?.public_mutation === false],
  ["ledger_write", duplicate.public_safety?.ledger_write === false],
  ["wc_credit_award", duplicate.public_safety?.wc_credit_award === false],
];

let failed = false;
for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`${name}=false`);
    failed = true;
  }
}
if (failed) process.exit(1);

console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_review_packet_valid=true");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_duplicate_guard_required=true");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_duplicate_guard_performed_now=true");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_duplicate_found=false");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_duplicate_record_written_now=false");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_operator_approval_recorded_now=false");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_settlement_plane_required_before_award=true");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_settlement_plane_performed_now=false");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_automatic_award=false");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_award_intent_created_now=false");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_award_record_created_now=false");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_wc_delta_now=0");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_ledger_write=false");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_wc_credit_award=false");
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_public_mutation=false");
NODE

grep -Fq "/public-node/datanet/published-retrieval-duplicate-guard-decision-boundary-v1.json" "$OUT/route-index.json"
grep -Fq "VOID_DATANET_PUBLISHED_RETRIEVAL_DUPLICATE_GUARD_DECISION_BOUNDARY_DOC_V1" docs/public/public-node-datanet-published-retrieval-duplicate-guard-decision-boundary-v1.md

node - "$OUT/duplicate-boundary.json" <<'NODE'
const fs = require("node:fs");
const body = fs.readFileSync(process.argv[2], "utf8");
const forbidden = ["/home/", "/Users/", "C:\\", ".ssh", "PRIVATE KEY", "BEGIN RSA", "BEGIN OPENSSH", "token=", "secret="];
const leak = forbidden.find((x) => body.includes(x));
if (leak) {
  console.error("datanet_published_retrieval_duplicate_guard_decision_boundary_private_leak_scan_green=false");
  console.error(`leak_pattern=${leak}`);
  process.exit(1);
}
console.log("datanet_published_retrieval_duplicate_guard_decision_boundary_private_leak_scan_green=true");
NODE

echo "VOID_DATANET_PUBLISHED_RETRIEVAL_DUPLICATE_GUARD_DECISION_BOUNDARY_PROOF_V1_GREEN"

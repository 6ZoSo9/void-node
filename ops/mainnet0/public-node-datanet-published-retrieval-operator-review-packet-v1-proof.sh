#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-${NODE_URL:-http://127.0.0.1:4100}}"
OUT="${TMPDIR:-/tmp}/public-node-datanet-published-retrieval-operator-review-packet-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
DATASET_ID="datanet-published-retrieval-receipt-proof-fixture-v1"
SRC="$OUT/source"

mkdir -p "$SRC/nested"

echo "=== VOID Public Node DataNet Published Retrieval Operator Review Packet v1 Proof ==="
echo "marker=VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_PROOF_V1"
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

curl -fsS "$BASE/public-node/datanet/published-retrieval-wc-candidate-boundary-v1.json" > "$OUT/candidate.json"
curl -fsS "$BASE/public-node/datanet/published-retrieval-operator-review-packet-v1.json" > "$OUT/review-packet.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

node - "$OUT/candidate.json" "$OUT/review-packet.json" <<'NODE'
const fs = require("node:fs");
const [candidateFile, packetFile] = process.argv.slice(2);
const candidate = JSON.parse(fs.readFileSync(candidateFile, "utf8"));
const packet = JSON.parse(fs.readFileSync(packetFile, "utf8"));

const checks = [
  ["candidate_marker", candidate.marker === "VOID_DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_V1"],
  ["candidate_ok", candidate.ok === true],
  ["candidate_retrieval_receipt_valid", candidate.receipt_input?.retrieval_receipt_valid === true],
  ["candidate_useful_work_candidate", candidate.wc_candidate_boundary?.useful_work_candidate === true],
  ["candidate_operator_review_required", candidate.wc_candidate_boundary?.operator_review_required === true],
  ["candidate_automatic_award", candidate.wc_candidate_boundary?.automatic_award === false],
  ["candidate_wc_delta_now", candidate.wc_candidate_boundary?.wc_delta_now === 0],
  ["packet_marker", packet.marker === "VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_V1"],
  ["packet_ok", packet.ok === true],
  ["packet_retrieval_receipt_valid", packet.candidate_input?.retrieval_receipt_valid === true],
  ["packet_useful_work_candidate", packet.candidate_input?.useful_work_candidate === true],
  ["packet_verifiable_work", packet.candidate_input?.verifiable_work === true],
  ["operator_review_required", packet.operator_review_packet?.operator_review_required === true],
  ["operator_approval_recorded_now", packet.operator_review_packet?.operator_approval_recorded_now === false],
  ["operator_rejection_recorded_now", packet.operator_review_packet?.operator_rejection_recorded_now === false],
  ["operator_identity_required_for_approval", packet.operator_review_packet?.operator_identity_required_for_approval === true],
  ["duplicate_guard_required", packet.operator_review_packet?.duplicate_guard_required === true],
  ["duplicate_guard_performed_now", packet.operator_review_packet?.duplicate_guard_performed_now === false],
  ["settlement_plane_required", packet.operator_review_packet?.settlement_plane_required === true],
  ["settlement_plane_performed_now", packet.operator_review_packet?.settlement_plane_performed_now === false],
  ["automatic_award", packet.operator_review_packet?.automatic_award === false],
  ["award_intent_created_now", packet.operator_review_packet?.award_intent_created_now === false],
  ["award_record_created_now", packet.operator_review_packet?.award_record_created_now === false],
  ["wc_delta_now", packet.operator_review_packet?.wc_delta_now === 0],
  ["ledger_write_now", packet.operator_review_packet?.ledger_write_now === false],
  ["wc_credit_award_now", packet.operator_review_packet?.wc_credit_award_now === false],
  ["public_route_can_approve_candidate", packet.decision_boundary?.public_route_can_approve_candidate === false],
  ["public_route_can_award_wc", packet.decision_boundary?.public_route_can_award_wc === false],
  ["public_route_can_write_ledger", packet.decision_boundary?.public_route_can_write_ledger === false],
  ["public_mutation", packet.public_safety?.public_mutation === false],
  ["ledger_write", packet.public_safety?.ledger_write === false],
  ["wc_credit_award", packet.public_safety?.wc_credit_award === false],
];

let failed = false;
for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`${name}=false`);
    failed = true;
  }
}
if (failed) process.exit(1);

console.log("datanet_published_retrieval_operator_review_packet_candidate_valid=true");
console.log("datanet_published_retrieval_operator_review_packet_created=true");
console.log("datanet_published_retrieval_operator_review_packet_operator_review_required=true");
console.log("datanet_published_retrieval_operator_review_packet_operator_approval_recorded_now=false");
console.log("datanet_published_retrieval_operator_review_packet_operator_rejection_recorded_now=false");
console.log("datanet_published_retrieval_operator_review_packet_duplicate_guard_required=true");
console.log("datanet_published_retrieval_operator_review_packet_duplicate_guard_performed_now=false");
console.log("datanet_published_retrieval_operator_review_packet_settlement_plane_required=true");
console.log("datanet_published_retrieval_operator_review_packet_settlement_plane_performed_now=false");
console.log("datanet_published_retrieval_operator_review_packet_automatic_award=false");
console.log("datanet_published_retrieval_operator_review_packet_award_intent_created_now=false");
console.log("datanet_published_retrieval_operator_review_packet_award_record_created_now=false");
console.log("datanet_published_retrieval_operator_review_packet_wc_delta_now=0");
console.log("datanet_published_retrieval_operator_review_packet_ledger_write=false");
console.log("datanet_published_retrieval_operator_review_packet_wc_credit_award=false");
console.log("datanet_published_retrieval_operator_review_packet_public_mutation=false");
NODE

grep -Fq "/public-node/datanet/published-retrieval-operator-review-packet-v1.json" "$OUT/route-index.json"
grep -Fq "VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_DOC_V1" docs/public/public-node-datanet-published-retrieval-operator-review-packet-v1.md

node - "$OUT/review-packet.json" <<'NODE'
const fs = require("node:fs");
const body = fs.readFileSync(process.argv[2], "utf8");
const forbidden = ["/home/", "/Users/", "C:\\", ".ssh", "PRIVATE KEY", "BEGIN RSA", "BEGIN OPENSSH", "token=", "secret="];
const leak = forbidden.find((x) => body.includes(x));
if (leak) {
  console.error("datanet_published_retrieval_operator_review_packet_private_leak_scan_green=false");
  console.error(`leak_pattern=${leak}`);
  process.exit(1);
}
console.log("datanet_published_retrieval_operator_review_packet_private_leak_scan_green=true");
NODE

echo "VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_PROOF_V1_GREEN"

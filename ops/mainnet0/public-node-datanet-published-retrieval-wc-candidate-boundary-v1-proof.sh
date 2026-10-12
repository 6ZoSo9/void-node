#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-${NODE_URL:-http://127.0.0.1:4100}}"
OUT="${TMPDIR:-/tmp}/public-node-datanet-published-retrieval-wc-candidate-boundary-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
DATASET_ID="datanet-published-retrieval-receipt-proof-fixture-v1"
SRC="$OUT/source"

mkdir -p "$SRC/nested"

echo "=== VOID Public Node DataNet Published Retrieval WC Candidate Boundary v1 Proof ==="
echo "marker=VOID_DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_PROOF_V1"
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

curl -fsS "$BASE/public-node/datanet/published-retrieval-receipt-v1.json" > "$OUT/receipt.json"
curl -fsS "$BASE/public-node/datanet/published-retrieval-wc-candidate-boundary-v1.json" > "$OUT/candidate.json"
curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"

node - "$OUT/receipt.json" "$OUT/candidate.json" <<'NODE'
const fs = require("node:fs");
const [receiptFile, candidateFile] = process.argv.slice(2);
const receipt = JSON.parse(fs.readFileSync(receiptFile, "utf8"));
const candidate = JSON.parse(fs.readFileSync(candidateFile, "utf8"));

const checks = [
  ["receipt_marker", receipt.marker === "VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_V1"],
  ["receipt_ok", receipt.ok === true],
  ["receipt_object_sha256_verified", receipt.object_retrieval?.object_sha256_verified === true],
  ["receipt_bytes_match_source", receipt.object_retrieval?.bytes_match_source === true],
  ["receipt_public_safe", receipt.retrieval_receipt?.receipt_public_safe === true],
  ["candidate_marker", candidate.marker === "VOID_DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_V1"],
  ["candidate_ok", candidate.ok === true],
  ["retrieval_receipt_valid", candidate.receipt_input?.retrieval_receipt_valid === true],
  ["useful_work_candidate", candidate.wc_candidate_boundary?.useful_work_candidate === true],
  ["verifiable_work", candidate.wc_candidate_boundary?.verifiable_work === true],
  ["operator_review_required", candidate.wc_candidate_boundary?.operator_review_required === true],
  ["duplicate_guard_required", candidate.wc_candidate_boundary?.duplicate_guard_required === true],
  ["settlement_plane_required", candidate.wc_candidate_boundary?.settlement_plane_required === true],
  ["automatic_award", candidate.wc_candidate_boundary?.automatic_award === false],
  ["award_intent_created_now", candidate.wc_candidate_boundary?.award_intent_created_now === false],
  ["award_record_created_now", candidate.wc_candidate_boundary?.award_record_created_now === false],
  ["wc_delta_now", candidate.wc_candidate_boundary?.wc_delta_now === 0],
  ["ledger_write_now", candidate.wc_candidate_boundary?.ledger_write_now === false],
  ["wc_credit_award_now", candidate.wc_candidate_boundary?.wc_credit_award_now === false],
  ["public_route_can_award_wc", candidate.decision_boundary?.public_route_can_award_wc === false],
  ["public_route_can_write_ledger", candidate.decision_boundary?.public_route_can_write_ledger === false],
  ["public_route_can_bypass_operator_review", candidate.decision_boundary?.public_route_can_bypass_operator_review === false],
  ["public_mutation", candidate.public_safety?.public_mutation === false],
  ["ledger_write", candidate.public_safety?.ledger_write === false],
  ["wc_credit_award", candidate.public_safety?.wc_credit_award === false],
];

let failed = false;
for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`${name}=false`);
    failed = true;
  }
}
if (failed) process.exit(1);

console.log("datanet_published_retrieval_wc_candidate_boundary_retrieval_receipt_valid=true");
console.log("datanet_published_retrieval_wc_candidate_boundary_useful_work_candidate=true");
console.log("datanet_published_retrieval_wc_candidate_boundary_verifiable_work=true");
console.log("datanet_published_retrieval_wc_candidate_boundary_operator_review_required=true");
console.log("datanet_published_retrieval_wc_candidate_boundary_duplicate_guard_required=true");
console.log("datanet_published_retrieval_wc_candidate_boundary_settlement_plane_required=true");
console.log("datanet_published_retrieval_wc_candidate_boundary_automatic_award=false");
console.log("datanet_published_retrieval_wc_candidate_boundary_award_intent_created_now=false");
console.log("datanet_published_retrieval_wc_candidate_boundary_award_record_created_now=false");
console.log("datanet_published_retrieval_wc_candidate_boundary_wc_delta_now=0");
console.log("datanet_published_retrieval_wc_candidate_boundary_ledger_write=false");
console.log("datanet_published_retrieval_wc_candidate_boundary_wc_credit_award=false");
console.log("datanet_published_retrieval_wc_candidate_boundary_public_mutation=false");
NODE

grep -Fq "/public-node/datanet/published-retrieval-wc-candidate-boundary-v1.json" "$OUT/route-index.json"
grep -Fq "VOID_DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_DOC_V1" docs/public/public-node-datanet-published-retrieval-wc-candidate-boundary-v1.md

node - "$OUT/candidate.json" <<'NODE'
const fs = require("node:fs");
const body = fs.readFileSync(process.argv[2], "utf8");
const forbidden = [
  "/home/",
  "/Users/",
  "C:\\",
  ".ssh",
  "PRIVATE KEY",
  "BEGIN RSA",
  "BEGIN OPENSSH",
  "token=",
  "secret="
];
const leak = forbidden.find((x) => body.includes(x));
if (leak) {
  console.error(`datanet_published_retrieval_wc_candidate_boundary_private_leak_scan_green=false`);
  console.error(`leak_pattern=${leak}`);
  process.exit(1);
}
console.log("datanet_published_retrieval_wc_candidate_boundary_private_leak_scan_green=true");
NODE

echo "VOID_DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_PROOF_V1_GREEN"

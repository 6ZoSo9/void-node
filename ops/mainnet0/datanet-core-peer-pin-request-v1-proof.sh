#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-peer-pin-request-fixture-v1"
MIRROR_NODE_LABEL="peer-pin-request-proof-node"
OUT="${TMPDIR:-/tmp}/void-datanet-core-peer-pin-request-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-source"

rm -rf "$OUT" "$SRC"
mkdir -p "$OUT" "$SRC/nested"

echo "=== VOID DataNet Core Peer Pin Request v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_PIN_REQUEST_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID DataNet Core Peer Pin Request fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_CORE_PEER_PIN_REQUEST_FIXTURE_V1","ok":true,"purpose":"peer-pin-request"}\n' > "$SRC/nested/metadata.json"

curl -fsS "$BASE/public-node/datanet/core-peer-pin-request-policy-v1.json" > "$OUT/policy.json"

node - "$OUT/policy.json" <<'NODE'
const fs = require("node:fs");
const policy = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fail = (msg) => { console.error(msg); process.exit(1); };

if (policy.marker !== "VOID_DATANET_CORE_PEER_PIN_REQUEST_POLICY_V1") fail("policy_marker_valid=false");
if (policy.ok !== true) fail("policy_ok=false");
const lane = policy.request_lane || {};
if (lane.request_packet_supported !== true) fail("policy_request_packet_supported=false");
if (lane.public_post_supported !== false) fail("policy_public_post_supported_not_false");
if (lane.automatic_mirror_supported !== false) fail("policy_automatic_mirror_supported_not_false");
if (lane.automatic_pin_supported !== false) fail("policy_automatic_pin_supported_not_false");
if (lane.operator_review_required !== true) fail("policy_operator_review_required=false");

const safety = policy.safety_requirements || {};
if (safety.public_mutation !== false) fail("policy_public_mutation_not_false");
if (safety.ledger_write !== false) fail("policy_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("policy_wc_credit_award_not_false");

console.log("pin_request_policy_marker_valid=true");
console.log("pin_request_policy_operator_review_required=true");
console.log("pin_request_policy_public_post_supported=false");
console.log("pin_request_policy_automatic_mirror_supported=false");
console.log("pin_request_policy_public_mutation=false");
console.log("pin_request_policy_ledger_write=false");
console.log("pin_request_policy_wc_credit_award=false");
NODE

ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id "$DATASET_ID" \
  --source "$SRC" > "$OUT/publish.log"

grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN' "$OUT/publish.log"

BASE="$BASE" \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  ops/mainnet0/datanet-core-mirror-loop-v1.sh > "$OUT/mirror-loop.log"

grep -Fq 'VOID_DATANET_CORE_MIRROR_LOOP_V1_GREEN' "$OUT/mirror-loop.log"

OUT_DIR="$OUT/published-pin-request" \
PEER_BASE="$BASE" \
SELECT_MODE=published \
DATASET_ID="$DATASET_ID" \
REQUESTER_NODE_LABEL=pin-request-proof-requester \
TARGET_NODE_LABEL=pin-request-proof-target \
  ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/published-pin-request.log"

cat "$OUT/published-pin-request.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/published-pin-request.log"
grep -Fq 'pin_request_selected_type=operator_published' "$OUT/published-pin-request.log"
grep -Fq 'pin_request_operator_review_required=true' "$OUT/published-pin-request.log"
grep -Fq 'pin_request_automatic_mirror_requested=false' "$OUT/published-pin-request.log"
grep -Fq 'pin_request_automatic_pin_requested=false' "$OUT/published-pin-request.log"
grep -Fq 'pin_request_private_leak_scan_green=true' "$OUT/published-pin-request.log"

OUT_DIR="$OUT/mirrored-pin-request" \
PEER_BASE="$BASE" \
SELECT_MODE=mirrored \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
REQUESTER_NODE_LABEL=pin-request-proof-requester \
TARGET_NODE_LABEL=pin-request-proof-target \
  ops/mainnet0/datanet-core-peer-pin-request-v1.sh > "$OUT/mirrored-pin-request.log"

cat "$OUT/mirrored-pin-request.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_V1_GREEN' "$OUT/mirrored-pin-request.log"
grep -Fq 'pin_request_selected_type=mirrored' "$OUT/mirrored-pin-request.log"
grep -Fq "pin_request_selected_mirror_node_label=$MIRROR_NODE_LABEL" "$OUT/mirrored-pin-request.log"
grep -Fq 'pin_request_operator_review_required=true' "$OUT/mirrored-pin-request.log"
grep -Fq 'pin_request_automatic_mirror_requested=false' "$OUT/mirrored-pin-request.log"
grep -Fq 'pin_request_automatic_pin_requested=false' "$OUT/mirrored-pin-request.log"
grep -Fq 'pin_request_private_leak_scan_green=true' "$OUT/mirrored-pin-request.log"

grep -Fq 'VOID_DATANET_CORE_PEER_PIN_REQUEST_DOC_V1' docs/public/public-node-datanet-core-peer-pin-request-v1.md

curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq '/public-node/datanet/core-peer-pin-request-policy-v1.json' "$OUT/route-index.json"

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT/policy.json"; then
  echo "pin_request_policy_private_leak_scan_green=false"
  exit 1
fi

echo "peer_pin_request_published_packet_green=true"
echo "peer_pin_request_mirrored_packet_green=true"
echo "pin_request_policy_private_leak_scan_green=true"
echo "pin_request_public_mutation=false"
echo "pin_request_ledger_write=false"
echo "pin_request_wc_credit_award=false"
echo "VOID_DATANET_CORE_PEER_PIN_REQUEST_PROOF_V1_GREEN"

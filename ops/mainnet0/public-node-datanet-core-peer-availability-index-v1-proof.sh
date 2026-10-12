#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:4100}"
DATASET_ID="datanet-core-peer-availability-index-fixture-v1"
MIRROR_NODE_LABEL="availability-proof-node"
OUT="${TMPDIR:-/tmp}/public-node-datanet-core-peer-availability-index-v1-proof-$(date -u +%Y%m%d-%H%M%S)"
SRC="${TMPDIR:-/tmp}/${DATASET_ID}-source"

rm -rf "$OUT" "$SRC"
mkdir -p "$OUT" "$SRC/nested"

echo "=== VOID Public Node DataNet Core Peer Availability Index v1 Proof ==="
echo "marker=VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_PROOF_V1"
echo "head=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "base=$BASE"
echo "out=$OUT"

npm run build

printf 'VOID DataNet Core Peer Availability Index fixture v1\n' > "$SRC/README.txt"
printf '{"marker":"VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_FIXTURE_V1","ok":true,"purpose":"peer-availability-index"}\n' > "$SRC/nested/metadata.json"

ops/mainnet0/datanet-operator-local-publish-v1.sh \
  --dataset-id "$DATASET_ID" \
  --source "$SRC" > "$OUT/publish.log"

grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN' "$OUT/publish.log"
grep -Fq 'public_mutation=false' "$OUT/publish.log"
grep -Fq 'ledger_write=false' "$OUT/publish.log"
grep -Fq 'wc_credit_award=false' "$OUT/publish.log"

BASE="$BASE" \
DATASET_ID="$DATASET_ID" \
MIRROR_NODE_LABEL="$MIRROR_NODE_LABEL" \
  ops/mainnet0/datanet-core-mirror-loop-v1.sh > "$OUT/mirror-loop.log"

grep -Fq 'VOID_DATANET_CORE_MIRROR_LOOP_V1_GREEN' "$OUT/mirror-loop.log"
grep -Fq 'mirror_receipt_public_safe=true' "$OUT/mirror-loop.log"
grep -Fq 'public_mutation=false' "$OUT/mirror-loop.log"
grep -Fq 'ledger_write=false' "$OUT/mirror-loop.log"
grep -Fq 'wc_credit_award=false' "$OUT/mirror-loop.log"

curl -fsS "$BASE/public-node/datanet/core-peer-availability-index-v1.json" > "$OUT/availability-index.json"

node - "$OUT/availability-index.json" <<'NODE'
const fs = require("node:fs");
const index = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const fail = (msg) => { console.error(msg); process.exit(1); };
const isSha = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);

if (index.marker !== "VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_V1") fail("availability_index_marker_valid=false");
if (index.ok !== true) fail("availability_index_ok=false");

const scope = index.peer_availability_scope || {};
if (scope.local_node_public_safe_view !== true) fail("availability_scope_public_safe_view=false");
if (scope.includes_operator_published_datasets !== true) fail("availability_scope_includes_published=false");
if (scope.includes_local_mirrored_datasets !== true) fail("availability_scope_includes_mirrored=false");
if (scope.route_accepts_dataset_id_parameter !== false) fail("availability_scope_route_accepts_dataset_id_parameter_not_false");
if (scope.route_accepts_path_parameter !== false) fail("availability_scope_route_accepts_path_parameter_not_false");
if (scope.no_private_filesystem_paths !== true) fail("availability_scope_no_private_filesystem_paths=false");

if (!Array.isArray(index.operator_published)) fail("operator_published_array=false");
if (!Array.isArray(index.mirrored)) fail("mirrored_array=false");

const published = index.operator_published.find((entry) => entry.dataset_id === "datanet-core-peer-availability-index-fixture-v1");
if (!published) fail("availability_has_published_fixture=false");
if (published.availability_type !== "operator_published") fail("published_availability_type_valid=false");
if (published.can_serve_manifest !== true) fail("published_can_serve_manifest=false");
if (published.can_serve_objects_by_sha256 !== true) fail("published_can_serve_objects_by_sha256=false");
if (published.selected_from_registry !== true) fail("published_selected_from_registry=false");
if (!isSha(published.manifest_sha256)) fail("published_manifest_sha256_valid=false");
if (!isSha(published.content_root_sha256)) fail("published_content_root_sha256_valid=false");
if (published.object_count !== 2) fail("published_object_count_match=false");

const pubSafety = published.public_safety || {};
if (pubSafety.public_read_only !== true) fail("published_public_read_only=false");
if (pubSafety.local_path_disclosed !== false) fail("published_local_path_disclosed_not_false");
if (pubSafety.absolute_path_disclosed !== false) fail("published_absolute_path_disclosed_not_false");
if (pubSafety.operator_home_path_disclosed !== false) fail("published_operator_home_path_disclosed_not_false");
if (pubSafety.local_storage_root_disclosed !== false) fail("published_local_storage_root_disclosed_not_false");
if (pubSafety.public_mutation !== false) fail("published_public_mutation_not_false");
if (pubSafety.ledger_write !== false) fail("published_ledger_write_not_false");
if (pubSafety.wc_credit_award !== false) fail("published_wc_credit_award_not_false");

const mirror = index.mirrored.find((entry) => entry.dataset_id === "datanet-core-peer-availability-index-fixture-v1" && entry.mirror_node_label === "availability-proof-node");
if (!mirror) fail("availability_has_mirror_fixture=false");
if (mirror.availability_type !== "mirrored") fail("mirror_availability_type_valid=false");
if (mirror.can_serve_receipt !== true) fail("mirror_can_serve_receipt=false");
if (mirror.can_serve_objects_by_sha256 !== true) fail("mirror_can_serve_objects_by_sha256=false");
if (mirror.all_objects_fetched !== true) fail("mirror_all_objects_fetched=false");
if (mirror.all_object_sha256_verified !== true) fail("mirror_all_object_sha256_verified=false");
if (mirror.all_object_bytes_match_manifest !== true) fail("mirror_all_object_bytes_match_manifest=false");
if (mirror.selected_from_fixed_mirror_root !== true) fail("mirror_selected_from_fixed_mirror_root=false");
if (!isSha(mirror.receipt_sha256)) fail("mirror_receipt_sha256_valid=false");
if (!isSha(mirror.manifest_sha256)) fail("mirror_manifest_sha256_valid=false");
if (!isSha(mirror.content_root_sha256)) fail("mirror_content_root_sha256_valid=false");
if (mirror.object_count !== 2) fail("mirror_object_count_match=false");

const mirrorSafety = mirror.public_safety || {};
if (mirrorSafety.public_read_only !== true) fail("mirror_public_read_only=false");
if (mirrorSafety.local_path_disclosed !== false) fail("mirror_local_path_disclosed_not_false");
if (mirrorSafety.absolute_path_disclosed !== false) fail("mirror_absolute_path_disclosed_not_false");
if (mirrorSafety.operator_home_path_disclosed !== false) fail("mirror_operator_home_path_disclosed_not_false");
if (mirrorSafety.local_storage_root_disclosed !== false) fail("mirror_local_storage_root_disclosed_not_false");
if (mirrorSafety.public_mutation !== false) fail("mirror_public_mutation_not_false");
if (mirrorSafety.ledger_write !== false) fail("mirror_ledger_write_not_false");
if (mirrorSafety.wc_credit_award !== false) fail("mirror_wc_credit_award_not_false");

const safety = index.public_safety || {};
if (safety.public_read_only !== true) fail("index_public_read_only=false");
if (safety.local_path_disclosed !== false) fail("index_local_path_disclosed_not_false");
if (safety.absolute_path_disclosed !== false) fail("index_absolute_path_disclosed_not_false");
if (safety.operator_home_path_disclosed !== false) fail("index_operator_home_path_disclosed_not_false");
if (safety.local_storage_root_disclosed !== false) fail("index_local_storage_root_disclosed_not_false");
if (safety.public_mutation !== false) fail("index_public_mutation_not_false");
if (safety.ledger_write !== false) fail("index_ledger_write_not_false");
if (safety.wc_credit_award !== false) fail("index_wc_credit_award_not_false");

console.log("availability_index_marker_valid=true");
console.log("availability_scope_public_safe_view=true");
console.log("availability_has_published_fixture=true");
console.log("availability_published_can_serve_manifest=true");
console.log("availability_published_can_serve_objects_by_sha256=true");
console.log("availability_has_mirror_fixture=true");
console.log("availability_mirror_can_serve_receipt=true");
console.log("availability_mirror_can_serve_objects_by_sha256=true");
console.log("availability_mirror_all_object_sha256_verified=true");
console.log("availability_public_mutation=false");
console.log("availability_ledger_write=false");
console.log("availability_wc_credit_award=false");
NODE

curl -fsS "$BASE/public-node/route-index.json" > "$OUT/route-index.json"
grep -Fq '/public-node/datanet/core-peer-availability-index-v1.json' "$OUT/route-index.json"

grep -Fq 'VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_DOC_V1' docs/public/public-node-datanet-core-peer-availability-index-v1.md

if grep -R -E '/home/|/mnt/|/tmp/|\.void/datanet|zoso' "$OUT/availability-index.json"; then
  echo "availability_private_leak_scan_green=false"
  exit 1
fi

echo "availability_private_leak_scan_green=true"
echo "VOID_DATANET_CORE_PEER_AVAILABILITY_INDEX_PROOF_V1_GREEN"

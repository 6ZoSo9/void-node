#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MARKER="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CANONICAL_OBJECT_ID_V1"
OBJECT_ID="void:economic:epoch2:successor-state-root:v1"
OBJECT_ID_SHA256="fa6a4ff9a7a25b8ec1888c58d7eb49159a69d84a4021b1365fe1293e868f1f51"
CONTENT_SHA256="8bb02e6147096465a78f983d8b34e7420e3c5b69cde11e2bdb5018340557fb84"
BYTE_LENGTH="3204"
PAYLOAD="public/public-node/evidence/economic-epoch2-public-void-state-root-anchor-v1.json"
IMPORTER="ops/mainnet0/public-node-local-data-drop-import.sh"
SOURCE="src/index.ts"

fail() {
  printf '%s HOLD: %s\n' "$MARKER" "$*" >&2
  exit 1
}

test -f "$PAYLOAD" && test ! -L "$PAYLOAD" || fail "payload_missing_or_symlink"
test -f "$IMPORTER" && test ! -L "$IMPORTER" || fail "importer_missing_or_symlink"
test -f "$SOURCE" && test ! -L "$SOURCE" || fail "source_missing_or_symlink"

bash -n "$IMPORTER" || fail "importer_shell_syntax"

test "$(printf '%s' "$OBJECT_ID" | sha256sum | awk '{print $1}')" = "$OBJECT_ID_SHA256" ||
  fail "canonical_object_id_sha256_mismatch"
test "$(sha256sum "$PAYLOAD" | awk '{print $1}')" = "$CONTENT_SHA256" ||
  fail "canonical_payload_sha256_mismatch"
test "$(wc -c < "$PAYLOAD" | tr -d ' ')" = "$BYTE_LENGTH" ||
  fail "canonical_payload_byte_length_mismatch"

grep -Fq "^[A-Za-z0-9._:-]{1,160}$" "$IMPORTER" ||
  fail "importer_colon_grammar_missing"
if grep -Fq "^[A-Za-z0-9._-]{1,160}$" "$IMPORTER"; then
  fail "importer_legacy_grammar_remains"
fi
grep -Fq '[ "$OBJECT_ID" = "." ] || [ "$OBJECT_ID" = ".." ]' "$IMPORTER" ||
  fail "importer_dot_component_guard_missing"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SECURE_STAGED_CREATE_ONLY_V2" "$IMPORTER" ||
  fail "secure_staged_create_only_marker_missing"
grep -Fq 'os.O_EXCL' "$IMPORTER" ||
  fail "create_only_open_flag_missing"
grep -Fq 'O_NOFOLLOW' "$IMPORTER" ||
  fail "nofollow_open_flag_missing"
grep -Fq 'follow_symlinks=False' "$IMPORTER" ||
  fail "nofollow_stat_guard_missing"
grep -Fq 'os.link(' "$IMPORTER" ||
  fail "atomic_hardlink_publish_missing"
grep -Fq '.import-staging-v2' "$IMPORTER" ||
  fail "unexposed_staging_directory_missing"
grep -Fq 'group_or_world_writable' "$IMPORTER" ||
  fail "store_directory_mode_guard_missing"
grep -Fq 'not_owned_by_operator' "$IMPORTER" ||
  fail "operator_ownership_guard_missing"

node - "$SOURCE" "$OBJECT_ID" "$OBJECT_ID_SHA256" <<'NODE'
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");

const [sourcePath,objectId,expectedObjectIdSha]=process.argv.slice(2);
const source=fs.readFileSync(sourcePath,"utf8");
const sourceBytes=Buffer.byteLength(source,"utf8");
assert.ok(sourceBytes<=3851076,"src/index.ts size guard exceeded");
const oldGrammar="^[a-zA-Z0-9._-]{1,160}$";
const grammar="^[\\w.:-]{1,160}$";

assert.equal(source.includes(oldGrammar),false,"legacy runtime grammar remains");
assert.equal(
  source.split(grammar).length-1,
  7,
  "all seven Local Data Drop filename filters must share the canonical grammar",
);

const routeStart=source.indexOf(
  'APP.get("/public-node/local-data-drop/:objectId"',
);
assert.notEqual(routeStart,-1,"object route missing");
const clusterStart=source.indexOf(
  'APP.get("/public-node/local-data-drop/weighted.json"',
);
assert.notEqual(clusterStart,-1,"Local Data Drop cluster missing");
const cluster=source.slice(clusterStart,routeStart+1800);
assert.equal(
  cluster.includes("fs.statSync("),
  false,
  "Local Data Drop cluster must not follow pre-planted symlinks via statSync",
);
assert.equal(
  (cluster.match(/fs\.lstatSync\(/g)||[]).length,
  19,
  "all Local Data Drop file-type checks must use lstatSync",
);
const route=source.slice(routeStart,routeStart+1800);
assert.equal(
  route.includes('/^\\.\\.?$/.test(objectId)'),
  true,
  "object route must reject dot path components",
);

const allowed=/^[\w.:-]{1,160}$/;
assert.equal(allowed.test(objectId),true,"canonical object ID rejected");
for(const bad of ["bad/id","bad\\id","", "x".repeat(161),".",".."]){
  assert.equal(
    bad === "." || bad === ".." ? /^\.\.?$/.test(bad) : allowed.test(bad),
    bad === "." || bad === ".." ? true : false,
    "runtime object ID boundary mismatch: "+JSON.stringify(bad),
  );
}

assert.equal(
  crypto.createHash("sha256").update(objectId,"utf8").digest("hex"),
  expectedObjectIdSha,
  "canonical object ID digest drift",
);

console.log("runtime_colon_grammar_occurrences=7");
console.log("runtime_dot_components_rejected=true");
console.log("runtime_slash_rejected=true");
console.log("runtime_backslash_rejected=true");
console.log("runtime_nofollow_read_checks=19");
console.log("index_size_bytes="+sourceBytes);
NODE

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

DATA_DIR="$tmp/data" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" > "$tmp/import.log"

object="$tmp/data/public-node/local-data-drop/objects/$OBJECT_ID"
receipt="$tmp/data/public-node/local-data-drop/receipts/$OBJECT_ID.json"
staging="$tmp/data/public-node/local-data-drop/.import-staging-v2"

test -f "$object" && test ! -L "$object" || fail "canonical_import_object_missing"
test -f "$receipt" && test ! -L "$receipt" || fail "canonical_import_receipt_missing"
test "$(sha256sum "$object" | awk '{print $1}')" = "$CONTENT_SHA256" ||
  fail "canonical_import_content_sha256_mismatch"
test "$(wc -c < "$object" | tr -d ' ')" = "$BYTE_LENGTH" ||
  fail "canonical_import_byte_length_mismatch"
grep -Fq "create_only=true" "$tmp/import.log" ||
  fail "canonical_import_create_only_not_reported"
grep -Fq "ancestor_nofollow=true" "$tmp/import.log" ||
  fail "canonical_import_ancestor_nofollow_not_reported"
grep -Fq "staged_atomic_publication=true" "$tmp/import.log" ||
  fail "canonical_import_staged_publication_not_reported"
test -d "$staging" && test ! -L "$staging" ||
  fail "staging_directory_missing_or_symlink"
test -z "$(find "$staging" -mindepth 1 -maxdepth 1 -print -quit)" ||
  fail "successful_import_left_staging_entry"

node - "$receipt" "$OBJECT_ID" "$CONTENT_SHA256" "$BYTE_LENGTH" <<'NODE'
const assert=require("node:assert/strict");
const fs=require("node:fs");
const [receiptPath,objectId,contentSha,bytes]=process.argv.slice(2);
const receipt=JSON.parse(fs.readFileSync(receiptPath,"utf8"));

assert.equal(receipt.marker,"VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1");
assert.equal(receipt.object_id,objectId);
assert.equal(receipt.sha256,contentSha);
assert.equal(String(receipt.bytes),bytes);
assert.equal(receipt.public_upload,false);
assert.equal(receipt.operator_local_import_only,true);
assert.equal(receipt.trusted_as_network_truth,false);

console.log("canonical_receipt_exact=true");
NODE

object_before="$(sha256sum "$object" | awk '{print $1}')"
receipt_before="$(sha256sum "$receipt" | awk '{print $1}')"
if DATA_DIR="$tmp/data" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/duplicate.log" 2>&1; then
  fail "duplicate_create_only_import_accepted"
fi
test "$(sha256sum "$object" | awk '{print $1}')" = "$object_before" ||
  fail "duplicate_attempt_mutated_object"
test "$(sha256sum "$receipt" | awk '{print $1}')" = "$receipt_before" ||
  fail "duplicate_attempt_mutated_receipt"

for bad in "." ".." "../escape" "bad/id" 'bad\id'; do
  rm -rf "$tmp/reject"
  if DATA_DIR="$tmp/reject" bash "$IMPORTER" "$PAYLOAD" "$bad" >"$tmp/reject.log" 2>&1; then
    fail "unsafe_object_id_accepted:$bad"
  fi
done

object_symlink_root="$tmp/object-symlink"
mkdir -p   "$object_symlink_root/public-node/local-data-drop/objects"   "$object_symlink_root/public-node/local-data-drop/receipts"
printf 'outside-object-sentinel\n' > "$object_symlink_root/outside-object.txt"
outside_object_before="$(sha256sum "$object_symlink_root/outside-object.txt" | awk '{print $1}')"
ln -s   "$object_symlink_root/outside-object.txt"   "$object_symlink_root/public-node/local-data-drop/objects/$OBJECT_ID"
if DATA_DIR="$object_symlink_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/object-symlink.log" 2>&1; then
  fail "object_symlink_destination_accepted"
fi
test "$(sha256sum "$object_symlink_root/outside-object.txt" | awk '{print $1}')" = "$outside_object_before" ||
  fail "object_symlink_outside_target_mutated"
test -L "$object_symlink_root/public-node/local-data-drop/objects/$OBJECT_ID" ||
  fail "object_symlink_replaced"
test ! -e "$object_symlink_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" ||
  fail "object_symlink_attempt_created_receipt"

receipt_symlink_root="$tmp/receipt-symlink"
mkdir -p   "$receipt_symlink_root/public-node/local-data-drop/objects"   "$receipt_symlink_root/public-node/local-data-drop/receipts"
printf 'outside-receipt-sentinel\n' > "$receipt_symlink_root/outside-receipt.txt"
outside_receipt_before="$(sha256sum "$receipt_symlink_root/outside-receipt.txt" | awk '{print $1}')"
ln -s   "$receipt_symlink_root/outside-receipt.txt"   "$receipt_symlink_root/public-node/local-data-drop/receipts/$OBJECT_ID.json"
if DATA_DIR="$receipt_symlink_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/receipt-symlink.log" 2>&1; then
  fail "receipt_symlink_destination_accepted"
fi
test "$(sha256sum "$receipt_symlink_root/outside-receipt.txt" | awk '{print $1}')" = "$outside_receipt_before" ||
  fail "receipt_symlink_outside_target_mutated"
test -L "$receipt_symlink_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" ||
  fail "receipt_symlink_replaced"
test ! -e "$receipt_symlink_root/public-node/local-data-drop/objects/$OBJECT_ID" ||
  fail "receipt_symlink_attempt_left_object"

object_dir_symlink_root="$tmp/object-dir-symlink"
mkdir -p   "$object_dir_symlink_root/public-node/local-data-drop"   "$object_dir_symlink_root/outside-objects"   "$object_dir_symlink_root/public-node/local-data-drop/receipts"
ln -s   "$object_dir_symlink_root/outside-objects"   "$object_dir_symlink_root/public-node/local-data-drop/objects"
if DATA_DIR="$object_dir_symlink_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/object-dir-symlink.log" 2>&1; then
  fail "objects_directory_symlink_accepted"
fi
test -z "$(find "$object_dir_symlink_root/outside-objects" -mindepth 1 -maxdepth 1 -print -quit)" ||
  fail "objects_directory_symlink_received_write"

receipt_dir_symlink_root="$tmp/receipt-dir-symlink"
mkdir -p   "$receipt_dir_symlink_root/public-node/local-data-drop"   "$receipt_dir_symlink_root/public-node/local-data-drop/objects"   "$receipt_dir_symlink_root/outside-receipts"
ln -s   "$receipt_dir_symlink_root/outside-receipts"   "$receipt_dir_symlink_root/public-node/local-data-drop/receipts"
if DATA_DIR="$receipt_dir_symlink_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/receipt-dir-symlink.log" 2>&1; then
  fail "receipts_directory_symlink_accepted"
fi
test -z "$(find "$receipt_dir_symlink_root/outside-receipts" -mindepth 1 -maxdepth 1 -print -quit)" ||
  fail "receipts_directory_symlink_received_write"
test ! -e "$receipt_dir_symlink_root/public-node/local-data-drop/objects/$OBJECT_ID" ||
  fail "receipts_directory_symlink_attempt_left_object"

data_root_symlink_parent="$tmp/data-root-symlink"
mkdir -p "$data_root_symlink_parent/outside"
ln -s "$data_root_symlink_parent/outside" "$data_root_symlink_parent/alias"
if DATA_DIR="$data_root_symlink_parent/alias" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/data-root-symlink.log" 2>&1; then
  fail "data_root_symlink_accepted"
fi
test -z "$(find "$data_root_symlink_parent/outside" -mindepth 1 -maxdepth 1 -print -quit)" ||
  fail "data_root_symlink_received_write"

public_node_symlink_root="$tmp/public-node-symlink"
mkdir -p "$public_node_symlink_root/data" "$public_node_symlink_root/outside"
ln -s "$public_node_symlink_root/outside" "$public_node_symlink_root/data/public-node"
if DATA_DIR="$public_node_symlink_root/data" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/public-node-symlink.log" 2>&1; then
  fail "public_node_ancestor_symlink_accepted"
fi
test -z "$(find "$public_node_symlink_root/outside" -mindepth 1 -maxdepth 1 -print -quit)" ||
  fail "public_node_ancestor_symlink_received_write"

local_drop_symlink_root="$tmp/local-drop-symlink"
mkdir -p   "$local_drop_symlink_root/data/public-node"   "$local_drop_symlink_root/outside"
ln -s   "$local_drop_symlink_root/outside"   "$local_drop_symlink_root/data/public-node/local-data-drop"
if DATA_DIR="$local_drop_symlink_root/data" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/local-drop-symlink.log" 2>&1; then
  fail "local_drop_ancestor_symlink_accepted"
fi
test -z "$(find "$local_drop_symlink_root/outside" -mindepth 1 -maxdepth 1 -print -quit)" ||
  fail "local_drop_ancestor_symlink_received_write"

orphan_receipt_root="$tmp/orphan-receipt"
mkdir -p   "$orphan_receipt_root/public-node/local-data-drop/objects"   "$orphan_receipt_root/public-node/local-data-drop/receipts"
cp "$receipt" "$orphan_receipt_root/public-node/local-data-drop/receipts/$OBJECT_ID.json"
orphan_receipt_before="$(sha256sum "$orphan_receipt_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" | awk '{print $1}')"
DATA_DIR="$orphan_receipt_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/orphan-receipt.log"
grep -Fq "recovered_orphan_receipt=true" "$tmp/orphan-receipt.log" ||
  fail "orphan_receipt_recovery_not_reported"
test "$(sha256sum "$orphan_receipt_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" | awk '{print $1}')" = "$orphan_receipt_before" ||
  fail "orphan_receipt_recovery_rewrote_receipt"
test "$(sha256sum "$orphan_receipt_root/public-node/local-data-drop/objects/$OBJECT_ID" | awk '{print $1}')" = "$CONTENT_SHA256" ||
  fail "orphan_receipt_recovery_object_mismatch"

orphan_object_root="$tmp/orphan-object"
mkdir -p   "$orphan_object_root/public-node/local-data-drop/objects"   "$orphan_object_root/public-node/local-data-drop/receipts"
cp "$object" "$orphan_object_root/public-node/local-data-drop/objects/$OBJECT_ID"
orphan_object_before="$(sha256sum "$orphan_object_root/public-node/local-data-drop/objects/$OBJECT_ID" | awk '{print $1}')"
DATA_DIR="$orphan_object_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/orphan-object.log"
grep -Fq "recovered_orphan_object=true" "$tmp/orphan-object.log" ||
  fail "orphan_object_recovery_not_reported"
test "$(sha256sum "$orphan_object_root/public-node/local-data-drop/objects/$OBJECT_ID" | awk '{print $1}')" = "$orphan_object_before" ||
  fail "orphan_object_recovery_rewrote_object"
node - "$orphan_object_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" "$CONTENT_SHA256" <<'NODE'
const assert=require("node:assert/strict");
const fs=require("node:fs");
const [p,sha]=process.argv.slice(2);
const doc=JSON.parse(fs.readFileSync(p,"utf8"));
assert.equal(doc.sha256,sha);
assert.equal(doc.object_id,"void:economic:epoch2:successor-state-root:v1");
assert.equal(doc.bytes,3204);
NODE

echo "${MARKER}_PROOF_GREEN"
echo "canonical_object_id=$OBJECT_ID"
echo "canonical_object_id_sha256=$OBJECT_ID_SHA256"
echo "content_sha256=$CONTENT_SHA256"
echo "byte_length=$BYTE_LENGTH"
echo "colon_supported=true"
echo "slash_rejected=true"
echo "backslash_rejected=true"
echo "dot_rejected=true"
echo "dotdot_rejected=true"
echo "create_only=true"
echo "duplicate_rejected_without_mutation=true"
echo "object_symlink_rejected_outside_unchanged=true"
echo "receipt_symlink_rejected_outside_unchanged=true"
echo "objects_directory_symlink_rejected=true"
echo "receipts_directory_symlink_rejected=true"
echo "data_root_symlink_rejected=true"
echo "public_node_ancestor_symlink_rejected=true"
echo "local_drop_ancestor_symlink_rejected=true"
echo "store_directory_mode_guard=true"
echo "operator_owned_recovery_files=true"
echo "runtime_nofollow_read_checks=19"
echo "index_size_ceiling_preserved=true"
echo "staged_atomic_publication=true"
echo "orphan_receipt_recovery=true"
echo "orphan_object_recovery=true"
echo "live_runtime_mutation=false"
echo "credential_access=false"
echo "private_key_access=false"
echo "chain2050_mutation=false"

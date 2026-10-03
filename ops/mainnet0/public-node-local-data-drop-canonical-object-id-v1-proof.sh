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
READER="src/http/public_node_local_data_drop_file_v1.ts"
DEMO003_INTAKE="ops/mainnet0/public-node-local-data-drop-demo003-folder-intake.sh"
DEMO003_STATUS="ops/mainnet0/public-node-local-data-drop-demo003-folder-intake-status.sh"

fail() {
  printf '%s HOLD: %s\n' "$MARKER" "$*" >&2
  exit 1
}

test -f "$PAYLOAD" && test ! -L "$PAYLOAD" || fail "payload_missing_or_symlink"
test -f "$IMPORTER" && test ! -L "$IMPORTER" || fail "importer_missing_or_symlink"
test -f "$SOURCE" && test ! -L "$SOURCE" || fail "source_missing_or_symlink"
test -f "$READER" && test ! -L "$READER" || fail "reader_missing_or_symlink"
test -x "$DEMO003_INTAKE" && test ! -L "$DEMO003_INTAKE" || fail "demo003_intake_missing_or_symlink"
test -x "$DEMO003_STATUS" && test ! -L "$DEMO003_STATUS" || fail "demo003_status_missing_or_symlink"

bash -n "$IMPORTER" || fail "importer_shell_syntax"
test "$(grep -Foc 'VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SECURE_STAGED_CREATE_ONLY_V2' "$IMPORTER")" = "1" ||
  fail "importer_v2_marker_not_unique"
test "$(grep -Foc 'python3 - "$SRC" "$DATA_DIR" "$OBJECT_ID"' "$IMPORTER")" = "1" ||
  fail "importer_python_body_not_unique"

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
grep -Fq 'fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)' "$IMPORTER" ||
  fail "staging_global_lock_missing"
grep -Fq 'def reclaim_staging(staging_fd):' "$IMPORTER" ||
  fail "stale_staging_reclaimer_missing"
grep -Fq 'group_or_world_writable' "$IMPORTER" ||
  fail "store_directory_mode_guard_missing"
grep -Fq 'not_owned_by_operator' "$IMPORTER" ||
  fail "operator_ownership_guard_missing"
grep -Fq 'def open_source(path):' "$IMPORTER" ||
  fail "secure_source_walk_missing"
grep -Fq 'f"source_dir_component_{idx}"' "$IMPORTER" ||
  fail "source_ancestor_nofollow_walk_missing"
grep -Fq 'before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)' "$IMPORTER" ||
  fail "source_final_nofollow_stat_missing"
grep -Fq 'fd = os.open(name, READ_FLAGS, dir_fd=parent_fd)' "$IMPORTER" ||
  fail "source_final_dirfd_open_missing"
if grep -Fq 'sha256sum "$SRC"' "$IMPORTER"; then
  fail "shell_source_hash_read_remains"
fi
grep -Fq 'object_id = f"{expected_sha[:16]}-' "$IMPORTER" ||
  fail "secure_default_object_id_derivation_missing"
grep -Fq 'idx == len(parts) - 1' "$IMPORTER" || fail "data_root_final_component_custody_missing"
grep -Fq 'idx == len(parts) - 1' "$IMPORTER" || fail "data_root_final_component_custody_missing"
grep -Fq 'require_rename_protected_parent' "$IMPORTER" || fail "data_root_parent_custody_guard_missing"
grep -Fq 'stat.S_ISVTX' "$IMPORTER" || fail "data_root_parent_sticky_exception_missing"
grep -Fq 'group_or_world_writable_without_sticky' "$IMPORTER" || fail "data_root_parent_write_guard_missing"
grep -Fq 'data_dir_parent_{idx}' "$IMPORTER" || fail "data_root_all_ancestor_guard_missing"
grep -Fq 'owner_not_operator_or_root' "$IMPORTER" || fail "data_root_parent_owner_guard_missing"
grep -Fq 'owner_not_operator_or_root' "$DEMO003_INTAKE" || fail "demo003_intake_parent_owner_guard_missing"
grep -Fq 'owner_not_operator_or_root' "$DEMO003_STATUS" || fail "demo003_status_parent_owner_guard_missing"
grep -Fq 'require_rename_protected_parent(fd, f"data_dir_parent_{idx}")' "$DEMO003_INTAKE" || fail "demo003_intake_all_ancestor_guard_missing"
grep -Fq 'require_rename_protected_parent(fd,f"data_dir_parent_{idx}")' "$DEMO003_STATUS" || fail "demo003_status_all_ancestor_guard_missing"
grep -Fq 'renameProtectedDirectoryV1(fs.fstatSync(fd, { bigint: true }), euid)' "$READER" || fail "reader_all_ancestor_guard_missing"
grep -Fq 'st.uid !== euid && st.uid !== 0n' "$READER" || fail "reader_parent_owner_guard_missing"
grep -Fq 'resolved = os.path.abspath(path)' "$IMPORTER" || fail "data_root_relative_anchor_resolution_missing"
grep -Fq 'fd = os.open("/", DIR_FLAGS)' "$IMPORTER" || fail "data_root_absolute_root_walk_missing"
grep -Fq 'resolved = os.path.abspath(data_dir)' "$DEMO003_INTAKE" || fail "demo003_intake_relative_anchor_resolution_missing"
grep -Fq 'fd = os.open("/", FLAGS)' "$DEMO003_INTAKE" || fail "demo003_intake_absolute_root_walk_missing"
grep -Fq 'resolved=os.path.abspath(path)' "$DEMO003_STATUS" || fail "demo003_status_relative_anchor_resolution_missing"
grep -Fq 'fd=os.open("/",DIR_FLAGS)' "$DEMO003_STATUS" || fail "demo003_status_absolute_root_walk_missing"
grep -Fq 'type(doc.get("bytes")) is not int' "$IMPORTER" ||
  fail "receipt_exact_int_type_guard_missing"
grep -Fq 'type(doc.get(key)) is not bool' "$IMPORTER" ||
  fail "receipt_exact_bool_type_guard_missing"
grep -Fq 'type(doc.get(key)) is not str' "$IMPORTER" ||
  fail "receipt_exact_string_type_guard_missing"
grep -Fq 'after.st_mode & 0o022' "$IMPORTER" || fail "recovery_file_write_mode_guard_missing"
grep -Fq 'after.st_nlink != 1' "$IMPORTER" || fail "recovery_file_link_count_guard_missing"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DIRECT_READ_V1" "$READER" || fail "reader_marker_missing"
grep -Fq "O_NOFOLLOW" "$READER" || fail "reader_nofollow_missing"
grep -Fq "/proc/self/fd" "$READER" || fail "reader_ancestor_fd_walk_missing"
grep -Fq 'listed.nlink !== 1n' "$READER" || fail "reader_link_count_guard_missing"
grep -Fq '(listed.mode & 0o022n) !== 0n' "$READER" || fail "reader_write_mode_guard_missing"
grep -Fq 'parentStat.uid !== euid' "$READER" || fail "reader_parent_owner_guard_missing"
grep -Fq '(parentStat.mode & 0o022n) !== 0n' "$READER" || fail "reader_parent_write_mode_guard_missing"
grep -Fq 'listed.uid !== euid' "$READER" || fail "reader_file_owner_guard_missing"
grep -Fq 'demo003_publication_ancestry_secure=true' "$DEMO003_INTAKE" || fail "demo003_publication_ancestry_guard_missing"
grep -Fq 'demo003_publication_ancestry_safe=true' "$DEMO003_STATUS" || fail "demo003_status_ancestry_guard_missing"
grep -Fq "RENAME_EXCHANGE = 2" "$DEMO003_INTAKE" || fail "demo003_atomic_exchange_missing"
grep -Fq 'find "$LATEST_STAGE" -type f -exec chmod 0644 {} +' "$DEMO003_INTAKE" || fail "demo003_file_mode_normalization_missing"
grep -Fq 'find "$LATEST_STAGE" -type d -exec chmod 0755 {} +' "$DEMO003_INTAKE" || fail "demo003_directory_mode_normalization_missing"
grep -Fq 'find "$LATEST_STAGE" -type f -perm /022' "$DEMO003_INTAKE" || fail "demo003_writable_file_guard_missing"
grep -Fq 'LOCK_FILE="$INTAKE_DIR/.intake-lock-v1"' "$DEMO003_INTAKE" || fail "demo003_intake_lock_missing"
grep -Fq 'flock -w "$LOCK_WAIT_SECONDS" "$LOCK_FD"' "$DEMO003_INTAKE" || fail "demo003_intake_flock_missing"
grep -Fq "test \"\$(stat -c '%a' \"\$LOCK_FILE\")\" = \"600\"" "$DEMO003_INTAKE" || fail "demo003_intake_lock_mode_guard_missing"
grep -Fq 'RUN_TOKEN=' "$DEMO003_INTAKE" || fail "demo003_run_token_missing"
grep -Fq 'run_identity_collision_resistant=true' "$DEMO003_INTAKE" || fail "demo003_run_identity_marker_missing"
grep -Fq 'O_NOFOLLOW' "$DEMO003_STATUS" || fail "demo003_status_nofollow_missing"
grep -Fq 'data_dir_component_' "$DEMO003_STATUS" || fail "demo003_status_component_walk_missing"
grep -Fq 'VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false' "$DEMO003_STATUS" || fail "demo003_status_false_marker_missing"
grep -Fq 'EXPECTED_LATEST_NAMES=' "$DEMO003_STATUS" || fail "demo003_status_exact_latest_member_set_missing"
grep -Fq 'EXPECTED_PAYLOAD_NAMES=' "$DEMO003_STATUS" || fail "demo003_status_exact_payload_member_set_missing"
if grep -Fq 'record.get("source_manifest")!=manifest' "$DEMO003_STATUS"; then fail "demo003_status_raw_manifest_binding_remains"; fi
grep -Fq 'checksum_entries!=observed_hashes' "$DEMO003_STATUS" || fail "demo003_status_checksum_recompute_missing"
grep -Fq 'payload_sha256_mismatch' "$DEMO003_STATUS" || fail "demo003_status_payload_digest_guard_missing"
grep -Fq 'type(record_file_count) is not int' "$DEMO003_STATUS" || fail "demo003_status_intake_file_count_type_guard_missing"
grep -Fq 'type(manifest_file_count) is not int' "$DEMO003_STATUS" || fail "demo003_status_manifest_file_count_type_guard_missing"
grep -Fq 'allow_nan=False' "$DEMO003_STATUS" || fail "demo003_status_canonical_json_strictness_missing"
grep -Fq 'canonical_json(record.get("source_manifest"))!=canonical_json(manifest)' "$DEMO003_STATUS" || fail "demo003_status_type_exact_manifest_binding_missing"
if grep -Fq 'ln -s "$(realpath "$ARCHIVE")" "$LATEST"' "$DEMO003_INTAKE"; then fail "demo003_legacy_latest_symlink_remains"; fi

node - "$SOURCE" "$READER" "$OBJECT_ID" "$OBJECT_ID_SHA256" <<'NODE'
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const fs=require("node:fs");

const [sourcePath,readerPath,objectId,expectedObjectIdSha]=process.argv.slice(2);
const source=fs.readFileSync(sourcePath,"utf8");
const reader=fs.readFileSync(readerPath,"utf8");
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
assert.equal((cluster.match(/\brf\(/g)||[]).length,15,"all Local Data Drop public reads use descriptor helper");
assert.equal(cluster.includes("fs.readFileSync("),false,"Local Data Drop cluster retains pathname read");
assert.equal((cluster.match(/\bldn\(dropDir\)/g)||[]).length,6,"all Local Data Drop directory listings must be descriptor-bound");
assert.equal(cluster.includes("fs.readdirSync(dropDir)"),false,"Local Data Drop cluster retains pathname directory listing");
assert.equal(cluster.includes("fs.mkdirSync(dropDir"),false,"public Local Data Drop routes must not create object storage");
assert.equal(cluster.includes("fs.mkdirSync(receiptDir"),false,"public Local Data Drop routes must not create receipt storage");
assert.equal(cluster.includes(".import-staging-v2"),false,"public runtime must not mount importer staging");
for(const needle of ["VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DIRECT_READ_V1","listDirectDirectoryNamesV1","fs.readdirSync(procPath","/proc/self/fd","O_NOFOLLOW","O_DIRECTORY","fs.openSync(procPath","fs.fstatSync(fd","fs.readFileSync(fd)","fs.lstatSync(procPath","fs.closeSync(parent.fd)"]){
  assert.equal(reader.includes(needle),true,"reader contract missing "+needle);
}
const demoManifestStart=source.indexOf('APP.get("/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json"');
const demoManifestEnd=source.indexOf('APP.get("/public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/:fileName"',demoManifestStart);
assert.notEqual(demoManifestStart,-1,"Demo003 manifest route missing");
assert.notEqual(demoManifestEnd,-1,"Demo003 file route boundary missing");
const demoManifestRoute=source.slice(demoManifestStart,demoManifestEnd);
assert.equal(demoManifestRoute.includes("const manifestBytes=rf(manifestPath);"),true,"Demo003 manifest must use custody reader");
assert.equal(demoManifestRoute.includes("demo003_folder_fixture_missing_or_unsafe"),true,"Demo003 manifest must fail closed on custody rejection");
assert.ok(demoManifestRoute.indexOf("demo003_folder_fixture_missing_or_unsafe")<demoManifestRoute.indexOf("demo003_folder_fixture_served"),"Demo003 manifest success must follow custody rejection guard");

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
console.log("runtime_descriptor_bound_read_calls=15");
console.log("runtime_pathname_reads=0");
console.log("runtime_descriptor_bound_directory_lists=6");
console.log("runtime_route_storage_mutation=false");
console.log("runtime_ancestor_descriptor_walk=true");
console.log("staging_absent_from_public_runtime=true");
console.log("index_size_bytes="+sourceBytes);
NODE

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

demo003_missing_data="$tmp/demo003-missing-data"
if DATA_DIR="$demo003_missing_data" bash "$DEMO003_STATUS" >"$tmp/demo003-missing-status.log" 2>&1; then fail "demo003_missing_status_unexpected_green"; fi
grep -Fq "status=demo003_folder_intake_missing_or_unsafe_latest" "$tmp/demo003-missing-status.log" || fail "demo003_missing_status_machine_state_missing"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false" "$tmp/demo003-missing-status.log" || fail "demo003_missing_status_false_marker_missing"
test ! -e "$demo003_missing_data" || fail "demo003_missing_status_mutated_tree"

demo003_fresh_data="$tmp/demo003-fresh-data"
demo003_fresh_out="$tmp/demo003-fresh-intake"
(
  umask 0000
  DATA_DIR="$demo003_fresh_data" OUT="$demo003_fresh_out" bash "$DEMO003_INTAKE"
) >"$tmp/demo003-fresh-intake.log"
demo003_fresh_base="$demo003_fresh_data/public-node/local-data-drop-demo003-folder-fixtures"
for d in   "$demo003_fresh_data"   "$demo003_fresh_data/public-node"   "$demo003_fresh_base"   "$demo003_fresh_base/archive"; do
  test -d "$d" && test ! -L "$d" || fail "demo003_fresh_ancestry_not_direct_directory:$d"
  test "$(stat -c '%u' "$d")" = "$(id -u)" || fail "demo003_fresh_ancestry_wrong_owner:$d"
  test -z "$(find "$d" -maxdepth 0 -perm /022 -print -quit)" || fail "demo003_fresh_ancestry_writable:$d"
done
grep -Fq "demo003_publication_ancestry_secure=true" "$tmp/demo003-fresh-intake.log" ||
  fail "demo003_fresh_ancestry_not_reported"
DATA_DIR="$demo003_fresh_data" bash "$DEMO003_STATUS" >"$tmp/demo003-fresh-status.log"
grep -Fq "demo003_publication_ancestry_safe=true" "$tmp/demo003-fresh-status.log" ||
  fail "demo003_fresh_status_ancestry_not_safe"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true" "$tmp/demo003-fresh-status.log" ||
  fail "demo003_fresh_status_not_green"

demo003_fresh_intake_sha="$(sha256sum "$demo003_fresh_base/latest/intake.json" | awk '{print $1}')"

demo003_missing_member_data="$tmp/demo003-status-missing-member-data"
cp -a "$demo003_fresh_data" "$demo003_missing_member_data"
rm "$demo003_missing_member_data/public-node/local-data-drop-demo003-folder-fixtures/latest/files/README.txt"
test "$(sha256sum "$demo003_missing_member_data/public-node/local-data-drop-demo003-folder-fixtures/latest/intake.json" | awk '{print $1}')" = "$demo003_fresh_intake_sha" ||
  fail "demo003_missing_member_intake_changed"
if DATA_DIR="$demo003_missing_member_data" bash "$DEMO003_STATUS" >"$tmp/demo003-status-missing-member.log" 2>&1; then
  fail "demo003_missing_member_status_unexpected_green"
fi
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false" "$tmp/demo003-status-missing-member.log" ||
  fail "demo003_missing_member_status_false_marker_missing"

demo003_corrupt_member_data="$tmp/demo003-status-corrupt-member-data"
cp -a "$demo003_fresh_data" "$demo003_corrupt_member_data"
printf '\ncorrupt-byte\n' >> "$demo003_corrupt_member_data/public-node/local-data-drop-demo003-folder-fixtures/latest/files/index.html"
test "$(sha256sum "$demo003_corrupt_member_data/public-node/local-data-drop-demo003-folder-fixtures/latest/intake.json" | awk '{print $1}')" = "$demo003_fresh_intake_sha" ||
  fail "demo003_corrupt_member_intake_changed"
if DATA_DIR="$demo003_corrupt_member_data" bash "$DEMO003_STATUS" >"$tmp/demo003-status-corrupt-member.log" 2>&1; then
  fail "demo003_corrupt_member_status_unexpected_green"
fi
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false" "$tmp/demo003-status-corrupt-member.log" ||
  fail "demo003_corrupt_member_status_false_marker_missing"

demo003_extra_member_data="$tmp/demo003-status-extra-member-data"
cp -a "$demo003_fresh_data" "$demo003_extra_member_data"
printf 'unexpected\n' > "$demo003_extra_member_data/public-node/local-data-drop-demo003-folder-fixtures/latest/files/extra.txt"
test "$(sha256sum "$demo003_extra_member_data/public-node/local-data-drop-demo003-folder-fixtures/latest/intake.json" | awk '{print $1}')" = "$demo003_fresh_intake_sha" ||
  fail "demo003_extra_member_intake_changed"
if DATA_DIR="$demo003_extra_member_data" bash "$DEMO003_STATUS" >"$tmp/demo003-status-extra-member.log" 2>&1; then
  fail "demo003_extra_member_status_unexpected_green"
fi
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false" "$tmp/demo003-status-extra-member.log" ||
  fail "demo003_extra_member_status_false_marker_missing"

demo003_float_count_data="$tmp/demo003-status-float-count-data"
cp -a "$demo003_fresh_data" "$demo003_float_count_data"
python3 - "$demo003_float_count_data/public-node/local-data-drop-demo003-folder-fixtures/latest" <<'PY'
import hashlib
import json
import os
import sys

latest=sys.argv[1]
manifest_path=os.path.join(latest,"manifest.json")
intake_path=os.path.join(latest,"intake.json")
checksums_path=os.path.join(latest,"sha256sums.txt")

manifest=json.load(open(manifest_path,encoding="utf-8"))
manifest["file_count"]=3.0
with open(manifest_path,"w",encoding="utf-8") as f:
    json.dump(manifest,f,indent=2)
    f.write("\n")

intake=json.load(open(intake_path,encoding="utf-8"))
intake["file_count"]=3.0
intake["source_manifest"]=manifest
with open(intake_path,"w",encoding="utf-8") as f:
    json.dump(intake,f,indent=2,sort_keys=True)
    f.write("\n")

digest=hashlib.sha256(open(manifest_path,"rb").read()).hexdigest()
lines=open(checksums_path,encoding="utf-8").read().splitlines()
out=[]
found=False
for line in lines:
    if line.endswith("  ./manifest.json"):
        out.append(digest+"  ./manifest.json")
        found=True
    else:
        out.append(line)
if not found:
    raise SystemExit("manifest checksum entry missing")
with open(checksums_path,"w",encoding="utf-8") as f:
    f.write("\n".join(out)+"\n")
PY
if DATA_DIR="$demo003_float_count_data" bash "$DEMO003_STATUS" >"$tmp/demo003-status-float-count.log" 2>&1; then
  fail "demo003_float_file_count_status_unexpected_green"
fi
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false" "$tmp/demo003-status-float-count.log" ||
  fail "demo003_float_file_count_status_false_marker_missing"

demo003_nested_float_data="$tmp/demo003-status-nested-float-data"
cp -a "$demo003_fresh_data" "$demo003_nested_float_data"
python3 - "$demo003_nested_float_data/public-node/local-data-drop-demo003-folder-fixtures/latest/intake.json" <<'PY'
import json
import sys

path=sys.argv[1]
doc=json.load(open(path,encoding="utf-8"))
doc["source_manifest"]["file_count"]=3.0
with open(path,"w",encoding="utf-8") as f:
    json.dump(doc,f,indent=2,sort_keys=True)
    f.write("\n")
PY
if DATA_DIR="$demo003_nested_float_data" bash "$DEMO003_STATUS" >"$tmp/demo003-status-nested-float.log" 2>&1; then
  fail "demo003_nested_float_manifest_status_unexpected_green"
fi
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false" "$tmp/demo003-status-nested-float.log" ||
  fail "demo003_nested_float_manifest_status_false_marker_missing"

demo003_unsafe_ancestor="$tmp/demo003-unsafe-ancestor"
mkdir -p "$demo003_unsafe_ancestor/safe-parent/data"
chmod 0777 "$demo003_unsafe_ancestor"
chmod 0700 "$demo003_unsafe_ancestor/safe-parent" "$demo003_unsafe_ancestor/safe-parent/data"
if DATA_DIR="$demo003_unsafe_ancestor/safe-parent/data" OUT="$tmp/demo003-unsafe-ancestor-out" bash "$DEMO003_INTAKE" >"$tmp/demo003-unsafe-ancestor-intake.log" 2>&1; then
  fail "demo003_higher_unsafe_ancestor_intake_accepted"
fi
test ! -e "$demo003_unsafe_ancestor/safe-parent/data/public-node" ||
  fail "demo003_higher_unsafe_ancestor_received_publication"

demo003_status_unsafe_ancestor="$tmp/demo003-status-unsafe-ancestor"
mkdir -p "$demo003_status_unsafe_ancestor/safe-parent"
cp -a "$demo003_fresh_data" "$demo003_status_unsafe_ancestor/safe-parent/data"
chmod 0777 "$demo003_status_unsafe_ancestor"
chmod 0700 "$demo003_status_unsafe_ancestor/safe-parent" "$demo003_status_unsafe_ancestor/safe-parent/data"
if DATA_DIR="$demo003_status_unsafe_ancestor/safe-parent/data" bash "$DEMO003_STATUS" >"$tmp/demo003-status-unsafe-ancestor.log" 2>&1; then
  fail "demo003_higher_unsafe_ancestor_status_unexpected_green"
fi
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false" "$tmp/demo003-status-unsafe-ancestor.log" ||
  fail "demo003_higher_unsafe_ancestor_status_false_marker_missing"

demo003_relative_anchor="$tmp/demo003-relative-anchor"
mkdir -p "$demo003_relative_anchor/cwd/data"
chmod 0777 "$demo003_relative_anchor"
chmod 0700 "$demo003_relative_anchor/cwd" "$demo003_relative_anchor/cwd/data"
if (
  cd "$demo003_relative_anchor/cwd"
  DATA_DIR=data OUT="$tmp/demo003-relative-anchor-out" bash "$ROOT/$DEMO003_INTAKE" >"$tmp/demo003-relative-anchor-intake.log" 2>&1
); then
  fail "demo003_relative_data_dir_unsafe_cwd_ancestor_accepted"
fi
test ! -e "$demo003_relative_anchor/cwd/data/public-node" ||
  fail "demo003_relative_data_dir_unsafe_cwd_ancestor_received_publication"

mkdir -p "$demo003_relative_anchor/status-cwd"
cp -a "$demo003_fresh_data" "$demo003_relative_anchor/status-cwd/data"
chmod 0700 "$demo003_relative_anchor/status-cwd" "$demo003_relative_anchor/status-cwd/data"
if (
  cd "$demo003_relative_anchor/status-cwd"
  DATA_DIR=data bash "$ROOT/$DEMO003_STATUS" >"$tmp/demo003-relative-anchor-status.log" 2>&1
); then
  fail "demo003_relative_status_unsafe_cwd_ancestor_unexpected_green"
fi
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false" "$tmp/demo003-relative-anchor-status.log" ||
  fail "demo003_relative_status_unsafe_cwd_ancestor_false_marker_missing"

demo003_status_symlink_data="$tmp/demo003-status-symlink-data"
demo003_status_outside="$tmp/demo003-status-outside-public-node"
cp -a "$demo003_fresh_data" "$demo003_status_symlink_data"
mv "$demo003_status_symlink_data/public-node" "$demo003_status_outside"
ln -s "$demo003_status_outside" "$demo003_status_symlink_data/public-node"
if DATA_DIR="$demo003_status_symlink_data" bash "$DEMO003_STATUS" >"$tmp/demo003-status-symlink.log" 2>&1; then fail "demo003_status_ancestor_symlink_unexpected_green"; fi
grep -Fq "demo003_publication_ancestry_safe=false" "$tmp/demo003-status-symlink.log" || fail "demo003_status_ancestor_symlink_safe_false_missing"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false" "$tmp/demo003-status-symlink.log" || fail "demo003_status_ancestor_symlink_false_marker_missing"

demo003_concurrent_data="$tmp/demo003-concurrent-data"
demo003_concurrent_out1="$tmp/demo003-concurrent-out-1"
demo003_concurrent_out2="$tmp/demo003-concurrent-out-2"
DEMO003_STAMP=20261003-020000 DATA_DIR="$demo003_concurrent_data" OUT="$demo003_concurrent_out1" bash "$DEMO003_INTAKE" >"$tmp/demo003-concurrent-1.log" 2>&1 &
demo003_pid1=$!
DEMO003_STAMP=20261003-020000 DATA_DIR="$demo003_concurrent_data" OUT="$demo003_concurrent_out2" bash "$DEMO003_INTAKE" >"$tmp/demo003-concurrent-2.log" 2>&1 &
demo003_pid2=$!
if ! wait "$demo003_pid1"; then fail "demo003_concurrent_first_failed"; fi
if ! wait "$demo003_pid2"; then fail "demo003_concurrent_second_failed"; fi
demo003_run1="$(grep -m1 '^run_id=' "$tmp/demo003-concurrent-1.log" | cut -d= -f2-)"
demo003_run2="$(grep -m1 '^run_id=' "$tmp/demo003-concurrent-2.log" | cut -d= -f2-)"
test -n "$demo003_run1" && test -n "$demo003_run2" && test "$demo003_run1" != "$demo003_run2" || fail "demo003_concurrent_run_ids_not_distinct"
grep -Fq "intake_lock_serialized=true" "$tmp/demo003-concurrent-1.log" || fail "demo003_concurrent_first_lock_marker_missing"
grep -Fq "intake_lock_serialized=true" "$tmp/demo003-concurrent-2.log" || fail "demo003_concurrent_second_lock_marker_missing"
demo003_concurrent_base="$demo003_concurrent_data/public-node/local-data-drop-demo003-folder-fixtures"
demo003_concurrent_archives="$(find "$demo003_concurrent_base/archive" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
test "$demo003_concurrent_archives" = "2" || fail "demo003_concurrent_archive_count:$demo003_concurrent_archives"
test -z "$(find "$demo003_concurrent_base" -mindepth 1 -maxdepth 1 -name '.latest-stage-*' -print -quit)" || fail "demo003_concurrent_stage_residue"
demo003_concurrent_lock="$demo003_concurrent_base/.intake-lock-v1"
test -f "$demo003_concurrent_lock" && test ! -L "$demo003_concurrent_lock" || fail "demo003_concurrent_lock_not_regular"
test "$(stat -c '%u' "$demo003_concurrent_lock")" = "$(id -u)" || fail "demo003_concurrent_lock_wrong_owner"
test "$(stat -c '%a' "$demo003_concurrent_lock")" = "600" || fail "demo003_concurrent_lock_wrong_mode"
flock -n "$demo003_concurrent_lock" true || fail "demo003_concurrent_lock_still_held"
DATA_DIR="$demo003_concurrent_data" bash "$DEMO003_STATUS" >"$tmp/demo003-concurrent-status.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true" "$tmp/demo003-concurrent-status.log" || fail "demo003_concurrent_final_status_not_green"

demo003_lock_ready="$tmp/demo003-lock-holder-ready"
python3 - "$demo003_concurrent_lock" "$demo003_lock_ready" <<'PY' &
import fcntl, os, sys, time
lock_path, ready_path = sys.argv[1], sys.argv[2]
fd = os.open(lock_path, os.O_RDWR | getattr(os, "O_NOFOLLOW", 0))
fcntl.flock(fd, fcntl.LOCK_EX)
with open(ready_path, "w", encoding="utf-8") as handle:
    handle.write("ready\n")
    handle.flush()
    os.fsync(handle.fileno())
time.sleep(60)
PY
demo003_lock_holder=$!
for _ in $(seq 1 100); do
  test -f "$demo003_lock_ready" && break
  sleep 0.02
done
test -f "$demo003_lock_ready" || fail "demo003_lock_holder_not_ready"
kill -9 "$demo003_lock_holder"
wait "$demo003_lock_holder" 2>/dev/null || true
DEMO003_LOCK_WAIT_SECONDS=2 DEMO003_STAMP=20261003-020001 DATA_DIR="$demo003_concurrent_data" OUT="$tmp/demo003-after-kill" bash "$DEMO003_INTAKE" >"$tmp/demo003-after-kill.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED" "$tmp/demo003-after-kill.log" || fail "demo003_lock_not_recoverable_after_process_death"
flock -n "$demo003_concurrent_lock" true || fail "demo003_lock_held_after_recovery"

demo003_data="$tmp/demo003-data"
demo003_out="$tmp/demo003-intake"
demo003_base="$demo003_data/public-node/local-data-drop-demo003-folder-fixtures"
mkdir -p "$demo003_base/archive/legacy"
printf 'legacy\n' > "$demo003_base/archive/legacy/legacy.txt"
ln -s "$(realpath "$demo003_base/archive/legacy")" "$demo003_base/latest"

(
  umask 0000
  DATA_DIR="$demo003_data" OUT="$demo003_out" bash "$DEMO003_INTAKE"
) >"$tmp/demo003-intake.log"
test -d "$demo003_base/latest" && test ! -L "$demo003_base/latest" ||
  fail "demo003_latest_not_real_directory"
grep -Fq "latest_atomic_publish=true" "$tmp/demo003-intake.log" ||
  fail "demo003_atomic_publish_not_reported"
grep -Fq "latest_real_directory=true" "$tmp/demo003-intake.log" ||
  fail "demo003_real_directory_not_reported"
grep -Fq "latest_symlink=false" "$tmp/demo003-intake.log" ||
  fail "demo003_symlink_retirement_not_reported"
test -f "$demo003_base/latest/manifest.json" ||
  fail "demo003_latest_manifest_missing"
test -f "$demo003_base/latest/intake.json" ||
  fail "demo003_latest_intake_missing"
test -f "$demo003_base/latest/files/index.html" ||
  fail "demo003_latest_index_missing"
grep -Fq "latest_stage_modes_normalized=true" "$tmp/demo003-intake.log" ||
  fail "demo003_stage_mode_normalization_not_reported"
grep -Fq "latest_file_modes_safe=true" "$tmp/demo003-intake.log" ||
  fail "demo003_safe_mode_publish_not_reported"
test -z "$(find "$demo003_base/latest" -type l -print -quit)" ||
  fail "demo003_latest_contains_symlink"
test -z "$(find "$demo003_base/latest" -type f -perm /022 -print -quit)" ||
  fail "demo003_latest_has_group_or_world_writable_file"

DATA_DIR="$demo003_data" bash "$DEMO003_STATUS" >"$tmp/demo003-status.log"
grep -Fq "latest_real_directory=true" "$tmp/demo003-status.log" ||
  fail "demo003_status_real_directory_missing"
grep -Fq "latest_symlink=false" "$tmp/demo003-status.log" ||
  fail "demo003_status_symlink_false_missing"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true" "$tmp/demo003-status.log" ||
  fail "demo003_status_not_green"

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
test -f "$staging/.import.lock" && test ! -L "$staging/.import.lock" ||
  fail "staging_lock_missing_or_symlink"
test -z "$(find "$staging" -mindepth 1 -maxdepth 1 ! -name '.import.lock' -print -quit)" ||
  fail "successful_import_left_staging_entry"
grep -Fq "reclaimed_staging_entries=0" "$tmp/import.log" ||
  fail "clean_import_reported_unexpected_staging_reclaim"

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

source_symlink_root="$tmp/source-symlink"
mkdir -p "$source_symlink_root/data"
printf 'VOID_SENTINEL_SECRET_MUST_NOT_PUBLISH\n' > "$source_symlink_root/secret.txt"
ln -s "$source_symlink_root/secret.txt" "$source_symlink_root/source-link"
if DATA_DIR="$source_symlink_root/data" bash "$IMPORTER" "$source_symlink_root/source-link" "$OBJECT_ID" >"$tmp/source-symlink.log" 2>&1; then
  fail "source_symlink_accepted"
fi
test ! -e "$source_symlink_root/data/public-node/local-data-drop/objects/$OBJECT_ID" ||
  fail "source_symlink_published_object"
test ! -e "$source_symlink_root/data/public-node/local-data-drop/receipts/$OBJECT_ID.json" ||
  fail "source_symlink_published_receipt"
if grep -R -Fq "VOID_SENTINEL_SECRET_MUST_NOT_PUBLISH" "$source_symlink_root/data" 2>/dev/null; then
  fail "source_symlink_secret_leaked_into_data_dir"
fi

source_symlink_default_root="$tmp/source-symlink-default"
mkdir -p "$source_symlink_default_root/data"
ln -s "$source_symlink_root/secret.txt" "$source_symlink_default_root/source-link"
if DATA_DIR="$source_symlink_default_root/data" bash "$IMPORTER" "$source_symlink_default_root/source-link" >"$tmp/source-symlink-default.log" 2>&1; then
  fail "source_symlink_without_object_id_accepted"
fi
if find "$source_symlink_default_root/data" -mindepth 1 -print -quit | grep -q .; then
  fail "source_symlink_without_object_id_created_data_artifacts"
fi

source_ancestor_symlink_root="$tmp/source-ancestor-symlink"
mkdir -p   "$source_ancestor_symlink_root/input"   "$source_ancestor_symlink_root/outside"
printf 'VOID_ANCESTOR_SENTINEL_SECRET_MUST_NOT_PUBLISH\n' > "$source_ancestor_symlink_root/outside/secret.txt"
ln -s   "$source_ancestor_symlink_root/outside"   "$source_ancestor_symlink_root/input/alias"
if DATA_DIR="$source_ancestor_symlink_root/data" bash "$IMPORTER" "$source_ancestor_symlink_root/input/alias/secret.txt" "$OBJECT_ID" >"$tmp/source-ancestor-symlink.log" 2>&1; then
  fail "source_ancestor_symlink_accepted"
fi
if [ -e "$source_ancestor_symlink_root/data" ] &&
   find "$source_ancestor_symlink_root/data" -mindepth 1 -print -quit | grep -q .; then
  fail "source_ancestor_symlink_created_data_artifacts"
fi

default_root="$tmp/default-object-id"
default_base="$(basename "$PAYLOAD" | tr -cd 'A-Za-z0-9._-' | cut -c1-120)"
default_id="${CONTENT_SHA256:0:16}-${default_base:-object.bin}"
DATA_DIR="$default_root" bash "$IMPORTER" "$PAYLOAD" >"$tmp/default-object-id.log"
grep -Fq "object_id=$default_id" "$tmp/default-object-id.log" ||
  fail "default_object_id_drift"
test "$(sha256sum "$default_root/public-node/local-data-drop/objects/$default_id" | awk '{print $1}')" = "$CONTENT_SHA256" ||
  fail "default_object_id_content_mismatch"
test -f "$default_root/public-node/local-data-drop/receipts/$default_id.json" ||
  fail "default_object_id_receipt_missing"

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

unsafe_data_root="$tmp/unsafe-data-root"
mkdir -p "$unsafe_data_root"
chmod 0777 "$unsafe_data_root"
if DATA_DIR="$unsafe_data_root" bash "$IMPORTER" "$PAYLOAD" "void:proof:unsafe-data-root:v1" >"$tmp/unsafe-data-root.log" 2>&1; then
  fail "group_world_writable_data_root_accepted"
fi
test ! -e "$unsafe_data_root/public-node" ||
  fail "unsafe_data_root_received_publication"

unsafe_dot_root="$tmp/unsafe-dot-root"
mkdir -p "$unsafe_dot_root"
chmod 0777 "$unsafe_dot_root"
if (
  cd "$unsafe_dot_root"
  DATA_DIR=. bash "$ROOT/$IMPORTER" "$ROOT/$PAYLOAD" "void:proof:unsafe-dot-root:v1" >"$tmp/unsafe-dot-root.log" 2>&1
); then
  fail "group_world_writable_dot_data_root_accepted"
fi
test ! -e "$unsafe_dot_root/public-node" ||
  fail "unsafe_dot_data_root_received_publication"

unsafe_data_parent="$tmp/unsafe-data-parent"
mkdir -p "$unsafe_data_parent/data"
chmod 0777 "$unsafe_data_parent"
chmod 0700 "$unsafe_data_parent/data"
if DATA_DIR="$unsafe_data_parent/data" bash "$IMPORTER" "$PAYLOAD" "void:proof:unsafe-data-parent:v1" >"$tmp/unsafe-data-parent.log" 2>&1; then
  fail "group_world_writable_nonsticky_data_parent_accepted"
fi
test ! -e "$unsafe_data_parent/data/public-node" ||
  fail "unsafe_data_parent_received_publication"

unsafe_dot_parent="$tmp/unsafe-dot-parent"
mkdir -p "$unsafe_dot_parent/data"
chmod 0777 "$unsafe_dot_parent"
chmod 0700 "$unsafe_dot_parent/data"
if (
  cd "$unsafe_dot_parent/data"
  DATA_DIR=. bash "$ROOT/$IMPORTER" "$ROOT/$PAYLOAD" "void:proof:unsafe-dot-parent:v1" >"$tmp/unsafe-dot-parent.log" 2>&1
); then
  fail "group_world_writable_nonsticky_dot_parent_accepted"
fi
test ! -e "$unsafe_dot_parent/data/public-node" ||
  fail "unsafe_dot_parent_received_publication"

unsafe_data_ancestor="$tmp/unsafe-data-ancestor"
mkdir -p "$unsafe_data_ancestor/safe-parent/data"
chmod 0777 "$unsafe_data_ancestor"
chmod 0700 "$unsafe_data_ancestor/safe-parent" "$unsafe_data_ancestor/safe-parent/data"
if DATA_DIR="$unsafe_data_ancestor/safe-parent/data" bash "$IMPORTER" "$PAYLOAD" "void:proof:unsafe-data-ancestor:v1" >"$tmp/unsafe-data-ancestor.log" 2>&1; then
  fail "higher_group_world_writable_nonsticky_data_ancestor_accepted"
fi
test ! -e "$unsafe_data_ancestor/safe-parent/data/public-node" ||
  fail "unsafe_data_ancestor_received_publication"

relative_anchor_root="$tmp/relative-anchor"
mkdir -p "$relative_anchor_root/cwd/data"
chmod 0777 "$relative_anchor_root"
chmod 0700 "$relative_anchor_root/cwd" "$relative_anchor_root/cwd/data"
if (
  cd "$relative_anchor_root/cwd"
  DATA_DIR=data bash "$ROOT/$IMPORTER" "$ROOT/$PAYLOAD" "void:proof:relative-anchor:v1" >"$tmp/relative-anchor.log" 2>&1
); then
  fail "relative_data_dir_unsafe_cwd_ancestor_accepted"
fi
test ! -e "$relative_anchor_root/cwd/data/public-node" ||
  fail "relative_data_dir_unsafe_cwd_ancestor_received_publication"

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

stale_stage_root="$tmp/stale-stage"
mkdir -p   "$stale_stage_root/public-node/local-data-drop/objects"   "$stale_stage_root/public-node/local-data-drop/receipts"   "$stale_stage_root/public-node/local-data-drop/.import-staging-v2"
stale_token="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
printf 'stale-object-bytes\n' > "$stale_stage_root/public-node/local-data-drop/.import-staging-v2/object-999-$stale_token"
printf 'stale-receipt-bytes\n' > "$stale_stage_root/public-node/local-data-drop/.import-staging-v2/receipt-999-$stale_token"
DATA_DIR="$stale_stage_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/stale-stage.log"
grep -Fq "reclaimed_staging_entries=2" "$tmp/stale-stage.log" ||
  fail "stale_staging_reclaim_count_mismatch"
test ! -e "$stale_stage_root/public-node/local-data-drop/.import-staging-v2/object-999-$stale_token" ||
  fail "stale_object_stage_not_reclaimed"
test ! -e "$stale_stage_root/public-node/local-data-drop/.import-staging-v2/receipt-999-$stale_token" ||
  fail "stale_receipt_stage_not_reclaimed"
test "$(sha256sum "$stale_stage_root/public-node/local-data-drop/objects/$OBJECT_ID" | awk '{print $1}')" = "$CONTENT_SHA256" ||
  fail "stale_stage_recovery_object_mismatch"
test -f "$stale_stage_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" ||
  fail "stale_stage_recovery_receipt_missing"
test -z "$(find "$stale_stage_root/public-node/local-data-drop/.import-staging-v2" -mindepth 1 -maxdepth 1 ! -name '.import.lock' -print -quit)" ||
  fail "stale_stage_recovery_left_stage_residue"

malformed_type_root="$tmp/orphan-receipt-malformed-types"
for label in zero one; do
  mkdir -p \
    "$malformed_type_root/$label/data/public-node/local-data-drop/objects" \
    "$malformed_type_root/$label/data/public-node/local-data-drop/receipts"
done
: > "$malformed_type_root/zero/source.bin"
printf 'x' > "$malformed_type_root/one/source.bin"

python3 - "$malformed_type_root" <<'PY'
import hashlib
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
cases = [
    ("zero", "void:proof:orphan-type-zero:v1", False),
    ("one", "void:proof:orphan-type-one:v1", True),
]
for label, object_id, bool_bytes in cases:
    source = root / label / "source.bin"
    payload = source.read_bytes()
    receipt = {
        "marker": "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
        "object_id": object_id,
        "bytes": bool_bytes,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "imported_at": "2026-10-03T00:00:00Z",
        "storage_class": "operator_local_public_read_only",
        "public_upload": 0,
        "operator_local_import_only": 1,
        "trusted_as_network_truth": 0,
    }
    out = (
        root
        / label
        / "data"
        / "public-node"
        / "local-data-drop"
        / "receipts"
        / f"{object_id}.json"
    )
    out.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY

for label in zero one; do
  case "$label" in
    zero) bad_id="void:proof:orphan-type-zero:v1" ;;
    one) bad_id="void:proof:orphan-type-one:v1" ;;
  esac
  bad_root="$malformed_type_root/$label"
  bad_receipt="$bad_root/data/public-node/local-data-drop/receipts/$bad_id.json"
  bad_object="$bad_root/data/public-node/local-data-drop/objects/$bad_id"
  bad_receipt_before="$(sha256sum "$bad_receipt" | awk '{print $1}')"
  if DATA_DIR="$bad_root/data" bash "$IMPORTER" "$bad_root/source.bin" "$bad_id" >"$tmp/orphan-type-$label.log" 2>&1; then
    fail "malformed_orphan_receipt_type_accepted:$label"
  fi
  test ! -e "$bad_object" ||
    fail "malformed_orphan_receipt_published_object:$label"
  test "$(sha256sum "$bad_receipt" | awk '{print $1}')" = "$bad_receipt_before" ||
    fail "malformed_orphan_receipt_mutated:$label"
done

writable_object_root="$tmp/writable-orphan-object"
mkdir -p \
  "$writable_object_root/public-node/local-data-drop/objects" \
  "$writable_object_root/public-node/local-data-drop/receipts"
cp "$PAYLOAD" "$writable_object_root/public-node/local-data-drop/objects/$OBJECT_ID"
chmod 0666 "$writable_object_root/public-node/local-data-drop/objects/$OBJECT_ID"
writable_object_before="$(sha256sum "$writable_object_root/public-node/local-data-drop/objects/$OBJECT_ID" | awk '{print $1}')"
if DATA_DIR="$writable_object_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/writable-object.log" 2>&1; then
  fail "writable_orphan_object_accepted"
fi
test "$(sha256sum "$writable_object_root/public-node/local-data-drop/objects/$OBJECT_ID" | awk '{print $1}')" = "$writable_object_before" ||
  fail "writable_orphan_object_mutated"
test ! -e "$writable_object_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" ||
  fail "writable_orphan_object_created_receipt"

writable_receipt_root="$tmp/writable-orphan-receipt"
mkdir -p \
  "$writable_receipt_root/public-node/local-data-drop/objects" \
  "$writable_receipt_root/public-node/local-data-drop/receipts"
cp "$receipt" "$writable_receipt_root/public-node/local-data-drop/receipts/$OBJECT_ID.json"
chmod 0666 "$writable_receipt_root/public-node/local-data-drop/receipts/$OBJECT_ID.json"
writable_receipt_before="$(sha256sum "$writable_receipt_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" | awk '{print $1}')"
if DATA_DIR="$writable_receipt_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/writable-receipt.log" 2>&1; then
  fail "writable_orphan_receipt_accepted"
fi
test "$(sha256sum "$writable_receipt_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" | awk '{print $1}')" = "$writable_receipt_before" ||
  fail "writable_orphan_receipt_mutated"
test ! -e "$writable_receipt_root/public-node/local-data-drop/objects/$OBJECT_ID" ||
  fail "writable_orphan_receipt_created_object"

hardlink_object_root="$tmp/hardlink-orphan-object"
mkdir -p \
  "$hardlink_object_root/public-node/local-data-drop/objects" \
  "$hardlink_object_root/public-node/local-data-drop/receipts"
cp "$PAYLOAD" "$hardlink_object_root/outside-object.bin"
ln "$hardlink_object_root/outside-object.bin" "$hardlink_object_root/public-node/local-data-drop/objects/$OBJECT_ID"
hardlink_object_before="$(sha256sum "$hardlink_object_root/outside-object.bin" | awk '{print $1}')"
if DATA_DIR="$hardlink_object_root" bash "$IMPORTER" "$hardlink_object_root/outside-object.bin" "$OBJECT_ID" >"$tmp/hardlink-object.log" 2>&1; then
  fail "hardlink_orphan_object_accepted"
fi
test "$(sha256sum "$hardlink_object_root/outside-object.bin" | awk '{print $1}')" = "$hardlink_object_before" ||
  fail "hardlink_orphan_object_outside_mutated"
test ! -e "$hardlink_object_root/public-node/local-data-drop/receipts/$OBJECT_ID.json" ||
  fail "hardlink_orphan_object_created_receipt"

hardlink_receipt_root="$tmp/hardlink-orphan-receipt"
mkdir -p \
  "$hardlink_receipt_root/public-node/local-data-drop/objects" \
  "$hardlink_receipt_root/public-node/local-data-drop/receipts"
cp "$receipt" "$hardlink_receipt_root/outside-receipt.json"
ln "$hardlink_receipt_root/outside-receipt.json" "$hardlink_receipt_root/public-node/local-data-drop/receipts/$OBJECT_ID.json"
hardlink_receipt_before="$(sha256sum "$hardlink_receipt_root/outside-receipt.json" | awk '{print $1}')"
if DATA_DIR="$hardlink_receipt_root" bash "$IMPORTER" "$PAYLOAD" "$OBJECT_ID" >"$tmp/hardlink-receipt.log" 2>&1; then
  fail "hardlink_orphan_receipt_accepted"
fi
test "$(sha256sum "$hardlink_receipt_root/outside-receipt.json" | awk '{print $1}')" = "$hardlink_receipt_before" ||
  fail "hardlink_orphan_receipt_outside_mutated"
test ! -e "$hardlink_receipt_root/public-node/local-data-drop/objects/$OBJECT_ID" ||
  fail "hardlink_orphan_receipt_created_object"

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
echo "source_symlink_rejected_without_publication=true"
echo "source_symlink_default_id_rejected_without_read_artifact=true"
echo "source_ancestor_symlink_rejected_without_read_artifact=true"
echo "secure_default_object_id_compatibility=true"
echo "object_symlink_rejected_outside_unchanged=true"
echo "receipt_symlink_rejected_outside_unchanged=true"
echo "objects_directory_symlink_rejected=true"
echo "receipts_directory_symlink_rejected=true"
echo "data_root_symlink_rejected=true"
echo "data_root_owner_mode_guard=true"
echo "data_root_dot_owner_mode_guard=true"
echo "data_root_parent_rename_protection=true"
echo "data_root_parent_sticky_exception=true"
echo "data_root_all_ancestors_rename_protected=true"
echo "demo003_all_ancestors_rename_protected=true"
echo "reader_all_ancestors_rename_protected=true"
echo "all_path_ancestors_owned_by_operator_or_root=true"
echo "relative_data_dir_walks_from_filesystem_root=true"
echo "demo003_relative_data_dir_walks_from_filesystem_root=true"
echo "public_node_ancestor_symlink_rejected=true"
echo "local_drop_ancestor_symlink_rejected=true"
echo "store_directory_mode_guard=true"
echo "demo003_fresh_publication_ancestry_safe=true"
echo "demo003_intake_serialized=true"
echo "demo003_intake_lock_kernel_released=true"
echo "demo003_intake_lock_sigkill_recovery=true"
echo "demo003_concurrent_archives_distinct=true"
echo "demo003_status_missing_tree_false_marker=true"
echo "demo003_status_missing_member_false_marker=true"
echo "demo003_status_corrupt_member_false_marker=true"
echo "demo003_status_extra_member_false_marker=true"
echo "demo003_status_manifest_checksum_binding=true"
echo "demo003_status_file_count_exact_integer=true"
echo "demo003_status_manifest_binding_type_exact=true"
echo "demo003_status_ancestor_symlink_rejected=true"
echo "demo003_manifest_custody_fail_closed=true"
echo "reader_parent_owner_mode_guard=true"
echo "reader_file_owner_guard=true"
echo "operator_owned_recovery_files=true"
echo "writable_orphan_recovery_files_rejected=true"
echo "hardlink_orphan_recovery_files_rejected=true"
echo "runtime_writable_file_rejected=true"
echo "runtime_hardlink_rejected=true"
echo "runtime_descriptor_bound_read_calls=15"
echo "runtime_pathname_reads=0"
echo "runtime_descriptor_bound_directory_lists=6"
echo "runtime_route_storage_mutation=false"
echo "runtime_ancestor_descriptor_walk=true"
echo "demo003_latest_atomic_real_directory=true"
echo "demo003_permissive_umask_modes_normalized=true"
echo "index_size_ceiling_preserved=true"
echo "staged_atomic_publication=true"
echo "staging_global_lock=true"
echo "stale_staging_reclaimed=true"
echo "staging_absent_from_public_runtime=true"
echo "malformed_orphan_receipt_types_rejected=true"
echo "orphan_receipt_recovery=true"
echo "orphan_object_recovery=true"
echo "live_runtime_mutation=false"
echo "credential_access=false"
echo "private_key_access=false"
echo "chain2050_mutation=false"

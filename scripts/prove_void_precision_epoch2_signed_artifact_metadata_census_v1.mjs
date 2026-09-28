#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  "ops/precision/void_precision_epoch2_signed_artifact_metadata_census_v1.sh";
const source = fs.readFileSync(path, "utf8");

for (const required of [
  'MARKER="VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1"',
  'test "$(hostname)" = "zoso-Precision-Tower-7810"',
  'test "$(git branch --show-current)" = "main"',
  'test -z "$(git status --porcelain)"',
  'git fetch origin main --quiet',
  'test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"',
  '.runtime/clone-run-v1/node-v24.18.0-linux-x64/bin/node',
  'VOID_CLONE_RUN_FORCE_LOCAL_RUNTIME=1 ./run-void-node.sh prepare',
  'repo_local_node24_missing_after_prepare',
  'MAX_ROOTS_TOTAL=1024',
  'MAX_FILES_TOTAL=4096',
  'ROOTS_PER_BATCH=1',
  'FILES_PER_BATCH=256',
  'declare -a skipped_generated_roots=()',
  'is_generated_python_venv_root()',
  'test -d "$candidate/bin"',
  'test -d "$candidate/include"',
  'test -d "$candidate/lib"',
  'test -f "$candidate/pyvenv.cfg"',
  'test -f "$candidate/bin/activate"',
  'expected_count=4',
  'expected_count=5',
  'selected_root_count=',
  'scanned_root_count=%s',
  'skipped_generated_root_count=%s',
  'skipped_generated_root_reason=python_venv_root_shape_v1',
  'skipped_generated_root_basenames=',
  'skipped_generated_root_content_read=false',
  'declare -a partitioned_collection_roots=()',
  'declare -a partitioned_collection_child_roots=()',
  'declare -A partitioned_collection_child_root_set=()',
  'declare -a partitioned_collection_top_files=()',
  'partition_void_war_college_evidence_root()',
  'void-war-college-evidence',
  'partitioned_collection_top_level_symlink_rejected',
  'partitioned_collection_top_level_type_rejected',
  'partitioned_collection_has_no_child_roots',
  'find -P "$candidate" -mindepth 1 -maxdepth 1 -print0',
  'too_many_expanded_scan_roots_total',
  'partitioned_collection_root_count=%s',
  'partitioned_collection_child_root_count=%s',
  'partitioned_collection_top_file_count=%s',
  'partitioned_collection_root_basenames=',
  'partitioned_collection_content_read=false',
  'partitioned_collection_child_root_authorization=void_owned_immediate_parent_v1',
  'partitioned_collection_child_root_set["$child"]=1',
  '--partition-child-root "$root_path"',
  'top_level_explicit_file_count=%s',
  'void_epoch2_signed_artifact_metadata_census_precision_v1_*)',
  'for ((offset=0; offset<${#roots[@]}; offset+=ROOTS_PER_BATCH)); do',
  'root_batch_size=%s',
  'for ((offset=0; offset<${#files[@]}; offset+=FILES_PER_BATCH)); do',
  'duplicate_discovered_path_across_batches',
  'receipt_symlink_metadata_contract_mismatch',
  'receipt_symlink_safety_contract_mismatch',
  'receipt_skipped_generated_subtree_contract_mismatch',
  'receipt_skipped_generated_subtree_safety_mismatch',
  'receipt_skipped_depth_subtree_contract_mismatch',
  'receipt_skipped_depth_subtree_safety_mismatch',
  'skipped_depth_subtree_count=',
  'skipped_depth_subtree_basenames=',
  'maximum_scan_depth=12',
  'skipped_depth_subtree_contents_enumerated=false',
  'skipped_depth_subtrees_followed=false',
  'skipped_generated_subtree_count=',
  'skipped_generated_subtree_basenames=',
  'skipped_generated_subtree_contents_enumerated=false',
  'skipped_generated_subtrees_followed=false',
  'symlink_descendant_count=',
  'symlink_candidate_name_hint_count=',
  'symlink_candidate_basenames=',
  'symlink_target_read=false',
  'symlink_descendants_followed=false',
  'OUT_PREFIX="${DOWNLOADS}/void_epoch2_signed_artifact_metadata_census_precision_v1_${STAMP}"',
  '-mindepth 1 -maxdepth 1',
  'scope=top_level_void_owned_download_artifacts_only',
  '--confirmation discoverVoidSignedArtifactCandidates',
  'scanned_file_content_read=false',
  'credential_content_access=false',
  'wallet_access=false',
  'private_key_access=false',
  'transaction_signing=false',
  'transaction_broadcast=false',
  'authoritative_chain2050_write=false',
  'funds_movement=false',
  'METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED',
  'pending_legacy_signed_transaction_census_complete=false',
  'privileged_signer_nonce_or_key_replay_fence_proven=false',
  'cross_epoch_replay_protection_proven=false',
]) {
  assert.ok(source.includes(required), required);
}

for (const forbidden of [
  'find -P "$HOME"',
  '--root "$DOWNLOADS"',
  'test ! -e "$OUT"',
  'too_many_void_owned_roots"',
  'too_many_explicit_void_files"',
  'cat "$candidate"',
  'grep "$candidate"',
  'sed "$candidate"',
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'cast send',
  'systemctl',
  'scp ',
  'rsync ',
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_PROOF_GREEN",
);
console.log("top_level_download_scope_only=true");
console.log("whole_home_scan=false");
console.log("whole_downloads_root_scan=false");
console.log("scanned_file_content_read=false");
console.log("credential_content_access=false");
console.log("wallet_access=false");
console.log("private_key_access=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("authoritative_chain2050_write=false");
console.log("funds_movement=false");

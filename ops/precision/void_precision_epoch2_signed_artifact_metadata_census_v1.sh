#!/usr/bin/env bash
set -Eeuo pipefail
set +H

MARKER="VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1"
REPO="${HOME}/dev/void-node"
DOWNLOADS="${HOME}/Downloads"
NODE_BIN="${REPO}/.runtime/clone-run-v1/node-v24.18.0-linux-x64/bin/node"
TOOL="${REPO}/tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_PREFIX="${DOWNLOADS}/void_epoch2_signed_artifact_metadata_census_precision_v1_${STAMP}"
MAX_ROOTS_TOTAL=1024
MAX_FILES_TOTAL=4096
ROOTS_PER_BATCH=16
FILES_PER_BATCH=256

die() {
  printf '%s HOLD: %s\n' "$MARKER" "$*" >&2
  exit 2
}

test "$(hostname)" = "zoso-Precision-Tower-7810" ||
  die "wrong_host"

cd "$REPO"
test "$(git branch --show-current)" = "main" || die "main_branch_required"
test -z "$(git status --porcelain)" || die "clean_worktree_required"

git fetch origin main --quiet
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ||
  die "local_main_not_current"

if test ! -x "$NODE_BIN"; then
  VOID_CLONE_RUN_FORCE_LOCAL_RUNTIME=1 ./run-void-node.sh prepare
fi
test -x "$NODE_BIN" || die "repo_local_node24_missing_after_prepare"
test "$("$NODE_BIN" --version)" = "v24.18.0" ||
  die "repo_local_node24_version_mismatch"
test -f "$TOOL" || die "metadata_census_tool_missing"
test -d "$DOWNLOADS" || die "downloads_directory_missing"

declare -a roots=()
declare -a files=()

while IFS= read -r -d '' candidate; do
  case "$(basename "$candidate")" in
    void_epoch2_signed_artifact_metadata_census_precision_v1_*)
      continue
      ;;
  esac
  roots+=("$candidate")
done < <(
  find -P "$DOWNLOADS" \
    -mindepth 1 -maxdepth 1 \
    -type d -user "$(id -un)" \
    \( -iname 'void' -o -iname 'void-*' -o -iname 'void_*' -o -iname 'void.*' -o -iname '.void*' \) \
    -print0 |
  sort -z
)

while IFS= read -r -d '' candidate; do
  case "$(basename "$candidate")" in
    void_epoch2_signed_artifact_metadata_census_precision_v1_*.json)
      continue
      ;;
  esac
  files+=("$candidate")
done < <(
  find -P "$DOWNLOADS" \
    -mindepth 1 -maxdepth 1 \
    -type f -user "$(id -un)" \
    \( -iname 'void*' -o -iname '.void*' \) \
    -print0 |
  sort -z
)

test "${#roots[@]}" -le "$MAX_ROOTS_TOTAL" ||
  die "too_many_void_owned_roots_total count=${#roots[@]} max=$MAX_ROOTS_TOTAL"
test "${#files[@]}" -le "$MAX_FILES_TOTAL" ||
  die "too_many_explicit_void_files_total count=${#files[@]} max=$MAX_FILES_TOTAL"
if test "${#roots[@]}" -eq 0 && test "${#files[@]}" -eq 0; then
  die "no_explicit_void_artifact_scope_found"
fi

printf '%s\n' "$MARKER"
printf 'repository_head=%s\n' "$(git rev-parse HEAD)"
printf 'scope=top_level_void_owned_download_artifacts_only\n'
printf 'root_count=%s\n' "${#roots[@]}"
printf 'explicit_file_count=%s\n' "${#files[@]}"
printf 'root_batch_size=%s\n' "$ROOTS_PER_BATCH"
printf 'explicit_file_batch_size=%s\n' "$FILES_PER_BATCH"
printf 'scanned_file_content_read=false\n'
printf 'credential_content_access=false\n'
printf 'wallet_access=false\n'
printf 'private_key_access=false\n'
printf 'transaction_signing=false\n'
printf 'transaction_broadcast=false\n'
printf 'authoritative_chain2050_write=false\n'
printf 'funds_movement=false\n'

receipts=()
batch_index=0

for ((offset=0; offset<${#roots[@]}; offset+=ROOTS_PER_BATCH)); do
  batch_index=$((batch_index + 1))
  out="$(printf '%s_root_batch_%02d.json' "$OUT_PREFIX" "$batch_index")"
  test ! -e "$out" || die "output_already_exists path=$out"
  args=()
  end=$((offset + ROOTS_PER_BATCH))
  if test "$end" -gt "${#roots[@]}"; then end="${#roots[@]}"; fi
  for ((i=offset; i<end; i++)); do
    args+=(--root "${roots[$i]}")
  done
  "$NODE_BIN" "$TOOL" \
    "${args[@]}" \
    --out "$out" \
    --apply \
    --confirmation discoverVoidSignedArtifactCandidates
  test -f "$out" || die "receipt_missing path=$out"
  test "$(stat -c '%a' "$out")" = "600" || die "receipt_mode_invalid path=$out"
  receipts+=("$out")
done

file_batch_index=0
for ((offset=0; offset<${#files[@]}; offset+=FILES_PER_BATCH)); do
  file_batch_index=$((file_batch_index + 1))
  out="$(printf '%s_file_batch_%02d.json' "$OUT_PREFIX" "$file_batch_index")"
  test ! -e "$out" || die "output_already_exists path=$out"
  args=()
  end=$((offset + FILES_PER_BATCH))
  if test "$end" -gt "${#files[@]}"; then end="${#files[@]}"; fi
  for ((i=offset; i<end; i++)); do
    args+=(--file "${files[$i]}")
  done
  "$NODE_BIN" "$TOOL" \
    "${args[@]}" \
    --out "$out" \
    --apply \
    --confirmation discoverVoidSignedArtifactCandidates
  test -f "$out" || die "receipt_missing path=$out"
  test "$(stat -c '%a' "$out")" = "600" || die "receipt_mode_invalid path=$out"
  receipts+=("$out")
done

test "${#receipts[@]}" -gt 0 || die "no_receipts_created"

"$NODE_BIN" - "${receipts[@]}" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");
const files = process.argv.slice(2);
let discovered = 0;
let hintCount = 0;
let symlinkCount = 0;
let symlinkHintCount = 0;
const hints = [];
const symlinkHints = [];
const seenPaths = new Set();
const receiptRows = [];

for (const file of files) {
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (
    value?.marker !== "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1" ||
    value?.status !== "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED" ||
    value?.scanned_file_content_read !== false ||
    value?.authority?.credential_content_access !== false ||
    value?.authority?.wallet_access !== false ||
    value?.authority?.private_key_access !== false ||
    value?.authority?.transaction_signing !== false ||
    value?.authority?.transaction_broadcast !== false ||
    value?.authority?.authoritative_chain2050_write !== false ||
    value?.authority?.funds_movement !== false
  ) {
    throw new Error("receipt_safety_contract_mismatch");
  }
  if (
    !Array.isArray(value.files) ||
    !Array.isArray(value.symlink_descendants) ||
    value.symlink_descendant_count !== value.symlink_descendants.length
  ) {
    throw new Error("receipt_symlink_metadata_contract_mismatch");
  }
  for (const row of value.files) {
    if (seenPaths.has(row.absolute_path)) {
      throw new Error("duplicate_discovered_path_across_batches");
    }
    seenPaths.add(row.absolute_path);
    if (row.candidate_name_hint === true) hints.push(row.basename);
  }
  for (const row of value.symlink_descendants) {
    if (
      row?.source_kind !== "symlink_descendant" ||
      row?.content_read !== false ||
      row?.symlink_target_read !== false ||
      row?.followed !== false
    ) {
      throw new Error("receipt_symlink_safety_contract_mismatch");
    }
    if (seenPaths.has(row.absolute_path)) {
      throw new Error("duplicate_discovered_path_across_batches");
    }
    seenPaths.add(row.absolute_path);
    if (row.candidate_name_hint === true) symlinkHints.push(row.basename);
  }
  discovered += value.discovered_file_count;
  hintCount += value.candidate_name_hint_count;
  symlinkCount += value.symlink_descendant_count;
  symlinkHintCount += value.symlink_candidate_name_hint_count;
  const bytes = fs.readFileSync(file);
  receiptRows.push({
    path: file,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    discovered_file_count: value.discovered_file_count,
    candidate_name_hint_count: value.candidate_name_hint_count,
  });
}

hints.sort();
symlinkHints.sort();
console.log("receipt_count=" + files.length);
console.log("discovered_file_count=" + discovered);
console.log("candidate_name_hint_count=" + hintCount);
console.log("candidate_basenames=" + JSON.stringify(hints));
console.log("symlink_descendant_count=" + symlinkCount);
console.log("symlink_candidate_name_hint_count=" + symlinkHintCount);
console.log("symlink_candidate_basenames=" + JSON.stringify(symlinkHints));
console.log("symlink_target_read=false");
console.log("symlink_descendants_followed=false");
for (const row of receiptRows) {
  console.log("receipt=" + row.path);
  console.log("receipt_sha256=" + row.sha256);
}
console.log("pending_legacy_signed_transaction_census_complete=false");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
console.log("cross_epoch_replay_protection_proven=false");
NODE

printf 'VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_GREEN\n'

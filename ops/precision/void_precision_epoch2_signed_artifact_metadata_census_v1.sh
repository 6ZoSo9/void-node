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
ROOTS_PER_BATCH=1
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
declare -a skipped_generated_roots=()
declare -a files=()

is_generated_python_venv_root() {
  local candidate="$1"
  local top_count expected_count

  test -d "$candidate/bin" && test ! -L "$candidate/bin" || return 1
  test -d "$candidate/include" && test ! -L "$candidate/include" || return 1
  test -d "$candidate/lib" && test ! -L "$candidate/lib" || return 1
  test -f "$candidate/pyvenv.cfg" && test ! -L "$candidate/pyvenv.cfg" || return 1
  test -f "$candidate/bin/activate" && test ! -L "$candidate/bin/activate" || return 1

  expected_count=4
  if test -L "$candidate/lib64"; then
    expected_count=5
  elif test -e "$candidate/lib64"; then
    return 1
  fi

  top_count="$(
    find -P "$candidate" -mindepth 1 -maxdepth 1 -printf '.' | wc -c
  )"
  test "$top_count" -eq "$expected_count"
}

while IFS= read -r -d '' candidate; do
  case "$(basename "$candidate")" in
    void_epoch2_signed_artifact_metadata_census_precision_v1_*)
      continue
      ;;
  esac
  if is_generated_python_venv_root "$candidate"; then
    skipped_generated_roots+=("$candidate")
    continue
  fi
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

selected_root_count=$((${#roots[@]} + ${#skipped_generated_roots[@]}))
test "$selected_root_count" -le "$MAX_ROOTS_TOTAL" ||
  die "too_many_void_owned_roots_total count=$selected_root_count max=$MAX_ROOTS_TOTAL"
test "${#files[@]}" -le "$MAX_FILES_TOTAL" ||
  die "too_many_explicit_void_files_total count=${#files[@]} max=$MAX_FILES_TOTAL"
if test "$selected_root_count" -eq 0 && test "${#files[@]}" -eq 0; then
  die "no_explicit_void_artifact_scope_found"
fi

printf '%s\n' "$MARKER"
printf 'repository_head=%s\n' "$(git rev-parse HEAD)"
printf 'scope=top_level_void_owned_download_artifacts_only\n'
printf 'root_count=%s\n' "$selected_root_count"
printf 'scanned_root_count=%s\n' "${#roots[@]}"
printf 'skipped_generated_root_count=%s\n' "${#skipped_generated_roots[@]}"
printf 'skipped_generated_root_reason=python_venv_root_shape_v1\n'
if test "${#skipped_generated_roots[@]}" -gt 0; then
  printf 'skipped_generated_root_basenames='
  printf '%s\n' "$(
    printf '%s\0' "${skipped_generated_roots[@]}" |
      while IFS= read -r -d '' root; do basename "$root"; done |
      sort |
      "$NODE_BIN" -e '
        const fs = require("node:fs");
        const values = fs.readFileSync(0, "utf8").split("\n").filter(Boolean);
        process.stdout.write(JSON.stringify(values));
      '
  )"
else
  printf 'skipped_generated_root_basenames=[]\n'
fi
printf 'explicit_file_count=%s\n' "${#files[@]}"
printf 'root_batch_size=%s\n' "$ROOTS_PER_BATCH"
printf 'explicit_file_batch_size=%s\n' "$FILES_PER_BATCH"
printf 'skipped_generated_root_content_read=false\n'
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
let skippedGeneratedSubtreeCount = 0;
let skippedDepthSubtreeCount = 0;
const hints = [];
const symlinkHints = [];
const skippedGeneratedSubtreeBasenames = new Map();
const skippedDepthSubtreeBasenames = new Map();
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
  if (
    !Array.isArray(value.skipped_generated_subtrees) ||
    value.skipped_generated_subtree_count !==
      value.skipped_generated_subtrees.length
  ) {
    throw new Error("receipt_skipped_generated_subtree_contract_mismatch");
  }
  if (
    !Array.isArray(value.skipped_depth_subtrees) ||
    value.skipped_depth_subtree_count !== value.skipped_depth_subtrees.length
  ) {
    throw new Error("receipt_skipped_depth_subtree_contract_mismatch");
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
  for (const row of value.skipped_generated_subtrees) {
    if (
      row?.source_kind !== "skipped_generated_subtree" ||
      row?.skip_reason !== "generated_dependency_or_cache_directory" ||
      row?.contents_enumerated !== false ||
      row?.content_read !== false ||
      row?.followed !== false
    ) {
      throw new Error("receipt_skipped_generated_subtree_safety_mismatch");
    }
    if (seenPaths.has(row.absolute_path)) {
      throw new Error("duplicate_discovered_path_across_batches");
    }
    seenPaths.add(row.absolute_path);
    const prior = skippedGeneratedSubtreeBasenames.get(row.basename) ?? 0;
    skippedGeneratedSubtreeBasenames.set(row.basename, prior + 1);
  }
  for (const row of value.skipped_depth_subtrees) {
    if (
      row?.source_kind !== "skipped_depth_subtree" ||
      row?.skip_reason !== "maximum_scan_depth_boundary" ||
      row?.subtree_depth !== 13 ||
      row?.maximum_scan_depth !== 12 ||
      row?.contents_enumerated !== false ||
      row?.content_read !== false ||
      row?.followed !== false
    ) {
      throw new Error("receipt_skipped_depth_subtree_safety_mismatch");
    }
    if (seenPaths.has(row.absolute_path)) {
      throw new Error("duplicate_discovered_path_across_batches");
    }
    seenPaths.add(row.absolute_path);
    const prior = skippedDepthSubtreeBasenames.get(row.basename) ?? 0;
    skippedDepthSubtreeBasenames.set(row.basename, prior + 1);
  }
  discovered += value.discovered_file_count;
  hintCount += value.candidate_name_hint_count;
  symlinkCount += value.symlink_descendant_count;
  symlinkHintCount += value.symlink_candidate_name_hint_count;
  skippedGeneratedSubtreeCount += value.skipped_generated_subtree_count;
  skippedDepthSubtreeCount += value.skipped_depth_subtree_count;
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
console.log("skipped_generated_subtree_count=" + skippedGeneratedSubtreeCount);
console.log(
  "skipped_generated_subtree_basenames=" +
  JSON.stringify(
    [...skippedGeneratedSubtreeBasenames.entries()]
      .sort(([left], [right]) => left.localeCompare(right)),
  ),
);
console.log("skipped_generated_subtree_contents_enumerated=false");
console.log("skipped_generated_subtrees_followed=false");
console.log("skipped_depth_subtree_count=" + skippedDepthSubtreeCount);
console.log(
  "skipped_depth_subtree_basenames=" +
  JSON.stringify(
    [...skippedDepthSubtreeBasenames.entries()]
      .sort(([left], [right]) => left.localeCompare(right)),
  ),
);
console.log("maximum_scan_depth=12");
console.log("skipped_depth_subtree_contents_enumerated=false");
console.log("skipped_depth_subtrees_followed=false");
for (const row of receiptRows) {
  console.log("receipt=" + row.path);
  console.log("receipt_sha256=" + row.sha256);
}
console.log("pending_legacy_signed_transaction_census_complete=false");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
console.log("cross_epoch_replay_protection_proven=false");
NODE

printf 'VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_GREEN\n'

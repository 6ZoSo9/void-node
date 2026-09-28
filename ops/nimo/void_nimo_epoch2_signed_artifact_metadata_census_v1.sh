#!/usr/bin/env bash
set -euo pipefail
umask 077

MARKER="VOID_NIMO_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1"
EXPECTED_HOST="${VOID_EXPECTED_NIMO_HOSTNAME:-Nimo}"
REPO="${VOID_REPO:-$HOME/dev/void-node}"
DOWNLOADS="${VOID_DOWNLOADS:-$HOME/Downloads}"
AUTHORITY_MOUNT="${VOID_AUTHORITY_MOUNT:-/mnt/void-authority}"
EXPECTED_AUTHORITY_UUID="fb57fcbe-83b1-4a69-9701-7aec4cf5396f"
TOOL="$REPO/tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs"
STAMP="${VOID_CENSUS_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
OUTDIR="$DOWNLOADS/void_epoch2_nimo_signed_artifact_metadata_census_v1_$STAMP"

MAX_TOP_LEVEL_ROOTS=1024
MAX_TOP_LEVEL_FILES=4096

hold() {
  printf '%s_HOLD reason=%s\n' "$MARKER" "$1" >&2
  exit 2
}

test "$(hostname)" = "$EXPECTED_HOST" || hold "wrong_host"
test -d "$REPO" || hold "repository_missing"
cd "$REPO"
test "$(git branch --show-current)" = "main" || hold "main_branch_required"
test -z "$(git status --porcelain)" || hold "clean_worktree_required"
test -f "$TOOL" || hold "metadata_census_tool_missing"
test -d "$DOWNLOADS" || hold "downloads_directory_missing"
command -v node >/dev/null 2>&1 || hold "node_unavailable"
command -v findmnt >/dev/null 2>&1 || hold "findmnt_unavailable"
command -v lsblk >/dev/null 2>&1 || hold "lsblk_unavailable"
command -v find >/dev/null 2>&1 || hold "find_unavailable"\ncommand -v grep >/dev/null 2>&1 || hold "grep_unavailable"\ncommand -v sort >/dev/null 2>&1 || hold "sort_unavailable"

findmnt "$AUTHORITY_MOUNT" >/dev/null 2>&1 ||
  hold "authority_mount_not_mounted"
AUTHORITY_SOURCE="$(findmnt -no SOURCE "$AUTHORITY_MOUNT" | head -n1)"
AUTHORITY_UUID="$(lsblk -no UUID "$AUTHORITY_SOURCE" | head -n1 | tr -d '[:space:]')"
test "$AUTHORITY_UUID" = "$EXPECTED_AUTHORITY_UUID" ||
  hold "authority_uuid_mismatch"
test -d "$AUTHORITY_MOUNT" || hold "authority_mount_not_directory"
test ! -L "$AUTHORITY_MOUNT" || hold "authority_mount_symlink_rejected"
test -d "$AUTHORITY_MOUNT/backups" || hold "authority_backups_directory_missing"
test ! -L "$AUTHORITY_MOUNT/backups" || hold "authority_backups_symlink_rejected"

declare -a roots=()
declare -a files=()
declare -a authority_files=()

while IFS= read -r -d '' candidate; do
  case "$(basename "$candidate")" in
    void_epoch2_nimo_signed_artifact_metadata_census_v1_*)
      continue
      ;;
  esac
  roots+=("$candidate")
done < <(
  find -P "$DOWNLOADS"     -mindepth 1 -maxdepth 1     -type d -user "$(id -un)"     \( -iname 'void' -o -iname 'void-*' -o -iname 'void_*' -o -iname 'void.*' -o -iname '.void*' \)     -print0 |
  sort -z
)

while IFS= read -r -d '' candidate; do
  case "$(basename "$candidate")" in
    void_epoch2_nimo_signed_artifact_metadata_census_v1_*.json)
      continue
      ;;
  esac
  files+=("$candidate")
done < <(
  find -P "$DOWNLOADS"     -mindepth 1 -maxdepth 1     -type f -user "$(id -un)"     \( -iname 'void*' -o -iname '.void*' \)     -print0 |
  sort -z
)

test "${#roots[@]}" -le "$MAX_TOP_LEVEL_ROOTS" ||
  hold "too_many_download_roots"
test "${#files[@]}" -le "$MAX_TOP_LEVEL_FILES" ||
  hold "too_many_download_files"

if find -P "$AUTHORITY_MOUNT/backups" -type l -print -quit | grep -q .; then
  hold "authority_backup_symlink_requires_review"
fi
find -P "$AUTHORITY_MOUNT/backups" -type f -print >/dev/null ||
  hold "authority_backup_metadata_enumeration_failed"
while IFS= read -r -d '' candidate; do
  test -O "$candidate" || hold "authority_backup_file_owner_mismatch"
  authority_files+=("$candidate")
done < <(
  find -P "$AUTHORITY_MOUNT/backups" -type f -print0 | sort -z
)
test "${#authority_files[@]}" -le "$MAX_TOP_LEVEL_FILES" ||
  hold "too_many_authority_backup_files"

mkdir -m 0700 "$OUTDIR"

printf '%s\n' "$MARKER"
printf 'host=%s\n' "$(hostname)"
printf 'repository_head=%s\n' "$(git rev-parse HEAD)"
printf 'downloads=%s\n' "$DOWNLOADS"
printf 'authority_mount=%s\n' "$AUTHORITY_MOUNT"
printf 'authority_uuid=%s\n' "$AUTHORITY_UUID"
printf 'download_root_count=%s\n' "${#roots[@]}"
printf 'download_top_level_file_count=%s\n' "${#files[@]}"
printf 'authority_backup_file_count=%s\n' "${#authority_files[@]}"
printf 'scanned_file_content_read=false\n'
printf 'credential_content_access=false\n'
printf 'wallet_access=false\n'
printf 'private_key_access=false\n'
printf 'transaction_signing=false\n'
printf 'transaction_broadcast=false\n'
printf 'authoritative_chain2050_write=false\n'

index=0
for root in "${roots[@]}"; do
  index=$((index + 1))
  out="$(printf '%s/root_batch_%04d.json' "$OUTDIR" "$index")"
  node "$TOOL"     --root "$root"     --out "$out"     --apply     --confirmation discoverVoidSignedArtifactCandidates >/dev/null
done

declare -a explicit_files=("${files[@]}" "${authority_files[@]}")
file_batch=0
for ((offset=0; offset<${#explicit_files[@]}; offset+=256)); do
  file_batch=$((file_batch + 1))
  args=()
  for ((j=offset; j<offset+256 && j<${#explicit_files[@]}; j++)); do
    args+=(--file "${explicit_files[j]}")
  done
  out="$(printf '%s/file_batch_%04d.json' "$OUTDIR" "$file_batch")"
  node "$TOOL"     "${args[@]}"     --out "$out"     --apply     --confirmation discoverVoidSignedArtifactCandidates >/dev/null
done

node - "$OUTDIR" <<'NODE'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dir = process.argv[2];
const names = fs.readdirSync(dir)
  .filter((name) => /^(?:root|file)_batch_[0-9]{4}\.json$/.test(name))
  .sort();
if (names.length === 0) throw new Error("receipt_set_empty");

let discovered = 0;
let hints = 0;
let symlinks = 0;
let generated = 0;
let depth = 0;
const candidateBasenames = [];
const receiptRows = [];

for (const name of names) {
  const file = path.join(dir, name);
  const bytes = fs.readFileSync(file);
  const value = JSON.parse(bytes.toString("utf8"));
  if (
    value?.marker !== "VOID_ECONOMIC_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1" ||
    value?.status !== "METADATA_CENSUS_READY_OPERATOR_REVIEW_REQUIRED" ||
    value?.scanned_file_content_read !== false ||
    value?.authority?.credential_content_access !== false ||
    value?.authority?.wallet_access !== false ||
    value?.authority?.private_key_access !== false ||
    value?.authority?.transaction_signing !== false ||
    value?.authority?.transaction_broadcast !== false ||
    value?.authority?.authoritative_chain2050_write !== false
  ) {
    throw new Error("receipt_safety_contract_mismatch");
  }
  discovered += value.discovered_file_count;
  hints += value.candidate_name_hint_count;
  symlinks += value.symlink_descendant_count;
  generated += value.skipped_generated_subtree_count;
  depth += value.skipped_depth_subtree_count;
  for (const row of value.files) {
    if (row.candidate_name_hint === true) candidateBasenames.push(row.basename);
  }
  receiptRows.push(
    crypto.createHash("sha256").update(bytes).digest("hex") + "\t" + name
  );
}

candidateBasenames.sort();
const setDigest = crypto.createHash("sha256")
  .update(receiptRows.join("\n") + "\n", "utf8")
  .digest("hex");

console.log("receipt_count=" + names.length);
console.log("discovered_file_count=" + discovered);
console.log("candidate_name_hint_count=" + hints);
console.log("candidate_basenames=" + JSON.stringify(candidateBasenames));
console.log("symlink_descendant_count=" + symlinks);
console.log("skipped_generated_subtree_count=" + generated);
console.log("skipped_depth_subtree_count=" + depth);
console.log("receipt_set_sha256=" + setDigest);
console.log("scanned_file_content_read=false");
console.log("credential_content_access=false");
console.log("private_key_access=false");
console.log("pending_legacy_signed_transaction_census_complete=false");
NODE

printf 'receipt_dir=%s\n' "$OUTDIR"
printf '%s_GREEN\n' "$MARKER"

#!/usr/bin/env bash
set -Eeuo pipefail
set +H

MARKER="VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1"
REPO="${HOME}/dev/void-node"
DOWNLOADS="${HOME}/Downloads"
NODE_BIN="${REPO}/.runtime/clone-run-v1/node-v24.18.0-linux-x64/bin/node"
TOOL="${REPO}/tools/void-economic-epoch2-signed-artifact-metadata-census-v1.mjs"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${DOWNLOADS}/void_epoch2_signed_artifact_metadata_census_precision_v1_${STAMP}.json"

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

test -x "$NODE_BIN" || die "repo_local_node24_missing"
test "$("$NODE_BIN" --version)" = "v24.18.0" ||
  die "repo_local_node24_version_mismatch"
test -f "$TOOL" || die "metadata_census_tool_missing"
test -d "$DOWNLOADS" || die "downloads_directory_missing"
test ! -e "$OUT" || die "output_already_exists"

declare -a roots=()
declare -a files=()

while IFS= read -r -d '' candidate; do
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

test "${#roots[@]}" -le 16 || die "too_many_void_owned_roots"
test "${#files[@]}" -le 256 || die "too_many_explicit_void_files"
if test "${#roots[@]}" -eq 0 && test "${#files[@]}" -eq 0; then
  die "no_explicit_void_artifact_scope_found"
fi

args=()
for root in "${roots[@]}"; do
  args+=(--root "$root")
done
for file in "${files[@]}"; do
  args+=(--file "$file")
done

printf '%s\n' "$MARKER"
printf 'repository_head=%s\n' "$(git rev-parse HEAD)"
printf 'scope=top_level_void_owned_download_artifacts_only\n'
printf 'root_count=%s\n' "${#roots[@]}"
printf 'explicit_file_count=%s\n' "${#files[@]}"
printf 'scanned_file_content_read=false\n'
printf 'credential_content_access=false\n'
printf 'wallet_access=false\n'
printf 'private_key_access=false\n'
printf 'transaction_signing=false\n'
printf 'transaction_broadcast=false\n'
printf 'authoritative_chain2050_write=false\n'
printf 'funds_movement=false\n'

"$NODE_BIN" "$TOOL" \
  "${args[@]}" \
  --out "$OUT" \
  --apply \
  --confirmation discoverVoidSignedArtifactCandidates

test -f "$OUT" || die "receipt_missing"
test "$(stat -c '%a' "$OUT")" = "600" || die "receipt_mode_invalid"

SHA="$(sha256sum "$OUT" | awk '{print $1}')"

"$NODE_BIN" - "$OUT" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
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
const hints = value.files
  .filter((row) => row.candidate_name_hint === true)
  .map((row) => row.basename);
console.log("discovered_file_count=" + value.discovered_file_count);
console.log("candidate_name_hint_count=" + value.candidate_name_hint_count);
console.log("candidate_basenames=" + JSON.stringify(hints));
console.log("pending_legacy_signed_transaction_census_complete=false");
console.log("privileged_signer_nonce_or_key_replay_fence_proven=false");
console.log("cross_epoch_replay_protection_proven=false");
NODE

printf 'receipt=%s\n' "$OUT"
printf 'receipt_sha256=%s\n' "$SHA"
printf 'VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1_GREEN\n'

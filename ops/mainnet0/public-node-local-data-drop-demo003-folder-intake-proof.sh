#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo003-folder-intake-proof-$STAMP}"
DATA_DIR="$OUT/data"
FIXTURE="ops/mainnet0/public-node-local-data-drop-demo003-folder-fixture.sh"
VERIFY="ops/mainnet0/public-node-local-data-drop-demo003-verify-folder-fixture.sh"
HANDOFF="ops/mainnet0/public-node-local-data-drop-demo003-sealed-handoff-v1.py"
INTAKE="ops/mainnet0/public-node-local-data-drop-demo003-folder-intake.sh"
STATUS="ops/mainnet0/public-node-local-data-drop-demo003-folder-intake-status.sh"

echo "=== VOID Public Node Demo 003 Folder Intake Proof v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_PROOF_V1"
echo "head=$(git rev-parse --short HEAD)"
echo "out=$OUT"

mkdir -p "$OUT"

before="$(git status --short --untracked-files=no)"

test -x "$FIXTURE"
test -x "$VERIFY"
test -f "$HANDOFF"
test -x "$INTAKE"
test -x "$STATUS"
grep -Fq 'HANDOFF_SCRIPT="ops/mainnet0/public-node-local-data-drop-demo003-sealed-handoff-v1.py"' "$INTAKE"
if grep -Fq 'cp -a "$VERIFY_OUT/extract/demo003-folder-fixture/." "$ARCHIVE/"' "$INTAKE"; then
  echo "mutable_visible_tree_copy_remains=true"
  exit 1
fi

adversary="$OUT/sealed-handoff-adversary"
mkdir -m 0700 "$adversary"
OUT="$adversary/fixture" "$FIXTURE" >"$adversary/fixture.log"
tarball="$adversary/fixture/demo003-folder-fixture.tar.gz"
VERIFY_CAPTURE="$(OUT="$adversary/verify" "$VERIFY" "$tarball")"
printf '%s\n' "$VERIFY_CAPTURE" >"$adversary/verify.log"

sealed_digest() {
  key="$1"
  value="$(
    printf '%s\n' "$VERIFY_CAPTURE" |
      sed -n "s/^${key}=\([0-9a-f]\{64\}\)$/\1/p"
  )"
  count="$(
    printf '%s\n' "$VERIFY_CAPTURE" |
      grep -c "^${key}=" || true
  )"
  test "$count" = "1" && [[ "$value" =~ ^[0-9a-f]{64}$ ]]
  printf '%s' "$value"
}

manifest_sha="$(sealed_digest sealed_manifest_sha256)"
checksums_sha="$(sealed_digest sealed_checksums_sha256)"
readme_sha="$(sealed_digest sealed_readme_sha256)"
index_sha="$(sealed_digest sealed_index_sha256)"
metadata_sha="$(sealed_digest sealed_metadata_sha256)"

printf 'VOID_DEMO003_VISIBLE_TREE_MUTATION_AFTER_GREEN\n' > \
  "$adversary/verify/extract/demo003-folder-fixture/files/README.txt"
mkdir -m 0700 "$adversary/rejected-destination"
set +e
python3 "$HANDOFF" \
  "$adversary/verify/extract/demo003-folder-fixture" \
  "$adversary/rejected-destination" \
  "$manifest_sha" "$checksums_sha" "$readme_sha" "$index_sha" "$metadata_sha" \
  >"$adversary/handoff-hold.log" 2>&1
handoff_rc=$?
set -e
if [ "$handoff_rc" -eq 0 ]; then
  echo "post_green_visible_tree_mutation_unexpectedly_handed_off=true"
  exit 1
fi
grep -Fq "source_file_sealed_digest_mismatch:files/README.txt" \
  "$adversary/handoff-hold.log"

DATA_DIR="$DATA_DIR" OUT="$OUT/intake-run" \
  "$INTAKE" | tee "$OUT/intake.log"

DATA_DIR="$DATA_DIR" \
  "$STATUS" | tee "$OUT/status.log"

after="$(git status --short --untracked-files=no)"
if [ "$before" != "$after" ]; then
  echo "no_source_mutation=false"
  git status --short
  exit 1
fi

grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED" "$OUT/intake.log"
grep -q "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true" "$OUT/status.log"
grep -q "offline_verified=true" "$OUT/status.log"
grep -q "network_fetch_during_import=false" "$OUT/status.log"
grep -q "trusted_as_network_truth=false" "$OUT/status.log"
grep -q "sealed_snapshot_binding=true" "$OUT/status.log"
grep -q "verified_content_authority=sealed_memfd_snapshot" "$OUT/status.log"
grep -q "visible_extraction_tree_trusted=false" "$OUT/status.log"
grep -Eq "sealed_snapshot_set_sha256=[0-9a-f]{64}" "$OUT/status.log"
grep -q "sealed_snapshot_handoff_bound=true" "$OUT/intake.log"
test "$(grep -c '^published_latest_snapshot_revalidated=true$' "$OUT/intake.log")" -eq 1
intake_set="$(
  sed -n 's/^sealed_snapshot_set_sha256=\([0-9a-f]\{64\}\)$/\1/p' "$OUT/intake.log" |
    tail -n 1
)"
status_set="$(
  sed -n 's/^sealed_snapshot_set_sha256=\([0-9a-f]\{64\}\)$/\1/p' "$OUT/status.log" |
    tail -n 1
)"
test -n "$intake_set" && test "$intake_set" = "$status_set"

echo "post_green_visible_tree_mutation_rejected=true"
echo "published_latest_snapshot_revalidation_verified=true"
echo "sealed_snapshot_handoff_verified=true"
echo "no_source_mutation=true"
echo "demo003_folder_intake_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_PROOF_V1_GREEN"

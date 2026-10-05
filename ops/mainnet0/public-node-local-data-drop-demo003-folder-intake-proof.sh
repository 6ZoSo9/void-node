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
grep -Fq 'rollback_demo003_latest()' "$INTAKE"
grep -Fq 'discard_prior_demo003_latest()' "$INTAKE"
grep -Fq 'latest_publish_rollback_restored=true' "$INTAKE"
grep -Fq 'latest_publish_commit_validated=true' "$INTAKE"
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

prior_status_set="$status_set"
real_python="$(command -v python3)"
wrapper_bin="$OUT/post-publish-python-wrapper"
mkdir -m 0700 "$wrapper_bin"
cat >"$wrapper_bin/python3" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

real="${VOID_DEMO003_TEST_REAL_PYTHON:?}"
if [ "${1:-}" != "-" ]; then
  exec "$real" "$@"
fi

script="$(mktemp "${TMPDIR:-/tmp}/void-demo003-intake-python-wrapper.XXXXXX")"
trap 'rm -f "$script"' EXIT
cat >"$script"

set +e
"$real" "$script" "${@:2}"
rc=$?
set -e

if [ "$rc" -eq 0 ] &&
   [ "${VOID_DEMO003_TEST_CORRUPT_AFTER_PUBLISH:-0}" = "1" ] &&
   grep -Fq 'latest_atomic_publish=true' "$script" &&
   grep -Fq 'latest_replaced_existing=' "$script"; then
  latest="${@: -1}"
  test -d "$latest/files"
  printf 'VOID_DEMO003_POST_PUBLISH_STATUS_CORRUPTION\n' > \
    "$latest/files/README.txt"
fi

exit "$rc"
SH
chmod 0700 "$wrapper_bin/python3"

set +e
PATH="$wrapper_bin:$PATH" \
VOID_DEMO003_TEST_REAL_PYTHON="$real_python" \
VOID_DEMO003_TEST_CORRUPT_AFTER_PUBLISH=1 \
DATA_DIR="$DATA_DIR" \
OUT="$OUT/intake-rollback-run" \
  "$INTAKE" >"$OUT/intake-rollback.log" 2>&1
rollback_rc=$?
set -e

if [ "$rollback_rc" -eq 0 ]; then
  echo "post_publish_invalid_latest_unexpectedly_committed=true"
  exit 1
fi
grep -Fq "status=demo003_folder_intake_held_after_publish_validation" \
  "$OUT/intake-rollback.log"
grep -Fq "latest_publish_rollback_restored=true" \
  "$OUT/intake-rollback.log"
if grep -Fq "latest_publish_commit_validated=true" \
  "$OUT/intake-rollback.log"; then
  echo "post_publish_invalid_latest_reported_committed=true"
  exit 1
fi

DATA_DIR="$DATA_DIR" "$STATUS" >"$OUT/status-after-rollback.log"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true" \
  "$OUT/status-after-rollback.log"
restored_set="$(
  sed -n 's/^sealed_snapshot_set_sha256=\([0-9a-f]\{64\}\)$/\1/p' \
    "$OUT/status-after-rollback.log" |
    tail -n 1
)"
test -n "$restored_set" && test "$restored_set" = "$prior_status_set"
if grep -Fq "VOID_DEMO003_POST_PUBLISH_STATUS_CORRUPTION" \
  "$DATA_DIR/public-node/local-data-drop-demo003-folder-fixtures/latest/files/README.txt"; then
  echo "post_publish_invalid_latest_not_rolled_back=true"
  exit 1
fi
if find "$DATA_DIR/public-node/local-data-drop-demo003-folder-fixtures" \
     -maxdepth 1 -name '.latest-stage-*' -print -quit | grep -q .; then
  echo "post_publish_rollback_left_stage=true"
  exit 1
fi

after="$(git status --short --untracked-files=no)"
if [ "$before" != "$after" ]; then
  echo "no_source_mutation=false"
  git status --short
  exit 1
fi

echo "post_publish_invalid_latest_rollback_verified=true"
echo "prior_latest_snapshot_restored=true"
echo "post_green_visible_tree_mutation_rejected=true"
echo "published_latest_snapshot_revalidation_verified=true"
echo "sealed_snapshot_handoff_verified=true"
echo "no_source_mutation=true"
echo "demo003_folder_intake_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_PROOF_V1_GREEN"

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
grep -Fq 'latest_publish_uncertainty_armed_before_child=true' "$INTAKE"
grep -Fq 'latest_publish_uncertainty_cleared_after_validated_success=true' "$INTAKE"
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

prepare_legacy_latest_symlink() {
  case_root="$1"
  legacy_target="$2"
  mkdir -m 0700 "$case_root"
  mkdir -m 0700 "$case_root/public-node"
  mkdir -m 0700 "$case_root/public-node/local-data-drop-demo003-folder-fixtures"
  mkdir -m 0700 "$case_root/public-node/local-data-drop-demo003-folder-fixtures/archive"
  mkdir -m 0700 "$legacy_target"
  printf 'VOID_DEMO003_LEGACY_LATEST_SENTINEL\n' >"$legacy_target/sentinel.txt"
  chmod 0600 "$legacy_target/sentinel.txt"
  ln -s "$legacy_target"     "$case_root/public-node/local-data-drop-demo003-folder-fixtures/latest"
}

legacy_success_data="$OUT/legacy-symlink-success-data"
legacy_success_target="$OUT/legacy-symlink-success-target"
prepare_legacy_latest_symlink "$legacy_success_data" "$legacy_success_target"
legacy_success_link="$legacy_success_data/public-node/local-data-drop-demo003-folder-fixtures/latest"
legacy_success_identity="$(
  python3 - "$legacy_success_link" <<'PY'
import os
import sys
st=os.lstat(sys.argv[1])
print(f"{st.st_dev}:{st.st_ino}:{st.st_mode}:{st.st_uid}:{st.st_gid}")
PY
)"
legacy_success_readlink="$(readlink "$legacy_success_link")"
DATA_DIR="$legacy_success_data" OUT="$OUT/legacy-symlink-success-run"   "$INTAKE" >"$OUT/legacy-symlink-success.log" 2>&1
grep -Fq "latest_prior_kind=symlink" "$OUT/legacy-symlink-success.log"
grep -Fq "previous_latest_retired_after_validation=true" "$OUT/legacy-symlink-success.log"
grep -Fq "latest_publish_commit_validated=true" "$OUT/legacy-symlink-success.log"
test -d "$legacy_success_link" && test ! -L "$legacy_success_link"
test "$(cat "$legacy_success_target/sentinel.txt")" = "VOID_DEMO003_LEGACY_LATEST_SENTINEL"
if find "$legacy_success_data/public-node/local-data-drop-demo003-folder-fixtures"      -maxdepth 1 -name '.latest-stage-*' -print -quit | grep -q .; then
  echo "legacy_symlink_success_left_stage=true"
  exit 1
fi
test -n "$legacy_success_identity" && test -n "$legacy_success_readlink"

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

if [ "${VOID_DEMO003_TEST_PUBLISHER_NO_OUTPUT_AFTER_EXCHANGE:-0}" = "1" ] &&
   grep -Fq 'latest_atomic_publish=true' "$script" &&
   grep -Fq 'RENAME_EXCHANGE = 2' "$script"; then
  "$real" - "$script" <<'PY_ABORT_PUBLISH'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf8")
needle = '''        exchange(stage, latest)
    else:
        os.rename(stage, latest)
'''
replacement = '''        exchange(stage, latest)
        os._exit(97)
    else:
        os.rename(stage, latest)
'''
if text.count(needle) != 1:
    raise SystemExit("publisher_abort_injection_anchor_invalid")
path.write_text(text.replace(needle, replacement), encoding="utf8")
PY_ABORT_PUBLISH
fi

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

legacy_rollback_data="$OUT/legacy-symlink-rollback-data"
legacy_rollback_target="$OUT/legacy-symlink-rollback-target"
prepare_legacy_latest_symlink "$legacy_rollback_data" "$legacy_rollback_target"
legacy_rollback_link="$legacy_rollback_data/public-node/local-data-drop-demo003-folder-fixtures/latest"
legacy_rollback_identity="$(
  python3 - "$legacy_rollback_link" <<'PY'
import os
import sys
st=os.lstat(sys.argv[1])
print(f"{st.st_dev}:{st.st_ino}:{st.st_mode}:{st.st_uid}:{st.st_gid}")
PY
)"
legacy_rollback_readlink="$(readlink "$legacy_rollback_link")"

set +e
PATH="$wrapper_bin:$PATH" \
VOID_DEMO003_TEST_REAL_PYTHON="$real_python" \
VOID_DEMO003_TEST_CORRUPT_AFTER_PUBLISH=1 \
DATA_DIR="$legacy_rollback_data" \
OUT="$OUT/legacy-symlink-rollback-run" \
  "$INTAKE" >"$OUT/legacy-symlink-rollback.log" 2>&1
legacy_rollback_rc=$?
set -e

if [ "$legacy_rollback_rc" -eq 0 ]; then
  echo "legacy_symlink_post_publish_failure_unexpectedly_committed=true"
  exit 1
fi
grep -Fq "latest_prior_kind=symlink" "$OUT/legacy-symlink-rollback.log"
grep -Fq "latest_publish_rollback_restored=true" "$OUT/legacy-symlink-rollback.log"
if grep -Fq "latest_publish_commit_validated=true" "$OUT/legacy-symlink-rollback.log"; then
  echo "legacy_symlink_failed_publish_reported_committed=true"
  exit 1
fi
test -L "$legacy_rollback_link"
test "$(readlink "$legacy_rollback_link")" = "$legacy_rollback_readlink"
test "$(cat "$legacy_rollback_target/sentinel.txt")" = "VOID_DEMO003_LEGACY_LATEST_SENTINEL"
test "$(
  python3 - "$legacy_rollback_link" <<'PY'
import os
import sys
st=os.lstat(sys.argv[1])
print(f"{st.st_dev}:{st.st_ino}:{st.st_mode}:{st.st_uid}:{st.st_gid}")
PY
)" = "$legacy_rollback_identity"
if find "$legacy_rollback_data/public-node/local-data-drop-demo003-folder-fixtures" \
     -maxdepth 1 -name '.latest-stage-*' -print -quit | grep -q .; then
  echo "legacy_symlink_rollback_left_stage=true"
  exit 1
fi

abrupt_data="$OUT/abrupt-publish-data"
abrupt_target="$OUT/abrupt-publish-legacy-target"
prepare_legacy_latest_symlink "$abrupt_data" "$abrupt_target"
abrupt_latest="$abrupt_data/public-node/local-data-drop-demo003-folder-fixtures/latest"
abrupt_prior_identity="$(
  python3 - "$abrupt_latest" <<'PY'
import os
import sys
st=os.lstat(sys.argv[1])
print(f"{st.st_dev}:{st.st_ino}:{st.st_mode}:{st.st_uid}:{st.st_gid}")
PY
)"
abrupt_prior_readlink="$(readlink "$abrupt_latest")"

set +e
PATH="$wrapper_bin:$PATH" \
VOID_DEMO003_TEST_REAL_PYTHON="$real_python" \
VOID_DEMO003_TEST_PUBLISHER_NO_OUTPUT_AFTER_EXCHANGE=1 \
DATA_DIR="$abrupt_data" \
OUT="$OUT/abrupt-publish-run" \
  "$INTAKE" >"$OUT/abrupt-publish.log" 2>&1
abrupt_rc=$?
set -e

if [ "$abrupt_rc" -eq 0 ]; then
  echo "abrupt_publish_unexpectedly_committed=true"
  exit 1
fi
grep -Fq "latest_publish_uncertainty_armed_before_child=true" "$OUT/abrupt-publish.log"
grep -Fq "rollback_uncertain_evidence_preserved=true" "$OUT/abrupt-publish.log"
if grep -Fq "latest_publish_uncertainty_cleared_after_validated_success=true" "$OUT/abrupt-publish.log"; then
  echo "abrupt_publish_uncertainty_cleared=true"
  exit 1
fi
if grep -Fq "latest_publish_failure_state=" "$OUT/abrupt-publish.log"; then
  echo "abrupt_publish_emitted_result_marker=true"
  exit 1
fi

abrupt_stage="$(
  sed -n 's/^rollback_uncertain_latest_stage=\(.*\)$/\1/p'     "$OUT/abrupt-publish.log" | tail -n 1
)"
abrupt_archive="$(
  sed -n 's/^rollback_uncertain_archive=\(.*\)$/\1/p'     "$OUT/abrupt-publish.log" | tail -n 1
)"
test -n "$abrupt_stage" && test -L "$abrupt_stage"
test -n "$abrupt_archive" && test -d "$abrupt_archive"
test "$(readlink "$abrupt_stage")" = "$abrupt_prior_readlink"
test "$(cat "$abrupt_target/sentinel.txt")" = "VOID_DEMO003_LEGACY_LATEST_SENTINEL"
test "$(
  python3 - "$abrupt_stage" <<'PY'
import os
import sys
st=os.lstat(sys.argv[1])
print(f"{st.st_dev}:{st.st_ino}:{st.st_mode}:{st.st_uid}:{st.st_gid}")
PY
)" = "$abrupt_prior_identity"
test -f "$abrupt_archive/intake.json"
test -d "$abrupt_latest" && test ! -L "$abrupt_latest"

after="$(git status --short --untracked-files=no)"
if [ "$before" != "$after" ]; then
  echo "no_source_mutation=false"
  git status --short
  exit 1
fi

echo "post_publish_invalid_latest_rollback_verified=true"
echo "prior_latest_snapshot_restored=true"
echo "legacy_latest_symlink_successfully_retired_after_validation=true"
echo "legacy_latest_symlink_exactly_restored_after_failed_validation=true"
echo "indeterminate_publish_preserves_stage_archive_evidence=true"
echo "post_green_visible_tree_mutation_rejected=true"
echo "published_latest_snapshot_revalidation_verified=true"
echo "sealed_snapshot_handoff_verified=true"
echo "no_source_mutation=true"
echo "demo003_folder_intake_verified=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_PROOF_V1_GREEN"

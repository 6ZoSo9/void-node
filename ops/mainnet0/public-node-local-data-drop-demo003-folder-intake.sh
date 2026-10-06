#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
STAMP="${DEMO003_STAMP:-$(date -u +%Y%m%d-%H%M%S)}"
if ! printf '%s' "$STAMP" | grep -Eq '^[0-9]{8}-[0-9]{6}$'; then
  echo "[fail] invalid DEMO003_STAMP" >&2
  exit 2
fi
RUN_TOKEN="$(python3 - <<'PY'
import secrets
print(secrets.token_hex(12))
PY
)"
RUN_ID="$STAMP-$$-$RUN_TOKEN"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo003-folder-intake-$RUN_ID}"
FIXTURE_OUT="$OUT/fixture"
VERIFY_OUT="$OUT/verify"
INTAKE_DIR="$DATA_DIR/public-node/local-data-drop-demo003-folder-fixtures"
LATEST="$INTAKE_DIR/latest"
LATEST_STAGE="$INTAKE_DIR/.latest-stage-$RUN_ID"
ARCHIVE="$INTAKE_DIR/archive/demo003-folder-fixture-$RUN_ID"
LOCK_FILE="$INTAKE_DIR/.intake-lock-v1"
LOCK_WAIT_SECONDS="${DEMO003_LOCK_WAIT_SECONDS:-30}"

FIXTURE_SCRIPT="ops/mainnet0/public-node-local-data-drop-demo003-folder-fixture.sh"
VERIFY_SCRIPT="ops/mainnet0/public-node-local-data-drop-demo003-verify-folder-fixture.sh"
HANDOFF_SCRIPT="ops/mainnet0/public-node-local-data-drop-demo003-sealed-handoff-v1.py"
STATUS_SCRIPT="ops/mainnet0/public-node-local-data-drop-demo003-folder-intake-status.sh"
LATEST_PUBLISHED=0
LATEST_REPLACED_EXISTING=0
LATEST_PRIOR_KIND=""
LATEST_PRIOR_IDENTITY=""
LATEST_NEW_IDENTITY=""
LATEST_ROLLBACK_UNCERTAIN=0
INTAKE_COMMITTED=0

umask 0077

python3 - "$DATA_DIR" <<'PY'
import os
import stat
import sys

data_dir = sys.argv[1]
euid = os.geteuid()
O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
O_CLOEXEC = getattr(os, "O_CLOEXEC", 0)
FLAGS = os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC

def fail(msg):
    raise RuntimeError(msg)

def same_identity(a, b):
    return (a.st_dev, a.st_ino) == (b.st_dev, b.st_ino)

def open_component(parent_fd, name, label, create, require_custody):
    if not name or name in (".", "..") or "/" in name:
        fail(f"{label}_invalid_component")
    if create:
        try:
            os.mkdir(name, 0o700, dir_fd=parent_fd)
        except FileExistsError:
            pass
    before = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    if not stat.S_ISDIR(before.st_mode):
        fail(f"{label}_not_direct_directory")
    fd = os.open(name, FLAGS, dir_fd=parent_fd)
    after = os.fstat(fd)
    if not stat.S_ISDIR(after.st_mode) or not same_identity(before, after):
        os.close(fd)
        fail(f"{label}_identity_changed")
    if require_custody and after.st_uid != euid:
        os.close(fd)
        fail(f"{label}_not_owned_by_operator")
    if require_custody and (after.st_mode & 0o022):
        os.close(fd)
        fail(f"{label}_group_or_world_writable")
    return fd

def require_rename_protected_parent(fd, label):
    current = os.fstat(fd)
    if not stat.S_ISDIR(current.st_mode):
        fail(f"{label}_not_directory")
    if current.st_uid not in (0, euid):
        fail(f"{label}_owner_not_operator_or_root")
    if current.st_mode & 0o022 and not (current.st_mode & stat.S_ISVTX):
        fail(f"{label}_group_or_world_writable_without_sticky")

original_parts = [p for p in data_dir.split(os.sep) if p not in ("", ".")]
if any(p == ".." for p in original_parts):
    fail("data_dir_parent_component_rejected")
resolved = os.path.abspath(data_dir)
parts = [p for p in resolved.split(os.sep) if p]
if not parts:
    fail("data_dir_filesystem_root_rejected")

fd = os.open("/", FLAGS)
try:
    for idx, part in enumerate(parts):
        require_rename_protected_parent(fd, f"data_dir_parent_{idx}")
        next_fd = open_component(
            fd,
            part,
            f"data_dir_component_{idx}",
            True,
            idx == len(parts) - 1,
        )
        os.close(fd)
        fd = next_fd

    public_fd = open_component(fd, "public-node", "public_node_dir", True, True)
    base_fd = open_component(
        public_fd,
        "local-data-drop-demo003-folder-fixtures",
        "demo003_base_dir",
        True,
        True,
    )
    archive_fd = open_component(base_fd, "archive", "demo003_archive_dir", True, True)
    for child in (archive_fd, base_fd, public_fd):
        os.close(child)
finally:
    try:
        os.close(fd)
    except OSError:
        pass

print("demo003_publication_ancestry_secure=true")
PY

case "$LOCK_WAIT_SECONDS" in
  ''|*[!0-9]*) echo "[fail] invalid DEMO003_LOCK_WAIT_SECONDS" >&2; exit 2 ;;
esac

command -v flock >/dev/null 2>&1 || {
  echo "[fail] flock unavailable" >&2
  exit 2
}

if [ -L "$LOCK_FILE" ]; then
  echo "[fail] Demo003 intake lock is a symlink" >&2
  exit 2
fi
if [ ! -e "$LOCK_FILE" ]; then
  (umask 0077; : > "$LOCK_FILE")
fi
test -f "$LOCK_FILE" && test ! -L "$LOCK_FILE"
test "$(stat -c '%u' "$LOCK_FILE")" = "$(id -u)"
test "$(stat -c '%a' "$LOCK_FILE")" = "600"

exec {LOCK_FD}<>"$LOCK_FILE"
test "$(stat -Lc '%d:%i' "$LOCK_FILE")" = "$(stat -Lc '%d:%i' "/proc/self/fd/$LOCK_FD")"
if ! flock -w "$LOCK_WAIT_SECONDS" "$LOCK_FD"; then
  echo "status=demo003_folder_intake_hold"
  echo "hold_reason=demo003_intake_already_in_progress"
  echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED=false"
  exit 75
fi

rollback_demo003_latest() {
  mode="initial"
  if [ "$LATEST_REPLACED_EXISTING" = "1" ]; then
    mode="replace"
  fi
  rollback_output="$(
  python3 - \
    "$LATEST_STAGE" \
    "$LATEST" \
    "$mode" \
    "$LATEST_PRIOR_KIND" \
    "$LATEST_PRIOR_IDENTITY" \
    "$LATEST_NEW_IDENTITY" <<'PY'
import ctypes
import os
import stat
import sys

stage, latest, mode, prior_kind, prior_identity, new_identity = sys.argv[1:]
AT_FDCWD = -100
RENAME_EXCHANGE = 2
O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)

def identity(st):
    return ":".join(
        str(value)
        for value in (
            st.st_dev,
            st.st_ino,
            st.st_mode,
            st.st_uid,
            st.st_gid,
        )
    )

def direct_dir(pathname, expected, label):
    st = os.lstat(pathname)
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or identity(st) != expected
    ):
        raise RuntimeError(label)
    return st

def prior_entry(pathname, expected_kind, expected_identity, label):
    st = os.lstat(pathname)
    if expected_kind == "directory":
        valid_type = stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode)
    elif expected_kind == "symlink":
        valid_type = stat.S_ISLNK(st.st_mode) and st.st_uid == os.geteuid()
    else:
        raise RuntimeError(label + "_kind_invalid")
    if not valid_type or identity(st) != expected_identity:
        raise RuntimeError(label)
    return st

def exchange(left, right):
    libc = ctypes.CDLL(None, use_errno=True)
    renameat2 = getattr(libc, "renameat2", None)
    if renameat2 is None:
        raise RuntimeError("renameat2_unavailable")
    renameat2.argtypes = [
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_uint,
    ]
    renameat2.restype = ctypes.c_int
    rc = renameat2(
        AT_FDCWD,
        os.fsencode(left),
        AT_FDCWD,
        os.fsencode(right),
        RENAME_EXCHANGE,
    )
    if rc != 0:
        err = ctypes.get_errno()
        raise OSError(err, os.strerror(err))

if os.path.dirname(stage) != os.path.dirname(latest):
    raise RuntimeError("latest_rollback_parent_mismatch")

parent_fd = os.open(
    os.path.dirname(latest),
    os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
)
try:
    if mode == "replace":
        direct_dir(latest, new_identity, "latest_rollback_new_identity_mismatch")
        prior_entry(
            stage,
            prior_kind,
            prior_identity,
            "latest_rollback_prior_identity_mismatch",
        )
        exchange(stage, latest)
        os.fsync(parent_fd)
        prior_entry(
            latest,
            prior_kind,
            prior_identity,
            "latest_rollback_restore_mismatch",
        )
        direct_dir(stage, new_identity, "latest_rollback_displaced_new_mismatch")
    elif mode == "initial":
        direct_dir(latest, new_identity, "latest_rollback_new_identity_mismatch")
        if os.path.lexists(stage):
            raise RuntimeError("latest_rollback_stage_unexpected")
        os.rename(latest, stage)
        os.fsync(parent_fd)
        direct_dir(stage, new_identity, "latest_rollback_stage_identity_mismatch")
        if os.path.lexists(latest):
            raise RuntimeError("latest_rollback_initial_latest_still_exists")
    else:
        raise RuntimeError("latest_rollback_mode_invalid")
finally:
    os.close(parent_fd)

print("latest_publish_rollback_restored=true")
PY
  )"
  rollback_rc=$?
  printf '%s\n' "$rollback_output"
  if [ "$rollback_rc" -ne 0 ]; then
    LATEST_ROLLBACK_UNCERTAIN=1
    return "$rollback_rc"
  fi
  LATEST_PUBLISHED=0
  LATEST_REPLACED_EXISTING=0
  LATEST_PRIOR_KIND=""
  LATEST_PRIOR_IDENTITY=""
  LATEST_NEW_IDENTITY=""
}

discard_prior_demo003_latest() {
  if [ "$LATEST_REPLACED_EXISTING" != "1" ]; then
    return 0
  fi
  python3 - "$LATEST_STAGE" "$LATEST_PRIOR_KIND" "$LATEST_PRIOR_IDENTITY" <<'PY'
import os
import shutil
import stat
import sys

stage, expected_kind, expected = sys.argv[1:]
O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)

def identity(st):
    return ":".join(
        str(value)
        for value in (
            st.st_dev,
            st.st_ino,
            st.st_mode,
            st.st_uid,
            st.st_gid,
        )
    )

st = os.lstat(stage)
if expected_kind == "directory":
    valid_type = stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode)
elif expected_kind == "symlink":
    valid_type = stat.S_ISLNK(st.st_mode) and st.st_uid == os.geteuid()
else:
    raise RuntimeError("latest_prior_cleanup_kind_invalid")
if not valid_type or identity(st) != expected:
    raise RuntimeError("latest_prior_cleanup_identity_mismatch")

parent_fd = os.open(
    os.path.dirname(stage),
    os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
)
try:
    if expected_kind == "directory":
        shutil.rmtree(stage)
    else:
        os.unlink(stage)
    os.fsync(parent_fd)
finally:
    os.close(parent_fd)

print("previous_latest_retired_after_validation=true")
PY
  LATEST_REPLACED_EXISTING=0
  LATEST_PRIOR_KIND=""
  LATEST_PRIOR_IDENTITY=""
}

cleanup_demo003_intake() {
  rc=$?
  set +e
  if [ "$rc" -ne 0 ] &&
     [ "$INTAKE_COMMITTED" != "1" ] &&
     [ "$LATEST_PUBLISHED" = "1" ] &&
     [ "$LATEST_ROLLBACK_UNCERTAIN" != "1" ]; then
    if ! rollback_demo003_latest; then
      echo "status=demo003_folder_intake_rollback_failed" >&2
      echo "hold_reason=latest_publish_rollback_failed" >&2
      rc=2
    fi
  fi
  if [ "$LATEST_ROLLBACK_UNCERTAIN" = "1" ]; then
    echo "rollback_uncertain_evidence_preserved=true" >&2
    echo "rollback_uncertain_latest_stage=$LATEST_STAGE" >&2
    echo "rollback_uncertain_archive=$ARCHIVE" >&2
  fi
  if [ "$LATEST_ROLLBACK_UNCERTAIN" != "1" ] &&
     [ "$LATEST_REPLACED_EXISTING" != "1" ] &&
     { [ -e "$LATEST_STAGE" ] || [ -L "$LATEST_STAGE" ]; }; then
    rm -rf -- "$LATEST_STAGE"
  fi
  if [ "$LATEST_ROLLBACK_UNCERTAIN" != "1" ] &&
     [ "$rc" -ne 0 ] &&
     [ "$LATEST_PUBLISHED" != "1" ] &&
     { [ -e "$ARCHIVE" ] || [ -L "$ARCHIVE" ]; }; then
    rm -rf -- "$ARCHIVE"
  fi
  exit "$rc"
}
trap cleanup_demo003_intake EXIT

mkdir -p "$OUT"

echo "=== VOID Public Node Demo 003 Folder Intake v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1"
echo "data_dir=$DATA_DIR"
echo "run_id=$RUN_ID"
echo "out=$OUT"
echo "latest=$LATEST"
echo "archive=$ARCHIVE"
echo "intake_lock=$LOCK_FILE"
echo "intake_lock_serialized=true"

test -x "$FIXTURE_SCRIPT"
test -x "$VERIFY_SCRIPT"
test -f "$HANDOFF_SCRIPT"
test -x "$STATUS_SCRIPT"

OUT="$FIXTURE_OUT" "$FIXTURE_SCRIPT" | tee "$OUT/fixture.log"

TARBALL="$FIXTURE_OUT/demo003-folder-fixture.tar.gz"
test -f "$TARBALL"

set +e
VERIFY_OUTPUT="$(OUT="$VERIFY_OUT" "$VERIFY_SCRIPT" "$TARBALL")"
VERIFY_RC=$?
set -e
printf '%s\n' "$VERIFY_OUTPUT" | tee "$OUT/verify.log"
if [ "$VERIFY_RC" -ne 0 ]; then
  echo "[fail] Demo003 verifier HOLD" >&2
  exit "$VERIFY_RC"
fi
if [ "${#VERIFY_OUTPUT}" -gt 131072 ]; then
  echo "[fail] Demo003 verifier output too large" >&2
  exit 2
fi
printf '%s\n' "$VERIFY_OUTPUT" |
  grep -Fxq "verified_content_authority=sealed_memfd_snapshot"
printf '%s\n' "$VERIFY_OUTPUT" |
  grep -Fxq "visible_extraction_tree_trusted=false"
printf '%s\n' "$VERIFY_OUTPUT" |
  grep -Fxq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1_GREEN"

sealed_digest() {
  key="$1"
  value="$(
    printf '%s\n' "$VERIFY_OUTPUT" |
      sed -n "s/^${key}=\([0-9a-f]\{64\}\)$/\1/p"
  )"
  count="$(
    printf '%s\n' "$VERIFY_OUTPUT" |
      grep -c "^${key}=" || true
  )"
  test "$count" = "1" && [[ "$value" =~ ^[0-9a-f]{64}$ ]] || {
    echo "[fail] missing sealed digest: $key" >&2
    return 1
  }
  printf '%s' "$value"
}

SEALED_MANIFEST_SHA256="$(sealed_digest sealed_manifest_sha256)"
SEALED_CHECKSUMS_SHA256="$(sealed_digest sealed_checksums_sha256)"
SEALED_README_SHA256="$(sealed_digest sealed_readme_sha256)"
SEALED_INDEX_SHA256="$(sealed_digest sealed_index_sha256)"
SEALED_METADATA_SHA256="$(sealed_digest sealed_metadata_sha256)"

handoff_snapshot() {
  source_root="$1"
  destination_root="$2"
  python3 "$HANDOFF_SCRIPT" \
    "$source_root" \
    "$destination_root" \
    "$SEALED_MANIFEST_SHA256" \
    "$SEALED_CHECKSUMS_SHA256" \
    "$SEALED_README_SHA256" \
    "$SEALED_INDEX_SHA256" \
    "$SEALED_METADATA_SHA256"
}

handoff_snapshot_id() {
  output="$1"
  value="$(
    printf '%s\n' "$output" |
      sed -n 's/^sealed_snapshot_set_sha256=\([0-9a-f]\{64\}\)$/\1/p'
  )"
  count="$(
    printf '%s\n' "$output" |
      grep -c '^sealed_snapshot_set_sha256=' || true
  )"
  test "$count" = "1" && [[ "$value" =~ ^[0-9a-f]{64}$ ]] || return 1
  printf '%s' "$value"
}

test -d "$VERIFY_OUT/extract/demo003-folder-fixture"

mkdir -m 0700 "$ARCHIVE"
ARCHIVE_HANDOFF="$(handoff_snapshot   "$VERIFY_OUT/extract/demo003-folder-fixture"   "$ARCHIVE")"
printf '%s\n' "$ARCHIVE_HANDOFF"
SEALED_SNAPSHOT_SET_SHA256="$(handoff_snapshot_id "$ARCHIVE_HANDOFF")" || {
  echo "[fail] Demo003 sealed handoff identity missing" >&2
  exit 2
}
printf '%s\n' "$ARCHIVE_HANDOFF" |
  grep -Fxq "destination_matches_sealed_snapshot=true"

cp -- "$OUT/fixture.log" "$ARCHIVE/fixture.log"
printf '%s\n' "$VERIFY_OUTPUT" > "$ARCHIVE/verify.log"
chmod 0600 "$ARCHIVE/fixture.log" "$ARCHIVE/verify.log"

python3 - \
  "$ARCHIVE/manifest.json" \
  "$ARCHIVE/intake.json" \
  "$SEALED_SNAPSHOT_SET_SHA256" \
  "$SEALED_MANIFEST_SHA256" \
  "$SEALED_CHECKSUMS_SHA256" \
  "$SEALED_README_SHA256" \
  "$SEALED_INDEX_SHA256" \
  "$SEALED_METADATA_SHA256" <<'PY'
import datetime
import json
import sys

(
    manifest_path,
    intake_path,
    snapshot_id,
    manifest_sha,
    checksums_sha,
    readme_sha,
    index_sha,
    metadata_sha,
) = sys.argv[1:]
manifest = json.load(open(manifest_path))

intake = {
    "marker": "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1",
    "object_set_id": manifest.get("object_set_id"),
    "file_count": manifest.get("file_count"),
    "offline_verified": True,
    "network_fetch_during_import": False,
    "trusted_as_network_truth": False,
    "verified_content_authority": "sealed_memfd_snapshot",
    "visible_extraction_tree_trusted": False,
    "sealed_snapshot_set_sha256": snapshot_id,
    "sealed_snapshot_sha256": {
        "manifest.json": manifest_sha,
        "sha256sums.txt": checksums_sha,
        "files/README.txt": readme_sha,
        "files/index.html": index_sha,
        "files/metadata.json": metadata_sha,
    },
    "public_routes_only": True,
    "read_only": True,
    "mutation": False,
    "money_movement": False,
    "wallet_send": False,
    "validator_mutation": False,
    "imported_at_utc": datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S"),
    "source_manifest": manifest,
}

with open(intake_path, "x") as handle:
    json.dump(intake, handle, indent=2, sort_keys=True)
    handle.write("\n")
PY
chmod 0600 "$ARCHIVE/intake.json"

mkdir -m 0700 "$LATEST_STAGE"
STAGE_HANDOFF="$(handoff_snapshot "$ARCHIVE" "$LATEST_STAGE")"
printf '%s\n' "$STAGE_HANDOFF"
test "$(handoff_snapshot_id "$STAGE_HANDOFF")" = "$SEALED_SNAPSHOT_SET_SHA256"
cp -- "$ARCHIVE/fixture.log" "$LATEST_STAGE/fixture.log"
cp -- "$ARCHIVE/verify.log" "$LATEST_STAGE/verify.log"
cp -- "$ARCHIVE/intake.json" "$LATEST_STAGE/intake.json"

if find "$LATEST_STAGE" -type l -print -quit | grep -q .; then
  echo "[fail] staged Demo003 fixture contains a symlink" >&2
  exit 2
fi
find "$LATEST_STAGE" -type d -exec chmod 0755 {} +
find "$LATEST_STAGE" -type f -exec chmod 0644 {} +
if find "$LATEST_STAGE" -type f -perm /022 -print -quit | grep -q .; then
  echo "[fail] staged Demo003 fixture has a group/world-writable file" >&2
  exit 2
fi
echo "latest_stage_modes_normalized=true"

# Fail closed before the publisher can exchange stage/latest. The child may
# terminate after mutating names but before emitting any parseable result.
# Cleanup must preserve stage/archive evidence unless a complete success record
# is validated below.
LATEST_ROLLBACK_UNCERTAIN=1
echo "latest_publish_uncertainty_armed_before_child=true"

set +e
PUBLISH_OUTPUT="$(
python3 - "$LATEST_STAGE" "$LATEST" <<'PY'
import ctypes
import os
import stat
import sys

stage, latest = sys.argv[1], sys.argv[2]
AT_FDCWD = -100
RENAME_EXCHANGE = 2
O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)

def identity(st):
    return ":".join(
        str(value)
        for value in (
            st.st_dev,
            st.st_ino,
            st.st_mode,
            st.st_uid,
            st.st_gid,
        )
    )

def direct_dir(pathname, label):
    st = os.lstat(pathname)
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
        raise RuntimeError(label)
    return st

def exchange(left, right):
    libc = ctypes.CDLL(None, use_errno=True)
    renameat2 = getattr(libc, "renameat2", None)
    if renameat2 is None:
        raise RuntimeError("renameat2_unavailable")
    renameat2.argtypes = [
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_uint,
    ]
    renameat2.restype = ctypes.c_int
    rc = renameat2(
        AT_FDCWD,
        os.fsencode(left),
        AT_FDCWD,
        os.fsencode(right),
        RENAME_EXCHANGE,
    )
    if rc != 0:
        err = ctypes.get_errno()
        raise OSError(err, os.strerror(err))

if os.path.dirname(stage) != os.path.dirname(latest):
    raise RuntimeError("latest_publish_parent_mismatch")

stage_before = direct_dir(stage, "latest_stage_not_direct_directory")
stage_identity = identity(stage_before)
replaced = os.path.lexists(latest)
prior_kind = ""
prior_identity = ""
published = False
parent_fd = os.open(
    os.path.dirname(latest),
    os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW,
)
try:
    if replaced:
        latest_before = os.lstat(latest)
        if stat.S_ISDIR(latest_before.st_mode) and not stat.S_ISLNK(latest_before.st_mode):
            prior_kind = "directory"
        elif stat.S_ISLNK(latest_before.st_mode) and latest_before.st_uid == os.geteuid():
            prior_kind = "symlink"
        else:
            raise RuntimeError("latest_prior_entry_unsupported")
        prior_identity = identity(latest_before)
        exchange(stage, latest)
    else:
        os.rename(stage, latest)
    published = True
    os.fsync(parent_fd)

    latest_after = direct_dir(latest, "latest_not_direct_directory")
    if identity(latest_after) != stage_identity:
        raise RuntimeError("latest_publish_new_identity_mismatch")
    if replaced:
        stage_after = os.lstat(stage)
        if prior_kind == "directory":
            valid_prior = stat.S_ISDIR(stage_after.st_mode) and not stat.S_ISLNK(stage_after.st_mode)
        elif prior_kind == "symlink":
            valid_prior = stat.S_ISLNK(stage_after.st_mode) and stage_after.st_uid == os.geteuid()
        else:
            valid_prior = False
        if not valid_prior or identity(stage_after) != prior_identity:
            raise RuntimeError("latest_publish_prior_identity_mismatch")
except BaseException:
    if published:
        try:
            if replaced:
                latest_now = direct_dir(
                    latest,
                    "latest_publish_internal_rollback_latest_not_direct",
                )
                stage_now = os.lstat(stage)
                if prior_kind == "directory":
                    valid_stage = stat.S_ISDIR(stage_now.st_mode) and not stat.S_ISLNK(stage_now.st_mode)
                elif prior_kind == "symlink":
                    valid_stage = stat.S_ISLNK(stage_now.st_mode) and stage_now.st_uid == os.geteuid()
                else:
                    valid_stage = False
                if (
                    identity(latest_now) != stage_identity
                    or not valid_stage
                    or identity(stage_now) != prior_identity
                ):
                    raise RuntimeError(
                        "latest_publish_internal_rollback_identity_mismatch"
                    )
                exchange(stage, latest)
            else:
                latest_now = direct_dir(
                    latest,
                    "latest_publish_internal_rollback_latest_not_direct",
                )
                if identity(latest_now) != stage_identity:
                    raise RuntimeError(
                        "latest_publish_internal_rollback_identity_mismatch"
                    )
                if os.path.lexists(stage):
                    raise RuntimeError(
                        "latest_publish_internal_rollback_stage_exists"
                    )
                os.rename(latest, stage)
            os.fsync(parent_fd)
        except BaseException as rollback_error:
            print("latest_publish_failure_state=rollback_uncertain")
            print(
                "latest_publish_failure_replaced_existing=" +
                ("true" if replaced else "false")
            )
            print("latest_publish_failure_prior_kind=" + prior_kind)
            print("latest_publish_failure_prior_identity=" + prior_identity)
            print("latest_publish_failure_new_identity=" + stage_identity)
            sys.stdout.flush()
            raise RuntimeError(
                "latest_publish_failed_and_internal_rollback_failed:"
                + str(rollback_error)
            )
    raise
finally:
    os.close(parent_fd)

print("latest_atomic_publish=true")
print("latest_real_directory=true")
print("latest_symlink=false")
print("latest_replaced_existing=" + ("true" if replaced else "false"))
print("latest_prior_kind=" + (prior_kind if replaced else "none"))
print("latest_prior_identity=" + (prior_identity if replaced else "none"))
print("latest_new_identity=" + stage_identity)
PY
)"
PUBLISH_RC=$?
set -e
printf '%s\n' "$PUBLISH_OUTPUT"
if [ "$PUBLISH_RC" -ne 0 ]; then
  if printf '%s\n' "$PUBLISH_OUTPUT" |
       grep -Fxq "latest_publish_failure_state=rollback_uncertain"; then
    LATEST_ROLLBACK_UNCERTAIN=1
    echo "status=demo003_folder_intake_publish_rollback_uncertain" >&2
    echo "hold_reason=latest_publish_internal_rollback_failed" >&2
  fi
  exit "$PUBLISH_RC"
fi
LATEST_REPLACED_EXISTING="$(
  printf '%s\n' "$PUBLISH_OUTPUT" |
    sed -n 's/^latest_replaced_existing=\(true\|false\)$/\1/p'
)"
LATEST_PRIOR_KIND="$(
  printf '%s\n' "$PUBLISH_OUTPUT" |
    sed -n 's/^latest_prior_kind=\(directory\|symlink\|none\)$/\1/p'
)"
LATEST_PRIOR_IDENTITY="$(
  printf '%s\n' "$PUBLISH_OUTPUT" |
    sed -n 's/^latest_prior_identity=\(.*\)$/\1/p'
)"
LATEST_NEW_IDENTITY="$(
  printf '%s\n' "$PUBLISH_OUTPUT" |
    sed -n 's/^latest_new_identity=\(.*\)$/\1/p'
)"
if [ "$LATEST_REPLACED_EXISTING" != "true" ] &&
   [ "$LATEST_REPLACED_EXISTING" != "false" ]; then
  echo "[fail] Demo003 latest publish mode missing" >&2
  exit 2
fi
if ! [[ "$LATEST_NEW_IDENTITY" =~ ^[0-9]+:[0-9]+:[0-9]+:[0-9]+:[0-9]+$ ]]; then
  echo "[fail] Demo003 latest publish identity invalid" >&2
  exit 2
fi
if [ "$LATEST_REPLACED_EXISTING" = "true" ]; then
  if [ "$LATEST_PRIOR_KIND" != "directory" ] &&
     [ "$LATEST_PRIOR_KIND" != "symlink" ]; then
    echo "[fail] Demo003 prior latest kind invalid" >&2
    exit 2
  fi
  if ! [[ "$LATEST_PRIOR_IDENTITY" =~ ^[0-9]+:[0-9]+:[0-9]+:[0-9]+:[0-9]+$ ]]; then
    echo "[fail] Demo003 prior latest identity invalid" >&2
    exit 2
  fi
  LATEST_REPLACED_EXISTING=1
else
  test "$LATEST_PRIOR_KIND" = "none"
  test "$LATEST_PRIOR_IDENTITY" = "none"
  LATEST_REPLACED_EXISTING=0
fi
LATEST_PUBLISHED=1
LATEST_ROLLBACK_UNCERTAIN=0
echo "latest_publish_uncertainty_cleared_after_validated_success=true"

python3 - "$LATEST/intake.json" <<'PY'
import json, sys

d = json.load(open(sys.argv[1]))
assert d["marker"] == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1"
assert d["offline_verified"] is True
assert d["network_fetch_during_import"] is False
assert d["trusted_as_network_truth"] is False
assert d["verified_content_authority"] == "sealed_memfd_snapshot"
assert d["visible_extraction_tree_trusted"] is False
assert isinstance(d["sealed_snapshot_set_sha256"], str)
assert len(d["sealed_snapshot_set_sha256"]) == 64
assert d["file_count"] == 3

print("object_set_id=" + str(d["object_set_id"]))
print("file_count=" + str(d["file_count"]))
print("offline_verified=true")
print("network_fetch_during_import=false")
print("trusted_as_network_truth=false")
print("verified_content_authority=sealed_memfd_snapshot")
print("visible_extraction_tree_trusted=false")
print("sealed_snapshot_set_sha256=" + d["sealed_snapshot_set_sha256"])
PY

set +e
PUBLISHED_STATUS="$(
  DATA_DIR="$DATA_DIR" "$STATUS_SCRIPT"
)"
PUBLISHED_STATUS_RC=$?
set -e
printf '%s\n' "$PUBLISHED_STATUS"
if [ "$PUBLISHED_STATUS_RC" -ne 0 ]; then
  echo "status=demo003_folder_intake_held_after_publish_validation"
  echo "hold_reason=published_latest_status_not_green"
  echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED=false"
  exit "$PUBLISHED_STATUS_RC"
fi
if [ "${#PUBLISHED_STATUS}" -gt 131072 ]; then
  echo "status=demo003_folder_intake_held_after_publish_validation"
  echo "hold_reason=published_latest_status_too_large"
  echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED=false"
  exit 2
fi
printf '%s\n' "$PUBLISHED_STATUS" |
  grep -Fxq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true"
PUBLISHED_SNAPSHOT_SET="$(
  printf '%s\n' "$PUBLISHED_STATUS" |
    sed -n 's/^sealed_snapshot_set_sha256=\([0-9a-f]\{64\}\)$/\1/p'
)"
PUBLISHED_SNAPSHOT_SET_COUNT="$(
  printf '%s\n' "$PUBLISHED_STATUS" |
    grep -c '^sealed_snapshot_set_sha256=' || true
)"
if [ "$PUBLISHED_SNAPSHOT_SET_COUNT" != "1" ] ||
   [ "$PUBLISHED_SNAPSHOT_SET" != "$SEALED_SNAPSHOT_SET_SHA256" ]; then
  echo "status=demo003_folder_intake_held_after_publish_validation"
  echo "hold_reason=published_latest_snapshot_identity_mismatch"
  echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED=false"
  exit 2
fi
echo "published_latest_snapshot_revalidated=true"

discard_prior_demo003_latest
INTAKE_COMMITTED=1
echo "latest_publish_commit_validated=true"

echo "archive=$ARCHIVE"
echo "latest=$LATEST"
echo "latest_atomic_publish=true"
echo "latest_real_directory=true"
echo "latest_symlink=false"
echo "latest_file_modes_safe=true"
echo "demo003_publication_ancestry_secure=true"
echo "intake_lock_serialized=true"
echo "run_identity_collision_resistant=true"
echo "sealed_snapshot_handoff_bound=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED"

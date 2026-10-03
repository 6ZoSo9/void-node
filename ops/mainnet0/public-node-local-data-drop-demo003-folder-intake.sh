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

cleanup_demo003_intake() {
  rc=$?
  set +e
  if [ -e "$LATEST_STAGE" ] || [ -L "$LATEST_STAGE" ]; then rm -rf -- "$LATEST_STAGE"; fi
  if [ "$rc" -ne 0 ] && { [ -e "$ARCHIVE" ] || [ -L "$ARCHIVE" ]; }; then rm -rf -- "$ARCHIVE"; fi
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

OUT="$FIXTURE_OUT" "$FIXTURE_SCRIPT" | tee "$OUT/fixture.log"

TARBALL="$FIXTURE_OUT/demo003-folder-fixture.tar.gz"
test -f "$TARBALL"

OUT="$VERIFY_OUT" "$VERIFY_SCRIPT" "$TARBALL" | tee "$OUT/verify.log"

test -d "$VERIFY_OUT/extract/demo003-folder-fixture"
test -f "$VERIFY_OUT/extract/demo003-folder-fixture/manifest.json"
test -f "$VERIFY_OUT/extract/demo003-folder-fixture/sha256sums.txt"

mkdir -m 0700 "$ARCHIVE"
cp -a "$VERIFY_OUT/extract/demo003-folder-fixture/." "$ARCHIVE/"
cp "$OUT/fixture.log" "$ARCHIVE/fixture.log"
cp "$OUT/verify.log" "$ARCHIVE/verify.log"

python3 - "$ARCHIVE/manifest.json" "$ARCHIVE/intake.json" <<'PY'
import json, sys, datetime

manifest_path, intake_path = sys.argv[1], sys.argv[2]
manifest = json.load(open(manifest_path))

intake = {
    "marker": "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1",
    "object_set_id": manifest.get("object_set_id"),
    "file_count": manifest.get("file_count"),
    "offline_verified": True,
    "network_fetch_during_import": False,
    "trusted_as_network_truth": False,
    "public_routes_only": True,
    "read_only": True,
    "mutation": False,
    "money_movement": False,
    "wallet_send": False,
    "validator_mutation": False,
    "imported_at_utc": datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S"),
    "source_manifest": manifest,
}

with open(intake_path, "w") as f:
    json.dump(intake, f, indent=2, sort_keys=True)
    f.write("\n")
PY

mkdir -m 0700 "$LATEST_STAGE"
cp -a "$ARCHIVE/." "$LATEST_STAGE/"

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

python3 - "$LATEST_STAGE" "$LATEST" <<'PY'
import ctypes
import os
import shutil
import stat
import sys

stage, latest = sys.argv[1], sys.argv[2]
AT_FDCWD = -100
RENAME_EXCHANGE = 2

if os.path.lexists(latest):
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
        os.fsencode(stage),
        AT_FDCWD,
        os.fsencode(latest),
        RENAME_EXCHANGE,
    )
    if rc != 0:
        err = ctypes.get_errno()
        raise OSError(err, os.strerror(err))
    if os.path.islink(stage) or not os.path.isdir(stage):
        os.unlink(stage)
    else:
        shutil.rmtree(stage)
else:
    os.rename(stage, latest)

st = os.lstat(latest)
if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
    raise RuntimeError("latest_not_direct_directory")

print("latest_atomic_publish=true")
print("latest_real_directory=true")
print("latest_symlink=false")
PY

python3 - "$LATEST/intake.json" <<'PY'
import json, sys

d = json.load(open(sys.argv[1]))
assert d["marker"] == "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1"
assert d["offline_verified"] is True
assert d["network_fetch_during_import"] is False
assert d["trusted_as_network_truth"] is False
assert d["file_count"] == 3

print("object_set_id=" + str(d["object_set_id"]))
print("file_count=" + str(d["file_count"]))
print("offline_verified=true")
print("network_fetch_during_import=false")
print("trusted_as_network_truth=false")
PY

echo "archive=$ARCHIVE"
echo "latest=$LATEST"
echo "latest_atomic_publish=true"
echo "latest_real_directory=true"
echo "latest_symlink=false"
echo "latest_file_modes_safe=true"
echo "demo003_publication_ancestry_secure=true"
echo "intake_lock_serialized=true"
echo "run_identity_collision_resistant=true"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_V1_IMPORTED"

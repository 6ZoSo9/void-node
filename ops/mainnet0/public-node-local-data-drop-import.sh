#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-}"
OBJECT_ID="${2:-}"

if [ -z "$SRC" ]; then
  echo "usage: DATA_DIR=.runtime/mainnet0 ops/mainnet0/public-node-local-data-drop-import.sh /path/to/file [object-id]" >&2
  exit 2
fi

DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"

if [ -z "$OBJECT_ID" ]; then
  BASE="$(basename "$SRC")"
  SAFE="$(printf '%s' "$BASE" | tr -cd 'A-Za-z0-9._-' | cut -c1-120)"
  HASH="$(sha256sum "$SRC" | awk '{print $1}' | cut -c1-16)"
  OBJECT_ID="${HASH}-${SAFE:-object.bin}"
fi

if ! printf '%s' "$OBJECT_ID" | grep -Eq '^[A-Za-z0-9._:-]{1,160}$' ||
   [ "$OBJECT_ID" = "." ] || [ "$OBJECT_ID" = ".." ]; then
  echo "[fail] invalid object id: $OBJECT_ID" >&2
  exit 2
fi

# VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SECURE_STAGED_CREATE_ONLY_V2
python3 - "$SRC" "$DATA_DIR" "$OBJECT_ID" <<'PY'
import datetime
import hashlib
import json
import os
import secrets
import stat
import sys

src, data_dir, object_id = sys.argv[1:]
receipt_name = object_id + ".json"
euid = os.geteuid()

O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
O_CLOEXEC = getattr(os, "O_CLOEXEC", 0)
DIR_FLAGS = os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC
CREATE_FLAGS = os.O_RDWR | os.O_CREAT | os.O_EXCL | O_NOFOLLOW | O_CLOEXEC
READ_FLAGS = os.O_RDONLY | O_NOFOLLOW | O_CLOEXEC


def fail(msg):
    raise RuntimeError(msg)


def same_identity(a, b):
    return (a.st_dev, a.st_ino) == (b.st_dev, b.st_ino)


def open_child_dir(parent_fd, name, label, create, require_owner):
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

    fd = os.open(name, DIR_FLAGS, dir_fd=parent_fd)
    after = os.fstat(fd)
    if not stat.S_ISDIR(after.st_mode) or not same_identity(before, after):
        os.close(fd)
        fail(f"{label}_identity_changed")
    if require_owner and after.st_uid != euid:
        os.close(fd)
        fail(f"{label}_not_owned_by_operator")
    if require_owner and (after.st_mode & 0o022):
        os.close(fd)
        fail(f"{label}_group_or_world_writable")
    return fd


def open_data_root(path):
    if not path or "\x00" in path:
        fail("data_dir_invalid")
    absolute = os.path.isabs(path)
    parts = []
    for part in path.split(os.sep):
        if part in ("", "."):
            continue
        if part == "..":
            fail("data_dir_parent_component_rejected")
        parts.append(part)

    fd = os.open("/" if absolute else ".", DIR_FLAGS)
    for idx, part in enumerate(parts):
        next_fd = open_child_dir(
            fd,
            part,
            f"data_dir_component_{idx}",
            True,
            False,
        )
        os.close(fd)
        fd = next_fd
    return fd


def open_existing_file(dir_fd, name, label):
    try:
        before = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    except FileNotFoundError:
        return None, None
    if not stat.S_ISREG(before.st_mode):
        fail(f"{label}_not_direct_regular_file")
    fd = os.open(name, READ_FLAGS, dir_fd=dir_fd)
    after = os.fstat(fd)
    if not stat.S_ISREG(after.st_mode) or not same_identity(before, after):
        os.close(fd)
        fail(f"{label}_identity_changed")
    if after.st_uid != euid:
        os.close(fd)
        fail(f"{label}_not_owned_by_operator")
    return fd, after


def hash_fd(fd):
    os.lseek(fd, 0, os.SEEK_SET)
    h = hashlib.sha256()
    total = 0
    while True:
        chunk = os.read(fd, 1024 * 1024)
        if not chunk:
            break
        h.update(chunk)
        total += len(chunk)
    os.lseek(fd, 0, os.SEEK_SET)
    return total, h.hexdigest()


def write_all(fd, data):
    view = memoryview(data)
    while view:
        written = os.write(fd, view)
        if written <= 0:
            fail("short_write")
        view = view[written:]


def create_stage_file(staging_fd, label):
    for _ in range(32):
        name = f"{label}-{os.getpid()}-{secrets.token_hex(16)}"
        try:
            fd = os.open(name, CREATE_FLAGS, 0o600, dir_fd=staging_fd)
            created = os.fstat(fd)
            if not stat.S_ISREG(created.st_mode):
                os.close(fd)
                fail(f"{label}_stage_not_regular")
            return name, fd, created
        except FileExistsError:
            continue
    fail(f"{label}_stage_name_exhausted")


def unlink_if_same(dir_fd, name, created):
    try:
        current = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    except FileNotFoundError:
        return
    if stat.S_ISREG(current.st_mode) and same_identity(current, created):
        os.unlink(name, dir_fd=dir_fd)


def publish_stage(staging_fd, stage_name, created, target_fd, target_name, label):
    before = os.stat(stage_name, dir_fd=staging_fd, follow_symlinks=False)
    if not stat.S_ISREG(before.st_mode) or not same_identity(before, created):
        fail(f"{label}_stage_identity_changed")

    os.link(
        stage_name,
        target_name,
        src_dir_fd=staging_fd,
        dst_dir_fd=target_fd,
        follow_symlinks=False,
    )
    published = os.stat(target_name, dir_fd=target_fd, follow_symlinks=False)
    if not stat.S_ISREG(published.st_mode) or not same_identity(published, created):
        unlink_if_same(target_fd, target_name, published)
        fail(f"{label}_publish_identity_mismatch")

    os.fsync(target_fd)
    unlink_if_same(staging_fd, stage_name, created)
    os.fsync(staging_fd)
    return published


def validate_receipt(fd, expected_sha, expected_bytes):
    os.lseek(fd, 0, os.SEEK_SET)
    with os.fdopen(os.dup(fd), "r", encoding="utf-8") as handle:
        doc = json.load(handle)
    required = {
        "marker": "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
        "object_id": object_id,
        "bytes": expected_bytes,
        "sha256": expected_sha,
        "storage_class": "operator_local_public_read_only",
        "public_upload": False,
        "operator_local_import_only": True,
        "trusted_as_network_truth": False,
    }
    for key, value in required.items():
        if doc.get(key) != value:
            fail(f"receipt_existing_mismatch:{key}")
    if not isinstance(doc.get("imported_at"), str) or not doc["imported_at"]:
        fail("receipt_existing_imported_at_invalid")


fds = []
stage_object = None
stage_receipt = None
published_object = None
published_receipt = None
objects_fd = None
receipts_fd = None
staging_fd = None

try:
    source_before = os.lstat(src)
    if not stat.S_ISREG(source_before.st_mode):
        fail("source_not_direct_regular_file")
    src_fd = os.open(src, os.O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
    fds.append(src_fd)
    source_after = os.fstat(src_fd)
    if not stat.S_ISREG(source_after.st_mode) or not same_identity(source_before, source_after):
        fail("source_identity_changed")
    expected_bytes, expected_sha = hash_fd(src_fd)

    data_fd = open_data_root(data_dir)
    fds.append(data_fd)
    public_fd = open_child_dir(data_fd, "public-node", "public_node_dir", True, True)
    fds.append(public_fd)
    local_fd = open_child_dir(public_fd, "local-data-drop", "local_data_drop_dir", True, True)
    fds.append(local_fd)
    objects_fd = open_child_dir(local_fd, "objects", "objects_dir", True, True)
    fds.append(objects_fd)
    receipts_fd = open_child_dir(local_fd, "receipts", "receipts_dir", True, True)
    fds.append(receipts_fd)
    staging_fd = open_child_dir(local_fd, ".import-staging-v2", "staging_dir", True, True)
    fds.append(staging_fd)

    object_fd, object_stat = open_existing_file(objects_fd, object_id, "object_existing")
    if object_fd is not None:
        fds.append(object_fd)
        object_bytes, object_sha = hash_fd(object_fd)
        if object_bytes != expected_bytes or object_sha != expected_sha:
            fail("object_existing_content_mismatch")

    receipt_fd, receipt_stat = open_existing_file(receipts_fd, receipt_name, "receipt_existing")
    if receipt_fd is not None:
        fds.append(receipt_fd)
        validate_receipt(receipt_fd, expected_sha, expected_bytes)

    object_exists = object_fd is not None
    receipt_exists = receipt_fd is not None
    if object_exists and receipt_exists:
        fail("object_and_receipt_already_exist")

    if not object_exists:
        stage_object = create_stage_file(staging_fd, "object")
        stage_name, stage_fd, stage_stat = stage_object
        fds.append(stage_fd)
        os.lseek(src_fd, 0, os.SEEK_SET)
        copied_hash = hashlib.sha256()
        copied_bytes = 0
        while True:
            chunk = os.read(src_fd, 1024 * 1024)
            if not chunk:
                break
            write_all(stage_fd, chunk)
            copied_hash.update(chunk)
            copied_bytes += len(chunk)
        if copied_bytes != expected_bytes or copied_hash.hexdigest() != expected_sha:
            fail("source_changed_during_stage")
        os.fsync(stage_fd)

    if not receipt_exists:
        imported_at = datetime.datetime.now(
            datetime.timezone.utc
        ).strftime("%Y-%m-%dT%H:%M:%SZ")
        receipt_doc = {
            "marker": "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
            "object_id": object_id,
            "bytes": expected_bytes,
            "sha256": expected_sha,
            "imported_at": imported_at,
            "storage_class": "operator_local_public_read_only",
            "public_upload": False,
            "operator_local_import_only": True,
            "trusted_as_network_truth": False,
        }
        receipt_bytes = (
            json.dumps(receipt_doc, indent=2, sort_keys=True) + "\n"
        ).encode("utf-8")
        stage_receipt = create_stage_file(staging_fd, "receipt")
        stage_name, stage_fd, stage_stat = stage_receipt
        fds.append(stage_fd)
        write_all(stage_fd, receipt_bytes)
        os.fsync(stage_fd)

    # Publish the receipt first. If interrupted here, no object is exposed; a
    # later retry validates the orphan receipt and resumes object publication.
    if not receipt_exists:
        stage_name, stage_fd, stage_stat = stage_receipt
        published_receipt = publish_stage(
            staging_fd,
            stage_name,
            stage_stat,
            receipts_fd,
            receipt_name,
            "receipt",
        )

    if not object_exists:
        stage_name, stage_fd, stage_stat = stage_object
        published_object = publish_stage(
            staging_fd,
            stage_name,
            stage_stat,
            objects_fd,
            object_id,
            "object",
        )

    print("marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1")
    print(f"object_id={object_id}")
    print(f"bytes={expected_bytes}")
    print(f"sha256={expected_sha}")
    print(f"dest={os.path.join(data_dir, 'public-node', 'local-data-drop', 'objects', object_id)}")
    print(f"receipt={os.path.join(data_dir, 'public-node', 'local-data-drop', 'receipts', receipt_name)}")
    print("receipt_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1")
    print("public_index_route=/public-node/local-data-drop.json")
    print(f"public_object_route=/public-node/local-data-drop/{object_id}")
    print("public_upload=false")
    print("operator_local_import_only=true")
    print("public_read_only=true")
    print("create_only=true")
    print("ancestor_nofollow=true")
    print("staged_atomic_publication=true")
    print(f"recovered_orphan_receipt={str(receipt_exists and not object_exists).lower()}")
    print(f"recovered_orphan_object={str(object_exists and not receipt_exists).lower()}")
    print("VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1_IMPORTED")
except Exception as exc:
    if objects_fd is not None and published_object is not None:
        try:
            unlink_if_same(objects_fd, object_id, published_object)
        except OSError:
            pass
    if receipts_fd is not None and published_receipt is not None:
        try:
            unlink_if_same(receipts_fd, receipt_name, published_receipt)
        except OSError:
            pass
    if staging_fd is not None:
        for item in (stage_object, stage_receipt):
            if item is not None:
                try:
                    unlink_if_same(staging_fd, item[0], item[2])
                except OSError:
                    pass
    print(f"[fail] secure local data drop import: {exc}", file=sys.stderr)
    sys.exit(2)
finally:
    seen = set()
    for fd in reversed(fds):
        if fd in seen:
            continue
        seen.add(fd)
        try:
            os.close(fd)
        except OSError:
            pass
PY

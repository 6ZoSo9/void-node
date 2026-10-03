#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-}"
OBJECT_ID="${2:-}"

if [ -z "$SRC" ]; then
  echo "usage: DATA_DIR=.runtime/mainnet0 ops/mainnet0/public-node-local-data-drop-import.sh /path/to/file [object-id]" >&2
  exit 2
fi

if [ ! -f "$SRC" ]; then
  echo "[fail] source file not found: $SRC" >&2
  exit 2
fi

DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
DROP_DIR="$DATA_DIR/public-node/local-data-drop/objects"
RECEIPT_DIR="$DATA_DIR/public-node/local-data-drop/receipts"
mkdir -p "$DROP_DIR" "$RECEIPT_DIR"

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

# VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SECURE_CREATE_ONLY_V1
python3 - "$SRC" "$DROP_DIR" "$RECEIPT_DIR" "$OBJECT_ID" <<'PY'
import datetime
import hashlib
import json
import os
import stat
import sys

src, drop_dir, receipt_dir, object_id = sys.argv[1:]
receipt_name = object_id + ".json"
euid = os.geteuid()

O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
O_CLOEXEC = getattr(os, "O_CLOEXEC", 0)


def fail(msg):
    raise RuntimeError(msg)


def open_store_dir(path, label):
    before = os.lstat(path)
    if not stat.S_ISDIR(before.st_mode):
        fail(f"{label}_not_direct_directory")
    if before.st_uid != euid:
        fail(f"{label}_not_owned_by_operator")

    fd = os.open(path, os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC)
    after = os.fstat(fd)
    if not stat.S_ISDIR(after.st_mode):
        os.close(fd)
        fail(f"{label}_fd_not_directory")
    if after.st_uid != euid:
        os.close(fd)
        fail(f"{label}_fd_not_owned_by_operator")
    if (before.st_dev, before.st_ino) != (after.st_dev, after.st_ino):
        os.close(fd)
        fail(f"{label}_identity_changed")
    return fd


def write_all(fd, data):
    view = memoryview(data)
    while view:
        written = os.write(fd, view)
        if written <= 0:
            fail("short_write")
        view = view[written:]


def unlink_if_same(dir_fd, name, created):
    try:
        current = os.stat(name, dir_fd=dir_fd, follow_symlinks=False)
    except FileNotFoundError:
        return
    if (
        stat.S_ISREG(current.st_mode)
        and current.st_dev == created.st_dev
        and current.st_ino == created.st_ino
    ):
        os.unlink(name, dir_fd=dir_fd)


drop_fd = None
receipt_dir_fd = None
object_fd = None
receipt_fd = None
object_created = None
receipt_created = None

try:
    drop_fd = open_store_dir(drop_dir, "objects_dir")
    receipt_dir_fd = open_store_dir(receipt_dir, "receipts_dir")

    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | O_NOFOLLOW | O_CLOEXEC
    object_fd = os.open(object_id, flags, 0o644, dir_fd=drop_fd)
    object_created = os.fstat(object_fd)
    if not stat.S_ISREG(object_created.st_mode):
        fail("object_destination_not_regular")

    sha256 = hashlib.sha256()
    byte_length = 0
    with open(src, "rb") as source:
        if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
            fail("source_not_regular")
        while True:
            chunk = source.read(1024 * 1024)
            if not chunk:
                break
            write_all(object_fd, chunk)
            sha256.update(chunk)
            byte_length += len(chunk)

    os.fsync(object_fd)

    imported_at = datetime.datetime.now(
        datetime.timezone.utc
    ).strftime("%Y-%m-%dT%H:%M:%SZ")
    digest = sha256.hexdigest()
    receipt_doc = {
        "marker": "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1",
        "object_id": object_id,
        "bytes": byte_length,
        "sha256": digest,
        "imported_at": imported_at,
        "storage_class": "operator_local_public_read_only",
        "public_upload": False,
        "operator_local_import_only": True,
        "trusted_as_network_truth": False,
    }
    receipt_bytes = (
        json.dumps(receipt_doc, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")

    receipt_fd = os.open(
        receipt_name,
        flags,
        0o644,
        dir_fd=receipt_dir_fd,
    )
    receipt_created = os.fstat(receipt_fd)
    if not stat.S_ISREG(receipt_created.st_mode):
        fail("receipt_destination_not_regular")

    write_all(receipt_fd, receipt_bytes)
    os.fsync(receipt_fd)
    os.fsync(drop_fd)
    os.fsync(receipt_dir_fd)

    print("marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1")
    print(f"object_id={object_id}")
    print(f"bytes={byte_length}")
    print(f"sha256={digest}")
    print(f"dest={os.path.join(drop_dir, object_id)}")
    print(f"receipt={os.path.join(receipt_dir, receipt_name)}")
    print("receipt_marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1")
    print("public_index_route=/public-node/local-data-drop.json")
    print(f"public_object_route=/public-node/local-data-drop/{object_id}")
    print("public_upload=false")
    print("operator_local_import_only=true")
    print("public_read_only=true")
    print("create_only=true")
    print("destination_nofollow=true")
    print("VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_V1_IMPORTED")
except Exception as exc:
    if receipt_dir_fd is not None and receipt_created is not None:
        try:
            unlink_if_same(receipt_dir_fd, receipt_name, receipt_created)
        except OSError:
            pass
    if drop_fd is not None and object_created is not None:
        try:
            unlink_if_same(drop_fd, object_id, object_created)
        except OSError:
            pass
    print(f"[fail] secure local data drop import: {exc}", file=sys.stderr)
    sys.exit(2)
finally:
    for fd in (receipt_fd, object_fd, receipt_dir_fd, drop_fd):
        if fd is not None:
            try:
                os.close(fd)
            except OSError:
                pass
PY

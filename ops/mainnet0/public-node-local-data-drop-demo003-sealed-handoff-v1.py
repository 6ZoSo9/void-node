#!/usr/bin/env python3
import hashlib
import os
import re
import stat
import sys

MARKER = "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_SEALED_HANDOFF_V1"
MAX_MEMBER_BYTES = 2 * 1024 * 1024
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
O_CLOEXEC = getattr(os, "O_CLOEXEC", 0)
O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)
DIR_FLAGS = os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC
READ_FLAGS = os.O_RDONLY | O_NOFOLLOW | O_CLOEXEC
WRITE_FLAGS = os.O_RDWR | os.O_CREAT | os.O_EXCL | O_NOFOLLOW | O_CLOEXEC
SHA256 = re.compile(r"^[0-9a-f]{64}$")

SEMANTIC = (
    ("manifest.json", False),
    ("sha256sums.txt", False),
    ("files/README.txt", True),
    ("files/index.html", True),
    ("files/metadata.json", True),
)


def fail(message):
    raise RuntimeError(message)


def same_stamp(a, b):
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
        and a.st_mode == b.st_mode
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_nlink == b.st_nlink
    )


def same_dir_identity(a, b):
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_mode == b.st_mode
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
    )


def open_private_dir(pathname, label):
    if not os.path.isabs(pathname) or os.path.abspath(pathname) != pathname:
        fail(label + "_path_not_absolute_normalized")
    listed = os.lstat(pathname)
    if (
        not stat.S_ISDIR(listed.st_mode)
        or stat.S_ISLNK(listed.st_mode)
        or listed.st_uid != os.geteuid()
        or listed.st_mode & 0o077
    ):
        fail(label + "_not_private_direct_directory")
    fd = os.open(pathname, DIR_FLAGS)
    opened = os.fstat(fd)
    if not same_dir_identity(listed, opened):
        os.close(fd)
        fail(label + "_identity_changed")
    return fd


def open_or_create_files_dir(root_fd, create, label):
    try:
        listed = os.stat("files", dir_fd=root_fd, follow_symlinks=False)
        exists = True
    except FileNotFoundError:
        listed = None
        exists = False
    if create:
        if exists:
            fail(label + "_files_already_exists")
        os.mkdir("files", 0o700, dir_fd=root_fd)
        listed = os.stat("files", dir_fd=root_fd, follow_symlinks=False)
    elif not exists:
        fail(label + "_files_missing")

    assert listed is not None
    if (
        not stat.S_ISDIR(listed.st_mode)
        or stat.S_ISLNK(listed.st_mode)
        or listed.st_uid != os.geteuid()
        or listed.st_mode & 0o077
    ):
        fail(label + "_files_not_private_direct_directory")

    fd = os.open("files", DIR_FLAGS, dir_fd=root_fd)
    opened = os.fstat(fd)
    if not same_dir_identity(listed, opened):
        os.close(fd)
        fail(label + "_files_identity_changed")
    return fd


def read_bound(parent_fd, leaf, rel, expected_sha):
    listed = os.stat(leaf, dir_fd=parent_fd, follow_symlinks=False)
    if (
        not stat.S_ISREG(listed.st_mode)
        or stat.S_ISLNK(listed.st_mode)
        or listed.st_uid != os.geteuid()
        or listed.st_nlink != 1
        or listed.st_mode & 0o022
        or listed.st_size <= 0
        or listed.st_size > MAX_MEMBER_BYTES
    ):
        fail("source_file_custody_invalid:" + rel)

    fd = os.open(leaf, READ_FLAGS, dir_fd=parent_fd)
    try:
        opened = os.fstat(fd)
        if not same_stamp(listed, opened):
            fail("source_file_identity_changed:" + rel)

        digest = hashlib.sha256()
        chunks = []
        total = 0
        while True:
            chunk = os.read(fd, 65536)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_MEMBER_BYTES:
                fail("source_file_growth:" + rel)
            digest.update(chunk)
            chunks.append(chunk)

        after = os.fstat(fd)
        visible = os.stat(leaf, dir_fd=parent_fd, follow_symlinks=False)
        if (
            total != after.st_size
            or not same_stamp(opened, after)
            or not same_stamp(after, visible)
        ):
            fail("source_file_changed_during_read:" + rel)
        actual = digest.hexdigest()
        if actual != expected_sha:
            fail("source_file_sealed_digest_mismatch:" + rel)
        return b"".join(chunks)
    finally:
        os.close(fd)


def write_all(fd, data):
    view = memoryview(data)
    while view:
        count = os.write(fd, view)
        if count <= 0:
            fail("destination_short_write")
        view = view[count:]


def write_bound(parent_fd, leaf, rel, data, expected_sha):
    fd = os.open(leaf, WRITE_FLAGS, 0o600, dir_fd=parent_fd)
    try:
        write_all(fd, data)
        os.fchmod(fd, 0o600)
        os.fsync(fd)
        created = os.fstat(fd)
        if (
            not stat.S_ISREG(created.st_mode)
            or created.st_uid != os.geteuid()
            or created.st_nlink != 1
            or created.st_mode & 0o022
            or created.st_size != len(data)
        ):
            fail("destination_file_custody_invalid:" + rel)
        rebound = os.pread(fd, len(data) + 1, 0)
        if rebound != data:
            fail("destination_file_bytes_mismatch:" + rel)
        if hashlib.sha256(rebound).hexdigest() != expected_sha:
            fail("destination_file_digest_mismatch:" + rel)
    finally:
        os.close(fd)


def snapshot_id(expected):
    material = "".join(
        rel + "=" + expected[rel] + "\n"
        for rel, _ in SEMANTIC
    ).encode("ascii")
    return hashlib.sha256(material).hexdigest()


def main():
    if len(sys.argv) != 8:
        fail("usage")
    source_root = os.path.abspath(sys.argv[1])
    destination_root = os.path.abspath(sys.argv[2])
    expected_values = sys.argv[3:]
    if any(not SHA256.fullmatch(value) for value in expected_values):
        fail("expected_digest_invalid")

    expected = {
        rel: digest
        for (rel, _), digest in zip(SEMANTIC, expected_values, strict=True)
    }

    source_fd = open_private_dir(source_root, "source_root")
    destination_fd = open_private_dir(destination_root, "destination_root")
    source_files_fd = -1
    destination_files_fd = -1
    try:
        destination_names = set(os.listdir(destination_fd))
        if destination_names:
            fail("destination_root_not_empty")

        source_files_fd = open_or_create_files_dir(
            source_fd, False, "source_root"
        )
        destination_files_fd = open_or_create_files_dir(
            destination_fd, True, "destination_root"
        )

        snapshot = {}
        for rel, under_files in SEMANTIC:
            parent_fd = source_files_fd if under_files else source_fd
            leaf = rel.split("/", 1)[1] if under_files else rel
            snapshot[rel] = read_bound(
                parent_fd,
                leaf,
                rel,
                expected[rel],
            )

        for rel, under_files in SEMANTIC:
            parent_fd = (
                destination_files_fd if under_files else destination_fd
            )
            leaf = rel.split("/", 1)[1] if under_files else rel
            write_bound(
                parent_fd,
                leaf,
                rel,
                snapshot[rel],
                expected[rel],
            )

        os.fsync(destination_files_fd)
        os.fsync(destination_fd)

        for rel, under_files in SEMANTIC:
            parent_fd = (
                destination_files_fd if under_files else destination_fd
            )
            leaf = rel.split("/", 1)[1] if under_files else rel
            read_bound(parent_fd, leaf, rel, expected[rel])

        print("marker=" + MARKER)
        print("status=sealed_snapshot_handoff_green")
        print("sealed_snapshot_set_sha256=" + snapshot_id(expected))
        print("semantic_file_count=5")
        print("source_visible_tree_authority=false")
        print("destination_matches_sealed_snapshot=true")
        print("network_fetch=false")
        print("funds_movement=false")
    finally:
        if destination_files_fd >= 0:
            os.close(destination_files_fd)
        if source_files_fd >= 0:
            os.close(source_files_fd)
        os.close(destination_fd)
        os.close(source_fd)


try:
    main()
except Exception as exc:
    print("marker=" + MARKER)
    print("status=sealed_snapshot_handoff_hold")
    print("reason=" + str(exc).replace("\n", "_").replace("\r", "_"))
    sys.exit(2)

#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
"""Execute one V45 source entrypoint from an exact-HEAD retained snapshot."""
from __future__ import annotations

import argparse
import copy
import ctypes
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import pwd
import re
import resource
import shutil
import stat
import subprocess
import sys
import tempfile
import socket
import types
import time


FIXTURE_REL = "fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"
SUPERVISOR_REL = "scripts/prove_datanet_v45_source_execution_v1.py"
MARKER = "VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN"
CONTROL_MARKER = "VOID_DATANET_V45_SOURCE_GENERATION_ABA_CONTROL_V1_GREEN"
PHASE_CONTROL_MARKER = "VOID_DATANET_V45_PHASE_OUTPUT_CONTROL_V1_GREEN"
HOLD_MARKER = "VOID_DATANET_V45_SOURCE_EXECUTION_HOLD"
GENERATION_HOLD = "HOLD_V45_SOURCE_GENERATION_CHANGED"
ARGV_HOLD = "HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED"
PREEXISTING_OUTPUT_HOLD = "HOLD_V45_OUTPUT_PREEXISTING"
PHASE_CONTRACT_ID = "VOID_DATANET_V45_EXACT_PHASE_ARGV_AND_OUTPUT_CONTRACT_V1"
MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024
MAX_SOURCE_WALL_BYTES = 64 * 1024 * 1024
MAX_CHILD_STDOUT_BYTES = 8 * 1024 * 1024


class SourceHold(AssertionError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def require(condition: bool, code: str) -> None:
    if not condition:
        raise SourceHold(code)


def canonical(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def sealed(value: dict) -> dict:
    out = copy.deepcopy(value)
    out.pop("receipt_sha256", None)
    out["receipt_sha256"] = sha256(canonical(out))
    return out


def fingerprint(st: os.stat_result) -> tuple[int, ...]:
    return (
        st.st_dev,
        st.st_ino,
        st.st_mode,
        st.st_nlink,
        st.st_uid,
        st.st_gid,
        st.st_size,
        st.st_mtime_ns,
        st.st_ctime_ns,
    )


def pread_all(fd: int, size: int, code: str) -> bytes:
    chunks = []
    offset = 0
    while offset < size:
        block = os.pread(fd, min(1024 * 1024, size - offset), offset)
        require(bool(block), code)
        chunks.append(block)
        offset += len(block)
    require(os.pread(fd, 1, size) == b"", code)
    return b"".join(chunks)


def git_bytes(repo: Path, *args: str) -> bytes:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    require(result.returncode == 0, "HOLD_V45_SOURCE_GIT_COMMAND")
    return result.stdout


def git_text(repo: Path, *args: str) -> str:
    return git_bytes(repo, *args).decode("utf-8", errors="strict").strip()


class GitBlobBatch:
    # One bounded Git object reader for a complete source_tree() wall.

    def __init__(self, repo: Path):
        self.proc = subprocess.Popen(
            ["git", "-C", str(repo), "cat-file", "--batch"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
        require(self.proc.stdin is not None and self.proc.stdout is not None,
                "HOLD_V45_SOURCE_GIT_COMMAND")
        self.closed = False

    def blob(self, blob: str) -> bytes:
        require(
            isinstance(blob, str)
            and re.fullmatch(r"[0-9a-f]{40}", blob) is not None,
            "HOLD_V45_SOURCE_GIT_COMMAND",
        )
        require(not self.closed, "HOLD_V45_SOURCE_GIT_COMMAND")
        try:
            self.proc.stdin.write((blob + "\n").encode("ascii"))
            self.proc.stdin.flush()
            header = self.proc.stdout.readline(256)
        except (BrokenPipeError, OSError) as exc:
            raise SourceHold("HOLD_V45_SOURCE_GIT_COMMAND") from exc
        require(
            header.endswith(b"\n") and 0 < len(header) <= 255,
            "HOLD_V45_SOURCE_GIT_COMMAND",
        )
        try:
            actual, kind, raw_size = header[:-1].decode("ascii", errors="strict").split(" ")
            size = int(raw_size)
        except (UnicodeDecodeError, ValueError) as exc:
            raise SourceHold("HOLD_V45_SOURCE_GIT_COMMAND") from exc
        require(
            actual == blob
            and kind == "blob"
            and 0 <= size <= MAX_SOURCE_FILE_BYTES,
            "HOLD_V45_SOURCE_GIT_COMMAND",
        )
        chunks = []
        remaining = size
        while remaining:
            part = self.proc.stdout.read(min(1024 * 1024, remaining))
            require(bool(part), "HOLD_V45_SOURCE_GIT_COMMAND")
            chunks.append(part)
            remaining -= len(part)
        require(self.proc.stdout.read(1) == b"\n", "HOLD_V45_SOURCE_GIT_COMMAND")
        data = b"".join(chunks)
        require(len(data) == size and git_blob(data) == blob,
                "HOLD_V45_SOURCE_GIT_COMMAND")
        return data

    def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        try:
            self.proc.stdin.close()
            extra = self.proc.stdout.read()
            rc = self.proc.wait()
        except OSError as exc:
            try:
                self.proc.kill()
            except OSError:
                pass
            self.proc.wait()
            raise SourceHold("HOLD_V45_SOURCE_GIT_COMMAND") from exc
        require(rc == 0 and extra == b"", "HOLD_V45_SOURCE_GIT_COMMAND")

    def abort(self) -> None:
        if self.closed:
            return
        self.closed = True
        try:
            self.proc.kill()
        except OSError:
            pass
        self.proc.wait()

    def __enter__(self) -> "GitBlobBatch":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        if exc_type is None:
            self.close()
        else:
            self.abort()
        return False


def parse_tree(listing: bytes) -> dict[str, dict[str, str]]:
    entries: dict[str, dict[str, str]] = {}
    for raw in listing.decode("utf-8", errors="strict").splitlines():
        left, rel = raw.split("\t", 1)
        mode, kind, blob = left.split()
        require(rel not in entries, "HOLD_V45_SOURCE_TREE_DUPLICATE")
        entries[rel] = {"mode": mode, "type": kind, "git_blob": blob}
    return entries


def validate_relative(rel: str) -> PurePosixPath:
    path = PurePosixPath(rel)
    require(
        isinstance(rel, str)
        and bool(rel)
        and not path.is_absolute()
        and ".." not in path.parts
        and "." not in path.parts
        and path.parts[0] in (".github", "docs", "fixtures", "scripts"),
        "HOLD_V45_SOURCE_PATH",
    )
    return path


def write_exclusive(path: Path, data: bytes, mode: int = 0o600) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags, mode)
    try:
        offset = 0
        while offset < len(data):
            written = os.write(fd, data[offset:])
            require(written > 0, "HOLD_V45_SOURCE_OUTPUT_WRITE")
            offset += written
        os.fsync(fd)
    finally:
        os.close(fd)


def parse_named(values: list[str], code: str) -> dict[str, Path]:
    result = {}
    for value in values:
        role, separator, raw_path = value.partition("=")
        path = Path(raw_path)
        require(
            separator == "="
            and re.fullmatch(r"[A-Z][A-Z0-9_]*", role) is not None
            and role not in result
            and path.is_absolute()
            and path.name not in ("", ".", ".."),
            code,
        )
        result[role] = path
    return result


def rename_noreplace(src: str, dst: str, *, src_dir_fd: int, dst_dir_fd: int) -> None:
    """Publish without replacing any destination; unsupported kernels fail closed.

    The earlier absence check is diagnostic only. RENAME_NOREPLACE performs the
    authoritative destination-existence decision atomically with the rename.
    Never fall back to ordinary rename, copy, unlink, or a check/retry sequence.
    """
    try:
        renameat2 = ctypes.CDLL(None, use_errno=True).renameat2
    except (AttributeError, OSError) as exc:
        raise SourceHold("HOLD_V45_OUTPUT_NOREPLACE_UNSUPPORTED") from exc
    renameat2.argtypes = (
        ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint,
    )
    renameat2.restype = ctypes.c_int
    ctypes.set_errno(0)
    result = renameat2(src_dir_fd, os.fsencode(src), dst_dir_fd, os.fsencode(dst), 1)
    if result == 0:
        return
    error = ctypes.get_errno()
    if error == errno.EEXIST:
        code = PREEXISTING_OUTPUT_HOLD
    elif error in (errno.ENOSYS, errno.EINVAL, errno.EOPNOTSUPP):
        code = "HOLD_V45_OUTPUT_NOREPLACE_UNSUPPORTED"
    else:
        code = "HOLD_V45_OUTPUT_NOREPLACE_FAILED"
    raise SourceHold(code) from OSError(error, os.strerror(error))


class OwnedOutputs:
    """Create private output inodes, retain descriptors, then atomically publish them."""

    def __init__(self, outputs: dict[str, Path], staging_parent: Path):
        self.paths = outputs
        self.parent_fds: dict[str, int] = {}
        self.fds: dict[str, int] = {}
        self.initial: dict[str, tuple[int, ...]] = {}
        self.staging = Path(tempfile.mkdtemp(prefix="void-v45-owned-outputs-", dir=staging_parent))
        self.staging_fd = os.open(
            self.staging,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0),
        )
        self.stage_names: dict[str, str] = {}
        self.published = False
        self.published_roles: list[str] = []
        created: list[str] = []
        dflags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
        fflags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
        try:
            for role, path in outputs.items():
                parent_fd = os.open(path.parent, dflags)
                self.parent_fds[role] = parent_fd
                try:
                    os.stat(path.name, dir_fd=parent_fd, follow_symlinks=False)
                except FileNotFoundError:
                    pass
                else:
                    raise SourceHold(PREEXISTING_OUTPUT_HOLD)
            for role, path in outputs.items():
                require(os.fstat(self.staging_fd).st_dev == os.fstat(self.parent_fds[role]).st_dev, "HOLD_V45_OUTPUT_STAGING_DEVICE")
                stage_name = f"output-{len(self.stage_names):02d}"
                self.stage_names[role] = stage_name
                try:
                    fd = os.open(stage_name, fflags, 0o400, dir_fd=self.staging_fd)
                except FileExistsError as exc:
                    raise SourceHold(PREEXISTING_OUTPUT_HOLD) from exc
                self.fds[role] = fd
                created.append(role)
                opened = os.fstat(fd)
                visible = os.stat(stage_name, dir_fd=self.staging_fd, follow_symlinks=False)
                require(
                    stat.S_ISREG(opened.st_mode)
                    and opened.st_nlink == 1
                    and stat.S_IMODE(opened.st_mode) == 0o400
                    and opened.st_size == 0
                    and fingerprint(opened) == fingerprint(visible),
                    "HOLD_V45_OUTPUT_CREATE_GENERATION",
                )
                self.initial[role] = fingerprint(opened)
        except BaseException:
            for role, fd in self.fds.items():
                try:
                    os.close(fd)
                except OSError:
                    pass
                try:
                    os.unlink(self.stage_names[role], dir_fd=self.staging_fd)
                except OSError:
                    pass
            for fd in self.parent_fds.values():
                try:
                    os.close(fd)
                except OSError:
                    pass
            self.fds.clear()
            self.parent_fds.clear()
            os.close(self.staging_fd)
            self.staging_fd = -1
            try:
                self.staging.rmdir()
            except OSError:
                pass
            raise

    def pass_fds(self) -> tuple[int, ...]:
        return tuple(self.fds.values())

    def environment(self) -> str:
        return json.dumps(
            {str(self.paths[role]): fd for role, fd in self.fds.items()},
            sort_keys=True,
            separators=(",", ":"),
        )

    def descriptor(self, role: str) -> int:
        require(role in self.fds, "HOLD_V45_OUTPUT_ROLE")
        return self.fds[role]

    def read(self, role: str) -> bytes:
        fd = self.descriptor(role)
        os.fsync(fd)
        before = os.fstat(fd)
        require(
            stat.S_ISREG(before.st_mode)
            and before.st_nlink == 1
            and stat.S_IMODE(before.st_mode) == 0o400,
            "HOLD_V45_OUTPUT_FINAL_SHAPE",
        )
        data = pread_all(fd, before.st_size, "HOLD_V45_OUTPUT_READ")
        after = os.fstat(fd)
        if role in self.published_roles:
            visible = os.stat(self.paths[role].name, dir_fd=self.parent_fds[role], follow_symlinks=False)
        else:
            visible = os.stat(self.stage_names[role], dir_fd=self.staging_fd, follow_symlinks=False)
        require(
            fingerprint(before) == fingerprint(after) == fingerprint(visible),
            "HOLD_V45_OUTPUT_GENERATION_CHANGED",
        )
        return data

    def publish(self) -> None:
        require(not self.published, "HOLD_V45_OUTPUT_ALREADY_PUBLISHED")
        for role, path in self.paths.items():
            try:
                os.stat(path.name, dir_fd=self.parent_fds[role], follow_symlinks=False)
            except FileNotFoundError:
                pass
            else:
                raise SourceHold(PREEXISTING_OUTPUT_HOLD)
            rename_noreplace(
                self.stage_names[role],
                path.name,
                src_dir_fd=self.staging_fd,
                dst_dir_fd=self.parent_fds[role],
            )
            self.published_roles.append(role)
            after = os.fstat(self.fds[role])
            visible = os.stat(path.name, dir_fd=self.parent_fds[role], follow_symlinks=False)
            require(fingerprint(after) == fingerprint(visible), "HOLD_V45_OUTPUT_PUBLISH_GENERATION")
        self.published = True
        os.fsync(self.staging_fd)
        for parent_fd in set(self.parent_fds.values()):
            os.fsync(parent_fd)

    def binding(self, role: str) -> dict:
        data = self.read(role)
        return {
            "role": role,
            "name": self.paths[role].name,
            "bytes": len(data),
            "sha256": sha256(data),
            "mode": 0o400,
            "created_empty_before_child": True,
        }

    def close(self) -> None:
        for fd in self.fds.values():
            try:
                os.close(fd)
            except OSError:
                pass
        for fd in self.parent_fds.values():
            try:
                os.close(fd)
            except OSError:
                pass
        if self.staging_fd >= 0:
            try:
                os.close(self.staging_fd)
            except OSError:
                pass
            self.staging_fd = -1
        try:
            self.staging.rmdir()
        except OSError:
            pass
        self.fds.clear()
        self.parent_fds.clear()


class RetainedSnapshot:
    def __init__(self, root: Path, entries: dict[str, dict], source: dict):
        self.root = root
        self.entries = entries
        self.source = source
        self.dir_fds: dict[str, int] = {}
        self.file_fds: dict[str, int] = {}
        self.dir_keys: dict[str, tuple[int, ...]] = {}
        self.file_keys: dict[str, tuple[int, ...]] = {}
        self.members: dict[str, set[str]] = {}
        try:
            self._bind()
        except BaseException:
            self.close()
            raise

    @staticmethod
    def dir_flags() -> int:
        return os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)

    @staticmethod
    def file_flags() -> int:
        return os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)

    def _directories(self) -> list[str]:
        dirs = {"."}
        for rel in self.entries:
            parts = PurePosixPath(rel).parts[:-1]
            for index in range(1, len(parts) + 1):
                dirs.add("/".join(parts[:index]))
        return sorted(dirs, key=lambda item: (len(PurePosixPath(item).parts), item))

    def _bind(self) -> None:
        for rel in self._directories():
            if rel == ".":
                fd = os.open(self.root, self.dir_flags())
            else:
                parts = PurePosixPath(rel).parts
                parent = "." if len(parts) == 1 else "/".join(parts[:-1])
                parent_fd = self.dir_fds[parent]
                visible = os.stat(parts[-1], dir_fd=parent_fd, follow_symlinks=False)
                fd = os.open(parts[-1], self.dir_flags(), dir_fd=parent_fd)
                require(fingerprint(visible) == fingerprint(os.fstat(fd)), "HOLD_V45_SOURCE_DIRECTORY_GENERATION")
            self.dir_fds[rel] = fd

        expected_members = {rel: set() for rel in self.dir_fds}
        for rel in self.dir_fds:
            if rel == ".":
                continue
            parts = PurePosixPath(rel).parts
            parent = "." if len(parts) == 1 else "/".join(parts[:-1])
            expected_members[parent].add(parts[-1])
        for rel in self.entries:
            parts = PurePosixPath(rel).parts
            parent = "." if len(parts) == 1 else "/".join(parts[:-1])
            expected_members[parent].add(parts[-1])

        for rel, fd in self.dir_fds.items():
            current = os.fstat(fd)
            require(stat.S_ISDIR(current.st_mode), "HOLD_V45_SOURCE_DIRECTORY_SHAPE")
            require(set(os.listdir(fd)) == expected_members[rel], "HOLD_V45_SOURCE_MEMBERSHIP")
            self.dir_keys[rel] = fingerprint(current)
            self.members[rel] = expected_members[rel]

        for rel, item in sorted(self.entries.items()):
            parts = PurePosixPath(rel).parts
            parent = "." if len(parts) == 1 else "/".join(parts[:-1])
            parent_fd = self.dir_fds[parent]
            visible = os.stat(parts[-1], dir_fd=parent_fd, follow_symlinks=False)
            fd = os.open(parts[-1], self.file_flags(), dir_fd=parent_fd)
            opened = os.fstat(fd)
            require(stat.S_ISREG(opened.st_mode) and opened.st_nlink == 1, "HOLD_V45_SOURCE_FILE_SHAPE")
            require(fingerprint(visible) == fingerprint(opened), "HOLD_V45_SOURCE_FILE_GENERATION")
            data = pread_all(fd, opened.st_size, "HOLD_V45_SOURCE_FILE_READ")
            expected = self.source["source_wall_entries"][rel]
            require(
                len(data) == expected["bytes"]
                and sha256(data) == expected["sha256"]
                and git_blob(data) == expected["git_blob"],
                "HOLD_V45_SOURCE_FILE_DIGEST",
            )
            require(fingerprint(opened) == fingerprint(os.fstat(fd)), "HOLD_V45_SOURCE_FILE_CHANGED")
            self.file_fds[rel] = fd
            self.file_keys[rel] = fingerprint(opened)

    def entry_fd(self, rel: str) -> int:
        require(rel in self.file_fds, "HOLD_V45_SOURCE_ENTRYPOINT")
        return self.file_fds[rel]

    def entry_parent_fd(self, rel: str) -> int:
        require(rel in self.file_fds, "HOLD_V45_SOURCE_ENTRYPOINT")
        parts = PurePosixPath(rel).parts
        parent = "." if len(parts) == 1 else "/".join(parts[:-1])
        require(parent in self.dir_fds, "HOLD_V45_SOURCE_ENTRYPOINT_PARENT")
        return self.dir_fds[parent]

    def assert_stable(self) -> None:
        for rel, fd in self.dir_fds.items():
            require(fingerprint(os.fstat(fd)) == self.dir_keys[rel], GENERATION_HOLD)
            require(set(os.listdir(fd)) == self.members[rel], GENERATION_HOLD)
            if rel != ".":
                parts = PurePosixPath(rel).parts
                parent = "." if len(parts) == 1 else "/".join(parts[:-1])
                require(
                    fingerprint(os.stat(parts[-1], dir_fd=self.dir_fds[parent], follow_symlinks=False))
                    == self.dir_keys[rel],
                    GENERATION_HOLD,
                )
        for rel, fd in self.file_fds.items():
            parts = PurePosixPath(rel).parts
            parent = "." if len(parts) == 1 else "/".join(parts[:-1])
            current = os.fstat(fd)
            require(fingerprint(current) == self.file_keys[rel], GENERATION_HOLD)
            require(
                fingerprint(os.stat(parts[-1], dir_fd=self.dir_fds[parent], follow_symlinks=False))
                == self.file_keys[rel],
                GENERATION_HOLD,
            )
            data = pread_all(fd, current.st_size, GENERATION_HOLD)
            expected = self.source["source_wall_entries"][rel]
            require(sha256(data) == expected["sha256"] and git_blob(data) == expected["git_blob"], GENERATION_HOLD)

    def close(self) -> None:
        for fd in self.file_fds.values():
            try:
                os.close(fd)
            except OSError:
                pass
        for rel in sorted(self.dir_fds, key=lambda item: len(PurePosixPath(item).parts), reverse=True):
            try:
                os.close(self.dir_fds[rel])
            except OSError:
                pass
        self.file_fds.clear()
        self.dir_fds.clear()


def source_tree(repo: Path, expected_head: str, expected_tree: str) -> tuple[dict, dict[str, bytes]]:
    require(re.fullmatch(r"[0-9a-f]{40}", expected_head) is not None, "HOLD_V45_SOURCE_HEAD_FORMAT")
    require(re.fullmatch(r"[0-9a-f]{40}", expected_tree) is not None, "HOLD_V45_SOURCE_TREE_FORMAT")
    require(git_text(repo, "rev-parse", "HEAD") == expected_head, "HOLD_V45_SOURCE_HEAD")
    require(git_text(repo, "rev-parse", "HEAD^{tree}") == expected_tree, "HOLD_V45_SOURCE_TREE")
    listing = git_bytes(repo, "ls-tree", "-r", "--full-tree", expected_head)
    tracked = parse_tree(listing)
    fixture_item = tracked.get(FIXTURE_REL)
    require(fixture_item is not None and fixture_item["type"] == "blob", "HOLD_V45_SOURCE_FIXTURE")

    payloads: dict[str, bytes] = {}
    entries = {}
    total = 0
    with GitBlobBatch(repo) as batch:
        fixture_data = batch.blob(fixture_item["git_blob"])
        require(git_blob(fixture_data) == fixture_item["git_blob"], "HOLD_V45_SOURCE_FIXTURE_DIGEST")
        try:
            fixture = json.loads(fixture_data.decode("utf-8", errors="strict"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SourceHold("HOLD_V45_SOURCE_FIXTURE_JSON") from exc
        paths = fixture.get("source_wall_paths")
        entrypoints = fixture.get("source_wall_entrypoints")
        require(isinstance(paths, list) and paths == sorted(set(paths)), "HOLD_V45_SOURCE_WALL_CANONICAL")
        require(isinstance(entrypoints, list) and entrypoints == sorted(set(entrypoints)), "HOLD_V45_SOURCE_ENTRYPOINTS_CANONICAL")
        require(SUPERVISOR_REL in paths and SUPERVISOR_REL in entrypoints, "HOLD_V45_SOURCE_SUPERVISOR_OUTSIDE_WALL")

        for rel in paths:
            validate_relative(rel)
            item = tracked.get(rel)
            require(item is not None and item["type"] == "blob" and item["mode"] in ("100644", "100755"), "HOLD_V45_SOURCE_WALL_MEMBER")
            data = batch.blob(item["git_blob"])
            require(len(data) <= MAX_SOURCE_FILE_BYTES and git_blob(data) == item["git_blob"], "HOLD_V45_SOURCE_WALL_BLOB")
            total += len(data)
            require(total <= MAX_SOURCE_WALL_BYTES, "HOLD_V45_SOURCE_WALL_SIZE")
            mode = 0o755 if item["mode"] == "100755" else 0o644
            entries[rel] = {**item, "worktree_mode": mode, "bytes": len(data), "sha256": sha256(data)}
            payloads[rel] = data
    source = {
        "head": expected_head,
        "tree": expected_tree,
        "recursive_entry_count": len(listing.splitlines()),
        "recursive_listing_sha256": sha256(listing),
        "source_wall_paths_sha256": sha256(canonical({"paths": paths})),
        "source_wall_entry_count": len(entries),
        "source_wall_entries": entries,
        "transitive_source_wall_verified": True,
    }
    return source, payloads


def build_snapshot(parent: Path, payloads: dict[str, bytes], source: dict) -> tuple[Path, Path]:
    container = Path(tempfile.mkdtemp(prefix="void-v45-source-execution-", dir=parent))
    root = container / "snapshot"
    root.mkdir(mode=0o700)
    directories = {PurePosixPath(rel).parent for rel in payloads}
    for rel_dir in sorted(directories, key=lambda value: (len(value.parts), str(value))):
        if str(rel_dir) == ".":
            continue
        (root / str(rel_dir)).mkdir(mode=0o700, parents=True, exist_ok=True)
    for rel, data in sorted(payloads.items()):
        target = root / rel
        write_exclusive(target, data)
        os.chmod(target, source["source_wall_entries"][rel]["worktree_mode"], follow_symlinks=False)
    for directory in sorted((path for path in root.rglob("*") if path.is_dir()), key=lambda path: len(path.parts), reverse=True):
        fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0))
        try:
            os.fsync(fd)
        finally:
            os.close(fd)
        os.chmod(directory, 0o555, follow_symlinks=False)
    root_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0))
    try:
        os.fsync(root_fd)
    finally:
        os.close(root_fd)
    os.chmod(root, 0o555, follow_symlinks=False)
    return container, root


def verify_supervisor(ns: argparse.Namespace, repo: Path, source: dict) -> tuple[dict, tuple[int, ...]]:
    before = os.fstat(ns.supervisor_fd)
    require(stat.S_ISREG(before.st_mode) and before.st_nlink == 0, "HOLD_V45_SOURCE_SUPERVISOR_SHAPE")
    require(fcntl.fcntl(ns.supervisor_fd, 1034) == 15, "HOLD_V45_SOURCE_SUPERVISOR_SEALS")
    data = pread_all(ns.supervisor_fd, before.st_size, "HOLD_V45_SOURCE_SUPERVISOR_READ")
    after = os.fstat(ns.supervisor_fd)
    require(fingerprint(before) == fingerprint(after), "HOLD_V45_SOURCE_SUPERVISOR_CHANGED")
    expected = source["source_wall_entries"][SUPERVISOR_REL]
    require(ns.bootstrap_supervisor_blob == expected["git_blob"], "HOLD_V45_SOURCE_BOOTSTRAP_BLOB")
    require(
        len(data) == expected["bytes"]
        and sha256(data) == expected["sha256"]
        and git_blob(data) == expected["git_blob"],
        "HOLD_V45_SOURCE_SUPERVISOR_DIGEST",
    )
    return {
        "path": SUPERVISOR_REL,
        "git_blob": expected["git_blob"],
        "sha256": expected["sha256"],
        "bytes": expected["bytes"],
        "mode": expected["mode"],
        "opened_nofollow_by_exact_workflow": True,
        "git_blob_preverified_before_interpreter": True,
        "bootstrap_sealed_memfd": True,
        "write_grow_shrink_and_seal_seals_verified": True,
        "executed_from_retained_fd": True,
    }, fingerprint(after)


def assert_supervisor_stable(ns: argparse.Namespace, repo: Path, key: tuple[int, ...], supervisor: dict) -> None:
    current = os.fstat(ns.supervisor_fd)
    require(fingerprint(current) == key, GENERATION_HOLD)
    require(fcntl.fcntl(ns.supervisor_fd, 1034) == 15, GENERATION_HOLD)
    data = pread_all(ns.supervisor_fd, current.st_size, GENERATION_HOLD)
    require(sha256(data) == supervisor["sha256"] and git_blob(data) == supervisor["git_blob"], GENERATION_HOLD)


def control_pause(ns: argparse.Namespace, root: Path) -> None:
    require(
        ns.expect_generation_hold
        and isinstance(ns.control_ready, str)
        and isinstance(ns.control_continue, str)
        and isinstance(ns.control_target, str),
        "HOLD_V45_SOURCE_CONTROL_ARGUMENTS",
    )
    validate_relative(ns.control_target)
    require(ns.control_target in ns.source_paths, "HOLD_V45_SOURCE_CONTROL_TARGET")
    ready = Path(ns.control_ready)
    require(ready.is_absolute(), "HOLD_V45_SOURCE_CONTROL_READY_PATH")
    write_exclusive(ready, canonical({
        "marker": "VOID_DATANET_V45_SOURCE_GENERATION_CONTROL_READY_V1",
        "phase": ns.phase,
        "run_id": ns.run_id,
        "run_attempt": ns.run_attempt,
        "snapshot_root": str(root),
        "target": ns.control_target,
    }))
    deadline = time.monotonic() + 30
    proceed = Path(ns.control_continue)
    while not proceed.exists():
        require(time.monotonic() < deadline, "HOLD_V45_SOURCE_CONTROL_TIMEOUT")
        time.sleep(0.02)


def python_argv(*tail: str) -> list[str]:
    return ["python3", "-I", "-S", "-B", "@ENTRYPOINT@", *tail]


def phase_spec(phase: str, node: int) -> dict:
    n = "@NODE_MAJOR@"
    head = "@EXPECTED_HEAD@"
    tree = "@EXPECTED_TREE@"
    per_node: dict[str, dict] = {
        "custody-selftest": {
            "entrypoint": "scripts/prove_datanet_v45_custody_integration_v1.py",
            "argv": python_argv("--node-major", n, "--output", "@OUTPUT@"),
            # The selftest intentionally emits bounded nested-control status lines
            # before its final canonical JSON. Preserve those diagnostics while
            # still binding the authoritative final stdout bytes to OUTPUT.
            "owned": ("OUTPUT",), "bind": ("OUTPUT",), "pipe_stdout": True,
            "stdout_suffix_equals": "OUTPUT",
        },
        "source-generation-aba-control": {
            "entrypoint": "scripts/run_datanet_v45_full_stack_ext4_v1.sh",
            "argv": ["/usr/bin/bash", "@ENTRYPOINT@"],
        },
        "v41-static": {
            "entrypoint": "scripts/prove_datanet_v41_static_gate_v1.py",
            "argv": python_argv(), "owned": ("OUTPUT",), "bind": ("OUTPUT",), "stdout": "OUTPUT",
        },
        "v42-static": {
            "entrypoint": "scripts/prove_datanet_v42_fsverity_clean_remount_v1.py",
            "argv": python_argv("static"), "owned": ("OUTPUT",), "bind": ("OUTPUT",), "stdout": "OUTPUT",
        },
        "v43-static": {
            "entrypoint": "scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py",
            "argv": python_argv("static"), "owned": ("OUTPUT",), "bind": ("OUTPUT",), "stdout": "OUTPUT",
        },
        "v44-static": {
            "entrypoint": "scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py",
            "argv": python_argv("static"), "owned": ("OUTPUT",), "bind": ("OUTPUT",), "stdout": "OUTPUT",
        },
        "v45-static": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "argv": python_argv("static"), "owned": ("OUTPUT",), "bind": ("OUTPUT",), "stdout": "OUTPUT",
        },
        "matrix-selftest": {
            "entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
            "argv": python_argv("selftest"), "pipe_stdout": True,
            "stdout_marker": "VOID_DATANET_V45_CROSS_RUNTIME_SELFTEST_V1_GREEN",
        },
        "runtime": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "argv": python_argv("runtime", "--node-major", n, "--output", "@OUTPUT@"),
            "owned": ("OUTPUT",), "bind": ("OUTPUT",), "pipe_stdout": True, "stdout_equals": "OUTPUT",
        },
        "runner": {
            "entrypoint": "scripts/run_datanet_v45_full_stack_ext4_v1.sh",
            "entrypoint_stdin": True,
            "owned": ("RUNNER_STDOUT", "TRACE"),
            "bind": ("RUNNER_STDOUT", "TRACE"),
            "stdout": "RUNNER_STDOUT",
            "stderr": "TRACE",
            "paths": ("EVIDENCE_ROOT",),
            "argv": [
                "/usr/bin/timeout", "--foreground", "--signal=TERM", "--kill-after=60s", "70m",
                "/usr/bin/sudo", "-n", "/usr/bin/bash", "-c",
                'set -euo pipefail; runner_user=$1; test "${SUDO_USER:?}" = "$runner_user"; test "${SUDO_UID:?}" != 0; test "${SUDO_GID:?}" != 0; if /usr/bin/setpriv --reuid="$SUDO_UID" --regid="$SUDO_GID" --init-groups /usr/bin/sudo -n true 2>/dev/null; then   printf \'VOID_V45_PREAUTH_ALREADY_VALID=1\\n\' >&2; else   test -r /dev/tty && test -w /dev/tty;   printf \'VOID_V45_PREAUTH_REFRESH_REQUIRED=1\\n\' >/dev/tty;   printf \'Enter sudo password for the traced operator context.\\n\' >/dev/tty;   /usr/bin/setpriv --reuid="$SUDO_UID" --regid="$SUDO_GID" --init-groups /usr/bin/sudo -v </dev/tty >/dev/tty 2>/dev/tty; fi; /usr/bin/setpriv --reuid="$SUDO_UID" --regid="$SUDO_GID" --init-groups /usr/bin/sudo -n true; printf \'VOID_V45_PREAUTH_BEFORE_STRACE_V1_GREEN\\n\' >&2; exec /usr/bin/strace -f -q -ttt -s 4096 -e trace=process,mount,umount2 -o /dev/stderr -u "$runner_user" /usr/bin/env -i PATH=@ENV_PATH@ LANG=C.UTF-8 GIT_DIR=@REPO_ROOT@/.git GIT_WORK_TREE=@REPO_ROOT@ VOID_V45_NODE_MAJOR=@NODE_MAJOR@ VOID_V45_RUN_ID=@RUN_ID@ VOID_V45_RUN_ATTEMPT=@RUN_ATTEMPT@ VOID_V45_EXPECTED_HEAD=@EXPECTED_HEAD@ VOID_V45_OUT_DIR=@EVIDENCE_ROOT@ /usr/bin/bash -s',
                "void-v45-runner-preauth", "@RUNNER_USER@",
            ],
        },
        "candidate-aba": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "owned": ("OUTPUT",), "bind": ("OUTPUT",), "pipe_stdout": True, "stdout_equals": "OUTPUT",
            "paths": ("EVIDENCE_ROOT", "GENERATION_READY", "GENERATION_CONTINUE"),
            "argv": python_argv(
                "candidate-aba-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree,
                "--generation-control-ready", "@GENERATION_READY@",
                "--generation-control-continue", "@GENERATION_CONTINUE@", "--output", "@OUTPUT@",
            ),
        },
        "candidate": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "owned": ("OUTPUT",), "bind": ("OUTPUT",), "pipe_stdout": True, "stdout_equals": "OUTPUT",
            "paths": ("EVIDENCE_ROOT",),
            "argv": python_argv(
                "candidate", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree, "--output", "@OUTPUT@",
            ),
        },
        "controls": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py",
            "owned": ("OUTPUT", "SUBSTITUTE_CANDIDATE", "SUBSTITUTE_CONTROLS"),
            "bind": ("OUTPUT",), "pipe_stdout": True, "stdout_equals": "OUTPUT",
            "paths": ("CANDIDATE", "CANDIDATE_ABA_RECEIPT"),
            "argv": python_argv(
                "--candidate", "@CANDIDATE@", "--candidate-generation-control-receipt", "@CANDIDATE_ABA_RECEIPT@",
                "--expected-head", head, "--expected-tree", tree,
                "--substitute-candidate-output", "@SUBSTITUTE_CANDIDATE@",
                "--substitute-controls-output", "@SUBSTITUTE_CONTROLS@", "--output", "@OUTPUT@",
            ),
        },
        "producer-control": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py",
            "owned": ("OUTPUT",), "bind": ("OUTPUT",), "pipe_stdout": True, "stdout_equals": "OUTPUT",
            "paths": ("EVIDENCE_ROOT", "SUBSTITUTE_CANDIDATE", "SUBSTITUTE_CONTROLS"),
            "argv": python_argv(
                "producer-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree,
                "--substitute-candidate", "@SUBSTITUTE_CANDIDATE@",
                "--substitute-controls", "@SUBSTITUTE_CONTROLS@", "--output", "@OUTPUT@",
            ),
        },
        "terminal-aba": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py",
            "owned": ("OUTPUT",), "bind": ("OUTPUT",), "pipe_stdout": True, "stdout_equals": "OUTPUT",
            "paths": ("EVIDENCE_ROOT", "GENERATION_READY", "GENERATION_CONTINUE"),
            "argv": python_argv(
                "terminal-aba-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree,
                "--generation-control-ready", "@GENERATION_READY@",
                "--generation-control-continue", "@GENERATION_CONTINUE@", "--output", "@OUTPUT@",
            ),
        },
        "finalizer": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py",
            "owned": ("OUTPUT",), "bind": ("OUTPUT",), "pipe_stdout": True, "stdout_equals": "OUTPUT",
            "paths": ("EVIDENCE_ROOT",),
            "argv": python_argv(
                "finalize", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree, "--output", "@OUTPUT@",
            ),
        },
    }
    downstream: dict[str, dict] = {
        "cross-runtime-source-generation-aba-control": {
            "entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
            "argv": python_argv("selftest"),
        },
        "cross-runtime-selftest": {
            "entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
            "argv": python_argv("selftest"), "pipe_stdout": True,
            "stdout_marker": "VOID_DATANET_V45_CROSS_RUNTIME_SELFTEST_V1_GREEN",
        },
        "cross-runtime-stale-attempt-control": {
            "entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
            "owned": ("OUTPUT",), "bind": ("OUTPUT",), "pipe_stdout": True, "stdout_equals": "OUTPUT",
            "argv": python_argv(
                "stale-attempt-control", "--run-id", "@RUN_ID@",
                "--control-run-attempt", "@RUN_ATTEMPT@",
                "--expected-head", "@EXPECTED_HEAD@",
                "--producer-attempt", "1", "--finalizer-attempt", "2", "--output", "@OUTPUT@",
            ),
        },
        "cross-runtime-aggregate": {
            "entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
            "owned": ("OUTPUT",), "bind": ("OUTPUT",), "pipe_stdout": True, "stdout_equals": "OUTPUT",
            "paths": (
                "SOURCE_CONTROL_RECEIPT", "SELFTEST_RECEIPT", "PHASE_ARGV_CONTROL_RECEIPT",
                "PREEXISTING_OUTPUT_CONTROL_RECEIPT", "STALE_ATTEMPT_CONTROL",
                "STALE_ATTEMPT_CONTROL_RECEIPT",
            ),
            "argv": python_argv(
                "aggregate", "--repository", "6ZoSo9/void-node", "--run-id", "@RUN_ID@",
                "--run-attempt", "@RUN_ATTEMPT@",
                "--api-url", "https://api.github.com", "--expected-head", head, "--expected-tree", tree,
                "--source-generation-control-receipt", "@SOURCE_CONTROL_RECEIPT@",
                "--source-selftest-receipt", "@SELFTEST_RECEIPT@",
                "--phase-argv-control-receipt", "@PHASE_ARGV_CONTROL_RECEIPT@",
                "--preexisting-output-control-receipt", "@PREEXISTING_OUTPUT_CONTROL_RECEIPT@",
                "--stale-attempt-control", "@STALE_ATTEMPT_CONTROL@",
                "--stale-attempt-control-receipt", "@STALE_ATTEMPT_CONTROL_RECEIPT@",
                "--output", "@OUTPUT@",
            ),
        },
    }
    spec = downstream.get(phase) if node == 0 else per_node.get(phase)
    require(spec is not None, "HOLD_V45_PHASE_NOT_ALLOWLISTED")
    spec = copy.deepcopy(spec)
    spec.setdefault("owned", ())
    spec.setdefault("bind", ())
    spec.setdefault("stdout", None)
    spec.setdefault("stderr", None)
    spec.setdefault("paths", ())
    spec.setdefault("entrypoint_stdin", False)
    spec.setdefault("pipe_stdout", False)
    return spec


def expected_output_names(phase: str, node: int) -> dict[str, str]:
    n = str(node)
    return {
        "custody-selftest": {"OUTPUT": f"datanet-v45-custody-controls-{n}.json"},
        "v41-static": {"OUTPUT": f"v41-static-{n}.jsonl"},
        "v42-static": {"OUTPUT": f"v42-static-{n}.jsonl"},
        "v43-static": {"OUTPUT": f"v43-static-{n}.jsonl"},
        "v44-static": {"OUTPUT": f"v44-static-{n}.jsonl"},
        "v45-static": {"OUTPUT": f"v45-static-{n}.jsonl"},
        "runtime": {"OUTPUT": f"datanet-v45-runtime-{n}.json"},
        "runner": {
            "RUNNER_STDOUT": f"datanet-v45-runner-{n}.stdout.log",
            "TRACE": f"datanet-v45-process-{n}.trace",
        },
        "candidate-aba": {"OUTPUT": f"datanet-v45-candidate-aba-control-{n}.json"},
        "candidate": {"OUTPUT": f"datanet-v45-candidate-{n}.json"},
        "controls": {
            "OUTPUT": f"datanet-v45-controls-{n}.json",
            "SUBSTITUTE_CANDIDATE": "substitute-candidate.json",
            "SUBSTITUTE_CONTROLS": "substitute-controls.json",
        },
        "producer-control": {"OUTPUT": f"datanet-v45-producer-substitution-control-{n}.json"},
        "terminal-aba": {"OUTPUT": f"datanet-v45-terminal-aba-control-{n}.json"},
        "finalizer": {"OUTPUT": f"datanet-v45-aggregate-{n}.json"},
        "cross-runtime-stale-attempt-control": {"OUTPUT": "datanet-v45-stale-attempt-control-top.json"},
        "cross-runtime-aggregate": {
            "OUTPUT": "datanet-v45-node-22-24-26-top-@EXPECTED_HEAD@-attempt-@RUN_ATTEMPT@.json"
        },
    }.get(phase, {})


def contract_metadata(ns: argparse.Namespace, spec: dict) -> tuple[dict[str, Path], dict[str, Path]]:
    outputs = parse_named(ns.owned_output, "HOLD_V45_OUTPUT_ARGUMENT")
    paths = parse_named(ns.path_token, "HOLD_V45_PHASE_PATH_ARGUMENT")
    require(tuple(outputs) == tuple(spec["owned"]), "HOLD_V45_OUTPUT_ROLES")
    require(tuple(ns.bind_output) == tuple(spec["bind"]), "HOLD_V45_OUTPUT_BIND_ROLES")
    require(ns.stdout_output == spec["stdout"] and ns.stderr_output == spec["stderr"], "HOLD_V45_OUTPUT_STREAM_ROLES")
    require(tuple(paths) == tuple(spec["paths"]), "HOLD_V45_PHASE_PATH_ROLES")
    require(ns.entrypoint == spec["entrypoint"] and ns.entrypoint_stdin is spec["entrypoint_stdin"], "HOLD_V45_PHASE_ENTRYPOINT")
    require(len(set(outputs.values())) == len(outputs), "HOLD_V45_OUTPUT_DUPLICATE_PATH")
    require(len(set(paths.values())) == len(paths), "HOLD_V45_PHASE_DUPLICATE_PATH")
    expected_names = expected_output_names(ns.phase, ns.node_major)
    for role, expected in expected_names.items():
        expected = expected.replace("@EXPECTED_HEAD@", ns.expected_head)
        expected = expected.replace("@RUN_ATTEMPT@", str(ns.run_attempt))
        require(outputs[role].name == expected, "HOLD_V45_OUTPUT_NAME")
    if "EVIDENCE_ROOT" in paths:
        require(paths["EVIDENCE_ROOT"].is_dir(), "HOLD_V45_EVIDENCE_ROOT")
        for role in ("OUTPUT", "RUNNER_STDOUT", "TRACE"):
            if role in outputs:
                if ns.phase not in ("candidate-aba", "terminal-aba"):
                    require(outputs[role].parent == paths["EVIDENCE_ROOT"], "HOLD_V45_OUTPUT_ROOT")
    if ns.phase in ("candidate-aba", "terminal-aba"):
        require(
            paths["GENERATION_READY"].parent == paths["GENERATION_CONTINUE"].parent
            and paths["GENERATION_READY"] != paths["GENERATION_CONTINUE"],
            "HOLD_V45_PHASE_CONTROL_PATHS",
        )
    if ns.phase == "controls":
        require(
            outputs["OUTPUT"].parent == paths["CANDIDATE"].parent == paths["CANDIDATE_ABA_RECEIPT"].parent
            and paths["CANDIDATE"].name == f"datanet-v45-candidate-{ns.node_major}.json"
            and paths["CANDIDATE_ABA_RECEIPT"].name == f"datanet-v45-candidate-aba-control-{ns.node_major}.json"
            and outputs["SUBSTITUTE_CANDIDATE"].parent == outputs["SUBSTITUTE_CONTROLS"].parent,
            "HOLD_V45_OUTPUT_CONTROL_ROOT",
        )
    if ns.phase == "producer-control":
        require(
            paths["SUBSTITUTE_CANDIDATE"].name == "substitute-candidate.json"
            and paths["SUBSTITUTE_CONTROLS"].name == "substitute-controls.json"
            and paths["SUBSTITUTE_CANDIDATE"].parent == paths["SUBSTITUTE_CONTROLS"].parent,
            "HOLD_V45_OUTPUT_CONTROL_ROOT",
        )
    if ns.phase == "cross-runtime-aggregate":
        require(
            paths["SOURCE_CONTROL_RECEIPT"].name == "datanet-v45-source-generation-aba-control-top.json"
            and paths["SELFTEST_RECEIPT"].name == "datanet-v45-source-execution-cross-runtime-selftest.json"
            and paths["PHASE_ARGV_CONTROL_RECEIPT"].name == "datanet-v45-phase-argv-control-cross-runtime-selftest.json"
            and paths["PREEXISTING_OUTPUT_CONTROL_RECEIPT"].name == "datanet-v45-preexisting-output-control-cross-runtime-aggregate.json"
            and paths["STALE_ATTEMPT_CONTROL"].name == "datanet-v45-stale-attempt-control-top.json"
            and paths["STALE_ATTEMPT_CONTROL_RECEIPT"].name
            == "datanet-v45-source-execution-cross-runtime-stale-attempt-control.json"
            and all(path.parent == outputs["OUTPUT"].parent for path in paths.values()),
            "HOLD_V45_OUTPUT_CONTROL_ROOT",
        )
    return outputs, paths


def phase_contract_receipt(spec: dict, *, argv_allowlisted: bool) -> dict:
    return {
        "id": PHASE_CONTRACT_ID,
        "argv_allowlisted": argv_allowlisted,
        "expected_argv_sha256": sha256(canonical({"argv": spec["argv"]})),
        "owned_output_roles": list(spec["owned"]),
        "bound_output_roles": list(spec["bind"]),
        "stdout_output_role": spec["stdout"],
        "stderr_output_role": spec["stderr"],
        "path_token_roles": list(spec["paths"]),
    }


def declared_path_bindings(values: dict[str, Path]) -> list[dict]:
    return [
        {
            "role": role,
            "path": str(path),
            "name": path.name,
            "path_sha256": sha256(str(path).encode("utf-8")),
        }
        for role, path in values.items()
    ]


def replace_tokens(
    argv: list[str], root: Path, repo: Path, entry_fd: int,
    ns: argparse.Namespace, outputs: dict[str, Path], paths: dict[str, Path],
) -> tuple[list[str], dict[str, str]]:
    replacements = {
        "@ENTRYPOINT@": f"/proc/self/fd/{entry_fd}",
        "@SOURCE_ROOT@": str(root),
        "@REPO_ROOT@": str(repo),
        "@NODE_MAJOR@": str(ns.node_major),
        "@EXPECTED_HEAD@": ns.expected_head,
        "@EXPECTED_TREE@": ns.expected_tree,
        "@RUN_ID@": str(ns.run_id),
        "@RUN_ATTEMPT@": str(ns.run_attempt),
        "@ENV_PATH@": os.environ.get("PATH", ""),
        "@RUNNER_USER@": pwd.getpwuid(os.getuid()).pw_name,
        **{f"@{role}@": str(path) for role, path in outputs.items()},
        **{f"@{role}@": str(path) for role, path in paths.items()},
    }
    used = {
        token: value
        for token, value in replacements.items()
        if any(token in arg for arg in argv)
    }
    out = []
    for arg in argv:
        for token, value in replacements.items():
            arg = arg.replace(token, value)
        require("@" not in arg, "HOLD_V45_PHASE_TOKEN_UNRESOLVED")
        out.append(arg)
    return out, dict(sorted(used.items()))


def receipt_base(ns: argparse.Namespace, source: dict, supervisor: dict, entrypoint: dict) -> dict:
    return {
        "v": 1,
        "phase": ns.phase,
        "node_major": ns.node_major,
        "run_id": ns.run_id,
        "run_attempt": ns.run_attempt,
        "head": ns.expected_head,
        "tree": ns.expected_tree,
        "supervisor": supervisor,
        "entrypoint": entrypoint,
        "source_inventory_sha256": sha256(canonical(source)),
        "source_wall_paths_sha256": source["source_wall_paths_sha256"],
        "source_wall_entry_count": source["source_wall_entry_count"],
        "source_snapshot_from_exact_git_blobs": True,
        "source_files_opened_nofollow": True,
        "source_file_and_directory_fds_retained": True,
        "source_membership_and_metadata_rechecked": True,
        "interpreter_local_source_root_is_snapshot": True,
        "production_runtime_touched": False,
    }



CUSTODY_REL = "scripts/datanet_v45_custody_session_v1.py"
INHERITED_STATIC_PHASES = frozenset(("v41-static", "v42-static", "v43-static", "v44-static"))


def custody_module(root: Path, data: bytes):
    module = types.ModuleType("void_v45_custody_transport")
    path = root / CUSTODY_REL
    module.__file__ = str(path)
    exec(compile(data, str(path), "exec"), module.__dict__)
    return module


def custody_prepare(client, ns, owned, manifest, command, source, *, kind="normal"):
    rows, fds, anchors = [], [], []
    try:
        for group in (owned, manifest):
            if group is None:
                continue
            for role, path in group.paths.items():
                anchor = os.open(path.parent.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
                anchors.append(anchor)
                rows.append({"role": role, "path": str(path)})
                fds.extend((group.fds[role], group.parent_fds[role], anchor))
        result, extra = client.request(
            "PREPARE", fds=fds, context={k:getattr(ns,k) if k not in ("head","tree") else getattr(ns,"expected_"+k)
                                        for k in ("head","tree","node_major","run_id","run_attempt")},
            phase=ns.phase, members=rows, kind=kind,
            argv_sha256=sha256(canonical({"argv":(command if ns.phase=="runner" else [*command[:4],"@ENTRYPOINT@",*command[5:]] if kind=="normal" else command)})),
            entrypoint_sha256=source["source_wall_entries"][ns.entrypoint]["sha256"],
        )
        require(result.get("status") == "READY" and not extra, "HOLD_V45_CUSTODY_NOT_READY")
        return result
    finally:
        for fd in anchors: os.close(fd)


def borrow_custody_inputs(custody, client):
    result, fds = client.request("LEND")
    try:
        require(result.get("status") == "INPUTS" and bool(fds), "HOLD_V45_CUSTODY_INPUT_HANDOFF")
        envelope = custody.read_sealed(fds[0])
        for row in envelope["members"].values():
            index = row.pop("fd_index")
            require(type(index) is int and 0 <= index < len(fds)-1, "HOLD_V45_CUSTODY_INPUT_FD_INDEX")
            row["fd"] = fds[index+1]
        descriptor = custody.sealed_fd(canonical(envelope))
        os.close(fds[0])
        return descriptor, fds[1:]
    except BaseException:
        for fd in fds: os.close(fd)
        raise


def publish_control_receipt(ns, data: bytes, parent: Path, source: dict, custody, client):
    manifest = OwnedOutputs({"RECEIPT":Path(ns.receipt)}, parent)
    try:
        custody_prepare(client,ns,None,manifest,[],source,kind="control")
        write_to_fd(manifest.fds["RECEIPT"],data)
        answer,extra=client.request("CHECK")
        require(answer.get("status")=="VERIFIED" and not extra,"HOLD_V45_CUSTODY_CONTROL_CHECK")
        manifest.publish()
        answer,extra=client.request("COMMIT")
        require(answer.get("status")=="COMMITTED" and not extra,"HOLD_V45_CUSTODY_CONTROL_COMMIT")
    finally:manifest.close()


def write_to_fd(fd: int, data: bytes):
    require(os.fstat(fd).st_size==0,"HOLD_V45_CUSTODY_RECEIPT_PREWRITTEN")
    offset=0
    while offset<len(data):
        count=os.write(fd,data[offset:]);require(count>0,"HOLD_V45_CUSTODY_RECEIPT_WRITE");offset+=count
    os.fsync(fd)


def adopt_runner_boundary(client, root: Path, known_paths: set[str], custody):
    # Nested accepted V41–V44 producers are not changed. This explicitly starts
    # their custody at the supervised runner boundary, not at inner file create.
    members=[];fds=[]
    try:
        for path in sorted(custody.bounded_files(root).values()):
            if str(path) in known_paths:continue
            flags=os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW
            fd=os.open(path,flags);parent=os.open(path.parent,flags|os.O_DIRECTORY)
            anchor=os.open(path.parent.parent,flags|os.O_DIRECTORY)
            members.append({"path":str(path)});fds.extend((fd,parent,anchor))
        if members:
            answer,extra=client.request("ADOPT",members=members,fds=fds)
            require(answer.get("status")=="ADOPTED" and not extra,"HOLD_V45_CUSTODY_RUNNER_IMPORT")
    finally:
        for fd in fds:os.close(fd)


def publication_diagnostic(owned, manifest, phase: str, code: str):
    rows=[]
    for group in (owned,manifest):
        if group is None:continue
        for role,path in group.paths.items():
            try:
                original=os.fstat(group.fds[role])
                try: visible=os.stat(path.name,dir_fd=group.parent_fds[role],follow_symlinks=False)
                except FileNotFoundError:visible=None
                rows.append({"role":role,"path":str(path),"original_identity":list(fingerprint(original)),
                             "visible_identity":None if visible is None else list(fingerprint(visible)),
                             "published_by_this_phase":role in group.published_roles,
                             "staging_path":str(group.staging/group.stage_names[role])})
            except OSError:rows.append({"role":role,"path":str(path),"observation_unavailable":True})
    return {"marker":"VOID_V45_PHASE_QUARANTINE_V1","status":"HOLD","phase":phase,"code":code,
            "members":rows,"bundle_authoritative":False,"automatic_rollback":False,
            "operator_action":"Preserve the whole attempt. Do not delete, overwrite or retry these names."}


def _workflow_session_inner(ns: argparse.Namespace, repo: Path, payloads: dict,
                            custody, parent: Path) -> int:
    context={"head":ns.expected_head,"tree":ns.expected_tree,"node_major":ns.node_major,
             "run_id":ns.run_id,"run_attempt":ns.run_attempt}
    custody.checked_context(context)
    helper_data=payloads[CUSTODY_REL]
    context_fd=custody.sealed_fd(canonical({**context,"custodian_source_sha256":sha256(helper_data)}))
    helper_fd=custody.sealed_fd(helper_data,"void-v45-custodian-source")
    script_fd=custody.sealed_fd(payloads["scripts/run_datanet_v45_full_stack_ext4_v1.sh"],"void-v45-workflow-source")
    left,right=socket.socketpair(socket.AF_UNIX,socket.SOCK_SEQPACKET)
    server=None;client=None;export_fd=None
    try:
        server=subprocess.Popen([sys.executable,"-I","-S","-B",f"/proc/self/fd/{helper_fd}",
                                 "--capture-resources",
                                 "--channel-fd",str(right.fileno()),"--context-fd",str(context_fd),
                                 "--source-fd",str(helper_fd)],pass_fds=(right.fileno(),helper_fd,context_fd),
                                stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL)
        right.close();left.settimeout(120)
        hello,extra=custody.receive(left)
        require(hello.get("status")=="STARTED" and hello.get("context")==context and not extra,
                "HOLD_V45_SESSION_START")
        env=os.environ.copy();env.update({"GITHUB_WORKSPACE":str(repo),"EXPECTED_HEAD":ns.expected_head,
            "GITHUB_RUN_ID":str(ns.run_id),"GITHUB_RUN_ATTEMPT":str(ns.run_attempt),"V45_NODE_MAJOR":str(ns.node_major),
            "VOID_V45_CUSTODY_CHANNEL_FD":str(left.fileno()),"PYTHONDONTWRITEBYTECODE":"1"})
        mode="--top-phases" if ns.node_major==0 else "--node-phases"
        result=subprocess.run(["bash",f"/proc/self/fd/{script_fd}",mode],cwd=repo,env=env,
                              pass_fds=(left.fileno(),script_fd),check=False,timeout=5100)
        require(result.returncode==0,"HOLD_V45_SESSION_PHASE_FAILED")
        client=custody.Client(left.fileno())
        root=(parent/f"datanet-v45-node-22-24-26-top-{ns.expected_head}-attempt-{ns.run_attempt}"
              if ns.node_major==0 else parent/f"void-v43-{ns.node_major}-{ns.run_id}-{ns.run_attempt}-v45-stack")
        terminal="cross-runtime-aggregate" if ns.node_major==0 else "finalizer"
        exported,extra=client.request("EXPORT",root=str(root),terminal_phase=terminal)
        require(exported.get("status")=="EXPORTED" and len(extra)==1,"HOLD_V45_SESSION_EXPORT")
        export_fd=extra[0]
        require(fcntl.fcntl(export_fd,fcntl.F_GET_SEALS)==15,"HOLD_V45_SESSION_EXPORT_SEALS")
        data=custody.read_fd(export_fd)
        require(sha256(data)==exported["capsule_sha256"] and len(data)==exported["capsule_bytes"],"HOLD_V45_SESSION_EXPORT_DIGEST")
        # This stdout commitment is collected by the CI job log service BEFORE
        # any package-path open by upload-artifact. Downstream must fetch it via
        # the exact run-attempt job API; a co-located JSON is not an authority.
        print(custody.COMMIT_MARKER+" "+canonical(exported).decode().strip(),flush=True)
        directory=Path(tempfile.mkdtemp(prefix="void-v45-capsule-",dir=parent))
        target=directory/"capsule.zip";write_exclusive(target,data)
        with open(os.environ["GITHUB_ENV"],"a",encoding="utf-8") as stream:
            stream.write("V45_CAPSULE_PATH="+str(target)+"\n")
        client.request("CLOSE");require(server.wait(timeout=10)==0,"HOLD_V45_SESSION_CLOSE")
        return 0
    finally:
        if client is not None:client.close()
        left.close();right.close()
        if server is not None and server.poll() is None:
            server.terminate()
            try:server.wait(timeout=5)
            except subprocess.TimeoutExpired:server.kill();server.wait()
        for fd in (helper_fd,context_fd,script_fd,export_fd):
            if fd is not None:os.close(fd)



def workflow_session(ns: argparse.Namespace) -> int:
    repo=Path(ns.repo_root)
    source,payloads=source_tree(repo,ns.expected_head,ns.expected_tree)
    verify_supervisor(ns,repo,source)
    parent=Path(os.environ.get("RUNNER_TEMP",tempfile.gettempdir()))
    require(parent.is_absolute() and parent.is_dir(),"HOLD_V45_SESSION_TEMP")
    custody=custody_module(repo,payloads[CUSTODY_REL])
    helper_data=payloads[CUSTODY_REL]
    capture=custody.WorkflowSessionResourceCapture()

    def child_main():
        return _workflow_session_inner(ns,repo,payloads,custody,parent)

    try:
        report=capture.run(child_main,custody_source_sha256=sha256(helper_data),
                           timeout_ms=custody.WorkflowSessionResourceCapture.MAX_TIMEOUT_MS)
    except custody.CustodyHold as exc:
        if exc.code == "HOLD_V45_RESOURCE_RETURNED_IO_BYTES":
            observation = getattr(exc, "observation", None)
            try:
                if type(observation) is not dict:
                    raise ValueError("missing workflow-session observation")
                ledger = observation.get("outer_ledger")
                if type(ledger) is not dict:
                    raise ValueError("invalid outer-ledger observation")
                refusal = ledger.get("refusal")
                limits = ledger.get("limits")
                totals = ledger.get("totals")
                if type(refusal) is not dict or type(limits) is not dict or type(totals) is not dict:
                    raise ValueError("invalid returned-I/O diagnostic shape")
                read_bytes = totals.get("read_return_bytes")
                write_bytes = totals.get("write_return_bytes")
                returned_total = (
                    read_bytes + write_bytes
                    if type(read_bytes) is int and type(write_bytes) is int
                    else None
                )
                refusal_consistent = (
                    refusal.get("metric") == "returned_io_bytes"
                    and type(refusal.get("limit")) is int
                    and type(refusal.get("observed")) is int
                    and limits.get("returned_io_bytes") == refusal.get("limit")
                    and returned_total == refusal.get("observed")
                    and refusal.get("observed") > refusal.get("limit")
                )
                diagnostic = {
                    "marker": "VOID_PR1505_RETURNED_IO_RESOURCE_DIAGNOSTIC_V1",
                    "original_refusal": exc.code,
                    "refusal": refusal,
                    "limits": limits,
                    "read_return_bytes": read_bytes,
                    "write_return_bytes": write_bytes,
                    "returned_io_total": returned_total,
                    "refusal_consistent": refusal_consistent,
                    "outer_task_count": observation.get("outer_task_count"),
                    "delegated_process_count": observation.get("delegated_process_count"),
                    "partition_overlap_count": observation.get("partition_overlap_count"),
                    "cleanup_complete": observation.get("cleanup_complete"),
                    "all_delegated_pidfds_terminal": observation.get("all_delegated_pidfds_terminal"),
                    "diagnostic_only": True,
                    "returned_io_limit_unchanged": True,
                    "task_limit_unchanged": True,
                    "syscall_stop_limit_unchanged": True,
                    "ownership_model_unchanged": True,
                    "step2_outer_session_lifetime_open": True,
                    "step3_delegated_reconciliation_open": True,
                    "whole_case_complete": False,
                    "full_job_process_census": False,
                    "full_campaign_accepted": False,
                }
                # Diagnostic-only attribution for the existing returned-I/O HOLD.
                # This does not change tracing, ownership, limits, retry policy, or
                # acceptance. It summarizes the already-retained outer ledger.
                ledger_tasks = ledger.get("tasks")
                partition = observation.get("task_partition")
                histogram = ledger.get("syscall_histogram")
                if type(ledger_tasks) is not list or type(partition) is not list or type(histogram) is not dict:
                    raise ValueError("invalid returned-I/O attribution shape")

                partition_by_identity = {}
                for partition_row in partition:
                    if type(partition_row) is not dict:
                        raise ValueError("invalid task-partition row")
                    identity_row = partition_row.get("identity")
                    if type(identity_row) is not dict:
                        raise ValueError("invalid task-partition identity")
                    partition_pid = identity_row.get("pid")
                    partition_start = identity_row.get("starttime_ticks")
                    if type(partition_pid) is not int or type(partition_start) is not int:
                        raise ValueError("invalid task-partition generation")
                    key = (partition_pid, partition_start)
                    if key in partition_by_identity:
                        raise ValueError("duplicate task-partition generation")
                    role = partition_row.get("role")
                    if role is not None and type(role) is not str:
                        raise ValueError("invalid task-partition role")
                    partition_by_identity[key] = {
                        "role": role,
                        "creator_pid": partition_row.get("creator_pid"),
                        "process_leader": partition_row.get("process_leader"),
                        "execs": partition_row.get("execs"),
                        "exited": partition_row.get("exited"),
                        "wait_status": partition_row.get("wait_status"),
                    }

                attributed_tasks = []
                task_read_total = 0
                task_write_total = 0
                for task in ledger_tasks:
                    if type(task) is not dict:
                        raise ValueError("invalid ledger task")
                    pid = task.get("pid")
                    starttime_ticks = task.get("starttime_ticks")
                    parent_pid = task.get("parent_pid")
                    syscalls = task.get("syscalls")
                    if type(pid) is not int or type(starttime_ticks) is not int or type(syscalls) is not dict:
                        raise ValueError("invalid ledger task identity")
                    task_read = 0
                    task_write = 0
                    task_syscalls = []
                    for raw_nr, bucket in syscalls.items():
                        if type(raw_nr) is not str or type(bucket) is not dict:
                            raise ValueError("invalid per-task syscall bucket")
                        try:
                            nr = int(raw_nr)
                        except ValueError as exc_nr:
                            raise ValueError("invalid syscall number") from exc_nr
                        read_value = bucket.get("read_return_bytes", 0)
                        write_value = bucket.get("write_return_bytes", 0)
                        if type(read_value) is not int or type(write_value) is not int or read_value < 0 or write_value < 0:
                            raise ValueError("invalid per-task returned-I/O bucket")
                        transferred = read_value + write_value
                        task_read += read_value
                        task_write += write_value
                        if transferred:
                            task_syscalls.append({
                                "nr": nr,
                                "read_return_bytes": read_value,
                                "write_return_bytes": write_value,
                                "returned_io_bytes": transferred,
                                "entries": bucket.get("entries"),
                                "exits": bucket.get("exits"),
                                "errors": bucket.get("errors"),
                            })
                    task_read_total += task_read
                    task_write_total += task_write
                    role_row = partition_by_identity.get((pid, starttime_ticks), {})
                    task_syscalls.sort(key=lambda row: (-row["returned_io_bytes"], row["nr"]))
                    attributed_tasks.append({
                        "pid": pid,
                        "starttime_ticks": starttime_ticks,
                        "parent_pid": parent_pid,
                        "role": role_row.get("role"),
                        "creator_pid": role_row.get("creator_pid"),
                        "process_leader": role_row.get("process_leader"),
                        "partition_execs": role_row.get("execs"),
                        "successful_execs": task.get("successful_execs"),
                        "exited": task.get("exited"),
                        "read_return_bytes": task_read,
                        "write_return_bytes": task_write,
                        "returned_io_bytes": task_read + task_write,
                        "top_syscalls": task_syscalls[:8],
                    })

                attributed_tasks.sort(
                    key=lambda row: (-row["returned_io_bytes"], row["pid"], row["starttime_ticks"])
                )

                attributed_syscalls = []
                histogram_read_total = 0
                histogram_write_total = 0
                for raw_nr, bucket in histogram.items():
                    if type(raw_nr) is not str or type(bucket) is not dict:
                        raise ValueError("invalid syscall histogram bucket")
                    try:
                        nr = int(raw_nr)
                    except ValueError as exc_nr:
                        raise ValueError("invalid histogram syscall number") from exc_nr
                    read_value = bucket.get("read_return_bytes", 0)
                    write_value = bucket.get("write_return_bytes", 0)
                    if type(read_value) is not int or type(write_value) is not int or read_value < 0 or write_value < 0:
                        raise ValueError("invalid syscall histogram returned-I/O")
                    histogram_read_total += read_value
                    histogram_write_total += write_value
                    transferred = read_value + write_value
                    if transferred:
                        attributed_syscalls.append({
                            "nr": nr,
                            "read_return_bytes": read_value,
                            "write_return_bytes": write_value,
                            "returned_io_bytes": transferred,
                            "entries": bucket.get("entries"),
                            "exits": bucket.get("exits"),
                            "errors": bucket.get("errors"),
                        })
                attributed_syscalls.sort(
                    key=lambda row: (-row["returned_io_bytes"], row["nr"])
                )

                task_attributed_total = task_read_total + task_write_total
                histogram_attributed_total = histogram_read_total + histogram_write_total
                refusal_observed = refusal.get("observed")
                refusal_limit = refusal.get("limit")
                if type(refusal_observed) is not int or type(refusal_limit) is not int:
                    raise ValueError("invalid returned-I/O refusal values")

                attribution = {
                    "marker": "VOID_PR1505_RETURNED_IO_ATTRIBUTION_DIAGNOSTIC_V1",
                    "original_refusal": exc.code,
                    "refusal": refusal,
                    "limits": limits,
                    "ledger_task_count": len(ledger_tasks),
                    "partition_task_count": len(partition),
                    "partition_identity_count": len(partition_by_identity),
                    "ledger_read_return_bytes": read_bytes,
                    "ledger_write_return_bytes": write_bytes,
                    "ledger_returned_io_total": returned_total,
                    "task_read_return_bytes": task_read_total,
                    "task_write_return_bytes": task_write_total,
                    "task_returned_io_total": task_attributed_total,
                    "histogram_read_return_bytes": histogram_read_total,
                    "histogram_write_return_bytes": histogram_write_total,
                    "histogram_returned_io_total": histogram_attributed_total,
                    "ledger_totals_match_task_attribution": (
                        returned_total == task_attributed_total
                    ),
                    "ledger_totals_match_syscall_attribution": (
                        returned_total == histogram_attributed_total
                    ),
                    "task_and_syscall_attribution_match": (
                        task_attributed_total == histogram_attributed_total
                    ),
                    "refusal_observed_matches_task_attribution": (
                        refusal_observed == task_attributed_total
                    ),
                    "refusal_observed_minus_task_attributed_bytes": (
                        refusal_observed - task_attributed_total
                    ),
                    "refusal_observed_minus_limit_bytes": (
                        refusal_observed - refusal_limit
                    ),
                    "top_tasks_limit": 24,
                    "top_tasks_truncated_count": max(0, len(attributed_tasks) - 24),
                    "top_tasks": attributed_tasks[:24],
                    "top_syscalls_limit": 24,
                    "top_syscalls_truncated_count": max(0, len(attributed_syscalls) - 24),
                    "top_syscalls": attributed_syscalls[:24],
                    "diagnostic_only": True,
                    "returned_io_limit_unchanged": True,
                    "task_limit_unchanged": True,
                    "syscall_stop_limit_unchanged": True,
                    "ownership_model_unchanged": True,
                    "full_campaign_accepted": False,
                }
                print(json.dumps(attribution, sort_keys=True), file=sys.stderr, flush=True)
                print(json.dumps(diagnostic, sort_keys=True), file=sys.stderr, flush=True)
            except Exception as diagnostic_exc:
                print(json.dumps({
                    "marker": "VOID_PR1505_RETURNED_IO_RESOURCE_DIAGNOSTIC_V1",
                    "classification": "DIAGNOSTIC_FAILURE",
                    "error_type": type(diagnostic_exc).__name__,
                    "original_refusal": exc.code,
                    "diagnostic_only": True,
                    "returned_io_limit_unchanged": True,
                    "task_limit_unchanged": True,
                    "syscall_stop_limit_unchanged": True,
                    "ownership_model_unchanged": True,
                    "full_campaign_accepted": False,
                }, sort_keys=True), file=sys.stderr, flush=True)
        if exc.code == "HOLD_V45_RESOURCE_TASKS":
            observation = getattr(exc, "observation", None)
            try:
                if type(observation) is not dict:
                    raise ValueError("missing workflow-session observation")
                ledger = observation.get("outer_ledger")
                partition = observation.get("task_partition")
                delegations = observation.get("delegations")
                if type(ledger) is not dict or type(partition) is not list or type(delegations) is not list:
                    raise ValueError("invalid workflow-session observation shape")
                ledger_tasks = ledger.get("tasks")
                refusal = ledger.get("refusal")
                limits = ledger.get("limits")
                if type(ledger_tasks) is not list or type(refusal) is not dict or type(limits) is not dict:
                    raise ValueError("invalid outer-ledger diagnostic shape")
                ledger_pids = {
                    row["pid"] for row in ledger_tasks
                    if type(row) is dict and type(row.get("pid")) is int
                }
                partition_by_pid = {}
                for row in partition:
                    if type(row) is not dict or type(row.get("identity")) is not dict:
                        raise ValueError("invalid task-partition row")
                    pid = row["identity"].get("pid")
                    if type(pid) is not int or pid in partition_by_pid:
                        raise ValueError("invalid task-partition pid")
                    partition_by_pid[pid] = row
                delegated_pids = {
                    row["pid"] for row in delegations
                    if type(row) is dict and type(row.get("pid")) is int
                }
                overflow = [
                    row for pid, row in partition_by_pid.items()
                    if pid not in ledger_pids
                ]
                root_pid = observation.get("root_pid")
                custodian = observation.get("custodian")
                custodian_pid = custodian.get("pid") if type(custodian) is dict else None
                candidates = []
                for row in overflow[:4]:
                    pid = row["identity"]["pid"]
                    current = pid
                    seen = set()
                    lineage = []
                    complete = False
                    while current in partition_by_pid and current not in seen and len(lineage) < 64:
                        seen.add(current)
                        item = partition_by_pid[current]
                        lineage.append({
                            "pid": current,
                            "creator_pid": item.get("creator_pid"),
                            "role": item.get("role"),
                            "process_leader": item.get("process_leader"),
                            "execs": item.get("execs"),
                        })
                        if current == root_pid:
                            complete = True
                            break
                        current = item.get("creator_pid")
                        if type(current) is not int:
                            break
                    custodian_in_lineage = any(
                        item["pid"] == custodian_pid or item["role"] == "custodian"
                        for item in lineage
                    )
                    candidates.append({
                        "identity": row["identity"],
                        "creator_pid": row.get("creator_pid"),
                        "role": row.get("role"),
                        "process_leader": row.get("process_leader"),
                        "execs": row.get("execs"),
                        "lineage": lineage,
                        "parentage_complete_to_root": complete,
                        "custodian_in_lineage": custodian_in_lineage,
                        "present_in_delegations": pid in delegated_pids,
                    })
                limit_consistent = (
                    refusal.get("metric") == "tasks"
                    and type(refusal.get("limit")) is int
                    and type(refusal.get("observed")) is int
                    and refusal["observed"] == refusal["limit"] + 1
                    and limits.get("tasks") == refusal["limit"]
                    and len(ledger_tasks) == refusal["limit"]
                    and len(partition) == refusal["observed"]
                )
                classification = "UNRESOLVED"
                if len(candidates) == 1 and limit_consistent:
                    candidate = candidates[0]
                    if candidate["custodian_in_lineage"] or candidate["present_in_delegations"]:
                        classification = "DELEGATION_BOUNDARY_LEAK"
                    elif (
                        candidate["parentage_complete_to_root"]
                        and observation.get("partition_overlap_count") == 0
                    ):
                        classification = "FINITE_OUTER_SESSION_CAPACITY_EXCEEDED"
                diagnostic = {
                    "marker": "VOID_PR1505_RESOURCE_TASK_OWNERSHIP_DIAGNOSTIC_V1",
                    "original_refusal": exc.code,
                    "refusal": refusal,
                    "classification": classification,
                    "limit_consistent": limit_consistent,
                    "outer_task_count": observation.get("outer_task_count"),
                    "ledger_task_count": len(ledger_tasks),
                    "overflow_task_count": len(overflow),
                    "overflow_candidates": candidates,
                    "root_pid": root_pid,
                    "custodian": custodian,
                    "delegated_process_count": observation.get("delegated_process_count"),
                    "delegation_partition_overlap_count": sum(
                        row.get("present_in_outer_task_partition") is True
                        for row in delegations if type(row) is dict
                    ),
                    "partition_overlap_count": observation.get("partition_overlap_count"),
                    "cleanup_complete": observation.get("cleanup_complete"),
                    "diagnostic_only": True,
                    "task_limit_unchanged": True,
                    "ownership_model_unchanged": True,
                    "step2_outer_session_lifetime_open": True,
                    "step3_delegated_reconciliation_open": True,
                    "whole_case_complete": False,
                    "full_job_process_census": False,
                    "full_campaign_accepted": False,
                }
                print(json.dumps(diagnostic, sort_keys=True), file=sys.stderr, flush=True)
            except Exception as diagnostic_exc:
                print(json.dumps({
                    "marker": "VOID_PR1505_RESOURCE_TASK_OWNERSHIP_DIAGNOSTIC_V1",
                    "classification": "DIAGNOSTIC_FAILURE",
                    "error_type": type(diagnostic_exc).__name__,
                    "original_refusal": exc.code,
                    "diagnostic_only": True,
                    "task_limit_unchanged": True,
                    "ownership_model_unchanged": True,
                    "full_campaign_accepted": False,
                }, sort_keys=True), file=sys.stderr, flush=True)
        raise SourceHold(exc.code) from exc
    require(report.get("status")=="CAPTURED"
            and report.get("cleanup_complete") is True
            and report.get("partition_overlap_count")==0
            and report.get("whole_case_complete") is False
            and report.get("full_job_process_census") is False,
            "HOLD_V45_WORKFLOW_OUTER_CAPTURE")
    directory=Path(tempfile.mkdtemp(prefix="void-v45-outer-session-",dir=parent))
    target=directory/"outer-session.json"
    receipt=canonical(report)
    write_exclusive(target,receipt)
    commitment={"format":"VOID_V45_WORKFLOW_SESSION_OUTER_RECEIPT_COMMITMENT_V1",
                "head":ns.expected_head,"tree":ns.expected_tree,
                "node_major":ns.node_major,"run_id":ns.run_id,
                "run_attempt":ns.run_attempt,"bytes":len(receipt),
                "sha256":sha256(receipt),"capture_sha256":report["capture_sha256"],
                "whole_case_complete":False,"full_job_process_census":False,
                "step3_delegated_reconciliation_open":True}
    print("VOID_DATANET_V45_OUTER_SESSION_COMMITMENT_V1 "+
          canonical(commitment).decode().strip(),flush=True)
    github_env=os.environ.get("GITHUB_ENV")
    if github_env:
        with open(github_env,"a",encoding="utf-8") as stream:
            stream.write("V45_OUTER_SESSION_RECEIPT_PATH="+str(target)+"\n")
    return 0


def run(ns: argparse.Namespace) -> int:
    repo = Path(ns.repo_root)
    require(ns.run_id > 0 and ns.run_attempt > 0, "HOLD_V45_RUN_IDENTITY")
    require(repo.is_absolute() and repo.is_dir(), "HOLD_V45_SOURCE_REPO_ROOT")
    source, payloads = source_tree(repo, ns.expected_head, ns.expected_tree)
    ns.source_paths = set(payloads)
    require(ns.entrypoint in payloads, "HOLD_V45_SOURCE_ENTRYPOINT")
    supervisor, supervisor_key = verify_supervisor(ns, repo, source)
    parent = Path(ns.snapshot_parent) if ns.snapshot_parent else Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir()))
    require(parent.is_absolute() and parent.is_dir(), "HOLD_V45_SOURCE_SNAPSHOT_PARENT")
    container = root = None
    retained = None
    owned = None
    manifest = None
    client = None
    borrowed = []
    custody = None
    failed = True
    try:
        container, root = build_snapshot(parent, payloads, source)
        retained = RetainedSnapshot(root, source["source_wall_entries"], source)
        retained.assert_stable()
        assert_supervisor_stable(ns, repo, supervisor_key, supervisor)
        custody = custody_module(root,payloads[CUSTODY_REL])
        raw_channel = os.environ.get(custody.ENV_CHANNEL)
        require(raw_channel is not None and raw_channel.isdecimal(), "HOLD_V45_CUSTODY_SESSION_REQUIRED")
        client = custody.Client(int(raw_channel))
        entry = source["source_wall_entries"][ns.entrypoint]
        entrypoint = {
            "path": ns.entrypoint,
            "git_blob": entry["git_blob"],
            "sha256": entry["sha256"],
            "bytes": entry["bytes"],
            "mode": entry["mode"],
            "executed_from_retained_fd": not ns.entrypoint_stdin,
            "executed_from_sealed_stdin": ns.entrypoint_stdin,
            "proc_fd_handoff": not ns.entrypoint_stdin,
            "stdin_fd_handoff": ns.entrypoint_stdin,
        }
        base = receipt_base(ns, source, supervisor, entrypoint)

        command_template = list(ns.command)
        if command_template and command_template[0] == "--":
            command_template = command_template[1:]
        spec = phase_spec(ns.phase, ns.node_major)
        outputs, paths = contract_metadata(ns, spec)
        contract = phase_contract_receipt(spec, argv_allowlisted=command_template == spec["argv"])
        declared_outputs = declared_path_bindings(outputs)
        declared_paths = declared_path_bindings(paths)

        if ns.expect_hold is not None:
            require(not ns.expect_generation_hold, "HOLD_V45_PHASE_CONTROL_ARGUMENTS")
            if ns.expect_hold == ARGV_HOLD:
                require(command_template != spec["argv"], "HOLD_V45_PHASE_CONTROL_ACCEPTED")
                for path in outputs.values():
                    require(not os.path.lexists(path), "HOLD_V45_PHASE_CONTROL_OUTPUT_PRESENT")
                control_kind = "relabeled-help"
                control_flag = "phase_argv_mismatch_rejected_before_output_create"
            else:
                require(command_template == spec["argv"], "HOLD_V45_PHASE_CONTROL_WRONG_REJECTION")
                try:
                    unexpected = OwnedOutputs(outputs, parent)
                except SourceHold as exc:
                    require(exc.code == PREEXISTING_OUTPUT_HOLD, "HOLD_V45_PHASE_CONTROL_WRONG_REJECTION")
                else:
                    unexpected.close()
                    raise SourceHold("HOLD_V45_PHASE_CONTROL_ACCEPTED")
                control_kind = "preexisting-output"
                control_flag = "preexisting_output_rejected_before_child"
            retained.assert_stable()
            assert_supervisor_stable(ns, repo, supervisor_key, supervisor)
            out = sealed({
                **base,
                "marker": PHASE_CONTROL_MARKER,
                "status": "GREEN",
                "control_kind": control_kind,
                "rejection": ns.expect_hold,
                "command_template": command_template,
                "phase_contract": contract,
                "declared_output_paths": declared_outputs,
                "declared_path_tokens": declared_paths,
                "presented_argv_sha256": sha256(canonical({"argv": command_template})),
                "child_started": False,
                control_flag: True,
            })
            publish_control_receipt(ns,canonical(out),parent,source,custody,client)
            failed = False
            return 0

        require(command_template == spec["argv"], ARGV_HOLD)
        contract = phase_contract_receipt(spec, argv_allowlisted=True)

        if ns.expect_generation_hold:
            control_pause(ns, root)
            try:
                retained.assert_stable()
                assert_supervisor_stable(ns, repo, supervisor_key, supervisor)
            except SourceHold as exc:
                require(exc.code == GENERATION_HOLD, "HOLD_V45_SOURCE_CONTROL_WRONG_REJECTION")
            else:
                raise SourceHold("HOLD_V45_SOURCE_CONTROL_ACCEPTED")
            out = sealed({
                **base,
                "marker": CONTROL_MARKER,
                "status": "GREEN",
                "control_target": ns.control_target,
                "rejection": GENERATION_HOLD,
                "external_a_to_b_to_a_control": True,
                "child_started": False,
                "command_template": command_template,
                "phase_contract": contract,
                "declared_output_paths": declared_outputs,
                "declared_path_tokens": declared_paths,
            })
            publish_control_receipt(ns,canonical(out),parent,source,custody,client)
            failed = False
            return 0

        require(ns.control_ready is None and ns.control_continue is None and ns.control_target is None, "HOLD_V45_SOURCE_CONTROL_ARGUMENTS")
        # Direct V45 Python phases use a sealed anonymous source copy. The
        # inherited V41-V44 static gates require their original retained snapshot
        # file description because their admitted code resolves __file__ back to
        # sibling source/fixture modules. Both profiles are launched and traced by
        # the custodian; caller PID registration remains forbidden.
        python_shape = (not ns.entrypoint_stdin
            and spec["argv"][:5] == ["python3", "-I", "-S", "-B", "@ENTRYPOINT@"])
        direct_v45_profile = python_shape and ns.entrypoint.startswith("scripts/prove_datanet_v45_")
        inherited_static_profile = (python_shape and ns.phase in INHERITED_STATIC_PHASES
            and ns.entrypoint == spec["entrypoint"])
        retained_selftest_profile = (python_shape and ns.phase == "custody-selftest"
            and ns.entrypoint == spec["entrypoint"])
        runner_profile = (ns.phase == "runner" and ns.entrypoint_stdin
            and ns.entrypoint == spec["entrypoint"] and command_template == spec["argv"])
        require(direct_v45_profile or inherited_static_profile or runner_profile,
                "HOLD_V45_OBSERVED_LAUNCH_PROFILE_NOT_IMPLEMENTED")
        source_profile = ("retained-static" if inherited_static_profile
            else "retained-selftest" if retained_selftest_profile
            else custody.RUNNER_SOURCE_PROFILE if runner_profile else "sealed-copy")
        owned = OwnedOutputs(outputs, parent)
        manifest = OwnedOutputs({"RECEIPT":Path(ns.receipt)},parent)
        command, argument_bindings = replace_tokens(
            command_template, root, repo, retained.entry_fd(ns.entrypoint), ns, outputs, paths,
        )
        env = {key: os.environ[key] for key in ("PATH", "LANG", "LC_ALL", "RUNNER_TEMP") if key in os.environ}
        env.update({"GIT_DIR": str(repo / ".git"), "GIT_WORK_TREE": str(repo),
            "VOID_V45_SOURCE_ROOT": str(root), "VOID_V45_SOURCE_INVENTORY_SHA256": sha256(canonical(source)),
            "VOID_V45_SOURCE_EXECUTION_PHASE": ns.phase, "VOID_V45_RUN_ID": str(ns.run_id),
            "VOID_V45_RUN_ATTEMPT": str(ns.run_attempt)})
        custody_ready = custody_prepare(client,ns,owned,manifest,command,source)
        owned_entry_fd = None
        cwd_fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
        if source_profile in ("retained-static", "retained-selftest"):
            entry_fd = retained.entry_fd(ns.entrypoint)
            parent_fd = retained.entry_parent_fd(ns.entrypoint)
            launch_fds = (entry_fd, parent_fd, cwd_fd)
        else:
            owned_entry_fd = custody.sealed_fd(payloads[ns.entrypoint],
                "void-v45-runner-stdin-source" if runner_profile else "void-v45-phase-source")
            entry_fd = owned_entry_fd
            launch_fds = (entry_fd, cwd_fd)
        runner_known_paths = None
        if runner_profile:
            runner_known_paths = set(str(path) for path in custody.bounded_files(paths["EVIDENCE_ROOT"]).values())
            runner_known_paths.update(str(path) for path in outputs.values())
            runner_known_paths.add(str(Path(ns.receipt)))
        try:
            execution, extra = client.request("LAUNCH", fds=launch_fds,
                argv_tail=(command if runner_profile else command[5:]),
                environment=env,
                timeout_ms=(4290000 if runner_profile else 600000 if ns.phase=="custody-selftest" else 180000),
                stdout_role=spec["stdout"], stderr_role=spec["stderr"], source_profile=source_profile)
        finally:
            if owned_entry_fd is not None:
                os.close(owned_entry_fd)
            os.close(cwd_fd)
        require(execution.get("status")=="EXECUTED" and len(extra)==1, "HOLD_V45_CUSTODY_EXECUTION")
        try:
            require(fcntl.fcntl(extra[0],fcntl.F_GET_SEALS)==15, "HOLD_V45_CUSTODY_STDOUT_SEALS")
            child_stdout=custody.read_fd(extra[0])
            require(len(child_stdout)==execution["stdout_bytes"] and sha256(child_stdout)==execution["stdout_sha256"],
                    "HOLD_V45_CUSTODY_STDOUT_BYTES")
        finally:
            for fd in extra:os.close(fd)
        observation=execution["observation"]
        producer=execution["producer"]
        if runner_profile:
            require(command==observation["executed_argv"]
                    and sha256(canonical({"argv":command}))==producer["argv_sha256"],
                    "HOLD_V45_CUSTODY_EXECUTED_ARGV")
        else:
            argument_bindings["@ENTRYPOINT@"] = "/proc/self/fd/"+str(observation["entrypoint_fd"])
            command=[arg.replace(f"/proc/self/fd/{retained.entry_fd(ns.entrypoint)}", argument_bindings["@ENTRYPOINT@"])
                     if arg==f"/proc/self/fd/{retained.entry_fd(ns.entrypoint)}" else arg for arg in command]
            require(command==observation["executed_argv"]
                    and sha256(canonical({"argv":command}))==producer["argv_sha256"],
                    "HOLD_V45_CUSTODY_EXECUTED_ARGV")
        completed=subprocess.CompletedProcess(command,0,child_stdout)
        require(completed.returncode == 0, "HOLD_V45_SOURCE_CHILD_FAILED")
        retained.assert_stable()
        assert_supervisor_stable(ns, repo, supervisor_key, supervisor)
        created = {role: owned.binding(role) for role in spec["owned"]}
        if spec["stdout"]:
            stdout_data = owned.read(spec["stdout"])
            stdout_binding = created[spec["stdout"]]
        elif spec["pipe_stdout"]:
            stdout_data = completed.stdout or b""
            require(len(stdout_data) <= MAX_CHILD_STDOUT_BYTES, "HOLD_V45_CHILD_STDOUT_SIZE")
            stdout_binding = {
                "role": "CUSTODIAN_PIPE",
                "bytes": len(stdout_data),
                "sha256": sha256(stdout_data),
            }
        else:
            stdout_data = b""
            stdout_binding = None
        if spec.get("stdout_marker"):
            require(spec["stdout_marker"].encode() in stdout_data, "HOLD_V45_PHASE_STDOUT_MARKER")
        if spec.get("stdout_equals"):
            require(stdout_data == owned.read(spec["stdout_equals"]), "HOLD_V45_PHASE_STDOUT_OUTPUT_MISMATCH")
        if spec.get("stdout_suffix_equals"):
            authoritative_stdout = owned.read(spec["stdout_suffix_equals"])
            require(len(stdout_data) >= len(authoritative_stdout)
                    and stdout_data.endswith(authoritative_stdout),
                    "HOLD_V45_PHASE_STDOUT_OUTPUT_SUFFIX_MISMATCH")
        stderr_binding = created[spec["stderr"]] if spec["stderr"] else None
        bound_outputs = [
            {key: created[role][key] for key in ("name", "bytes", "sha256")}
            for role in spec["bind"]
        ]
        out = sealed({
            **base,
            "marker": MARKER,
            "status": "GREEN",
            "command_template": command_template,
            "phase_contract": contract,
            "declared_output_paths": declared_outputs,
            "declared_path_tokens": declared_paths,
            "argument_token_bindings": argument_bindings,
            "resolved_argv_sha256": sha256(canonical({"argv": command})),
            "resolved_argv_reconstructed_from_exact_template_and_bindings": True,
            "command_entrypoint_is_retained_fd": not runner_profile,
            "command_entrypoint_is_sealed_stdin": runner_profile,
            "child_started_after_source_admission": True,
            "child_returncode": completed.returncode,
            "producer": {**producer,"returncode":completed.returncode},
            "producer_observation": observation,
            "supervisor_reported_producer_metadata": None,
            "producer_identity_independently_verified": True,
            "producer_exec_observed": True,
            "producer_output_capability_coupled": True,
            "producer_subtree_retired": True,
            "producer_observation_scope": ("direct_v45_python_readonly_helpers_owned_tree_and_stream_retirement"
                if observation["trace_policy"] == custody.HELPER_POLICY
                else "custody_selftest_owned_root_and_terminal_subreaper_retirement"
                if observation["trace_policy"] == custody.SELFTEST_POLICY
                else "privileged_runner_owned_root_and_terminal_subreaper_retirement"
                if observation["trace_policy"] == custody.RUNNER_POLICY
                else "inherited_v41_v44_static_retained_snapshot_owned_tree_and_stream_retirement"
                if observation.get("source_profile") == "retained-static"
                else "direct_v45_python_single_exec_owned_tree_and_stream_retirement"),
            "output_population_authority": "custodian_after_observed_stream_retirement",

            "bundle_authority": "live-custody-commit-not-path-presence",
            "custody_verifier_ready_before_child": True,
            "custody_verifier_pid": custody_ready["verifier_pid"],
            "source_generation_stable_through_child": True,
            "output_paths_absent_before_supervisor_create": True,
            "output_files_supervisor_create_only": True,
            "output_fds_retained_through_child": True,
            "output_generation_stable_through_child": True,
            "created_output_bindings": [created[role] for role in spec["owned"]],
            "output_bindings": bound_outputs,
            "stdout_captured_by_supervisor": False,
            "stdout_captured_by_custodian": True,

            "stdout_binding": stdout_binding,
            "stderr_captured_by_supervisor": spec["stderr"] is not None,
            "stderr_binding": stderr_binding,
        })
        write_to_fd(manifest.fds["RECEIPT"],canonical(out))
        verified,extra=client.request("CHECK")
        require(verified.get("status")=="VERIFIED" and not extra,"HOLD_V45_CUSTODY_STAGED_CHECK")
        owned.publish()
        manifest.publish()
        committed,extra=client.request("COMMIT")
        require(committed.get("status")=="COMMITTED" and not extra,"HOLD_V45_CUSTODY_BUNDLE_COMMIT")
        if runner_profile:
            require(runner_known_paths is not None, "HOLD_V45_CUSTODY_RUNNER_BASELINE")
            adopt_runner_boundary(client, paths["EVIDENCE_ROOT"], runner_known_paths, custody)
        failed = False
        return 0
    finally:
        if failed and (owned is not None or manifest is not None):
            print(json.dumps(publication_diagnostic(owned,manifest,ns.phase,"HOLD_V45_PHASE_INCOMPLETE"),sort_keys=True),file=sys.stderr)
        if client is not None: client.close()
        for fd in borrowed: os.close(fd)
        if manifest is not None: manifest.close()
        if owned is not None:
            owned.close()
        if retained is not None:
            retained.close()
        if container is not None:
            try:
                os.chmod(root, 0o700, follow_symlinks=False)
                for path in root.rglob("*"):
                    if path.is_dir():
                        os.chmod(path, 0o700, follow_symlinks=False)
                    else:
                        os.chmod(path, 0o600, follow_symlinks=False)
                shutil.rmtree(container)
            except FileNotFoundError:
                pass


# Local invocation accounting is separate from producer provenance and resources.
# The parent journals intent before launch, observes the root's terminal state,
# and never upgrades an absent/partial resource record into a complete census.
INVOCATION_FORMAT = 'VOID_V45_LOCAL_INVOCATION_ROOT_JOURNAL_V3'
INVOCATION_WORKER = 'scripts/prove_datanet_v45_custody_integration_v1.py'
# Fixed names mirrored from the source-bound test declarations. No arbitrary
# commands or historical successful static replays are part of this registry.
INVOCATION_FAMILIES = {
    'outer': ('syscall_stops', 'tasks', 'fd_sample', 'deadline', 'preexisting-child'),
    'primary': ('normal', 'third-role-distinct', 'third-role-identical', 'unsupported-publication', 'paired-substitution', 'identical-substitution', 'inplace-paired-change', 'manifest-substitution', 'parent-replacement', 'after-lend-substitution', 'unsealed-input', 'missing-custody', 'capsule-replacement', 'duplicate-log-commitment', 'stale-attempt'),
    'owned': ('normal', 'waited-child', 'fake-pid', 'dead-pid', 'foreign-pid', 'forged-launch-observation', 'duplicate-role', 'invalid-kind', 'nonzero-exit', 'surviving-writer', 'detached-surviving-writer', 'surviving-no-writer', 'scm-rights-held', 'scm-rights-queued', 'scm-rights-closed', 'forged-receipt-observation', 'unobserved-output', 'same-pid-reexec', 'child-fork-exec', 'grandchild-exec', 'thread-clone', 'closed-stream-reexec'),
    'primitive': ('normal', 'waited-child', 'fake-pid', 'dead-pid', 'foreign-pid', 'wrong-source-hash', 'unsealed-source', 'nonzero-exit', 'output-overflow', 'execution-deadline', 'surviving-writer', 'detached-surviving-writer', 'surviving-no-writer', 'scm-rights-held', 'scm-rights-queued', 'scm-rights-closed', 'writable-regular-input', 'bool-limit', 'threaded-caller', 'preexisting-child', 'forged-observation', 'nul-argument'),
    'helper': ('normal-static', 'normal-runtime', 'wrong-argv', 'wrong-executable', 'out-of-order', 'duplicate-helper', 'missing-helper', 'extra-helper', 'root-helper-reexec', 'grandchild-helper', 'changed-environment', 'changed-cwd', 'substituted-input'),
    'resource': ('normal', 'waited-child', 'syscall-max-plus-one', 'task-max-plus-one', 'fd-max-plus-one', 'io-return-overflow', 'deadline', 'nonzero-exit', 'rpc-option-injection', 'fake-registration'),
    'identity': ('fake-pid', 'dead-pid', 'foreign-pid'),
    'cross-runtime': ('selftest',),
    'journal': ('success', 'nonzero', 'timeout', 'no-result', 'signal', 'schema-controls', 'reexec'),
}
INVOCATION_SCENARIOS = tuple(family+'/'+case for family, cases in INVOCATION_FAMILIES.items() for case in cases)
INVOCATION_PLAN = ('outer/syscall_stops','outer/tasks','outer/fd_sample','outer/deadline',
                   'outer/preexisting-child','primary/normal','primary/third-role-distinct','cross-runtime/selftest')
INVOCATION_ALL_LIVE_PLAN = tuple(s for s in INVOCATION_SCENARIOS if not s.startswith('journal/'))
INVOCATION_LIMITS = {'invocations': 128, 'journal_bytes': 2 * 1024 * 1024,
                     'result_bytes': 16 * 1024 * 1024, 'log_bytes': 2 * 1024 * 1024}


def invocation_json(raw: bytes) -> object:
    def pairs(items):
        out = {}
        for key, value in items:
            require(key not in out, 'HOLD_V45_INVOCATION_DUPLICATE_JSON_KEY')
            out[key] = value
        return out
    return json.loads(raw, object_pairs_hook=pairs,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError('nonfinite JSON')))


def invocation_canon(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False)+'\n').encode()


def invocation_file(path: Path, maximum: int) -> bytes:
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        before = os.fstat(fd)
        require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1
                and before.st_size <= maximum, 'HOLD_V45_INVOCATION_FILE_SHAPE')
        raw = pread_all(fd, before.st_size, 'HOLD_V45_INVOCATION_FILE_READ')
        require(fingerprint(before) == fingerprint(os.fstat(fd)), 'HOLD_V45_INVOCATION_FILE_CHANGED')
        return raw
    finally:
        os.close(fd)


def invocation_source(repo: Path) -> dict:
    """Pin the current source before any test starts. This is not a Git mutation."""
    head = git_text(repo, 'rev-parse', 'HEAD')
    tree = git_text(repo, 'rev-parse', 'HEAD^{tree}')
    source, payloads = source_tree(repo, head, tree)
    for name, data in payloads.items():
        require(invocation_file(repo/name, MAX_SOURCE_FILE_BYTES) == data,
                'HOLD_V45_INVOCATION_SOURCE_CHANGED')
    return {'head': head, 'tree': tree, 'inventory_sha256': sha256(canonical(source)),
            'supervisor_sha256': sha256(payloads[SUPERVISOR_REL]),
            'worker_sha256': sha256(payloads[INVOCATION_WORKER]),
            'observer_sha256': sha256(payloads['scripts/datanet_v45_custody_session_v1.py'])}


def invocation_runtime() -> dict:
    binary = Path(sys.executable).resolve(strict=True)
    return {'implementation': sys.implementation.name, 'version': sys.version.split()[0],
            'executable': str(binary),
            'executable_sha256': sha256(invocation_file(binary, 64*1024*1024)),
            'platform': sys.platform, 'machine': os.uname().machine,
            'identity_scope': 'parent_measured_runtime_selected_for_launch_not_independent_exec_trace'}


def invocation_ledger_refs(value: object) -> list[dict]:
    """Canonical content objects plus reference paths; never sum aliases."""
    found = {}; count = 0
    formats = {'VOID_V45_OWNED_SYSCALL_LEDGER_V1', 'VOID_V45_OUTER_CASE_SYSCALL_LEDGER_V1'}
    def walk(obj, pointer, depth):
        nonlocal count
        count += 1
        require(count <= 200000 and depth <= 60, 'HOLD_V45_INVOCATION_RESULT_BOUNDS')
        if isinstance(obj, dict):
            if obj.get('format') in formats:
                claimed = obj.get('ledger_sha256'); body = dict(obj); body.pop('ledger_sha256', None)
                require(type(claimed) is str and re.fullmatch('[0-9a-f]{64}', claimed) is not None
                        and sha256(invocation_canon(body)) == claimed,
                        'HOLD_V45_INVOCATION_LEDGER_SEAL')
                object_hash = sha256(invocation_canon(obj))
                row = found.setdefault(object_hash, {'object_sha256': object_hash,
                    'ledger_sha256': claimed, 'format': obj['format'], 'paths': []})
                row['paths'].append(pointer)
                return
            for key in sorted(obj):
                walk(obj[key], pointer+'/'+key.replace('~', '~0').replace('/', '~1'), depth+1)
        elif isinstance(obj, list):
            for i, item in enumerate(obj): walk(item, pointer+'/'+str(i), depth+1)
    walk(value, '', 0)
    return [found[key] for key in sorted(found)]


def verify_invocation_journal(raw: bytes, expected_source: dict, expected_runtime: dict,
                              *, expected_plan: list[str], artifacts: Path | None = None) -> dict:
    """Validate all identities before returning any completed-execution totals.

    A missing terminal remains UNFINISHED. No historical IDs are manufactured.
    Hash chaining detects inconsistent records, not a dishonest journal owner.
    """
    code = 'HOLD_V45_INVOCATION_JOURNAL_INVALID'
    def check(ok): require(ok, code)
    check(type(raw) is bytes and len(raw) <= INVOCATION_LIMITS['journal_bytes'])
    # Truncated last writes are not silently stripped or promoted to success.
    check(raw.endswith(b'\n'))
    events = [invocation_json(line) for line in raw.splitlines()]
    check(1 <= len(events) <= 2+3*INVOCATION_LIMITS['invocations'])
    previous = '0'*64; prior_time = -1; rows = []; active = None; closed = False
    header = None; ledger_owners = {}; attempts = {}; start_count = 0
    root_generations = set(); cleanup_receipts = set(); terminal_observers = set()
    observer_artifacts = {k:set() for k in
        ('worker_observation_sha256','worker_resource_join_sha256','surrounding_resource_sha256')}
    recorder_generation = None
    for sequence, event in enumerate(events, 1):
        check(type(event) is dict and set(event) == {'sequence','previous_sha256','time_ns','kind','data','event_sha256'})
        unsigned = dict(event); claimed = unsigned.pop('event_sha256')
        check(type(event['sequence']) is int and event['sequence'] == sequence
              and event['previous_sha256'] == previous
              and type(event['time_ns']) is int and event['time_ns'] >= prior_time
              and claimed == sha256(invocation_canon(unsigned)))
        previous = claimed; prior_time = event['time_ns']
        kind = event['kind']; data = event['data']; check(type(data) is dict and not closed)
        if sequence == 1:
            check(kind == 'SESSION' and set(data) == {'format','session_id','source','runtime','plan','owner_pid','scope'})
            check(data['format'] in (INVOCATION_FORMAT, INVOCATION_OBSERVED_FORMAT) and data['source'] == expected_source
                  and data['runtime'] == expected_runtime
                  and data['scope'] == 'selected_local_case_root_invocations_only'
                  and type(data['owner_pid']) is int and data['owner_pid'] > 0
                  and type(data['session_id']) is str and re.fullmatch('[0-9a-f]{32}', data['session_id']) is not None)
            check(data['plan'] == expected_plan and type(data['plan']) is list and 1 <= len(data['plan']) <= INVOCATION_LIMITS['invocations']
                  and all(type(s) is str and s in INVOCATION_SCENARIOS for s in data['plan']))
            header = data; continue
        check(header is not None)
        if kind == 'BEGIN':
            check(active is None and set(data) == {'invocation_id','scenario_id','ordinal','attempt','deadline_ns','source','runtime','argv_sha256'})
            start_count += 1; check(start_count <= len(header['plan']))
            scenario = header['plan'][start_count-1]; attempt = attempts.get(scenario, 0)+1; attempts[scenario] = attempt
            check(type(data['ordinal']) is int and data['ordinal'] == start_count
                  and type(data['attempt']) is int and data['attempt'] == attempt
                  and data['scenario_id'] == scenario
                  and data['source'] == expected_source and data['runtime'] == expected_runtime
                  and type(data['deadline_ns']) is int and 1 <= data['deadline_ns'] <= 120000000000
                  and type(data['argv_sha256']) is str and re.fullmatch('[0-9a-f]{64}', data['argv_sha256']))
            identity = [header['session_id'], expected_source, scenario, start_count, attempt]
            check(data['invocation_id'] == sha256(invocation_canon(identity))
                  and all(r['invocation_id'] != data['invocation_id'] for r in rows))
            active = {**data, 'begin_time_ns': event['time_ns'], 'state':'UNFINISHED', 'spawn':None, 'terminal':None}
            rows.append(active)
        elif kind == 'SPAWN':
            check(active is not None and active['spawn'] is None
                  and set(data) == ({'invocation_id','pid','starttime_ticks','parent_pid'} |
                      ({'observer'} if header['format']==INVOCATION_OBSERVED_FORMAT else set())))
            check(data['invocation_id'] == active['invocation_id'] and
                  all(type(data[k]) is int and data[k] > 0 for k in ('pid','starttime_ticks','parent_pid'))
                  and data['pid'] != header['owner_pid'])
            worker_generation = (data['pid'],data['starttime_ticks'])
            check(worker_generation not in root_generations)
            if header['format']==INVOCATION_OBSERVED_FORMAT:
                observer = data['observer']
                check(type(observer) is dict and set(observer)=={'pid','starttime_ticks','parent_pid'}
                      and all(type(v) is int and v>0 for v in observer.values())
                      and observer['parent_pid']==header['owner_pid']
                      and observer['pid'] not in (header['owner_pid'],data['pid'])
                      and data['parent_pid']==observer['pid'])
                observer_generation = (observer['pid'],observer['starttime_ticks'])
                require(observer_generation not in root_generations,
                        'HOLD_V45_INVOCATION_OBSERVER_REUSE')
                root_generations.add(observer_generation)
            else:
                check(data['parent_pid']==header['owner_pid'])
            root_generations.add(worker_generation)
            active['spawn'] = data
        elif kind == 'END':
            check(active is not None and set(data) == ({'invocation_id','state','returncode','root_reaped',
                  'elapsed_ns','result_sha256','log_sha256','ledger_refs','automatic_retries','descendant_cleanup_verified','fixture_transfer'} |
                  ({'worker_observation_sha256','worker_resource_join_sha256','surrounding_resource_sha256'} if header['format']==INVOCATION_OBSERVED_FORMAT else set())))
            check(data['invocation_id'] == active['invocation_id']
                  and data['state'] in ('COMPLETED','FAILED','TIMEOUT','LAUNCH_ERROR','INTERRUPTED')
                  and type(data['elapsed_ns']) is int and data['elapsed_ns'] >= 0
                  and data['elapsed_ns'] == event['time_ns']-active['begin_time_ns']
                  and type(data['automatic_retries']) is int and data['automatic_retries'] == 0
                  and type(data['descendant_cleanup_verified']) is bool
                  and type(data['root_reaped']) is bool
                  and (data['returncode'] is None or type(data['returncode']) is int))
            if data['descendant_cleanup_verified']:
                check(header['format']==INVOCATION_OBSERVED_FORMAT and artifacts is not None
                      and data['state']=='COMPLETED')
            if data['state'] == 'LAUNCH_ERROR':
                check(active['spawn'] is None and not data['root_reaped'] and data['returncode'] is None)
            else:
                check(active['spawn'] is not None and data['root_reaped'] and data['returncode'] is not None)
            if data['state'] == 'COMPLETED':
                check(data['returncode'] == 0 and data['elapsed_ns'] <= active['deadline_ns']
                      and type(data['result_sha256']) is str)
            if data['state'] == 'TIMEOUT': check(data['elapsed_ns'] >= active['deadline_ns'])
            verify_invocation_transfer(data['fixture_transfer'], active['scenario_id'],
                                       active['begin_time_ns'], event['time_ns'], data['state'])
            check(type(data['ledger_refs']) is list)
            objects = []
            for ledger in data['ledger_refs']:
                check(set(ledger) == {'object_sha256','ledger_sha256','format','paths'}
                      and ledger['object_sha256'] not in objects
                      and ledger['object_sha256'] not in ledger_owners
                      and ledger['format'] in ('VOID_V45_OWNED_SYSCALL_LEDGER_V1','VOID_V45_OUTER_CASE_SYSCALL_LEDGER_V1')
                      and all(type(ledger[k]) is str and re.fullmatch('[0-9a-f]{64}',ledger[k]) for k in ('object_sha256','ledger_sha256'))
                      and type(ledger['paths']) is list and len(ledger['paths'])>0
                      and len(ledger['paths'])==len(set(ledger['paths']))
                      and all(type(p) is str and p.startswith('/') for p in ledger['paths']))
                objects.append(ledger['object_sha256']);ledger_owners[ledger['object_sha256']] = active['invocation_id']
            for digest_field in ('result_sha256','log_sha256'):
                v = data[digest_field]
                check(v is None or type(v) is str and re.fullmatch('[0-9a-f]{64}',v))
            if artifacts is not None:
                folder = artifacts / active['invocation_id']
                for field, name, maximum in (('result_sha256','result.json',INVOCATION_LIMITS['result_bytes']),
                                              ('log_sha256','output.log',INVOCATION_LIMITS['log_bytes'])):
                    if data[field] is not None:
                        actual = invocation_file(folder/name, maximum); check(sha256(actual) == data[field])
                        if name == 'result.json':
                            result = invocation_json(actual)
                            check(set(result) == {'format','invocation_id','scenario_id','source','runtime','status','payload'}
                                  and result['format'] == 'VOID_V45_INVOCATION_RESULT_V1'
                                  and result['invocation_id'] == active['invocation_id']
                                  and result['scenario_id'] == active['scenario_id']
                                  and result['source'] == expected_source and result['runtime'] == expected_runtime
                                  and result['status'] == 'PASS')
                            check(invocation_ledger_refs(result) == data['ledger_refs'])
                check(data['result_sha256'] is not None or not data['ledger_refs'])
            if header['format']==INVOCATION_OBSERVED_FORMAT:
                check(all(type(data[k]) is str and re.fullmatch('[0-9a-f]{64}', data[k]) for k in observer_artifacts))
                for field, seen in observer_artifacts.items():
                    require(data[field] not in seen, 'HOLD_V45_INVOCATION_OBSERVER_ARTIFACT_REUSE')
                    seen.add(data[field])
                if artifacts is not None:
                    obsraw=invocation_file(artifacts/active['invocation_id']/'worker-observation.json',2*1024*1024)
                    check(sha256(obsraw)==data['worker_observation_sha256'])
                    observation=invocation_json(obsraw)
                    verify_worker_observation(observation,expected_source,expected_runtime,active,active['spawn'],data)
                    check(data['descendant_cleanup_verified'] == bool(
                          observation['root_and_threads_retired'] and
                          observation['direct_child_handoffs']['complete_nested_tree']))
                    nested_result = (invocation_json(invocation_file(folder/'result.json', INVOCATION_LIMITS['result_bytes']))
                                     if data['result_sha256'] is not None else None)
                    join_raw = invocation_file(folder/'worker-resource-join.json', 2*1024*1024)
                    check(sha256(join_raw) == data['worker_resource_join_sha256']
                          and invocation_json(join_raw) == join_worker_nested_resources(observation, nested_result))
                    surrounding_raw=invocation_file(folder/'surrounding-resource.json',2*1024*1024)
                    check(sha256(surrounding_raw)==data['surrounding_resource_sha256'])
                    surrounding = invocation_json(surrounding_raw)
                    verify_surrounding_resource_record(surrounding,expected_source,expected_runtime,active,active['spawn'],data)
                    verify_observer_source_query_signal_senders(surrounding['observer']['syscall_window'],observation)
                    check(invocation_file(folder/'observer-syscalls.json',2*1024*1024)
                          ==invocation_canon(surrounding['observer']['syscall_window']))
                    replay_observer_events(invocation_file(folder/'observer-events.jsonl',32*1024*1024),
                                           surrounding['observer']['syscall_window'])
                    generation = (surrounding['recorder']['pid'],surrounding['recorder']['starttime_ticks'])
                    check(generation[1]>0 and (recorder_generation is None or recorder_generation==generation))
                    recorder_generation = generation
                    observer = surrounding['observer']
                    terminal_generation = (observer['pid'],observer['starttime_ticks'])
                    cleanup_seal = observer['post_report_cleanup']['cleanup_sha256']
                    require(terminal_generation not in terminal_observers and cleanup_seal not in cleanup_receipts,
                            'HOLD_V45_INVOCATION_OBSERVER_TERMINAL_REUSE')
                    terminal_observers.add(terminal_generation); cleanup_receipts.add(cleanup_seal)
            active['terminal'] = data; active['state'] = data['state']; active = None
        elif kind == 'CLOSE':
            check(active is None and start_count == len(header['plan'])
                  and set(data) == {'started_invocations'} and type(data['started_invocations']) is int
                  and data['started_invocations'] == start_count)
            closed = True
        else: check(False)
    completed = sum(r['state']=='COMPLETED' for r in rows)
    process_root_floor = None
    if header['format']==INVOCATION_OBSERVED_FORMAT:
        completed_rows = [r for r in rows if r['state']=='COMPLETED']
        worker_roots = {(r['spawn']['pid'],r['spawn']['starttime_ticks']) for r in completed_rows}
        observer_roots = {(r['spawn']['observer']['pid'],r['spawn']['observer']['starttime_ticks']) for r in completed_rows}
        check(len(worker_roots)==len(observer_roots)==completed and not worker_roots & observer_roots)
        floor = 1+len(worker_roots | observer_roots)
        check(floor==1+2*completed)
        if artifacts is not None:
            check(len(terminal_observers)==len(cleanup_receipts)==completed)
        process_root_floor = {'scope':'one_recorder_plus_distinct_completed_worker_and_observer_roots',
            'process_roots_at_least':floor,'recorder_roots':1,
            'completed_worker_roots':len(worker_roots),'completed_observer_roots':len(observer_roots),
            'terminal_wait_records_verified':len(terminal_observers),
            'evidence_scope':'verified_bound_artifact_records' if artifacts is not None else 'journal_structure_only',
            'uncompleted_invocation_roots_included':False,'nested_roots_included':False,
            'complete_process_census':False,'exact_simultaneous_peak':None,
            'hard_execution_resource_ceiling':False,'full_campaign_accepted':False}
    return {'format':'VOID_V45_INVOCATION_ACCOUNT_V2','session_id':header['session_id'],
            'source':expected_source,'journal_sha256':sha256(raw),'journal_closed':closed,
            'planned_invocations':len(header['plan']),'started_invocations':len(rows),
            'spawned_roots':sum(r['spawn'] is not None for r in rows),
            'completed_invocations':completed,'unfinished_invocations':sum(r['state']=='UNFINISHED' for r in rows),
            'other_terminal_invocations':sum(r['state'] not in ('UNFINISHED','COMPLETED') for r in rows),
            'unique_resource_objects':len(ledger_owners),'process_root_floor':process_root_floor,
            'exact_identity_count_for_this_journal':closed,
            'all_selected_completed':closed and completed==len(header['plan']),
            'whole_case_complete':False,'complete_resource_ledger':False,'full_campaign_accepted':False,
            'runtime_origin_independently_observed':False,
            'case_worker_origin_observed_by_separate_process':header['format']==INVOCATION_OBSERVED_FORMAT and artifacts is not None and closed,
            'worker_observation_records':sum(r['terminal'] is not None for r in rows) if header['format']==INVOCATION_OBSERVED_FORMAT else 0,
            'artifact_bytes_verified':artifacts is not None,'rows':rows}


def verify_invocation_transfer(record: dict | None, scenario: str, begin_ns: int,
                               end_ns: int, state: str) -> None:
    """One fixture's receive-side retirement, not a global capability census."""
    code = 'HOLD_V45_INVOCATION_TRANSFER_RECORD'
    family, name = scenario.split('/', 1)
    required = family in ('primitive', 'owned') and name.startswith('scm-rights-')
    if not required:
        require(record is None, code)
        return
    if record is None:
        require(state != 'COMPLETED', code)
        return
    require(type(record) is dict and set(record) == {
        'format','scope','transport','messages_received','descriptors_received','descriptors_closed',
        'received_at_ns','released_at_ns','root_reaped_at_ns','mode',
        'queue_not_drained_until_root_reaped','descriptor_closed_before_terminal',
        'parent_observed_only','whole_case_complete','input_eof','eof_observed_ns',
        'parent_endpoints_closed','endpoints_closed_ns','all_process_capabilities_retired',
        'complete_resource_ledger'}, code)
    require(record['format'] == 'VOID_V45_INVOCATION_TRANSFER_V2'
            and record['scope'] == 'one_controlled_parent_fixture_stream_receive_side_only'
            and record['transport'] == 'AF_UNIX_SOCK_STREAM'
            and record['mode'] == name and record['parent_observed_only'] is True
            and record['whole_case_complete'] is False
            and record['all_process_capabilities_retired'] is False
            and record['complete_resource_ledger'] is False
            and record['input_eof'] is True and record['parent_endpoints_closed'] is True
            and record['descriptor_closed_before_terminal'] is True, code)
    require(all(type(record[k]) is int and record[k] == 1 for k in
                ('messages_received','descriptors_received','descriptors_closed')), code)
    require(all(type(record[k]) is int and begin_ns <= record[k] <= end_ns for k in
                ('received_at_ns','released_at_ns','root_reaped_at_ns',
                 'eof_observed_ns','endpoints_closed_ns')), code)
    received, released, reaped = (record[k] for k in
                                 ('received_at_ns','released_at_ns','root_reaped_at_ns'))
    require(received <= released <= record['eof_observed_ns'] <= record['endpoints_closed_ns']
            and reaped <= record['eof_observed_ns'], code)
    require(record['queue_not_drained_until_root_reaped'] is (name == 'scm-rights-queued'), code)
    if name == 'scm-rights-queued':
        require(reaped <= received <= released, code)
    elif name == 'scm-rights-held':
        require(received <= reaped <= released, code)
    else:
        require(name == 'scm-rights-closed' and received <= released <= reaped, code)


class InvocationTransferFixture:
    """One fixed local transfer; the journal owns every received descriptor.

    Closed/held modes receive while the worker runs. Queued mode first reads
    after root reap. A fixed token frames the stream; END additionally requires
    input EOF and closure of this parent's endpoints. EOF does not retire
    shutdown socket aliases or capabilities held elsewhere.
    """
    TOKEN = b'fixture-writer'

    def __init__(self, scenario: str):
        import socket
        self.scenario = scenario
        self.created_at = time.monotonic_ns()
        self.left = self.right = None
        self.held = []
        self.buffer = bytearray()
        self.reads = self.messages = self.received_fds = self.closed_fds = 0
        self.received_at = self.released_at = self.eof_at = self.closed_at = None
        self.closed = False
        family, name = scenario.split('/', 1)
        self.mode = name if family in ('owned','primitive') and name.startswith('scm-rights-') else None
        if self.mode:
            require(self.mode in ('scm-rights-closed','scm-rights-held','scm-rights-queued'),
                    'HOLD_V45_INVOCATION_TRANSFER_MODE')
            self.left, self.right = socket.socketpair(socket.AF_UNIX, socket.SOCK_STREAM)
            self.left.setblocking(False)

    def child_fds(self) -> tuple[int, ...]:
        return (self.right.fileno(),) if self.right is not None else ()

    def after_spawn(self) -> None:
        if self.right is not None:
            self.right.close()
            self.right = None

    def _adopt(self, ancillary) -> bool:
        import array, socket
        valid = True
        # Own all returned rights before validating flags, payload, or cmsg shape.
        for level, kind, payload in ancillary:
            if (level, kind) == (socket.SOL_SOCKET, socket.SCM_RIGHTS):
                values = array.array('i')
                values.frombytes(payload[:len(payload)-len(payload)%values.itemsize])
                self.held.extend(values)
                self.received_fds += len(values)
                valid = valid and len(payload)%values.itemsize == 0
            else:
                valid = False
        return valid

    def _recv(self, size):
        import array, socket
        raw, ancillary, flags, _ = self.left.recvmsg(size,
            socket.CMSG_SPACE(4*array.array('i').itemsize), socket.MSG_CMSG_CLOEXEC)
        valid = self._adopt(ancillary)
        require(valid and not flags & (socket.MSG_TRUNC|socket.MSG_CTRUNC)
                and self.received_fds <= 1 and (self.reads == 0 or not ancillary),
                'HOLD_V45_INVOCATION_TRANSFER_ANCILLARY')
        self.reads += 1
        return raw

    def receive(self) -> bool:
        if not self.mode:
            return False
        require(not self.closed, 'HOLD_V45_INVOCATION_TRANSFER_CLOSED')
        if self.received_at is not None:
            return True
        try:
            try:
                raw = self._recv(len(self.TOKEN)-len(self.buffer))
            except BlockingIOError:
                return False
            require(bool(raw), 'HOLD_V45_INVOCATION_TRANSFER_INCOMPLETE')
            self.buffer.extend(raw)
            require(self.TOKEN.startswith(self.buffer), 'HOLD_V45_INVOCATION_TRANSFER_SHAPE')
            if len(self.buffer) < len(self.TOKEN):
                return False
            require(self.received_fds == 1, 'HOLD_V45_INVOCATION_TRANSFER_ANCILLARY')
            self.messages += 1
            self.received_at = time.monotonic_ns()
            if self.mode == 'scm-rights-closed':
                self.release()
            return True
        except BaseException:
            self.close()
            raise

    def poll(self) -> None:
        if self.mode and self.mode != 'scm-rights-queued':
            self.receive()

    def release(self) -> None:
        failure = None
        owned, self.held = self.held, []
        for fd in owned:
            try:
                os.close(fd)
                self.closed_fds += 1
            except OSError as exc:
                failure = exc
        if failure is not None:
            raise failure
        if owned:
            self.released_at = time.monotonic_ns()

    def finish(self, reaped_at: int, returncode: int) -> dict | None:
        if not self.mode:
            return None
        require(not self.closed, 'HOLD_V45_INVOCATION_TRANSFER_CLOSED')
        try:
            require(type(reaped_at) is int and self.created_at <= reaped_at <= time.monotonic_ns()
                    and type(returncode) is int and self.right is None,
                    'HOLD_V45_INVOCATION_TRANSFER_TERMINAL')
            # At most one recv per positive token byte; never wait for a retained
            # writer. Queued mode's first read occurs here, after the root reap.
            for _ in range(len(self.TOKEN)):
                before = len(self.buffer)
                if self.receive():
                    break
                require(len(self.buffer) > before, 'HOLD_V45_INVOCATION_TRANSFER_INCOMPLETE')
            require(self.received_at is not None, 'HOLD_V45_INVOCATION_TRANSFER_INCOMPLETE')
            self.release()
            try:
                raw = self._recv(1)
            except BlockingIOError as exc:
                raise SourceHold('HOLD_V45_INVOCATION_TRANSFER_INPUT_OPEN') from exc
            require(not raw, 'HOLD_V45_INVOCATION_TRANSFER_PENDING_INPUT')
            self.eof_at = time.monotonic_ns()
            self.close()
            record = {'format':'VOID_V45_INVOCATION_TRANSFER_V2',
                'scope':'one_controlled_parent_fixture_stream_receive_side_only',
                'transport':'AF_UNIX_SOCK_STREAM','mode':self.mode,
                'messages_received':self.messages,'descriptors_received':self.received_fds,
                'descriptors_closed':self.closed_fds,
                'received_at_ns':self.received_at,'released_at_ns':self.released_at,
                'root_reaped_at_ns':reaped_at,
                'queue_not_drained_until_root_reaped':self.mode == 'scm-rights-queued',
                'descriptor_closed_before_terminal':True,'parent_observed_only':True,
                'input_eof':True,'eof_observed_ns':self.eof_at,
                'parent_endpoints_closed':True,'endpoints_closed_ns':self.closed_at,
                'all_process_capabilities_retired':False,'complete_resource_ledger':False,
                'whole_case_complete':False}
            verify_invocation_transfer(record, self.scenario, self.created_at,
                                       time.monotonic_ns(), 'COMPLETED')
            return record
        except BaseException:
            self.close()
            raise

    def close(self) -> None:
        failure = None
        try:
            self.release()
        except OSError as exc:
            failure = exc
        endpoints = (self.left, self.right)
        self.left = self.right = None
        for sock in endpoints:
            if sock is not None:
                try:
                    sock.close()
                except OSError as exc:
                    failure = exc
        self.closed = True
        if failure is not None:
            raise failure
        if self.closed_at is None:
            self.closed_at = time.monotonic_ns()


class InvocationJournal:
    """One source-distinct parent, one durable BEGIN per controlled root launch.

    Journal FD is close-on-exec and never inherited. Same-UID/root tampering,
    omitted external launches, and runtime compromise are outside this contract.
    """
    def __init__(self, directory: Path, source: dict, runtime: dict, plan: list[str]):
        require(type(plan) is list and 1<=len(plan)<=INVOCATION_LIMITS['invocations']
                and all(s in INVOCATION_SCENARIOS for s in plan), 'HOLD_V45_INVOCATION_PLAN')
        self.directory=directory; directory.mkdir(mode=0o700,parents=False,exist_ok=False)
        self.source=source;self.runtime=runtime;self.plan=list(plan);self.session_id=os.urandom(16).hex()
        self.fd=os.open(directory/'journal.jsonl',os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_APPEND|os.O_CLOEXEC|os.O_NOFOLLOW,0o600)
        self.events=[];self.ordinal=0;self.attempts={};self.closed=False
        self.append('SESSION',{'format':(INVOCATION_OBSERVED_FORMAT if getattr(self,'observed_workers',False) else INVOCATION_FORMAT),'session_id':self.session_id,'source':source,
                    'runtime':runtime,'plan':plan,'owner_pid':os.getpid(),'scope':'selected_local_case_root_invocations_only'})
        parent_fd=os.open(directory,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
        try:os.fsync(parent_fd)
        finally:os.close(parent_fd)

    def append(self, kind: str, data: dict, *, now: int | None = None) -> dict:
        require(not self.closed, 'HOLD_V45_INVOCATION_CLOSED')
        event={'sequence':len(self.events)+1,'previous_sha256':self.events[-1]['event_sha256'] if self.events else '0'*64,
               'time_ns':time.monotonic_ns() if now is None else now,'kind':kind,'data':data}
        event['event_sha256']=sha256(invocation_canon(event));raw=invocation_canon(event)
        require(os.fstat(self.fd).st_size+len(raw)<=INVOCATION_LIMITS['journal_bytes'],'HOLD_V45_INVOCATION_JOURNAL_LIMIT')
        offset=0
        while offset<len(raw):
            n=os.write(self.fd,raw[offset:]);require(n>0,'HOLD_V45_INVOCATION_WRITE');offset+=n
        os.fsync(self.fd);self.events.append(event);return event

    def run_next(self, repo: Path, *, deadline_ns: int = 35000000000) -> dict:
        require(not self.closed and self.ordinal < len(self.plan)
                and type(deadline_ns) is int and 1<=deadline_ns<=120000000000,'HOLD_V45_INVOCATION_NEXT')
        scenario=self.plan[self.ordinal];self.ordinal+=1
        attempt=self.attempts.get(scenario,0)+1;self.attempts[scenario]=attempt
        ident=sha256(invocation_canon([self.session_id,self.source,scenario,self.ordinal,attempt]))
        folder=self.directory/ident;folder.mkdir(mode=0o700)
        request={'invocation_id':ident,'scenario_id':scenario,'source':self.source,'runtime':self.runtime}
        request_fd=os.memfd_create('void-invocation-request',os.MFD_CLOEXEC|os.MFD_ALLOW_SEALING)
        proc=None;log_fd=None;state='LAUNCH_ERROR';rc=None;root_reaped=False;transfer=None
        try:
            raw=invocation_canon(request);require(os.write(request_fd,raw)==len(raw),'HOLD_V45_INVOCATION_WRITE')
            fcntl.fcntl(request_fd,1033,15)
            transfer=InvocationTransferFixture(scenario)
            command=[self.runtime['executable'],'-I','-S','-B',str(repo/INVOCATION_WORKER),
                     '--invocation-case',scenario,'--invocation-request-fd',str(request_fd),'--output',str(folder/'result.json')]
            if transfer.child_fds():
                command += ['--observed-fixture-socket',str(transfer.child_fds()[0])]
            start=self.append('BEGIN',{'invocation_id':ident,'scenario_id':scenario,'ordinal':self.ordinal,'attempt':attempt,
                 'deadline_ns':deadline_ns,'source':self.source,'runtime':self.runtime,
                 'argv_sha256':sha256(invocation_canon(command))})['time_ns']
            log_fd=os.open(folder/'output.log',os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,0o600)
            env={'PATH':os.environ.get('PATH','/usr/bin:/bin'),'LANG':'C.UTF-8','HOME':str(folder),
                 'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','PYTHONDONTWRITEBYTECODE':'1'}
            proc=subprocess.Popen(command,cwd=repo,env=env,stdin=subprocess.DEVNULL,stdout=log_fd,
                                  stderr=log_fd,close_fds=True,pass_fds=(request_fd,*transfer.child_fds()),start_new_session=True)
            transfer.after_spawn()
            text=Path(f'/proc/{proc.pid}/stat').read_text();fields=text[text.rfind(')')+2:].split()
            self.append('SPAWN',{'invocation_id':ident,'pid':proc.pid,'starttime_ticks':int(fields[19]),'parent_pid':int(fields[1])})
            state='FAILED'
            while proc.poll() is None:
                transfer.poll()
                if time.monotonic_ns()-start >= deadline_ns:
                    state='TIMEOUT';proc.kill();break
                if os.fstat(log_fd).st_size>INVOCATION_LIMITS['log_bytes']:
                    state='FAILED';proc.kill();break
                time.sleep(0.01)
            rc=proc.wait(timeout=5);root_reaped=True
            reaped_at=time.monotonic_ns()
            transfer_record=transfer.finish(reaped_at,rc)
            if state!='TIMEOUT' and time.monotonic_ns()-start >= deadline_ns:state='TIMEOUT'
            result_hash=None;refs=[]
            if (folder/'result.json').exists():
                result_raw=invocation_file(folder/'result.json',INVOCATION_LIMITS['result_bytes'])
                result=invocation_json(result_raw)
                require(type(result) is dict and set(result)=={'format','invocation_id','scenario_id','source','runtime','status','payload'}
                    and result['format']=='VOID_V45_INVOCATION_RESULT_V1'
                    and all(result[k]==request[k] for k in request)
                    and result['status']=='PASS','HOLD_V45_INVOCATION_RESULT')
                refs=invocation_ledger_refs(result);result_hash=sha256(result_raw)
                if state!='TIMEOUT' and rc==0:state='COMPLETED'
            log_hash=sha256(invocation_file(folder/'output.log',INVOCATION_LIMITS['log_bytes']))
            end=time.monotonic_ns()
            if state=='COMPLETED' and end-start>deadline_ns:state='TIMEOUT'
            row={'invocation_id':ident,'state':state,'returncode':rc,'root_reaped':root_reaped,
                 'elapsed_ns':end-start,'result_sha256':result_hash,'log_sha256':log_hash,'ledger_refs':refs,
                 'automatic_retries':0,'descendant_cleanup_verified':False,'fixture_transfer':transfer_record}
            self.append('END',row,now=end);return row
        except BaseException:
            # A partial journal remains inspectable. Never invent successful
            # completion on a failed result read or on cancellation.
            if proc is not None and proc.poll() is None:
                proc.kill()
                try:proc.wait(timeout=5)
                except subprocess.TimeoutExpired:pass
            raise
        finally:
            if transfer is not None:transfer.close()
            if log_fd is not None:os.close(log_fd)
            os.close(request_fd)

    def finish(self) -> dict:
        # Validate associations and artifacts before writing CLOSE or a manifest.
        # Failed preflight leaves the original incomplete journal inspectable.
        raw=invocation_file(self.directory/'journal.jsonl',INVOCATION_LIMITS['journal_bytes'])
        preflight=verify_invocation_journal(raw,self.source,self.runtime,expected_plan=self.plan,artifacts=self.directory)
        require(not preflight['journal_closed'] and preflight['started_invocations']==len(self.plan)
                and preflight['unfinished_invocations']==0, 'HOLD_V45_INVOCATION_CLOSE_PREFLIGHT')
        self.append('CLOSE',{'started_invocations':self.ordinal})
        self.closed=True;os.close(self.fd);self.fd=-1
        raw=invocation_file(self.directory/'journal.jsonl',INVOCATION_LIMITS['journal_bytes'])
        summary=verify_invocation_journal(raw,self.source,self.runtime,expected_plan=self.plan,artifacts=self.directory)
        write_exclusive(self.directory/'manifest.json',invocation_canon(summary))
        return summary

    def close(self) -> None:
        if self.fd >= 0:os.close(self.fd);self.fd=-1
        self.closed=True



INVOCATION_OBSERVED_FORMAT = 'VOID_V45_LOCAL_INVOCATION_JOURNAL_V13'
INVOCATION_OBSERVER_REL = 'scripts/datanet_v45_custody_session_v1.py'


def verify_worker_observation(obj: dict, source: dict, runtime: dict, begin: dict,
                              spawn: dict, terminal: dict) -> None:
    """Pure association/arithmetic check, not an independent live observer itself."""
    code='HOLD_V45_INVOCATION_WORKER_OBSERVATION'
    def check(ok):require(ok,code)
    check(type(obj) is dict and set(obj)=={'format','profile','source','runtime','invocation_id','scenario_id',
          'request_sha256','observer','worker','argv_sha256','status','refusal','initial_exec_admitted',
          'exec_events','root_wait_status','root_returncode','root_and_threads_retired','pidfd_terminal',
          'termination_requested','started_ns','ended_ns','deadline_ns','startup_syscall_entries_before_initial_exec',
          'events','signal_stops','worker_ledger','whole_case_complete','nested_processes_observed',
          'observer_resources_measured','hard_execution_resource_ceiling','direct_child_handoffs',
          'observer_resource_window','observation_sha256'})
    body=dict(obj);claimed=body.pop('observation_sha256',None)
    check(claimed==sha256(invocation_canon(body)))
    check(obj['format']=='VOID_V45_JOURNAL_WORKER_OBSERVATION_V3'
          and obj['profile']=='OWNED_CASE_ROOT_THREADS_SOURCE_QUERIES_AND_FOCUS_CHILD_CENSUS_V3'
          and obj['source']==source and obj['runtime']==runtime
          and obj['invocation_id']==begin['invocation_id'] and obj['scenario_id']==begin['scenario_id']
          and obj['argv_sha256']==begin['argv_sha256'])
    check(obj['observer']==spawn['observer'] and obj['worker']=={k:spawn[k] for k in ('pid','starttime_ticks','parent_pid')}
          and obj['observer']['pid']==obj['worker']['parent_pid']
          and obj['observer']['pid']!=obj['worker']['pid'])
    request={k:begin[k] for k in ('invocation_id','scenario_id','source','runtime')}
    check(obj['request_sha256']==sha256(invocation_canon(request)))
    focus_child_census = obj['scenario_id'] in ('journal/success','journal/schema-controls')
    check(obj['whole_case_complete'] is False and obj['nested_processes_observed'] is True
          and obj['observer_resources_measured'] is True and obj['hard_execution_resource_ceiling'] is False)
    ow=obj['observer_resource_window']
    check(type(ow) is dict and set(ow)=={'scope','rusage_delta','fd_count_before','fd_count_at_report','elapsed_ns',
          'fork_started_ns','initial_stop_ns','fork_to_initial_stop_ns','syscall_count','exact_fd_peak',
          'cleanup_after_report_included','worker_resources_included','nested_resources_included','whole_case_complete'})
    check(ow['scope']=='observer_from_before_worker_fork_through_worker_terminal_processing'
          and type(ow['rusage_delta']) is dict and all(type(v) is int and v>=0 for v in ow['rusage_delta'].values())
          and all(type(ow[k]) is int and ow[k]>=0 for k in ('fd_count_before','fd_count_at_report','elapsed_ns'))
          and type(ow['fork_started_ns']) is int and type(ow['initial_stop_ns']) is int
          and obj['started_ns']<=ow['fork_started_ns']<=ow['initial_stop_ns']<=obj['ended_ns']
          and ow['fork_to_initial_stop_ns']==ow['initial_stop_ns']-ow['fork_started_ns']
          and ow['elapsed_ns']==obj['ended_ns']-obj['started_ns']
          and ow['syscall_count'] is None and ow['exact_fd_peak'] is None
          and ow['cleanup_after_report_included'] is False and ow['worker_resources_included'] is False
          and ow['nested_resources_included'] is False and ow['whole_case_complete'] is False)
    check(obj['root_and_threads_retired'] is True and obj['pidfd_terminal'] is True
          and obj['root_returncode']==terminal['returncode']
          and os.waitstatus_to_exitcode(obj['root_wait_status'])==terminal['returncode'])
    check(type(obj['started_ns']) is int and type(obj['ended_ns']) is int
          and begin['begin_time_ns']<=obj['started_ns']<=obj['ended_ns']
          <=begin['begin_time_ns']+terminal['elapsed_ns'] and obj['deadline_ns']==begin['deadline_ns'])
    if terminal['state']=='COMPLETED':
        # Successful cases contain exactly the worker exec plus the two
        # admitted source-generation Git query execs. Focus bookkeeping cases
        # retain process-creation tracing through root retirement and refuse a
        # later process; other scenarios stop creation tracing before their
        # scenario-owned producers can enter this ledger partition.
        check(obj['status']=='OBSERVED' and obj['refusal'] is None and obj['initial_exec_admitted'] is True
              and obj['exec_events']==3 and obj['root_returncode']==0
              and obj['termination_requested'] is False)
    check(type(obj['signal_stops']) is dict and all(k.isdecimal() and 0<int(k)<65 and type(v) is int and v>=0 for k,v in obj['signal_stops'].items()))
    check(type(obj['events']) is list and 2<=len(obj['events'])<=1024)
    live=set();exited=set();execs=0;prior=-1;admissions=0
    source_queries={}; source_root=None; source_scope_closures=0
    for i,event in enumerate(obj['events'],1):
        check(event['sequence']==i and type(event['time_ns']) is int and
              obj['started_ns']<=event['time_ns']<=obj['ended_ns'] and event['time_ns']>=prior)
        prior=event['time_ns'];kind=event['kind']
        if kind in ('SPAWN','THREAD','PROCESS'):
            pid=event['identity']['pid'];check(pid not in live|exited);live.add(pid)
            if kind=='SPAWN':check(i==1 and event['identity']==obj['worker'])
            elif kind=='THREAD':check(event['tgid']==obj['worker']['pid'])
            else:
                check(event['tgid']==pid and event['identity']['parent_pid']==obj['worker']['pid']
                      and event['source_query_ordinal'] in (1,2))
        elif kind=='EXEC':
            execs+=1;check(event['pid'] in live and event['ordinal']==execs)
        elif kind=='SOURCE_QUERY':
            ordinal=event['ordinal']; check(ordinal in (1,2) and ordinal not in source_queries
                and event['pid'] in live and type(event['argv']) is list and len(event['argv'])==5
                and event['argv'][0]=='git' and event['argv'][1]=='-C'
                and type(event['argv'][2]) is str and Path(event['argv'][2]).is_absolute()
                and event['argv'][3]=='rev-parse'
                and event['argv'][4]==('HEAD' if ordinal==1 else 'HEAD^{tree}')
                and type(event['executable_sha256']) is str
                and re.fullmatch('[0-9a-f]{64}',event['executable_sha256']) is not None)
            source_root = event['argv'][2] if source_root is None else source_root
            check(event['argv'][2]==source_root)
            source_queries[ordinal]=event['pid']
        elif kind=='SOURCE_QUERY_SCOPE_CLOSED':
            source_scope_closures+=1
            check(source_scope_closures==1 and event['measured_processes']==2
                  and type(event.get('process_creation_trace_retained')) is bool
                  and event['process_creation_trace_retained']==focus_child_census
                  and set(source_queries)=={1,2})
        elif kind=='ADMITTED':
            admissions+=1
            check(event['source_sha256']==source['worker_sha256'] and event['argv_sha256']==begin['argv_sha256']
                  and event['executable_sha256']==runtime['executable_sha256'])
        elif kind=='EXIT':
            check(event['pid'] in live);live.remove(event['pid']);exited.add(event['pid'])
            if event['pid']==obj['worker']['pid']:check(event['wait_status']==obj['root_wait_status'])
        elif kind=='SIGNAL':check(event['pid'] in live)
        else:check(False)
    check(not live and execs==obj['exec_events'] and admissions==int(obj['initial_exec_admitted'])
          and set(source_queries)=={1,2} and source_scope_closures==1
          and source_queries[1]!=source_queries[2])
    led=obj['worker_ledger'];lb=dict(led);claimed=lb.pop('ledger_sha256',None)
    check(claimed==sha256(invocation_canon(lb)))
    check(led['format']=='VOID_V45_INVOCATION_WORKER_SYSCALL_LEDGER_V1'
          and led['scope']=='case_root_threads_and_two_source_queries_from_preexec_sync_stop_through_terminal_wait'
          and led['capture_complete_for_scope'] is True and led['whole_case_complete'] is False
          and led['full_job_process_census'] is False
          and led['exact_peak_live_processes'] is None and led['exact_peak_live_fds'] is None
          and led['scm_rights_descriptor_transfers'] is None and led['whole_case_syscalls'] is None
          and led['whole_case_retry_count'] is None)
    rows=led['tasks'];check(type(rows) is list and len(rows)==len(exited)
          and {r['pid'] for r in rows}==exited)
    histogram={}
    for row in rows:
        check(row['exited'] is True and type(row['starttime_ticks']) is int and row['starttime_ticks']>0)
        if row['pid']==obj['worker']['pid']:
            check(row['starttime_ticks']==obj['worker']['starttime_ticks'] and row['parent_pid']==obj['observer']['pid'])
        check(row['syscall_entries']==row['syscall_exits']+row['entry_without_exit_at_termination'])
        for nr,bucket in row['syscalls'].items():
            check(nr.isdecimal() and all(type(v) is int and v>=0 for v in bucket.values()))
            target=histogram.setdefault(nr,{k:0 for k in bucket})
            for key,value in bucket.items():target[key]+=value
        check(sum(b['entries'] for b in row['syscalls'].values())==row['syscall_entries']
              and sum(b['exits'] for b in row['syscalls'].values())==row['syscall_exits'])
    check(histogram==led['syscall_histogram'])
    totals=led['totals']
    for key in ('syscall_entries','syscall_exits','entry_without_exit_at_termination','inherited_return_stops','successful_execs'):
        check(totals[key]==sum(row[key] for row in rows))
    check(totals['task_lifetimes']==len(rows) and totals['task_exits']==len(rows)
          and totals['successful_execs']==execs
          and totals['syscall_stops']==totals['syscall_entries']+totals['syscall_exits']+totals['inherited_return_stops'])
    for key in ('read_return_bytes','write_return_bytes'):
        check(totals[key]==sum(b[key] for b in histogram.values()))
    check(totals['captured_stream_bytes']==0 and led['stream_bindings']=={}
          and totals['max_task_fd_sample']==max(row['fd_sample_peak'] for row in rows))
    check(obj['startup_syscall_entries_before_initial_exec'] is None or
          type(obj['startup_syscall_entries_before_initial_exec']) is int and
          0<obj['startup_syscall_entries_before_initial_exec']<=totals['syscall_entries'])
    verify_worker_child_handoffs(obj)
    if terminal['state']=='COMPLETED':
        # The two mandatory source-query process generations are the only
        # direct processes admitted into this worker ledger partition.
        measured=[item for item in obj['direct_child_handoffs']['records']
                  if item['classification']=='PROCESS' and item['nested_resources_measured']]
        check(len(measured)==2 and {item['child_pid'] for item in measured}==set(source_queries.values())
              and obj['direct_child_handoffs']['complete_nested_tree'] is focus_child_census
              and terminal['descendant_cleanup_verified'] is focus_child_census)
        # A known nonterminal or unresolved direct child blocks the outer END.
        # Terminal pidfds still do not settle child capabilities beyond scope.
        require(all(item['classification'] != 'UNRESOLVED' and item['terminal_at_report'] is True
                    for item in obj['direct_child_handoffs']['records']),
                'HOLD_V45_INVOCATION_PENDING_CHILD')


def verify_worker_child_handoffs(observation: dict) -> None:
    """Check creation-return witnesses, not nested execs or output authority."""
    code = 'HOLD_V45_WORKER_CHILD_HANDOFF'
    def check(ok): require(ok, code)
    obj = observation['direct_child_handoffs']
    check(type(obj) is dict and set(obj) == {'format','scope','records',
        'successful_creation_returns','process_records','thread_records','unresolved_records',
        'complete_nested_tree','nested_resources_measured',
        'pidfd_terminal_is_not_reaping_or_capability_retirement','handoff_sha256'})
    unsigned = dict(obj); claimed = unsigned.pop('handoff_sha256')
    check(claimed == sha256(invocation_canon(unsigned)))
    focus_child_census = observation['scenario_id'] in ('journal/success','journal/schema-controls')
    check(obj['format'] == 'VOID_V45_DIRECT_CHILD_HANDOFFS_V2'
        and obj['scope'] == 'successful_worker_creation_returns_only'
        and obj['complete_nested_tree'] is focus_child_census
        and type(obj['nested_resources_measured']) is bool
        and obj['pidfd_terminal_is_not_reaping_or_capability_retirement'] is True)
    ledger = observation['worker_ledger']; rows = {r['pid']: r for r in ledger['tasks']}
    records = obj['records']; check(type(records) is list and len(records) <= 512)
    root = observation['worker']['pid']; seen = set(); last_seq = -1; last_time = -1
    histogram = {}
    for ordinal, item in enumerate(records, 1):
        check(type(item) is dict and set(item) == {'ordinal','creator','syscall_number',
            'telemetry_sequence','child_pid','observed_ns','classification','child','tgid',
            'pidfd_retained','terminal_at_report','nested_exec_observed','nested_resources_measured'})
        check(type(item['ordinal']) is int and item['ordinal'] == ordinal
            and type(item['child_pid']) is int and item['child_pid'] > 0
            and item['syscall_number'] in (56,57,58,435)
            and type(item['telemetry_sequence']) is int
            and last_seq < item['telemetry_sequence'] <= ledger['ordered_event_count']
            and type(item['observed_ns']) is int
            and observation['started_ns'] <= item['observed_ns'] <= observation['ended_ns']
            and item['observed_ns'] >= last_time
            and type(item['nested_exec_observed']) is bool
            and type(item['nested_resources_measured']) is bool)
        last_seq = item['telemetry_sequence']; last_time = item['observed_ns']
        creator = item['creator']; check(type(creator) is dict and set(creator) == {'pid','parent_pid','starttime_ticks'}
            and creator['pid'] in rows)
        row = rows[creator['pid']]
        check(all(creator[k] == row[k] for k in creator))
        nr = str(item['syscall_number']); histogram[nr] = histogram.get(nr, 0) + 1
        cls = item['classification']; check(cls in ('PROCESS','THREAD','UNRESOLVED'))
        if cls == 'UNRESOLVED':
            check(item['child'] is None and item['tgid'] is None and item['pidfd_retained'] is False
                  and item['terminal_at_report'] is None
                  and item['nested_exec_observed'] is False and item['nested_resources_measured'] is False)
            continue
        child = item['child']; check(type(child) is dict and set(child) == {'pid','parent_pid','starttime_ticks'}
            and all(type(v) is int and v > 0 for v in child.values())
            and child['pid'] == item['child_pid']
            and type(item['terminal_at_report']) is bool)
        generation = (child['pid'], child['starttime_ticks']); check(generation not in seen); seen.add(generation)
        if cls == 'PROCESS':
            check(child['parent_pid'] == root and item['tgid'] == child['pid']
                  and item['pidfd_retained'] is True)
            if item['nested_resources_measured']:
                check(item['nested_exec_observed'] is True and child['pid'] in rows
                      and child['starttime_ticks'] == rows[child['pid']]['starttime_ticks']
                      and rows[child['pid']]['parent_pid'] == root
                      and rows[child['pid']]['successful_execs'] == 1
                      and item['terminal_at_report'] == rows[child['pid']]['exited'])
            else:
                check(item['nested_exec_observed'] is False and child['pid'] not in rows)
        else:
            check(item['nested_exec_observed'] is False and item['nested_resources_measured'] is False
                  and item['tgid'] == root and item['pidfd_retained'] is False and child['pid'] in rows
                  and child['starttime_ticks'] == rows[child['pid']]['starttime_ticks']
                  and item['terminal_at_report'] == rows[child['pid']]['exited'])
    for nr in ('56','57','58','435'):
        bucket = ledger['syscall_histogram'].get(nr, {'exits':0, 'errors':0})
        check(histogram.get(nr,0) == bucket['exits'] - bucket['errors'])
    check(type(obj['successful_creation_returns']) is int and obj['successful_creation_returns'] == len(records))
    for field, cls in (('process_records','PROCESS'),('thread_records','THREAD'),('unresolved_records','UNRESOLVED')):
        check(type(obj[field]) is int and obj[field] == sum(r['classification'] == cls for r in records))
    process_records=[r for r in records if r['classification']=='PROCESS']
    check(obj['nested_resources_measured'] ==
          (bool(process_records) and all(r['nested_resources_measured'] for r in process_records)))


def join_worker_nested_resources(observation: dict, result: dict | None) -> dict:
    """A disjoint union of retained measurement windows, NEVER a whole-case total.

    Known child objects that lack a resource window remain listed, not zero-cost.
    One nested root must match one independently captured direct-child generation.
    Deeper lineage within a component remains that component observer's evidence.
    """
    code = 'HOLD_V45_WORKER_NESTED_JOIN'
    def check(ok): require(ok, code)
    verify_worker_child_handoffs(observation)
    check(type(observation) is dict and observation['format'] == 'VOID_V45_JOURNAL_WORKER_OBSERVATION_V3')
    body = dict(observation); seal = body.pop('observation_sha256')
    check(seal == sha256(invocation_canon(body)))
    check(result is None or (type(result) is dict and result['format'] == 'VOID_V45_INVOCATION_RESULT_V1'
          and result['source'] == observation['source'] and result['runtime'] == observation['runtime']
          and result['invocation_id'] == observation['invocation_id']
          and result['scenario_id'] == observation['scenario_id']))
    references = [] if result is None else invocation_ledger_refs(result)
    def resolve(pointer):
        value = result
        for raw in pointer.split('/')[1:]:
            key = raw.replace('~1','/').replace('~0','~')
            value = value[int(key)] if type(value) is list else value[key]
        return value
    worker = observation['worker_ledger']; seen = {(x['pid'],x['starttime_ticks']) for x in worker['tasks']}
    check(len(seen) == len(worker['tasks']))
    known_children = {(x['child']['pid'],x['child']['starttime_ticks']): x
        for x in observation['direct_child_handoffs']['records'] if x['classification'] == 'PROCESS'}
    joined_roots = set(); components = []; ledgers = [worker]
    for ref in references:
        led = resolve(ref['paths'][0])
        check(all(resolve(p) == led for p in ref['paths']))
        verify_join_component_ledger(led, outer=led['format'] == 'VOID_V45_OUTER_CASE_SYSCALL_LEDGER_V1')
        root_rows = [x for x in led['tasks'] if x['initial_root']]
        root = root_rows[0] if root_rows else None
        if root is not None:
            key = (root['pid'], root['starttime_ticks'])
            check(key in known_children and key not in joined_roots)
            witness = known_children[key]
            check(witness['child']['parent_pid'] == root['parent_pid'] == observation['worker']['pid'])
            check(not root['exited'] or witness['terminal_at_report'] is True)
            # A partial resource window can still join to its retained child;
            # terminal polling is recorded but never converted to a wait status.
            joined_roots.add(key)
        else:
            witness = None
        keys = {(x['pid'],x['starttime_ticks']) for x in led['tasks']}
        check(len(keys) == len(led['tasks']) and not keys & seen)
        seen.update(keys); ledgers.append(led)
        components.append({'object_sha256':ref['object_sha256'], 'ledger_sha256':led['ledger_sha256'],
            'reference_paths':ref['paths'], 'format':led['format'], 'scope':led['scope'],
            'root_generation':None if root is None else {'pid':root['pid'],'starttime_ticks':root['starttime_ticks']},
            'creation_witness_ordinal':None if witness is None else witness['ordinal'],
            'root_terminal_by_retained_pidfd':None if witness is None else witness['terminal_at_report'],
            'capture_complete_for_scope':led['capture_complete_for_scope'],
            'measured_task_generations':len(led['tasks'])})
    fields = ('task_lifetimes','task_exits','successful_execs','syscall_entries','syscall_exits',
              'entry_without_exit_at_termination','inherited_return_stops','syscall_stops',
              'read_return_bytes','write_return_bytes','captured_stream_bytes')
    # These are disjoint task windows only. No maxima, elapsed intervals, or
    # kernel execution-resource ceilings are computed by addition.
    totals = {key:sum(l['totals'][key] for l in ledgers) for key in fields}
    check(totals['task_lifetimes'] == len(seen))
    residuals = {
        'open_task_rows': sum(not t['exited'] for l in ledgers for t in l['tasks']),
        'pending_entered_syscalls': sum(not t['exited'] and t.get('pending') is not None
                                       for l in ledgers for t in l['tasks']),
        'unbucketed_limit_stops': sum(l['totals']['syscall_stops'] - l['totals']['syscall_entries']
            - l['totals']['syscall_exits'] - l['totals']['inherited_return_stops'] for l in ledgers)}
    check(totals['task_lifetimes'] == totals['task_exits'] + residuals['open_task_rows']
          and totals['syscall_entries'] == totals['syscall_exits']
              + totals['entry_without_exit_at_termination'] + residuals['pending_entered_syscalls']
          and totals['syscall_stops'] == totals['syscall_entries'] + totals['syscall_exits']
              + totals['inherited_return_stops'] + residuals['unbucketed_limit_stops'])
    worker_measured_children = {k for k,x in known_children.items()
        if x['nested_resources_measured'] and k in seen}
    check(all(known_children[k]['nested_exec_observed'] is True for k in worker_measured_children))
    unmetered = [dict(x['child']) for k,x in known_children.items()
        if k not in joined_roots and k not in worker_measured_children]
    out = {'format':'VOID_V45_WORKER_NESTED_RESOURCE_JOIN_V1',
        'scope':'disjoint_retained_worker_and_direct_child_component_windows_only',
        'source':observation['source'],'runtime':observation['runtime'],
        'invocation_id':observation['invocation_id'],'scenario_id':observation['scenario_id'],
        'worker_observation_sha256':sha256(invocation_canon(observation)),
        'result_sha256':None if result is None else sha256(invocation_canon(result)),
        'worker_ledger_sha256':worker['ledger_sha256'],
        'worker_task_generations':len(worker['tasks']), 'nested_components':components,
        'unique_nested_component_count':len(components),
        'alias_references_not_summed':sum(len(x['reference_paths'])-1 for x in components),
        'matched_component_roots':len(joined_roots),'unmatched_component_roots':0,
        'known_direct_children_without_resource_windows':unmetered,
        'unresolved_creation_returns':observation['direct_child_handoffs']['unresolved_records'],
        'overlapping_task_generations':0, 'measured_window_totals':totals,
        'partial_window_residuals':residuals,
        'exact_peak_live_processes':None,'exact_peak_live_fds':None,
        'scm_rights_descriptor_transfers':None,'whole_case_resource_totals':None,
        'whole_case_complete':False,'complete_resource_ledger':False,
        'hard_execution_resource_ceiling':False,'full_job_process_census':False,
        'nested_producer_prebinding_proved':False,'full_campaign_accepted':False,
        'excluded':['recorder and worker observer','fork-to-initial-stop',
                    'unmetered direct children outside the worker ledger and deeper descendants',
                    'gaps inside partial component windows','full cleanup and termination latency',
                    'exact simultaneous peaks and complete descriptor-transfer accounting']}
    out['join_sha256'] = sha256(invocation_canon(out))
    return out


def verify_join_component_ledger(ledger: dict, *, outer: bool=False) -> None:
    """Recompute recorded scoped totals; never promote samples to a full census."""
    code = 'HOLD_V45_RESOURCE_LEDGER_INVALID'
    def check(ok):
        if not ok: raise ValueError(code)
    def integer(v):return type(v) is int and v >= 0
    check(type(ledger) is dict)
    expected_keys = {'format','scope','capture_complete_for_scope','whole_case_complete',
        'full_job_process_census','exact_peak_live_processes','exact_peak_live_fds',
        'scm_rights_descriptor_transfers','whole_case_retry_count','whole_case_syscalls',
        'syscall_arch','tasks','totals','syscall_histogram','limits','refusal','elapsed_ns',
        'ordered_event_count','ordered_event_sha256','stream_bindings','excluded',
        'fd_measurement','byte_measurement','ledger_sha256'}
    check(set(ledger) == expected_keys)
    check(type(outer) is bool)
    check(ledger['format']==('VOID_V45_OUTER_CASE_SYSCALL_LEDGER_V1' if outer else 'VOID_V45_OWNED_SYSCALL_LEDGER_V1')
        and ledger['scope']==('outer_fixed_static_case_excluding_delegated_producer_and_collector' if outer else 'owned_tree_from_initial_exec_stop_to_terminal_wait')
        and ledger['syscall_arch']=='linux-x86_64'
        and type(ledger['capture_complete_for_scope']) is bool
        and ledger['whole_case_complete'] is False and ledger['full_job_process_census'] is False)
    check(all(ledger[k] is None for k in ('exact_peak_live_processes','exact_peak_live_fds',
        'scm_rights_descriptor_transfers','whole_case_retry_count','whole_case_syscalls')))
    expected_excluded=(['collector process','collector/bootstrap setup before initial root exec',
                        'delegated producer subtree','cleanup after refusal'] if outer else
        ['pre-initial-exec setup','observer/custodian','supervisor','test driver and consumers',
         'external stream holders','cleanup after refusal'])
    check(ledger['excluded']==expected_excluded)
    check(ledger['fd_measurement']=='per_task_stopped_samples_not_global_peak'
        and ledger['byte_measurement']=='successful_scalar_io_syscall_return_bytes_not_unique_bytes_or_storage_io')
    def h(value):return hashlib.sha256((json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode()).hexdigest()
    body=dict(ledger);seal=body.pop('ledger_sha256');check(type(seal) is str and seal==h(body))
    check(integer(ledger['elapsed_ns']) and integer(ledger['ordered_event_count'])
        and type(ledger['ordered_event_sha256']) is str
        and len(ledger['ordered_event_sha256'])==64
        and all(ch in '0123456789abcdef' for ch in ledger['ordered_event_sha256']))
    tasks=ledger['tasks'];totals=ledger['totals'];limits=ledger['limits'];streams=ledger['stream_bindings']
    check(type(tasks) is list and len(tasks)<=(512 if outer else 64) and type(totals) is dict
        and type(limits) is dict and type(streams) is dict)
    maximum={'syscall_stops':1000000 if outer else 200000,'tasks':512 if outer else 64,'fd_sample':4096,'returned_io_bytes':1073741824}
    check(set(limits)==set(maximum) and all(type(v) is int and 1<=v<=maximum[k] for k,v in limits.items()))
    histogram={};pids=set();root=0
    fields=('syscall_entries','syscall_exits','entry_without_exit_at_termination',
            'inherited_return_stops','successful_execs')
    sums={k:0 for k in fields}
    pending=0
    for row in tasks:
        check(type(row) is dict)
        core={'pid','starttime_ticks','parent_pid','initial_root','exited','successful_execs',
            'syscall_entries','syscall_exits','entry_without_exit_at_termination','inherited_return_stops',
            'fd_samples','fd_sample_peak','syscalls','allow_initial_return'}
        check(type(row.get('exited')) is bool)
        check(set(row)==core|({'wait_status','pending_at_exit'} if row['exited'] else {'pending'}))
        check(type(row['pid']) is int and row['pid']>0 and row['pid'] not in pids
            and type(row['starttime_ticks']) is int and row['starttime_ticks']>0
            and type(row['parent_pid']) is int and row['parent_pid']>0)
        check(type(row['initial_root']) is bool and type(row['allow_initial_return']) is bool)
        root+=row['initial_root'];pids.add(row['pid'])
        check(all(integer(row[k]) for k in (*fields,'fd_samples','fd_sample_peak')))
        check(row['inherited_return_stops']<=1)
        check(type(row['syscalls']) is dict)
        local_entries=local_exits=0
        for nr,bucket in row['syscalls'].items():
            check(type(nr) is str and nr.isdecimal() and str(int(nr))==nr and int(nr)<0x40000000)
            check(type(bucket) is dict and set(bucket)=={'entries','exits','errors','read_return_bytes','write_return_bytes'}
                and all(integer(x) for x in bucket.values())
                and bucket['errors']<=bucket['exits']<=bucket['entries'])
            local_entries+=bucket['entries'];local_exits+=bucket['exits']
            target=histogram.setdefault(nr,{k:0 for k in bucket})
            for k,v in bucket.items():target[k]+=v
        check(local_entries==row['syscall_entries'] and local_exits==row['syscall_exits'])
        open_nr=row['pending_at_exit'] if row['exited'] else row['pending']
        check(open_nr is None or integer(open_nr))
        check(row['syscall_entries']==row['syscall_exits']+int(open_nr is not None))
        check(row['entry_without_exit_at_termination']==(int(open_nr is not None) if row['exited'] else 0))
        if not row['exited']:pending+=int(open_nr is not None)
        if row['exited']:check(integer(row['wait_status']))
        for k in fields:sums[k]+=row[k]
    check(root==int(bool(tasks)))
    check(all(r['initial_root'] or r['parent_pid'] in pids for r in tasks))
    check(histogram==ledger['syscall_histogram'])
    for stream,binding in streams.items():
        check(type(stream) is str and type(binding) is dict and set(binding)=={'bytes','sha256'} and integer(binding['bytes']))
        check(binding['sha256'] is None or (type(binding['sha256']) is str and len(binding['sha256'])==64
            and all(ch in '0123456789abcdef' for ch in binding['sha256'])))
    derived={**sums,'task_lifetimes':len(tasks),'task_exits':sum(r['exited'] for r in tasks),
        'read_return_bytes':sum(b['read_return_bytes'] for b in histogram.values()),
        'write_return_bytes':sum(b['write_return_bytes'] for b in histogram.values()),
        'captured_stream_bytes':sum(b['bytes'] for b in streams.values()),
        'max_task_fd_sample':max((r['fd_sample_peak'] for r in tasks),default=0)}
    check(set(totals)==set(derived)|{'syscall_stops','task_event_outstanding_peak'}
        and all(integer(v) for v in totals.values()) and all(totals[k]==v for k,v in derived.items()))
    check(int(bool(tasks))<=totals['task_event_outstanding_peak']<=len(tasks))
    accounted=sums['syscall_entries']+sums['syscall_exits']+sums['inherited_return_stops']
    refusal=ledger['refusal']
    check(refusal is None or type(refusal) is dict)
    # A limit-triggering syscall stop is counted before its detailed bucket is
    # processed. It is explicit partial telemetry, not a silently lost event.
    check(totals['syscall_stops']==accounted+int(refusal is not None and refusal.get('metric')=='syscall_stops'))
    if refusal is not None:
        check(type(refusal) is dict and set(refusal)=={'metric','observed','limit'}
            and refusal['metric'] in limits and type(refusal['observed']) is int
            and refusal['observed']>refusal['limit']==limits[refusal['metric']])
    if ledger['capture_complete_for_scope']:
        check(refusal is None and all(r['exited'] for r in tasks) and bool(tasks)
            and all(b['sha256'] is not None for b in streams.values()))
        check(totals['syscall_stops']<=limits['syscall_stops'] and len(tasks)<=limits['tasks']
            and totals['max_task_fd_sample']<=limits['fd_sample']
            and totals['read_return_bytes']+totals['write_return_bytes']<=limits['returned_io_bytes'])



def invocation_rusage_snapshot(value) -> dict:
    return {
        'user_us': int(round(value.ru_utime * 1_000_000)),
        'system_us': int(round(value.ru_stime * 1_000_000)),
        'maxrss_kib': int(value.ru_maxrss),
        'minor_faults': int(value.ru_minflt),
        'major_faults': int(value.ru_majflt),
        'block_inputs': int(value.ru_inblock),
        'block_outputs': int(value.ru_oublock),
        'voluntary_context_switches': int(value.ru_nvcsw),
        'involuntary_context_switches': int(value.ru_nivcsw),
    }

def invocation_rusage_delta(before, after) -> dict:
    b=invocation_rusage_snapshot(before);a=invocation_rusage_snapshot(after)
    # maxrss is a process high-water mark, not additive; retain both endpoints.
    return {k:(a[k]-b[k]) for k in a if k!='maxrss_kib'} | {
        'maxrss_before_kib':b['maxrss_kib'],'maxrss_after_kib':a['maxrss_kib']}

def invocation_fd_count() -> int:
    return len(os.listdir('/proc/self/fd'))


def invocation_wait4_until(proc, deadline_ns: int):
    """Reap only our launched observer, without an unbounded terminal wait."""
    while True:
        require(time.monotonic_ns() < deadline_ns, 'HOLD_V45_INVOCATION_OBSERVER_UNFINISHED')
        pid, status, usage = os.wait4(proc.pid, os.WNOHANG)
        if pid:
            require(pid == proc.pid and (os.WIFEXITED(status) or os.WIFSIGNALED(status)),
                    'HOLD_V45_INVOCATION_OBSERVER_WAIT')
            proc.returncode = os.waitstatus_to_exitcode(status)
            return status, usage, time.monotonic_ns()
        time.sleep(min(0.001, max(0, deadline_ns-time.monotonic_ns())/1_000_000_000))


def verify_observer_input_retirement(record, expected, scenario, launch_ns, report_ns, sample_ns):
    """Check declared input copies against the recorder's prelaunch FD bindings."""
    code='HOLD_V45_INVOCATION_OBSERVER_INPUT_RETIREMENT'
    def check(ok):require(ok,code)
    roles={'source','worker','request','cwd','log'}
    family,name=scenario.split('/',1)
    if family in ('owned','primitive') and name.startswith('scm-rights-'):
        roles.add('fixture')
    check(type(expected) is dict and set(expected)==roles)
    for role,binding in expected.items():
        check(type(binding) is dict and set(binding)=={'fd','device','inode','file_type','access_mode'}
              and all(type(v) is int and v>=0 for v in binding.values())
              and binding['fd']>2 and binding['inode']>0
              and binding['file_type']==(stat.S_IFDIR if role=='cwd' else stat.S_IFSOCK if role=='fixture' else stat.S_IFREG)
              and binding['access_mode'] in (os.O_RDONLY,os.O_WRONLY,os.O_RDWR))
    check(len({b['fd'] for b in expected.values()})==len(roles))
    check(type(record) is dict and set(record)=={'format','scope','records','inherited_descriptors',
          'closed_descriptors','retired_ns','all_process_capabilities_retired',
          'complete_cleanup_ledger','syscall_count','exact_fd_peak'}
          and record['format']=='VOID_V45_OBSERVER_INPUT_RETIREMENT_V1'
          and record['scope']=='observer_copies_of_declared_launch_inputs_only'
          and type(record['inherited_descriptors']) is int and type(record['closed_descriptors']) is int
          and record['inherited_descriptors']==record['closed_descriptors']==len(roles)
          and record['all_process_capabilities_retired'] is False
          and record['complete_cleanup_ledger'] is False
          and record['syscall_count'] is None and record['exact_fd_peak'] is None
          and type(record['retired_ns']) is int and report_ns<=record['retired_ns']<=sample_ns)
    rows=record['records'];check(type(rows) is list and len(rows)==len(roles))
    seen=set();prior=launch_ns
    for row in rows:
        check(type(row) is dict and set(row)=={'role','binding','phase','close_started_ns',
              'close_returned_ns','closed_checked_ns','close_succeeded'}
              and type(row['role']) is str and row['role'] in roles-seen
              and type(row['binding']) is dict
              and all(type(v) is int for v in row['binding'].values())
              and row['binding']==expected[row['role']] and row['close_succeeded'] is True
              and all(type(row[k]) is int for k in ('close_started_ns','close_returned_ns','closed_checked_ns'))
              and prior<=row['close_started_ns']<=row['close_returned_ns']<=row['closed_checked_ns']<=record['retired_ns'])
        seen.add(row['role']);prior=row['closed_checked_ns']
        if row['role']=='fixture':
            check(row['phase']=='after_worker_spawn' and row['closed_checked_ns']<=report_ns)
        else:
            check(row['phase']=='post_report_cleanup' and row['close_started_ns']>=report_ns)
    check(seen==roles)


def verify_exit_descriptor_snapshot(record, expected, identity, after_ns, terminal_ns, syscall, wait_status):
    code='HOLD_V45_EXIT_DESCRIPTOR_SNAPSHOT'
    def check(ok):require(ok,code)
    check(type(record) is dict and set(record)=={'format','process','syscall','snapshot_started_ns',
        'snapshot_completed_ns','descriptors','scope','table_complete_at_stop','open_file_description_identity_proved',
        'other_process_copies_retired','kernel_close_duration_ns','exact_fd_peak','complete_descriptor_ledger','snapshot_sha256'})
    unsigned=dict(record);seal=unsigned.pop('snapshot_sha256')
    check(seal==sha256(invocation_canon(unsigned)) and record['format']=='VOID_V45_EXIT_DESCRIPTOR_SNAPSHOT_V1'
        and record['process']==identity and record['syscall']==syscall and type(syscall) is int and syscall in (60,231)
        and type(wait_status) is int and wait_status==0
        and record['scope']=='single_stopped_process_fd_table_at_exit_syscall_entry'
        and record['table_complete_at_stop'] is True and record['open_file_description_identity_proved'] is False
        and record['other_process_copies_retired'] is False and record['kernel_close_duration_ns'] is None
        and record['exact_fd_peak'] is None and record['complete_descriptor_ledger'] is False)
    check(all(type(record[k]) is int for k in ('snapshot_started_ns','snapshot_completed_ns'))
        and after_ns<=record['snapshot_started_ns']<=record['snapshot_completed_ns']<=terminal_ns)
    check(type(expected) is list and len(expected)==3 and type(record['descriptors']) is list
        and invocation_canon(expected)==invocation_canon(record['descriptors']))
    for slot,row in enumerate(expected):
        check(type(row) is dict and set(row)=={'fd','device','inode','file_type','access_mode'}
            and all(type(v) is int and v>=0 for v in row.values()) and row['fd']==slot and row['inode']>0
            and row['file_type'] in (stat.S_IFREG,stat.S_IFCHR,stat.S_IFIFO,stat.S_IFSOCK)
            and row['access_mode'] in (os.O_RDONLY,os.O_WRONLY,os.O_RDWR))


def invocation_kernel_identity():
    uname=os.uname()
    return {'format':'VOID_V45_KERNEL_IDENTITY_V1','sysname':uname.sysname,
        'release':uname.release,'version':uname.version,'machine':uname.machine,
        'scope':'uname_in_collector_or_recorder_namespace','independently_attested':False}


def verify_invocation_kernel_identity(record):
    code='HOLD_V45_KERNEL_IDENTITY'
    require(type(record) is dict and set(record)=={'format','sysname','release','version','machine',
        'scope','independently_attested'},code)
    require(record['format']=='VOID_V45_KERNEL_IDENTITY_V1' and record['sysname']=='Linux'
        and record['machine']=='x86_64' and record['scope']=='uname_in_collector_or_recorder_namespace'
        and record['independently_attested'] is False
        and all(type(record[k]) is str and 0<len(record[k])<=256 and record[k].isprintable()
                for k in ('sysname','release','version','machine')),code)


OBSERVER_FD_ADD_ONE = frozenset((2,32,41,43,85,213,240,253,257,283,284,288,290,291,294,298,300,304,319,323,425,428,430,432,433,434,437,438,447))
OBSERVER_FD_ADD_TWO = frozenset((22,53,293))
OBSERVER_FD_RESYNC = frozenset((16,33,47,56,72,282,289,292,299,317,321,435,436,444))
OBSERVER_FD_NEUTRAL = frozenset((0,1,5,7,8,9,10,11,12,13,14,17,38,39,44,46,51,55,57,58,61,63,74,83,89,98,101,102,110,157,217,230,231,262,270,318))
OBSERVER_FD_ALLOWED = OBSERVER_FD_ADD_ONE | OBSERVER_FD_ADD_TWO | OBSERVER_FD_RESYNC | OBSERVER_FD_NEUTRAL | frozenset((3,))


def replay_observer_events(raw, record):
    """Replay bounded owned-observer waits separately from delivered notifications.

    Seals bind retained software evidence; they do not attest kernel provenance.
    A signal's child_status is preserved and never substituted for a wait status.
    """
    code='HOLD_V45_OBSERVER_EVENT_REPLAY'
    def check(ok):require(ok,code)
    check(type(raw) is bytes and 0<len(raw)<=32*1024*1024 and raw.endswith(b'\n'))
    binding=record['event_stream']
    check(binding['bytes']==len(raw) and binding['sha256']==sha256(raw) and binding['closed'] is True)
    # Iterate lines without constructing an unbounded list of decoded events.
    import io
    stream=io.BytesIO(raw)
    header_raw=stream.readline(8193);check(len(header_raw)<=8192)
    header=invocation_json(header_raw)
    check(header_raw==invocation_canon(header) and header_raw==invocation_canon({
        'format':'VOID_V45_OBSERVER_EVENTS_V3',
        'request':{k:record[k] for k in ('source','runtime','invocation_id','scenario_id')},
        'observer_pid':record['observer']['pid'],'launch_ns':record['launch_ns'],
        'kernel_identity':record['kernel_identity']}))
    verify_invocation_kernel_identity(header['kernel_identity'])
    previous=record['launch_ns'];sequence=0;waits=0;initial=False;terminal=False
    current=None;handled=True;pending=None;worker=None;worker_return=None;exit_snapshot=False;exit_entry_ns=None
    entries=exits=leading=stops=signal_count=0;histogram={};signals={};senders={};event_hash=hashlib.sha256()
    fd_initial=None;fd_current=None;fd_peak=0;fd_samples=0
    for line in stream:
        check(len(line)<=8192 and sequence<1600008 and not terminal)
        event=invocation_json(line);sequence+=1
        check(type(event) is dict and line==invocation_canon(event) and type(event.get('sequence')) is int
              and event['sequence']==sequence and type(event.get('recorded_ns')) is int
              and event['recorded_ns']>=previous)
        prior_recorded=previous;previous=event['recorded_ns'];event_hash.update(line)
        kind=event.get('kind');base={'sequence','kind','recorded_ns'}
        def shape(*keys):check(set(event)==base|set(keys))
        if kind=='wait':
            shape('wait_status','wait_ns')
            check(handled and worker_return is None and type(event['wait_status']) is int
                  and 0<=event['wait_status']<=0xffffffff and type(event['wait_ns']) is int
                  and prior_recorded<=event['wait_ns']<=previous)
            current=event;handled=False;waits+=1
            continue
        check(current is not None)
        status=current['wait_status'];waited=current['wait_ns']
        if kind=='initial-stop':
            shape('observer','time_ns','fd_count')
            check(not initial and not handled and waits==1 and status==4991
                  and invocation_canon(event['observer'])==invocation_canon(record['observer']) and type(event['time_ns']) is int
                  and waited<=event['time_ns']==record['initial_stop_ns']<=previous
                  and type(event['fd_count']) is int and 3<=event['fd_count']<=256)
            fd_initial=fd_current=event['fd_count'];fd_peak=fd_initial;fd_samples=1
            initial=True;handled=True
            continue
        check(initial)
        if kind=='exit-descriptors':
            shape('snapshot_sha256')
            snapshot=record['exit_descriptor_snapshot']
            check(handled and not exit_snapshot and pending in (60,231) and status==34175
                  and event['snapshot_sha256']==snapshot['snapshot_sha256']
                  and exit_entry_ns is not None
                  and exit_entry_ns<=snapshot['snapshot_started_ns']<=snapshot['snapshot_completed_ns']<=previous)
            exit_snapshot=True
            continue
        if kind=='worker-return':
            shape('worker')
            check(not handled and status==34175 and pending in (56,57,58,435) and worker is None
                  and worker_return is None and invocation_canon(event['worker'])==invocation_canon(record['worker_excluded']))
            worker_return=event['worker']
            continue
        check(not handled)
        if kind in ('enter','return'):
            check(status==34175 and type(event.get('audit_arch')) is int and event['audit_arch']==0xc000003e
                  and type(event.get('info_bytes')) is int and 33<=event['info_bytes']<=128 and not exit_snapshot)
            nr=event.get('nr')
            if kind=='enter':
                shape('nr','info_bytes','audit_arch')
                check(type(nr) is int and 0<=nr<0x40000000 and nr in OBSERVER_FD_ALLOWED
                      and event['info_bytes']>=80 and pending is None and worker_return is None
                      and (str(nr) in histogram or len(histogram)<1024))
                pending=nr;entries+=1
                if nr in (60,231):exit_entry_ns=previous
                histogram.setdefault(str(nr),{'entries':0,'exits':0,'errors':0})['entries']+=1
            else:
                shape('nr','value','error','info_bytes','audit_arch','fd_count','fd_resync')
                value=event['value'];error=event['error']
                check(type(value) is int and -(1<<63)<=value<(1<<63) and type(error) is int and error in (0,1)
                      and type(event['fd_count']) is int and 3<=event['fd_count']<=256
                      and type(event['fd_resync']) is bool and fd_current is not None)
                if pending is None:
                    check(stops==0 and leading==0 and nr is None and value==error==0 and worker_return is None
                          and event['fd_resync'] is False and event['fd_count']==fd_current)
                    leading=1
                else:
                    check(type(nr) is int and nr==pending and nr in OBSERVER_FD_ALLOWED)
                    if nr in (56,57,58,435) and error==0 and value>0:
                        check(worker is None and worker_return is not None and value==worker_return['pid'])
                        worker=worker_return;worker_return=None
                    else:check(worker_return is None)
                    if error:
                        check(event['fd_resync'] is False and event['fd_count']==fd_current)
                    elif nr == 3:
                        fd_current-=1;check(event['fd_resync'] is False and event['fd_count']==fd_current)
                    elif nr in OBSERVER_FD_ADD_ONE:
                        fd_current+=1;check(event['fd_resync'] is False and event['fd_count']==fd_current)
                    elif nr in OBSERVER_FD_ADD_TWO:
                        fd_current+=2;check(event['fd_resync'] is False and event['fd_count']==fd_current)
                    elif nr in OBSERVER_FD_RESYNC:
                        check(event['fd_resync'] is True);fd_current=event['fd_count'];fd_samples+=1
                    else:
                        check(nr in OBSERVER_FD_NEUTRAL and event['fd_resync'] is False and event['fd_count']==fd_current)
                    check(3<=fd_current<=256);fd_peak=max(fd_peak,fd_current)
                    histogram[str(nr)]['exits']+=1;histogram[str(nr)]['errors']+=error
                    pending=None;exits+=1
            stops+=1;check(stops<=600000)
        elif kind=='signal':
            shape('signal','code','sender','child_status','uid','sender_identity','delivery_preserved')
            check(all(type(event[k]) is int for k in ('signal','code','sender','child_status','uid'))
                  and 0<=event['uid']<1<<32 and 0<=event['child_status']<1<<31
                  and status==((event['signal']<<8)|127) and event['delivery_preserved'] is True
                  and worker_return is None and not exit_snapshot)
            signo=event['signal'];sender=event['sender'];identity=event['sender_identity']
            if signo==17:
                check(worker is not None and event['code'] in (1,2,3,4,5,6)
                      and type(identity) is dict and set(identity)=={'pid','parent_pid','starttime_ticks','thread_group_id'}
                      and all(type(v) is int and v>0 for v in identity.values())
                      and identity['pid']==sender)
                direct = (sender!=worker['pid'] and identity['thread_group_id']==sender
                          and identity['parent_pid']==worker['pid'])
                thread = identity['thread_group_id']==worker['pid']
                check(thread or direct)
                if sender==worker['pid']:check(identity=={**worker,'thread_group_id':sender})
                elif sender not in senders:check(event['code']==4)
                check(sender not in senders or senders[sender]==identity)
                senders[sender]=identity
                check(len(senders)<=67 and sum(v['pid']!=worker['pid'] and v['thread_group_id']==v['pid']
                                               for v in senders.values())<=2)
            else:check(signo==14 and event['code']==128 and sender==0 and identity is None)
            key=f"{signo}:{event['code']}:{sender}:{event['child_status']}"
            signals[key]=signals.get(key,0)+1;signal_count+=1
            check(len(signals)<=1024 and signal_count<=200000)
        elif kind=='terminal':
            shape('wait_status','time_ns')
            check(type(event['wait_status']) is int and event['wait_status']==status==record['wait_status']==0
                  and type(event['time_ns']) is int and event['time_ns']==waited==record['terminal_ns']
                  and pending in (60,231) and worker is not None and worker_return is None and exit_snapshot)
            terminal=True
        else:check(False)
        handled=True
    check(terminal and handled and sequence==record['ordered_event_count']
          and event_hash.hexdigest()==record['ordered_event_sha256']
          and waits==binding['wait_receipts']==stops+signal_count+2
          and (entries,exits,leading,stops,signal_count,pending)==tuple(record[k] for k in
              ('syscall_entries','syscall_exits','initial_unpaired_exit','syscall_stops','signal_stops','terminal_syscall_entry'))
          and histogram==record['histogram'] and signals==record['signal_histogram']
          and list(senders.values())==record['signal_senders']
          and fd_initial==record['fd_count_initial'] and fd_current==record['fd_count_at_terminal_entry']==3
          and fd_samples==record['fd_sample_count']
          and fd_samples==1+sum(row['exits']-row['errors'] for nr,row in histogram.items()
                               if int(nr) in OBSERVER_FD_RESYNC)
          and fd_peak==record['exact_fd_peak']
          and record['last_stop']=={'signal':133,'ptrace_event':0,'wait_status':34175})
    return {'events':sequence,'wait_receipts':waits,'signal_notifications':signal_count,
            'fd_count_initial':fd_initial,'fd_count_at_terminal_entry':fd_current,
            'fd_sample_count':fd_samples,'exact_fd_peak':fd_peak,
            'actual_terminal_wait_status':status,'replay_complete_for_scope':True}


def verify_observer_syscall_window(record, source, runtime, begin, spawn, timing, wait_status):
    code='HOLD_V45_INVOCATION_OBSERVER_SYSCALL_WINDOW'
    def check(ok):require(ok,code)
    check(type(record) is dict and set(record)=={'format','invocation_id','scenario_id','source','runtime',
        'scope','observer','worker_excluded','launch_ns','initial_stop_ns','terminal_ns','wait_status','kernel_identity','event_stream',
        'syscall_entries','syscall_exits','syscall_stops','initial_unpaired_exit','terminal_syscall_entry',
        'histogram','signal_stops','signal_histogram','signal_senders','signal_delivery_preserved',
        'capture_complete_for_scope','refusal','aborted','last_stop','ordered_event_count','ordered_event_sha256',
        'expected_exit_descriptors','exit_descriptor_snapshot','process_local_exit_fds_retired',
        'pre_initial_stop_syscalls','recorder_syscalls','fd_count_initial','fd_count_at_terminal_entry','fd_sample_count','fd_measurement',
        'exact_fd_peak','worker_syscalls_included','nested_syscalls_included','complete_resource_ledger',
        'whole_case_complete','full_campaign_accepted','window_sha256'})
    body=dict(record);seal=body.pop('window_sha256')
    check(seal==sha256(invocation_canon(body)) and record['format']=='VOID_V45_OBSERVER_SYSCALL_WINDOW_V5'
        and record['source']==source and record['runtime']==runtime
        and record['invocation_id']==begin['invocation_id'] and record['scenario_id']==begin['scenario_id']
        and record['scope']=='observer_initial_protocol_stop_through_terminal_wait'
        and record['observer']==spawn['observer']
        and record['worker_excluded']=={k:spawn[k] for k in ('pid','parent_pid','starttime_ticks')})
    check(all(type(record[k]) is int and record[k]>0 for k in ('launch_ns','initial_stop_ns','terminal_ns'))
        and record['launch_ns']==timing['observer_launch_ns']
        and record['launch_ns']<=record['initial_stop_ns']<=timing['worker_spawn_received_ns']
        and record['terminal_ns']==timing['observer_terminal_ns']
        and type(record['wait_status']) is int and record['wait_status']==wait_status)
    check(record['capture_complete_for_scope'] is True and record['refusal'] is None and record['aborted'] is False
        and record['pre_initial_stop_syscalls'] is None and record['recorder_syscalls'] is None
        and type(record['fd_count_initial']) is int and 3<=record['fd_count_initial']<=256
        and record['fd_count_at_terminal_entry']==3
        and type(record['fd_sample_count']) is int and record['fd_sample_count']>=1
        and record['fd_measurement']=='exact_single_process_fd_table_peak_from_traced_fd_transitions_with_proc_resync'
        and type(record['exact_fd_peak']) is int and record['fd_count_initial']<=record['exact_fd_peak']<=256
        and record['worker_syscalls_included'] is False
        and record['nested_syscalls_included'] is False and record['complete_resource_ledger'] is False
        and record['whole_case_complete'] is False and record['full_campaign_accepted'] is False)
    check(all(type(record[k]) is int and record[k]>=0 for k in ('syscall_entries','syscall_exits','syscall_stops',
        'initial_unpaired_exit','signal_stops','ordered_event_count'))
        and record['initial_unpaired_exit'] in (0,1) and record['terminal_syscall_entry'] in (60,231)
        and record['syscall_entries']==record['syscall_exits']+1
        and record['syscall_stops']==record['syscall_entries']+record['syscall_exits']+record['initial_unpaired_exit']
        and 0<record['syscall_stops']<=600000 and record['signal_stops']<=200000)
    verify_invocation_kernel_identity(record['kernel_identity'])
    stream=record['event_stream']
    check(type(stream) is dict and set(stream)=={'format','path','bytes','sha256','closed','wait_receipts'}
          and stream['format']=='VOID_V45_OBSERVER_EVENTS_V3' and stream['path']=='observer-events.jsonl'
          and type(stream['bytes']) is int and 0<stream['bytes']<=32*1024*1024
          and type(stream['sha256']) is str and re.fullmatch('[0-9a-f]{64}',stream['sha256']) is not None
          and stream['closed'] is True and type(stream['wait_receipts']) is int
          and stream['wait_receipts']==record['syscall_stops']+record['signal_stops']+2)
    check(record['process_local_exit_fds_retired'] is True)
    verify_exit_descriptor_snapshot(record['exit_descriptor_snapshot'],record['expected_exit_descriptors'],
        record['observer'],record['initial_stop_ns'],record['terminal_ns'],record['terminal_syscall_entry'],record['wait_status'])
    histogram=record['histogram'];check(type(histogram) is dict and 0<len(histogram)<=1024)
    for nr,row in histogram.items():
        check(type(nr) is str and nr.isdecimal() and str(int(nr))==nr and int(nr)<0x40000000
            and type(row) is dict and set(row)=={'entries','exits','errors'}
            and all(type(v) is int and v>=0 for v in row.values())
            and row['entries']>0 and row['errors']<=row['exits']
            and row['entries']-row['exits']==int(nr==str(record['terminal_syscall_entry'])))
    check(sum(r['entries'] for r in histogram.values())==record['syscall_entries']
        and sum(r['exits'] for r in histogram.values())==record['syscall_exits']
        and all(int(nr) in OBSERVER_FD_ALLOWED for nr in histogram)
        and record['fd_sample_count']==1+sum(r['exits']-r['errors'] for nr,r in histogram.items()
                                             if int(nr) in OBSERVER_FD_RESYNC))
    senders=record['signal_senders'];check(type(senders) is list and len(senders)<=67)
    ids=set(); direct_process_senders=0
    for sender in senders:
        check(type(sender) is dict and set(sender)=={'pid','parent_pid','starttime_ticks','thread_group_id'}
            and all(type(v) is int and v>0 for v in sender.values()) and sender['pid'] not in ids)
        ids.add(sender['pid'])
        if sender['pid']==spawn['pid']:
            check(sender['thread_group_id']==spawn['pid']
                  and {k:v for k,v in sender.items() if k!='thread_group_id'}==record['worker_excluded'])
        elif sender['thread_group_id']==spawn['pid']:
            pass
        else:
            check(sender['thread_group_id']==sender['pid'] and sender['parent_pid']==spawn['pid'])
            direct_process_senders+=1; check(direct_process_senders<=2)
    signals=record['signal_histogram'];check(type(signals) is dict and len(signals)<=1024)
    for key,count in signals.items():
        check(type(key) is str and re.fullmatch(r'[0-9]+:[0-9]+:[0-9]+:[0-9]+',key) is not None
            and type(count) is int and count>0)
        signo,si_code,sender,status=map(int,key.split(':'))
        check((signo==17 and si_code in (1,2,3,4,5,6) and sender in ids)
            or (signo==14 and si_code==128 and sender==0))
    check(sum(signals.values())==record['signal_stops'] and record['signal_delivery_preserved'] is True
        and type(record['ordered_event_sha256']) is str
        and re.fullmatch('[0-9a-f]{64}',record['ordered_event_sha256']) is not None
        and record['ordered_event_count']==2*(record['syscall_stops']+record['signal_stops'])+6
        and record['last_stop']=={'signal':133,'ptrace_event':0,'wait_status':34175})



def verify_observer_source_query_signal_senders(window: dict, observation: dict) -> None:
    """Direct-process SIGCHLD senders must be measured source-query generations."""
    code='HOLD_V45_OBSERVER_SOURCE_QUERY_SIGNAL_JOIN'
    def check(ok): require(ok,code)
    worker=observation['worker']['pid']
    measured={(r['child']['pid'],r['child']['parent_pid'],r['child']['starttime_ticks'])
              for r in observation['direct_child_handoffs']['records']
              if r['classification']=='PROCESS' and r['nested_resources_measured']}
    check(len(measured)==2)
    direct=[]
    for sender in window['signal_senders']:
        if sender['pid']!=worker and sender['thread_group_id']==sender['pid']:
            generation=(sender['pid'],sender['parent_pid'],sender['starttime_ticks'])
            check(generation in measured)
            direct.append(generation)
    check(len(direct)==len(set(direct)) and len(direct)<=2)


def verify_surrounding_resource_record(obj: dict, source: dict, runtime: dict, begin: dict, spawn: dict, terminal: dict) -> None:
    code='HOLD_V45_INVOCATION_SURROUNDING_RESOURCE'
    def check(ok):require(ok,code)
    check(type(obj) is dict and set(obj)=={'format','source','runtime','invocation_id','scenario_id','scope',
        'recorder','observer','observer_channel','timing','worker_resources_included_in_self_records','nested_resources_included_in_self_records',
        'whole_case_complete','complete_resource_ledger','resource_sha256'})
    body=dict(obj);claimed=body.pop('resource_sha256',None)
    check(claimed==sha256(invocation_canon(body)) and obj['format']=='VOID_V45_INVOCATION_SURROUNDING_RESOURCE_V6')
    check(obj['source']==source and obj['runtime']==runtime and obj['invocation_id']==begin['invocation_id']
          and obj['scenario_id']==begin['scenario_id'] and obj['scope']=='recorder_self_delta_and_observer_self_sample_with_nonadditive_wait4_diagnostic')
    check(obj['worker_resources_included_in_self_records'] is False and obj['nested_resources_included_in_self_records'] is False
          and obj['whole_case_complete'] is False and obj['complete_resource_ledger'] is False)
    r=obj['recorder'];o=obj['observer'];t=obj['timing']
    check(type(r) is dict and set(r)=={'pid','starttime_ticks','rusage_delta','fd_count_before','fd_count_after','elapsed_ns'}
          and r['pid']==spawn['observer']['parent_pid'] and all(type(r[k]) is int and r[k]>=0 for k in ('starttime_ticks','fd_count_before','fd_count_after','elapsed_ns'))
          and r['fd_count_after']==r['fd_count_before'])
    usage_keys={'user_us','system_us','maxrss_kib','minor_faults','major_faults',
                'block_inputs','block_outputs','voluntary_context_switches','involuntary_context_switches'}
    delta_keys=(usage_keys-{'maxrss_kib'})|{'maxrss_before_kib','maxrss_after_kib'}
    def usage(value, keys):
        return type(value) is dict and set(value)==keys and all(type(v) is int and v>=0 for v in value.values())
    check(usage(r['rusage_delta'],delta_keys))
    check(type(o) is dict and set(o)=={'pid','starttime_ticks','wait_status','returncode',
          'wait4_rusage_including_waited_descendants','wait4_scope','wait4_additive',
          'self_rusage','self_rusage_scope','self_snapshot_overlaps_internal_windows',
          'post_sample_exit_tail_measured','launch_input_bindings','post_report_cleanup','syscall_window','standard_stream_bindings'}
          and o['pid']==spawn['observer']['pid'] and o['starttime_ticks']==spawn['observer']['starttime_ticks']
          and type(o['wait_status']) is int and 0<=o['wait_status']<=65535
          and os.WIFEXITED(o['wait_status']) and type(o['returncode']) is int
          and os.waitstatus_to_exitcode(o['wait_status'])==o['returncode']==0)
    check(usage(o['wait4_rusage_including_waited_descendants'],usage_keys)
          and o['wait4_scope']=='observer_plus_waited_descendants_linux_RUSAGE_BOTH'
          and o['wait4_additive'] is False and usage(o['self_rusage'],usage_keys)
          and o['self_rusage_scope']=='observer_process_lifetime_through_cleanup_sample'
          and o['self_snapshot_overlaps_internal_windows'] is True
          and o['post_sample_exit_tail_measured'] is False)
    check(invocation_canon(o['standard_stream_bindings'])==invocation_canon(o['syscall_window']['expected_exit_descriptors']))
    c=o['post_report_cleanup'];check(type(c) is dict)
    check(set(c)=={'format','invocation_id','scenario_id','observer_pid','observer_starttime_ticks',
        'report_sent_ns','cleanup_ended_ns','elapsed_after_report_ns','rusage_delta_after_report',
        'fd_count_at_report','fd_count_after_internal_cleanup','self_rusage_at_cleanup',
        'self_sample_started_ns','self_sample_ended_ns','self_rusage_scope',
        'self_rusage_includes_waited_descendants','post_sample_exit_tail_measured',
        'worker_pidfd_closed','direct_child_pidfds_closed','executable_fd_closed',
        'inherited_input_retirement','report_channel_closes_after_cleanup_receipt','syscall_count','exact_fd_peak',
        'complete_cleanup_ledger','cleanup_sha256'})
    body=dict(c);seal=body.pop('cleanup_sha256',None)
    check(seal==sha256(invocation_canon(body))
          and c.get('format')=='VOID_V45_WORKER_OBSERVER_POST_REPORT_CLEANUP_V3'
          and c.get('invocation_id')==begin['invocation_id'] and c.get('scenario_id')==begin['scenario_id']
          and c.get('observer_pid')==o['pid'] and c.get('observer_starttime_ticks')==o['starttime_ticks']
          and type(c.get('report_sent_ns')) is int and type(c.get('cleanup_ended_ns')) is int
          and c['cleanup_ended_ns']>=c['report_sent_ns']
          and c.get('elapsed_after_report_ns')==c['cleanup_ended_ns']-c['report_sent_ns']
          and usage(c.get('rusage_delta_after_report'),delta_keys)
          and type(c.get('fd_count_at_report')) is int and type(c.get('fd_count_after_internal_cleanup')) is int
          and 0<=c['fd_count_after_internal_cleanup']<=c['fd_count_at_report']-5
          and c.get('worker_pidfd_closed') is True and c.get('direct_child_pidfds_closed') is True
          and c.get('executable_fd_closed') is True and c.get('report_channel_closes_after_cleanup_receipt') is True
          and c.get('syscall_count') is None and c.get('exact_fd_peak') is None
          and c.get('complete_cleanup_ledger') is False)
    check(usage(c['self_rusage_at_cleanup'],usage_keys) and c['self_rusage_at_cleanup']==o['self_rusage']
          and c['self_rusage_scope']==o['self_rusage_scope']
          and c['self_rusage_includes_waited_descendants'] is False
          and c['post_sample_exit_tail_measured'] is False
          and type(c['self_sample_started_ns']) is int and type(c['self_sample_ended_ns']) is int
          and c['report_sent_ns']<=c['self_sample_started_ns']<=c['self_sample_ended_ns']<=c['cleanup_ended_ns'])
    check(type(t) is dict and set(t)=={'recorder_window_started_ns','observer_launch_ns','worker_spawn_received_ns','observation_received_ns','cleanup_received_ns','observer_terminal_ns','observer_channel_eof_ns','recorder_window_ended_ns'}
          and all(type(v) is int and v>0 for v in t.values())
          and t['recorder_window_started_ns']<=t['observer_launch_ns']<=t['worker_spawn_received_ns']<=t['observation_received_ns']<=t['cleanup_received_ns']<=t['observer_channel_eof_ns']<=t['recorder_window_ended_ns']
          and t['observer_launch_ns']<=t['observer_terminal_ns']<=t['observer_channel_eof_ns']
          and c['cleanup_ended_ns']<=t['observer_terminal_ns'])
    check(c['cleanup_ended_ns']<=o['syscall_window']['exit_descriptor_snapshot']['snapshot_started_ns'])
    channel=obj['observer_channel']
    check(type(channel) is dict and set(channel)=={'format','scope','messages_received',
          'descriptors_received','descriptors_closed','input_eof','eof_observed_ns',
          'all_process_capabilities_retired','complete_resource_ledger'}
          and channel['format']=='VOID_V45_OBSERVER_CHANNEL_RETIREMENT_V1'
          and channel['scope']=='one_recorder_observer_stream_receive_side_only'
          and type(channel['messages_received']) is int and channel['messages_received']==3
          and type(channel['descriptors_received']) is int and type(channel['descriptors_closed']) is int
          and channel['descriptors_received']==channel['descriptors_closed']==1
          and channel['input_eof'] is True and type(channel['eof_observed_ns']) is int
          and channel['eof_observed_ns']==t['observer_channel_eof_ns']
          and channel['all_process_capabilities_retired'] is False
          and channel['complete_resource_ledger'] is False)
    check(r['elapsed_ns']==t['recorder_window_ended_ns']-t['recorder_window_started_ns'])
    check(t['observer_launch_ns']<=c['report_sent_ns']<=t['observation_received_ns']
          and c['cleanup_ended_ns']<=t['cleanup_received_ns']
          and begin['begin_time_ns']+terminal['elapsed_ns']>=t['recorder_window_ended_ns'])
    verify_observer_input_retirement(c['inherited_input_retirement'],o['launch_input_bindings'],
        begin['scenario_id'],t['observer_launch_ns'],c['report_sent_ns'],c['self_sample_started_ns'])
    verify_observer_syscall_window(o['syscall_window'],source,runtime,begin,spawn,t,o['wait_status'])
    check(terminal['state']=='COMPLETED')

def invocation_close_local_resources(fds, channels, transfer):
    """Attempt every owned local close; preserve failure and consume FD ownership."""
    failure = None
    # Socket/fixture objects own their own idempotent close state. Integer FDs
    # are removed before close and cannot be retried by the caller's finally.
    for resource in (transfer, *channels):
        if resource is not None:
            try:
                resource.close()
            except BaseException as exc:
                if failure is None:failure = exc
    while fds:
        fd = fds.pop()
        try:
            os.close(fd)
        except BaseException as exc:
            if failure is None:failure = exc
    if failure is not None:
        raise failure


def invocation_abort_and_close(proc, fds, channels, transfer):
    """Failure cleanup for our launched observer; no descendant census claim."""
    try:
        if proc is not None and proc.poll() is None:
            try:
                proc.kill()
            finally:
                # Reap even if kill raced with exit. A timeout stays visible.
                proc.wait(timeout=5)
    finally:
        invocation_close_local_resources(fds, channels, transfer)


class ObservedInvocationJournal(InvocationJournal):
    """Source-versioned local path with a separate worker observer."""
    def __init__(self,directory,source,runtime,plan):
        self.observed_workers=True
        super().__init__(directory,source,runtime,plan)

    def run_next(self,repo: Path,*,deadline_ns: int=35000000000) -> dict:
        import socket,types
        require(not self.closed and self.ordinal<len(self.plan) and type(deadline_ns) is int
                and 1<=deadline_ns<=120000000000,'HOLD_V45_INVOCATION_NEXT')
        recorder_window_started_ns=time.monotonic_ns();recorder_rusage_before=resource.getrusage(resource.RUSAGE_SELF)
        recorder_fd_before=invocation_fd_count();recorder_stat=Path('/proc/self/stat').read_text();recorder_fields=recorder_stat[recorder_stat.rfind(')')+2:].split()
        recorder_identity={'pid':os.getpid(),'starttime_ticks':int(recorder_fields[19])}
        scenario=self.plan[self.ordinal];self.ordinal+=1
        attempt=self.attempts.get(scenario,0)+1;self.attempts[scenario]=attempt
        ident=sha256(invocation_canon([self.session_id,self.source,scenario,self.ordinal,attempt]))
        folder=self.directory/ident;folder.mkdir(mode=0o700)
        request={'invocation_id':ident,'scenario_id':scenario,'source':self.source,'runtime':self.runtime}
        cpath=repo/INVOCATION_OBSERVER_REL;craw=invocation_file(cpath,MAX_SOURCE_FILE_BYTES)
        require(sha256(craw)==self.source['observer_sha256'],'HOLD_V45_INVOCATION_OBSERVER_SOURCE')
        c=types.ModuleType('v45_invocation_observer_client');c.__file__=str(cpath)
        exec(compile(craw,str(cpath),'exec'),c.__dict__)
        fds=[];proc=None;left=right=None;transfer=None;observer_trace=None;trace_saved=False
        try:
            source_fd=c.sealed_fd(craw);fds.append(source_fd)
            worker=c.sealed_fd(invocation_file(repo/INVOCATION_WORKER,MAX_SOURCE_FILE_BYTES));fds.append(worker)
            request_fd=c.sealed_fd(invocation_canon(request));fds.append(request_fd)
            cwd=os.open(repo,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW);fds.append(cwd)
            log=os.open(folder/'output.log',os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,0o600);fds.append(log)
            transfer=InvocationTransferFixture(scenario)
            command=[self.runtime['executable'],'-I','-S','-B',f'/proc/self/fd/{worker}',
                     '--invocation-case',scenario,'--invocation-request-fd',str(request_fd),
                     '--output',str(folder/'result.json')]
            if transfer.child_fds():command+=['--observed-fixture-socket',str(transfer.child_fds()[0])]
            begin={'invocation_id':ident,'scenario_id':scenario,'ordinal':self.ordinal,'attempt':attempt,
                   'deadline_ns':deadline_ns,'source':self.source,'runtime':self.runtime,
                   'argv_sha256':sha256(invocation_canon(command))}
            start=self.append('BEGIN',begin)['time_ns']
            left,right=socket.socketpair(socket.AF_UNIX,socket.SOCK_STREAM)
            observer_channel=c.InvocationObserverChannel(left)
            observer_command=[self.runtime['executable'],'-I','-S','-B',f'/proc/self/fd/{source_fd}',
                '--local-invocation-observer','--channel-fd',str(right.fileno()),'--source-fd',str(source_fd),
                '--worker-fd',str(worker),'--request-fd',str(request_fd),'--cwd-fd',str(cwd),'--log-fd',str(log),
                '--output',str(folder/'result.json'),'--deadline-ns',str(deadline_ns)]
            if transfer.child_fds():observer_command+=['--fixture-fd',str(transfer.child_fds()[0])]
            env={'PATH':os.environ.get('PATH','/usr/bin:/bin'),'LANG':'C.UTF-8',
                 'HOME':str(folder),'PYTHONDONTWRITEBYTECODE':'1'}
            launch_inputs={'source':source_fd,'worker':worker,'request':request_fd,'cwd':cwd,'log':log}
            if transfer.child_fds():launch_inputs['fixture']=transfer.child_fds()[0]
            launch_input_bindings=c.InvocationObserverInputs.bindings(launch_inputs,right.fileno())
            observer_launch_ns=time.monotonic_ns()
            observer_trace=c.InvocationObserverTrace(request,observer_launch_ns)
            with (folder/'observer.log').open('xb') as observer_log, open('/dev/null','rb') as observer_stdin:
                standard_stream_bindings=c.InvocationExitDescriptors.standard(observer_stdin.fileno(),observer_log.fileno(),observer_log.fileno())
                observer_trace.expected_exit_descriptors=standard_stream_bindings
                proc=subprocess.Popen(observer_command,cwd=repo,env=env,stdin=observer_stdin,
                    stdout=observer_log,stderr=observer_log,close_fds=True,
                    pass_fds=(*fds,right.fileno(),*transfer.child_fds()),start_new_session=True)
                observer_trace.bind(proc)
                observer_trace.open_events(folder/'observer-events.jsonl',invocation_kernel_identity())
                right.close();right=None;transfer.after_spawn()
                with observer_channel.receive(min(time.monotonic_ns()+5000000000,start+deadline_ns+8000000000),observer_trace.pump) as (spawned,extra):
                    worker_spawn_received_ns=time.monotonic_ns()
                    require(not extra and spawned['status']=='SPAWNED'
                            and spawned['observer']['pid']==proc.pid
                            and spawned['observer']['parent_pid']==os.getpid()
                            and spawned['worker']['parent_pid']==proc.pid
                            and spawned['argv_sha256']==begin['argv_sha256']
                            and spawned['request_sha256']==sha256(invocation_canon(request)),
                            'HOLD_V45_INVOCATION_OBSERVER_HANDOFF')
                spawn={**spawned['worker'],'invocation_id':ident,'observer':spawned['observer']}
                self.append('SPAWN',spawn)
                import select
                final=None;observer_cleanup=None
                while final is None or observer_cleanup is None:
                    transfer.poll()
                    if not select.select([left],[],[],0)[0]:observer_trace.pump()
                    if select.select([left],[],[],0.0001)[0]:
                        with observer_channel.receive(start+deadline_ns+8000000000,observer_trace.pump) as (message,extra):
                            status=message.get('status')
                            if status=='OBSERVATION':
                                require(final is None and len(extra)==1,'HOLD_V45_INVOCATION_OBSERVER_REPORT')
                                require(fcntl.fcntl(extra[0],fcntl.F_GET_SEALS)==15,'HOLD_V45_INVOCATION_OBSERVER_UNSEALED')
                                raw=c.read_fd(extra[0]);final=invocation_json(raw);observation_received_ns=time.monotonic_ns()
                                require(final.get('observation_sha256')==message['observation_sha256'],
                                        'HOLD_V45_INVOCATION_OBSERVER_REPORT')
                                write_exclusive(folder/'worker-observation.json',raw)
                            elif status=='CLEANUP':
                                require(final is not None and observer_cleanup is None and not extra,'HOLD_V45_INVOCATION_OBSERVER_CLEANUP')
                                observer_cleanup=message.get('cleanup');cleanup_received_ns=time.monotonic_ns()
                                require(type(observer_cleanup) is dict,'HOLD_V45_INVOCATION_OBSERVER_CLEANUP')
                            else:
                                raise SourceHold('HOLD_V45_INVOCATION_OBSERVER_REPORT')
                    require(time.monotonic_ns()-start<deadline_ns+8000000000,
                            'HOLD_V45_INVOCATION_OBSERVER_UNFINISHED')
                observer_wait_status,observer_ru,observer_terminal_ns=observer_trace.terminal(start+deadline_ns+8000000000)
                observer_rc=proc.returncode
                channel_retirement=observer_channel.require_input_eof()
                observer_trace.finish_events()
                observer_syscalls=observer_trace.report()
                replay_observer_events(invocation_file(folder/'observer-events.jsonl',32*1024*1024),observer_syscalls)
                write_exclusive(folder/'observer-syscalls.json',invocation_canon(observer_syscalls));trace_saved=True
                observer_trace.close()
            rc=final['root_returncode']
            require(final['root_and_threads_retired'] and rc is not None,
                    'HOLD_V45_INVOCATION_WORKER_NOT_RETIRED')
            reaped_at=next(e['time_ns'] for e in final['events'] if e['kind']=='EXIT' and e['pid']==spawn['pid'])
            transfer_record=transfer.finish(reaped_at,rc)
            result_hash=None;refs=[];result=None
            if (folder/'result.json').exists():
                result_raw=invocation_file(folder/'result.json',INVOCATION_LIMITS['result_bytes'])
                result=invocation_json(result_raw)
                require(type(result) is dict and set(result)=={'format','invocation_id','scenario_id','source','runtime','status','payload'}
                        and all(result[k]==request[k] for k in request) and result['status']=='PASS',
                        'HOLD_V45_INVOCATION_RESULT')
                result_hash=sha256(result_raw);refs=invocation_ledger_refs(result)
            resource_join=join_worker_nested_resources(final,result)
            join_raw=invocation_canon(resource_join)
            write_exclusive(folder/'worker-resource-join.json',join_raw)
            state='COMPLETED' if result_hash is not None and rc==0 and observer_rc==0 else 'FAILED'
            # Successful-path cleanup is part of the recorder window. Failure paths
            # still rely on the finally block and remain partial/unmeasured here.
            try:
                invocation_close_local_resources(fds, (left,right), transfer)
            finally:
                left=right=None;transfer=None
            recorder_rusage_after=resource.getrusage(resource.RUSAGE_SELF)
            recorder_fd_after=invocation_fd_count();recorder_window_ended_ns=time.monotonic_ns()
            surrounding={'format':'VOID_V45_INVOCATION_SURROUNDING_RESOURCE_V6','source':self.source,'runtime':self.runtime,
                'invocation_id':ident,'scenario_id':scenario,
                'scope':'recorder_self_delta_and_observer_self_sample_with_nonadditive_wait4_diagnostic',
                'recorder':{'pid':recorder_identity['pid'],'starttime_ticks':recorder_identity['starttime_ticks'],
                    'rusage_delta':invocation_rusage_delta(recorder_rusage_before,recorder_rusage_after),
                    'fd_count_before':recorder_fd_before,'fd_count_after':recorder_fd_after,
                    'elapsed_ns':recorder_window_ended_ns-recorder_window_started_ns},
                'observer':{'pid':spawn['observer']['pid'],'starttime_ticks':spawn['observer']['starttime_ticks'],
                    'wait_status':observer_wait_status,'returncode':observer_rc,
                    'wait4_rusage_including_waited_descendants':invocation_rusage_snapshot(observer_ru),
                    'wait4_scope':'observer_plus_waited_descendants_linux_RUSAGE_BOTH','wait4_additive':False,
                    'self_rusage':observer_cleanup['self_rusage_at_cleanup'],
                    'self_rusage_scope':'observer_process_lifetime_through_cleanup_sample',
                    'self_snapshot_overlaps_internal_windows':True,'post_sample_exit_tail_measured':False,
                    'launch_input_bindings':launch_input_bindings,'post_report_cleanup':observer_cleanup,
                    'syscall_window':observer_syscalls,'standard_stream_bindings':standard_stream_bindings},
                'observer_channel':channel_retirement,
                'timing':{'recorder_window_started_ns':recorder_window_started_ns,'observer_launch_ns':observer_launch_ns,
                    'worker_spawn_received_ns':worker_spawn_received_ns,'observation_received_ns':observation_received_ns,
                    'cleanup_received_ns':cleanup_received_ns,'observer_terminal_ns':observer_terminal_ns,
                    'observer_channel_eof_ns':channel_retirement['eof_observed_ns'],'recorder_window_ended_ns':recorder_window_ended_ns},
                'worker_resources_included_in_self_records':False,'nested_resources_included_in_self_records':False,'whole_case_complete':False,
                'complete_resource_ledger':False}
            surrounding['resource_sha256']=sha256(invocation_canon(surrounding));surrounding_raw=invocation_canon(surrounding)
            write_exclusive(folder/'surrounding-resource.json',surrounding_raw)
            descendant_cleanup_verified=bool(final['root_and_threads_retired']
                and final['direct_child_handoffs']['complete_nested_tree'])
            row={'invocation_id':ident,'state':state,'returncode':rc,'root_reaped':True,
                 'elapsed_ns':time.monotonic_ns()-start,'result_sha256':result_hash,
                 'log_sha256':sha256(invocation_file(folder/'output.log',INVOCATION_LIMITS['log_bytes'])),
                 'ledger_refs':refs,'automatic_retries':0,'descendant_cleanup_verified':descendant_cleanup_verified,
                 'fixture_transfer':transfer_record,'worker_observation_sha256':sha256(invocation_canon(final)),
                 'worker_resource_join_sha256':sha256(join_raw),'surrounding_resource_sha256':sha256(surrounding_raw)}
            verify_worker_observation(final,self.source,self.runtime,{**begin,'begin_time_ns':start},spawn,row)
            verify_surrounding_resource_record(surrounding,self.source,self.runtime,{**begin,'begin_time_ns':start},spawn,row)
            verify_observer_source_query_signal_senders(observer_syscalls,final)
            # END includes cleanup, resource persistence, hashing and validation.
            # Its own serialization/fsync and the caller's later work remain open.
            end=time.monotonic_ns();row['elapsed_ns']=end-start
            require(state!='COMPLETED' or end-start<deadline_ns,'HOLD_V45_INVOCATION_END_DEADLINE')
            self.append('END',row,now=end);return row
        finally:
            try:
                if observer_trace is not None:
                    try:
                        observer_trace.abort()
                    finally:
                        try:
                            observer_trace.close()
                        finally:
                            if not trace_saved:
                                write_exclusive(folder/'observer-syscalls-partial.json',invocation_canon(observer_trace.report()))
            finally:
                # The trace owner alone consumes its observer's wait statuses.
                invocation_abort_and_close(proc if observer_trace is None else None, fds, (left,right), transfer)



# The outer recorder capture is deliberately limited to two bookkeeping cases.
# It is separate from per-invocation ledgers and does not upgrade their scope.
RECORDER_FOCUS_PLAN = ('journal/success', 'journal/schema-controls')
RECORDER_EVENT_LIMIT = 2_500_000
RECORDER_EVENT_MAGIC = b'V45RECORDERv3\0\0\0'
RECORDER_FD_ADD_ONE = OBSERVER_FD_ADD_ONE
RECORDER_FD_ADD_TWO = OBSERVER_FD_ADD_TWO
RECORDER_FD_RESYNC = OBSERVER_FD_RESYNC
RECORDER_FD_NEUTRAL = OBSERVER_FD_NEUTRAL
RECORDER_FD_ALLOWED = OBSERVER_FD_ALLOWED


def recorder_event_struct():
    import struct
    return struct.Struct('<QB7xqqqq')


class RecorderSyscallLedger:
    """Replayable counter state; no process operations or syscall arguments."""
    def __init__(self):
        self.recorder = None; self.children = []; self.child_pending = None
        self.started_ns = self.terminal_ns = self.wait_status = None
        self.last_ns = 0; self.events = self.entries = self.exits = self.leading = self.signals = 0
        self.pending = None; self.histogram = {}; self.signal_histogram = {}
        self.fd_count_initial = self.fd_current = None; self.fd_sample_count = 0; self.fd_peak = 0; self.fd_sample_due = False

    def accept(self, row):
        now, kind, a, b, c, d = row
        def check(ok): require(ok, 'HOLD_V45_RECORDER_EVENT')
        check(all(type(x) is int for x in row) and now >= self.last_ns and now > 0
              and self.events < RECORDER_EVENT_LIMIT and self.wait_status is None)
        if self.fd_sample_due:
            check(kind == 7 or (self.child_pending is not None and kind == 5))
        elif self.child_pending is not None:
            check(kind == 5)
        self.events += 1; self.last_ns = now
        if self.recorder is None:
            check(self.events == 1 and kind == 1 and min(a,b,c)>0 and a!=b and d==0)
            self.recorder = {'pid':a,'parent_pid':b,'starttime_ticks':c}; self.started_ns = now
            self.fd_sample_due = True
            return
        if kind == 2:
            check(self.pending is None and 0 <= a < 0x40000000 and a in RECORDER_FD_ALLOWED
                  and b == 0xc000003e and 80 <= c <= 128 and d == 0)
            check(str(a) in self.histogram or len(self.histogram) < 1024)
            self.pending = a; self.entries += 1
            self.histogram.setdefault(str(a),{'entries':0,'exits':0,'errors':0})['entries'] += 1
        elif kind == 3:
            check(b in (0,1) and c == 0xc000003e and 33 <= d <= 128)
            if self.pending is None:
                check(self.events == 2 and not self.leading and a == b == 0)
                self.leading = 1
            else:
                nr = self.pending; self.pending = None; self.exits += 1
                self.histogram[str(nr)]['exits'] += 1; self.histogram[str(nr)]['errors'] += b
                if nr in (56,57,58,435) and not b and a > 0:
                    check(len(self.children) < len(RECORDER_FOCUS_PLAN))
                    self.child_pending = a
                if not b:
                    if nr == 3:
                        self.fd_current -= 1
                    elif nr in RECORDER_FD_ADD_ONE:
                        self.fd_current += 1
                    elif nr in RECORDER_FD_ADD_TWO:
                        self.fd_current += 2
                    elif nr in RECORDER_FD_RESYNC:
                        self.fd_sample_due = True
                    else:
                        check(nr in RECORDER_FD_NEUTRAL)
                    if not self.fd_sample_due:
                        check(3 <= self.fd_current <= 256)
                        self.fd_peak=max(self.fd_peak,self.fd_current)
        elif kind == 4:
            check(a == 17 and 1 <= b <= 6 and c in [v['pid'] for v in self.children] and 0 <= d <= 255)
            check(self.signals < 200000)
            self.signals += 1; key = f'{a}:{b}:{c}:{d}'
            self.signal_histogram[key] = self.signal_histogram.get(key,0)+1
        elif kind == 5:
            check(a == self.child_pending and b == self.recorder['pid'] and c > 0 and d == 0
                  and a not in [v['pid'] for v in self.children] and a != b)
            self.children.append({'pid':a,'parent_pid':b,'starttime_ticks':c}); self.child_pending = None
        elif kind == 6:
            check(not self.fd_sample_due and self.fd_current == 3 and b == c == d == 0
                  and (os.WIFEXITED(a) or os.WIFSIGNALED(a)))
            self.wait_status = a; self.terminal_ns = now
        elif kind == 7:
            check(self.fd_sample_due and 3<=a<=256 and b in (0,1) and c==d==0)
            if self.fd_count_initial is None:
                check(b==0 and self.fd_sample_count==0)
                self.fd_count_initial=a
            else:
                check(b==1)
            self.fd_current=a;self.fd_sample_count+=1;self.fd_peak=max(self.fd_peak,a);self.fd_sample_due=False
        else:
            check(False)

    def summary(self):
        complete = (self.wait_status == 0 and self.pending in (60,231) and self.entries == self.exits+1
                    and len(self.children) == 2 and self.child_pending is None and not self.fd_sample_due
                    and self.fd_count_initial is not None
                    and self.fd_sample_count == 1 + sum(row['exits']-row['errors'] for nr,row in self.histogram.items()
                                                        if int(nr) in RECORDER_FD_RESYNC)
                    and self.fd_peak >= self.fd_count_initial >= 3 and self.fd_current == 3
                    and all(int(nr) in RECORDER_FD_ALLOWED for nr in self.histogram))
        return {'recorder':self.recorder,'observers_excluded':self.children,
            'initial_stop_ns':self.started_ns,'terminal_ns':self.terminal_ns,'wait_status':self.wait_status,
            'syscall_entries':self.entries,'syscall_exits':self.exits,
            'syscall_stops':self.entries+self.exits+self.leading,'initial_unpaired_exit':self.leading,
            'terminal_syscall_entry':self.pending,'histogram':self.histogram,
            'signal_stops':self.signals,'signal_histogram':self.signal_histogram,
            'fd_count_initial':self.fd_count_initial,'fd_count_at_terminal_entry':self.fd_current,
            'fd_sample_count':self.fd_sample_count,
            'fd_measurement':'exact_single_process_fd_table_peak_from_traced_fd_transitions_with_proc_resync',
            'exact_fd_peak':self.fd_peak if complete else None,
            'event_count':self.events,'capture_complete_for_scope':complete}


def replay_recorder_events(raw):
    layout = recorder_event_struct()
    require(type(raw) is bytes and raw.startswith(RECORDER_EVENT_MAGIC)
            and (len(raw)-len(RECORDER_EVENT_MAGIC)) % layout.size == 0
            and len(raw) <= len(RECORDER_EVENT_MAGIC)+RECORDER_EVENT_LIMIT*layout.size,
            'HOLD_V45_RECORDER_EVENT_BYTES')
    ledger = RecorderSyscallLedger()
    for offset in range(len(RECORDER_EVENT_MAGIC),len(raw),layout.size):
        block = raw[offset:offset+layout.size]; row = layout.unpack(block)
        require(layout.pack(*row) == block, 'HOLD_V45_RECORDER_EVENT_PADDING')
        ledger.accept(row)
    return ledger.summary()


class InvocationRecorderCollector:
    """An outer wait owner for its fixed forked recorder, never descendants.

    No attach, arbitrary command/PID, register or memory access is exposed by
    the launcher. Birth returns identify excluded observers without tracing them.
    """
    def __init__(self, stream):
        self.stream = stream; self.layout = recorder_event_struct(); self.ledger = RecorderSyscallLedger()
        self.pid = self.pidfd = self.wait_status = self.usage = self.terminal_ns = None
        self.refusal = self.cleanup_failure = None; self.aborted = False
        self.descriptor_reader = self.expected_exit_descriptors = self.exit_snapshot = None
        self.lib = ctypes.CDLL(None,use_errno=True)
        self.lib.ptrace.argtypes = (ctypes.c_uint,ctypes.c_int,ctypes.c_void_p,ctypes.c_void_p)
        self.lib.ptrace.restype = ctypes.c_long
        self.stream.write(RECORDER_EVENT_MAGIC)

    def trace(self, op, addr=0, data=0):
        ctypes.set_errno(0)
        require(self.lib.ptrace(op,self.pid,ctypes.c_void_p(addr),ctypes.c_void_p(data)) >= 0,
                'HOLD_V45_RECORDER_PTRACE')

    @staticmethod
    def identity(pid):
        raw = Path(f'/proc/{pid}/stat').read_text(); fields = raw[raw.rfind(')')+2:].split()
        require(int(raw.split(' ',1)[0]) == pid, 'HOLD_V45_RECORDER_PROCFS')
        return {'pid':pid,'parent_pid':int(fields[1]),'starttime_ticks':int(fields[19])}

    def sample_fds(self, reason):
        require(reason in (0,1) and self.ledger.recorder is not None
                and self.identity(self.pid) == self.ledger.recorder,
                'HOLD_V45_RECORDER_FD_SAMPLE_PROCESS')
        count=0
        with os.scandir(f'/proc/{self.pid}/fd') as entries:
            for entry in entries:
                require(entry.name.isdecimal() and count<256,'HOLD_V45_RECORDER_FD_SAMPLE_LIMIT')
                count+=1
        require(count>=3,'HOLD_V45_RECORDER_FD_SAMPLE_MINIMUM')
        self.event(7,count,reason)
        return count

    def event(self, kind, a=0, b=0, c=0, d=0):
        row = (time.monotonic_ns(),kind,a,b,c,d)
        self.ledger.accept(row)
        require(self.stream.write(self.layout.pack(*row)) == self.layout.size, 'HOLD_V45_RECORDER_EVENT_WRITE')

    def pump(self):
        import signal, struct
        require(self.pid is not None and self.wait_status is None, 'HOLD_V45_RECORDER_WAIT_OWNERSHIP')
        # The caller arms a wall timer; blocking on this one child avoids adding
        # polling sleeps to every stop in an already nested trace.
        got, status, usage = os.wait4(self.pid,0)
        require(got == self.pid, 'HOLD_V45_RECORDER_WAIT_PID')
        if os.WIFEXITED(status) or os.WIFSIGNALED(status):
            # Consume terminal ownership before any callback can fail.
            self.wait_status = status; self.usage = usage; self.terminal_ns = time.monotonic_ns()
            if self.ledger.recorder is not None:self.event(6,status)
            return
        require(os.WIFSTOPPED(status) and status>>16 == 0, 'HOLD_V45_RECORDER_WAIT')
        stop = os.WSTOPSIG(status)
        if self.ledger.recorder is None:
            require(stop == signal.SIGSTOP, 'HOLD_V45_RECORDER_INITIAL_STOP')
            identity = self.identity(self.pid)
            require(identity['parent_pid'] == os.getpid(), 'HOLD_V45_RECORDER_PARENT')
            self.trace(0x4200,data=0x100001)  # TRACESYSGOOD | EXITKILL; no TRACEFORK.
            self.event(1,identity['pid'],identity['parent_pid'],identity['starttime_ticks'])
            self.sample_fds(0)
        elif stop == signal.SIGTRAP|0x80:
            buffer = ctypes.create_string_buffer(128)
            ctypes.set_errno(0)
            count = self.lib.ptrace(0x420e,self.pid,ctypes.c_void_p(128),ctypes.c_void_p(ctypes.addressof(buffer)))
            op = buffer.raw[0]; arch = struct.unpack_from('=I',buffer.raw,4)[0]
            require(33 <= count <= 128 and op in (1,2), 'HOLD_V45_RECORDER_SYSCALL_INFO')
            if op == 1:
                nr=struct.unpack_from('=Q',buffer.raw,24)[0]
                self.event(2,nr,arch,count)
                if nr in (60,231):
                    require(self.exit_snapshot is None and self.descriptor_reader is not None,'HOLD_V45_RECORDER_EXIT_FD_SETUP')
                    self.exit_snapshot=self.descriptor_reader.snapshot(self.ledger.recorder,self.expected_exit_descriptors,nr)
            else:
                returned = struct.unpack_from('=q',buffer.raw,24)[0]
                self.event(3,returned,buffer.raw[32],arch,count)
                if self.ledger.child_pending is not None:
                    child = self.identity(returned)
                    self.event(5,child['pid'],child['parent_pid'],child['starttime_ticks'])
                if self.ledger.fd_sample_due:
                    self.sample_fds(1)
        else:
            require(stop == signal.SIGCHLD, 'HOLD_V45_RECORDER_SIGNAL')
            buffer = ctypes.create_string_buffer(128)
            self.trace(0x4202,data=ctypes.addressof(buffer))
            signo,err,code = struct.unpack_from('=iii',buffer.raw,0)
            sender,uid,child_status = struct.unpack_from('=iIi',buffer.raw,16)
            require(signo == stop and err == 0 and uid == os.getuid(), 'HOLD_V45_RECORDER_SIGINFO')
            # Validate first, preserve delivery, then persist. Resume errors
            # invalidate the capture even if a counter was already incremented.
            self.event(4,stop,code,sender,child_status)
            self.trace(24,data=stop)
            return
        self.trace(24)

    def abort(self):
        import signal
        if self.pid is None or self.wait_status is not None:return
        self.aborted = True
        try:
            if self.pidfd is not None:signal.pidfd_send_signal(self.pidfd,signal.SIGKILL)
            else:os.kill(self.pid,signal.SIGKILL)  # Own unreaped fork only.
        except ProcessLookupError:
            pass
        deadline = time.monotonic_ns()+3_000_000_000
        while self.wait_status is None:
            require(time.monotonic_ns()<deadline,'HOLD_V45_RECORDER_ABORT_DEADLINE')
            got,status,usage = os.wait4(self.pid,os.WNOHANG)
            if not got:time.sleep(0.0001);continue
            require(got == self.pid,'HOLD_V45_RECORDER_ABORT_PID')
            if os.WIFEXITED(status) or os.WIFSIGNALED(status):
                self.wait_status=status;self.usage=usage;self.terminal_ns=time.monotonic_ns()
            elif os.WIFSTOPPED(status):self.trace(7,data=signal.SIGKILL)
            else:raise SourceHold('HOLD_V45_RECORDER_ABORT_WAIT')

    def close(self):
        if self.pidfd is not None:
            fd=self.pidfd;self.pidfd=None;os.close(fd)


def recorder_focus_child(repo, directory, source, runtime, collector_pid):
    """Only called immediately in our fork child; never a command-line route."""
    import signal
    journal = None; summary = None; failure = None; sample = None
    try:
        lib = ctypes.CDLL(None,use_errno=True)
        lib.ptrace.restype = ctypes.c_long
        require(lib.prctl(1,signal.SIGKILL,0,0,0) == 0 and os.getppid() == collector_pid,
                'HOLD_V45_RECORDER_PARENT_CHANGED')
        require(lib.ptrace(0,0,None,None) == 0,'HOLD_V45_RECORDER_TRACEME')
        os.kill(os.getpid(),signal.SIGSTOP)
        journal = ObservedInvocationJournal(directory/'cases',source,runtime,list(RECORDER_FOCUS_PLAN))
        for _ in RECORDER_FOCUS_PLAN:
            row = journal.run_next(repo,deadline_ns=120_000_000_000)
            require(row['state'] == 'COMPLETED','HOLD_V45_RECORDER_CASE')
        summary = journal.finish()
    except Exception as exc:
        failure = {'type':type(exc).__name__,'code':getattr(exc,'code',None),'error':str(exc)[:500]}
    finally:
        if journal is not None:
            try:journal.close()
            except Exception as exc:failure = {'type':type(exc).__name__,'error':str(exc)[:500]}
    try:
        sample = invocation_rusage_snapshot(resource.getrusage(resource.RUSAGE_SELF))
        write_exclusive(directory/'recorder-result.json',invocation_canon({
            'format':'VOID_V45_RECORDER_FOCUS_RESULT_V1','source':source,'runtime':runtime,
            'plan':list(RECORDER_FOCUS_PLAN),'summary':summary,'failure':failure,
            'self_rusage_through_post_journal_close_sample':sample,'self_rusage_sample_ns':time.monotonic_ns(),
            'post_sample_exit_rusage_measured':False,'full_campaign_accepted':False}))
    except Exception:
        os._exit(2)
    os._exit(0 if failure is None else 2)


def verify_recorder_capture(record, raw, directory, source, runtime):
    code = 'HOLD_V45_RECORDER_CAPTURE'
    def check(ok):require(ok,code)
    body = dict(record); seal = body.pop('capture_sha256',None)
    check(seal == sha256(invocation_canon(body)))
    check(set(body) == {'format','source','runtime','plan','scope','launch_ns','capture','kernel_identity',
        'events_sha256','events_bytes','journal_sha256','recorder_result_sha256',
        'terminal_wait_status','terminal_wait_ns','wait4_rusage_including_waited_descendants',
        'wait4_additive','refusal','aborted','cleanup_failure','pre_initial_stop_syscalls',
        'collector_syscalls','exact_fd_peak','observer_syscalls_included','worker_syscalls_included',
        'nested_syscalls_included','whole_case_complete','complete_resource_ledger',
        'full_job_process_census','hard_execution_resource_ceiling','full_campaign_accepted',
        'inherited_standard_stream_bindings','exit_descriptor_snapshot','process_local_exit_fds_retired'})
    check(body['format'] == 'VOID_V45_RECORDER_SYSCALL_CAPTURE_V5' and body['source']==source
          and body['runtime']==runtime and body['plan']==list(RECORDER_FOCUS_PLAN)
          and body['scope']=='recorder_initial_protocol_stop_through_terminal_wait')
    check(all(body[k] is False for k in ('wait4_additive','aborted','observer_syscalls_included',
        'worker_syscalls_included','nested_syscalls_included','whole_case_complete','complete_resource_ledger',
        'full_job_process_census','hard_execution_resource_ceiling','full_campaign_accepted')))
    check(all(body[k] is None for k in ('refusal','cleanup_failure','pre_initial_stop_syscalls',
                                       'collector_syscalls')))
    capture = replay_recorder_events(raw)
    check(type(body['exact_fd_peak']) is int and 3<=body['exact_fd_peak']<=256
          and body['exact_fd_peak']==capture['exact_fd_peak'])
    verify_invocation_kernel_identity(body['kernel_identity'])
    check(body['events_bytes']==len(raw) and body['events_sha256']==sha256(raw)
          and invocation_canon(body['capture'])==invocation_canon(capture) and capture['capture_complete_for_scope'])
    check(type(body['launch_ns']) is int and 0<body['launch_ns']<=capture['initial_stop_ns']
          and body['terminal_wait_status']==capture['wait_status']==0
          and capture['initial_stop_ns']<=body['terminal_wait_ns']<=capture['terminal_ns'])
    check(body['process_local_exit_fds_retired'] is True)
    layout=recorder_event_struct()
    exit_entry=next(layout.unpack_from(raw,offset) for offset in
        range(len(raw)-layout.size,len(RECORDER_EVENT_MAGIC)-1,-layout.size)
        if layout.unpack_from(raw,offset)[1]==2)
    check(exit_entry[2]==capture['terminal_syscall_entry'])
    verify_exit_descriptor_snapshot(body['exit_descriptor_snapshot'],body['inherited_standard_stream_bindings'],
        capture['recorder'],exit_entry[0],body['terminal_wait_ns'],capture['terminal_syscall_entry'],body['terminal_wait_status'])
    cases = directory/'cases'
    journal_raw = invocation_file(cases/'journal.jsonl',INVOCATION_LIMITS['journal_bytes'])
    check(sha256(journal_raw)==body['journal_sha256'])
    summary = verify_invocation_journal(journal_raw,source,runtime,expected_plan=list(RECORDER_FOCUS_PLAN),artifacts=cases)
    check(summary['all_selected_completed'] and summary['completed_invocations']==2)
    events = [invocation_json(line) for line in journal_raw.splitlines()]
    check(events[0]['data']['owner_pid']==capture['recorder']['pid']
          and capture['initial_stop_ns']<=events[0]['time_ns']<=events[-1]['time_ns']<=capture['terminal_ns'])
    observers = [e['data']['observer'] for e in events if e['kind']=='SPAWN']
    check(observers == capture['observers_excluded'])
    for e in events:
        if e['kind']=='BEGIN':
            surrounding = invocation_json(invocation_file(cases/e['data']['invocation_id']/'surrounding-resource.json',2*1024*1024))
            check(all(surrounding['recorder'][k]==capture['recorder'][k] for k in ('pid','starttime_ticks')))
            check(surrounding['observer']['syscall_window']['kernel_identity']==body['kernel_identity'])
    result_raw = invocation_file(directory/'recorder-result.json',2*1024*1024)
    result = invocation_json(result_raw)
    check(sha256(result_raw)==body['recorder_result_sha256'] and result['source']==source and result['runtime']==runtime
          and result['plan']==list(RECORDER_FOCUS_PLAN) and result['failure'] is None
          and result['summary']==summary and result['full_campaign_accepted'] is False
          and result['post_sample_exit_rusage_measured'] is False
          and events[-1]['time_ns']<=result['self_rusage_sample_ns']<=capture['terminal_ns'])
    check(invocation_json(invocation_file(cases/'manifest.json',2*1024*1024))==summary)
    return summary


def collect_recorder_syscall_focus(repo, directory):
    """Fixed local test only. The surrounding launcher prepares the isolated repo."""
    import signal, threading
    require(sys.platform=='linux' and os.uname().machine=='x86_64'
            and threading.current_thread() is threading.main_thread() and threading.active_count()==1,
            'HOLD_V45_RECORDER_PLATFORM')
    require(signal.getitimer(signal.ITIMER_REAL)==(0.0,0.0),'HOLD_V45_RECORDER_TIMER_IN_USE')
    source=invocation_source(repo);runtime=invocation_runtime();directory.mkdir(mode=0o700)
    kernel_identity=invocation_kernel_identity();verify_invocation_kernel_identity(kernel_identity)
    craw=invocation_file(repo/INVOCATION_OBSERVER_REL,MAX_SOURCE_FILE_BYTES)
    require(sha256(craw)==source['observer_sha256'],'HOLD_V45_RECORDER_DESCRIPTOR_SOURCE')
    descriptor_module=types.ModuleType('verified_exit_descriptor_reader')
    exec(compile(craw,str(repo/INVOCATION_OBSERVER_REL),'exec'),descriptor_module.__dict__)
    descriptor_reader=descriptor_module.InvocationExitDescriptors
    inherited_standard_stream_bindings=descriptor_reader.inherited_standard()
    # Source/runtime inventory and its Git helper processes precede the fork.
    collector_pid=os.getpid();previous_handler=signal.getsignal(signal.SIGALRM)
    trace=None;pid=None;stream=None;failure=None;summary=None
    launch_ns=time.monotonic_ns()
    try:
        pid=os.fork()
        if pid==0:
            recorder_focus_child(repo,directory,source,runtime,collector_pid)
            os._exit(2)
        # Open telemetry after fork, so the recorder cannot inherit its writer.
        stream=(directory/'recorder-events.bin').open('xb')
        trace=InvocationRecorderCollector(stream);trace.pid=pid
        trace.descriptor_reader=descriptor_reader;trace.expected_exit_descriptors=inherited_standard_stream_bindings
        trace.pidfd=os.pidfd_open(pid)
        def expired(signum,frame):raise SourceHold('HOLD_V45_RECORDER_DEADLINE')
        signal.signal(signal.SIGALRM,expired);signal.setitimer(signal.ITIMER_REAL,270)
        while trace.wait_status is None:trace.pump()
    except Exception as exc:
        failure={'type':type(exc).__name__,'code':getattr(exc,'code',None),'error':str(exc)[:500]}
        if trace is not None:trace.refusal=failure
    finally:
        signal.setitimer(signal.ITIMER_REAL,0)
        try:
            if pid is not None and pid>0:
                if trace is None:
                    # Keep unreaped-child ownership even if telemetry allocation failed.
                    trace=InvocationRecorderCollector.__new__(InvocationRecorderCollector)
                    trace.pid=pid;trace.pidfd=None;trace.wait_status=None;trace.aborted=False
                    trace.lib=ctypes.CDLL(None,use_errno=True)
                try:trace.abort()
                except Exception as exc:
                    failure={**(failure or {}),'cleanup_error':str(exc)[:500]}
                    trace.cleanup_failure=str(exc)[:500]
                finally:trace.close()
        finally:
            try:
                if stream is not None:
                    try:stream.flush();os.fsync(stream.fileno())
                    finally:stream.close()
            finally:signal.signal(signal.SIGALRM,previous_handler)
    if trace is None or not hasattr(trace,'ledger'):
        raise SourceHold('HOLD_V45_RECORDER_TELEMETRY_SETUP')
    raw=invocation_file(directory/'recorder-events.bin',len(RECORDER_EVENT_MAGIC)+48*RECORDER_EVENT_LIMIT)
    def optional_hash(path,limit):return sha256(invocation_file(path,limit)) if path.exists() else None
    record={'format':'VOID_V45_RECORDER_SYSCALL_CAPTURE_V5','source':source,'runtime':runtime,'kernel_identity':kernel_identity,
        'plan':list(RECORDER_FOCUS_PLAN),'scope':'recorder_initial_protocol_stop_through_terminal_wait',
        'launch_ns':launch_ns,'capture':trace.ledger.summary(),'events_sha256':sha256(raw),'events_bytes':len(raw),
        'inherited_standard_stream_bindings':inherited_standard_stream_bindings,'exit_descriptor_snapshot':trace.exit_snapshot,
        'process_local_exit_fds_retired':trace.wait_status==0 and trace.exit_snapshot is not None and not trace.aborted and trace.refusal is None,
        'journal_sha256':optional_hash(directory/'cases/journal.jsonl',INVOCATION_LIMITS['journal_bytes']),
        'recorder_result_sha256':optional_hash(directory/'recorder-result.json',2*1024*1024),
        'terminal_wait_status':trace.wait_status,'terminal_wait_ns':trace.terminal_ns,
        'wait4_rusage_including_waited_descendants':invocation_rusage_snapshot(trace.usage) if trace.usage else None,
        'wait4_additive':False,'refusal':trace.refusal,'aborted':trace.aborted,'cleanup_failure':trace.cleanup_failure,
        'pre_initial_stop_syscalls':None,'collector_syscalls':None,'exact_fd_peak':trace.ledger.summary()['exact_fd_peak'],
        'observer_syscalls_included':False,'worker_syscalls_included':False,'nested_syscalls_included':False,
        'whole_case_complete':False,'complete_resource_ledger':False,'full_job_process_census':False,
        'hard_execution_resource_ceiling':False,'full_campaign_accepted':False}
    if failure is None:
        try:
            record['capture_sha256']=sha256(invocation_canon(record))
            summary=verify_recorder_capture(record,raw,directory,source,runtime)
        except Exception as exc:
            failure={'type':type(exc).__name__,'code':getattr(exc,'code',None),'error':str(exc)[:500]}
    record.pop('capture_sha256',None);record['capture_sha256']=sha256(invocation_canon(record))
    write_exclusive(directory/'recorder-capture.json',invocation_canon(record))
    return {'focused_passed':failure is None,'source':source,'runtime':runtime,
            'plan':list(RECORDER_FOCUS_PLAN),'summary':summary,'failure':failure,'capture':record}


def local_invocation_manifest_main(args: list[str]) -> int:
    p=argparse.ArgumentParser();p.add_argument('--directory',required=True)
    selection=p.add_mutually_exclusive_group()
    selection.add_argument('--scenario',action='append',choices=INVOCATION_SCENARIOS)
    selection.add_argument('--all-live-cases',action='store_true')
    p.add_argument('--deadline-ms',type=int,default=35000);p.add_argument('--observe-workers',action='store_true');ns=p.parse_args(args)
    repo=Path(__file__).resolve().parents[1];source=invocation_source(repo);runtime=invocation_runtime()
    journal=(ObservedInvocationJournal if ns.observe_workers else InvocationJournal)(Path(ns.directory).absolute(),source,runtime,(list(INVOCATION_ALL_LIVE_PLAN) if ns.all_live_cases else ns.scenario or list(INVOCATION_PLAN)))
    try:
        for _ in journal.plan:journal.run_next(repo,deadline_ns=ns.deadline_ms*1000000)
        summary=journal.finish()
        print(json.dumps({k:v for k,v in summary.items() if k!='rows'},sort_keys=True))
        return 0 if summary['all_selected_completed'] else 2
    finally:journal.close()


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    p.add_argument("--supervisor-fd", type=int, required=True)
    p.add_argument("--bootstrap-supervisor-blob", required=True)
    p.add_argument("--repo-root", required=True)
    p.add_argument("--expected-head", required=True)
    p.add_argument("--expected-tree", required=True)
    p.add_argument("--node-major", type=int, choices=(0, 22, 24, 26), required=True)
    p.add_argument("--run-id", type=int, required=True)
    p.add_argument("--run-attempt", type=int, required=True)
    p.add_argument("--workflow-session", action="store_true")
    p.add_argument("--phase")
    p.add_argument("--entrypoint")
    p.add_argument("--receipt")
    p.add_argument("--snapshot-parent")
    p.add_argument("--owned-output", action="append", default=[])
    p.add_argument("--bind-output", action="append", default=[])
    p.add_argument("--stdout-output")
    p.add_argument("--stderr-output")
    p.add_argument("--path-token", action="append", default=[])
    p.add_argument("--entrypoint-stdin", action="store_true")
    p.add_argument("--expect-generation-hold", action="store_true")
    p.add_argument("--expect-hold", choices=(ARGV_HOLD, PREEXISTING_OUTPUT_HOLD))
    p.add_argument("--control-ready")
    p.add_argument("--control-continue")
    p.add_argument("--control-target")
    p.add_argument("command", nargs=argparse.REMAINDER)
    return p


if __name__ == "__main__":
    try:
        if sys.argv[1:2] == ['--local-invocation-manifest']:
            raise SystemExit(local_invocation_manifest_main(sys.argv[2:]))
        ns=parser().parse_args()
        raise SystemExit(workflow_session(ns) if ns.workflow_session else run(ns))
    except SourceHold as exc:
        print(json.dumps({"marker": HOLD_MARKER, "code": exc.code}, sort_keys=True), file=sys.stderr)
        raise

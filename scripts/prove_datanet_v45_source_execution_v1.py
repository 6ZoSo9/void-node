#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
"""Execute one V45 source entrypoint from an exact-HEAD retained snapshot."""
from __future__ import annotations

import argparse
import copy
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import pwd
import re
import shutil
import stat
import subprocess
import sys
import tempfile
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
        if self.published:
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
            os.rename(
                self.stage_names[role],
                path.name,
                src_dir_fd=self.staging_fd,
                dst_dir_fd=self.parent_fds[role],
            )
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
    fixture_data = git_bytes(repo, "cat-file", "blob", fixture_item["git_blob"])
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

    payloads: dict[str, bytes] = {}
    entries = {}
    total = 0
    for rel in paths:
        validate_relative(rel)
        item = tracked.get(rel)
        require(item is not None and item["type"] == "blob" and item["mode"] in ("100644", "100755"), "HOLD_V45_SOURCE_WALL_MEMBER")
        data = git_bytes(repo, "cat-file", "blob", item["git_blob"])
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
    return ["python3", "-I", "-B", "@ENTRYPOINT@", *tail]


def phase_spec(phase: str, node: int) -> dict:
    n = "@NODE_MAJOR@"
    head = "@EXPECTED_HEAD@"
    tree = "@EXPECTED_TREE@"
    per_node: dict[str, dict] = {
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
                "timeout", "--signal=TERM", "--kill-after=60s", "70m",
                "sudo", "strace", "-f", "-q", "-ttt", "-s", "4096",
                "-e", "trace=process,mount,umount2", "-o", "/dev/stderr", "-u", "@RUNNER_USER@",
                "/usr/bin/env", "-i", "PATH=@ENV_PATH@", "LANG=C.UTF-8",
                "GIT_DIR=@REPO_ROOT@/.git", "GIT_WORK_TREE=@REPO_ROOT@",
                "VOID_V45_NODE_MAJOR=@NODE_MAJOR@", "VOID_V45_RUN_ID=@RUN_ID@",
                "VOID_V45_RUN_ATTEMPT=@RUN_ATTEMPT@",
                "VOID_V45_EXPECTED_HEAD=@EXPECTED_HEAD@", "VOID_V45_OUT_DIR=@EVIDENCE_ROOT@",
                "/usr/bin/bash", "-s",
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
    try:
        container, root = build_snapshot(parent, payloads, source)
        retained = RetainedSnapshot(root, source["source_wall_entries"], source)
        retained.assert_stable()
        assert_supervisor_stable(ns, repo, supervisor_key, supervisor)
        entry = source["source_wall_entries"][ns.entrypoint]
        entrypoint = {
            "path": ns.entrypoint,
            "git_blob": entry["git_blob"],
            "sha256": entry["sha256"],
            "bytes": entry["bytes"],
            "mode": entry["mode"],
            "executed_from_retained_fd": True,
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
            write_exclusive(Path(ns.receipt), canonical(out))
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
            write_exclusive(Path(ns.receipt), canonical(out))
            return 0

        require(ns.control_ready is None and ns.control_continue is None and ns.control_target is None, "HOLD_V45_SOURCE_CONTROL_ARGUMENTS")
        owned = OwnedOutputs(outputs, parent)
        command, argument_bindings = replace_tokens(
            command_template, root, repo, retained.entry_fd(ns.entrypoint), ns, outputs, paths,
        )
        env = os.environ.copy()
        env.update({
            "GIT_DIR": str(repo / ".git"),
            "GIT_WORK_TREE": str(repo),
            "PYTHONDONTWRITEBYTECODE": "1",
            "VOID_V45_SOURCE_ROOT": str(root),
            "VOID_V45_SOURCE_INVENTORY_SHA256": sha256(canonical(source)),
            "VOID_V45_SOURCE_EXECUTION_PHASE": ns.phase,
            "VOID_V45_RUN_ID": str(ns.run_id),
            "VOID_V45_RUN_ATTEMPT": str(ns.run_attempt),
            "VOID_V45_OUTPUT_CUSTODY_V1": "1",
            "VOID_V45_OUTPUT_FDS": owned.environment(),
        })
        pass_fds = tuple(dict.fromkeys((retained.entry_fd(ns.entrypoint), *owned.pass_fds())))
        stdout_target = owned.descriptor(spec["stdout"]) if spec["stdout"] else (subprocess.PIPE if spec["pipe_stdout"] else None)
        stderr_target = owned.descriptor(spec["stderr"]) if spec["stderr"] else None
        completed = subprocess.run(
            command,
            cwd=root,
            env=env,
            check=False,
            stdin=retained.entry_fd(ns.entrypoint) if ns.entrypoint_stdin else None,
            stdout=stdout_target,
            stderr=stderr_target,
            pass_fds=pass_fds,
        )
        require(completed.returncode == 0, "HOLD_V45_SOURCE_CHILD_FAILED")
        retained.assert_stable()
        assert_supervisor_stable(ns, repo, supervisor_key, supervisor)
        owned.publish()
        created = {role: owned.binding(role) for role in spec["owned"]}
        if spec["stdout"]:
            stdout_data = owned.read(spec["stdout"])
            stdout_binding = created[spec["stdout"]]
        elif spec["pipe_stdout"]:
            stdout_data = completed.stdout or b""
            require(len(stdout_data) <= MAX_CHILD_STDOUT_BYTES, "HOLD_V45_CHILD_STDOUT_SIZE")
            stdout_binding = {
                "role": "SUPERVISOR_PIPE",
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
            "command_entrypoint_is_retained_fd": True,
            "child_started_after_source_admission": True,
            "child_returncode": completed.returncode,
            "source_generation_stable_through_child": True,
            "output_paths_absent_before_supervisor_create": True,
            "output_files_supervisor_create_only": True,
            "output_fds_retained_through_child": True,
            "output_generation_stable_through_child": True,
            "created_output_bindings": [created[role] for role in spec["owned"]],
            "output_bindings": bound_outputs,
            "stdout_captured_by_supervisor": spec["stdout"] is not None or spec["pipe_stdout"],
            "stdout_binding": stdout_binding,
            "stderr_captured_by_supervisor": spec["stderr"] is not None,
            "stderr_binding": stderr_binding,
        })
        write_exclusive(Path(ns.receipt), canonical(out))
        return 0
    finally:
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
    p.add_argument("--phase", required=True)
    p.add_argument("--entrypoint", required=True)
    p.add_argument("--receipt", required=True)
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
        raise SystemExit(run(parser().parse_args()))
    except SourceHold as exc:
        print(json.dumps({"marker": HOLD_MARKER, "code": exc.code}, sort_keys=True), file=sys.stderr)
        raise

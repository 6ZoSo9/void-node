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
HOLD_MARKER = "VOID_DATANET_V45_SOURCE_EXECUTION_HOLD"
GENERATION_HOLD = "HOLD_V45_SOURCE_GENERATION_CHANGED"
MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024
MAX_SOURCE_WALL_BYTES = 64 * 1024 * 1024


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


def stable_external(path: Path) -> bytes:
    require(path.is_absolute() and path.name not in ("", ".", ".."), "HOLD_V45_SOURCE_OUTPUT_PATH")
    dflags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fflags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    parent = os.open(path.parent, dflags)
    fd = -1
    try:
        parent_key = fingerprint(os.fstat(parent))
        named = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        fd = os.open(path.name, fflags, dir_fd=parent)
        before = os.fstat(fd)
        require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1, "HOLD_V45_SOURCE_OUTPUT_REGULAR")
        require(fingerprint(named) == fingerprint(before), "HOLD_V45_SOURCE_OUTPUT_GENERATION")
        data = pread_all(fd, before.st_size, "HOLD_V45_SOURCE_OUTPUT_READ")
        after = os.fstat(fd)
        require(fingerprint(before) == fingerprint(after), "HOLD_V45_SOURCE_OUTPUT_CHANGED")
        require(
            fingerprint(os.stat(path.name, dir_fd=parent, follow_symlinks=False)) == fingerprint(after),
            "HOLD_V45_SOURCE_OUTPUT_REPLACED",
        )
        require(fingerprint(os.fstat(parent)) == parent_key, "HOLD_V45_SOURCE_OUTPUT_PARENT_ABA")
        return data
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent)


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
        "snapshot_root": str(root),
        "target": ns.control_target,
    }))
    deadline = time.monotonic() + 30
    proceed = Path(ns.control_continue)
    while not proceed.exists():
        require(time.monotonic() < deadline, "HOLD_V45_SOURCE_CONTROL_TIMEOUT")
        time.sleep(0.02)


def replace_tokens(argv: list[str], root: Path, repo: Path, entry_fd: int) -> list[str]:
    entry = f"/proc/self/fd/{entry_fd}"
    replacements = {
        "@ENTRYPOINT@": entry,
        "@SOURCE_ROOT@": str(root),
        "@REPO_ROOT@": str(repo),
    }
    out = []
    for arg in argv:
        for token, value in replacements.items():
            arg = arg.replace(token, value)
        out.append(arg)
    return out


def receipt_base(ns: argparse.Namespace, source: dict, supervisor: dict, entrypoint: dict) -> dict:
    return {
        "v": 1,
        "phase": ns.phase,
        "node_major": ns.node_major,
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
    require(repo.is_absolute() and repo.is_dir(), "HOLD_V45_SOURCE_REPO_ROOT")
    source, payloads = source_tree(repo, ns.expected_head, ns.expected_tree)
    ns.source_paths = set(payloads)
    require(ns.entrypoint in payloads, "HOLD_V45_SOURCE_ENTRYPOINT")
    supervisor, supervisor_key = verify_supervisor(ns, repo, source)
    parent = Path(ns.snapshot_parent) if ns.snapshot_parent else Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir()))
    require(parent.is_absolute() and parent.is_dir(), "HOLD_V45_SOURCE_SNAPSHOT_PARENT")
    container = root = None
    retained = None
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
            })
            write_exclusive(Path(ns.receipt), canonical(out))
            return 0

        require(ns.control_ready is None and ns.control_continue is None and ns.control_target is None, "HOLD_V45_SOURCE_CONTROL_ARGUMENTS")
        command_template = list(ns.command)
        if command_template and command_template[0] == "--":
            command_template = command_template[1:]
        require(bool(command_template), "HOLD_V45_SOURCE_COMMAND_ENTRYPOINT")
        if ns.entrypoint_stdin:
            require(not any("@ENTRYPOINT@" in arg for arg in command_template), "HOLD_V45_SOURCE_COMMAND_ENTRYPOINT")
        else:
            require(any("@ENTRYPOINT@" in arg for arg in command_template), "HOLD_V45_SOURCE_COMMAND_ENTRYPOINT")
        command = replace_tokens(command_template, root, repo, retained.entry_fd(ns.entrypoint))
        env = os.environ.copy()
        env.update({
            "GIT_DIR": str(repo / ".git"),
            "GIT_WORK_TREE": str(repo),
            "PYTHONDONTWRITEBYTECODE": "1",
            "VOID_V45_SOURCE_ROOT": str(root),
            "VOID_V45_SOURCE_INVENTORY_SHA256": sha256(canonical(source)),
            "VOID_V45_SOURCE_EXECUTION_PHASE": ns.phase,
        })
        completed = subprocess.run(
            command,
            cwd=root,
            env=env,
            check=False,
            stdin=retained.entry_fd(ns.entrypoint) if ns.entrypoint_stdin else None,
            pass_fds=(retained.entry_fd(ns.entrypoint),),
        )
        require(completed.returncode == 0, "HOLD_V45_SOURCE_CHILD_FAILED")
        retained.assert_stable()
        assert_supervisor_stable(ns, repo, supervisor_key, supervisor)
        outputs = []
        for name in ns.bind_output:
            data = stable_external(Path(name))
            outputs.append({"name": Path(name).name, "bytes": len(data), "sha256": sha256(data)})
        out = sealed({
            **base,
            "marker": MARKER,
            "status": "GREEN",
            "command_template": command_template,
            "command_entrypoint_is_retained_fd": True,
            "child_started_after_source_admission": True,
            "child_returncode": completed.returncode,
            "source_generation_stable_through_child": True,
            "output_bindings": outputs,
        })
        write_exclusive(Path(ns.receipt), canonical(out))
        return 0
    finally:
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
    p.add_argument("--phase", required=True)
    p.add_argument("--entrypoint", required=True)
    p.add_argument("--receipt", required=True)
    p.add_argument("--snapshot-parent")
    p.add_argument("--bind-output", action="append", default=[])
    p.add_argument("--entrypoint-stdin", action="store_true")
    p.add_argument("--expect-generation-hold", action="store_true")
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

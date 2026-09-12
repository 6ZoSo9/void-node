#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
"""Independent, generation-bound terminal verifier for one V45 node artifact."""
from __future__ import annotations

import argparse
import ast
import copy
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import stat
import subprocess
import sys
import time

REPO = Path(__file__).resolve().parents[1]
FIXTURE = REPO / "fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"
PARENT_HEAD = "d73512174afd4f1f0f2591b11ae6bb9955e203ba"
CANDIDATE_MARKER = "VOID_DATANET_V45_FULL_STACK_AGGREGATE_CANDIDATE_V1_GREEN"
CONTROLS_MARKER = "VOID_DATANET_V45_FULL_STACK_AGGREGATE_CONTROLS_V1_GREEN"
AGGREGATE_MARKER = "VOID_DATANET_V45_FULL_STACK_EVIDENCE_AGGREGATE_V2_GREEN"
PRODUCER_CONTROL_MARKER = "VOID_DATANET_V45_PRODUCER_SUBSTITUTION_CONTROL_V1_GREEN"
TERMINAL_ABA_MARKER = "VOID_DATANET_V45_TERMINAL_ABA_CONTROL_V1_GREEN"
RUNTIME_MARKER = "VOID_DATANET_V45_RUNTIME_INVENTORY_V1_GREEN"
STATIC_MARKER = "VOID_DATANET_V45_FULL_STACK_EVIDENCE_COMPOSITION_STATIC_V1_GREEN"


class TerminalHold(AssertionError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def demand(condition: bool, code: str) -> None:
    if not condition:
        raise TerminalHold(code)


def canonical(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def fingerprint(st: os.stat_result) -> tuple[int, ...]:
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_nlink, st.st_uid, st.st_gid,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )


def receipt(st: os.stat_result, data: bytes) -> dict:
    return {
        "bytes": st.st_size,
        "sha256": sha256(data),
    }


def read_fd_fully(fd: int, expected: int) -> bytes:
    pieces = []
    left = expected
    while left > 0:
        piece = os.read(fd, min(left, 1024 * 1024))
        demand(bool(piece), "HOLD_V45_TERMINAL_SHORT_READ")
        pieces.append(piece)
        left -= len(piece)
    demand(os.read(fd, 1) == b"", "HOLD_V45_TERMINAL_SIZE_GROWTH")
    return b"".join(pieces)


def read_one_generation_record(
    path: Path, *, require_single_link: bool = True,
) -> tuple[bytes, os.stat_result]:
    demand(path.is_absolute() and path.name not in ("", ".", ".."), "HOLD_V45_TERMINAL_PATH")
    dflags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fflags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    parent = os.open(path.parent, dflags)
    fd = -1
    try:
        parent_key = fingerprint(os.fstat(parent))
        visible = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        fd = os.open(path.name, fflags, dir_fd=parent)
        before = os.fstat(fd)
        demand(
            stat.S_ISREG(before.st_mode) and before.st_nlink >= 1
            and (not require_single_link or before.st_nlink == 1),
            "HOLD_V45_TERMINAL_INPUT_REGULAR",
        )
        demand(fingerprint(visible) == fingerprint(before), "HOLD_V45_TERMINAL_INPUT_GENERATION")
        data = read_fd_fully(fd, before.st_size)
        after = os.fstat(fd)
        demand(fingerprint(after) == fingerprint(before), "HOLD_V45_TERMINAL_INPUT_CHANGED")
        demand(fingerprint(os.stat(path.name, dir_fd=parent, follow_symlinks=False)) == fingerprint(after), "HOLD_V45_TERMINAL_INPUT_REPLACED")
        demand(fingerprint(os.fstat(parent)) == parent_key, "HOLD_V45_TERMINAL_INPUT_ABA")
        return data, after
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent)


def read_one_generation(path: Path, *, require_single_link: bool = True) -> bytes:
    return read_one_generation_record(path, require_single_link=require_single_link)[0]


class BoundEvidence:
    def __init__(self, root: Path, expected: set[str]):
        demand(root.is_absolute() and root.name not in ("", ".", ".."), "HOLD_V45_TERMINAL_EVIDENCE_ROOT")
        demand(all(len(Path(name).parts) in (1, 2) and ".." not in Path(name).parts for name in expected), "HOLD_V45_TERMINAL_MEMBER_NAME")
        self.root = root
        self.expected = set(expected)
        self.parent_fd = -1
        self.root_fd = -1
        self.directories: dict[str, int] = {}
        self.files: dict[str, int] = {}
        self.dir_keys: dict[str, tuple[int, ...]] = {}
        self.file_keys: dict[str, tuple[int, ...]] = {}
        self.payloads: dict[str, bytes] = {}
        self.inventory: dict[str, dict] = {}
        try:
            self._bind()
        except BaseException:
            self.close()
            raise

    @staticmethod
    def dir_flags() -> int:
        return os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)

    def _bind(self) -> None:
        self.parent_fd = os.open(self.root.parent, self.dir_flags())
        parent_initial = os.fstat(self.parent_fd)
        root_named = os.stat(self.root.name, dir_fd=self.parent_fd, follow_symlinks=False)
        self.root_fd = os.open(self.root.name, self.dir_flags(), dir_fd=self.parent_fd)
        root_initial = os.fstat(self.root_fd)
        demand(stat.S_ISDIR(root_named.st_mode) and fingerprint(root_named) == fingerprint(root_initial), "HOLD_V45_TERMINAL_ROOT_GENERATION")

        top_files = {name for name in self.expected if len(Path(name).parts) == 1}
        child_dirs = {Path(name).parts[0] for name in self.expected if len(Path(name).parts) == 2}
        demand(set(os.listdir(self.root_fd)) == top_files | child_dirs, "HOLD_V45_TERMINAL_MEMBERSHIP")

        for dirname in sorted(child_dirs):
            named = os.stat(dirname, dir_fd=self.root_fd, follow_symlinks=False)
            fd = os.open(dirname, self.dir_flags(), dir_fd=self.root_fd)
            opened = os.fstat(fd)
            demand(stat.S_ISDIR(opened.st_mode) and fingerprint(named) == fingerprint(opened), "HOLD_V45_TERMINAL_DIRECTORY_GENERATION")
            wanted = {Path(name).parts[1] for name in self.expected if Path(name).parts[0] == dirname}
            demand(set(os.listdir(fd)) == wanted, "HOLD_V45_TERMINAL_MEMBERSHIP")
            self.directories[dirname] = fd

        flags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
        for name in sorted(self.expected):
            parts = Path(name).parts
            parent = self.root_fd if len(parts) == 1 else self.directories[parts[0]]
            named = os.stat(parts[-1], dir_fd=parent, follow_symlinks=False)
            fd = os.open(parts[-1], flags, dir_fd=parent)
            opened = os.fstat(fd)
            demand(stat.S_ISREG(opened.st_mode) and opened.st_nlink == 1, "HOLD_V45_TERMINAL_MEMBER_REGULAR")
            demand(fingerprint(named) == fingerprint(opened), "HOLD_V45_TERMINAL_MEMBER_GENERATION")
            data = read_fd_fully(fd, opened.st_size)
            final = os.fstat(fd)
            demand(fingerprint(opened) == fingerprint(final), "HOLD_V45_TERMINAL_MEMBER_CHANGED")
            self.files[name] = fd
            self.file_keys[name] = fingerprint(final)
            self.payloads[name] = data
            self.inventory[name] = receipt(final, data)

        self.dir_keys[".."] = fingerprint(parent_initial)
        self.dir_keys["."] = fingerprint(os.fstat(self.root_fd))
        for name, fd in self.directories.items():
            self.dir_keys[name] = fingerprint(os.fstat(fd))

    def raw(self, name: str) -> bytes:
        demand(name in self.payloads, "HOLD_V45_TERMINAL_MEMBER_LOOKUP")
        return self.payloads[name]

    def text(self, name: str) -> str:
        try:
            return self.raw(name).decode("utf-8", errors="strict")
        except UnicodeDecodeError as exc:
            raise TerminalHold("HOLD_V45_TERMINAL_UTF8") from exc

    def object(self, name: str) -> dict:
        try:
            value = json.loads(self.text(name))
        except json.JSONDecodeError as exc:
            raise TerminalHold("HOLD_V45_TERMINAL_JSON") from exc
        demand(isinstance(value, dict), "HOLD_V45_TERMINAL_JSON_OBJECT")
        return value

    def assert_current(self) -> None:
        demand(fingerprint(os.fstat(self.parent_fd)) == self.dir_keys[".."], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        demand(fingerprint(os.stat(self.root.name, dir_fd=self.parent_fd, follow_symlinks=False)) == self.dir_keys["."], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        demand(fingerprint(os.fstat(self.root_fd)) == self.dir_keys["."], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        top_files = {name for name in self.expected if len(Path(name).parts) == 1}
        child_dirs = {Path(name).parts[0] for name in self.expected if len(Path(name).parts) == 2}
        demand(set(os.listdir(self.root_fd)) == top_files | child_dirs, "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        for dirname, fd in self.directories.items():
            demand(fingerprint(os.fstat(fd)) == self.dir_keys[dirname], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
            demand(fingerprint(os.stat(dirname, dir_fd=self.root_fd, follow_symlinks=False)) == self.dir_keys[dirname], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
            wanted = {Path(name).parts[1] for name in self.expected if Path(name).parts[0] == dirname}
            demand(set(os.listdir(fd)) == wanted, "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        for name, fd in self.files.items():
            parts = Path(name).parts
            parent = self.root_fd if len(parts) == 1 else self.directories[parts[0]]
            demand(fingerprint(os.fstat(fd)) == self.file_keys[name], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
            demand(fingerprint(os.stat(parts[-1], dir_fd=parent, follow_symlinks=False)) == self.file_keys[name], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")

    def close(self) -> None:
        for fd in self.files.values():
            try:
                os.close(fd)
            except OSError:
                pass
        for fd in self.directories.values():
            try:
                os.close(fd)
            except OSError:
                pass
        for fd in (self.root_fd, self.parent_fd):
            if fd >= 0:
                try:
                    os.close(fd)
                except OSError:
                    pass
        self.files.clear()
        self.directories.clear()
        self.root_fd = self.parent_fd = -1


def base_names(node: int) -> set[str]:
    n = str(node)
    names = {
        f"v41-static-{n}.jsonl", f"v42-static-{n}.jsonl", f"v43-static-{n}.jsonl",
        f"v44-static-{n}.jsonl", f"v45-static-{n}.jsonl", f"datanet-v45-runtime-{n}.json",
        f"datanet-v45-process-{n}.trace", f"datanet-v45-runner-{n}.stdout.log",
        f"datanet-v45-runner-{n}.stderr.log", f"datanet-v43-v41-{n}.stdout.log",
        f"datanet-v43-v41-{n}.stderr.log", f"datanet-v43-pre-{n}.json",
        f"datanet-v43-post-{n}.json", f"datanet-v43-pre-{n}.jsonl",
        f"datanet-v43-post-{n}.jsonl", f"datanet-v43-final-{n}.json",
        f"datanet-v43-final-{n}.jsonl", f"datanet-v43-e0-pre-{n}.txt",
        f"datanet-v43-r0-pre-{n}.txt", f"datanet-v43-e0-post-{n}.txt",
        f"datanet-v43-r0-post-{n}.txt", f"datanet-v43-crash-copy-{n}.txt",
        f"datanet-v43-sources-{n}.txt", f"datanet-v45-v44-capture-{n}.json",
        f"datanet-v45-v44-capture-{n}.jsonl", f"datanet-v45-v44-corruption-{n}.json",
        f"datanet-v45-v44-corruption-{n}.jsonl", f"datanet-v45-v44-final-{n}.json",
        f"datanet-v45-v44-final-{n}.jsonl", f"datanet-v45-v44-raw-diff-{n}.txt",
        f"datanet-v45-v44-super-after-{n}.txt", f"datanet-v45-v44-loop-{n}.txt",
        f"datanet-v45-capability-release-{n}.json",
    }
    for leaf in ("aggregate.json", "manifest.json", "observer.json", "restart-census.json", "runtime.json"):
        names.add(f"datanet-v43-v41-evidence-{n}/{leaf}")
    return names


def decode_object(data: bytes, code: str) -> dict:
    try:
        value = json.loads(data.decode("utf-8", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise TerminalHold(code) from exc
    demand(isinstance(value, dict), code)
    return value


def verify_seal(value: dict, field: str, code: str) -> None:
    claimed = value.get(field)
    body = copy.deepcopy(value)
    body.pop(field, None)
    demand(isinstance(claimed, str) and len(claimed) == 64 and sha256(canonical(body)) == claimed, code)


def seal(value: dict, field: str) -> dict:
    out = copy.deepcopy(value)
    out.pop(field, None)
    out[field] = sha256(canonical(out))
    return out


def config() -> dict:
    fixture_bytes = read_one_generation(FIXTURE)
    expected_blob = subprocess.run(
        ["git", "rev-parse", "HEAD:fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ).stdout.strip()
    demand(git_blob(fixture_bytes) == expected_blob, "HOLD_V45_TERMINAL_FIXTURE_HEAD_DRIFT")
    cfg = decode_object(fixture_bytes, "HOLD_V45_TERMINAL_FIXTURE_JSON")
    demand(cfg.get("v") == 1 and cfg.get("parent_head") == PARENT_HEAD, "HOLD_V45_TERMINAL_FIXTURE")
    for rel, wanted in cfg.get("accepted_v44_blobs", {}).items():
        demand(git_blob(read_one_generation(REPO / rel)) == wanted, "HOLD_V45_TERMINAL_PARENT_BLOB")
    return cfg


def verify_dependency_closure(cfg: dict) -> None:
    wall = set(cfg.get("source_wall_paths", []))
    roots = cfg.get("source_wall_entrypoints")
    demand(isinstance(roots, list) and roots == sorted(set(roots)), "HOLD_V45_TERMINAL_ENTRYPOINTS")
    demand(set(roots) <= wall, "HOLD_V45_TERMINAL_ENTRYPOINT_WALL")
    queue = list(roots)
    data_queue: list[str] = []
    seen: set[str] = set()
    leaves: set[str] = set()

    def enqueue(rel: str) -> None:
        candidate = REPO / rel
        if not candidate.is_file():
            return
        if rel.startswith("scripts/"):
            if rel not in seen:
                queue.append(rel)
        elif rel not in leaves:
            leaves.add(rel)
            data_queue.append(rel)

    explicit_pattern = r"(?:\.github/workflows|docs|fixtures|scripts)/[A-Za-z0-9_.-]+\.(?:py|mjs|json|yml|md|sh)"
    while queue or data_queue:
        if not queue:
            rel = data_queue.pop(0)
            path = REPO / rel
            if path.suffix in (".json", ".yml", ".yaml"):
                text = read_one_generation(path).decode("utf-8", errors="strict")
                for item in re.findall(explicit_pattern, text):
                    enqueue(item)
            continue
        rel = queue.pop(0)
        if rel in seen:
            continue
        path = REPO / rel
        demand(path.is_file(), "HOLD_V45_TERMINAL_DEPENDENCY_MISSING")
        seen.add(rel)
        text = read_one_generation(path).decode("utf-8", errors="strict")
        if path.suffix == ".py":
            try:
                parsed = ast.parse(text, filename=rel)
            except SyntaxError as exc:
                raise TerminalHold("HOLD_V45_TERMINAL_DEPENDENCY_PARSE") from exc
            for node in ast.walk(parsed):
                if isinstance(node, ast.Import):
                    modules = [item.name.partition(".")[0] for item in node.names]
                elif isinstance(node, ast.ImportFrom) and node.module:
                    modules = [node.module.partition(".")[0]]
                else:
                    modules = []
                for module in modules:
                    enqueue(f"scripts/{module}.py")
                if isinstance(node, ast.Constant) and isinstance(node.value, str):
                    literal = node.value
                    for item in re.findall(explicit_pattern, literal):
                        enqueue(item)
                    for item in re.findall(r"[A-Za-z0-9_.-]+\.(?:py|mjs)", literal):
                        enqueue(f"scripts/{item}")
                    for item in re.findall(r"datanet-[A-Za-z0-9_.-]+\.json", literal):
                        enqueue(f"fixtures/{item}")
        elif path.suffix in (".mjs", ".js"):
            for item in re.findall(r"[\"'](\.\.?/[A-Za-z0-9_./-]+\.(?:mjs|js|json))[\"']", text):
                resolved = (path.parent / item).resolve()
                try:
                    enqueue(str(resolved.relative_to(REPO)))
                except ValueError as exc:
                    raise TerminalHold("HOLD_V45_TERMINAL_DEPENDENCY_ESCAPE") from exc
        else:
            for item in re.findall(explicit_pattern, text):
                enqueue(item)
    demand(seen | leaves <= wall, "HOLD_V45_TERMINAL_TRANSITIVE_WALL")


def command(*args: str) -> str:
    return subprocess.run(args, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def source_wall(cfg: dict) -> dict:
    verify_dependency_closure(cfg)
    head = command("git", "rev-parse", "HEAD")
    tree = command("git", "rev-parse", "HEAD^{tree}")
    listing = subprocess.run(["git", "ls-tree", "-r", "--full-tree", "HEAD"], check=True, stdout=subprocess.PIPE).stdout
    tracked = {}
    for line in listing.decode("utf-8", errors="strict").splitlines():
        left, rel = line.split("\t", 1)
        mode, kind, blob = left.split()
        tracked[rel] = {"mode": mode, "type": kind, "git_blob": blob}
    paths = cfg.get("source_wall_paths")
    demand(isinstance(paths, list) and paths == sorted(set(paths)), "HOLD_V45_TERMINAL_SOURCE_WALL_CANONICAL")
    entries = {}
    for rel in paths:
        item = tracked.get(rel)
        demand(item is not None and item["type"] == "blob", "HOLD_V45_TERMINAL_SOURCE_WALL_MEMBER")
        source_path = REPO / rel
        data, source_stat = read_one_generation_record(source_path)
        demand(git_blob(data) == item["git_blob"], "HOLD_V45_TERMINAL_SOURCE_DRIFT")
        worktree_mode = stat.S_IMODE(source_stat.st_mode)
        worktree_git_mode = "100755" if worktree_mode & 0o111 else "100644"
        demand(worktree_git_mode == item["mode"], "HOLD_V45_TERMINAL_SOURCE_MODE_DRIFT")
        entries[rel] = {**item, "worktree_mode": worktree_mode, "bytes": len(data), "sha256": sha256(data)}
    return {
        "head": head,
        "tree": tree,
        "recursive_entry_count": len(listing.splitlines()),
        "recursive_listing_sha256": sha256(listing),
        "source_wall_paths_sha256": sha256(canonical({"paths": paths})),
        "source_wall_entry_count": len(entries),
        "source_wall_entries": entries,
        "transitive_source_wall_verified": True,
    }


RUNTIME_COMMANDS = [
    "git", "bash", "python3", "node", "sudo", "strace", "dd", "mkfs.ext4", "tune2fs",
    "losetup", "blockdev", "dmsetup", "mount", "umount", "cp", "cmp", "sha256sum",
    "sync", "grep", "awk", "findmnt", "mountpoint", "jq", "fallocate", "ln",
]


def runtime_identity(node: int, cfg: dict) -> dict:
    version = command("node", "--version")
    demand(version.lstrip("v").split(".", 1)[0] == str(node), "HOLD_V45_TERMINAL_NODE_MAJOR")
    executables = {}
    for name in RUNTIME_COMMANDS:
        found = shutil.which(name)
        demand(found is not None, "HOLD_V45_TERMINAL_EXECUTABLE")
        path = Path(found).resolve()
        st = path.stat()
        demand(stat.S_ISREG(st.st_mode), "HOLD_V45_TERMINAL_EXECUTABLE_REGULAR")
        executables[name] = {
            "requested": name,
            "path": str(path),
            "bytes": st.st_size,
            "mode": stat.S_IMODE(st.st_mode),
            "uid": st.st_uid,
            "sha256": sha256(read_one_generation(path, require_single_link=False)),
        }
    return {
        "marker": RUNTIME_MARKER,
        "status": "GREEN",
        "node_major": node,
        "node_version": version,
        "python_version": platform.python_version(),
        "kernel": platform.release(),
        "machine": platform.machine(),
        "system": platform.system(),
        "source": source_wall(cfg),
        "executables": executables,
        "production_runtime_touched": False,
    }


def last_json(text: str) -> dict:
    rows = [row for row in text.splitlines() if row]
    demand(bool(rows), "HOLD_V45_TERMINAL_EMPTY_LOG")
    try:
        obj = json.loads(rows[-1])
    except json.JSONDecodeError as exc:
        raise TerminalHold("HOLD_V45_TERMINAL_LOG_JSON") from exc
    demand(isinstance(obj, dict), "HOLD_V45_TERMINAL_LOG_OBJECT")
    return obj


def key_values(text: str) -> dict[str, str]:
    result = {}
    for row in text.splitlines():
        if not row:
            continue
        pieces = row.split("=", 1)
        demand(len(pieces) == 2 and pieces[0] not in result, "HOLD_V45_TERMINAL_KV")
        result[pieces[0]] = pieces[1]
    return result


def superblock(text: str) -> dict:
    feature_line = next((line for line in text.splitlines() if line.startswith("Filesystem features:")), "")
    return {
        "sha256": sha256(text.encode("utf-8")),
        "needs_recovery": "needs_recovery" in text,
        "verity": "verity" in feature_line.split(),
    }


def tier_receipt(ev: BoundEvidence, node: int, cfg: dict) -> dict:
    static_markers = {
        "v41": "VOID_DATANET_V41_FSVERITY_GENERATION_BOUND_RECORD_COMPOSITION_STATIC_V1_GREEN",
        "v42": "VOID_DATANET_V42_FSVERITY_CLEAN_REMOUNT_STATIC_V1_GREEN",
        "v43": "VOID_DATANET_V43_FSVERITY_SUDDEN_LOSS_RECOVERY_STATIC_V1_GREEN",
        "v44": "VOID_DATANET_V44_FSVERITY_RAW_CORRUPTION_DETECTION_STATIC_V1_GREEN",
        "v45": STATIC_MARKER,
    }
    for version, marker in static_markers.items():
        row = last_json(ev.text(f"{version}-static-{node}.jsonl"))
        demand(row.get("marker") == marker and row.get("status") == "GREEN", "HOLD_V45_TERMINAL_STATIC_CHILD")

    demand(ev.raw(f"datanet-v43-v41-{node}.stderr.log") == b"", "HOLD_V45_TERMINAL_STDERR")
    demand(ev.raw(f"datanet-v45-runner-{node}.stderr.log") == b"", "HOLD_V45_TERMINAL_STDERR")
    campaign = last_json(ev.text(f"datanet-v43-v41-{node}.stdout.log"))
    runner = last_json(ev.text(f"datanet-v45-runner-{node}.stdout.log"))
    demand(campaign.get("marker") == "VOID_DATANET_V41_DURABLE_RECOVERY_CAMPAIGN_V1_GREEN", "HOLD_V45_TERMINAL_V41_MARKER")
    demand(campaign.get("payload_ledger", {}).get("calls") == 15372 and campaign.get("payload_ledger", {}).get("completed_mib") == 960, "HOLD_V45_TERMINAL_V41_LEDGER")
    demand(campaign.get("process_topology", {}).get("total_lifetimes") == 27 and campaign.get("process_topology", {}).get("peak_live") == 9, "HOLD_V45_TERMINAL_V41_TOPOLOGY")
    demand(campaign.get("fsverity_record_immutability") is True and campaign.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_V41_STATUS")
    demand(runner.get("marker") == "VOID_DATANET_V45_V43_V44_FULL_STACK_RUN_V1_GREEN", "HOLD_V45_TERMINAL_RUNNER")

    prefix = f"datanet-v43-v41-evidence-{node}"
    manifest = ev.object(f"{prefix}/manifest.json")
    restart = ev.object(f"{prefix}/restart-census.json")
    demand(len(restart.get("e0", {}).get("entries", [])) == cfg["ceilings"]["e0_namespace_entries"], "HOLD_V45_TERMINAL_E0_ENTRIES")
    demand(len(restart.get("r0", {}).get("entries", [])) == cfg["ceilings"]["r0_namespace_entries"], "HOLD_V45_TERMINAL_R0_ENTRIES")

    pre = f"datanet-v43-pre-{node}.json"
    post = f"datanet-v43-post-{node}.json"
    demand(ev.raw(pre) == ev.raw(post), "HOLD_V45_TERMINAL_PRE_POST")
    snapshot = ev.object(post)
    demand(snapshot.get("marker") == "VOID_DATANET_V42_FSVERITY_REMOUNT_SNAPSHOT_V1_GREEN", "HOLD_V45_TERMINAL_V42_MARKER")
    demand(snapshot.get("payload_leaves_verified") == 3 and snapshot.get("recovery_records_verified") == 3, "HOLD_V45_TERMINAL_V42_COUNTS")
    demand(set(snapshot.get("records", {})) == {"armed", "claimed", "closed"}, "HOLD_V45_TERMINAL_RECORD_SET")
    for record in snapshot["records"].values():
        demand(record.get("bytes", cfg["ceilings"]["recovery_record_max_bytes"] + 1) <= cfg["ceilings"]["recovery_record_max_bytes"], "HOLD_V45_TERMINAL_RECORD_SIZE")

    v43_name = f"datanet-v43-final-{node}.json"
    demand(ev.raw(v43_name) == ev.raw(f"datanet-v43-final-{node}.jsonl"), "HOLD_V45_TERMINAL_V43_DUPLICATE")
    v43 = ev.object(v43_name)
    v43_true = (
        "simulated_sudden_device_loss_proved", "device_mapper_suspend_noflush",
        "snapshot_before_clean_unmount", "crash_image_needs_recovery_pre_replay",
        "same_mapper_device_identity_recreated", "journal_replay_recovery_completed",
        "pre_post_v42_snapshot_equal", "record_inode_generation_stable",
        "record_fsverity_digest_stable", "fresh_v41_admission_after_recovery",
        "same_uid_inplace_mutation_denied_after_recovery",
    )
    demand(all(v43.get(key) is True for key in v43_true), "HOLD_V45_TERMINAL_V43_CLAIM")
    demand(v43.get("physical_power_loss_proved") is False and v43.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_V43_NONCLAIM")
    pre_states = [superblock(ev.text(f"datanet-v43-{side}-pre-{node}.txt")) for side in ("e0", "r0")]
    post_states = [superblock(ev.text(f"datanet-v43-{side}-post-{node}.txt")) for side in ("e0", "r0")]
    demand(all(item["needs_recovery"] and item["verity"] for item in pre_states), "HOLD_V45_TERMINAL_PRE_SUPER")
    demand(all(not item["needs_recovery"] and item["verity"] for item in post_states), "HOLD_V45_TERMINAL_POST_SUPER")
    crash = key_values(ev.text(f"datanet-v43-crash-copy-{node}.txt"))
    demand(crash.get("e0_source_sha256") == crash.get("e0_crash_sha256") and crash.get("r0_source_sha256") == crash.get("r0_crash_sha256"), "HOLD_V45_TERMINAL_CRASH_COPY")
    sources = key_values(ev.text(f"datanet-v43-sources-{node}.txt"))
    demand(sources.get("e0_before") == sources.get("e0_after") and sources.get("r0_before") == sources.get("r0_after"), "HOLD_V45_TERMINAL_MAPPER_SOURCE")
    demand(sources.get("e0_dm_before") == sources.get("e0_dm_after") and sources.get("r0_dm_before") == sources.get("r0_dm_after"), "HOLD_V45_TERMINAL_MAPPER_IDENTITY")

    capture = ev.object(f"datanet-v45-v44-capture-{node}.json")
    verify_seal(capture, "manifest_sha256", "HOLD_V45_TERMINAL_CAPTURE_SEAL")
    demand(capture.get("marker") == "VOID_DATANET_V44_FSVERITY_RAW_PREIMAGE_CAPTURE_V1_GREEN", "HOLD_V45_TERMINAL_CAPTURE_MARKER")
    demand(capture.get("raw_preimage_matches_sealed_record") is True and capture.get("fiemap_sync_flag_used") is False, "HOLD_V45_TERMINAL_PREIMAGE")
    closed = snapshot["records"]["closed"]
    demand(capture.get("record_identity") == closed.get("identity"), "HOLD_V45_TERMINAL_RECORD_IDENTITY")
    demand(capture.get("record_generation") == closed.get("generation"), "HOLD_V45_TERMINAL_RECORD_GENERATION")
    demand(capture.get("record_sha256") == closed.get("sha256") and capture.get("fsverity") == closed.get("fsverity"), "HOLD_V45_TERMINAL_RECORD_BINDING")

    corrupt_name = f"datanet-v45-v44-corruption-{node}.json"
    demand(ev.raw(corrupt_name) == ev.raw(f"datanet-v45-v44-corruption-{node}.jsonl"), "HOLD_V45_TERMINAL_CORRUPTION_DUPLICATE")
    corrupt = ev.object(corrupt_name)
    demand(corrupt.get("manifest_sha256") == capture.get("manifest_sha256"), "HOLD_V45_TERMINAL_CORRUPTION_BINDING")
    demand(corrupt.get("bytes_written") == cfg["ceilings"]["raw_corruption_bytes"], "HOLD_V45_TERMINAL_CORRUPTION_BYTES")
    demand((corrupt.get("before_hex"), corrupt.get("after_hex"), corrupt.get("xor_mask")) == ("7b", "7a", 1), "HOLD_V45_TERMINAL_CORRUPTION_VALUE")
    diff = ev.text(f"datanet-v45-v44-raw-diff-{node}.txt").split()
    demand(len(diff) == 3 and int(diff[0]) == corrupt["physical_offset"] + 1, "HOLD_V45_TERMINAL_RAW_DIFF")
    demand(int(diff[1], 8) == int(corrupt["before_hex"], 16) and int(diff[2], 8) == int(corrupt["after_hex"], 16), "HOLD_V45_TERMINAL_RAW_DIFF_VALUE")

    v44_name = f"datanet-v45-v44-final-{node}.json"
    demand(ev.raw(v44_name) == ev.raw(f"datanet-v45-v44-final-{node}.jsonl"), "HOLD_V45_TERMINAL_V44_DUPLICATE")
    v44 = ev.object(v44_name)
    v44_true = (
        "record_identity_stable", "record_generation_stable", "record_metadata_stable",
        "fsverity_root_digest_stable", "fsverity_data_read_eio",
        "actual_v41_admission_fails_on_corrupted_record", "same_uid_write_denied",
        "same_uid_rdwr_denied", "same_uid_truncate_denied",
    )
    demand(all(v44.get(key) is True for key in v44_true), "HOLD_V45_TERMINAL_V44_CLAIM")
    demand(v44.get("fsverity_data_read_errno") == 5 and v44.get("actual_v41_admission_errno") == 5, "HOLD_V45_TERMINAL_V44_EIO")
    demand(v44.get("physical_power_loss_proved") is False and v44.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_V44_NONCLAIM")
    v44_super = superblock(ev.text(f"datanet-v45-v44-super-after-{node}.txt"))
    demand(v44_super["verity"] and not v44_super["needs_recovery"], "HOLD_V45_TERMINAL_V44_SUPER")
    loop = key_values(ev.text(f"datanet-v45-v44-loop-{node}.txt"))
    fields = loop.get("dm_table", "").split()
    demand(loop.get("offset") == "0" and loop.get("sizelimit") == "0", "HOLD_V45_TERMINAL_LOOP")
    demand(loop.get("dm_name", "").startswith(f"void-v43-r0-{node}-") and len(fields) >= 5 and fields[0] == "0" and fields[2] == "linear" and fields[4] == "0", "HOLD_V45_TERMINAL_DM")

    return {
        "ordered_markers": [
            campaign["marker"], snapshot["marker"], v43["marker"], capture["marker"],
            corrupt["marker"], v44["marker"],
        ],
        "v41": {
            "total_lifetimes": 27, "peak_live": 9, "payload_calls": 15372,
            "completed_mib": 960, "source_bindings": manifest["source_bindings"],
        },
        "v43": {
            "snapshot_sha256": v43["snapshot_sha256"],
            "journal_replay_recovery_completed": True,
            "record_fsverity_digest_stable": True,
        },
        "v44": {
            "manifest_sha256": capture["manifest_sha256"],
            "record_identity": capture["record_identity"],
            "record_generation": capture["record_generation"],
            "record_sha256": capture["record_sha256"],
            "fsverity": capture["fsverity"],
            "raw_mutation_bytes": 1,
            "direct_read_errno": 5,
            "v41_admission_errno": 5,
        },
        "same_recovered_r0_record_composed": True,
    }


def trace_records(data: bytes) -> list[tuple[int, float, int, str]]:
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise TerminalHold("HOLD_V45_TERMINAL_TRACE_UTF8") from exc
    incomplete: dict[tuple[int, str], tuple[int, float, str]] = {}
    complete = []
    order = 0
    line_pattern = re.compile(r"^(\d+)\s+([0-9]+(?:\.[0-9]+)?)\s+(.*)$")
    resumed_pattern = re.compile(r"^<\.\.\.\s+([A-Za-z0-9_]+) resumed>(.*)$")
    for line in text.splitlines():
        found = line_pattern.match(line)
        demand(found is not None, "HOLD_V45_TERMINAL_TRACE_LINE")
        pid, timestamp, body = int(found.group(1)), float(found.group(2)), found.group(3)
        if body.endswith("<unfinished ...>"):
            call = body.split("(", 1)[0].strip()
            demand((pid, call) not in incomplete, "HOLD_V45_TERMINAL_TRACE_PENDING")
            incomplete[(pid, call)] = (order, timestamp, body[:-len("<unfinished ...>")].rstrip())
        else:
            resumed = resumed_pattern.match(body)
            if resumed:
                prior = incomplete.pop((pid, resumed.group(1)), None)
                demand(prior is not None, "HOLD_V45_TERMINAL_TRACE_RESUME")
                prior_order, prior_time, prefix = prior
                complete.append((prior_order, prior_time, pid, prefix + resumed.group(2)))
            else:
                complete.append((order, timestamp, pid, body))
        order += 1
    demand(not incomplete and bool(complete), "HOLD_V45_TERMINAL_TRACE_INCOMPLETE")
    return sorted(complete, key=lambda row: (row[1], row[0]))


def result_number(body: str) -> int | None:
    found = re.search(r"\)\s+=\s+(-?\d+)\s*$", body)
    return int(found.group(1)) if found else None


def runner_census(data: bytes, ceilings: dict) -> dict:
    records = trace_records(data)
    root_pid = records[0][2]
    owner = {root_pid: root_pid}
    live = {root_pid}
    lifetimes = {root_pid}
    peak = 1
    paths: dict[str, int] = {}
    basenames: dict[str, int] = {}
    exec_rows = []
    mounts = unmounts = 0
    for _, _, pid, body in records:
        result = result_number(body)
        if body.startswith("execve(") and result == 0:
            found = re.match(r'execve\("([^"]+)"', body)
            demand(found is not None, "HOLD_V45_TERMINAL_EXEC_PATH")
            path = found.group(1)
            paths[path] = paths.get(path, 0) + 1
            base = Path(path).name
            basenames[base] = basenames.get(base, 0) + 1
            exec_rows.append(body)
        if body.startswith("mount(") and result == 0:
            mounts += 1
        if body.startswith("umount2(") and result == 0:
            unmounts += 1
        if body.startswith(("fork(", "vfork(", "clone(", "clone3(")) and result is not None and result > 0:
            threaded = body.startswith(("clone(", "clone3(")) and "CLONE_THREAD" in body
            owner[result] = owner.get(pid, pid) if threaded else result
            if not threaded:
                lifetimes.add(result)
                live.add(result)
                peak = max(peak, len(live))
        if body.startswith("exit_group(") or body.startswith("+++ exited with") or body.startswith("+++ killed by"):
            live.discard(owner.get(pid, pid))

    def count(*needles: str) -> int:
        return sum(1 for row in exec_rows if all(needle in row for needle in needles))

    v41_rows = [row for row in exec_rows if "prove_datanet_v41_durable_recovery_campaign_ext4_v1.py" in row]
    demand(not live, "HOLD_V45_TERMINAL_RUNNER_LIFETIME")
    demand(len(lifetimes) <= ceilings["process_lifetimes_max"] and peak <= ceilings["peak_processes_max"], "HOLD_V45_TERMINAL_RUNNER_PROCESS_CEILING")
    demand(len(exec_rows) <= ceilings["successful_execve_max"], "HOLD_V45_TERMINAL_RUNNER_EXEC_CEILING")
    demand(sum(1 for row in v41_rows if '"--mode"' not in row) == 1, "HOLD_V45_TERMINAL_V41_EXEC")
    demand(count("prove_datanet_v42_fsverity_clean_remount_v1.py", '"capture"') == 2, "HOLD_V45_TERMINAL_V42_EXEC")
    demand(count("prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", '"verify"') == 1, "HOLD_V45_TERMINAL_V43_EXEC")
    demand(count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", '"capture"') == 1, "HOLD_V45_TERMINAL_V44_CAPTURE")
    demand(count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", '"corrupt"') == 1, "HOLD_V45_TERMINAL_V44_CORRUPT")
    demand(count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", '"verify"') == 1, "HOLD_V45_TERMINAL_V44_VERIFY")
    demand(count('execve("/usr/sbin/dmsetup"', '"suspend"', '"--noflush"') == 2, "HOLD_V45_TERMINAL_DM_SUSPEND")
    demand(mounts >= 7 and unmounts >= 7, "HOLD_V45_TERMINAL_MOUNT_CENSUS")
    return {
        "trace_sha256": sha256(data),
        "trace_bytes": len(data),
        "root_pid": root_pid,
        "runner_subgraph_process_lifetimes": len(lifetimes),
        "runner_subgraph_peak_processes": peak,
        "successful_execve": len(exec_rows),
        "exec_paths": dict(sorted(paths.items())),
        "exec_basenames": dict(sorted(basenames.items())),
        "mount_syscalls_success": mounts,
        "umount2_syscalls_success": unmounts,
        "all_runner_subgraph_process_lifetimes_closed": True,
        "full_job_process_census": False,
        "v41_campaign_entry_execs": 1,
        "v41_campaign_role_execs": len(v41_rows),
        "v42_capture_execs": 2,
        "v43_verify_execs": 1,
        "v44_capture_execs": 1,
        "v44_corrupt_execs": 1,
        "v44_verify_execs": 1,
        "dm_suspend_noflush_execs": 2,
    }


def released(receipt_obj: dict) -> dict:
    release_keys = ("all_images_removed", "all_loops_released", "all_mappers_released", "all_mounts_released")
    demand(all(receipt_obj.get(key) is True for key in release_keys), "HOLD_V45_TERMINAL_RELEASE_RECEIPT")
    demand(receipt_obj.get("marker") == "VOID_DATANET_V45_CAPABILITY_RELEASE_V1_GREEN", "HOLD_V45_TERMINAL_RELEASE_MARKER")
    demand(receipt_obj.get("status") == "GREEN" and receipt_obj.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_RELEASE_STATUS")
    token = receipt_obj.get("resource_token")
    demand(isinstance(token, str) and token.startswith("void-v43-"), "HOLD_V45_TERMINAL_RESOURCE_TOKEN")
    live = Path("/proc/self/mountinfo").read_text(encoding="utf-8", errors="strict")
    for pattern in ("loop*/loop/backing_file", "dm-*/dm/name"):
        for path in Path("/sys/block").glob(pattern):
            try:
                live += "\n" + path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                pass
    demand(token not in live, "HOLD_V45_TERMINAL_LIVE_CAPABILITY")
    return {"resource_token": token, "kernel_scan_clear": True, **{key: True for key in release_keys}}


def reconstructed(ev: BoundEvidence, node: int, cfg: dict, head: str, tree: str) -> dict:
    source = source_wall(cfg)
    demand(source["head"] == head and source["tree"] == tree, "HOLD_V45_TERMINAL_SOURCE_BINDING")
    runtime = runtime_identity(node, cfg)
    recorded_runtime = ev.object(f"datanet-v45-runtime-{node}.json")
    demand(recorded_runtime == runtime, "HOLD_V45_TERMINAL_RUNTIME_RECONSTRUCTION")
    tiers = tier_receipt(ev, node, cfg)
    process = runner_census(ev.raw(f"datanet-v45-process-{node}.trace"), cfg["ceilings"])
    capability = released(ev.object(f"datanet-v45-capability-release-{node}.json"))
    return {"source": source, "runtime": runtime, "tiers": tiers, "process": process, "capability": capability}


EXPECTED_REJECTIONS = {
    "missing": "HOLD_V45_ARTIFACT_MEMBERSHIP",
    "substituted": "HOLD_V45_ARTIFACT_DIGEST",
    "mixed_head": "HOLD_V45_MIXED_HEAD",
    "mixed_tree": "HOLD_V45_MIXED_TREE",
    "premature": "HOLD_V45_PREMATURE_AGGREGATE",
}


def validate_candidate(candidate: dict, evidence_inventory: dict, rebuilt: dict, head: str, tree: str) -> None:
    verify_seal(candidate, "candidate_sha256", "HOLD_V45_TERMINAL_CANDIDATE_SEAL")
    demand(candidate.get("marker") == CANDIDATE_MARKER and candidate.get("status") == "GREEN", "HOLD_V45_TERMINAL_CANDIDATE_MARKER")
    demand(candidate.get("head") == head and candidate.get("source", {}).get("head") == head, "HOLD_V45_TERMINAL_MIXED_HEAD")
    demand(candidate.get("tree") == tree and candidate.get("source", {}).get("tree") == tree, "HOLD_V45_TERMINAL_MIXED_TREE")
    demand(candidate.get("parent_head") == PARENT_HEAD, "HOLD_V45_TERMINAL_PARENT_HEAD")
    demand(candidate.get("input_inventory") == evidence_inventory, "HOLD_V45_TERMINAL_ARTIFACT_RECONSTRUCTION")
    demand(candidate.get("source") == rebuilt["source"], "HOLD_V45_TERMINAL_SOURCE_RECONSTRUCTION")
    demand(candidate.get("runtime") == rebuilt["runtime"], "HOLD_V45_TERMINAL_RUNTIME_RECONSTRUCTION")
    demand(candidate.get("tiers") == rebuilt["tiers"], "HOLD_V45_TERMINAL_TIER_RECONSTRUCTION")
    demand(candidate.get("runner_subgraph_process_census") == rebuilt["process"], "HOLD_V45_TERMINAL_PROCESS_RECONSTRUCTION")
    demand(candidate.get("capability_release") == rebuilt["capability"], "HOLD_V45_TERMINAL_CAPABILITY_RECONSTRUCTION")
    accounting = candidate.get("process_accounting", {})
    untraced = accounting.get("untraced_phases", {})
    demand(
        accounting.get("scope") == "runner_subgraph_only"
        and accounting.get("runner_subgraph", {}).get("trace_complete_within_subgraph") is True
        and accounting.get("runner_subgraph", {}).get("process_lifetimes") == rebuilt["process"]["runner_subgraph_process_lifetimes"]
        and accounting.get("runner_subgraph", {}).get("successful_execve") == rebuilt["process"]["successful_execve"]
        and accounting.get("runner_subgraph", {}).get("peak_processes") == rebuilt["process"]["runner_subgraph_peak_processes"]
        and accounting.get("full_job_process_census") is False
        and set(untraced) == {
            "preallocation_static_runtime", "candidate_aba_control", "candidate",
            "candidate_controls", "producer_substitution_control", "terminal_aba_control",
            "terminal_verifier", "artifact_upload", "cross_runtime_aggregate",
        }
        and all(
            row == {"trace_complete": False, "process_lifetimes": None, "successful_execve": None}
            for row in untraced.values()
        ),
        "HOLD_V45_TERMINAL_PROCESS_SCOPE",
    )
    demand(candidate.get("artifact_generation_bound") is True, "HOLD_V45_TERMINAL_CANDIDATE_GENERATION")
    demand(candidate.get("mutators_retired") is True and candidate.get("capabilities_released") is True, "HOLD_V45_TERMINAL_PREMATURE")
    demand(candidate.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_PRODUCTION_TOUCH")


def validate_controls(controls: dict, candidate: dict, *, substituted: bool = False) -> None:
    verify_seal(controls, "controls_sha256", "HOLD_V45_TERMINAL_CONTROLS_SEAL")
    demand(controls.get("marker") == CONTROLS_MARKER and controls.get("status") == "GREEN", "HOLD_V45_TERMINAL_CONTROLS_MARKER")
    demand(controls.get("candidate_sha256") == candidate.get("candidate_sha256"), "HOLD_V45_TERMINAL_CONTROLS_BINDING")
    demand(controls.get("rejections") == EXPECTED_REJECTIONS and controls.get("all_rejected") is True, "HOLD_V45_TERMINAL_CONTROLS_RESULT")
    demand(controls.get("control_implementation_imports_candidate") is False, "HOLD_V45_TERMINAL_CONTROL_COUPLING")
    aba = controls.get("candidate_generation_aba_control", {})
    demand(isinstance(aba, dict), "HOLD_V45_TERMINAL_CANDIDATE_ABA_CONTROL")
    verify_seal(aba, "receipt_sha256", "HOLD_V45_TERMINAL_CANDIDATE_ABA_SEAL")
    demand(aba.get("marker") == "VOID_DATANET_V45_CANDIDATE_ABA_CONTROL_V1_GREEN" and aba.get("rejection") == "HOLD_V45_ARTIFACT_GENERATION_CHANGED", "HOLD_V45_TERMINAL_CANDIDATE_ABA_CONTROL")
    producer = controls.get("producer_substitution_fixture", {})
    demand(
        isinstance(producer, dict)
        and producer.get("changed_predicate") == "tiers.v44.direct_read_errno"
        and producer.get("original") == 5
        and producer.get("substituted") == 0
        and isinstance(producer.get("candidate_sha256"), str)
        and len(producer["candidate_sha256"]) == 64
        and ((producer["candidate_sha256"] == candidate.get("candidate_sha256")) is substituted),
        "HOLD_V45_TERMINAL_PRODUCER_FIXTURE_BINDING",
    )
    demand(controls.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_PRODUCTION_TOUCH")


def validate_control_receipt(obj: dict, marker: str, rejection: str) -> None:
    verify_seal(obj, "receipt_sha256", "HOLD_V45_TERMINAL_CONTROL_RECEIPT_SEAL")
    demand(obj.get("marker") == marker and obj.get("status") == "GREEN", "HOLD_V45_TERMINAL_CONTROL_RECEIPT_MARKER")
    demand(obj.get("rejection") == rejection and obj.get("production_runtime_touched") is False, "HOLD_V45_TERMINAL_CONTROL_RECEIPT_RESULT")


def pause_for_aba(ns: argparse.Namespace) -> None:
    ready = getattr(ns, "generation_control_ready", None)
    proceed = getattr(ns, "generation_control_continue", None)
    demand(isinstance(ready, str) and isinstance(proceed, str), "HOLD_V45_TERMINAL_ABA_ARGUMENTS")
    ready_path = Path(ready)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(ready_path, flags, 0o600)
    try:
        os.write(fd, b"terminal-snapshot-retained\n")
        os.fsync(fd)
    finally:
        os.close(fd)
    deadline = time.monotonic() + 30
    while not Path(proceed).exists():
        demand(time.monotonic() < deadline, "HOLD_V45_TERMINAL_ABA_TIMEOUT")
        time.sleep(0.02)


def write_exclusive(path: Path, obj: dict) -> None:
    data = canonical(obj)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags, 0o600)
    try:
        offset = 0
        while offset < len(data):
            count = os.write(fd, data[offset:])
            demand(count > 0, "HOLD_V45_TERMINAL_OUTPUT_WRITE")
            offset += count
        os.fsync(fd)
    finally:
        os.close(fd)


def normal_names(node: int, stage: str) -> set[str]:
    names = base_names(node) | {
        f"datanet-v45-candidate-{node}.json",
        f"datanet-v45-controls-{node}.json",
    }
    if stage in ("terminal-aba", "final"):
        names.add(f"datanet-v45-producer-substitution-control-{node}.json")
    if stage == "final":
        names.add(f"datanet-v45-terminal-aba-control-{node}.json")
    return names


def verify_stage(ns: argparse.Namespace, stage: str) -> tuple[BoundEvidence, dict, dict, dict]:
    cfg = config()
    ev = BoundEvidence(Path(ns.evidence_root), normal_names(ns.node_major, stage))
    try:
        if stage == "terminal-aba":
            pause_for_aba(ns)
        rebuilt = reconstructed(ev, ns.node_major, cfg, ns.expected_head, ns.expected_tree)
        base_inventory = {name: ev.inventory[name] for name in base_names(ns.node_major)}
        candidate = ev.object(f"datanet-v45-candidate-{ns.node_major}.json")
        controls = ev.object(f"datanet-v45-controls-{ns.node_major}.json")
        validate_candidate(candidate, base_inventory, rebuilt, ns.expected_head, ns.expected_tree)
        validate_controls(controls, candidate)
        if stage in ("terminal-aba", "final"):
            producer = ev.object(f"datanet-v45-producer-substitution-control-{ns.node_major}.json")
            validate_control_receipt(producer, PRODUCER_CONTROL_MARKER, "HOLD_V45_TERMINAL_TIER_RECONSTRUCTION")
        if stage == "final":
            terminal_aba = ev.object(f"datanet-v45-terminal-aba-control-{ns.node_major}.json")
            validate_control_receipt(terminal_aba, TERMINAL_ABA_MARKER, "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        ev.assert_current()
        return ev, rebuilt, candidate, controls
    except BaseException:
        ev.close()
        raise


def producer_control(ns: argparse.Namespace) -> int:
    cfg = config()
    ev = BoundEvidence(Path(ns.evidence_root), normal_names(ns.node_major, "producer"))
    try:
        rebuilt = reconstructed(ev, ns.node_major, cfg, ns.expected_head, ns.expected_tree)
        base_inventory = {name: ev.inventory[name] for name in base_names(ns.node_major)}
        fake_candidate = decode_object(read_one_generation(Path(ns.substitute_candidate)), "HOLD_V45_TERMINAL_FAKE_CANDIDATE_JSON")
        fake_controls = decode_object(read_one_generation(Path(ns.substitute_controls)), "HOLD_V45_TERMINAL_FAKE_CONTROLS_JSON")
        validate_controls(fake_controls, fake_candidate, substituted=True)
        try:
            validate_candidate(fake_candidate, base_inventory, rebuilt, ns.expected_head, ns.expected_tree)
        except TerminalHold as exc:
            demand(exc.code == "HOLD_V45_TERMINAL_TIER_RECONSTRUCTION", "HOLD_V45_TERMINAL_PRODUCER_WRONG_REJECTION")
        else:
            raise TerminalHold("HOLD_V45_TERMINAL_PRODUCER_ACCEPTED")
        ev.assert_current()
    finally:
        ev.close()
    out = seal({
        "marker": PRODUCER_CONTROL_MARKER,
        "status": "GREEN",
        "rejection": "HOLD_V45_TERMINAL_TIER_RECONSTRUCTION",
        "substitute_candidate_sha256": fake_candidate["candidate_sha256"],
        "substitute_controls_sha256": fake_controls["controls_sha256"],
        "production_runtime_touched": False,
    }, "receipt_sha256")
    write_exclusive(Path(ns.output), out)
    print(canonical(out).decode(), end="")
    return 0


def terminal_aba_control(ns: argparse.Namespace) -> int:
    try:
        ev, _, _, _ = verify_stage(ns, "terminal-aba")
    except TerminalHold as exc:
        demand(exc.code == "HOLD_V45_ARTIFACT_GENERATION_CHANGED", "HOLD_V45_TERMINAL_ABA_WRONG_REJECTION")
    else:
        ev.close()
        raise TerminalHold("HOLD_V45_TERMINAL_ABA_ACCEPTED")
    out = seal({
        "marker": TERMINAL_ABA_MARKER,
        "status": "GREEN",
        "rejection": "HOLD_V45_ARTIFACT_GENERATION_CHANGED",
        "production_runtime_touched": False,
    }, "receipt_sha256")
    write_exclusive(Path(ns.output), out)
    print(canonical(out).decode(), end="")
    return 0


def finalize(ns: argparse.Namespace) -> int:
    ev, rebuilt, candidate, controls = verify_stage(ns, "final")
    try:
        inventory = copy.deepcopy(ev.inventory)
    finally:
        ev.close()
    process_accounting = copy.deepcopy(candidate["process_accounting"])
    output_name = Path(ns.output).name
    out = {
        "marker": AGGREGATE_MARKER,
        "status": "GREEN",
        "head": ns.expected_head,
        "tree": ns.expected_tree,
        "parent_head": PARENT_HEAD,
        "node_major": ns.node_major,
        "candidate_sha256": candidate["candidate_sha256"],
        "controls_sha256": controls["controls_sha256"],
        "source": rebuilt["source"],
        "runtime": rebuilt["runtime"],
        "tiers": rebuilt["tiers"],
        "runner_subgraph_process_census": rebuilt["process"],
        "process_accounting": process_accounting,
        "capability_release": rebuilt["capability"],
        "artifact_inventory": inventory,
        "expected_archive_members": sorted(set(inventory) | {output_name}),
        "artifact_generation_bound": True,
        "candidate_generation_aba_control": True,
        "terminal_generation_aba_control": True,
        "producer_substitution_control": True,
        "source_distinct_terminal_verifier": True,
        "terminal_verifier_imports_candidate_or_controls": False,
        "transitive_source_wall_verified": True,
        "full_job_process_census": False,
        "physical_power_loss_proved": False,
        "hardware_write_cache_loss_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_authority_proved": False,
        "full_campaign_evidence_accepted": False,
        "datanet_availability_proved": False,
        "production_runtime_touched": False,
    }
    out = seal(out, "aggregate_sha256")
    write_exclusive(Path(ns.output), out)
    print(canonical(out).decode(), end="")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    modes = p.add_subparsers(dest="mode", required=True)
    for name in ("producer-control", "terminal-aba-control", "finalize"):
        child = modes.add_parser(name)
        child.add_argument("--node-major", type=int, choices=(22, 24, 26), required=True)
        child.add_argument("--evidence-root", required=True)
        child.add_argument("--expected-head", required=True)
        child.add_argument("--expected-tree", required=True)
        child.add_argument("--output", required=True)
        if name == "producer-control":
            child.add_argument("--substitute-candidate", required=True)
            child.add_argument("--substitute-controls", required=True)
        if name == "terminal-aba-control":
            child.add_argument("--generation-control-ready", required=True)
            child.add_argument("--generation-control-continue", required=True)
    return p


def main() -> int:
    ns = parser().parse_args()
    if ns.mode == "producer-control":
        return producer_control(ns)
    if ns.mode == "terminal-aba-control":
        return terminal_aba_control(ns)
    return finalize(ns)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except TerminalHold as exc:
        print(json.dumps({"marker": "VOID_DATANET_V45_TERMINAL_HOLD", "code": exc.code}, sort_keys=True), file=sys.stderr)
        raise

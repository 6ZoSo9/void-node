#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
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

ROOT = Path(__file__).resolve().parents[1]
CONTROL = ROOT / "fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"
RUNNER = ROOT / "scripts/run_datanet_v45_full_stack_ext4_v1.sh"
PARENT_HEAD = "d73512174afd4f1f0f2591b11ae6bb9955e203ba"
STATIC = "VOID_DATANET_V45_FULL_STACK_EVIDENCE_COMPOSITION_STATIC_V1_GREEN"
RUNTIME = "VOID_DATANET_V45_RUNTIME_INVENTORY_V1_GREEN"
CANDIDATE = "VOID_DATANET_V45_FULL_STACK_AGGREGATE_CANDIDATE_V1_GREEN"
SOURCE_EXECUTION = "VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN"
SOURCE_ABA = "VOID_DATANET_V45_SOURCE_GENERATION_ABA_CONTROL_V1_GREEN"
SOURCE_SUPERVISOR = "scripts/prove_datanet_v45_source_execution_v1.py"
PHASE_CONTROL = "VOID_DATANET_V45_PHASE_OUTPUT_CONTROL_V1_GREEN"
PHASE_CONTRACT_ID = "VOID_DATANET_V45_EXACT_PHASE_ARGV_AND_OUTPUT_CONTRACT_V1"


class AggregateHold(AssertionError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def hold(condition: bool, code: str) -> None:
    if not condition:
        raise AggregateHold(code)


def canon(obj: dict) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def phase_contract(phase: str, node: int) -> dict:
    py = ["python3", "-I", "-B", "@ENTRYPOINT@"]
    n, head, tree = "@NODE_MAJOR@", "@EXPECTED_HEAD@", "@EXPECTED_TREE@"
    specs = {
        "source-generation-aba-control": {
            "entrypoint": "scripts/run_datanet_v45_full_stack_ext4_v1.sh",
            "argv": ["/usr/bin/bash", "@ENTRYPOINT@"],
        },
        "v41-static": {"entrypoint": "scripts/prove_datanet_v41_static_gate_v1.py", "argv": py},
        "v42-static": {"entrypoint": "scripts/prove_datanet_v42_fsverity_clean_remount_v1.py", "argv": py + ["static"]},
        "v43-static": {"entrypoint": "scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", "argv": py + ["static"]},
        "v44-static": {"entrypoint": "scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", "argv": py + ["static"]},
        "v45-static": {"entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", "argv": py + ["static"]},
        "matrix-selftest": {
            "entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
            "argv": py + ["selftest"], "owned": [], "bind": [], "pipe": True,
        },
        "runtime": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "argv": py + ["runtime", "--node-major", n, "--output", "@OUTPUT@"],
        },
        "runner": {
            "entrypoint": "scripts/run_datanet_v45_full_stack_ext4_v1.sh", "stdin": True,
            "owned": ["RUNNER_STDOUT", "TRACE"], "bind": ["RUNNER_STDOUT", "TRACE"],
            "stdout": "RUNNER_STDOUT", "stderr": "TRACE", "paths": ["EVIDENCE_ROOT"],
            "argv": [
                "timeout", "--signal=TERM", "--kill-after=60s", "70m", "sudo", "strace",
                "-f", "-q", "-ttt", "-s", "4096", "-e", "trace=process,mount,umount2",
                "-o", "/dev/stderr", "-u", "@RUNNER_USER@", "/usr/bin/env", "-i",
                "PATH=@ENV_PATH@", "LANG=C.UTF-8", "GIT_DIR=@REPO_ROOT@/.git",
                "GIT_WORK_TREE=@REPO_ROOT@", "VOID_V45_NODE_MAJOR=@NODE_MAJOR@",
                "VOID_V45_RUN_ID=@RUN_ID@", "VOID_V45_EXPECTED_HEAD=@EXPECTED_HEAD@",
                "VOID_V45_OUT_DIR=@EVIDENCE_ROOT@", "/usr/bin/bash", "-s",
            ],
        },
        "candidate-aba": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "paths": ["EVIDENCE_ROOT", "GENERATION_READY", "GENERATION_CONTINUE"],
            "argv": py + [
                "candidate-aba-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree,
                "--generation-control-ready", "@GENERATION_READY@",
                "--generation-control-continue", "@GENERATION_CONTINUE@", "--output", "@OUTPUT@",
            ],
        },
        "candidate": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
            "paths": ["EVIDENCE_ROOT"],
            "argv": py + [
                "candidate", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@",
                "--expected-head", head, "--expected-tree", tree, "--output", "@OUTPUT@",
            ],
        },
    }
    spec = copy.deepcopy(specs[phase])
    spec.setdefault("owned", ["OUTPUT"] if phase not in ("source-generation-aba-control", "matrix-selftest") else [])
    spec.setdefault("bind", list(spec["owned"]))
    spec.setdefault("stdout", None)
    spec.setdefault("stderr", None)
    spec.setdefault("paths", [])
    spec.setdefault("stdin", False)
    spec.setdefault("pipe", phase not in ("source-generation-aba-control", "v41-static", "v42-static", "v43-static", "v44-static", "v45-static", "runner"))
    if phase in ("v41-static", "v42-static", "v43-static", "v44-static", "v45-static"):
        spec["stdout"] = "OUTPUT"
    return spec


def expected_phase_contract(spec: dict, argv_allowlisted: bool = True) -> dict:
    return {
        "id": PHASE_CONTRACT_ID,
        "argv_allowlisted": argv_allowlisted,
        "expected_argv_sha256": sha256_bytes(canon({"argv": spec["argv"]})),
        "owned_output_roles": spec["owned"],
        "bound_output_roles": spec["bind"],
        "stdout_output_role": spec["stdout"],
        "stderr_output_role": spec["stderr"],
        "path_token_roles": spec["paths"],
    }


def verify_argument_and_path_bindings(obj: dict, spec: dict, node: int, created: list[dict]) -> None:
    declared_outputs = obj.get("declared_output_paths")
    declared_paths = obj.get("declared_path_tokens")
    hold(
        isinstance(declared_outputs, list)
        and [item.get("role") for item in declared_outputs] == spec["owned"]
        and isinstance(declared_paths, list)
        and [item.get("role") for item in declared_paths] == spec["paths"],
        "HOLD_V45_PHASE_DECLARED_PATHS",
    )
    created_by_role = {item["role"]: item for item in created}
    values: dict[str, str] = {}
    for item in declared_outputs + declared_paths:
        hold(set(item) == {"role", "path", "name", "path_sha256"}, "HOLD_V45_PHASE_DECLARED_PATHS")
        path = Path(item["path"])
        hold(
            path.is_absolute() and path.name == item["name"]
            and sha256_bytes(item["path"].encode("utf-8")) == item["path_sha256"],
            "HOLD_V45_PHASE_DECLARED_PATHS",
        )
        values[f"@{item['role']}@"] = item["path"]
        if item["role"] in created_by_role:
            hold(created_by_role[item["role"]]["name"] == item["name"], "HOLD_V45_PHASE_OUTPUT_IDENTITY")
    outputs_by_role = {item["role"]: item for item in declared_outputs}
    paths_by_role = {item["role"]: item for item in declared_paths}
    if "EVIDENCE_ROOT" in paths_by_role:
        evidence_root = Path(paths_by_role["EVIDENCE_ROOT"]["path"])
        for role in ("OUTPUT", "RUNNER_STDOUT", "TRACE"):
            if role in outputs_by_role:
                hold(Path(outputs_by_role[role]["path"]).parent == evidence_root, "HOLD_V45_PHASE_OUTPUT_IDENTITY")
    bindings = obj.get("argument_token_bindings")
    expected_tokens = sorted({token for arg in spec["argv"] for token in re.findall(r"@[A-Z_]+@", arg)})
    hold(isinstance(bindings, dict) and sorted(bindings) == expected_tokens, "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    hold(bindings.get("@NODE_MAJOR@", str(node)) == str(node), "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    hold(bindings.get("@EXPECTED_HEAD@", obj["head"]) == obj["head"], "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    hold(bindings.get("@EXPECTED_TREE@", obj["tree"]) == obj["tree"], "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    hold(bindings.get("@RUN_ID@", str(obj["run_id"])) == str(obj["run_id"]), "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    for token, value in values.items():
        if token in expected_tokens:
            hold(bindings.get(token) == value, "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    if "@ENTRYPOINT@" in bindings:
        hold(re.fullmatch(r"/proc/self/fd/[0-9]+", bindings["@ENTRYPOINT@"]) is not None, "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    for token in ("@REPO_ROOT@", "@SOURCE_ROOT@"):
        if token in bindings:
            hold(Path(bindings[token]).is_absolute(), "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    if "@ENV_PATH@" in bindings:
        hold(bool(bindings["@ENV_PATH@"]) and "@" not in bindings["@ENV_PATH@"], "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    if "@RUNNER_USER@" in bindings:
        hold(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.-]*\$?", bindings["@RUNNER_USER@"]) is not None, "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
    resolved = []
    for raw in spec["argv"]:
        arg = raw
        for token, value in bindings.items():
            arg = arg.replace(token, value)
        hold("@" not in arg, "HOLD_V45_PHASE_ARGUMENT_BINDINGS")
        resolved.append(arg)
    hold(
        obj.get("resolved_argv_sha256") == sha256_bytes(canon({"argv": resolved}))
        and obj.get("resolved_argv_reconstructed_from_exact_template_and_bindings") is True,
        "HOLD_V45_PHASE_RESOLVED_ARGV",
    )


def write_output(path: Path, data: bytes) -> None:
    custody = os.environ.get("VOID_V45_OUTPUT_CUSTODY_V1")
    if custody == "1":
        try:
            mapping = json.loads(os.environ["VOID_V45_OUTPUT_FDS"])
            fd = mapping[str(path)]
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise AggregateHold("HOLD_V45_OUTPUT_FD_CONTRACT") from exc
        hold(isinstance(fd, int) and fd >= 3, "HOLD_V45_OUTPUT_FD_CONTRACT")
        before = os.fstat(fd)
        hold(
            stat.S_ISREG(before.st_mode)
            and before.st_nlink == 1
            and stat.S_IMODE(before.st_mode) == 0o400
            and before.st_size == 0,
            "HOLD_V45_OUTPUT_FD_SHAPE",
        )
        offset = 0
        while offset < len(data):
            written = os.write(fd, data[offset:])
            hold(written > 0, "HOLD_V45_OUTPUT_FD_WRITE")
            offset += written
        os.fsync(fd)
        after = os.fstat(fd)
        hold(
            (before.st_dev, before.st_ino, before.st_mode, before.st_nlink, before.st_uid, before.st_gid)
            == (after.st_dev, after.st_ino, after.st_mode, after.st_nlink, after.st_uid, after.st_gid)
            and after.st_size == len(data),
            "HOLD_V45_OUTPUT_FD_CHANGED",
        )
        return
    with path.open("xb") as stream:
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())


def git_blob_bytes(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def seal(obj: dict, field: str) -> dict:
    out = copy.deepcopy(obj)
    out.pop(field, None)
    out[field] = sha256_bytes(canon(out))
    return out


def verify_seal(obj: dict, field: str, code: str) -> None:
    want = obj.get(field)
    base = copy.deepcopy(obj)
    base.pop(field, None)
    hold(isinstance(want, str) and len(want) == 64 and sha256_bytes(canon(base)) == want, code)


def load_control() -> dict:
    control_bytes = stable_source_bytes(CONTROL)
    control_blob = subprocess.run(
        ["git", "rev-parse", "HEAD:fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ).stdout.strip()
    hold(git_blob_bytes(control_bytes) == control_blob, "HOLD_V45_CONTROL_HEAD_DRIFT")
    cfg = json.loads(control_bytes.decode("utf-8", errors="strict"))
    hold(cfg.get("v") == 1, "HOLD_V45_CONTROL_VERSION")
    hold(
        cfg.get("format") == "VOID_DATANET_V45_V43_V44_FULL_STACK_EVIDENCE_COMPOSITION_EXT4_CONTROL_V1",
        "HOLD_V45_CONTROL_FORMAT",
    )
    hold(cfg.get("parent_pr") == 1504 and cfg.get("parent_head") == PARENT_HEAD, "HOLD_V45_PARENT_BINDING")
    for rel, expected in sorted(cfg["accepted_v44_blobs"].items()):
        hold(git_blob_bytes(stable_source_bytes(ROOT / rel)) == expected, "HOLD_V45_ACCEPTED_V44_BLOB")
    return cfg


def run_text(argv: list[str]) -> str:
    return subprocess.run(argv, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def executable_identity(name: str) -> dict:
    path = shutil.which(name)
    hold(path is not None, "HOLD_V45_RUNTIME_EXECUTABLE_MISSING")
    resolved = Path(path).resolve()
    st = resolved.stat()
    hold(stat.S_ISREG(st.st_mode), "HOLD_V45_RUNTIME_EXECUTABLE_NOT_REGULAR")
    return {
        "requested": name,
        "path": str(resolved),
        "bytes": st.st_size,
        "mode": stat.S_IMODE(st.st_mode),
        "uid": st.st_uid,
        "sha256": sha256_file(resolved),
    }


def stable_source(path: Path) -> tuple[bytes, os.stat_result]:
    hold(path.is_absolute() and path.name not in ("", ".", ".."), "HOLD_V45_SOURCE_PATH")
    dflags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fflags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    parent = os.open(path.parent, dflags)
    fd = -1
    try:
        parent_key = stable_metadata(os.fstat(parent))
        visible = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        fd = os.open(path.name, fflags, dir_fd=parent)
        before = os.fstat(fd)
        hold(stat.S_ISREG(before.st_mode) and before.st_nlink == 1, "HOLD_V45_SOURCE_REGULAR")
        hold(stable_metadata(visible) == stable_metadata(before), "HOLD_V45_SOURCE_OPEN_GENERATION")
        data = EvidenceSnapshot._read_all(fd, before.st_size)
        after = os.fstat(fd)
        hold(stable_metadata(before) == stable_metadata(after), "HOLD_V45_SOURCE_CHANGED_DURING_READ")
        final_visible = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        hold(stable_metadata(final_visible) == stable_metadata(after), "HOLD_V45_SOURCE_VISIBLE_GENERATION")
        hold(stable_metadata(os.fstat(parent)) == parent_key, "HOLD_V45_SOURCE_PARENT_ABA")
        return data, after
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent)


def stable_source_bytes(path: Path) -> bytes:
    return stable_source(path)[0]


def discovered_dependency_closure(cfg: dict) -> list[str]:
    entrypoints = cfg.get("source_wall_entrypoints")
    wall = set(cfg.get("source_wall_paths", []))
    hold(isinstance(entrypoints, list) and entrypoints == sorted(set(entrypoints)), "HOLD_V45_SOURCE_ENTRYPOINTS_CANONICAL")
    hold(set(entrypoints) <= wall, "HOLD_V45_SOURCE_ENTRYPOINT_OUTSIDE_WALL")
    pending = list(entrypoints)
    pending_data: list[str] = []
    discovered: set[str] = set()
    data_dependencies: set[str] = set()

    def admit(path: str) -> None:
        candidate = ROOT / path
        if candidate.is_file():
            if path.startswith("scripts/"):
                if path not in discovered:
                    pending.append(path)
            elif path not in data_dependencies:
                data_dependencies.add(path)
                pending_data.append(path)

    explicit_pattern = r"(?:\.github/workflows|docs|fixtures|scripts)/[A-Za-z0-9_.-]+\.(?:py|mjs|json|yml|md|sh)"
    while pending or pending_data:
        if not pending:
            rel = pending_data.pop()
            path = ROOT / rel
            if path.suffix in (".json", ".yml", ".yaml"):
                text = stable_source_bytes(path).decode("utf-8", errors="strict")
                for explicit in re.findall(explicit_pattern, text):
                    admit(explicit)
            continue
        rel = pending.pop()
        if rel in discovered:
            continue
        path = ROOT / rel
        hold(path.is_file(), "HOLD_V45_SOURCE_DEPENDENCY_MISSING")
        discovered.add(rel)
        text = stable_source_bytes(path).decode("utf-8", errors="strict")
        if path.suffix == ".py":
            try:
                tree = ast.parse(text, filename=rel)
            except SyntaxError as exc:
                raise AggregateHold("HOLD_V45_SOURCE_DEPENDENCY_PARSE") from exc
            for node in ast.walk(tree):
                modules = []
                if isinstance(node, ast.Import):
                    modules = [alias.name.split(".", 1)[0] for alias in node.names]
                elif isinstance(node, ast.ImportFrom) and node.module:
                    modules = [node.module.split(".", 1)[0]]
                for module in modules:
                    admit(f"scripts/{module}.py")
                if isinstance(node, ast.Constant) and isinstance(node.value, str):
                    for explicit in re.findall(explicit_pattern, node.value):
                        admit(explicit)
                    for bare in re.findall(r"[A-Za-z0-9_.-]+\.(?:py|mjs)", node.value):
                        admit(f"scripts/{bare}")
                    for bare in re.findall(r"datanet-[A-Za-z0-9_.-]+\.json", node.value):
                        admit(f"fixtures/{bare}")
        elif path.suffix in (".mjs", ".js"):
            for relative in re.findall(r"[\"'](\.\.?/[A-Za-z0-9_./-]+\.(?:mjs|js|json))[\"']", text):
                resolved = (path.parent / relative).resolve()
                try:
                    admit(str(resolved.relative_to(ROOT)))
                except ValueError as exc:
                    raise AggregateHold("HOLD_V45_SOURCE_DEPENDENCY_ESCAPE") from exc
        else:
            for explicit in re.findall(explicit_pattern, text):
                admit(explicit)

    closure = sorted(discovered | data_dependencies)
    hold(set(closure) <= wall, "HOLD_V45_TRANSITIVE_SOURCE_WALL_INCOMPLETE")
    return closure


def source_inventory(cfg: dict) -> dict:
    head = run_text(["git", "rev-parse", "HEAD"])
    tree = run_text(["git", "rev-parse", "HEAD^{tree}"])
    listing = subprocess.run(
        ["git", "ls-tree", "-r", "--full-tree", "HEAD"],
        check=True,
        stdout=subprocess.PIPE,
    ).stdout
    tracked = {}
    for raw in listing.decode("utf-8", errors="strict").splitlines():
        meta, path = raw.split("\t", 1)
        mode, kind, blob = meta.split()
        tracked[path] = {"mode": mode, "type": kind, "git_blob": blob}
    closure = cfg.get("source_wall_paths")
    hold(isinstance(closure, list) and closure == sorted(set(closure)), "HOLD_V45_SOURCE_WALL_CANONICAL")
    required = {
        ".github/workflows/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.yml",
        "fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json",
        "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py",
        "scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py",
        "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py",
        "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
        "scripts/prove_datanet_v45_source_execution_v1.py",
        "scripts/run_datanet_v45_full_stack_ext4_v1.sh",
    }
    hold(required <= set(closure), "HOLD_V45_SOURCE_WALL_REQUIRED_MEMBER")
    entries = {}
    for rel in closure:
        entry = tracked.get(rel)
        hold(entry is not None and entry["type"] == "blob", "HOLD_V45_SOURCE_WALL_TRACKED_BLOB")
        source_path = ROOT / rel
        data, source_stat = stable_source(source_path)
        hold(git_blob_bytes(data) == entry["git_blob"], "HOLD_V45_SOURCE_WORKTREE_HEAD_DRIFT")
        worktree_mode = stat.S_IMODE(source_stat.st_mode)
        worktree_git_mode = "100755" if worktree_mode & 0o111 else "100644"
        hold(worktree_git_mode == entry["mode"], "HOLD_V45_SOURCE_WORKTREE_MODE_DRIFT")
        entries[rel] = {**entry, "worktree_mode": worktree_mode, "bytes": len(data), "sha256": sha256_bytes(data)}
    return {
        "head": head,
        "tree": tree,
        "recursive_entry_count": len(listing.splitlines()),
        "recursive_listing_sha256": sha256_bytes(listing),
        "source_wall_paths_sha256": sha256_bytes(canon({"paths": closure})),
        "source_wall_entry_count": len(entries),
        "source_wall_entries": entries,
        "transitive_source_wall_verified": True,
    }


RUNTIME_COMMANDS = [
    "git", "bash", "python3", "node", "sudo", "strace", "dd", "mkfs.ext4",
    "tune2fs", "losetup", "blockdev", "dmsetup", "mount", "umount", "cp",
    "cmp", "sha256sum", "sync", "grep", "awk", "findmnt", "mountpoint",
    "jq", "fallocate", "ln",
]


def runtime_inventory(node_major: int, cfg: dict) -> dict:
    node_version = run_text(["node", "--version"])
    hold(node_version.lstrip("v").split(".", 1)[0] == str(node_major), "HOLD_V45_NODE_MAJOR")
    return {
        "marker": RUNTIME,
        "status": "GREEN",
        "node_major": node_major,
        "node_version": node_version,
        "python_version": platform.python_version(),
        "kernel": platform.release(),
        "machine": platform.machine(),
        "system": platform.system(),
        "source": source_inventory(cfg),
        "executables": {name: executable_identity(name) for name in RUNTIME_COMMANDS},
        "production_runtime_touched": False,
    }


def static_mode() -> int:
    cfg = load_control()
    dependency_closure = discovered_dependency_closure(cfg)
    source = source_inventory(cfg)
    requirements = cfg["required_for_acceptance"]
    for key in (
        "natural_v43_gate_on_exact_v45_head",
        "v44_corruption_after_v43_recovery_on_same_r0_image",
        "artifact_generation_bound",
        "source_distinct_top_verifier_after_mutator_retirement",
        "exact_git_head_and_tree_bound",
        "transitive_source_and_runtime_inventory_bound",
        "source_inventory_and_execution_generation_bound",
        "external_source_generation_aba_control",
        "ordered_child_receipts_bound",
        "artifact_membership_and_hashes_bound",
        "runner_subgraph_process_and_helper_census",
        "phase_separated_process_accounting",
        "runner_subgraph_peak_process_concurrency_bounded",
        "loop_mapper_mount_capabilities_released_before_aggregate",
        "candidate_negative_controls_observed",
        "candidate_and_terminal_aba_controls",
        "producer_substitution_control",
        "node_22_24_26_source_bound_top_aggregate",
        "exact_phase_argv_allowlisted",
        "supervisor_owned_create_only_outputs",
        "relabeled_help_controls",
        "preexisting_output_controls",
    ):
        hold(requirements.get(key) is True, "HOLD_V45_STATIC_ACCEPTANCE_REQUIREMENT")
    hold(requirements.get("full_job_process_and_helper_census") is False, "HOLD_V45_STATIC_PROCESS_SCOPE")
    observed = cfg["observed_status"]
    for key in (
        "exact_head_node_22_24_26_matrix_green",
        "downstream_terminal_source_execution_receipt_green",
        "independent_artifact_audit_green",
        "adversarial_rereview_clear",
        "v45_full_stack_evidence_composition_accepted",
        "full_job_process_and_helper_census",
        "full_campaign_evidence_accepted",
        "datanet_availability_proved",
        "physical_power_loss_proved",
        "hardware_write_cache_loss_proved",
        "public_peer_retrieval_proved",
        "chain_2050_authority_proved",
        "production_runtime_activation",
    ):
        hold(observed.get(key) is False, "HOLD_V45_STATIC_OBSERVED_STATUS")
    subprocess.run(["bash", "-n", str(RUNNER)], check=True)
    out = {
        "marker": STATIC,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "accepted_v44_blob_count": len(cfg["accepted_v44_blobs"]),
        "source_wall_entry_count": source["source_wall_entry_count"],
        "source_wall_paths_sha256": source["source_wall_paths_sha256"],
        "discovered_dependency_count": len(dependency_closure),
        "discovered_dependency_paths_sha256": sha256_bytes(canon({"paths": dependency_closure})),
        "design_requirements_declared": True,
        "static_gate_is_not_acceptance": True,
        "observed_status": observed,
        "v45_full_stack_evidence_composition_accepted": False,
        "tiers": cfg["tiers"],
        "ceilings": cfg["ceilings"],
        "production_runtime_touched": False,
    }
    print(canon(out).decode(), end="")
    return 0


def runtime_mode(ns: argparse.Namespace) -> int:
    cfg = load_control()
    out = runtime_inventory(ns.node_major, cfg)
    write_output(Path(ns.output), canon(out))
    print(canon(out).decode(), end="")
    return 0


def expected_inputs(node: int, *, include_candidate_aba: bool = True) -> set[str]:
    n = str(node)
    names = {
        f"v41-static-{n}.jsonl",
        f"v42-static-{n}.jsonl",
        f"v43-static-{n}.jsonl",
        f"v44-static-{n}.jsonl",
        f"v45-static-{n}.jsonl",
        f"datanet-v45-runtime-{n}.json",
        f"datanet-v45-process-{n}.trace",
        f"datanet-v45-runner-{n}.stdout.log",
        f"datanet-v45-phase-argv-control-matrix-selftest-{n}.json",
        f"datanet-v43-v41-{n}.stdout.log",
        f"datanet-v43-v41-{n}.stderr.log",
        f"datanet-v43-pre-{n}.json",
        f"datanet-v43-post-{n}.json",
        f"datanet-v43-pre-{n}.jsonl",
        f"datanet-v43-post-{n}.jsonl",
        f"datanet-v43-final-{n}.json",
        f"datanet-v43-final-{n}.jsonl",
        f"datanet-v43-e0-pre-{n}.txt",
        f"datanet-v43-r0-pre-{n}.txt",
        f"datanet-v43-e0-post-{n}.txt",
        f"datanet-v43-r0-post-{n}.txt",
        f"datanet-v43-crash-copy-{n}.txt",
        f"datanet-v43-sources-{n}.txt",
        f"datanet-v45-v44-capture-{n}.json",
        f"datanet-v45-v44-capture-{n}.jsonl",
        f"datanet-v45-v44-corruption-{n}.json",
        f"datanet-v45-v44-corruption-{n}.jsonl",
        f"datanet-v45-v44-final-{n}.json",
        f"datanet-v45-v44-final-{n}.jsonl",
        f"datanet-v45-v44-raw-diff-{n}.txt",
        f"datanet-v45-v44-super-after-{n}.txt",
        f"datanet-v45-v44-loop-{n}.txt",
        f"datanet-v45-capability-release-{n}.json",
        f"datanet-v45-source-generation-aba-control-{n}.json",
    }
    for phase in (
        "v41-static", "v42-static", "v43-static", "v44-static", "v45-static",
        "matrix-selftest", "runtime", "runner",
    ):
        names.add(f"datanet-v45-source-execution-{phase}-{n}.json")
    if include_candidate_aba:
        names.add(f"datanet-v45-candidate-aba-control-{n}.json")
        names.add(f"datanet-v45-source-execution-candidate-aba-{n}.json")
    for leaf in ("aggregate.json", "manifest.json", "observer.json", "restart-census.json", "runtime.json"):
        names.add(f"datanet-v43-v41-evidence-{n}/{leaf}")
    return names


def source_execution_phases(node: int) -> dict[str, tuple[str, tuple[str, ...]]]:
    n = str(node)
    return {
        "v41-static": ("scripts/prove_datanet_v41_static_gate_v1.py", (f"v41-static-{n}.jsonl",)),
        "v42-static": ("scripts/prove_datanet_v42_fsverity_clean_remount_v1.py", (f"v42-static-{n}.jsonl",)),
        "v43-static": ("scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", (f"v43-static-{n}.jsonl",)),
        "v44-static": ("scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", (f"v44-static-{n}.jsonl",)),
        "v45-static": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"v45-static-{n}.jsonl",)),
        "matrix-selftest": ("scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py", ()),
        "runtime": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"datanet-v45-runtime-{n}.json",)),
        "runner": ("scripts/run_datanet_v45_full_stack_ext4_v1.sh", (f"datanet-v45-runner-{n}.stdout.log", f"datanet-v45-process-{n}.trace")),
        "candidate-aba": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"datanet-v45-candidate-aba-control-{n}.json",)),
    }


def verify_source_execution_receipt(
    snapshot: "EvidenceSnapshot",
    receipt_name: str,
    phase: str,
    entrypoint: str,
    output_names: tuple[str, ...],
    node: int,
    source: dict,
) -> tuple[str, int]:
    obj = snapshot.json(receipt_name)
    verify_seal(obj, "receipt_sha256", "HOLD_V45_SOURCE_EXECUTION_RECEIPT_SEAL")
    source_entry = source["source_wall_entries"]
    supervisor = source_entry[SOURCE_SUPERVISOR]
    admitted = source_entry[entrypoint]
    spec = phase_contract(phase, node)
    output_data = {name: snapshot.bytes(name) for name in output_names}
    bound = [
        {"name": name, "bytes": len(output_data[name]), "sha256": sha256_bytes(output_data[name])}
        for name in output_names
    ]
    created = [
        {**item, "role": role, "mode": 0o400, "created_empty_before_child": True}
        for role, item in zip(spec["bind"], bound)
    ]
    verify_argument_and_path_bindings(obj, spec, node, created)
    hold(
        obj.get("marker") == SOURCE_EXECUTION
        and obj.get("status") == "GREEN"
        and obj.get("phase") == phase
        and obj.get("node_major") == node
        and isinstance(obj.get("run_id"), int) and obj["run_id"] > 0
        and obj.get("head") == source["head"]
        and obj.get("tree") == source["tree"]
        and obj.get("source_inventory_sha256") == sha256_bytes(canon(source))
        and obj.get("source_wall_paths_sha256") == source["source_wall_paths_sha256"]
        and obj.get("source_wall_entry_count") == source["source_wall_entry_count"]
        and obj.get("supervisor", {}).get("path") == SOURCE_SUPERVISOR
        and obj.get("supervisor", {}).get("git_blob") == supervisor["git_blob"]
        and obj.get("supervisor", {}).get("sha256") == supervisor["sha256"]
        and obj.get("supervisor", {}).get("git_blob_preverified_before_interpreter") is True
        and obj.get("supervisor", {}).get("bootstrap_sealed_memfd") is True
        and obj.get("supervisor", {}).get("write_grow_shrink_and_seal_seals_verified") is True
        and obj.get("entrypoint", {}).get("path") == entrypoint
        and obj.get("entrypoint", {}).get("git_blob") == admitted["git_blob"]
        and obj.get("entrypoint", {}).get("sha256") == admitted["sha256"]
        and obj.get("entrypoint", {}).get("executed_from_retained_fd") is True
        and obj.get("entrypoint", {}).get("stdin_fd_handoff") is spec["stdin"]
        and obj.get("entrypoint", {}).get("proc_fd_handoff") is (not spec["stdin"])
        and obj.get("source_snapshot_from_exact_git_blobs") is True
        and obj.get("source_files_opened_nofollow") is True
        and obj.get("source_file_and_directory_fds_retained") is True
        and obj.get("source_membership_and_metadata_rechecked") is True
        and obj.get("interpreter_local_source_root_is_snapshot") is True
        and obj.get("command_entrypoint_is_retained_fd") is True
        and obj.get("command_template") == spec["argv"]
        and obj.get("phase_contract") == expected_phase_contract(spec)
        and obj.get("child_started_after_source_admission") is True
        and obj.get("child_returncode") == 0
        and obj.get("source_generation_stable_through_child") is True
        and obj.get("output_paths_absent_before_supervisor_create") is True
        and obj.get("output_files_supervisor_create_only") is True
        and obj.get("output_fds_retained_through_child") is True
        and obj.get("output_generation_stable_through_child") is True
        and obj.get("output_bindings") == bound
        and obj.get("created_output_bindings") == created
        and obj.get("stdout_captured_by_supervisor") is True
        and obj.get("stderr_captured_by_supervisor") is (spec["stderr"] is not None)
        and obj.get("production_runtime_touched") is False,
        "HOLD_V45_SOURCE_EXECUTION_RECEIPT",
    )
    if spec["stdout"] is not None:
        role_index = spec["bind"].index(spec["stdout"])
        hold(obj.get("stdout_binding") == created[role_index], "HOLD_V45_SOURCE_EXECUTION_STDOUT")
    elif output_names:
        primary = bound[0]
        hold(
            obj.get("stdout_binding") == {"role": "SUPERVISOR_PIPE", **{k: primary[k] for k in ("bytes", "sha256")}},
            "HOLD_V45_SOURCE_EXECUTION_STDOUT",
        )
    else:
        stdout = obj.get("stdout_binding")
        hold(
            isinstance(stdout, dict) and stdout.get("role") == "SUPERVISOR_PIPE"
            and isinstance(stdout.get("bytes"), int) and stdout["bytes"] > 0
            and re.fullmatch(r"[0-9a-f]{64}", stdout.get("sha256", "")) is not None,
            "HOLD_V45_SOURCE_EXECUTION_STDOUT",
        )
    if spec["stderr"] is not None:
        role_index = spec["bind"].index(spec["stderr"])
        hold(obj.get("stderr_binding") == created[role_index], "HOLD_V45_SOURCE_EXECUTION_STDERR")
    else:
        hold(obj.get("stderr_binding") is None, "HOLD_V45_SOURCE_EXECUTION_STDERR")
    return obj["receipt_sha256"], obj["run_id"]


def verify_phase_argv_control(snapshot: "EvidenceSnapshot", node: int, source: dict) -> tuple[str, int]:
    name = f"datanet-v45-phase-argv-control-matrix-selftest-{node}.json"
    obj = snapshot.json(name)
    verify_seal(obj, "receipt_sha256", "HOLD_V45_PHASE_ARGV_CONTROL_SEAL")
    spec = phase_contract("matrix-selftest", node)
    presented = ["python3", "-I", "-B", "@ENTRYPOINT@", "--help"]
    wall = source["source_wall_entries"]
    entrypoint = spec["entrypoint"]
    hold(
        obj.get("marker") == PHASE_CONTROL
        and obj.get("status") == "GREEN"
        and obj.get("control_kind") == "relabeled-help"
        and obj.get("rejection") == "HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED"
        and obj.get("phase") == "matrix-selftest"
        and obj.get("node_major") == node
        and isinstance(obj.get("run_id"), int) and obj["run_id"] > 0
        and obj.get("head") == source["head"]
        and obj.get("tree") == source["tree"]
        and obj.get("source_inventory_sha256") == sha256_bytes(canon(source))
        and obj.get("supervisor", {}).get("git_blob") == wall[SOURCE_SUPERVISOR]["git_blob"]
        and obj.get("entrypoint", {}).get("path") == entrypoint
        and obj.get("entrypoint", {}).get("git_blob") == wall[entrypoint]["git_blob"]
        and obj.get("command_template") == presented
        and obj.get("presented_argv_sha256") == sha256_bytes(canon({"argv": presented}))
        and obj.get("phase_contract") == expected_phase_contract(spec, False)
        and obj.get("declared_output_paths") == []
        and obj.get("declared_path_tokens") == []
        and obj.get("phase_argv_mismatch_rejected_before_output_create") is True
        and obj.get("child_started") is False
        and obj.get("production_runtime_touched") is False,
        "HOLD_V45_PHASE_ARGV_CONTROL_RECEIPT",
    )
    return obj["receipt_sha256"], obj["run_id"]


def verify_source_execution_base(
    snapshot: "EvidenceSnapshot", node: int, source: dict, *, include_candidate_aba: bool = True,
) -> dict:
    n = str(node)
    receipt_hashes = {}
    run_ids: set[int] = set()
    phases = source_execution_phases(node)
    if not include_candidate_aba:
        phases.pop("candidate-aba")
    for phase, (entrypoint, output_names) in phases.items():
        receipt_name = f"datanet-v45-source-execution-{phase}-{n}.json"
        receipt_hashes[phase], receipt_run_id = verify_source_execution_receipt(
            snapshot, receipt_name, phase, entrypoint, output_names, node, source,
        )
        run_ids.add(receipt_run_id)
    control_name = f"datanet-v45-source-generation-aba-control-{n}.json"
    control = snapshot.json(control_name)
    verify_seal(control, "receipt_sha256", "HOLD_V45_SOURCE_ABA_RECEIPT_SEAL")
    wall = source["source_wall_entries"]
    hold(
        control.get("marker") == SOURCE_ABA
        and control.get("status") == "GREEN"
        and control.get("phase") == "source-generation-aba-control"
        and control.get("node_major") == node
        and isinstance(control.get("run_id"), int) and control["run_id"] > 0
        and control.get("head") == source["head"]
        and control.get("tree") == source["tree"]
        and control.get("source_inventory_sha256") == sha256_bytes(canon(source))
        and control.get("supervisor", {}).get("path") == SOURCE_SUPERVISOR
        and control.get("supervisor", {}).get("git_blob") == wall[SOURCE_SUPERVISOR]["git_blob"]
        and control.get("supervisor", {}).get("sha256") == wall[SOURCE_SUPERVISOR]["sha256"]
        and control.get("supervisor", {}).get("git_blob_preverified_before_interpreter") is True
        and control.get("supervisor", {}).get("bootstrap_sealed_memfd") is True
        and control.get("supervisor", {}).get("write_grow_shrink_and_seal_seals_verified") is True
        and control.get("entrypoint", {}).get("path") == "scripts/run_datanet_v45_full_stack_ext4_v1.sh"
        and control.get("entrypoint", {}).get("git_blob") == wall["scripts/run_datanet_v45_full_stack_ext4_v1.sh"]["git_blob"]
        and control.get("entrypoint", {}).get("executed_from_retained_fd") is True
        and control.get("command_template") == phase_contract("source-generation-aba-control", node)["argv"]
        and control.get("phase_contract") == expected_phase_contract(
            phase_contract("source-generation-aba-control", node)
        )
        and control.get("declared_output_paths") == []
        and control.get("declared_path_tokens") == []
        and control.get("source_snapshot_from_exact_git_blobs") is True
        and control.get("source_files_opened_nofollow") is True
        and control.get("source_file_and_directory_fds_retained") is True
        and control.get("control_target") == "scripts/run_datanet_v45_full_stack_ext4_v1.sh"
        and control.get("rejection") == "HOLD_V45_SOURCE_GENERATION_CHANGED"
        and control.get("external_a_to_b_to_a_control") is True
        and control.get("child_started") is False
        and control.get("production_runtime_touched") is False,
        "HOLD_V45_SOURCE_ABA_RECEIPT",
    )
    run_ids.add(control["run_id"])
    argv_control_hash, argv_control_run_id = verify_phase_argv_control(snapshot, node, source)
    run_ids.add(argv_control_run_id)
    hold(len(run_ids) == 1, "HOLD_V45_PHASE_RUN_ID_MISMATCH")
    bound_run_id = next(iter(run_ids))
    return {
        "run_id": bound_run_id,
        "source_inventory_sha256": sha256_bytes(canon(source)),
        "source_execution_receipt_sha256": receipt_hashes,
        "source_generation_aba_control_sha256": control["receipt_sha256"],
        "phase_argv_control_sha256": {"matrix-selftest-relabeled-help": argv_control_hash},
        "exact_phase_argv_allowlisted": True,
        "supervisor_owned_create_only_outputs": True,
        "relabeled_help_controls": True,
        "source_inventory_and_execution_generation_bound": True,
        "external_source_generation_aba_control": True,
    }


def stable_metadata(st: os.stat_result) -> tuple[int, ...]:
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


class EvidenceSnapshot:
    """One retained generation: membership, hashes, and semantics share these bytes."""

    def __init__(self, root: Path, names: set[str]):
        hold(root.is_absolute() and root.name not in ("", ".", ".."), "HOLD_V45_EVIDENCE_ROOT")
        hold(all(len(Path(name).parts) in (1, 2) and ".." not in Path(name).parts for name in names), "HOLD_V45_ARTIFACT_NAME")
        self.root = root
        self.names = set(names)
        self.parent_fd = -1
        self.root_fd = -1
        self.dir_fds: dict[str, int] = {}
        self.file_fds: dict[str, int] = {}
        self.dir_metadata: dict[str, tuple[int, ...]] = {}
        self.file_metadata: dict[str, tuple[int, ...]] = {}
        self.data: dict[str, bytes] = {}
        self.inventory: dict[str, dict] = {}
        try:
            self._capture()
        except BaseException:
            self.close()
            raise

    @staticmethod
    def _dir_flags() -> int:
        return os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)

    @staticmethod
    def _file_flags() -> int:
        return os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)

    @staticmethod
    def _read_all(fd: int, size: int) -> bytes:
        chunks = []
        remaining = size
        while remaining:
            block = os.read(fd, min(1024 * 1024, remaining))
            hold(bool(block), "HOLD_V45_ARTIFACT_SHORT_READ")
            chunks.append(block)
            remaining -= len(block)
        hold(os.read(fd, 1) == b"", "HOLD_V45_ARTIFACT_SIZE_GROWTH")
        return b"".join(chunks)

    def _capture(self) -> None:
        self.parent_fd = os.open(self.root.parent, self._dir_flags())
        parent_before = os.fstat(self.parent_fd)
        root_visible = os.stat(self.root.name, dir_fd=self.parent_fd, follow_symlinks=False)
        self.root_fd = os.open(self.root.name, self._dir_flags(), dir_fd=self.parent_fd)
        root_before = os.fstat(self.root_fd)
        hold(stat.S_ISDIR(root_visible.st_mode) and stable_metadata(root_visible) == stable_metadata(root_before), "HOLD_V45_EVIDENCE_ROOT_GENERATION")

        root_files = {name for name in self.names if len(Path(name).parts) == 1}
        expected_dirs = {Path(name).parts[0] for name in self.names if len(Path(name).parts) == 2}
        hold(set(os.listdir(self.root_fd)) == root_files | expected_dirs, "HOLD_V45_ARTIFACT_MEMBERSHIP")

        for dirname in sorted(expected_dirs):
            visible = os.stat(dirname, dir_fd=self.root_fd, follow_symlinks=False)
            fd = os.open(dirname, self._dir_flags(), dir_fd=self.root_fd)
            current = os.fstat(fd)
            hold(stat.S_ISDIR(visible.st_mode) and stable_metadata(visible) == stable_metadata(current), "HOLD_V45_ARTIFACT_DIRECTORY_GENERATION")
            expected_children = {Path(name).parts[1] for name in self.names if Path(name).parts[0] == dirname}
            hold(set(os.listdir(fd)) == expected_children, "HOLD_V45_ARTIFACT_MEMBERSHIP")
            self.dir_fds[dirname] = fd

        for name in sorted(self.names):
            parts = Path(name).parts
            parent_fd = self.root_fd if len(parts) == 1 else self.dir_fds[parts[0]]
            leaf = parts[-1]
            visible = os.stat(leaf, dir_fd=parent_fd, follow_symlinks=False)
            fd = os.open(leaf, self._file_flags(), dir_fd=parent_fd)
            before = os.fstat(fd)
            hold(stat.S_ISREG(before.st_mode) and before.st_nlink == 1, "HOLD_V45_ARTIFACT_NOT_PRIVATE_REGULAR")
            hold(stable_metadata(visible) == stable_metadata(before), "HOLD_V45_ARTIFACT_OPEN_GENERATION")
            data = self._read_all(fd, before.st_size)
            after = os.fstat(fd)
            hold(stable_metadata(before) == stable_metadata(after), "HOLD_V45_ARTIFACT_CHANGED_DURING_READ")
            self.file_fds[name] = fd
            self.file_metadata[name] = stable_metadata(after)
            self.data[name] = data
            self.inventory[name] = {"bytes": len(data), "sha256": sha256_bytes(data)}

        self.dir_metadata[".."] = stable_metadata(parent_before)
        self.dir_metadata["."] = stable_metadata(os.fstat(self.root_fd))
        for dirname, fd in self.dir_fds.items():
            self.dir_metadata[dirname] = stable_metadata(os.fstat(fd))

    def bytes(self, name: str) -> bytes:
        hold(name in self.data, "HOLD_V45_ARTIFACT_LOOKUP")
        return self.data[name]

    def text(self, name: str) -> str:
        try:
            return self.bytes(name).decode("utf-8", errors="strict")
        except UnicodeDecodeError as exc:
            raise AggregateHold("HOLD_V45_ARTIFACT_UTF8") from exc

    def json(self, name: str) -> dict:
        try:
            obj = json.loads(self.text(name))
        except json.JSONDecodeError as exc:
            raise AggregateHold("HOLD_V45_ARTIFACT_JSON") from exc
        hold(isinstance(obj, dict), "HOLD_V45_ARTIFACT_JSON_OBJECT")
        return obj

    def assert_stable(self) -> None:
        hold(stable_metadata(os.fstat(self.parent_fd)) == self.dir_metadata[".."], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        root_visible = os.stat(self.root.name, dir_fd=self.parent_fd, follow_symlinks=False)
        hold(stable_metadata(root_visible) == self.dir_metadata["."], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        hold(stable_metadata(os.fstat(self.root_fd)) == self.dir_metadata["."], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")

        root_files = {name for name in self.names if len(Path(name).parts) == 1}
        expected_dirs = {Path(name).parts[0] for name in self.names if len(Path(name).parts) == 2}
        hold(set(os.listdir(self.root_fd)) == root_files | expected_dirs, "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
        for dirname, fd in self.dir_fds.items():
            visible = os.stat(dirname, dir_fd=self.root_fd, follow_symlinks=False)
            hold(stable_metadata(visible) == self.dir_metadata[dirname], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
            hold(stable_metadata(os.fstat(fd)) == self.dir_metadata[dirname], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
            expected = {Path(name).parts[1] for name in self.names if Path(name).parts[0] == dirname}
            hold(set(os.listdir(fd)) == expected, "HOLD_V45_ARTIFACT_GENERATION_CHANGED")

        for name, fd in self.file_fds.items():
            parts = Path(name).parts
            parent_fd = self.root_fd if len(parts) == 1 else self.dir_fds[parts[0]]
            current = os.fstat(fd)
            visible = os.stat(parts[-1], dir_fd=parent_fd, follow_symlinks=False)
            hold(stable_metadata(current) == self.file_metadata[name], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")
            hold(stable_metadata(visible) == self.file_metadata[name], "HOLD_V45_ARTIFACT_GENERATION_CHANGED")

    def close(self) -> None:
        for fd in self.file_fds.values():
            try:
                os.close(fd)
            except OSError:
                pass
        for fd in self.dir_fds.values():
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
        self.file_fds.clear()
        self.dir_fds.clear()
        self.root_fd = self.parent_fd = -1


def generation_control_pause(ns: argparse.Namespace) -> None:
    ready = getattr(ns, "generation_control_ready", None)
    proceed = getattr(ns, "generation_control_continue", None)
    hold((ready is None) == (proceed is None), "HOLD_V45_GENERATION_CONTROL_ARGUMENTS")
    if ready is None:
        return
    ready_path = Path(ready)
    continue_path = Path(proceed)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(ready_path, flags, 0o600)
    try:
        os.write(fd, b"snapshot-retained\n")
        os.fsync(fd)
    finally:
        os.close(fd)
    deadline = time.monotonic() + 30
    while not continue_path.exists():
        hold(time.monotonic() < deadline, "HOLD_V45_GENERATION_CONTROL_TIMEOUT")
        time.sleep(0.02)


def parse_kv(text: str) -> dict[str, str]:
    out = {}
    for line in text.splitlines():
        if not line:
            continue
        key, value = line.split("=", 1)
        hold(key not in out, "HOLD_V45_DUPLICATE_RECEIPT_KEY")
        out[key] = value
    return out


def super_state(text: str) -> dict:
    features = next((line for line in text.splitlines() if line.startswith("Filesystem features:")), "")
    return {
        "sha256": sha256_bytes(text.encode("utf-8")),
        "needs_recovery": "needs_recovery" in text,
        "verity": "verity" in features.split(),
    }


def last_json(text: str) -> dict:
    rows = [line for line in text.splitlines() if line]
    hold(bool(rows), "HOLD_V45_EMPTY_JSON_LOG")
    try:
        return json.loads(rows[-1])
    except json.JSONDecodeError as exc:
        raise AggregateHold("HOLD_V45_LAST_JSON_FORMAT") from exc


def normalize_trace(text: str) -> list[tuple[int, float, int, str]]:
    pending: dict[tuple[int, str], tuple[int, float, str]] = {}
    records = []
    sequence = 0
    line_re = re.compile(r"^(\d+)\s+([0-9]+(?:\.[0-9]+)?)\s+(.*)$")
    resumed_re = re.compile(r"^<\.\.\.\s+([A-Za-z0-9_]+) resumed>(.*)$")
    for line in text.splitlines():
        match = line_re.match(line)
        hold(match is not None, "HOLD_V45_TRACE_LINE_FORMAT")
        pid = int(match.group(1))
        timestamp = float(match.group(2))
        body = match.group(3)
        if body.endswith("<unfinished ...>"):
            name = body.split("(", 1)[0].strip()
            pending[(pid, name)] = (
                sequence,
                timestamp,
                body[: -len("<unfinished ...>")].rstrip(),
            )
            sequence += 1
            continue
        resumed = resumed_re.match(body)
        if resumed:
            name = resumed.group(1)
            start = pending.pop((pid, name), None)
            hold(start is not None, "HOLD_V45_TRACE_RESUME_WITHOUT_START")
            start_sequence, start_timestamp, prefix = start
            body = prefix + resumed.group(2)
            records.append((start_sequence, start_timestamp, pid, body))
            sequence += 1
            continue
        records.append((sequence, timestamp, pid, body))
        sequence += 1
    hold(not pending, "HOLD_V45_TRACE_UNFINISHED")
    return sorted(records, key=lambda item: (item[1], item[0]))


def syscall_result(body: str) -> int | None:
    match = re.search(r"\)\s+=\s+(-?\d+)\s*$", body)
    return int(match.group(1)) if match else None


def process_census(trace: bytes, ceilings: dict) -> dict:
    try:
        text = trace.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise AggregateHold("HOLD_V45_TRACE_UTF8") from exc
    records = normalize_trace(text)
    hold(bool(records), "HOLD_V45_EMPTY_PROCESS_TRACE")
    root_pid = records[0][2]
    owner: dict[int, int] = {root_pid: root_pid}
    live = {root_pid}
    all_processes = {root_pid}
    peak = 1
    exec_paths: dict[str, int] = {}
    exec_basenames: dict[str, int] = {}
    exec_records: list[str] = []
    mount_success = 0
    umount_success = 0

    for _, _, pid, body in records:
        result = syscall_result(body)
        if body.startswith("execve(") and result == 0:
            match = re.match(r'execve\("([^"]+)"', body)
            hold(match is not None, "HOLD_V45_EXECVE_PATH")
            path_text = match.group(1)
            exec_paths[path_text] = exec_paths.get(path_text, 0) + 1
            base = Path(path_text).name
            exec_basenames[base] = exec_basenames.get(base, 0) + 1
            exec_records.append(body)
        if body.startswith("mount(") and result == 0:
            mount_success += 1
        if body.startswith("umount2(") and result == 0:
            umount_success += 1

        created = False
        threaded = False
        if body.startswith(("fork(", "vfork(", "clone(", "clone3(")) and result is not None and result > 0:
            created = True
            threaded = body.startswith(("clone(", "clone3(")) and "CLONE_THREAD" in body
        if created:
            child = result
            parent_owner = owner.get(pid, pid)
            if threaded:
                owner[child] = parent_owner
            else:
                owner[child] = child
                live.add(child)
                all_processes.add(child)
                peak = max(peak, len(live))

        if (
            body.startswith("exit_group(")
            or body.startswith("+++ exited with")
            or body.startswith("+++ killed by")
        ):
            process = owner.get(pid, pid)
            live.discard(process)

    def contains_count(*needles: str) -> int:
        return sum(1 for row in exec_records if all(needle in row for needle in needles))

    v41_exec_records = [
        row for row in exec_records
        if "prove_datanet_v41_durable_recovery_campaign_ext4_v1.py" in row
    ]
    v41_entry_execs = sum(1 for row in v41_exec_records if '"--mode"' not in row)
    hold(not live, "HOLD_V45_PROCESS_LIFETIME_NOT_CLOSED")
    hold(len(all_processes) <= ceilings["process_lifetimes_max"], "HOLD_V45_PROCESS_LIFETIME_CEILING")
    hold(peak <= ceilings["peak_processes_max"], "HOLD_V45_PROCESS_PEAK_CEILING")
    hold(sum(exec_paths.values()) <= ceilings["successful_execve_max"], "HOLD_V45_EXECVE_CEILING")
    hold(v41_entry_execs == 1, "HOLD_V45_V41_EXEC_CENSUS")
    hold(contains_count("prove_datanet_v42_fsverity_clean_remount_v1.py", '"capture"') == 2, "HOLD_V45_V42_EXEC_CENSUS")
    hold(contains_count("prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", '"verify"') == 1, "HOLD_V45_V43_EXEC_CENSUS")
    hold(contains_count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", '"capture"') == 1, "HOLD_V45_V44_CAPTURE_CENSUS")
    hold(contains_count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", '"corrupt"') == 1, "HOLD_V45_V44_CORRUPT_CENSUS")
    hold(contains_count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", '"verify"') == 1, "HOLD_V45_V44_VERIFY_CENSUS")
    hold(
        contains_count('execve("/usr/sbin/dmsetup"', '"suspend"', '"--noflush"') == 2,
        "HOLD_V45_DM_SUSPEND_CENSUS",
    )
    hold(mount_success >= 7 and umount_success >= 7, "HOLD_V45_MOUNT_CENSUS")

    return {
        "trace_sha256": sha256_bytes(trace),
        "trace_bytes": len(trace),
        "root_pid": root_pid,
        "runner_subgraph_process_lifetimes": len(all_processes),
        "runner_subgraph_peak_processes": peak,
        "successful_execve": sum(exec_paths.values()),
        "exec_paths": dict(sorted(exec_paths.items())),
        "exec_basenames": dict(sorted(exec_basenames.items())),
        "mount_syscalls_success": mount_success,
        "umount2_syscalls_success": umount_success,
        "all_runner_subgraph_process_lifetimes_closed": True,
        "full_job_process_census": False,
        "v41_campaign_entry_execs": 1,
        "v41_campaign_role_execs": len(v41_exec_records),
        "v42_capture_execs": 2,
        "v43_verify_execs": 1,
        "v44_capture_execs": 1,
        "v44_corrupt_execs": 1,
        "v44_verify_execs": 1,
        "dm_suspend_noflush_execs": 2,
    }


def verify_resource_release(receipt: dict) -> dict:
    for key in ("all_images_removed", "all_loops_released", "all_mappers_released", "all_mounts_released"):
        hold(receipt.get(key) is True, "HOLD_V45_CAPABILITY_RELEASE_RECEIPT")
    hold(receipt.get("marker") == "VOID_DATANET_V45_CAPABILITY_RELEASE_V1_GREEN", "HOLD_V45_CAPABILITY_RELEASE_MARKER")
    hold(receipt.get("status") == "GREEN" and receipt.get("production_runtime_touched") is False, "HOLD_V45_CAPABILITY_RELEASE_STATUS")
    token = receipt.get("resource_token")
    hold(isinstance(token, str) and token.startswith("void-v43-"), "HOLD_V45_RESOURCE_TOKEN")
    kernel_text = Path("/proc/self/mountinfo").read_text(encoding="utf-8", errors="strict")
    for path in Path("/sys/block").glob("loop*/loop/backing_file"):
        try:
            kernel_text += "\n" + path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            pass
    for path in Path("/sys/block").glob("dm-*/dm/name"):
        try:
            kernel_text += "\n" + path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            pass
    hold(token not in kernel_text, "HOLD_V45_LIVE_KERNEL_CAPABILITY")
    return {"resource_token": token, "kernel_scan_clear": True, **{k: True for k in (
        "all_images_removed", "all_loops_released", "all_mappers_released", "all_mounts_released"
    )}}


def verify_static_logs(snapshot: EvidenceSnapshot, node: int) -> None:
    markers = {
        "v41": "VOID_DATANET_V41_FSVERITY_GENERATION_BOUND_RECORD_COMPOSITION_STATIC_V1_GREEN",
        "v42": "VOID_DATANET_V42_FSVERITY_CLEAN_REMOUNT_STATIC_V1_GREEN",
        "v43": "VOID_DATANET_V43_FSVERITY_SUDDEN_LOSS_RECOVERY_STATIC_V1_GREEN",
        "v44": "VOID_DATANET_V44_FSVERITY_RAW_CORRUPTION_DETECTION_STATIC_V1_GREEN",
        "v45": STATIC,
    }
    for version, marker in markers.items():
        row = last_json(snapshot.text(f"{version}-static-{node}.jsonl"))
        hold(row.get("marker") == marker and row.get("status") == "GREEN", "HOLD_V45_STATIC_CHILD")


def verify_tiers(snapshot: EvidenceSnapshot, node: int, cfg: dict) -> dict:
    verify_static_logs(snapshot, node)
    campaign_out = f"datanet-v43-v41-{node}.stdout.log"
    campaign_err = f"datanet-v43-v41-{node}.stderr.log"
    runner_out = f"datanet-v45-runner-{node}.stdout.log"
    hold(snapshot.bytes(campaign_err) == b"", "HOLD_V45_STDERR_NONEMPTY")
    campaign = last_json(snapshot.text(campaign_out))
    hold(campaign.get("marker") == "VOID_DATANET_V41_DURABLE_RECOVERY_CAMPAIGN_V1_GREEN", "HOLD_V45_V41_MARKER")
    hold(campaign["payload_ledger"]["calls"] == 15372 and campaign["payload_ledger"]["completed_mib"] == 960, "HOLD_V45_V41_LEDGER")
    hold(campaign["process_topology"]["total_lifetimes"] == 27 and campaign["process_topology"]["peak_live"] == 9, "HOLD_V45_V41_TOPOLOGY")
    hold(campaign.get("fsverity_record_immutability") is True and campaign.get("production_runtime_touched") is False, "HOLD_V45_V41_STATUS")
    runner = last_json(snapshot.text(runner_out))
    hold(runner.get("marker") == "VOID_DATANET_V45_V43_V44_FULL_STACK_RUN_V1_GREEN", "HOLD_V45_RUNNER_MARKER")

    ev = f"datanet-v43-v41-evidence-{node}"
    v41_manifest = snapshot.json(f"{ev}/manifest.json")
    restart = snapshot.json(f"{ev}/restart-census.json")
    hold(len(restart["e0"]["entries"]) == cfg["ceilings"]["e0_namespace_entries"], "HOLD_V45_E0_NAMESPACE_CEILING")
    hold(len(restart["r0"]["entries"]) == cfg["ceilings"]["r0_namespace_entries"], "HOLD_V45_R0_NAMESPACE_CEILING")

    pre_name = f"datanet-v43-pre-{node}.json"
    post_name = f"datanet-v43-post-{node}.json"
    hold(snapshot.bytes(pre_name) == snapshot.bytes(post_name), "HOLD_V45_V43_PRE_POST_SNAPSHOT")
    tier_snapshot = snapshot.json(post_name)
    hold(tier_snapshot.get("marker") == "VOID_DATANET_V42_FSVERITY_REMOUNT_SNAPSHOT_V1_GREEN", "HOLD_V45_V42_SNAPSHOT")
    hold(tier_snapshot.get("payload_leaves_verified") == 3 and tier_snapshot.get("recovery_records_verified") == 3, "HOLD_V45_V42_LEAF_COUNT")
    hold(set(tier_snapshot["records"]) == {"armed", "claimed", "closed"}, "HOLD_V45_RECORD_SET")
    for item in tier_snapshot["records"].values():
        hold(item["bytes"] <= cfg["ceilings"]["recovery_record_max_bytes"], "HOLD_V45_RECORD_BYTE_CEILING")

    v43_name = f"datanet-v43-final-{node}.json"
    hold(snapshot.bytes(v43_name) == snapshot.bytes(f"datanet-v43-final-{node}.jsonl"), "HOLD_V45_V43_FINAL_DUPLICATE")
    v43 = snapshot.json(v43_name)
    for key in (
        "simulated_sudden_device_loss_proved", "device_mapper_suspend_noflush",
        "snapshot_before_clean_unmount", "crash_image_needs_recovery_pre_replay",
        "same_mapper_device_identity_recreated", "journal_replay_recovery_completed",
        "pre_post_v42_snapshot_equal", "record_inode_generation_stable",
        "record_fsverity_digest_stable", "fresh_v41_admission_after_recovery",
        "same_uid_inplace_mutation_denied_after_recovery",
    ):
        hold(v43.get(key) is True, "HOLD_V45_V43_CLAIM")
    hold(v43.get("physical_power_loss_proved") is False and v43.get("production_runtime_touched") is False, "HOLD_V45_V43_NONCLAIM")

    e0_pre = super_state(snapshot.text(f"datanet-v43-e0-pre-{node}.txt"))
    r0_pre = super_state(snapshot.text(f"datanet-v43-r0-pre-{node}.txt"))
    e0_post = super_state(snapshot.text(f"datanet-v43-e0-post-{node}.txt"))
    r0_post = super_state(snapshot.text(f"datanet-v43-r0-post-{node}.txt"))
    hold(e0_pre["needs_recovery"] and r0_pre["needs_recovery"], "HOLD_V45_V43_NEEDS_RECOVERY_PRE")
    hold(not e0_post["needs_recovery"] and not r0_post["needs_recovery"], "HOLD_V45_V43_NEEDS_RECOVERY_POST")
    hold(all(x["verity"] for x in (e0_pre, r0_pre, e0_post, r0_post)), "HOLD_V45_V43_VERITY_FEATURE")

    crash = parse_kv(snapshot.text(f"datanet-v43-crash-copy-{node}.txt"))
    hold(crash["e0_source_sha256"] == crash["e0_crash_sha256"], "HOLD_V45_E0_CRASH_COPY")
    hold(crash["r0_source_sha256"] == crash["r0_crash_sha256"], "HOLD_V45_R0_CRASH_COPY")
    sources = parse_kv(snapshot.text(f"datanet-v43-sources-{node}.txt"))
    hold(sources["e0_before"] == sources["e0_after"] and sources["r0_before"] == sources["r0_after"], "HOLD_V45_MAPPER_SOURCE_STABILITY")
    hold(sources["e0_dm_before"] == sources["e0_dm_after"] and sources["r0_dm_before"] == sources["r0_dm_after"], "HOLD_V45_MAPPER_IDENTITY_STABILITY")

    capture_name = f"datanet-v45-v44-capture-{node}.json"
    capture = snapshot.json(capture_name)
    verify_seal(capture, "manifest_sha256", "HOLD_V45_V44_CAPTURE_SELF_HASH")
    hold(capture.get("marker") == "VOID_DATANET_V44_FSVERITY_RAW_PREIMAGE_CAPTURE_V1_GREEN", "HOLD_V45_V44_CAPTURE_MARKER")
    hold(capture.get("raw_preimage_matches_sealed_record") is True and capture.get("fiemap_sync_flag_used") is False, "HOLD_V45_V44_PREIMAGE")
    closed = tier_snapshot["records"]["closed"]
    hold(capture["record_identity"] == closed["identity"], "HOLD_V45_V43_V44_RECORD_IDENTITY")
    hold(capture["record_generation"] == closed["generation"], "HOLD_V45_V43_V44_RECORD_GENERATION")
    hold(capture["record_sha256"] == closed["sha256"], "HOLD_V45_V43_V44_RECORD_SHA256")
    hold(capture["fsverity"] == closed["fsverity"], "HOLD_V45_V43_V44_FSVERITY")

    corruption_name = f"datanet-v45-v44-corruption-{node}.json"
    corruption_log = f"datanet-v45-v44-corruption-{node}.jsonl"
    hold(snapshot.bytes(corruption_name) == snapshot.bytes(corruption_log), "HOLD_V45_V44_CORRUPTION_DUPLICATE")
    corruption = snapshot.json(corruption_name)
    hold(corruption["manifest_sha256"] == capture["manifest_sha256"], "HOLD_V45_V44_CORRUPTION_BINDING")
    hold(corruption["bytes_written"] == cfg["ceilings"]["raw_corruption_bytes"], "HOLD_V45_RAW_BYTE_CEILING")
    hold(corruption["before_hex"] == "7b" and corruption["after_hex"] == "7a" and corruption["xor_mask"] == 1, "HOLD_V45_RAW_BYTE_VALUE")
    fields = snapshot.text(f"datanet-v45-v44-raw-diff-{node}.txt").split()
    hold(len(fields) == 3, "HOLD_V45_RAW_DIFF_CARDINALITY")
    hold(int(fields[0]) == corruption["physical_offset"] + 1, "HOLD_V45_RAW_DIFF_OFFSET")
    hold(int(fields[1], 8) == int(corruption["before_hex"], 16), "HOLD_V45_RAW_DIFF_BEFORE")
    hold(int(fields[2], 8) == int(corruption["after_hex"], 16), "HOLD_V45_RAW_DIFF_AFTER")

    final_name = f"datanet-v45-v44-final-{node}.json"
    hold(snapshot.bytes(final_name) == snapshot.bytes(f"datanet-v45-v44-final-{node}.jsonl"), "HOLD_V45_V44_FINAL_DUPLICATE")
    v44 = snapshot.json(final_name)
    for key in (
        "record_identity_stable", "record_generation_stable", "record_metadata_stable",
        "fsverity_root_digest_stable", "fsverity_data_read_eio",
        "actual_v41_admission_fails_on_corrupted_record", "same_uid_write_denied",
        "same_uid_rdwr_denied", "same_uid_truncate_denied",
    ):
        hold(v44.get(key) is True, "HOLD_V45_V44_CLAIM")
    hold(v44.get("fsverity_data_read_errno") == 5 and v44.get("actual_v41_admission_errno") == 5, "HOLD_V45_V44_EIO")
    hold(v44.get("physical_power_loss_proved") is False and v44.get("production_runtime_touched") is False, "HOLD_V45_V44_NONCLAIM")
    v44_super = super_state(snapshot.text(f"datanet-v45-v44-super-after-{node}.txt"))
    hold(v44_super["verity"] and not v44_super["needs_recovery"], "HOLD_V45_V44_SUPER_STATE")
    loop = parse_kv(snapshot.text(f"datanet-v45-v44-loop-{node}.txt"))
    hold(loop["offset"] == "0" and loop["sizelimit"] == "0", "HOLD_V45_V44_LOOP_GEOMETRY")
    dm_fields = loop["dm_table"].split()
    hold(
        loop["dm_name"].startswith(f"void-v43-r0-{node}-")
        and len(dm_fields) >= 5
        and dm_fields[0] == "0"
        and dm_fields[2] == "linear"
        and dm_fields[4] == "0",
        "HOLD_V45_V44_DM_GEOMETRY",
    )

    return {
        "ordered_markers": [
            campaign["marker"],
            tier_snapshot["marker"],
            v43["marker"],
            capture["marker"],
            corruption["marker"],
            v44["marker"],
        ],
        "v41": {
            "total_lifetimes": 27,
            "peak_live": 9,
            "payload_calls": 15372,
            "completed_mib": 960,
            "source_bindings": v41_manifest["source_bindings"],
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


def validate_candidate(obj: dict, expected_head: str, expected_tree: str, actual_inventory: dict) -> None:
    verify_seal(obj, "candidate_sha256", "HOLD_V45_CANDIDATE_SELF_HASH")
    hold(obj.get("head") == expected_head and obj.get("source", {}).get("head") == expected_head, "HOLD_V45_MIXED_HEAD")
    hold(obj.get("tree") == expected_tree and obj.get("source", {}).get("tree") == expected_tree, "HOLD_V45_MIXED_TREE")
    hold(obj.get("run_id") == obj.get("source_execution", {}).get("run_id"), "HOLD_V45_RUN_ID")
    hold(obj.get("mutators_retired") is True and obj.get("capabilities_released") is True, "HOLD_V45_PREMATURE_AGGREGATE")
    hold(set(obj.get("input_inventory", {})) == set(actual_inventory), "HOLD_V45_ARTIFACT_MEMBERSHIP")
    for name, receipt in actual_inventory.items():
        claimed = obj["input_inventory"].get(name)
        hold(claimed == receipt, "HOLD_V45_ARTIFACT_DIGEST")
    hold(obj.get("production_runtime_touched") is False, "HOLD_V45_PRODUCTION_TOUCH")


def candidate_mode(ns: argparse.Namespace, *, include_candidate_aba: bool = True) -> int:
    cfg = load_control()
    root = Path(ns.evidence_root)
    names = expected_inputs(ns.node_major, include_candidate_aba=include_candidate_aba)
    snapshot = EvidenceSnapshot(root, names)
    try:
        generation_control_pause(ns)
        runtime = snapshot.json(f"datanet-v45-runtime-{ns.node_major}.json")
        live_runtime = runtime_inventory(ns.node_major, cfg)
        hold(runtime == live_runtime, "HOLD_V45_RUNTIME_CHANGED")
        hold(runtime["source"]["head"] == ns.expected_head and runtime["source"]["tree"] == ns.expected_tree, "HOLD_V45_RUNTIME_SOURCE_BINDING")
        tiers = verify_tiers(snapshot, ns.node_major, cfg)
        process = process_census(snapshot.bytes(f"datanet-v45-process-{ns.node_major}.trace"), cfg["ceilings"])
        release = verify_resource_release(snapshot.json(f"datanet-v45-capability-release-{ns.node_major}.json"))
        source = source_inventory(cfg)
        hold(source["head"] == ns.expected_head and source["tree"] == ns.expected_tree, "HOLD_V45_SOURCE_BINDING")
        source_execution = verify_source_execution_base(
            snapshot, ns.node_major, source, include_candidate_aba=include_candidate_aba,
        )
        snapshot.assert_stable()
        inv = copy.deepcopy(snapshot.inventory)
    finally:
        snapshot.close()
    obj = {
        "marker": CANDIDATE,
        "status": "GREEN",
        "head": ns.expected_head,
        "tree": ns.expected_tree,
        "run_id": source_execution["run_id"],
        "parent_head": PARENT_HEAD,
        "node_major": ns.node_major,
        "source": source,
        "source_execution": source_execution,
        "runtime": runtime,
        "tiers": tiers,
        "runner_subgraph_process_census": process,
        "process_accounting": {
            "scope": "runner_subgraph_only",
            "runner_subgraph": {
                "trace_complete_within_subgraph": True,
                "process_lifetimes": process["runner_subgraph_process_lifetimes"],
                "successful_execve": process["successful_execve"],
                "peak_processes": process["runner_subgraph_peak_processes"],
            },
            "untraced_phases": {
                phase: {
                    "trace_complete": False,
                    "process_lifetimes": None,
                    "successful_execve": None,
                }
                for phase in (
                    "preallocation_static_runtime",
                    "candidate_aba_control",
                    "candidate",
                    "candidate_controls",
                    "producer_substitution_control",
                    "terminal_aba_control",
                    "terminal_verifier",
                    "source_execution_supervision",
                    "artifact_upload",
                    "cross_runtime_aggregate",
                )
            },
            "full_job_process_census": False,
        },
        "capability_release": release,
        "artifact_generation_bound": True,
        "source_inventory_and_execution_generation_bound": True,
        "external_source_generation_aba_control": True,
        "exact_phase_argv_allowlisted": True,
        "supervisor_owned_create_only_outputs": True,
        "relabeled_help_controls": True,
        "mutators_retired": True,
        "capabilities_released": True,
        "input_inventory": inv,
        "nonclaims": {
            "physical_power_loss_proved": False,
            "hardware_write_cache_loss_proved": False,
            "public_peer_retrieval_proved": False,
            "chain_2050_authority_proved": False,
        },
        "production_runtime_touched": False,
    }
    obj = seal(obj, "candidate_sha256")
    validate_candidate(obj, ns.expected_head, ns.expected_tree, inv)
    write_output(Path(ns.output), canon(obj))
    print(canon(obj).decode(), end="")
    return 0


def candidate_aba_control_mode(ns: argparse.Namespace) -> int:
    try:
        candidate_mode(ns, include_candidate_aba=False)
    except AggregateHold as exc:
        hold(exc.code == "HOLD_V45_ARTIFACT_GENERATION_CHANGED", "HOLD_V45_CANDIDATE_ABA_WRONG_REJECTION")
    else:
        raise AggregateHold("HOLD_V45_CANDIDATE_ABA_ACCEPTED")
    out = seal({
        "marker": "VOID_DATANET_V45_CANDIDATE_ABA_CONTROL_V1_GREEN",
        "status": "GREEN",
        "rejection": "HOLD_V45_ARTIFACT_GENERATION_CHANGED",
        "production_runtime_touched": False,
    }, "receipt_sha256")
    write_output(Path(ns.output), canon(out))
    print(canon(out).decode(), end="")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="mode", required=True)
    sub.add_parser("static")
    rt = sub.add_parser("runtime")
    rt.add_argument("--node-major", type=int, required=True, choices=(22, 24, 26))
    rt.add_argument("--output", required=True)
    for mode in ("candidate", "candidate-aba-control"):
        p = sub.add_parser(mode)
        p.add_argument("--node-major", type=int, required=True, choices=(22, 24, 26))
        p.add_argument("--evidence-root", required=True)
        p.add_argument("--expected-head", required=True)
        p.add_argument("--expected-tree", required=True)
        p.add_argument("--output", required=True)
        p.add_argument("--generation-control-ready", required=mode == "candidate-aba-control")
        p.add_argument("--generation-control-continue", required=mode == "candidate-aba-control")
    ns = parser.parse_args()
    if ns.mode == "static":
        return static_mode()
    if ns.mode == "runtime":
        return runtime_mode(ns)
    if ns.mode == "candidate":
        return candidate_mode(ns)
    return candidate_aba_control_mode(ns)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AggregateHold as exc:
        print(json.dumps({"marker": "VOID_DATANET_V45_HOLD", "code": exc.code}, sort_keys=True), file=sys.stderr)
        raise

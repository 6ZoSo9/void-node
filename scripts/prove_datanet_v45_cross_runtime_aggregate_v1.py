#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
"""Independent downstream admission of the exact Node 22/24/26 V45 artifacts."""
from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import types
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"
PER_NODE_MARKER = "VOID_DATANET_V45_FULL_STACK_EVIDENCE_AGGREGATE_V2_GREEN"
TOP_MARKER = "VOID_DATANET_V45_NODE_22_24_26_TOP_AGGREGATE_V1_GREEN"
SOURCE_EXECUTION_MARKER = "VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN"
SOURCE_ABA_MARKER = "VOID_DATANET_V45_SOURCE_GENERATION_ABA_CONTROL_V1_GREEN"
SOURCE_SUPERVISOR = "scripts/prove_datanet_v45_source_execution_v1.py"
PHASE_CONTROL_MARKER = "VOID_DATANET_V45_PHASE_OUTPUT_CONTROL_V1_GREEN"
PHASE_CONTRACT_ID = "VOID_DATANET_V45_EXACT_PHASE_ARGV_AND_OUTPUT_CONTRACT_V1"
STALE_ATTEMPT_MARKER = "VOID_DATANET_V45_STALE_ATTEMPT_CONTROL_V1_GREEN"
STALE_ATTEMPT_HOLD = "HOLD_V45_MATRIX_STALE_ATTEMPT"
NODES = (22, 24, 26)
MAX_API_BYTES = 8 * 1024 * 1024
MAX_ARCHIVE_BYTES = 128 * 1024 * 1024
MAX_ARCHIVE_MEMBERS = 128
MAX_MEMBER_BYTES = 64 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 256 * 1024 * 1024



_CUSTODY_ACCESS = None

def custody_access():
    global _CUSTODY_ACCESS
    if _CUSTODY_ACCESS is None:
        path = ROOT / "scripts/datanet_v45_custody_session_v1.py"
        module = types.ModuleType("void_v45_custody_inputs")
        module.__file__ = str(path)
        exec(compile(path.read_bytes(),str(path),"exec"),module.__dict__)
        _CUSTODY_ACCESS = module
    return _CUSTODY_ACCESS


def custody_artifact_open(path: Path, *, control_snapshot: bool=False) -> int:
    return custody_access().borrowed_open(path,control_snapshot=control_snapshot)


def custody_artifact_read(path: Path) -> bytes:
    fd=custody_artifact_open(path)
    try:return custody_access().read_fd(fd)
    finally:os.close(fd)


class MatrixHold(AssertionError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def require(condition: bool, code: str) -> None:
    if not condition:
        raise MatrixHold(code)


def canon(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()



def verify_custody_control_result(obj: dict) -> None:
    expected = ("normal","third-role-distinct","third-role-identical","unsupported-publication",
                "paired-substitution","identical-substitution","inplace-paired-change","manifest-substitution",
                "parent-replacement","after-lend-substitution","unsealed-input","missing-custody",
                "capsule-replacement","duplicate-log-commitment","stale-attempt")
    require(obj.get("marker")=="VOID_DATANET_V45_CUSTODY_INTEGRATION_V1_GREEN" and obj.get("status")=="GREEN"
          and obj.get("real_supervisor_run_exercised") is True and obj.get("synthetic_inputs") is True
          and obj.get("storage_campaign_executed") is False and obj.get("full_campaign_accepted") is False,
          "HOLD_V45_CUSTODY_CONTROL_RESULT")
    rows=obj.get("cases")
    require(type(rows) is list and [r.get("case") for r in rows]==list(expected)
          and all(r.get("status")=="PASS" for r in rows),"HOLD_V45_CUSTODY_CONTROL_CASES")
    by_name={r["case"]:r for r in rows}
    for name in ("third-role-distinct","third-role-identical"):
        row=by_name[name]
        require(row.get("rejection")=="HOLD_V45_OUTPUT_PREEXISTING" and row.get("success_receipt") is False
              and row.get("published_provisional_outputs")==2 and row.get("sentinel_preserved") is True,
              "HOLD_V45_CUSTODY_THIRD_ROLE_CONTROL")
    for name in ("third-role-distinct","third-role-identical","paired-substitution"):
        require(by_name[name].get("canonical_consumers")=={k:"HOLD_V45_CUSTODY_REQUIRED" for k in ("candidate_mode","finalize","aggregate")},
              "HOLD_V45_CUSTODY_CONSUMER_CONTROL")


def phase_contract(phase: str, node: int) -> dict:
    py = ["python3", "-I", "-B", "@ENTRYPOINT@"]
    n, head, tree = "@NODE_MAJOR@", "@EXPECTED_HEAD@", "@EXPECTED_TREE@"
    specs = {
        "custody-selftest": {"entrypoint": "scripts/prove_datanet_v45_custody_integration_v1.py",
                             "argv": py + ["--output", "@OUTPUT@"]},
        "source-generation-aba-control": {"entrypoint": "scripts/run_datanet_v45_full_stack_ext4_v1.sh", "argv": ["/usr/bin/bash", "@ENTRYPOINT@"], "owned": [], "bind": []},
        "cross-runtime-source-generation-aba-control": {"entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py", "argv": py + ["selftest"], "owned": [], "bind": []},
        "v41-static": {"entrypoint": "scripts/prove_datanet_v41_static_gate_v1.py", "argv": py},
        "v42-static": {"entrypoint": "scripts/prove_datanet_v42_fsverity_clean_remount_v1.py", "argv": py + ["static"]},
        "v43-static": {"entrypoint": "scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", "argv": py + ["static"]},
        "v44-static": {"entrypoint": "scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", "argv": py + ["static"]},
        "v45-static": {"entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", "argv": py + ["static"]},
        "matrix-selftest": {"entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py", "argv": py + ["selftest"], "owned": [], "bind": [], "pipe": True},
        "cross-runtime-selftest": {"entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py", "argv": py + ["selftest"], "owned": [], "bind": [], "pipe": True},
        "runtime": {"entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", "argv": py + ["runtime", "--node-major", n, "--output", "@OUTPUT@"]},
        "runner": {
            "entrypoint": "scripts/run_datanet_v45_full_stack_ext4_v1.sh", "stdin": True,
            "owned": ["RUNNER_STDOUT", "TRACE"], "bind": ["RUNNER_STDOUT", "TRACE"],
            "stdout": "RUNNER_STDOUT", "stderr": "TRACE", "paths": ["EVIDENCE_ROOT"],
            "argv": [
                "timeout", "--signal=TERM", "--kill-after=60s", "70m", "sudo", "strace", "-f", "-q",
                "-ttt", "-s", "4096", "-e", "trace=process,mount,umount2", "-o", "/dev/stderr",
                "-u", "@RUNNER_USER@", "/usr/bin/env", "-i", "PATH=@ENV_PATH@", "LANG=C.UTF-8",
                "GIT_DIR=@REPO_ROOT@/.git", "GIT_WORK_TREE=@REPO_ROOT@", "VOID_V45_NODE_MAJOR=@NODE_MAJOR@",
                "VOID_V45_RUN_ID=@RUN_ID@", "VOID_V45_RUN_ATTEMPT=@RUN_ATTEMPT@",
                "VOID_V45_EXPECTED_HEAD=@EXPECTED_HEAD@",
                "VOID_V45_OUT_DIR=@EVIDENCE_ROOT@", "/usr/bin/bash", "-s",
            ],
        },
        "candidate-aba": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", "paths": ["EVIDENCE_ROOT", "GENERATION_READY", "GENERATION_CONTINUE"],
            "argv": py + ["candidate-aba-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@", "--expected-head", head, "--expected-tree", tree, "--generation-control-ready", "@GENERATION_READY@", "--generation-control-continue", "@GENERATION_CONTINUE@", "--output", "@OUTPUT@"],
        },
        "candidate": {"entrypoint": "scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", "paths": ["EVIDENCE_ROOT"], "argv": py + ["candidate", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@", "--expected-head", head, "--expected-tree", tree, "--output", "@OUTPUT@"]},
        "controls": {
            "entrypoint": "scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py",
            "owned": ["OUTPUT", "SUBSTITUTE_CANDIDATE", "SUBSTITUTE_CONTROLS"], "bind": ["OUTPUT"], "paths": ["CANDIDATE", "CANDIDATE_ABA_RECEIPT"],
            "argv": py + ["--candidate", "@CANDIDATE@", "--candidate-generation-control-receipt", "@CANDIDATE_ABA_RECEIPT@", "--expected-head", head, "--expected-tree", tree, "--substitute-candidate-output", "@SUBSTITUTE_CANDIDATE@", "--substitute-controls-output", "@SUBSTITUTE_CONTROLS@", "--output", "@OUTPUT@"],
        },
        "producer-control": {"entrypoint": "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py", "paths": ["EVIDENCE_ROOT", "SUBSTITUTE_CANDIDATE", "SUBSTITUTE_CONTROLS"], "argv": py + ["producer-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@", "--expected-head", head, "--expected-tree", tree, "--substitute-candidate", "@SUBSTITUTE_CANDIDATE@", "--substitute-controls", "@SUBSTITUTE_CONTROLS@", "--output", "@OUTPUT@"]},
        "terminal-aba": {"entrypoint": "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py", "paths": ["EVIDENCE_ROOT", "GENERATION_READY", "GENERATION_CONTINUE"], "argv": py + ["terminal-aba-control", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@", "--expected-head", head, "--expected-tree", tree, "--generation-control-ready", "@GENERATION_READY@", "--generation-control-continue", "@GENERATION_CONTINUE@", "--output", "@OUTPUT@"]},
        "finalizer": {"entrypoint": "scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py", "paths": ["EVIDENCE_ROOT"], "argv": py + ["finalize", "--node-major", n, "--evidence-root", "@EVIDENCE_ROOT@", "--expected-head", head, "--expected-tree", tree, "--output", "@OUTPUT@"]},
        "cross-runtime-stale-attempt-control": {
            "entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
            "argv": py + ["stale-attempt-control", "--run-id", "@RUN_ID@", "--control-run-attempt", "@RUN_ATTEMPT@", "--expected-head", head, "--producer-attempt", "1", "--finalizer-attempt", "2", "--output", "@OUTPUT@"],
        },
        "cross-runtime-aggregate": {
            "entrypoint": "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
            "paths": ["SOURCE_CONTROL_RECEIPT", "SELFTEST_RECEIPT", "PHASE_ARGV_CONTROL_RECEIPT", "PREEXISTING_OUTPUT_CONTROL_RECEIPT", "STALE_ATTEMPT_CONTROL", "STALE_ATTEMPT_CONTROL_RECEIPT"],
            "argv": py + ["aggregate", "--repository", "6ZoSo9/void-node", "--run-id", "@RUN_ID@", "--run-attempt", "@RUN_ATTEMPT@", "--api-url", "https://api.github.com", "--expected-head", head, "--expected-tree", tree, "--source-generation-control-receipt", "@SOURCE_CONTROL_RECEIPT@", "--source-selftest-receipt", "@SELFTEST_RECEIPT@", "--phase-argv-control-receipt", "@PHASE_ARGV_CONTROL_RECEIPT@", "--preexisting-output-control-receipt", "@PREEXISTING_OUTPUT_CONTROL_RECEIPT@", "--stale-attempt-control", "@STALE_ATTEMPT_CONTROL@", "--stale-attempt-control-receipt", "@STALE_ATTEMPT_CONTROL_RECEIPT@", "--output", "@OUTPUT@"],
        },
    }
    spec = copy.deepcopy(specs[phase])
    spec.setdefault("owned", ["OUTPUT"])
    spec.setdefault("bind", ["OUTPUT"])
    spec.setdefault("stdout", None)
    spec.setdefault("stderr", None)
    spec.setdefault("paths", [])
    spec.setdefault("stdin", False)
    spec.setdefault("pipe", phase not in ("source-generation-aba-control", "cross-runtime-source-generation-aba-control", "v41-static", "v42-static", "v43-static", "v44-static", "v45-static", "runner"))
    if phase in ("v41-static", "v42-static", "v43-static", "v44-static", "v45-static"):
        spec["stdout"] = "OUTPUT"
    return spec


def expected_phase_contract(spec: dict, argv_allowlisted: bool = True) -> dict:
    return {
        "id": PHASE_CONTRACT_ID,
        "argv_allowlisted": argv_allowlisted,
        "expected_argv_sha256": digest(canon({"argv": spec["argv"]})),
        "owned_output_roles": spec["owned"],
        "bound_output_roles": spec["bind"],
        "stdout_output_role": spec["stdout"],
        "stderr_output_role": spec["stderr"],
        "path_token_roles": spec["paths"],
    }


def verify_argument_and_path_bindings(
    obj: dict, spec: dict, node: int, run_id: int, run_attempt: int, created: list[dict],
) -> None:
    declared_outputs = obj.get("declared_output_paths")
    declared_paths = obj.get("declared_path_tokens")
    require(
        isinstance(declared_outputs, list) and [item.get("role") for item in declared_outputs] == spec["owned"]
        and isinstance(declared_paths, list) and [item.get("role") for item in declared_paths] == spec["paths"],
        "HOLD_V45_MATRIX_PHASE_DECLARED_PATHS",
    )
    created_by_role = {item["role"]: item for item in created}
    values: dict[str, str] = {}
    for item in declared_outputs + declared_paths:
        require(set(item) == {"role", "path", "name", "path_sha256"}, "HOLD_V45_MATRIX_PHASE_DECLARED_PATHS")
        path = Path(item["path"])
        require(
            path.is_absolute() and path.name == item["name"] and digest(item["path"].encode("utf-8")) == item["path_sha256"],
            "HOLD_V45_MATRIX_PHASE_DECLARED_PATHS",
        )
        values[f"@{item['role']}@"] = item["path"]
        if item["role"] in created_by_role:
            require(created_by_role[item["role"]]["name"] == item["name"], "HOLD_V45_MATRIX_PHASE_OUTPUT_IDENTITY")
    outputs_by_role = {item["role"]: item for item in declared_outputs}
    paths_by_role = {item["role"]: item for item in declared_paths}
    if "EVIDENCE_ROOT" in paths_by_role and obj.get("phase") not in ("candidate-aba", "terminal-aba"):
        evidence_root = Path(paths_by_role["EVIDENCE_ROOT"]["path"])
        for role in ("OUTPUT", "RUNNER_STDOUT", "TRACE"):
            if role in outputs_by_role:
                require(Path(outputs_by_role[role]["path"]).parent == evidence_root, "HOLD_V45_MATRIX_PHASE_OUTPUT_IDENTITY")
    if "CANDIDATE" in paths_by_role:
        require(
            Path(outputs_by_role["OUTPUT"]["path"]).parent == Path(paths_by_role["CANDIDATE"]["path"]).parent
            and paths_by_role["CANDIDATE"]["name"] == f"datanet-v45-candidate-{node}.json"
            and paths_by_role["CANDIDATE_ABA_RECEIPT"]["name"] == f"datanet-v45-candidate-aba-control-{node}.json",
            "HOLD_V45_MATRIX_PHASE_OUTPUT_IDENTITY",
        )
    if "SUBSTITUTE_CANDIDATE" in paths_by_role:
        require(
            paths_by_role["SUBSTITUTE_CANDIDATE"]["name"] == "substitute-candidate.json"
            and paths_by_role["SUBSTITUTE_CONTROLS"]["name"] == "substitute-controls.json"
            and Path(paths_by_role["SUBSTITUTE_CANDIDATE"]["path"]).parent
            == Path(paths_by_role["SUBSTITUTE_CONTROLS"]["path"]).parent,
            "HOLD_V45_MATRIX_PHASE_OUTPUT_IDENTITY",
        )
    if "SOURCE_CONTROL_RECEIPT" in paths_by_role:
        output_parent = Path(outputs_by_role["OUTPUT"]["path"]).parent
        require(
            all(Path(item["path"]).parent == output_parent for item in declared_paths)
            and outputs_by_role["OUTPUT"]["name"]
            == f"datanet-v45-node-22-24-26-top-{obj['head']}-attempt-{run_attempt}.json"
            and paths_by_role["SOURCE_CONTROL_RECEIPT"]["name"] == "datanet-v45-source-generation-aba-control-top.json"
            and paths_by_role["SELFTEST_RECEIPT"]["name"] == "datanet-v45-source-execution-cross-runtime-selftest.json"
            and paths_by_role["PHASE_ARGV_CONTROL_RECEIPT"]["name"] == "datanet-v45-phase-argv-control-cross-runtime-selftest.json"
            and paths_by_role["PREEXISTING_OUTPUT_CONTROL_RECEIPT"]["name"] == "datanet-v45-preexisting-output-control-cross-runtime-aggregate.json"
            and paths_by_role["STALE_ATTEMPT_CONTROL"]["name"] == "datanet-v45-stale-attempt-control-top.json"
            and paths_by_role["STALE_ATTEMPT_CONTROL_RECEIPT"]["name"]
            == "datanet-v45-source-execution-cross-runtime-stale-attempt-control.json",
            "HOLD_V45_MATRIX_PHASE_OUTPUT_IDENTITY",
        )
    bindings = obj.get("argument_token_bindings")
    expected_tokens = sorted({token for arg in spec["argv"] for token in re.findall(r"@[A-Z_]+@", arg)})
    require(isinstance(bindings, dict) and sorted(bindings) == expected_tokens, "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    require(bindings.get("@NODE_MAJOR@", str(node)) == str(node), "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    require(bindings.get("@EXPECTED_HEAD@", obj["head"]) == obj["head"], "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    require(bindings.get("@EXPECTED_TREE@", obj["tree"]) == obj["tree"], "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    require(bindings.get("@RUN_ID@", str(run_id)) == str(run_id), "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    require(
        bindings.get("@RUN_ATTEMPT@", str(run_attempt)) == str(run_attempt),
        "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS",
    )
    for token, value in values.items():
        if token in expected_tokens:
            require(bindings.get(token) == value, "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    if "@ENTRYPOINT@" in bindings:
        require(re.fullmatch(r"/proc/self/fd/[0-9]+", bindings["@ENTRYPOINT@"]) is not None, "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    for token in ("@REPO_ROOT@", "@SOURCE_ROOT@"):
        if token in bindings:
            require(Path(bindings[token]).is_absolute(), "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    if "@ENV_PATH@" in bindings:
        require(bool(bindings["@ENV_PATH@"]) and "@" not in bindings["@ENV_PATH@"], "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    if "@RUNNER_USER@" in bindings:
        require(re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.-]*\$?", bindings["@RUNNER_USER@"]) is not None, "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
    resolved = []
    for raw in spec["argv"]:
        arg = raw
        for token, value in bindings.items():
            arg = arg.replace(token, value)
        require("@" not in arg, "HOLD_V45_MATRIX_PHASE_ARGUMENT_BINDINGS")
        resolved.append(arg)
    require(
        obj.get("resolved_argv_sha256") == digest(canon({"argv": resolved}))
        and obj.get("resolved_argv_reconstructed_from_exact_template_and_bindings") is True,
        "HOLD_V45_MATRIX_PHASE_RESOLVED_ARGV",
    )


def git_blob(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def verify_seal(value: dict, field: str, code: str) -> None:
    claimed = value.get(field)
    body = copy.deepcopy(value)
    body.pop(field, None)
    require(isinstance(claimed, str) and len(claimed) == 64 and digest(canon(body)) == claimed, code)


def seal(value: dict, field: str) -> dict:
    out = copy.deepcopy(value)
    out.pop(field, None)
    out[field] = digest(canon(out))
    return out


def json_bytes(data: bytes, code: str) -> dict:
    try:
        value = json.loads(data.decode("utf-8", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise MatrixHold(code) from exc
    require(isinstance(value, dict), code)
    return value


def git_text(*args: str) -> str:
    return subprocess.run(args, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def fingerprint(st: os.stat_result) -> tuple[int, ...]:
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_nlink, st.st_uid, st.st_gid,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )


def read_fd_fully(fd: int, expected: int) -> bytes:
    pieces = []
    left = expected
    while left > 0:
        piece = os.read(fd, min(left, 1024 * 1024))
        require(bool(piece), "HOLD_V45_MATRIX_SOURCE_SHORT_READ")
        pieces.append(piece)
        left -= len(piece)
    require(os.read(fd, 1) == b"", "HOLD_V45_MATRIX_SOURCE_SIZE_GROWTH")
    return b"".join(pieces)


def read_one_generation(path: Path) -> tuple[bytes, os.stat_result]:
    require(path.is_absolute() and path.name not in ("", ".", ".."), "HOLD_V45_MATRIX_SOURCE_PATH")
    dflags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fflags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    parent = os.open(path.parent, dflags)
    fd = -1
    try:
        parent_key = fingerprint(os.fstat(parent))
        visible = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        fd = os.open(path.name, fflags, dir_fd=parent)
        before = os.fstat(fd)
        require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1, "HOLD_V45_MATRIX_SOURCE_REGULAR")
        require(fingerprint(visible) == fingerprint(before), "HOLD_V45_MATRIX_SOURCE_OPEN_GENERATION")
        data = read_fd_fully(fd, before.st_size)
        after = os.fstat(fd)
        require(fingerprint(after) == fingerprint(before), "HOLD_V45_MATRIX_SOURCE_CHANGED")
        require(
            fingerprint(os.stat(path.name, dir_fd=parent, follow_symlinks=False)) == fingerprint(after),
            "HOLD_V45_MATRIX_SOURCE_REPLACED",
        )
        require(fingerprint(os.fstat(parent)) == parent_key, "HOLD_V45_MATRIX_SOURCE_PARENT_ABA")
        return data, after
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent)


def write_output(path: Path, data: bytes) -> None:
    if os.environ.get("VOID_V45_OUTPUT_CUSTODY_V1") == "1":
        try:
            mapping = json.loads(os.environ["VOID_V45_OUTPUT_FDS"])
            fd = mapping[str(path)]
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise MatrixHold("HOLD_V45_MATRIX_OUTPUT_FD_CONTRACT") from exc
        require(isinstance(fd, int) and fd >= 3, "HOLD_V45_MATRIX_OUTPUT_FD_CONTRACT")
        before = os.fstat(fd)
        require(
            stat.S_ISREG(before.st_mode) and before.st_nlink == 1
            and stat.S_IMODE(before.st_mode) == 0o400 and before.st_size == 0,
            "HOLD_V45_MATRIX_OUTPUT_FD_SHAPE",
        )
        offset = 0
        while offset < len(data):
            written = os.write(fd, data[offset:])
            require(written > 0, "HOLD_V45_MATRIX_OUTPUT_FD_WRITE")
            offset += written
        os.fsync(fd)
        after = os.fstat(fd)
        require(
            (before.st_dev, before.st_ino, before.st_mode, before.st_nlink, before.st_uid, before.st_gid)
            == (after.st_dev, after.st_ino, after.st_mode, after.st_nlink, after.st_uid, after.st_gid)
            and after.st_size == len(data),
            "HOLD_V45_MATRIX_OUTPUT_FD_CHANGED",
        )
        return
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags, 0o600)
    try:
        offset = 0
        while offset < len(data):
            written = os.write(fd, data[offset:])
            require(written > 0, "HOLD_V45_MATRIX_OUTPUT_WRITE")
            offset += written
        os.fsync(fd)
    finally:
        os.close(fd)


def current_source() -> dict:
    fixture_bytes, _ = read_one_generation(FIXTURE)
    expected_fixture_blob = git_text(
        "git", "rev-parse",
        "HEAD:fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json",
    )
    require(git_blob(fixture_bytes) == expected_fixture_blob, "HOLD_V45_MATRIX_FIXTURE_HEAD_DRIFT")
    cfg = json_bytes(fixture_bytes, "HOLD_V45_MATRIX_FIXTURE")
    paths = cfg.get("source_wall_paths")
    require(isinstance(paths, list) and paths == sorted(set(paths)), "HOLD_V45_MATRIX_SOURCE_WALL_CANONICAL")
    head = git_text("git", "rev-parse", "HEAD")
    tree = git_text("git", "rev-parse", "HEAD^{tree}")
    listing = subprocess.run(["git", "ls-tree", "-r", "--full-tree", "HEAD"], check=True, stdout=subprocess.PIPE).stdout
    tracked = {}
    for line in listing.decode("utf-8", errors="strict").splitlines():
        left, path = line.split("\t", 1)
        mode, kind, blob = left.split()
        tracked[path] = {"mode": mode, "type": kind, "git_blob": blob}
    entries = {}
    for path in paths:
        item = tracked.get(path)
        require(item is not None and item["type"] == "blob", "HOLD_V45_MATRIX_SOURCE_WALL_MEMBER")
        source_path = ROOT / path
        data, source_stat = read_one_generation(source_path)
        require(git_blob(data) == item["git_blob"], "HOLD_V45_MATRIX_SOURCE_WORKTREE_DRIFT")
        worktree_mode = stat.S_IMODE(source_stat.st_mode)
        worktree_git_mode = "100755" if worktree_mode & 0o111 else "100644"
        require(worktree_git_mode == item["mode"], "HOLD_V45_MATRIX_SOURCE_MODE_DRIFT")
        entries[path] = {**item, "worktree_mode": worktree_mode, "bytes": len(data), "sha256": digest(data)}
    return {
        "head": head,
        "tree": tree,
        "recursive_entry_count": len(listing.splitlines()),
        "recursive_listing_sha256": digest(listing),
        "source_wall_paths_sha256": digest(canon({"paths": paths})),
        "source_wall_entry_count": len(entries),
        "source_wall_entries": entries,
        "transitive_source_wall_verified": True,
    }


def validate_source_execution_object(
    obj: dict,
    phase: str,
    entrypoint: str,
    outputs: tuple[tuple[str, bytes], ...],
    node: int,
    run_id: int,
    run_attempt: int,
    source: dict,
) -> str:
    verify_seal(obj, "receipt_sha256", "HOLD_V45_MATRIX_SOURCE_EXECUTION_SEAL")
    wall = source["source_wall_entries"]
    supervisor = wall[SOURCE_SUPERVISOR]
    admitted = wall[entrypoint]
    spec = phase_contract(phase, node)
    bound = [{"name": name, "bytes": len(data), "sha256": digest(data)} for name, data in outputs]
    created = obj.get("created_output_bindings")
    require(isinstance(created, list) and [item.get("role") for item in created] == spec["owned"], "HOLD_V45_MATRIX_SOURCE_OUTPUT_CUSTODY")
    created_by_role = {item["role"]: item for item in created}
    for role, item in zip(spec["bind"], bound):
        require(
            created_by_role[role] == {**item, "role": role, "mode": 0o400, "created_empty_before_child": True},
            "HOLD_V45_MATRIX_SOURCE_OUTPUT_CUSTODY",
        )
    if phase == "controls":
        for role, name in (("SUBSTITUTE_CANDIDATE", "substitute-candidate.json"), ("SUBSTITUTE_CONTROLS", "substitute-controls.json")):
            item = created_by_role[role]
            require(
                item.get("name") == name and item.get("mode") == 0o400
                and item.get("created_empty_before_child") is True
                and isinstance(item.get("bytes"), int) and item["bytes"] > 0
                and re.fullmatch(r"[0-9a-f]{64}", item.get("sha256", "")) is not None,
                "HOLD_V45_MATRIX_SOURCE_OUTPUT_CUSTODY",
            )
    verify_argument_and_path_bindings(obj, spec, node, run_id, run_attempt, created)
    require(
        obj.get("marker") == SOURCE_EXECUTION_MARKER
        and obj.get("status") == "GREEN"
        and obj.get("phase") == phase
        and obj.get("node_major") == node
        and obj.get("run_id") == run_id
        and obj.get("run_attempt") == run_attempt
        and obj.get("head") == source["head"]
        and obj.get("tree") == source["tree"]
        and obj.get("source_inventory_sha256") == digest(canon(source))
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
        and obj.get("stdout_captured_by_supervisor") is True
        and obj.get("stderr_captured_by_supervisor") is (spec["stderr"] is not None)
        and obj.get("production_runtime_touched") is False,
        "HOLD_V45_MATRIX_SOURCE_EXECUTION_RECEIPT",
    )
    if spec["stdout"] is not None:
        require(obj.get("stdout_binding") == created_by_role[spec["stdout"]], "HOLD_V45_MATRIX_SOURCE_EXECUTION_STDOUT")
    elif outputs:
        primary = bound[0]
        require(
            obj.get("stdout_binding") == {"role": "SUPERVISOR_PIPE", "bytes": primary["bytes"], "sha256": primary["sha256"]},
            "HOLD_V45_MATRIX_SOURCE_EXECUTION_STDOUT",
        )
    else:
        stdout = obj.get("stdout_binding")
        require(
            isinstance(stdout, dict) and stdout.get("role") == "SUPERVISOR_PIPE"
            and isinstance(stdout.get("bytes"), int) and stdout["bytes"] > 0
            and re.fullmatch(r"[0-9a-f]{64}", stdout.get("sha256", "")) is not None,
            "HOLD_V45_MATRIX_SOURCE_EXECUTION_STDOUT",
        )
    if spec["stderr"] is not None:
        require(obj.get("stderr_binding") == created_by_role[spec["stderr"]], "HOLD_V45_MATRIX_SOURCE_EXECUTION_STDERR")
    else:
        require(obj.get("stderr_binding") is None, "HOLD_V45_MATRIX_SOURCE_EXECUTION_STDERR")
    return obj["receipt_sha256"]


def validate_phase_control_object(
    obj: dict, phase: str, kind: str, node: int, run_id: int, run_attempt: int, source: dict,
) -> str:
    verify_seal(obj, "receipt_sha256", "HOLD_V45_MATRIX_PHASE_CONTROL_SEAL")
    spec = phase_contract(phase, node)
    if kind == "relabeled-help":
        presented = ["python3", "-I", "-B", "@ENTRYPOINT@", "--help"]
        rejection = "HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED"
        flag = "phase_argv_mismatch_rejected_before_output_create"
        allowlisted = False
    else:
        presented = spec["argv"]
        rejection = "HOLD_V45_OUTPUT_PREEXISTING"
        flag = "preexisting_output_rejected_before_child"
        allowlisted = True
    wall = source["source_wall_entries"]
    entrypoint = spec["entrypoint"]
    declared_outputs = obj.get("declared_output_paths")
    declared_paths = obj.get("declared_path_tokens")
    require(
        isinstance(declared_outputs, list) and [item.get("role") for item in declared_outputs] == spec["owned"]
        and isinstance(declared_paths, list) and [item.get("role") for item in declared_paths] == spec["paths"],
        "HOLD_V45_MATRIX_PHASE_CONTROL_PATHS",
    )
    for item in declared_outputs + declared_paths:
        require(
            set(item) == {"role", "path", "name", "path_sha256"}
            and Path(item["path"]).is_absolute() and Path(item["path"]).name == item["name"]
            and digest(item["path"].encode("utf-8")) == item["path_sha256"],
            "HOLD_V45_MATRIX_PHASE_CONTROL_PATHS",
        )
    outputs_by_role = {item["role"]: item for item in declared_outputs}
    paths_by_role = {item["role"]: item for item in declared_paths}
    if phase == "finalizer":
        require(
            outputs_by_role["OUTPUT"]["name"] == f"datanet-v45-aggregate-{node}.json"
            and Path(outputs_by_role["OUTPUT"]["path"]).parent == Path(paths_by_role["EVIDENCE_ROOT"]["path"]),
            "HOLD_V45_MATRIX_PHASE_CONTROL_OUTPUT",
        )
    if phase == "cross-runtime-aggregate":
        expected_name = f"datanet-v45-node-22-24-26-top-{source['head']}-attempt-{run_attempt}.json"
        output_parent = Path(outputs_by_role["OUTPUT"]["path"]).parent
        require(
            outputs_by_role["OUTPUT"]["name"] == expected_name
            and all(Path(item["path"]).parent == output_parent for item in declared_paths),
            "HOLD_V45_MATRIX_PHASE_CONTROL_OUTPUT",
        )
    require(
        obj.get("marker") == PHASE_CONTROL_MARKER
        and obj.get("status") == "GREEN"
        and obj.get("control_kind") == kind
        and obj.get("rejection") == rejection
        and obj.get("phase") == phase
        and obj.get("node_major") == node
        and obj.get("run_id") == run_id
        and obj.get("run_attempt") == run_attempt
        and obj.get("head") == source["head"]
        and obj.get("tree") == source["tree"]
        and obj.get("source_inventory_sha256") == digest(canon(source))
        and obj.get("supervisor", {}).get("git_blob") == wall[SOURCE_SUPERVISOR]["git_blob"]
        and obj.get("entrypoint", {}).get("path") == entrypoint
        and obj.get("entrypoint", {}).get("git_blob") == wall[entrypoint]["git_blob"]
        and obj.get("command_template") == presented
        and obj.get("presented_argv_sha256") == digest(canon({"argv": presented}))
        and obj.get("phase_contract") == expected_phase_contract(spec, allowlisted)
        and obj.get(flag) is True
        and obj.get("child_started") is False
        and obj.get("production_runtime_touched") is False,
        "HOLD_V45_MATRIX_PHASE_CONTROL_RECEIPT",
    )
    return obj["receipt_sha256"]


def validate_source_aba_object(
    obj: dict,
    phase: str,
    entrypoint: str,
    target: str,
    node: int,
    run_id: int,
    run_attempt: int,
    source: dict,
) -> str:
    verify_seal(obj, "receipt_sha256", "HOLD_V45_MATRIX_SOURCE_ABA_SEAL")
    wall = source["source_wall_entries"]
    require(
        obj.get("marker") == SOURCE_ABA_MARKER
        and obj.get("status") == "GREEN"
        and obj.get("phase") == phase
        and obj.get("node_major") == node
        and obj.get("run_id") == run_id
        and obj.get("run_attempt") == run_attempt
        and obj.get("head") == source["head"]
        and obj.get("tree") == source["tree"]
        and obj.get("source_inventory_sha256") == digest(canon(source))
        and obj.get("supervisor", {}).get("path") == SOURCE_SUPERVISOR
        and obj.get("supervisor", {}).get("git_blob") == wall[SOURCE_SUPERVISOR]["git_blob"]
        and obj.get("supervisor", {}).get("sha256") == wall[SOURCE_SUPERVISOR]["sha256"]
        and obj.get("supervisor", {}).get("git_blob_preverified_before_interpreter") is True
        and obj.get("supervisor", {}).get("bootstrap_sealed_memfd") is True
        and obj.get("supervisor", {}).get("write_grow_shrink_and_seal_seals_verified") is True
        and obj.get("entrypoint", {}).get("path") == entrypoint
        and obj.get("entrypoint", {}).get("git_blob") == wall[entrypoint]["git_blob"]
        and obj.get("entrypoint", {}).get("executed_from_retained_fd") is True
        and obj.get("command_template") == phase_contract(phase, node)["argv"]
        and obj.get("phase_contract") == expected_phase_contract(phase_contract(phase, node))
        and obj.get("declared_output_paths") == []
        and obj.get("declared_path_tokens") == []
        and obj.get("source_snapshot_from_exact_git_blobs") is True
        and obj.get("source_files_opened_nofollow") is True
        and obj.get("source_file_and_directory_fds_retained") is True
        and obj.get("control_target") == target
        and obj.get("rejection") == "HOLD_V45_SOURCE_GENERATION_CHANGED"
        and obj.get("external_a_to_b_to_a_control") is True
        and obj.get("child_started") is False
        and obj.get("production_runtime_touched") is False,
        "HOLD_V45_MATRIX_SOURCE_ABA_RECEIPT",
    )
    return obj["receipt_sha256"]


def source_execution_phase_map(node: int) -> dict[str, tuple[str, tuple[str, ...]]]:
    n = str(node)
    return {
        "custody-selftest": ("scripts/prove_datanet_v45_custody_integration_v1.py", (f"datanet-v45-custody-controls-{n}.json",)),
        "v41-static": ("scripts/prove_datanet_v41_static_gate_v1.py", (f"v41-static-{n}.jsonl",)),
        "v42-static": ("scripts/prove_datanet_v42_fsverity_clean_remount_v1.py", (f"v42-static-{n}.jsonl",)),
        "v43-static": ("scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", (f"v43-static-{n}.jsonl",)),
        "v44-static": ("scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", (f"v44-static-{n}.jsonl",)),
        "v45-static": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"v45-static-{n}.jsonl",)),
        "matrix-selftest": ("scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py", ()),
        "runtime": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"datanet-v45-runtime-{n}.json",)),
        "runner": ("scripts/run_datanet_v45_full_stack_ext4_v1.sh", (f"datanet-v45-runner-{n}.stdout.log", f"datanet-v45-process-{n}.trace")),
        "candidate-aba": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"datanet-v45-candidate-aba-control-{n}.json",)),
        "candidate": ("scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py", (f"datanet-v45-candidate-{n}.json",)),
        "controls": ("scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py", (f"datanet-v45-controls-{n}.json",)),
        "producer-control": ("scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py", (f"datanet-v45-producer-substitution-control-{n}.json",)),
        "terminal-aba": ("scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py", (f"datanet-v45-terminal-aba-control-{n}.json",)),
        "finalizer": ("scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py", (f"datanet-v45-aggregate-{n}.json",)),
    }


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


NO_REDIRECT = urllib.request.build_opener(NoRedirect)


def bounded_response(response, limit: int, code: str) -> bytes:  # noqa: ANN001
    stated = response.headers.get("Content-Length")
    if stated is not None:
        require(stated.isdecimal() and int(stated) <= limit, code)
    pieces = []
    total = 0
    while True:
        block = response.read(min(1024 * 1024, limit + 1 - total))
        if not block:
            break
        pieces.append(block)
        total += len(block)
        require(total <= limit, code)
    return b"".join(pieces)


def validate_api_url(url: str) -> None:
    try:
        parsed = urllib.parse.urlsplit(url)
        port = parsed.port
    except ValueError as exc:
        raise MatrixHold("HOLD_V45_MATRIX_API_URL") from exc
    require(
        parsed.scheme == "https"
        and parsed.hostname == "api.github.com"
        and parsed.username is None
        and parsed.password is None
        and port in (None, 443)
        and not parsed.fragment,
        "HOLD_V45_MATRIX_API_URL",
    )


def api_request_bytes(url: str, token: str) -> bytes:
    validate_api_url(url)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2026-03-10",
            "User-Agent": "void-datanet-v45-cross-runtime-verifier-v1",
        },
    )
    try:
        with NO_REDIRECT.open(request, timeout=60) as response:
            require(response.status == 200, "HOLD_V45_MATRIX_API_STATUS")
            return bounded_response(response, MAX_API_BYTES, "HOLD_V45_MATRIX_API_SIZE")
    except urllib.error.HTTPError as exc:
        exc.close()
        raise MatrixHold("HOLD_V45_MATRIX_API_STATUS") from exc


def validate_archive_redirect(url: str) -> str:
    try:
        parsed = urllib.parse.urlsplit(url)
        port = parsed.port
    except ValueError as exc:
        raise MatrixHold("HOLD_V45_MATRIX_ARCHIVE_REDIRECT_URL") from exc
    host = parsed.hostname or ""
    allowed_host = (
        host == "objects.githubusercontent.com"
        or host.endswith(".githubusercontent.com")
        or host.endswith(".blob.core.windows.net")
    )
    require(
        parsed.scheme == "https"
        and allowed_host
        and parsed.username is None
        and parsed.password is None
        and port in (None, 443)
        and bool(parsed.query)
        and not parsed.fragment,
        "HOLD_V45_MATRIX_ARCHIVE_REDIRECT_URL",
    )
    return url


def archive_request_bytes(url: str, token: str) -> bytes:
    validate_api_url(url)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2026-03-10",
            "User-Agent": "void-datanet-v45-cross-runtime-verifier-v1",
        },
    )
    try:
        with NO_REDIRECT.open(request, timeout=60):
            raise MatrixHold("HOLD_V45_MATRIX_ARCHIVE_REDIRECT_MISSING")
    except urllib.error.HTTPError as exc:
        location = exc.headers.get("Location")
        status = exc.code
        exc.close()
    require(status == 302 and isinstance(location, str), "HOLD_V45_MATRIX_ARCHIVE_REDIRECT")
    redirect = validate_archive_redirect(location)
    credential_free = urllib.request.Request(
        redirect,
        headers={"User-Agent": "void-datanet-v45-cross-runtime-verifier-v1"},
    )
    require("Authorization" not in credential_free.headers, "HOLD_V45_MATRIX_ARCHIVE_CREDENTIAL_FORWARD")
    try:
        with NO_REDIRECT.open(credential_free, timeout=60) as response:
            require(response.status == 200, "HOLD_V45_MATRIX_ARCHIVE_STATUS")
            return bounded_response(response, MAX_ARCHIVE_BYTES, "HOLD_V45_MATRIX_ARCHIVE_SIZE_LIMIT")
    except urllib.error.HTTPError as exc:
        exc.close()
        raise MatrixHold("HOLD_V45_MATRIX_ARCHIVE_STATUS") from exc


def api_object(url: str, token: str, code: str) -> tuple[dict, bytes]:
    raw = api_request_bytes(url, token)
    return json_bytes(raw, code), raw


def archive_members(data: bytes) -> dict[str, bytes]:
    members = {}
    try:
        with zipfile.ZipFile(io.BytesIO(data), "r") as archive:
            infos = archive.infolist()
            require(len(infos) <= MAX_ARCHIVE_MEMBERS, "HOLD_V45_MATRIX_ARCHIVE_MEMBER_LIMIT")
            require(
                sum(info.file_size for info in infos) <= MAX_UNCOMPRESSED_BYTES,
                "HOLD_V45_MATRIX_ARCHIVE_UNCOMPRESSED_LIMIT",
            )
            for info in infos:
                require(not info.is_dir(), "HOLD_V45_MATRIX_ARCHIVE_DIRECTORY_MEMBER")
                require(info.file_size <= MAX_MEMBER_BYTES, "HOLD_V45_MATRIX_ARCHIVE_MEMBER_SIZE")
                require(not (info.flag_bits & 0x1), "HOLD_V45_MATRIX_ARCHIVE_ENCRYPTED_MEMBER")
                path = PurePosixPath(info.filename)
                require(not path.is_absolute() and ".." not in path.parts and len(path.parts) in (1, 2), "HOLD_V45_MATRIX_ARCHIVE_PATH")
                name = str(path)
                require(name==info.filename and "\\" not in name
                        and not stat.S_ISLNK(info.external_attr >> 16), "HOLD_V45_MATRIX_ARCHIVE_PATH")
                require(name not in members, "HOLD_V45_MATRIX_ARCHIVE_DUPLICATE_MEMBER")
                members[name] = archive.read(info)
    except zipfile.BadZipFile as exc:
        raise MatrixHold("HOLD_V45_MATRIX_ARCHIVE_ZIP") from exc
    require(bool(members), "HOLD_V45_MATRIX_ARCHIVE_EMPTY")
    return members


def normalized_artifact_record(obj: dict) -> dict:
    workflow = obj.get("workflow_run") or {}
    return {
        "id": obj.get("id"),
        "node_id": obj.get("node_id"),
        "name": obj.get("name"),
        "size_in_bytes": obj.get("size_in_bytes"),
        "url": obj.get("url"),
        "archive_download_url": obj.get("archive_download_url"),
        "expired": obj.get("expired"),
        "digest": obj.get("digest"),
        "created_at": obj.get("created_at"),
        "updated_at": obj.get("updated_at"),
        "expires_at": obj.get("expires_at"),
        "workflow_run": {
            "id": workflow.get("id"),
            "head_sha": workflow.get("head_sha"),
            "head_branch": workflow.get("head_branch"),
            "repository_id": workflow.get("repository_id"),
            "head_repository_id": workflow.get("head_repository_id"),
        },
    }



CAPSULE_MARKER = "VOID_DATANET_V45_CUSTODY_CAPSULE_COMMITMENT_V1"


def capsule_log_commitment(log: bytes, node: int, head: str, tree: str, run_id: int, run_attempt: int) -> dict:
    require(len(log) <= MAX_API_BYTES, "HOLD_V45_CAPSULE_LOG_SIZE")
    # Only an actual timestamped output line counts. Echoed shell source and
    # embedded/duplicate strings cannot become a second authority.
    text = log.decode("utf-8", errors="strict")
    pattern = r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z " + CAPSULE_MARKER + r" (\{[^\r\n]+\})$"
    matches = re.findall(pattern,text,re.MULTILINE)
    require(len(matches)==1,"HOLD_V45_CAPSULE_LOG_COMMITMENT_COUNT")
    value=custody_access().strict(matches[0].encode())
    require(value.get("marker")==CAPSULE_MARKER and value.get("status")=="EXPORTED"
            and value.get("head")==head and value.get("tree")==tree
            and type(value.get("run_id")) is int and value["run_id"]==run_id
            and type(value.get("run_attempt")) is int and value["run_attempt"]==run_attempt
            and type(value.get("node_major")) is int and value["node_major"]==node,
            "HOLD_V45_CAPSULE_LOG_CONTEXT")
    require(type(value.get("capsule_bytes")) is int and 0<value["capsule_bytes"]<=MAX_ARCHIVE_BYTES
            and type(value.get("members")) is int and 0<value["members"]<=MAX_ARCHIVE_MEMBERS
            and re.fullmatch(r"[0-9a-f]{64}",value.get("capsule_sha256","")) is not None,
            "HOLD_V45_CAPSULE_LOG_SHAPE")
    return value


def checked_capsule_members(outer: bytes, commitment: dict) -> tuple[dict[str,bytes],dict]:
    wrapped=archive_members(outer)
    require(set(wrapped)=={"capsule.zip"},"HOLD_V45_CAPSULE_OUTER_MEMBERS")
    capsule=wrapped["capsule.zip"]
    require(len(capsule)==commitment["capsule_bytes"] and digest(capsule)==commitment["capsule_sha256"],
            "HOLD_V45_CAPSULE_LOG_DIGEST")
    members=archive_members(capsule)
    require(len(members)==commitment["members"],"HOLD_V45_CAPSULE_MEMBER_COUNT")
    raw=members.pop("datanet-v45-custody-session.json",None)
    require(raw is not None,"HOLD_V45_CAPSULE_SESSION_MISSING")
    summary=custody_access().strict(raw)
    require(summary.get("format")=="VOID_V45_CUSTODY_SESSION_SUMMARY_V1"
            and all(summary.get(k)==commitment[k] for k in ("head","tree","node_major","run_id","run_attempt"))
            and summary.get("supervisor_to_verifier_custody") is True
            and summary.get("nested_producer_prebinding_proved") is False
            and summary.get("full_campaign_accepted") is False,
            "HOLD_V45_CAPSULE_SESSION_CONTEXT")
    expected={n:{"bytes":len(d),"sha256":digest(d)} for n,d in members.items()}
    require(summary.get("members")==expected,"HOLD_V45_CAPSULE_SESSION_MEMBERS")
    bindings=summary.get("object_bindings")
    require(type(bindings) is dict and set(bindings)==set(members),"HOLD_V45_CAPSULE_OBJECT_MEMBERS")
    for name,row in bindings.items():
        key=row.get("identity")
        require(type(key) is list and len(key)==9 and all(type(v) is int for v in key)
                and key[1]>0 and key[3]==1 and stat.S_ISREG(key[2]) and key[6]==len(members[name])
                and row.get("bytes")==key[6] and row.get("sha256")==digest(members[name])
                and row.get("origin") in ("prebound","nested_runner_boundary"),
                "HOLD_V45_CAPSULE_OBJECT_BINDING")
    phases=summary.get("phases")
    require(type(phases) is list and bool(phases) and phases[-1].get("phase")=="finalizer",
            "HOLD_V45_CAPSULE_SESSION_TERMINAL")
    require([p.get("serial") for p in phases]==list(range(1,len(phases)+1)),"HOLD_V45_CAPSULE_SESSION_ORDER")
    return members,summary


def producer_job_commitments(base: str, token: str, ns) -> tuple[dict[int,dict],bytes]:
    jobs,raw=api_object(f"{base}/actions/runs/{ns.run_id}/attempts/{ns.run_attempt}/jobs?per_page=100",token,
                       "HOLD_V45_CAPSULE_JOB_API")
    rows=jobs.get("jobs")
    require(type(rows) is list and jobs.get("total_count")==len(rows) and len(rows)<=100,
            "HOLD_V45_CAPSULE_JOB_PAGINATION")
    result={}
    for node in NODES:
        matching=[j for j in rows if j.get("name")==f"full-stack ({node})"]
        require(len(matching)==1,"HOLD_V45_CAPSULE_JOB_IDENTITY")
        job=matching[0]
        require(type(job.get("id")) is int and job["id"]>0 and job.get("run_id")==ns.run_id
                and job.get("run_attempt")==ns.run_attempt and job.get("head_sha")==ns.expected_head
                and job.get("status")=="completed" and job.get("conclusion")=="success",
                "HOLD_V45_CAPSULE_JOB_CONTEXT")
        steps=[s for s in job.get("steps",[]) if s.get("name")=="Source-bound custody session and capsule"]
        require(len(steps)==1 and steps[0].get("conclusion")=="success","HOLD_V45_CAPSULE_STEP")
        log=archive_request_bytes(f"{base}/actions/jobs/{job['id']}/logs",token)
        committed=capsule_log_commitment(log,node,ns.expected_head,ns.expected_tree,ns.run_id,ns.run_attempt)
        result[node]={"commitment":committed,"job_id":job["id"],"job_log_sha256":digest(log)}
    return result,raw


def admit_node_artifact(
    obj: dict, archive: bytes, node: int, head: str, tree: str,
    run_id: int, run_attempt: int, source: dict, capsule_binding: dict,
) -> dict:
    expected_name = f"datanet-v45-full-stack-node-{node}-{head}-attempt-{run_attempt}"
    record = normalized_artifact_record(obj)
    require(record["name"] == expected_name, "HOLD_V45_MATRIX_RUNTIME_LABEL")
    require(isinstance(record["id"], int) and record["id"] > 0, "HOLD_V45_MATRIX_ARTIFACT_ID")
    require(record["expired"] is False, "HOLD_V45_MATRIX_STALE_ARTIFACT")
    require(record["workflow_run"]["id"] == run_id and record["workflow_run"]["head_sha"] == head, "HOLD_V45_MATRIX_STALE_ARTIFACT")
    api_digest = record.get("digest")
    zip_digest = digest(archive)
    require(api_digest == f"sha256:{zip_digest}", "HOLD_V45_MATRIX_ARCHIVE_DIGEST")
    require(record.get("size_in_bytes") == len(archive), "HOLD_V45_MATRIX_ARCHIVE_SIZE")

    members, custody_summary = checked_capsule_members(archive,capsule_binding["commitment"])
    verify_custody_control_result(json_bytes(members[f"datanet-v45-custody-controls-{node}.json"],"HOLD_V45_CUSTODY_CONTROL_JSON"))
    aggregate_name = f"datanet-v45-aggregate-{node}.json"
    finalizer_receipt_name = f"datanet-v45-source-execution-finalizer-{node}.json"
    require(aggregate_name in members, "HOLD_V45_MATRIX_AGGREGATE_MISSING")
    require(finalizer_receipt_name in members, "HOLD_V45_MATRIX_FINALIZER_RECEIPT_MISSING")
    aggregate = json_bytes(members[aggregate_name], "HOLD_V45_MATRIX_AGGREGATE_JSON")
    verify_seal(aggregate, "aggregate_sha256", "HOLD_V45_MATRIX_AGGREGATE_SEAL")
    require(aggregate.get("marker") == PER_NODE_MARKER and aggregate.get("status") == "GREEN", "HOLD_V45_MATRIX_AGGREGATE_MARKER")
    require(aggregate.get("head") == head and aggregate.get("tree") == tree, "HOLD_V45_MATRIX_MIXED_HEAD_TREE")
    require(aggregate.get("run_id") == run_id, "HOLD_V45_MATRIX_STALE_ARTIFACT")
    require(aggregate.get("run_attempt") == run_attempt, STALE_ATTEMPT_HOLD)
    require(aggregate.get("node_major") == node and aggregate.get("runtime", {}).get("node_major") == node, "HOLD_V45_MATRIX_RUNTIME_LABEL")
    require(aggregate.get("source") == source and aggregate.get("runtime", {}).get("source") == source, "HOLD_V45_MATRIX_SOURCE_DRIFT")
    require(set(aggregate.get("expected_archive_members", [])) == set(members), "HOLD_V45_MATRIX_ARCHIVE_MEMBERSHIP")
    inventory = aggregate.get("artifact_inventory")
    require(
        isinstance(inventory, dict)
        and set(inventory) == set(members) - {aggregate_name, finalizer_receipt_name},
        "HOLD_V45_MATRIX_ARCHIVE_MEMBERSHIP",
    )
    for name, item in inventory.items():
        require(item.get("bytes") == len(members[name]) and item.get("sha256") == digest(members[name]), "HOLD_V45_MATRIX_MEMBER_DIGEST")
    required_true = (
        "supervisor_to_verifier_custody",
        "artifact_generation_bound", "candidate_generation_aba_control",
        "terminal_generation_aba_control", "producer_substitution_control",
        "source_distinct_terminal_verifier", "transitive_source_wall_verified",
        "source_inventory_and_execution_generation_bound", "external_source_generation_aba_control",
        "exact_phase_argv_allowlisted", "supervisor_owned_create_only_outputs",
        "relabeled_help_controls", "preexisting_output_controls", "workflow_run_attempt_bound",
    )
    require(all(aggregate.get(key) is True for key in required_true), "HOLD_V45_MATRIX_PREMATURE_AGGREGATE")
    require(aggregate.get("terminal_verifier_imports_candidate_or_controls") is False, "HOLD_V45_MATRIX_PREMATURE_AGGREGATE")
    require(aggregate.get("full_job_process_census") is False, "HOLD_V45_MATRIX_PROCESS_SCOPE")
    require(aggregate.get("full_campaign_evidence_accepted") is False and aggregate.get("datanet_availability_proved") is False, "HOLD_V45_MATRIX_OVERCLAIM")
    require(aggregate.get("production_runtime_touched") is False, "HOLD_V45_MATRIX_PRODUCTION_TOUCH")

    candidate_name = f"datanet-v45-candidate-{node}.json"
    controls_name = f"datanet-v45-controls-{node}.json"
    producer_name = f"datanet-v45-producer-substitution-control-{node}.json"
    terminal_name = f"datanet-v45-terminal-aba-control-{node}.json"
    for name in (candidate_name, controls_name, producer_name, terminal_name):
        require(name in members, "HOLD_V45_MATRIX_CONTROL_MEMBER")
    candidate = json_bytes(members[candidate_name], "HOLD_V45_MATRIX_CANDIDATE_JSON")
    controls = json_bytes(members[controls_name], "HOLD_V45_MATRIX_CONTROLS_JSON")
    producer = json_bytes(members[producer_name], "HOLD_V45_MATRIX_PRODUCER_JSON")
    terminal = json_bytes(members[terminal_name], "HOLD_V45_MATRIX_TERMINAL_JSON")
    verify_seal(candidate, "candidate_sha256", "HOLD_V45_MATRIX_CANDIDATE_SEAL")
    verify_seal(controls, "controls_sha256", "HOLD_V45_MATRIX_CONTROLS_SEAL")
    verify_seal(producer, "receipt_sha256", "HOLD_V45_MATRIX_PRODUCER_SEAL")
    verify_seal(terminal, "receipt_sha256", "HOLD_V45_MATRIX_TERMINAL_SEAL")
    require(candidate.get("candidate_sha256") == aggregate.get("candidate_sha256") == controls.get("candidate_sha256"), "HOLD_V45_MATRIX_PRODUCER_BINDING")
    require(controls.get("controls_sha256") == aggregate.get("controls_sha256"), "HOLD_V45_MATRIX_PRODUCER_BINDING")
    require(candidate.get("run_id") == controls.get("run_id") == run_id, "HOLD_V45_MATRIX_STALE_ARTIFACT")
    require(candidate.get("run_attempt") == controls.get("run_attempt") == run_attempt, STALE_ATTEMPT_HOLD)

    source_receipts = {}
    base_phases = {
        "custody-selftest",
        "v41-static", "v42-static", "v43-static", "v44-static", "v45-static",
        "matrix-selftest", "runtime", "runner", "candidate-aba",
    }
    late_phases = {"candidate", "controls", "producer-control", "terminal-aba"}
    for phase, (entrypoint, output_names) in source_execution_phase_map(node).items():
        receipt_name = f"datanet-v45-source-execution-{phase}-{node}.json"
        require(receipt_name in members, "HOLD_V45_MATRIX_SOURCE_EXECUTION_MEMBER")
        receipt = json_bytes(members[receipt_name], "HOLD_V45_MATRIX_SOURCE_EXECUTION_JSON")
        outputs = tuple((output_name, members[output_name]) for output_name in output_names)
        source_receipts[phase] = validate_source_execution_object(
            receipt, phase, entrypoint, outputs, node, run_id, run_attempt, source,
        )
    source_control_name = f"datanet-v45-source-generation-aba-control-{node}.json"
    require(source_control_name in members, "HOLD_V45_MATRIX_SOURCE_ABA_MEMBER")
    source_control = json_bytes(members[source_control_name], "HOLD_V45_MATRIX_SOURCE_ABA_JSON")
    source_control_hash = validate_source_aba_object(
        source_control,
        "source-generation-aba-control",
        "scripts/run_datanet_v45_full_stack_ext4_v1.sh",
        "scripts/run_datanet_v45_full_stack_ext4_v1.sh",
        node,
        run_id,
        run_attempt,
        source,
    )
    matrix_argv_name = f"datanet-v45-phase-argv-control-matrix-selftest-{node}.json"
    finalizer_argv_name = f"datanet-v45-phase-argv-control-finalizer-{node}.json"
    finalizer_preexisting_name = f"datanet-v45-preexisting-output-control-finalizer-{node}.json"
    for name in (matrix_argv_name, finalizer_argv_name, finalizer_preexisting_name):
        require(name in members, "HOLD_V45_MATRIX_PHASE_CONTROL_MEMBER")
    phase_control_hashes = {
        "matrix-selftest-relabeled-help": validate_phase_control_object(
            json_bytes(members[matrix_argv_name], "HOLD_V45_MATRIX_PHASE_CONTROL_JSON"),
            "matrix-selftest", "relabeled-help", node, run_id, run_attempt, source,
        ),
        "finalizer-relabeled-help": validate_phase_control_object(
            json_bytes(members[finalizer_argv_name], "HOLD_V45_MATRIX_PHASE_CONTROL_JSON"),
            "finalizer", "relabeled-help", node, run_id, run_attempt, source,
        ),
    }
    preexisting_control_hash = validate_phase_control_object(
        json_bytes(members[finalizer_preexisting_name], "HOLD_V45_MATRIX_PHASE_CONTROL_JSON"),
        "finalizer", "preexisting-output", node, run_id, run_attempt, source,
    )
    expected_source_execution = {
        "run_id": run_id,
        "run_attempt": run_attempt,
        "source_inventory_sha256": digest(canon(source)),
        "source_execution_receipt_sha256": {phase: source_receipts[phase] for phase in sorted(base_phases)},
        "source_generation_aba_control_sha256": source_control_hash,
        "phase_argv_control_sha256": phase_control_hashes,
        "preexisting_output_control_sha256": {"finalizer": preexisting_control_hash},
        "exact_phase_argv_allowlisted": True,
        "supervisor_owned_create_only_outputs": True,
        "relabeled_help_controls": True,
        "preexisting_output_controls": True,
        "source_inventory_and_execution_generation_bound": True,
        "external_source_generation_aba_control": True,
        "post_candidate_source_execution_receipt_sha256": {
            phase: source_receipts[phase] for phase in sorted(late_phases)
        },
    }
    require(aggregate.get("source_execution") == expected_source_execution, "HOLD_V45_MATRIX_SOURCE_EXECUTION_RECONSTRUCTION")

    return {
        "node_major": node,
        "capsule_log_binding": capsule_binding,
        "supervisor_to_verifier_custody": True,
        "artifact_id": record["id"],
        "artifact_name": record["name"],
        "artifact_api_record_sha256": digest(canon(record)),
        "artifact_api_digest": api_digest,
        "artifact_zip_sha256": zip_digest,
        "artifact_zip_bytes": len(archive),
        "archive_members": sorted(members),
        "archive_members_sha256": digest(canon({"members": sorted(members)})),
        "per_node_aggregate_sha256": aggregate["aggregate_sha256"],
        "source_wall_paths_sha256": source["source_wall_paths_sha256"],
        "source_inventory_sha256": digest(canon(source)),
        "source_execution_sha256": digest(canon(expected_source_execution)),
        "finalizer_source_execution_receipt_sha256": source_receipts["finalizer"],
        "head": head,
        "tree": tree,
        "run_id": run_id,
        "run_attempt": run_attempt,
        "expired": False,
        "ready": True,
    }


def node_artifact_name(node: int, head: str, run_attempt: int) -> str:
    return f"datanet-v45-full-stack-node-{node}-{head}-attempt-{run_attempt}"


def validate_model(
    rows: list[dict], head: str, tree: str, run_id: int, run_attempt: int, source_digest: str,
) -> None:
    nodes = [row.get("node_major") for row in rows]
    require(len(nodes) == len(set(nodes)), "HOLD_V45_MATRIX_DUPLICATE_NODE")
    require(set(nodes) == set(NODES), "HOLD_V45_MATRIX_NODE_SET")
    artifact_ids = [row.get("artifact_id") for row in rows]
    require(len(artifact_ids) == len(set(artifact_ids)), "HOLD_V45_MATRIX_DUPLICATE_ARTIFACT")
    for row in rows:
        node = row["node_major"]
        require(row.get("run_id") == run_id and row.get("expired") is False, "HOLD_V45_MATRIX_STALE_ARTIFACT")
        require(row.get("run_attempt") == run_attempt, STALE_ATTEMPT_HOLD)
        require(row.get("artifact_name") == node_artifact_name(node, head, run_attempt), "HOLD_V45_MATRIX_RUNTIME_LABEL")
        require(row.get("head") == head and row.get("tree") == tree, "HOLD_V45_MATRIX_MIXED_HEAD_TREE")
        require(row.get("artifact_api_digest") == f"sha256:{row.get('artifact_zip_sha256')}", "HOLD_V45_MATRIX_ARCHIVE_DIGEST")
        require(row.get("source_inventory_sha256") == source_digest, "HOLD_V45_MATRIX_SOURCE_DRIFT")
        require(row.get("ready") is True, "HOLD_V45_MATRIX_PREMATURE_AGGREGATE")


def expect(
    code: str, rows: list[dict], head: str, tree: str,
    run_id: int, run_attempt: int, source_digest: str,
) -> str:
    try:
        validate_model(rows, head, tree, run_id, run_attempt, source_digest)
    except MatrixHold as exc:
        require(exc.code == code, "HOLD_V45_MATRIX_CONTROL_WRONG_REJECTION")
        return exc.code
    raise MatrixHold("HOLD_V45_MATRIX_CONTROL_ACCEPTED")


def matrix_controls(
    rows: list[dict], head: str, tree: str, run_id: int, run_attempt: int, source_digest: str,
) -> dict:
    missing = copy.deepcopy(rows[:-1])
    duplicate = copy.deepcopy(rows) + [copy.deepcopy(rows[0])]
    substituted = copy.deepcopy(rows)
    substituted[0]["artifact_zip_sha256"] = "0" * 64
    mixed = copy.deepcopy(rows)
    mixed[0]["tree"] = "f" * 40
    mislabeled = copy.deepcopy(rows)
    mislabeled[0]["artifact_name"] = node_artifact_name(24, head, run_attempt)
    drift = copy.deepcopy(rows)
    drift[0]["source_inventory_sha256"] = "0" * 64
    premature = copy.deepcopy(rows)
    premature[0]["ready"] = False
    stale = copy.deepcopy(rows)
    stale[0]["run_id"] = run_id + 1
    stale_attempt = copy.deepcopy(rows)
    stale_attempt[0]["run_attempt"] = run_attempt + 1
    return {
        "missing": expect("HOLD_V45_MATRIX_NODE_SET", missing, head, tree, run_id, run_attempt, source_digest),
        "duplicate": expect("HOLD_V45_MATRIX_DUPLICATE_NODE", duplicate, head, tree, run_id, run_attempt, source_digest),
        "substituted": expect("HOLD_V45_MATRIX_ARCHIVE_DIGEST", substituted, head, tree, run_id, run_attempt, source_digest),
        "mixed_head_tree": expect("HOLD_V45_MATRIX_MIXED_HEAD_TREE", mixed, head, tree, run_id, run_attempt, source_digest),
        "mislabeled_runtime": expect("HOLD_V45_MATRIX_RUNTIME_LABEL", mislabeled, head, tree, run_id, run_attempt, source_digest),
        "source_drift": expect("HOLD_V45_MATRIX_SOURCE_DRIFT", drift, head, tree, run_id, run_attempt, source_digest),
        "premature": expect("HOLD_V45_MATRIX_PREMATURE_AGGREGATE", premature, head, tree, run_id, run_attempt, source_digest),
        "stale": expect("HOLD_V45_MATRIX_STALE_ARTIFACT", stale, head, tree, run_id, run_attempt, source_digest),
        "stale_attempt": expect(STALE_ATTEMPT_HOLD, stale_attempt, head, tree, run_id, run_attempt, source_digest),
    }


def model_rows(head: str, tree: str, run_id: int, run_attempt: int, source_digest: str) -> list[dict]:
    rows = []
    for index, node in enumerate(NODES, start=1):
        zip_hash = str(index) * 64
        rows.append({
            "node_major": node,
            "artifact_id": index,
            "artifact_name": node_artifact_name(node, head, run_attempt),
            "artifact_api_digest": f"sha256:{zip_hash}",
            "artifact_zip_sha256": zip_hash,
            "source_inventory_sha256": source_digest,
            "head": head,
            "tree": tree,
            "run_id": run_id,
            "run_attempt": run_attempt,
            "expired": False,
            "ready": True,
        })
    return rows


def prior_attempt_rejection(
    run_id: int, expected_head: str, producer_attempt: int, finalizer_attempt: int,
) -> tuple[str, list[dict]]:
    require(run_id > 0, "HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_ARGUMENT")
    require(
        re.fullmatch(r"[0-9a-f]{40}", expected_head) is not None,
        "HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_ARGUMENT",
    )
    require(
        producer_attempt == 1 and finalizer_attempt == 2,
        "HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_ARGUMENT",
    )
    tree, source_digest = "b" * 40, "c" * 64
    producers = model_rows(expected_head, tree, run_id, producer_attempt, source_digest)
    rejection = expect(
        STALE_ATTEMPT_HOLD,
        producers,
        expected_head,
        tree,
        run_id,
        finalizer_attempt,
        source_digest,
    )
    return rejection, producers


def stale_attempt_control(ns: argparse.Namespace) -> int:
    require(
        ns.control_run_attempt == ns.producer_attempt == 1,
        STALE_ATTEMPT_HOLD,
    )
    rejection, producers = prior_attempt_rejection(
        ns.run_id, ns.expected_head, ns.producer_attempt, ns.finalizer_attempt,
    )
    aggregate_output = Path(ns.output).with_name(
        f"datanet-v45-node-22-24-26-top-{ns.expected_head}-attempt-{ns.finalizer_attempt}.json"
    )
    require(not aggregate_output.exists(), "HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_OUTPUT_PREEXISTING")
    try:
        aggregate(argparse.Namespace(run_id=ns.run_id, run_attempt=ns.finalizer_attempt))
    except MatrixHold as exc:
        require(exc.code == STALE_ATTEMPT_HOLD, "HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_REJECTION")
    else:
        raise MatrixHold("HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_ACCEPTED")
    require(not aggregate_output.exists(), "HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_OUTPUT_CREATED")
    out = seal({
        "marker": STALE_ATTEMPT_MARKER,
        "status": "GREEN",
        "producer_run_id": ns.run_id,
        "finalizer_run_id": ns.run_id,
        "control_run_attempt": ns.control_run_attempt,
        "producer_run_attempt": ns.producer_attempt,
        "finalizer_run_attempt": ns.finalizer_attempt,
        "producer_artifact_names": [row["artifact_name"] for row in producers],
        "rejection": rejection,
        "production_aggregate_rejection": STALE_ATTEMPT_HOLD,
        "attempt_2_aggregate_output_name": aggregate_output.name,
        "aggregate_published": False,
        "production_aggregate_path_exercised": True,
        "attempt_1_producers_attempt_2_finalizer": True,
        "production_runtime_touched": False,
    }, "receipt_sha256")
    write_output(Path(ns.output), canon(out))
    print(canon(out).decode(), end="")
    return 0


def selftest() -> int:
    head, tree, run_id, run_attempt, source_digest = "a" * 40, "b" * 40, 77, 1, "c" * 64
    rows = model_rows(head, tree, run_id, run_attempt, source_digest)
    validate_model(rows, head, tree, run_id, run_attempt, source_digest)
    controls = matrix_controls(rows, head, tree, run_id, run_attempt, source_digest)
    require(len(controls) == 9, "HOLD_V45_MATRIX_SELFTEST")
    rejection, producers = prior_attempt_rejection(run_id, head, 1, 2)
    require(
        rejection == STALE_ATTEMPT_HOLD
        and all(row["run_id"] == run_id and row["run_attempt"] == 1 for row in producers),
        "HOLD_V45_MATRIX_STALE_ATTEMPT_SELFTEST",
    )
    valid_redirect = "https://productionresultssa0.blob.core.windows.net/actions-results/example?sig=bounded"
    require(validate_archive_redirect(valid_redirect) == valid_redirect, "HOLD_V45_MATRIX_REDIRECT_SELFTEST")
    transport_controls = {}
    for name, url in {
        "http": "http://productionresultssa0.blob.core.windows.net/actions-results/example?sig=x",
        "userinfo": "https://token@productionresultssa0.blob.core.windows.net/actions-results/example?sig=x",
        "suffix_confusion": "https://blob.core.windows.net.evil.example/actions-results/example?sig=x",
        "unsigned": "https://productionresultssa0.blob.core.windows.net/actions-results/example",
    }.items():
        try:
            validate_archive_redirect(url)
        except MatrixHold as exc:
            require(exc.code == "HOLD_V45_MATRIX_ARCHIVE_REDIRECT_URL", "HOLD_V45_MATRIX_REDIRECT_SELFTEST")
            transport_controls[name] = exc.code
        else:
            raise MatrixHold("HOLD_V45_MATRIX_REDIRECT_SELFTEST")
    print(json.dumps({
        "marker": "VOID_DATANET_V45_CROSS_RUNTIME_SELFTEST_V1_GREEN",
        "controls": controls,
        "same_run_stale_attempt_control": rejection,
        "transport_controls": transport_controls,
    }, sort_keys=True))
    return 0


def validate_stale_attempt_control(obj: dict, run_id: int, expected_head: str) -> str:
    verify_seal(obj, "receipt_sha256", "HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_SEAL")
    expected_names = [node_artifact_name(node, expected_head, 1) for node in NODES]
    expected_output = f"datanet-v45-node-22-24-26-top-{expected_head}-attempt-2.json"
    require(
        obj.get("marker") == STALE_ATTEMPT_MARKER
        and obj.get("status") == "GREEN"
        and obj.get("producer_run_id") == run_id
        and obj.get("finalizer_run_id") == run_id
        and obj.get("control_run_attempt") == 1
        and obj.get("producer_run_attempt") == 1
        and obj.get("finalizer_run_attempt") == 2
        and obj.get("producer_artifact_names") == expected_names
        and obj.get("rejection") == STALE_ATTEMPT_HOLD
        and obj.get("production_aggregate_rejection") == STALE_ATTEMPT_HOLD
        and obj.get("attempt_2_aggregate_output_name") == expected_output
        and obj.get("aggregate_published") is False
        and obj.get("production_aggregate_path_exercised") is True
        and obj.get("attempt_1_producers_attempt_2_finalizer") is True
        and obj.get("production_runtime_touched") is False,
        "HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_RECEIPT",
    )
    return obj["receipt_sha256"]


def aggregate(ns: argparse.Namespace) -> int:
    require(ns.run_id > 0 and ns.run_attempt > 0, "HOLD_V45_MATRIX_RUN_IDENTITY")
    require(ns.run_attempt == 1, STALE_ATTEMPT_HOLD)
    custody_access().input_envelope()
    token = os.environ.get("GITHUB_TOKEN")
    require(isinstance(token, str) and bool(token), "HOLD_V45_MATRIX_GITHUB_TOKEN")
    source = current_source()
    require(source["head"] == ns.expected_head and source["tree"] == ns.expected_tree, "HOLD_V45_MATRIX_LOCAL_SOURCE")
    source_control = json_bytes(
        custody_artifact_read(Path(ns.source_generation_control_receipt)),
        "HOLD_V45_MATRIX_TOP_SOURCE_CONTROL_JSON",
    )
    source_control_hash = validate_source_aba_object(
        source_control,
        "cross-runtime-source-generation-aba-control",
        "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
        "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
        0,
        ns.run_id,
        ns.run_attempt,
        source,
    )
    selftest_receipt = json_bytes(
        custody_artifact_read(Path(ns.source_selftest_receipt)),
        "HOLD_V45_MATRIX_TOP_SELFTEST_RECEIPT_JSON",
    )
    selftest_hash = validate_source_execution_object(
        selftest_receipt,
        "cross-runtime-selftest",
        "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
        (),
        0,
        ns.run_id,
        ns.run_attempt,
        source,
    )
    phase_argv_control = json_bytes(
        custody_artifact_read(Path(ns.phase_argv_control_receipt)),
        "HOLD_V45_MATRIX_TOP_PHASE_ARGV_CONTROL_JSON",
    )
    phase_argv_control_hash = validate_phase_control_object(
        phase_argv_control, "cross-runtime-selftest", "relabeled-help", 0,
        ns.run_id, ns.run_attempt, source,
    )
    preexisting_output_control = json_bytes(
        custody_artifact_read(Path(ns.preexisting_output_control_receipt)),
        "HOLD_V45_MATRIX_TOP_PREEXISTING_CONTROL_JSON",
    )
    preexisting_output_control_hash = validate_phase_control_object(
        preexisting_output_control, "cross-runtime-aggregate", "preexisting-output", 0,
        ns.run_id, ns.run_attempt, source,
    )
    stale_attempt_bytes = custody_artifact_read(Path(ns.stale_attempt_control))
    stale_attempt = json_bytes(stale_attempt_bytes, "HOLD_V45_MATRIX_STALE_ATTEMPT_CONTROL_JSON")
    stale_attempt_hash = validate_stale_attempt_control(stale_attempt, ns.run_id, ns.expected_head)
    stale_attempt_receipt = json_bytes(
        custody_artifact_read(Path(ns.stale_attempt_control_receipt)),
        "HOLD_V45_MATRIX_STALE_ATTEMPT_EXECUTION_JSON",
    )
    stale_attempt_execution_hash = validate_source_execution_object(
        stale_attempt_receipt,
        "cross-runtime-stale-attempt-control",
        "scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py",
        ((Path(ns.stale_attempt_control).name, stale_attempt_bytes),),
        0,
        ns.run_id,
        ns.run_attempt,
        source,
    )
    base = f"{ns.api_url.rstrip('/')}/repos/{ns.repository}"
    run, run_raw = api_object(f"{base}/actions/runs/{ns.run_id}", token, "HOLD_V45_MATRIX_RUN_API")
    require(run.get("id") == ns.run_id and run.get("head_sha") == ns.expected_head, "HOLD_V45_MATRIX_STALE_RUN")
    require(run.get("run_attempt") == ns.run_attempt, STALE_ATTEMPT_HOLD)
    require(run.get("event") in ("pull_request", "push"), "HOLD_V45_MATRIX_RUN_EVENT")
    require(run.get("status") in ("in_progress", "completed") and run.get("conclusion") in (None, "success"), "HOLD_V45_MATRIX_RUN_STATUS")

    artifacts = None
    artifacts_raw = b""
    for attempt in range(6):
        artifacts, artifacts_raw = api_object(
            f"{base}/actions/runs/{ns.run_id}/artifacts?per_page=100",
            token,
            "HOLD_V45_MATRIX_ARTIFACT_API",
        )
        rows = artifacts.get("artifacts")
        if isinstance(rows, list) and len(rows) == 3:
            break
        if attempt < 5:
            time.sleep(2)
    require(isinstance(artifacts, dict) and artifacts.get("total_count") == 3, "HOLD_V45_MATRIX_ARTIFACT_COUNT")
    api_rows = artifacts.get("artifacts")
    require(isinstance(api_rows, list) and len(api_rows) == 3, "HOLD_V45_MATRIX_ARTIFACT_COUNT")
    by_name = {item.get("name"): item for item in api_rows if isinstance(item, dict)}
    expected_names = {node_artifact_name(node, ns.expected_head, ns.run_attempt) for node in NODES}
    require(set(by_name) == expected_names, "HOLD_V45_MATRIX_ARTIFACT_NAMES")

    capsule_bindings,jobs_raw=producer_job_commitments(base,token,ns)
    admitted = []
    for node in NODES:
        name = node_artifact_name(node, ns.expected_head, ns.run_attempt)
        item = by_name[name]
        url = item.get("archive_download_url")
        expected_url = f"{base}/actions/artifacts/{item.get('id')}/zip"
        require(url == expected_url, "HOLD_V45_MATRIX_ARCHIVE_URL")
        archive = archive_request_bytes(url, token)
        admitted.append(admit_node_artifact(
            item, archive, node, ns.expected_head, ns.expected_tree,
            ns.run_id, ns.run_attempt, source, capsule_bindings[node],
        ))

    source_digest = digest(canon(source))
    validate_model(admitted, ns.expected_head, ns.expected_tree, ns.run_id, ns.run_attempt, source_digest)
    controls = matrix_controls(
        admitted, ns.expected_head, ns.expected_tree, ns.run_id, ns.run_attempt, source_digest,
    )
    out = {
        "marker": TOP_MARKER,
        "status": "GREEN",
        "repository": ns.repository,
        "run_id": ns.run_id,
        "run_attempt": ns.run_attempt,
        "head": ns.expected_head,
        "tree": ns.expected_tree,
        "run_api_response_sha256": digest(run_raw),
        "artifact_list_api_response_sha256": digest(artifacts_raw),
        "producer_jobs_api_response_sha256": digest(jobs_raw),
        "capsules_bound_to_independent_ci_log_commitments": True,
        "source": source,
        "source_inventory_sha256": source_digest,
        "source_execution": {
            "run_id": ns.run_id,
            "run_attempt": ns.run_attempt,
            "source_inventory_sha256": source_digest,
            "cross_runtime_selftest_receipt_sha256": selftest_hash,
            "source_generation_aba_control_sha256": source_control_hash,
            "phase_argv_control_sha256": phase_argv_control_hash,
            "preexisting_output_control_sha256": preexisting_output_control_hash,
            "stale_attempt_control_sha256": stale_attempt_hash,
            "stale_attempt_control_source_execution_receipt_sha256": stale_attempt_execution_hash,
            "exact_phase_argv_allowlisted": True,
            "supervisor_owned_create_only_outputs": True,
            "relabeled_help_controls": True,
            "preexisting_output_controls": True,
            "workflow_run_attempt_bound": True,
            "same_run_stale_attempt_control": True,
            "source_inventory_and_execution_generation_bound": True,
            "external_source_generation_aba_control": True,
        },
        "nodes": admitted,
        "node_set": list(NODES),
        "controls": controls,
        "all_cross_runtime_controls_rejected": True,
        "exact_artifact_ids_bound": True,
        "artifact_api_and_zip_digests_bound": True,
        "per_node_membership_and_aggregate_bound": True,
        "node_runtime_labels_bound": True,
        "source_distinct_cross_runtime_verifier": True,
        "source_inventory_and_execution_generation_bound": True,
        "external_source_generation_aba_control": True,
        "exact_phase_argv_allowlisted": True,
        "supervisor_owned_create_only_outputs": True,
        "relabeled_help_controls": True,
        "preexisting_output_controls": True,
        "run_api_attempt_bound": True,
        "artifact_run_attempt_names_bound": True,
        "current_attempt_producer_membership_bound": True,
        "first_attempt_only": True,
        "stale_attempt_control": True,
        "v45_full_stack_evidence_composition_accepted": False,
        "full_job_process_census": False,
        "datanet_availability_proved": False,
        "production_runtime_touched": False,
    }
    out = seal(out, "top_aggregate_sha256")
    write_output(Path(ns.output), canon(out))
    print(canon(out).decode(), end="")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="mode", required=True)
    sub.add_parser("selftest")
    stale = sub.add_parser("stale-attempt-control")
    stale.add_argument("--run-id", type=int, required=True)
    stale.add_argument("--control-run-attempt", type=int, required=True)
    stale.add_argument("--expected-head", required=True)
    stale.add_argument("--producer-attempt", type=int, required=True)
    stale.add_argument("--finalizer-attempt", type=int, required=True)
    stale.add_argument("--output", required=True)
    live = sub.add_parser("aggregate")
    live.add_argument("--repository", required=True)
    live.add_argument("--run-id", type=int, required=True)
    live.add_argument("--run-attempt", type=int, required=True)
    live.add_argument("--api-url", required=True)
    live.add_argument("--expected-head", required=True)
    live.add_argument("--expected-tree", required=True)
    live.add_argument("--source-generation-control-receipt", required=True)
    live.add_argument("--source-selftest-receipt", required=True)
    live.add_argument("--phase-argv-control-receipt", required=True)
    live.add_argument("--preexisting-output-control-receipt", required=True)
    live.add_argument("--stale-attempt-control", required=True)
    live.add_argument("--stale-attempt-control-receipt", required=True)
    live.add_argument("--output", required=True)
    ns = parser.parse_args()
    if ns.mode == "selftest":
        return selftest()
    if ns.mode == "stale-attempt-control":
        return stale_attempt_control(ns)
    return aggregate(ns)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except MatrixHold as exc:
        print(json.dumps({"marker": "VOID_DATANET_V45_MATRIX_HOLD", "code": exc.code}, sort_keys=True), file=sys.stderr)
        raise

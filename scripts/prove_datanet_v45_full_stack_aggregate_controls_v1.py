#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
"""Source-distinct negative controls for the V45 candidate producer."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import types

CANDIDATE_MARKER = "VOID_DATANET_V45_FULL_STACK_AGGREGATE_CANDIDATE_V1_GREEN"
ROOT = Path(__file__).resolve().parents[1]
CONTROLS_MARKER = "VOID_DATANET_V45_FULL_STACK_AGGREGATE_CONTROLS_V1_GREEN"



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


class ControlHold(AssertionError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def require(condition: bool, code: str) -> None:
    if not condition:
        raise ControlHold(code)


def canonical(obj: object) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stat_key(st: os.stat_result) -> tuple[int, ...]:
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_nlink, st.st_uid, st.st_gid,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )


def stable_read(path: Path) -> bytes:
    require(path.is_absolute() and path.name not in ("", ".", ".."), "HOLD_V45_CONTROL_INPUT_PATH")
    dflags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fflags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    parent = os.open(path.parent, dflags)
    fd = -1
    try:
        parent_before = stat_key(os.fstat(parent))
        visible = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        fd = custody_artifact_open(path)
        before = os.fstat(fd)
        require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1, "HOLD_V45_CONTROL_INPUT_REGULAR")
        require(stat_key(visible) == stat_key(before), "HOLD_V45_CONTROL_INPUT_GENERATION")
        chunks = []
        remaining = before.st_size
        while remaining:
            block = os.read(fd, min(1024 * 1024, remaining))
            require(bool(block), "HOLD_V45_CONTROL_INPUT_SHORT_READ")
            chunks.append(block)
            remaining -= len(block)
        require(os.read(fd, 1) == b"", "HOLD_V45_CONTROL_INPUT_GROWTH")
        after = os.fstat(fd)
        final_visible = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        require(stat_key(before) == stat_key(after), "HOLD_V45_CONTROL_INPUT_CHANGED")
        require(stat_key(final_visible) == stat_key(after), "HOLD_V45_CONTROL_INPUT_REPLACED")
        require(stat_key(os.fstat(parent)) == parent_before, "HOLD_V45_CONTROL_INPUT_ABA")
        return b"".join(chunks)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent)


def read_object(path: Path) -> dict:
    try:
        obj = json.loads(stable_read(path).decode("utf-8", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ControlHold("HOLD_V45_CONTROL_INPUT_JSON") from exc
    require(isinstance(obj, dict), "HOLD_V45_CONTROL_INPUT_OBJECT")
    return obj


def sealed(obj: dict, field: str) -> dict:
    out = copy.deepcopy(obj)
    out.pop(field, None)
    out[field] = digest(canonical(out))
    return out


def verify_seal(obj: dict, field: str, code: str) -> None:
    claimed = obj.get(field)
    base = copy.deepcopy(obj)
    base.pop(field, None)
    require(isinstance(claimed, str) and len(claimed) == 64 and digest(canonical(base)) == claimed, code)


def validate_candidate(candidate: dict, expected_head: str, expected_tree: str, actual_inventory: dict) -> None:
    verify_seal(candidate, "candidate_sha256", "HOLD_V45_CANDIDATE_SELF_HASH")
    require(candidate.get("marker") == CANDIDATE_MARKER and candidate.get("status") == "GREEN", "HOLD_V45_CANDIDATE_MARKER")
    require(candidate.get("head") == expected_head and candidate.get("source", {}).get("head") == expected_head, "HOLD_V45_MIXED_HEAD")
    require(candidate.get("tree") == expected_tree and candidate.get("source", {}).get("tree") == expected_tree, "HOLD_V45_MIXED_TREE")
    require(candidate.get("run_id") == candidate.get("source_execution", {}).get("run_id"), "HOLD_V45_RUN_ID")
    require(
        candidate.get("run_attempt") == candidate.get("source_execution", {}).get("run_attempt"),
        "HOLD_V45_RUN_ATTEMPT",
    )
    require(candidate.get("artifact_generation_bound") is True, "HOLD_V45_CANDIDATE_GENERATION_BINDING")
    require(
        candidate.get("source_inventory_and_execution_generation_bound") is True
        and candidate.get("external_source_generation_aba_control") is True
        and candidate.get("source_execution", {}).get("source_inventory_and_execution_generation_bound") is True
        and candidate.get("source_execution", {}).get("external_source_generation_aba_control") is True
        and candidate.get("exact_phase_argv_allowlisted") is True
        and candidate.get("supervisor_owned_create_only_outputs") is True
        and candidate.get("relabeled_help_controls") is True
        and candidate.get("workflow_run_attempt_bound") is True,
        "HOLD_V45_SOURCE_EXECUTION_BINDING",
    )
    require(candidate.get("mutators_retired") is True and candidate.get("capabilities_released") is True, "HOLD_V45_PREMATURE_AGGREGATE")
    accounting = candidate.get("process_accounting", {})
    untraced = accounting.get("untraced_phases", {})
    require(
        accounting.get("scope") == "runner_subgraph_only"
        and accounting.get("runner_subgraph", {}).get("trace_complete_within_subgraph") is True
        and accounting.get("full_job_process_census") is False
        and set(untraced) == {
            "preallocation_static_runtime", "candidate_aba_control", "candidate",
            "candidate_controls", "producer_substitution_control", "terminal_aba_control",
            "terminal_verifier", "source_execution_supervision", "artifact_upload",
            "cross_runtime_stale_attempt_control", "cross_runtime_aggregate",
            "custody_session", "custody_controls", "capsule_export",
        }
        and all(
            row == {"trace_complete": False, "process_lifetimes": None, "successful_execve": None}
            for row in untraced.values()
        ),
        "HOLD_V45_PROCESS_SCOPE_LABEL",
    )
    claimed_inventory = candidate.get("input_inventory")
    require(isinstance(claimed_inventory, dict) and set(claimed_inventory) == set(actual_inventory), "HOLD_V45_ARTIFACT_MEMBERSHIP")
    for name, receipt in actual_inventory.items():
        require(claimed_inventory.get(name) == receipt, "HOLD_V45_ARTIFACT_DIGEST")
    require(candidate.get("production_runtime_touched") is False, "HOLD_V45_PRODUCTION_TOUCH")


def expect_rejection(code: str, candidate: dict, head: str, tree: str, actual: dict) -> str:
    try:
        validate_candidate(candidate, head, tree, actual)
    except ControlHold as exc:
        require(exc.code == code, "HOLD_V45_CONTROL_WRONG_REJECTION")
        return exc.code
    raise ControlHold("HOLD_V45_CONTROL_UNEXPECTED_ACCEPTANCE")


def write_private(path: Path, obj: dict) -> None:
    data = canonical(obj)
    if os.environ.get("VOID_V45_OUTPUT_CUSTODY_V1") == "1":
        try:
            mapping = json.loads(os.environ["VOID_V45_OUTPUT_FDS"])
            fd = mapping[str(path)]
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ControlHold("HOLD_V45_CONTROL_OUTPUT_FD_CONTRACT") from exc
        require(isinstance(fd, int) and fd >= 3, "HOLD_V45_CONTROL_OUTPUT_FD_CONTRACT")
        before = os.fstat(fd)
        require(
            stat.S_ISREG(before.st_mode)
            and before.st_nlink == 1
            and stat.S_IMODE(before.st_mode) == 0o400
            and before.st_size == 0,
            "HOLD_V45_CONTROL_OUTPUT_FD_SHAPE",
        )
        offset = 0
        while offset < len(data):
            written = os.write(fd, data[offset:])
            require(written > 0, "HOLD_V45_CONTROL_OUTPUT_FD_WRITE")
            offset += written
        os.fsync(fd)
        after = os.fstat(fd)
        require(
            (before.st_dev, before.st_ino, before.st_mode, before.st_nlink, before.st_uid, before.st_gid)
            == (after.st_dev, after.st_ino, after.st_mode, after.st_nlink, after.st_uid, after.st_gid)
            and after.st_size == len(data),
            "HOLD_V45_CONTROL_OUTPUT_FD_CHANGED",
        )
        return
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fd = os.open(path, flags, 0o600)
    try:
        offset = 0
        while offset < len(data):
            written = os.write(fd, data[offset:])
            require(written > 0, "HOLD_V45_CONTROL_OUTPUT_WRITE")
            offset += written
        os.fsync(fd)
    finally:
        os.close(fd)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--expected-head", required=True)
    parser.add_argument("--expected-tree", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--candidate-generation-control-receipt", required=True)
    parser.add_argument("--substitute-candidate-output", required=True)
    parser.add_argument("--substitute-controls-output", required=True)
    ns = parser.parse_args()

    candidate = read_object(Path(ns.candidate))
    candidate_aba = read_object(Path(ns.candidate_generation_control_receipt))
    verify_seal(candidate_aba, "receipt_sha256", "HOLD_V45_CANDIDATE_ABA_RECEIPT_SEAL")
    require(
        candidate_aba.get("marker") == "VOID_DATANET_V45_CANDIDATE_ABA_CONTROL_V1_GREEN"
        and candidate_aba.get("status") == "GREEN"
        and candidate_aba.get("rejection") == "HOLD_V45_ARTIFACT_GENERATION_CHANGED"
        and candidate_aba.get("production_runtime_touched") is False,
        "HOLD_V45_CANDIDATE_ABA_RECEIPT",
    )
    actual = copy.deepcopy(candidate.get("input_inventory"))
    require(isinstance(actual, dict) and bool(actual), "HOLD_V45_CONTROL_INVENTORY")
    validate_candidate(candidate, ns.expected_head, ns.expected_tree, actual)
    first = sorted(actual)[0]

    missing = copy.deepcopy(candidate)
    del missing["input_inventory"][first]
    missing = sealed(missing, "candidate_sha256")

    substituted = copy.deepcopy(candidate)
    substituted["input_inventory"][first]["sha256"] = "0" * 64
    substituted = sealed(substituted, "candidate_sha256")

    mixed_head = copy.deepcopy(candidate)
    mixed_head["head"] = mixed_head["source"]["head"] = "f" * 40
    mixed_head = sealed(mixed_head, "candidate_sha256")

    mixed_tree = copy.deepcopy(candidate)
    mixed_tree["tree"] = mixed_tree["source"]["tree"] = "e" * 40
    mixed_tree = sealed(mixed_tree, "candidate_sha256")

    premature = copy.deepcopy(candidate)
    premature["mutators_retired"] = False
    premature = sealed(premature, "candidate_sha256")

    rejections = {
        "missing": expect_rejection("HOLD_V45_ARTIFACT_MEMBERSHIP", missing, ns.expected_head, ns.expected_tree, actual),
        "substituted": expect_rejection("HOLD_V45_ARTIFACT_DIGEST", substituted, ns.expected_head, ns.expected_tree, actual),
        "mixed_head": expect_rejection("HOLD_V45_MIXED_HEAD", mixed_head, ns.expected_head, ns.expected_tree, actual),
        "mixed_tree": expect_rejection("HOLD_V45_MIXED_TREE", mixed_tree, ns.expected_head, ns.expected_tree, actual),
        "premature": expect_rejection("HOLD_V45_PREMATURE_AGGREGATE", premature, ns.expected_head, ns.expected_tree, actual),
    }

    fake_candidate = copy.deepcopy(candidate)
    require(fake_candidate.get("tiers", {}).get("v44", {}).get("direct_read_errno") == 5, "HOLD_V45_PRODUCER_CONTROL_TARGET")
    fake_candidate["tiers"]["v44"]["direct_read_errno"] = 0
    fake_candidate = sealed(fake_candidate, "candidate_sha256")

    controls = {
        "marker": CONTROLS_MARKER,
        "status": "GREEN",
        "run_id": candidate["run_id"],
        "run_attempt": candidate["run_attempt"],
        "candidate_sha256": candidate["candidate_sha256"],
        "rejections": rejections,
        "all_rejected": True,
        "control_implementation_imports_candidate": False,
        "candidate_generation_aba_control": candidate_aba,
        "producer_substitution_fixture": {
            "changed_predicate": "tiers.v44.direct_read_errno",
            "original": 5,
            "substituted": 0,
            "candidate_sha256": fake_candidate["candidate_sha256"],
        },
        "production_runtime_touched": False,
    }
    controls = sealed(controls, "controls_sha256")
    fake_controls = copy.deepcopy(controls)
    fake_controls["candidate_sha256"] = fake_candidate["candidate_sha256"]
    fake_controls = sealed(fake_controls, "controls_sha256")

    write_private(Path(ns.substitute_candidate_output), fake_candidate)
    write_private(Path(ns.substitute_controls_output), fake_controls)
    write_private(Path(ns.output), controls)
    print(canonical(controls).decode(), end="")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ControlHold as exc:
        print(json.dumps({"marker": "VOID_DATANET_V45_CONTROL_HOLD", "code": exc.code}, sort_keys=True), file=sys.stderr)
        raise

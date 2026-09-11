#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
COMMON_SOURCE = Path(__file__).resolve()
ENTRYPOINT_SCRIPT = SCRIPT_DIR / "prove_datanet_v30_campaign_topology_ext4_v1.py"
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))
import prove_datanet_posix_admission_capability_v1 as admission

MARKER = "VOID_DATANET_V30_CAMPAIGN_TOPOLOGY_EXT4_V1_GREEN"
CLASSIFIER_MARKER = "VOID_DATANET_V30_STATE_CLASSIFIER_V1_GREEN"
COLLECTOR_MARKER = "VOID_DATANET_V30_CHECKPOINT_COLLECTOR_V1_GREEN"
PUBLICATION_MARKER = "VOID_DATANET_V30_CAMPAIGN_PUBLICATION_EXT4_V1_GREEN"
FINAL_MARKER = "VOID_DATANET_V30_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
FIXTURE_PATH = REPO_ROOT / "fixtures" / "datanet-v30-campaign-topology-ext4-v1.json"
PUBLICATION_SCRIPT = SCRIPT_DIR / "prove_datanet_v30_campaign_publication_ext4_v1.mjs"
FINAL_SCRIPT = SCRIPT_DIR / "prove_datanet_v30_campaign_final_verifier_v1.py"
ACCEPTED_POSIX_SOURCE_GIT_BLOB_SHA1 = "c4d92dcaaed8879bcd98b96e199729098712d5b4"

def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def load_fixture() -> dict:
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    assert fixture["v"] == 1
    assert fixture["format"] == "VOID_DATANET_V30_CAMPAIGN_TOPOLOGY_EXT4_CONTROL_V1"
    assert fixture["parent_head"] == "acdef1efa884cb52dfee01c5230aeb7ff8fbd918"
    assert fixture["v30_review_id"] == 5173807194
    assert fixture["accepted_posix_source_git_blob_sha1"] == ACCEPTED_POSIX_SOURCE_GIT_BLOB_SHA1
    assert fixture["process_topology"] == {
        "observer": 1,
        "e0_contenders": 8,
        "e0_classifier": 1,
        "r0_h0_publisher": 1,
        "checkpoint_diagnostic_collector": 1,
        "r0_contenders": 8,
        "source_distinct_final_verifier": 1,
        "fallocate_helpers": 3,
        "link_helpers": 3,
        "total_lifetimes": 27,
        "peak_live": 9,
    }
    assert fixture["v30_composed_success_ledger"] == {
        "calls": 14347,
        "requested_bytes": 939524107,
        "completed_or_returned_bytes": 939524096,
        "writes": 3072,
        "reads": 11275,
        "nonempty_calls": 14336,
        "eof_probes": 11,
        "completed_mib": 896,
        "throughput_floor_mib_per_second_numerator": 448,
        "throughput_floor_mib_per_second_denominator": 225,
    }
    return fixture


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def source_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def assert_admission_source(fixture: dict) -> dict:
    path = Path(admission.__file__).resolve()
    data = path.read_bytes()
    blob = git_blob_sha1(data)
    assert blob == fixture["accepted_posix_source_git_blob_sha1"], (blob, fixture["accepted_posix_source_git_blob_sha1"])
    return {"git_blob_sha1": blob, "sha256": hashlib.sha256(data).hexdigest()}


def slot_name(k: str, slot: int) -> str:
    assert slot in (0, 1)
    return f"datanet-{k}-s{slot}.v1"


def cap_name(k: str) -> str:
    return admission.capability_name(k)


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def validate_capability_metadata(root_fd: int, binding: admission.Binding) -> dict:
    visible = os.stat(cap_name(binding.k), dir_fd=root_fd, follow_symlinks=False)
    assert stat.S_ISREG(visible.st_mode)
    assert not stat.S_ISLNK(visible.st_mode)
    assert identity(visible) == binding.lock_identity
    assert visible.st_uid == os.getuid()
    assert visible.st_nlink == 1
    assert stat.S_IMODE(visible.st_mode) == 0o600
    assert visible.st_size == 0
    return {"name": cap_name(binding.k), "identity": binding.lock_identity}


def full_read_s0(root_fd: int, binding: admission.Binding, fixture: dict) -> dict:
    name = slot_name(binding.k, 0)
    flags = os.O_RDONLY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, dir_fd=root_fd)
    try:
        before = os.fstat(fd)
        visible_before = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(before.st_mode)
        assert not stat.S_ISLNK(visible_before.st_mode)
        assert identity(before) == identity(visible_before)
        assert before.st_uid == os.getuid()
        assert before.st_nlink == 1
        assert stat.S_IMODE(before.st_mode) == 0o600
        assert before.st_size == fixture["payload_bytes"]
        assert before.st_blocks * 512 >= fixture["payload_bytes"]
        h = hashlib.sha256()
        calls = requested = returned = 0
        block_bytes = fixture["io_block_bytes"]
        for offset in range(0, fixture["payload_bytes"], block_bytes):
            data = os.pread(fd, block_bytes, offset)
            calls += 1
            requested += block_bytes
            returned += len(data)
            assert len(data) == block_bytes, (offset, len(data))
            h.update(data)
        eof = os.pread(fd, 1, fixture["payload_bytes"])
        calls += 1
        requested += 1
        returned += len(eof)
        assert eof == b""
        assert h.hexdigest() == fixture["payload_sha256"]
        after = os.fstat(fd)
        visible_after = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        assert identity(after) == identity(before)
        assert identity(visible_after) == identity(before)
        assert after.st_size == before.st_size
        assert after.st_nlink == 1
        return {
            "s0_name": name,
            "s0_identity": identity(before),
            "ledger": {
                "read_calls": calls,
                "read_requested_bytes": requested,
                "read_returned_bytes": returned,
                "eof_probes": 1,
            },
            "sha256": h.hexdigest(),
        }
    finally:
        os.close(fd)


def reduce_s0_only(root_fd: int, binding: admission.Binding, fixture: dict) -> dict:
    """Schedule-agnostic reducer used by both the E0 classifier and R0 recovery winner."""
    root_st = os.fstat(root_fd)
    assert identity(root_st) == binding.root_identity
    cap = validate_capability_metadata(root_fd, binding)
    expected = sorted([cap["name"], slot_name(binding.k, 0)])
    actual = sorted(os.listdir(root_fd))
    assert actual == expected, (actual, expected)
    read = full_read_s0(root_fd, binding, fixture)
    assert sorted(os.listdir(root_fd)) == expected
    validate_capability_metadata(root_fd, binding)
    assert read["ledger"] == {
        "read_calls": fixture["one_classifier_ledger"]["read_calls"],
        "read_requested_bytes": fixture["one_classifier_ledger"]["read_requested_bytes"],
        "read_returned_bytes": fixture["one_classifier_ledger"]["read_returned_bytes"],
        "eof_probes": 1,
    }
    return {
        "decision": "AUTHORIZE_H1",
        "root_identity": binding.root_identity,
        "quota_key": binding.k,
        "s0_name": read["s0_name"],
        "s0_identity": read["s0_identity"],
        "s0_sha256": read["sha256"],
        "ledger": read["ledger"],
        "reducer_source_sha256": source_sha256(COMMON_SOURCE),
        "schedule_label_input": False,
        "disposable_history_input": False,
    }


def open_root_readonly(root: str, expected_identity: str) -> int:
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(root, flags)
    st = os.fstat(fd)
    assert stat.S_ISDIR(st.st_mode)
    assert identity(st) == expected_identity
    return fd


def parse_binding(ns: argparse.Namespace) -> admission.Binding:
    return admission.Binding(root_identity=ns.root_identity, lock_identity=ns.lock_identity, k=ns.k)


def close_quiet(fd: int | None) -> None:
    if fd is None or fd < 0:
        return
    try:
        os.close(fd)
    except OSError:
        pass


def exec_publication(root: str, binding: admission.Binding, fixture: dict, slot: int, lock_fd: int, hold_fd: int, prior: dict | None) -> None:
    node = shutil.which("node")
    assert node is not None, "node unavailable"
    assert lock_fd >= 5, f"lock fd unexpectedly low: {lock_fd}"
    os.set_inheritable(lock_fd, True)
    os.set_inheritable(hold_fd, True)
    env = os.environ.copy()
    env["VOID_DATANET_EXT4_ROOT"] = root
    env["VOID_DATANET_EXPECTED_ROOT_IDENTITY"] = binding.root_identity
    env["VOID_DATANET_ADMISSION_CAPABILITY_NAME"] = cap_name(binding.k)
    env["VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY"] = binding.lock_identity
    env["VOID_DATANET_PUBLICATION_SLOT"] = str(slot)
    env["VOID_DATANET_INHERITED_LOCK_FD"] = str(lock_fd)
    env["VOID_DATANET_HOLD_FD"] = str(hold_fd)
    if prior is None:
        env.pop("VOID_DATANET_PRIOR_CLASSIFICATION_JSON", None)
    else:
        env["VOID_DATANET_PRIOR_CLASSIFICATION_JSON"] = json.dumps(prior, sort_keys=True, separators=(",", ":"))
    os.execve(node, [node, str(PUBLICATION_SCRIPT)], env)
    raise AssertionError("execve unexpectedly returned")

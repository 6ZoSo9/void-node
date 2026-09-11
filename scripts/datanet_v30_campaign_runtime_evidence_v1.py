#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import json
import os
import stat
import sys

from datanet_v30_campaign_common_v1 import *
from datanet_v30_campaign_runtime_io_v1 import *

def run_final_verifier(e0_root: str, e0_binding: admission.Binding, r0_root: str, r0_binding: admission.Binding, fixture: dict) -> dict:
    args = [
        sys.executable, "-I", "-B", str(FINAL_SCRIPT),
        "--fixture", str(FIXTURE_PATH),
        "--e0-root", e0_root,
        "--e0-root-identity", e0_binding.root_identity,
        "--r0-root", r0_root,
        "--r0-root-identity", r0_binding.root_identity,
    ]
    proc = popen_tracked(args)
    out, err = wait_clean(proc, 120)
    assert err == ""
    lines = [line for line in out.splitlines() if line.strip()]
    assert len(lines) == 1
    receipt = json.loads(lines[0])
    assert receipt["marker"] == FINAL_MARKER
    assert receipt["status"] == "GREEN"
    assert receipt["source_sha256"] == source_sha256(FINAL_SCRIPT)
    assert receipt["ledger"] == {
        "read_calls": fixture["final_verifier_ledger"]["read_calls"],
        "read_requested_bytes": fixture["final_verifier_ledger"]["read_requested_bytes"],
        "read_returned_bytes": fixture["final_verifier_ledger"]["read_returned_bytes"],
        "eof_probes": 3,
    }
    return receipt


def compose_ledger(publications: list[dict], classifiers: list[dict], final_receipt: dict) -> dict:
    calls = requested = completed = writes = reads = eof = 0
    for receipt in publications:
        w = receipt["write_ledger"]
        pre = receipt["prepublication_anonymous_rehash"]
        post = receipt["postpublication_readback"]
        calls += w["calls"] + pre["calls"] + post["calls"]
        requested += w["requested"] + pre["requested"] + post["requested"]
        completed += w["completed"] + pre["completed"] + post["completed"]
        writes += w["calls"]
        reads += pre["calls"] + post["calls"]
        eof += pre["eof_probes"] + post["eof_probes"]
    for receipt in classifiers:
        ledger = receipt["ledger"]
        calls += ledger["read_calls"]
        requested += ledger["read_requested_bytes"]
        completed += ledger["read_returned_bytes"]
        reads += ledger["read_calls"]
        eof += ledger["eof_probes"]
    final = final_receipt["ledger"]
    calls += final["read_calls"]
    requested += final["read_requested_bytes"]
    completed += final["read_returned_bytes"]
    reads += final["read_calls"]
    eof += final["eof_probes"]
    return {
        "calls": calls,
        "requested_bytes": requested,
        "completed_or_returned_bytes": completed,
        "writes": writes,
        "reads": reads,
        "nonempty_calls": calls - eof,
        "eof_probes": eof,
        "completed_mib": completed // (1024 * 1024),
        "throughput_floor_mib_per_second_numerator": 448,
        "throughput_floor_mib_per_second_denominator": 225,
    }


def census(root: str, binding: admission.Binding) -> dict:
    root_fd = open_root_readonly(root, binding.root_identity)
    try:
        entries = sorted(os.listdir(root_fd))
        result = []
        for name in entries:
            st = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
            result.append({
                "name": name,
                "identity": identity(st),
                "mode": oct(stat.S_IMODE(st.st_mode)),
                "nlink": st.st_nlink,
                "size": st.st_size,
            })
        return {"root_identity": binding.root_identity, "entries": result}
    finally:
        os.close(root_fd)


def write_create_only_json(directory_fd: int, name: str, obj: dict) -> int:
    payload = (json.dumps(obj, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC
    fd = os.open(name, flags, 0o600, dir_fd=directory_fd)
    try:
        offset = 0
        while offset < len(payload):
            n = os.write(fd, payload[offset:])
            assert n > 0
            offset += n
        os.fsync(fd)
    finally:
        os.close(fd)
    return len(payload)


def write_evidence(evidence_dir: str, files: dict[str, dict]) -> dict:
    assert sorted(files) == ["aggregate.json", "manifest.json", "observer.json", "restart-census.json", "runtime.json"]
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    directory_fd = os.open(evidence_dir, flags)
    try:
        assert os.listdir(directory_fd) == [], "evidence directory not empty"
        sizes = {name: write_create_only_json(directory_fd, name, obj) for name, obj in files.items()}
        os.fsync(directory_fd)
        assert sorted(os.listdir(directory_fd)) == sorted(files)
        total = sum(sizes.values())
        assert total < 2 * 1024 * 1024, total
        return {"files": sizes, "combined_bytes": total, "create_only": True, "directory_fsync": True}
    finally:
        os.close(directory_fd)

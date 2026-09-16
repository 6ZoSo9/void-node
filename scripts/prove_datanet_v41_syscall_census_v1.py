#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

MARKER = "VOID_DATANET_V41_SYSCALL_CENSUS_V1_GREEN"
GETVERSION = "0x80086603"
SETVERSION = "0x40086604"
ENABLE_VERITY = "0x40806685"
MEASURE_VERITY = "0xc0046686"


def successful(line: str) -> bool:
    return "= -1" not in line and "= ?" not in line


def count(lines, pred) -> int:
    return sum(1 for line in lines if pred(line))


def ioctl_count(lines, command: str, *, success_only: bool = False) -> int:
    pattern = re.compile(rf"\bioctl\([^,]+,\s*{re.escape(command)},", re.IGNORECASE)
    return count(lines, lambda line: pattern.search(line) is not None and (not success_only or successful(line)))


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--trace", required=True)
    p.add_argument("--control", required=True)
    p.add_argument("--output")
    ns = p.parse_args()
    trace_path = Path(ns.trace)
    cfg = json.loads(Path(ns.control).read_text(encoding="utf-8"))
    expected = cfg["external_syscall_census"]
    trace = trace_path.read_text(encoding="utf-8")
    lines = trace.splitlines()
    actual = {
        "ext4_getversion": ioctl_count(lines, GETVERSION),
        "ext4_setversion": ioctl_count(lines, SETVERSION),
        "fsverity_enable_success": ioctl_count(lines, ENABLE_VERITY, success_only=True),
        "fsverity_measure_success": ioctl_count(lines, MEASURE_VERITY, success_only=True),
        "fallocate_success": count(lines, lambda l: "fallocate(" in l and successful(l)),
        "payload_link_success": count(lines, lambda l: ("link(" in l or "linkat(" in l) and "datanet-" in l and ".v1" in l and successful(l)),
        "memfd_create_success": count(lines, lambda l: "memfd_create(" in l and "void-v39-claimant" in l and successful(l)),
        "f_add_seals_success": count(lines, lambda l: "fcntl(" in l and "F_ADD_SEALS" in l and successful(l)),
        "f_get_seals_success": count(lines, lambda l: "fcntl(" in l and "F_GET_SEALS" in l and successful(l)),
        "armed_create_only_success": count(lines, lambda l: ".armed.v3" in l and "openat(" in l and "O_CREAT" in l and "O_EXCL" in l and successful(l)),
        "claimed_create_only_success": count(lines, lambda l: ".claimed.v3" in l and "openat(" in l and "O_CREAT" in l and "O_EXCL" in l and successful(l)),
        "closed_create_only_success": count(lines, lambda l: ".closed.v3" in l and "openat(" in l and "O_CREAT" in l and "O_EXCL" in l and successful(l)),
        "v39_adapter_execs": count(lines, lambda l: "execve(" in l and "prove_datanet_v39_exec_claimant_adapter_v1.mjs" in l and successful(l)),
        "v39_link_generation_record_helper_execs": count(lines, lambda l: "execve(" in l and "datanet_v39_link_generation_record_helper_v1.py" in l and successful(l)),
        "unlink_rename_success": count(lines, lambda l: re.search(r"\b(unlink|unlinkat|rename|renameat|renameat2)\(", l) is not None and successful(l)),
    }
    assert actual == expected, {"actual": actual, "expected": expected}
    out = {
        "format": "VOID_DATANET_V41_SYSCALL_CENSUS_V1",
        "marker": MARKER,
        "status": "GREEN",
        "parent_head": cfg["parent_head"],
        "counts": actual,
        "ext4_ioc_getversion_hex": GETVERSION,
        "ext4_ioc_setversion_hex": SETVERSION,
        "fs_ioc_enable_verity_hex": ENABLE_VERITY,
        "fs_ioc_measure_verity_hex": MEASURE_VERITY,
        "trace_sha256": hashlib.sha256(trace_path.read_bytes()).hexdigest(),
        "mutation_control_included_in_trace": False,
        "campaign_role_or_helper_lifetime": False,
        "production_runtime_touched": False,
    }
    encoded = json.dumps(out, sort_keys=True, separators=(",", ":")) + "\n"
    print(encoded, end="")
    if ns.output:
        Path(ns.output).write_text(encoded, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

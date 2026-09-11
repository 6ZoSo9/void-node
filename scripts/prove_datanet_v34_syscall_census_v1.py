#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re

MARKER = "VOID_DATANET_V34_SYSCALL_CENSUS_V1_GREEN"
GETVERSION = "0x80086603"
SETVERSION = "0x40086604"


def successful(line: str) -> bool:
    return "= -1" not in line and "= ?" not in line


def count(lines: list[str], predicate) -> int:
    return sum(1 for line in lines if predicate(line))


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
        "ext4_getversion": count(lines, lambda line: re.search(r"\bioctl\([^,]+,\s*0x80086603,", line) is not None),
        "ext4_setversion": count(lines, lambda line: re.search(r"\bioctl\([^,]+,\s*0x40086604,", line) is not None),
        "fallocate_success": count(lines, lambda line: "fallocate(" in line and successful(line)),
        "payload_link_success": count(lines, lambda line: ("link(" in line or "linkat(" in line) and "datanet-" in line and ".v1" in line and successful(line)),
        "memfd_create_success": count(lines, lambda line: "memfd_create(" in line and "void-v34-claimant" in line and successful(line)),
        "f_add_seals_success": count(lines, lambda line: "fcntl(" in line and "F_ADD_SEALS" in line and successful(line)),
        "f_get_seals_success": count(lines, lambda line: "fcntl(" in line and "F_GET_SEALS" in line and successful(line)),
        "armed_create_only_success": count(lines, lambda line: ".armed.v2" in line and "openat(" in line and "O_CREAT" in line and "O_EXCL" in line and successful(line)),
        "claimed_create_only_success": count(lines, lambda line: ".claimed.v2" in line and "openat(" in line and "O_CREAT" in line and "O_EXCL" in line and successful(line)),
        "closed_create_only_success": count(lines, lambda line: ".closed.v2" in line and "openat(" in line and "O_CREAT" in line and "O_EXCL" in line and successful(line)),
        "v34_adapter_execs": count(lines, lambda line: "execve(" in line and "prove_datanet_v34_exec_claimant_adapter_v1.mjs" in line and successful(line)),
        "link_generation_helper_execs": count(lines, lambda line: "execve(" in line and "datanet_v34_link_generation_helper_v1.py" in line and successful(line)),
        "unlink_rename_success": count(lines, lambda line: re.search(r"\b(unlink|unlinkat|rename|renameat|renameat2)\(", line) is not None and successful(line)),
    }
    assert actual == expected, {"actual": actual, "expected": expected}
    payload = {
        "format": "VOID_DATANET_V34_SYSCALL_CENSUS_V1",
        "marker": MARKER,
        "status": "GREEN",
        "parent_head": cfg["parent_head"],
        "counts": actual,
        "ext4_ioc_getversion_hex": GETVERSION,
        "ext4_ioc_setversion_hex": SETVERSION,
        "trace_sha256": hashlib.sha256(trace_path.read_bytes()).hexdigest(),
        "campaign_role_or_helper_lifetime": False,
        "production_runtime_touched": False,
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n"
    if ns.output:
        Path(ns.output).write_text(encoded, encoding="utf-8")
    print(encoded, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import datanet_ext4_inode_generation_v1 as inode_generation

SOURCE = Path(__file__).resolve()
MARKER = "VOID_DATANET_V34_LINK_GENERATION_HELPER_V1_GREEN"


def source_sha256() -> str:
    return hashlib.sha256(SOURCE.read_bytes()).hexdigest()


def ident(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slot-name", required=True)
    parser.add_argument("--payload-fd", type=int, default=3)
    parser.add_argument("--root-fd", type=int, default=4)
    ns = parser.parse_args()
    assert ns.payload_fd >= 3 and ns.root_fd >= 3 and ns.payload_fd != ns.root_fd
    assert "/" not in ns.slot_name and ns.slot_name not in ("", ".", "..")

    before = os.fstat(ns.payload_fd)
    root_st = os.fstat(ns.root_fd)
    assert stat.S_ISREG(before.st_mode)
    assert stat.S_ISDIR(root_st.st_mode)
    assert before.st_uid == os.getuid()
    assert before.st_nlink == 0

    src = f"/proc/self/fd/{ns.payload_fd}"
    dst = f"/proc/self/fd/{ns.root_fd}/{ns.slot_name}"
    os.link(src, dst, follow_symlinks=True)

    after = os.fstat(ns.payload_fd)
    visible = os.stat(ns.slot_name, dir_fd=ns.root_fd, follow_symlinks=False)
    assert stat.S_ISREG(visible.st_mode)
    assert ident(after) == ident(visible) == ident(before)
    assert after.st_nlink == visible.st_nlink == 1
    assert visible.st_uid == os.getuid()
    assert stat.S_IMODE(visible.st_mode) == 0o600

    generation = inode_generation.observe_ext4_inode_generation_v1(ns.payload_fd)
    assert generation["ioctl_calls"] == 1
    assert generation["setversion_issued"] is False
    receipt = {
        "marker": MARKER,
        "status": "GREEN",
        "pid": os.getpid(),
        "source_sha256": source_sha256(),
        "generation_source_sha256": inode_generation.source_sha256(),
        "slot_name": ns.slot_name,
        "payload_identity": ident(after),
        "generation": generation["generation"],
        "generation_identity": f"{ident(after)}:{generation['generation']}",
        "link_create_only": True,
        "payload_fd": ns.payload_fd,
        "root_fd": ns.root_fd,
        "ioctl_calls": 1,
        "setversion_issued": False,
    }
    print(json.dumps(receipt, sort_keys=True, separators=(",", ":")), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

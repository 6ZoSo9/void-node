#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import contextlib
import io
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_v41_fsverity_record_io_v1 as v41_io
import datanet_v39_exec_claimant_record_v1 as record

record.record_io = v41_io

import prove_datanet_v39_record_admission_mutation_control_v1 as v39_control

v39_control.record = record
v39_control.record_io = v41_io

MARKER = "VOID_DATANET_V41_GENERATION_REPLACEMENT_CONTROL_V1_GREEN"


def main() -> int:
    capture = io.StringIO()
    with contextlib.redirect_stdout(capture):
        rc = v39_control.main()
    assert rc == 0
    lines = [line for line in capture.getvalue().splitlines() if line]
    assert len(lines) == 1
    out = json.loads(lines[0])
    assert out["marker"] == "VOID_DATANET_V39_ACTUAL_ADMISSION_MUTATION_CONTROL_V1_GREEN"
    assert out["status"] == "GREEN"
    assert out["same_inode_reused"] is True
    assert out["byte_identical"] is True
    assert out["actual_v39_admission_rejected"] is True
    assert out["reject_code"] == "HOLD_RECORD_EMBEDDED_GENERATION"
    out.update({
        "marker": MARKER,
        "original_record_fsverity_required_before_unlink": True,
        "fsverity_path_replacement_prevented": False,
        "generation_binding_detected_replacement": True,
        "production_runtime_touched": False,
    })
    print(json.dumps(out, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

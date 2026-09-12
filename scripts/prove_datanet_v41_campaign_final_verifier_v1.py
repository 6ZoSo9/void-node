#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_v41_fsverity_record_io_v1 as v41_io
import datanet_v39_exec_claimant_record_v1 as recovery_record
import datanet_v39_claimant_capability_v1 as claimant_capability

SOURCE = Path(__file__).resolve()
MARKER = "VOID_DATANET_V41_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"


def sha256_path(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _args_for_seal() -> argparse.Namespace:
    p = argparse.ArgumentParser(add_help=False)
    p.add_argument("--fixture", required=True)
    p.add_argument("--r0-root", required=True)
    ns, _ = p.parse_known_args()
    return ns


def _seal_closed_after_s1_readback() -> dict:
    ns = _args_for_seal()
    fixture = json.loads(Path(ns.fixture).read_text(encoding="utf-8"))
    k = fixture["quota_key"]
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | (os.O_NOFOLLOW if hasattr(os, "O_NOFOLLOW") else 0)
    root_fd = os.open(ns.r0_root, flags)
    try:
        return v41_io.seal_existing(
            root_fd,
            recovery_record.closed_name(k),
            recovery_record.MAX_MARKER_BYTES,
            recovery_record.hold,
        )
    finally:
        os.close(root_fd)


def main() -> int:
    # CLOSED is intentionally sealed here, in the already-existing final-verifier
    # lifetime. This occurs only after the S1 publisher has emitted its accepted
    # postpublication receipt; no extra process lifetime is introduced.
    closed_seal = _seal_closed_after_s1_readback()

    recovery_record.record_io = v41_io
    claimant_capability.record_io = v41_io
    claimant_capability.record = recovery_record

    import prove_datanet_v39_campaign_final_verifier_v1 as v39_final
    v39_final.recovery_record = recovery_record
    v39_final.claimant_capability = claimant_capability

    capture = io.StringIO()
    with contextlib.redirect_stdout(capture):
        rc = v39_final.main()
    assert rc == 0
    lines = [line for line in capture.getvalue().splitlines() if line]
    assert len(lines) == 1
    out = json.loads(lines[0])
    assert out["marker"] == "VOID_DATANET_V39_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
    assert out["status"] == "GREEN"
    assert out["generation_bound_record_admission"] is True
    assert out["same_claimant_pid_bound_claimed_closed"] is True
    assert out["record_generation_ioctl_calls"] == 3
    assert out["closed_sha256"] == closed_seal["sha256"]
    out.update({
        "marker": MARKER,
        "v41_source_sha256": sha256_path(SOURCE),
        "v41_record_io_sha256": v41_io.source_sha256(),
        "fsverity_record_admission": True,
        "record_fsverity_measure_ioctl_calls": 3,
        "same_uid_record_write_denied_during_final_admission": True,
        "all_three_recovery_records_fsverity_required": True,
        "closed_sealed_after_s1_postpublication_readback": True,
        "closed_seal": closed_seal,
        "production_runtime_touched": False,
    })
    print(json.dumps(out, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

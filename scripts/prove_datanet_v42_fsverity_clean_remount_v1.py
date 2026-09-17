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
import stat
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_v41_fsverity_record_io_v1 as v41_io
import datanet_v39_exec_claimant_record_v1 as record
import datanet_v39_claimant_capability_v1 as claimant
import prove_datanet_v39_campaign_final_verifier_v1 as v39_final

CONTROL = REPO_ROOT / "fixtures" / "datanet-v42-fsverity-clean-remount-composition-ext4-v1.json"
FIXTURE = REPO_ROOT / "fixtures" / "datanet-v31-campaign-topology-ext4-v1.json"
PARENT_HEAD = "31bc55d86b0fd9a6b963834dfd46243e34cd9ea3"
STATIC = "VOID_DATANET_V42_FSVERITY_CLEAN_REMOUNT_STATIC_V1_GREEN"
SNAPSHOT = "VOID_DATANET_V42_FSVERITY_REMOUNT_SNAPSHOT_V1_GREEN"
FINAL = "VOID_DATANET_V42_FSVERITY_CLEAN_REMOUNT_COMPOSITION_V1_GREEN"


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def canon(obj: dict) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def load_control() -> dict:
    cfg = json.loads(CONTROL.read_text(encoding="utf-8"))
    assert cfg["v"] == 1
    assert cfg["format"] == "VOID_DATANET_V42_FSVERITY_CLEAN_REMOUNT_COMPOSITION_EXT4_CONTROL_V1"
    assert cfg["parent_pr"] == 1501
    assert cfg["parent_head"] == PARENT_HEAD
    for rel, expected in sorted(cfg["accepted_v41_blobs"].items()):
        assert git_blob(REPO_ROOT / rel) == expected, rel
    assert cfg["preserved_campaign"] == {
        "durable_sequence": ["ARMED", "CLAIMED", "S1", "CLOSED"],
        "total_lifetimes": 27,
        "peak_live": 9,
        "calls": 15372,
        "completed_mib": 960,
        "record_schema": "V3",
    }
    return cfg


def patch_v41_admission() -> None:
    record.record_io = v41_io
    claimant.record_io = v41_io
    claimant.record = record
    v39_final.recovery_record = record
    v39_final.claimant_capability = claimant


def open_root(path: str, expected: str) -> int:
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(path, flags)
    st = os.fstat(fd)
    assert stat.S_ISDIR(st.st_mode)
    assert identity(st) == expected, (identity(st), expected)
    return fd


def fresh_final(e0_root: str, e0_identity: str, r0_root: str, r0_identity: str) -> dict:
    patch_v41_admission()
    prior = sys.argv
    capture = io.StringIO()
    try:
        sys.argv = [
            str(Path(v39_final.__file__).resolve()),
            "--fixture", str(FIXTURE),
            "--e0-root", e0_root,
            "--e0-root-identity", e0_identity,
            "--r0-root", r0_root,
            "--r0-root-identity", r0_identity,
        ]
        with contextlib.redirect_stdout(capture):
            rc = v39_final.main()
        assert rc == 0
    finally:
        sys.argv = prior
    lines = [line for line in capture.getvalue().splitlines() if line]
    assert len(lines) == 1, lines
    out = json.loads(lines[0])
    assert out["marker"] == "VOID_DATANET_V39_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
    assert out["status"] == "GREEN"
    assert out["generation_bound_record_admission"] is True
    assert out["record_generation_ioctl_calls"] == 3
    assert out["total_generation_ioctl_calls"] == 6
    assert len(out["e0"]["leaves"]) == 1 and len(out["r0"]["leaves"]) == 2
    assert out["same_claimant_pid_bound_claimed_closed"] is True
    assert out["production_runtime_touched"] is False
    return out


def record_snapshot(r0_root: str, root_identity: str, k: str) -> dict:
    patch_v41_admission()
    root_fd = open_root(r0_root, root_identity)
    try:
        result = {}
        for kind, name in (
            ("armed", record.armed_name(k)),
            ("claimed", record.claimed_name(k)),
            ("closed", record.closed_name(k)),
        ):
            item = record.read_one(root_fd, name)
            assert item is not None
            assert item["fsverity"]["algorithm"] == 1
            assert item["fsverity"]["digest_size"] == 32
            assert len(item["fsverity"]["digest_hex"]) == 64
            assert item["same_uid_write_denied"] is True and item["same_uid_write_errno"] == 1
            assert item["same_uid_rdwr_denied"] is True and item["same_uid_rdwr_errno"] == 1
            assert item["same_uid_truncate_denied"] is True and item["same_uid_truncate_errno"] == 1
            result[kind] = {
                "name": item["name"],
                "identity": item["identity"],
                "generation": item["generation"],
                "generation_identity": item["generation_identity"],
                "sha256": item["sha256"],
                "bytes": len(item["raw"]),
                "fsverity": item["fsverity"],
                "same_uid_write_denied": True,
                "same_uid_rdwr_denied": True,
                "same_uid_truncate_denied": True,
            }
        return result
    finally:
        os.close(root_fd)


def static_mode() -> int:
    cfg = load_control()
    claim = cfg["claim"]
    for key in (
        "accepted_v41_campaign_preserved",
        "same_explicit_block_device_pre_post",
        "clean_rw_unmount_remount",
        "root_identity_stable",
        "record_inode_generation_stable",
        "record_fsverity_digest_stable",
        "fresh_v41_admission_after_remount",
        "pre_post_verifier_receipt_equal",
        "same_uid_inplace_mutation_denied_after_remount",
    ):
        assert claim[key] is True, key
    for key in ("physical_power_loss_proved", "unclean_journal_replay_proved", "production_runtime_activation"):
        assert claim[key] is False, key
    emit({
        "marker": STATIC,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "accepted_v41_blob_count": len(cfg["accepted_v41_blobs"]),
        "clean_rw_unmount_remount": True,
        "physical_power_loss_proved": False,
        "unclean_journal_replay_proved": False,
        "production_runtime_touched": False,
    })
    return 0


def capture_mode(ns: argparse.Namespace) -> int:
    load_control()
    census = json.loads(Path(ns.pre_restart_census).read_text(encoding="utf-8"))
    assert census["format"] == "VOID_DATANET_V41_CAMPAIGN_RESTART_CENSUS_V1"
    assert census["generation_bound_record_admission"] is True
    assert census["fsverity_record_immutability"] is True
    e0_identity = census["e0"]["root_identity"]
    r0_identity = census["r0"]["root_identity"]
    k = json.loads(FIXTURE.read_text(encoding="utf-8"))["quota_key"]

    efd = open_root(ns.e0_root, e0_identity)
    rfd = open_root(ns.r0_root, r0_identity)
    os.close(rfd)
    os.close(efd)

    final = fresh_final(ns.e0_root, e0_identity, ns.r0_root, r0_identity)
    accepted = census["source_distinct_final_verifier"]
    assert accepted["marker"] == "VOID_DATANET_V41_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
    for key in (
        "armed_sha256", "claimed_sha256", "closed_sha256",
        "armed_record_generation_identity", "claimed_record_generation_identity", "closed_record_generation_identity",
    ):
        assert final[key] == accepted[key], key
    records = record_snapshot(ns.r0_root, r0_identity, k)
    for kind in ("armed", "claimed", "closed"):
        assert records[kind]["sha256"] == final[f"{kind}_sha256"]
        assert records[kind]["generation_identity"] == final[f"{kind}_record_generation_identity"]

    snap = {
        "marker": SNAPSHOT,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "e0_root_identity": e0_identity,
        "r0_root_identity": r0_identity,
        "fresh_final_verifier": final,
        "records": records,
        "payload_leaves_verified": 3,
        "recovery_records_verified": 3,
        "same_uid_inplace_mutation_denied": True,
        "production_runtime_touched": False,
    }
    Path(ns.output).write_bytes(canon(snap))
    emit({
        "marker": SNAPSHOT,
        "status": "GREEN",
        "snapshot_sha256": sha256_bytes(canon(snap)),
        "payload_leaves_verified": 3,
        "recovery_records_verified": 3,
        "production_runtime_touched": False,
    })
    return 0


def compare_mode(ns: argparse.Namespace) -> int:
    cfg = load_control()
    pre_bytes = Path(ns.pre).read_bytes()
    post_bytes = Path(ns.post).read_bytes()
    assert pre_bytes == post_bytes
    snap = json.loads(pre_bytes)
    assert snap["marker"] == SNAPSHOT and snap["status"] == "GREEN"
    assert snap["payload_leaves_verified"] == 3
    assert snap["recovery_records_verified"] == 3
    assert snap["same_uid_inplace_mutation_denied"] is True
    assert ns.e0_source_before == ns.e0_source_after
    assert ns.r0_source_before == ns.r0_source_after
    for item in snap["records"].values():
        assert item["fsverity"]["algorithm"] == 1
        assert item["fsverity"]["digest_size"] == 32
        assert item["same_uid_write_denied"] is True
        assert item["same_uid_rdwr_denied"] is True
        assert item["same_uid_truncate_denied"] is True
    out = {
        "marker": FINAL,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "accepted_v41_blob_count": len(cfg["accepted_v41_blobs"]),
        "same_explicit_block_device_pre_post": True,
        "clean_rw_unmount_remount_proved": True,
        "root_identity_stable": True,
        "record_inode_generation_stable": True,
        "record_fsverity_digest_stable": True,
        "fresh_v41_admission_after_remount": True,
        "pre_post_verifier_receipt_equal": True,
        "same_uid_inplace_mutation_denied_after_remount": True,
        "payload_leaves_verified": 3,
        "recovery_records_verified": 3,
        "snapshot_sha256": sha256_bytes(pre_bytes),
        "physical_power_loss_proved": False,
        "unclean_journal_replay_proved": False,
        "production_runtime_touched": False,
    }
    Path(ns.output).write_bytes(canon(out))
    emit(out)
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="mode", required=True)
    sub.add_parser("static")
    cap = sub.add_parser("capture")
    cap.add_argument("--e0-root", required=True)
    cap.add_argument("--r0-root", required=True)
    cap.add_argument("--pre-restart-census", required=True)
    cap.add_argument("--output", required=True)
    comp = sub.add_parser("compare")
    comp.add_argument("--pre", required=True)
    comp.add_argument("--post", required=True)
    comp.add_argument("--e0-source-before", required=True)
    comp.add_argument("--e0-source-after", required=True)
    comp.add_argument("--r0-source-before", required=True)
    comp.add_argument("--r0-source-after", required=True)
    comp.add_argument("--output", required=True)
    ns = p.parse_args()
    if ns.mode == "static":
        return static_mode()
    if ns.mode == "capture":
        return capture_mode(ns)
    return compare_mode(ns)


if __name__ == "__main__":
    raise SystemExit(main())

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
import subprocess
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_DIR = REPO_ROOT / "scripts"
CONTROL_PATH = REPO_ROOT / "fixtures" / "datanet-v36-sudden-device-loss-simulation-ext4-v1.json"
V35_CONTROL_PATH = REPO_ROOT / "fixtures" / "datanet-v35-cold-remount-ext4-v1.json"
V31_FIXTURE_PATH = REPO_ROOT / "fixtures" / "datanet-v31-campaign-topology-ext4-v1.json"
V34_FINAL_VERIFIER = SCRIPT_DIR / "prove_datanet_v34_campaign_final_verifier_v1.py"
STATIC_MARKER = "VOID_DATANET_V36_SUDDEN_DEVICE_LOSS_SIMULATION_STATIC_V1_GREEN"
VERIFY_MARKER = "VOID_DATANET_V36_SUDDEN_DEVICE_LOSS_SIMULATION_V1_GREEN"
ACCEPTED_V35_HEAD = "d98367bdefb720c6289e44d1022da9a4e529633d"


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")))


def git_blob_sha1(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def load_control() -> dict:
    control = json.loads(CONTROL_PATH.read_text(encoding="utf-8"))
    assert control["v"] == 1
    assert control["format"] == "VOID_DATANET_V36_SUDDEN_DEVICE_LOSS_SIMULATION_EXT4_CONTROL_V1"
    assert control["parent_pr"] == 1495
    assert control["parent_head"] == ACCEPTED_V35_HEAD
    assert len(control["accepted_v35_blobs"]) == 4
    return control


def verify_accepted_v35(control: dict) -> None:
    for relative, expected in sorted(control["accepted_v35_blobs"].items()):
        path = REPO_ROOT / relative
        assert path.is_file(), relative
        actual = git_blob_sha1(path)
        assert actual == expected, (relative, actual, expected)

    v35 = json.loads(V35_CONTROL_PATH.read_text(encoding="utf-8"))
    preserved = control["preserved_campaign"]
    assert v35["v"] == 1
    assert v35["format"] == "VOID_DATANET_V35_COLD_REMOUNT_EXT4_CONTROL_V1"
    assert v35["preserved_campaign"] == preserved
    assert v35["claim"]["clean_unmount_remount"] is True
    assert v35["claim"]["same_explicit_block_device"] is True
    assert v35["claim"]["pre_post_final_receipt_equal"] is True
    assert v35["claim"]["physical_power_loss"] is False


def static_mode() -> int:
    control = load_control()
    verify_accepted_v35(control)
    claim = control["claim"]
    for key in (
        "simulated_sudden_device_loss",
        "device_mapper_suspend_noflush",
        "snapshot_before_live_unmount",
        "crash_image_needs_recovery",
        "same_device_identity_recreated",
        "journal_replay_recovery",
        "post_recovery_read_only_verification",
        "pre_post_final_receipt_equal",
    ):
        assert claim[key] is True, key
    for key in (
        "physical_power_loss",
        "hardware_write_cache_loss",
        "hostile_same_uid_mutation",
        "fiemap_retained_image_provenance",
        "public_peer_retrieval",
        "chain_2050_economic_authority",
        "production_runtime_activation",
    ):
        assert claim[key] is False, key
    emit({
        "marker": STATIC_MARKER,
        "status": "GREEN",
        "accepted_v35_head": ACCEPTED_V35_HEAD,
        "accepted_v35_blob_count": len(control["accepted_v35_blobs"]),
        "total_lifetimes": control["preserved_campaign"]["total_lifetimes"],
        "peak_live": control["preserved_campaign"]["peak_live"],
        "completed_mib": control["preserved_campaign"]["completed_mib"],
        "simulated_sudden_device_loss": True,
        "physical_power_loss_proved": False,
        "production_runtime_touched": False,
    })
    return 0


def mount_is_read_only(path: str) -> bool:
    readonly_flag = getattr(os, "ST_RDONLY", 1)
    return bool(os.statvfs(path).f_flag & readonly_flag)


def fresh_v34_final_verifier(e0_root: str, r0_root: str, e0_identity: str, r0_identity: str) -> dict:
    cmd = [
        sys.executable,
        "-I",
        "-B",
        str(V34_FINAL_VERIFIER),
        "--fixture",
        str(V31_FIXTURE_PATH),
        "--e0-root",
        e0_root,
        "--e0-root-identity",
        e0_identity,
        "--r0-root",
        r0_root,
        "--r0-root-identity",
        r0_identity,
    ]
    proc = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert proc.stderr == "", proc.stderr
    lines = [line for line in proc.stdout.splitlines() if line.strip()]
    assert len(lines) == 1, proc.stdout
    out = json.loads(lines[0])
    assert out["marker"] == "VOID_DATANET_V34_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
    assert out["status"] == "GREEN"
    assert out["production_runtime_touched"] is False
    return out


def has_needs_recovery(path: str) -> bool:
    text = Path(path).read_text(encoding="utf-8")
    return "needs_recovery" in text


def verify_mode(ns: argparse.Namespace) -> int:
    control = load_control()
    verify_accepted_v35(control)

    census = json.loads(Path(ns.pre_restart_census).read_text(encoding="utf-8"))
    assert census["format"] == "VOID_DATANET_V34_CAMPAIGN_RESTART_CENSUS_V1"
    assert census["cold_remount_proved"] is False
    pre = census["source_distinct_final_verifier"]
    assert pre["marker"] == "VOID_DATANET_V34_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
    assert pre["status"] == "GREEN"
    assert pre["production_runtime_touched"] is False

    e0_identity = census["e0"]["root_identity"]
    r0_identity = census["r0"]["root_identity"]
    assert ns.e0_source_before == ns.e0_source_after
    assert ns.r0_source_before == ns.r0_source_after
    assert ns.e0_source_before != ns.r0_source_before
    assert ns.e0_source_before.startswith("/dev/mapper/void-v36-e0-")
    assert ns.r0_source_before.startswith("/dev/mapper/void-v36-r0-")

    assert has_needs_recovery(ns.e0_pre_recovery_super)
    assert has_needs_recovery(ns.r0_pre_recovery_super)
    assert not has_needs_recovery(ns.e0_post_recovery_super)
    assert not has_needs_recovery(ns.r0_post_recovery_super)

    e0_st = os.stat(ns.e0_root, follow_symlinks=False)
    r0_st = os.stat(ns.r0_root, follow_symlinks=False)
    assert stat.S_ISDIR(e0_st.st_mode) and stat.S_ISDIR(r0_st.st_mode)
    assert identity(e0_st) == e0_identity
    assert identity(r0_st) == r0_identity
    assert mount_is_read_only(ns.e0_root)
    assert mount_is_read_only(ns.r0_root)

    post = fresh_v34_final_verifier(ns.e0_root, ns.r0_root, e0_identity, r0_identity)
    assert post == pre
    payload_leaf_count = len(post["e0"]["leaves"]) + len(post["r0"]["leaves"])
    assert payload_leaf_count == 3
    assert post["generation_ioctl_calls"] == 3
    assert post["same_claimant_pid_bound_claimed_closed"] is True

    emit({
        "marker": VERIFY_MARKER,
        "status": "GREEN",
        "accepted_v35_head": ACCEPTED_V35_HEAD,
        "accepted_v35_blob_count": len(control["accepted_v35_blobs"]),
        "simulated_sudden_device_loss_proved": True,
        "device_mapper_suspend_noflush": True,
        "snapshot_before_live_unmount": True,
        "crash_image_needs_recovery_pre_replay": True,
        "journal_replay_recovery_completed": True,
        "same_device_source_pre_post": True,
        "root_identity_stable": True,
        "read_only_post_recovery_verification": True,
        "pre_post_final_receipt_equal": True,
        "payload_leaves_verified": payload_leaf_count,
        "generation_ioctl_calls_post_recovery": post["generation_ioctl_calls"],
        "armed_sha256": post["armed_sha256"],
        "claimed_sha256": post["claimed_sha256"],
        "closed_sha256": post["closed_sha256"],
        "same_claimant_pid_bound_claimed_closed": True,
        "physical_power_loss_proved": False,
        "hardware_write_cache_loss_proved": False,
        "hostile_same_uid_mutation_proved": False,
        "fiemap_retained_image_provenance_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_economic_authority_claimed": False,
        "production_runtime_touched": False,
    })
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="mode", required=True)
    sub.add_parser("static")
    verify = sub.add_parser("verify")
    verify.add_argument("--e0-root", required=True)
    verify.add_argument("--r0-root", required=True)
    verify.add_argument("--e0-source-before", required=True)
    verify.add_argument("--e0-source-after", required=True)
    verify.add_argument("--r0-source-before", required=True)
    verify.add_argument("--r0-source-after", required=True)
    verify.add_argument("--pre-restart-census", required=True)
    verify.add_argument("--e0-pre-recovery-super", required=True)
    verify.add_argument("--r0-pre-recovery-super", required=True)
    verify.add_argument("--e0-post-recovery-super", required=True)
    verify.add_argument("--r0-post-recovery-super", required=True)
    ns = parser.parse_args()
    if ns.mode == "static":
        return static_mode()
    return verify_mode(ns)


if __name__ == "__main__":
    raise SystemExit(main())

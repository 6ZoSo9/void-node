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
CONTROL_PATH = REPO_ROOT / "fixtures" / "datanet-v35-cold-remount-ext4-v1.json"
V34_CONTROL_PATH = REPO_ROOT / "fixtures" / "datanet-v34-durable-recovery-campaign-ext4-v1.json"
V31_FIXTURE_PATH = REPO_ROOT / "fixtures" / "datanet-v31-campaign-topology-ext4-v1.json"
V34_FINAL_VERIFIER = SCRIPT_DIR / "prove_datanet_v34_campaign_final_verifier_v1.py"
STATIC_MARKER = "VOID_DATANET_V35_COLD_REMOUNT_STATIC_V1_GREEN"
VERIFY_MARKER = "VOID_DATANET_V35_COLD_REMOUNT_V1_GREEN"
ACCEPTED_V34_HEAD = "996af0a48a06c77231c9fbf884f74829fc909c27"


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
    assert control["format"] == "VOID_DATANET_V35_COLD_REMOUNT_EXT4_CONTROL_V1"
    assert control["parent_pr"] == 1494
    assert control["parent_head"] == ACCEPTED_V34_HEAD
    assert len(control["accepted_v34_blobs"]) == 17
    return control


def verify_accepted_v34(control: dict) -> None:
    for relative, expected in sorted(control["accepted_v34_blobs"].items()):
        path = REPO_ROOT / relative
        assert path.is_file(), relative
        actual = git_blob_sha1(path)
        assert actual == expected, (relative, actual, expected)

    v34 = json.loads(V34_CONTROL_PATH.read_text(encoding="utf-8"))
    preserved = control["preserved_campaign"]
    assert v34["v"] == 1
    assert v34["format"] == "VOID_DATANET_V34_DURABLE_RECOVERY_CAMPAIGN_EXT4_CONTROL_V1"
    assert v34["durable_sequence"] == preserved["durable_sequence"] == ["ARMED", "CLAIMED", "S1", "CLOSED"]
    assert v34["process_topology"]["role_lifetimes"] == preserved["role_lifetimes"] == 21
    assert v34["process_topology"]["helper_lifetimes"] == preserved["helper_lifetimes"] == 6
    assert v34["process_topology"]["total_lifetimes"] == preserved["total_lifetimes"] == 27
    assert v34["process_topology"]["peak_live"] == preserved["peak_live"] == 9
    assert v34["payload_ledger"]["calls"] == preserved["calls"] == 15372
    assert v34["payload_ledger"]["completed_mib"] == preserved["completed_mib"] == 960


def static_mode() -> int:
    control = load_control()
    verify_accepted_v34(control)
    claim = control["claim"]
    assert claim["clean_unmount_remount"] is True
    assert claim["same_explicit_block_device"] is True
    assert claim["post_remount_read_only_verification"] is True
    assert claim["pre_post_final_receipt_equal"] is True
    for key in (
        "physical_power_loss",
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
        "accepted_v34_head": ACCEPTED_V34_HEAD,
        "accepted_v34_blob_count": len(control["accepted_v34_blobs"]),
        "total_lifetimes": 27,
        "peak_live": 9,
        "completed_mib": 960,
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


def verify_mode(ns: argparse.Namespace) -> int:
    control = load_control()
    verify_accepted_v34(control)

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
    assert ns.e0_source_before.startswith("/dev/loop")
    assert ns.r0_source_before.startswith("/dev/loop")
    assert os.path.realpath(ns.e0_source_before) == os.path.realpath(ns.e0_source_after)
    assert os.path.realpath(ns.r0_source_before) == os.path.realpath(ns.r0_source_after)

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
        "accepted_v34_head": ACCEPTED_V34_HEAD,
        "accepted_v34_blob_count": len(control["accepted_v34_blobs"]),
        "same_explicit_block_device_pre_post": True,
        "e0_block_device": ns.e0_source_after,
        "r0_block_device": ns.r0_source_after,
        "root_identity_stable": True,
        "e0_root_identity": e0_identity,
        "r0_root_identity": r0_identity,
        "read_only_remount": True,
        "pre_post_final_receipt_equal": True,
        "payload_leaves_verified": payload_leaf_count,
        "generation_ioctl_calls_post_remount": post["generation_ioctl_calls"],
        "armed_sha256": post["armed_sha256"],
        "claimed_sha256": post["claimed_sha256"],
        "closed_sha256": post["closed_sha256"],
        "same_claimant_pid_bound_claimed_closed": True,
        "cold_unmount_remount_proved": True,
        "physical_power_loss_proved": False,
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
    ns = parser.parse_args()
    if ns.mode == "static":
        return static_mode()
    return verify_mode(ns)


if __name__ == "__main__":
    raise SystemExit(main())

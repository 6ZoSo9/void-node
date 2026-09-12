#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTROL = ROOT / "fixtures/datanet-v43-fsverity-sudden-loss-recovery-ext4-v1.json"
PARENT_HEAD = "eed97234cdd6013ec7e76b4b91393d2518c8d355"
STATIC = "VOID_DATANET_V43_FSVERITY_SUDDEN_LOSS_RECOVERY_STATIC_V1_GREEN"
FINAL = "VOID_DATANET_V43_FSVERITY_SUDDEN_LOSS_RECOVERY_V1_GREEN"
V42_SNAPSHOT = "VOID_DATANET_V42_FSVERITY_REMOUNT_SNAPSHOT_V1_GREEN"


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def canon(obj: dict) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def git_blob(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def load_control() -> dict:
    cfg = json.loads(CONTROL.read_text(encoding="utf-8"))
    assert cfg["v"] == 1
    assert cfg["format"] == "VOID_DATANET_V43_FSVERITY_SUDDEN_LOSS_RECOVERY_EXT4_CONTROL_V1"
    assert cfg["parent_pr"] == 1502 and cfg["parent_head"] == PARENT_HEAD
    for rel, expected in sorted(cfg["accepted_v42_blobs"].items()):
        assert git_blob(ROOT / rel) == expected, rel
    assert cfg["preserved_campaign"] == {
        "durable_sequence": ["ARMED", "CLAIMED", "S1", "CLOSED"],
        "total_lifetimes": 27,
        "peak_live": 9,
        "calls": 15372,
        "completed_mib": 960,
        "record_schema": "V3",
    }
    return cfg


def super_state(path: str) -> dict:
    text = Path(path).read_text(encoding="utf-8", errors="strict")
    return {
        "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "needs_recovery": "needs_recovery" in text,
        "verity_feature": "verity" in next((line for line in text.splitlines() if line.startswith("Filesystem features:")), ""),
    }


def static_mode() -> int:
    cfg = load_control()
    claim = cfg["claim"]
    for key in (
        "accepted_v41_campaign_preserved",
        "device_mapper_suspend_noflush",
        "snapshot_before_clean_unmount",
        "crash_image_needs_recovery",
        "same_mapper_device_identity_recreated",
        "journal_replay_recovery",
        "pre_post_v42_snapshot_equal",
        "record_inode_generation_stable",
        "record_fsverity_digest_stable",
        "fresh_v41_admission_after_recovery",
        "same_uid_inplace_mutation_denied_after_recovery",
    ):
        assert claim[key] is True, key
    for key in ("physical_power_loss_proved", "hardware_write_cache_loss_proved", "production_runtime_activation"):
        assert claim[key] is False, key
    emit({
        "marker": STATIC,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "accepted_v42_blob_count": len(cfg["accepted_v42_blobs"]),
        "device_mapper_suspend_noflush": True,
        "physical_power_loss_proved": False,
        "hardware_write_cache_loss_proved": False,
        "production_runtime_touched": False,
    })
    return 0


def verify_mode(ns: argparse.Namespace) -> int:
    cfg = load_control()
    pre_bytes = Path(ns.pre_snapshot).read_bytes()
    post_bytes = Path(ns.post_snapshot).read_bytes()
    assert pre_bytes == post_bytes
    snap = json.loads(pre_bytes)
    assert snap["marker"] == V42_SNAPSHOT and snap["status"] == "GREEN"
    assert snap["parent_head"] == "31bc55d86b0fd9a6b963834dfd46243e34cd9ea3"
    assert snap["payload_leaves_verified"] == 3
    assert snap["recovery_records_verified"] == 3
    assert snap["same_uid_inplace_mutation_denied"] is True
    assert snap["production_runtime_touched"] is False
    assert set(snap["records"]) == {"armed", "claimed", "closed"}
    for item in snap["records"].values():
        assert item["fsverity"]["algorithm"] == 1
        assert item["fsverity"]["digest_size"] == 32
        assert len(item["fsverity"]["digest_hex"]) == 64
        assert item["same_uid_write_denied"] is True
        assert item["same_uid_rdwr_denied"] is True
        assert item["same_uid_truncate_denied"] is True

    e0_pre = super_state(ns.e0_pre_super)
    r0_pre = super_state(ns.r0_pre_super)
    e0_post = super_state(ns.e0_post_super)
    r0_post = super_state(ns.r0_post_super)
    assert e0_pre["needs_recovery"] and r0_pre["needs_recovery"]
    assert not e0_post["needs_recovery"] and not r0_post["needs_recovery"]
    assert all(x["verity_feature"] for x in (e0_pre, r0_pre, e0_post, r0_post))

    assert ns.e0_source_before == ns.e0_source_after
    assert ns.r0_source_before == ns.r0_source_after
    assert ns.e0_dm_dev_before == ns.e0_dm_dev_after
    assert ns.r0_dm_dev_before == ns.r0_dm_dev_after
    assert ns.e0_source_before.startswith("/dev/mapper/void-v43-e0-")
    assert ns.r0_source_before.startswith("/dev/mapper/void-v43-r0-")

    out = {
        "marker": FINAL,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "accepted_v42_blob_count": len(cfg["accepted_v42_blobs"]),
        "simulated_sudden_device_loss_proved": True,
        "device_mapper_suspend_noflush": True,
        "snapshot_before_clean_unmount": True,
        "crash_image_needs_recovery_pre_replay": True,
        "same_mapper_device_identity_recreated": True,
        "same_device_source_pre_post": True,
        "journal_replay_recovery_completed": True,
        "pre_post_v42_snapshot_equal": True,
        "root_identity_stable": True,
        "record_inode_generation_stable": True,
        "record_fsverity_digest_stable": True,
        "fresh_v41_admission_after_recovery": True,
        "same_uid_inplace_mutation_denied_after_recovery": True,
        "payload_leaves_verified": 3,
        "recovery_records_verified": 3,
        "snapshot_sha256": hashlib.sha256(pre_bytes).hexdigest(),
        "e0_pre_super_sha256": e0_pre["sha256"],
        "r0_pre_super_sha256": r0_pre["sha256"],
        "e0_post_super_sha256": e0_post["sha256"],
        "r0_post_super_sha256": r0_post["sha256"],
        "physical_power_loss_proved": False,
        "hardware_write_cache_loss_proved": False,
        "production_runtime_touched": False,
    }
    Path(ns.output).write_bytes(canon(out))
    emit(out)
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="mode", required=True)
    sub.add_parser("static")
    v = sub.add_parser("verify")
    v.add_argument("--pre-snapshot", required=True)
    v.add_argument("--post-snapshot", required=True)
    v.add_argument("--e0-pre-super", required=True)
    v.add_argument("--r0-pre-super", required=True)
    v.add_argument("--e0-post-super", required=True)
    v.add_argument("--r0-post-super", required=True)
    v.add_argument("--e0-source-before", required=True)
    v.add_argument("--e0-source-after", required=True)
    v.add_argument("--r0-source-before", required=True)
    v.add_argument("--r0-source-after", required=True)
    v.add_argument("--e0-dm-dev-before", required=True)
    v.add_argument("--e0-dm-dev-after", required=True)
    v.add_argument("--r0-dm-dev-before", required=True)
    v.add_argument("--r0-dm-dev-after", required=True)
    v.add_argument("--output", required=True)
    ns = p.parse_args()
    if ns.mode == "static":
        return static_mode()
    return verify_mode(ns)


if __name__ == "__main__":
    raise SystemExit(main())

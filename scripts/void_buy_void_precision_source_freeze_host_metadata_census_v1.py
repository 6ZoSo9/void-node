#!/usr/bin/env python3
"""Non-root, no-network host metadata census. Never a release or install tool."""
from __future__ import annotations

import json
import os
from pathlib import Path
import platform
import re
import stat
import subprocess
import sys

MARKER = "VOID_BUY_VOID_PRECISION_SOURCE_FREEZE_HOST_METADATA_CENSUS_V1"
FROZEN_PR_HEAD = "bfdff02472c57439721ebed0a94498c691c68a9c"
FROZEN_SOURCE_COMMIT = "5e514e4b6e2151c18cf7459bd7a697287eebbd4c"
FROZEN_SOURCE_TREE = "47a0c6eb9408b97226472d1297115633b0b3d799"
FROZEN_MANIFEST_PATH = "ops/security/buy-void-presale-source-freeze-candidate-v1.json"
FROZEN_MANIFEST_BLOB = "91d2d7877bc3066e3030337576ca2dddeb55bfc8"
V5_LOCK_PATH = "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v5.json"
V5_LOCK_BLOB = "61a9d85d285f9c9d249adf401580822c44c6dac6"
REPOSITORY_ROOT = Path.home() / "dev" / "void-node"
PRECISION_HOSTNAME = "zoso-Precision-Tower-7810"
READ_ONLY_PATHS = {
    "source_finality_deployment_receipt":
        "/var/lib/void-source-finality-v7/deployment-receipt.json",
    "allocation_custody_mount":
        "/var/lib/void-allocation-custody-v1",
    "epoch2_live_composition_root":
        "/opt/void-buy-void-epoch2-live-composition-v3",
}
ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_NO_REPLACE_OBJECTS": "1",
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
}

def classify_mode(mode: int, size: int) -> dict[str, object]:
    """Pure mode classifier; no path resolution or file-content reads."""
    if stat.S_ISLNK(mode):
        return {"state": "SYMLINK_HOLD", "mode": None, "bytes": None}
    if stat.S_ISREG(mode):
        return {
            "state": "REGULAR_METADATA_ONLY",
            "mode": format(stat.S_IMODE(mode), "04o"),
            "bytes": size,
        }
    if stat.S_ISDIR(mode):
        return {
            "state": "DIRECTORY_METADATA_ONLY",
            "mode": format(stat.S_IMODE(mode), "04o"),
            "bytes": None,
        }
    return {"state": "SPECIAL_FILE_HOLD", "mode": None, "bytes": None}

def metadata_only(fixed_path: str) -> dict[str, object]:
    """lstat only. Refuses content reads, links and recursive traversal."""
    try:
        info = os.lstat(fixed_path)
    except FileNotFoundError:
        return {"state": "ABSENT", "mode": None, "bytes": None}
    except PermissionError:
        return {"state": "METADATA_PERMISSION_HOLD", "mode": None, "bytes": None}
    except OSError:
        return {"state": "METADATA_UNAVAILABLE_HOLD", "mode": None, "bytes": None}
    return classify_mode(info.st_mode, info.st_size)

def local_git(*args: str) -> tuple[bool, str | None]:
    """Only stateless local identity reads. No refs fetched, no status/index writes."""
    command = [
        "/usr/bin/git", "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false",
        "-C", str(REPOSITORY_ROOT), *args,
    ]
    try:
        proc = subprocess.run(
            command, env=ENV, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            timeout=10, check=False,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        return False, None
    if proc.returncode:
        return False, None
    try:
        value = proc.stdout.decode("utf-8", "strict").strip()
    except UnicodeError:
        return False, None
    return True, value

def source_metadata() -> dict[str, object]:
    repo = metadata_only(str(REPOSITORY_ROOT))
    if repo["state"] != "DIRECTORY_METADATA_ONLY":
        return {
            "repository_directory_state": repo["state"],
            "head_sha": None,
            "frozen_pr_commit_locally_present": False,
            "frozen_source_commit_locally_present": False,
            "frozen_source_tree_locally_present": False,
            "checked_out_head_matches_frozen_pr": False,
            "tracked_freeze_manifest_matches": False,
            "tracked_v5_lock_matches": False,
        }
    ok_head, raw_head = local_git("rev-parse", "--verify", "HEAD")
    head = raw_head if ok_head and re.fullmatch(r"[a-f0-9]{40}", raw_head or "") else None

    def has_commit(value: str) -> bool:
        found, resolved = local_git("rev-parse", "--verify", value + "^{commit}")
        return found and resolved == value

    found_tree, actual_tree = local_git(
        "rev-parse", "--verify", FROZEN_SOURCE_COMMIT + "^{tree}"
    )

    def head_blob_matches(relative: str, expected_blob: str) -> bool:
        found, actual = local_git("rev-parse", "--verify", "HEAD:" + relative)
        return found and actual == expected_blob

    return {
        "repository_directory_state": repo["state"],
        "head_sha": head,
        "frozen_pr_commit_locally_present": has_commit(FROZEN_PR_HEAD),
        "frozen_source_commit_locally_present": has_commit(FROZEN_SOURCE_COMMIT),
        "frozen_source_tree_locally_present":
            found_tree and actual_tree == FROZEN_SOURCE_TREE,
        "checked_out_head_matches_frozen_pr": head == FROZEN_PR_HEAD,
        "tracked_freeze_manifest_matches":
            head_blob_matches(FROZEN_MANIFEST_PATH, FROZEN_MANIFEST_BLOB),
        "tracked_v5_lock_matches":
            head_blob_matches(V5_LOCK_PATH, V5_LOCK_BLOB),
    }

def self_test() -> None:
    assert classify_mode(stat.S_IFLNK | 0o777, 3)["state"] == "SYMLINK_HOLD"
    assert classify_mode(stat.S_IFREG | 0o600, 51) == {
        "state": "REGULAR_METADATA_ONLY", "mode": "0600", "bytes": 51,
    }
    assert classify_mode(stat.S_IFDIR | 0o700, 512) == {
        "state": "DIRECTORY_METADATA_ONLY", "mode": "0700", "bytes": None,
    }
    assert classify_mode(stat.S_IFIFO | 0o600, 0)["state"] == "SPECIAL_FILE_HOLD"
    assert FROZEN_PR_HEAD != FROZEN_SOURCE_COMMIT
    assert all(re.fullmatch(r"[0-9a-f]{40}", value) for value in (
        FROZEN_PR_HEAD, FROZEN_SOURCE_COMMIT, FROZEN_SOURCE_TREE,
        FROZEN_MANIFEST_BLOB, V5_LOCK_BLOB,
    ))
    assert len(set(READ_ONLY_PATHS.values())) == len(READ_ONLY_PATHS)
    print(MARKER + "_SELF_TEST_GREEN")
    print("metadata_only=true")
    print("root_required=false")
    print("network_contact=false")
    print("credential_content_access=false")
    print("wallet_or_signer_access=false")
    print("service_mutation=false")
    print("receipt_content_read=false")
    print("customer_payment_acceptance=false")
    print("presale_activation=false")
    print("wc_void_activation=false")
    print("funds_movement=false")

def run() -> None:
    if os.geteuid() == 0:
        raise AssertionError("root_execution_not_required_or_allowed")
    path_report = {key: metadata_only(value)
                   for key, value in sorted(READ_ONLY_PATHS.items())}
    custody = READ_ONLY_PATHS["allocation_custody_mount"]
    path_report["allocation_custody_mount"]["is_mountpoint_metadata_only"] = (
        os.path.ismount(custody)
        if path_report["allocation_custody_mount"]["state"] ==
           "DIRECTORY_METADATA_ONLY" else False
    )
    report = {
        "marker": MARKER,
        "schema": "void_buy_void_precision_source_freeze_host_metadata_census_v1",
        "read_only": True,
        "sudo_required": False,
        "network_contact": False,
        "secret_or_receipt_content_access": False,
        "credential_or_wallet_access": False,
        "signing_or_transaction": False,
        "service_or_filesystem_mutation": False,
        "hostname_matches_designated_precision": platform.node() == PRECISION_HOSTNAME,
        "source": source_metadata(),
        "fixed_path_metadata": path_report,
        "source_freeze_approval_claimed": False,
        "installed_receipt_authenticity_verified": False,
        "live_process_generation_verified": False,
        "btc_payment_acceptance_verified": False,
        "one_payment_one_fulfillment_verified": False,
        "wc_void_launch_coupling_verified": False,
        "customer_payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_activation_authorized": False,
        "funds_movement": False,
        "status": "HOST_RELEASE_EVIDENCE_HOLD",
    }
    print(json.dumps(report, indent=2, sort_keys=True))

def main() -> None:
    if sys.argv[1:] == ["--self-test"]:
        self_test()
    elif sys.argv[1:] == ["--run"]:
        run()
    else:
        raise SystemExit("usage: census.py --self-test | --run")

if __name__ == "__main__":
    main()

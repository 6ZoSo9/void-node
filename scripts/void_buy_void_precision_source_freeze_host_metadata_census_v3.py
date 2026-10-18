#!/usr/bin/env python3
"""Non-root/no-network Precision metadata census for accepted source freeze V2."""
from __future__ import annotations

import json
import os
from pathlib import Path
import platform
import re
import stat
import subprocess
import sys

MARKER = "VOID_BUY_VOID_PRECISION_SOURCE_FREEZE_HOST_METADATA_CENSUS_V3"

FREEZE_REVIEW_HEAD = "d3e7404791622541a4567ddd506f27caba60cfea"
FREEZE_SOURCE_COMMIT = "05614762b1b4638e05e539fd7d20cbf670e1570b"
FREEZE_SOURCE_TREE = "4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e"
FREEZE_MANIFEST_PATH = "ops/security/buy-void-presale-source-freeze-candidate-v2.json"
FREEZE_MANIFEST_BLOB = "ca9c42e2d3ab4c50ac54badadb9efde6180ad241"
FREEZE_ID = (
    "voidbuypresalefreeze2_"
    "32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1"
)

SUCCESSOR_REVIEW_HEAD = "caa7daa8ed32143b6884f938d576f795b828684f"
SUCCESSOR_PATH = "ops/security/buy-void-presale-current-source-enforcement-successor-v1.json"
SUCCESSOR_BLOB = "774db38ccb771f393b44d589a455144b99d36f6b"
SUCCESSOR_ID = (
    "voidbuypresaleenfsucc1_"
    "819fd2dbce9928145023d4077cffc34e2a9ab3a50e51428fc37dda6ca70a18ef"
)

ACCEPTANCE_REVIEW_HEAD = "b55efaff7355234ccc51f5c3a216e6befeefa1d5"
ACCEPTANCE_PATH = "ops/security/buy-void-presale-source-freeze-acceptance-v2.json"
ACCEPTANCE_BLOB = "5d437a37703a83908a7fa78b78da92151aa1aa99"
ACCEPTANCE_ID = (
    "voidbuypresalefreezeaccept2_"
    "88fa89a3fd3ea8151f69c5f133eca2965cf98576a245d7afbb7f6992f68fa1c4"
)

ENFORCEMENT_LOCK_PATH = "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json"
ENFORCEMENT_LOCK_BLOB = "589845615654da8b688764377b34296267ac0063"

BOOTSTRAP_LOCK_PATH = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
)
BOOTSTRAP_LOCK_BLOB = "f2ce1364dd776bfbf1aa1ef59ce999cb46037b73"

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
    "GIT_NO_LAZY_FETCH": "1",
    "GIT_ALLOW_PROTOCOL": "",
}


def classify_mode(mode: int, size: int) -> dict[str, object]:
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
    """lstat only: no content reads, traversal or symlink following."""
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
    command = [
        "/usr/bin/git",
        "--no-replace-objects",
        "-c", "core.hooksPath=/dev/null",
        "-c", "core.attributesFile=/dev/null",
        "-c", "core.fsmonitor=false",
        "-c", "core.untrackedCache=false",
        "-c", "core.preloadIndex=false",
        "-c", "submodule.recurse=false",
        "-C", str(REPOSITORY_ROOT),
        *args,
    ]
    try:
        proc = subprocess.run(
            command,
            env=ENV,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=10,
            check=False,
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
    empty = {
        "repository_directory_state": repo["state"],
        "head_sha": None,
        "freeze_review_head_locally_present": False,
        "freeze_source_commit_locally_present": False,
        "freeze_source_tree_locally_present": False,
        "successor_review_head_locally_present": False,
        "acceptance_review_head_locally_present": False,
        "tracked_freeze_manifest_matches": False,
        "tracked_enforcement_successor_matches": False,
        "tracked_freeze_acceptance_matches": False,
        "tracked_historical_enforcement_lock_matches": False,
        "tracked_repaired_epoch2_bootstrap_lock_matches": False,
    }
    if repo["state"] != "DIRECTORY_METADATA_ONLY":
        return empty

    ok_head, raw_head = local_git("rev-parse", "--verify", "HEAD")
    head = raw_head if ok_head and re.fullmatch(r"[a-f0-9]{40}", raw_head or "") else None

    def has_commit(value: str) -> bool:
        found, resolved = local_git("rev-parse", "--verify", value + "^{commit}")
        return found and resolved == value

    found_tree, actual_tree = local_git(
        "rev-parse", "--verify", FREEZE_SOURCE_COMMIT + "^{tree}"
    )

    def head_blob_matches(relative: str, expected_blob: str) -> bool:
        found, actual = local_git("rev-parse", "--verify", "HEAD:" + relative)
        return found and actual == expected_blob

    return {
        "repository_directory_state": repo["state"],
        "head_sha": head,
        "freeze_review_head_locally_present": has_commit(FREEZE_REVIEW_HEAD),
        "freeze_source_commit_locally_present": has_commit(FREEZE_SOURCE_COMMIT),
        "freeze_source_tree_locally_present":
            found_tree and actual_tree == FREEZE_SOURCE_TREE,
        "successor_review_head_locally_present": has_commit(SUCCESSOR_REVIEW_HEAD),
        "acceptance_review_head_locally_present": has_commit(ACCEPTANCE_REVIEW_HEAD),
        "tracked_freeze_manifest_matches":
            head_blob_matches(FREEZE_MANIFEST_PATH, FREEZE_MANIFEST_BLOB),
        "tracked_enforcement_successor_matches":
            head_blob_matches(SUCCESSOR_PATH, SUCCESSOR_BLOB),
        "tracked_freeze_acceptance_matches":
            head_blob_matches(ACCEPTANCE_PATH, ACCEPTANCE_BLOB),
        "tracked_historical_enforcement_lock_matches":
            head_blob_matches(ENFORCEMENT_LOCK_PATH, ENFORCEMENT_LOCK_BLOB),
        "tracked_repaired_epoch2_bootstrap_lock_matches":
            head_blob_matches(BOOTSTRAP_LOCK_PATH, BOOTSTRAP_LOCK_BLOB),
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
    assert all(
        re.fullmatch(r"[0-9a-f]{40}", value)
        for value in (
            FREEZE_REVIEW_HEAD,
            FREEZE_SOURCE_COMMIT,
            FREEZE_SOURCE_TREE,
            SUCCESSOR_REVIEW_HEAD,
            ACCEPTANCE_REVIEW_HEAD,
            FREEZE_MANIFEST_BLOB,
            SUCCESSOR_BLOB,
            ACCEPTANCE_BLOB,
            ENFORCEMENT_LOCK_BLOB,
            BOOTSTRAP_LOCK_BLOB,
        )
    )
    assert FREEZE_REVIEW_HEAD != FREEZE_SOURCE_COMMIT
    assert len(set(READ_ONLY_PATHS.values())) == len(READ_ONLY_PATHS)
    assert ENV["GIT_NO_LAZY_FETCH"] == "1"
    assert ENV["GIT_ALLOW_PROTOCOL"] == ""
    assert ENV["GIT_OPTIONAL_LOCKS"] == "0"
    print(MARKER + "_SELF_TEST_GREEN")
    print("metadata_only=true")
    print("root_required=false")
    print("network_contact=false")
    print("git_lazy_fetch=false")
    print("git_transport_allowed=false")
    print("credential_content_access=false")
    print("wallet_or_signer_access=false")
    print("service_mutation=false")
    print("receipt_content_read=false")
    print("source_freeze_acceptance_manifest_bound=true")
    print("host_install_qualified=false")
    print("customer_payment_acceptance=false")
    print("presale_activation=false")
    print("wc_void_activation=false")
    print("funds_movement=false")


def run() -> None:
    if os.geteuid() == 0:
        raise AssertionError("root_execution_not_required_or_allowed")

    path_report = {
        key: metadata_only(value)
        for key, value in sorted(READ_ONLY_PATHS.items())
    }
    custody = READ_ONLY_PATHS["allocation_custody_mount"]
    path_report["allocation_custody_mount"]["is_mountpoint_metadata_only"] = (
        os.path.ismount(custody)
        if path_report["allocation_custody_mount"]["state"]
        == "DIRECTORY_METADATA_ONLY"
        else False
    )

    report = {
        "marker": MARKER,
        "schema": "void_buy_void_precision_source_freeze_host_metadata_census_v3",
        "read_only": True,
        "sudo_required": False,
        "network_contact": False,
        "git_lazy_fetch": False,
        "git_transport_allowed": False,
        "secret_or_receipt_content_access": False,
        "credential_or_wallet_access": False,
        "signing_or_transaction": False,
        "service_or_filesystem_mutation": False,
        "hostname_matches_designated_precision":
            platform.node() == PRECISION_HOSTNAME,
        "source": source_metadata(),
        "fixed_path_metadata": path_report,
        "expected_freeze_id": FREEZE_ID,
        "expected_successor_id": SUCCESSOR_ID,
        "expected_acceptance_id": ACCEPTANCE_ID,
        "source_freeze_acceptance_authority_claimed": False,
        "installed_receipt_authenticity_verified": False,
        "host_install_qualified": False,
        "live_process_generation_verified": False,
        "payment_rail_policy_accepted": False,
        "customer_payment_acceptance_authorized": False,
        "one_payment_one_fulfillment_verified": False,
        "wc_void_launch_coupling_verified": False,
        "public_presale_activation_authorized": False,
        "wc_void_activation_authorized": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "status": "HOST_RELEASE_EVIDENCE_HOLD",
        "next_gate":
            "RETURN_JSON_FOR_VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_"
            "HOST_INSTALL_QUALIFICATION_V2",
    }
    print(json.dumps(report, indent=2, sort_keys=True))


def main() -> None:
    if sys.argv[1:] == ["--self-test"]:
        self_test()
    elif sys.argv[1:] == ["--run"]:
        run()
    else:
        raise SystemExit("usage: census_v3.py --self-test | --run")


if __name__ == "__main__":
    main()

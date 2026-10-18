#!/usr/bin/env python3
"""Read-only tree delta census between frozen presale source V1 and a fixed main generation."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
from typing import Any

ROOT = Path(__file__).resolve().parents[1]

MARKER = "VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_DELTA_CENSUS_V1"
SCHEMA = "void_buy_void_presale_source_freeze_delta_census_v1"

FREEZE_PR_HEAD = "bfdff02472c57439721ebed0a94498c691c68a9c"
FREEZE_SNAPSHOT = "5e514e4b6e2151c18cf7459bd7a697287eebbd4c"
FREEZE_TREE = "47a0c6eb9408b97226472d1297115633b0b3d799"
FREEZE_MANIFEST_REL = "ops/security/buy-void-presale-source-freeze-candidate-v1.json"
FREEZE_MANIFEST_BLOB = "91d2d7877bc3066e3030337576ca2dddeb55bfc8"
FREEZE_PROOF_REL = "scripts/prove_buy_void_presale_source_freeze_candidate_v1.py"
FREEZE_PROOF_BLOB = "31fe4e06b390f19a0cbccc065a69f5f7afd410e0"

BASE_MAIN = "879cef181d8da2866d84eb56f5aa08c8564f8146"
BASE_MAIN_TREE = "52a311c69c9c7d274dbc3d909bc1eea2cbe38be4"

EXPECTED_TOTAL = 188
EXPECTED_STATUS = {"added": 120, "modified": 28, "deleted": 40}
EXPECTED_INVENTORY_SHA256 = (
    "2aa2a1c6e9a36ffe80af19e28410b56f0c1c0b97fb3dd648bbb0a3a0f2f70fec"
)
EXPECTED_BOOTSTRAP_COUNT = 43
EXPECTED_BOOTSTRAP_SHA256 = (
    "cc503b7ff67a26f4abcfc62e37664365e4d761facfb04a031ad986aef4d9ec8b"
)
EXPECTED_APOLLYON_COUNT = 82
EXPECTED_APOLLYON_SHA256 = (
    "eb90b33fcd4973563bb758649387e74dd9163a2de33d68cf6bc1e5a0351a6a34"
)
EXPECTED_RELEASE_COUNT = 63
EXPECTED_RELEASE_SHA256 = (
    "e2f16b7f22e475075566d4dbf910489c403a5b651481d3a4eb2b802f4030bc99"
)

BOOTSTRAP_RE = re.compile(
    r"epoch2[-_].*protected[-_]install[-_]bootstrap",
    re.IGNORECASE,
)
APOLLYON_RE = re.compile(r"(?:apollyon|xiphos)", re.IGNORECASE)

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


class CensusError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def git_bytes(*args: str, timeout: int = 30) -> bytes:
    cp = subprocess.run(
        [
            "/usr/bin/git",
            "--no-replace-objects",
            "-c",
            "core.hooksPath=/dev/null",
            "-c",
            "core.fsmonitor=false",
            "-C",
            str(ROOT),
            *args,
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=timeout,
        env=ENV,
    )
    if cp.returncode != 0:
        raise CensusError(
            "git_refusal:"
            + ":".join(args[:4])
            + ":"
            + cp.stderr.decode("utf-8", "replace")[-500:]
        )
    if cp.stderr:
        raise CensusError("git_stderr:" + ":".join(args[:4]))
    return cp.stdout


def git(*args: str, timeout: int = 30) -> str:
    return git_bytes(*args, timeout=timeout).decode("utf-8", "strict").strip()


def require_object(ref: str) -> None:
    git("cat-file", "-e", ref + "^{commit}")


def object_blob(ref: str, relative: str, expected_blob: str) -> bytes:
    blob = git("rev-parse", ref + ":" + relative)
    if blob != expected_blob:
        raise CensusError("object_blob_mismatch:" + relative)
    raw = git_bytes("show", ref + ":" + relative)
    if git_blob(raw) != expected_blob:
        raise CensusError("object_bytes_blob_mismatch:" + relative)
    return raw


def tree_inventory(ref: str) -> dict[str, dict[str, str]]:
    raw = git_bytes("ls-tree", "-r", "-z", "--full-tree", ref)
    result: dict[str, dict[str, str]] = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        try:
            header, raw_path = record.split(b"\t", 1)
            mode, kind, blob = header.decode("ascii").split(" ", 2)
            relative = raw_path.decode("utf-8", "strict")
        except (ValueError, UnicodeDecodeError) as exc:
            raise CensusError("tree_record_invalid") from exc
        if kind != "blob":
            continue
        if mode not in ("100644", "100755"):
            raise CensusError("tree_mode_invalid:" + relative)
        if (
            not relative
            or relative.startswith("/")
            or any(part in ("", ".", "..") for part in relative.split("/"))
        ):
            raise CensusError("tree_path_invalid:" + relative)
        if relative in result:
            raise CensusError("tree_path_duplicate:" + relative)
        result[relative] = {"sha": blob, "mode": mode}
    return result


def delta_rows(
    before: dict[str, dict[str, str]],
    after: dict[str, dict[str, str]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for relative in sorted(set(before) | set(after)):
        left = before.get(relative)
        right = after.get(relative)
        if left == right:
            continue
        rows.append(
            {
                "path": relative,
                "status": (
                    "added"
                    if left is None
                    else "deleted"
                    if right is None
                    else "modified"
                ),
                "before_blob": None if left is None else left["sha"],
                "before_mode": None if left is None else left["mode"],
                "after_blob": None if right is None else right["sha"],
                "after_mode": None if right is None else right["mode"],
            }
        )
    return rows


def classify(
    rows: list[dict[str, Any]],
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    bootstrap: list[dict[str, Any]] = []
    apollyon: list[dict[str, Any]] = []
    release: list[dict[str, Any]] = []
    for row in rows:
        relative = row["path"]
        if BOOTSTRAP_RE.search(relative):
            bootstrap.append(row)
        elif APOLLYON_RE.search(relative):
            apollyon.append(row)
        else:
            release.append(row)
    return bootstrap, apollyon, release


def validate_freeze_manifest() -> dict[str, Any]:
    raw = object_blob(FREEZE_PR_HEAD, FREEZE_MANIFEST_REL, FREEZE_MANIFEST_BLOB)
    object_blob(FREEZE_PR_HEAD, FREEZE_PROOF_REL, FREEZE_PROOF_BLOB)
    try:
        manifest = json.loads(raw.decode("utf-8", "strict"))
    except json.JSONDecodeError as exc:
        raise CensusError("freeze_manifest_json_invalid") from exc

    if (
        manifest.get("marker") != "VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_CANDIDATE_V1"
        or manifest.get("version") != 1
        or manifest.get("repository") != "6ZoSo9/void-node"
    ):
        raise CensusError("freeze_manifest_identity_invalid")

    snap = manifest.get("source_snapshot")
    if not isinstance(snap, dict):
        raise CensusError("freeze_snapshot_missing")
    required = {
        "composed_commit": FREEZE_SNAPSHOT,
        "composed_tree": FREEZE_TREE,
        "exact_source_snapshot_fixed": True,
        "auto_adopt_new_main_commits": False,
        "later_main_changes_require_separate_review": True,
    }
    for key, value in required.items():
        if snap.get(key) != value:
            raise CensusError("freeze_snapshot_field_invalid:" + key)

    gates = manifest.get("release_gate")
    if not isinstance(gates, dict):
        raise CensusError("freeze_release_gate_missing")
    for key in (
        "host_install_qualified",
        "live_runtime_evidence_qualified",
        "customer_payment_acceptance_authorized",
        "source_finality_runtime_authority_ready",
        "public_presale_activation",
        "wc_void_activation",
        "wallet_or_signing_authority",
        "transaction_submission_authorized",
        "treasury_or_liquidity_action_authorized",
        "funds_movement",
    ):
        if gates.get(key) is not False:
            raise CensusError("freeze_authority_overclaim:" + key)
    return manifest


def derive() -> dict[str, Any]:
    require_object(FREEZE_SNAPSHOT)
    require_object(FREEZE_PR_HEAD)
    require_object(BASE_MAIN)

    if git("rev-parse", FREEZE_SNAPSHOT + "^{tree}") != FREEZE_TREE:
        raise CensusError("freeze_tree_mismatch")
    if git("rev-parse", BASE_MAIN + "^{tree}") != BASE_MAIN_TREE:
        raise CensusError("base_main_tree_mismatch")

    validate_freeze_manifest()

    before = tree_inventory(FREEZE_SNAPSHOT)
    after = tree_inventory(BASE_MAIN)
    rows = delta_rows(before, after)
    bootstrap, apollyon, release = classify(rows)

    status: dict[str, int] = {}
    for row in rows:
        status[row["status"]] = status.get(row["status"], 0) + 1

    if len(rows) != EXPECTED_TOTAL:
        raise CensusError("delta_total_mismatch")
    if status != EXPECTED_STATUS:
        raise CensusError("delta_status_mismatch")
    if sha256(canonical(rows)) != EXPECTED_INVENTORY_SHA256:
        raise CensusError("delta_inventory_digest_mismatch")
    if (
        len(bootstrap) != EXPECTED_BOOTSTRAP_COUNT
        or sha256(canonical(bootstrap)) != EXPECTED_BOOTSTRAP_SHA256
    ):
        raise CensusError("bootstrap_delta_identity_mismatch")
    if (
        len(apollyon) != EXPECTED_APOLLYON_COUNT
        or sha256(canonical(apollyon)) != EXPECTED_APOLLYON_SHA256
    ):
        raise CensusError("apollyon_delta_identity_mismatch")
    if (
        len(release) != EXPECTED_RELEASE_COUNT
        or sha256(canonical(release)) != EXPECTED_RELEASE_SHA256
    ):
        raise CensusError("release_delta_identity_mismatch")

    body = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "freeze_pr_head": FREEZE_PR_HEAD,
        "freeze_snapshot": FREEZE_SNAPSHOT,
        "freeze_tree": FREEZE_TREE,
        "base_main": BASE_MAIN,
        "base_main_tree": BASE_MAIN_TREE,
        "delta_path_count": len(rows),
        "delta_status_counts": status,
        "delta_inventory_sha256": EXPECTED_INVENTORY_SHA256,
        "bootstrap_lifecycle_path_count": len(bootstrap),
        "bootstrap_lifecycle_inventory_sha256": EXPECTED_BOOTSTRAP_SHA256,
        "apollyon_xiphos_path_count": len(apollyon),
        "apollyon_xiphos_inventory_sha256": EXPECTED_APOLLYON_SHA256,
        "economic_integration_path_count": len(release),
        "economic_integration_inventory_sha256": EXPECTED_RELEASE_SHA256,
        "economic_integration_paths": [row["path"] for row in release],
        "freeze_auto_adopt_new_main_commits": False,
        "current_main_auto_adopted": False,
        "bootstrap_lifecycle_auto_adopted": False,
        "apollyon_xiphos_auto_adopted": False,
        "economic_integration_auto_forwarded": False,
        "new_versioned_freeze_review_required": True,
        "census_only": True,
        "host_install_qualified": False,
        "customer_payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_activation_authorized": False,
        "wallet_or_signing_authority": False,
        "transaction_submission_authorized": False,
        "treasury_or_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
    }
    return body


def self_test() -> None:
    assert BOOTSTRAP_RE.search(
        "ops/precision/"
        "void_buy_void_epoch2_dormant_first_entry_"
        "protected_install_bootstrap_v2.c"
    )
    assert BOOTSTRAP_RE.search(
        ".github/workflows/"
        "buy-void-epoch2-dormant-first-entry-"
        "protected-install-bootstrap-v2.yml"
    )
    assert APOLLYON_RE.search("ops/xiphos/apollyon_demo.py")
    assert not APOLLYON_RE.search("src/index.ts")
    assert sum(EXPECTED_STATUS.values()) == EXPECTED_TOTAL
    assert (
        EXPECTED_BOOTSTRAP_COUNT
        + EXPECTED_APOLLYON_COUNT
        + EXPECTED_RELEASE_COUNT
        == EXPECTED_TOTAL
    )
    for value in (
        EXPECTED_INVENTORY_SHA256,
        EXPECTED_BOOTSTRAP_SHA256,
        EXPECTED_APOLLYON_SHA256,
        EXPECTED_RELEASE_SHA256,
    ):
        assert re.fullmatch(r"[0-9a-f]{64}", value)
    print(MARKER + "_SELF_TEST_GREEN")
    print("freeze_auto_adopt_new_main_commits=false")
    print("tree_to_tree_inventory_required=true")
    print("bootstrap_lifecycle_category_fixed=true")
    print("apollyon_xiphos_category_fixed=true")
    print("economic_integration_category_fixed=true")
    print("release_authority=false")
    print("apply_mode_refused=true")
    print("funds_movement_authorized=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if args.apply:
        print(MARKER)
        print("status=HOLD")
        print("reason=apply_not_supported")
        print("read_only=true")
        print("source_mutation=false")
        print("host_mutation=false")
        print("customer_payment_acceptance_authorized=false")
        print("public_presale_activation_authorized=false")
        print("funds_movement_authorized=false")
        return 2

    if args.self_test:
        self_test()
        return 0

    report = derive()
    print(json.dumps(report, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Fail-closed current-main Buy VOID source freeze V2. Read-only evidence only."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_CANDIDATE_V2"

ANCHOR = "05614762b1b4638e05e539fd7d20cbf670e1570b"
ANCHOR_TREE = "4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e"
SCOPE_BASE_ENV = "VOID_PRESALE_FREEZE_SCOPE_BASE"
HEX40 = re.compile(r"^[0-9a-f]{40}$")

MANIFEST_REL = "ops/security/buy-void-presale-source-freeze-candidate-v2.json"
MANIFEST_BLOB = "ca9c42e2d3ab4c50ac54badadb9efde6180ad241"
FREEZE_ID = (
    "voidbuypresalefreeze2_"
    "32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1"
)

TUPLE_REL = ".github/workflows/buy-void-current-presale-source-tuple-v3.yml"
TUPLE_BLOB = "e7d73fb5cea73164909c99c5d8585acd48822155"
RUNTIME_REL = ".github/workflows/buy-void-runtime-integration-v1.yml"
RUNTIME_BLOB = "780e4ecaf826cf1cc620d67a3c733470db48d714"
PACKAGE_REL = "package.json"
PACKAGE_BLOB = "14fbdf5717b07fd4c734f5da7a8e84ed59bee93f"
PACKAGE_LOCK_REL = "package-lock.json"
PACKAGE_LOCK_BLOB = "15b5c82ea36f13079a2f9e8863722f654eb3f201"

README_REL = "README.md"
README_BLOB = "6b52c555eb7d93b9ea6652d50aa946f6a319d7de"
DUAL_RAIL_POLICY_REL = "docs/architecture/buy-void-dual-rail-server-policy-v1.md"
DUAL_RAIL_POLICY_BLOB = "a8c2300f7f2b1296790bf496e02a997f7126310f"
WC_COUPLED_REL = "docs/operators/wc-void-coupled-launch-regeneration-census-v2.md"
WC_COUPLED_BLOB = "0a0479fe6f22d3b09458749a31a63f90a510ce5a"

ENFORCEMENT_REL = "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json"
ENFORCEMENT_BLOB = "589845615654da8b688764377b34296267ac0063"
ENFORCEMENT_SET = "05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852"
ENFORCEMENT_PROTECTED = "224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2"

BOOTSTRAP_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
)
BOOTSTRAP_BLOB = "f2ce1364dd776bfbf1aa1ef59ce999cb46037b73"
BOOTSTRAP_LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
)
BOOTSTRAP_CANDIDATE_ID = (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)
BOOTSTRAP_SHA256 = "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"

LOCAL_ADDITIONS = (
    ".github/workflows/buy-void-presale-source-freeze-candidate-v2.yml",
    "docs/architecture/buy-void-presale-source-freeze-candidate-v2.md",
    MANIFEST_REL,
    "scripts/prove_buy_void_presale_source_freeze_candidate_v2.py",
)

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


def require(ok: bool, reason: str) -> None:
    if not ok:
        raise AssertionError(reason)


def git(*args: str) -> str:
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
        env=ENV,
        timeout=40,
        check=False,
    )
    require(cp.returncode == 0, "git_refusal:" + " ".join(args[:4]))
    return cp.stdout.decode("utf-8", "strict").strip()


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def read_pinned(relative: str, expected_blob: str, maximum: int = 256 * 1024) -> bytes:
    require(
        not Path(relative).is_absolute()
        and all(part not in ("", ".", "..") for part in relative.split("/")),
        "unsafe_tracked_path:" + relative,
    )
    path = ROOT.joinpath(*relative.split("/"))
    before = path.lstat()
    require(
        stat.S_ISREG(before.st_mode)
        and not stat.S_ISLNK(before.st_mode)
        and before.st_nlink == 1
        and 0 < before.st_size <= maximum,
        "unsafe_tracked_file:" + relative,
    )
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        require(
            getattr(before, field) == getattr(after, field),
            "tracked_file_changed:" + relative + ":" + field,
        )
    observed = git_blob(raw)
    require(observed == expected_blob, "tracked_blob_drift:" + relative)
    require(
        git("rev-parse", "HEAD:" + relative) == expected_blob,
        "head_blob_drift:" + relative,
    )
    require(
        git("rev-parse", ANCHOR + ":" + relative) == expected_blob
        if relative not in LOCAL_ADDITIONS
        else True,
        "anchor_blob_drift:" + relative,
    )
    return raw


def verify_scope() -> None:
    require(
        git("status", "--porcelain=v1", "--untracked-files=all") == "",
        "source_worktree_not_clean",
    )
    head = git("rev-parse", "HEAD")
    require(git("merge-base", ANCHOR, head) == ANCHOR, "freeze_anchor_missing")
    require(
        git("rev-parse", ANCHOR + "^{tree}") == ANCHOR_TREE,
        "freeze_anchor_tree_changed",
    )
    scope_base = os.environ.get(SCOPE_BASE_ENV, "").strip()
    require(HEX40.fullmatch(scope_base) is not None, "freeze_scope_base_required")
    require(
        git("merge-base", scope_base, head) == scope_base,
        "freeze_scope_base_missing",
    )
    rows = tuple(
        line
        for line in git(
            "diff", "--no-renames", "--name-status", scope_base, head, "--"
        ).splitlines()
        if line
    )
    expected = tuple("A\t" + path for path in sorted(LOCAL_ADDITIONS))
    require(tuple(sorted(rows)) == expected, "freeze_local_scope_invalid")


def verify_manifest() -> dict:
    raw = read_pinned(MANIFEST_REL, MANIFEST_BLOB)
    value = json.loads(raw.decode("utf-8", "strict"))
    require(value.get("schema") == "void_buy_void_presale_source_freeze_candidate_v2", "manifest_schema")
    require(value.get("marker") == MARKER, "manifest_marker")
    require(value.get("version") == 2, "manifest_version")
    require(value.get("repository") == "6ZoSo9/void-node", "manifest_repository")
    require(value.get("freeze_id") == FREEZE_ID, "manifest_freeze_id")
    body = dict(value)
    body.pop("freeze_id", None)
    require(
        FREEZE_ID == "voidbuypresalefreeze2_" + sha256(canonical(body)),
        "manifest_freeze_id_rederivation_failed",
    )

    snap = value.get("source_snapshot", {})
    require(snap.get("commit") == ANCHOR, "manifest_anchor_commit")
    require(snap.get("tree") == ANCHOR_TREE, "manifest_anchor_tree")
    require(snap.get("exact_source_snapshot_fixed") is True, "manifest_not_fixed")
    require(snap.get("auto_adopt_new_main_commits") is False, "manifest_auto_adopt")
    require(
        snap.get("later_main_changes_require_separate_review") is True,
        "manifest_future_review_missing",
    )
    return value


def verify_tuple(manifest: dict) -> None:
    tuple_raw = read_pinned(TUPLE_REL, TUPLE_BLOB)
    read_pinned(RUNTIME_REL, RUNTIME_BLOB)
    read_pinned(PACKAGE_REL, PACKAGE_BLOB)
    read_pinned(PACKAGE_LOCK_REL, PACKAGE_LOCK_BLOB, 2 * 1024 * 1024)

    text = tuple_raw.decode("utf-8", "strict")
    for required in (
        "matrix:",
        "node: [22, 24, 26]",
        "prove_buy_void_payment_allocation_hypothetical_crash_matrix_v6.mjs",
        "prove_buy_void_verified_payment_allocation_handoff_first_original_v4.ts",
        "prove_buy_void_operator_verified_allocation_dispatch_v5.ts",
        "prove_buy_void_verified_payment_allocation_handoff_dual_rail_v3.ts",
        "VOID_BUY_VOID_CURRENT_PRESALE_SOURCE_TUPLE_V3_CROSS_NODE_GREEN",
        "both_native_usdc_rails_admitted=2",
        "production_gate_ready=false",
        "presale_activation=false",
        "funds_moved=false",
    ):
        require(required in text, "tuple_contract_missing:" + required)

    binding = manifest.get("current_presale_tuple_v3", {})
    expected = {
        "workflow_path": TUPLE_REL,
        "workflow_git_blob_sha1": TUPLE_BLOB,
        "runtime_integration_workflow_path": RUNTIME_REL,
        "runtime_integration_workflow_git_blob_sha1": RUNTIME_BLOB,
        "package_json_git_blob_sha1": PACKAGE_BLOB,
        "package_lock_git_blob_sha1": PACKAGE_LOCK_BLOB,
        "cross_node_reexecution_required": True,
        "production_gate_ready": False,
    }
    require(binding == expected, "manifest_tuple_binding_invalid")


def verify_payment_policy() -> None:
    readme = read_pinned(README_REL, README_BLOB).decode("utf-8", "strict")
    dual_rail = read_pinned(DUAL_RAIL_POLICY_REL, DUAL_RAIL_POLICY_BLOB).decode(
        "utf-8", "strict"
    )
    wc_coupled = read_pinned(WC_COUPLED_REL, WC_COUPLED_BLOB).decode(
        "utf-8", "strict"
    )

    for required in (
        "Public presale intake and production WC/VOID market activation are coupled and remain closed.",
        "The Buy VOID payment policy is source-allowlisted to native USDC on Ethereum mainnet (chain ID `1`) and Base mainnet (chain ID `8453`) only.",
        "BTC/VOID remains post-presale and separately launch-gated.",
    ):
        require(required in readme, "readme_payment_policy_missing:" + required)

    for required in (
        "**Base mainnet**, EVM chain ID `8453`;",
        "**Ethereum mainnet**, EVM chain ID `1`.",
        "finite presale maximum: **10,000,000 VOID**;",
        "fixed rate: **2 VOID per 1 USDC**, equivalent to `$0.50` per VOID;",
        "accepted source asset: USDC;",
    ):
        require(required in dual_rail, "dual_rail_policy_missing:" + required)

    for required in (
        "canonical presale pool: 10,000,000 VOID;",
        "canonical rate: 2 VOID per 1 USDC;",
        "simultaneous presale/WC-VOID launch ordering.",
    ):
        require(required in wc_coupled, "wc_coupled_policy_missing:" + required)


def verify_historical_enforcement(manifest: dict) -> None:
    lock = json.loads(read_pinned(ENFORCEMENT_REL, ENFORCEMENT_BLOB).decode("utf-8"))
    require(
        lock.get("marker") == "VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V2",
        "historical_enforcement_marker",
    )
    require(
        lock.get("candidate_evidence", {}).get("candidate_enforcement_set_sha256")
        == ENFORCEMENT_SET,
        "historical_enforcement_set",
    )
    require(
        lock.get("current_enforcement_tracked_source_inventory_sha256")
        == ENFORCEMENT_PROTECTED,
        "historical_enforcement_inventory",
    )
    require(lock.get("complete_executable_closure_verified") is True, "historical_closure")
    require(lock.get("candidate_enforcement_identity_accepted") is True, "historical_not_accepted")
    for key in (
        "deployed_artifact_generation_verified",
        "runtime_mount_authority",
        "production_source_finality_authority_ready",
        "public_presale_activation",
        "funds_movement",
    ):
        require(lock.get(key) is False, "historical_authority_overclaim:" + key)

    binding = manifest.get("canonical_historical_enforcement_v2", {})
    require(binding.get("accepted_lock_path") == ENFORCEMENT_REL, "manifest_enforcement_path")
    require(binding.get("accepted_lock_git_blob_sha1") == ENFORCEMENT_BLOB, "manifest_enforcement_blob")
    require(binding.get("candidate_enforcement_set_sha256") == ENFORCEMENT_SET, "manifest_enforcement_set")
    require(binding.get("protected_inventory_canonical_sha256") == ENFORCEMENT_PROTECTED, "manifest_enforcement_inventory")
    require(binding.get("complete_executable_closure_verified") is True, "manifest_enforcement_closure")
    require(binding.get("candidate_enforcement_identity_accepted") is True, "manifest_enforcement_acceptance")
    require(
        binding.get("current_source_enforcement_successor_required") is True,
        "current_enforcement_successor_not_required",
    )
    for key in (
        "production_source_finality_authority_ready",
        "public_presale_activation",
        "funds_movement",
    ):
        require(binding.get(key) is False, "manifest_enforcement_authority_overclaim:" + key)


def verify_epoch2(manifest: dict) -> None:
    lock = json.loads(read_pinned(BOOTSTRAP_REL, BOOTSTRAP_BLOB).decode("utf-8"))
    require(lock.get("lock_id") == BOOTSTRAP_LOCK_ID, "bootstrap_lock_id")
    require(
        lock.get("candidate_report", {}).get("candidate_id") == BOOTSTRAP_CANDIDATE_ID,
        "bootstrap_candidate_id",
    )
    require(
        lock.get("native_binary", {}).get("sha256") == BOOTSTRAP_SHA256,
        "bootstrap_binary_sha256",
    )
    require(lock.get("candidate_accepted") is True, "bootstrap_candidate_not_accepted")
    require(lock.get("source_generation_identity_accepted") is True, "bootstrap_source_not_accepted")
    for key in (
        "protected_install_authorized",
        "live_execution_authorized",
        "funds_movement_authorized",
    ):
        require(lock.get(key) is False, "bootstrap_authority_overclaim:" + key)

    binding = manifest.get("epoch2_repaired_v6_bootstrap", {})
    require(binding.get("accepted_lock_path") == BOOTSTRAP_REL, "manifest_bootstrap_path")
    require(binding.get("accepted_lock_git_blob_sha1") == BOOTSTRAP_BLOB, "manifest_bootstrap_blob")
    require(binding.get("lock_id") == BOOTSTRAP_LOCK_ID, "manifest_bootstrap_lock")
    require(binding.get("candidate_id") == BOOTSTRAP_CANDIDATE_ID, "manifest_bootstrap_candidate")
    require(binding.get("bootstrap_binary_sha256") == BOOTSTRAP_SHA256, "manifest_bootstrap_sha")
    require(binding.get("candidate_accepted") is True, "manifest_bootstrap_acceptance")
    require(binding.get("source_generation_identity_accepted") is True, "manifest_bootstrap_source")
    for key in (
        "protected_install_authorized",
        "live_execution_authorized",
        "funds_movement_authorized",
    ):
        require(binding.get(key) is False, "manifest_bootstrap_authority_overclaim:" + key)


def verify_release_gate(manifest: dict) -> None:
    gate = manifest.get("release_gate", {})
    require(gate.get("source_freeze_candidate") is True, "freeze_candidate_missing")
    require(gate.get("source_freeze_accepted") is False, "freeze_auto_accepted")
    require(
        gate.get("current_enforcement_successor_required") is True,
        "release_enforcement_successor_missing",
    )
    # Legacy compatibility key only. Frozen payment-asset authority is proven
    # independently by verify_payment_policy(); this field must not be used as
    # an allowlist for BTC presale acceptance.
    require(
        gate.get("btc_void_presale_and_wc_void_pool_coupled") is True,
        "legacy_coupled_launch_compatibility_marker_missing",
    )
    for key in (
        "host_install_qualified",
        "live_runtime_evidence_qualified",
        "customer_payment_acceptance_authorized",
        "public_presale_activation",
        "wc_void_activation",
        "wallet_or_signing_authority",
        "transaction_submission_authorized",
        "treasury_or_liquidity_action_authorized",
        "funds_movement",
        "production_host_evidence_authority",
    ):
        require(gate.get(key) is False, "release_authority_overclaim:" + key)


def verify() -> None:
    verify_scope()
    manifest = verify_manifest()
    verify_tuple(manifest)
    verify_payment_policy()
    verify_historical_enforcement(manifest)
    verify_epoch2(manifest)
    verify_release_gate(manifest)


def main() -> int:
    if sys.argv[1:] not in ([], ["--self-test"]):
        raise AssertionError("unsupported_mode")
    verify()
    print(MARKER + "_GREEN")
    print("read_only=true")
    print("source_snapshot_fixed=true")
    print("freeze_id=" + FREEZE_ID)
    print("auto_adopt_new_main_commits=false")
    print("later_main_changes_require_separate_review=true")
    print("current_presale_tuple_v3_bound=true")
    print("current_presale_tuple_cross_node_reexecution_required=true")
    print("presale_payment_asset=native_usdc")
    print("presale_source_chains=ethereum_mainnet_1,base_mainnet_8453")
    print("presale_pool_void=10000000")
    print("presale_rate_void_per_usdc=2")
    print("wc_void_launch_coupled_to_presale=true")
    print("btc_void_post_presale=true")
    print("legacy_btc_coupled_field_payment_asset_authority=false")
    print("historical_enforcement_v2_accepted=true")
    print("current_source_enforcement_successor_required=true")
    print("epoch2_repaired_v6_bootstrap_bound=true")
    print("source_freeze_accepted=false")
    print("host_install_qualified=false")
    print("customer_payment_acceptance_authorized=false")
    print("public_presale_activation=false")
    print("wc_void_activation=false")
    print("funds_movement=false")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

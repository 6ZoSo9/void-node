#!/usr/bin/env python3
"""Fail-closed acceptance of one fixed Buy VOID presale source identity only."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_ACCEPTANCE_V2"

ACCEPT_REL = "ops/security/buy-void-presale-source-freeze-acceptance-v2.json"
ACCEPT_BLOB = "174d536807f03fd7b6ff44820d4e378c7055150e"
ACCEPT_ID = (
    "voidbuypresalefreezeaccept2_"
    "427988497e4789465dde1c193668bb140d017c4e3ba3748567ea4e3bacfadb57"
)

FREEZE_HEAD = "d3e7404791622541a4567ddd506f27caba60cfea"
FREEZE_REL = "ops/security/buy-void-presale-source-freeze-candidate-v2.json"
FREEZE_BLOB = "ca9c42e2d3ab4c50ac54badadb9efde6180ad241"
FREEZE_ID = (
    "voidbuypresalefreeze2_"
    "32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1"
)
SOURCE_COMMIT = "05614762b1b4638e05e539fd7d20cbf670e1570b"
SOURCE_TREE = "4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e"

FREEZE_PROOF_REL = "scripts/prove_buy_void_presale_source_freeze_candidate_v2.py"
FREEZE_PROOF_BLOB = "884fa63bf5c2386e6a01beea6265f6d7b9d48a72"
FREEZE_DOC_REL = "docs/architecture/buy-void-presale-source-freeze-candidate-v2.md"
FREEZE_DOC_BLOB = "e0862b321d7af50ea1ca06d9c4eb45a462b42446"
FREEZE_WORKFLOW_REL = ".github/workflows/buy-void-presale-source-freeze-candidate-v2.yml"
FREEZE_WORKFLOW_BLOB = "342e6f0fefc6a9b110efe2fc7710f99498e80364"

SUCCESSOR_HEAD = "d29a6663b9fb1f2a1a1c64d911c7f888c33b70e5"
SUCCESSOR_REL = "ops/security/buy-void-presale-current-source-enforcement-successor-v1.json"
SUCCESSOR_BLOB = "774db38ccb771f393b44d589a455144b99d36f6b"
SUCCESSOR_ID = (
    "voidbuypresaleenfsucc1_"
    "819fd2dbce9928145023d4077cffc34e2a9ab3a50e51428fc37dda6ca70a18ef"
)
SUCCESSOR_PROOF_REL = "scripts/prove_buy_void_presale_current_source_enforcement_successor_v1.mjs"
SUCCESSOR_PROOF_BLOB = "6777b900a61d979355671ebee502c4b7ebb6b5dd"
SUCCESSOR_WORKFLOW_REL = ".github/workflows/buy-void-presale-current-source-enforcement-successor-v1.yml"
SUCCESSOR_WORKFLOW_BLOB = "8d5d24d60b13b6659d056c15bbd9af36ab696b86"

CANDIDATE_REL = "ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v2.json"
CANDIDATE_BLOB = "4e23ecbb64eb26c14f5ab15af85eb86d59c3a718"
CANDIDATE_SHA256 = "092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb"
LOCK_REL = "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json"
LOCK_BLOB = "589845615654da8b688764377b34296267ac0063"
LOCK_SHA256 = "06af643df1a807a7d2c3582f6650967575d53874d5bf1277a0f1039bbad6ccd9"
ENFORCEMENT_SET = "05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852"
PROTECTED_INVENTORY = "224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2"

BOOTSTRAP_REL = "ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
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

HOSTED_RUN = 39107024613
HOSTED_ARTIFACTS = (12128524197, 12128298547, 12128707222)

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


def git(*args: str) -> str:
    cp = subprocess.run(
        [
            "/usr/bin/git",
            "--no-replace-objects",
            "-c",
            "core.hooksPath=/dev/null",
            "-c",
            "core.attributesFile=/dev/null",
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
        check=False,
        timeout=30,
    )
    require(cp.returncode == 0, "git_failed:" + ":".join(args[:4]))
    return cp.stdout.decode("utf-8", "strict").strip()


def read_pinned(relative: str, expected_blob: str, maximum: int = 256 * 1024) -> bytes:
    p = ROOT.joinpath(*relative.split("/"))
    before = p.lstat()
    require(
        stat.S_ISREG(before.st_mode)
        and not stat.S_ISLNK(before.st_mode)
        and before.st_nlink == 1
        and 0 < before.st_size <= maximum,
        "unsafe_file:" + relative,
    )
    raw = p.read_bytes()
    after = p.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        require(
            getattr(before, field) == getattr(after, field),
            "file_changed:" + relative + ":" + field,
        )
    require(git_blob(raw) == expected_blob, "blob_mismatch:" + relative)
    require(git("rev-parse", "HEAD:" + relative) == expected_blob, "head_blob_mismatch:" + relative)
    return raw


def verify_acceptance() -> dict:
    raw = read_pinned(ACCEPT_REL, ACCEPT_BLOB, 64 * 1024)
    value = json.loads(raw.decode("utf-8", "strict"))
    require(value.get("schema") == "void_buy_void_presale_source_freeze_acceptance_v2", "schema")
    require(value.get("marker") == MARKER, "marker")
    require(value.get("version") == 2, "version")
    require(value.get("repository") == "6ZoSo9/void-node", "repository")
    require(value.get("acceptance_id") == ACCEPT_ID, "acceptance_id")
    body = dict(value)
    body.pop("acceptance_id", None)
    require(
        ACCEPT_ID == "voidbuypresalefreezeaccept2_" + sha256(canonical(body)),
        "acceptance_id_rederive",
    )
    return value


def verify_fixed_freeze(acceptance: dict) -> dict:
    raw = read_pinned(FREEZE_REL, FREEZE_BLOB, 64 * 1024)
    freeze = json.loads(raw.decode("utf-8", "strict"))
    require(freeze.get("freeze_id") == FREEZE_ID, "freeze_id")
    snap = freeze.get("source_snapshot", {})
    require(snap.get("commit") == SOURCE_COMMIT, "freeze_source_commit")
    require(snap.get("tree") == SOURCE_TREE, "freeze_source_tree")
    require(snap.get("exact_source_snapshot_fixed") is True, "freeze_not_fixed")
    require(snap.get("auto_adopt_new_main_commits") is False, "freeze_auto_adopt")
    require(snap.get("later_main_changes_require_separate_review") is True, "freeze_future_review")
    require(git("rev-parse", SOURCE_COMMIT + "^{tree}") == SOURCE_TREE, "source_tree_drift")
    require(git("merge-base", FREEZE_HEAD, "HEAD") == FREEZE_HEAD, "freeze_review_head_not_ancestor")

    bound = acceptance.get("source_freeze", {})
    require(bound.get("candidate_review_head") == FREEZE_HEAD, "accept_freeze_head")
    require(bound.get("manifest_path") == FREEZE_REL, "accept_freeze_path")
    require(bound.get("manifest_git_blob_sha1") == FREEZE_BLOB, "accept_freeze_blob")
    require(bound.get("freeze_id") == FREEZE_ID, "accept_freeze_id")
    require(bound.get("source_commit") == SOURCE_COMMIT, "accept_source_commit")
    require(bound.get("source_tree") == SOURCE_TREE, "accept_source_tree")
    require(bound.get("exact_source_snapshot_fixed") is True, "accept_not_fixed")
    require(bound.get("auto_adopt_new_main_commits") is False, "accept_auto_adopt")
    require(bound.get("later_main_changes_require_separate_review") is True, "accept_future_review")
    return freeze


def verify_freeze_semantics() -> None:
    proof_text = read_pinned(
        FREEZE_PROOF_REL, FREEZE_PROOF_BLOB, 256 * 1024
    ).decode("utf-8", "strict")
    read_pinned(FREEZE_DOC_REL, FREEZE_DOC_BLOB, 128 * 1024)
    read_pinned(FREEZE_WORKFLOW_REL, FREEZE_WORKFLOW_BLOB, 128 * 1024)
    for marker in (
        "presale_payment_asset=native_usdc",
        "presale_source_chains=ethereum_mainnet_1,base_mainnet_8453",
        "presale_pool_void=10000000",
        "presale_rate_void_per_usdc=2",
        "wc_void_launch_coupled_to_presale=true",
        "btc_void_post_presale=true",
        "legacy_btc_coupled_field_payment_asset_authority=false",
    ):
        require(marker in proof_text, "freeze_semantics_marker_missing:" + marker)


def verify_successor(acceptance: dict) -> dict:
    raw = read_pinned(SUCCESSOR_REL, SUCCESSOR_BLOB, 64 * 1024)
    successor = json.loads(raw.decode("utf-8", "strict"))
    require(successor.get("successor_id") == SUCCESSOR_ID, "successor_id")
    body = dict(successor)
    body.pop("successor_id", None)
    require(
        SUCCESSOR_ID == "voidbuypresaleenfsucc1_" + sha256(canonical(body)),
        "successor_id_rederive",
    )
    require(git("merge-base", SUCCESSOR_HEAD, "HEAD") == SUCCESSOR_HEAD, "successor_head_not_ancestor")
    read_pinned(SUCCESSOR_PROOF_REL, SUCCESSOR_PROOF_BLOB, 128 * 1024)
    read_pinned(SUCCESSOR_WORKFLOW_REL, SUCCESSOR_WORKFLOW_BLOB, 128 * 1024)

    reval = successor.get("current_source_revalidation", {})
    expected = {
        "protected_path_count": 49,
        "protected_path_delta_count": 0,
        "protected_path_identity_preserved": True,
        "reviewed_economic_source_file_count": 28,
        "reviewed_economic_source_delta_count": 0,
        "current_built_census_identity_matches_frozen_v4": True,
        "frozen_v4_census_proof_preserved": True,
        "nonprotected_economic_drift_count": 3,
        "accepted_enforcement_set_preserved": True,
        "current_source_enforcement_successor_accepted": True,
        "current_source_enforcement_successor_required": False,
    }
    require(reval == expected, "successor_revalidation")

    authority = successor.get("authority", {})
    require(authority.get("source_identity_acceptance_only") is True, "successor_source_only")
    for key in (
        "deployed_artifact_generation_verified",
        "runtime_mount_authority",
        "production_source_finality_authority_ready",
        "source_freeze_accepted",
        "customer_payment_acceptance",
        "public_presale_activation",
        "wc_void_market_activation",
        "signing",
        "transaction",
        "treasury_liquidity_action",
        "funds_movement",
        "production_host_evidence_authority",
    ):
        require(authority.get(key) is False, "successor_authority_overclaim:" + key)

    bound = acceptance.get("enforcement_successor", {})
    require(bound.get("review_head") == SUCCESSOR_HEAD, "accept_successor_head")
    require(bound.get("path") == SUCCESSOR_REL, "accept_successor_path")
    require(bound.get("git_blob_sha1") == SUCCESSOR_BLOB, "accept_successor_blob")
    require(bound.get("successor_id") == SUCCESSOR_ID, "accept_successor_id")
    require(bound.get("hosted_workflow_run") == HOSTED_RUN, "accept_hosted_run")
    require(
        tuple(bound.get(k) for k in ("artifact_node22", "artifact_node24", "artifact_node26"))
        == HOSTED_ARTIFACTS,
        "accept_hosted_artifacts",
    )
    require(bound.get("cross_node_candidate_identity_verified") is True, "accept_cross_candidate")
    require(bound.get("cross_node_current_integration_identity_verified") is True, "accept_cross_integration")
    require(bound.get("protected_path_count") == 49, "accept_protected_count")
    require(bound.get("protected_path_delta_count") == 0, "accept_protected_delta")
    require(bound.get("reviewed_economic_source_file_count") == 28, "accept_econ_count")
    require(bound.get("reviewed_economic_source_delta_count") == 0, "accept_econ_delta")
    require(bound.get("accepted_enforcement_set_sha256") == ENFORCEMENT_SET, "accept_enforcement_set")
    require(bound.get("protected_inventory_sha256") == PROTECTED_INVENTORY, "accept_inventory")
    require(bound.get("current_source_enforcement_successor_required") is False, "accept_successor_still_required")
    return successor


def verify_historical_enforcement(acceptance: dict) -> None:
    candidate_raw = read_pinned(CANDIDATE_REL, CANDIDATE_BLOB, 128 * 1024)
    lock_raw = read_pinned(LOCK_REL, LOCK_BLOB, 128 * 1024)
    require(sha256(candidate_raw) == CANDIDATE_SHA256, "candidate_sha")
    require(sha256(lock_raw) == LOCK_SHA256, "lock_sha")
    candidate = json.loads(candidate_raw.decode("utf-8", "strict"))
    lock = json.loads(lock_raw.decode("utf-8", "strict"))
    require(candidate.get("candidate_enforcement_set_sha256") == ENFORCEMENT_SET, "candidate_set")
    require(candidate.get("current_enforcement_tracked_source_inventory_sha256") == PROTECTED_INVENTORY, "candidate_inventory")
    require(candidate.get("complete_executable_closure_verified") is True, "candidate_closure")
    require(lock.get("candidate_enforcement_identity_accepted") is True, "lock_not_accepted")
    require(lock.get("candidate_evidence", {}).get("candidate_enforcement_set_sha256") == ENFORCEMENT_SET, "lock_set")
    for key in (
        "deployed_artifact_generation_verified",
        "runtime_mount_authority",
        "production_source_finality_authority_ready",
        "public_presale_activation",
        "funds_movement",
    ):
        require(lock.get(key) is False, "lock_authority_overclaim:" + key)

    bound = acceptance.get("frozen_historical_enforcement", {})
    require(bound.get("candidate_path") == CANDIDATE_REL, "accept_candidate_path")
    require(bound.get("candidate_git_blob_sha1") == CANDIDATE_BLOB, "accept_candidate_blob")
    require(bound.get("candidate_json_sha256") == CANDIDATE_SHA256, "accept_candidate_sha")
    require(bound.get("lock_path") == LOCK_REL, "accept_lock_path")
    require(bound.get("lock_git_blob_sha1") == LOCK_BLOB, "accept_lock_blob")
    require(bound.get("lock_json_sha256") == LOCK_SHA256, "accept_lock_sha")
    require(bound.get("candidate_enforcement_identity_accepted") is True, "accept_lock_identity")
    require(bound.get("complete_executable_closure_verified") is True, "accept_lock_closure")


def verify_epoch2(acceptance: dict) -> None:
    raw = read_pinned(BOOTSTRAP_REL, BOOTSTRAP_BLOB, 128 * 1024)
    lock = json.loads(raw.decode("utf-8", "strict"))
    require(lock.get("lock_id") == BOOTSTRAP_LOCK_ID, "bootstrap_lock_id")
    require(lock.get("candidate_report", {}).get("candidate_id") == BOOTSTRAP_CANDIDATE_ID, "bootstrap_candidate_id")
    require(lock.get("native_binary", {}).get("sha256") == BOOTSTRAP_SHA256, "bootstrap_sha")
    require(lock.get("candidate_accepted") is True, "bootstrap_candidate_not_accepted")
    require(lock.get("source_generation_identity_accepted") is True, "bootstrap_source_not_accepted")
    for key in ("protected_install_authorized", "live_execution_authorized", "funds_movement_authorized"):
        require(lock.get(key) is False, "bootstrap_authority_overclaim:" + key)

    bound = acceptance.get("epoch2_repaired_v6_bootstrap", {})
    require(bound.get("accepted_lock_path") == BOOTSTRAP_REL, "accept_bootstrap_path")
    require(bound.get("accepted_lock_git_blob_sha1") == BOOTSTRAP_BLOB, "accept_bootstrap_blob")
    require(bound.get("lock_id") == BOOTSTRAP_LOCK_ID, "accept_bootstrap_lock")
    require(bound.get("candidate_id") == BOOTSTRAP_CANDIDATE_ID, "accept_bootstrap_candidate")
    require(bound.get("bootstrap_binary_sha256") == BOOTSTRAP_SHA256, "accept_bootstrap_sha")
    require(bound.get("source_identity_accepted") is True, "accept_bootstrap_source")
    require(bound.get("install_authority") is False, "accept_bootstrap_install_authority")
    require(bound.get("live_execution_authority") is False, "accept_bootstrap_live_authority")


def verify_authority(acceptance: dict) -> None:
    gate = acceptance.get("acceptance", {})
    require(gate.get("source_identity_acceptance_only") is True, "not_source_only")
    require(gate.get("source_freeze_accepted") is True, "freeze_not_accepted")
    require(gate.get("current_enforcement_successor_required") is False, "successor_still_required")
    for key in (
        "payment_rail_policy_accepted",
        "host_install_qualified",
        "live_runtime_evidence_qualified",
        "customer_payment_acceptance_authorized",
        "public_presale_activation",
        "wc_void_market_activation",
        "wallet_or_signing_authority",
        "transaction_submission_authorized",
        "treasury_or_liquidity_action_authorized",
        "funds_movement",
        "production_host_evidence_authority",
    ):
        require(gate.get(key) is False, "acceptance_authority_overclaim:" + key)
    require(
        acceptance.get("next_gate")
        == "void_buy_void_presale_source_freeze_host_install_qualification_v2",
        "next_gate",
    )


def verify() -> None:
    require(git("status", "--porcelain=v1", "--untracked-files=all") == "", "worktree_not_clean")
    acceptance = verify_acceptance()
    verify_fixed_freeze(acceptance)
    verify_freeze_semantics()
    verify_successor(acceptance)
    verify_historical_enforcement(acceptance)
    verify_epoch2(acceptance)
    verify_authority(acceptance)


def main() -> int:
    if sys.argv[1:] not in ([], ["--self-test"]):
        raise AssertionError("unsupported_mode")
    verify()
    print(MARKER + "_PROOF_GREEN")
    print("acceptance_id=" + ACCEPT_ID)
    print("source_freeze_accepted=true")
    print("source_snapshot_fixed=true")
    print("auto_adopt_new_main_commits=false")
    print("current_source_enforcement_successor_required=false")
    print("protected_path_count=49")
    print("protected_path_delta_count=0")
    print("reviewed_economic_source_file_count=28")
    print("reviewed_economic_source_delta_count=0")
    print("cross_node_candidate_identity_verified=true")
    print("cross_node_current_integration_identity_verified=true")
    print("source_identity_acceptance_only=true")
    print("freeze_payment_semantics_evidence_bound=true")
    print("legacy_btc_coupled_field_payment_asset_authority=false")
    print("payment_rail_policy_accepted=false")
    print("host_install_qualified=false")
    print("live_runtime_evidence_qualified=false")
    print("customer_payment_acceptance_authorized=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("wallet_or_signing_authority=false")
    print("transaction_submission_authorized=false")
    print("treasury_or_liquidity_action_authorized=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_gate=void_buy_void_presale_source_freeze_host_install_qualification_v2")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

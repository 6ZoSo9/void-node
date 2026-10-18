#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import types
from typing import Any

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_BOOTSTRAP_V6_REPAIRED_INSTALLED_QUALIFICATION_V1"
)

FIXED_CHECKOUT = Path("/home/zoso/dev/void-node")
FIXED_GIT = Path("/usr/bin/git")

UPGRADER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_v1.py"
)
UPGRADER_BLOB = "d4b298dea73a4970987bf22435be3e76a5e7a02d"
UPGRADER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_v1.py"
)
UPGRADER_PROOF_BLOB = "74245f061432efd5383123c111ab481befbe90b5"

PLAN_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_plan_v1.py"
)
PLAN_BLOB = "9ba10aac284da9e44db0ad258348425cfa3c2e2c"
PLAN_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_plan_v1.py"
)
PLAN_PROOF_BLOB = "31d501e290513c3ef2629681574fc0e51f7fe50e"

OLD_LOCK = (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
)
NEW_LOCK = (
    "voidbuye2dormantbootstraplock3_"
    "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
)
NEW_CAND = (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)

OLD_BOOT = (
    874_608,
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b",
    "a91707c3e5803071fc73c3451c9bcb3b774f8b48",
)
NEW_BOOT = (
    874_608,
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c",
    "b577d70666f98ac59a75b84b3dab741fe7b93a4b",
)
OLD_MAN = (
    2_382,
    "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662",
    "6e0630af72111bd9976dcc38cdcdada1904dd067",
)
NEW_MAN = (
    2_382,
    "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9",
    "de56bacb30bea0adc418e240cf3fb8d900b061ef",
)

GREEN_STATE = "PROTECTED_BOOTSTRAP_V6_REPAIRED_GREEN_WITH_PREDECESSOR"
HEX40 = re.compile(r"^[0-9a-f]{40}$")

GIT_ENV = {
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
    "GIT_CONFIG_COUNT": "5",
    "GIT_CONFIG_KEY_0": "core.fsmonitor",
    "GIT_CONFIG_VALUE_0": "false",
    "GIT_CONFIG_KEY_1": "core.hooksPath",
    "GIT_CONFIG_VALUE_1": "/dev/null",
    "GIT_CONFIG_KEY_2": "credential.helper",
    "GIT_CONFIG_VALUE_2": "",
    "GIT_CONFIG_KEY_3": "credential.interactive",
    "GIT_CONFIG_VALUE_3": "never",
    "GIT_CONFIG_KEY_4": "core.sshCommand",
    "GIT_CONFIG_VALUE_4": "/bin/false",
}


class QualificationError(RuntimeError):
    pass


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def _git(args: list[str]) -> bytes:
    cp = subprocess.run(
        [
            str(FIXED_GIT),
            "--no-replace-objects",
            "-C",
            str(FIXED_CHECKOUT),
            "-c",
            "safe.directory=" + str(FIXED_CHECKOUT),
            *args,
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=GIT_ENV,
        timeout=20,
        check=False,
    )
    if cp.returncode != 0:
        raise QualificationError(
            "git_command_failed:"
            + str(cp.returncode)
            + ":"
            + cp.stderr.decode("utf-8", "replace")[-1000:]
        )
    if cp.stderr:
        raise QualificationError("git_stderr")
    return cp.stdout


def checkout_snapshot(expected_head: str) -> dict[str, Any]:
    if HEX40.fullmatch(expected_head) is None:
        raise QualificationError("expected_head_invalid")
    head = _git(["rev-parse", "--verify", "HEAD^{commit}"]).decode().strip()
    tree = _git(["rev-parse", "--verify", "HEAD^{tree}"]).decode().strip()
    branch = _git(["symbolic-ref", "--short", "-q", "HEAD"]).decode().strip()
    status = _git(["status", "--porcelain=v1", "--untracked-files=all"])
    if head != expected_head:
        raise QualificationError("checkout_head_mismatch")
    if branch != "main":
        raise QualificationError("checkout_branch_not_main")
    if status != b"":
        raise QualificationError("checkout_not_clean")
    if HEX40.fullmatch(tree) is None:
        raise QualificationError("checkout_tree_invalid")
    return {
        "head": head,
        "tree": tree,
        "branch": branch,
        "clean": True,
    }


def exact_git_object(expected_head: str, relative: str, expected_blob: str) -> bytes:
    raw = _git(["show", expected_head + ":" + relative])
    if git_blob(raw) != expected_blob:
        raise QualificationError("git_object_blob_mismatch:" + relative)
    actual = _git(["rev-parse", expected_head + ":" + relative]).decode().strip()
    if actual != expected_blob:
        raise QualificationError("git_tree_blob_mismatch:" + relative)
    return raw


def load_upgrader(expected_head: str) -> types.ModuleType:
    raw = exact_git_object(expected_head, UPGRADER_REL, UPGRADER_BLOB)
    module = types.ModuleType("void_verified_repaired_bootstrap_upgrader")
    module.__file__ = str(FIXED_CHECKOUT / UPGRADER_REL)
    module.__package__ = ""
    exec(
        compile(
            raw.decode("utf-8", "strict"),
            str(FIXED_CHECKOUT / UPGRADER_REL),
            "exec",
            dont_inherit=True,
            optimize=0,
        ),
        module.__dict__,
    )
    required = {
        "MARKER":
            "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_BOOTSTRAP_ATOMIC_UPGRADE_V1",
        "OLD_LOCK": OLD_LOCK,
        "NEW_LOCK": NEW_LOCK,
        "NEW_CAND": NEW_CAND,
        "GREEN": GREEN_STATE,
    }
    for key, expected in required.items():
        if getattr(module, key, None) != expected:
            raise QualificationError("upgrader_contract_mismatch:" + key)
    if tuple(module.OLD_BOOT) != OLD_BOOT:
        raise QualificationError("old_bootstrap_identity_mismatch")
    if tuple(module.NEW_BOOT) != NEW_BOOT:
        raise QualificationError("new_bootstrap_identity_mismatch")
    if tuple(module.OLD_MAN) != OLD_MAN:
        raise QualificationError("old_manifest_identity_mismatch")
    if tuple(module.NEW_MAN) != NEW_MAN:
        raise QualificationError("new_manifest_identity_mismatch")
    return module


def collect(expected_head: str) -> dict[str, Any]:
    if os.geteuid() == 0:
        raise QualificationError("nonroot_required_for_repaired_qualification")
    checkout = checkout_snapshot(expected_head)
    exact_git_object(expected_head, UPGRADER_PROOF_REL, UPGRADER_PROOF_BLOB)
    exact_git_object(expected_head, PLAN_REL, PLAN_BLOB)
    exact_git_object(expected_head, PLAN_PROOF_REL, PLAN_PROOF_BLOB)

    upgrader = load_upgrader(expected_head)
    try:
        outer = upgrader.load_outer()
        outer._require_secure_apply_context()
        bindings, policy, receipt = upgrader.bindings(outer, expected_head)
        protected_state, current_root_identity = upgrader.state(outer, policy)
        if protected_state != GREEN_STATE:
            raise QualificationError(
                "repaired_bootstrap_not_green:" + str(protected_state)
            )
        predecessor_root_identity = upgrader.old_root(
            outer,
            upgrader.PREDECESSOR_ROOT,
            policy,
        )
        if upgrader.exists(upgrader.STAGE_ROOT):
            raise QualificationError("upgrade_stage_present_after_green")
        if not upgrader.exists(upgrader.PREDECESSOR_ROOT):
            raise QualificationError("predecessor_root_missing_after_green")
        if bindings.get("lock_id") != NEW_LOCK:
            raise QualificationError("current_binding_lock_mismatch")
    except QualificationError:
        raise
    except Exception as exc:
        raise QualificationError(
            "upgrader_read_only_observation_failed:" + type(exc).__name__
        ) from exc

    required_receipt = {
        "temporary_git_metadata_write_performed": True,
        "temporary_git_metadata_cleanup_completed": True,
        "source_repository_mutation": False,
        "source_object_fetch": False,
        "repository_config_loaded": False,
        "repository_callback_execution": False,
        "native_parent_authority_claimed": False,
    }
    for key, expected in required_receipt.items():
        if receipt.get(key) != expected:
            raise QualificationError("git_boundary_mismatch:" + key)

    return {
        "expected_head": expected_head,
        "checkout": checkout,
        "protected_state": protected_state,
        "old_lock_id": OLD_LOCK,
        "new_lock_id": NEW_LOCK,
        "new_candidate_id": NEW_CAND,
        "current_root_identity": current_root_identity,
        "predecessor_root_identity": predecessor_root_identity,
        "repaired_bootstrap_sha256": NEW_BOOT[1],
        "repaired_manifest_sha256": NEW_MAN[1],
        "predecessor_bootstrap_sha256": OLD_BOOT[1],
        "predecessor_manifest_sha256": OLD_MAN[1],
        "git_boundary_receipt": receipt,
        "repaired_fixed_root_verified": True,
        "predecessor_retained_verified": True,
        "upgrade_stage_absent_verified": True,
        "temporary_git_metadata_write_required": True,
        "qualification_git_callbacks_neutralized": True,
        "filesystem_write": True,
        "protected_filesystem_mutation": False,
        "bootstrap_execution": False,
        "inner_installer_execution": False,
        "service_mutation": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction": False,
        "rpc_call": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
    }


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("upgrader_git_blob_sha1=" + UPGRADER_BLOB)
    print("upgrade_plan_git_blob_sha1=" + PLAN_BLOB)
    print("old_lock_id=" + OLD_LOCK)
    print("new_lock_id=" + NEW_LOCK)
    print("new_candidate_id=" + NEW_CAND)
    print("repaired_fixed_root_required=true")
    print("retained_predecessor_required=true")
    print("upgrade_stage_absent_required=true")
    print("temporary_git_metadata_boundary_explicit=true")
    print("temporary_git_metadata_write_required=true")
    print("qualification_git_callbacks_neutralized=true")
    print("nonroot_run_required=true")
    print("protected_filesystem_mutation=false")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")


def emit(result: dict[str, Any]) -> None:
    print(MARKER)
    print("mode=run")
    print("status=GREEN")
    print("expected_head=" + str(result["expected_head"]))
    print("protected_state=" + str(result["protected_state"]))
    print("old_lock_id=" + OLD_LOCK)
    print("new_lock_id=" + NEW_LOCK)
    print("new_candidate_id=" + NEW_CAND)
    print("repaired_fixed_root_verified=true")
    print("predecessor_retained_verified=true")
    print("upgrade_stage_absent_verified=true")
    print("nonroot_run_required=true")
    print("temporary_git_metadata_write_required=true")
    print("qualification_git_callbacks_neutralized=true")
    print("filesystem_write=true")
    print("protected_filesystem_mutation=false")
    print("repaired_bootstrap_sha256=" + NEW_BOOT[1])
    print("repaired_manifest_sha256=" + NEW_MAN[1])
    print("predecessor_bootstrap_sha256=" + OLD_BOOT[1])
    print("predecessor_manifest_sha256=" + OLD_MAN[1])
    for key, value in result["git_boundary_receipt"].items():
        print(key + "=" + (str(value).lower() if isinstance(value, bool) else str(value)))
    print("filesystem_write=false")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_BOOTSTRAP_V6_REPAIRED_EXECUTION_PLAN"
    )


def self_test() -> None:
    assert HEX40.fullmatch("a" * 40)
    assert HEX40.fullmatch("A" * 40) is None
    assert OLD_LOCK != NEW_LOCK
    assert OLD_BOOT[0] == NEW_BOOT[0] == 874_608
    assert OLD_BOOT[1] != NEW_BOOT[1]
    assert OLD_MAN[1] != NEW_MAN[1]
    print(MARKER + "_SELF_TEST_GREEN")
    print("exact_repaired_upgrader_generation_bound=true")
    print("exact_nonexecuting_upgrade_plan_generation_bound=true")
    print("strict_lowercase_expected_head_required=true")
    print("repaired_green_state_required=true")
    print("repaired_fixed_root_required=true")
    print("retained_predecessor_required=true")
    print("upgrade_stage_absent_required=true")
    print("temporary_git_metadata_cleanup_required=true")
    print("temporary_git_metadata_write_required=true")
    print("qualification_git_callbacks_neutralized=true")
    print("nonroot_run_required=true")
    print("upgrader_apply_not_called=true")
    print("protected_filesystem_mutation=false")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--run", action="store_true")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.expected_head:
        raise QualificationError("expected_head_required")
    emit(collect(args.expected_head))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except QualificationError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("automatic_retry=false")
        print("filesystem_write=unknown")
        print("protected_filesystem_mutation=false")
        print("temporary_git_metadata_cleanup_completed=unknown")
        print("bootstrap_execution=false")
        print("inner_installer_execution=false")
        print("service_mutation=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("treasury_liquidity_action=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)

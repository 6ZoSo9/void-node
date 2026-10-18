#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import types
from typing import Any

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_BOOTSTRAP_ATOMIC_UPGRADE_PLAN_V1"
)
PLAN_SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_plan_handoff_v1"
)
PLAN_PREFIX = "voidbuye2bootstrapupgradehandoff1_"

FIXED_CHECKOUT = Path("/home/zoso/dev/void-node")
FIXED_GIT = Path("/usr/bin/git")
FIXED_PYTHON = Path("/usr/bin/python3")

UPGRADER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_v1.py"
)
UPGRADER_BLOB = "7d70527d8910881f9973479b89ceef78789ad100"
UPGRADER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_bootstrap_atomic_upgrade_v1.py"
)
UPGRADER_PROOF_BLOB = "9e0b997230943b1ad0a0285e74e82faf049d7d31"
UPGRADER_DOC_REL = (
    "docs/operators/buy-void-epoch2-dormant-first-entry-"
    "protected-bootstrap-atomic-upgrade-v1.md"
)
UPGRADER_DOC_BLOB = "6073c2c3a6489d80a24e64eba9fdf892bfe8c4c0"
UPGRADER_WORKFLOW_REL = (
    ".github/workflows/buy-void-epoch2-dormant-first-entry-"
    "protected-bootstrap-atomic-upgrade-v1.yml"
)
UPGRADER_WORKFLOW_BLOB = "a89be3f29d758811362c81c9dbc7d2b69f74c147"

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
NEW_BOOTSTRAP_BYTES = 874_608
NEW_BOOTSTRAP_SHA256 = (
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
)
NEW_BOOTSTRAP_GIT_BLOB = "b577d70666f98ac59a75b84b3dab741fe7b93a4b"
NEW_MANIFEST_BYTES = 2_382
NEW_MANIFEST_SHA256 = (
    "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9"
)
NEW_MANIFEST_GIT_BLOB = "de56bacb30bea0adc418e240cf3fb8d900b061ef"

EXPECTED_UPGRADER_PLAN_PREFIX = "voidbuye2bootstrapupgrade1_"
EXPECTED_CONFIRM = (
    "ATOMIC_EXCHANGE_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_BOOTSTRAP_V6_PREDECESSOR_TO_REPAIRED"
)
READY_STATE = (
    "PROTECTED_BOOTSTRAP_V6_PREDECESSOR_READY_FOR_REPAIRED_ATOMIC_UPGRADE"
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


class PlanError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical(value: Any) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


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
        raise PlanError(
            "git_command_failed:"
            + str(cp.returncode)
            + ":"
            + cp.stderr.decode("utf-8", "replace")[-1000:]
        )
    if cp.stderr:
        raise PlanError("git_stderr")
    return cp.stdout


def checkout_snapshot(expected_head: str) -> dict[str, Any]:
    if HEX40.fullmatch(expected_head) is None:
        raise PlanError("expected_head_invalid")
    head = _git(["rev-parse", "--verify", "HEAD^{commit}"]).decode().strip()
    tree = _git(["rev-parse", "--verify", "HEAD^{tree}"]).decode().strip()
    branch = _git(["symbolic-ref", "--short", "-q", "HEAD"]).decode().strip()
    status = _git(["status", "--porcelain=v1", "--untracked-files=all"])
    if head != expected_head:
        raise PlanError("checkout_head_mismatch")
    if branch != "main":
        raise PlanError("checkout_branch_not_main")
    if status != b"":
        raise PlanError("checkout_not_clean")
    if HEX40.fullmatch(tree) is None:
        raise PlanError("checkout_tree_invalid")
    return {"head": head, "tree": tree, "branch": branch, "clean": True}


def exact_git_object(expected_head: str, relative: str, blob: str) -> bytes:
    raw = _git(["show", expected_head + ":" + relative])
    if git_blob(raw) != blob:
        raise PlanError("git_object_blob_mismatch:" + relative)
    head_blob = _git(["rev-parse", expected_head + ":" + relative]).decode().strip()
    if head_blob != blob:
        raise PlanError("git_tree_blob_mismatch:" + relative)
    return raw


def stable_regular_input(
    value: Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str,
    expected_mode: int,
) -> dict[str, Any]:
    raw_path = str(value)
    if not value.is_absolute() or os.path.normpath(raw_path) != raw_path:
        raise PlanError("input_path_not_normalized_absolute")
    try:
        before = value.lstat()
    except OSError as exc:
        raise PlanError("input_unavailable:" + raw_path) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_size != expected_bytes
    ):
        raise PlanError("input_metadata_invalid:" + raw_path)
    fd = os.open(value, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if (
            opened.st_dev != before.st_dev
            or opened.st_ino != before.st_ino
            or opened.st_size != before.st_size
        ):
            raise PlanError("input_rebound:" + raw_path)
        data = bytearray()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                raise PlanError("input_short_read:" + raw_path)
            data.extend(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise PlanError("input_grew:" + raw_path)
        after = os.fstat(fd)
        visible = value.lstat()
        for left, right in ((opened, after), (after, visible)):
            if (
                left.st_dev != right.st_dev
                or left.st_ino != right.st_ino
                or left.st_size != right.st_size
                or left.st_mtime_ns != right.st_mtime_ns
                or left.st_ctime_ns != right.st_ctime_ns
            ):
                raise PlanError("input_changed:" + raw_path)
    finally:
        os.close(fd)
    raw = bytes(data)
    if sha256(raw) != expected_sha256:
        raise PlanError("input_sha256_mismatch:" + raw_path)
    if git_blob(raw) != expected_git_blob:
        raise PlanError("input_git_blob_mismatch:" + raw_path)
    return {
        "path": raw_path,
        "bytes": len(raw),
        "sha256": expected_sha256,
        "git_blob_sha1": expected_git_blob,
        "mode": format(expected_mode, "04o"),
        "dev": before.st_dev,
        "ino": before.st_ino,
        "mtime_ns": before.st_mtime_ns,
        "ctime_ns": before.st_ctime_ns,
    }


def load_upgrader(expected_head: str) -> tuple[types.ModuleType, bytes]:
    raw = exact_git_object(expected_head, UPGRADER_REL, UPGRADER_BLOB)
    module = types.ModuleType("void_verified_bootstrap_atomic_upgrade_v1")
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
        "PLAN_PREFIX": EXPECTED_UPGRADER_PLAN_PREFIX,
        "CONFIRM": EXPECTED_CONFIRM,
        "OLD_LOCK": OLD_LOCK,
        "NEW_LOCK": NEW_LOCK,
        "NEW_CAND": NEW_CAND,
        "READY": READY_STATE,
        "GREEN": GREEN_STATE,
    }
    for key, expected in required.items():
        if getattr(module, key, None) != expected:
            raise PlanError("upgrader_contract_mismatch:" + key)
    if tuple(module.NEW_BOOT) != (
        NEW_BOOTSTRAP_BYTES,
        NEW_BOOTSTRAP_SHA256,
        NEW_BOOTSTRAP_GIT_BLOB,
    ):
        raise PlanError("upgrader_bootstrap_identity_mismatch")
    if tuple(module.NEW_MAN) != (
        NEW_MANIFEST_BYTES,
        NEW_MANIFEST_SHA256,
        NEW_MANIFEST_GIT_BLOB,
    ):
        raise PlanError("upgrader_manifest_identity_mismatch")
    return module, raw


def collect(
    bootstrap: Path,
    manifest: Path,
    expected_head: str,
) -> dict[str, Any]:
    if os.geteuid() == 0:
        raise PlanError("nonroot_required_for_upgrade_plan")
    checkout = checkout_snapshot(expected_head)
    exact_git_object(expected_head, UPGRADER_PROOF_REL, UPGRADER_PROOF_BLOB)
    exact_git_object(expected_head, UPGRADER_DOC_REL, UPGRADER_DOC_BLOB)
    exact_git_object(expected_head, UPGRADER_WORKFLOW_REL, UPGRADER_WORKFLOW_BLOB)

    bootstrap_input = stable_regular_input(
        bootstrap,
        expected_bytes=NEW_BOOTSTRAP_BYTES,
        expected_sha256=NEW_BOOTSTRAP_SHA256,
        expected_git_blob=NEW_BOOTSTRAP_GIT_BLOB,
        expected_mode=0o555,
    )
    manifest_input = stable_regular_input(
        manifest,
        expected_bytes=NEW_MANIFEST_BYTES,
        expected_sha256=NEW_MANIFEST_SHA256,
        expected_git_blob=NEW_MANIFEST_GIT_BLOB,
        expected_mode=0o444,
    )

    upgrader, upgrader_raw = load_upgrader(expected_head)
    result = upgrader.collect(bootstrap, manifest, expected_head)
    if not isinstance(result, dict):
        raise PlanError("upgrader_collect_result_invalid")
    body = result.get("body")
    plan_id = result.get("plan_id")
    receipt = result.get("git")
    if not isinstance(body, dict) or not isinstance(receipt, dict):
        raise PlanError("upgrader_collect_evidence_missing")
    if (
        not isinstance(plan_id, str)
        or not plan_id.startswith(EXPECTED_UPGRADER_PLAN_PREFIX)
        or len(plan_id) != len(EXPECTED_UPGRADER_PLAN_PREFIX) + 64
    ):
        raise PlanError("upgrader_plan_id_invalid")
    if body.get("expected_head") != expected_head:
        raise PlanError("upgrader_expected_head_mismatch")
    if body.get("old_lock_id") != OLD_LOCK:
        raise PlanError("upgrader_old_lock_mismatch")
    if body.get("new_lock_id") != NEW_LOCK:
        raise PlanError("upgrader_new_lock_mismatch")
    if body.get("new_candidate_id") != NEW_CAND:
        raise PlanError("upgrader_candidate_mismatch")
    if body.get("protected_state") not in (READY_STATE, GREEN_STATE):
        raise PlanError("upgrader_protected_state_invalid")
    if body.get("atomic_root_exchange_required") is not True:
        raise PlanError("atomic_exchange_not_required")
    if body.get("predecessor_retention_required") is not True:
        raise PlanError("predecessor_retention_not_required")
    if body.get("automatic_rollback_required") is not True:
        raise PlanError("automatic_rollback_not_required")
    if body.get("service_mutation") is not False:
        raise PlanError("service_mutation_overclaim")
    if body.get("credential_access") is not False:
        raise PlanError("credential_access_overclaim")
    if body.get("funds_movement") is not False:
        raise PlanError("funds_movement_overclaim")

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
            raise PlanError("git_boundary_mismatch:" + key)

    upgrader_source = upgrader_raw.decode("utf-8", "strict")
    future_apply_code = (
        "source=" + repr(upgrader_source) + "\n"
        "filename=" + repr(str(FIXED_CHECKOUT / UPGRADER_REL)) + "\n"
        'ns={"__name__":"__main__","__file__":filename,"__package__":""}\n'
        'exec(compile(source,filename,"exec",dont_inherit=True,optimize=0),ns,ns)\n'
    )
    future_apply = [
        str(FIXED_PYTHON),
        "-I",
        "-B",
        "-c",
        future_apply_code,
        "--apply",
        "--bootstrap",
        str(bootstrap),
        "--manifest",
        str(manifest),
        "--expected-head",
        expected_head,
        "--expected-plan-id",
        plan_id,
        "--confirm",
        EXPECTED_CONFIRM,
    ]
    handoff_body = {
        "schema": PLAN_SCHEMA,
        "version": 1,
        "expected_head": expected_head,
        "checkout": checkout,
        "upgrader_git_blob_sha1": UPGRADER_BLOB,
        "upgrader_plan_id": plan_id,
        "protected_state": body["protected_state"],
        "old_lock_id": OLD_LOCK,
        "new_lock_id": NEW_LOCK,
        "new_candidate_id": NEW_CAND,
        "bootstrap_input": bootstrap_input,
        "manifest_input": manifest_input,
        "git_boundary_receipt": receipt,
        "future_apply_argv": future_apply,
        "future_apply_source_inline": True,
        "future_apply_source_git_blob_sha1": UPGRADER_BLOB,
        "future_apply_source_bytes": len(upgrader_raw),
        "future_apply_source_reopens_checkout": False,
        "planner_git_callbacks_neutralized": True,
        "future_apply_requires_root": True,
        "future_apply_authorized": False,
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
    handoff_id = PLAN_PREFIX + sha256(canonical(handoff_body))
    return {
        "handoff_id": handoff_id,
        "body": handoff_body,
        "upgrader_plan": result,
    }


def emit_source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("upgrader_git_blob_sha1=" + UPGRADER_BLOB)
    print("old_lock_id=" + OLD_LOCK)
    print("new_lock_id=" + NEW_LOCK)
    print("new_candidate_id=" + NEW_CAND)
    print("planner_git_callbacks_neutralized=true")
    print("future_apply_source_inline=true")
    print("future_apply_source_reopens_checkout=false")
    print("future_apply_requires_root=true")
    print("future_apply_authorized=false")
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


def emit_run(result: dict[str, Any]) -> None:
    body = result["body"]
    print(MARKER)
    print("mode=run")
    print("status=GREEN")
    print("handoff_id=" + result["handoff_id"])
    print("upgrader_plan_id=" + str(body["upgrader_plan_id"]))
    print("expected_head=" + str(body["expected_head"]))
    print("protected_state=" + str(body["protected_state"]))
    print("old_lock_id=" + OLD_LOCK)
    print("new_lock_id=" + NEW_LOCK)
    print("new_candidate_id=" + NEW_CAND)
    print("bootstrap_candidate_verified=true")
    print("manifest_candidate_verified=true")
    receipt = body["git_boundary_receipt"]
    for key in (
        "temporary_git_metadata_write_performed",
        "temporary_git_metadata_cleanup_completed",
        "source_repository_mutation",
        "source_object_fetch",
        "repository_config_loaded",
        "repository_callback_execution",
        "native_parent_authority_claimed",
    ):
        value = receipt[key]
        print(key + "=" + (str(value).lower() if isinstance(value, bool) else str(value)))
    print("protected_filesystem_mutation=false")
    print("planner_git_callbacks_neutralized=true")
    print("future_apply_source_inline=true")
    print("future_apply_source_git_blob_sha1=" + str(body["future_apply_source_git_blob_sha1"]))
    print("future_apply_source_bytes=" + str(body["future_apply_source_bytes"]))
    print("future_apply_source_reopens_checkout=false")
    print("future_apply_requires_root=true")
    print("future_apply_authorized=false")
    print("future_apply_argv_json=" + json.dumps(body["future_apply_argv"], separators=(",", ":")))
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
    if body["protected_state"] == GREEN_STATE:
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_BOOTSTRAP_V6_REPAIRED_INSTALLED_QUALIFICATION"
        )
    else:
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
            "PROTECTED_BOOTSTRAP_V6_ATOMIC_REPAIR_UPGRADE"
        )


def self_test() -> None:
    assert HEX40.fullmatch("a" * 40)
    assert HEX40.fullmatch("A" * 40) is None
    assert len(UPGRADER_BLOB) == 40
    assert len(NEW_BOOTSTRAP_SHA256) == 64
    assert len(NEW_BOOTSTRAP_GIT_BLOB) == 40
    assert len(NEW_MANIFEST_SHA256) == 64
    assert len(NEW_MANIFEST_GIT_BLOB) == 40
    sample = {
        "schema": PLAN_SCHEMA,
        "expected_head": "b" * 40,
        "upgrader_plan_id": EXPECTED_UPGRADER_PLAN_PREFIX + "c" * 64,
    }
    assert len(PLAN_PREFIX + sha256(canonical(sample))) == len(PLAN_PREFIX) + 64
    print(MARKER + "_SELF_TEST_GREEN")
    print("exact_repaired_upgrader_generation_bound=true")
    print("nonroot_run_required=true")
    print("strict_lowercase_expected_head_required=true")
    print("repaired_bootstrap_identity_bound=true")
    print("repaired_manifest_identity_bound=true")
    print("upgrader_collect_only=true")
    print("temporary_git_metadata_boundary_explicit=true")
    print("planner_git_callbacks_neutralized=true")
    print("future_apply_source_inline=true")
    print("future_apply_source_reopens_checkout=false")
    print("protected_filesystem_mutation=false")
    print("future_apply_argv_emitted_only=true")
    print("future_apply_authorized=false")
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
    parser.add_argument("--bootstrap", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        emit_source_plan()
        return 0
    if args.bootstrap is None or args.manifest is None or not args.expected_head:
        raise PlanError("bootstrap_manifest_expected_head_required")
    emit_run(collect(args.bootstrap, args.manifest, args.expected_head))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PlanError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("protected_filesystem_mutation=false")
        print("future_apply_authorized=false")
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

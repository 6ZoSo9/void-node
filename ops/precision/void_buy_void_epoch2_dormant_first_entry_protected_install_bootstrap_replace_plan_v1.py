#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import types
from typing import Any

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_REPLACE_PLAN_V1"
)
SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_replace_plan_v1"
)
PLAN_PREFIX = "voidbuye2bootstrapreplaceplan1_"
HEX40 = re.compile(r"^[0-9a-f]{40}$")

ROOT = Path(__file__).resolve().parents[2]
HELPER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v6.py"
)
HELPER_BLOB = "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"

INSTALL_PARENT = Path("/opt")
INSTALL_NAME = (
    "void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v6"
)
INSTALL_ROOT = INSTALL_PARENT / INSTALL_NAME
BIN_DIR = "bin"
BOOTSTRAP_NAME = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v6"
)
MANIFEST_NAME = "source-generation-v3.conf"
POLICY_NAME = "policy-v1.conf"

REPLACE_STAGE_NAME = "." + INSTALL_NAME + ".repair-mtimes.stage"
REPLACE_STAGE_ROOT = INSTALL_PARENT / REPLACE_STAGE_NAME
PREDECESSOR_NAME = "." + INSTALL_NAME + ".predecessor-precruft"
PREDECESSOR_ROOT = INSTALL_PARENT / PREDECESSOR_NAME

OLD_BOOTSTRAP_BYTES = 874_608
OLD_BOOTSTRAP_SHA256 = (
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
)
OLD_BOOTSTRAP_GIT_BLOB = "a91707c3e5803071fc73c3451c9bcb3b774f8b48"
OLD_MANIFEST_BYTES = 2_382
OLD_MANIFEST_SHA256 = (
    "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"
)
OLD_MANIFEST_GIT_BLOB = "6e0630af72111bd9976dcc38cdcdada1904dd067"
OLD_LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
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
NEW_LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
)
NEW_CANDIDATE_ID = (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)

POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"
)
POLICY_KEYS = (
    "schema",
    "python_sha256",
    "python_bytes",
    "git_sha256",
    "git_bytes",
)
MAX_POLICY_BYTES = 4 * 1024


class PlanError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def canonical_json(value: Any) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def direct_repo_file(relative: str, expected_blob: str) -> bytes:
    path = ROOT / relative
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > 2 * 1024 * 1024
    ):
        raise PlanError("dependency_metadata_invalid:" + relative)
    raw = path.read_bytes()
    after = path.lstat()
    for field in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid",
        "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns",
    ):
        if getattr(before, field) != getattr(after, field):
            raise PlanError("dependency_changed:" + relative)
    if git_blob(raw) != expected_blob:
        raise PlanError("dependency_blob_mismatch:" + relative)
    return raw


def load_helper() -> types.ModuleType:
    raw = direct_repo_file(HELPER_REL, HELPER_BLOB)
    module = types.ModuleType("void_e2_v6_replacement_plan_helper")
    module.__file__ = os.fspath(ROOT / HELPER_REL)
    module.__package__ = None
    module.__name__ = "void_e2_v6_replacement_plan_helper"
    try:
        exec(
            compile(
                raw.decode("utf-8", "strict"),
                HELPER_REL,
                "exec",
                dont_inherit=True,
                optimize=0,
            ),
            module.__dict__,
        )
    except BaseException as exc:
        raise PlanError("helper_load_failed") from exc
    if module.MARKER != (
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6"
    ):
        raise PlanError("helper_marker_mismatch")
    return module


def parse_policy(raw: bytes) -> dict[str, str]:
    if not raw or len(raw) > MAX_POLICY_BYTES or not raw.endswith(b"\n"):
        raise PlanError("predecessor_policy_framing_invalid")
    if b"\r" in raw or b"\0" in raw:
        raise PlanError("predecessor_policy_encoding_invalid")
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError as exc:
        raise PlanError("predecessor_policy_not_ascii") from exc
    lines = text.splitlines()
    if len(lines) != len(POLICY_KEYS):
        raise PlanError("predecessor_policy_membership_invalid")
    rows: dict[str, str] = {}
    for index, line in enumerate(lines):
        if "=" not in line:
            raise PlanError("predecessor_policy_row_invalid")
        key, value = line.split("=", 1)
        if key != POLICY_KEYS[index] or key in rows or not value:
            raise PlanError("predecessor_policy_order_invalid")
        rows[key] = value
    if rows["schema"] != POLICY_SCHEMA:
        raise PlanError("predecessor_policy_schema_invalid")
    for key in ("python_sha256", "git_sha256"):
        if re.fullmatch(r"[0-9a-f]{64}", rows[key]) is None:
            raise PlanError("predecessor_policy_digest_invalid:" + key)
    for key in ("python_bytes", "git_bytes"):
        if (
            re.fullmatch(r"[1-9][0-9]*", rows[key]) is None
            or int(rows[key]) > 512 * 1024 * 1024
        ):
            raise PlanError("predecessor_policy_size_invalid:" + key)
    return rows


def read_installed_policy(helper: types.ModuleType) -> tuple[bytes, dict[str, str]]:
    path = INSTALL_ROOT / POLICY_NAME
    try:
        before = path.lstat()
    except OSError as exc:
        raise PlanError("predecessor_policy_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != 0o444
        or not 0 < before.st_size <= MAX_POLICY_BYTES
    ):
        raise PlanError("predecessor_policy_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not helper._same_stat(before, opened):
            raise PlanError("predecessor_policy_rebound")
        raw = bytearray()
        while len(raw) < before.st_size:
            chunk = os.read(fd, min(4096, before.st_size - len(raw)))
            if not chunk:
                raise PlanError("predecessor_policy_short_read")
            raw.extend(chunk)
        if os.read(fd, 1):
            raise PlanError("predecessor_policy_grew")
        after = os.fstat(fd)
        visible = path.lstat()
        if (
            not helper._same_stat(opened, after)
            or not helper._same_stat(after, visible)
        ):
            raise PlanError("predecessor_policy_changed")
    finally:
        os.close(fd)
    value = bytes(raw)
    return value, parse_policy(value)


def verify_predecessor_root(
    helper: types.ModuleType,
    python: dict[str, Any],
    git_tool: dict[str, Any],
) -> dict[str, Any]:
    helper._trusted_directory(Path("/"))
    helper._trusted_directory(INSTALL_PARENT)
    helper._trusted_directory(INSTALL_ROOT, 0o755)
    if sorted(os.listdir(INSTALL_ROOT)) != sorted(
        (BIN_DIR, MANIFEST_NAME, POLICY_NAME)
    ):
        raise PlanError("predecessor_root_entries_invalid")
    bin_root = INSTALL_ROOT / BIN_DIR
    helper._trusted_directory(bin_root, 0o755)
    if sorted(os.listdir(bin_root)) != [BOOTSTRAP_NAME]:
        raise PlanError("predecessor_bin_entries_invalid")

    helper._verify_file(
        bin_root / BOOTSTRAP_NAME,
        expected_bytes=OLD_BOOTSTRAP_BYTES,
        expected_sha256=OLD_BOOTSTRAP_SHA256,
        expected_git_blob=OLD_BOOTSTRAP_GIT_BLOB,
        expected_mode=0o555,
    )
    helper._verify_file(
        INSTALL_ROOT / MANIFEST_NAME,
        expected_bytes=OLD_MANIFEST_BYTES,
        expected_sha256=OLD_MANIFEST_SHA256,
        expected_git_blob=OLD_MANIFEST_GIT_BLOB,
        expected_mode=0o444,
    )
    policy_raw, policy = read_installed_policy(helper)
    expected = {
        "schema": POLICY_SCHEMA,
        "python_sha256": str(python["sha256"]),
        "python_bytes": str(python["bytes"]),
        "git_sha256": str(git_tool["sha256"]),
        "git_bytes": str(git_tool["bytes"]),
    }
    if policy != expected:
        raise PlanError("predecessor_policy_not_current_tool_generation")
    if helper.build_policy(python, git_tool) != policy_raw:
        raise PlanError("predecessor_policy_builder_mismatch")
    return {
        "lock_id": OLD_LOCK_ID,
        "bootstrap_bytes": OLD_BOOTSTRAP_BYTES,
        "bootstrap_sha256": OLD_BOOTSTRAP_SHA256,
        "bootstrap_git_blob_sha1": OLD_BOOTSTRAP_GIT_BLOB,
        "manifest_bytes": OLD_MANIFEST_BYTES,
        "manifest_sha256": OLD_MANIFEST_SHA256,
        "manifest_git_blob_sha1": OLD_MANIFEST_GIT_BLOB,
        "policy_bytes": len(policy_raw),
        "policy_sha256": sha256(policy_raw),
        "policy_current_tool_generation": True,
        "root": str(INSTALL_ROOT),
    }


def auxiliary_roots_absent(helper: types.ModuleType) -> None:
    for path, reason in (
        (helper.STAGE_ROOT, "legacy_create_only_stage_present"),
        (REPLACE_STAGE_ROOT, "replacement_stage_present"),
        (PREDECESSOR_ROOT, "replacement_predecessor_present"),
    ):
        if helper._exists(path):
            raise PlanError(reason)


def emit_authority() -> None:
    print(MARKER)
    print("mode=plan-authority")
    print("authority_boundary=PRE_GIT_OBSERVATION")
    print("source_repository_mutation=false")
    print("temporary_git_metadata_write_required=true")
    print("protected_filesystem_mutation=false")
    print("target_root_mutation=false")
    print("atomic_exchange_performed=false")
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
    sys.stdout.flush()


def collect_plan(
    bootstrap: Path,
    manifest: Path,
    expected_head: str,
) -> dict[str, Any]:
    if HEX40.fullmatch(expected_head) is None:
        raise PlanError("expected_head_invalid")
    helper = load_helper()
    with helper._RepositorySnapshot(expected_head) as repository:
        lock = helper.accepted_lock(expected_head, repository=repository)
        if lock.get("lock_id") != NEW_LOCK_ID:
            raise PlanError("repaired_lock_not_current")
        checkout = helper.checkout_snapshot(expected_head, repository=repository)
        python = helper._tool_snapshot(helper.FIXED_PYTHON, helper.MAX_PYTHON_BYTES)
        git_tool = dict(repository.git_tool)
        predecessor = verify_predecessor_root(helper, python, git_tool)
        auxiliary_roots_absent(helper)

        target_bootstrap, bootstrap_snapshot = helper._read_exact_path(
            bootstrap,
            expected_bytes=NEW_BOOTSTRAP_BYTES,
            expected_sha256=NEW_BOOTSTRAP_SHA256,
            expected_git_blob=NEW_BOOTSTRAP_GIT_BLOB,
            expected_mode=0o555,
            require_root_owner=False,
        )
        target_manifest, manifest_snapshot = helper._read_exact_path(
            manifest,
            expected_bytes=NEW_MANIFEST_BYTES,
            expected_sha256=NEW_MANIFEST_SHA256,
            expected_git_blob=NEW_MANIFEST_GIT_BLOB,
            expected_mode=0o444,
            require_root_owner=False,
        )
        canonical_manifest = helper._git_object(
            expected_head,
            helper.MANIFEST_REL,
            NEW_MANIFEST_GIT_BLOB,
            repository=repository,
        )
        if target_manifest != canonical_manifest:
            raise PlanError("target_manifest_not_canonical_git_object")
        policy = helper.build_policy(python, git_tool)

        body = {
            "schema": SCHEMA,
            "version": 1,
            "expected_head": expected_head,
            "checkout": checkout,
            "accepted_repaired_lock_id": NEW_LOCK_ID,
            "accepted_repaired_candidate_id": NEW_CANDIDATE_ID,
            "target_bootstrap": bootstrap_snapshot,
            "target_manifest": manifest_snapshot,
            "target_bootstrap_sha256": sha256(target_bootstrap),
            "target_bootstrap_git_blob_sha1": git_blob(target_bootstrap),
            "target_manifest_sha256": sha256(target_manifest),
            "target_manifest_git_blob_sha1": git_blob(target_manifest),
            "predecessor": predecessor,
            "python": python,
            "git_tool": git_tool,
            "policy_bytes": len(policy),
            "policy_sha256": sha256(policy),
            "policy_preserved_across_replacement": True,
            "install_root": str(INSTALL_ROOT),
            "replacement_stage_root": str(REPLACE_STAGE_ROOT),
            "retained_predecessor_root": str(PREDECESSOR_ROOT),
            "protected_state":
                "PRECRUFT_V6_ROOT_READY_FOR_ATOMIC_REPLACEMENT",
            "create_only": False,
            "atomic_root_exchange_required": True,
            "predecessor_retention_required": True,
            "automatic_rollback_required": True,
            "replacement_apply_authorized": False,
            "source_repository_mutation": False,
            "temporary_git_metadata_write_required": True,
            "protected_filesystem_mutation": False,
            "bootstrap_execution_authorized": False,
            "inner_installer_execution_authorized": False,
            "service_mutation_authorized": False,
            "credential_access_authorized": False,
            "private_key_access_authorized": False,
            "signing_authorized": False,
            "transaction_authorized": False,
            "rpc_call_authorized": False,
            "payment_acceptance_authorized": False,
            "public_presale_activation_authorized": False,
            "wc_void_market_activation_authorized": False,
            "treasury_liquidity_action_authorized": False,
            "funds_movement_authorized": False,
            "production_host_evidence_authority": False,
        }
        return {
            "body": body,
            "plan_id": PLAN_PREFIX + sha256(canonical_json(body)),
        }


def plan(bootstrap: Path, manifest: Path, expected_head: str) -> None:
    emit_authority()
    result = collect_plan(bootstrap, manifest, expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("status=GREEN")
    print("plan_id=" + result["plan_id"])
    print("expected_head=" + expected_head)
    print("accepted_repaired_lock_id=" + NEW_LOCK_ID)
    print("accepted_repaired_candidate_id=" + NEW_CANDIDATE_ID)
    print("predecessor_lock_id=" + OLD_LOCK_ID)
    print("predecessor_bootstrap_sha256=" + OLD_BOOTSTRAP_SHA256)
    print("predecessor_manifest_sha256=" + OLD_MANIFEST_SHA256)
    print("target_bootstrap_sha256=" + NEW_BOOTSTRAP_SHA256)
    print("target_manifest_sha256=" + NEW_MANIFEST_SHA256)
    print("policy_sha256=" + str(body["policy_sha256"]))
    print("policy_bytes=" + str(body["policy_bytes"]))
    print("policy_preserved_across_replacement=true")
    print("create_only=false")
    print("atomic_root_exchange_required=true")
    print("predecessor_retention_required=true")
    print("automatic_rollback_required=true")
    print("replacement_apply_authorized=false")
    print("protected_filesystem_mutation=false")
    print("atomic_exchange_performed=false")
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
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_BOOTSTRAP_V6_ATOMIC_REPLACEMENT_V1"
    )


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("helper_blob=" + HELPER_BLOB)
    print("predecessor_bootstrap_sha256=" + OLD_BOOTSTRAP_SHA256)
    print("predecessor_manifest_sha256=" + OLD_MANIFEST_SHA256)
    print("target_bootstrap_sha256=" + NEW_BOOTSTRAP_SHA256)
    print("target_manifest_sha256=" + NEW_MANIFEST_SHA256)
    print("accepted_repaired_lock_id=" + NEW_LOCK_ID)
    print("create_only=false")
    print("atomic_root_exchange_required=true")
    print("predecessor_retention_required=true")
    print("automatic_rollback_required=true")
    print("replacement_apply_authorized=false")
    print("protected_filesystem_mutation=false")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("funds_movement=false")


def self_test() -> None:
    assert len(HELPER_BLOB) == 40
    assert OLD_BOOTSTRAP_BYTES == NEW_BOOTSTRAP_BYTES == 874_608
    assert OLD_BOOTSTRAP_SHA256 != NEW_BOOTSTRAP_SHA256
    assert OLD_MANIFEST_SHA256 != NEW_MANIFEST_SHA256
    assert PREDECESSOR_ROOT != INSTALL_ROOT != REPLACE_STAGE_ROOT
    policy = (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + "1" * 64 + "\n"
        + "python_bytes=123\n"
        + "git_sha256=" + "2" * 64 + "\n"
        + "git_bytes=456\n"
    ).encode("ascii")
    rows = parse_policy(policy)
    assert rows["python_bytes"] == "123"
    body = {
        "schema": SCHEMA,
        "version": 1,
        "predecessor": OLD_BOOTSTRAP_SHA256,
        "target": NEW_BOOTSTRAP_SHA256,
        "atomic_root_exchange_required": True,
        "replacement_apply_authorized": False,
    }
    plan_id = PLAN_PREFIX + sha256(canonical_json(body))
    assert re.fullmatch(PLAN_PREFIX + r"[0-9a-f]{64}", plan_id)
    own = Path(__file__).read_text("utf-8")
    parsed = ast.parse(own, filename=str(Path(__file__)))
    function_names = {
        node.name
        for node in parsed.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    assert "apply" not in function_names
    string_constants = {
        node.value
        for node in ast.walk(parsed)
        if isinstance(node, ast.Constant) and isinstance(node.value, str)
    }
    assert "--apply" not in string_constants
    forbidden_os_calls = {
        "mkdir", "rename", "replace", "unlink", "rmdir", "fchmod", "fchown",
    }
    observed_mutations = []
    for node in ast.walk(parsed):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "os"
            and node.func.attr in forbidden_os_calls
        ):
            observed_mutations.append(node.func.attr)
    assert observed_mutations == []
    print(MARKER + "_SELF_TEST_GREEN")
    print("plan_only=true")
    print("predecessor_generation_exact=true")
    print("target_repaired_generation_exact=true")
    print("policy_preservation_required=true")
    print("atomic_root_exchange_required=true")
    print("predecessor_retention_required=true")
    print("automatic_rollback_required=true")
    print("replacement_apply_authorized=false")
    print("protected_filesystem_mutation=false")
    print("bootstrap_execution=false")
    print("inner_installer_execution=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    parser.add_argument("--bootstrap", type=Path)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if args.bootstrap is None or args.manifest is None or not args.expected_head:
        raise PlanError("bootstrap_manifest_expected_head_required")
    plan(args.bootstrap, args.manifest, args.expected_head)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc).replace("\n", " ")[:1024])
        print("protected_filesystem_mutation=false")
        print("atomic_exchange_performed=false")
        print("bootstrap_execution=false")
        print("inner_installer_execution=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("funds_movement=false")
        raise SystemExit(2)

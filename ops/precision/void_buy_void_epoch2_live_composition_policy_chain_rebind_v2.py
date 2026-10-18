#!/usr/bin/env python3
"""Atomic second-hop V6R2 policy HEAD rebind with two retained predecessors."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import stat
import sys
import tempfile
import types
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
V1_REL = "ops/precision/void_buy_void_epoch2_live_composition_policy_head_rebind_v1.py"
V1_SOURCE = ROOT / V1_REL
V1_BLOB = "37ab46ca5b77a642d84ad18c61388c30f4d63881"
INSTALLER_REL = "ops/precision/void_buy_void_epoch2_live_composition_native_protected_install_v5.py"
INSTALLER_BLOB = "fd7a06490ccf6fb14831d8b0372a892e2764c9dc"

MARKER = "VOID_BUY_VOID_EPOCH2_V6R2_POLICY_CHAIN_REBIND_V2"
CONFIRM_TOKEN = "ATOMIC_EXCHANGE_EPOCH2_V6R2_POLICY_CHAIN_REBIND_V2"
PLAN_PREFIX = "voidbuye2polchainrebind2_"
PLAN_SCHEMA = "void_buy_void_epoch2_v6r2_policy_chain_rebind_plan_v2"

ORIGINAL_HEAD = "65b4515b78e467afb399b510037e8c64256e87a5"
ORIGINAL_POLICY_BYTES = 305
ORIGINAL_POLICY_SHA256 = "dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9"

PREVIOUS_HEAD = "b92ba19cf16ea5f147c441e15de12b9932ca94c3"
PREVIOUS_POLICY_BYTES = 305
PREVIOUS_POLICY_SHA256 = "9d18271055dc430335a6607a426c3082f950148087b87a6bc790a818d8b6286d"

STAGE_NAME = ".void-buy-void-epoch2-live-composition-v3.policy-chain-rebind-b92.stage"
ORIGINAL_BACKUP_NAME = (
    ".void-buy-void-epoch2-live-composition-v3.policy-predecessor-65b4515b"
)
PREVIOUS_BACKUP_NAME = (
    ".void-buy-void-epoch2-live-composition-v3.policy-predecessor-b92ba19c"
)

READY_STATE = "EPOCH2_V6R2_POLICY_B92_READY_FOR_CHAIN_REBIND"
GREEN_STATE = "EPOCH2_V6R2_POLICY_HEAD_REBOUND_WITH_65B_AND_B92_POLICIES_RETAINED"

RENAME_NOREPLACE = 1
RENAME_EXCHANGE = 2
MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_READ_CHUNK = 1024 * 1024


class RebindError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    header = ("blob " + str(len(raw)) + "\0").encode("ascii")
    return hashlib.sha1(header + raw).hexdigest()


def canonical_json(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def _read_bound_source(path: pathlib.Path, expected_blob: str) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise RebindError("source_lstat_failed:" + path.name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or before.st_nlink != 1
        or before.st_size <= 0
        or before.st_size > MAX_SOURCE_BYTES
        or (before.st_mode & 0o022) != 0
    ):
        raise RebindError("source_metadata_invalid:" + path.name)
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise RebindError("source_read_failed:" + path.name) from exc
    try:
        after = path.lstat()
    except OSError as exc:
        raise RebindError("source_relstat_failed:" + path.name) from exc
    if (
        before.st_dev != after.st_dev
        or before.st_ino != after.st_ino
        or before.st_mode != after.st_mode
        or before.st_uid != after.st_uid
        or before.st_gid != after.st_gid
        or before.st_nlink != after.st_nlink
        or before.st_size != after.st_size
        or before.st_mtime_ns != after.st_mtime_ns
        or before.st_ctime_ns != after.st_ctime_ns
    ):
        raise RebindError("source_changed_during_read:" + path.name)
    if git_blob_sha1(raw) != expected_blob:
        raise RebindError("source_git_blob_mismatch:" + path.name)
    return raw


def _load_v1() -> types.ModuleType:
    raw = _read_bound_source(V1_SOURCE, V1_BLOB)
    module = types.ModuleType("void_buy_void_epoch2_live_composition_policy_head_rebind_v1")
    module.__file__ = str(V1_SOURCE)
    exec(compile(raw, str(V1_SOURCE), "exec", dont_inherit=True, optimize=0), module.__dict__)
    if getattr(module, "INSTALLER_SOURCE_GIT_BLOB_SHA1", "") != INSTALLER_BLOB:
        raise RebindError("v1_installer_blob_binding_mismatch")
    return module


def _load_installer(v1: types.ModuleType) -> Any:
    try:
        installer = v1._load_installer()
    except BaseException as exc:
        raise RebindError("installer_verified_load_failed") from exc
    return installer


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_mode == b.st_mode
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _exists(path: pathlib.Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False


def _hash_exact_file(
    path: pathlib.Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_mode: int,
) -> None:
    try:
        before = path.lstat()
    except OSError as exc:
        raise RebindError("file_lstat_failed:" + path.name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or before.st_size != expected_bytes
    ):
        raise RebindError("file_metadata_invalid:" + path.name)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_stat(before, opened):
            raise RebindError("file_rebound:" + path.name)
        digest = hashlib.sha256()
        remaining = expected_bytes
        while remaining:
            chunk = os.read(fd, min(MAX_READ_CHUNK, remaining))
            if not chunk:
                raise RebindError("file_short_read:" + path.name)
            digest.update(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise RebindError("file_grew:" + path.name)
        after = os.fstat(fd)
        visible = path.lstat()
        if not _same_stat(opened, after) or not _same_stat(after, visible):
            raise RebindError("file_changed:" + path.name)
    finally:
        os.close(fd)
    if digest.hexdigest() != expected_sha256:
        raise RebindError("file_sha256_mismatch:" + path.name)


def _derive_policy(
    installer: Any,
    head: str,
    node: dict[str, Any],
    *,
    expected_sha256: str | None = None,
) -> bytes:
    policy = installer.build_policy(head, node)
    if len(policy) != PREVIOUS_POLICY_BYTES:
        raise RebindError("policy_bytes_unexpected:" + head[:8])
    if expected_sha256 is not None and sha256(policy) != expected_sha256:
        raise RebindError("policy_identity_mismatch:" + head[:8])
    return policy


def _verify_current_with_policy(installer: Any, policy: bytes) -> None:
    installer._verify_root_generation(
        installer.INSTALL_ROOT,
        native_bytes=installer.NATIVE_BYTES,
        native_sha256=installer.NATIVE_SHA256,
        runner_bytes=installer.RUNNER_BYTES,
        runner_sha256=installer.RUNNER_SHA256,
        policy_bytes=len(policy),
        policy_sha256=sha256(policy),
    )


def _verify_v4_predecessor(installer: Any) -> None:
    installer._verify_predecessor_root(installer.PREDECESSOR_ROOT)


def _verify_original_backup(installer: Any) -> None:
    _hash_exact_file(
        installer.INSTALL_PARENT / ORIGINAL_BACKUP_NAME,
        expected_bytes=ORIGINAL_POLICY_BYTES,
        expected_sha256=ORIGINAL_POLICY_SHA256,
        expected_mode=0o444,
    )


def _verify_previous_backup(installer: Any) -> None:
    _hash_exact_file(
        installer.INSTALL_PARENT / PREVIOUS_BACKUP_NAME,
        expected_bytes=PREVIOUS_POLICY_BYTES,
        expected_sha256=PREVIOUS_POLICY_SHA256,
        expected_mode=0o444,
    )


def protected_state(
    installer: Any,
    *,
    previous_policy: bytes,
    new_policy: bytes,
) -> str:
    installer._trusted_root_directory(pathlib.Path("/"))
    installer._trusted_root_directory(installer.INSTALL_PARENT)
    if _exists(installer.INSTALL_PARENT / STAGE_NAME):
        raise RebindError("policy_chain_rebind_stage_present")
    if not _exists(installer.INSTALL_PARENT / ORIGINAL_BACKUP_NAME):
        raise RebindError("original_65b_policy_backup_missing")
    _verify_original_backup(installer)
    _verify_v4_predecessor(installer)
    if _exists(installer.INSTALL_PARENT / PREVIOUS_BACKUP_NAME):
        _verify_current_with_policy(installer, new_policy)
        _verify_previous_backup(installer)
        return GREEN_STATE
    _verify_current_with_policy(installer, previous_policy)
    return READY_STATE


def collect_plan(expected_head: str) -> dict[str, Any]:
    if (
        len(expected_head) != 40
        or any(ch not in "0123456789abcdef" for ch in expected_head)
    ):
        raise RebindError("expected_head_invalid")
    if expected_head in (ORIGINAL_HEAD, PREVIOUS_HEAD):
        raise RebindError("expected_head_not_successor")

    v1 = _load_v1()
    installer = _load_installer(v1)
    installer.accepted_lock()
    checkout_bound = installer.checkout_snapshot_with_tools(expected_head)
    node = installer.node_snapshot()

    _derive_policy(
        installer,
        ORIGINAL_HEAD,
        node,
        expected_sha256=ORIGINAL_POLICY_SHA256,
    )
    previous_policy = _derive_policy(
        installer,
        PREVIOUS_HEAD,
        node,
        expected_sha256=PREVIOUS_POLICY_SHA256,
    )
    new_policy = _derive_policy(installer, expected_head, node)
    if sha256(new_policy) in (ORIGINAL_POLICY_SHA256, PREVIOUS_POLICY_SHA256):
        raise RebindError("new_policy_not_distinct")

    state = protected_state(
        installer,
        previous_policy=previous_policy,
        new_policy=new_policy,
    )
    body = {
        "schema": PLAN_SCHEMA,
        "version": 2,
        "expected_head": expected_head,
        "original_head": ORIGINAL_HEAD,
        "original_policy_sha256": ORIGINAL_POLICY_SHA256,
        "original_policy_bytes": ORIGINAL_POLICY_BYTES,
        "previous_head": PREVIOUS_HEAD,
        "previous_policy_sha256": PREVIOUS_POLICY_SHA256,
        "previous_policy_bytes": PREVIOUS_POLICY_BYTES,
        "new_policy_sha256": sha256(new_policy),
        "new_policy_bytes": len(new_policy),
        "native_sha256": installer.NATIVE_SHA256,
        "native_bytes": installer.NATIVE_BYTES,
        "runner_sha256": installer.RUNNER_SHA256,
        "runner_bytes": installer.RUNNER_BYTES,
        "v4_predecessor_native_sha256": installer.PREDECESSOR_NATIVE_SHA256,
        "v4_predecessor_runner_sha256": installer.PREDECESSOR_RUNNER_SHA256,
        "v4_predecessor_policy_sha256": installer.PREDECESSOR_POLICY_SHA256,
        "checkout": checkout_bound["checkout"],
        "git_tool": checkout_bound["git_tool"],
        "setpriv_tool": checkout_bound["setpriv_tool"],
        "node": node,
        "protected_state": state,
        "original_policy_retained_required": True,
        "previous_policy_retention_required": True,
        "policy_atomic_exchange_required": True,
        "automatic_rollback_required": True,
        "native_mutation_authorized": False,
        "runner_mutation_authorized": False,
        "live_execution_authorized": False,
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
    }
    return {
        "v1": v1,
        "installer": installer,
        "body": body,
        "plan_id": PLAN_PREFIX + sha256(canonical_json(body)),
        "previous_policy": previous_policy,
        "new_policy": new_policy,
    }


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("v1_source_git_blob_sha1=" + V1_BLOB)
    print("installer_source_git_blob_sha1=" + INSTALLER_BLOB)
    print("original_head=" + ORIGINAL_HEAD)
    print("original_policy_sha256=" + ORIGINAL_POLICY_SHA256)
    print("previous_head=" + PREVIOUS_HEAD)
    print("previous_policy_sha256=" + PREVIOUS_POLICY_SHA256)
    print("original_policy_retained_required=true")
    print("previous_policy_retention_required=true")
    print("policy_atomic_exchange_required=true")
    print("automatic_rollback_required=true")
    print("native_mutation_authorized=false")
    print("runner_mutation_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")


def plan(expected_head: str) -> None:
    result = collect_plan(expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("expected_head=" + expected_head)
    print("plan_id=" + result["plan_id"])
    print("protected_state=" + str(body["protected_state"]))
    print("original_head=" + ORIGINAL_HEAD)
    print("original_policy_sha256=" + ORIGINAL_POLICY_SHA256)
    print("previous_head=" + PREVIOUS_HEAD)
    print("previous_policy_sha256=" + PREVIOUS_POLICY_SHA256)
    print("new_policy_sha256=" + str(body["new_policy_sha256"]))
    print("policy_bytes=" + str(body["new_policy_bytes"]))
    print("native_sha256=" + str(body["native_sha256"]))
    print("runner_sha256=" + str(body["runner_sha256"]))
    print("original_policy_retained_required=true")
    print("previous_policy_retention_required=true")
    print("policy_atomic_exchange_required=true")
    print("automatic_rollback_required=true")
    print("filesystem_write=false")
    print("native_mutation_authorized=false")
    print("runner_mutation_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")
    if body["protected_state"] == GREEN_STATE:
        print("already_rebound=true")
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R2_"
            "INSTALLED_READ_ONLY_QUALIFICATION_V5"
        )
    else:
        print("already_rebound=false")
        print(
            "next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R2_"
            "POLICY_CHAIN_ATOMIC_REBIND_V2"
        )


def _write_stage(
    installer: Any,
    opt_fd: int,
    new_policy: bytes,
) -> None:
    fd: int | None = None
    try:
        fd = os.open(
            STAGE_NAME,
            os.O_WRONLY
            | os.O_CREAT
            | os.O_EXCL
            | os.O_CLOEXEC
            | os.O_NOFOLLOW,
            0o400,
            dir_fd=opt_fd,
        )
        os.fchown(fd, 0, 0)
        view = memoryview(new_policy)
        offset = 0
        while offset < len(view):
            wrote = os.write(fd, view[offset:])
            if wrote <= 0:
                raise RebindError("stage_short_write")
            offset += wrote
        os.fchmod(fd, 0o444)
        os.fsync(fd)
    finally:
        if fd is not None:
            os.close(fd)
    _hash_exact_file(
        installer.INSTALL_PARENT / STAGE_NAME,
        expected_bytes=len(new_policy),
        expected_sha256=sha256(new_policy),
        expected_mode=0o444,
    )
    os.fsync(opt_fd)


def _remove_verified_new_policy(
    installer: Any,
    opt_fd: int,
    new_policy: bytes,
    name: str,
) -> None:
    _hash_exact_file(
        installer.INSTALL_PARENT / name,
        expected_bytes=len(new_policy),
        expected_sha256=sha256(new_policy),
        expected_mode=0o444,
    )
    os.unlink(name, dir_fd=opt_fd)
    os.fsync(opt_fd)


_FAILURE_PHASES = frozenset(
    {
        "pre_exchange",
        "stage_write",
        "pre_exchange_revalidation",
        "policy_exchanged",
        "post_exchange_verification",
        "previous_backup_retained",
        "post_backup_revalidation",
    }
)


def _classify_final_protected_state(
    installer: Any,
    *,
    previous_policy: bytes,
    new_policy: bytes,
) -> tuple[bool, str]:
    try:
        state = protected_state(
            installer,
            previous_policy=previous_policy,
            new_policy=new_policy,
        )
    except BaseException:
        return False, "UNKNOWN"
    if state not in (READY_STATE, GREEN_STATE):
        return False, "UNKNOWN"
    return True, state


def _failure_receipt(
    *,
    failure_phase: str,
    policy_exchange_performed: bool,
    rollback_attempted: bool,
    rollback_green: bool | None,
    final_state_verified: bool,
    final_state: str,
) -> dict[str, Any]:
    if failure_phase not in _FAILURE_PHASES:
        raise RebindError("failure_receipt_phase_invalid")
    if policy_exchange_performed and failure_phase in {
        "pre_exchange",
        "stage_write",
        "pre_exchange_revalidation",
    }:
        raise RebindError("failure_receipt_exchange_phase_invalid")
    if not rollback_attempted and rollback_green is not None:
        raise RebindError("failure_receipt_rollback_state_invalid")
    if rollback_attempted and not isinstance(rollback_green, bool):
        raise RebindError("failure_receipt_rollback_state_invalid")
    if final_state_verified:
        if final_state not in (READY_STATE, GREEN_STATE):
            raise RebindError("failure_receipt_final_state_invalid")
    elif final_state != "UNKNOWN":
        raise RebindError("failure_receipt_final_state_invalid")
    return {
        "authority_boundary": "FINAL_FAILURE_RECEIPT",
        "failure_phase": failure_phase,
        "policy_exchange_performed": policy_exchange_performed,
        "policy_publication_performed": policy_exchange_performed,
        "automatic_rollback_attempted": rollback_attempted,
        "automatic_rollback_green": rollback_green,
        "final_state_verified": final_state_verified,
        "final_state": final_state,
    }


def _emit_failure_receipt(receipt: dict[str, Any]) -> None:
    print(MARKER)
    print("mode=apply")
    print("status=HOLD")
    for key in (
        "authority_boundary",
        "failure_phase",
        "policy_exchange_performed",
        "policy_publication_performed",
        "automatic_rollback_attempted",
        "automatic_rollback_green",
        "final_state_verified",
        "final_state",
    ):
        value = receipt[key]
        if isinstance(value, bool):
            rendered = str(value).lower()
        elif value is None:
            rendered = "not_applicable"
        else:
            rendered = str(value)
        print(key + "=" + rendered)
    sys.stdout.flush()


def emit_operation_authority() -> None:
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("filesystem_mutation_possible=true")
    print("filesystem_mutation_performed_at_pre_mutation_boundary=false")
    print("policy_atomic_exchange_authorized=true")
    print("original_policy_retention_required=true")
    print("previous_policy_retention_required=true")
    print("automatic_rollback_required=true")
    print("native_mutation_authorized=false")
    print("runner_mutation_authorized=false")
    print("live_execution=false")
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


def apply(expected_head: str, expected_plan_id: str, confirm: str) -> None:
    emit_operation_authority()
    if confirm != CONFIRM_TOKEN:
        raise RebindError("explicit_policy_chain_rebind_confirmation_required")
    if os.geteuid() != 0:
        raise RebindError("root_required_for_apply")

    initial = collect_plan(expected_head)
    v1 = initial["v1"]
    try:
        v1._require_secure_apply_context()
    except BaseException as exc:
        raise RebindError(str(exc)) from exc

    if initial["plan_id"] != expected_plan_id:
        raise RebindError("expected_plan_id_mismatch")

    installer = initial["installer"]
    body = initial["body"]
    previous_policy = initial["previous_policy"]
    new_policy = initial["new_policy"]

    if body["protected_state"] == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("policy_chain_rebind_performed=false")
        print("original_policy_retained=true")
        print("previous_policy_retained=true")
        print("native_mutation=false")
        print("runner_mutation=false")
        print("live_execution=false")
        print("credential_access=false")
        print("transaction=false")
        print("funds_movement=false")
        return
    if body["protected_state"] != READY_STATE:
        raise RebindError("apply_state_not_chain_rebind_ready")

    opt_fd = os.open(
        installer.INSTALL_PARENT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    root_fd = os.open(
        installer.INSTALL_ROOT,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    stage_created = False
    exchanged = False
    previous_backup_retained = False
    rollback_attempted = False
    rollback_green = False
    failure_phase = "pre_exchange"
    try:
        if _exists(installer.INSTALL_PARENT / STAGE_NAME):
            raise RebindError("policy_chain_rebind_stage_present")
        if _exists(installer.INSTALL_PARENT / PREVIOUS_BACKUP_NAME):
            raise RebindError("previous_policy_backup_present")

        _verify_original_backup(installer)
        failure_phase = "stage_write"
        _write_stage(installer, opt_fd, new_policy)
        stage_created = True
        failure_phase = "pre_exchange_revalidation"

        checkout_bound = installer.checkout_snapshot_with_tools(
            expected_head,
            expected_git=body["git_tool"],
            expected_setpriv=body["setpriv_tool"],
        )
        if checkout_bound["checkout"] != body["checkout"]:
            raise RebindError("checkout_generation_changed_before_exchange")
        if installer.node_snapshot() != body["node"]:
            raise RebindError("node_generation_changed_before_exchange")
        _verify_current_with_policy(installer, previous_policy)
        _verify_original_backup(installer)
        _verify_v4_predecessor(installer)

        v1._renameat2(
            opt_fd,
            STAGE_NAME,
            root_fd,
            installer.POLICY_NAME,
            RENAME_EXCHANGE,
        )
        exchanged = True
        failure_phase = "policy_exchanged"
        os.fsync(root_fd)
        os.fsync(opt_fd)

        _verify_current_with_policy(installer, new_policy)
        _verify_original_backup(installer)
        _verify_v4_predecessor(installer)
        _hash_exact_file(
            installer.INSTALL_PARENT / STAGE_NAME,
            expected_bytes=PREVIOUS_POLICY_BYTES,
            expected_sha256=PREVIOUS_POLICY_SHA256,
            expected_mode=0o444,
        )
        failure_phase = "post_exchange_verification"

        v1._renameat2(
            opt_fd,
            STAGE_NAME,
            opt_fd,
            PREVIOUS_BACKUP_NAME,
            RENAME_NOREPLACE,
        )
        stage_created = False
        previous_backup_retained = True
        failure_phase = "previous_backup_retained"
        os.fsync(opt_fd)

        failure_phase = "post_backup_revalidation"
        if (
            installer.checkout_snapshot_with_tools(
                expected_head,
                expected_git=body["git_tool"],
                expected_setpriv=body["setpriv_tool"],
            )["checkout"]
            != body["checkout"]
        ):
            raise RebindError("checkout_generation_changed_after_exchange")
        if installer.node_snapshot() != body["node"]:
            raise RebindError("node_generation_changed_after_exchange")
        if (
            protected_state(
                installer,
                previous_policy=previous_policy,
                new_policy=new_policy,
            )
            != GREEN_STATE
        ):
            raise RebindError("post_chain_rebind_state_not_green")
    except BaseException:
        if exchanged:
            rollback_attempted = True
            try:
                if previous_backup_retained:
                    v1._renameat2(
                        opt_fd,
                        PREVIOUS_BACKUP_NAME,
                        root_fd,
                        installer.POLICY_NAME,
                        RENAME_EXCHANGE,
                    )
                    previous_backup_retained = False
                    _remove_verified_new_policy(
                        installer,
                        opt_fd,
                        new_policy,
                        PREVIOUS_BACKUP_NAME,
                    )
                else:
                    v1._renameat2(
                        opt_fd,
                        STAGE_NAME,
                        root_fd,
                        installer.POLICY_NAME,
                        RENAME_EXCHANGE,
                    )
                    _remove_verified_new_policy(
                        installer,
                        opt_fd,
                        new_policy,
                        STAGE_NAME,
                    )
                    stage_created = False
                _verify_current_with_policy(installer, previous_policy)
                _verify_original_backup(installer)
                _verify_v4_predecessor(installer)
                rollback_green = True
            except BaseException:
                rollback_green = False
        elif stage_created:
            rollback_attempted = True
            try:
                _remove_verified_new_policy(
                    installer,
                    opt_fd,
                    new_policy,
                    STAGE_NAME,
                )
                stage_created = False
                rollback_green = True
            except BaseException:
                rollback_green = False

        final_state_verified, final_state = _classify_final_protected_state(
            installer,
            previous_policy=previous_policy,
            new_policy=new_policy,
        )
        receipt = _failure_receipt(
            failure_phase=failure_phase,
            policy_exchange_performed=exchanged,
            rollback_attempted=rollback_attempted,
            rollback_green=rollback_green if rollback_attempted else None,
            final_state_verified=final_state_verified,
            final_state=final_state,
        )
        _emit_failure_receipt(receipt)
        raise
    finally:
        os.close(root_fd)
        os.close(opt_fd)

    print(MARKER)
    print("mode=apply")
    print("expected_head=" + expected_head)
    print("plan_id=" + expected_plan_id)
    print("policy_chain_rebind_performed=true")
    print("publication_state=atomic_policy_exchange_verified")
    print("final_state_verified=true")
    print("original_policy_retained=true")
    print("previous_policy_retained=true")
    print("original_policy_sha256=" + ORIGINAL_POLICY_SHA256)
    print("previous_policy_sha256=" + PREVIOUS_POLICY_SHA256)
    print("new_policy_sha256=" + str(body["new_policy_sha256"]))
    print("native_sha256=" + str(body["native_sha256"]))
    print("runner_sha256=" + str(body["runner_sha256"]))
    print("native_mutation=false")
    print("runner_mutation=false")
    print("live_execution=false")
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
    print("next_action=EPOCH2_V6R2_INSTALLED_READ_ONLY_QUALIFICATION_V5")


def self_test() -> None:
    v1 = _load_v1()
    installer = _load_installer(v1)
    installer.accepted_lock()

    assert ORIGINAL_HEAD == "65b4515b78e467afb399b510037e8c64256e87a5"
    assert ORIGINAL_POLICY_SHA256 == (
        "dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9"
    )
    assert PREVIOUS_HEAD == "b92ba19cf16ea5f147c441e15de12b9932ca94c3"
    assert PREVIOUS_POLICY_SHA256 == (
        "9d18271055dc430335a6607a426c3082f950148087b87a6bc790a818d8b6286d"
    )
    assert installer.NATIVE_BYTES == 726_976
    assert installer.RUNNER_BYTES == 45_147

    immediate = _failure_receipt(
        failure_phase="policy_exchanged",
        policy_exchange_performed=True,
        rollback_attempted=True,
        rollback_green=True,
        final_state_verified=True,
        final_state=READY_STATE,
    )
    assert immediate["policy_publication_performed"] is True
    assert immediate["automatic_rollback_green"] is True

    uncertain = _failure_receipt(
        failure_phase="post_backup_revalidation",
        policy_exchange_performed=True,
        rollback_attempted=True,
        rollback_green=False,
        final_state_verified=False,
        final_state="UNKNOWN",
    )
    assert uncertain["policy_publication_performed"] is True
    assert uncertain["automatic_rollback_green"] is False

    with tempfile.TemporaryDirectory(
        prefix="void-e2-v6r2-policy-chain-rebind-self-test-"
    ) as td:
        parent = pathlib.Path(td)
        root = parent / "root"
        root.mkdir()
        stage = parent / "stage"
        policy = root / "policy"
        stage.write_bytes(b"new-policy")
        policy.write_bytes(b"previous-policy")
        parent_fd = os.open(
            parent,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC,
        )
        root_fd = os.open(
            root,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC,
        )
        try:
            v1._renameat2(
                parent_fd,
                "stage",
                root_fd,
                "policy",
                RENAME_EXCHANGE,
            )
            assert stage.read_bytes() == b"previous-policy"
            assert policy.read_bytes() == b"new-policy"
            v1._renameat2(
                parent_fd,
                "stage",
                root_fd,
                "policy",
                RENAME_EXCHANGE,
            )
            assert stage.read_bytes() == b"new-policy"
            assert policy.read_bytes() == b"previous-policy"
        finally:
            os.close(root_fd)
            os.close(parent_fd)

    print(MARKER + "_SELF_TEST_GREEN")
    print("v1_atomic_primitive_source_bound=true")
    print("installer_source_blob_bound=true")
    print("original_65b_policy_identity_bound=true")
    print("previous_b92_policy_identity_bound=true")
    print("two_predecessor_retention_required=true")
    print("atomic_cross_directory_policy_exchange_exercised=true")
    print("automatic_rollback_required=true")
    print("publication_aware_failure_receipt=true")
    print("native_mutation_authorized=false")
    print("runner_mutation_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("funds_movement_authorized=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--expected-head", default="")
    parser.add_argument("--expected-plan-id", default="")
    parser.add_argument("--confirm", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.expected_head:
        raise RebindError("expected_head_required")
    if args.plan:
        plan(args.expected_head)
        return 0
    if not args.expected_plan_id:
        raise RebindError("expected_plan_id_required")
    apply(args.expected_head, args.expected_plan_id, args.confirm)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RebindError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("native_mutation=false")
        print("runner_mutation=false")
        print("live_execution=false")
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
        raise SystemExit(2)

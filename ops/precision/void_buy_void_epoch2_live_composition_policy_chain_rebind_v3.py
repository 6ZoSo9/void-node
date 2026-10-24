#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import os
import pathlib
import stat
import sys
import tempfile
import types
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
V2_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_policy_chain_rebind_v2.py"
)
V2_SOURCE = ROOT / V2_REL
V2_BLOB = "891cce24244c62756caeba6d2bf702cc92e8a956"

MARKER = "VOID_BUY_VOID_EPOCH2_V6R2_POLICY_CHAIN_REBIND_V3"
CONFIRM_TOKEN = "ATOMIC_EXCHANGE_EPOCH2_V6R2_POLICY_CHAIN_REBIND_V3"
PLAN_PREFIX = "voidbuye2polchainrebind3_"
PLAN_SCHEMA = "void_buy_void_epoch2_v6r2_policy_chain_rebind_plan_v3"

IMMEDIATE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
IMMEDIATE_POLICY_BYTES = 305
IMMEDIATE_POLICY_SHA256 = (
    "746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549"
)

STAGE_NAME = (
    ".void-buy-void-epoch2-live-composition-v3."
    "policy-chain-rebind-4c80887.stage"
)
IMMEDIATE_BACKUP_NAME = (
    ".void-buy-void-epoch2-live-composition-v3."
    "policy-predecessor-4c80887a"
)

READY_STATE = "EPOCH2_V6R2_POLICY_4C80887_READY_FOR_CHAIN_REBIND"
GREEN_STATE = (
    "EPOCH2_V6R2_POLICY_HEAD_REBOUND_WITH_"
    "65B_B92_AND_4C80887_POLICIES_RETAINED"
)

RENAME_NOREPLACE = 1
RENAME_EXCHANGE = 2
MAX_SOURCE_BYTES = 2 * 1024 * 1024


class RebindError(RuntimeError):
    pass


class StageWriteError(RebindError):
    def __init__(
        self,
        reason: str,
        *,
        cleanup_attempted: bool,
        cleanup_green: bool,
    ) -> None:
        super().__init__(reason)
        self.cleanup_attempted = cleanup_attempted
        self.cleanup_green = cleanup_green


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    header = ("blob " + str(len(raw)) + "\0").encode("ascii")
    return hashlib.sha1(header + raw).hexdigest()


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


def _read_bound_source(path: pathlib.Path, expected_blob: str) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise RebindError("source_lstat_failed:" + path.name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size <= 0
        or before.st_size > MAX_SOURCE_BYTES
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
    if not _same_stat(before, after):
        raise RebindError("source_changed_during_read:" + path.name)
    if git_blob_sha1(raw) != expected_blob:
        raise RebindError("source_git_blob_mismatch:" + path.name)
    return raw


def _load_v2() -> types.ModuleType:
    raw = _read_bound_source(V2_SOURCE, V2_BLOB)
    module = types.ModuleType(
        "void_buy_void_epoch2_live_composition_policy_chain_rebind_v2"
    )
    module.__file__ = str(V2_SOURCE)
    module.__package__ = ""
    exec(
        compile(raw, str(V2_SOURCE), "exec", dont_inherit=True, optimize=0),
        module.__dict__,
    )
    return module


def _load_installer(v2: types.ModuleType) -> tuple[types.ModuleType, Any]:
    try:
        v1 = v2._load_v1()
        installer = v2._load_installer(v1)
    except BaseException as exc:
        raise RebindError("verified_dependency_load_failed") from exc
    return v1, installer


def _exists(path: pathlib.Path) -> bool:
    try:
        path.lstat()
        return True
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise RebindError("path_lstat_failed:" + str(path)) from exc


def _verify_immediate_backup(v2: types.ModuleType, installer: Any) -> None:
    v2._hash_exact_file(
        installer.INSTALL_PARENT / IMMEDIATE_BACKUP_NAME,
        expected_bytes=IMMEDIATE_POLICY_BYTES,
        expected_sha256=IMMEDIATE_POLICY_SHA256,
        expected_mode=0o444,
    )


def _verify_prior_lineage(
    v1: types.ModuleType,
    v2: types.ModuleType,
    installer: Any,
) -> None:
    for stage_name in (v1.STAGE_NAME, v2.STAGE_NAME):
        if _exists(installer.INSTALL_PARENT / stage_name):
            raise RebindError("prior_policy_rebind_stage_present:" + stage_name)
    v2._verify_original_backup(installer)
    v2._verify_previous_backup(installer)
    v2._verify_v4_predecessor(installer)


def protected_state(
    v1: types.ModuleType,
    v2: types.ModuleType,
    installer: Any,
    *,
    immediate_policy: bytes,
    new_policy: bytes,
) -> str:
    installer._trusted_root_directory(pathlib.Path("/"))
    installer._trusted_root_directory(installer.INSTALL_PARENT)
    if _exists(installer.INSTALL_PARENT / STAGE_NAME):
        raise RebindError("policy_chain_rebind_v3_stage_present")

    _verify_prior_lineage(v1, v2, installer)

    if _exists(installer.INSTALL_PARENT / IMMEDIATE_BACKUP_NAME):
        v2._verify_current_with_policy(installer, new_policy)
        _verify_immediate_backup(v2, installer)
        return GREEN_STATE

    v2._verify_current_with_policy(installer, immediate_policy)
    return READY_STATE


def collect_plan(expected_head: str) -> dict[str, Any]:
    if (
        len(expected_head) != 40
        or any(ch not in "0123456789abcdef" for ch in expected_head)
    ):
        raise RebindError("expected_head_invalid")

    v2 = _load_v2()
    v1, installer = _load_installer(v2)
    installer.accepted_lock()

    inherited_heads = (
        v2.ORIGINAL_HEAD,
        v2.PREVIOUS_HEAD,
        IMMEDIATE_HEAD,
    )
    if expected_head in inherited_heads:
        raise RebindError("expected_head_not_successor")

    checkout_bound = installer.checkout_snapshot_with_tools(expected_head)
    node = installer.node_snapshot()

    v2._derive_policy(
        installer,
        v2.ORIGINAL_HEAD,
        node,
        expected_sha256=v2.ORIGINAL_POLICY_SHA256,
    )
    v2._derive_policy(
        installer,
        v2.PREVIOUS_HEAD,
        node,
        expected_sha256=v2.PREVIOUS_POLICY_SHA256,
    )
    immediate_policy = v2._derive_policy(
        installer,
        IMMEDIATE_HEAD,
        node,
        expected_sha256=IMMEDIATE_POLICY_SHA256,
    )
    new_policy = v2._derive_policy(installer, expected_head, node)

    known = {
        v2.ORIGINAL_POLICY_SHA256,
        v2.PREVIOUS_POLICY_SHA256,
        IMMEDIATE_POLICY_SHA256,
    }
    if sha256(new_policy) in known:
        raise RebindError("new_policy_not_distinct")

    state = protected_state(
        v1,
        v2,
        installer,
        immediate_policy=immediate_policy,
        new_policy=new_policy,
    )

    body = {
        "schema": PLAN_SCHEMA,
        "version": 3,
        "expected_head": expected_head,
        "original_head": v2.ORIGINAL_HEAD,
        "original_policy_sha256": v2.ORIGINAL_POLICY_SHA256,
        "original_policy_bytes": v2.ORIGINAL_POLICY_BYTES,
        "previous_head": v2.PREVIOUS_HEAD,
        "previous_policy_sha256": v2.PREVIOUS_POLICY_SHA256,
        "previous_policy_bytes": v2.PREVIOUS_POLICY_BYTES,
        "immediate_head": IMMEDIATE_HEAD,
        "immediate_policy_sha256": IMMEDIATE_POLICY_SHA256,
        "immediate_policy_bytes": IMMEDIATE_POLICY_BYTES,
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
        "retained_policy_witness_count_before": 2,
        "retained_policy_witness_count_after": 3,
        "original_policy_retained_required": True,
        "previous_policy_retained_required": True,
        "immediate_policy_retention_required": True,
        "prior_rebind_stages_absent_required": True,
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
        "v2": v2,
        "installer": installer,
        "body": body,
        "plan_id": PLAN_PREFIX + v2.sha256(v2.canonical_json(body)),
        "immediate_policy": immediate_policy,
        "new_policy": new_policy,
    }


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("v2_source_git_blob_sha1=" + V2_BLOB)
    print("immediate_head=" + IMMEDIATE_HEAD)
    print("immediate_policy_sha256=" + IMMEDIATE_POLICY_SHA256)
    print("three_predecessor_policy_witnesses_after_apply=true")
    print("prior_rebind_stages_absent_required=true")
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
    print("immediate_head=" + IMMEDIATE_HEAD)
    print("immediate_policy_sha256=" + IMMEDIATE_POLICY_SHA256)
    print("new_policy_sha256=" + str(body["new_policy_sha256"]))
    print("policy_bytes=" + str(body["new_policy_bytes"]))
    print("native_sha256=" + str(body["native_sha256"]))
    print("runner_sha256=" + str(body["runner_sha256"]))
    print("retained_policy_witness_count_before=2")
    print("retained_policy_witness_count_after=3")
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
            "POLICY_CHAIN_ATOMIC_REBIND_V3"
        )


def _inode_identity(st: os.stat_result) -> tuple[int, int]:
    return (st.st_dev, st.st_ino)


def _remove_owned_stage(
    opt_fd: int,
    stage_identity: tuple[int, int],
) -> None:
    try:
        visible = os.stat(
            STAGE_NAME,
            dir_fd=opt_fd,
            follow_symlinks=False,
        )
    except OSError as exc:
        raise RebindError("stage_cleanup_identity_unavailable") from exc
    if (
        not stat.S_ISREG(visible.st_mode)
        or _inode_identity(visible) != stage_identity
    ):
        raise RebindError("stage_cleanup_identity_changed")
    os.unlink(STAGE_NAME, dir_fd=opt_fd)
    os.fsync(opt_fd)


def _write_stage(
    v2: types.ModuleType,
    installer: Any,
    opt_fd: int,
    new_policy: bytes,
) -> None:
    fd: int | None = None
    stage_identity: tuple[int, int] | None = None
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
        opened = os.fstat(fd)
        if not stat.S_ISREG(opened.st_mode) or opened.st_nlink != 1:
            raise RebindError("stage_open_identity_invalid")
        stage_identity = _inode_identity(opened)
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
        os.close(fd)
        fd = None

        v2._hash_exact_file(
            installer.INSTALL_PARENT / STAGE_NAME,
            expected_bytes=len(new_policy),
            expected_sha256=sha256(new_policy),
            expected_mode=0o444,
        )
        os.fsync(opt_fd)
    except BaseException as exc:
        if fd is not None:
            try:
                os.close(fd)
            finally:
                fd = None
        cleanup_attempted = stage_identity is not None
        cleanup_green = False
        if cleanup_attempted:
            try:
                _remove_owned_stage(opt_fd, stage_identity)
                cleanup_green = True
            except BaseException:
                cleanup_green = False
        raise StageWriteError(
            "stage_write_failed",
            cleanup_attempted=cleanup_attempted,
            cleanup_green=cleanup_green,
        ) from exc
    finally:
        if fd is not None:
            os.close(fd)


def _durable_rollback_exchange(
    v1: types.ModuleType,
    opt_fd: int,
    recovery_name: str,
    root_fd: int,
    policy_name: str,
) -> None:
    v1._renameat2(
        opt_fd,
        recovery_name,
        root_fd,
        policy_name,
        RENAME_EXCHANGE,
    )
    os.fsync(root_fd)
    os.fsync(opt_fd)


def _remove_verified_new_policy(
    v2: types.ModuleType,
    installer: Any,
    opt_fd: int,
    new_policy: bytes,
    name: str,
) -> None:
    v2._hash_exact_file(
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
        "immediate_backup_retained",
        "post_backup_revalidation",
    }
)


def _classify_final_protected_state(
    v1: types.ModuleType,
    v2: types.ModuleType,
    installer: Any,
    *,
    immediate_policy: bytes,
    new_policy: bytes,
) -> tuple[bool, str]:
    try:
        state = protected_state(
            v1,
            v2,
            installer,
            immediate_policy=immediate_policy,
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
    print("three_predecessor_policy_witnesses_required_after_apply=true")
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
        raise RebindError("explicit_policy_chain_rebind_v3_confirmation_required")
    if os.geteuid() != 0:
        raise RebindError("root_required_for_apply")

    initial = collect_plan(expected_head)
    v1 = initial["v1"]
    v2 = initial["v2"]
    installer = initial["installer"]

    try:
        v1._require_secure_apply_context()
    except BaseException as exc:
        raise RebindError(str(exc)) from exc

    if initial["plan_id"] != expected_plan_id:
        raise RebindError("expected_plan_id_mismatch")

    body = initial["body"]
    immediate_policy = initial["immediate_policy"]
    new_policy = initial["new_policy"]

    if body["protected_state"] == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("policy_chain_rebind_performed=false")
        print("three_predecessor_policy_witnesses_retained=true")
        print("native_mutation=false")
        print("runner_mutation=false")
        print("live_execution=false")
        print("credential_access=false")
        print("transaction=false")
        print("funds_movement=false")
        return

    if body["protected_state"] != READY_STATE:
        raise RebindError("apply_state_not_chain_rebind_v3_ready")

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
    immediate_backup_retained = False
    rollback_attempted = False
    rollback_green = False
    failure_phase = "pre_exchange"

    try:
        if _exists(installer.INSTALL_PARENT / STAGE_NAME):
            raise RebindError("policy_chain_rebind_v3_stage_present")
        if _exists(installer.INSTALL_PARENT / IMMEDIATE_BACKUP_NAME):
            raise RebindError("immediate_policy_backup_present")

        _verify_prior_lineage(v1, v2, installer)
        v2._verify_current_with_policy(installer, immediate_policy)

        failure_phase = "stage_write"
        _write_stage(v2, installer, opt_fd, new_policy)
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

        _verify_prior_lineage(v1, v2, installer)
        v2._verify_current_with_policy(installer, immediate_policy)

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

        v2._verify_current_with_policy(installer, new_policy)
        _verify_prior_lineage(v1, v2, installer)
        v2._hash_exact_file(
            installer.INSTALL_PARENT / STAGE_NAME,
            expected_bytes=IMMEDIATE_POLICY_BYTES,
            expected_sha256=IMMEDIATE_POLICY_SHA256,
            expected_mode=0o444,
        )
        failure_phase = "post_exchange_verification"

        v1._renameat2(
            opt_fd,
            STAGE_NAME,
            opt_fd,
            IMMEDIATE_BACKUP_NAME,
            RENAME_NOREPLACE,
        )
        stage_created = False
        immediate_backup_retained = True
        failure_phase = "immediate_backup_retained"
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
                v1,
                v2,
                installer,
                immediate_policy=immediate_policy,
                new_policy=new_policy,
            )
            != GREEN_STATE
        ):
            raise RebindError("post_chain_rebind_v3_state_not_green")

    except BaseException as exc:
        if isinstance(exc, StageWriteError):
            rollback_attempted = exc.cleanup_attempted
            rollback_green = exc.cleanup_green
        if exchanged:
            rollback_attempted = True
            try:
                if immediate_backup_retained:
                    _durable_rollback_exchange(
                        v1,
                        opt_fd,
                        IMMEDIATE_BACKUP_NAME,
                        root_fd,
                        installer.POLICY_NAME,
                    )
                    immediate_backup_retained = False
                    _remove_verified_new_policy(
                        v2,
                        installer,
                        opt_fd,
                        new_policy,
                        IMMEDIATE_BACKUP_NAME,
                    )
                else:
                    _durable_rollback_exchange(
                        v1,
                        opt_fd,
                        STAGE_NAME,
                        root_fd,
                        installer.POLICY_NAME,
                    )
                    _remove_verified_new_policy(
                        v2,
                        installer,
                        opt_fd,
                        new_policy,
                        STAGE_NAME,
                    )
                    stage_created = False

                _verify_prior_lineage(v1, v2, installer)
                v2._verify_current_with_policy(installer, immediate_policy)
                rollback_green = True
            except BaseException:
                rollback_green = False

        elif stage_created:
            rollback_attempted = True
            try:
                _remove_verified_new_policy(
                    v2,
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
            v1,
            v2,
            installer,
            immediate_policy=immediate_policy,
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
    print("original_65b_policy_retained=true")
    print("previous_b92_policy_retained=true")
    print("immediate_4c80887_policy_retained=true")
    print("immediate_policy_sha256=" + IMMEDIATE_POLICY_SHA256)
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
    v2 = _load_v2()
    v1, installer = _load_installer(v2)
    installer.accepted_lock()

    assert v2.ORIGINAL_HEAD == "65b4515b78e467afb399b510037e8c64256e87a5"
    assert v2.PREVIOUS_HEAD == "b92ba19cf16ea5f147c441e15de12b9932ca94c3"
    assert IMMEDIATE_HEAD == "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
    assert IMMEDIATE_POLICY_SHA256 == (
        "746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549"
    )
    assert installer.NATIVE_BYTES == 726_976
    assert installer.RUNNER_BYTES == 45_147

    synthetic_node = {
        "sha256": "fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48",
        "bytes": 124_827_920,
    }
    derived = installer.build_policy(IMMEDIATE_HEAD, synthetic_node)
    assert len(derived) == IMMEDIATE_POLICY_BYTES
    assert sha256(derived) == IMMEDIATE_POLICY_SHA256

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
        prefix="void-e2-v6r2-policy-chain-rebind-v3-self-test-"
    ) as td:
        parent = pathlib.Path(td)
        root = parent / "root"
        root.mkdir()
        stage = parent / "stage"
        policy = root / "policy"
        stage.write_bytes(b"new-policy")
        policy.write_bytes(b"immediate-policy")
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
            assert stage.read_bytes() == b"immediate-policy"
            assert policy.read_bytes() == b"new-policy"
            v1._renameat2(
                parent_fd,
                "stage",
                root_fd,
                "policy",
                RENAME_EXCHANGE,
            )
            assert stage.read_bytes() == b"new-policy"
            assert policy.read_bytes() == b"immediate-policy"
        finally:
            os.close(root_fd)
            os.close(parent_fd)

    print(MARKER + "_SELF_TEST_GREEN")
    print("v2_source_generation_bound=true")
    print("v2_atomic_primitive_reused=true")
    print("original_65b_policy_identity_bound=true")
    print("previous_b92_policy_identity_bound=true")
    print("immediate_4c80887_policy_identity_bound=true")
    print("observed_4c80887_policy_derivation_green=true")
    print("three_predecessor_retention_required=true")
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
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)

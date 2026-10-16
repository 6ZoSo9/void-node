#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
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
INSTALLER_SOURCE = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_protected_install_v5.py"
)
INSTALLER_SOURCE_GIT_BLOB_SHA1 = "fd7a06490ccf6fb14831d8b0372a892e2764c9dc"

MARKER = "VOID_BUY_VOID_EPOCH2_V6R2_POLICY_HEAD_REBIND_V1"
CONFIRM_TOKEN = "ATOMIC_EXCHANGE_EPOCH2_V6R2_POLICY_HEAD_REBIND_V1"
PLAN_PREFIX = "voidbuye2polrebind1_"

OLD_HEAD = "65b4515b78e467afb399b510037e8c64256e87a5"
OLD_POLICY_BYTES = 305
OLD_POLICY_SHA256 = "dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9"

STAGE_NAME = ".void-buy-void-epoch2-live-composition-v3.policy-rebind.stage"
BACKUP_NAME = (
    ".void-buy-void-epoch2-live-composition-v3."
    "policy-predecessor-65b4515b"
)

READY_STATE = "EPOCH2_V6R2_POLICY_65B_READY_FOR_HEAD_REBIND"
GREEN_STATE = "EPOCH2_V6R2_POLICY_HEAD_REBOUND_WITH_65B_POLICY_RETAINED"

RENAME_NOREPLACE = 1
RENAME_EXCHANGE = 2
MAX_READ_CHUNK = 1024 * 1024
FORBIDDEN_APPLY_ENV = (
    "LD_PRELOAD",
    "LD_LIBRARY_PATH",
    "PYTHONPATH",
    "PYTHONHOME",
)


class RebindError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical_json(value: Any) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def _same_stat(left: os.stat_result, right: os.stat_result) -> bool:
    return (
        left.st_dev == right.st_dev
        and left.st_ino == right.st_ino
        and left.st_mode == right.st_mode
        and left.st_uid == right.st_uid
        and left.st_gid == right.st_gid
        and left.st_nlink == right.st_nlink
        and left.st_size == right.st_size
        and left.st_mtime_ns == right.st_mtime_ns
        and left.st_ctime_ns == right.st_ctime_ns
    )


def _direct_source_bytes(path: pathlib.Path, maximum: int = 2 * 1024 * 1024) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise RebindError("source_unavailable:" + path.name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise RebindError("source_metadata_invalid:" + path.name)
    raw = path.read_bytes()
    after = path.lstat()
    if not _same_stat(before, after) or len(raw) != before.st_size:
        raise RebindError("source_generation_changed:" + path.name)
    return raw


def _load_installer():
    raw = _direct_source_bytes(INSTALLER_SOURCE)
    if git_blob_sha1(raw) != INSTALLER_SOURCE_GIT_BLOB_SHA1:
        raise RebindError("installer_source_blob_mismatch")
    module = types.ModuleType(
        "void_buy_void_epoch2_live_composition_native_protected_install_v5"
    )
    module.__file__ = str(INSTALLER_SOURCE)
    module.__package__ = ""
    code = compile(raw, str(INSTALLER_SOURCE), "exec", dont_inherit=True)
    exec(code, module.__dict__)
    return module


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
        raise RebindError("file_unavailable:" + path.name) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != expected_mode
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


def _old_policy(installer: Any, node: dict[str, Any]) -> bytes:
    policy = installer.build_policy(OLD_HEAD, node)
    if len(policy) != OLD_POLICY_BYTES or sha256(policy) != OLD_POLICY_SHA256:
        raise RebindError("old_policy_identity_mismatch")
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


def _verify_backup(installer: Any) -> None:
    backup = installer.INSTALL_PARENT / BACKUP_NAME
    _hash_exact_file(
        backup,
        expected_bytes=OLD_POLICY_BYTES,
        expected_sha256=OLD_POLICY_SHA256,
        expected_mode=0o444,
    )


def protected_state(
    installer: Any,
    *,
    old_policy: bytes,
    new_policy: bytes,
) -> str:
    installer._trusted_root_directory(pathlib.Path("/"))
    installer._trusted_root_directory(installer.INSTALL_PARENT)
    if _exists(installer.INSTALL_PARENT / STAGE_NAME):
        raise RebindError("policy_rebind_stage_present")
    if _exists(installer.INSTALL_PARENT / BACKUP_NAME):
        _verify_current_with_policy(installer, new_policy)
        _verify_v4_predecessor(installer)
        _verify_backup(installer)
        return GREEN_STATE
    _verify_current_with_policy(installer, old_policy)
    _verify_v4_predecessor(installer)
    return READY_STATE


def collect_plan(expected_head: str) -> dict[str, Any]:
    installer = _load_installer()
    installer.accepted_lock()
    checkout_bound = installer.checkout_snapshot_with_tools(expected_head)
    node = installer.node_snapshot()
    old_policy = _old_policy(installer, node)
    new_policy = installer.build_policy(expected_head, node)
    if len(new_policy) != OLD_POLICY_BYTES:
        raise RebindError("new_policy_bytes_unexpected")
    if new_policy == old_policy or sha256(new_policy) == OLD_POLICY_SHA256:
        raise RebindError("new_policy_not_distinct")
    state = protected_state(
        installer,
        old_policy=old_policy,
        new_policy=new_policy,
    )
    body = {
        "schema": "void_buy_void_epoch2_v6r2_policy_head_rebind_plan_v1",
        "version": 1,
        "expected_head": expected_head,
        "old_head": OLD_HEAD,
        "old_policy_sha256": OLD_POLICY_SHA256,
        "old_policy_bytes": OLD_POLICY_BYTES,
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
        "native_mutation_authorized": False,
        "runner_mutation_authorized": False,
        "policy_atomic_exchange_required": True,
        "old_policy_retention_required": True,
        "automatic_rollback_required": True,
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
    plan_id = PLAN_PREFIX + sha256(canonical_json(body))
    return {
        "body": body,
        "plan_id": plan_id,
        "old_policy": old_policy,
        "new_policy": new_policy,
    }


def source_plan() -> None:
    installer = _load_installer()
    installer.accepted_lock()
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("installer_source_blob=" + INSTALLER_SOURCE_GIT_BLOB_SHA1)
    print("old_head=" + OLD_HEAD)
    print("old_policy_sha256=" + OLD_POLICY_SHA256)
    print("old_policy_bytes=" + str(OLD_POLICY_BYTES))
    print("stage_path=" + str(installer.INSTALL_PARENT / STAGE_NAME))
    print("backup_path=" + str(installer.INSTALL_PARENT / BACKUP_NAME))
    print("native_mutation_authorized=false")
    print("runner_mutation_authorized=false")
    print("policy_atomic_exchange_required=true")
    print("old_policy_retention_required=true")
    print("automatic_rollback_required=true")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("funds_movement_authorized=false")


def plan(expected_head: str) -> None:
    result = collect_plan(expected_head)
    body = result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("expected_head=" + expected_head)
    print("old_head=" + OLD_HEAD)
    print("plan_id=" + result["plan_id"])
    print("protected_state=" + str(body["protected_state"]))
    print("old_policy_sha256=" + OLD_POLICY_SHA256)
    print("new_policy_sha256=" + str(body["new_policy_sha256"]))
    print("policy_bytes=" + str(body["new_policy_bytes"]))
    print("native_sha256=" + str(body["native_sha256"]))
    print("runner_sha256=" + str(body["runner_sha256"]))
    print("native_mutation_authorized=false")
    print("runner_mutation_authorized=false")
    print("policy_atomic_exchange_required=true")
    print("old_policy_retention_required=true")
    print("automatic_rollback_required=true")
    print("filesystem_write=false")
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
            "POLICY_HEAD_ATOMIC_REBIND_V1"
        )


def _renameat2(
    old_dir_fd: int,
    old_name: str,
    new_dir_fd: int,
    new_name: str,
    flags: int,
) -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    fn = getattr(libc, "renameat2", None)
    if fn is None:
        raise RebindError("renameat2_unavailable")
    fn.argtypes = [
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_uint,
    ]
    fn.restype = ctypes.c_int
    rc = fn(
        old_dir_fd,
        old_name.encode("utf-8"),
        new_dir_fd,
        new_name.encode("utf-8"),
        flags,
    )
    if rc != 0:
        err = ctypes.get_errno()
        raise RebindError("renameat2_failed:" + str(err))


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


def _remove_verified_new_policy_stage(
    installer: Any,
    opt_fd: int,
    new_policy: bytes,
    name: str,
) -> None:
    path = installer.INSTALL_PARENT / name
    _hash_exact_file(
        path,
        expected_bytes=len(new_policy),
        expected_sha256=sha256(new_policy),
        expected_mode=0o444,
    )
    os.unlink(name, dir_fd=opt_fd)
    os.fsync(opt_fd)


def _require_secure_apply_context() -> None:
    if sys.flags.isolated != 1:
        raise RebindError("python_isolated_mode_required")
    present = [name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise RebindError("forbidden_apply_environment:" + ",".join(present))


def emit_operation_authority() -> None:
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("filesystem_mutation_possible=true")
    print("filesystem_mutation_performed=false")
    print("native_mutation_authorized=false")
    print("runner_mutation_authorized=false")
    print("policy_atomic_exchange_authorized=true")
    print("old_policy_retention_required=true")
    print("automatic_rollback_required=true")
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


def apply(
    expected_head: str,
    expected_plan_id: str,
    confirm: str,
) -> None:
    emit_operation_authority()
    if confirm != CONFIRM_TOKEN:
        raise RebindError("explicit_policy_rebind_confirmation_required")
    if os.geteuid() != 0:
        raise RebindError("root_required_for_apply")
    _require_secure_apply_context()

    installer = _load_installer()
    initial = collect_plan(expected_head)
    if initial["plan_id"] != expected_plan_id:
        raise RebindError("expected_plan_id_mismatch")
    body = initial["body"]
    old_policy = initial["old_policy"]
    new_policy = initial["new_policy"]

    if body["protected_state"] == GREEN_STATE:
        print(MARKER)
        print("mode=apply")
        print("status=ALREADY_GREEN")
        print("policy_rebind_performed=false")
        print("native_mutation=false")
        print("runner_mutation=false")
        print("live_execution=false")
        print("credential_access=false")
        print("transaction=false")
        print("funds_movement=false")
        return
    if body["protected_state"] != READY_STATE:
        raise RebindError("apply_state_not_rebind_ready")

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
    backup_retained = False
    rollback_attempted = False
    rollback_green = False
    try:
        if _exists(installer.INSTALL_PARENT / STAGE_NAME):
            raise RebindError("policy_rebind_stage_present")
        if _exists(installer.INSTALL_PARENT / BACKUP_NAME):
            raise RebindError("policy_predecessor_backup_present")

        _write_stage(installer, opt_fd, new_policy)
        stage_created = True

        checkout_bound = installer.checkout_snapshot_with_tools(
            expected_head,
            expected_git=body["git_tool"],
            expected_setpriv=body["setpriv_tool"],
        )
        if checkout_bound["checkout"] != body["checkout"]:
            raise RebindError("checkout_generation_changed_before_exchange")
        if installer.node_snapshot() != body["node"]:
            raise RebindError("node_generation_changed_before_exchange")
        _verify_current_with_policy(installer, old_policy)
        _verify_v4_predecessor(installer)

        _renameat2(
            opt_fd,
            STAGE_NAME,
            root_fd,
            installer.POLICY_NAME,
            RENAME_EXCHANGE,
        )
        exchanged = True
        os.fsync(root_fd)
        os.fsync(opt_fd)

        _verify_current_with_policy(installer, new_policy)
        _verify_v4_predecessor(installer)
        _hash_exact_file(
            installer.INSTALL_PARENT / STAGE_NAME,
            expected_bytes=OLD_POLICY_BYTES,
            expected_sha256=OLD_POLICY_SHA256,
            expected_mode=0o444,
        )

        _renameat2(
            opt_fd,
            STAGE_NAME,
            opt_fd,
            BACKUP_NAME,
            RENAME_NOREPLACE,
        )
        stage_created = False
        backup_retained = True
        os.fsync(opt_fd)

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
                old_policy=old_policy,
                new_policy=new_policy,
            )
            != GREEN_STATE
        ):
            raise RebindError("post_rebind_state_not_green")
    except BaseException:
        if exchanged:
            rollback_attempted = True
            try:
                if backup_retained:
                    _renameat2(
                        opt_fd,
                        BACKUP_NAME,
                        root_fd,
                        installer.POLICY_NAME,
                        RENAME_EXCHANGE,
                    )
                    backup_retained = False
                    _remove_verified_new_policy_stage(
                        installer,
                        opt_fd,
                        new_policy,
                        BACKUP_NAME,
                    )
                else:
                    _renameat2(
                        opt_fd,
                        STAGE_NAME,
                        root_fd,
                        installer.POLICY_NAME,
                        RENAME_EXCHANGE,
                    )
                    _remove_verified_new_policy_stage(
                        installer,
                        opt_fd,
                        new_policy,
                        STAGE_NAME,
                    )
                    stage_created = False
                _verify_current_with_policy(installer, old_policy)
                _verify_v4_predecessor(installer)
                rollback_green = True
            except BaseException:
                rollback_green = False
        elif stage_created:
            rollback_attempted = True
            try:
                _remove_verified_new_policy_stage(
                    installer,
                    opt_fd,
                    new_policy,
                    STAGE_NAME,
                )
                stage_created = False
                rollback_green = True
            except BaseException:
                rollback_green = False
        print("automatic_rollback_attempted=" + str(rollback_attempted).lower())
        print("automatic_rollback_green=" + str(rollback_green).lower())
        raise
    finally:
        os.close(root_fd)
        os.close(opt_fd)

    print(MARKER)
    print("mode=apply")
    print("expected_head=" + expected_head)
    print("plan_id=" + expected_plan_id)
    print("policy_rebind_performed=true")
    print("publication_state=atomic_policy_exchange_verified")
    print("final_state_verified=true")
    print("old_policy_retained=true")
    print("old_policy_sha256=" + OLD_POLICY_SHA256)
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
    print(
        "next_action=EPOCH2_V6R2_INSTALLED_READ_ONLY_QUALIFICATION_V5"
    )


def self_test() -> None:
    installer = _load_installer()
    installer.accepted_lock()
    assert OLD_HEAD == "65b4515b78e467afb399b510037e8c64256e87a5"
    assert OLD_POLICY_BYTES == 305
    assert len(OLD_POLICY_SHA256) == 64
    assert installer.NATIVE_BYTES == 726_976
    assert installer.RUNNER_BYTES == 45_147
    assert installer.PREDECESSOR_NATIVE_BYTES == 722_880
    assert installer.PREDECESSOR_RUNNER_BYTES == 40_616
    assert installer.PREDECESSOR_POLICY_BYTES == 305

    with tempfile.TemporaryDirectory(
        prefix="void-e2-v6r2-policy-rebind-self-test-"
    ) as td:
        parent = pathlib.Path(td)
        root = parent / "root"
        root.mkdir()
        stage = parent / "stage"
        policy = root / "policy"
        stage.write_bytes(b"new-policy")
        policy.write_bytes(b"old-policy")
        parent_fd = os.open(
            parent,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC,
        )
        root_fd = os.open(
            root,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC,
        )
        try:
            _renameat2(
                parent_fd,
                "stage",
                root_fd,
                "policy",
                RENAME_EXCHANGE,
            )
            assert stage.read_bytes() == b"old-policy"
            assert policy.read_bytes() == b"new-policy"
            _renameat2(
                parent_fd,
                "stage",
                root_fd,
                "policy",
                RENAME_EXCHANGE,
            )
            assert stage.read_bytes() == b"new-policy"
            assert policy.read_bytes() == b"old-policy"
        finally:
            os.close(root_fd)
            os.close(parent_fd)

    print(MARKER + "_SELF_TEST_GREEN")
    print("installer_source_blob_bound=true")
    print("atomic_cross_directory_policy_exchange_exercised=true")
    print("old_policy_identity_bound=true")
    print("native_mutation_authorized=false")
    print("runner_mutation_authorized=false")
    print("old_policy_retention_required=true")
    print("automatic_rollback_required=true")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("transaction_authorized=false")
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

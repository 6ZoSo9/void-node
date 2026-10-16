#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import fcntl
import hashlib
import importlib.util
import os
import pathlib
import re
import stat
import subprocess
import tempfile
from types import ModuleType

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = "ops/precision/void_buy_void_user_manager_credential_query_protected_replace_v2.py"
LOCK = "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json"

EXPECTED = {
    SOURCE: "452f6c6666e00dbfe8f216ec6d3b4a16a35a43d7",
    LOCK: "b73415ce8fc95ff2d49cbde97a15d701ad5b7937",
}

CLOSED_ENV = {
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


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        env=CLOSED_ENV,
        timeout=120,
        check=True,
    )


def git_blob(path: str) -> str:
    return run(
        "/usr/bin/git",
        "--no-replace-objects",
        "-C",
        str(ROOT),
        "rev-parse",
        "HEAD:" + path,
    ).stdout.strip()


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def load_source() -> ModuleType:
    source_path = ROOT / SOURCE
    spec = importlib.util.spec_from_file_location(
        "void_credential_query_protected_replace_v2_fixture",
        source_path,
    )
    if spec is None or spec.loader is None:
        raise AssertionError("source import spec unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def static_contract_checks() -> None:
    for path, expected in EXPECTED.items():
        assert git_blob(path) == expected, "blob_drift:" + path

    source = (ROOT / SOURCE).read_text(encoding="utf-8")
    tree = ast.parse(source, filename=SOURCE)

    imports = {
        node.names[0].name
        for node in ast.walk(tree)
        if isinstance(node, ast.Import) and node.names
    }
    from_imports = {
        node.module or ""
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom)
    }
    assert "subprocess" not in imports
    assert "subprocess" not in from_imports

    for needle in (
        "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V2",
        "voidbuyumqcredelflock2_",
        "c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54",
        "67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c",
        "7b968a20f1507215477f43a59c5d82b9e9adca918ce5f2df566292d8380b4cb1",
        "af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718",
        "CREDENTIAL_QUERY_V1_GREEN_READY_FOR_V2",
        "CREDENTIAL_QUERY_V2_GREEN_WITH_V1_PREDECESSOR",
        "CREDENTIAL_QUERY_V2_PRIVATE_PENDING_RECOVERY_REQUIRED",
        "ATOMIC_EXCHANGE_ACCEPTED_CREDENTIAL_QUERY_V1_TO_V2",
        "ATOMIC_EXCHANGE_ROLLBACK_CREDENTIAL_QUERY_V2_TO_V1",
        "RENAME_EXCHANGE",
        "RENAME_NOREPLACE",
        "STAGED_STATE",
        "EXCHANGED_STATE",
        "ROLLBACK_PENDING_STATE",
        "PRIVATE_PENDING_STATE",
        "_create_exact_stage",
        "_cleanup_private_pending",
        "_open_protected_root",
        "_require_visible_install_root",
        "replacement_operation_in_progress",
        "_unlink_owned_name",
        "created_stage_identity",
        "stable_parent_operation_lock_required=true",
        "descriptor_bound_state_inspection_required=true",
        "private_stage_publication_required=true",
        "visible_install_root_generation_revalidation_required=true",
        "crash_state_classifier_complete=true",
        "apply_crash_resume_supported=true",
        "rollback_crash_resume_supported=true",
        "v1_predecessor_retained=true",
        "query_execution=false",
        "credential_contents_read=false",
    ):
        assert needle in source, needle

    for forbidden in (
        "systemctl",
        "service restart",
        "eth_sendRawTransaction",
        "eth_sendTransaction",
        "private_key",
        "wallet",
    ):
        assert forbidden not in source, forbidden

    self_test = run(
        "/usr/bin/python3", "-I", "-B", str(ROOT / SOURCE), "--self-test"
    ).stdout
    for line in (
        "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V2_SELF_TEST_GREEN",
        "renameat2_exchange_available=true",
        "preexec_replacement=false",
        "v1_predecessor_preserved_after_success=true",
        "automatic_failure_rollback=true",
        "foreign_stage_cleanup_rejected=true",
        "current_invocation_stage_inode_bound=true",
        "operation_directory_lock_required=true",
        "crash_state_classifier_complete=true",
        "apply_crash_resume_supported=true",
        "rollback_crash_resume_supported=true",
        "operation_lock_exclusivity_exercised=true",
        "crash_transition_primitives_exercised=true",
        "stable_parent_operation_lock=true",
        "descriptor_bound_state_inspection=true",
        "private_stage_published_only_after_complete=true",
        "visible_install_root_generation_revalidation=true",
        "query_execution=false",
        "credential_contents_read=false",
    ):
        assert line in self_test.splitlines(), line

    source_plan = run(
        "/usr/bin/python3", "-I", "-B", str(ROOT / SOURCE), "--source-plan"
    ).stdout
    for line in (
        "accepted_lock_id=voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54",
        "source_only=true",
        "host_read=false",
        "host_write=false",
        "preexec_replacement=false",
        "v1_predecessor_preserved_after_success=true",
        "query_atomic_exchange_required=true",
        "operation_directory_lock_required=true",
        "stable_parent_operation_lock_required=true",
        "descriptor_bound_state_inspection_required=true",
        "private_stage_publication_required=true",
        "visible_install_root_generation_revalidation_required=true",
        "crash_state_classification_required=true",
        "apply_crash_resume_supported=true",
        "rollback_crash_resume_supported=true",
        "query_execution=false",
        "credential_contents_read=false",
        "service_mutation=false",
        "systemd_mutation=false",
        "transaction=false",
        "funds_movement=false",
    ):
        assert line in source_plan.splitlines(), line


def write_root_file(path: pathlib.Path, raw: bytes, mode: int) -> None:
    path.write_bytes(raw)
    os.chown(path, 0, 0)
    os.chmod(path, mode)


def configure_fixture(
    module: ModuleType,
    opt_root: pathlib.Path,
    install_root: pathlib.Path,
    preexec: bytes,
    v1: bytes,
    v2: bytes,
) -> None:
    module.OPT_ROOT = opt_root
    module.INSTALL_ROOT = install_root
    module.PREEXEC_TARGET = install_root / module.PREEXEC_NAME
    module.QUERY_TARGET = install_root / module.QUERY_NAME
    module.V1_PREDECESSOR_TARGET = install_root / module.V1_PREDECESSOR_NAME
    module.STAGING_TARGET = install_root / module.STAGING_NAME
    module.PREEXEC_BYTES = len(preexec)
    module.PREEXEC_SHA256 = sha256(preexec)
    module.V1_QUERY_BYTES = len(v1)
    module.V1_QUERY_SHA256 = sha256(v1)
    module.V2_QUERY_BYTES = len(v2)
    module.V2_QUERY_SHA256 = sha256(v2)
    module.PRIVATE_PENDING_RE = re.compile(
        r"^\." + re.escape(module.STAGING_NAME) + r"\.pending\.[0-9]+$"
    )


def root_fixture() -> None:
    assert os.geteuid() == 0, "root fixture requires euid 0"
    module = load_source()

    preexec = b"fixture-static-preexec-v2\n"
    v1 = b"fixture-query-v1\n"
    v2 = b"fixture-query-v2-complete\n"

    with tempfile.TemporaryDirectory(
        prefix="void-credential-query-v2-root-fixture-"
    ) as raw:
        fixture = pathlib.Path(raw)
        os.chown(fixture, 0, 0)
        os.chmod(fixture, 0o700)

        opt_root = fixture / "opt"
        install_root = opt_root / module.INSTALL_ROOT.name
        opt_root.mkdir(mode=0o755)
        install_root.mkdir(mode=0o755)
        os.chown(opt_root, 0, 0)
        os.chown(install_root, 0, 0)
        os.chmod(opt_root, 0o755)
        os.chmod(install_root, 0o755)

        configure_fixture(module, opt_root, install_root, preexec, v1, v2)
        write_root_file(install_root / module.PREEXEC_NAME, preexec, 0o555)
        write_root_file(install_root / module.QUERY_NAME, v1, 0o555)

        # Stable-parent lock is retained on OPT_ROOT, not the replaceable child.
        parent_fd, dir_fd = module._open_protected_root(fcntl.LOCK_EX)
        try:
            module._require_visible_install_root(parent_fd, dir_fd)
            try:
                second_parent_fd, second_dir_fd = module._open_protected_root(
                    fcntl.LOCK_EX
                )
            except module.ReplaceError as exc:
                assert str(exc) == "replacement_operation_in_progress"
            else:
                os.close(second_dir_fd)
                os.close(second_parent_fd)
                raise AssertionError("second stable-parent lock acquired")

            moved = opt_root / (install_root.name + ".old")
            os.rename(install_root, moved)
            replacement = opt_root / install_root.name
            replacement.mkdir(mode=0o755)
            os.chown(replacement, 0, 0)
            os.chmod(replacement, 0o755)
            try:
                module._require_visible_install_root(parent_fd, dir_fd)
            except module.ReplaceError as exc:
                assert str(exc) == "visible_install_root_generation_changed"
            else:
                raise AssertionError("visible install-root replacement admitted")

            # The parent flock must still serialize after child replacement.
            try:
                second_parent_fd, second_dir_fd = module._open_protected_root(
                    fcntl.LOCK_EX
                )
            except module.ReplaceError as exc:
                assert str(exc) == "replacement_operation_in_progress"
            else:
                os.close(second_dir_fd)
                os.close(second_parent_fd)
                raise AssertionError(
                    "stable parent lock lost after child replacement"
                )
            replacement.rmdir()
            os.rename(moved, install_root)
            module._require_visible_install_root(parent_fd, dir_fd)
        finally:
            os.close(dir_fd)
            os.close(parent_fd)

        # Execute the real private-stage publication path. Record real file+dir
        # fsync calls while preserving their actual durability behavior.
        parent_fd, dir_fd = module._open_protected_root(fcntl.LOCK_EX)
        original_fsync = module.os.fsync
        fsync_kinds: list[str] = []

        def recording_fsync(fd: int) -> None:
            mode = os.fstat(fd).st_mode
            fsync_kinds.append(
                "directory" if stat.S_ISDIR(mode) else "file"
            )
            original_fsync(fd)

        module.os.fsync = recording_fsync
        try:
            created = module._create_exact_stage(dir_fd, v2)
            assert module._base_state_at(dir_fd) == module.STAGED_STATE
            assert module._path_inode(
                module._fd_child_path(dir_fd, module.STAGING_NAME)
            ) == created
            assert not module._private_pending_names_at(dir_fd)
            assert "file" in fsync_kinds
            assert "directory" in fsync_kinds
        finally:
            module.os.fsync = original_fsync

        os.unlink(module.STAGING_NAME, dir_fd=dir_fd)
        os.fsync(dir_fd)
        assert module._base_state_at(dir_fd) == module.READY_STATE

        # Simulate process death before private-stage publication: an incomplete
        # pending file is classified and is recoverable by the explicit cleanup.
        pending_name = (
            "." + module.STAGING_NAME + ".pending." + str(os.getpid() + 1000)
        )
        pending_fd = os.open(
            pending_name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
            0o500,
            dir_fd=dir_fd,
        )
        try:
            os.write(pending_fd, v2[: max(1, len(v2) // 3)])
            os.fchmod(pending_fd, 0o500)
            os.fchown(pending_fd, 0, 0)
            os.fsync(pending_fd)
        finally:
            os.close(pending_fd)
        os.fsync(dir_fd)

        assert module._base_state_at(dir_fd) == module.PRIVATE_PENDING_STATE
        assert module._cleanup_private_pending(dir_fd) is True
        assert module._base_state_at(dir_fd) == module.READY_STATE
        os.close(dir_fd)
        os.close(parent_fd)

    print("VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V2_ROOT_FIXTURE_GREEN")
    print("private_stage_publication_behavior_exercised=true")
    print("private_stage_file_and_directory_fsync_exercised=true")
    print("stable_parent_lock_behavior_exercised=true")
    print("visible_install_root_replacement_rejected=true")
    print("private_pending_state_behavior_exercised=true")
    print("private_pending_cleanup_behavior_exercised=true")
    print("host_opt_mutation=false")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("funds_movement=false")


def source_proof() -> None:
    static_contract_checks()
    print("VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V2_PROOF_GREEN")
    print("source_blob=452f6c6666e00dbfe8f216ec6d3b4a16a35a43d7")
    print("accepted_lock_blob=b73415ce8fc95ff2d49cbde97a15d701ad5b7937")
    print("accepted_lock_id=voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54")
    print("preexec_replacement=false")
    print("v1_predecessor_preserved_after_success=true")
    print("query_atomic_exchange_required=true")
    print("automatic_failure_rollback=true")
    print("foreign_stage_cleanup_rejected=true")
    print("current_invocation_stage_inode_bound=true")
    print("operation_directory_lock_required=true")
    print("crash_state_classifier_complete=true")
    print("apply_crash_resume_supported=true")
    print("rollback_crash_resume_supported=true")
    print("stable_parent_operation_lock_required=true")
    print("descriptor_bound_state_inspection_required=true")
    print("private_stage_publication_required=true")
    print("visible_install_root_generation_revalidation_required=true")
    print("private_pending_state_required=true")
    print("root_fixture_required_for_behavioral_claims=true")
    print("query_execution=false")
    print("credential_contents_read=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("transaction=false")
    print("funds_movement=false")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root-fixture", action="store_true")
    args = parser.parse_args()
    if args.root_fixture:
        root_fixture()
    else:
        source_proof()


if __name__ == "__main__":
    main()

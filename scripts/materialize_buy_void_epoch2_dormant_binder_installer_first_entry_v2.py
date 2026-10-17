#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.json"
)
LOCK = ROOT / LOCK_REL
LOCK_BLOB = "227c2fa449abf1387925373c706ecd07775d5898"
LOCK_ID = (
    "voidbuye2dormantfirstentrylock2_"
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
)

CANDIDATE_MERGE = "3a38da1e53ac52374aae4182d24ad4c245dfe504"
CANDIDATE_TREE = "4a25e5cb001667920b1b5715679c7cce99bd68fe"
CANDIDATE_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_v2.py"
)
CANDIDATE_BLOB = "de2f487c625cf96c812cb6d4246d3d036a589e89"

EXPECTED_REPORT_BYTES = 6131
EXPECTED_REPORT_SHA256 = (
    "2eafc4dc83d7d59fbd5e1d7a7fa809661c72e3387ae83e7f3badae78780da6ac"
)
EXPECTED_REPORT_GIT_BLOB_SHA1 = "ec94d8238028a32dbf8a03ac72fc5ce7120607b7"
EXPECTED_CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand2_"
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
)
EXPECTED_BINARY_BYTES = 731_072
EXPECTED_BINARY_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
EXPECTED_BINARY_GIT_BLOB_SHA1 = "798907b18c73ee2cc1dea0fe05b36f27ab4137a7"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_"
    "INSTALLER_FIRST_ENTRY_MATERIALIZER_V2"
)

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
    "GIT_NO_LAZY_FETCH": "1",
    "GIT_ALLOW_PROTOCOL": "",
}


class MaterializeError(RuntimeError):
    pass


MUTATION_STATE = {
    "temporary_filesystem_mutation_possible": False,
    "git_worktree_mutation_possible": False,
    "git_worktree_cleanup_verified": False,
    "temporary_directory_cleanup_verified": False,
    "candidate_rederivation_completed": False,
    "output_creation_attempted": False,
    "output_created": False,
    "output_verified": False,
}


def _stat_identity(st: os.stat_result) -> tuple:
    return tuple(getattr(st, field) for field in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
        "st_size", "st_mtime_ns", "st_ctime_ns",
    ))


def _directory_identity(st: os.stat_result) -> tuple:
    # Child creation/removal legitimately changes directory timestamps.
    return _stat_identity(st)[:5]


def _failure_reason(exc: BaseException | None) -> str:
    if exc is None:
        return "none"
    return str(exc) if isinstance(exc, MaterializeError) else type(exc).__name__


def _emit_mutation_state() -> None:
    for name, value in MUTATION_STATE.items():
        print(name + "=" + str(value).lower())


def _emit_authority(deriving: bool) -> None:
    print(MARKER)
    for name in (
        "temporary_filesystem_write_authorized",
        "git_worktree_mutation_authorized",
        "candidate_derivation_processes_authorized",
        "launcher_self_test_execution_authorized",
        "create_only_output_authorized",
    ):
        print(name + "=" + str(deriving).lower())
    print("git_fetch_requested=false")
    print("git_lazy_fetch_disabled=true")
    print("git_transport_disabled=true")
    print("service_action_authorized=false")
    print("live_launcher_execution_authorized=false")
    print("protected_installer_consumer_bound=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("protected_install_authorized=false")
    print("precision_install_authorized=false")
    print("native_or_binder_live_execution_authorized=false")
    print("funds_movement=false", flush=True)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical(value: object) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=True,
        )
        + "\n"
    ).encode("utf-8")


def direct(path: Path, maximum: int) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise MaterializeError("source_unavailable:" + str(path)) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise MaterializeError("source_metadata_invalid:" + str(path))
    raw = path.read_bytes()
    after = path.lstat()
    for field in (
        "st_dev",
        "st_ino",
        "st_mode",
        "st_uid",
        "st_gid",
        "st_nlink",
        "st_size",
        "st_mtime_ns",
        "st_ctime_ns",
    ):
        if getattr(before, field) != getattr(after, field):
            raise MaterializeError("source_generation_changed:" + str(path))
    if len(raw) != before.st_size:
        raise MaterializeError("source_read_drift:" + str(path))
    return raw


def run_git(args: list[str], *, cwd: Path = ROOT, timeout: int = 60) -> str:
    try:
        cp = subprocess.run(
            ["/usr/bin/git", "--no-replace-objects", "-C", os.fspath(cwd), *args],
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=GIT_ENV,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise MaterializeError("git_execution_failed") from exc
    if cp.returncode != 0 or cp.stderr:
        raise MaterializeError("git_command_failed:" + args[0])
    return cp.stdout.decode("utf-8", "strict").strip()


def accepted_lock() -> dict:
    raw = direct(LOCK, 128 * 1024)
    if git_blob(raw) != LOCK_BLOB:
        raise MaterializeError("accepted_lock_blob_mismatch")
    try:
        value = json.loads(raw.decode("utf-8", "strict"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise MaterializeError("accepted_lock_json_invalid") from exc
    required = {
        "schema":
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
            "candidate_lock_v2",
        "marker":
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
            "CANDIDATE_LOCK_V2",
        "version": 2,
        "repository": "6ZoSo9/void-node",
        "candidate_merge": CANDIDATE_MERGE,
        "candidate_tree": CANDIDATE_TREE,
        "candidate_accepted": True,
        "launcher_binary_identity_accepted": True,
        "runtime_head_contract_accepted": True,
        "canonical_main_candidate_authority": True,
        "superseded_v1_lock_install_authority": False,
        "protected_install_authorized": False,
        "precision_install_authorized": False,
        "native_or_binder_live_execution_authorized": False,
        "credential_access_authorized": False,
        "private_key_access_authorized": False,
        "signing_authorized": False,
        "transaction_authorized": False,
        "payment_acceptance_authorized": False,
        "public_presale_activation_authorized": False,
        "wc_void_market_activation_authorized": False,
        "treasury_liquidity_action_authorized": False,
        "funds_movement_authorized": False,
        "production_host_evidence_authority": False,
        "lock_id": LOCK_ID,
    }
    for key, want in required.items():
        if value.get(key) != want:
            raise MaterializeError("accepted_lock_field_mismatch:" + key)

    report = value.get("candidate_report")
    if not isinstance(report, dict):
        raise MaterializeError("accepted_lock_candidate_report_missing")
    expected_report = {
        "bytes": EXPECTED_REPORT_BYTES,
        "sha256": EXPECTED_REPORT_SHA256,
        "git_blob_sha1": EXPECTED_REPORT_GIT_BLOB_SHA1,
        "candidate_id": EXPECTED_CANDIDATE_ID,
        "candidate_script_git_blob_sha1": CANDIDATE_BLOB,
        "repository_head": CANDIDATE_MERGE,
        "repository_tree": CANDIDATE_TREE,
        "launcher_binary_sha256": EXPECTED_BINARY_SHA256,
        "launcher_binary_bytes": EXPECTED_BINARY_BYTES,
        "launcher_binary_git_blob_sha1": EXPECTED_BINARY_GIT_BLOB_SHA1,
        "two_builds_byte_identical": True,
        "static_no_interp": True,
        "dynamic_needed_absent": True,
        "self_test_green": True,
        "sealed_launcher_source_snapshot": True,
        "toolchain_revalidated_after_build": True,
        "semantic_report_validation_fail_closed": True,
        "runtime_expected_head_compile_bound": False,
        "runtime_expected_head_strict_lowercase_hex": True,
        "runtime_expected_head_forwarded_unchanged": True,
        "repository_head_not_embedded_in_launcher": True,
        "frozen_child_launcher_path_compatible": True,
    }
    for key, want in expected_report.items():
        if report.get(key) != want:
            raise MaterializeError("accepted_candidate_field_mismatch:" + key)
    return value


def verify_candidate_merge() -> None:
    if run_git(["rev-parse", CANDIDATE_MERGE + "^{tree}"]) != CANDIDATE_TREE:
        raise MaterializeError("candidate_tree_mismatch")
    if run_git(["rev-parse", CANDIDATE_MERGE + ":" + CANDIDATE_REL]) != CANDIDATE_BLOB:
        raise MaterializeError("candidate_script_blob_mismatch")


def load_candidate_from_worktree(worktree: Path):
    candidate_path = worktree / CANDIDATE_REL
    raw = direct(candidate_path, 2 * 1024 * 1024)
    if git_blob(raw) != CANDIDATE_BLOB:
        raise MaterializeError("candidate_script_worktree_blob_mismatch")
    module = types.ModuleType("void_e2_first_entry_candidate_v2_materialize")
    module.__file__ = os.fspath(candidate_path)
    module.__package__ = None
    try:
        code = compile(
            raw.decode("utf-8", "strict"),
            CANDIDATE_REL,
            "exec",
            dont_inherit=True,
            optimize=0,
        )
        exec(code, module.__dict__)
    except Exception as exc:
        raise MaterializeError("candidate_script_verified_execution_failed") from exc
    derive = getattr(module, "derive", None)
    if not callable(derive):
        raise MaterializeError("candidate_derive_entry_missing")
    return module


def _cleanup_derivation(
    temp: Path,
    temp_identity: tuple,
    worktree: Path,
    worktree_identity: tuple | None,
    attempted: bool,
) -> None:
    if _directory_identity(temp.lstat()) != temp_identity:
        raise MaterializeError("temporary_directory_generation_changed")
    if attempted:
        def registered() -> bool:
            fields = run_git(["worktree", "list", "--porcelain", "-z"]).split("\0")
            return "worktree " + os.fspath(worktree) in fields

        if registered():
            # A partial add is checked, but unknown/rebound paths are not removed.
            if (
                worktree_identity is None
                or _directory_identity(worktree.lstat()) != worktree_identity
            ):
                raise MaterializeError("worktree_cleanup_generation_unverified")
            run_git(["worktree", "remove", "--force", os.fspath(worktree)])
        if registered() or os.path.lexists(worktree):
            raise MaterializeError("worktree_cleanup_incomplete")
        MUTATION_STATE["git_worktree_cleanup_verified"] = True
    if (
        _directory_identity(temp.lstat()) != temp_identity
        or list(temp.iterdir())
    ):
        raise MaterializeError("temporary_directory_cleanup_unverified")
    temp.rmdir()
    if os.path.lexists(temp):
        raise MaterializeError("temporary_directory_cleanup_incomplete")
    MUTATION_STATE["temporary_directory_cleanup_verified"] = True


def derive_accepted() -> tuple[bytes, bytes]:
    accepted_lock()
    verify_candidate_merge()

    MUTATION_STATE["temporary_filesystem_mutation_possible"] = True
    temp = Path(tempfile.mkdtemp(prefix="void-e2-first-entry-materializer-v2-"))
    temp_identity = _directory_identity(temp.lstat())
    worktree = temp / "candidate-worktree"
    worktree_identity = None
    attempted = False
    result = None
    failure = None
    try:
        attempted = True
        MUTATION_STATE["git_worktree_mutation_possible"] = True
        cp = subprocess.run(
            [
                "/usr/bin/git", "--no-replace-objects", "-C", os.fspath(ROOT),
                "worktree", "add", "--detach", os.fspath(worktree), CANDIDATE_MERGE,
            ],
            cwd=ROOT,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=GIT_ENV,
            check=False,
            timeout=60,
        )
        if cp.returncode != 0:
            raise MaterializeError("candidate_worktree_add_failed")
        worktree_opened = worktree.lstat()
        if not stat.S_ISDIR(worktree_opened.st_mode):
            raise MaterializeError("candidate_worktree_directory_invalid")
        worktree_identity = _directory_identity(worktree_opened)
        if run_git(["rev-parse", "HEAD"], cwd=worktree) != CANDIDATE_MERGE:
            raise MaterializeError("candidate_worktree_head_mismatch")
        if run_git(["rev-parse", "HEAD^{tree}"], cwd=worktree) != CANDIDATE_TREE:
            raise MaterializeError("candidate_worktree_tree_mismatch")
        if run_git(
            ["status", "--porcelain=v1", "--untracked-files=all"],
            cwd=worktree,
        ) != "":
            raise MaterializeError("candidate_worktree_dirty")

        module = load_candidate_from_worktree(worktree)
        try:
            report, binary = module.derive()
        except Exception as exc:
            raise MaterializeError("candidate_rederivation_failed") from exc
        if not isinstance(report, dict) or not isinstance(binary, bytes):
            raise MaterializeError("candidate_rederivation_type_invalid")

        report_bytes = canonical(report)
        if (
            len(report_bytes) != EXPECTED_REPORT_BYTES
            or sha256(report_bytes) != EXPECTED_REPORT_SHA256
            or git_blob(report_bytes) != EXPECTED_REPORT_GIT_BLOB_SHA1
            or report.get("candidate_id") != EXPECTED_CANDIDATE_ID
            or report.get("repository_head") != CANDIDATE_MERGE
            or report.get("repository_tree") != CANDIDATE_TREE
        ):
            raise MaterializeError("candidate_report_identity_mismatch")
        if (
            len(binary) != EXPECTED_BINARY_BYTES
            or sha256(binary) != EXPECTED_BINARY_SHA256
            or git_blob(binary) != EXPECTED_BINARY_GIT_BLOB_SHA1
            or not binary.startswith(b"\x7fELF")
        ):
            raise MaterializeError("candidate_binary_identity_mismatch")
        result = (report_bytes, binary)
        MUTATION_STATE["candidate_rederivation_completed"] = True
    except BaseException as exc:
        failure = exc
    try:
        _cleanup_derivation(temp, temp_identity, worktree, worktree_identity, attempted)
    except BaseException as exc:
        raise MaterializeError(
            "derivation_cleanup_failed:primary=" + _failure_reason(failure)
            + ":cleanup=" + _failure_reason(exc)
        ) from exc
    if failure is not None:
        if isinstance(failure, (MaterializeError, KeyboardInterrupt, SystemExit)):
            raise failure
        raise MaterializeError("candidate_derivation_failed:" + _failure_reason(failure)) from failure
    if result is None:
        raise MaterializeError("candidate_derivation_result_missing")
    return result


def write_create_only(output: Path, raw: bytes) -> None:
    output = Path(os.path.abspath(os.fspath(output)))
    parent = output.parent
    try:
        parent_before = parent.lstat()
    except OSError as exc:
        raise MaterializeError("output_parent_unavailable") from exc
    if not stat.S_ISDIR(parent_before.st_mode) or stat.S_ISLNK(parent_before.st_mode):
        raise MaterializeError("output_parent_invalid")

    parent_fd = os.open(
        parent,
        os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    fd: int | None = None
    try:
        parent_opened = os.fstat(parent_fd)
        parent_visible = parent.lstat()
        if (
            parent_opened.st_dev != parent_before.st_dev
            or parent_opened.st_ino != parent_before.st_ino
            or parent_visible.st_dev != parent_opened.st_dev
            or parent_visible.st_ino != parent_opened.st_ino
        ):
            raise MaterializeError("output_parent_generation_changed")

        MUTATION_STATE["output_creation_attempted"] = True
        try:
            fd = os.open(
                output.name,
                os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
                0o500,
                dir_fd=parent_fd,
            )
        except FileExistsError as exc:
            raise MaterializeError("output_exists") from exc

        MUTATION_STATE["output_created"] = True
        created = os.fstat(fd)
        view = memoryview(raw)
        offset = 0
        while offset < len(view):
            wrote = os.write(fd, view[offset:])
            if wrote <= 0:
                raise MaterializeError("output_short_write")
            offset += wrote
        os.fchmod(fd, 0o555)
        os.fsync(fd)

        after = os.fstat(fd)
        if (
            not stat.S_ISREG(after.st_mode)
            or after.st_dev != created.st_dev
            or after.st_ino != created.st_ino
            or after.st_nlink != 1
            or stat.S_IMODE(after.st_mode) != 0o555
            or after.st_size != EXPECTED_BINARY_BYTES
        ):
            raise MaterializeError("output_metadata_invalid")

        os.lseek(fd, 0, os.SEEK_SET)
        observed = bytearray()
        while len(observed) < EXPECTED_BINARY_BYTES:
            chunk = os.read(
                fd,
                min(1024 * 1024, EXPECTED_BINARY_BYTES - len(observed)),
            )
            if not chunk:
                raise MaterializeError("output_short_read")
            observed.extend(chunk)
        if (
            bytes(observed) != raw
            or sha256(bytes(observed)) != EXPECTED_BINARY_SHA256
            or os.read(fd, 1)
        ):
            raise MaterializeError("output_descriptor_readback_mismatch")

        os.fsync(parent_fd)
        visible = os.stat(
            output.name,
            dir_fd=parent_fd,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(visible.st_mode)
            or visible.st_dev != created.st_dev
            or visible.st_ino != created.st_ino
            or visible.st_nlink != 1
            or stat.S_IMODE(visible.st_mode) != 0o555
            or visible.st_size != EXPECTED_BINARY_BYTES
        ):
            raise MaterializeError("output_visible_generation_changed")
        if (
            _stat_identity(os.fstat(fd)) != _stat_identity(after)
            or _stat_identity(visible) != _stat_identity(after)
        ):
            raise MaterializeError("output_final_generation_changed")
        if (
            _directory_identity(os.fstat(parent_fd)) != _directory_identity(parent_opened)
            or _directory_identity(parent.lstat()) != _directory_identity(parent_opened)
        ):
            raise MaterializeError("output_parent_changed_after_publication")
        if _stat_identity(output.lstat()) != _stat_identity(after):
            raise MaterializeError("output_absolute_leaf_generation_changed")
    finally:
        try:
            if fd is not None:
                os.close(fd)
        finally:
            os.close(parent_fd)
    MUTATION_STATE["output_verified"] = True


def self_test() -> None:
    lock = accepted_lock()
    verify_candidate_merge()
    if lock.get("lock_id") != LOCK_ID:
        raise AssertionError("lock_id_drift")
    if EXPECTED_BINARY_BYTES != 731_072 or len(EXPECTED_BINARY_SHA256) != 64:
        raise AssertionError("accepted_binary_constants_invalid")
    if GIT_ENV.get("GIT_NO_LAZY_FETCH") != "1":
        raise AssertionError("git_lazy_fetch_guard_missing")
    if GIT_ENV.get("GIT_ALLOW_PROTOCOL") != "":
        raise AssertionError("git_transport_guard_missing")
    source = Path(__file__).read_text(encoding="utf-8")
    for required in (
        "worktree",
        "CANDIDATE_MERGE",
        "load_candidate_from_worktree",
        "module.derive()",
        "os.O_EXCL",
        "os.O_NOFOLLOW",
        "os.fsync(fd)",
        "os.fsync(parent_fd)",
        "output_descriptor_readback_mismatch",
        "output_visible_generation_changed",
    ):
        if required not in source:
            raise AssertionError("materializer_invariant_missing:" + required)
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_first_entry_lock_v2_bound=true")
    print("runtime_head_contract_accepted=true")
    print("superseded_v1_lock_install_authority=false")
    print("candidate_merge_exact=true")
    print("candidate_tool_verification_required=true")
    print("candidate_rederivation_required=true")
    print("create_only_output_required=true")
    print("output_descriptor_readback_required=true")
    print("output_parent_directory_fsync_required=true")
    print("output_visible_parent_and_leaf_binding_required=true")
    print("worktree_cleanup_verification_required=true")
    print("git_lazy_fetch_disabled=true")
    print("git_transport_disabled=true")
    print("output_failure_destructive_cleanup=false")
    print("launcher_binary_identity_accepted=true")
    print("protected_install_authorized=false")
    print("precision_install_authorized=false")
    print("native_or_binder_live_execution_authorized=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--derive", type=Path)
    args = parser.parse_args()
    MUTATION_STATE.update({name: False for name in MUTATION_STATE})
    _emit_authority(args.derive is not None)

    if args.self_test:
        self_test()
        _emit_mutation_state()
        return 0

    output = Path(os.path.abspath(os.fspath(args.derive)))
    if os.path.lexists(output):
        raise MaterializeError("output_exists")
    report_bytes, binary = derive_accepted()
    write_create_only(output, binary)
    print(MARKER + "_DERIVE_GREEN")
    print("output=" + os.fspath(output))
    print("candidate_report_sha256=" + sha256(report_bytes))
    print("candidate_id=" + EXPECTED_CANDIDATE_ID)
    print("launcher_binary_bytes=" + str(len(binary)))
    print("launcher_binary_sha256=" + sha256(binary))
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_rederived_at_locked_merge=true")
    print("output_visible_parent_and_leaf_verified=true")
    print("runtime_head_contract_accepted=true")
    print("superseded_v1_lock_install_authority=false")
    print("output_descriptor_readback=true")
    print("output_parent_directory_fsync=true")
    print("output_failure_destructive_cleanup=false")
    print("launcher_binary_identity_accepted=true")
    print("protected_install_authorized=false")
    print("precision_install_authorized=false")
    print("native_or_binder_live_execution_authorized=false")
    print("funds_movement=false")
    _emit_mutation_state()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (
        MaterializeError, OSError, subprocess.SubprocessError,
        UnicodeError, MemoryError, KeyboardInterrupt,
    ) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + _failure_reason(exc))
        print("protected_install_authorized=false")
        print("precision_install_authorized=false")
        print("native_or_binder_live_execution_authorized=false")
        print("funds_movement=false")
        print("protected_installer_consumer_bound=false")
        print("output_failure_destructive_cleanup=false")
        _emit_mutation_state()
        raise SystemExit(2)

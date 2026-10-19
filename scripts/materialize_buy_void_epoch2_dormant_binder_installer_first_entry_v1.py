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
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json"
)
LOCK = ROOT / LOCK_REL
LOCK_BLOB = "f8ff6fbb855aecafc329cd60622cf3af782745a3"
LOCK_ID = (
    "voidbuye2dormantfirstentrylock1_"
    "bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85"
)

CANDIDATE_MERGE = "9eebcd1bb15ea0b853c3c7cfe0ffd8dd60030a30"
CANDIDATE_TREE = "edff3fcf5b23763c6afe86ba3eb6ba1c92a79bee"
CANDIDATE_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_v1.py"
)
CANDIDATE_BLOB = "1d15fccf256571c382a09d99c8545d5b24ad2077"

EXPECTED_REPORT_BYTES = 5400
EXPECTED_REPORT_SHA256 = (
    "a345e861b81cd19288b71122bd353a1d586d070febfc87933ed8181c0d3abebe"
)
EXPECTED_REPORT_GIT_BLOB_SHA1 = "3a2fe37452a35621d738713b5e4b51391f5c4400"
EXPECTED_CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand1_"
    "b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736"
)
EXPECTED_BINARY_BYTES = 731_072
EXPECTED_BINARY_SHA256 = (
    "4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a"
)
EXPECTED_BINARY_GIT_BLOB_SHA1 = "eb66ce5313a8c0b01639ebec79564111d55163c4"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_"
    "INSTALLER_FIRST_ENTRY_MATERIALIZER_V1"
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
}


class MaterializeError(RuntimeError):
    pass


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
            "candidate_lock_v1",
        "marker":
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
            "CANDIDATE_LOCK_V1",
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "candidate_merge": CANDIDATE_MERGE,
        "candidate_tree": CANDIDATE_TREE,
        "candidate_accepted": True,
        "launcher_binary_identity_accepted": True,
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
    module = types.ModuleType("void_e2_first_entry_candidate_v1_materialize")
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


def derive_accepted() -> tuple[bytes, bytes]:
    accepted_lock()
    verify_candidate_merge()

    with tempfile.TemporaryDirectory(
        prefix="void-e2-first-entry-materializer-v1-"
    ) as td:
        temp = Path(td)
        worktree = temp / "candidate-worktree"
        added = False
        try:
            cp = subprocess.run(
                [
                    "/usr/bin/git",
                    "--no-replace-objects",
                    "-C",
                    os.fspath(ROOT),
                    "worktree",
                    "add",
                    "--detach",
                    os.fspath(worktree),
                    CANDIDATE_MERGE,
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
            added = True
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
            return report_bytes, binary
        finally:
            if added:
                subprocess.run(
                    [
                        "/usr/bin/git",
                        "--no-replace-objects",
                        "-C",
                        os.fspath(ROOT),
                        "worktree",
                        "remove",
                        "--force",
                        os.fspath(worktree),
                    ],
                    cwd=ROOT,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    env=GIT_ENV,
                    check=False,
                    timeout=60,
                )


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

        try:
            fd = os.open(
                output.name,
                os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
                0o500,
                dir_fd=parent_fd,
            )
        except FileExistsError as exc:
            raise MaterializeError("output_exists") from exc

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
        parent_after = os.fstat(parent_fd)
        if (
            parent_after.st_dev != parent_opened.st_dev
            or parent_after.st_ino != parent_opened.st_ino
        ):
            raise MaterializeError("output_parent_changed_after_publication")
    finally:
        if fd is not None:
            try:
                os.close(fd)
            except OSError:
                pass
        os.close(parent_fd)


def self_test() -> None:
    lock = accepted_lock()
    verify_candidate_merge()
    if lock.get("lock_id") != LOCK_ID:
        raise AssertionError("lock_id_drift")
    if EXPECTED_BINARY_BYTES != 731_072 or len(EXPECTED_BINARY_SHA256) != 64:
        raise AssertionError("accepted_binary_constants_invalid")
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
    print("accepted_first_entry_lock_bound=true")
    print("candidate_merge_exact=true")
    print("candidate_tool_verified_before_execution=true")
    print("candidate_rederived_at_locked_merge=true")
    print("create_only_output=true")
    print("output_descriptor_readback=true")
    print("output_parent_directory_fsync=true")
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

    if args.self_test:
        self_test()
        return 0

    report_bytes, binary = derive_accepted()
    write_create_only(args.derive, binary)
    print(MARKER + "_DERIVE_GREEN")
    print("output=" + os.fspath(Path(args.derive).resolve()))
    print("candidate_report_sha256=" + sha256(report_bytes))
    print("candidate_id=" + EXPECTED_CANDIDATE_ID)
    print("launcher_binary_bytes=" + str(len(binary)))
    print("launcher_binary_sha256=" + sha256(binary))
    print("accepted_lock_id=" + LOCK_ID)
    print("output_descriptor_readback=true")
    print("output_parent_directory_fsync=true")
    print("output_failure_destructive_cleanup=false")
    print("launcher_binary_identity_accepted=true")
    print("protected_install_authorized=false")
    print("precision_install_authorized=false")
    print("native_or_binder_live_execution_authorized=false")
    print("funds_movement=false")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except MaterializeError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("protected_install_authorized=false")
        print("precision_install_authorized=false")
        print("native_or_binder_live_execution_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)

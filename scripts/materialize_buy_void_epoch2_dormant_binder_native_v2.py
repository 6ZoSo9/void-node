#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import stat
import subprocess
import tempfile
import types

ROOT = pathlib.Path(__file__).resolve().parents[1]
GIT = pathlib.Path("/usr/bin/git")

LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
LOCK_ID = (
    "voidbuye2dormantbinderlock3_"
    "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a"
)

CANDIDATE_MERGE = "2b76758851d550e8cbd5fc71412e4b85cfaa8791"
CANDIDATE_REL = "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v2.py"
CANDIDATE_BLOB = "f97cb8aff642f2f3e138fe8e087eece22223b934"

EXPECTED_REPORT_BYTES = 7870
EXPECTED_REPORT_SHA256 = "f21445a333a2c05d132692c29aa929a1de727d6f6f35ce2edac600a7cccfa4a2"
EXPECTED_REPORT_GIT_BLOB = "4ba13c0b8a471d36c7644754e27ec0b8c07481ca"
EXPECTED_CANDIDATE_ID = (
    "voidbuye2dormantbindercand2_"
    "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"
)
EXPECTED_BINARY_BYTES = 726_976
EXPECTED_BINARY_SHA256 = "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_MATERIALIZER_V1"

CLEAN_ENV = {
    "PATH": "/usr/bin:/bin",
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


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw)
    return h.hexdigest()


def run_git(args: list[str], *, cwd: pathlib.Path = ROOT, timeout: int = 60) -> str:
    cp = subprocess.run(
        [os.fspath(GIT), "-C", os.fspath(cwd), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=timeout,
        env=CLEAN_ENV,
    )
    if cp.returncode != 0:
        raise MaterializeError(
            "git_failed:" + str(args[0]) + ":" + cp.stderr[-1000:].replace("\n", " ")
        )
    if cp.stderr != "":
        raise MaterializeError("git_unexpected_stderr:" + str(args[0]))
    return cp.stdout.strip()


def stable_file(path: pathlib.Path, maximum: int, label: str) -> bytes:
    try:
        before = path.lstat()
    except OSError as exc:
        raise MaterializeError(label + "_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise MaterializeError(label + "_metadata_invalid")
    raw = path.read_bytes()
    after = path.lstat()
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
        or len(raw) != before.st_size
    ):
        raise MaterializeError(label + "_generation_changed")
    return raw


def accepted_lock() -> dict:
    raw = stable_file(ROOT / LOCK_REL, 64 * 1024, "accepted_lock")
    if git_blob_sha1(raw) != LOCK_BLOB:
        raise MaterializeError("accepted_lock_blob_mismatch")
    try:
        lock = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise MaterializeError("accepted_lock_json_invalid") from exc
    if not isinstance(lock, dict):
        raise MaterializeError("accepted_lock_shape_invalid")
    required = {
        "lock_id": LOCK_ID,
        "candidate_merge": CANDIDATE_MERGE,
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "binder_source_identity_bound": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
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
        "next_gate": "void_buy_void_epoch2_dormant_binder_native_protected_install_v2",
    }
    for key, expected in required.items():
        if lock.get(key) != expected:
            raise MaterializeError("accepted_lock_field_mismatch:" + key)
    report = lock.get("candidate_report")
    if not isinstance(report, dict):
        raise MaterializeError("accepted_lock_report_missing")
    expected_report = {
        "bytes": EXPECTED_REPORT_BYTES,
        "sha256": EXPECTED_REPORT_SHA256,
        "git_blob_sha1": EXPECTED_REPORT_GIT_BLOB,
        "candidate_id": EXPECTED_CANDIDATE_ID,
        "candidate_script_git_blob_sha1": CANDIDATE_BLOB,
        "native_binary_sha256": EXPECTED_BINARY_SHA256,
        "native_binary_bytes": EXPECTED_BINARY_BYTES,
        "sealed_source_snapshot": True,
        "checkout_path_is_not_build_authority": True,
        "toolchain_root_custody_verified": True,
        "toolchain_revalidated_after_build": True,
        "static_no_interp": True,
        "hostile_ld_preload_blocked": True,
        "failure_truth_boundary_semantics_bound": True,
        "verified_helper_execution_bound": True,
    }
    for key, expected in expected_report.items():
        if report.get(key) != expected:
            raise MaterializeError("accepted_lock_report_mismatch:" + key)
    return lock


def verify_current_repository() -> None:
    head = run_git(["rev-parse", "--verify", "HEAD"])
    if len(head) != 40 or any(ch not in "0123456789abcdef" for ch in head):
        raise MaterializeError("current_head_invalid")
    if run_git(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise MaterializeError("current_checkout_not_clean")
    run_git(["cat-file", "-e", CANDIDATE_MERGE + "^{commit}"])
    cp = subprocess.run(
        [os.fspath(GIT), "-C", os.fspath(ROOT), "merge-base", "--is-ancestor",
         CANDIDATE_MERGE, "HEAD"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=20,
        env=CLEAN_ENV,
    )
    if cp.returncode != 0 or cp.stdout or cp.stderr:
        raise MaterializeError("candidate_merge_not_current_ancestor")
    if run_git(["rev-parse", "HEAD:" + LOCK_REL]) != LOCK_BLOB:
        raise MaterializeError("current_lock_blob_mismatch")


def load_candidate_module(worktree: pathlib.Path):
    source_path = worktree / CANDIDATE_REL
    raw = stable_file(source_path, 2 * 1024 * 1024, "candidate_source")
    if git_blob_sha1(raw) != CANDIDATE_BLOB:
        raise MaterializeError("candidate_source_blob_mismatch")
    module = types.ModuleType("void_e2_dormant_binder_candidate_v2_materialized")
    module.__file__ = os.fspath(source_path)
    module.__package__ = ""
    code = compile(raw, os.fspath(source_path), "exec", dont_inherit=True)
    exec(code, module.__dict__)
    return module


def derive_accepted() -> tuple[bytes, bytes]:
    accepted_lock()
    verify_current_repository()
    with tempfile.TemporaryDirectory(prefix="void-e2-dormant-native-materializer-") as td:
        worktree = pathlib.Path(td) / "candidate"
        added = False
        try:
            cp = subprocess.run(
                [
                    os.fspath(GIT), "-C", os.fspath(ROOT), "worktree", "add",
                    "--detach", os.fspath(worktree), CANDIDATE_MERGE,
                ],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                timeout=60,
                env=CLEAN_ENV,
            )
            if cp.returncode != 0:
                raise MaterializeError(
                    "candidate_worktree_add_failed:"
                    + cp.stderr.decode("utf-8", "replace")[-1000:].replace("\n", " ")
                )
            added = True
            if run_git(["rev-parse", "HEAD"], cwd=worktree) != CANDIDATE_MERGE:
                raise MaterializeError("candidate_worktree_head_mismatch")
            if run_git(["status", "--porcelain=v1", "--untracked-files=all"], cwd=worktree) != "":
                raise MaterializeError("candidate_worktree_not_clean")
            if run_git(["rev-parse", "HEAD:" + CANDIDATE_REL], cwd=worktree) != CANDIDATE_BLOB:
                raise MaterializeError("candidate_worktree_source_blob_mismatch")

            module = load_candidate_module(worktree)
            report, binary = module.derive()
            report_bytes = (
                module.canonical(report) + "\n"
            ).encode("utf-8")

            if (
                len(report_bytes) != EXPECTED_REPORT_BYTES
                or sha256(report_bytes) != EXPECTED_REPORT_SHA256
                or git_blob_sha1(report_bytes) != EXPECTED_REPORT_GIT_BLOB
                or report.get("candidate_id") != EXPECTED_CANDIDATE_ID
            ):
                raise MaterializeError("candidate_report_identity_mismatch")
            if (
                len(binary) != EXPECTED_BINARY_BYTES
                or sha256(binary) != EXPECTED_BINARY_SHA256
                or not binary.startswith(b"\x7fELF")
            ):
                raise MaterializeError("candidate_binary_identity_mismatch")
            return report_bytes, binary
        finally:
            if added:
                subprocess.run(
                    [
                        os.fspath(GIT), "-C", os.fspath(ROOT), "worktree", "remove",
                        "--force", os.fspath(worktree),
                    ],
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False,
                    timeout=30,
                    env=CLEAN_ENV,
                )


def write_create_only(output: pathlib.Path, binary: bytes) -> None:
    target = output.resolve(strict=False)
    parent = target.parent
    try:
        parent_st = parent.lstat()
    except OSError as exc:
        raise MaterializeError("output_parent_unavailable") from exc
    if not stat.S_ISDIR(parent_st.st_mode) or stat.S_ISLNK(parent_st.st_mode):
        raise MaterializeError("output_parent_not_real_directory")
    fd = None
    parent_fd = None
    try:
        parent_fd = os.open(
            parent, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW
        )
        fd = os.open(
            target.name,
            os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
            0o400,
            dir_fd=parent_fd,
        )
        view = memoryview(binary)
        offset = 0
        while offset < len(view):
            wrote = os.write(fd, view[offset:])
            if wrote <= 0:
                raise MaterializeError("output_short_write")
            offset += wrote
        os.fchmod(fd, 0o555)
        os.fsync(fd)
        os.lseek(fd, 0, os.SEEK_SET)
        readback = bytearray()
        while len(readback) < len(binary):
            chunk = os.read(fd, min(1024 * 1024, len(binary) - len(readback)))
            if not chunk:
                raise MaterializeError("output_short_readback")
            readback.extend(chunk)
        if os.read(fd, 1):
            raise MaterializeError("output_grew")
        st = os.fstat(fd)
        visible = os.stat(target.name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            st.st_dev != visible.st_dev
            or st.st_ino != visible.st_ino
            or not stat.S_ISREG(st.st_mode)
            or stat.S_IMODE(st.st_mode) != 0o555
            or st.st_nlink != 1
            or st.st_size != EXPECTED_BINARY_BYTES
            or bytes(readback) != binary
            or sha256(bytes(readback)) != EXPECTED_BINARY_SHA256
        ):
            raise MaterializeError("output_readback_identity_mismatch")
        os.fsync(parent_fd)
    except FileExistsError as exc:
        raise MaterializeError("output_exists") from exc
    finally:
        if fd is not None:
            os.close(fd)
        if parent_fd is not None:
            os.close(parent_fd)


def self_test() -> None:
    lock = accepted_lock()
    assert lock["lock_id"] == LOCK_ID
    assert lock["candidate_report"]["candidate_id"] == EXPECTED_CANDIDATE_ID
    assert lock["candidate_report"]["native_binary_sha256"] == EXPECTED_BINARY_SHA256
    assert lock["candidate_report"]["native_binary_bytes"] == EXPECTED_BINARY_BYTES
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_lock_bound=true")
    print("candidate_merge_frozen=true")
    print("candidate_source_blob_bound=true")
    print("candidate_report_identity_bound=true")
    print("native_binary_identity_accepted=true")
    print("create_only_output_required=true")
    print("output_mode_0555=true")
    print("protected_install_authorized=false")
    print("native_or_binder_live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--derive", type=pathlib.Path)
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0

    report_bytes, binary = derive_accepted()
    write_create_only(args.derive, binary)
    print(MARKER + "_DERIVE_GREEN")
    print("output=" + os.fspath(args.derive.resolve()))
    print("candidate_report_bytes=" + str(len(report_bytes)))
    print("candidate_report_sha256=" + sha256(report_bytes))
    print("candidate_report_git_blob=" + git_blob_sha1(report_bytes))
    print("candidate_id=" + EXPECTED_CANDIDATE_ID)
    print("native_binary_bytes=" + str(len(binary)))
    print("native_binary_sha256=" + sha256(binary))
    print("accepted_lock_id=" + LOCK_ID)
    print("output_descriptor_readback=true")
    print("output_parent_directory_fsync=true")
    print("output_failure_destructive_cleanup=false")
    print("native_binary_identity_accepted=true")
    print("protected_install_authorized=false")
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
        print("native_or_binder_live_execution_authorized=false")
        print("credential_access_authorized=false")
        print("signing_authorized=false")
        print("transaction_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)

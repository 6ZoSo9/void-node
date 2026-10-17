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

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v1.json"
)
LOCK_BLOB = "a96dee99c89ef386a6cbd05609b8f4a764caada8"
LOCK_ID = (
    "voidbuye2bootstraplock1_"
    "4f11418d278908c99cc3b2de622112321600c3f3704f8919e893a2d7011b1b23"
)

CANDIDATE_MERGE = "0ea097a3fa43dc95a1a0a5272c61afe570361fc7"
CANDIDATE_TREE = "681e9387826f2c0fe8c0336604dfd6e57ff16d93"
CANDIDATE_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_first_entry_protected_install_"
    "bootstrap_candidate_v1.py"
)
CANDIDATE_BLOB = "d1417455330837c4d584f7bf36f932a869c903cb"

EXPECTED_REPORT_BYTES = 4_705
EXPECTED_REPORT_SHA256 = (
    "b3f909c391ce617b7a8e796749bb57ce69f95b27259dd9da1c0fae849d6e74f7"
)
EXPECTED_REPORT_GIT_BLOB = "0675dbcc993171edb2bbbbc7fd9481e4ed0ef006"
EXPECTED_CANDIDATE_ID = (
    "voidbuye2bootstrapcand1_"
    "24d4c84d307c525cc4e28f010c7f2258db2e55256af7d8cf0cb303cf1c4ee851"
)
EXPECTED_BINARY_BYTES = 731_072
EXPECTED_BINARY_SHA256 = (
    "1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189"
)
EXPECTED_BINARY_GIT_BLOB = "5d35e762fa4b510baeb89b2840d5287cc4fd6716"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_"
    "BOOTSTRAP_MATERIALIZER_V1"
)

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


def run_git(
    args: list[str],
    *,
    cwd: pathlib.Path = ROOT,
    timeout: int = 60,
) -> str:
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
            "git_failed:"
            + str(args[0])
            + ":"
            + cp.stderr[-1000:].replace("\n", " ")
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
        "candidate_source_head": CANDIDATE_MERGE,
        "candidate_source_tree": CANDIDATE_TREE,
        "candidate_accepted": True,
        "bootstrap_binary_identity_accepted": True,
        "bootstrap_source_identity_bound": True,
        "installer_source_identity_bound": True,
        "protected_bootstrap_install_authorized": False,
        "protected_installer_apply_authorized": False,
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
        "production_host_evidence_authority": False,
        "next_gate": (
            "void_buy_void_epoch2_dormant_first_entry_protected_install_"
            "bootstrap_install_v1"
        ),
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
        "candidate_proof_git_blob_sha1": CANDIDATE_BLOB,
        "bootstrap_binary_git_blob_sha1": EXPECTED_BINARY_GIT_BLOB,
        "bootstrap_binary_sha256": EXPECTED_BINARY_SHA256,
        "bootstrap_binary_bytes": EXPECTED_BINARY_BYTES,
        "sealed_bootstrap_source_snapshot": True,
        "production_defaults_preserved": True,
        "toolchain_root_custody_verified": True,
        "toolchain_revalidated_after_build": True,
        "two_builds_byte_identical": True,
        "static_no_interp": True,
        "dynamic_needed_absent": True,
        "semantic_report_validation_fail_closed": True,
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
    if run_git(["rev-parse", CANDIDATE_MERGE + "^{tree}"]) != CANDIDATE_TREE:
        raise MaterializeError("candidate_tree_mismatch")

    cp = subprocess.run(
        [
            os.fspath(GIT),
            "-C",
            os.fspath(ROOT),
            "merge-base",
            "--is-ancestor",
            CANDIDATE_MERGE,
            "HEAD",
        ],
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
    module = types.ModuleType("void_e2_protected_bootstrap_candidate_v1_materialized")
    module.__file__ = os.fspath(source_path)
    module.__package__ = ""
    code = compile(raw, os.fspath(source_path), "exec", dont_inherit=True)
    exec(code, module.__dict__)
    return module


def derive_accepted() -> tuple[bytes, bytes]:
    accepted_lock()
    verify_current_repository()

    with tempfile.TemporaryDirectory(
        prefix="void-e2-protected-bootstrap-materializer-"
    ) as td:
        worktree = pathlib.Path(td) / "candidate"
        added = False
        try:
            cp = subprocess.run(
                [
                    os.fspath(GIT),
                    "-C",
                    os.fspath(ROOT),
                    "worktree",
                    "add",
                    "--detach",
                    os.fspath(worktree),
                    CANDIDATE_MERGE,
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
            if (
                run_git(
                    ["status", "--porcelain=v1", "--untracked-files=all"],
                    cwd=worktree,
                )
                != ""
            ):
                raise MaterializeError("candidate_worktree_not_clean")
            if (
                run_git(["rev-parse", "HEAD:" + CANDIDATE_REL], cwd=worktree)
                != CANDIDATE_BLOB
            ):
                raise MaterializeError("candidate_worktree_source_blob_mismatch")

            module = load_candidate_module(worktree)
            report, binary = module.derive()
            report_bytes = (module.canonical(report) + "\n").encode("utf-8")

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
                or git_blob_sha1(binary) != EXPECTED_BINARY_GIT_BLOB
                or not binary.startswith(b"\x7fELF")
            ):
                raise MaterializeError("candidate_binary_identity_mismatch")

            return report_bytes, binary
        finally:
            if added:
                subprocess.run(
                    [
                        os.fspath(GIT),
                        "-C",
                        os.fspath(ROOT),
                        "worktree",
                        "remove",
                        "--force",
                        os.fspath(worktree),
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

    parent_fd = None
    fd = None
    try:
        parent_fd = os.open(
            parent,
            os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
        )
        fd = os.open(
            target.name,
            os.O_RDWR
            | os.O_CREAT
            | os.O_EXCL
            | os.O_CLOEXEC
            | os.O_NOFOLLOW,
            0o500,
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

        opened = os.fstat(fd)
        visible = os.stat(target.name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            opened.st_dev != visible.st_dev
            or opened.st_ino != visible.st_ino
            or not stat.S_ISREG(opened.st_mode)
            or stat.S_IMODE(opened.st_mode) != 0o555
            or opened.st_nlink != 1
            or opened.st_size != EXPECTED_BINARY_BYTES
            or bytes(readback) != binary
            or sha256(bytes(readback)) != EXPECTED_BINARY_SHA256
            or git_blob_sha1(bytes(readback)) != EXPECTED_BINARY_GIT_BLOB
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
    assert lock["candidate_source_head"] == CANDIDATE_MERGE
    assert lock["candidate_report"]["candidate_id"] == EXPECTED_CANDIDATE_ID
    assert (
        lock["candidate_report"]["bootstrap_binary_sha256"]
        == EXPECTED_BINARY_SHA256
    )
    assert (
        lock["candidate_report"]["bootstrap_binary_bytes"]
        == EXPECTED_BINARY_BYTES
    )
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_lock_bound=true")
    print("candidate_merge_frozen=true")
    print("candidate_source_blob_bound=true")
    print("candidate_report_identity_bound=true")
    print("bootstrap_binary_identity_accepted=true")
    print("create_only_output_required=true")
    print("output_mode_0555=true")
    print("protected_bootstrap_install_authorized=false")
    print("protected_installer_apply_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
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
    print("bootstrap_binary_bytes=" + str(len(binary)))
    print("bootstrap_binary_sha256=" + sha256(binary))
    print("bootstrap_binary_git_blob=" + git_blob_sha1(binary))
    print("accepted_lock_id=" + LOCK_ID)
    print("output_descriptor_readback=true")
    print("output_parent_directory_fsync=true")
    print("output_failure_destructive_cleanup=false")
    print("bootstrap_binary_identity_accepted=true")
    print("protected_bootstrap_install_authorized=false")
    print("protected_installer_apply_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("funds_movement=false")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except MaterializeError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("protected_bootstrap_install_authorized=false")
        print("protected_installer_apply_authorized=false")
        print("live_execution_authorized=false")
        print("credential_access_authorized=false")
        print("signing_authorized=false")
        print("transaction_authorized=false")
        print("rpc_call_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)

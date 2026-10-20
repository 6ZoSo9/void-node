#!/usr/bin/env python3
"""Source-only candidate for a separately installed, read-only Epoch-2 host-plan entry.

Production invocation is HOLD until this exact entry is independently installed
at its root-custodied path and independently reviewed. Self-test is fixture-only.
"""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

MARKER = "VOID_BUY_VOID_EPOCH2_V6R3_AUTHENTICATED_HOST_PLAN_FIRST_ENTRY_V1"
ENTRY = Path("/opt/void-buy-void-epoch2-v6r3-host-plan-entry-v1/entry.py")
PYTHON = Path("/usr/bin/python3.12")
PLANNER = Path("/home/zoso/dev/void-node/ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py")
PLANNER_GIT_BLOB = "19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff"
PLANNER_SHA256 = "95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627"
PLANNER_BYTES = 49025
LOCK_ID = "voidbuye2runnerpollock6r3_0633e059bfdfb1209b80b090adacddae61795ca610a6bf7f79059cc997148f52"
CANDIDATE_ID = "voidbuye2runnerpolcand6r3_0a3bfc00032b0feeb253fb0f295b4dacc1e3e66af35013676351ed11e3c119e1"
RUNTIME_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
RUNTIME_UID = 1000
RUNTIME_GID = 1000
MAX_REPORT_BYTES = 256 * 1024
SEALS = fcntl.F_SEAL_WRITE | fcntl.F_SEAL_GROW | fcntl.F_SEAL_SHRINK | fcntl.F_SEAL_SEAL
IDENTITY = ("st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink", "st_size", "st_mtime_ns", "st_ctime_ns")
FORBIDDEN = (
    "filesystem_write", "runner_execution", "native_execution",
    "live_composition_execution", "service_mutation", "systemd_mutation",
    "credential_access", "private_key_access", "signing", "transaction",
    "rpc_call", "payment_acceptance", "public_presale_activation",
    "wc_void_market_activation", "treasury_liquidity_action",
    "funds_movement", "production_host_evidence_authority",
)


class Hold(RuntimeError):
    pass


def identity(st: os.stat_result) -> tuple[int, ...]:
    return tuple(getattr(st, name) for name in IDENTITY)


def digest(data: bytes) -> tuple[str, str]:
    git_blob = hashlib.sha1(
        b"blob " + str(len(data)).encode("ascii") + b"\0" + data
    ).hexdigest()
    return git_blob, hashlib.sha256(data).hexdigest()


def clean_env() -> dict[str, str]:
    return {
        "PATH": "/usr/bin:/bin", "HOME": "/home/zoso",
        "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
        "PYTHONNOUSERSITE": "1",
    }


def root_chain(path: Path) -> tuple[tuple[Path, tuple[int, ...]], ...]:
    if not path.is_absolute() or Path(os.path.abspath(path)) != path:
        raise Hold("rooted_path_not_canonical")
    rows = []
    for ancestor in reversed((path.parent, *path.parent.parents)):
        try:
            st = ancestor.lstat()
        except OSError as exc:
            raise Hold("rooted_ancestor_unavailable") from exc
        if (
            not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0 or st.st_gid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
            or os.access(ancestor, os.W_OK, effective_ids=True)
        ):
            raise Hold("rooted_ancestor_custody_invalid")
        rows.append((ancestor, identity(st)))
    return tuple(rows)


def revalidate_chain(chain: tuple[tuple[Path, tuple[int, ...]], ...]) -> None:
    for path, expected in chain:
        try:
            st = path.lstat()
        except OSError as exc:
            raise Hold("rooted_ancestor_changed") from exc
        if identity(st) != expected or os.access(path, os.W_OK, effective_ids=True):
            raise Hold("rooted_ancestor_changed")


def root_leaf(path: Path, *, executable: bool, required_mode: int | None = None) -> tuple[int, ...]:
    st = path.lstat()
    mode = stat.S_IMODE(st.st_mode)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0 or st.st_gid != 0 or st.st_nlink != 1
        or mode & 0o022 or st.st_size < 1
        or (executable and mode & 0o111 == 0)
        or (required_mode is not None and mode != required_mode)
        or os.access(path, os.W_OK, effective_ids=True)
    ):
        raise Hold("rooted_executable_or_entry_custody_invalid")
    return identity(st)


def trusted_python_fd() -> tuple[int, tuple[int, ...], tuple[tuple[Path, tuple[int, ...]], ...]]:
    chain = root_chain(PYTHON)
    expected = root_leaf(PYTHON, executable=True)
    fd = os.open(PYTHON, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | os.O_CLOEXEC)
    try:
        if identity(os.fstat(fd)) != expected:
            raise Hold("python_descriptor_rebound")
        revalidate_chain(chain)
        return fd, expected, chain
    except BaseException:
        os.close(fd)
        raise


def installed_entry_gate() -> None:
    if (
        os.getuid() != RUNTIME_UID or os.geteuid() != RUNTIME_UID
        or os.getgid() != RUNTIME_GID or os.getegid() != RUNTIME_GID
        or not sys.flags.isolated or not sys.dont_write_bytecode or not sys.flags.no_site
    ):
        raise Hold("isolated_exact_runtime_identity_required")
    if Path(os.path.abspath(__file__)) != ENTRY:
        raise Hold("separately_installed_root_custodied_entry_required")
    chain = root_chain(ENTRY)
    root_leaf(ENTRY, executable=False, required_mode=0o444)
    revalidate_chain(chain)


def exact_source(path: Path, *, size: int, git_blob: str, sha256: str) -> bytes:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1 or before.st_size != size
        or not 0 < size <= 2 * 1024 * 1024
    ):
        raise Hold("planner_source_file_not_exact_regular")
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | os.O_CLOEXEC)
    try:
        opened = os.fstat(fd)
        if not stat.S_ISREG(opened.st_mode) or identity(opened) != identity(before):
            raise Hold("planner_source_opened_generation_changed")
        chunks: list[bytes] = []
        remaining = size
        while remaining:
            chunk = os.read(fd, min(65536, remaining))
            if not chunk:
                raise Hold("planner_source_short_read")
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise Hold("planner_source_size_grew")
        if identity(os.fstat(fd)) != identity(opened) or identity(path.lstat()) != identity(opened):
            raise Hold("planner_source_generation_changed")
        raw = b"".join(chunks)
        if digest(raw) != (git_blob, sha256):
            raise Hold("planner_source_content_identity_mismatch")
        return raw
    finally:
        os.close(fd)


def sealed_reader(raw: bytes) -> int:
    if (
        not hasattr(os, "memfd_create")
        or not hasattr(os, "MFD_ALLOW_SEALING")
        or not Path("/proc/self/fd").is_dir()
    ):
        raise Hold("sealed_snapshot_primitives_unavailable")
    writer = os.memfd_create(
        "void-epoch2-v6r3-readonly-plan", os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING
    )
    reader = -1
    try:
        offset = 0
        while offset != len(raw):
            n = os.write(writer, raw[offset:offset + 65536])
            if n <= 0:
                raise Hold("sealed_snapshot_short_write")
            offset += n
        if os.fstat(writer).st_size != len(raw):
            raise Hold("sealed_snapshot_size_mismatch")
        fcntl.fcntl(writer, fcntl.F_ADD_SEALS, SEALS)
        if fcntl.fcntl(writer, fcntl.F_GET_SEALS) & SEALS != SEALS:
            raise Hold("sealed_snapshot_seals_incomplete")
        reader = os.open("/proc/self/fd/" + str(writer), os.O_RDONLY | os.O_CLOEXEC)
        if fcntl.fcntl(reader, fcntl.F_GETFL) & os.O_ACCMODE != os.O_RDONLY:
            raise Hold("sealed_snapshot_reader_writable")
        if os.fstat(reader).st_size != len(raw) or os.pread(reader, len(raw), 0) != raw:
            raise Hold("sealed_snapshot_content_mismatch")
        result = reader
        reader = -1
        return result
    finally:
        os.close(writer)
        if reader != -1:
            os.close(reader)


def run_sealed(raw: bytes, python_fd: int, argument: str, *, timeout: int) -> subprocess.CompletedProcess[bytes]:
    script_fd = sealed_reader(raw)
    try:
        command = [
            "/proc/self/fd/" + str(python_fd), "-I", "-B", "-S",
            "/proc/self/fd/" + str(script_fd), argument,
        ]
        try:
            result = subprocess.run(
                command, stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                pass_fds=(python_fd, script_fd), cwd="/",
                env=clean_env(), timeout=timeout, check=False,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            raise Hold("sealed_plan_python_execution_failed") from exc
        if result.returncode != 0 or result.stderr or len(result.stdout) > MAX_REPORT_BYTES:
            raise Hold("sealed_plan_child_failed_or_exceeded_output_limit")
        return result
    finally:
        os.close(script_fd)


def validate_plan(raw: bytes) -> None:
    try:
        lines = raw.decode("utf-8", "strict").splitlines()
        visible = set(lines)
        for required in (
            "mode=plan", "read_only=true", "nonroot_required=true",
            "accepted_lock_id=" + LOCK_ID, "accepted_candidate_id=" + CANDIDATE_ID,
            "runtime_head=" + RUNTIME_HEAD,
        ) + tuple(key + "=false" for key in FORBIDDEN):
            if required not in visible:
                raise Hold("authenticated_plan_marker_missing")
        bodies = [line[15:] for line in lines if line.startswith("plan_body_json=")]
        ids = [line[8:] for line in lines if line.startswith("plan_id=")]
        if len(bodies) != 1 or len(ids) != 1:
            raise Hold("authenticated_plan_body_or_id_missing")
        body = json.loads(bodies[0])
        canonical = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")
        expected_id = "voidbuye2runnerpolupgradeplan6r3_" + hashlib.sha256(canonical).hexdigest()
        if (
            ids[0] != expected_id
            or body.get("accepted_lock_id") != LOCK_ID
            or body.get("accepted_candidate_id") != CANDIDATE_ID
            or body.get("runtime_head") != RUNTIME_HEAD
            or any(body.get(key) is not False for key in FORBIDDEN)
        ):
            raise Hold("authenticated_plan_body_identity_or_authority_invalid")
    except (UnicodeError, ValueError, KeyError, TypeError) as exc:
        raise Hold("authenticated_plan_output_invalid") from exc


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("separately_installed_root_custodied_entry_required=true")
    print("exact_uid_gid_1000_required=true")
    print("isolated_python_required=true")
    print("python_site_import_disabled_required=true")
    print("trusted_python_retained_descriptor_first_exec_required=true")
    print("planner_git_blob=" + PLANNER_GIT_BLOB)
    print("planner_sha256=" + PLANNER_SHA256)
    print("planner_bytes=" + str(PLANNER_BYTES))
    print("sealed_memfd_sha256_and_git_blob_required=true")
    print("sealed_memfd_retained_execution_required=true")
    print("host_plan_executed=false")
    print("host_plan_authorized=false")
    print("protected_install_authorized=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")


def self_test() -> None:
    fixture = b'import sys\nprint("VOID_SYNTHETIC_EPOCH2_FIRST_ENTRY_FIXTURE_GREEN")\nprint(sys.argv[1])\n'
    git_blob, sha256 = digest(fixture)
    with tempfile.TemporaryDirectory(prefix="void-e2-first-entry-fixture-") as td:
        source = Path(td) / "fixture.py"
        source.write_bytes(fixture)
        before = exact_source(source, size=len(fixture), git_blob=git_blob, sha256=sha256)
        python_path = Path(os.path.realpath(sys.executable))
        fd = os.open(python_path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | os.O_CLOEXEC)
        try:
            source.write_bytes(b'print("VOID_CHANGED_WRITABLE_CHECKOUT")\n')
            result = run_sealed(before, fd, "--fixture", timeout=4)
            if result.stdout.splitlines() != [
                b"VOID_SYNTHETIC_EPOCH2_FIRST_ENTRY_FIXTURE_GREEN", b"--fixture"
            ]:
                raise AssertionError("sealed_snapshot_not_exact_original_generation")
            try:
                exact_source(source, size=len(fixture), git_blob=git_blob, sha256=sha256)
            except Hold:
                pass
            else:
                raise AssertionError("source_mutation_not_rejected")
            symlink = Path(td) / "link.py"
            symlink.symlink_to(source)
            try:
                exact_source(symlink, size=len(fixture), git_blob=git_blob, sha256=sha256)
            except Hold:
                pass
            else:
                raise AssertionError("source_symlink_not_rejected")
            fifo = Path(td) / "fifo.py"
            os.mkfifo(fifo, 0o600)
            try:
                exact_source(fifo, size=len(fixture), git_blob=git_blob, sha256=sha256)
            except Hold:
                pass
            else:
                raise AssertionError("source_fifo_not_rejected")
        finally:
            os.close(fd)
    try:
        installed_entry_gate()
    except Hold:
        pass
    else:
        raise AssertionError("checkout_execution_was_trusted_for_host_plan")
    print(MARKER + "_SELF_TEST_GREEN")
    print("sealed_source_bytes_executed=true")
    print("checkout_mutation_does_not_change_executed_snapshot=true")
    print("source_symlink_and_fifo_rejected=true")
    print("checkout_host_plan_authority_rejected=true")
    print("installed_launcher_qualification_required=true")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")


def host_plan() -> None:
    installed_entry_gate()
    pyfd, expected_python, chain = trusted_python_fd()
    try:
        raw = exact_source(
            PLANNER, size=PLANNER_BYTES,
            git_blob=PLANNER_GIT_BLOB, sha256=PLANNER_SHA256,
        )
        result = run_sealed(raw, pyfd, "--plan", timeout=45)
        validate_plan(result.stdout)
        if identity(os.fstat(pyfd)) != expected_python or identity(PYTHON.lstat()) != expected_python:
            raise Hold("trusted_python_generation_changed")
        revalidate_chain(chain)
        root_leaf(ENTRY, executable=False, required_mode=0o444)
        print(MARKER + "_HOST_PLAN_GREEN")
        print("sealed_exact_source_executed=true")
        print("host_plan_read_only=true")
        print(result.stdout.decode("utf-8", "strict"), end="")
    finally:
        os.close(pyfd)


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--host-plan", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
    elif args.source_plan:
        source_plan()
    else:
        host_plan()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (Hold, OSError, ValueError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(type(exc).__name__ if not isinstance(exc, Hold) else exc)[:120])
        print("host_plan_authorized=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)

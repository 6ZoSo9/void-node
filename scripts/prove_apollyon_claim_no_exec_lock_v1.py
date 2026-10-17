#!/usr/bin/env python3
"""Disposable Linux kernel no-exec source proof; no installed host authority."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PROOF = "scripts/prove_apollyon_claim_no_exec_lock_v1.py"
WORKFLOW = ".github/workflows/apollyon-claim-no-exec-lock-v1.yml"
PINNED = {
    "ops/xiphos/apollyon_claim_no_exec_lock_v1.c": "475b0e06605a64ba885c027d2163e87ab0fa0cfa",
    "ops/xiphos/apollyon_claim_no_exec_lock_v1.h": "858da1f2277864fc67776cfb064822c23c902cd5",
    "scripts/apollyon_claim_no_exec_lock_v1_selftest.c": "8a8c3877d186c0f405047c3734134a175191b54b",
    "docs/security/apollyon-claim-no-exec-lock-v1.md": "18ca97e2b9c929831948a5a4dabc0456349ca647",
    "ops/xiphos/apollyon_claim_self_observed_lock_v1.c": "5f80eb9b5d7f0822d88e3ef05f6a565e1b4539c1",
    "ops/xiphos/apollyon_claim_self_observed_lock_v1.h": "ebdbac74011191ff159d87e75a7237fe808926a6",
    "ops/xiphos/apollyon_claim_no_clone_lock_v1.c": "4643a5bcdee0f20d5e60c53dcbae0e9b0bc50450",
    "ops/xiphos/apollyon_claim_no_clone_lock_v1.h": "fcaeda18f03c09b253e45870d0f454183fd9077c",
    "ops/xiphos/apollyon_claim_task_singleton_guard_v1.c": "b507d8d5bff32b39be998482efe3c0e8b729cefe",
    "ops/xiphos/apollyon_claim_task_singleton_guard_v1.h": "2ff84bb8f04ba3bc935272175fb8056624e2222a",
    "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c": "ecc262686cdc388d08775c735c68430e737e40d5",
    "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h": "5355ffd2856e0f0c57f6e52fd1b347441b94e4d7",
}
WATCHED = set(PINNED) | {PROOF, WORKFLOW}
MARKER = "VOID_APOLLYON_CLAIM_NO_EXEC_LOCK_V1_PROOF_GREEN"

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()

def stable_read(name: str) -> bytes:
    f = ROOT / name
    before = f.lstat()
    assert f.is_file() and not f.is_symlink() and before.st_nlink == 1, name
    assert 0 < before.st_size < (1 << 20), name
    raw = f.read_bytes()
    after = f.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        assert getattr(before, field) == getattr(after, field), (name, field)
    return raw

for name, expected in PINNED.items():
    assert git_blob(stable_read(name)) == expected, name

src = stable_read("ops/xiphos/apollyon_claim_no_exec_lock_v1.c").decode("utf-8")
header = stable_read("ops/xiphos/apollyon_claim_no_exec_lock_v1.h").decode("utf-8")
harness = stable_read("scripts/apollyon_claim_no_exec_lock_v1_selftest.c").decode("utf-8")
workflow = stable_read(WORKFLOW).decode("utf-8")

for marker in (
    "apollyon_claim_self_observed_lock_install_v1(",
    "apollyon_claim_process_identity_observe_v2(",
    "SECCOMP_FILTER_FLAG_TSYNC",
    "PR_SET_NO_NEW_PRIVS",
    "__NR_execve",
    "__NR_execveat",
    "SECCOMP_RET_KILL_PROCESS",
    "__X32_SYSCALL_BIT",
    "out->protected_expected_source_origin_proven=0",
    "out->xiphos_host_qualification_performed=0",
    "out->durable_attempt_claim_performed=0",
):
    assert marker in src, marker
for marker in (
    "apollyon_claim_no_exec_lock_install_v1(",
    "apollyon_claim_no_exec_lock_close_v1(",
):
    assert marker in header, marker
for marker in (
    "SYS_execve",
    "SYS_execveat",
    "AT_EMPTY_PATH",
    "SYS_fork",
    "SYS_clone3",
    '"/bin/false"',
    "WIFEXITED",
):
    assert marker in harness, marker
for prohibited in (
    "systemctl", "mkdir(", "unlink(", "rename(", "socket(",
    "connect(", "bind(", "listen(", "sendto(", "createPrivateKey",
    "crypto.sign(", "syscall(SYS_execve", "syscall(SYS_execveat",
):
    assert prohibited not in src, prohibited

lines = workflow.splitlines()
def trigger_paths(which: str, following: str) -> list[str]:
    start = lines.index("  " + which + ":")
    end = lines.index("  " + following + ":", start + 1)
    chunk = lines[start + 1:end]
    i = chunk.index("    paths:")
    items = []
    for line in chunk[i + 1:]:
        if not line.startswith("      "):
            break
        match = re.fullmatch(r'      - "([^"]+)"', line)
        assert match, line
        items.append(match.group(1))
    assert len(items) == len(set(items))
    assert set(items) == WATCHED
    return items
assert trigger_paths("pull_request", "push") == trigger_paths("push", "workflow_dispatch")
for marker in (
    "BASE=\"$PR_BASE\"", "BASE=\"$PUSH_BEFORE\"",
    'BASE="$(git rev-parse HEAD^)"',
    "git diff --check", "Prove kernel no-exec lock",
):
    assert marker in workflow, marker

parents = [
    "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c",
    "ops/xiphos/apollyon_claim_task_singleton_guard_v1.c",
    "ops/xiphos/apollyon_claim_no_clone_lock_v1.c",
    "ops/xiphos/apollyon_claim_self_observed_lock_v1.c",
    "ops/xiphos/apollyon_claim_no_exec_lock_v1.c",
    "scripts/apollyon_claim_no_exec_lock_v1_selftest.c",
]
flags = ["-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", "-pthread", "-Iops/xiphos"]
ENV = {"PATH": "/usr/bin:/bin", "LC_ALL": "C", "LANG": "C",
       "TZ": "UTC", "SOURCE_DATE_EPOCH": "0"}

def run(command: list[str], timeout: int = 55):
    return subprocess.run(
        command, cwd=ROOT, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        timeout=timeout, check=False, text=True, encoding="utf-8",
        errors="strict", env=ENV,
    )

with tempfile.TemporaryDirectory(prefix="void-apollyon-no-exec-") as temporary:
    directory = Path(temporary)
    builds = []
    for trial in range(3):
        binary = directory / f"native-{trial}"
        build = run(["/usr/bin/gcc", *flags, *parents, "-o", str(binary)])
        assert build.returncode == 0, (trial, build.stderr, build.stdout)
        builds.append(binary.read_bytes())
        positive = run([str(binary), "--self-test"], timeout=45)
        assert positive.returncode == 0, (
            trial, positive.returncode, positive.stdout, positive.stderr
        )
        for marker in (
            MARKER,
            "self_observed_no_clone_parent_bound=true",
            "execve_and_execveat_denied=true",
            "execveat_empty_path_denied=true",
            "no_new_tasks_still_denied=true",
            "post_lock_same_process_generation_reobserved=true",
            "wrong_ppid_uid_exe_cmdline_groups_and_multithread_rejected=true",
            "protected_expected_source_origin_proven=false",
            "xiphos_host_qualification_performed=false",
            "durable_attempt_claim_performed=false",
            "training_execution_performed=false",
            "funds_movement=false",
        ):
            assert marker in positive.stdout.splitlines(), (trial, marker, positive.stdout)
        denied = run([str(binary), "--run"])
        assert denied.returncode == 2 and (
            denied.stderr.strip() == "HOLD=source_only_self_test_only"
        ), (trial, denied.stdout, denied.stderr)
    assert builds[0] == builds[1] == builds[2], "nonreproducible_native_build"
    binary_sha = hashlib.sha256(builds[0]).hexdigest()

print(MARKER)
print("parent_3309_3441_3454_3456_blobs_pinned=true")
print("real_kernel_execve_execveat_empty_path_denied=true")
print("real_kernel_parent_no_clone_still_denied=true")
print("three_builds_byte_reproducible=true")
print("native_candidate_sha256=" + binary_sha)
print("protected_expected_source_origin_proven=false")
print("xiphos_host_qualification_performed=false")
print("durable_attempt_claim_performed=false")
print("training_execution_performed=false")
print("funds_movement=false")

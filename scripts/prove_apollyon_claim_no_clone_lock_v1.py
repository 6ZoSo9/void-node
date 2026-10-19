#!/usr/bin/env python3
"""Source-only exact-parent proof and real-kernel no-clone self-test."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "ops/xiphos/apollyon_claim_no_clone_lock_v1.c"
HEADER = "ops/xiphos/apollyon_claim_no_clone_lock_v1.h"
HARNESS = "scripts/apollyon_claim_no_clone_lock_v1_selftest.c"
PROOF = "scripts/prove_apollyon_claim_no_clone_lock_v1.py"
DOC = "docs/security/apollyon-claim-no-clone-lock-v1.md"
WORKFLOW = ".github/workflows/apollyon-claim-no-clone-lock-v1.yml"
PARENT_C = "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c"
PARENT_H = "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h"
SINGLETON_C = "ops/xiphos/apollyon_claim_task_singleton_guard_v1.c"
SINGLETON_H = "ops/xiphos/apollyon_claim_task_singleton_guard_v1.h"
SINGLETON_HARNESS = "scripts/apollyon_claim_task_singleton_guard_v1_selftest.c"
SINGLETON_PROOF = "scripts/prove_apollyon_claim_task_singleton_guard_v1.py"
SINGLETON_WORKFLOW = ".github/workflows/apollyon-claim-task-singleton-guard-v1.yml"
PINNED = {
    SOURCE: "4643a5bcdee0f20d5e60c53dcbae0e9b0bc50450",
    HEADER: "fcaeda18f03c09b253e45870d0f454183fd9077c",
    HARNESS: "ca90bd9787af95a4c691e1feff8bad6dd9a3ef33",
    DOC: "0f842ff4ae95fa141579034d3220668a1c671ca5",
    PARENT_C: "ecc262686cdc388d08775c735c68430e737e40d5",
    PARENT_H: "5355ffd2856e0f0c57f6e52fd1b347441b94e4d7",
    SINGLETON_C: "b507d8d5bff32b39be998482efe3c0e8b729cefe",
    SINGLETON_H: "2ff84bb8f04ba3bc935272175fb8056624e2222a",
    SINGLETON_HARNESS: "fbfade764e58fc2161abb978a9494b55107df47b",
}
EXPECTED_PATHS = set(PINNED) | {PROOF, WORKFLOW, SINGLETON_PROOF, SINGLETON_WORKFLOW}
MARKER = "VOID_APOLLYON_CLAIM_NO_CLONE_LOCK_V1_PROOF_GREEN"


def git_blob(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def stable_read(path: str) -> bytes:
    item = ROOT / path
    before = item.lstat()
    assert item.is_file() and not item.is_symlink(), path
    assert before.st_nlink == 1 and 0 < before.st_size < (1 << 20), path
    data = item.read_bytes()
    after = item.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        assert getattr(before, field) == getattr(after, field), (path, field)
    return data


for name, sha in PINNED.items():
    assert git_blob(stable_read(name)) == sha, name

source = stable_read(SOURCE).decode("utf-8")
header = stable_read(HEADER).decode("utf-8")
harness = stable_read(HARNESS).decode("utf-8")
workflow = stable_read(WORKFLOW).decode("utf-8")
for term in (
    "SECCOMP_FILTER_FLAG_TSYNC", "PR_SET_NO_NEW_PRIVS", "PR_GET_NO_NEW_PRIVS",
    "PR_GET_SECCOMP", "AUDIT_ARCH_X86_64", "__X32_SYSCALL_BIT",
    "__NR_clone", "__NR_clone3", "__NR_fork", "__NR_vfork",
    "apollyon_claim_task_singleton_observe_v1(id,&before)",
    "apollyon_claim_task_singleton_observe_v1(id,&after)",
    "id->pid!=getpid()", "syscall(SYS_gettid)",
):
    assert term in source, term
assert source.index("apollyon_claim_task_singleton_observe_v1(id,&before)") < \
       source.index("SECCOMP_SET_MODE_FILTER") < \
       source.index("apollyon_claim_task_singleton_observe_v1(id,&after)")
for term in ("wrong_process_generation_rejected=true",
             "preexisting_second_thread_rejected=true",
             "multithread_rejection_does_not_install_filter=true",
             "clone_clone3_fork_vfork_x32_denied=true",
             "pthread_create_denied=true"):
    assert term in harness, term
for forbidden in (
    "systemctl", "execve(", "mkdir(", "unlink(", "rename(",
    "O_CREAT", "O_TRUNC", "socket(", "connect(", "bind(",
    "listen(", "sendto(", "curl", "private_key", "crypto.sign",
):
    assert forbidden not in source, forbidden
assert "apollyon_claim_no_clone_lock_install_v1" in header

lines = workflow.splitlines()
def section_paths(section: str, following: str) -> list[str]:
    start = lines.index("  " + section + ":")
    end = lines.index("  " + following + ":", start + 1)
    lineset = lines[start+1:end]
    at = lineset.index("    paths:")
    seen=[]
    for line in lineset[at+1:]:
        if not line.startswith("      "):
            break
        match=re.fullmatch(r'      - "([^"]+)"',line)
        assert match, line
        seen.append(match.group(1))
    assert len(seen)==len(set(seen)) and set(seen)==EXPECTED_PATHS, (section,seen)
    return seen
assert section_paths("pull_request","push")==section_paths("push","workflow_dispatch")
for required in (
    'BASE="$PR_BASE"','BASE="$PUSH_BEFORE"','BASE="$(git rev-parse HEAD^)"',
    "git diff --check", "gcc", "Prove x86_64 no-clone lock",
    MARKER,
):
    assert required in workflow, required


def run(args: list[str], *, timeout=60):
    return subprocess.run(args,cwd=ROOT,stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding="utf-8",
        errors="strict",timeout=timeout,check=False,env={**os.environ,"LC_ALL":"C"})

flags=["-std=c11","-O2","-Wall","-Wextra","-Werror","-pthread","-Iops/xiphos"]
with tempfile.TemporaryDirectory(prefix="void-apollyon-no-clone-v1-") as d:
    temp=Path(d)
    outputs=[]
    for trial in range(3):
        binary=temp/f"candidate-{trial}"
        cmd=["gcc",*flags,PARENT_C,SINGLETON_C,SOURCE,HARNESS,"-o",str(binary)]
        build=run(cmd)
        assert build.returncode==0,(cmd,build.stdout,build.stderr)
        outputs.append(binary.read_bytes())
        success=run([str(binary),"--self-test"],timeout=40)
        assert success.returncode==0,(trial,success.returncode,success.stdout,success.stderr)
        for marker in (
            MARKER,"wrong_process_generation_rejected=true",
            "preexisting_second_thread_rejected=true",
            "multithread_rejection_does_not_install_filter=true",
            "singleton_seccomp_tsync_installed=true",
            "clone_clone3_fork_vfork_x32_denied=true",
            "pthread_create_denied=true","noncreation_syscall_alive=true",
            "continuous_clone_fork_syscall_denial_in_self_process=true",
            "protected_caller_origin_proven=false", "host_installation_performed=false",
            "durable_attempt_claim_performed=false","training_execution_performed=false",
            "funds_movement=false",
        ):
            assert marker in success.stdout.splitlines(),(trial,marker,success.stdout)
        blocked=run([str(binary),"--run"])
        assert blocked.returncode==2 and blocked.stderr.strip()=="HOLD=source_only_self_test_only"
    assert outputs[0]==outputs[1]==outputs[2],"nonreproducible_compiled_candidate"
    binary_sha=hashlib.sha256(outputs[0]).hexdigest()

print(MARKER)
print("exact_parent_3309_and_3441_blobs_pinned=true")
print("three_builds_reproducible=true")
print("x86_64_tsync_filter_actual_kernel_test=true")
print("preexisting_second_thread_rejected=true")
print("multithread_rejection_does_not_install_filter=true")
print("clone_clone3_fork_vfork_x32_denied=true")
print("pthread_create_denied=true")
print("native_test_elf_sha256="+binary_sha)
print("continuous_clone_fork_syscall_denial_in_self_process=true")
print("protected_caller_origin_proven=false")
print("host_installation_performed=false")
print("durable_attempt_claim_performed=false")
print("training_execution_performed=false")
print("funds_movement=false")

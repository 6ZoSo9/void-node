#!/usr/bin/env python3
"""Source-only proof: native singleton task-set guard against accepted #3309."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "ops/xiphos/apollyon_claim_task_singleton_guard_v1.c"
HEADER = "ops/xiphos/apollyon_claim_task_singleton_guard_v1.h"
HARNESS = "scripts/apollyon_claim_task_singleton_guard_v1_selftest.c"
DOC = "docs/security/apollyon-claim-task-singleton-guard-v1.md"
WORKFLOW = ".github/workflows/apollyon-claim-task-singleton-guard-v1.yml"
PROOF = "scripts/prove_apollyon_claim_task_singleton_guard_v1.py"
PARENT_C = "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c"
PARENT_H = "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h"
PARENT_PROOF = "scripts/prove_apollyon_durable_attempt_claim_native_process_identity_v2.mjs"
PARENT_HARNESS = "scripts/apollyon_durable_attempt_claim_native_process_identity_v2_selftest.c"
PARENT_WORKFLOW = ".github/workflows/apollyon-durable-attempt-claim-native-process-identity-v2.yml"
PINNED = {
    SOURCE: "b507d8d5bff32b39be998482efe3c0e8b729cefe",
    HEADER: "2ff84bb8f04ba3bc935272175fb8056624e2222a",
    HARNESS: "fbfade764e58fc2161abb978a9494b55107df47b",
    DOC: "770d0c95c28a5439faf5cfbbe8f20a2656693131",
    PARENT_C: "ecc262686cdc388d08775c735c68430e737e40d5",
    PARENT_H: "5355ffd2856e0f0c57f6e52fd1b347441b94e4d7",
    PARENT_HARNESS: "fae7e024425e1c32cfe2ae7b896825ef9de6d4ce",
}
EXPECTED_TRIGGERS = set(PINNED) | {WORKFLOW, PROOF, PARENT_PROOF, PARENT_WORKFLOW}
MARKER = "VOID_APOLLYON_CLAIM_TASK_SINGLETON_GUARD_V1_PROOF_GREEN"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()


def stable_read(relative: str) -> bytes:
    p = ROOT / relative
    before = p.lstat()
    assert p.is_file() and not p.is_symlink(), relative
    assert before.st_nlink == 1 and 0 < before.st_size <= 1048576, relative
    raw = p.read_bytes()
    after = p.lstat()
    for key in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        assert getattr(before, key) == getattr(after, key), (relative, key)
    return raw


for relative, sha in PINNED.items():
    assert git_blob(stable_read(relative)) == sha, relative

workflow = stable_read(WORKFLOW).decode("utf-8")
lines = workflow.splitlines()


def block_paths(section: str, next_section: str) -> list[str]:
    start = lines.index("  " + section + ":")
    end = lines.index("  " + next_section + ":", start + 1)
    block = lines[start + 1:end]
    offset = block.index("    paths:")
    out = []
    for line in block[offset + 1:]:
        if not line.startswith("      "):
            break
        match = re.fullmatch(r'      - "([^"]+)"', line)
        assert match, line
        out.append(match.group(1))
    assert len(out) == len(set(out)) and set(out) == EXPECTED_TRIGGERS, (section, out)
    return out

assert block_paths("pull_request", "push") == block_paths("push", "workflow_dispatch")
for required in (
    "pull_request)", "push)", "workflow_dispatch)",
    'BASE="$PUSH_BEFORE"',
    "git diff --check",
    "gcc",
    "--self-test",
    "VOID_APOLLYON_CLAIM_TASK_SINGLETON_GUARD_V1_PROOF_GREEN",
):
    assert required in workflow, required

source_text = stable_read(SOURCE).decode("utf-8")
header_text = stable_read(HEADER).decode("utf-8")
for name in (
    "apollyon_claim_task_singleton_observe_v1",
    "apollyon_claim_process_identity_pidfd_state_v2",
    "is_kernel_procfs(procfd)",
    "singleton_census(taskfd,id->pid)",
    "generation_live(id)",
    "PROC_SUPER_MAGIC",
):
    assert name in source_text or name in header_text, name
assert source_text.count("singleton_census(taskfd,id->pid)") == 2
for forbidden in (
    "systemctl", "execve(", "fork(", "bind(", "listen(",
    "mkdir(", "unlink(", "rename(", "O_CREAT", "O_TRUNC",
    "socket(", "connect(", "sendto(", "curl", "private_key", "crypto.sign",
):
    assert forbidden not in source_text, forbidden


def run(argv: list[str], *, env: dict[str, str] | None = None, timeout: int = 60) -> subprocess.CompletedProcess[str]:
    cp = subprocess.run(
        argv, cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8", errors="strict", timeout=timeout, check=False,
    )
    return cp


flags = ["-std=c11", "-O2", "-Wall", "-Wextra", "-Werror", "-pthread", "-Iops/xiphos"]
with tempfile.TemporaryDirectory(prefix="void-apollyon-singleton-v1-") as raw:
    temp = Path(raw)
    outputs = []
    for n in range(3):
        binary = temp / f"candidate-{n}"
        args = ["gcc", *flags, PARENT_C, SOURCE, HARNESS, "-o", str(binary)]
        cp = run(args)
        assert cp.returncode == 0, (cp.stdout, cp.stderr)
        outputs.append(binary.read_bytes())
        positive = run([str(binary), "--self-test"], timeout=35)
        assert positive.returncode == 0, (positive.returncode, positive.stdout, positive.stderr)
        for marker in (
            MARKER, "singleton_child_accepted=true", "second_live_tid_rejected=true",
            "singleton_reaccepted_after_join=true", "wrong_start_generation_rejected=true",
            "invalid_pidfd_rejected=true", "exited_pidfd_rejected=true",
            "kernel_procfs_required=true", "reviewed_pidfd_generation_required=true",
            "two_singleton_censuses_required=true",
            "continuous_single_threadedness_proven=false",
            "process_wide_credential_authority_proven=false",
            "durable_attempt_claim_performed=false",
            "training_execution_performed=false", "host_installation_performed=false",
        ):
            assert marker in positive.stdout.splitlines(), (n, marker, positive.stdout)
        negative = run([str(binary), "--run"])
        assert negative.returncode == 2 and negative.stderr.strip() == "HOLD=source_only_self_test_only"
    assert outputs[0] == outputs[1] == outputs[2], "native test builds not reproducible"

    fake_root = temp / "fake-proc"
    fake_root.mkdir()
    fake = temp / "candidate-fake-proc"
    fake_def = f'-DVOID_APOLLYON_TASKSET_PROC_ROOT="{fake_root}"'
    cp = run(["gcc", *flags, fake_def, PARENT_C, SOURCE, HARNESS, "-o", str(fake)])
    assert cp.returncode == 0, (cp.stdout, cp.stderr)
    env = {**os.environ, "VOID_APOLLYON_TEST_EXPECT_FAKE_PROCFS": "1"}
    rejected = run([str(fake), "--self-test"], env=env)
    assert rejected.returncode == 0, (rejected.stdout, rejected.stderr)
    assert "fake_procfs_rejected=true" in rejected.stdout.splitlines()
    assert "singleton_child_accepted=true" not in rejected.stdout.splitlines()
    executable_sha256 = hashlib.sha256(outputs[0]).hexdigest()

print(MARKER)
print("parent_3309_native_source_and_header_pinned=true")
print("exact_native_source_and_header_pinned=true")
print("source_only_no_runtime_entry=true")
print("native_three_build_reproducible=true")
print("native_test_elf_sha256=" + executable_sha256)
print("singleton_child_accepted=true")
print("second_live_tid_rejected=true")
print("singleton_reaccepted_after_join=true")
print("wrong_start_generation_rejected=true")
print("invalid_pidfd_rejected=true")
print("exited_pidfd_rejected=true")
print("fake_procfs_rejected=true")
print("reviewed_pidfd_generation_required=true")
print("continuous_single_threadedness_proven=false")
print("process_wide_credential_authority_proven=false")
print("protected_peer_identity_proven=false")
print("durable_attempt_claim_performed=false")
print("trainer_release_authorized=false")
print("training_execution_performed=false")
print("host_installation_performed=false")
print("funds_movement=false")

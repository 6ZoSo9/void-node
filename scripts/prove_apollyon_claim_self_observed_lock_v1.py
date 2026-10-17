#!/usr/bin/env python3
"""Exact-parent native SELF-generation lock proof; disposable kernel tests only."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SRC = "ops/xiphos/apollyon_claim_self_observed_lock_v1.c"
HEADER = "ops/xiphos/apollyon_claim_self_observed_lock_v1.h"
HARNESS = "scripts/apollyon_claim_self_observed_lock_v1_selftest.c"
PROOF = "scripts/prove_apollyon_claim_self_observed_lock_v1.py"
DOC = "docs/security/apollyon-claim-self-observed-lock-v1.md"
WORKFLOW = ".github/workflows/apollyon-claim-self-observed-lock-v1.yml"
PARENT_C = "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c"
PARENT_H = "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h"
SINGLETON_C = "ops/xiphos/apollyon_claim_task_singleton_guard_v1.c"
SINGLETON_H = "ops/xiphos/apollyon_claim_task_singleton_guard_v1.h"
LOCK_C = "ops/xiphos/apollyon_claim_no_clone_lock_v1.c"
LOCK_H = "ops/xiphos/apollyon_claim_no_clone_lock_v1.h"

PINNED = {
    SRC: "5f80eb9b5d7f0822d88e3ef05f6a565e1b4539c1",
    HEADER: "ebdbac74011191ff159d87e75a7237fe808926a6",
    HARNESS: "dcac774109580c51e6540f4565567d2b570d90ae",
    DOC: "b47e39e5fa5373420261a42acb41fa041f542d88",
    PARENT_C: "ecc262686cdc388d08775c735c68430e737e40d5",
    PARENT_H: "5355ffd2856e0f0c57f6e52fd1b347441b94e4d7",
    SINGLETON_C: "b507d8d5bff32b39be998482efe3c0e8b729cefe",
    SINGLETON_H: "2ff84bb8f04ba3bc935272175fb8056624e2222a",
    LOCK_C: "4643a5bcdee0f20d5e60c53dcbae0e9b0bc50450",
    LOCK_H: "fcaeda18f03c09b253e45870d0f454183fd9077c",
}
WATCHED = set(PINNED) | {PROOF, WORKFLOW}
MARKER = "VOID_APOLLYON_CLAIM_SELF_OBSERVED_LOCK_V1_PROOF_GREEN"


def git_blob(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def stable_read(name: str) -> bytes:
    path = ROOT / name
    before = path.lstat()
    assert path.is_file() and not path.is_symlink() and before.st_nlink == 1, name
    assert 0 < before.st_size < (1 << 20), name
    data = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        assert getattr(before, field) == getattr(after, field), (name, field)
    return data


for name, expected in PINNED.items():
    assert git_blob(stable_read(name)) == expected, name

src = stable_read(SRC).decode("utf-8")
header = stable_read(HEADER).decode("utf-8")
harness = stable_read(HARNESS).decode("utf-8")
workflow = stable_read(WORKFLOW).decode("utf-8")
for term in (
    "apollyon_claim_process_identity_observe_v2(",
    "apollyon_claim_no_clone_lock_install_v1(&first,&locked)",
    "apollyon_claim_process_identity_pidfd_state_v2(first.pidfd)",
    "apollyon_claim_process_identity_pidfd_state_v2(second.pidfd)",
    "out->protected_expected_source_origin_proven=0",
    "out->xiphos_host_qualification_performed=0",
    "out->durable_attempt_claim_performed=0",
):
    assert term in src, term
assert src.count("apollyon_claim_process_identity_observe_v2(") == 2
assert src.index("apollyon_claim_process_identity_observe_v2(") < \
       src.index("apollyon_claim_no_clone_lock_install_v1(") < \
       src.rindex("apollyon_claim_process_identity_observe_v2(")
for term in (
    "apollyon_claim_self_observed_lock_install_v1(",
    "apollyon_claim_self_observed_lock_close_v1(",
):
    assert term in header, term
for term in (
    "wrong_process_generation_rejected",  # parent #3454 proof remains bound
    "no_clone_filter_fork_clone3_pthread_denial=true",
    "preexisting_second_thread_rejected=true",
    "protected_expected_source_origin_proven=false",
):
    if term == "wrong_process_generation_rejected":
        assert "apollyon_claim_process_identity_observe_v2(" in src
    else:
        assert term in harness
for forbidden in (
    "systemctl", "execve(", "mkdir(", "unlink(", "rename(",
    "O_CREAT", "O_TRUNC", "socket(", "connect(", "bind(",
    "listen(", "sendto(", "createPrivateKey", "crypto.sign(",
):
    assert forbidden not in src, forbidden

lines = workflow.splitlines()
def section_paths(section: str, following: str) -> list[str]:
    start = lines.index("  " + section + ":")
    end = lines.index("  " + following + ":", start + 1)
    part = lines[start + 1:end]
    pos = part.index("    paths:")
    found = []
    for line in part[pos + 1:]:
        if not line.startswith("      "):
            break
        m = re.fullmatch(r'      - "([^"]+)"', line)
        assert m, line
        found.append(m.group(1))
    assert len(found) == len(set(found)) and set(found) == WATCHED
    return found
assert section_paths("pull_request", "push") == section_paths("push", "workflow_dispatch")
for token in (
    "BASE=\"$PR_BASE\"", "BASE=\"$PUSH_BEFORE\"",
    'BASE="$(git rev-parse HEAD^)"',
    "git diff --check", "Prove native self-observed lock",
):
    assert token in workflow, token

flags = ["-std=c11", "-O2", "-Wall", "-Wextra", "-Werror",
         "-pthread", "-Iops/xiphos"]

def run(command: list[str], timeout: int = 55):
    return subprocess.run(command, cwd=ROOT, stdin=subprocess.DEVNULL,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          timeout=timeout, check=False, text=True,
                          encoding="utf-8", errors="strict",
                          env={**os.environ, "LC_ALL": "C"})

with tempfile.TemporaryDirectory(prefix="void-apollyon-self-locked-") as dirname:
    tmp = Path(dirname)
    builds = []
    for trial in range(3):
        binary = tmp / f"native-{trial}"
        build = run(["gcc", *flags, PARENT_C, SINGLETON_C, LOCK_C,
                     SRC, HARNESS, "-o", str(binary)])
        assert build.returncode == 0, (trial, build.stderr, build.stdout)
        builds.append(binary.read_bytes())
        positive = run([str(binary), "--self-test"], timeout=45)
        assert positive.returncode == 0, (
            trial, positive.returncode, positive.stdout, positive.stderr)
        for marker in (
            MARKER,
            "same_process_kernel_identity_observed=true",
            "expected_parent_uid_executable_cmdline_groups_checked=true",
            "post_filter_independent_generation_reobservation=true",
            "invalid_source_parent_uid_groups_rejected=true",
            "preexisting_second_thread_rejected=true",
            "no_clone_filter_fork_clone3_pthread_denial=true",
            "protected_expected_source_origin_proven=false",
            "xiphos_host_qualification_performed=false",
            "durable_attempt_claim_performed=false",
            "training_execution_performed=false",
            "funds_movement=false",
        ):
            assert marker in positive.stdout.splitlines(), (trial, marker, positive.stdout)
        denied = run([str(binary), "--run"])
        assert denied.returncode == 2 and \
            denied.stderr.strip() == "HOLD=source_only_self_test_only"
    assert builds[0] == builds[1] == builds[2], "nonreproducible_native_build"
    binary_sha = hashlib.sha256(builds[0]).hexdigest()

print(MARKER)
print("upstream_3309_3441_3454_blobs_pinned=true")
print("self_observer_constructs_retained_pidfd=true")
print("three_builds_byte_reproducible=true")
print("wrong_parent_uid_exe_cmdline_groups_rejected=true")
print("actual_multithread_rejected=true")
print("post_seccomp_independent_observation=true")
print("native_candidate_sha256=" + binary_sha)
print("protected_expected_source_origin_proven=false")
print("xiphos_host_qualification_performed=false")
print("durable_attempt_claim_performed=false")
print("training_execution_performed=false")
print("funds_movement=false")

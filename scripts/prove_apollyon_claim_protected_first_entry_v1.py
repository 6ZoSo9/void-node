#!/usr/bin/env python3
"""Source/kernel proof for protected Apollyon fixed first entry; no host authority."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PARENT_HEAD = "2df0817b5fc3456c68f32063fb28dda5bdc8ec44"
PROOF = "scripts/prove_apollyon_claim_protected_first_entry_v1.py"
WORKFLOW = ".github/workflows/apollyon-claim-protected-first-entry-v1.yml"

PINNED = {
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.c":
        "53f93f3c243bdcb9ef8a694825c355ec67fd567f",
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.h":
        "93ce0ba35d5bfc94261c3d18821e857b96870d32",
    "scripts/apollyon_claim_protected_first_entry_v1_selftest.c":
        "cd6d969cb9578ac32620be60822ff743803146ab",
    "docs/security/apollyon-claim-protected-first-entry-v1.md":
        "c806bb973660be2cc5631fc18552944453d4cbc4",
    "ops/xiphos/apollyon_claim_no_exec_lock_v1.c":
        "475b0e06605a64ba885c027d2163e87ab0fa0cfa",
    "ops/xiphos/apollyon_claim_no_exec_lock_v1.h":
        "858da1f2277864fc67776cfb064822c23c902cd5",
    "ops/xiphos/apollyon_claim_self_observed_lock_v1.c":
        "5f80eb9b5d7f0822d88e3ef05f6a565e1b4539c1",
    "ops/xiphos/apollyon_claim_self_observed_lock_v1.h":
        "ebdbac74011191ff159d87e75a7237fe808926a6",
    "ops/xiphos/apollyon_claim_no_clone_lock_v1.c":
        "4643a5bcdee0f20d5e60c53dcbae0e9b0bc50450",
    "ops/xiphos/apollyon_claim_no_clone_lock_v1.h":
        "fcaeda18f03c09b253e45870d0f454183fd9077c",
    "ops/xiphos/apollyon_claim_task_singleton_guard_v1.c":
        "b507d8d5bff32b39be998482efe3c0e8b729cefe",
    "ops/xiphos/apollyon_claim_task_singleton_guard_v1.h":
        "2ff84bb8f04ba3bc935272175fb8056624e2222a",
    "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c":
        "ecc262686cdc388d08775c735c68430e737e40d5",
    "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h":
        "5355ffd2856e0f0c57f6e52fd1b347441b94e4d7",
}
WATCHED = set(PINNED) | {PROOF, WORKFLOW}
CHILD = {
    ".github/workflows/apollyon-claim-protected-first-entry-v1.yml",
    "docs/security/apollyon-claim-protected-first-entry-v1.md",
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.c",
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.h",
    "scripts/apollyon_claim_protected_first_entry_v1_selftest.c",
    "scripts/prove_apollyon_claim_protected_first_entry_v1.py",
}
MARKER = "VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_V1_PROOF_GREEN"

ENV = {
    "PATH": "/usr/bin:/bin",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "SOURCE_DATE_EPOCH": "0",
}


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def stable_read(name: str) -> bytes:
    path = ROOT / name
    before = path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode), name
    assert before.st_nlink == 1 and 0 < before.st_size < (2 << 20), name
    raw = path.read_bytes()
    after = path.lstat()
    for field in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
        "st_size", "st_mtime_ns", "st_ctime_ns",
    ):
        assert getattr(before, field) == getattr(after, field), (name, field)
    assert len(raw) == before.st_size, name
    return raw


for name, expected in PINNED.items():
    assert git_blob(stable_read(name)) == expected, name


source = stable_read(
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.c"
).decode("utf-8")
header = stable_read(
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.h"
).decode("utf-8")
harness = stable_read(
    "scripts/apollyon_claim_protected_first_entry_v1_selftest.c"
).decode("utf-8")
document = stable_read(
    "docs/security/apollyon-claim-protected-first-entry-v1.md"
).decode("utf-8")
workflow = stable_read(WORKFLOW).decode("utf-8")

for required in (
    "VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF",
    'readlink("/proc/self/exe"',
    'open("/proc/self/cmdline"',
    "open_fixed_self(&executable_fd,&executable_before)",
    "getgroups(",
    "apollyon_claim_no_exec_lock_install_v1(",
    "visible_generation_revalidated_after_lock=1",
    "fixed_path_expected_source_bound=1",
    "static_first_instruction_proven=0",
    "protected_expected_source_origin_proven=0",
    "protected_parent_origin_proven=0",
    "xiphos_host_qualification_performed=0",
    "durable_attempt_claim_performed=0",
):
    assert required in source, required

assert (
    "int apollyon_claim_protected_first_entry_install_v1(\n"
    "  struct apollyon_claim_protected_first_entry_v1 *out\n"
    ");"
) in header
for forbidden in (
    "expected_executable_fd,",
    "expected_cmdline,",
    "systemctl",
    "socket(",
    "connect(",
    "bind(",
    "listen(",
    "unlink(",
    "rename(",
):
    assert forbidden not in source, forbidden

for required in (
    "fixed_path_expected_source_bound=true",
    "static_first_instruction_proven=false",
    "protected_expected_source_origin_proven=false",
    "SYS_execve",
    "SYS_fork",
):
    assert required in harness, required

for required in (
    "apollyon_claim_protected_first_entry_static_candidate_v1",
    "static_first_instruction_proven=false",
    "protected_expected_source_origin_proven=false",
    "No #3459 or ancestor source blob is modified.",
):
    assert required in document, required


lines = workflow.splitlines()


def trigger_paths(which: str, following: str) -> list[str]:
    start = lines.index("  " + which + ":")
    end = lines.index("  " + following + ":", start + 1)
    chunk = lines[start + 1:end]
    idx = chunk.index("    paths:")
    values: list[str] = []
    for line in chunk[idx + 1:]:
        if not line.startswith("      "):
            break
        match = re.fullmatch(r'      - "([^"]+)"', line)
        assert match, line
        values.append(match.group(1))
    assert len(values) == len(set(values)), which
    assert set(values) == WATCHED, (which, set(values) ^ WATCHED)
    return values


assert trigger_paths("pull_request", "push") == trigger_paths(
    "push", "workflow_dispatch"
)

parents = [
    "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c",
    "ops/xiphos/apollyon_claim_task_singleton_guard_v1.c",
    "ops/xiphos/apollyon_claim_no_clone_lock_v1.c",
    "ops/xiphos/apollyon_claim_self_observed_lock_v1.c",
    "ops/xiphos/apollyon_claim_no_exec_lock_v1.c",
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.c",
    "scripts/apollyon_claim_protected_first_entry_v1_selftest.c",
]

base_flags = [
    "-std=c11",
    "-O2",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-fno-ident",
    "-fno-pie",
    "-pthread",
    "-Iops/xiphos",
]
link_flags = ["-static", "-no-pie", "-Wl,--build-id=none"]


def run(
    command: list[str],
    *,
    timeout: int = 70,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        env=ENV,
        timeout=timeout,
        check=False,
    )


def static_elf(path: Path) -> None:
    program = run(["/usr/bin/readelf", "-lW", str(path)])
    assert program.returncode == 0, program.stderr
    assert " INTERP " not in program.stdout
    assert "Requesting program interpreter" not in program.stdout

    dynamic = run(["/usr/bin/readelf", "-dW", str(path)])
    combined = dynamic.stdout + dynamic.stderr
    assert "NEEDED" not in combined


with tempfile.TemporaryDirectory(
    prefix=".void-apollyon-protected-first-entry-",
    dir=ROOT,
) as td:
    root = Path(td).resolve()
    fixed_dir = root / "fixed" / "bin"
    fixed_dir.mkdir(parents=True, mode=0o755)
    fixed = fixed_dir / "apollyon_claim_protected_first_entry_v1"

    macros = [
        (
            '-DVOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_FIXED_SELF="'
            + str(fixed)
            + '"'
        ),
        (
            "-DVOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_REQUIRED_UID="
            + str(os.geteuid())
        ),
        (
            "-DVOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_REQUIRED_GID="
            + str(os.getegid())
        ),
    ]

    builds: list[bytes] = []
    for trial in range(3):
        binary = root / f"candidate-{trial}"
        cp = run([
            "/usr/bin/gcc",
            *base_flags,
            *macros,
            *parents,
            *link_flags,
            "-o",
            str(binary),
        ])
        assert cp.returncode == 0, (trial, cp.stdout, cp.stderr)
        static_elf(binary)
        builds.append(binary.read_bytes())

    assert builds[0] == builds[1] == builds[2], "nonreproducible_static_build"
    candidate_sha = hashlib.sha256(builds[0]).hexdigest()

    fixed.write_bytes(builds[0])
    fixed.chmod(0o555)

    positive = run([str(fixed), "--self-test"], timeout=55)
    assert positive.returncode == 0, (positive.stdout, positive.stderr)
    for required in (
        MARKER,
        "fixed_path_custody_verified=true",
        "expected_executable_fd_derived_internally=true",
        "expected_cmdline_derived_internally=true",
        "visible_generation_revalidated_after_lock=true",
        "fixed_path_expected_source_bound=true",
        "self_observed_no_clone_no_exec_chain_bound=true",
        "static_first_instruction_proven=false",
        "protected_expected_source_origin_proven=false",
        "protected_parent_origin_proven=false",
        "xiphos_host_qualification_performed=false",
        "durable_attempt_claim_performed=false",
        "training_execution_performed=false",
        "funds_movement=false",
    ):
        assert required in positive.stdout.splitlines(), (
            required,
            positive.stdout,
            positive.stderr,
        )

    alternate = root / "copied-first-entry"
    alternate.write_bytes(builds[0])
    alternate.chmod(0o555)
    wrong_path = run([str(alternate), "--self-test"])
    assert wrong_path.returncode != 0
    assert "HOLD=protected_first_entry_case_" in wrong_path.stderr

    fixed.chmod(0o775)
    writable = run([str(fixed), "--self-test"])
    assert writable.returncode != 0
    assert "HOLD=protected_first_entry_case_" in writable.stderr
    fixed.chmod(0o555)

    replay = run([str(fixed), "--self-test"], timeout=55)
    assert replay.returncode == 0, (replay.stdout, replay.stderr)

    denied = run([str(fixed), "--run"])
    assert denied.returncode == 2
    assert denied.stderr.strip() == "HOLD=source_only_self_test_only"

assert not any(path.name.startswith(".void-apollyon-protected-first-entry-")
               for path in ROOT.iterdir())

print(MARKER)
print("parent_3459_and_transitive_blobs_pinned=true")
print("caller_expected_executable_fd_removed=true")
print("caller_expected_cmdline_removed=true")
print("fixed_path_custody_verified=true")
print("raw_cmdline_kernel_derived=true")
print("fixed_path_visible_generation_revalidated=true")
print("copied_binary_wrong_path_rejected=true")
print("writable_fixed_leaf_rejected=true")
print("static_fixture_no_pt_interp=true")
print("static_fixture_no_dynamic_needed=true")
print("three_static_builds_byte_reproducible=true")
print("static_fixture_candidate_sha256=" + candidate_sha)
print("fixed_path_expected_source_bound=true")
print("static_first_instruction_proven=false")
print("protected_expected_source_origin_proven=false")
print("protected_parent_origin_proven=false")
print("xiphos_host_qualification_performed=false")
print("durable_attempt_claim_performed=false")
print("training_execution_performed=false")
print("funds_movement=false")

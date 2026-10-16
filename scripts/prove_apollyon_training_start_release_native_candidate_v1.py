#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE_REL = "ops/xiphos/apollyon_training_start_release_native_candidate_v1.c"
SOURCE = ROOT / SOURCE_REL
WORKFLOW_REL = ".github/workflows/apollyon-training-start-release-native-candidate-v1.yml"
WORKFLOW = ROOT / WORKFLOW_REL
PARENT_SOURCE_REL = "tools/apollyon-training-start-release-binding-v1.mjs"
PARENT_PROOF_REL = "scripts/prove_apollyon_training_start_release_binding_v1.mjs"
PARENT_WORKFLOW_REL = ".github/workflows/apollyon-training-start-release-binding-v1.yml"

SOURCE_BLOB = "c57c29b029d03c29358f56dd5c52aa48e792c571"
PARENT_SOURCE_BLOB = "b8d7229369e7d74e515955e726e0268bbdf6e513"
PARENT_PROOF_BLOB = "7a67f25c40d52574cc4a7bd25604e9ff79367487"
PARENT_WORKFLOW_BLOB = "c577da33e31b2c32d8a01e42105c7ced8cab0b4f"

MARKER = "VOID_APOLLYON_TRAINING_START_RELEASE_NATIVE_CANDIDATE_V1"
EXPECTED_TRIGGER_PATHS = {
    SOURCE_REL,
    "scripts/prove_apollyon_training_start_release_native_candidate_v1.py",
    "docs/security/apollyon-training-start-release-native-candidate-v1.md",
    WORKFLOW_REL,
    PARENT_SOURCE_REL,
    PARENT_PROOF_REL,
    PARENT_WORKFLOW_REL,
}


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def stable_read(path: pathlib.Path) -> bytes:
    before = path.lstat()
    assert path.is_file() and not path.is_symlink(), path
    assert before.st_nlink == 1 and before.st_size > 0, path
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        assert getattr(before, field) == getattr(after, field), (path, field)
    return raw


def run(
    argv: list[str],
    *,
    check: bool = True,
    env: dict[str, str] | None = None,
    timeout: int = 60,
) -> subprocess.CompletedProcess[str]:
    cp = subprocess.run(
        argv,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        env=env,
        check=False,
        timeout=timeout,
    )
    if check and cp.returncode != 0:
        raise AssertionError(
            f"command failed rc={cp.returncode}: {argv!r}\n"
            f"stdout={cp.stdout}\nstderr={cp.stderr}"
        )
    return cp


def event_paths(text: str, event: str, next_event: str) -> list[str]:
    lines = text.splitlines()
    marker = "  " + event + ":"
    end_marker = "  " + next_event + ":"
    assert lines.count(marker) == 1, marker
    start = lines.index(marker)
    end = lines.index(end_marker, start + 1)
    block = lines[start + 1 : end]
    path_markers = [i for i, line in enumerate(block) if line == "    paths:"]
    assert len(path_markers) == 1, (event, path_markers)
    out: list[str] = []
    for line in block[path_markers[0] + 1 :]:
        if not line.startswith("      "):
            break
        if line.startswith('      - "') and line.endswith('"'):
            out.append(line[9:-1])
        elif line.strip():
            raise AssertionError((event, line))
    return out


source_raw = stable_read(SOURCE)
parent_source_raw = stable_read(ROOT / PARENT_SOURCE_REL)
parent_proof_raw = stable_read(ROOT / PARENT_PROOF_REL)
parent_workflow_raw = stable_read(ROOT / PARENT_WORKFLOW_REL)

assert git_blob(source_raw) == SOURCE_BLOB
assert git_blob(parent_source_raw) == PARENT_SOURCE_BLOB
assert git_blob(parent_proof_raw) == PARENT_PROOF_BLOB
assert git_blob(parent_workflow_raw) == PARENT_WORKFLOW_BLOB

source = source_raw.decode("utf-8", "strict")
assert MARKER in source
assert PARENT_SOURCE_BLOB in source
assert "RELEASE_FD 3" in source
assert "RELEASE_FRAME_BYTES 64U" in source
assert "PARENT_RELEASE_BINDING_BLOB_SHA1" in source
assert "release_writer_exclusivity_proven=false" in source
assert "private_release_channel_origin_proven=false" in source
assert "trainer_releaser_lineage_proven=false" in source
assert "trainer_release_authorized=false" in source
assert "training_execution_authorized=false" in source
assert "training_execution_performed=false" in source

for forbidden in (
    "O_CREAT",
    "O_TRUNC",
    "unlink(",
    "rename(",
    "renameat",
    "systemctl",
    "AF_UNIX",
    "SOCK_STREAM",
    "connect(",
    "listen(",
    "accept(",
    "crypto.sign",
    "transaction_broadcast=true",
    "funds_movement=true",
):
    assert forbidden not in source, forbidden

run_start = source.index("static void run_gate(")
run_source = source[run_start:]
assert run_source.index("inherited_fd_set_exact()") < run_source.index(
    "release_fd_snapshot(&pipe_before)"
)
assert run_source.index("observe_security(expected_uid,expected_gid,&sec_before)") < (
    run_source.index("install_noexec_seccomp()")
)
assert run_source.index("install_noexec_seccomp()") < run_source.index(
    "read_frame_then_eof(RELEASE_FD"
)
assert run_source.index("read_frame_then_eof(RELEASE_FD") < run_source.index(
    "observe_security(expected_uid,expected_gid,&sec_after)"
)
assert run_source.index("release_fd_snapshot(&pipe_after)") < run_source.index(
    'printf("release_gate_shape_verified=true'
)

workflow = WORKFLOW.read_text("utf-8")
pull = event_paths(workflow, "pull_request", "push")
push = event_paths(workflow, "push", "workflow_dispatch")
for label, actual in (("pull_request", pull), ("push", push)):
    assert len(actual) == len(EXPECTED_TRIGGER_PATHS), (label, actual)
    assert len(set(actual)) == len(actual), (label, actual)
    assert set(actual) == EXPECTED_TRIGGER_PATHS, (label, actual)

cc = shutil.which("cc")
readelf = shutil.which("readelf")
file_tool = shutil.which("file")
assert cc and readelf and file_tool

with tempfile.TemporaryDirectory(
    prefix="void-apollyon-release-native-v1-"
) as td:
    temp = pathlib.Path(td)
    a = temp / "candidate-a"
    b = temp / "candidate-b"
    c_path = temp / "candidate-c"
    flags = [
        cc,
        "-std=c11",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-O2",
        "-static",
        "-Wl,--build-id=none",
        str(SOURCE),
    ]
    run(flags + ["-o", str(a)])
    run(flags + ["-o", str(b)])
    run(flags + ["-o", str(c_path)])
    raw_a = a.read_bytes()
    raw_b = b.read_bytes()
    raw_c = c_path.read_bytes()
    assert raw_a == raw_b == raw_c
    candidate_sha256 = hashlib.sha256(raw_a).hexdigest()
    assert len(raw_a) > 0
    assert len(candidate_sha256) == 64

    file_out = run([file_tool, str(a)]).stdout
    assert "statically linked" in file_out, file_out
    program_headers = run([readelf, "-l", str(a)]).stdout
    assert " INTERP " not in program_headers
    dynamic = run([readelf, "-d", str(a)], check=False)
    assert "NEEDED" not in dynamic.stdout

    self_test = run([str(a), "--self-test"], timeout=30)
    lines = set(self_test.stdout.splitlines())
    for expected in (
        MARKER + "_SELF_TEST_GREEN",
        "parent_release_binding_blob_bound=true",
        "fixed_release_fd=3",
        "release_fd_read_only_pipe_required=true",
        "exact_64_byte_frame_then_eof_required=true",
        "short_frame_rejected=true",
        "extra_frame_rejected=true",
        "missing_eof_rejected=true",
        "delayed_extra_rejected=true",
        "held_duplicate_writer_timeout_rejected=true",
        "exact_uid_gid_slots_required=true",
        "supplementary_groups_empty_required=true",
        "no_new_privileges_required=true",
        "all_capability_sets_zero_required=true",
        "hostile_nnp_zero_rejected=true",
        "hostile_nonzero_capability_rejected=true",
        "hostile_supplementary_group_rejected=true",
        "post_first_entry_exec_forbidden=true",
        "hostile_loader_runtime_environment_rejected=true",
        "private_release_channel_origin_proven=false",
        "release_writer_exclusivity_proven=false",
        "trainer_releaser_lineage_proven=false",
        "trainer_release_authorized=false",
        "trainer_release_performed=false",
        "training_execution_authorized=false",
        "training_execution_performed=false",
        "candidate_weight_mutation_performed=false",
        "automatic_retry_authorized=false",
        "filesystem_write=false",
        "service_action=false",
        "socket_action=false",
        "production_signing=false",
        "transaction_broadcast=false",
        "funds_movement=false",
    ):
        assert expected in lines, expected

    no_fd = run(
        [
            str(a),
            "--run",
            "--release-binding-id",
            "apollyon_training_start_release_binding_v1:" + "a" * 64,
            "--expected-uid",
            str(os.getuid() or 1000),
            "--expected-gid",
            str(os.getgid() or 1000),
        ],
        check=False,
    )
    assert no_fd.returncode == 2
    assert MARKER + "_HOLD" in no_fd.stderr
    assert (
        "reason=release_native_inherited_fd_set_invalid" in no_fd.stderr
        or "reason=release_native_root_forbidden" in no_fd.stderr
    )
    assert "trainer_release_authorized=false" in no_fd.stderr
    assert "training_execution_authorized=false" in no_fd.stderr

print("VOID_APOLLYON_TRAINING_START_RELEASE_NATIVE_CANDIDATE_V1_PROOF_GREEN")
print("parent_release_binding_blob_bound=true")
print("candidate_static=true")
print("candidate_no_pt_interp=true")
print("candidate_no_needed=true")
print("candidate_reproducible_bytes=true")
print("candidate_three_build_equality=true")
print("candidate_sha256=" + candidate_sha256)
print("release_fd3_exact_allowlist_bound=true")
print("release_frame_short_extra_timeout_adversaries=true")
print("held_duplicate_writer_timeout_adversary=true")
print("trainer_nnp_capability_adversaries=true")
print("post_first_entry_noexec_barrier_proven=true")
print("release_pipe_identity_observed_but_writer_origin_unproven=true")
print("private_release_channel_origin_proven=false")
print("release_writer_exclusivity_proven=false")
print("trainer_releaser_lineage_proven=false")
print("trainer_release_authorized=false")
print("trainer_release_performed=false")
print("training_execution_authorized=false")
print("training_execution_performed=false")
print("candidate_weight_mutation_performed=false")
print("automatic_retry_authorized=false")
print("filesystem_write=false")
print("service_action=false")
print("socket_action=false")
print("production_signing=false")
print("transaction_broadcast=false")
print("funds_movement=false")
print("next_gate=apollyon_training_start_release_releaser_integration_v1")

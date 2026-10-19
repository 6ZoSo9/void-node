#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/xiphos/apollyon_training_start_release_releaser_integration_v1.c"
TRAINER = ROOT / "ops/xiphos/apollyon_training_start_release_native_candidate_v1.c"
PIPE_PAIR = ROOT / "ops/xiphos/apollyon_release_pipe_pair_generation_v1.c"

SOURCE_BLOB = "003087ec2124eea8df8f66b2b17d111fcf98c5d5"
TRAINER_BLOB = "265e1c73a6df9ae7fc0ec6a7e0ce474da3145b36"
PIPE_PAIR_BLOB = "93390eefd1e72e70af7206e9982c8eaa5e042149"

MARKER = "VOID_APOLLYON_TRAINING_START_RELEASE_RELEASER_INTEGRATION_V1"
RELEASE_BINDING = "apollyon_training_start_release_binding_v1:" + "a" * 64
RELEASE_DOMAIN_HEX = "c201c621cc904c2e9c0c2527322debc326736b7f5e2c731a1032d2f1d3cb2b16"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def run(
    argv: list[str],
    *,
    check: bool = True,
    timeout: int = 90,
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
        timeout=timeout,
        check=False,
        env={
            "PATH": "/usr/sbin:/usr/bin:/sbin:/bin",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
        },
    )
    if check and cp.returncode != 0:
        raise AssertionError(
            f"command failed rc={cp.returncode}: {argv!r}\n"
            f"stdout={cp.stdout}\nstderr={cp.stderr}"
        )
    return cp


assert git_blob(SOURCE.read_bytes()) == SOURCE_BLOB
assert git_blob(TRAINER.read_bytes()) == TRAINER_BLOB
assert git_blob(PIPE_PAIR.read_bytes()) == PIPE_PAIR_BLOB

source_text = SOURCE.read_text(encoding="utf-8")
for required in (
    'PARENT_PIPE_PAIR_BLOB_SHA1 "93390eefd1e72e70af7206e9982c8eaa5e042149"',
    'TRAINER_NATIVE_BLOB_SHA1 "265e1c73a6df9ae7fc0ec6a7e0ce474da3145b36"',
    "PROC_SUPER_MAGIC",
    "singleton_self",
    "release_pipe_fd_scan",
    "process_stat_fields_at",
    "child_generation_revalidate",
    "own_fd_set_exact",
    "install_writer_continuity_filter",
    "X32_SYSCALL_BIT_V1",
    "PTRACE_SEIZE",
    "PTRACE_O_TRACEEXEC",
    "PTRACE_DETACH",
    "__NR_clone",
    "__NR_dup",
    "__NR_fcntl",
    "__NR_ioctl",
    "__NR_execve",
    "__NR_execveat",
    "__NR_openat",
    "__NR_creat",
    "__NR_socket",
    "__NR_sendmsg",
    "__NR_pidfd_getfd",
    "unexpected=fork()",
    "F_DUPFD_CLOEXEC",
    "FIONCLEX",
    "SYS_execve",
    "SYS_execveat",
    "sendmsg(1,&denied_message,0)",
    "CASE_EXTRA_RELEASER_THREAD",
    "CASE_CHILD_RETAINS_WRITER",
    "CASE_WRONG_TRAINER_PIPE",
    "CASE_DUPLICATE_RELEASER_WRITER",
    "direct_parent_same_pipe_actual_trainer_fixture=true",
    "writer_exclusivity_host_proven=false",
    "trainer_release_authorized=false",
    "training_execution_authorized=false",
):
    assert required in source_text, required

write_index = source_text.index("if(!write_all(release_pipe[1],frame,sizeof(frame)))")
close_index = source_text.index("if(close(release_pipe[1])!=0)", write_index)
detach_index = source_text.index("if(ptrace(PTRACE_DETACH,child,NULL,NULL)!=0)", close_index)
assert write_index < close_index < detach_index

for forbidden in (
    "systemctl",
    "/var/lib/void-apollyon",
    "eth_send",
    "createPrivateKey",
    "trainer_release_authorized=true",
    "training_execution_authorized=true",
    "writer_exclusivity_host_proven=true",
):
    assert forbidden not in source_text, forbidden

cc = shutil.which("gcc") or shutil.which("cc")
readelf = shutil.which("readelf")
file_tool = shutil.which("file")
sudo = shutil.which("sudo")
assert cc and readelf and file_tool and sudo

frame = bytes.fromhex(RELEASE_DOMAIN_HEX) + hashlib.sha256(
    RELEASE_BINDING.encode("utf-8")
).digest()
assert len(frame) == 64
frame_hex = frame.hex()

with tempfile.TemporaryDirectory(
    prefix="void-apollyon-releaser-integration-v1-"
) as td:
    temp = Path(td)
    trainer = temp / "trainer-native"
    run([
        cc,
        "-std=c11",
        "-O2",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-static",
        "-Wl,--build-id=none",
        str(TRAINER),
        "-o",
        str(trainer),
    ])
    assert stat.S_ISREG(trainer.stat().st_mode)

    builds: list[bytes] = []
    integrations: list[Path] = []
    for index in range(3):
        target = temp / f"releaser-integration-{index}"
        run([
            cc,
            "-std=c11",
            "-O2",
            "-Wall",
            "-Wextra",
            "-Werror",
            "-fno-ident",
            "-pthread",
            "-static",
            "-no-pie",
            "-Wl,--build-id=none",
            str(SOURCE),
            "-o",
            str(target),
        ])
        builds.append(target.read_bytes())
        integrations.append(target)

        program = run([readelf, "-lW", str(target)]).stdout
        dynamic = run([readelf, "-dW", str(target)], check=False)
        assert " INTERP " not in program
        assert "Requesting program interpreter" not in program
        assert "NEEDED" not in (dynamic.stdout + dynamic.stderr)

    assert builds[0] == builds[1] == builds[2]
    integration_sha256 = hashlib.sha256(builds[0]).hexdigest()

    positive = run(
        [
            sudo,
            "-n",
            str(integrations[0]),
            "--self-test",
            "--trainer",
            str(trainer),
            "--release-binding-id",
            RELEASE_BINDING,
            "--frame-hex",
            frame_hex,
        ],
        timeout=60,
    )
    lines = set(positive.stdout.splitlines())
    for expected in (
        MARKER + "_SELF_TEST_GREEN",
        "parent_pipe_pair_blob_bound=" + PIPE_PAIR_BLOB,
        "trainer_native_blob_bound=" + TRAINER_BLOB,
        "extra_releaser_thread_rejected=true",
        "child_retained_writer_rejected=true",
        "wrong_trainer_pipe_rejected=true",
        "duplicate_releaser_writer_rejected=true",
        "direct_parent_same_pipe_actual_trainer_fixture=true",
        "single_thread_writer_continuity_fixture=true",
        "trainer_exec_stop_synchronization=true",
        "frame_budget_starts_after_releaser_proof=true",
        "creat_procfd_reopen_blocked=true",
        "writer_cloexec_clear_ioctl_blocked=true",
        "releaser_exec_transition_blocked=true",
        "protected_releaser_origin_proven=false",
        "writer_exclusivity_host_proven=false",
        "trainer_release_authorized=false",
        "training_execution_authorized=false",
        "funds_movement=false",
    ):
        assert expected in lines, expected

    # The positive nested trainer run itself must have reached its exact gate.
    for expected in (
        "VOID_APOLLYON_TRAINING_START_RELEASE_NATIVE_CANDIDATE_V1",
        "mode=run",
        "release_gate_shape_verified=true",
        "release_frame_verified=true",
        "release_eof_verified=true",
        "trainer_releaser_lineage_proven=false",
        "trainer_release_authorized=false",
        "training_execution_authorized=false",
    ):
        assert expected in lines, expected

    # A one-byte-wrong frame must make the actual trainer gate reject and
    # therefore prevent the integration fixture from reaching success.
    wrong = bytearray(frame)
    wrong[-1] ^= 1
    rejected = run(
        [
            sudo,
            "-n",
            str(integrations[0]),
            "--self-test",
            "--trainer",
            str(trainer),
            "--release-binding-id",
            RELEASE_BINDING,
            "--frame-hex",
            bytes(wrong).hex(),
        ],
        check=False,
        timeout=60,
    )
    assert rejected.returncode != 0
    assert MARKER + "_SELF_TEST_GREEN" not in rejected.stdout

    for args in (
        [],
        ["--run"],
        ["--self-test"],
        ["--self-test", "--trainer", str(trainer)],
    ):
        denied = run([str(integrations[0]), *args], check=False, timeout=10)
        assert denied.returncode == 2, (args, denied.returncode)
        assert MARKER + "_HOLD" in denied.stderr
        assert "trainer_release_authorized=false" in denied.stderr
        assert "training_execution_authorized=false" in denied.stderr
        assert "funds_movement=false" in denied.stderr

print(MARKER + "_PROOF_GREEN")
print("source_blob_pinned=true")
print("parent_pipe_pair_blob_pinned=true")
print("trainer_native_blob_pinned=true")
print("three_static_integration_builds_identical=true")
print("integration_sha256=" + integration_sha256)
print("actual_trainer_run_composed=true")
print("direct_parent_same_pipe_fixture=true")
print("single_threaded_releaser_fixture=true")
print("trainer_exec_stop_synchronization=true")
print("frame_budget_starts_after_releaser_proof=true")
print("frame_and_eof_buffered_before_trainer_resume=true")
print("late_writer_escape_syscalls_blocked=true")
print("creat_procfd_reopen_blocked=true")
print("writer_cloexec_clear_ioctl_blocked=true")
print("releaser_exec_transition_blocked=true")
print("extra_releaser_thread_rejected=true")
print("child_retained_writer_rejected=true")
print("wrong_trainer_pipe_rejected=true")
print("duplicate_releaser_writer_rejected=true")
print("wrong_frame_actual_trainer_rejected=true")
print("production_run_mode_absent=true")
print("protected_releaser_origin_proven=false")
print("writer_exclusivity_host_proven=false")
print("trainer_release_authorized=false")
print("training_execution_authorized=false")
print("xiphos_execution=false")
print("funds_movement=false")

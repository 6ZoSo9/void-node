#!/usr/bin/env python3
"""Hosted self-test only: no Xiphos/service/claim/release/training."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/xiphos/apollyon_release_pipe_pair_generation_v1.c"
PARENT = ROOT / "ops/xiphos/apollyon_training_start_release_native_candidate_v1.c"
EXPECTED_SOURCE_BLOB = "93390eefd1e72e70af7206e9982c8eaa5e042149"
EXPECTED_PARENT_BLOB = "265e1c73a6df9ae7fc0ec6a7e0ce474da3145b36"
MARKER = "VOID_APOLLYON_RELEASE_PIPE_PAIR_GENERATION_V1_SELF_TEST=GREEN"

def git_blob(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()

assert git_blob(SOURCE.read_bytes()) == EXPECTED_SOURCE_BLOB
assert git_blob(PARENT.read_bytes()) == EXPECTED_PARENT_BLOB
source_text = SOURCE.read_text(encoding="utf-8")
for required in (
    "PROC_SUPER_MAGIC", "O_NOFOLLOW", "F_GETPIPE_SZ",
    "F_DUPFD_CLOEXEC", "pipe_link_matches", "capture_pair",
    "revalidate_pair", "wait_child_ready", "fork_reader_fixture",
    "cross_process_child_fd3_same_pipe_fixture=true",
    "cross_pipe_child_fd3_rejected=true",
    "writer_exclusivity_proven=false",
    "protected_releaser_origin_proven=false",
    "trainer_releaser_lineage_proven=false",
    "trainer_release_authorized=false",
    "training_execution_authorized=false",
):
    assert required in source_text, required
for forbidden in (
    "systemctl", "execve(", "execveat(", "/var/lib/void-apollyon",
    "eth_send", "createPrivateKey", "trainer_release_authorized=true",
    "training_execution_authorized=true", "writer_exclusivity_proven=true",
):
    assert forbidden not in source_text, forbidden

cc = shutil.which("cc")
readelf = shutil.which("readelf")
assert cc and readelf
with tempfile.TemporaryDirectory(prefix="void-apollyon-release-pair-v1-") as tmp:
    outputs = []
    for n in range(3):
        exe = Path(tmp) / f"pipe_pair_{n}"
        subprocess.run(
            [cc, "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror",
             "-D_FORTIFY_SOURCE=2", "-fstack-protector-strong",
             "-static", "-no-pie", str(SOURCE), "-o", str(exe)],
            check=True, timeout=45, capture_output=True, text=True,
        )
        metadata = exe.stat()
        assert stat.S_ISREG(metadata.st_mode)
        outputs.append(hashlib.sha256(exe.read_bytes()).hexdigest())

        segments = subprocess.run([readelf, "-l", str(exe)], capture_output=True,
                                  text=True, timeout=10, check=True).stdout
        dynamic = subprocess.run([readelf, "-d", str(exe)], capture_output=True,
                                 text=True, timeout=10, check=True).stdout
        assert "INTERP" not in segments
        assert "(NEEDED)" not in dynamic

        run = subprocess.run([str(exe), "--self-test"],
                             capture_output=True, text=True, timeout=15)
        assert run.returncode == 0, (run.returncode, run.stdout, run.stderr)
        assert MARKER in run.stdout
        for line in (
            "kernel_same_pipe_pair_captured=true",
            "retained_descriptor_generation_revalidated=true",
            "cross_process_child_fd3_same_pipe_fixture=true",
            "cross_pipe_child_fd3_rejected=true",
            "fd_replacement_rejected=true",
            "writer_exclusivity_proven=false",
            "protected_releaser_origin_proven=false",
            "trainer_releaser_lineage_proven=false",
            "trainer_release_authorized=false",
            "training_execution_authorized=false",
            "store_mutation=false",
            "key_signing_transaction_funds=false",
        ):
            assert line in run.stdout, line

        for args in ([], ["--run"], ["--release"], ["--self-test", "--run"]):
            denied = subprocess.run([str(exe), *args],
                                    capture_output=True, text=True, timeout=10)
            assert denied.returncode == 2, (args, denied.returncode)
            assert "VOID_APOLLYON_RELEASE_PIPE_PAIR_GENERATION_V1_HOLD" in denied.stderr
            assert "trainer_release_authorized=false" in denied.stderr
    assert len(set(outputs)) == 1, outputs

print("VOID_APOLLYON_RELEASE_PIPE_PAIR_GENERATION_V1_PROOF_GREEN")
print("source_blob_pinned=true")
print("parent_release_blob_pinned=true")
print("three_static_elf_builds_identical=true")
print("real_fork_fd3_positive_and_cross_pipe_negative=true")
print("post_child_ready_handshake_required=true")
print("writer_exclusivity_proven=false")
print("trainer_release_authorized=false")
print("training_execution_authorized=false")
print("xiphos_execution=false")

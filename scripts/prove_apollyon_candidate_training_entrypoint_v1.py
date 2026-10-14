#!/usr/bin/env python3
from __future__ import annotations

import ctypes
import hashlib
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time


MARKER = "VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_V1_PROOF_GREEN"
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/xiphos/apollyon_candidate_training_entrypoint_v1.c"

EXPECTED_SOURCE_BLOB = "caac8932ac8fd6f2f9339404b5703bda969b96a6"
PR_SET_NO_NEW_PRIVS = 38

COMPILE = (
    "cc",
    "-std=c11",
    "-O2",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-D_FORTIFY_SOURCE=2",
    "-fstack-protector-strong",
    "-Wl,-z,relro,-z,now",
    "-Wl,--build-id=none",
)


def git_blob_sha1(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def set_no_new_privileges() -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    rc = libc.prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)
    if rc != 0:
        err = ctypes.get_errno()
        raise OSError(err, os.strerror(err))


def compile_target(binary: Path) -> None:
    subprocess.run(
        [*COMPILE, "-o", str(binary), str(SOURCE)],
        check=True,
        timeout=30,
    )


def run_self_test(binary: Path) -> None:
    result = subprocess.run(
        [str(binary), "--self-test"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=10,
    )
    if result.returncode != 0:
        raise AssertionError("self-test failed: " + result.stderr[-1000:])
    required = (
        "VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_HOLD_V1_SELF_TEST=GREEN",
        "fixed_qualification_window_seconds=300",
        "durable_attempt_claim_required=true",
        "durable_attempt_claim_proven=false",
        "training_execution=false",
        "candidate_weight_mutation=false",
        "automatic_retry=false",
        "automatic_promotion=false",
        "deployment=false",
    )
    for value in required:
        if value not in result.stdout:
            raise AssertionError("self-test missing: " + value)
    if result.stderr != "":
        raise AssertionError("self-test stderr not empty")


def prove_no_nnp_refusal(binary: Path) -> None:
    result = subprocess.run(
        [str(binary)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=10,
    )
    if result.returncode != 2:
        raise AssertionError("missing no-new-privileges refusal")
    if "HOLD=apollyon_candidate_training_entrypoint_no_new_privileges_unproven" not in result.stderr:
        raise AssertionError("wrong no-new-privileges HOLD")
    if "training_execution=false" not in result.stderr:
        raise AssertionError("training boundary missing on NNP HOLD")


def prove_inherited_fd_refusal(binary: Path) -> None:
    read_fd, write_fd = os.pipe()
    try:
        result = subprocess.run(
            [str(binary)],
            pass_fds=(read_fd,),
            preexec_fn=set_no_new_privileges,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=10,
        )
    finally:
        os.close(read_fd)
        os.close(write_fd)
    if result.returncode != 2:
        raise AssertionError("inherited descriptor unexpectedly admitted")
    if "HOLD=apollyon_candidate_training_entrypoint_inherited_fd_present" not in result.stderr:
        raise AssertionError("wrong inherited-fd HOLD")


def prove_qualification_hold(binary: Path) -> None:
    process = subprocess.Popen(
        [str(binary)],
        preexec_fn=set_no_new_privileges,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        time.sleep(0.25)
        if process.poll() is not None:
            stdout, stderr = process.communicate(timeout=5)
            raise AssertionError(
                "qualification process exited before observation window:\n" +
                stdout + "\n" + stderr
            )
        process.send_signal(signal.SIGTERM)
        stdout, stderr = process.communicate(timeout=10)
    finally:
        if process.poll() is None:
            process.kill()
            process.wait(timeout=5)

    if process.returncode != 2:
        raise AssertionError("qualification hold did not terminate fail-closed")
    for value in (
        "VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_HOLD_V1",
        "status=qualification_hold_active",
        "qualification_only=true",
        "durable_attempt_claim_required=true",
        "durable_attempt_claim_proven=false",
        "training_execution_authorized=false",
        "training_execution=false",
        "candidate_weight_mutation=false",
        "automatic_retry=false",
        "automatic_promotion=false",
        "deployment=false",
        "network_api_authority=false",
        "wallet_or_funds_action=false",
        "void_chain_mutation=false",
    ):
        if value not in stdout:
            raise AssertionError("qualification stdout missing: " + value)
    if "HOLD=apollyon_candidate_training_entrypoint_durable_claim_gate_required" not in stderr:
        raise AssertionError("durable claim HOLD missing")
    for value in (
        "attempt_claim=false",
        "training_execution=false",
        "candidate_weight_mutation=false",
        "automatic_retry=false",
        "automatic_promotion=false",
        "deployment=false",
        "wallet_or_funds_action=false",
    ):
        if value not in stderr:
            raise AssertionError("qualification stderr missing: " + value)


def prove_source_boundary(source: str) -> None:
    required = (
        '#define MARKER "VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_HOLD_V1"',
        "#define QUALIFICATION_WINDOW_SECONDS 300U",
        "CLOCK_MONOTONIC",
        "TIMER_ABSTIME",
        "clock_nanosleep(",
        "PR_GET_NO_NEW_PRIVS",
        'opendir("/proc/self/fd")',
        "apollyon_candidate_training_entrypoint_inherited_fd_present",
        "apollyon_candidate_training_entrypoint_durable_claim_gate_required",
        "training_execution_authorized=false",
        "candidate_weight_mutation=false",
        "automatic_retry=false",
        "automatic_promotion=false",
        "deployment=false",
        "network_api_authority=false",
        "wallet_or_funds_action=false",
        "void_chain_mutation=false",
    )
    for value in required:
        if value not in source:
            raise AssertionError("source missing: " + value)

    forbidden = (
        "socket(",
        "socketpair(",
        "connect(",
        "sendmsg(",
        "recvmsg(",
        "fork(",
        "execve(",
        "execl(",
        "execv(",
        "system(",
        "popen(",
        "dlopen(",
        "mkdir(",
        "unlink(",
        "rename(",
        "chmod(",
        "chown(",
        "torch",
        "transformers",
        "unsloth",
        "PeftModel",
        "Trainer(",
    )
    for value in forbidden:
        if value in source:
            raise AssertionError("qualification target gained forbidden primitive: " + value)


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    if git_blob_sha1(source_bytes) != EXPECTED_SOURCE_BLOB:
        raise AssertionError("entrypoint source Git blob mismatch")
    source = source_bytes.decode("utf-8")
    prove_source_boundary(source)

    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-training-entrypoint-v1-"
    ) as td:
        binary = Path(td) / "apollyon_candidate_training_entrypoint_v1"
        compile_target(binary)
        run_self_test(binary)
        prove_no_nnp_refusal(binary)
        prove_inherited_fd_refusal(binary)
        prove_qualification_hold(binary)

    print(MARKER)
    print("source_only=true")
    print("fixed_target=/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1")
    print("qualification_hold_capability=true")
    print("fixed_qualification_window_seconds=300")
    print("no_new_privileges_required=true")
    print("no_inherited_fds_ge_3_required=true")
    print("durable_attempt_claim_required=true")
    print("durable_attempt_claim_proven=false")
    print("training_execution=false")
    print("candidate_weight_mutation=false")
    print("automatic_retry=false")
    print("automatic_promotion=false")
    print("deployment=false")
    print("candidate_binary_identity_accepted=false")
    print("host_installation=false")
    print("service_action=false")
    print("funds_movement=false")
    print("next_gate=apollyon_candidate_training_entrypoint_binary_candidate_v1")


if __name__ == "__main__":
    main()

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

EXPECTED_SOURCE_BLOB = "bfeff81f3eab98988a9be9600a05c696674c49d6"
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


def prove_early_hold_closed_stderr(binary: Path) -> None:
    read_fd, write_fd = os.pipe()
    os.close(read_fd)
    try:
        started = time.monotonic()
        result = subprocess.run(
            [str(binary)],
            stdout=subprocess.PIPE,
            stderr=write_fd,
            text=True,
            check=False,
            timeout=5,
        )
        elapsed = time.monotonic() - started
    finally:
        os.close(write_fd)

    if result.returncode != 2:
        raise AssertionError(
            "early HOLD with closed stderr was terminated by signal"
        )
    if elapsed >= 3.0:
        raise AssertionError("early HOLD blocked on closed stderr")


def prove_early_hold_full_stderr(binary: Path) -> None:
    read_fd, write_fd = os.pipe()
    try:
        os.set_blocking(write_fd, False)
        chunk = b"x" * 4096
        while True:
            try:
                os.write(write_fd, chunk)
            except BlockingIOError:
                break

        started = time.monotonic()
        result = subprocess.run(
            [str(binary)],
            stdout=subprocess.PIPE,
            stderr=write_fd,
            text=True,
            check=False,
            timeout=5,
        )
        elapsed = time.monotonic() - started
    finally:
        os.close(write_fd)
        os.close(read_fd)

    if result.returncode != 2:
        raise AssertionError("early HOLD with full stderr did not fail closed")
    if elapsed >= 3.0:
        raise AssertionError("early HOLD blocked on full stderr")


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


def prove_blocked_readiness_refusal(binary: Path) -> None:
    read_fd, write_fd = os.pipe()
    try:
        os.set_blocking(write_fd, False)
        chunk = b"x" * 4096
        while True:
            try:
                os.write(write_fd, chunk)
            except BlockingIOError:
                break

        started = time.monotonic()
        result = subprocess.run(
            [str(binary)],
            preexec_fn=set_no_new_privileges,
            stdout=write_fd,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=5,
        )
        elapsed = time.monotonic() - started
    finally:
        os.close(write_fd)
        os.close(read_fd)

    if result.returncode != 2:
        raise AssertionError("blocked readiness sink did not fail closed")
    if elapsed >= 3.0:
        raise AssertionError("blocked readiness sink extended observation lifetime")
    if (
        "HOLD=apollyon_candidate_training_entrypoint_stdout_not_immediately_writable"
        not in result.stderr
    ):
        raise AssertionError("blocked readiness sink produced wrong HOLD")
    if "training_execution=false" not in result.stderr:
        raise AssertionError("blocked readiness HOLD lost training boundary")


def prove_closed_readiness_refusal(binary: Path) -> None:
    read_fd, write_fd = os.pipe()
    os.close(read_fd)
    try:
        started = time.monotonic()
        result = subprocess.run(
            [str(binary)],
            preexec_fn=set_no_new_privileges,
            stdout=write_fd,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=5,
        )
        elapsed = time.monotonic() - started
    finally:
        os.close(write_fd)

    if result.returncode != 2:
        raise AssertionError("closed readiness reader did not fail closed")
    if elapsed >= 3.0:
        raise AssertionError("closed readiness reader extended observation lifetime")
    if (
        "HOLD=apollyon_candidate_training_entrypoint_stdout_reader_closed"
        not in result.stderr
    ):
        raise AssertionError("closed readiness reader produced wrong HOLD")
    if "training_execution=false" not in result.stderr:
        raise AssertionError("closed readiness HOLD lost training boundary")


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
        "CLOCK_BOOTTIME",
        "TIMER_ABSTIME",
        "O_NONBLOCK",
        "prepare_process_safety();",
        "sigprocmask(SIG_BLOCK, &qualification_wait_set, NULL)",
        "sigaction(SIGPIPE",
        "int stderr_flags = fcntl(STDERR_FILENO, F_GETFL);",
        "fcntl(STDERR_FILENO, F_SETFL, stderr_flags | O_NONBLOCK)",
        "write(STDOUT_FILENO, payload, sizeof(payload) - 1U)",
        "apollyon_candidate_training_entrypoint_stdout_not_immediately_writable",
        "SIGPIPE",
        "SIG_IGN",
        "apollyon_candidate_training_entrypoint_stdout_reader_closed",
        "timer_create(CLOCK_BOOTTIME",
        "timer_settime(timer_id, TIMER_ABSTIME",
        "sigtimedwait(",
        "sigwaitinfo(",
        "reject_pending_signal_before_ready(qualification_timer);",
        "qualification_hold(qualification_timer);",
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

    safety_function_index = source.index("static void prepare_process_safety(void)")
    safety_mask_index = source.index(
        "sigprocmask(SIG_BLOCK, &qualification_wait_set, NULL)",
        safety_function_index,
    )
    safety_sigpipe_index = source.index("sigaction(SIGPIPE", safety_function_index)
    safety_stderr_index = source.index(
        "int stderr_flags = fcntl(STDERR_FILENO, F_GETFL);",
        safety_function_index,
    )
    safety_stdout_index = source.index(
        "require_nonblocking_fd(\n      STDOUT_FILENO",
        safety_function_index,
    )
    if not (
        safety_function_index < safety_mask_index < safety_sigpipe_index <
        safety_stderr_index < safety_stdout_index
    ):
        raise AssertionError(
            "termination mask and diagnostic I/O are not secured before HOLD"
        )

    main_index = source.index("int main(int argc, char **argv)")
    safety_index = source.index("prepare_process_safety();", main_index)
    self_test_index = source.index(
        'if (argc == 2 && strcmp(argv[1], "--self-test") == 0)', main_index
    )
    argument_hold_index = source.index("if (argc != 1)", main_index)
    timer_index = source.index(
        "timer_t qualification_timer = arm_qualification_timer();", main_index
    )
    pending_index = source.index(
        "reject_pending_signal_before_ready(qualification_timer);", main_index
    )
    ready_index = source.index("emit_ready();", main_index)
    hold_index = source.index("qualification_hold(qualification_timer);", main_index)
    if not (
        main_index < safety_index < self_test_index < argument_hold_index <
        timer_index < pending_index < ready_index < hold_index
    ):
        raise AssertionError(
            "atomic signal/timer gate is not established before readiness"
        )
    if "fflush(stdout)" in source:
        raise AssertionError("qualification readiness regained blocking stdio flush")

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
        "clock_nanosleep(",
        "static volatile sig_atomic_t stop_requested",
        "while (!stop_requested)",
        "request_stop(",
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
        prove_early_hold_closed_stderr(binary)
        prove_early_hold_full_stderr(binary)
        prove_no_nnp_refusal(binary)
        prove_inherited_fd_refusal(binary)
        prove_blocked_readiness_refusal(binary)
        prove_closed_readiness_refusal(binary)
        prove_qualification_hold(binary)

    print(MARKER)
    print("source_only=true")
    print("fixed_target=/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1")
    print("qualification_hold_capability=true")
    print("fixed_qualification_window_seconds=300")
    print("no_new_privileges_required=true")
    print("sigpipe_ignored_before_all_hold_paths=true")
    print("early_hold_closed_stderr_exit2=true")
    print("early_hold_full_stderr_nonblocking=true")
    print("stderr_secured_before_setup_hold=true")
    print("no_inherited_fds_ge_3_required=true")
    print("observation_stdout_stderr_nonblocking=true")
    print("blocked_readiness_sink_fails_closed=true")
    print("closed_readiness_reader_fails_closed=true")
    print("sigpipe_converted_to_hold=true")
    print("termination_signals_blocked_before_hold_paths=true")
    print("absolute_boottime_posix_timer=true")
    print("pending_stop_rejected_before_readiness=true")
    print("atomic_sigwaitinfo_hold=true")
    print("check_then_sleep_race_removed=true")
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

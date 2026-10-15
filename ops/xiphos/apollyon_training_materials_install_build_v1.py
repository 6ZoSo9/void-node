#!/usr/bin/env python3
from __future__ import annotations

import os
from pathlib import Path

from apollyon_training_materials_install_contract_v1 import (
    BUILD_ENV,
    COMPILE_FLAGS,
    MAX_SOURCE_BYTES,
    Hold,
    bounded_regular_bytes,
    sha256,
)
from apollyon_training_materials_install_host_plan_v1 import run_command

def compile_one(source: Path, output: Path) -> bytes:
    result = run_command(
        ["/usr/bin/cc", *COMPILE_FLAGS, "-o", os.fspath(output), os.fspath(source)],
        timeout=60,
        env=BUILD_ENV,
    )
    if result.returncode != 0:
        raise Hold("compile_failed:" + source.name + ":" + result.stderr[-500:])
    return bounded_regular_bytes(output, 1024 * 1024, "compiled_binary")


def run_self_test_binary(path: Path, expected_stdout_sha: str) -> None:
    result = run_command([os.fspath(path), "--self-test"], timeout=30, env=BUILD_ENV)
    if (
        result.returncode != 0
        or result.stderr != ""
        or sha256(result.stdout.encode("utf-8")) != expected_stdout_sha
    ):
        raise Hold("compiled_binary_self_test_mismatch:" + path.name)


def build_locked_binary(
    source_bytes: bytes,
    directory: Path,
    name: str,
    expected_bytes: int,
    expected_sha: str,
    expected_self_test_sha: str,
) -> Path:
    private_source = directory / (name + ".c")
    source_fd = os.open(
        private_source,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0),
        0o400,
    )
    try:
        offset = 0
        while offset < len(source_bytes):
            written = os.write(source_fd, source_bytes[offset:])
            if written <= 0:
                raise Hold("private_source_short_write:" + name)
            offset += written
        os.fsync(source_fd)
    finally:
        os.close(source_fd)
    if bounded_regular_bytes(private_source, MAX_SOURCE_BYTES, "private_source") != source_bytes:
        raise Hold("private_source_identity_mismatch:" + name)
    first = directory / (name + ".first")
    second = directory / (name + ".second")
    first_bytes = compile_one(private_source, first)
    second_bytes = compile_one(private_source, second)
    if first_bytes != second_bytes:
        raise Hold("compiled_binary_not_reproducible:" + name)
    if len(first_bytes) != expected_bytes or sha256(first_bytes) != expected_sha:
        raise Hold("compiled_binary_identity_mismatch:" + name)
    if not first_bytes.startswith(b"\x7fELF"):
        raise Hold("compiled_binary_not_elf:" + name)
    run_self_test_binary(first, expected_self_test_sha)
    return first

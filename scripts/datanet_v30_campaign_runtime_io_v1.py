#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import json
import os
import select
import subprocess
import time

from datanet_v30_campaign_common_v1 import *

ACTIVE: list[subprocess.Popen] = []

def popen_tracked(args: list[str], *, pass_fds: tuple[int, ...] = ()) -> subprocess.Popen:
    proc = subprocess.Popen(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        pass_fds=pass_fds,
        close_fds=True,
    )
    ACTIVE.append(proc)
    return proc


def untrack(proc: subprocess.Popen) -> None:
    try:
        ACTIVE.remove(proc)
    except ValueError:
        pass


def wait_clean(proc: subprocess.Popen, timeout: float) -> tuple[str, str]:
    out, err = proc.communicate(timeout=timeout)
    untrack(proc)
    assert proc.returncode == 0, f"pid={proc.pid} rc={proc.returncode} stderr={err.strip()}"
    return out, err


def terminate_active() -> None:
    for proc in list(ACTIVE):
        try:
            if proc.poll() is None:
                proc.kill()
        except OSError:
            pass
    for proc in list(ACTIVE):
        try:
            proc.wait(timeout=3)
        except Exception:
            pass
        untrack(proc)


def read_exact_fd(fd: int, count: int, timeout: float) -> bytes:
    deadline = time.monotonic() + timeout
    data = bytearray()
    while len(data) < count:
        remaining = deadline - time.monotonic()
        assert remaining > 0, f"fd read timeout {len(data)}/{count}"
        readable, _, _ = select.select([fd], [], [], remaining)
        assert readable, f"fd read timeout {len(data)}/{count}"
        chunk = os.read(fd, count - len(data))
        assert chunk, f"fd EOF {len(data)}/{count}"
        data.extend(chunk)
    return bytes(data)


def read_json_events(fd: int, count: int, timeout: float) -> list[dict]:
    deadline = time.monotonic() + timeout
    buffer = bytearray()
    events: list[dict] = []
    while len(events) < count:
        while b"\n" in buffer and len(events) < count:
            line, _, tail = buffer.partition(b"\n")
            buffer = bytearray(tail)
            if line:
                events.append(json.loads(line.decode("utf-8")))
        if len(events) >= count:
            break
        remaining = deadline - time.monotonic()
        assert remaining > 0, f"event timeout {len(events)}/{count}"
        readable, _, _ = select.select([fd], [], [], remaining)
        assert readable, f"event timeout {len(events)}/{count}"
        chunk = os.read(fd, 4096)
        assert chunk, f"event EOF {len(events)}/{count}"
        buffer.extend(chunk)
    return events


def read_json_line_from_proc(proc: subprocess.Popen, timeout: float) -> dict:
    assert proc.stdout is not None
    readable, _, _ = select.select([proc.stdout.fileno()], [], [], timeout)
    assert readable, f"pid={proc.pid} stdout timeout"
    line = proc.stdout.readline()
    assert line, f"pid={proc.pid} stdout EOF"
    return json.loads(line)


def drain_after_line_and_wait(proc: subprocess.Popen, timeout: float, expected_rc: int = 0) -> tuple[str, str]:
    assert proc.stdout is not None and proc.stderr is not None
    out_tail, err = proc.communicate(timeout=timeout)
    untrack(proc)
    assert proc.returncode == expected_rc, f"pid={proc.pid} rc={proc.returncode} expected={expected_rc} stderr={err.strip()}"
    assert out_tail == "", f"pid={proc.pid} unexpected extra stdout={out_tail!r}"
    assert err == "", f"pid={proc.pid} stderr={err!r}"
    return out_tail, err


def probe_capability(root: str, binding: admission.Binding, expect_acquired: bool) -> None:
    root_fd, lock_fd = admission.open_bound(root, binding)
    try:
        got = admission.acquire(lock_fd)
        assert got is expect_acquired, (got, expect_acquired)
        if got:
            admission.revalidate(root_fd, lock_fd, binding)
            admission.unlock(lock_fd)
    finally:
        os.close(lock_fd)
        os.close(root_fd)


def validate_publication_receipt(receipt: dict, *, expected_pid: int, expected_slot: int, binding: admission.Binding, fixture: dict) -> None:
    assert receipt["marker"] == PUBLICATION_MARKER
    assert receipt["status"] == "GREEN"
    assert receipt["pid"] == expected_pid, (receipt["pid"], expected_pid)
    assert receipt["slot"] == expected_slot
    assert receipt["slot_name"] == slot_name(binding.k, expected_slot)
    assert receipt["root_identity"] == binding.root_identity
    assert receipt["capability"] == {"name": cap_name(binding.k), "identity": binding.lock_identity}
    assert receipt["sole_holder_capability_fd_proved"] is True
    assert receipt["helper_lifetimes"]["fallocate"]["count"] == 1
    assert receipt["helper_lifetimes"]["link"]["count"] == 1
    assert receipt["helper_lifetimes"]["total"] == 2
    assert receipt["helper_execution_sequential"] is True
    assert receipt["collision_helper_executed"] is False
    assert receipt["inode_local_full_reservation_proved"] is True
    assert receipt["create_only_publication_preserved_inode"] is True
    assert receipt["parent_directory_fsync"] is True
    assert receipt["writable_payload_fd_closed_before_postpublication_readback"] is True
    assert receipt["production_runtime_touched"] is False
    assert receipt["chain_2050_authority_claimed"] is False
    assert receipt["write_ledger"]["calls"] == fixture["one_publication_ledger"]["write_calls"]
    assert receipt["prepublication_anonymous_rehash"]["calls"] == fixture["one_publication_ledger"]["prepublication_read_calls"]
    assert receipt["postpublication_readback"]["calls"] == fixture["one_publication_ledger"]["postpublication_read_calls"]



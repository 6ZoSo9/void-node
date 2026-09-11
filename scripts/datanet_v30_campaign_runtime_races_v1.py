#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys

from datanet_v30_campaign_common_v1 import *
from datanet_v30_campaign_runtime_io_v1 import *

def run_race(root: str, binding: admission.Binding, fixture: dict, slot: int) -> dict:
    ready_r, ready_w = os.pipe2(os.O_CLOEXEC)
    start_r, start_w = os.pipe2(os.O_CLOEXEC)
    event_r, event_w = os.pipe2(os.O_CLOEXEC)
    gate_r, gate_w = os.pipe2(os.O_CLOEXEC)
    hold_r, hold_w = os.pipe2(os.O_CLOEXEC)
    procs: list[subprocess.Popen] = []
    try:
        for _ in range(8):
            args = [
                sys.executable, "-I", "-B", str(ENTRYPOINT_SCRIPT),
                "--mode", "contender",
                "--root", root,
                "--root-identity", binding.root_identity,
                "--lock-identity", binding.lock_identity,
                "--k", binding.k,
                "--slot", str(slot),
                "--ready-fd", str(ready_w),
                "--start-fd", str(start_r),
                "--event-fd", str(event_w),
                "--gate-fd", str(gate_r),
                "--hold-fd", str(hold_r),
            ]
            procs.append(popen_tracked(args, pass_fds=(ready_w, start_r, event_w, gate_r, hold_r)))
        for fd in (ready_w, start_r, event_w, gate_r, hold_r):
            close_quiet(fd)
        ready_w = start_r = event_w = gate_r = hold_r = -1

        assert read_exact_fd(ready_r, 8, 20) == b"R" * 8
        os.write(start_w, b"G" * 8)
        close_quiet(start_w)
        start_w = -1
        events = read_json_events(event_r, 8, 20)
        acquired = [event for event in events if event["status"] == "acquired"]
        busy = [event for event in events if event["status"] == "busy"]
        assert len(acquired) == 1, events
        assert len(busy) == 7, events
        winner_pid = int(acquired[0]["pid"])
        by_pid = {proc.pid: proc for proc in procs}
        assert set(by_pid) == {int(event["pid"]) for event in events}
        winner = by_pid[winner_pid]

        # V26: every losing contender must be stopped/reaped before the winner may launch helpers.
        for event in busy:
            proc = by_pid[int(event["pid"])]
            out, err = wait_clean(proc, 10)
            assert out == ""
            assert err == ""
        assert winner.poll() is None, "winner retired before publication gate"
        os.write(gate_w, b"G")
        close_quiet(gate_w)
        gate_w = -1

        receipt = read_json_line_from_proc(winner, 120)
        validate_publication_receipt(receipt, expected_pid=winner_pid, expected_slot=slot, binding=binding, fixture=fixture)
        if slot == 1:
            prior = receipt["prior_classification"]
            assert prior is not None
            assert prior["decision"] == "AUTHORIZE_H1"
            assert prior["reducer_source_sha256"] == source_sha256(COMMON_SOURCE)
        else:
            assert receipt["prior_classification"] is None

        probe_capability(root, binding, expect_acquired=False)
        os.write(hold_w, b"X")
        close_quiet(hold_w)
        hold_w = -1
        drain_after_line_and_wait(winner, 20)
        probe_capability(root, binding, expect_acquired=True)

        return {
            "events": sorted(events, key=lambda item: item["pid"]),
            "winner_pid": winner_pid,
            "busy_pids": sorted(int(event["pid"]) for event in busy),
            "receipt": receipt,
            "losers_reaped_before_helper_gate": True,
            "same_k_busy_while_winner_held": True,
            "same_k_acquired_after_winner_exit": True,
            "role_lifetimes": 8,
            "helper_lifetimes": 2,
        }
    finally:
        for fd in (ready_r, ready_w, start_r, start_w, event_r, event_w, gate_r, gate_w, hold_r, hold_w):
            close_quiet(fd)
        for proc in procs:
            if proc.poll() is None:
                try:
                    proc.kill()
                except OSError:
                    pass
                try:
                    proc.wait(timeout=3)
                except Exception:
                    pass
            untrack(proc)


def run_classifier(root: str, binding: admission.Binding, fixture: dict) -> dict:
    args = [
        sys.executable, "-I", "-B", str(ENTRYPOINT_SCRIPT),
        "--mode", "classifier",
        "--root", root,
        "--root-identity", binding.root_identity,
        "--lock-identity", binding.lock_identity,
        "--k", binding.k,
    ]
    proc = popen_tracked(args)
    out, err = wait_clean(proc, 120)
    assert err == ""
    lines = [line for line in out.splitlines() if line.strip()]
    assert len(lines) == 1, lines
    receipt = json.loads(lines[0])
    assert receipt["marker"] == CLASSIFIER_MARKER
    assert receipt["status"] == "GREEN"
    assert receipt["decision"] == "AUTHORIZE_H1"
    assert receipt["reducer_source_sha256"] == source_sha256(COMMON_SOURCE)
    assert receipt["ledger"] == {
        "read_calls": fixture["one_classifier_ledger"]["read_calls"],
        "read_requested_bytes": fixture["one_classifier_ledger"]["read_requested_bytes"],
        "read_returned_bytes": fixture["one_classifier_ledger"]["read_returned_bytes"],
        "eof_probes": 1,
    }
    return receipt


def run_r0_h0_publisher(root: str, binding: admission.Binding, fixture: dict) -> dict:
    hold_r, hold_w = os.pipe2(os.O_CLOEXEC)
    publisher = None
    collector = None
    try:
        args = [
            sys.executable, "-I", "-B", str(ENTRYPOINT_SCRIPT),
            "--mode", "publisher",
            "--root", root,
            "--root-identity", binding.root_identity,
            "--lock-identity", binding.lock_identity,
            "--k", binding.k,
            "--hold-fd", str(hold_r),
        ]
        publisher = popen_tracked(args, pass_fds=(hold_r,))
        close_quiet(hold_r)
        hold_r = -1
        receipt = read_json_line_from_proc(publisher, 120)
        validate_publication_receipt(receipt, expected_pid=publisher.pid, expected_slot=0, binding=binding, fixture=fixture)
        assert receipt["prior_classification"] is None
        probe_capability(root, binding, expect_acquired=False)

        collector_args = [
            sys.executable, "-I", "-B", str(ENTRYPOINT_SCRIPT),
            "--mode", "collector",
            "--root", root,
            "--root-identity", binding.root_identity,
            "--lock-identity", binding.lock_identity,
            "--k", binding.k,
            "--expected-s0-identity", receipt["payload_identity"],
        ]
        collector = popen_tracked(collector_args)
        collector_out, collector_err = wait_clean(collector, 30)
        collector = None
        assert collector_err == ""
        collector_lines = [line for line in collector_out.splitlines() if line.strip()]
        assert len(collector_lines) == 1
        collector_receipt = json.loads(collector_lines[0])
        assert collector_receipt["marker"] == COLLECTOR_MARKER
        assert collector_receipt["status"] == "GREEN"
        assert collector_receipt["capability_busy"] is True
        assert collector_receipt["s1_absent"] is True
        assert collector_receipt["s0_identity"] == receipt["payload_identity"]

        # Crash cut: publisher is killed while still blocked with the process-owned capability held.
        publisher.send_signal(signal.SIGKILL)
        publisher.wait(timeout=10)
        untrack(publisher)
        assert publisher.returncode == -signal.SIGKILL, publisher.returncode
        assert publisher.stderr is not None
        stderr = publisher.stderr.read()
        assert stderr == "", stderr
        close_quiet(hold_w)
        hold_w = -1
        probe_capability(root, binding, expect_acquired=True)
        return {
            "publisher_pid": publisher.pid,
            "collector_pid": collector_receipt["pid"],
            "publication_receipt": receipt,
            "collector_receipt": collector_receipt,
            "capability_busy_at_cut": True,
            "publisher_killed_and_reaped": True,
            "capability_acquired_after_crash_release": True,
            "role_lifetimes": 2,
            "helper_lifetimes": 2,
        }
    finally:
        close_quiet(hold_r)
        close_quiet(hold_w)
        for proc in (collector, publisher):
            if proc is not None and proc.poll() is None:
                try:
                    proc.kill()
                except OSError:
                    pass
                try:
                    proc.wait(timeout=3)
                except Exception:
                    pass
            if proc is not None and proc.poll() is None:
                untrack(proc)

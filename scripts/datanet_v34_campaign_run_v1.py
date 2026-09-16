#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import json
import os
from pathlib import Path
import signal
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_v34_campaign_modes_v1 as modes
import prove_datanet_v31_campaign_topology_ext4_v1 as v31

SOURCE = Path(__file__).resolve()
ENTRYPOINT = SCRIPT_DIR / "prove_datanet_v34_durable_recovery_campaign_ext4_v1.py"
FINAL_SCRIPT = SCRIPT_DIR / "prove_datanet_v34_campaign_final_verifier_v1.py"
FINAL_MARKER = "VOID_DATANET_V34_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"


def phase(name: str, **detail):
    print(json.dumps({"marker": "VOID_DATANET_V34_PHASE", "phase": name, **detail}), flush=True)


def run_race(root: str, binding, fixture: dict, slot: int, *, expected_s0: dict | None = None) -> dict:
    ready_r, ready_w = os.pipe2(os.O_CLOEXEC)
    start_r, start_w = os.pipe2(os.O_CLOEXEC)
    event_r, event_w = os.pipe2(os.O_CLOEXEC)
    gate_r, gate_w = os.pipe2(os.O_CLOEXEC)
    hold_r, hold_w = os.pipe2(os.O_CLOEXEC)
    prior_r, prior_w = os.pipe2(os.O_CLOEXEC)
    procs = []
    try:
        for _ in range(8):
            args = [
                sys.executable, "-I", "-B", str(ENTRYPOINT), "--mode", "contender",
                "--root", root, "--root-identity", binding.root_identity,
                "--lock-identity", binding.lock_identity, "--k", binding.k, "--slot", str(slot),
                "--ready-fd", str(ready_w), "--start-fd", str(start_r), "--event-fd", str(event_w),
                "--gate-fd", str(gate_r), "--hold-fd", str(hold_r), "--prior-fd", str(prior_w),
            ]
            if slot == 1:
                assert expected_s0 is not None
                args += ["--expected-s0-identity", expected_s0["identity"], "--expected-s0-generation", str(expected_s0["generation"])]
            procs.append(v31.popen_tracked(args, pass_fds=(ready_w, start_r, event_w, gate_r, hold_r, prior_w)))
        for fd in (ready_w, start_r, event_w, gate_r, hold_r, prior_w):
            v31.close_quiet(fd)
        ready_w = start_r = event_w = gate_r = hold_r = prior_w = -1
        assert v31.read_exact_fd(ready_r, 8, 20) == b"R" * 8
        os.write(start_w, b"G" * 8)
        v31.close_quiet(start_w)
        start_w = -1
        events = v31.read_json_events(event_r, 8, 20)
        acquired = [e for e in events if e["status"] == "acquired"]
        busy = [e for e in events if e["status"] == "busy"]
        assert len(acquired) == 1 and len(busy) == 7, events
        winner_pid = int(acquired[0]["pid"])
        phase("race.events", slot=slot, pid=winner_pid)
        by_pid = {p.pid: p for p in procs}
        assert set(by_pid) == {int(e["pid"]) for e in events}
        winner = by_pid[winner_pid]
        for event in busy:
            out, err = v31.wait_clean(by_pid[int(event["pid"])], 10)
            assert out == "" and err == ""
        assert winner.poll() is None
        os.write(gate_w, b"G")
        v31.close_quiet(gate_w)
        gate_w = -1

        prior = None
        if slot == 1:
            phase("race.prior_wait", slot=slot, pid=winner_pid)
            prior = v31.read_json_line_fd(prior_r, 120)
            assert prior["decision"] == "AUTHORIZE_H1_AFTER_CLAIM"
            assert prior["allow_payload_allocation"] is True
            assert prior["claim_created_before_payload_allocation"] is True
            assert prior["claimant_pid"] == winner_pid
            assert prior["claimant_capability_seals"] == 15
            assert prior["s0_identity"] == expected_s0["identity"]
            assert prior["s0_generation"] == expected_s0["generation"]

        assert winner.stdout is not None
        phase("race.receipt_wait", slot=slot, pid=winner_pid)
        receipt = v31.read_json_line_fd(winner.stdout.fileno(), 120)
        phase("race.receipt_ok", slot=slot, pid=winner_pid)
        action = "e0" if slot == 0 else "close-s1"
        modes.validate_publication_receipt(receipt, expected_pid=winner_pid, expected_slot=slot, binding=binding, fixture=fixture, action=action)
        if slot == 1:
            assert prior is not None
            s0 = receipt["existing_s0_verification"]
            assert f"{s0['identity']['dev']}:{s0['identity']['ino']}" == prior["s0_identity"]
            assert s0["generation"] == prior["s0_generation"]
            rec = receipt["v34_recovery"]
            assert rec["armed_sha256"] == prior["armed_sha256"]
            assert rec["claimed_sha256"] == prior["claimed_sha256"]
            assert rec["claimant_capability"]["sha256"] == prior["claimant_capability_sha256"]
        v31.probe_capability(root, binding, expect_acquired=False)
        os.write(hold_w, b"X")
        v31.close_quiet(hold_w)
        hold_w = -1
        v31.drain_after_line_and_wait(winner, 20)
        v31.probe_capability(root, binding, expect_acquired=True)
        return {
            "events": sorted(events, key=lambda item: item["pid"]), "winner_pid": winner_pid,
            "busy_pids": sorted(int(e["pid"]) for e in busy), "receipt": receipt,
            "prior_classification": prior, "losers_reaped_before_helper_gate": True,
            "same_k_busy_while_winner_held": True, "same_k_acquired_after_winner_exit": True,
            "same_pid_became_node_publisher": receipt["publisher_pid"] == winner_pid,
            "role_lifetimes": 8, "helper_lifetimes": 2,
        }
    finally:
        for fd in (ready_r, ready_w, start_r, start_w, event_r, event_w, gate_r, gate_w, hold_r, hold_w, prior_r, prior_w):
            v31.close_quiet(fd)
        for proc in procs:
            if proc.poll() is None:
                try: proc.kill()
                except OSError: pass
                try: proc.wait(timeout=3)
                except Exception: pass
            v31.untrack(proc)


def run_classifier(root: str, binding, fixture: dict) -> dict:
    args = [sys.executable, "-I", "-B", str(ENTRYPOINT), "--mode", "classifier", "--root", root,
            "--root-identity", binding.root_identity, "--lock-identity", binding.lock_identity, "--k", binding.k]
    proc = v31.popen_tracked(args)
    out, err = v31.wait_clean(proc, fixture["phase_deadlines_seconds"]["e0"])
    assert err == ""
    lines = [line for line in out.splitlines() if line.strip()]
    assert len(lines) == 1
    receipt = json.loads(lines[0])
    assert receipt["marker"] == modes.CLASSIFIER_MARKER and receipt["status"] == "GREEN"
    assert receipt["decision"] == "HOLD_NO_RECOVERY_AUTH" and receipt["hold"] is True
    assert receipt["ledger"] == {**fixture["one_classifier_ledger"], "eof_probes": 1}
    return receipt


def run_r0_h0_publisher(root: str, binding, fixture: dict) -> dict:
    hold_r, hold_w = os.pipe2(os.O_CLOEXEC)
    publisher = collector = None
    try:
        args = [sys.executable, "-I", "-B", str(ENTRYPOINT), "--mode", "publisher", "--root", root,
                "--root-identity", binding.root_identity, "--lock-identity", binding.lock_identity,
                "--k", binding.k, "--hold-fd", str(hold_r)]
        publisher = v31.popen_tracked(args, pass_fds=(hold_r,))
        v31.close_quiet(hold_r)
        hold_r = -1
        assert publisher.stdout is not None
        phase("h0.receipt_wait", pid=publisher.pid)
        receipt = v31.read_json_line_fd(publisher.stdout.fileno(), 120)
        phase("h0.receipt_ok", pid=publisher.pid)
        modes.validate_publication_receipt(receipt, expected_pid=publisher.pid, expected_slot=0, binding=binding, fixture=fixture, action="arm-h0")
        v31.probe_capability(root, binding, expect_acquired=False)
        rec = receipt["v34_recovery"]
        helper = rec["link_generation_helper"]
        s0_identity = f"{receipt['payload_identity']['dev']}:{receipt['payload_identity']['ino']}"
        collector_args = [
            sys.executable, "-I", "-B", str(ENTRYPOINT), "--mode", "collector", "--root", root,
            "--root-identity", binding.root_identity, "--lock-identity", binding.lock_identity, "--k", binding.k,
            "--expected-s0-identity", s0_identity, "--expected-s0-generation", str(helper["generation"]),
            "--expected-armed-sha256", rec["armed_sha256"],
        ]
        collector = v31.popen_tracked(collector_args)
        collector_out, collector_err = v31.wait_clean(collector, 30)
        collector = None
        assert collector_err == ""
        lines = [line for line in collector_out.splitlines() if line.strip()]
        assert len(lines) == 1
        collector_receipt = json.loads(lines[0])
        assert collector_receipt["marker"] == modes.COLLECTOR_MARKER and collector_receipt["status"] == "GREEN"
        assert collector_receipt["capability_busy"] is True and collector_receipt["payload_reread_performed"] is False
        assert collector_receipt["generation_reread_performed"] is False
        phase("h0.collector_done", pid=collector_receipt["pid"])
        publisher.send_signal(signal.SIGKILL)
        publisher.wait(timeout=10)
        v31.untrack(publisher)
        assert publisher.returncode == -signal.SIGKILL
        assert publisher.stderr is not None and publisher.stderr.read() == ""
        v31.close_quiet(hold_w)
        hold_w = -1
        v31.probe_capability(root, binding, expect_acquired=True)
        phase("h0.done", pid=publisher.pid)
        return {
            "publisher_pid": publisher.pid, "collector_pid": collector_receipt["pid"],
            "publication_receipt": receipt, "collector_receipt": collector_receipt,
            "capability_busy_at_cut": True, "publisher_killed_and_reaped": True,
            "capability_acquired_after_crash_release": True,
            "same_pid_became_node_publisher": receipt["publisher_pid"] == publisher.pid,
            "role_lifetimes": 2, "helper_lifetimes": 2,
            "cut": {"identity": s0_identity, "generation": helper["generation"], "generation_identity": f"{s0_identity}:{helper['generation']}", "armed_sha256": rec["armed_sha256"]},
        }
    finally:
        v31.close_quiet(hold_r)
        v31.close_quiet(hold_w)
        for proc in (collector, publisher):
            if proc is not None and proc.poll() is None:
                try: proc.kill()
                except OSError: pass
                try: proc.wait(timeout=3)
                except Exception: pass
            if proc is not None: v31.untrack(proc)


def run_final_verifier(e0_root: str, e0_binding, r0_root: str, r0_binding, fixture: dict) -> dict:
    phase("final.start")
    args = [sys.executable, "-I", "-B", str(FINAL_SCRIPT), "--fixture", str(v31.CAMPAIGN_FIXTURE),
            "--e0-root", e0_root, "--e0-root-identity", e0_binding.root_identity,
            "--r0-root", r0_root, "--r0-root-identity", r0_binding.root_identity]
    proc = v31.popen_tracked(args)
    out, err = v31.wait_clean(proc, fixture["phase_deadlines_seconds"]["final_verification"])
    assert err == ""
    lines = [line for line in out.splitlines() if line.strip()]
    assert len(lines) == 1
    receipt = json.loads(lines[0])
    assert receipt["marker"] == FINAL_MARKER and receipt["status"] == "GREEN"
    assert receipt["ledger"] == {**fixture["final_verifier_ledger"], "eof_probes": 3}
    assert receipt["generation_ioctl_calls"] == 3
    assert receipt["e0"]["decision"] == "HOLD_NO_RECOVERY_AUTH"
    assert receipt["r0"]["decision"] == "COMPLETE_RECOVERY_H1"
    return receipt

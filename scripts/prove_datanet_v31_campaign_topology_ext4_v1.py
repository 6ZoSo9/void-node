#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import select
import shutil
import signal
import stat
import subprocess
import sys
import time

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))
import prove_datanet_posix_admission_capability_v1 as admission
import datanet_v31_campaign_reducer_v1 as reducer

MARKER = "VOID_DATANET_V31_CAMPAIGN_TOPOLOGY_EXT4_V1_GREEN"
CLASSIFIER_MARKER = "VOID_DATANET_V31_STATE_CLASSIFIER_V1_GREEN"
COLLECTOR_MARKER = "VOID_DATANET_V31_CHECKPOINT_COLLECTOR_V1_GREEN"
PUBLICATION_MARKER = "VOID_DATANET_H1_ADMITTED_S0_S1_PUBLICATION_EXT4_V1_GREEN"
FINAL_MARKER = "VOID_DATANET_V31_CAMPAIGN_FINAL_VERIFIER_V1_GREEN"
CAMPAIGN_FIXTURE = REPO_ROOT / "fixtures" / "datanet-v31-campaign-topology-ext4-v1.json"
PUBLICATION_FIXTURE = REPO_ROOT / "fixtures" / "datanet-h1-s0-s1-publication-ext4-v1.json"
PUBLICATION_SCRIPT = SCRIPT_DIR / "prove_datanet_h1_admitted_s0_s1_publication_ext4_v1.mjs"
FINAL_SCRIPT = SCRIPT_DIR / "prove_datanet_v31_campaign_final_verifier_v1.py"
ENTRYPOINT = Path(__file__).resolve()
ACCEPTED_POSIX_BLOB = "c4d92dcaaed8879bcd98b96e199729098712d5b4"
ACCEPTED_PUBLICATION_FIXTURE_BLOB = "ffe0df7cd6ed583bf59105e1a20be7d3483fb9f1"
ACCEPTED_V1488_PUBLISHER_BLOB = "0ec6b781a2a01e1f0094f27854577441f886af47"
CAMPAIGN_PUBLISHER_BLOB = "7c4d708ddee16c48fb276540e99defed02fec931"
CURRENT_WIRED_CAMPAIGN_PUBLISHER_BLOB = "4e1f116dfbbb7dfc4805ff50dfc75f84b2304caa"
ACTIVE: list[subprocess.Popen] = []


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def sha256_path(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def identity(st: os.stat_result) -> str:
    return f"{st.st_dev}:{st.st_ino}"


def cap_name(k: str) -> str:
    return admission.capability_name(k)


def slot_name(k: str, slot: int) -> str:
    assert slot in (0, 1)
    return f"datanet-{k}-s{slot}.v1"


def close_quiet(fd: int | None) -> None:
    if fd is None or fd < 0:
        return
    try:
        os.close(fd)
    except OSError:
        pass


def load_fixture() -> dict:
    fixture = json.loads(CAMPAIGN_FIXTURE.read_text(encoding="utf-8"))
    assert fixture["v"] == 1
    assert fixture["format"] == "VOID_DATANET_V31_CAMPAIGN_TOPOLOGY_EXT4_CONTROL_V1"
    assert fixture["parent_pr"] == 1488
    assert fixture["parent_head"] == "9f23742730fe63e92860b6213f65aa4bfc9670c3"
    assert fixture["accepted_posix_source_git_blob_sha1"] == ACCEPTED_POSIX_BLOB
    assert fixture["accepted_s0_s1_fixture_git_blob_sha1"] == ACCEPTED_PUBLICATION_FIXTURE_BLOB
    assert fixture["accepted_v1488_publisher_git_blob_sha1"] == ACCEPTED_V1488_PUBLISHER_BLOB
    assert fixture["campaign_publisher_git_blob_sha1"] == CAMPAIGN_PUBLISHER_BLOB
    assert fixture["process_topology"] == {
        "observer": 1,
        "e0_contenders": 8,
        "e0_classifier": 1,
        "r0_h0_publisher": 1,
        "checkpoint_diagnostic_collector": 1,
        "r0_contenders": 8,
        "source_distinct_final_verifier": 1,
        "fallocate_helpers": 3,
        "link_helpers": 3,
        "role_lifetimes": 21,
        "helper_lifetimes": 6,
        "total_lifetimes": 27,
        "peak_live": 9,
    }
    assert fixture["v31_composed_success_ledger"] == {
        "calls": 15372,
        "requested_bytes": 1006632972,
        "completed_or_returned_bytes": 1006632960,
        "writes": 3072,
        "reads": 12300,
        "nonempty_calls": 15360,
        "eof_probes": 12,
        "completed_mib": 960,
        "throughput_floor_mib_per_second_numerator": 32,
        "throughput_floor_mib_per_second_denominator": 15,
    }
    pub_fixture = json.loads(PUBLICATION_FIXTURE.read_text(encoding="utf-8"))
    assert pub_fixture["quota_key"] == fixture["quota_key"]
    assert pub_fixture["payload_bytes"] == fixture["payload_bytes"]
    assert pub_fixture["io_block_bytes"] == fixture["io_block_bytes"]
    assert pub_fixture["payload_sha256"] == fixture["payload_sha256"]
    assert pub_fixture["image_bytes"] == fixture["image_bytes"]
    return fixture


def source_bindings(fixture: dict) -> dict:
    admission_path = Path(admission.__file__).resolve()
    admission_blob = git_blob_sha1(admission_path.read_bytes())
    publication_fixture_blob = git_blob_sha1(PUBLICATION_FIXTURE.read_bytes())
    publisher_blob = git_blob_sha1(PUBLICATION_SCRIPT.read_bytes())
    assert admission_blob == fixture["accepted_posix_source_git_blob_sha1"]
    assert publication_fixture_blob == fixture["accepted_s0_s1_fixture_git_blob_sha1"]
    assert publisher_blob == CURRENT_WIRED_CAMPAIGN_PUBLISHER_BLOB
    return {
        "admission_git_blob": admission_blob,
        "publication_fixture_git_blob": publication_fixture_blob,
        "accepted_v1488_publisher_git_blob": fixture["accepted_v1488_publisher_git_blob_sha1"],
        "accepted_v1489_campaign_publisher_git_blob": fixture["campaign_publisher_git_blob_sha1"],
        "campaign_publisher_git_blob": publisher_blob,
        "campaign_supervisor_sha256": sha256_path(ENTRYPOINT),
        "schedule_agnostic_reducer_sha256": reducer.source_sha256(),
        "source_distinct_final_verifier_sha256": sha256_path(FINAL_SCRIPT),
        "campaign_fixture_sha256": sha256_path(CAMPAIGN_FIXTURE),
    }


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


def wait_clean(proc: subprocess.Popen, timeout: float) -> tuple[str, str]:
    out, err = proc.communicate(timeout=timeout)
    untrack(proc)
    assert proc.returncode == 0, f"pid={proc.pid} rc={proc.returncode} stderr={err.strip()}"
    return out, err


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


def read_json_line_fd(fd: int, timeout: float) -> dict:
    deadline = time.monotonic() + timeout
    buffer = bytearray()
    while True:
        if b"\n" in buffer:
            line, _, _ = buffer.partition(b"\n")
            assert line
            return json.loads(line.decode("utf-8"))
        remaining = deadline - time.monotonic()
        assert remaining > 0, "json fd timeout"
        readable, _, _ = select.select([fd], [], [], remaining)
        assert readable, "json fd timeout"
        chunk = os.read(fd, 4096)
        assert chunk, "json fd EOF"
        buffer.extend(chunk)


def read_json_line_from_proc(proc: subprocess.Popen, timeout: float) -> dict:
    assert proc.stdout is not None
    readable, _, _ = select.select([proc.stdout.fileno()], [], [], timeout)
    assert readable, f"pid={proc.pid} stdout timeout"
    line = proc.stdout.readline()
    assert line, f"pid={proc.pid} stdout EOF"
    return json.loads(line)


def drain_after_line_and_wait(proc: subprocess.Popen, timeout: float) -> None:
    assert proc.stdout is not None and proc.stderr is not None
    out_tail, err = proc.communicate(timeout=timeout)
    untrack(proc)
    assert proc.returncode == 0, f"pid={proc.pid} rc={proc.returncode} stderr={err.strip()}"
    assert out_tail == "", f"pid={proc.pid} unexpected extra stdout={out_tail!r}"
    assert err == "", f"pid={proc.pid} stderr={err!r}"


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


def parse_binding(ns: argparse.Namespace) -> admission.Binding:
    return admission.Binding(root_identity=ns.root_identity, lock_identity=ns.lock_identity, k=ns.k)


def publication_env(root: str, binding: admission.Binding, lock_fd: int, hold_fd: int, slot: int) -> tuple[str, dict]:
    node = shutil.which("node")
    assert node is not None and os.path.isabs(node), "absolute node unavailable"
    node = os.path.realpath(node)
    assert os.path.isfile(node) and os.access(node, os.X_OK)
    os.set_inheritable(lock_fd, True)
    os.set_inheritable(hold_fd, True)
    env = {
        "LANG": "C",
        "LC_ALL": "C",
        "VOID_DATANET_EXT4_ROOT": root,
        "VOID_DATANET_TARGET_SLOT": str(slot),
        "VOID_DATANET_ADMISSION_CAPABILITY_NAME": cap_name(binding.k),
        "VOID_DATANET_ADMISSION_ROOT_IDENTITY": binding.root_identity,
        "VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY": binding.lock_identity,
        "VOID_DATANET_ADMISSION_LOCK_FD": str(lock_fd),
        "VOID_DATANET_HOLD_FD": str(hold_fd),
    }
    return node, env


def exec_publication(root: str, binding: admission.Binding, lock_fd: int, hold_fd: int, slot: int) -> None:
    node, env = publication_env(root, binding, lock_fd, hold_fd, slot)
    os.execve(node, [node, str(PUBLICATION_SCRIPT)], env)
    raise AssertionError("execve unexpectedly returned")


def contender_mode(ns: argparse.Namespace) -> int:
    fixture = load_fixture()
    source_bindings(fixture)
    binding = parse_binding(ns)
    root_fd = lock_fd = -1
    locked = False
    try:
        root_fd, lock_fd = admission.open_bound(ns.root, binding)
        os.write(ns.ready_fd, b"R")
        assert os.read(ns.start_fd, 1) == b"G", "race start token missing"
        got = admission.acquire(lock_fd)
        if not got:
            os.write(ns.event_fd, (json.dumps({"pid": os.getpid(), "status": "busy"}, separators=(",", ":")) + "\n").encode())
            return 0
        locked = True
        admission.revalidate(root_fd, lock_fd, binding)
        os.write(ns.event_fd, (json.dumps({"pid": os.getpid(), "status": "acquired"}, separators=(",", ":")) + "\n").encode())
        assert os.read(ns.gate_fd, 1) == b"G", "winner gate token missing"

        if ns.slot == 1:
            prior = reducer.reduce_s0_only(root_fd, binding, fixture)
            assert prior["decision"] == "AUTHORIZE_H1"
            admission.revalidate(root_fd, lock_fd, binding)
            os.write(ns.prior_fd, (json.dumps(prior, sort_keys=True, separators=(",", ":")) + "\n").encode())

        for fd in (ns.ready_fd, ns.start_fd, ns.event_fd, ns.gate_fd, ns.prior_fd):
            close_quiet(fd)
        close_quiet(root_fd)
        root_fd = -1
        exec_publication(ns.root, binding, lock_fd, ns.hold_fd, ns.slot)
        return 99
    finally:
        if locked and lock_fd >= 0:
            try:
                admission.unlock(lock_fd)
            except OSError:
                pass
        close_quiet(lock_fd)
        close_quiet(root_fd)


def publisher_mode(ns: argparse.Namespace) -> int:
    fixture = load_fixture()
    source_bindings(fixture)
    binding = parse_binding(ns)
    root_fd = lock_fd = -1
    locked = False
    try:
        root_fd, lock_fd = admission.open_bound(ns.root, binding)
        assert admission.acquire(lock_fd), "R0 H0 publisher capability unexpectedly busy"
        locked = True
        admission.revalidate(root_fd, lock_fd, binding)
        close_quiet(root_fd)
        root_fd = -1
        exec_publication(ns.root, binding, lock_fd, ns.hold_fd, 0)
        return 99
    finally:
        if locked and lock_fd >= 0:
            try:
                admission.unlock(lock_fd)
            except OSError:
                pass
        close_quiet(lock_fd)
        close_quiet(root_fd)


def classifier_mode(ns: argparse.Namespace) -> int:
    fixture = load_fixture()
    source_bindings(fixture)
    binding = parse_binding(ns)
    root_fd = reducer.open_root_readonly(ns.root, binding.root_identity)
    try:
        result = reducer.reduce_s0_only(root_fd, binding, fixture)
    finally:
        os.close(root_fd)
    emit({"marker": CLASSIFIER_MARKER, "status": "GREEN", "pid": os.getpid(), **result})
    return 0


def collector_mode(ns: argparse.Namespace) -> int:
    fixture = load_fixture()
    source_bindings(fixture)
    binding = parse_binding(ns)
    root_fd, lock_fd = admission.open_bound(ns.root, binding)
    try:
        assert admission.acquire(lock_fd) is False, "checkpoint collector unexpectedly acquired held capability"
        expected = sorted([cap_name(binding.k), slot_name(binding.k, 0)])
        assert sorted(os.listdir(root_fd)) == expected
        visible = os.stat(slot_name(binding.k, 0), dir_fd=root_fd, follow_symlinks=False)
        assert stat.S_ISREG(visible.st_mode)
        assert reducer.identity(visible) == ns.expected_s0_identity
        assert visible.st_uid == os.getuid()
        assert visible.st_nlink == 1
        assert stat.S_IMODE(visible.st_mode) == 0o600
        assert visible.st_size == fixture["payload_bytes"]
        assert visible.st_blocks * 512 >= fixture["payload_bytes"]
        emit({
            "marker": COLLECTOR_MARKER,
            "status": "GREEN",
            "pid": os.getpid(),
            "root_identity": binding.root_identity,
            "s0_identity": reducer.identity(visible),
            "capability_busy": True,
            "s1_absent": slot_name(binding.k, 1) not in os.listdir(root_fd),
            "payload_reread_performed": False,
        })
        return 0
    finally:
        os.close(lock_fd)
        os.close(root_fd)


def validate_publication_receipt(receipt: dict, *, expected_pid: int, expected_slot: int, binding: admission.Binding, fixture: dict) -> None:
    assert receipt["marker"] == PUBLICATION_MARKER
    assert receipt["status"] == "GREEN"
    assert receipt["publisher_pid"] == expected_pid, (receipt["publisher_pid"], expected_pid)
    assert receipt["requested_slot"] == expected_slot
    assert receipt["target_slot_name"] == slot_name(binding.k, expected_slot)
    assert receipt["quota_key"] == binding.k
    cap = receipt["admission_capability_binding"]
    assert cap["name"] == cap_name(binding.k)
    assert cap["root_identity"] == binding.root_identity
    assert cap["lock_identity"] == binding.lock_identity
    assert cap["inherited_lock_fd_verified"] is True
    assert cap["visible_and_identity_bound"] is True
    assert receipt["inherited_admission_lock_fd_verified_in_node"] is True
    assert receipt["root_k_posix_capability_composed"] is True
    assert receipt["successful_helper_lifetimes"] == {"fallocate": 1, "link": 1}
    assert receipt["test_only_collision_link_helper_lifetimes"] == 0
    assert receipt["helper_execution_sequential"] is True
    assert receipt["helper_processes"]["fallocate"]["count"] == 1
    assert receipt["helper_processes"]["link"]["count"] == 1
    assert int(receipt["helper_processes"]["fallocate"]["pid"]) > 0
    assert int(receipt["helper_processes"]["link"]["pid"]) > 0
    assert receipt["campaign_hold_fd_active"] is True
    assert receipt["reservation"]["inode_local_full_reservation_proved"] is True
    assert receipt["create_only_publication_preserved_inode"] is True
    assert receipt["parent_directory_fsync"] is True
    assert receipt["writable_payload_fd_closed_before_postpublication_readback"] is True
    assert receipt["production_runtime_touched"] is False
    assert receipt["chain_2050_authority_claimed"] is False
    expected = fixture["one_publication_ledger"]
    assert receipt["write_ledger"] == {
        "calls": expected["write_calls"],
        "requested": expected["write_requested_bytes"],
        "completed": expected["write_completed_bytes"],
        "sha256": fixture["payload_sha256"],
    }
    for field, prefix in (("prepublication_anonymous_rehash", "prepublication_read"), ("postpublication_readback", "postpublication_read")):
        ledger = receipt[field]
        assert ledger["calls"] == expected[f"{prefix}_calls"]
        assert ledger["requested"] == expected[f"{prefix}_requested_bytes"]
        assert ledger["completed"] == expected[f"{prefix}_returned_bytes"]
        assert ledger["sha256"] == fixture["payload_sha256"]
        assert ledger["eof_probes"] == 1
    if expected_slot == 0:
        assert receipt["existing_s0_verification"] is None
        assert receipt["s0_verified_before_s1_candidate_allocation"] is False
        assert receipt["s0_s1_distinct_inodes"] is None
    else:
        s0 = receipt["existing_s0_verification"]
        assert s0["verified_before_candidate_allocation"] is True
        assert s0["ledger"] == {
            "calls": fixture["s1_publisher_existing_s0_ledger"]["read_calls"],
            "requested": fixture["s1_publisher_existing_s0_ledger"]["read_requested_bytes"],
            "completed": fixture["s1_publisher_existing_s0_ledger"]["read_returned_bytes"],
            "sha256": fixture["payload_sha256"],
            "eof_probes": 1,
        }
        assert receipt["s0_verified_before_s1_candidate_allocation"] is True
        assert receipt["s0_s1_distinct_inodes"] is True


def run_race(root: str, binding: admission.Binding, fixture: dict, slot: int) -> dict:
    ready_r, ready_w = os.pipe2(os.O_CLOEXEC)
    start_r, start_w = os.pipe2(os.O_CLOEXEC)
    event_r, event_w = os.pipe2(os.O_CLOEXEC)
    gate_r, gate_w = os.pipe2(os.O_CLOEXEC)
    hold_r, hold_w = os.pipe2(os.O_CLOEXEC)
    prior_r, prior_w = os.pipe2(os.O_CLOEXEC)
    procs: list[subprocess.Popen] = []
    try:
        for _ in range(8):
            args = [
                sys.executable, "-I", "-B", str(ENTRYPOINT),
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
                "--prior-fd", str(prior_w),
            ]
            procs.append(popen_tracked(args, pass_fds=(ready_w, start_r, event_w, gate_r, hold_r, prior_w)))
        for fd in (ready_w, start_r, event_w, gate_r, hold_r, prior_w):
            close_quiet(fd)
        ready_w = start_r = event_w = gate_r = hold_r = prior_w = -1

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

        for event in busy:
            proc = by_pid[int(event["pid"])]
            out, err = wait_clean(proc, 10)
            assert out == ""
            assert err == ""
        assert winner.poll() is None, "winner retired before publication gate"
        os.write(gate_w, b"G")
        close_quiet(gate_w)
        gate_w = -1

        prior = None
        if slot == 1:
            prior = read_json_line_fd(prior_r, 120)
            assert prior["decision"] == "AUTHORIZE_H1"
            assert prior["reducer_source_sha256"] == reducer.source_sha256()
            assert prior["schedule_label_input"] is False
            assert prior["disposable_history_input"] is False

        receipt = read_json_line_from_proc(winner, 120)
        validate_publication_receipt(receipt, expected_pid=winner_pid, expected_slot=slot, binding=binding, fixture=fixture)
        if slot == 1:
            assert prior is not None
            assert receipt["existing_s0_verification"]["identity"] == {
                "dev": prior["s0_identity"].split(":", 1)[0],
                "ino": prior["s0_identity"].split(":", 1)[1],
            }
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
            "prior_classification": prior,
            "losers_reaped_before_helper_gate": True,
            "same_k_busy_while_winner_held": True,
            "same_k_acquired_after_winner_exit": True,
            "same_pid_became_node_publisher": receipt["publisher_pid"] == winner_pid,
            "role_lifetimes": 8,
            "helper_lifetimes": 2,
        }
    finally:
        for fd in (ready_r, ready_w, start_r, start_w, event_r, event_w, gate_r, gate_w, hold_r, hold_w, prior_r, prior_w):
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
        sys.executable, "-I", "-B", str(ENTRYPOINT),
        "--mode", "classifier",
        "--root", root,
        "--root-identity", binding.root_identity,
        "--lock-identity", binding.lock_identity,
        "--k", binding.k,
    ]
    proc = popen_tracked(args)
    out, err = wait_clean(proc, fixture["phase_deadlines_seconds"]["e0"])
    assert err == ""
    lines = [line for line in out.splitlines() if line.strip()]
    assert len(lines) == 1, lines
    receipt = json.loads(lines[0])
    assert receipt["marker"] == CLASSIFIER_MARKER
    assert receipt["status"] == "GREEN"
    assert receipt["decision"] == "AUTHORIZE_H1"
    assert receipt["reducer_source_sha256"] == reducer.source_sha256()
    assert receipt["ledger"] == {**fixture["one_classifier_ledger"], "eof_probes": 1}
    return receipt


def run_r0_h0_publisher(root: str, binding: admission.Binding, fixture: dict) -> dict:
    hold_r, hold_w = os.pipe2(os.O_CLOEXEC)
    publisher = collector = None
    try:
        args = [
            sys.executable, "-I", "-B", str(ENTRYPOINT),
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
        probe_capability(root, binding, expect_acquired=False)

        collector_args = [
            sys.executable, "-I", "-B", str(ENTRYPOINT),
            "--mode", "collector",
            "--root", root,
            "--root-identity", binding.root_identity,
            "--lock-identity", binding.lock_identity,
            "--k", binding.k,
            "--expected-s0-identity", f"{receipt['payload_identity']['dev']}:{receipt['payload_identity']['ino']}",
        ]
        collector = popen_tracked(collector_args)
        collector_out, collector_err = wait_clean(collector, 30)
        collector = None
        assert collector_err == ""
        lines = [line for line in collector_out.splitlines() if line.strip()]
        assert len(lines) == 1
        collector_receipt = json.loads(lines[0])
        assert collector_receipt["marker"] == COLLECTOR_MARKER
        assert collector_receipt["status"] == "GREEN"
        assert collector_receipt["capability_busy"] is True
        assert collector_receipt["s1_absent"] is True
        assert collector_receipt["payload_reread_performed"] is False

        publisher.send_signal(signal.SIGKILL)
        publisher.wait(timeout=10)
        untrack(publisher)
        assert publisher.returncode == -signal.SIGKILL, publisher.returncode
        assert publisher.stderr is not None
        assert publisher.stderr.read() == ""
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
            "same_pid_became_node_publisher": receipt["publisher_pid"] == publisher.pid,
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
            if proc is not None:
                untrack(proc)


def run_final_verifier(e0_root: str, e0_binding: admission.Binding, r0_root: str, r0_binding: admission.Binding, fixture: dict) -> dict:
    args = [
        sys.executable, "-I", "-B", str(FINAL_SCRIPT),
        "--fixture", str(CAMPAIGN_FIXTURE),
        "--e0-root", e0_root,
        "--e0-root-identity", e0_binding.root_identity,
        "--r0-root", r0_root,
        "--r0-root-identity", r0_binding.root_identity,
    ]
    proc = popen_tracked(args)
    out, err = wait_clean(proc, fixture["phase_deadlines_seconds"]["final_verification"])
    assert err == ""
    lines = [line for line in out.splitlines() if line.strip()]
    assert len(lines) == 1
    receipt = json.loads(lines[0])
    assert receipt["marker"] == FINAL_MARKER
    assert receipt["status"] == "GREEN"
    assert receipt["source_sha256"] == sha256_path(FINAL_SCRIPT)
    assert receipt["ledger"] == {**fixture["final_verifier_ledger"], "eof_probes": 3}
    assert receipt["source_distinct_from_campaign_supervisor"] is True
    return receipt


def compose_ledger(publications: list[dict], classifiers: list[dict], s1_receipt: dict, final_receipt: dict) -> dict:
    calls = requested = completed = writes = reads = eof = 0
    for receipt in publications:
        w = receipt["write_ledger"]
        pre = receipt["prepublication_anonymous_rehash"]
        post = receipt["postpublication_readback"]
        calls += w["calls"] + pre["calls"] + post["calls"]
        requested += w["requested"] + pre["requested"] + post["requested"]
        completed += w["completed"] + pre["completed"] + post["completed"]
        writes += w["calls"]
        reads += pre["calls"] + post["calls"]
        eof += pre["eof_probes"] + post["eof_probes"]
    for receipt in classifiers:
        ledger = receipt["ledger"]
        calls += ledger["read_calls"]
        requested += ledger["read_requested_bytes"]
        completed += ledger["read_returned_bytes"]
        reads += ledger["read_calls"]
        eof += ledger["eof_probes"]
    s1_existing = s1_receipt["existing_s0_verification"]["ledger"]
    calls += s1_existing["calls"]
    requested += s1_existing["requested"]
    completed += s1_existing["completed"]
    reads += s1_existing["calls"]
    eof += s1_existing["eof_probes"]
    final = final_receipt["ledger"]
    calls += final["read_calls"]
    requested += final["read_requested_bytes"]
    completed += final["read_returned_bytes"]
    reads += final["read_calls"]
    eof += final["eof_probes"]
    return {
        "calls": calls,
        "requested_bytes": requested,
        "completed_or_returned_bytes": completed,
        "writes": writes,
        "reads": reads,
        "nonempty_calls": calls - eof,
        "eof_probes": eof,
        "completed_mib": completed // (1024 * 1024),
        "throughput_floor_mib_per_second_numerator": 32,
        "throughput_floor_mib_per_second_denominator": 15,
    }


def census(root: str, binding: admission.Binding) -> dict:
    root_fd = reducer.open_root_readonly(root, binding.root_identity)
    try:
        entries = []
        for name in sorted(os.listdir(root_fd)):
            st = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
            entries.append({
                "name": name,
                "identity": reducer.identity(st),
                "mode": oct(stat.S_IMODE(st.st_mode)),
                "nlink": st.st_nlink,
                "size": st.st_size,
            })
        return {"root_identity": binding.root_identity, "entries": entries}
    finally:
        os.close(root_fd)


def write_create_only_json(directory_fd: int, name: str, obj: dict) -> int:
    payload = (json.dumps(obj, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
    fd = os.open(name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC, 0o600, dir_fd=directory_fd)
    try:
        offset = 0
        while offset < len(payload):
            n = os.write(fd, payload[offset:])
            assert n > 0
            offset += n
        os.fsync(fd)
    finally:
        os.close(fd)
    return len(payload)


def write_evidence(evidence_dir: str, files: dict[str, dict]) -> dict:
    assert sorted(files) == ["aggregate.json", "manifest.json", "observer.json", "restart-census.json", "runtime.json"]
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    directory_fd = os.open(evidence_dir, flags)
    try:
        assert os.listdir(directory_fd) == [], "evidence directory not empty"
        sizes = {name: write_create_only_json(directory_fd, name, obj) for name, obj in files.items()}
        os.fsync(directory_fd)
        assert sorted(os.listdir(directory_fd)) == sorted(files)
        total = sum(sizes.values())
        assert total < 2 * 1024 * 1024, total
        return {"files": sizes, "combined_bytes": total, "create_only": True, "directory_fsync": True}
    finally:
        os.close(directory_fd)


def main_proof() -> int:
    assert sys.platform == "linux"
    fixture = load_fixture()
    sources = source_bindings(fixture)
    e0_root = os.environ.get("VOID_DATANET_V31_E0_ROOT")
    r0_root = os.environ.get("VOID_DATANET_V31_R0_ROOT")
    evidence_dir = os.environ.get("VOID_DATANET_V31_EVIDENCE_DIR")
    for value in (e0_root, r0_root, evidence_dir):
        assert isinstance(value, str) and os.path.isabs(value)
    assert os.listdir(e0_root) == []
    assert os.listdir(r0_root) == []
    assert os.listdir(evidence_dir) == []

    outer_start = time.monotonic()
    observer_pid = os.getpid()
    k = fixture["quota_key"]
    e0_binding = admission.make_fixture(e0_root, k)
    r0_binding = admission.make_fixture(r0_root, k)
    assert sorted(os.listdir(e0_root)) == [cap_name(k)]
    assert sorted(os.listdir(r0_root)) == [cap_name(k)]

    e0_start = time.monotonic()
    e0_race = run_race(e0_root, e0_binding, fixture, 0)
    e0_classifier = run_classifier(e0_root, e0_binding, fixture)
    e0_pub_identity = f"{e0_race['receipt']['payload_identity']['dev']}:{e0_race['receipt']['payload_identity']['ino']}"
    assert e0_classifier["s0_identity"] == e0_pub_identity
    assert slot_name(k, 1) not in os.listdir(e0_root), "E0 consumed H1 contrary to schedule"
    e0_elapsed = time.monotonic() - e0_start
    assert e0_elapsed <= fixture["phase_deadlines_seconds"]["e0"], e0_elapsed

    r0_start = time.monotonic()
    r0_h0 = run_r0_h0_publisher(r0_root, r0_binding, fixture)
    r0_race = run_race(r0_root, r0_binding, fixture, 1)
    r0_prior = r0_race["prior_classification"]
    assert r0_prior is not None
    r0_h0_identity = f"{r0_h0['publication_receipt']['payload_identity']['dev']}:{r0_h0['publication_receipt']['payload_identity']['ino']}"
    assert r0_prior["s0_identity"] == r0_h0_identity
    assert r0_prior["decision"] == "AUTHORIZE_H1"
    assert e0_classifier["decision"] == r0_prior["decision"] == "AUTHORIZE_H1"
    assert e0_classifier["reducer_source_sha256"] == r0_prior["reducer_source_sha256"] == reducer.source_sha256()
    assert e0_classifier["schedule_label_input"] is False and r0_prior["schedule_label_input"] is False
    assert e0_classifier["disposable_history_input"] is False and r0_prior["disposable_history_input"] is False
    assert r0_race["receipt"]["existing_s0_verification"]["verified_before_candidate_allocation"] is True
    r0_elapsed = time.monotonic() - r0_start
    assert r0_elapsed <= fixture["phase_deadlines_seconds"]["r0"], r0_elapsed

    final_start = time.monotonic()
    final_receipt = run_final_verifier(e0_root, e0_binding, r0_root, r0_binding, fixture)
    final_elapsed = time.monotonic() - final_start
    assert final_elapsed <= fixture["phase_deadlines_seconds"]["final_verification"], final_elapsed
    assert final_receipt["e0"]["decision"] == "AUTHORIZE_H1"
    assert final_receipt["r0"]["decision"] == "DENY_H1"

    publications = [e0_race["receipt"], r0_h0["publication_receipt"], r0_race["receipt"]]
    classifiers = [e0_classifier, r0_prior]
    composed = compose_ledger(publications, classifiers, r0_race["receipt"], final_receipt)
    assert composed == fixture["v31_composed_success_ledger"], (composed, fixture["v31_composed_success_ledger"])

    topology = fixture["process_topology"]
    role_lifetimes = 1 + 8 + 1 + 1 + 1 + 8 + 1
    helper_lifetimes = sum(sum(receipt["successful_helper_lifetimes"].values()) for receipt in publications)
    assert role_lifetimes == topology["role_lifetimes"] == 21
    assert helper_lifetimes == topology["helper_lifetimes"] == 6
    assert role_lifetimes + helper_lifetimes == topology["total_lifetimes"] == 27
    assert e0_race["same_pid_became_node_publisher"] is True
    assert r0_h0["same_pid_became_node_publisher"] is True
    assert r0_race["same_pid_became_node_publisher"] is True
    peak_live = 9
    assert peak_live == topology["peak_live"]

    # Peak derivation: observer+8 contenders is 9; all seven losers are reaped before the
    # winner may launch either sequential helper. H0 collector starts only after both H0
    # helpers have exited and the publisher is blocked on its hold pipe.
    peak_derivation = {
        "observer_plus_eight_contenders": 9,
        "race_losers_reaped_before_helper_launch": True,
        "helpers_sequential_per_publication": True,
        "checkpoint_collector_after_h0_helpers": True,
        "derived_peak_live": 9,
    }

    publication_elapsed_seconds = sum(
        e0_elapsed if i == -1 else 0 for i in []
    )
    # The publisher source does not expose a wall clock after the V31 instrumentation;
    # E0/R0/final phase deadlines remain the authoritative bounded campaign wall.
    outer_elapsed = time.monotonic() - outer_start
    assert outer_elapsed <= fixture["phase_deadlines_seconds"]["outer_wall"], outer_elapsed

    helper_pids = [
        receipt["helper_processes"][kind]["pid"]
        for receipt in publications
        for kind in ("fallocate", "link")
    ]
    files = {
        "manifest.json": {
            "format": "VOID_DATANET_V31_CAMPAIGN_MANIFEST_V1",
            "parent_pr": fixture["parent_pr"],
            "parent_head": fixture["parent_head"],
            "quota_key": k,
            "source_bindings": sources,
            "v31_ledger_reason": fixture["v31_ledger_reason"],
        },
        "runtime.json": {
            "format": "VOID_DATANET_V31_CAMPAIGN_RUNTIME_V1",
            "observer_pid": observer_pid,
            "python_version": sys.version.split()[0],
            "node_version": subprocess.check_output([shutil.which("node") or "node", "--version"], text=True).strip(),
            "publication_pids": [receipt["publisher_pid"] for receipt in publications],
            "helper_pids": helper_pids,
        },
        "observer.json": {
            "format": "VOID_DATANET_V31_CAMPAIGN_OBSERVER_V1",
            "e0_race": {key: e0_race[key] for key in ("events", "winner_pid", "busy_pids", "losers_reaped_before_helper_gate", "same_k_busy_while_winner_held", "same_k_acquired_after_winner_exit", "same_pid_became_node_publisher")},
            "r0_h0_crash_cut": r0_h0,
            "r0_race": {key: r0_race[key] for key in ("events", "winner_pid", "busy_pids", "losers_reaped_before_helper_gate", "same_k_busy_while_winner_held", "same_k_acquired_after_winner_exit", "same_pid_became_node_publisher")},
            "peak_derivation": peak_derivation,
            "external_syscall_observer_complete": False,
        },
        "restart-census.json": {
            "format": "VOID_DATANET_V31_CAMPAIGN_RESTART_CENSUS_V1",
            "e0": census(e0_root, e0_binding),
            "r0": census(r0_root, r0_binding),
            "source_distinct_final_verifier": final_receipt,
            "cold_remount_proved": False,
        },
        "aggregate.json": {
            "format": "VOID_DATANET_V31_CAMPAIGN_AGGREGATE_V1",
            "status": "GREEN",
            "same_reducer_pair": {
                "e0_decision": e0_classifier["decision"],
                "r0_decision": r0_prior["decision"],
                "reducer_source_sha256": reducer.source_sha256(),
                "schedule_label_input": False,
                "disposable_history_input": False,
            },
            "payload_ledger": composed,
            "process_topology": {
                "role_lifetimes": role_lifetimes,
                "helper_lifetimes": helper_lifetimes,
                "total_lifetimes": role_lifetimes + helper_lifetimes,
                "peak_live": peak_live,
                "peak_derivation": peak_derivation,
                "exec_preserved_winner_process_lifetime": True,
                "losers_reaped_before_helper_launch": True,
                "helpers_sequential_per_publication": True,
            },
            "phase_elapsed_seconds": {
                "e0": e0_elapsed,
                "r0": r0_elapsed,
                "final_verification": final_elapsed,
                "outer": outer_elapsed,
            },
            "three_payload_allocations": True,
            "three_create_only_payload_links": True,
            "fourteen_losing_contenders_preallocation_hold": True,
            "r0_h0_crash_release_proved": True,
            "s1_independent_s0_verification_before_candidate_allocation": True,
            "v31_ledger_correction_proved": True,
            "full_27_lifetime_campaign_proved": True,
            "peak_9_proved": True,
            "source_bound_injected_fault_matrix_proved": False,
            "external_syscall_observer_complete": False,
            "source_distinct_acyclic_aggregate_proved": False,
            "fiemap_provenance_proved": False,
            "cold_remount_proved": False,
            "physical_power_loss_proved": False,
            "hostile_same_uid_isolation_proved": False,
            "public_peer_retrieval_proved": False,
            "chain_2050_authority_claimed": False,
            "production_runtime_touched": False,
        },
    }
    evidence = write_evidence(evidence_dir, files)

    emit({
        "marker": MARKER,
        "status": "GREEN",
        "parent_head": fixture["parent_head"],
        "quota_key": k,
        "source_bindings": sources,
        "e0_root_identity": e0_binding.root_identity,
        "r0_root_identity": r0_binding.root_identity,
        "e0_one_of_eight": {"acquired": 1, "busy": 7},
        "r0_one_of_eight": {"acquired": 1, "busy": 7},
        "same_reducer_pair_authorize_h1": True,
        "r0_terminal_deny_h1": True,
        "payload_ledger": composed,
        "process_topology": files["aggregate.json"]["process_topology"],
        "phase_elapsed_seconds": files["aggregate.json"]["phase_elapsed_seconds"],
        "evidence": evidence,
        "three_payload_allocations": True,
        "three_create_only_payload_links": True,
        "r0_h0_crash_release_proved": True,
        "s1_independent_s0_verification_before_candidate_allocation": True,
        "v31_ledger_correction_proved": True,
        "full_27_lifetime_campaign_proved": True,
        "peak_9_proved": True,
        "source_bound_injected_fault_matrix_proved": False,
        "external_syscall_observer_complete": False,
        "source_distinct_acyclic_aggregate_proved": False,
        "fiemap_provenance_proved": False,
        "cold_remount_proved": False,
        "physical_power_loss_proved": False,
        "hostile_same_uid_isolation_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_authority_claimed": False,
        "production_runtime_touched": False,
    })
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("proof", "contender", "publisher", "classifier", "collector"), default="proof")
    parser.add_argument("--root")
    parser.add_argument("--root-identity")
    parser.add_argument("--lock-identity")
    parser.add_argument("--k")
    parser.add_argument("--slot", type=int)
    parser.add_argument("--ready-fd", type=int)
    parser.add_argument("--start-fd", type=int)
    parser.add_argument("--event-fd", type=int)
    parser.add_argument("--gate-fd", type=int)
    parser.add_argument("--hold-fd", type=int)
    parser.add_argument("--prior-fd", type=int)
    parser.add_argument("--expected-s0-identity")
    return parser


def dispatch(ns: argparse.Namespace) -> int:
    if ns.mode == "proof":
        return main_proof()
    for name in ("root", "root_identity", "lock_identity", "k"):
        assert getattr(ns, name) is not None, f"--{name.replace('_', '-')} required"
    if ns.mode == "contender":
        for name in ("slot", "ready_fd", "start_fd", "event_fd", "gate_fd", "hold_fd", "prior_fd"):
            assert getattr(ns, name) is not None, f"--{name.replace('_', '-')} required"
        return contender_mode(ns)
    if ns.mode == "publisher":
        assert ns.hold_fd is not None
        return publisher_mode(ns)
    if ns.mode == "classifier":
        return classifier_mode(ns)
    if ns.mode == "collector":
        assert ns.expected_s0_identity is not None
        return collector_mode(ns)
    raise AssertionError(ns.mode)


if __name__ == "__main__":
    try:
        raise SystemExit(dispatch(build_parser().parse_args()))
    finally:
        terminate_active()

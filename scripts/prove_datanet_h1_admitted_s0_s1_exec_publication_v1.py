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
import subprocess
import sys
import time

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import prove_datanet_posix_admission_capability_v1 as admission

MARKER = "VOID_DATANET_H1_ADMITTED_S0_S1_EXEC_PUBLICATION_V1_GREEN"
PUBLICATION_MARKER = "VOID_DATANET_H1_ADMITTED_S0_S1_PUBLICATION_EXT4_V1_GREEN"
REJECT_MARKER = "VOID_DATANET_H1_ADMITTED_S0_S1_PUBLICATION_EXT4_V1_REJECTED"
ACCEPTED_ADMISSION_BLOB = "c4d92dcaaed8879bcd98b96e199729098712d5b4"
ACCEPTED_S0_S1_BLOB = "dc002dca29a42f0e83a5af4fddd967a7c9329b86"
ADMITTED_PUBLISHER_BLOB = "0ec6b781a2a01e1f0094f27854577441f886af47"
FIXTURE_BLOB = "ffe0df7cd6ed583bf59105e1a20be7d3483fb9f1"
READY_TIMEOUT_SECONDS = 10
PUBLISH_TIMEOUT_SECONDS = 120
PROBE_INTERVAL_SECONDS = 0.01


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def load_fixture(repo_root: Path) -> dict:
    path = repo_root / "fixtures" / "datanet-h1-s0-s1-publication-ext4-v1.json"
    raw = path.read_bytes()
    assert git_blob_sha1(raw) == FIXTURE_BLOB, "S0/S1 fixture blob drift"
    fixture = json.loads(raw.decode("utf-8"))
    assert fixture["v"] == 1
    assert fixture["format"] == "VOID_DATANET_H1_S0_S1_PUBLICATION_EXT4_CONTROL_V1"
    assert fixture["successful_helper_lifetimes"] == {"fallocate": 1, "link": 1}
    return fixture


def source_bindings(repo_root: Path) -> dict:
    admission_path = Path(admission.__file__).resolve()
    accepted_path = repo_root / "scripts" / "prove_datanet_h1_s0_s1_publication_ext4_v1.mjs"
    admitted_path = repo_root / "scripts" / "prove_datanet_h1_admitted_s0_s1_publication_ext4_v1.mjs"
    fixture_path = repo_root / "fixtures" / "datanet-h1-s0-s1-publication-ext4-v1.json"
    assert git_blob_sha1(admission_path.read_bytes()) == ACCEPTED_ADMISSION_BLOB, "admission source blob drift"
    assert git_blob_sha1(accepted_path.read_bytes()) == ACCEPTED_S0_S1_BLOB, "accepted #1487 source blob drift"
    assert git_blob_sha1(admitted_path.read_bytes()) == ADMITTED_PUBLISHER_BLOB, "admitted publisher blob drift"
    assert git_blob_sha1(fixture_path.read_bytes()) == FIXTURE_BLOB, "fixture blob drift"
    return {
        "admission_git_blob": ACCEPTED_ADMISSION_BLOB,
        "accepted_s0_s1_git_blob": ACCEPTED_S0_S1_BLOB,
        "admitted_publisher_git_blob": ADMITTED_PUBLISHER_BLOB,
        "fixture_git_blob": FIXTURE_BLOB,
        "publisher_path": str(admitted_path),
    }


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb", buffering=0) as fh:
        while True:
            chunk = fh.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def snapshot(root: str) -> dict:
    entries = []
    for name in sorted(os.listdir(root)):
        path = Path(root) / name
        st = os.lstat(path)
        assert not path.is_symlink(), f"snapshot symlink: {name}"
        assert path.is_file(), f"snapshot nonregular: {name}"
        entries.append({
            "name": name,
            "dev": str(st.st_dev),
            "ino": str(st.st_ino),
            "mode": oct(st.st_mode & 0o7777),
            "uid": str(st.st_uid),
            "gid": str(st.st_gid),
            "nlink": str(st.st_nlink),
            "size": str(st.st_size),
            "blocks": str(st.st_blocks),
            "sha256": sha256_file(path),
        })
    fs = os.statvfs(root)
    return {
        "entries": entries,
        "free_blocks": str(fs.f_bfree),
        "available_blocks": str(fs.f_bavail),
        "fragment_size": str(fs.f_frsize),
    }


def publisher(ns: argparse.Namespace) -> int:
    binding = admission.Binding(
        root_identity=ns.root_identity,
        lock_identity=ns.lock_identity,
        k=ns.k,
    )
    root_fd, lock_fd = admission.open_bound(ns.root, binding)
    try:
        if not admission.acquire(lock_fd):
            raise AssertionError("publisher could not acquire root+K capability")
        admission.revalidate(root_fd, lock_fd, binding)

        os.set_inheritable(lock_fd, True)
        assert os.get_inheritable(lock_fd), "lock fd did not become inheritable"
        os.write(ns.ready_fd, b"L")
        os.close(ns.ready_fd)

        env = {
            "LANG": "C",
            "LC_ALL": "C",
            "VOID_DATANET_EXT4_ROOT": ns.root,
            "VOID_DATANET_TARGET_SLOT": str(ns.slot),
            "VOID_DATANET_ADMISSION_CAPABILITY_NAME": admission.capability_name(binding.k),
            "VOID_DATANET_ADMISSION_ROOT_IDENTITY": binding.root_identity,
            "VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY": binding.lock_identity,
            "VOID_DATANET_ADMISSION_LOCK_FD": str(lock_fd),
        }
        argv = [ns.node, ns.publication_script]

        # The lock owner becomes the exact Node publisher/classifier in-place.
        # No second publisher process is created; the same PID survives execve().
        os.execve(ns.node, argv, env)
        raise AssertionError("execve unexpectedly returned")
    finally:
        # Runs only on pre-exec failure.
        try:
            os.close(lock_fd)
        except OSError:
            pass
        try:
            os.close(root_fd)
        except OSError:
            pass


def run_slot(
    *,
    root: str,
    binding: admission.Binding,
    node: str,
    publication_script: str,
    slot: int,
    expected_rc: int,
    require_busy_sample: bool,
) -> tuple[dict, int, int]:
    ready_r, ready_w = os.pipe2(os.O_CLOEXEC)
    args = [
        sys.executable, "-I", "-B", os.path.abspath(__file__), "--publisher",
        "--root", root,
        "--root-identity", binding.root_identity,
        "--lock-identity", binding.lock_identity,
        "--k", binding.k,
        "--slot", str(slot),
        "--ready-fd", str(ready_w),
        "--node", node,
        "--publication-script", publication_script,
    ]
    proc = subprocess.Popen(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        pass_fds=(ready_w,),
    )
    child_pid = proc.pid
    os.close(ready_w)
    ready_w = -1
    try:
        readable, _, _ = select.select([ready_r], [], [], READY_TIMEOUT_SECONDS)
        assert readable, f"slot {slot}: publisher lock-ready timeout"
        ready = os.read(ready_r, 1)
        assert ready == b"L", f"slot {slot}: publisher lock-ready mismatch: {ready!r}"

        busy_samples = 0
        while proc.poll() is None:
            got = admission.fresh_probe(root, binding)
            if got:
                assert proc.poll() is not None, f"slot {slot}: root+K capability released while publisher still alive"
                break
            busy_samples += 1
            time.sleep(PROBE_INTERVAL_SECONDS)
        if require_busy_sample:
            assert busy_samples > 0, f"slot {slot}: no live-publisher BUSY sample observed"

        stdout, stderr = proc.communicate(timeout=PUBLISH_TIMEOUT_SECONDS)
        assert proc.returncode == expected_rc, (
            f"slot {slot}: publisher rc={proc.returncode} expected={expected_rc} stderr={stderr.strip()}"
        )
        assert stderr == "", f"slot {slot}: publisher stderr not empty: {stderr!r}"
        lines = [line for line in stdout.splitlines() if line.strip()]
        assert len(lines) == 1, f"slot {slot}: unexpected stdout lines: {lines!r}"
        receipt = json.loads(lines[0])
        assert receipt["publisher_pid"] == child_pid, f"slot {slot}: PID changed across exec handoff"
        assert receipt["quota_key"] == binding.k
        cap = receipt["admission_capability_binding"]
        assert cap["name"] == admission.capability_name(binding.k)
        assert cap["root_identity"] == binding.root_identity
        assert cap["lock_identity"] == binding.lock_identity
        assert cap["inherited_lock_fd_verified"] is True
        assert cap["visible_and_identity_bound"] is True
        assert receipt["root_k_posix_capability_composed"] is True
        assert admission.fresh_probe(root, binding), f"slot {slot}: capability did not release after Node exit"
        return receipt, busy_samples, child_pid
    finally:
        try:
            os.close(ready_r)
        except OSError:
            pass
        if ready_w >= 0:
            try:
                os.close(ready_w)
            except OSError:
                pass
        if proc.poll() is None:
            proc.kill()
            proc.wait(timeout=5)


def proof() -> int:
    assert sys.platform == "linux", "Linux-only proof"
    root = os.environ.get("VOID_DATANET_EXT4_ROOT")
    assert isinstance(root, str) and os.path.isabs(root), "absolute VOID_DATANET_EXT4_ROOT required"
    assert os.listdir(root) == [], "admitted S0/S1 root must begin empty"

    repo_root = SCRIPT_DIR.parent
    fixture = load_fixture(repo_root)
    sources = source_bindings(repo_root)
    k = fixture["quota_key"]
    binding = admission.make_fixture(root, k)
    capability_name = admission.capability_name(k)
    assert sorted(os.listdir(root)) == [capability_name], "capability fixture must be sole initial entry"

    node = shutil.which("node")
    assert isinstance(node, str) and os.path.isabs(node), "absolute Node executable required"
    node = os.path.realpath(node)
    assert os.path.isfile(node) and os.access(node, os.X_OK)

    s0, s0_busy, s0_pid = run_slot(
        root=root,
        binding=binding,
        node=node,
        publication_script=sources["publisher_path"],
        slot=0,
        expected_rc=0,
        require_busy_sample=True,
    )
    assert s0["marker"] == PUBLICATION_MARKER
    assert s0["status"] == "GREEN"
    assert s0["requested_slot"] == 0
    assert s0["successful_helper_lifetimes"] == {"fallocate": 1, "link": 1}
    assert s0["test_only_collision_link_helper_lifetimes"] == 0
    assert s0["inherited_admission_lock_fd_verified_in_node"] is True
    assert s0["namespace_before"] == [capability_name]
    assert sorted(s0["namespace_after"]) == sorted([capability_name, fixture["slot_names"]["0"]])

    s1, s1_busy, s1_pid = run_slot(
        root=root,
        binding=binding,
        node=node,
        publication_script=sources["publisher_path"],
        slot=1,
        expected_rc=0,
        require_busy_sample=True,
    )
    assert s1["marker"] == PUBLICATION_MARKER
    assert s1["status"] == "GREEN"
    assert s1["requested_slot"] == 1
    assert s1["successful_helper_lifetimes"] == {"fallocate": 1, "link": 1}
    assert s1["test_only_collision_link_helper_lifetimes"] == 0
    assert s1["s0_verified_before_s1_candidate_allocation"] is True
    assert s1["s0_s1_distinct_inodes"] is True
    assert s1["inherited_admission_lock_fd_verified_in_node"] is True
    assert sorted(s1["namespace_before"]) == sorted([capability_name, fixture["slot_names"]["0"]])
    assert sorted(s1["namespace_after"]) == sorted(
        [capability_name, fixture["slot_names"]["0"], fixture["slot_names"]["1"]]
    )
    assert s0["payload_identity"] != s1["payload_identity"], "S0/S1 payload identities must differ"

    before_s2 = snapshot(root)
    s2, s2_busy, s2_pid = run_slot(
        root=root,
        binding=binding,
        node=node,
        publication_script=sources["publisher_path"],
        slot=2,
        expected_rc=3,
        require_busy_sample=False,
    )
    after_s2 = snapshot(root)
    assert s2["marker"] == REJECT_MARKER
    assert s2["status"] == "REJECTED"
    assert s2["reason"] == "S2_FORBIDDEN_BEFORE_MUTATION"
    assert s2["mutation_started"] is False
    assert s2["anonymous_payload_inode_opened"] is False
    assert s2["helper_lifetimes"] == {"fallocate": 0, "link": 0}
    assert before_s2 == after_s2, "S2 rejection changed namespace/content/allocation state"

    final_entries = sorted(os.listdir(root))
    assert final_entries == sorted(
        [capability_name, fixture["slot_names"]["0"], fixture["slot_names"]["1"]]
    )

    emit({
        "marker": MARKER,
        "status": "GREEN",
        "node": node,
        "source_bindings": sources,
        "root_identity": binding.root_identity,
        "lock_identity": binding.lock_identity,
        "quota_key": k,
        "capability_name": capability_name,
        "exec_handoff": {
            "s0_preexec_and_node_pid": s0_pid,
            "s1_preexec_and_node_pid": s1_pid,
            "s2_preexec_and_node_pid": s2_pid,
            "same_pid_survived_exec_for_every_slot": True,
            "inherited_lock_fd_verified_inside_node_for_every_slot": True,
        },
        "lock_busy_samples": {"s0": s0_busy, "s1": s1_busy, "s2": s2_busy},
        "successful_helper_lifetimes": {"fallocate": 2, "link": 2},
        "test_only_collision_link_helper_lifetimes": 0,
        "s2_helper_lifetimes": {"fallocate": 0, "link": 0},
        "composition_process_lifetimes": {
            "s0_publisher_plus_helpers": 3,
            "s1_publisher_plus_helpers": 3,
            "s2_classifier": 1,
            "total": 7,
            "proof_coordinator_excluded": True,
        },
        "s0_s1_distinct_inodes": True,
        "s0_verified_before_s1_candidate_allocation": True,
        "s2_rejected_before_mutation": True,
        "s2_state_unchanged": True,
        "final_entries": final_entries,
        "root_k_posix_capability_composed": True,
        "full_27_lifetime_campaign_proved": False,
        "peak_9_proved": False,
        "production_runtime_touched": False,
    })
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    p.add_argument("--publisher", action="store_true")
    p.add_argument("--root")
    p.add_argument("--root-identity")
    p.add_argument("--lock-identity")
    p.add_argument("--k")
    p.add_argument("--slot", type=int)
    p.add_argument("--ready-fd", type=int)
    p.add_argument("--node")
    p.add_argument("--publication-script")
    return p


if __name__ == "__main__":
    ns = parser().parse_args()
    if ns.publisher:
        raise SystemExit(publisher(ns))
    raise SystemExit(proof())

#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import prove_datanet_posix_admission_capability_v1 as admission

MARKER = "VOID_DATANET_H1_ADMISSION_EXEC_HANDOFF_V1_GREEN"
PUBLICATION_MARKER = "VOID_DATANET_H1_PUBLICATION_EXT4_V1_GREEN"
ACCEPTED_ADMISSION_BLOB = "c4d92dcaaed8879bcd98b96e199729098712d5b4"
ACCEPTED_PUBLICATION_BLOB = "1ebc3b0e7611aa8d523333d0bbab5698ebee6456"
ACCEPTED_FIXTURE_BLOB = "538501d77ca9565b81128ec98d3c7edcaa0c28df"
READY_TIMEOUT_SECONDS = 10
PUBLISH_TIMEOUT_SECONDS = 90
PROBE_INTERVAL_SECONDS = 0.01


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def load_fixture(repo_root: Path) -> dict:
    path = repo_root / "fixtures" / "datanet-h1-publication-ext4-v1.json"
    raw = path.read_bytes()
    assert git_blob_sha1(raw) == ACCEPTED_FIXTURE_BLOB
    fixture = json.loads(raw.decode("utf-8"))
    assert fixture["v"] == 1
    assert fixture["format"] == "VOID_DATANET_H1_PUBLICATION_EXT4_CONTROL_V1"
    return fixture


def source_bindings(repo_root: Path) -> dict:
    admission_path = Path(admission.__file__).resolve()
    publication_path = repo_root / "scripts" / "prove_datanet_h1_publication_ext4_v1.mjs"
    admission_raw = admission_path.read_bytes()
    publication_raw = publication_path.read_bytes()
    assert git_blob_sha1(admission_raw) == ACCEPTED_ADMISSION_BLOB
    assert git_blob_sha1(publication_raw) == ACCEPTED_PUBLICATION_BLOB
    return {
        "admission_git_blob": ACCEPTED_ADMISSION_BLOB,
        "publication_git_blob": ACCEPTED_PUBLICATION_BLOB,
        "fixture_git_blob": ACCEPTED_FIXTURE_BLOB,
        "publication_path": str(publication_path),
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

        # Traditional POSIX process locks survive execve for the same process as long
        # as the locked descriptor is not closed. Clear FD_CLOEXEC only on that one fd.
        os.set_inheritable(lock_fd, True)
        assert os.get_inheritable(lock_fd)
        os.write(ns.ready_fd, b"L")
        os.close(ns.ready_fd)

        env = {
            "LANG": "C",
            "LC_ALL": "C",
            "VOID_DATANET_EXT4_ROOT": ns.root,
            "VOID_DATANET_ADMISSION_CAPABILITY_NAME": admission.capability_name(binding.k),
            "VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY": binding.lock_identity,
        }
        argv = [ns.node, ns.publication_script]

        # root_fd remains CLOEXEC. lock_fd is intentionally inherited. This exec does
        # not create another process lifetime: the lock owner becomes the Node publisher.
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


def proof() -> int:
    assert sys.platform == "linux", "Linux-only proof"
    root = os.environ.get("VOID_DATANET_EXT4_ROOT")
    assert isinstance(root, str) and os.path.isabs(root), "absolute VOID_DATANET_EXT4_ROOT required"
    assert os.listdir(root) == [], "exec-handoff root must begin empty"

    repo_root = SCRIPT_DIR.parent
    fixture = load_fixture(repo_root)
    sources = source_bindings(repo_root)
    k = fixture["quota_key"]
    binding = admission.make_fixture(root, k)

    node = shutil.which("node")
    assert isinstance(node, str) and os.path.isabs(node), "absolute Node executable required"
    node = os.path.realpath(node)
    assert os.path.isfile(node) and os.access(node, os.X_OK)

    ready_r, ready_w = os.pipe2(os.O_CLOEXEC)
    args = [
        sys.executable, "-I", "-B", os.path.abspath(__file__), "--publisher",
        "--root", root,
        "--root-identity", binding.root_identity,
        "--lock-identity", binding.lock_identity,
        "--k", binding.k,
        "--ready-fd", str(ready_w),
        "--node", node,
        "--publication-script", sources["publication_path"],
    ]
    proc = subprocess.Popen(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        pass_fds=(ready_w,),
    )
    os.close(ready_w)
    ready_w = -1
    try:
        deadline = time.monotonic() + READY_TIMEOUT_SECONDS
        ready = b""
        while len(ready) < 1 and time.monotonic() < deadline:
            chunk = os.read(ready_r, 1 - len(ready))
            if not chunk:
                break
            ready += chunk
        assert ready == b"L", f"publisher lock-ready mismatch: {ready!r}"

        busy_samples = 0
        while proc.poll() is None:
            got = admission.fresh_probe(root, binding)
            if got:
                # A process may exit between poll() and the probe. Acquisition is only
                # illegal if the publisher still exists after that acquisition attempt.
                assert proc.poll() is not None, "root+K capability released while publisher still alive"
                break
            busy_samples += 1
            time.sleep(PROBE_INTERVAL_SECONDS)
        assert busy_samples > 0, "no live-publisher BUSY sample observed"

        stdout, stderr = proc.communicate(timeout=PUBLISH_TIMEOUT_SECONDS)
        assert proc.returncode == 0, f"publisher rc={proc.returncode} stderr={stderr.strip()}"
        assert stderr == "", f"publisher stderr not empty: {stderr!r}"
        lines = [line for line in stdout.splitlines() if line.strip()]
        assert len(lines) == 1, lines
        receipt = json.loads(lines[0])
        assert receipt["marker"] == PUBLICATION_MARKER
        assert receipt["status"] == "GREEN"
        assert receipt["root_identity"] == binding.root_identity
        assert receipt["quota_key"] == binding.k
        assert receipt["admission_capability_binding"]["name"] == admission.capability_name(binding.k)
        assert receipt["admission_capability_binding"]["identity"] == binding.lock_identity
        assert receipt["admission_capability_binding"]["visible_and_identity_bound"] is True
        assert receipt["successful_publication_helper_lifetimes"] == {"fallocate": 1, "link": 1}

        assert admission.fresh_probe(root, binding), "capability did not release after Node publisher exit"
        final_entries = sorted(os.listdir(root))
        assert final_entries == sorted([admission.capability_name(k), fixture["slot_name"]])

        emit({
            "marker": MARKER,
            "status": "GREEN",
            "single_process_lock_owner_became_node_publisher": True,
            "lock_fd_survived_exec": True,
            "lock_busy_while_node_publisher_alive": True,
            "busy_probe_samples": busy_samples,
            "fresh_acquisition_after_node_exit": True,
            "root_identity": binding.root_identity,
            "lock_identity": binding.lock_identity,
            "quota_key": k,
            "node": node,
            "source_bindings": sources,
            "publication_slot": receipt["slot_name"],
            "publication_payload_identity": receipt["payload_identity"],
            "successful_publication_helper_lifetimes": receipt["successful_publication_helper_lifetimes"],
            "test_only_collision_helper_present": receipt["test_only_collision_link_helper_lifetimes"] == 1,
            "final_entries": final_entries,
            "full_27_lifetime_campaign_proved": False,
            "production_runtime_touched": False,
        })
        return 0
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


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    p.add_argument("--publisher", action="store_true")
    p.add_argument("--root")
    p.add_argument("--root-identity")
    p.add_argument("--lock-identity")
    p.add_argument("--k")
    p.add_argument("--ready-fd", type=int)
    p.add_argument("--node")
    p.add_argument("--publication-script")
    return p


if __name__ == "__main__":
    ns = parser().parse_args()
    if ns.publisher:
        raise SystemExit(publisher(ns))
    raise SystemExit(proof())

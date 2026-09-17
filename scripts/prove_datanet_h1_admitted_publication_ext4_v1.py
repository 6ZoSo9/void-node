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

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import prove_datanet_posix_admission_capability_v1 as admission

MARKER = "VOID_DATANET_H1_ADMITTED_PUBLICATION_EXT4_V1_GREEN"
PUBLICATION_MARKER = "VOID_DATANET_H1_PUBLICATION_EXT4_V1_GREEN"
ACCEPTED_POSIX_SOURCE_GIT_BLOB_SHA1 = "c4d92dcaaed8879bcd98b96e199729098712d5b4"
ACCEPTED_POSIX_HEAD = "a5b2261cc62ec49ac60c2b5eee834e0aa3a5a821"
ACCEPTED_PUBLICATION_HEAD = "cf2ee7523771e93a412ba4650f7fb0f694c99524"
PROBE_TIMEOUT_SECONDS = 8
PUBLICATION_TIMEOUT_SECONDS = 90


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def git_blob_sha1(data: bytes) -> str:
    prefix = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(prefix + data).hexdigest()


def binding_from_args(ns: argparse.Namespace) -> admission.Binding:
    return admission.Binding(
        root_identity=ns.root_identity,
        lock_identity=ns.lock_identity,
        k=ns.k,
    )


def probe_once(ns: argparse.Namespace) -> int:
    binding = binding_from_args(ns)
    root_fd, lock_fd = admission.open_bound(ns.root, binding)
    try:
        got = admission.acquire(lock_fd)
        if got:
            admission.revalidate(root_fd, lock_fd, binding)
            admission.unlock(lock_fd)
            emit({"marker": MARKER, "probe": "acquired"})
        else:
            emit({"marker": MARKER, "probe": "busy"})
        return 0
    finally:
        os.close(lock_fd)
        os.close(root_fd)


def child_probe(root: str, binding: admission.Binding) -> str:
    proc = subprocess.run(
        [
            sys.executable,
            "-I",
            "-B",
            os.path.abspath(__file__),
            "--probe",
            "--root", root,
            "--root-identity", binding.root_identity,
            "--lock-identity", binding.lock_identity,
            "--k", binding.k,
        ],
        text=True,
        capture_output=True,
        timeout=PROBE_TIMEOUT_SECONDS,
        check=False,
    )
    if proc.returncode != 0:
        raise AssertionError(f"probe rc={proc.returncode} stderr={proc.stderr.strip()}")
    lines = [line for line in proc.stdout.splitlines() if line.strip()]
    assert len(lines) == 1, lines
    receipt = json.loads(lines[0])
    assert receipt["marker"] == MARKER
    assert receipt["probe"] in {"acquired", "busy"}
    return str(receipt["probe"])


def load_publication_fixture(repo_root: Path) -> dict:
    path = repo_root / "fixtures" / "datanet-h1-publication-ext4-v1.json"
    fixture = json.loads(path.read_text(encoding="utf-8"))
    assert fixture["v"] == 1
    assert fixture["format"] == "VOID_DATANET_H1_PUBLICATION_EXT4_CONTROL_V1"
    k = fixture["quota_key"]
    assert isinstance(k, str) and len(k) == 64 and all(c in "0123456789abcdef" for c in k)
    return fixture


def main_proof() -> int:
    assert sys.platform == "linux", "Linux-only proof"
    root = os.environ.get("VOID_DATANET_EXT4_ROOT")
    assert isinstance(root, str) and os.path.isabs(root), "absolute VOID_DATANET_EXT4_ROOT required"

    repo_root = Path(__file__).resolve().parent.parent
    fixture = load_publication_fixture(repo_root)
    k = fixture["quota_key"]
    slot_name = fixture["slot_name"]

    admission_source = Path(admission.__file__).resolve()
    admission_bytes = admission_source.read_bytes()
    observed_blob = git_blob_sha1(admission_bytes)
    assert observed_blob == ACCEPTED_POSIX_SOURCE_GIT_BLOB_SHA1, (observed_blob, ACCEPTED_POSIX_SOURCE_GIT_BLOB_SHA1)
    admission_sha256 = hashlib.sha256(admission_bytes).hexdigest()

    assert os.listdir(root) == [], "composition root must begin empty"
    binding = admission.make_fixture(root, k)
    capability = admission.capability_name(k)
    assert sorted(os.listdir(root)) == [capability]

    root_fd, lock_fd = admission.open_bound(root, binding)
    locked = False
    publication_receipt = None
    publication_stdout = b""
    try:
        assert admission.acquire(lock_fd), "initial root+K admission unexpectedly busy"
        locked = True
        admission.revalidate(root_fd, lock_fd, binding)

        # The parent owns exactly one capability FD while held. Contention probes run
        # in separate isolated processes so opening/closing an alias cannot release its POSIX lock.
        assert child_probe(root, binding) == "busy", "same-K contender admitted before publication"

        node = shutil.which("node")
        assert node is not None, "node unavailable"
        publication_script = repo_root / "scripts" / "prove_datanet_h1_publication_ext4_v1.mjs"
        env = os.environ.copy()
        env["VOID_DATANET_ADMISSION_CAPABILITY_NAME"] = capability
        env["VOID_DATANET_ADMISSION_CAPABILITY_IDENTITY"] = binding.lock_identity
        proc = subprocess.run(
            [node, str(publication_script)],
            cwd=repo_root,
            env=env,
            text=False,
            capture_output=True,
            timeout=PUBLICATION_TIMEOUT_SECONDS,
            check=False,
        )
        if proc.returncode != 0:
            raise AssertionError(
                f"publication rc={proc.returncode} stderr={proc.stderr.decode('utf-8', 'replace').strip()}"
            )
        assert proc.stderr == b"", proc.stderr.decode("utf-8", "replace")
        publication_stdout = proc.stdout
        lines = [line for line in proc.stdout.decode("utf-8").splitlines() if line.strip()]
        assert len(lines) == 1, lines
        publication_receipt = json.loads(lines[0])
        assert publication_receipt["marker"] == PUBLICATION_MARKER
        assert publication_receipt["status"] == "GREEN"
        assert publication_receipt["root_identity"] == binding.root_identity
        assert publication_receipt["quota_key"] == k
        assert publication_receipt["slot_name"] == slot_name
        assert publication_receipt["admission_capability_binding"] == {
            "name": capability,
            "identity": binding.lock_identity,
            "visible_and_identity_bound": True,
        }
        assert publication_receipt["admission_capability_visible_and_identity_bound"] is True
        assert publication_receipt["root_k_posix_capability_composed"] is False
        assert publication_receipt["production_runtime_touched"] is False
        assert publication_receipt["chain_2050_authority_claimed"] is False

        admission.revalidate(root_fd, lock_fd, binding)
        assert child_probe(root, binding) == "busy", "same-K contender admitted before supervisor release"
        assert sorted(os.listdir(root)) == sorted([capability, slot_name])

        admission.unlock(lock_fd)
        locked = False
    finally:
        if locked:
            admission.unlock(lock_fd)
        os.close(lock_fd)
        os.close(root_fd)

    assert child_probe(root, binding) == "acquired", "root+K capability did not release after publication"
    assert publication_receipt is not None

    emit({
        "marker": MARKER,
        "status": "GREEN",
        "accepted_posix_head": ACCEPTED_POSIX_HEAD,
        "accepted_publication_head": ACCEPTED_PUBLICATION_HEAD,
        "admission_source_git_blob_sha1": observed_blob,
        "admission_source_sha256": admission_sha256,
        "root_identity": binding.root_identity,
        "lock_identity": binding.lock_identity,
        "quota_key": k,
        "capability_name": capability,
        "slot_name": slot_name,
        "same_k_busy_before_publication": True,
        "same_k_busy_after_publication_before_release": True,
        "same_k_acquired_after_release": True,
        "publication_receipt_sha256": hashlib.sha256(publication_stdout).hexdigest(),
        "publication_status": publication_receipt["status"],
        "publication_inode_local_full_reservation_proved": publication_receipt["reservation"]["inode_local_full_reservation_proved"],
        "publication_create_only_inode_preserved": publication_receipt["create_only_publication_preserved_inode"],
        "publication_collision_rejected": publication_receipt["occupied_destination_replacement_rejected"],
        "publication_prepublication_rehash_calls": publication_receipt["prepublication_anonymous_rehash"]["calls"],
        "publication_postpublication_readback_calls": publication_receipt["postpublication_readback"]["calls"],
        "root_k_posix_capability_composed": True,
        "source_bound_injected_fault_matrix_proved": False,
        "source_distinct_aggregate_proved": False,
        "fiemap_provenance_proved": False,
        "cold_remount_proved": False,
        "physical_power_loss_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_authority_claimed": False,
        "production_runtime_touched": False,
    })
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--root")
    parser.add_argument("--root-identity")
    parser.add_argument("--lock-identity")
    parser.add_argument("--k")
    return parser


if __name__ == "__main__":
    ns = build_parser().parse_args()
    if ns.probe:
        raise SystemExit(probe_once(ns))
    raise SystemExit(main_proof())

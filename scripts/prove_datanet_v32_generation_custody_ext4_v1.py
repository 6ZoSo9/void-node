#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import json
import os
from pathlib import Path
import stat
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_ext4_inode_generation_v1 as inode_generation
import datanet_v32_generation_reducer_v1 as generation_reducer
import prove_datanet_v31_campaign_topology_ext4_v1 as v31

ENTRYPOINT = Path(__file__).resolve()
S1_SCRIPT = SCRIPT_DIR / "prove_datanet_h1_generation_bound_s1_publication_ext4_v1.mjs"
FINAL_SCRIPT = SCRIPT_DIR / "prove_datanet_v32_generation_final_verifier_v1.py"
MARKER = "VOID_DATANET_V32_EXT4_GENERATION_CUSTODY_V1_GREEN"
CLASSIFIER_MARKER = "VOID_DATANET_V32_STATE_CLASSIFIER_V1_GREEN"
COLLECTOR_MARKER = "VOID_DATANET_V32_CHECKPOINT_COLLECTOR_V1_GREEN"
FINAL_MARKER = "VOID_DATANET_V32_GENERATION_FINAL_VERIFIER_V1_GREEN"
EXPECTED_S0_IDENTITY_ENV = "VOID_DATANET_EXPECTED_S0_IDENTITY_AT_RECOVERY"
EXPECTED_S0_GENERATION_ENV = "VOID_DATANET_EXPECTED_S0_GENERATION_AT_RECOVERY"

# Patch the inherited V31 campaign at explicit seams only. The process topology,
# payload ledger, evidence-file count, admission primitive, slot-0 publisher and
# bounded V24 I/O engine remain inherited from the exact #1491 generation.
v31.reducer = generation_reducer
v31.ENTRYPOINT = ENTRYPOINT
v31.FINAL_SCRIPT = FINAL_SCRIPT
v31.MARKER = MARKER
v31.CLASSIFIER_MARKER = CLASSIFIER_MARKER
v31.COLLECTOR_MARKER = COLLECTOR_MARKER
v31.FINAL_MARKER = FINAL_MARKER

_base_source_bindings = v31.source_bindings
_base_exec_publication = v31.exec_publication
_base_publication_env = v31.publication_env
_base_validate_publication_receipt = v31.validate_publication_receipt
_base_run_classifier = v31.run_classifier
_base_run_r0_h0_publisher = v31.run_r0_h0_publisher
_base_run_race = v31.run_race
_base_run_final_verifier = v31.run_final_verifier
_base_write_evidence = v31.write_evidence
_base_emit = v31.emit

_r0_cut_by_root: dict[str, dict] = {}
_classifier_by_root: dict[str, dict] = {}
_generation_observations: list[dict] = []
_retained_exec_proved = False


def source_bindings(fixture: dict) -> dict:
    bindings = dict(_base_source_bindings(fixture))
    bindings.update({
        "ext4_inode_generation_source_sha256": inode_generation.source_sha256(),
        "python_executable_sha256": inode_generation.executable_sha256(),
        "generation_bound_reducer_sha256": generation_reducer.source_sha256(),
        "generation_bound_s1_publisher_sha256": v31.sha256_path(S1_SCRIPT),
        "generation_final_verifier_sha256": v31.sha256_path(FINAL_SCRIPT),
        "generation_campaign_supervisor_sha256": v31.sha256_path(ENTRYPOINT),
    })
    return bindings


v31.source_bindings = source_bindings


def exec_publication(root: str, binding, lock_fd: int, hold_fd: int, slot: int, *, retained_s0_fd: int | None = None, prior: dict | None = None) -> None:
    if slot == 0:
        return _base_exec_publication(root, binding, lock_fd, hold_fd, slot)
    assert slot == 1
    assert retained_s0_fd is not None and retained_s0_fd >= 3
    assert prior is not None
    assert prior["decision"] == "AUTHORIZE_H1"
    assert prior["s0_generation_receipt"]["ioctl_calls"] == 1
    assert prior["s0_generation_receipt"]["setversion_issued"] is False

    node, env = _base_publication_env(root, binding, lock_fd, hold_fd, slot)
    os.set_inheritable(retained_s0_fd, True)
    env.update({
        "VOID_DATANET_VERIFIED_S0_FD": str(retained_s0_fd),
        "VOID_DATANET_VERIFIED_S0_IDENTITY": prior["s0_identity"],
        "VOID_DATANET_VERIFIED_S0_GENERATION": str(prior["s0_generation"]),
        "VOID_DATANET_VERIFIED_S0_GENERATION_MODULE_SHA256": prior["inode_generation_source_sha256"],
    })
    os.execve(node, [node, str(S1_SCRIPT)], env)
    raise AssertionError("execve unexpectedly returned")


v31.exec_publication = exec_publication


def contender_mode(ns) -> int:
    fixture = v31.load_fixture()
    source_bindings(fixture)
    binding = v31.parse_binding(ns)
    root_fd = lock_fd = retained_s0_fd = -1
    locked = False
    try:
        root_fd, lock_fd = v31.admission.open_bound(ns.root, binding)
        os.write(ns.ready_fd, b"R")
        assert os.read(ns.start_fd, 1) == b"G"
        got = v31.admission.acquire(lock_fd)
        if not got:
            os.write(ns.event_fd, (json.dumps({"pid": os.getpid(), "status": "busy"}, separators=(",", ":")) + "\n").encode())
            return 0
        locked = True
        v31.admission.revalidate(root_fd, lock_fd, binding)
        os.write(ns.event_fd, (json.dumps({"pid": os.getpid(), "status": "acquired"}, separators=(",", ":")) + "\n").encode())
        assert os.read(ns.gate_fd, 1) == b"G"

        prior = None
        if ns.slot == 1:
            prior, retained_s0_fd = generation_reducer.reduce_s0_only_with_retained_fd(root_fd, binding, fixture)
            assert prior["decision"] == "AUTHORIZE_H1"
            expected_identity = os.environ.get(EXPECTED_S0_IDENTITY_ENV)
            expected_generation = os.environ.get(EXPECTED_S0_GENERATION_ENV)
            assert expected_identity is not None and expected_generation is not None
            assert prior["s0_identity"] == expected_identity
            assert str(prior["s0_generation"]) == expected_generation
            v31.admission.revalidate(root_fd, lock_fd, binding)
            os.write(ns.prior_fd, (json.dumps(prior, sort_keys=True, separators=(",", ":")) + "\n").encode())

        for fd in (ns.ready_fd, ns.start_fd, ns.event_fd, ns.gate_fd, ns.prior_fd):
            v31.close_quiet(fd)
        v31.close_quiet(root_fd)
        root_fd = -1
        exec_publication(ns.root, binding, lock_fd, ns.hold_fd, ns.slot, retained_s0_fd=(retained_s0_fd if ns.slot == 1 else None), prior=prior)
        return 99
    finally:
        if locked and lock_fd >= 0:
            try:
                v31.admission.unlock(lock_fd)
            except OSError:
                pass
        v31.close_quiet(retained_s0_fd)
        v31.close_quiet(lock_fd)
        v31.close_quiet(root_fd)


v31.contender_mode = contender_mode


def collector_mode(ns) -> int:
    fixture = v31.load_fixture()
    source_bindings(fixture)
    binding = v31.parse_binding(ns)
    root_fd, lock_fd = v31.admission.open_bound(ns.root, binding)
    s0_fd = -1
    try:
        assert v31.admission.acquire(lock_fd) is False
        expected = sorted([v31.cap_name(binding.k), v31.slot_name(binding.k, 0)])
        assert sorted(os.listdir(root_fd)) == expected
        flags = os.O_RDONLY | os.O_CLOEXEC
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        s0_fd = os.open(v31.slot_name(binding.k, 0), flags, dir_fd=root_fd)
        visible = os.stat(v31.slot_name(binding.k, 0), dir_fd=root_fd, follow_symlinks=False)
        opened = os.fstat(s0_fd)
        assert stat.S_ISREG(opened.st_mode)
        assert generation_reducer.identity(opened) == generation_reducer.identity(visible) == ns.expected_s0_identity
        assert opened.st_uid == os.getuid()
        assert opened.st_nlink == 1
        assert stat.S_IMODE(opened.st_mode) == 0o600
        assert opened.st_size == fixture["payload_bytes"]
        assert opened.st_blocks * 512 >= fixture["payload_bytes"]
        generation_receipt = inode_generation.observe_ext4_inode_generation_v1(s0_fd)
        assert generation_receipt["ioctl_calls"] == 1
        assert generation_receipt["setversion_issued"] is False
        visible_after = os.stat(v31.slot_name(binding.k, 0), dir_fd=root_fd, follow_symlinks=False)
        assert generation_reducer.identity(visible_after) == ns.expected_s0_identity
        emit_obj = {
            "marker": COLLECTOR_MARKER,
            "status": "GREEN",
            "pid": os.getpid(),
            "root_identity": binding.root_identity,
            "s0_identity": ns.expected_s0_identity,
            "s0_generation": generation_receipt["generation"],
            "s0_generation_identity": f"{ns.expected_s0_identity}:{generation_receipt['generation']}",
            "s0_generation_receipt": generation_receipt,
            "capability_busy": True,
            "s1_absent": v31.slot_name(binding.k, 1) not in os.listdir(root_fd),
            "payload_reread_performed": False,
        }
        _base_emit(emit_obj)
        return 0
    finally:
        v31.close_quiet(s0_fd)
        os.close(lock_fd)
        os.close(root_fd)


v31.collector_mode = collector_mode


def validate_publication_receipt(receipt: dict, *, expected_pid: int, expected_slot: int, binding, fixture: dict) -> None:
    _base_validate_publication_receipt(receipt, expected_pid=expected_pid, expected_slot=expected_slot, binding=binding, fixture=fixture)
    if expected_slot == 1:
        s0 = receipt["existing_s0_verification"]
        assert receipt["publisher_variant"] == "generation-bound-inherited-s0-fd-v1"
        assert receipt["inherited_verified_s0_fd_verified_in_node"] is True
        assert receipt["verified_s0_fd_retained_through_s1_publication"] is True
        assert s0["inherited_s0_fd_verified"] is True
        assert s0["generation_observed_pre_exec"] is True
        assert s0["generation_ioctl_calls_in_node"] == 0
        assert s0["canonical_name_matches_inherited_fd_before_allocation"] is True
        assert 0 <= int(s0["generation"]) <= 0xFFFFFFFF
        assert s0["generation_module_sha256"] == inode_generation.source_sha256()


v31.validate_publication_receipt = validate_publication_receipt


def run_classifier(root: str, binding, fixture: dict) -> dict:
    receipt = _base_run_classifier(root, binding, fixture)
    assert receipt["s0_generation_receipt"]["ioctl_calls"] == 1
    assert receipt["s0_generation_receipt"]["setversion_issued"] is False
    assert receipt["inode_generation_source_sha256"] == inode_generation.source_sha256()
    _classifier_by_root[root] = receipt
    _generation_observations.append({"role": "e0-classifier", "generation_identity": receipt["s0_generation_identity"]})
    return receipt


v31.run_classifier = run_classifier


def run_r0_h0_publisher(root: str, binding, fixture: dict) -> dict:
    result = _base_run_r0_h0_publisher(root, binding, fixture)
    collector = result["collector_receipt"]
    assert collector["s0_generation_receipt"]["ioctl_calls"] == 1
    assert collector["s0_generation_receipt"]["setversion_issued"] is False
    _r0_cut_by_root[root] = {
        "identity": collector["s0_identity"],
        "generation": collector["s0_generation"],
        "generation_identity": collector["s0_generation_identity"],
    }
    _generation_observations.append({"role": "r0-cut-collector", "generation_identity": collector["s0_generation_identity"]})
    return result


v31.run_r0_h0_publisher = run_r0_h0_publisher


def run_race(root: str, binding, fixture: dict, slot: int) -> dict:
    old_identity = os.environ.get(EXPECTED_S0_IDENTITY_ENV)
    old_generation = os.environ.get(EXPECTED_S0_GENERATION_ENV)
    if slot == 1:
        cut = _r0_cut_by_root[root]
        os.environ[EXPECTED_S0_IDENTITY_ENV] = cut["identity"]
        os.environ[EXPECTED_S0_GENERATION_ENV] = str(cut["generation"])
    try:
        result = _base_run_race(root, binding, fixture, slot)
    finally:
        if old_identity is None:
            os.environ.pop(EXPECTED_S0_IDENTITY_ENV, None)
        else:
            os.environ[EXPECTED_S0_IDENTITY_ENV] = old_identity
        if old_generation is None:
            os.environ.pop(EXPECTED_S0_GENERATION_ENV, None)
        else:
            os.environ[EXPECTED_S0_GENERATION_ENV] = old_generation

    if slot == 1:
        global _retained_exec_proved
        cut = _r0_cut_by_root[root]
        prior = result["prior_classification"]
        published = result["receipt"]["existing_s0_verification"]
        assert prior is not None
        assert prior["s0_identity"] == cut["identity"]
        assert prior["s0_generation"] == cut["generation"]
        assert prior["s0_generation_identity"] == cut["generation_identity"]
        assert published["identity"] == {"dev": cut["identity"].split(":", 1)[0], "ino": cut["identity"].split(":", 1)[1]}
        assert published["generation"] == cut["generation"]
        assert published["generation_identity"] == cut["generation_identity"]
        assert result["receipt"]["verified_s0_fd_retained_through_s1_publication"] is True
        _generation_observations.append({"role": "r0-recovery-classifier", "generation_identity": prior["s0_generation_identity"]})
        result["r0_cut_generation_matched_before_s1_allocation"] = True
        result["retained_s0_fd_across_exec"] = True
        _retained_exec_proved = True
    return result


v31.run_race = run_race


def run_final_verifier(e0_root: str, e0_binding, r0_root: str, r0_binding, fixture: dict) -> dict:
    receipt = _base_run_final_verifier(e0_root, e0_binding, r0_root, r0_binding, fixture)
    assert receipt["inode_generation_source_sha256"] == inode_generation.source_sha256()
    assert receipt["python_executable_sha256"] == inode_generation.executable_sha256()
    assert receipt["generation_ioctl_calls"] == 3
    e0_leaf = receipt["e0"]["leaves"][0]
    r0_s0 = receipt["r0"]["leaves"][0]
    assert e0_leaf["generation_identity"] == _classifier_by_root[e0_root]["s0_generation_identity"]
    assert r0_s0["generation_identity"] == _r0_cut_by_root[r0_root]["generation_identity"]
    for leaf in [*receipt["e0"]["leaves"], *receipt["r0"]["leaves"]]:
        _generation_observations.append({"role": "final-verifier", "generation_identity": leaf["generation_identity"]})
    return receipt


v31.run_final_verifier = run_final_verifier


def write_evidence(evidence_dir: str, files: dict[str, dict]) -> dict:
    assert len(_generation_observations) == 6, _generation_observations
    assert _retained_exec_proved is True
    files["manifest.json"]["generation_custody"] = {
        "primitive": "EXT4_IOC_GETVERSION",
        "source_sha256": inode_generation.source_sha256(),
        "python_executable_sha256": inode_generation.executable_sha256(),
        "same_process_observation": True,
        "extra_process_lifetimes": 0,
    }
    files["aggregate.json"]["generation_custody"] = {
        "generation_observations": len(_generation_observations),
        "r0_cut_generation_matched_before_s1_allocation": True,
        "retained_s0_fd_across_python_node_exec": True,
        "node_verified_inherited_s0_fd_before_candidate_allocation": True,
        "extra_process_lifetimes": 0,
        "same_uid_generation_rewrite_proved": False,
        "full_cold_restart_generation_authority_proved": False,
    }
    return _base_write_evidence(evidence_dir, files)


v31.write_evidence = write_evidence


def emit(obj: dict) -> None:
    if obj.get("marker") == MARKER:
        assert len(_generation_observations) == 6
        assert _retained_exec_proved is True
        obj = dict(obj)
        obj.update({
            "ext4_inode_generation_observed_in_process": True,
            "ext4_getversion_observations": 6,
            "generation_extra_process_lifetimes": 0,
            "r0_cut_generation_matched_before_s1_allocation": True,
            "retained_s0_fd_across_python_node_exec_proved": True,
            "node_verified_inherited_s0_fd_before_candidate_allocation": True,
            "same_uid_generation_rewrite_proved": False,
            "full_cold_restart_generation_authority_proved": False,
        })
    _base_emit(obj)


v31.emit = emit


if __name__ == "__main__":
    try:
        raise SystemExit(v31.dispatch(v31.build_parser().parse_args()))
    finally:
        v31.terminate_active()

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
import signal
import stat
import subprocess
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_v33_durable_recovery_record_v1 as record
import prove_datanet_posix_admission_capability_v1 as admission

SOURCE = Path(__file__).resolve()
FIXTURE = REPO_ROOT / "fixtures" / "datanet-v33-durable-recovery-record-ext4-v1.json"
FINAL = SCRIPT_DIR / "prove_datanet_v33_durable_recovery_record_final_v1.py"
MARKER = "VOID_DATANET_V33_DURABLE_RECOVERY_RECORD_EXT4_V1_GREEN"
CHILD_MARKER = "VOID_DATANET_V33_RECOVERY_CHILD_V1_GREEN"


def emit(obj: dict) -> None:
    print(json.dumps(obj, sort_keys=True, separators=(",", ":")), flush=True)


def sha256_path(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_fixture() -> dict:
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert fixture["v"] == 1
    assert fixture["format"] == "VOID_DATANET_V33_DURABLE_RECOVERY_RECORD_EXT4_CONTROL_V1"
    assert fixture["parent_pr"] == 1492
    assert fixture["parent_head"] == "269dee7eb2eff023da2bd8ea47d1d725dad58246"
    assert fixture["payload_bytes"] == 67108864
    assert fixture["io_block_bytes"] == 65536
    assert fixture["payload_sha256"] == "3b6a07d0d404fab4e23b6d34bc6696a6a312dd92821332385e5af7c01c421351"
    assert fixture["expected_ext4_getversion_observations"] == 23
    assert fixture["focused_role_lifetimes"] == {
        "orchestrator": 1,
        "recovery_success_claimant": 1,
        "s1_close_crash_claimant": 1,
        "claim_death_claimant": 1,
        "source_distinct_final_verifier": 1,
        "total": 5,
    }
    return fixture


def fsync_dir(fd: int) -> None:
    os.fsync(fd)


def create_payload_leaf(root_fd: int, binding: admission.Binding, fixture: dict, slot: int) -> dict:
    name = record.slot_name(binding.k, slot)
    flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(name, flags, 0o600, dir_fd=root_fd)
    try:
        os.fchmod(fd, 0o600)
        before = os.fstat(fd)
        assert stat.S_ISREG(before.st_mode)
        assert before.st_uid == os.getuid()
        assert before.st_nlink == 1
        assert before.st_size == 0
        os.posix_fallocate(fd, 0, fixture["payload_bytes"])
        after_allocate = os.fstat(fd)
        assert after_allocate.st_size == fixture["payload_bytes"]
        assert after_allocate.st_blocks * 512 >= fixture["payload_bytes"]
        os.fsync(fd)
    finally:
        os.close(fd)
    fsync_dir(root_fd)
    admitted = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
    assert stat.S_ISREG(admitted.st_mode)
    assert admitted.st_uid == os.getuid()
    assert admitted.st_nlink == 1
    assert stat.S_IMODE(admitted.st_mode) == 0o600
    assert admitted.st_size == fixture["payload_bytes"]
    assert admitted.st_blocks * 512 >= fixture["payload_bytes"]
    return {"name": name, "identity": f"{admitted.st_dev}:{admitted.st_ino}", "length": admitted.st_size}


def mkdir_case(base_fd: int, base: str, name: str, fixture: dict) -> tuple[str, admission.Binding]:
    os.mkdir(name, 0o700, dir_fd=base_fd)
    fsync_dir(base_fd)
    root = os.path.join(base, name)
    binding = admission.make_fixture(root, fixture["quota_key"])
    return root, binding


def open_locked(root: str, binding: admission.Binding) -> tuple[int, int]:
    root_fd, lock_fd = admission.open_bound(root, binding)
    assert admission.acquire(lock_fd) is True
    admission.revalidate(root_fd, lock_fd, binding)
    return root_fd, lock_fd


def close_locked(root_fd: int, lock_fd: int) -> None:
    try:
        admission.unlock(lock_fd)
    finally:
        os.close(lock_fd)
        os.close(root_fd)


def expect_decision(root_fd: int, lock_fd: int, binding: admission.Binding, fixture: dict, expected: str, *, requested_slot: int = 1) -> dict:
    result = record.reduce_runtime(root_fd, lock_fd, binding, fixture, requested_slot=requested_slot)
    assert result["decision"] == expected, result
    return result


def child_args(mode: str, root: str, binding: admission.Binding) -> list[str]:
    return [
        sys.executable, "-I", "-B", str(SOURCE),
        "--child", mode,
        "--root", root,
        "--root-identity", binding.root_identity,
        "--lock-identity", binding.lock_identity,
        "--k", binding.k,
    ]


def run_child(mode: str, root: str, binding: admission.Binding) -> dict:
    cp = subprocess.run(child_args(mode, root, binding), check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120)
    assert cp.returncode == 0, {"mode": mode, "returncode": cp.returncode, "stdout": cp.stdout, "stderr": cp.stderr}
    assert cp.stderr == "", cp.stderr
    rows = [json.loads(line) for line in cp.stdout.splitlines() if line.strip()]
    matches = [row for row in rows if row.get("marker") == CHILD_MARKER]
    assert len(matches) == 1, rows
    result = matches[0]
    assert result["status"] == "GREEN"
    assert result["mode"] == mode
    return result


def run_crash_child(mode: str, root: str, binding: admission.Binding) -> dict:
    proc = subprocess.Popen(child_args(mode, root, binding), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    assert proc.stdout is not None and proc.stderr is not None
    ready, _, _ = select.select([proc.stdout.fileno()], [], [], 90)
    assert ready, f"{mode} marker timeout"
    line = proc.stdout.readline()
    assert line, f"{mode} marker EOF"
    result = json.loads(line)
    assert result["marker"] == CHILD_MARKER
    assert result["status"] == "GREEN"
    assert result["mode"] == mode
    assert proc.poll() is None, f"{mode} exited before crash cut"
    proc.kill()
    proc.wait(timeout=10)
    assert proc.returncode == -signal.SIGKILL, proc.returncode
    assert proc.stdout.read() == ""
    assert proc.stderr.read() == ""
    result["claimant_killed_and_reaped"] = True
    return result


def child_mode(ns: argparse.Namespace) -> int:
    fixture = load_fixture()
    binding = admission.Binding(root_identity=ns.root_identity, lock_identity=ns.lock_identity, k=ns.k)
    root_fd, lock_fd = open_locked(ns.root, binding)
    try:
        classification = expect_decision(root_fd, lock_fd, binding, fixture, "AUTHORIZE_CLAIM_H1")
        assert classification["allow_claim"] is True
        assert classification["allow_payload_allocation"] is False
        assert record.slot_name(binding.k, 1) not in os.listdir(root_fd)

        claim = record.claim_h1(root_fd, lock_fd, binding, fixture, classification)
        assert claim["decision"] == "AUTHORIZE_H1_AFTER_CLAIM"
        assert claim["allow_payload_allocation"] is True
        claimant_capability = claim["_claimant_capability"]
        assert record.slot_name(binding.k, 1) not in os.listdir(root_fd)

        if ns.child == "claim-death":
            emit({
                "marker": CHILD_MARKER,
                "status": "GREEN",
                "mode": ns.child,
                "claimant_pid": os.getpid(),
                "claimed_sha256": claim["sha256"],
                "claim_preceded_allocation": True,
                "s1_absent_at_cut": True,
                "closed_absent_at_cut": record.closed_name(binding.k) not in os.listdir(root_fd),
            })
            signal.pause()
            raise AssertionError("claim-death resumed")

        create_payload_leaf(root_fd, binding, fixture, 1)

        if ns.child == "s1-close-crash":
            emit({
                "marker": CHILD_MARKER,
                "status": "GREEN",
                "mode": ns.child,
                "claimant_pid": os.getpid(),
                "claimed_sha256": claim["sha256"],
                "claim_preceded_allocation": True,
                "s1_durable_at_cut": True,
                "closed_absent_at_cut": record.closed_name(binding.k) not in os.listdir(root_fd),
            })
            signal.pause()
            raise AssertionError("s1-close-crash resumed")

        assert ns.child == "recovery-success"
        closed = record.close_recovery(root_fd, lock_fd, binding, fixture, claimant_capability)
        assert closed["closed_by_original_claimant_pid"] == os.getpid()
        emit({
            "marker": CHILD_MARKER,
            "status": "GREEN",
            "mode": ns.child,
            "claimant_pid": os.getpid(),
            "claimed_sha256": claim["sha256"],
            "closed_sha256": closed["sha256"],
            "claim_preceded_allocation": True,
            "s1_durable_before_close": True,
            "closed_by_same_claimant": True,
            "s1_generation_identity": closed["s1"]["generation_identity"],
        })
        return 0
    finally:
        close_locked(root_fd, lock_fd)


def pure_negative_controls(fixture: dict, binding: admission.Binding, valid_s0: dict, valid_armed: dict) -> dict:
    controls = {}
    foreign_binding = admission.Binding(
        root_identity=str(int(binding.root_identity.split(":", 1)[0]) + 1) + ":" + binding.root_identity.split(":", 1)[1],
        lock_identity=binding.lock_identity,
        k=binding.k,
    )
    foreign = dict(valid_armed)
    foreign["root_identity"] = foreign_binding.root_identity
    try:
        record.validate_armed(foreign, binding, valid_s0)
    except record.RecoveryHold as exc:
        controls["foreign_root"] = exc.code
    else:
        raise AssertionError("foreign ARMED accepted")
    assert controls["foreign_root"] == "HOLD_ARMED_FOREIGN_ROOT"

    stale = dict(valid_armed)
    stale["s0_generation"] = (valid_s0["generation"] + 1) & 0xFFFFFFFF
    if stale["s0_generation"] == valid_s0["generation"]:
        stale["s0_generation"] = (stale["s0_generation"] + 1) & 0xFFFFFFFF
    try:
        record.validate_armed(stale, binding, valid_s0)
    except record.RecoveryHold as exc:
        controls["stale_generation"] = exc.code
    else:
        raise AssertionError("stale generation ARMED accepted")
    assert controls["stale_generation"] == "HOLD_ARMED_S0_GENERATION_MISMATCH"

    raw = record.canonical_bytes(valid_armed)
    noncanonical = raw.replace(b",", b", ", 1)
    assert noncanonical != raw
    try:
        record.parse_canonical(noncanonical)
    except record.RecoveryHold as exc:
        controls["noncanonical_marker"] = exc.code
    else:
        raise AssertionError("noncanonical marker accepted")
    assert controls["noncanonical_marker"] == "HOLD_MARKER_NONCANONICAL"

    claimed = record.make_claimed(binding, hashlib.sha256(raw).hexdigest())
    ordinary = record.make_closed_ordinary(binding, hashlib.sha256(raw).hexdigest())
    try:
        record.validate_closed(ordinary, binding, hashlib.sha256(raw).hexdigest(), hashlib.sha256(record.canonical_bytes(claimed)).hexdigest(), None)
    except record.RecoveryHold as exc:
        controls["ordinary_with_claim"] = exc.code
    else:
        raise AssertionError("ordinary close with claim accepted")
    assert controls["ordinary_with_claim"] == "HOLD_ORDINARY_CLOSE_CONTRADICTION"
    controls["labels_cannot_grant_capacity"] = True
    controls["hostile_same_uid_marker_deletion_proved"] = False
    return controls


def run_final(base: str, cases: dict[str, tuple[str, admission.Binding]]) -> dict:
    args = [sys.executable, "-I", "-B", str(FINAL), "--base", base]
    for name in ("ordinary", "recovery", "claim-death", "s1-close-crash"):
        root, binding = cases[name]
        args += [f"--{name}-root", root, f"--{name}-root-identity", binding.root_identity, f"--{name}-lock-identity", binding.lock_identity]
    args += ["--k", next(iter(cases.values()))[1].k]
    cp = subprocess.run(args, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=180)
    assert cp.returncode == 0, {"returncode": cp.returncode, "stdout": cp.stdout, "stderr": cp.stderr}
    assert cp.stderr == "", cp.stderr
    rows = [json.loads(line) for line in cp.stdout.splitlines() if line.strip()]
    assert len(rows) == 1, rows
    return rows[0]


def run(base: str) -> dict:
    fixture = load_fixture()
    base_path = os.path.abspath(base)
    base_fd = os.open(base_path, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
    cases: dict[str, tuple[str, admission.Binding]] = {}
    try:
        assert os.listdir(base_fd) == []
        ordinary_root, ordinary_binding = mkdir_case(base_fd, base_path, "ordinary", fixture)
        cases["ordinary"] = (ordinary_root, ordinary_binding)
        root_fd, lock_fd = open_locked(ordinary_root, ordinary_binding)
        try:
            create_payload_leaf(root_fd, ordinary_binding, fixture, 0)
            no_auth = expect_decision(root_fd, lock_fd, ordinary_binding, fixture, "HOLD_NO_RECOVERY_AUTH")
            assert no_auth["allow_payload_allocation"] is False
            s2 = expect_decision(root_fd, lock_fd, ordinary_binding, fixture, "HOLD_S2_FORBIDDEN", requested_slot=2)
            assert s2["allow_payload_allocation"] is False
            armed_ordinary = record.arm_recovery(root_fd, lock_fd, ordinary_binding, fixture)
            record.close_ordinary(root_fd, lock_fd, ordinary_binding, fixture)
        finally:
            close_locked(root_fd, lock_fd)

        recovery_root, recovery_binding = mkdir_case(base_fd, base_path, "recovery", fixture)
        cases["recovery"] = (recovery_root, recovery_binding)
        root_fd, lock_fd = open_locked(recovery_root, recovery_binding)
        try:
            create_payload_leaf(root_fd, recovery_binding, fixture, 0)
            armed_recovery = record.arm_recovery(root_fd, lock_fd, recovery_binding, fixture)
        finally:
            close_locked(root_fd, lock_fd)
        recovery_success = run_child("recovery-success", recovery_root, recovery_binding)
        assert recovery_success["closed_by_same_claimant"] is True

        claim_root, claim_binding = mkdir_case(base_fd, base_path, "claim-death", fixture)
        cases["claim-death"] = (claim_root, claim_binding)
        root_fd, lock_fd = open_locked(claim_root, claim_binding)
        try:
            create_payload_leaf(root_fd, claim_binding, fixture, 0)
            armed_claim = record.arm_recovery(root_fd, lock_fd, claim_binding, fixture)
        finally:
            close_locked(root_fd, lock_fd)
        claim_child = run_crash_child("claim-death", claim_root, claim_binding)
        root_fd, lock_fd = open_locked(claim_root, claim_binding)
        try:
            claim_after_crash = expect_decision(root_fd, lock_fd, claim_binding, fixture, "HOLD_RECOVERY_ATTEMPT_ALREADY_CONSUMED")
            assert claim_after_crash["allow_payload_allocation"] is False
            assert record.slot_name(claim_binding.k, 1) not in os.listdir(root_fd)
            assert record.closed_name(claim_binding.k) not in os.listdir(root_fd)
        finally:
            close_locked(root_fd, lock_fd)

        crash_root, crash_binding = mkdir_case(base_fd, base_path, "s1-close-crash", fixture)
        cases["s1-close-crash"] = (crash_root, crash_binding)
        root_fd, lock_fd = open_locked(crash_root, crash_binding)
        try:
            create_payload_leaf(root_fd, crash_binding, fixture, 0)
            armed_crash = record.arm_recovery(root_fd, lock_fd, crash_binding, fixture)
        finally:
            close_locked(root_fd, lock_fd)
        crash_child = run_crash_child("s1-close-crash", crash_root, crash_binding)
        assert crash_child["s1_durable_at_cut"] is True
        root_fd, lock_fd = open_locked(crash_root, crash_binding)
        try:
            crash_after = expect_decision(root_fd, lock_fd, crash_binding, fixture, "HOLD_S1_DURABLE_RECOVERY_CLOSE_INCOMPLETE")
            assert crash_after["allow_payload_allocation"] is False
            assert record.closed_name(crash_binding.k) not in os.listdir(root_fd)
            try:
                record.close_recovery(root_fd, lock_fd, crash_binding, fixture, None)
            except record.RecoveryHold as exc:
                fresh_close_rejected = exc.code
            else:
                raise AssertionError("fresh supervisor synthesized recovery close")
            assert fresh_close_rejected == "HOLD_RECOVERY_CLOSE_CLAIMANT_CAPABILITY_INVALID"
            assert record.closed_name(crash_binding.k) not in os.listdir(root_fd)
        finally:
            close_locked(root_fd, lock_fd)

        armed_set = (armed_ordinary, armed_recovery, armed_claim, armed_crash)
        assert {item["record"]["s0_sha256"] for item in armed_set} == {fixture["payload_sha256"]}
        assert {item["record"]["s0_length"] for item in armed_set} == {fixture["payload_bytes"]}
        controls = pure_negative_controls(fixture, recovery_binding, armed_recovery["s0"], armed_recovery["record"])
        final = run_final(base_path, cases)
        assert final["marker"] == "VOID_DATANET_V33_DURABLE_RECOVERY_RECORD_FINAL_V1_GREEN"
        assert final["status"] == "GREEN"
        assert final["ordinary_decision"] == "HOLD_ORDINARY_H0"
        assert final["recovery_decision"] == "COMPLETE_RECOVERY_H1"
        assert final["claim_death_decision"] == "HOLD_RECOVERY_ATTEMPT_ALREADY_CONSUMED"
        assert final["s1_close_crash_decision"] == "HOLD_S1_DURABLE_RECOVERY_CLOSE_INCOMPLETE"
        assert final["all_terminal_states_forbid_new_allocation"] is True
        assert final["independent_record_parser"] is True
        assert final["imports_record_reducer"] is False

        result = {
            "marker": MARKER,
            "status": "GREEN",
            "parent_pr": fixture["parent_pr"],
            "parent_head": fixture["parent_head"],
            "record_source_sha256": record.source_sha256(),
            "generation_source_sha256": record.inode_generation.source_sha256(),
            "admission_source_sha256": hashlib.sha256(Path(admission.__file__).read_bytes()).hexdigest(),
            "orchestrator_source_sha256": sha256_path(SOURCE),
            "final_verifier_source_sha256": sha256_path(FINAL),
            "python_executable_sha256": record.inode_generation.executable_sha256(),
            "s0_histories_byte_identical": True,
            "ordinary_terminal": final["ordinary_decision"],
            "recovery_terminal": final["recovery_decision"],
            "claim_death_terminal": final["claim_death_decision"],
            "s1_close_crash_terminal": final["s1_close_crash_decision"],
            "recovery_closed_by_original_claimant": recovery_success["closed_by_same_claimant"] is True,
            "recovery_success_claimant_pid": recovery_success["claimant_pid"],
            "claim_death_claimant_killed_and_reaped": claim_child["claimant_killed_and_reaped"] is True,
            "claim_death_s1_absent": claim_child["s1_absent_at_cut"] is True,
            "s1_close_crash_claimant_killed_and_reaped": crash_child["claimant_killed_and_reaped"] is True,
            "s1_close_crash_claimant_pid": crash_child["claimant_pid"],
            "fresh_supervisor_recovery_close_rejected": fresh_close_rejected,
            "s2_rejected_before_allocation": s2["decision"] == "HOLD_S2_FORBIDDEN",
            "negative_controls": controls,
            "source_distinct_final_verifier": final,
            "expected_ext4_getversion_observations": fixture["expected_ext4_getversion_observations"],
            "focused_role_lifetimes": fixture["focused_role_lifetimes"],
            "integrated_27_lifetime_campaign_proved": False,
            "hostile_same_uid_marker_deletion_proved": False,
            "cold_unmount_remount_proved": False,
            "physical_power_loss_proved": False,
            "chain_2050_authority_proved": False,
            "production_runtime_touched": False,
        }
        emit(result)
        return result
    finally:
        os.close(base_fd)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    p.add_argument("base", nargs="?")
    p.add_argument("--child", choices=["recovery-success", "s1-close-crash", "claim-death"])
    p.add_argument("--root")
    p.add_argument("--root-identity")
    p.add_argument("--lock-identity")
    p.add_argument("--k")
    return p


def main() -> int:
    ns = build_parser().parse_args()
    if ns.child:
        assert ns.root and ns.root_identity and ns.lock_identity and ns.k
        return child_mode(ns)
    assert ns.base
    run(ns.base)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

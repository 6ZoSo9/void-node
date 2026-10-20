#!/usr/bin/env python3
"""Source-only, in-memory tests for Epoch-2 Python closure freshness. No host probes."""
from __future__ import annotations
import sys
if not (sys.flags.isolated and sys.flags.dont_write_bytecode and sys.flags.no_site):
    raise SystemExit("HOLD=isolated_no_site_python_required")

import argparse
import copy
import hashlib
import json
import os
import stat
from pathlib import Path

MARKER = "VOID_BUY_VOID_EPOCH2_V6R3_PYTHON_RUNTIME_CLOSURE_FRESHNESS_GATE_V2"
PREFIX = "voidbuye2v6r3pyclosurefreshness2_"
GATE_ID = "voidbuye2v6r3pyclosurefreshness2_53653912534048b7be8b02aed429a28383edb9b419632e7e1d8fd32a19050414"
ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "ops/security/buy-void-epoch2-v6r3-python-runtime-closure-freshness-gate-v2.json"
UPSTREAM = ROOT / "ops/security/buy-void-epoch2-v6r3-python-runtime-closure-contract-v2.json"
BINARY_LOCK = ROOT / "ops/security/buy-void-epoch2-v6r3-plan-first-entry-binary-candidate-lock-v2.json"
UPSTREAM_BLOB = "c56361ecaccb916a79591c016200b8dc02f5ca54"
BINARY_LOCK_BLOB = "14a3ff2eca0583d1355dc8b75bd54cc55115d946"
UPSTREAM_ID = "voidbuye2v6r3pyruntimecontract2_6fe0f7e5779d998659ffb67d64832e9ce5babac92584c88f43c1400cef3e4e50"
BINARY_LOCK_ID = "voidbuye2v6r3planfirstentrybinlock2_b5e1bbca28ed7aad579ac7f37a7575ed90eadd44f73d24edac79df3cc74664c1"

def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")

def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()

def source_bytes(path: Path) -> bytes:
    """Read bounded no-follow source inputs, verify path/descriptor generation."""
    before = path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
    assert before.st_nlink == 1 and 0 < before.st_size <= 128 * 1024
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        fields = ("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns")
        assert all(getattr(before,x) == getattr(opened,x) for x in fields)
        chunks = []
        remaining = opened.st_size
        while remaining:
            chunk = os.read(fd, min(65536, remaining))
            assert chunk, "source_short_read"
            chunks.append(chunk)
            remaining -= len(chunk)
        assert os.read(fd, 1) == b"", "source_growth"
        after = os.fstat(fd)
        visible = path.lstat()
        assert all(getattr(opened,x) == getattr(after,x) == getattr(visible,x) for x in fields)
        return b"".join(chunks)
    finally:
        os.close(fd)

def verify_source_contract() -> None:
    raw = source_bytes(POLICY)
    assert len(raw) < 64_000
    value = json.loads(raw)
    assert value["schema"] == "void_buy_void_epoch2_v6r3_python_runtime_closure_freshness_gate_v2"
    assert value["marker"] == MARKER and value["version"] == 2
    assert value["repository"] == "6ZoSo9/void-node"
    body = dict(value)
    got = body.pop("gate_id")
    assert got == GATE_ID == PREFIX + sha256(canonical(body))
    assert git_blob(source_bytes(UPSTREAM)) == UPSTREAM_BLOB
    assert git_blob(source_bytes(BINARY_LOCK)) == BINARY_LOCK_BLOB
    upper = json.loads(source_bytes(UPSTREAM))
    lock = json.loads(source_bytes(BINARY_LOCK))
    assert upper["contract_id"] == UPSTREAM_ID
    process=upper["runtime_process"]
    assert process["post_exec_dumpability_verified"] is False
    assert process["post_exec_dumpability_accepted"] is False
    diagnostic=process["post_exec_dumpability_diagnostic_evidence"]
    assert diagnostic["head"]=="bc59170b211c3bd2490446b0e1cd045b5d9d5925"
    assert diagnostic["script_git_blob_sha1"]=="a946e81549fe12f61b61d17cad76a7eda40501ff"
    assert diagnostic["workflow_git_blob_sha1"]=="e27aa4a81fbfe4ae122db5fa5cf906fbe1848e28"
    assert diagnostic["run_id"]==39360364319 and diagnostic["job_id"]==118424883505
    assert diagnostic["pre_fexecve_dumpable"]==0 and diagnostic["post_fexecve_dumpable"]==1
    assert lock["lock_id"] == BINARY_LOCK_ID
    p = value["parent"]
    assert p["closure_contract_head"] == "83c066af5542c2b4d836f3df9d06381499031a30"
    assert p["closure_contract_path"] == "ops/security/buy-void-epoch2-v6r3-python-runtime-closure-contract-v2.json"
    assert p["native_first_entry_lock_path"] == "ops/security/buy-void-epoch2-v6r3-plan-first-entry-binary-candidate-lock-v2.json"
    assert upper["first_entry_binary_lock"]["lock_id"] == BINARY_LOCK_ID
    assert upper["first_entry_binary_lock"]["git_blob_sha1"] == BINARY_LOCK_BLOB
    assert lock["candidate_binary_identity_accepted"] is True
    assert lock["independent_security_review_satisfied"] is False
    assert upper["runtime_process"]["post_exec_dumpability_accepted"] is False
    assert upper["authority"]["host_census_authorized"] is False
    assert p["closure_contract_git_blob_sha1"] == UPSTREAM_BLOB
    assert p["native_first_entry_lock_git_blob_sha1"] == BINARY_LOCK_BLOB
    assert p["closure_contract_id"] == UPSTREAM_ID
    assert p["native_first_entry_lock_id"] == BINARY_LOCK_ID
    gate = value["mandatory_live_gate"]
    false_gate_fields={
        "installed_enforcement_source_proven",
        "installed_post_exec_dumpability_enforcement_source_proven",
        "host_manifest_accepted",
        "host_plan_authorized",
    }
    for name, allowed in gate.items():
        assert allowed is (name not in false_gate_fields), name
    for required in (
        "parent_post_exec_dumpability_diagnostic_evidence_bound",
        "pre_exec_freshness_not_post_exec_process_authority",
        "post_exec_dumpability_protection_or_isolation_required",
        "post_exec_dumpability_must_be_observed_before_host_plan_authority",
    ):
        assert gate[required] is True,required
    a = dict(value["authority"])
    assert a.pop("source_contract_only") is True
    assert all(entry is False for entry in a.values())
    assert value["next_gate"] == "void_buy_void_epoch2_v6r3_python_runtime_closure_terminal_host_census_v2"

class Hold(RuntimeError):
    pass

def require_current(accepted: dict, observed: dict) -> None:
    """Synthetic classifier only; NOT a production-host attestation."""
    if sha256(canonical(accepted["manifest"])) != accepted["report_sha256"]:
        raise Hold("accepted_report_digest_invalid")
    if accepted["host_id"] != observed["host_id"]:
        raise Hold("host_identity_changed")
    if observed["runtime_uid_gid"] != [1000, 1000]:
        raise Hold("runtime_identity_invalid")
    if accepted["first_entry_lock_id"] != BINARY_LOCK_ID:
        raise Hold("first_entry_generation_mismatch")
    if accepted["closure_contract_id"] != UPSTREAM_ID:
        raise Hold("closure_contract_generation_mismatch")
    if accepted["manifest"] != observed["manifest"]:
        raise Hold("terminal_runtime_manifest_changed")
    for obj in observed["manifest"]["objects"].values():
        if obj.get("runtime_uid_writable") is not False:
            raise Hold("runtime_uid_write_access")
    for absent in observed["manifest"]["absent"].values():
        if absent.get("exists") is not False or absent.get("parent_runtime_uid_writable") is not False:
            raise Hold("absent_path_materialized_or_parent_writable")
    allowed = set(observed["manifest"]["objects"])
    if not set(observed["accessed_paths"]).issubset(allowed):
        raise Hold("unaccepted_runtime_file_access")

def synthetic_test() -> None:
    manifest = {
        "sys_path": ["/usr/lib/python3.12", "/usr/lib/python3.12/lib-dynload"],
        "objects": {
            "/usr/bin/python3.12": {"sha256": "a" * 64, "inode": 100, "runtime_uid_writable": False},
            "/lib/ld-linux.so.2": {"sha256": "b" * 64, "inode": 200, "runtime_uid_writable": False},
            "/usr/lib/python3.12/hashlib.py": {"sha256": "c" * 64, "inode": 300, "runtime_uid_writable": False},
        },
        "absent": {"/etc/ld.so.preload": {
            "exists": False, "parent_inode": 77, "parent_runtime_uid_writable": False}},
        "loader_cache_sha256": "d" * 64,
        "links": {"/usr/bin/python3": "/usr/bin/python3.12"},
    }
    accepted = {
        "manifest": manifest, "report_sha256": sha256(canonical(manifest)),
        "host_id": "synthetic-precision", "closure_contract_id": UPSTREAM_ID,
        "first_entry_lock_id": BINARY_LOCK_ID,
    }
    observed = {
        "manifest": copy.deepcopy(manifest), "runtime_uid_gid": [1000, 1000],
        "host_id": "synthetic-precision", "accessed_paths": ["/usr/bin/python3.12"],
    }
    require_current(accepted, observed)
    adversaries = {
        "replayed_report_hash": ("accepted", ("report_sha256",), "0" * 64),
        "different_host": ("observed", ("host_id",), "different-host"),
        "different_runtime_uid": ("observed", ("runtime_uid_gid",), [0, 0]),
        "wrong_closure_generation": ("accepted", ("closure_contract_id",), "historical-v1"),
        "wrong_entry_lock": ("accepted", ("first_entry_lock_id",), "wrong-lock"),
        "python_elf_drift": ("observed", ("manifest", "objects", "/usr/bin/python3.12", "sha256"), "f" * 64),
        "loader_cache_drift": ("observed", ("manifest", "loader_cache_sha256"), "e" * 64),
        "new_sys_path_root": ("observed", ("manifest", "sys_path"), ["/tmp/hostile", *manifest["sys_path"]]),
        "new_runtime_file": ("observed", ("manifest", "objects", "/tmp/injected.py"),
                             {"sha256": "a" * 64, "runtime_uid_writable": True}),
        "deleted_runtime_file": ("observed", ("manifest", "objects", "/usr/lib/python3.12/hashlib.py"), None),
        "formerly_absent_path": ("observed", ("manifest", "absent", "/etc/ld.so.preload", "exists"), True),
        "absent_parent_writable": ("observed", ("manifest", "absent", "/etc/ld.so.preload",
                                              "parent_runtime_uid_writable"), True),
        "leaf_acl_writable": ("observed", ("manifest", "objects", "/usr/bin/python3.12",
                                         "runtime_uid_writable"), True),
        "symlink_swap": ("observed", ("manifest", "links", "/usr/bin/python3"), "/tmp/hostile-python"),
        "unaccepted_dlopen_path": ("observed", ("accessed_paths",),
                                  ["/usr/bin/python3.12", "/tmp/evil.so"]),
    }
    for name, (owner, path, replacement) in adversaries.items():
        a, o = copy.deepcopy(accepted), copy.deepcopy(observed)
        cur = a if owner == "accepted" else o
        for element in path[:-1]:
            cur = cur[element]
        if name == "deleted_runtime_file":
            del cur[path[-1]]
        else:
            cur[path[-1]] = replacement
        try:
            require_current(a, o)
        except Hold:
            pass
        else:
            raise AssertionError("stale_or_hostile_generation_accepted:" + name)
    print(MARKER + "_SYNTHETIC_GREEN")
    print("synthetic_current_manifest_accepted=true")
    print("stale_report_and_host_drift_rejected=true")
    print("python_loader_sys_path_acl_and_absence_drift_rejected=true")
    print("unaccepted_runtime_path_rejected=true")
    print("synthetic_adversary_count=" + str(len(adversaries)))
    print("host_census_performed=false")
    print("live_enforcement_proven=false")
    print("post_exec_dumpability_not_proven_by_freshness_gate=true")
    print("host_plan_authorized=false")
    print("funds_movement=false")

def source_plan() -> None:
    verify_source_contract()
    print(MARKER)
    print("mode=source-plan")
    print("gate_id=" + GATE_ID)
    print("source_only=true")
    print("host_census_authorized=false")
    print("host_plan_authorized=false")
    print("protected_install_authorized=false")
    print("first_exec_live_runtime_revalidation_required=true")
    print("accepted_host_report_not_live_execution_authority=true")
    print("parent_dumpability_diagnostic_evidence_bound=true")
    print("pre_exec_freshness_not_post_exec_process_authority=true")
    print("post_exec_dumpability_protection_or_isolation_required=true")
    print("installed_post_exec_dumpability_enforcement_source_proven=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")

def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        verify_source_contract()
        synthetic_test()
    else:
        source_plan()

if __name__ == "__main__":
    main()

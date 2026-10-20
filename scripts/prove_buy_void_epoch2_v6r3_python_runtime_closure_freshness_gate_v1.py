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
from pathlib import Path

MARKER = "VOID_BUY_VOID_EPOCH2_V6R3_PYTHON_RUNTIME_CLOSURE_FRESHNESS_GATE_V1"
PREFIX = "voidbuye2v6r3pyclosurefreshness1_"
GATE_ID = "voidbuye2v6r3pyclosurefreshness1_63ab4349db96b99792bd58531b39d05527821af8eec0111c11b088e6ab381342"
ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "ops/security/buy-void-epoch2-v6r3-python-runtime-closure-freshness-gate-v1.json"
UPSTREAM = ROOT / "ops/security/buy-void-epoch2-v6r3-python-runtime-closure-contract-v1.json"
BINARY_LOCK = ROOT / "ops/security/buy-void-epoch2-v6r3-plan-first-entry-binary-candidate-lock-v1.json"
UPSTREAM_BLOB = "d6b31cab5745bf76f5ae8c69bef864ee4f3338b5"
BINARY_LOCK_BLOB = "66bf48fd6477e0335b1eea6e2b7e8a7f297f8c57"
UPSTREAM_ID = "voidbuye2v6r3pyruntimecontract1_6b88925643319fd7724f4fd66d115fd5ec9598a3c59a57cbc0a8c51737c8bae8"
BINARY_LOCK_ID = "voidbuye2v6r3planfirstentrybinlock1_f6b452bb75542809454a0b68bae2f0049a4f2af6329e0b13075de1491bbbbc61"

def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")

def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()

def verify_source_contract() -> None:
    raw = POLICY.read_bytes()
    assert len(raw) < 64_000
    value = json.loads(raw)
    assert value["schema"] == "void_buy_void_epoch2_v6r3_python_runtime_closure_freshness_gate_v1"
    assert value["marker"] == MARKER and value["version"] == 1
    assert value["repository"] == "6ZoSo9/void-node"
    body = dict(value)
    got = body.pop("gate_id")
    assert got == GATE_ID == PREFIX + sha256(canonical(body))
    assert git_blob(UPSTREAM.read_bytes()) == UPSTREAM_BLOB
    assert git_blob(BINARY_LOCK.read_bytes()) == BINARY_LOCK_BLOB
    upper = json.loads(UPSTREAM.read_bytes())
    lock = json.loads(BINARY_LOCK.read_bytes())
    assert upper["contract_id"] == UPSTREAM_ID
    assert lock["lock_id"] == BINARY_LOCK_ID
    p = value["parent"]
    assert p["closure_contract_git_blob_sha1"] == UPSTREAM_BLOB
    assert p["native_first_entry_lock_git_blob_sha1"] == BINARY_LOCK_BLOB
    assert p["closure_contract_id"] == UPSTREAM_ID
    assert p["native_first_entry_lock_id"] == BINARY_LOCK_ID
    gate = value["mandatory_live_gate"]
    for name, allowed in gate.items():
        assert allowed is (name not in (
            "installed_enforcement_source_proven", "host_manifest_accepted", "host_plan_authorized"
        )), name
    a = dict(value["authority"])
    assert a.pop("source_contract_only") is True
    assert all(entry is False for entry in a.values())
    assert value["next_gate"] == "void_buy_void_epoch2_v6r3_python_runtime_closure_terminal_host_census_v1"

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

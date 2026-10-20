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

MARKER = "VOID_BUY_VOID_EPOCH2_V6R3_PYTHON_RUNTIME_CLOSURE_FRESHNESS_GATE_V2"
PREFIX = "voidbuye2v6r3pyclosurefreshness2_"
GATE_ID = "voidbuye2v6r3pyclosurefreshness2_5840ca9aaecbbef2b50783fe05d364161e66b19a79c793b71dd80d18d243c54b"
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

def verify_source_contract() -> None:
    raw = POLICY.read_bytes()
    assert len(raw) < 64_000
    value = json.loads(raw)
    assert value["schema"] == "void_buy_void_epoch2_v6r3_python_runtime_closure_freshness_gate_v2"
    assert value["marker"] == MARKER and value["version"] == 2
    assert value["repository"] == "6ZoSo9/void-node"
    body = dict(value)
    got = body.pop("gate_id")
    assert got == GATE_ID == PREFIX + sha256(canonical(body))
    assert git_blob(UPSTREAM.read_bytes()) == UPSTREAM_BLOB
    assert git_blob(BINARY_LOCK.read_bytes()) == BINARY_LOCK_BLOB
    upper = json.loads(UPSTREAM.read_bytes())
    lock = json.loads(BINARY_LOCK.read_bytes())
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
    assert upper["first_entry_binary_lock"]["lock_id"] == BINARY_LOCK_ID
    assert upper["first_entry_binary_lock"]["git_blob_sha1"] == BINARY_LOCK_BLOB
    assert upper["first_entry_binary_lock"]["binary_sha256"] == lock["candidate_report"]["binary"]["sha256"]
    assert lock["candidate_report"]["source"]["git_blob_sha1"] == "8d06482b5cc313cc1609371493112e737f89abc2"
    assert lock["independent_security_review_satisfied"] is False
    assert lock["python_runtime_closure_accepted"] is False
    assert lock["post_exec_dumpability_isolation_accepted"] is False
    assert lock["production_binary_install_authorized"] is False
    assert upper["planner_subprocess_closure"]["git"]["pt_interp_and_transitive_dt_needed_closure_required"] is True
    assert upper["planner_subprocess_closure"]["git"]["runtime_helpers_plugins_and_config_file_access_closure_required"] is True
    assert diagnostic["native_source_git_blob_sha1"] != lock["candidate_report"]["source"]["git_blob_sha1"]
    p = value["parent"]
    assert p["closure_contract_head"] == "83c066af5542c2b4d836f3df9d06381499031a30"
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
        "installed_v2_first_entry_enforcement_source_proven",
    }
    for name, allowed in gate.items():
        assert allowed is (name not in false_gate_fields), name
    for required in (
        "parent_post_exec_dumpability_diagnostic_evidence_bound",
        "pre_exec_freshness_not_post_exec_process_authority",
        "post_exec_dumpability_protection_or_isolation_required",
        "post_exec_dumpability_must_be_observed_before_host_plan_authority",
        "parent_python_git_runtime_closure_bound",
        "git_executable_loader_dso_and_helpers_current_required",
        "git_config_and_repository_metadata_absence_current_required",
        "git_runtime_file_accesses_subset_of_accepted_closure",
        "post_exec_diagnostic_historical_not_v2_elf_execution_authority",
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
    # Synthetic-only Git process closure schema: the whole native process
    # (ELF, loader, DSOs, helpers, config absences) must exist in the
    # accepted manifest; merely recording a Git executable pathname is not
    # an accepted dynamic execution closure.
    git = observed["manifest"].get("git_runtime")
    if not isinstance(git, dict) or git.get("executable") != "/usr/bin/git":
        raise Hold("git_execution_closure_missing")
    for group in ("mapped_elf_paths", "helper_paths", "config_paths"):
        paths = git.get(group)
        if not isinstance(paths, list) or not paths or len(paths) != len(set(paths)):
            raise Hold("git_runtime_closure_path_set_invalid")
        for member in paths:
            if not isinstance(member, str) or not member.startswith("/") or "\x00" in member:
                raise Hold("git_runtime_closure_path_invalid")
            if group == "config_paths":
                # A config is either a hashed regular file or an explicit
                # absent path with a qualified nearest parent.
                present = observed["manifest"]["objects"].get(member)
                absent = observed["manifest"]["absent"].get(member)
                if present is None and absent is None:
                    raise Hold("git_runtime_config_unobserved")
                if present is not None:
                    if (present.get("kind") != "regular" or
                        not isinstance(present.get("sha256"), str) or
                        len(present["sha256"]) != 64 or
                        present.get("runtime_uid_writable") is not False):
                        raise Hold("git_runtime_config_identity_invalid")
                elif (absent.get("exists") is not False or
                      absent.get("parent_runtime_uid_writable") is not False or
                      not isinstance(absent.get("parent_inode"), int) or
                      absent["parent_inode"] <= 0):
                    raise Hold("git_runtime_config_absence_invalid")
            else:
                # No claimed mapped/invoked code can be an absent path.
                present = observed["manifest"]["objects"].get(member)
                if (not isinstance(present, dict) or
                    present.get("kind") != "regular" or
                    not isinstance(present.get("bytes"), int) or
                    present["bytes"] <= 0 or
                    not isinstance(present.get("sha256"), str) or
                    len(present["sha256"]) != 64 or
                    any(ch not in "0123456789abcdef" for ch in present["sha256"]) or
                    present.get("runtime_uid_writable") is not False):
                    raise Hold("git_runtime_required_code_not_present")
    if git["executable"] not in git["mapped_elf_paths"]:
        raise Hold("git_executable_not_in_mapped_elf_closure")
    allowed = set(observed["manifest"]["objects"])
    if not set(observed["accessed_paths"]).issubset(allowed):
        raise Hold("unaccepted_runtime_file_access")

def synthetic_test() -> None:
    manifest = {
        "sys_path": ["/usr/lib/python3.12", "/usr/lib/python3.12/lib-dynload"],
        "objects": {
            "/usr/bin/python3.12": {"sha256": "a" * 64, "inode": 100, "runtime_uid_writable": False},
            "/usr/bin/git": {"sha256": "e" * 64, "inode": 400, "bytes": 2048, "kind": "regular", "runtime_uid_writable": False},
            "/usr/lib/git-core/git-upload-pack": {"sha256": "f" * 64, "inode": 401, "bytes": 1536, "kind": "regular", "runtime_uid_writable": False},
            "/usr/lib/x86_64-linux-gnu/libz.so.1": {"sha256": "9" * 64, "inode": 402, "bytes": 4096, "kind": "regular", "runtime_uid_writable": False},
            "/lib/ld-linux.so.2": {"sha256": "b" * 64, "inode": 200, "bytes": 3072, "kind": "regular", "runtime_uid_writable": False},
            "/usr/lib/python3.12/hashlib.py": {"sha256": "c" * 64, "inode": 300, "runtime_uid_writable": False},
        },
        "absent": {
            "/etc/ld.so.preload": {"exists": False, "parent_inode": 77, "parent_runtime_uid_writable": False},
            "/etc/gitconfig": {"exists": False, "parent_inode": 77, "parent_runtime_uid_writable": False},
        },
        "git_runtime": {
            "executable": "/usr/bin/git",
            "mapped_elf_paths": ["/usr/bin/git", "/lib/ld-linux.so.2", "/usr/lib/x86_64-linux-gnu/libz.so.1"],
            "helper_paths": ["/usr/lib/git-core/git-upload-pack"],
            "config_paths": ["/etc/gitconfig"],
        },
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
        "host_id": "synthetic-precision", "accessed_paths": ["/usr/bin/python3.12", "/usr/bin/git"],
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
        "git_binary_drift": ("observed", ("manifest", "objects", "/usr/bin/git", "sha256"), "1"*64),
        "git_loader_drift": ("observed", ("manifest", "objects", "/lib/ld-linux.so.2", "sha256"), "2"*64),
        "git_dso_drift": ("observed", ("manifest", "objects", "/usr/lib/x86_64-linux-gnu/libz.so.1", "sha256"), "3"*64),
        "git_helper_drift": ("observed", ("manifest", "objects", "/usr/lib/git-core/git-upload-pack", "sha256"), "4"*64),
        "git_config_materialized": ("observed", ("manifest", "absent", "/etc/gitconfig", "exists"), True),
        "git_unaccepted_helper": ("observed", ("manifest", "git_runtime", "helper_paths"), ["/tmp/unaccepted"]),
        "git_unaccepted_mapped_dso": ("observed", ("manifest", "git_runtime", "mapped_elf_paths"), ["/tmp/evil.so"]),
        "git_unaccepted_access": ("observed", ("accessed_paths",), ["/usr/bin/python3.12", "/tmp/unaccepted-git.so"]),
        "git_closure_missing": ("observed", ("manifest", "git_runtime"), None),
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
    # Same-data adversary: an accepted and current report can both be
    # re-hashed after a malicious source omits a required executable.
    # The guard must reject absence as such, not only A-vs-B drift.
    required_code = [
        *manifest["git_runtime"]["mapped_elf_paths"],
        *manifest["git_runtime"]["helper_paths"],
    ]
    for member in required_code:
        a, o = copy.deepcopy(accepted), copy.deepcopy(observed)
        for item in (a["manifest"], o["manifest"]):
            del item["objects"][member]
            item["absent"][member] = {
                "exists": False, "parent_inode": 77,
                "parent_runtime_uid_writable": False,
            }
        o["accessed_paths"] = [x for x in o["accessed_paths"] if x != member]
        a["report_sha256"] = sha256(canonical(a["manifest"]))
        assert a["manifest"] == o["manifest"], member
        try:
            require_current(a, o)
        except Hold as exc:
            assert str(exc) == "git_runtime_required_code_not_present", (
                member, str(exc)
            )
        else:
            raise AssertionError("absent_required_git_code_accepted:" + member)
    print(MARKER + "_SYNTHETIC_GREEN")
    print("synthetic_current_manifest_accepted=true")
    print("stale_report_and_host_drift_rejected=true")
    print("python_loader_sys_path_acl_and_absence_drift_rejected=true")
    print("unaccepted_runtime_path_rejected=true")
    print("git_executable_loader_dso_helper_config_drift_rejected=true")
    print("git_mapped_elf_and_helper_absence_same_data_rejected=true")
    print("v2_binary_lock_generation_exact=true")
    print("synthetic_adversary_count=" + str(len(adversaries)+len(required_code)))
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
    print("git_process_runtime_closure_terminal_revalidation_required=true")
    print("historical_dumpability_diagnostic_not_v2_execution_authority=true")
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

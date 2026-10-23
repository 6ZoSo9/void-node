#!/usr/bin/env python3
"""Read-only source/test proof for the separate V3 custody qualification."""
from __future__ import annotations

import ast
from pathlib import Path
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
V2=ROOT/"ops/xiphos/apollyon_live_custody_dormant_qualification_v2.py"
V3=ROOT/"ops/xiphos/apollyon_live_custody_dormant_qualification_v3.py"

old=V2.read_text(encoding="utf-8")
new=V3.read_text(encoding="utf-8")
ast.parse(old,filename=str(V2))
ast.parse(new,filename=str(V3))
assert 'MARKER="VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V2"' in old
assert 'MARKER="VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V3"' in new
assert old!=new

# Independent AST delta census: every pre-existing production function and
# top-level contract must match V2, except the single reviewed live observer,
# the self-test extension, and the versioned marker.
old_ast=ast.parse(old)
new_ast=ast.parse(new)
def function_map(tree:ast.Module)->dict[str,str]:
    return {
        node.name:ast.dump(node,include_attributes=False)
        for node in tree.body
        if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef))
    }
old_functions=function_map(old_ast)
new_functions=function_map(new_ast)
assert set(old_functions).issubset(new_functions)
assert set(new_functions)-set(old_functions)=={
    "same_executable_inode","exact_custody_node_executable",
    "validated_custody_live_subject",
}
for name,production_ast in old_functions.items():
    if name not in {"live_observation","self_test"}:
        assert new_functions[name]==production_ast,"unexpected_function_drift:"+name

def static_contract(tree:ast.Module)->list[str]:
    out=[]
    for node in tree.body:
        if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)):
            continue
        if (
            isinstance(node,ast.Assign) and
            any(isinstance(target,ast.Name) and target.id=="MARKER"
                for target in node.targets)
        ):
            continue
        out.append(ast.dump(node,include_attributes=False))
    return out
assert static_contract(old_ast)==static_contract(new_ast),"top_level_contract_drift"

# The pinned service, launcher, node bytes and credential/static boundaries
# must not change when fixing the qualifier's pre-exec readiness observation.
for expected in (
    'TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"',
    'SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"',
    'HELPER_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"',
    'LAUNCHER_BLOB="8d8561c08db7e500a818d269580dad15adca9f58"',
    'NODE_BYTES=126595440',
    'NODE_SHA256="7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c"',
    'EXPECTED_PUBLIC_RAW_SHA256="c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134"',
    'run(["/usr/bin/systemctl","start",TARGET_UNIT])',
    'run(["/usr/bin/systemctl","stop",TARGET_UNIT])',
    'if argv!=expected_live_argv(ids):hold("custody_argv_exact_mismatch")',
    'attest_dormant_boundary(ids,"final")',
    'emergency_cleanup(ids)',
    'consumed_snapshot(ids)!=consumed_before',
    'stable_uid_thread_process_map(',
    'custody_thread_inventory(',
    'loaded_unset_environment_invalid',
    'service_effective_execstart_invalid',
    'service_effective_execstoppost_invalid',
):
    assert expected in old and expected in new,expected

# The readiness gate must occur before MainPID executable inspection.
live=new.split("def live_observation(ids:",1)[1].split("def stop_and_attest(",1)[0]
assert live.index("wait_socket(True)")<live.index('raw=service.get("MainPID","")')
assert live.index('raw=service.get("MainPID","")')<live.index("exact_custody_node_executable(pid)")
subject=new.split("def validated_custody_live_subject(",1)[1].split(
    "def live_observation(",1
)[0]
for expected in (
    "status=proc_status(pid)",
    "if argv!=expected_live_argv(ids):",
    "thread_inventory=custody_thread_inventory(pid,ids)",
    "stable_uid_thread_process_map(ids",
    "no_training_uid_processes(ids",
    '"cmdline_raw":cmd',
    '"security_status":',
    '"thread_inventory":thread_inventory',
    '"custody_processes":custody_processes',
):
    assert expected in subject,expected
assert live.index("exact_custody_node_executable(pid)")<live.index(
    "initial_subject=validated_custody_live_subject(pid,ids)"
)
assert live.count("validated_custody_live_subject(pid,ids)")==2
assert live.count("exact_custody_node_executable(pid)")==3
assert 'if latest.get("MainPID")!=raw:' in live
assert live.index("final_subject=validated_custody_live_subject(pid,ids)")>live.index(
    'if latest.get("MainPID")!=raw:'
)
assert live.index("if final_subject!=initial_subject:")>live.index(
    "final_subject=validated_custody_live_subject(pid,ids)"
)
assert live.rfind("exact_custody_node_executable(pid)")>live.index(
    'if final_service.get("MainPID")!=raw:'
)
assert "custody_mainpid_live_snapshot_changed" in live
assert "custody_mainpid_generation_changed_after_snapshot" in live
assert "custody_mainpid_changed_after_snapshot" in live
assert "custody_mainpid_generation_changed_final" in live
assert "custody_mainpid_generation_changed_after_executable_recheck" in live
# An inert adversary must exercise live_observation() itself, not a helper only.
assert "([initial_subject,reexecuted_subject],True)" in new
assert '"custody_mainpid_live_snapshot_changed",' in new
assert '"same_node_reexec_adversary_executed=true"' in new
assert "def exact_custody_node_executable(" in new
assert 'observed=os.readlink(exe_link)' in new
assert 'not same_executable_inode(live_st,expected_st)' in new
assert "custody_node_executable_disappeared" in new
assert "custody_node_executable_inode_mismatch" in new
assert 'with mock.patch.object(os,"stat",side_effect=inode_drift_stat)' in new
assert '"custody_node_executable_inode_mismatch",' in new

for forbidden in (
    'systemctl","start",SERVICE_UNIT',
    'systemctl","stop",SERVICE_UNIT',
    'PRIVATE KEY-----',
    'eth_sendRawTransaction',
):
    assert forbidden not in new,forbidden

result=subprocess.run(
    [sys.executable,"-I","-B",str(V3),"--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert result.returncode==0,(
    "V3 self-test failed: "+result.stderr+" "+result.stdout[-1500:]
)
for required in (
    "VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V3_SELF_TEST_GREEN",
    "socket_ready_before_mainpid_inspection=true",
    "raw_executable_path_and_inode_bound=true",
    "mainpid_generation_rechecked=true",
    "final_executable_identity_reattested=true",
    "checker_inode_mismatch_adversary_executed=true",
    "full_live_subject_snapshot_rechecked=true",
    "same_node_reexec_adversary_executed=true",
    "custody_thread_credentials_exact_required=true",
    "custody_uid_process_exclusivity_required=true",
    "final_success_attestation_failure_receipt_truthful=true",
    "training_execution=false",
    "durable_attempt_claim=false",
    "funds_movement=false",
):
    assert required in result.stdout,required

print("VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V3_PROOF_GREEN")
print("read_only=true")
print("source_only=true")
print("socket_ready_before_mainpid_inspection=true")
print("raw_executable_path_and_inode_bound=true")
print("mainpid_generation_rechecked=true")
print("final_executable_identity_reattested=true")
print("checker_inode_mismatch_adversary_executed=true")
print("full_live_subject_snapshot_rechecked=true")
print("same_node_reexec_adversary_executed=true")
print("systemd_service_source_unchanged=true")
print("legacy_v2_source_preserved=true")
print("unchanged_v2_production_ast_exact=true")
print("direct_service_action=false")
print("training_execution=false")
print("durable_attempt_claim=false")
print("funds_movement=false")

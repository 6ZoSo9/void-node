#!/usr/bin/env python3
from __future__ import annotations
import ast, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
Q=ROOT/"ops/xiphos/apollyon_live_custody_dormant_qualification_v1.py"
source=Q.read_text();ast.parse(source)
for required in (
    'TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"',
    'SERVICE_BLOB="86ed25003c554dcfe3019e71d5a3a78851fcc50a"',
    'HELPER_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"',
    'LAUNCHER_BLOB="d23ff045d8c355401fed499c6bcffd503ba4c7fd"',
    'run(["/usr/bin/systemctl","start",TARGET_UNIT])',
    'run(["/usr/bin/systemctl","stop",TARGET_UNIT])',
    'st.st_nlink!=2',
    'wait_socket(False)',
    'assert_socket_parent_empty()',
    'target_maybe_started=True',
    'active not in ("inactive","failed")',
    'expected_unit_file_state="disabled"',
    'expected_unit_file_state="static"',
    'unit_file_state_mismatch:',
    'consumed_state_unchanged',
    'first_generation=(observations[0]["live"]["pid"],observations[0]["live"]["start_ticks"])',
    'second_generation=(observations[1]["live"]["pid"],observations[1]["live"]["start_ticks"])',
    'restart_safe_second_cycle_proven',
    'STATE_ROOT=Path("/var/lib/void-apollyon-custody-v1")',
    'custody_argv_exact_mismatch',
    'custody_environment_file_invalid',
    'effective_systemd_configuration_bound',
    'service_effective_execstart_invalid',
    'service_effective_execstoppost_invalid',
    'service_dropins_present',
    'target_dropins_present',
    'loaded_unset_environment_invalid',
    'custody_uid_process_exclusivity_failed',
    'preexisting_custody_uid_process',
    'prestart_custody_uid_process',
    'custody_uid_process_after_stop',
    'target_start_attempts=',
    'emergency_cleanup_attempted=',
    'emergency_cleanup_green=',
    'final_dormant_recheck_attempted=',
    'final_dormant_recheck_reason=',
    'final_dormant_after_failure_proven=',
    'attest_dormant_boundary(ids,"emergency")',
    'attest_dormant_boundary(ids,"failure_recheck")',
    'attest_dormant_boundary(ids,"final")',
    'def emergency_cleanup(',
    ')=emergency_cleanup(ids)',
    'uid_process_generations(',
    'proc_root:Path=Path("/proc")',
    'return not uid_process_generations(training_uid,proc_root)',
    'custody_uid_process_status_unreadable:',
):
    assert required in source,required
for forbidden in (
    'systemctl","start",SERVICE_UNIT','systemctl","stop",SERVICE_UNIT',
    "PRIVATE KEY-----","eth_sendRawTransaction","training_"+"execution"+":True",
):
    assert forbidden not in source,forbidden
r=subprocess.run(
    ["python3","-I","-B",str(Q),"--self-test"],
    cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=20,
)
assert r.returncode==0,r.stderr
for line in (
    "VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V1_SELF_TEST_GREEN",
    "two_cycle_target_start_stop=true","direct_service_action=false",
    "socket_cleanup_required_each_cycle=true",
    "custody_uid_process_exclusivity_required=true",
    "custody_uid_zero_one_zero_each_cycle=true",
    "child_process_census_executed=true",
    "second_custody_uid_process_rejected=true",
    "saved_fs_uid_slots_counted=true",
    "malformed_live_process_status_rejected=true",
    "unreadable_live_process_status_rejected=true",
    "training_uid_unreadable_status_rejected=true",
    "exact_runtime_argv_binding_required=true",
    "custody_environment_exact_required=true",
    "effective_systemd_configuration_bound=true",
    "systemd_dropins_rejected=true",
    "unexpected_systemd_exec_commands_rejected=true",
    "manager_environment_influence_unset=true",
    "failure_cleanup_receipt_truthful=true",
    "emergency_cleanup_adversaries_executed=true",
    "failed_stop_cleanup_reported=true",
    "wait_timeout_cleanup_reported=true",
    "socket_timeout_cleanup_reported=true",
    "alternate_runtime_config_rejected_by_exact_argv=true",
    "failure_final_dormant_recheck_required=true",
    "failure_preserves_original_reason=true",
    "consumed_state_unchanged_required=true",
    "training_execution=false","durable_attempt_claim=false","funds_movement=false",
):
    assert line in r.stdout,line
print("VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V1_PROOF_GREEN")
print("custody_uid_process_exclusivity_required=true")
print("custody_uid_zero_one_zero_each_cycle=true")
print("child_process_census_executed=true")
print("second_custody_uid_process_rejected=true")
print("saved_fs_uid_slots_counted=true")
print("malformed_live_process_status_rejected=true")
print("unreadable_live_process_status_rejected=true")
print("training_uid_unreadable_status_rejected=true")
print("exact_runtime_argv_binding_required=true")
print("custody_environment_exact_required=true")
print("effective_systemd_configuration_bound=true")
print("systemd_dropins_rejected=true")
print("unexpected_systemd_exec_commands_rejected=true")
print("manager_environment_influence_unset=true")
print("failure_cleanup_receipt_truthful=true")
print("emergency_cleanup_adversaries_executed=true")
print("failed_stop_cleanup_reported=true")
print("wait_timeout_cleanup_reported=true")
print("socket_timeout_cleanup_reported=true")
print("alternate_runtime_config_rejected_by_exact_argv=true")
print("failure_final_dormant_recheck_required=true")
print("failure_preserves_original_reason=true")

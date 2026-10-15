#!/usr/bin/env python3
from __future__ import annotations
import ast, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
Q=ROOT/"ops/xiphos/apollyon_live_custody_dormant_qualification_v1.py"
source=Q.read_text();ast.parse(source)
for required in (
    'TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"',
    'SERVICE_BLOB="83f363b331bc2331416fd1c0ca6d52f53371fef0"',
    'HELPER_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"',
    'LAUNCHER_BLOB="d23ff045d8c355401fed499c6bcffd503ba4c7fd"',
    'run(["/usr/bin/systemctl","start",TARGET_UNIT])',
    'run(["/usr/bin/systemctl","stop",TARGET_UNIT])',
    'st.st_nlink!=2',
    'wait_socket(False)',
    'assert_socket_parent_empty()',
    'target_maybe_started=True',
    'active not in ("inactive","failed")',
    'consumed_state_unchanged',
    'first_generation=(observations[0]["live"]["pid"],observations[0]["live"]["start_ticks"])',
    'second_generation=(observations[1]["live"]["pid"],observations[1]["live"]["start_ticks"])',
    'restart_safe_second_cycle_proven',
    'custody_uid_process_exclusivity_failed',
    'preexisting_custody_uid_process',
    'prestart_custody_uid_process',
    'custody_uid_process_after_stop',
    'final_custody_uid_process',
    'exact_dormant(TARGET_UNIT,"disabled")',
    'exact_dormant(SERVICE_UNIT,"static")',
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
    "second_custody_uid_process_rejected=true",
    "target_unit_file_state_disabled_required=true",
    "service_unit_file_state_static_required=true",
    "consumed_state_unchanged_required=true",
    "training_execution=false","durable_attempt_claim=false","funds_movement=false",
):
    assert line in r.stdout,line
print("VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V1_PROOF_GREEN")
print("custody_uid_process_exclusivity_required=true")
print("custody_uid_zero_one_zero_each_cycle=true")
print("second_custody_uid_process_rejected=true")

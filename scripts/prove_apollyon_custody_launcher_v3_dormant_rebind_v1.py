#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
UPDATER=ROOT/"ops/xiphos/apollyon_custody_launcher_v3_dormant_rebind_v1.py"
V3=ROOT/"tools/apollyon-authorization-custody-launcher-v3.mjs"
SERVICE=ROOT/"ops/xiphos/void-apollyon-authorization-custody-v1-launcher-v3.service"
QUALIFIER=ROOT/"ops/xiphos/apollyon_live_custody_dormant_qualification_v2.py"

def git_blob(path:Path)->str:
    data=path.read_bytes()
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

source=UPDATER.read_text(encoding="utf-8")
ast.parse(source)

assert git_blob(UPDATER)=="7eb3ae379a9e008421fd6f3d67bfb2aad5b22f08"
assert git_blob(V3)=="8d8561c08db7e500a818d269580dad15adca9f58"
assert git_blob(SERVICE)=="51354b10da89413eb6991514496798c7a1b5d1e8"
assert git_blob(QUALIFIER)=="fa3e468dd7718f79a3576d322bcf2ab6d8f30a15"

qualifier=QUALIFIER.read_text(encoding="utf-8")
for required in (
    'MARKER="VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V2"',
    'SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"',
    'LAUNCHER_BLOB="8d8561c08db7e500a818d269580dad15adca9f58"',
    'apollyon-authorization-custody-launcher-v3.mjs',
    'required=expected-{primary_gid}',
    'required.issubset(actual) and actual.issubset(expected)',
    'unit!=TARGET_UNIT',
    'normalize_show_properties(',
    'optional_empty=(',
):
    assert required in qualifier,required

for required in (
    'MARKER="VOID_APOLLYON_CUSTODY_LAUNCHER_V3_DORMANT_REBIND_V1"',
    'OLD_SERVICE_BLOB="30b7b7c62b6b7834ae91db1eb37df05286ca5764"',
    'NEW_SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"',
    'V2_LAUNCHER_BLOB="d23ff045d8c355401fed499c6bcffd503ba4c7fd"',
    'V3_LAUNCHER_BLOB="8d8561c08db7e500a818d269580dad15adca9f58"',
    'run(["/usr/bin/systemctl","daemon-reload"])',
    'V3_LAUNCHER_PENDING_PATH=',
    'launcher_destination_file(',
    'launcher_pending_file(',
    'RECOVER_V3_LAUNCHER_PENDING',
    'RESUME_V3_LAUNCHER_PUBLICATION',
    'FINALIZE_V3_LAUNCHER_PUBLICATION',
    'v3_launcher_pending_collision',
    'launcher_pending_resume_metadata_invalid',
    'launcher_pending_changed_after_fsync',
    'install_or_resume_launcher(launcher_data)',
    'service["ActiveState"] not in ("inactive","failed")',
    '"LoadState","ActiveState","UnitFileState","NeedDaemonReload"',
    'normalize_unit_props(',
    'parse_exec_property(',
    'loaded_exec_generation(',
    'loaded_generation=="v2"',
    'service_effective_execstart_invalid',
    'service_effective_execstoppost_invalid',
    'service_unexpected_exec_command:',
    'service["NoNewPrivileges"]!="yes"',
    'service["RestrictAddressFamilies"]!="AF_UNIX"',
    'uid_process_generations(',
    'uid_thread_inventory(',
    'custody_uid_thread_present:',
    'training_uid_thread_present:',
    'thread_status_unreadable:',
    'require_no_role_processes()',
    'require_trusted_ancestor_chain(',
    'trusted_ancestor_invalid:',
    'require_apply_source_custody()',
    'apply_source_not_root_custodied:',
    'apply_source_blob_invalid:',
    'os.replace(tmp,SERVICE_PATH)',
    '"service_action":False',
    '"target_action":False',
    '"training_action":False',
    '"durable_attempt_claim":False',
    '"training_execution":False',
):
    assert required in source,required

for forbidden in (
    'systemctl","start','systemctl","stop',
    "eth_sendRawTransaction","PRIVATE KEY-----",
):
    assert forbidden not in source,forbidden

r=subprocess.run(
    ["python3","-I","-B",str(UPDATER),"--self-test"],
    cwd=ROOT,stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=False,timeout=20,
)
assert r.returncode==0,r.stderr
for line in (
    "VOID_APOLLYON_CUSTODY_LAUNCHER_V3_DORMANT_REBIND_V1_SELF_TEST_GREEN",
    "processless_target_mainpid_not_required=true",
    "omitted_empty_service_exec_properties_normalized=true",
    "required_service_exec_properties_still_mandatory=true",
    "v2_launcher_preserved=true",
    "v3_launcher_create_only=true",
    "apply_root_custodied_source_required=true",
    "apply_payload_root_custody_required=true",
    "v3_launcher_crash_resumable_publication=true",
    "v3_launcher_pending_inode_bound=true",
    "v3_launcher_partial_pending_recovery=true",
    "v3_launcher_resumed_pending_fsync=true",
    "loaded_v2_forces_reload_even_without_need_reload_flag=true",
    "custody_uid_process_absence_required=true",
    "training_uid_process_absence_required=true",
    "saved_fs_uid_slots_counted=true",
    "all_four_uid_slots_counted=true",
    "all_tid_role_uid_census_required=true",
    "saved_fs_uid_only_threads_counted=true",
    "role_thread_census_repeated=true",
    "service_unit_atomic_replace=true",
    "daemon_reload_only_systemd_mutation=true",
    "service_action=false",
    "target_action=false",
    "training_action=false",
    "durable_attempt_claim=false",
    "training_execution=false",
    "funds_movement=false",
):
    assert line in r.stdout,line

print("VOID_APOLLYON_CUSTODY_LAUNCHER_V3_DORMANT_REBIND_V1_PROOF_GREEN")
print("updater_blob_bound=true")
print("processless_target_mainpid_not_required=true")
print("omitted_empty_service_exec_properties_normalized=true")
print("required_service_exec_properties_still_mandatory=true")
print("v3_launcher_blob_bound=true")
print("v3_service_blob_bound=true")
print("v3_qualifier_blob_bound=true")
print("v2_launcher_preserved=true")
print("v3_launcher_create_only=true")
print("apply_root_custodied_source_required=true")
print("apply_payload_root_custody_required=true")
print("v3_launcher_crash_resumable_publication=true")
print("v3_launcher_pending_inode_bound=true")
print("v3_launcher_partial_pending_recovery=true")
print("v3_launcher_resumed_pending_fsync=true")
print("loaded_v2_forces_reload_even_without_need_reload_flag=true")
print("custody_uid_process_absence_required=true")
print("training_uid_process_absence_required=true")
print("saved_fs_uid_slots_counted=true")
print("all_four_uid_slots_counted=true")
print("all_tid_role_uid_census_required=true")
print("saved_fs_uid_only_threads_counted=true")
print("role_thread_census_repeated=true")
print("service_unit_atomic_replace=true")
print("daemon_reload_only_systemd_mutation=true")
print("v3_qualifier_group_fix_bound=true")
print("service_action=false")
print("target_action=false")
print("training_action=false")
print("durable_attempt_claim=false")
print("training_execution=false")
print("funds_movement=false")

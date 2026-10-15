#!/usr/bin/env python3
from __future__ import annotations
import ast, hashlib, json, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"ops/xiphos/apollyon-custody-socket-lifecycle-update-v1.json"
UPDATER=ROOT/"ops/xiphos/apollyon_custody_socket_lifecycle_update_v1.py"
HELPER=ROOT/"ops/xiphos/apollyon_custody_stale_socket_cleanup_v1.py"
UNIT=ROOT/"ops/xiphos/void-apollyon-authorization-custody-v1.service"

def git_blob(path:Path)->str:
    data=path.read_bytes();h=hashlib.sha1();h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data);return h.hexdigest()

m=json.loads(MANIFEST.read_text())
assert m["marker"]=="VOID_APOLLYON_CUSTODY_SOCKET_LIFECYCLE_UPDATE_V1"
assert git_blob(MANIFEST)=="2d8381ceea5ef4cceab3b36250bb340eedd0a8a6"
assert m["old_service_blob_sha1"]=="6ff5315f3ada3607d86c865742c34d9de3238659"
assert m["new_service_blob_sha1"]=="86ed25003c554dcfe3019e71d5a3a78851fcc50a"
assert m["target_blob_sha1"]=="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
assert m["cleanup_blob_sha1"]=="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"
assert git_blob(HELPER)==m["cleanup_blob_sha1"]
assert git_blob(UNIT)==m["new_service_blob_sha1"]

source=UPDATER.read_text();ast.parse(source)
for required in (
    'MANIFEST_BLOB="2d8381ceea5ef4cceab3b36250bb340eedd0a8a6"',
    'OLD_SERVICE_BLOB="6ff5315f3ada3607d86c865742c34d9de3238659"',
    'NEW_SERVICE_BLOB="86ed25003c554dcfe3019e71d5a3a78851fcc50a"',
    'HELPER_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"',
    'unit_not_exactly_dormant:',
    'unit_file_state_unexpected:',
    'cleanup_custody_uid_process_exclusivity_required',
    'target_unit_file_state_required',
    'service_unit_file_state_required',
    'EXPECTED_UNSET_ENVIRONMENT=(',
    'loaded_unset_environment_invalid',
    'exact_dormant(TARGET_UNIT,"disabled")',
    'exact_dormant(SERVICE_UNIT,"static")',
    'os.replace(temp,SERVICE_PATH)',
    'run(["/usr/bin/systemctl","daemon-reload"])',
    '"socket_mutation":False',
):
    assert required in source,required
r=subprocess.run(
    ["python3","-I","-B",str(UPDATER),"--self-test"],
    cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=20,
)
assert r.returncode==0,r.stderr
for line in (
    "VOID_APOLLYON_CUSTODY_SOCKET_LIFECYCLE_UPDATE_V1_SELF_TEST_GREEN",
    "target_stop_control_required=true",
    "target_unit_file_state_disabled_required=true",
    "service_unit_file_state_static_required=true",
    "manager_environment_influence_unset=true",
    "service_action=false","target_action=false",
    "socket_mutation=false","training_execution=false","durable_attempt_claim=false",
):
    assert line in r.stdout,line
print("VOID_APOLLYON_CUSTODY_SOCKET_LIFECYCLE_UPDATE_V1_PROOF_GREEN")
print("target_unit_file_state_disabled_required=true")
print("service_unit_file_state_static_required=true")

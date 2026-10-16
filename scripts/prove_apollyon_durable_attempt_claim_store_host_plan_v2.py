#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
PLAN=ROOT/"ops/xiphos/apollyon_durable_attempt_claim_store_host_plan_v2.py"
CONTRACT=ROOT/"tools/apollyon-durable-attempt-claim-store-contract-v2.mjs"

def git_blob(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

source=PLAN.read_text(encoding="utf-8")
ast.parse(source)

assert git_blob(CONTRACT.read_bytes())=="6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe"
assert 'PARENT_HEAD="fe7e1ad9b78a24b77a1657067e4d08f7c56a7731"' in source
assert 'PARENT_CONTRACT_BLOB_SHA1="6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe"' in source

for required in (
    'TARGET_HOST="Xiphos"',
    'CLAIM_SERVICE_USER="voidapollyonclaim"',
    'CLAIM_PUBLISHER_USER="voidapollyonclaimpub"',
    'CLAIM_IPC_GROUP="voidapollyonclaimipc"',
    'CLAIM_STATE_ROOT=Path("/var/lib/void-apollyon-attempt-claim-v2")',
    'CLAIM_SOCKET_PARENT=Path("/run/void-apollyon-attempt-claim-v2")',
    'CLAIM_SERVICE_UNIT=Path("/etc/systemd/system/void-apollyon-attempt-claim-v2.service")',
    'CLAIM_SERVICE_SOURCE_ROOT=Path("/opt/void-apollyon-attempt-claim-v2-reviewed-v1")',
    'CLAIM_PUBLISHER_SOURCE_ROOT=Path("/opt/void-apollyon-attempt-claim-publisher-v2-reviewed-v1")',
    '"candidate_slots_selected_in_plan":True',
    '"candidate_slots_globally_distinct":True',
    '"candidate_slots_revalidation_required_before_provisioning":True',
    '"local_identity_authority":{',
    '"libc_nss_lookup_used":False',
    '"remote_nss_provider_allowed":False',
    '"identity_resolution_external_network_calls":False',
    '"claim_identity_provisioned":False',
    '"protected_claim_store_proven":False',
    '"durable_attempt_claim_performed":False',
    '"training_execution_performed":False',
    '"next_gate":"apollyon_durable_attempt_claim_store_service_source_candidate_v2"',
):
    assert required in source,required

for forbidden in (
    "subprocess",
    "os.system(",
    "os.mkdir(",
    ".mkdir(",
    "write_text(",
    "write_bytes(",
    "os.chown(",
    "os.chmod(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "shutil.",
    "systemctl",
    "useradd",
    "groupadd",
    "import pwd",
    "import grp",
    "pwd.",
    "grp.",
):
    assert forbidden not in source,forbidden

spec=importlib.util.spec_from_file_location("claim_store_host_plan_v2",PLAN)
assert spec is not None and spec.loader is not None
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.parse_login_defs(
    "SYS_UID_MIN 100\nSYS_UID_MAX 999\nSYS_GID_MIN 200\nSYS_GID_MAX 888\n"
)=={
    "SYS_UID_MIN":100,"SYS_UID_MAX":999,
    "SYS_GID_MIN":200,"SYS_GID_MAX":888,
}
assert module.choose_highest_free(100,106,{106,104,101},3)==[105,103,102]
assert module.parse_nsswitch_local_files_only(
    "passwd: files\ngroup: files\nhosts: files dns\n"
)=={"passwd":["files"],"group":["files"]}
for bad,reason in (
    ("passwd: files sss\ngroup: files\n","nsswitch_identity_source_not_files_only:passwd"),
    ("passwd: ldap\ngroup: files\n","nsswitch_identity_source_not_files_only:passwd"),
    ("passwd: compat\ngroup: files\n","nsswitch_identity_source_not_files_only:passwd"),
):
    try:
        module.parse_nsswitch_local_files_only(bad)
    except module.Hold as exc:
        assert str(exc)==reason
    else:
        raise AssertionError("unsafe NSS profile must HOLD")
passwd_rows=module.parse_passwd_file(
    "root:x:0:0:root:/root:/bin/bash\n"
    "zoso:x:1000:1000:ZoSo:/home/zoso:/bin/bash\n"
)
group_rows=module.parse_group_file(
    "root:x:0:\n"
    "zoso:x:1000:\n"
)
assert module.existing_user("zoso",passwd_rows)=={"name":"zoso","uid":1000,"gid":1000}
assert module.existing_group("zoso",group_rows)=={"name":"zoso","gid":1000}
try:
    module.parse_login_defs(
        "SYS_UID_MIN 100\nSYS_UID_MIN 101\nSYS_UID_MAX 999\n"
        "SYS_GID_MIN 100\nSYS_GID_MAX 999\n"
    )
except module.Hold as exc:
    assert str(exc)=="login_defs_duplicate:SYS_UID_MIN"
else:
    raise AssertionError("duplicate login.defs key must HOLD")
try:
    module.choose_highest_free(100,101,{100,101},1)
except module.Hold as exc:
    assert str(exc)=="candidate_selection_exhausted"
else:
    raise AssertionError("exhausted candidate range must HOLD")

r=subprocess.run(
    ["python3","-I","-B",str(PLAN),"--self-test"],
    cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=False,timeout=20,
)
assert r.returncode==0,r.stderr
for line in (
    "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2_SELF_TEST_GREEN",
    "read_only=true",
    "fixed_identity_names_bound=true",
    "fixed_paths_bound=true",
    "candidate_slot_selection_deterministic=true",
    "nsswitch_passwd_group_files_only_required=true",
    "libc_nss_lookup_used=false",
    "remote_nss_provider_rejected=true",
    "identity_resolution_external_network_calls=false",
    "candidate_slot_revalidation_required=true",
    "host_installation_performed=false",
    "durable_attempt_claim=false",
    "training_execution=false",
):
    assert line in r.stdout,line

negative=subprocess.run(
    ["python3","-I","-B",str(PLAN),"--run","--expected-parent-head",
     "fe7e1ad9b78a24b77a1657067e4d08f7c56a7731"],
    cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=False,timeout=20,
)
assert negative.returncode==2
assert "HOLD=wrong_host" in negative.stderr
for line in (
    "read_only=true",
    "filesystem_write=false",
    "account_mutation=false",
    "systemd_mutation=false",
    "service_action=false",
    "durable_attempt_claim=false",
    "training_execution=false",
):
    assert line in negative.stderr,line

print("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2_PROOF_GREEN")
print("parent_contract_exact_blob_bound=true")
print("hosted_live_run_negative_only=true")
print("nsswitch_passwd_group_files_only_required=true")
print("libc_nss_lookup_used=false")
print("remote_nss_provider_rejected=true")
print("candidate_slot_revalidation_required=true")
print("persistent_filesystem_write=false")
print("account_mutation=false")
print("systemd_mutation=false")
print("service_action=false")
print("durable_attempt_claim=false")
print("training_execution=false")

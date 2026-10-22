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

assert git_blob(V3)=="ec9e1d2c01581ebdc5323056939f846e67692fe6"
assert git_blob(SERVICE)=="51354b10da89413eb6991514496798c7a1b5d1e8"

qualifier=QUALIFIER.read_text(encoding="utf-8")
for required in (
    'MARKER="VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V2"',
    'SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"',
    'LAUNCHER_BLOB="ec9e1d2c01581ebdc5323056939f846e67692fe6"',
    'apollyon-authorization-custody-launcher-v3.mjs',
    'required=expected-{primary_gid}',
    'required.issubset(actual) and actual.issubset(expected)',
):
    assert required in qualifier,required

for required in (
    'MARKER="VOID_APOLLYON_CUSTODY_LAUNCHER_V3_DORMANT_REBIND_V1"',
    'OLD_SERVICE_BLOB="30b7b7c62b6b7834ae91db1eb37df05286ca5764"',
    'NEW_SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"',
    'V2_LAUNCHER_BLOB="d23ff045d8c355401fed499c6bcffd503ba4c7fd"',
    'V3_LAUNCHER_BLOB="ec9e1d2c01581ebdc5323056939f846e67692fe6"',
    'run(["/usr/bin/systemctl","daemon-reload"])',
    'create_exact(V3_LAUNCHER_PATH,launcher_data,0o444)',
    'service["ActiveState"] not in ("inactive","failed")',
    'require_trusted_ancestor_chain(',
    'trusted_ancestor_invalid:',
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
    "v2_launcher_preserved=true",
    "v3_launcher_create_only=true",
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
print("v3_launcher_blob_bound=true")
print("v3_service_blob_bound=true")
print("v2_launcher_preserved=true")
print("v3_launcher_create_only=true")
print("service_unit_atomic_replace=true")
print("daemon_reload_only_systemd_mutation=true")
print("v3_qualifier_group_fix_bound=true")
print("service_action=false")
print("target_action=false")
print("training_action=false")
print("durable_attempt_claim=false")
print("training_execution=false")
print("funds_movement=false")

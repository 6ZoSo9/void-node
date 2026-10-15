#!/usr/bin/env python3
from __future__ import annotations
import ast
import hashlib
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INSTALLER=ROOT/"ops/xiphos/apollyon_live_custody_source_session_create_only_install_v1.py"
MANIFEST=ROOT/"ops/xiphos/apollyon-custody-deployment-manifest-v1.json"

def git_blob(path:Path)->str:
    data=path.read_bytes()
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data)
    return h.hexdigest()

assert git_blob(MANIFEST)=="61db8c5c7f5a3018bd970bab16e08c7852f246cc"
source=INSTALLER.read_text(encoding="utf-8")
ast.parse(source)
for required in (
    'MARKER="VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1"',
    'EXPECTED_PUBLIC_RAW_SHA256="c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134"',
    'PREENTRY_BYTES=16912',
    'PREENTRY_SHA256="66d9b1c1fff316ecf96d7af73af7bf4a4442d6ce10f0e2df906fa1a79dc5580c"',
    '"/usr/sbin/groupadd","--system",name',
    '"/usr/sbin/usermod","--append","--groups",group,user',
    '"/usr/bin/systemd-tmpfiles","--create"',
    '"/usr/bin/systemctl","daemon-reload"',
    '"service_start":False',
    '"service_enable":False',
    '"training_execution":False',
    '"durable_attempt_claim":False',
    '"operator_private_key_access":False',
):
    assert required in source,required
for forbidden in (
    '"/usr/bin/systemctl","start"',
    '"/usr/bin/systemctl","enable"',
    '"/usr/bin/systemctl","restart"',
    "subprocess.Popen(",
    "shell=True",
    "PRIVATE KEY-----",
):
    assert forbidden not in source,forbidden

result=subprocess.run(
    ["python3","-I","-B",str(INSTALLER),"--self-test"],
    cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
    check=False,timeout=30,
)
assert result.returncode==0,result.stderr
for line in (
    "VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1_SELF_TEST_GREEN",
    "create_only=true","source_contract_verified=true",
    "public_key_raw_sha256=c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134",
    "preentry_sha256=66d9b1c1fff316ecf96d7af73af7bf4a4442d6ce10f0e2df906fa1a79dc5580c",
    "service_start=false","service_enable=false","training_execution=false",
    "durable_attempt_claim=false","funds_movement=false",
):
    assert line in result.stdout,line

print("VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1_PROOF_GREEN")
print("installer_self_test_green=true")
print("create_only=true")
print("service_start=false")
print("service_enable=false")
print("training_execution=false")
print("durable_attempt_claim=false")
print("funds_movement=false")

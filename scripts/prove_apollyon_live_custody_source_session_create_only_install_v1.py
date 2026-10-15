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

assert git_blob(MANIFEST)=="38c012255fa4855c1f1a689488d2aaf478fe186e"
source=INSTALLER.read_text(encoding="utf-8")
ast.parse(source)
for required in (
    'MARKER="VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1"',
    'EXPECTED_PUBLIC_RAW_SHA256="c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134"',
    'NODE_RUNTIME=Path("/opt/void-apollyon-node-runtime-v1/node")',
    'NODE_VERSION="v24.21.0"',
    'NODE_BYTES=126595440',
    'NODE_SHA256="7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c"',
    'PREENTRY_BYTES=798736',
    'PREENTRY_SHA256="2d705515d825051111b5fd9f99356466bf341056a0bf67d34b80a869a337d21d"',
    '"/usr/sbin/groupadd","--system",name',
    '"/usr/sbin/usermod","--append","--groups",group,user',
    '"/usr/bin/systemd-tmpfiles","--create"',
    '"/usr/bin/systemctl","daemon-reload"',
    '"service_start":False',
    '"service_enable":False',
    '"training_execution":False',
    '"durable_attempt_claim":False',
    '"operator_private_key_access":False',
    '"-static","-fno-pie","-no-pie"',
    'input=data,stdout=subprocess.PIPE',
    'public_key_generation_changed',
):
    assert required in source,required
for forbidden in (
    '"/usr/bin/systemctl","start"',
    '"/usr/bin/systemctl","enable"',
    '"/usr/bin/systemctl","restart"',
    "subprocess.Popen(",
    "shell=True",
    "PRIVATE KEY-----",
    '"-in",os.fspath(absolute)',
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
    "preentry_sha256=2d705515d825051111b5fd9f99356466bf341056a0bf67d34b80a869a337d21d",
    "node_runtime_required=true",
    "node_runtime_path=/opt/void-apollyon-node-runtime-v1/node",
    "node_runtime_sha256=7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c",
    "preentry_static_rederived=true",
    "public_key_retained_generation=true",
    "public_key_path_swap_rejected=true",
    "service_start=false","service_enable=false","training_execution=false",
    "durable_attempt_claim=false","funds_movement=false",
):
    assert line in result.stdout,line

print("VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1_PROOF_GREEN")
print("installer_self_test_green=true")
print("preentry_static_rederived=true")
print("public_key_retained_generation=true")
print("public_key_path_swap_rejected=true")
print("create_only=true")
print("service_start=false")
print("service_enable=false")
print("training_execution=false")
print("durable_attempt_claim=false")
print("funds_movement=false")

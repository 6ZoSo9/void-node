#!/usr/bin/env python3
from __future__ import annotations
import ast
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"ops/xiphos/apollyon-node-runtime-custody-v1.json"
INSTALLER=ROOT/"ops/xiphos/apollyon_node_runtime_create_only_install_v1.py"

manifest=json.loads(MANIFEST.read_text(encoding="utf-8"))
assert manifest["marker"]=="VOID_APOLLYON_NODE_RUNTIME_CUSTODY_V1"
assert manifest["version"]==1
assert manifest["target_host"]=="Xiphos"
assert manifest["source"]["path"]=="/opt/nodejs/node-v24.21.0-linux-x64/bin/node"
assert manifest["source"]["ownership_trusted"] is False
assert manifest["source"]["copied_binary_probe_qualified"] is True
assert manifest["installed"]["path"]=="/opt/void-apollyon-node-runtime-v1/node"
assert manifest["installed"]["owner"]=="root:root"
assert manifest["installed"]["mode"]=="0755"
assert manifest["installed"]["version"]=="v24.21.0"
assert manifest["installed"]["bytes"]==126595440
assert manifest["installed"]["sha256"]=="7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c"
assert manifest["installed"]["package_manager_required"] is False

source=INSTALLER.read_text(encoding="utf-8")
ast.parse(source)
result=subprocess.run(
    ["python3","-I","-B",str(INSTALLER),"--self-test"],
    cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
    check=False,timeout=30,
)
assert result.returncode==0,result.stderr
for line in (
    "VOID_APOLLYON_NODE_RUNTIME_CREATE_ONLY_INSTALL_V1_SELF_TEST_GREEN",
    "source_ownership_trusted=false",
    "source_content_hash_required=true",
    "destination_path=/opt/void-apollyon-node-runtime-v1/node",
    "node_version=v24.21.0",
    "node_bytes=126595440",
    "node_sha256=7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c",
    "package_mutation=false","systemd_mutation=false","service_mutation=false",
    "training_execution=false","durable_attempt_claim=false",
):
    assert line in result.stdout,line

print("VOID_APOLLYON_NODE_RUNTIME_CUSTODY_V1_PROOF_GREEN")
print("copy_candidate_qualified=true")
print("root_custodied_destination_required=true")
print("package_mutation=false")
print("service_mutation=false")
print("training_execution=false")

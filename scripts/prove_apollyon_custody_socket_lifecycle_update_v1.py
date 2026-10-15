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
assert git_blob(MANIFEST)=="b9f9b90de547ffd399f5f069d0638ec9203a93e6"
assert m["old_service_blob_sha1"]=="6ff5315f3ada3607d86c865742c34d9de3238659"
assert m["new_service_blob_sha1"]=="83f363b331bc2331416fd1c0ca6d52f53371fef0"
assert m["target_blob_sha1"]=="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
assert m["cleanup_blob_sha1"]=="6ab8a1d4e0d30af7d9f597476fbfb18bf33b13a5"
assert git_blob(HELPER)==m["cleanup_blob_sha1"]
assert git_blob(UNIT)==m["new_service_blob_sha1"]

source=UPDATER.read_text();ast.parse(source)
for required in (
    'MANIFEST_BLOB="b9f9b90de547ffd399f5f069d0638ec9203a93e6"',
    'OLD_SERVICE_BLOB="6ff5315f3ada3607d86c865742c34d9de3238659"',
    'NEW_SERVICE_BLOB="83f363b331bc2331416fd1c0ca6d52f53371fef0"',
    'HELPER_BLOB="6ab8a1d4e0d30af7d9f597476fbfb18bf33b13a5"',
    'unit_not_exactly_dormant:',
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
    "target_stop_control_required=true","service_action=false","target_action=false",
    "socket_mutation=false","training_execution=false","durable_attempt_claim=false",
):
    assert line in r.stdout,line
print("VOID_APOLLYON_CUSTODY_SOCKET_LIFECYCLE_UPDATE_V1_PROOF_GREEN")

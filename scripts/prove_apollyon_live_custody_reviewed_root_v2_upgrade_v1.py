#!/usr/bin/env python3
from __future__ import annotations
import ast, hashlib, json, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INSTALLER=ROOT/"ops/xiphos/apollyon_live_custody_reviewed_root_v2_upgrade_v1.py"
MANIFEST=ROOT/"ops/xiphos/apollyon-live-custody-reviewed-root-v2-upgrade-v1.json"

def git_blob(path:Path)->str:
    data=path.read_bytes();h=hashlib.sha1();h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data);return h.hexdigest()

manifest=json.loads(MANIFEST.read_text())
assert manifest["marker"]=="VOID_APOLLYON_LIVE_CUSTODY_REVIEWED_ROOT_V2_UPGRADE_V1"
assert git_blob(MANIFEST)=="7ba623dcfc226236a6da3a29e183bbd2b2fd563e"
assert manifest["from"]["reviewed_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v1"
assert manifest["to"]["reviewed_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v2"
assert manifest["from"]["fixed_launcher_blob_sha1"]=="e18124d3109ed63ff50da9c467fb1b798c300460"
assert manifest["to"]["fixed_launcher_blob_sha1"]=="820f7151c0f83280b7457f841cee14c3b0c274b6"
assert manifest["to"]["systemd_reviewed_versions"]==["255.4-1ubuntu8.11","255.4-1ubuntu8.18"]
assert manifest["authority"]["service_action"] is False
assert manifest["authority"]["training_execution"] is False
assert manifest["authority"]["durable_attempt_claim"] is False

source=INSTALLER.read_text()
ast.parse(source)
for required in (
    'UPGRADE_MANIFEST_BLOB="7ba623dcfc226236a6da3a29e183bbd2b2fd563e"',
    'OLD_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v1")',
    'NEW_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v2")',
    'OLD_LAUNCHER_BLOB="e18124d3109ed63ff50da9c467fb1b798c300460"',
    'NEW_LAUNCHER_BLOB="820f7151c0f83280b7457f841cee14c3b0c274b6"',
    "verify_tree(OLD_ROOT,manifest[\"from\"][\"closure\"])",
    "verify_tree(NEW_ROOT,manifest[\"to\"][\"closure\"])",
    "os.replace(temp,FIXED_LAUNCHER)",
    'os.rename(stage,NEW_ROOT)',
    "fsync_tree(stage)",
    'stage=NEW_ROOT.parent/(".void-apollyon-live-custody-binding-v2-reviewed-v2.new."+str(os.getpid()))',
    '"service_action":False',
    '"training_execution":False',
    '"durable_attempt_claim":False',
):
    assert required in source,required
for forbidden in ("subprocess.Popen(","shell=True","PRIVATE KEY-----","eth_sendRawTransaction"):
    assert forbidden not in source,forbidden

result=subprocess.run(
    ["python3","-I","-B",str(INSTALLER),"--self-test"],
    cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30,
)
assert result.returncode==0,result.stderr
for line in (
    "VOID_APOLLYON_LIVE_CUSTODY_REVIEWED_ROOT_V2_UPGRADE_V1_SELF_TEST_GREEN",
    "old_root_preserved=true",
    "new_root=/opt/void-apollyon-live-custody-binding-v2-reviewed-v2",
    "systemd_8_18_reviewed=true",
    "service_action=false","training_execution=false","durable_attempt_claim=false","funds_movement=false",
):
    assert line in result.stdout,line
print("VOID_APOLLYON_LIVE_CUSTODY_REVIEWED_ROOT_V2_UPGRADE_V1_PROOF_GREEN")

#!/usr/bin/env python3
from __future__ import annotations
import ast, json, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"ops/xiphos/apollyon-custody-target-stop-propagation-update-v1.json"
INSTALLER=ROOT/"ops/xiphos/apollyon_custody_target_stop_propagation_update_v1.py"
TARGET=ROOT/"ops/xiphos/void-apollyon-authorization-custody-v1.target"

manifest=json.loads(MANIFEST.read_text())
assert manifest["marker"]=="VOID_APOLLYON_CUSTODY_TARGET_STOP_PROPAGATION_UPDATE_V1"
def git_blob(path:Path)->str:
    import hashlib
    data=path.read_bytes();h=hashlib.sha1();h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data);return h.hexdigest()
assert git_blob(MANIFEST)=="a515adddc24791a5f8e0fba555b62f80eb3079cc"
assert manifest["old_blob_sha1"]=="d37ffefddb747d4c49f3ee70ea94a3612307a696"
assert manifest["new_blob_sha1"]=="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
assert manifest["propagates_stop_to_service"] is True
assert manifest["restart_propagation"] is False
assert manifest["authority"]["service_action"] is False
assert manifest["authority"]["target_action"] is False

target=TARGET.read_text()
assert "Wants=void-apollyon-authorization-custody-v1.service\n" in target
assert "PropagatesStopTo=void-apollyon-authorization-custody-v1.service\n" in target
assert "After=void-apollyon-authorization-custody-v1.service\n" in target

source=INSTALLER.read_text()
ast.parse(source)
for required in (
    'MANIFEST_BLOB="a515adddc24791a5f8e0fba555b62f80eb3079cc"',
    'OLD_TARGET_BLOB="d37ffefddb747d4c49f3ee70ea94a3612307a696"',
    'NEW_TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"',
    '"PropagatesStopTo"',
    'os.replace(temp,TARGET_PATH)',
    'run(["/usr/bin/systemctl","daemon-reload"])',
    '"service_action":False',
    '"target_action":False',
    'dormant_observation_valid',
    '"LoadState":"loaded"',
    '"ActiveState":"inactive"',
):
    assert required in source,required
assert '"is-active"' not in source

result=subprocess.run(
    ["python3","-I","-B",str(INSTALLER),"--self-test"],
    cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30,
)
assert result.returncode==0,result.stderr
for line in (
    "VOID_APOLLYON_CUSTODY_TARGET_STOP_PROPAGATION_UPDATE_V1_SELF_TEST_GREEN",
    "target_start_indirect_via_wants=true",
    "target_stop_propagates_to_service=true",
    "direct_service_start_stop_refused=true",
    "dormant_state_fail_closed=true",
    "service_action=false","target_action=false","training_execution=false","durable_attempt_claim=false",
):
    assert line in result.stdout,line
print("VOID_APOLLYON_CUSTODY_TARGET_STOP_PROPAGATION_UPDATE_V1_PROOF_GREEN")

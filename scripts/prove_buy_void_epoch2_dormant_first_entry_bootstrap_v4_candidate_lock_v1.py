#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
LOCK_REL="ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v4-candidate-lock-v1.json"
LOCK=ROOT/LOCK_REL
CANDIDATE_REL="scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v4_candidate_v1.py"
CANDIDATE=ROOT/CANDIDATE_REL
WORKFLOW_REL=".github/workflows/buy-void-epoch2-dormant-first-entry-bootstrap-v4-candidate-v1.yml"
DOC_REL="docs/operators/buy-void-epoch2-dormant-first-entry-bootstrap-v4-candidate-v1.md"
SOURCE_REL="ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4.c"
MANIFEST_REL="ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v1.conf"
INSTALLER_REL="ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3.py"

MARKER="VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V4_CANDIDATE_LOCK_V1"
LOCK_ID="voidbuye2dormantbootstraplock1_ffd5e877b4bf594b7af4eac3f03fd7b846686949febcae54318ef08ee5793796"

def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

lock_raw=LOCK.read_bytes()
lock=json.loads(lock_raw)
assert lock["marker"]==MARKER
assert lock["lock_id"]==LOCK_ID
material=dict(lock); material.pop("lock_id")
assert LOCK_ID=="voidbuye2dormantbootstraplock1_"+sha256(canonical(material))

assert lock["repository"]=="6ZoSo9/void-node"
assert lock["candidate_source_head"]=="4c6aeda7d7b718bd8f18a3135950e9e5215db2e3"
assert lock["candidate_merge"]=="e4f1330fbff7c5f5fb0801b5e961f5266adcb643"

sg=lock["source_generation"]
assert sg=={
  "id":"voidbuye2dormantsourcegen1_435345cd442c4d59760984c3445d178461cbbf163a0a53e760a392ca2d0bae77",
  "manifest_git_blob_sha1":"a484a7d2e1159ebbef3357ec849af92d7f12cff1",
  "manifest_bytes":2380,
  "manifest_sha256":"435345cd442c4d59760984c3445d178461cbbf163a0a53e760a392ca2d0bae77",
  "bootstrap_source_git_blob_sha1":"c7d2125b59dcbecc1d6aae8818e84cac8ce85da9",
  "bootstrap_source_bytes":60997,
  "bootstrap_source_sha256":"55228b9cb291bc6c758503735caa47367a8ac9f5c5db84a77e9b94f69d4db5ec",
  "inner_installer_git_blob_sha1":"242eac04da6e17d32e9a9baa9b57f572cabda7a8",
  "inner_installer_bytes":95062,
  "inner_installer_sha256":"ec9e52df14b018ec0983a8f2e33fc94e83e120fada679a62f7cf9849c8dbf374",
}

report=lock["candidate_report"]
assert report["candidate_id"]=="voidbuye2dormantbootstrapcand1_721cfebf78478734cd99a8bee2c669793fafdd76f435d7e47dd4d4f3e9f54713"
assert report["bytes"]==2566
assert report["sha256"]=="5be29b62f029c02e589057df91fb10f23e4aabc1aa87b6c14d22fd13ad7b6e7a"
assert report["git_blob_sha1"]=="e4bb1005f10f9047b6e1d6e16cb114ef94dcf110"
assert report["sealed_source_snapshot"] is True
assert report["toolchain_revalidated_after_build"] is True

binary=lock["native_binary"]
assert binary=={
  "bytes":839416,
  "sha256":"a4605ab39da0a37afe8ef7f6084b93f542a57dcbe8c3c9433c47481cb21c7ce3",
  "static_no_interp":True,
  "two_builds_byte_identical":True,
  "hosted_three_way_byte_identical":True,
  "independent_rederivation_verified":True,
}

hosted=lock["candidate_hosted_evidence"]
assert hosted["workflow_run"]==39017210026
assert [hosted["artifact_a"],hosted["artifact_b"],hosted["artifact_c"]]==[12095327369,12094844141,12095495855]
for key in ("three_report_byte_identity_verified","three_binary_byte_identity_verified","independent_rederivation_verified"):
    assert hosted[key] is True

expected_blobs={
  CANDIDATE_REL:"a14a7f56b1fb4ee14213fe9094adad14b45aae2f",
  WORKFLOW_REL:"2ef4201d71b8080144350c6f8442fea9c43c5b90",
  DOC_REL:"6990cffe5e68558856d044f42755d097604d8d02",
  SOURCE_REL:"c7d2125b59dcbecc1d6aae8818e84cac8ce85da9",
  MANIFEST_REL:"a484a7d2e1159ebbef3357ec849af92d7f12cff1",
  INSTALLER_REL:"242eac04da6e17d32e9a9baa9b57f572cabda7a8",
}
for rel,expected in expected_blobs.items():
    assert git_blob((ROOT/rel).read_bytes())==expected,(rel,git_blob((ROOT/rel).read_bytes()))

for key in ("candidate_accepted","native_binary_identity_accepted","source_generation_identity_accepted"):
    assert lock[key] is True
for key in (
  "protected_install_authorized","live_execution_authorized","credential_access_authorized",
  "private_key_access_authorized","signing_authorized","transaction_authorized","rpc_call_authorized",
  "payment_acceptance_authorized","public_presale_activation_authorized",
  "wc_void_market_activation_authorized","treasury_liquidity_action_authorized",
  "funds_movement_authorized","production_host_evidence_authority",
):
    assert lock[key] is False,key
assert lock["next_gate"]=="void_buy_void_epoch2_dormant_first_entry_bootstrap_v4_materializer_v1"

cp=subprocess.run(
  ["/usr/bin/python3","-I","-B",str(CANDIDATE),"--self-test"],
  cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
  text=True,check=False,timeout=30,
)
assert cp.returncode==0,cp.stderr
for line in (
  "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V4_CANDIDATE_V1_SELF_TEST_GREEN",
  "exact_source_generation_bound=true",
  "sealed_source_snapshot_required=true",
  "candidate_accepted=false",
  "protected_install_authorized=false",
  "funds_movement=false",
):
    assert line in cp.stdout.splitlines(),line

print(MARKER+"_PROOF_GREEN")
print("lock_id="+LOCK_ID)
print("hosted_three_way_candidate_identity_bound=true")
print("independent_rederivation_bound=true")
print("candidate_report_content_address_bound=true")
print("source_generation_identity_accepted=true")
print("candidate_accepted=true")
print("native_binary_identity_accepted=true")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("funds_movement_authorized=false")
print("next_gate=void_buy_void_epoch2_dormant_first_entry_bootstrap_v4_materializer_v1")

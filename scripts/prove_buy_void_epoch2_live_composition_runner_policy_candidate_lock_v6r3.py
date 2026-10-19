#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.json"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_live_composition_runner_policy_candidate_v6r3.py"
CANDIDATE_WORKFLOW=ROOT/".github/workflows/buy-void-epoch2-live-composition-runner-policy-candidate-v6r3.yml"
RUNNER=ROOT/"ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
COMPAT_CONTRACT=ROOT/"ops/precision/void_buy_void_epoch2_live_binding_source_runtime_compat_contract_v1.py"
COMPAT_PROOF=ROOT/"scripts/prove_buy_void_epoch2_live_binding_source_runtime_compat_contract_v1.py"
COMPAT_WORKFLOW=ROOT/".github/workflows/buy-void-epoch2-live-binding-source-runtime-compat-contract-v1.yml"
V6R2_LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"

MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_LOCK_V6R3"
LOCK_PREFIX="voidbuye2runnerpollock6r3_"
LOCK_ID="voidbuye2runnerpollock6r3_00b9bdf79f89a3c16cb1d1330e182bec748da4cf20367c3b50882b6728548202"
CANDIDATE_ID="voidbuye2runnerpolcand6r3_7efa1fbe6ea7d457fa8ea0ae59e5b528010957aa914a05b456b8c5443b5c0c6d"
RUNNER_BLOB="62029fafa7073ab3768fec01f2147a7f4eefce2b"
RUNNER_SHA256="0f87747439b82887033295cf04022c9a2a491c726f8d6acad8b0efc2e8dcdc71"
RUNNER_BYTES=51684
CANDIDATE_BLOB="cecca32b8c9de8105e92abea915bd142813eb429"
CANDIDATE_WORKFLOW_BLOB="439d270427c2bac9cffe1ea1877ab92dbf622673"
COMPAT_CONTRACT_BLOB="cb82a71cf83348f3709719cb1c8b44f3f687eabb"
COMPAT_PROOF_BLOB="528a5785814c2a89e9d692ee681090b1f19e9b11"
COMPAT_WORKFLOW_BLOB="7d2952394ec219f39e5d18dc96143685a6062d45"
V6R2_LOCK_BLOB="bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b"
NATIVE_SHA256="85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
NATIVE_BYTES=726976
RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

def canonical(value:object)->bytes:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")

def exact_file(path:Path,maximum:int)->bytes:
    before=path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
    assert before.st_nlink==1 and 0<before.st_size<=maximum
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    try:
        opened=os.fstat(fd)
        assert opened.st_dev==before.st_dev and opened.st_ino==before.st_ino
        chunks=[]; remaining=opened.st_size
        while remaining:
            chunk=os.read(fd,min(64*1024,remaining)); assert chunk
            chunks.append(chunk); remaining-=len(chunk)
        assert os.read(fd,1)==b""
        after=os.fstat(fd); visible=path.lstat()
        for field in ("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns"):
            assert getattr(opened,field)==getattr(after,field)==getattr(visible,field)
        return b"".join(chunks)
    finally:
        os.close(fd)

for path,expected,maximum in (
    (CANDIDATE,CANDIDATE_BLOB,2*1024*1024),
    (CANDIDATE_WORKFLOW,CANDIDATE_WORKFLOW_BLOB,256*1024),
    (RUNNER,RUNNER_BLOB,4*1024*1024),
    (COMPAT_CONTRACT,COMPAT_CONTRACT_BLOB,2*1024*1024),
    (COMPAT_PROOF,COMPAT_PROOF_BLOB,2*1024*1024),
    (COMPAT_WORKFLOW,COMPAT_WORKFLOW_BLOB,256*1024),
    (V6R2_LOCK,V6R2_LOCK_BLOB,128*1024),
):
    assert git_blob(exact_file(path,maximum))==expected,(path,expected)

lock=json.loads(exact_file(LOCK,256*1024))
assert lock["schema"]=="void_buy_void_epoch2_live_composition_runner_policy_candidate_lock_v6r3"
assert lock["marker"]==MARKER
assert lock["version"]==2
assert lock["candidate_head"]=="6bad5e7bea8db683b53622387923c493370b8e64"
assert lock["compatibility_hosted_evidence"]=={
    "workflow":"Buy VOID Epoch-2 live-binding source/runtime compatibility contract V1",
    "run_id":39272638928,
    "job_id":118128683759,
    "conclusion":"success",
}
assert lock["candidate_hosted_evidence"]=={
    "workflow":"Buy VOID Epoch-2 live-composition runner policy candidate V6R3",
    "run_id":39272637721,
    "job_id":118128679712,
    "conclusion":"success",
}
r=lock["candidate_report"]
assert r["candidate_id"]==CANDIDATE_ID
assert r["candidate_script_git_blob_sha1"]==CANDIDATE_BLOB
assert r["candidate_workflow_git_blob_sha1"]==CANDIDATE_WORKFLOW_BLOB
assert r["compat_contract_git_blob_sha1"]==COMPAT_CONTRACT_BLOB
assert r["compat_proof_git_blob_sha1"]==COMPAT_PROOF_BLOB
assert r["compat_workflow_git_blob_sha1"]==COMPAT_WORKFLOW_BLOB
assert r["runner_source_git_blob_sha1"]==RUNNER_BLOB
assert r["runner_sha256"]==RUNNER_SHA256
assert r["runner_bytes"]==RUNNER_BYTES
assert r["runtime_head"]==RUNTIME_HEAD
compat=r["source_compatibility"]
assert compat["current_source_head_runtime_observed"] is True
assert compat["current_source_tree_runtime_observed"] is True
assert compat["runtime_ancestor_required"] is True
assert compat["tracked_checkout_exact_required"] is True
assert compat["runtime_source_dependency_blob_equality_required"] is True
assert compat["untracked_paths_enumerated"] is False
assert compat["untracked_paths_source_authority"] is False
assert r["native_binary_sha256"]==NATIVE_SHA256
assert r["native_binary_bytes"]==NATIVE_BYTES
assert r["native_binary_identity_reused"] is True
assert r["native_binary_rebuild_required"] is False
assert r["policy_runtime_expected_head"]==RUNTIME_HEAD
assert r["policy_node_identity_derived_on_protected_host"] is True
assert r["source_head_must_not_replace_policy_runtime_head"] is True

for key in ("candidate_accepted","runner_identity_accepted","native_reuse_identity_accepted","policy_template_accepted"):
    assert lock[key] is True,key
assert lock["native_binary_rebuild_required"] is False
assert lock["superseded_install_authority"] is False
for key in (
    "protected_install_authorized","live_execution_authorized","credential_access_authorized",
    "private_key_access_authorized","signing_authorized","transaction_authorized",
    "rpc_call_authorized","payment_acceptance_authorized","public_presale_activation_authorized",
    "wc_void_market_activation_authorized","treasury_liquidity_action_authorized",
    "funds_movement_authorized","production_host_evidence_authority",
):
    assert lock[key] is False,key
assert lock["next_gate"]=="void_buy_void_epoch2_live_composition_runner_policy_upgrade_v6r3_plan"

material=dict(lock); observed=material.pop("lock_id")
assert observed==LOCK_ID==LOCK_PREFIX+sha256(canonical(material))

with tempfile.TemporaryDirectory(prefix="void-e2-v6r3-lock-v2-proof-") as td:
    out=Path(td)/"candidate.json"
    env={"PATH":os.environ.get("PATH","/usr/bin:/bin"),"HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"}
    for argv in (
        [sys.executable,"-I","-B",str(CANDIDATE),"--self-test"],
        [sys.executable,"-I","-B",str(CANDIDATE),"--derive",str(out)],
        [sys.executable,"-I","-B",str(CANDIDATE),"--verify",str(out)],
    ):
        cp=subprocess.run(argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding="utf-8",errors="strict",env=env,cwd=str(ROOT),timeout=60,check=False)
        assert cp.returncode==0,(argv,cp.stdout,cp.stderr)
        assert cp.stderr=="",(argv,cp.stderr)
    derived=json.loads(out.read_bytes())
    assert derived["candidate_id"]==CANDIDATE_ID
    assert derived["runner"]["sha256"]==RUNNER_SHA256
    assert derived["runner"]["bytes"]==RUNNER_BYTES
    assert derived["native_reuse"]["native_binary_sha256"]==NATIVE_SHA256

print(MARKER+"_PROOF_GREEN")
print("lock_id="+LOCK_ID)
print("candidate_id="+CANDIDATE_ID)
print("runner_git_blob_sha1="+RUNNER_BLOB)
print("runner_sha256="+RUNNER_SHA256)
print("runner_bytes="+str(RUNNER_BYTES))
print("compatibility_hosted_evidence_bound=true")
print("candidate_hosted_evidence_bound=true")
print("runtime_observed_source_compatibility_accepted=true")
print("v6r2_native_identity_reused=true")
print("native_binary_rebuild_required=false")
print("superseded_install_authority=false")
print("protected_install_authorized=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("funds_movement_authorized=false")

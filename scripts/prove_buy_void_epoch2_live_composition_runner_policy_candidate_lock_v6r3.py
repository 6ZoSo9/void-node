#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,os
from pathlib import Path
import subprocess,sys,tempfile

ROOT=Path(__file__).resolve().parents[1]
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.json"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_live_composition_runner_policy_candidate_v6r3.py"
CANDIDATE_WORKFLOW=ROOT/".github/workflows/buy-void-epoch2-live-composition-runner-policy-candidate-v6r3.yml"
RUNNER=ROOT/"ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
COMPAT_CONTRACT=ROOT/"ops/precision/void_buy_void_epoch2_live_binding_source_runtime_compat_contract_v1.py"
COMPAT_PROOF=ROOT/"scripts/prove_buy_void_epoch2_live_binding_source_runtime_compat_contract_v1.py"
COMPAT_WORKFLOW=ROOT/".github/workflows/buy-void-epoch2-live-binding-source-runtime-compat-contract-v1.yml"
V6R2_LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"

MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_LOCK_V6R3_MAIN_INTEGRATION"
LOCK_PREFIX="voidbuye2runnerpollock6r3_"
LOCK_ID="voidbuye2runnerpollock6r3_7dd8db2619e9c02ef8120e6d5e4e716946b991787dea7128fb51ed63290e4af7"
CANDIDATE_ID="voidbuye2runnerpolcand6r3_8ffc05fc997f4dc19a3174ca588b812afd126565235361bb6048170701ba1af1"
EXPECTED={
 CANDIDATE:"184cf2e0fef7c72377b0c5ff26ca268cf6a0735e",
 CANDIDATE_WORKFLOW:"eacf6ee3c203e65a412ef057a5fe6fc2104fa682",
 RUNNER:"340a0cf0eec589a44f20d44143e353ea25250973",
 COMPAT_CONTRACT:"daedec8934ae0488c26650920497b1a08b117a25",
 COMPAT_PROOF:"8ea5167e9ece28c9b8a633fc95a2ea054ecbc2df",
 COMPAT_WORKFLOW:"402267212f3280e54c204a124ccb26c332821f97",
 V6R2_LOCK:"bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b",
}
RUNNER_SHA256="c5976f6b96a5c29807fb188d0ede4f0fe812512f199a083272df2e1a7acb4953"
RUNNER_BYTES=70767
NATIVE_SHA256="85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"

def git_blob(raw:bytes)->str:
 return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()
def sha256(raw:bytes)->str:return hashlib.sha256(raw).hexdigest()
def canonical(v:object)->bytes:
 return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")
def exact(path:Path,maximum:int)->bytes:
 st=path.lstat()
 assert st.st_nlink==1 and st.st_size>0 and st.st_size<=maximum and not path.is_symlink()
 raw=path.read_bytes()
 st2=path.lstat()
 assert (st.st_dev,st.st_ino,st.st_size,st.st_mtime_ns,st.st_ctime_ns)==(st2.st_dev,st2.st_ino,st2.st_size,st2.st_mtime_ns,st2.st_ctime_ns)
 return raw

for path,want in EXPECTED.items():
 assert git_blob(exact(path,4*1024*1024))==want,(path,want)

raw_lock=exact(LOCK,256*1024)
lock=json.loads(raw_lock)
assert lock["schema"]=="void_buy_void_epoch2_live_composition_runner_policy_candidate_lock_v6r3"
assert lock["version"]==5
assert lock["repository"]=="6ZoSo9/void-node"
assert lock["integration_pr"]==3546
assert lock["integration_base_head"]=="0ada7fde0d90c3946b10693f4621cbd690bfcde6"
assert lock["integration_head"]=="a82f93fd11ecc76990cb73c844ec90b9503e8b9a"
assert lock["integration_tree"]=="d60bb8430377a46c81e5ddee5e92066cf9cbba90"
assert lock["stacked_source_head_superseded_for_current_authority"]=="cb8554553dcc97e4abb5a9f8f15a26a487773fb5"
assert lock["compatibility_hosted_evidence"]=={
 "workflow":"Buy VOID Epoch-2 live-binding source/runtime compatibility contract V1",
 "run_id":39319410007,"job_id":118289245313,"conclusion":"success",
}
assert lock["candidate_hosted_evidence"]=={
 "workflow":"Buy VOID Epoch-2 live-composition runner policy candidate V6R3",
 "run_id":39319409757,"job_id":118289244127,
 "identity_job_id":118289452867,"conclusion":"success",
}
r=lock["candidate_report"]
assert r["candidate_id"]==CANDIDATE_ID
assert r["candidate_script_git_blob_sha1"]==EXPECTED[CANDIDATE]
assert r["candidate_workflow_git_blob_sha1"]==EXPECTED[CANDIDATE_WORKFLOW]
assert r["compat_contract_git_blob_sha1"]==EXPECTED[COMPAT_CONTRACT]
assert r["compat_proof_git_blob_sha1"]==EXPECTED[COMPAT_PROOF]
assert r["compat_workflow_git_blob_sha1"]==EXPECTED[COMPAT_WORKFLOW]
assert r["runner_source_git_blob_sha1"]==EXPECTED[RUNNER]
assert r["runner_sha256"]==RUNNER_SHA256 and r["runner_bytes"]==RUNNER_BYTES
assert r["runtime_head"]==RUNTIME_HEAD
sc=r["source_compatibility"]
assert sc["historical_compat_v3_identity_recorded"] is True
assert sc["historical_compat_v3_materialization_required"] is False
assert sc["runtime_ancestor_required"] is True
assert sc["actual_object_ancestry_required"] is True
assert sc["revision_walk_metadata_authority"] is False
assert sc["graft_ancestry_authority"] is False
assert sc["tracked_checkout_exact_required"] is True
assert sc["runtime_source_dependency_blob_equality_required"] is True
assert sc["untracked_paths_source_authority"] is False
assert sc["canonical_git_dir_worktree_pinned_required"] is True
assert sc["sealed_probe_runtime_release_cwd_required"] is True
assert sc["runtime_release_root_custody_required"] is True
assert sc["runtime_release_path"]=="/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
assert r["native_binary_sha256"]==NATIVE_SHA256
assert r["native_binary_identity_reused"] is True
assert r["native_binary_rebuild_required"] is False
assert r["policy_runtime_expected_head"]==RUNTIME_HEAD
assert r["source_head_must_not_replace_policy_runtime_head"] is True
for k in ("candidate_accepted","runner_identity_accepted","native_reuse_identity_accepted","policy_template_accepted"):
 assert lock[k] is True
for k in ("protected_install_authorized","live_execution_authorized","credential_access_authorized","private_key_access_authorized","signing_authorized","transaction_authorized","rpc_call_authorized","payment_acceptance_authorized","public_presale_activation_authorized","wc_void_market_activation_authorized","treasury_liquidity_action_authorized","funds_movement_authorized","production_host_evidence_authority"):
 assert lock[k] is False,k
assert lock["superseded_install_authority"] is False
assert "voidbuye2runnerpollock6r3_bdd3e0b6fe28f2a6873920cdb1436914183e817c02b4d4ac9da130e3ec14b365" in lock["superseded_lock_ids"]
assert "voidbuye2runnerpollock6r3_1c5c5b31abd01aa6cf3f080b2cf666980f18a6a2daf22700127fd6d84951f74c" in lock["superseded_lock_ids"]
assert "voidbuye2runnerpollock6r3_7cce6937b504ce5ec9dd1fe7aaa303763035f9d6486a081619be346793787dc7" in lock["superseded_lock_ids"]
assert "voidbuye2runnerpolcand6r3_a9f60a75a96d74c9bbae89f6d9867886f6fb9b60b9a7bd7da4137c4502c2557f" in lock["superseded_candidate_ids"]
assert "voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d" in lock["superseded_candidate_ids"]
assert lock["next_gate"]=="void_buy_void_epoch2_live_composition_runner_policy_upgrade_v6r3_plan"
material=dict(lock); observed=material.pop("lock_id")
assert observed==LOCK_ID==LOCK_PREFIX+sha256(canonical(material))

with tempfile.TemporaryDirectory(prefix="void-v6r3-main-lock-proof-") as td:
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
 derived=json.loads(out.read_text())
 assert derived["candidate_id"]==CANDIDATE_ID
 assert derived["runner"]["sha256"]==RUNNER_SHA256
 assert derived["runner"]["bytes"]==RUNNER_BYTES
 assert derived["native_reuse"]["native_binary_sha256"]==NATIVE_SHA256

print(MARKER+"_PROOF_GREEN")
print("lock_id="+LOCK_ID)
print("candidate_id="+CANDIDATE_ID)
print("main_based_integration_proven=true")
print("stacked_lock_authority_superseded=true")
print("candidate_hosted_evidence_bound=true")
print("compatibility_hosted_evidence_bound=true")
print("historical_compat_v3_materialization_required=false")
print("actual_object_ancestry_required=true")
print("revision_walk_metadata_authority=false")
print("graft_ancestry_authority=false")
print("protected_install_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("funds_movement_authorized=false")

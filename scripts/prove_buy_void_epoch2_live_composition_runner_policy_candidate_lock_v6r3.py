#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.json"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_live_composition_runner_policy_candidate_v6r3.py"
CANDIDATE_WORKFLOW=ROOT/".github/workflows/buy-void-epoch2-live-composition-runner-policy-candidate-v6r3.yml"
RUNNER=ROOT/"ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
SEALED_V3=ROOT/"scripts/void_buy_void_epoch2_credential_attestation_sealed_v3.mjs"
COMPAT_CONTRACT=ROOT/"ops/precision/void_buy_void_epoch2_live_binding_source_runtime_compat_contract_v1.py"
COMPAT_PROOF=ROOT/"scripts/prove_buy_void_epoch2_live_binding_source_runtime_compat_contract_v1.py"
COMPAT_WORKFLOW=ROOT/".github/workflows/buy-void-epoch2-live-binding-source-runtime-compat-contract-v1.yml"
LOCK_WORKFLOW=ROOT/".github/workflows/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.yml"
V6R2_LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"

MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_CANDIDATE_LOCK_V6R3_MAIN_INTEGRATION"
LOCK_PREFIX="voidbuye2runnerpollock6r3_"
LOCK_ID="voidbuye2runnerpollock6r3_0633e059bfdfb1209b80b090adacddae61795ca610a6bf7f79059cc997148f52"
CANDIDATE_ID="voidbuye2runnerpolcand6r3_0a3bfc00032b0feeb253fb0f295b4dacc1e3e66af35013676351ed11e3c119e1"
SOURCE_EVIDENCE_HEAD="8729f4ca54543228ee99d5a50afc6a394c77bb28"
EXPECTED={
 CANDIDATE:"9f0df3d1f555c329763097f419b13d2cf89d210b",
 CANDIDATE_WORKFLOW:"a0ddc4b6b070b77cc546c5c4beb02fdb3696672c",
 RUNNER:"2fa028824d71a22f4d228cdb7fcda738bce7b409",
 SEALED_V3:"ad19417c7d25bfab532af3ea92f4a627d4cc857a",
 COMPAT_CONTRACT:"daedec8934ae0488c26650920497b1a08b117a25",
 COMPAT_PROOF:"710619a4b5dcc9c8fdf4c1ace65b5c7bd051e00c",
 COMPAT_WORKFLOW:"676fc24e89d67d1592e2ab1813b345f0ef1135db",
 LOCK_WORKFLOW:"3be91bbd75c771c3b83d19f48659e75cc3beceab",
 V6R2_LOCK:"bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b",
}
RUNNER_SHA256="9b8497c813fc3899b745736da01929380b5f28f988f70790def1e0a98b35a261"
RUNNER_BYTES=84928
NATIVE_SHA256="85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"

def git_blob(raw:bytes)->str:
 return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

def sha256(raw:bytes)->str:
 return hashlib.sha256(raw).hexdigest()

def canonical(v:object)->bytes:
 return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")

def exact(path:Path,maximum:int)->bytes:
 before=path.lstat()
 assert before.st_nlink==1 and before.st_size>0 and before.st_size<=maximum and not path.is_symlink()
 fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
 try:
  opened=os.fstat(fd)
  assert (opened.st_dev,opened.st_ino,opened.st_mode,opened.st_uid,opened.st_gid,opened.st_nlink,opened.st_size)==(
   before.st_dev,before.st_ino,before.st_mode,before.st_uid,before.st_gid,before.st_nlink,before.st_size)
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

observed={}
for path,want in EXPECTED.items():
 raw=exact(path,4*1024*1024)
 observed[path]=raw
 assert git_blob(raw)==want,(path,git_blob(raw),want)

runner_raw=observed[RUNNER]
assert len(runner_raw)==RUNNER_BYTES
assert sha256(runner_raw)==RUNNER_SHA256
runner_text=runner_raw.decode("utf-8")
for marker in (
 "retained_setpriv_generation_revalidated_descriptor_execution_required=true",
 "retained_python_generation_revalidated_descriptor_execution_required=true",
 "retained_git_descriptor_execution_required=true",
 "retained_node_descriptor_execution_required=true",
 "retained_procfd_portable_cwd_required=true",
 "retained_procfd_missing_cwd_errno_distinguished=true",
 'const SEALED_BLOB="ad19417c7d25bfab532af3ea92f4a627d4cc857a";',
 'const executable="/proc/self/fd/"+String(tool.fd);',
 'const setprivExecutable="/proc/self/fd/"+String(tools.setpriv.fd);',
):
 assert marker in runner_text,marker

raw_lock=exact(LOCK,256*1024)
lock=json.loads(raw_lock)
assert lock["schema"]=="void_buy_void_epoch2_live_composition_runner_policy_candidate_lock_v6r3"
assert lock["version"]==8
assert lock["repository"]=="6ZoSo9/void-node"
assert lock["integration_pr"]==3546
assert lock["source_evidence_pr"]==3566
assert lock["integration_base_head"]=="0ada7fde0d90c3946b10693f4621cbd690bfcde6"
assert lock["integration_head"]==SOURCE_EVIDENCE_HEAD
assert lock["integration_tree_binding"]=={
 "method":"git_commit_object",
 "head":SOURCE_EVIDENCE_HEAD,
 "verification_required":True,
}
assert lock["compatibility_hosted_evidence"]=={
 "workflow":"Buy VOID Epoch-2 live-binding source/runtime compatibility contract V1",
 "run_id":39350531700,"job_id":118393389094,"conclusion":"success",
}
assert lock["candidate_hosted_evidence"]=={
 "workflow":"Buy VOID Epoch-2 live-composition runner policy candidate V6R3",
 "run_id":39350532312,"job_id":118393391136,
 "identity_job_id":118393699442,"conclusion":"success",
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
assert r["sealed_v3_git_blob_sha1"]==EXPECTED[SEALED_V3]
assert r["sealed_v3_credential_open_nonblocking"] is True
assert r["sealed_v3_fifo_race_rejected"] is True
assert r["runtime_head"]==RUNTIME_HEAD
sc=r["source_compatibility"]
for key in (
 "runtime_ancestor_required",
 "actual_object_ancestry_required",
 "tracked_checkout_exact_required",
 "runtime_source_dependency_blob_equality_required",
 "canonical_git_dir_worktree_pinned_required",
 "sealed_probe_runtime_release_cwd_required",
 "runtime_release_root_custody_required",
 "retained_setpriv_descriptor_first_exec_required",
 "retained_python_descriptor_first_exec_required",
 "retained_git_descriptor_execution_required",
 "retained_node_descriptor_execution_required",
 "retained_procfd_portable_cwd_required",
 "retained_procfd_missing_cwd_errno_distinguished",
):
 assert sc[key] is True,key
for key in ("revision_walk_metadata_authority","graft_ancestry_authority","untracked_paths_source_authority"):
 assert sc[key] is False,key
assert r["native_binary_sha256"]==NATIVE_SHA256
assert r["native_binary_identity_reused"] is True
assert r["native_binary_rebuild_required"] is False
assert r["policy_runtime_expected_head"]==RUNTIME_HEAD
assert r["source_head_must_not_replace_policy_runtime_head"] is True
for k in ("candidate_accepted","runner_identity_accepted","native_reuse_identity_accepted","policy_template_accepted","sealed_v3_identity_accepted","retained_first_exec_identity_accepted"):
 assert lock[k] is True,k
for k in ("protected_install_authorized","live_execution_authorized","credential_access_authorized","private_key_access_authorized","signing_authorized","transaction_authorized","rpc_call_authorized","payment_acceptance_authorized","public_presale_activation_authorized","wc_void_market_activation_authorized","treasury_liquidity_action_authorized","funds_movement_authorized","production_host_evidence_authority"):
 assert lock[k] is False,k
assert lock["superseded_install_authority"] is False
assert "voidbuye2runnerpolcand6r3_aaa50e1bbfe2303045336c03be2bacd504a736a0fd04f97d4f38be7e76fbba7d" in lock["superseded_candidate_ids"]
assert "voidbuye2runnerpollock6r3_72ecfe7a0d5aa87237520290cdf63cf0faef821931ef094ac0ec5dd1858e496f" in lock["superseded_lock_ids"]
assert "voidbuye2runnerpollock6r3_dea4081ea3ee00d2bb94279ceae023bb74f9b2322c74e5b80e73981cfe1a6783" in lock["superseded_lock_ids"]
assert lock["next_gate"]=="void_buy_void_epoch2_live_composition_runner_policy_upgrade_v6r3_plan"
material=dict(lock); observed_id=material.pop("lock_id")
assert observed_id==LOCK_ID==LOCK_PREFIX+sha256(canonical(material))

node=shutil.which("node")
assert node is not None and os.path.isabs(node),"node_unavailable"
sealed_cp=subprocess.run(
 [node,str(SEALED_V3),"--self-test"],stdin=subprocess.DEVNULL,
 stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding="utf-8",errors="strict",
 env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"},
 cwd=str(ROOT),timeout=30,check=False,
)
assert sealed_cp.returncode==0,(sealed_cp.stdout,sealed_cp.stderr)
assert sealed_cp.stderr=="",sealed_cp.stderr
sealed_lines=set(sealed_cp.stdout.splitlines())
for line in (
 "VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_SEALED_V3_SELF_TEST_GREEN",
 "credential_regular_to_fifo_race_rejected=true",
 "credential_open_nonblocking_required=true",
 "credential_content_read=false",
 "signing_performed=false",
 "transaction_constructed=false",
 "funds_movement=false",
):
 assert line in sealed_lines,line

compat_cp=subprocess.run(
 [sys.executable,"-I","-B",str(COMPAT_PROOF)],
 stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
 text=True,encoding="utf-8",errors="strict",
 env={"PATH":os.environ.get("PATH","/usr/bin:/bin"),"HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"},
 cwd=str(ROOT),timeout=90,check=False,
)
assert compat_cp.returncode==0,(compat_cp.stdout,compat_cp.stderr)
assert compat_cp.stderr=="",compat_cp.stderr
compat_lines=set(compat_cp.stdout.splitlines())
for line in (
 "VOID_BUY_VOID_EPOCH2_LIVE_BINDING_SOURCE_RUNTIME_COMPAT_CONTRACT_V1_PROOF_GREEN",
 "runner_v4_retained_setpriv_generation_revalidated_descriptor_execution=true",
 "runner_v4_retained_python_generation_revalidated_descriptor_execution=true",
 "runner_v4_retained_git_descriptor_execution=true",
 "runner_v4_retained_node_descriptor_binding_contract=true",
 "credential_native_preentry_policy_binding_preserved=true",
 "credential_access=false","signing=false","transaction=false","funds_movement=false",
):
 assert line in compat_lines,line

with tempfile.TemporaryDirectory(prefix="void-v6r3-retained-first-exec-lock-proof-") as td:
 out=Path(td)/"candidate.json"
 env={"PATH":os.environ.get("PATH","/usr/bin:/bin"),"HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"}
 for argv in (
  [sys.executable,"-I","-B",str(CANDIDATE),"--self-test"],
  [sys.executable,"-I","-B",str(CANDIDATE),"--derive",str(out)],
  [sys.executable,"-I","-B",str(CANDIDATE),"--verify",str(out)],
 ):
  cp=subprocess.run(argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding="utf-8",errors="strict",env=env,cwd=str(ROOT),timeout=90,check=False)
  assert cp.returncode==0,(argv,cp.stdout,cp.stderr)
  assert cp.stderr=="",(argv,cp.stderr)
 derived=json.loads(out.read_text(encoding="utf-8"))
 assert derived["candidate_id"]==CANDIDATE_ID
 assert derived["runner"]["git_blob_sha1"]==EXPECTED[RUNNER]
 assert derived["runner"]["sha256"]==RUNNER_SHA256
 assert derived["runner"]["bytes"]==RUNNER_BYTES
 assert derived["native_reuse"]["native_binary_sha256"]==NATIVE_SHA256

print(MARKER+"_PROOF_GREEN")
print("lock_id="+LOCK_ID)
print("candidate_id="+CANDIDATE_ID)
print("source_evidence_pr=3566")
print("source_evidence_head="+SOURCE_EVIDENCE_HEAD)
print("integration_tree_bound_transitively_by_commit_sha1=true")
print("retained_first_exec_identity_accepted=true")
print("nonblocking_sealed_v3_identity_bound=true")
print("credential_fifo_race_rejected=true")
print("candidate_hosted_evidence_bound=true")
print("compatibility_hosted_evidence_bound=true")
print("protected_install_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("funds_movement_authorized=false")

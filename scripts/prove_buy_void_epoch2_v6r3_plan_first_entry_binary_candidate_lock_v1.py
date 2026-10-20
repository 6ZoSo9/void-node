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
LOCK=ROOT/"ops/security/buy-void-epoch2-v6r3-plan-first-entry-binary-candidate-lock-v1.json"
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_v6r3_plan_first_entry_v1.c"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_v6r3_plan_first_entry_binary_candidate_v1.py"
CANDIDATE_WORKFLOW=ROOT/".github/workflows/buy-void-epoch2-v6r3-plan-first-entry-binary-candidate-v1.yml"
LOCK_PREFIX="voidbuye2v6r3planfirstentrybinlock1_"
LOCK_ID="voidbuye2v6r3planfirstentrybinlock1_f6b452bb75542809454a0b68bae2f0049a4f2af6329e0b13075de1491bbbbc61"
CANDIDATE_ID="voidbuye2v6r3planfirstentrybincand1_b8b6b272caf246f14355a9fe37a218c672df5a8d4b647b66a0e6ca6c8345c124"
BINARY_SHA256="986e860593a1aaef34dc6d1ffbd44f626a2bed9512d96be79f1fbcfdc176f2cd"
BINARY_BYTES=813064
EXPECTED={
    SOURCE:"ae26706a117025893496901d4bde8cee87cadfba",
    CANDIDATE:"3bc17f9cb079da5790aac1356105883d4aa903a1",
    CANDIDATE_WORKFLOW:"195fc4dc5aa389827373ebefb621cf0a5a439cca",
}

def canonical(value:object)->bytes:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

def exact(path:Path,maximum:int)->bytes:
    before=path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
    assert before.st_nlink==1 and 0<before.st_size<=maximum
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        opened=os.fstat(fd)
        fields=("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns")
        assert all(getattr(before,k)==getattr(opened,k) for k in fields)
        chunks=[];remaining=opened.st_size
        while remaining:
            chunk=os.read(fd,min(65536,remaining));assert chunk
            chunks.append(chunk);remaining-=len(chunk)
        assert os.read(fd,1)==b""
        after=os.fstat(fd);visible=path.lstat()
        assert all(getattr(opened,k)==getattr(after,k)==getattr(visible,k) for k in fields)
        return b"".join(chunks)
    finally:
        os.close(fd)

for path,want in EXPECTED.items():
    assert git_blob(exact(path,4*1024*1024))==want,(path,want)

raw=exact(LOCK,128*1024)
lock=json.loads(raw)
assert lock["schema"]=="void_buy_void_epoch2_v6r3_plan_first_entry_binary_candidate_lock_v1"
assert lock["marker"]=="VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_BINARY_CANDIDATE_LOCK_V1"
assert lock["version"]==1 and lock["repository"]=="6ZoSo9/void-node"
assert lock["source_pr"]==3571
assert lock["source_head"]=="a7d2c3241f74950f58ba02088a06e4ec235f0b0f"
assert lock["source_git_blob_sha1"]==EXPECTED[SOURCE]
assert lock["source_hosted_evidence"]=={
    "workflow":"Buy VOID Epoch-2 V6R3 planner native first-entry V1",
    "run_id":39357595530,"job_id":118415896770,"conclusion":"success",
}
assert lock["candidate_pr"]==3573
assert lock["candidate_head"]=="9d9ac685da06ba9a141109091a5b1c6490aa34b2"
assert lock["candidate_script_git_blob_sha1"]==EXPECTED[CANDIDATE]
assert lock["candidate_workflow_git_blob_sha1"]==EXPECTED[CANDIDATE_WORKFLOW]
assert lock["candidate_hosted_evidence"]=={
    "workflow":"Buy VOID Epoch-2 V6R3 planner first-entry binary candidate V1",
    "run_id":39357902711,
    "derive_jobs":{"a":118416894790,"b":118416894807,"c":118416894656},
    "compare_job_id":118417015303,
    "conclusion":"success",
}
report=lock["candidate_report"]
assert report["candidate_id"]==CANDIDATE_ID
assert report["source"]["git_blob_sha1"]==EXPECTED[SOURCE]
assert report["binary"]["sha256"]==BINARY_SHA256
assert report["binary"]["bytes"]==BINARY_BYTES
assert report["binary"]["static_link_verified"] is True
assert report["binary"]["pt_interp_absent"] is True
assert report["binary"]["two_builds_byte_identical"] is True
assert report["source_contract"]["close_range_unshare_required"] is True
assert report["source_contract"]["inherited_fd_census_required"] is True
assert report["source_contract"]["planner_sealed_memfd_execution"] is True
assert report["source_contract"]["python_sealed_memfd_fexecve"] is True
assert report["authority"]["candidate_binary_identity_accepted"] is False
assert report["authority"]["protected_install_authorized"] is False
assert report["authority"]["host_plan_authorized"] is False
assert lock["candidate_binary_identity_accepted"] is True
assert lock["source_identity_accepted"] is True
assert lock["compile_recipe_accepted"] is True
assert lock["three_run_report_bytes_identical"] is True
for key in (
    "protected_install_authorized","installed_binary_identity_proven",
    "host_plan_authorized","service_mutation","systemd_mutation",
    "credential_access","private_key_access","signing","transaction","rpc_call",
    "payment_acceptance","public_presale_activation","wc_void_market_activation",
    "treasury_liquidity_action","funds_movement",
):
    assert lock[key] is False,key
assert lock["next_gate"]=="void_buy_void_epoch2_v6r3_plan_first_entry_python_runtime_closure_v1"
material=dict(lock);observed=material.pop("lock_id")
assert observed==LOCK_ID==LOCK_PREFIX+sha256(canonical(material))

env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC","SOURCE_DATE_EPOCH":"0"}
self_cp=subprocess.run(
    [sys.executable,"-I","-B",str(CANDIDATE),"--self-test"],
    stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    env=env,text=True,encoding="utf-8",errors="strict",timeout=180,check=False,
)
assert self_cp.returncode==0,(self_cp.stdout,self_cp.stderr)
assert self_cp.stderr=="",self_cp.stderr
assert "authority_overclaim_rejected=true" in set(self_cp.stdout.splitlines())

with tempfile.TemporaryDirectory(prefix="void-e2-v6r3-first-entry-lock-proof-") as td:
    out=Path(td)/"candidate.json"
    cp=subprocess.run(
        [sys.executable,"-I","-B",str(CANDIDATE),"--derive",str(out)],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        env=env,text=True,encoding="utf-8",errors="strict",timeout=180,check=False,
    )
    assert cp.returncode==0,(cp.stdout,cp.stderr)
    assert cp.stderr=="",cp.stderr
    derived=json.loads(exact(out,128*1024))
    assert derived==report
    assert derived["candidate_id"]==CANDIDATE_ID
    assert derived["binary"]["sha256"]==BINARY_SHA256
    assert derived["binary"]["bytes"]==BINARY_BYTES

print("VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_BINARY_CANDIDATE_LOCK_V1_PROOF_GREEN")
print("lock_id="+LOCK_ID)
print("candidate_id="+CANDIDATE_ID)
print("binary_sha256="+BINARY_SHA256)
print("binary_bytes="+str(BINARY_BYTES))
print("three_run_report_bytes_identical=true")
print("candidate_binary_identity_accepted=true")
print("protected_install_authorized=false")
print("installed_binary_identity_proven=false")
print("host_plan_authorized=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")

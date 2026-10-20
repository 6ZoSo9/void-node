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
LOCK=ROOT/"ops/security/buy-void-epoch2-v6r3-plan-first-entry-binary-candidate-lock-v2.json"
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_v6r3_plan_first_entry_v1.c"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_v6r3_plan_first_entry_binary_candidate_v2.py"
CANDIDATE_WORKFLOW=ROOT/".github/workflows/buy-void-epoch2-v6r3-plan-first-entry-binary-candidate-v2.yml"
LOCK_PREFIX="voidbuye2v6r3planfirstentrybinlock2_"
LOCK_ID="voidbuye2v6r3planfirstentrybinlock2_f6b452bb75542809454a0b68bae2f0049a4f2af6329e0b13075de1491bbbbc61"
CANDIDATE_ID="voidbuye2v6r3planfirstentrybincand2_b8b6b272caf246f14355a9fe37a218c672df5a8d4b647b66a0e6ca6c8345c124"
BINARY_SHA256="b3043169c466ab96a953d00fedd960817e982bf45897ac6b3259baaaeb0e81dd"
BINARY_BYTES=813184
EXPECTED={
    SOURCE:"8d06482b5cc313cc1609371493112e737f89abc2",
    CANDIDATE:"c25da9c7824ed7833ec99e1c000a55d37a2cd674",
    CANDIDATE_WORKFLOW:"34d40766789f1f41bee6dbb94bb6740bf400c86f",
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
assert lock["schema"]=="void_buy_void_epoch2_v6r3_plan_first_entry_binary_candidate_lock_v2"
assert lock["marker"]=="VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_BINARY_CANDIDATE_LOCK_V2"
assert lock["version"]==2 and lock["repository"]=="6ZoSo9/void-node"
assert lock["source_pr"]==3585
assert lock["source_head"]=="0c28e7941e701f32bece90f1a892b0b6ce1864c7"
assert lock["source_git_blob_sha1"]==EXPECTED[SOURCE]
assert lock["source_hosted_evidence"]=={
    "workflow":"Buy VOID Epoch-2 V6R3 planner native first-entry V1",
    "run_id":39392551384,"job_id":118527323517,"conclusion":"success",
}
assert lock["candidate_pr"]==3587
assert lock["candidate_head"]=="51b66221e7d3aa5dfb9d7fdee4429c01d5eb92a9"
assert lock["candidate_script_git_blob_sha1"]==EXPECTED[CANDIDATE]
assert lock["candidate_workflow_git_blob_sha1"]==EXPECTED[CANDIDATE_WORKFLOW]
assert lock["candidate_hosted_evidence"]=={
    "workflow":"Buy VOID Epoch-2 V6R3 planner first-entry binary candidate V2",
    "run_id":39414505654,
    "derive_jobs":{"a":118600112860,"b":118600113154,"c":118600113258},
    "compare_job_id":118600636580,
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
assert report["source_contract"]["root_opened_output_sink_rejected"] is True
assert report["source_contract"]["inherited_securebits_checked"] is True
assert report["source_contract"]["postdrop_capsets_cleared"] is True
assert report["authority"]["candidate_binary_identity_accepted"] is False
assert report["authority"]["protected_install_authorized"] is False
assert report["authority"]["host_plan_authorized"] is False
assert lock["candidate_binary_identity_accepted"] is True
assert lock["source_identity_accepted"] is True
assert lock["compile_recipe_accepted"] is True
assert lock["three_run_report_bytes_identical"] is True
assert lock["independent_security_review_satisfied"] is False
assert lock["python_runtime_closure_accepted"] is False
assert lock["post_exec_dumpability_isolation_accepted"] is False
assert lock["production_binary_install_authorized"] is False
for key in (
    "protected_install_authorized","installed_binary_identity_proven",
    "host_plan_authorized","service_mutation","systemd_mutation",
    "credential_access","private_key_access","signing","transaction","rpc_call",
    "payment_acceptance","public_presale_activation","wc_void_market_activation",
    "treasury_liquidity_action","funds_movement",
):
    assert lock[key] is False,key
assert lock["next_gate"]=="void_buy_void_epoch2_v6r3_plan_first_entry_python_runtime_closure_v2"
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

print("VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_BINARY_CANDIDATE_LOCK_V2_PROOF_GREEN")
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

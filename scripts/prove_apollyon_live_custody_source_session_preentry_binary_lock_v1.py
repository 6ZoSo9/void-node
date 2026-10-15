#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

MARKER="VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_PREENTRY_BINARY_LOCK_V1"
VERIFY_MARKER=MARKER+"_VERIFIED"
ROOT=Path(__file__).resolve().parents[1]
PARENT="42555f4df48ad68768781669824ebdc477dddcb6"
SOURCE="ops/xiphos/apollyon_live_custody_source_session_preentry_v2.c"
SOURCE_BLOB="1d0d9893939d1a457970b3b1f16dae06e7fef067"
SOURCE_SHA="51625ad6bb3e570e77aef491483a7b4c0dccdeca971f524658f5ac401bdcb9d7"
CANDIDATE_PROOF="scripts/prove_apollyon_live_custody_source_session_preentry_binary_candidate_v1.py"
CANDIDATE_PROOF_BLOB="5a7f676d8934b01f80a0424b81701faa94de0dee"
CANDIDATE_WORKFLOW=".github/workflows/apollyon-live-custody-source-session-preentry-binary-candidate-v1.yml"
CANDIDATE_WORKFLOW_BLOB="0482c24bcb939132dcfbb82ba5fcd039c0c55fdb"
LOCK="ops/security/apollyon-live-custody-source-session-preentry-binary-lock-v1.json"
LOCK_ID="apollyon_live_custody_source_session_preentry_binary_lock_v1:89778e9fce5f93a0192ee73c47977b8d91e326950ef25954bad75f0316045e69"
CANDIDATE_ID="apollyon_live_custody_source_session_preentry_binary_candidate_v1:e9a3c53682375bbb459015de5bf6110e36f8c725d553acdf6bffabdfdb787104"
BINARY_SHA="2d705515d825051111b5fd9f99356466bf341056a0bf67d34b80a869a337d21d"
BINARY_BYTES=798736
SELF_TEST_SHA="97d7358d1a6dfffd42e293e3a4b1f70a41b6eace5fe6eec8409ae7ff97cc0c69"
HOSTED_RUN=38730748696

GIT_ENV={
    "PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C",
    "GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null",
    "GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1",
    "GIT_OPTIONAL_LOCKS":"0","GIT_TERMINAL_PROMPT":"0",
    "GIT_ASKPASS":"/bin/false",
}
DERIVE_ENV={
    "PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C",
    "SOURCE_DATE_EPOCH":"0",
}

def canonical(value)->str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=True)

def sha256(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()

def git_blob(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

def bounded(path:Path,label:str,max_bytes:int=1024*1024)->bytes:
    st=path.lstat()
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_nlink!=1 or st.st_size<1 or st.st_size>max_bytes
    ):
        raise AssertionError(label+"_metadata_invalid")
    data=path.read_bytes()
    after=path.lstat()
    if (
        len(data)!=st.st_size or after.st_dev!=st.st_dev or
        after.st_ino!=st.st_ino or after.st_size!=st.st_size or
        after.st_mtime_ns!=st.st_mtime_ns or after.st_ctime_ns!=st.st_ctime_ns
    ):
        raise AssertionError(label+"_changed_during_read")
    return data

def git(args:list[str])->str:
    result=subprocess.run(
        ["/usr/bin/git","--no-replace-objects","-C",os.fspath(ROOT),*args],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=20,env=GIT_ENV,
    )
    if result.returncode!=0:
        raise AssertionError("git_failed:"+result.stderr[-800:])
    return result.stdout.strip()

def bind_repository()->None:
    git(["merge-base","--is-ancestor",PARENT,"HEAD"])
    if git(["status","--porcelain=v1","--untracked-files=all"]):
        raise AssertionError("worktree_not_clean")
    for rel,expected in (
        (SOURCE,SOURCE_BLOB),
        (CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB),
        (CANDIDATE_WORKFLOW,CANDIDATE_WORKFLOW_BLOB),
    ):
        data=bounded(ROOT/rel,rel)
        if (
            git_blob(data)!=expected or
            git(["rev-parse","--verify","HEAD:"+rel])!=expected
        ):
            raise AssertionError("reviewed_blob_drift:"+rel)

def derive_candidate()->dict:
    with tempfile.TemporaryDirectory(prefix="void-apollyon-live-session-lock-") as td:
        output=Path(td)/"candidate.json"
        result=subprocess.run(
            [
                "/usr/bin/python3","-I","-B",os.fspath(ROOT/CANDIDATE_PROOF),
                "--derive",os.fspath(output),
            ],
            cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,text=True,check=False,timeout=90,env=DERIVE_ENV,
        )
        if result.returncode!=0:
            raise AssertionError(
                "candidate_rederive_failed:"+(result.stderr or result.stdout)[-1600:]
            )
        raw=bounded(output,"candidate_report",64*1024)
    candidate=json.loads(raw)
    if canonical(candidate).encode()+b"\n"!=raw:
        raise AssertionError("candidate_not_canonical")
    return candidate

def lock_material(lock:dict)->dict:
    return {k:v for k,v in lock.items() if k!="lock_id"}

def recompute_lock_id(lock:dict)->str:
    return (
        "apollyon_live_custody_source_session_preentry_binary_lock_v1:"+
        sha256(canonical(lock_material(lock)).encode())
    )

def validate(lock:dict,candidate:dict,require_reviewed_id:bool=True)->None:
    if lock.get("schema")!="void_apollyon_live_custody_source_session_preentry_binary_lock_v1":
        raise AssertionError("lock_schema_invalid")
    if (
        lock.get("marker")!=MARKER or type(lock.get("version")) is not int or
        lock["version"]!=1
    ):
        raise AssertionError("lock_marker_version_invalid")
    if (
        lock.get("repository")!="6ZoSo9/void-node" or
        lock.get("candidate_parent_head")!=PARENT
    ):
        raise AssertionError("lock_parent_invalid")
    if lock.get("lock_id")!=recompute_lock_id(lock):
        raise AssertionError("lock_content_id_invalid")
    if (
        lock.get("source")!=candidate.get("source") or
        lock["source"].get("git_blob_sha1")!=SOURCE_BLOB or
        lock["source"].get("sha256")!=SOURCE_SHA
    ):
        raise AssertionError("lock_source_mismatch")
    if lock.get("candidate_proof")!={
        "path":CANDIDATE_PROOF,"git_blob_sha1":CANDIDATE_PROOF_BLOB
    }:
        raise AssertionError("lock_candidate_proof_mismatch")
    if lock.get("candidate_workflow")!={
        "path":CANDIDATE_WORKFLOW,"git_blob_sha1":CANDIDATE_WORKFLOW_BLOB
    }:
        raise AssertionError("lock_candidate_workflow_mismatch")
    for key in ("compiler","compile_recipe","toolchain","binary","self_test"):
        if lock.get(key)!=candidate.get(key):
            raise AssertionError("lock_"+key+"_mismatch")
    if (
        lock["binary"].get("bytes")!=BINARY_BYTES or
        lock["binary"].get("sha256")!=BINARY_SHA
    ):
        raise AssertionError("lock_binary_identity_mismatch")
    if lock["self_test"].get("stdout_sha256")!=SELF_TEST_SHA:
        raise AssertionError("lock_self_test_mismatch")
    for key in (
        "static_link_required","pt_interp_absent",
        "hostile_ld_preload_positive_control",
        "hostile_ld_preload_preentry_blocked",
    ):
        if lock["binary"].get(key) is not True:
            raise AssertionError("lock_loader_independence_missing:"+key)
    if (
        lock.get("candidate_id")!=CANDIDATE_ID or
        lock["candidate_id"]!=candidate.get("candidate_id")
    ):
        raise AssertionError("lock_candidate_id_mismatch")
    if lock.get("hosted_evidence")!={
        "workflow_run":HOSTED_RUN,
        "three_reports_byte_identical":True,
        "comparison_rederived_elf":True,
        "static_toolchain_closure_bound":True,
    }:
        raise AssertionError("lock_hosted_evidence_mismatch")
    if lock.get("candidate_binary_identity_accepted") is not True:
        raise AssertionError("candidate_binary_identity_not_accepted")
    for key in (
        "installed_preentry_identity_proven","installed_execution_closure_proven",
        "live_source_session_execution","durable_attempt_claim","training_execution",
        "candidate_weight_mutation","service_action","operator_private_key_access",
        "wallet_access","transaction_signing","funds_movement",
    ):
        if lock.get(key) is not False:
            raise AssertionError("lock_authority_overclaim:"+key)
    if lock.get("next_gate")!="apollyon_live_custody_source_session_create_only_install_v1":
        raise AssertionError("lock_next_gate_invalid")
    if require_reviewed_id and lock.get("lock_id")!=LOCK_ID:
        raise AssertionError("reviewed_lock_id_mismatch")

def load_verified()->tuple[dict,dict]:
    bind_repository()
    raw=bounded(ROOT/LOCK,"lock",64*1024)
    lock=json.loads(raw)
    if canonical(lock).encode()+b"\n"!=raw:
        raise AssertionError("lock_not_canonical")
    candidate=derive_candidate()
    validate(lock,candidate)
    return lock,candidate

def receipt(lock:dict,candidate:dict)->dict:
    return {
        "marker":VERIFY_MARKER,
        "version":1,
        "lock_id":lock["lock_id"],
        "candidate_id":candidate["candidate_id"],
        "candidate_parent_head":PARENT,
        "source_git_blob_sha1":candidate["source"]["git_blob_sha1"],
        "binary_bytes":candidate["binary"]["bytes"],
        "binary_sha256":candidate["binary"]["sha256"],
        "static_link_required":candidate["binary"]["static_link_required"],
        "pt_interp_absent":candidate["binary"]["pt_interp_absent"],
        "hostile_ld_preload_positive_control":candidate["binary"]["hostile_ld_preload_positive_control"],
        "hostile_ld_preload_preentry_blocked":candidate["binary"]["hostile_ld_preload_preentry_blocked"],
        "comparison_rederived_elf":True,
        "static_toolchain_closure_bound":True,
        "candidate_binary_identity_accepted":True,
        "installed_preentry_identity_proven":False,
        "installed_execution_closure_proven":False,
        "live_source_session_execution":False,
        "durable_attempt_claim":False,
        "training_execution":False,
        "funds_movement":False,
    }

def self_test()->None:
    lock,candidate=load_verified()
    for field,error in (("binary","lock_binary"),("source","lock_source")):
        bad=copy.deepcopy(lock)
        if field=="binary":
            bad["binary"]["sha256"]="0"*64
        else:
            bad["source"]["git_blob_sha1"]="0"*40
        bad["lock_id"]=recompute_lock_id(bad)
        try:
            validate(bad,candidate,False)
        except AssertionError as exc:
            if error not in str(exc):
                raise
        else:
            raise AssertionError("rehashed_forged_"+field+"_lock_accepted")
    print(MARKER+"_SELF_TEST_GREEN")
    print("candidate_rederived_before_lock_acceptance=true")
    print("rehashed_forged_binary_lock_rejected=true")
    print("rehashed_forged_source_lock_rejected=true")
    print("candidate_binary_identity_accepted=true")
    print("static_link_required=true")
    print("pt_interp_absent=true")
    print("hostile_ld_preload_positive_control=true")
    print("hostile_ld_preload_preentry_blocked=true")
    print("static_toolchain_closure_bound=true")
    print("installed_preentry_identity_proven=false")
    print("training_execution=false")
    print("funds_movement=false")

def verify_to(path:Path)->None:
    lock,candidate=load_verified()
    payload=(canonical(receipt(lock,candidate))+"\n").encode()
    out=Path(os.path.abspath(os.fspath(path)))
    if out.exists():
        raise AssertionError("verification_output_exists")
    out.parent.mkdir(parents=True,exist_ok=True)
    with out.open("xb") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    print(MARKER+"_VERIFICATION_GREEN")
    print("lock_id="+lock["lock_id"])
    print("binary_sha256="+candidate["binary"]["sha256"])
    print("candidate_binary_identity_accepted=true")
    print("static_link_required=true")
    print("pt_interp_absent=true")
    print("hostile_ld_preload_preentry_blocked=true")
    print("static_toolchain_closure_bound=true")
    print("installed_preentry_identity_proven=false")
    print("training_execution=false")
    print("funds_movement=false")

def main()->int:
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test",action="store_true")
    group.add_argument("--verify",type=Path)
    args=parser.parse_args()
    if args.self_test:
        self_test()
    else:
        verify_to(args.verify)
    return 0

if __name__=="__main__":
    raise SystemExit(main())

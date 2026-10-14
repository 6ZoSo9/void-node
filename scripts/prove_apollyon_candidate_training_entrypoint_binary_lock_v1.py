#!/usr/bin/env python3
from __future__ import annotations
import argparse, copy, hashlib, json, os, stat, subprocess, tempfile
from pathlib import Path

MARKER="VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_BINARY_CANDIDATE_LOCK_V1"
VERIFY_MARKER=MARKER+"_VERIFIED"
ROOT=Path(__file__).resolve().parents[1]
PARENT="56a4887ac3d9a8e98ee0bc6c7837206a893cb35c"
SOURCE="ops/xiphos/apollyon_candidate_training_entrypoint_v1.c"
SOURCE_BLOB="bfeff81f3eab98988a9be9600a05c696674c49d6"
SOURCE_SHA="7f3a8ff04add448777a267ed4e2e144e67b6a9be2828e0fbdc1bdd563f908182"
CANDIDATE_PROOF="scripts/prove_apollyon_candidate_training_entrypoint_binary_candidate_v1.py"
CANDIDATE_PROOF_BLOB="727279721dd65f22bae719f52d8ee60f923867d0"
CANDIDATE_WORKFLOW=".github/workflows/apollyon-candidate-training-entrypoint-binary-candidate-v1.yml"
CANDIDATE_WORKFLOW_BLOB="ce044721d68101e750e824fcac63545fbe8ad807"
LOCK="ops/security/apollyon-candidate-training-entrypoint-binary-lock-v1.json"
LOCK_ID="apollyon_candidate_training_entrypoint_binary_lock_v1:f63b6018e752ec685ed427a1badacae1799896f859dea8bb447a6fc271fd8a7a"
CANDIDATE_ID="apollyon_candidate_training_entrypoint_binary_candidate_v1:c6c4241f236606bd95775805ab96e7ed3bb7dc00bdcd2e8c936dc9fc6bca832a"
BINARY_SHA="7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a"
BINARY_BYTES=17384
SELF_TEST_SHA="f6b49a70391202157ac02d5c45c71d1e1952693a7afa758ffb9798056c015b0a"
GIT_ENV={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C",
         "GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null",
         "GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1",
         "GIT_OPTIONAL_LOCKS":"0","GIT_TERMINAL_PROMPT":"0","GIT_ASKPASS":"/bin/false"}
DERIVE_ENV={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C",
            "SOURCE_DATE_EPOCH":"0"}

def canonical(v):
    return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=True)

def sha256(b):
    return hashlib.sha256(b).hexdigest()

def git_blob(b):
    return hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()

def bounded(path,label,max_bytes=1024*1024):
    st=path.lstat()
    if (not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink!=1
        or st.st_size<1 or st.st_size>max_bytes):
        raise AssertionError(label+"_metadata_invalid")
    data=path.read_bytes(); after=path.lstat()
    if (len(data)!=st.st_size or after.st_dev!=st.st_dev or after.st_ino!=st.st_ino
        or after.st_size!=st.st_size or after.st_mtime_ns!=st.st_mtime_ns
        or after.st_ctime_ns!=st.st_ctime_ns):
        raise AssertionError(label+"_changed_during_read")
    return data

def git(args):
    r=subprocess.run(["/usr/bin/git","--no-replace-objects","-C",os.fspath(ROOT),*args],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
        check=False,timeout=20,env=GIT_ENV)
    if r.returncode!=0:
        raise AssertionError("git_failed:"+r.stderr[-800:])
    return r.stdout.strip()

def bind_repository():
    git(["merge-base","--is-ancestor",PARENT,"HEAD"])
    if git(["status","--porcelain=v1","--untracked-files=all"]):
        raise AssertionError("worktree_not_clean")
    for rel,expected in ((SOURCE,SOURCE_BLOB),(CANDIDATE_PROOF,CANDIDATE_PROOF_BLOB),
                         (CANDIDATE_WORKFLOW,CANDIDATE_WORKFLOW_BLOB)):
        data=bounded(ROOT/rel,rel)
        if git_blob(data)!=expected or git(["rev-parse","--verify","HEAD:"+rel])!=expected:
            raise AssertionError("reviewed_blob_drift:"+rel)

def derive_candidate():
    with tempfile.TemporaryDirectory(prefix="void-apollyon-lock-v1-") as td:
        output=Path(td)/"candidate.json"
        r=subprocess.run(["/usr/bin/python3","-I","-B",os.fspath(ROOT/CANDIDATE_PROOF),
                          "--derive",os.fspath(output)],cwd=ROOT,stdin=subprocess.DEVNULL,
                          stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
                          check=False,timeout=90,env=DERIVE_ENV)
        if r.returncode!=0:
            raise AssertionError("candidate_rederive_failed:"+(r.stderr or r.stdout)[-1600:])
        raw=bounded(output,"candidate_report",64*1024)
    candidate=json.loads(raw)
    if canonical(candidate).encode()+b"\n"!=raw:
        raise AssertionError("candidate_not_canonical")
    return candidate

def lock_material(lock):
    return {k:v for k,v in lock.items() if k!="lock_id"}

def recompute_lock_id(lock):
    return "apollyon_candidate_training_entrypoint_binary_lock_v1:"+sha256(
        canonical(lock_material(lock)).encode())

def validate(lock,candidate,require_reviewed_id=True):
    if lock.get("schema")!="void_apollyon_candidate_training_entrypoint_binary_candidate_lock_v1":
        raise AssertionError("lock_schema_invalid")
    if lock.get("marker")!=MARKER or type(lock.get("version")) is not int or lock["version"]!=1:
        raise AssertionError("lock_marker_version_invalid")
    if lock.get("repository")!="6ZoSo9/void-node" or lock.get("candidate_parent_head")!=PARENT:
        raise AssertionError("lock_parent_invalid")
    if lock.get("lock_id")!=recompute_lock_id(lock):
        raise AssertionError("lock_content_id_invalid")
    if lock.get("source")!=candidate.get("source") or lock["source"].get("git_blob_sha1")!=SOURCE_BLOB:
        raise AssertionError("lock_source_mismatch")
    if lock["source"].get("sha256")!=SOURCE_SHA:
        raise AssertionError("lock_source_sha_mismatch")
    if lock.get("candidate_proof")!={"path":CANDIDATE_PROOF,"git_blob_sha1":CANDIDATE_PROOF_BLOB}:
        raise AssertionError("lock_candidate_proof_mismatch")
    if lock.get("candidate_workflow")!={"path":CANDIDATE_WORKFLOW,"git_blob_sha1":CANDIDATE_WORKFLOW_BLOB}:
        raise AssertionError("lock_candidate_workflow_mismatch")
    for key in ("compiler","compile_recipe","binary","self_test"):
        if lock.get(key)!=candidate.get(key):
            raise AssertionError("lock_"+key+"_mismatch")
    if lock["binary"].get("bytes")!=BINARY_BYTES or lock["binary"].get("sha256")!=BINARY_SHA:
        raise AssertionError("lock_binary_identity_mismatch")
    if lock["self_test"].get("stdout_sha256")!=SELF_TEST_SHA:
        raise AssertionError("lock_self_test_mismatch")
    if lock.get("candidate_id")!=CANDIDATE_ID or lock["candidate_id"]!=candidate.get("candidate_id"):
        raise AssertionError("lock_candidate_id_mismatch")
    if lock.get("hosted_evidence")!={"workflow_run":38578911961,
        "three_reports_byte_identical":True,"comparison_rederived_elf":True}:
        raise AssertionError("lock_hosted_evidence_mismatch")
    if lock.get("candidate_binary_identity_accepted") is not True:
        raise AssertionError("candidate_binary_identity_not_accepted")
    for key in ("installed_training_entrypoint_identity_proven","live_systemd_enforcement_proven",
                "durable_attempt_claim_proven","candidate_weight_mutation","training_execution",
                "attempt_claim","service_action","wallet_access","transaction_signing","funds_movement"):
        if lock.get(key) is not False:
            raise AssertionError("lock_authority_overclaim:"+key)
    if lock.get("next_gate")!="apollyon_candidate_training_entrypoint_installed_identity_v1":
        raise AssertionError("lock_next_gate_invalid")
    if require_reviewed_id and lock.get("lock_id")!=LOCK_ID:
        raise AssertionError("reviewed_lock_id_mismatch")

def load_verified():
    bind_repository()
    raw=bounded(ROOT/LOCK,"lock",64*1024)
    lock=json.loads(raw)
    candidate=derive_candidate()
    validate(lock,candidate)
    return lock,candidate

def receipt(lock,candidate):
    return {"marker":VERIFY_MARKER,"version":1,"lock_id":lock["lock_id"],
        "candidate_id":candidate["candidate_id"],"candidate_parent_head":PARENT,
        "source_git_blob_sha1":candidate["source"]["git_blob_sha1"],
        "binary_bytes":candidate["binary"]["bytes"],"binary_sha256":candidate["binary"]["sha256"],
        "comparison_rederived_elf":True,"candidate_binary_identity_accepted":True,
        "installed_training_entrypoint_identity_proven":False,
        "live_systemd_enforcement_proven":False,"durable_attempt_claim_proven":False,
        "candidate_weight_mutation":False,"training_execution":False,"attempt_claim":False,
        "service_action":False,"wallet_access":False,"transaction_signing":False,
        "funds_movement":False}

def self_test():
    lock,candidate=load_verified()
    for field,value,error in (("binary","0"*64,"lock_binary"),
                              ("source","0"*40,"lock_source")):
        bad=copy.deepcopy(lock)
        if field=="binary": bad["binary"]["sha256"]=value
        else: bad["source"]["git_blob_sha1"]=value
        bad["lock_id"]=recompute_lock_id(bad)
        try: validate(bad,candidate,False)
        except AssertionError as exc:
            if error not in str(exc): raise
        else: raise AssertionError("rehashed_forged_"+field+"_lock_accepted")
    print(MARKER+"_SELF_TEST_GREEN")
    print("candidate_rederived_before_lock_acceptance=true")
    print("rehashed_forged_binary_lock_rejected=true")
    print("rehashed_forged_source_lock_rejected=true")
    print("candidate_binary_identity_accepted=true")
    print("installed_training_entrypoint_identity_proven=false")
    print("training_execution=false")
    print("funds_movement=false")

def verify_to(path):
    lock,candidate=load_verified()
    payload=(canonical(receipt(lock,candidate))+"\n").encode()
    out=Path(os.path.abspath(os.fspath(path)))
    if out.exists(): raise AssertionError("verification_output_exists")
    out.parent.mkdir(parents=True,exist_ok=True)
    with out.open("xb") as h:
        h.write(payload); h.flush(); os.fsync(h.fileno())
    print(MARKER+"_VERIFICATION_GREEN")
    print("lock_id="+lock["lock_id"])
    print("binary_sha256="+candidate["binary"]["sha256"])
    print("candidate_binary_identity_accepted=true")
    print("installed_training_entrypoint_identity_proven=false")
    print("training_execution=false")
    print("funds_movement=false")

def main():
    ap=argparse.ArgumentParser()
    g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true")
    g.add_argument("--verify",type=Path)
    args=ap.parse_args()
    if args.self_test:self_test()
    else:verify_to(args.verify)
    return 0

if __name__=="__main__":
    raise SystemExit(main())

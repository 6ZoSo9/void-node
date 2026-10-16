#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
from typing import Any

MARKER="VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_LOCK_V3"
ROOT=Path(__file__).resolve().parents[1]
BASE="a8f133c7542491af1e48018e917f0cbcd73cf15f"
CANDIDATE_HEAD=BASE
CANDIDATE_MERGE_COMMIT="2c7350f58faf2588c4c54f5657acd25c94e3c5d5"
CANDIDATE_SOURCE_PARENT="6d8d0725a36d7907e4620371952aa71fd64696df"
CANDIDATE_ID="voidbuyumqcredelfcand3_b5c405437bd40582908e097a6f021bd575315d018a9d8457af6549458cbe0922"
CANDIDATE_PROOF_REL="scripts/prove_void_buy_user_manager_credential_query_elf_candidate_v3.py"
CANDIDATE_PROOF_BLOB="4caf5efbcf750e8ab8d687c75e26948f53662a99"
CANDIDATE_WORKFLOW_REL=".github/workflows/buy-void-user-manager-credential-query-elf-candidate-v3.yml"
CANDIDATE_WORKFLOW_BLOB="c0e00a0efe5b34a4b9637647194a3cb236d8e160"
LOCK_REL="ops/security/buy-void-user-manager-credential-query-elf-lock-v3.json"
SELF_REL="scripts/prove_void_buy_user_manager_credential_query_elf_lock_v3.py"
DOC_REL="docs/operators/buy-void-user-manager-credential-query-elf-lock-v3.md"
WORKFLOW_REL=".github/workflows/buy-void-user-manager-credential-query-elf-lock-v3.yml"
EXPECTED_SCOPE=tuple(sorted((LOCK_REL,SELF_REL,DOC_REL,WORKFLOW_REL)))

REPORT_BYTES=62948
REPORT_SHA256="4ec781f2fb9a8e6c84246c12d7634f895f93b1c5cbc7cda07ce655a4475b55b2"
REPORT_BLOB="8892892149203a027872034cbe4521c147d03e46"
PREEXEC_BYTES=706504
PREEXEC_SHA256="67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c"
QUERY_BYTES=47160
QUERY_SHA256="d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923"
V2_LOCK_ID="voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54"
LOCK_ID="voidbuyumqcredelflock3_4b95342dadd37fb8e1a56ff62c36be226af1adb91c8577cdab2addc0f8e287f2"

RUN_ENV={
    "PATH":"/usr/bin:/bin",
    "HOME":"/nonexistent",
    "LANG":"C",
    "LC_ALL":"C",
    "TZ":"UTC",
    "PYTHONHASHSEED":"0",
    "GIT_CONFIG_NOSYSTEM":"1",
    "GIT_CONFIG_GLOBAL":"/dev/null",
    "GIT_CONFIG_SYSTEM":"/dev/null",
    "GIT_NO_REPLACE_OBJECTS":"1",
    "GIT_OPTIONAL_LOCKS":"0",
    "GIT_TERMINAL_PROMPT":"0",
}

def canonical(value:Any)->str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)

def sha256(value:bytes)->str:
    return hashlib.sha256(value).hexdigest()

def git_blob(value:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(value)}\0".encode("ascii"))
    h.update(value)
    return h.hexdigest()

def run(argv:list[str],*,cwd:Path=ROOT,timeout:int=180)->subprocess.CompletedProcess[bytes]:
    result=subprocess.run(
        argv,cwd=cwd,env=RUN_ENV,stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=timeout,
    )
    if result.returncode!=0:
        raise AssertionError(
            "command failed: "+repr(argv)+"\n"+
            result.stderr.decode("utf-8","replace")[-4000:]
        )
    return result

def git(args:list[str],*,cwd:Path=ROOT)->str:
    return run(
        ["/usr/bin/git","--no-replace-objects","-C",os.fspath(cwd),*args],
        cwd=cwd,timeout=60,
    ).stdout.decode("utf-8","strict").strip()

def read_stable(path:Path,max_bytes:int,label:str)->bytes:
    before=path.lstat()
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_size<1 or before.st_size>max_bytes
    ):
        raise AssertionError(label+" metadata invalid")
    data=path.read_bytes()
    after=path.lstat()
    if (
        (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns)
        !=
        (after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns)
        or len(data)!=before.st_size
    ):
        raise AssertionError(label+" read drift")
    return data

def verify_scope()->None:
    git(["merge-base","--is-ancestor",BASE,"HEAD"])
    changed=tuple(sorted(
        x for x in git(["diff","--name-only",BASE,"HEAD","--"]).splitlines() if x
    ))
    if changed!=EXPECTED_SCOPE:
        raise AssertionError("V3 lock scope drift: "+repr(changed))
    if git(["rev-parse","HEAD:"+CANDIDATE_PROOF_REL])!=CANDIDATE_PROOF_BLOB:
        raise AssertionError("candidate proof blob drift")
    if git(["rev-parse","HEAD:"+CANDIDATE_WORKFLOW_REL])!=CANDIDATE_WORKFLOW_BLOB:
        raise AssertionError("candidate workflow blob drift")
    if git(["status","--porcelain=v1","--untracked-files=all"]):
        raise AssertionError("lock checkout not clean")

def rederive_candidate()->tuple[dict[str,Any],bytes,bytes,bytes]:
    with tempfile.TemporaryDirectory(prefix="void-credential-v3-lock-") as td:
        temp=Path(td)
        worktree=temp/"candidate-head"
        output=temp/"candidate-output"
        added=False
        try:
            run([
                "/usr/bin/git","--no-replace-objects","-C",os.fspath(ROOT),
                "worktree","add","--detach","--force",os.fspath(worktree),CANDIDATE_HEAD,
            ],timeout=90)
            added=True
            if git(["rev-parse","HEAD"],cwd=worktree)!=CANDIDATE_HEAD:
                raise AssertionError("candidate worktree head mismatch")
            if git(["rev-parse","HEAD:"+CANDIDATE_PROOF_REL],cwd=worktree)!=CANDIDATE_PROOF_BLOB:
                raise AssertionError("candidate worktree proof blob mismatch")
            if git(["rev-parse","HEAD:"+CANDIDATE_WORKFLOW_REL],cwd=worktree)!=CANDIDATE_WORKFLOW_BLOB:
                raise AssertionError("candidate worktree workflow blob mismatch")

            proof=worktree/CANDIDATE_PROOF_REL
            self_test=run(
                ["/usr/bin/python3","-I","-B",os.fspath(proof),"--self-test"],
                cwd=worktree,timeout=120,
            )
            if b"VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V3_SELF_TEST_GREEN" not in self_test.stdout:
                raise AssertionError("candidate self-test marker missing")
            derive=run(
                ["/usr/bin/python3","-I","-B",os.fspath(proof),"--derive-dir",os.fspath(output)],
                cwd=worktree,timeout=180,
            )
            if b"VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V3_DERIVE_GREEN" not in derive.stdout:
                raise AssertionError("candidate derive marker missing")

            report_bytes=read_stable(
                output/"credential-query-elf-candidate-v3.json",512*1024,
                "candidate report",
            )
            preexec=read_stable(
                output/"credential-query-preexec",4*1024*1024,
                "candidate preexec",
            )
            query=read_stable(
                output/"credential-query",4*1024*1024,
                "candidate query",
            )
        finally:
            if added:
                cleanup=subprocess.run(
                    ["/usr/bin/git","--no-replace-objects","-C",os.fspath(ROOT),
                     "worktree","remove","--force",os.fspath(worktree)],
                    cwd=ROOT,env=RUN_ENV,stdin=subprocess.DEVNULL,
                    stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=60,
                )
                if cleanup.returncode!=0:
                    raise AssertionError(
                        "candidate worktree cleanup failed: "+
                        cleanup.stderr.decode("utf-8","replace")[-2000:]
                    )

    if len(report_bytes)!=REPORT_BYTES or sha256(report_bytes)!=REPORT_SHA256:
        raise AssertionError("candidate report wire identity mismatch")
    if git_blob(report_bytes)!=REPORT_BLOB:
        raise AssertionError("candidate report Git blob mismatch")
    if len(preexec)!=PREEXEC_BYTES or sha256(preexec)!=PREEXEC_SHA256:
        raise AssertionError("candidate preexec identity mismatch")
    if len(query)!=QUERY_BYTES or sha256(query)!=QUERY_SHA256:
        raise AssertionError("candidate query identity mismatch")

    report=json.loads(report_bytes)
    if (canonical(report)+"\n").encode("utf-8")!=report_bytes:
        raise AssertionError("candidate report not canonical")
    if report.get("candidate_id")!=CANDIDATE_ID:
        raise AssertionError("candidate id mismatch")
    if report.get("source_parent")!=CANDIDATE_SOURCE_PARENT:
        raise AssertionError("candidate source parent mismatch")
    if report.get("v2_predecessor_lock_id")!=V2_LOCK_ID:
        raise AssertionError("candidate predecessor lock mismatch")
    if report.get("preexec_predecessor_identity_required") is not True:
        raise AssertionError("candidate predecessor identity nonclaim")
    if report.get("preexec_predecessor_bytes")!=PREEXEC_BYTES:
        raise AssertionError("candidate predecessor preexec bytes mismatch")
    if report.get("preexec_predecessor_sha256")!=PREEXEC_SHA256:
        raise AssertionError("candidate predecessor preexec hash mismatch")
    if report.get("preexec_build",{}).get("binary")!={
        "bytes":PREEXEC_BYTES,"sha256":PREEXEC_SHA256
    }:
        raise AssertionError("candidate preexec build mismatch")
    if report.get("query_build",{}).get("binary")!={
        "bytes":QUERY_BYTES,"sha256":QUERY_SHA256
    }:
        raise AssertionError("candidate query build mismatch")
    if report.get("candidate_accepted") is not False:
        raise AssertionError("candidate must remain unaccepted before lock")
    if report.get("replacement_authorized") is not False:
        raise AssertionError("candidate replacement authority drift")
    if report.get("live_query_authorized") is not False:
        raise AssertionError("candidate live-query authority drift")
    if report.get("credential_contents_read") is not False:
        raise AssertionError("candidate credential-content boundary drift")
    if set(report.get("toolchain",{}).get("executables",{}))!={"cc","cc1","as","collect2","ld","strip"}:
        raise AssertionError("candidate toolchain closure incomplete")
    if report.get("source_identity",{}).get(CANDIDATE_PROOF_REL,{}).get("git_blob_sha1")!=CANDIDATE_PROOF_BLOB:
        raise AssertionError("candidate report proof identity mismatch")
    if report.get("source_identity",{}).get(CANDIDATE_WORKFLOW_REL,{}).get("git_blob_sha1")!=CANDIDATE_WORKFLOW_BLOB:
        raise AssertionError("candidate report workflow identity mismatch")
    return report,report_bytes,preexec,query

def lock_body()->dict[str,Any]:
    return {
        "schema":"void_buy_void_user_manager_credential_query_elf_lock_v3",
        "marker":MARKER,
        "version":3,
        "repository":"6ZoSo9/void-node",
        "candidate_head":CANDIDATE_HEAD,
        "candidate_merge_commit":CANDIDATE_MERGE_COMMIT,
        "candidate_source_parent":CANDIDATE_SOURCE_PARENT,
        "candidate_id":CANDIDATE_ID,
        "candidate_proof":{
            "path":CANDIDATE_PROOF_REL,
            "git_blob_sha1":CANDIDATE_PROOF_BLOB,
        },
        "candidate_workflow":{
            "path":CANDIDATE_WORKFLOW_REL,
            "git_blob_sha1":CANDIDATE_WORKFLOW_BLOB,
        },
        "candidate_report":{
            "bytes":REPORT_BYTES,
            "sha256":REPORT_SHA256,
            "git_blob_sha1":REPORT_BLOB,
        },
        "hosted_evidence":{
            "workflow_run":38852664866,
            "artifact_a":12025587886,
            "artifact_b":12025533003,
            "artifact_c":12025933150,
            "three_run_report_bytes_identical":True,
            "independent_toolchain_rederivation":True,
            "preexec_predecessor_identity_exact":True,
            "hostile_loader_boundary_green":True,
        },
        "preexec_binary":{
            "bytes":PREEXEC_BYTES,
            "sha256":PREEXEC_SHA256,
            "accepted_v2_identity_exact":True,
            "static_no_interp_required":True,
        },
        "query_binary":{
            "bytes":QUERY_BYTES,
            "sha256":QUERY_SHA256,
        },
        "v2_predecessor_lock_id":V2_LOCK_ID,
        "complete_native_toolchain_provenance_bound":True,
        "closed_link_trace_grammar_required":True,
        "max_dropin_paths":64,
        "max_load_credentials":32,
        "unique_credential_ids_required":True,
        "exactly_one_epoch2_credential_required":True,
        "unrelated_credentials_allowed":True,
        "complete_credential_set_generation_stability_required":True,
        "complete_dropin_set_sha256_emitted":True,
        "complete_credential_set_sha256_emitted":True,
        "cross_query_complete_set_binding_enabled":True,
        "authenticated_private_manager_peer_required":True,
        "retained_private_connection_required":True,
        "credential_query_preexec_pair_execution_proven":True,
        "candidate_accepted":True,
        "replacement_authorized":False,
        "live_query_authorized":False,
        "credential_contents_read":False,
        "production_host_evidence_authority":False,
        "payment_acceptance":False,
        "public_presale_activation":False,
        "wc_void_market_activation":False,
        "transaction":False,
        "funds_movement":False,
        "next_gate":"void_buy_void_user_manager_credential_query_protected_replacement_v3",
    }

def expected_lock()->dict[str,Any]:
    body=lock_body()
    lock_id="voidbuyumqcredelflock3_"+sha256(canonical(body).encode("utf-8"))
    if lock_id!=LOCK_ID:
        raise AssertionError("lock id derivation mismatch")
    return {**body,"lock_id":lock_id}

def verify()->dict[str,Any]:
    verify_scope()
    report,report_bytes,preexec,query=rederive_candidate()
    lock=expected_lock()
    expected=(json.dumps(lock,indent=2,ensure_ascii=False)+"\n").encode("utf-8")
    committed=read_stable(ROOT/LOCK_REL,64*1024,"committed V3 lock")
    if committed!=expected:
        raise AssertionError("committed V3 lock bytes mismatch")
    if report["candidate_id"]!=lock["candidate_id"]:
        raise AssertionError("candidate/lock id cross-binding mismatch")
    if sha256(report_bytes)!=lock["candidate_report"]["sha256"]:
        raise AssertionError("candidate report/lock hash mismatch")
    if sha256(preexec)!=lock["preexec_binary"]["sha256"]:
        raise AssertionError("candidate preexec/lock hash mismatch")
    if sha256(query)!=lock["query_binary"]["sha256"]:
        raise AssertionError("candidate query/lock hash mismatch")
    if git(["status","--porcelain=v1","--untracked-files=all"]):
        raise AssertionError("lock checkout dirty after proof")
    return lock

def main()->None:
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group()
    group.add_argument("--derive",action="store_true")
    group.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    lock=verify()
    if args.derive:
        print(json.dumps(lock,indent=2,ensure_ascii=False))
        return
    print(MARKER+"_GREEN")
    print("lock_id="+lock["lock_id"])
    print("candidate_id="+CANDIDATE_ID)
    print("candidate_report_sha256="+REPORT_SHA256)
    print("preexec_binary_sha256="+PREEXEC_SHA256)
    print("query_binary_sha256="+QUERY_SHA256)
    print("candidate_proof_reexecuted_at_exact_head=true")
    print("complete_native_toolchain_provenance_bound=true")
    print("closed_link_trace_grammar_required=true")
    print("preexec_predecessor_identity_exact=true")
    print("candidate_accepted=true")
    print("replacement_authorized=false")
    print("live_query_authorized=false")
    print("credential_contents_read=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("transaction=false")
    print("funds_movement=false")

if __name__=="__main__":
    main()

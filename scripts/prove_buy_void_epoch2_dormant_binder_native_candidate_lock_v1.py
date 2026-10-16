#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]

LOCK_REL="ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v1.json"
LOCK=ROOT/LOCK_REL
CANDIDATE_REL="scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v1.py"
CANDIDATE=ROOT/CANDIDATE_REL

BINDING_SOURCE_HEAD="e602fa5b4b6961e9c24d4bbdb60a6d006a2783b2"
BINDING_MERGE_HEAD="326c809439f9df333a9c8b1b73ecb40901b0e1a1"
CANDIDATE_HEAD="1b9346f8e91f49019ce16585810054c10da078ca"
CANDIDATE_MERGE_HEAD="0fa249522c955aff03d3eaa24b768381a32d987b"
LOCK_BASE=CANDIDATE_MERGE_HEAD

EXPECTED_LOCK_ID=(
    "voidbuye2dormantbinderlock1_"
    "9f0002c70442e25553ea7d9dfd3203a806b9fd0e973392f25ad6a5e607995b61"
)
EXPECTED_CANDIDATE_ID=(
    "voidbuye2dormantbindercand1_"
    "3e577d797e1cac83f29baf35efef84620db2506722764b07598cb4f2524d4aad"
)
EXPECTED_REPORT_BYTES=5135
EXPECTED_REPORT_SHA256="897b9700f36f13d1cdee3c5b6f128a54d0505ddfc852fdcca96e5054ea5d1829"
EXPECTED_REPORT_GIT_BLOB="443cd004e215159b5b508ec09b29c1c586b6aa14"
EXPECTED_BINARY_SHA256="ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
EXPECTED_BINARY_BYTES=726976

EXPECTED_BLOBS={
    CANDIDATE_REL:"5ac4264d7f9bdb394cf5be4490aa1eadd1f929ee",
    ".github/workflows/buy-void-epoch2-dormant-binder-native-candidate-v1.yml":
        "1292e9ceb82fe533339718765c6bf0982bb278bc",
    "docs/operators/buy-void-epoch2-dormant-binder-native-candidate-v1.md":
        "f5292b266fb5b8aac89dfc51101ecb0a0498dddc",
    "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c":
        "4fdf3f627f407335b9d50800fbbc913d1edae523",
    "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs":
        "9c29eb4716077e459b9154f39d0f30cf2e56729f",
    "scripts/prove_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs":
        "4671d37fcdb43c2bee9d3de16402df0cd25257bb",
    "docs/operators/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.md":
        "cd90bafa39682284a6d9e87daebfe5966adac8d6",
    ".github/workflows/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.yml":
        "2742145ab88d721747f978927a6eb64a7c5f805f",
}

EXPECTED_SCOPE=tuple(sorted((
    ".github/workflows/buy-void-epoch2-dormant-binder-native-candidate-lock-v1.yml",
    "docs/operators/buy-void-epoch2-dormant-binder-native-candidate-lock-v1.md",
    LOCK_REL,
    "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_lock_v1.py",
)))

ENV={
    "PATH":"/usr/bin:/bin",
    "HOME":"/nonexistent",
    "LANG":"C",
    "LC_ALL":"C",
    "TZ":"UTC",
    "SOURCE_DATE_EPOCH":"0",
    "GIT_CONFIG_NOSYSTEM":"1",
    "GIT_CONFIG_GLOBAL":"/dev/null",
    "GIT_CONFIG_SYSTEM":"/dev/null",
    "GIT_NO_REPLACE_OBJECTS":"1",
    "GIT_OPTIONAL_LOCKS":"0",
    "GIT_TERMINAL_PROMPT":"0",
}

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(raw)}\0".encode("ascii"))
    h.update(raw)
    return h.hexdigest()

def canonical(value)->bytes:
    return json.dumps(
        value,sort_keys=True,separators=(",",":"),ensure_ascii=True
    ).encode("utf-8")

def run(argv:list[str],*,timeout:int=180)->subprocess.CompletedProcess:
    cp=subprocess.run(
        argv,cwd=ROOT,stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        env=ENV,check=False,timeout=timeout,
    )
    if cp.returncode!=0:
        raise AssertionError(
            "command_failed:"+repr(argv)+":"+
            cp.stderr.decode("utf-8","replace")[-4000:]
        )
    return cp

def git(args:list[str])->str:
    return run(
        ["/usr/bin/git","--no-replace-objects","-C",os.fspath(ROOT),*args],
        timeout=30,
    ).stdout.decode("utf-8","strict").strip()

def direct_file(path:Path,maximum:int)->bytes:
    before=path.lstat()
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_nlink!=1 or before.st_size<1 or before.st_size>maximum
    ):
        raise AssertionError("file_metadata_invalid:"+str(path))
    raw=path.read_bytes()
    after=path.lstat()
    for field in (
        "st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink",
        "st_size","st_mtime_ns","st_ctime_ns",
    ):
        if getattr(before,field)!=getattr(after,field):
            raise AssertionError("file_changed:"+str(path)+":"+field)
    if len(raw)!=before.st_size:
        raise AssertionError("file_read_drift:"+str(path))
    return raw

def verify_repository()->None:
    for commit in (
        BINDING_SOURCE_HEAD,BINDING_MERGE_HEAD,
        CANDIDATE_HEAD,CANDIDATE_MERGE_HEAD,
    ):
        if git(["rev-parse",commit+"^{commit}"])!=commit:
            raise AssertionError("required_commit_unavailable:"+commit)
    git(["merge-base","--is-ancestor",BINDING_SOURCE_HEAD,BINDING_MERGE_HEAD])
    git(["merge-base","--is-ancestor",BINDING_MERGE_HEAD,CANDIDATE_HEAD])
    git(["merge-base","--is-ancestor",CANDIDATE_HEAD,CANDIDATE_MERGE_HEAD])
    git(["merge-base","--is-ancestor",LOCK_BASE,"HEAD"])

    for relative,expected in EXPECTED_BLOBS.items():
        actual=git(["rev-parse","HEAD:"+relative])
        if actual!=expected:
            raise AssertionError("dependency_blob_drift:"+relative)

    changed=tuple(sorted(
        line for line in
        git(["diff","--name-only",LOCK_BASE,"HEAD","--"]).splitlines()
        if line
    ))
    if changed!=EXPECTED_SCOPE:
        raise AssertionError(
            "lock_scope_drift:"+json.dumps(changed,separators=(",",":"))
        )
    if git(["status","--porcelain=v1","--untracked-files=all"])!="":
        raise AssertionError("worktree_dirty")

def derive_candidate()->tuple[bytes,dict,bytes]:
    run(["/usr/bin/python3","-I","-B",os.fspath(CANDIDATE),"--self-test"])
    with tempfile.TemporaryDirectory(prefix="void-e2-dormant-lock-") as td:
        out=Path(td)/"candidate"
        run([
            "/usr/bin/python3","-I","-B",os.fspath(CANDIDATE),
            "--derive-dir",os.fspath(out),
        ])
        report_raw=direct_file(out/"candidate.json",128*1024)
        binary_raw=direct_file(out/"native-preentry",2*1024*1024)

    if len(report_raw)!=EXPECTED_REPORT_BYTES:
        raise AssertionError("candidate_report_bytes_mismatch")
    if sha256(report_raw)!=EXPECTED_REPORT_SHA256:
        raise AssertionError("candidate_report_sha256_mismatch")
    if git_blob(report_raw)!=EXPECTED_REPORT_GIT_BLOB:
        raise AssertionError("candidate_report_git_blob_mismatch")
    if len(binary_raw)!=EXPECTED_BINARY_BYTES:
        raise AssertionError("candidate_binary_bytes_mismatch")
    if sha256(binary_raw)!=EXPECTED_BINARY_SHA256:
        raise AssertionError("candidate_binary_sha256_mismatch")
    try:
        report=json.loads(report_raw)
    except Exception as exc:
        raise AssertionError("candidate_report_json_invalid") from exc
    if not isinstance(report,dict):
        raise AssertionError("candidate_report_not_object")
    return report_raw,report,binary_raw

def verify_candidate(report:dict)->None:
    if report.get("marker")!="VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V1":
        raise AssertionError("candidate_marker_invalid")
    if report.get("version")!=1:
        raise AssertionError("candidate_version_invalid")
    if report.get("candidate_id")!=EXPECTED_CANDIDATE_ID:
        raise AssertionError("candidate_id_invalid")

    binding=report.get("binding_generation")
    native=report.get("native_source")
    binder=report.get("binder_source")
    binary=report.get("binary")
    self_test=report.get("self_test")
    authority=report.get("authority")
    if not all(isinstance(x,dict) for x in (
        binding,native,binder,binary,self_test,authority
    )):
        raise AssertionError("candidate_sections_missing")

    expected_binding={
        "binder_git_blob_sha1":"9c29eb4716077e459b9154f39d0f30cf2e56729f",
        "binding_doc_git_blob_sha1":"cd90bafa39682284a6d9e87daebfe5966adac8d6",
        "binding_proof_git_blob_sha1":"4671d37fcdb43c2bee9d3de16402df0cd25257bb",
        "binding_workflow_git_blob_sha1":"2742145ab88d721747f978927a6eb64a7c5f805f",
        "canonical_main_parent":"b9d44332fc3119ec7a534829502efcff364b1b00",
        "head":"e602fa5b4b6961e9c24d4bbdb60a6d006a2783b2",
        "source_git_blob_sha1":"4fdf3f627f407335b9d50800fbbc913d1edae523",
    }
    if binding!=expected_binding:
        raise AssertionError("candidate_binding_generation_invalid")

    if (
        native.get("git_blob_sha1")!="4fdf3f627f407335b9d50800fbbc913d1edae523" or
        native.get("sha256")!="2b9a36da580adaab1e97eca4c5bd730eac7328f1ff9ba6a897d28580395c39d4" or
        native.get("bytes")!=20295
    ):
        raise AssertionError("candidate_native_source_invalid")
    if (
        binder.get("git_blob_sha1")!="9c29eb4716077e459b9154f39d0f30cf2e56729f" or
        binder.get("sha256")!="afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e" or
        binder.get("bytes")!=39391
    ):
        raise AssertionError("candidate_binder_source_invalid")
    if (
        binary.get("sha256")!=EXPECTED_BINARY_SHA256 or
        binary.get("bytes")!=EXPECTED_BINARY_BYTES or
        binary.get("static_link_required") is not True or
        binary.get("pt_interp_absent") is not True or
        binary.get("hostile_ld_preload_preentry_blocked") is not True or
        binary.get("two_builds_byte_identical") is not True
    ):
        raise AssertionError("candidate_binary_identity_invalid")
    if (
        self_test.get("stdout_sha256")!=
            "671bfd72914021d43ed59571a4db749a1a686071ebe0329878dcb70bde67d233" or
        self_test.get("exact_transcript_verified") is not True or
        self_test.get("stderr_empty") is not True
    ):
        raise AssertionError("candidate_self_test_invalid")

    if authority.get("source_only_candidate") is not True:
        raise AssertionError("candidate_source_only_missing")
    if authority.get("candidate_report_filesystem_write") is not True:
        raise AssertionError("candidate_report_write_missing")
    for key,value in authority.items():
        if key in ("source_only_candidate","candidate_report_filesystem_write"):
            continue
        if value is not False:
            raise AssertionError("candidate_authority_overclaim:"+key)

def verify_lock(report:dict)->dict:
    raw=direct_file(LOCK,128*1024)
    try:
        lock=json.loads(raw)
    except Exception as exc:
        raise AssertionError("lock_json_invalid") from exc
    if not isinstance(lock,dict):
        raise AssertionError("lock_not_object")

    expected_keys={
        "schema","marker","version","repository","binding_source_head",
        "binding_merge_head","candidate_head","candidate_merge_head",
        "candidate_hosted_evidence","candidate_report","candidate_accepted",
        "native_binary_identity_accepted","binder_source_identity_accepted",
        "protected_install_authorized","live_execution_authorized",
        "credential_access_authorized","private_key_access_authorized",
        "signing_authorized","transaction_authorized","rpc_call_authorized",
        "payment_acceptance_authorized","public_presale_activation_authorized",
        "wc_void_market_activation_authorized",
        "treasury_liquidity_action_authorized","funds_movement_authorized",
        "production_host_evidence_authority","next_gate","lock_id",
    }
    if set(lock)!=expected_keys:
        raise AssertionError("lock_shape_invalid")

    if (
        lock.get("schema")!="void_buy_void_epoch2_dormant_binder_native_candidate_lock_v1" or
        lock.get("marker")!="VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V1" or
        lock.get("version")!=1 or lock.get("repository")!="6ZoSo9/void-node" or
        lock.get("binding_source_head")!=BINDING_SOURCE_HEAD or
        lock.get("binding_merge_head")!=BINDING_MERGE_HEAD or
        lock.get("candidate_head")!=CANDIDATE_HEAD or
        lock.get("candidate_merge_head")!=CANDIDATE_MERGE_HEAD
    ):
        raise AssertionError("lock_generation_invalid")

    hosted=lock.get("candidate_hosted_evidence")
    expected_hosted={
        "workflow_run":38950509895,
        "source_proof_job":117140411803,
        "derive_job_a":117140734128,
        "derive_job_b":117140733906,
        "derive_job_c":117140733927,
        "artifact_a":12069020953,
        "artifact_b":12069355140,
        "artifact_c":12068001912,
        "compare_job":117140950563,
        "three_report_byte_identity_verified":True,
        "three_binary_byte_identity_verified":True,
        "independent_report_rederivation_verified":True,
        "independent_elf_rederivation_verified":True,
    }
    if hosted!=expected_hosted:
        raise AssertionError("lock_hosted_evidence_invalid")

    summary=lock.get("candidate_report")
    if not isinstance(summary,dict):
        raise AssertionError("lock_candidate_summary_missing")
    expected_summary={
        "bytes":EXPECTED_REPORT_BYTES,
        "sha256":EXPECTED_REPORT_SHA256,
        "git_blob_sha1":EXPECTED_REPORT_GIT_BLOB,
        "candidate_id":EXPECTED_CANDIDATE_ID,
        "candidate_script_git_blob_sha1":"5ac4264d7f9bdb394cf5be4490aa1eadd1f929ee",
        "candidate_workflow_git_blob_sha1":"1292e9ceb82fe533339718765c6bf0982bb278bc",
        "candidate_doc_git_blob_sha1":"f5292b266fb5b8aac89dfc51101ecb0a0498dddc",
        "native_source_git_blob_sha1":"4fdf3f627f407335b9d50800fbbc913d1edae523",
        "native_source_sha256":"2b9a36da580adaab1e97eca4c5bd730eac7328f1ff9ba6a897d28580395c39d4",
        "binder_source_git_blob_sha1":"9c29eb4716077e459b9154f39d0f30cf2e56729f",
        "binder_sha256":"afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e",
        "binder_bytes":39391,
        "binding_proof_git_blob_sha1":"4671d37fcdb43c2bee9d3de16402df0cd25257bb",
        "binding_doc_git_blob_sha1":"cd90bafa39682284a6d9e87daebfe5966adac8d6",
        "binding_workflow_git_blob_sha1":"2742145ab88d721747f978927a6eb64a7c5f805f",
        "native_binary_sha256":EXPECTED_BINARY_SHA256,
        "native_binary_bytes":EXPECTED_BINARY_BYTES,
        "self_test_stdout_sha256":
            "671bfd72914021d43ed59571a4db749a1a686071ebe0329878dcb70bde67d233",
        "toolchain_closure_bound":True,
        "static_no_interp":True,
        "hostile_ld_preload_blocked":True,
        "failure_truth_boundary_test_modes_bound":True,
    }
    if summary!=expected_summary:
        raise AssertionError("lock_candidate_summary_invalid")

    if (
        report.get("candidate_id")!=summary["candidate_id"] or
        report.get("binary",{}).get("sha256")!=summary["native_binary_sha256"] or
        report.get("binder_source",{}).get("sha256")!=summary["binder_sha256"]
    ):
        raise AssertionError("lock_candidate_report_crosscheck_failed")

    for key in (
        "candidate_accepted","native_binary_identity_accepted",
        "binder_source_identity_accepted",
    ):
        if lock.get(key) is not True:
            raise AssertionError("lock_acceptance_missing:"+key)
    for key in (
        "protected_install_authorized","live_execution_authorized",
        "credential_access_authorized","private_key_access_authorized",
        "signing_authorized","transaction_authorized","rpc_call_authorized",
        "payment_acceptance_authorized","public_presale_activation_authorized",
        "wc_void_market_activation_authorized",
        "treasury_liquidity_action_authorized","funds_movement_authorized",
        "production_host_evidence_authority",
    ):
        if lock.get(key) is not False:
            raise AssertionError("lock_authority_overclaim:"+key)

    if lock.get("next_gate")!="void_buy_void_epoch2_dormant_binder_native_candidate_materializer_v1":
        raise AssertionError("lock_next_gate_invalid")
    supplied=lock.get("lock_id")
    if supplied!=EXPECTED_LOCK_ID:
        raise AssertionError("lock_id_invalid")
    body=dict(lock)
    body.pop("lock_id")
    derived="voidbuye2dormantbinderlock1_"+sha256(canonical(body))
    if derived!=EXPECTED_LOCK_ID:
        raise AssertionError("lock_id_derivation_mismatch")
    return lock

def main()->None:
    verify_repository()
    _,report,_=derive_candidate()
    verify_candidate(report)
    verify_lock(report)
    print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_LOCK_V1_GREEN")
    print("lock_id="+EXPECTED_LOCK_ID)
    print("candidate_id="+EXPECTED_CANDIDATE_ID)
    print("candidate_report_sha256="+EXPECTED_REPORT_SHA256)
    print("candidate_report_git_blob_sha1="+EXPECTED_REPORT_GIT_BLOB)
    print("native_binary_sha256="+EXPECTED_BINARY_SHA256)
    print("native_binary_bytes="+str(EXPECTED_BINARY_BYTES))
    print("binder_sha256=afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e")
    print("hosted_three_report_identity_bound=true")
    print("hosted_three_binary_identity_bound=true")
    print("independent_report_rederivation_bound=true")
    print("independent_elf_rederivation_bound=true")
    print("failure_truth_boundary_test_modes_bound=true")
    print("candidate_accepted=true")
    print("native_binary_identity_accepted=true")
    print("binder_source_identity_accepted=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")
    print("production_host_evidence_authority=false")
    print("next_gate=void_buy_void_epoch2_dormant_binder_native_candidate_materializer_v1")

if __name__=="__main__":
    main()

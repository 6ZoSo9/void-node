#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]

LOCK_REL="ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"
LOCK=ROOT/LOCK_REL
CANDIDATE_REL="scripts/prove_buy_void_epoch2_live_composition_native_candidate_v6r2.py"
CANDIDATE=ROOT/CANDIDATE_REL
CANDIDATE_WORKFLOW_REL=".github/workflows/buy-void-epoch2-live-composition-native-candidate-v6r2.yml"

SOURCE_HEAD="a3896576a0a716337f679deb26de36dc039219e0"
SOURCE_PARENT_TREE="7f9fe7beb108368039fdc97ee58b1c6dfb4a69eb"
CANDIDATE_HEAD="26a06fe84f93ba48107809a9bd14263c34fa961e"
CANDIDATE_MERGE_HEAD="01dfaa59faa3e9779c6f4fd4cce4a470002954db"
LOCK_BASE=CANDIDATE_MERGE_HEAD

EXPECTED_LOCK_ID=(
    "voidbuye2nativecandlock6r2_"
    "ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417"
)
EXPECTED_REPORT_BYTES=60020
EXPECTED_REPORT_SHA256="b5bd9b236cfdf821e7fbef4a97ad8e64632aa01503fa4f5a1daf0d1db2535c5f"
EXPECTED_REPORT_GIT_BLOB_SHA1="ae6cc402d821fa5e3a37716f37285a1d600dfa18"
EXPECTED_CANDIDATE_ID=(
    "voidbuye2nativecand6r2_"
    "5d643422fb1c53686edd9386d6a65f000d9f399538bf94cca98b232fdfb15e8d"
)

EXPECTED_BLOBS={
    CANDIDATE_REL:"c4ac12562f1ce396d7b584ad10a5e86742d49d1a",
    CANDIDATE_WORKFLOW_REL:"ec0b991750ea9f816d3b170cc007977977e01047",
    "scripts/prove_buy_void_epoch2_live_composition_native_preentry_v3_source.py":
        "b48972c0f930f5a33754a390bd2289853fc93c93",
    ".github/workflows/buy-void-epoch2-live-composition-native-preentry-v3-source.yml":
        "428bd68439ab5b7251632107839346d6b18fc769",
    "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c":
        "5021727f1def1ec11f870d735cab65acc1701a5e",
    "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs":
        "499df9b94b5b89354837570da0c7e47ec280025d",
    "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs":
        "14cbe81e27d04fee77cbe75225ce308bf8561a7b",
    ".github/workflows/buy-void-epoch2-operator-first-entry-v1.yml":
        "c66c1cd21ce762a128d7a25be8cec22686bca993",
}

EXPECTED_SCOPE=tuple(sorted((
    ".github/workflows/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.yml",
    "docs/operators/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.md",
    LOCK_REL,
    "scripts/prove_buy_void_epoch2_live_composition_native_candidate_lock_v6r2.py",
)))

ENV={
    "PATH":"/usr/bin:/bin",
    "HOME":"/nonexistent",
    "LANG":"C",
    "LC_ALL":"C",
    "TZ":"UTC",
    "GIT_CONFIG_NOSYSTEM":"1",
    "GIT_CONFIG_GLOBAL":"/dev/null",
    "GIT_CONFIG_SYSTEM":"/dev/null",
    "GIT_NO_REPLACE_OBJECTS":"1",
    "GIT_OPTIONAL_LOCKS":"0",
    "GIT_TERMINAL_PROMPT":"0",
}

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def git_blob_sha1(raw:bytes)->str:
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
    if git(["rev-parse",SOURCE_HEAD+"^{commit}"])!=SOURCE_HEAD:
        raise AssertionError("canonical_source_head_invalid")
    if git(["rev-parse",SOURCE_HEAD+"^{tree}"])!=SOURCE_PARENT_TREE:
        raise AssertionError("canonical_source_tree_invalid")
    if git(["rev-parse",CANDIDATE_MERGE_HEAD+"^{commit}"])!=CANDIDATE_MERGE_HEAD:
        raise AssertionError("canonical_candidate_merge_invalid")
    git(["merge-base","--is-ancestor",SOURCE_HEAD,CANDIDATE_HEAD])
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
            "lock_branch_scope_drift:"+json.dumps(changed,separators=(",",":"))
        )
    if git(["status","--porcelain=v1","--untracked-files=all"])!="":
        raise AssertionError("worktree_dirty")

def derive_candidate_report()->tuple[bytes,dict]:
    run(["/usr/bin/python3","-I","-B",os.fspath(CANDIDATE),"--self-test"])
    with tempfile.TemporaryDirectory(prefix="void-e2-native-lock-v6-") as td:
        report=Path(td)/"candidate.json"
        run([
            "/usr/bin/python3","-I","-B",os.fspath(CANDIDATE),
            "--derive",os.fspath(report),
        ])
        raw=direct_file(report,512*1024)
    if len(raw)!=EXPECTED_REPORT_BYTES:
        raise AssertionError("candidate_report_bytes_mismatch")
    if sha256(raw)!=EXPECTED_REPORT_SHA256:
        raise AssertionError("candidate_report_sha256_mismatch")
    if git_blob_sha1(raw)!=EXPECTED_REPORT_GIT_BLOB_SHA1:
        raise AssertionError("candidate_report_git_blob_mismatch")
    try:
        value=json.loads(raw)
    except Exception as exc:
        raise AssertionError("candidate_report_json_invalid") from exc
    if not isinstance(value,dict):
        raise AssertionError("candidate_report_not_object")
    return raw,value

def verify_candidate(value:dict)->None:
    if value.get("marker")!="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_V6R2":
        raise AssertionError("candidate_marker_invalid")
    if value.get("version")!=2:
        raise AssertionError("candidate_version_invalid")
    if value.get("candidate_id")!=EXPECTED_CANDIDATE_ID:
        raise AssertionError("candidate_id_invalid")
    if value.get("status")!="candidate_only_unaccepted":
        raise AssertionError("candidate_status_invalid")

    trust=value.get("trust_root")
    if not isinstance(trust,dict):
        raise AssertionError("candidate_trust_root_missing")
    expected_trust_keys={
        "historical_candidate_identity_reused",
        "operator_first_entry_preservation_workflow",
        "proof_generation_repaired",
        "sealed_v2",
        "source_parent",
        "source_parent_tree",
        "source_proof",
        "source_workflow",
    }
    if set(trust)!=expected_trust_keys:
        raise AssertionError("candidate_trust_root_shape_invalid")
    if (
        trust.get("source_parent")!=SOURCE_HEAD or
        trust.get("source_parent_tree")!=SOURCE_PARENT_TREE or
        trust.get("proof_generation_repaired") is not True or
        trust.get("historical_candidate_identity_reused") is not False
    ):
        raise AssertionError("candidate_source_parent_invalid")
    if trust.get("source_proof",{}).get("git_blob_sha1")!=EXPECTED_BLOBS[
        "scripts/prove_buy_void_epoch2_live_composition_native_preentry_v3_source.py"
    ]:
        raise AssertionError("candidate_source_proof_invalid")
    if trust.get("source_workflow",{}).get("git_blob_sha1")!=EXPECTED_BLOBS[
        ".github/workflows/buy-void-epoch2-live-composition-native-preentry-v3-source.yml"
    ]:
        raise AssertionError("candidate_source_workflow_invalid")
    if trust.get("sealed_v2",{}).get("git_blob_sha1")!=EXPECTED_BLOBS[
        "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs"
    ]:
        raise AssertionError("candidate_sealed_v2_invalid")
    if trust.get("operator_first_entry_preservation_workflow",{}).get(
        "git_blob_sha1"
    )!=EXPECTED_BLOBS[
        ".github/workflows/buy-void-epoch2-operator-first-entry-v1.yml"
    ]:
        raise AssertionError("candidate_preservation_workflow_invalid")

    source=value.get("source")
    runner=value.get("runner")
    binary=value.get("binary")
    authority=value.get("authority")
    if not all(isinstance(x,dict) for x in (source,runner,binary,authority)):
        raise AssertionError("candidate_sections_missing")

    if source.get("git_blob_sha1")!=EXPECTED_BLOBS[
        "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
    ]:
        raise AssertionError("candidate_native_source_invalid")
    if runner.get("git_blob_sha1")!=EXPECTED_BLOBS[
        "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
    ]:
        raise AssertionError("candidate_runner_source_invalid")

    if binary.get("sha256")!="85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8":
        raise AssertionError("candidate_native_binary_invalid")
    if binary.get("bytes")!=726976 or binary.get("pt_interp_absent") is not True:
        raise AssertionError("candidate_native_shape_invalid")
    if binary.get("static_link_required") is not True:
        raise AssertionError("candidate_static_link_invalid")
    if binary.get("hostile_ld_preload_preentry_blocked") is not True:
        raise AssertionError("candidate_loader_control_invalid")
    if binary.get("two_builds_byte_identical") is not True:
        raise AssertionError("candidate_two_build_identity_invalid")

    if runner.get("sha256")!="7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94":
        raise AssertionError("candidate_runner_sha_invalid")
    if runner.get("bytes")!=45147 or runner.get("install_mode")!="0444":
        raise AssertionError("candidate_runner_shape_invalid")

    for key in (
        "candidate_accepted","native_binary_identity_accepted",
        "runner_identity_accepted","protected_install_authorized",
        "live_execution_authorized","credential_access","private_key_access",
        "signing_authorized","transaction","payment_acceptance",
        "public_presale_activation","wc_void_market_activation","funds_movement",
    ):
        if authority.get(key) is not False:
            raise AssertionError("candidate_authority_overclaim:"+key)
    if authority.get("source_only_candidate") is not True:
        raise AssertionError("candidate_source_only_missing")
    if authority.get("candidate_report_filesystem_write") is not True:
        raise AssertionError("candidate_report_write_boundary_missing")

def lock_body()->dict:
    return json.loads(r'''{"schema":"void_buy_void_epoch2_live_composition_native_candidate_lock_v6r2","marker":"VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V6R2","version":2,"repository":"6ZoSo9/void-node","source_head":"a3896576a0a716337f679deb26de36dc039219e0","source_parent_tree":"7f9fe7beb108368039fdc97ee58b1c6dfb4a69eb","candidate_head":"26a06fe84f93ba48107809a9bd14263c34fa961e","candidate_merge_head":"01dfaa59faa3e9779c6f4fd4cce4a470002954db","operator_first_entry_preservation_workflow_git_blob_sha1":"c66c1cd21ce762a128d7a25be8cec22686bca993","candidate_hosted_evidence":{"workflow_run":38917039455,"source_proof_job":117027051388,"derive_job_a":117027209906,"derive_job_b":117027209789,"derive_job_c":117027210285,"artifact_a":12053625069,"artifact_b":12052617917,"artifact_c":12053430439,"compare_job":117027434340,"three_report_byte_identity_verified":true,"independent_rederivation_verified":true},"candidate_report":{"bytes":60020,"sha256":"b5bd9b236cfdf821e7fbef4a97ad8e64632aa01503fa4f5a1daf0d1db2535c5f","git_blob_sha1":"ae6cc402d821fa5e3a37716f37285a1d600dfa18","candidate_id":"voidbuye2nativecand6r2_5d643422fb1c53686edd9386d6a65f000d9f399538bf94cca98b232fdfb15e8d","source_parent":"a3896576a0a716337f679deb26de36dc039219e0","source_parent_tree":"7f9fe7beb108368039fdc97ee58b1c6dfb4a69eb","operator_first_entry_preservation_workflow_git_blob_sha1":"c66c1cd21ce762a128d7a25be8cec22686bca993","candidate_script_git_blob_sha1":"c4ac12562f1ce396d7b584ad10a5e86742d49d1a","candidate_workflow_git_blob_sha1":"ec0b991750ea9f816d3b170cc007977977e01047","source_proof_git_blob_sha1":"b48972c0f930f5a33754a390bd2289853fc93c93","source_workflow_git_blob_sha1":"428bd68439ab5b7251632107839346d6b18fc769","native_source_git_blob_sha1":"5021727f1def1ec11f870d735cab65acc1701a5e","runner_source_git_blob_sha1":"499df9b94b5b89354837570da0c7e47ec280025d","sealed_v2_git_blob_sha1":"14cbe81e27d04fee77cbe75225ce308bf8561a7b","native_binary_sha256":"85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8","native_binary_bytes":726976,"runner_sha256":"7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94","runner_bytes":45147,"toolchain_closure_bound":true,"static_no_interp":true,"hostile_ld_preload_blocked":true,"historical_candidate_identity_reused":false},"candidate_accepted":true,"native_binary_identity_accepted":true,"runner_identity_accepted":true,"protected_install_authorized":false,"live_execution_authorized":false,"credential_access_authorized":false,"private_key_access_authorized":false,"signing_authorized":false,"transaction_authorized":false,"payment_acceptance_authorized":false,"public_presale_activation_authorized":false,"wc_void_market_activation_authorized":false,"treasury_liquidity_action_authorized":false,"funds_movement_authorized":false,"production_host_evidence_authority":false,"historical_v6_lock_reused":false,"next_gate":"void_buy_void_epoch2_live_composition_native_candidate_materializer_v6r2"}''')

def derive_lock()->bytes:
    verify_repository()
    _,candidate=derive_candidate_report()
    verify_candidate(candidate)
    body=lock_body()
    lock_id="voidbuye2nativecandlock6r2_"+sha256(canonical(body))
    if lock_id!=EXPECTED_LOCK_ID:
        raise AssertionError("lock_id_derivation_mismatch")
    value={**body,"lock_id":lock_id}
    return (json.dumps(value,indent=2,ensure_ascii=True)+"\n").encode("utf-8")

def verify_committed_lock()->bytes:
    expected=derive_lock()
    committed=direct_file(LOCK,128*1024)
    if committed!=expected:
        raise AssertionError("committed_lock_bytes_mismatch")
    parsed=json.loads(committed)
    if parsed.get("lock_id")!=EXPECTED_LOCK_ID:
        raise AssertionError("committed_lock_id_mismatch")
    return committed

def main()->None:
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test",action="store_true")
    mode.add_argument("--derive",action="store_true")
    args=parser.parse_args()

    if args.derive:
        os.write(1,derive_lock())
        return

    verify_committed_lock()
    print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V6R2_GREEN")
    print("lock_id="+EXPECTED_LOCK_ID)
    print("candidate_report_sha256="+EXPECTED_REPORT_SHA256)
    print("candidate_report_git_blob_sha1="+EXPECTED_REPORT_GIT_BLOB_SHA1)
    print("candidate_id="+EXPECTED_CANDIDATE_ID)
    print("native_binary_sha256=85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8")
    print("native_binary_bytes=726976")
    print("runner_sha256=7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94")
    print("runner_bytes=45147")
    print("candidate_workflow_bound=true")
    print("hosted_three_report_identity_bound=true")
    print("hosted_independent_rederivation_bound=true")
    print("candidate_accepted=true")
    print("native_binary_identity_accepted=true")
    print("runner_identity_accepted=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("private_key_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("payment_acceptance_authorized=false")
    print("public_presale_activation_authorized=false")
    print("wc_void_market_activation_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement_authorized=false")
    print("production_host_evidence_authority=false")
    print("canonical_preservation_parent_bound=true")
    print("historical_v6_lock_reused=false")
    print("next_gate=void_buy_void_epoch2_live_composition_native_candidate_materializer_v6r2")

if __name__=="__main__":
    main()

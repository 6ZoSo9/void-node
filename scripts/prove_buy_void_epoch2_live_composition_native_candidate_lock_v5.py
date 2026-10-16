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

LOCK_REL="ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v5.json"
LOCK=ROOT/LOCK_REL
CANDIDATE_REL="scripts/prove_buy_void_epoch2_live_composition_native_candidate_v5.py"
CANDIDATE=ROOT/CANDIDATE_REL
CANDIDATE_WORKFLOW_REL=".github/workflows/buy-void-epoch2-live-composition-native-candidate-v5.yml"

SOURCE_HEAD="cfbdf2d40382be1a32b6ba08be61385b5cfeaadd"
CANDIDATE_HEAD="3d84bdb417f45e3bab450f7a90c5e4c64130f4f1"
LOCK_BASE=CANDIDATE_HEAD

EXPECTED_LOCK_ID=(
    "voidbuye2nativecandlock5_"
    "650ae9975eeb898279649e48115cdfec242052c0853b0ce5af19244d4d304126"
)
EXPECTED_REPORT_BYTES=59709
EXPECTED_REPORT_SHA256="327de6a4e56aa3a677f66ee04b5342d8923a19ab09d3e16ed3f82ef8cda2fcb2"
EXPECTED_REPORT_GIT_BLOB_SHA1="cb53a777b51c990b3f34223d20242c04a047f1bf"
EXPECTED_CANDIDATE_ID=(
    "voidbuye2nativecand5_"
    "a377212ff699fb3463d2bfeecc61a16416a98ed5a291771c4a8a73aa003e6308"
)

EXPECTED_BLOBS={
    CANDIDATE_REL:"bc1b7575e8a77d98b81252da39b6e2d3c10760d9",
    CANDIDATE_WORKFLOW_REL:"9a2999cf36c3665109632762317b1aa094baf921",
    "scripts/prove_buy_void_epoch2_live_composition_native_preentry_v3_source.py":
        "3918e59fa7393824f2c98d129dfbead3d3867d99",
    ".github/workflows/buy-void-epoch2-live-composition-native-preentry-v3-source.yml":
        "43e791da6b7513bf945731f888f0590fc99c7773",
    "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c":
        "5021727f1def1ec11f870d735cab65acc1701a5e",
    "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs":
        "baab733e43c030d24f8d4abd1644f3c4ae55c3b2",
    "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs":
        "14cbe81e27d04fee77cbe75225ce308bf8561a7b",
}

EXPECTED_SCOPE=tuple(sorted((
    ".github/workflows/buy-void-epoch2-live-composition-native-candidate-lock-v5.yml",
    "docs/operators/buy-void-epoch2-live-composition-native-candidate-lock-v5.md",
    LOCK_REL,
    "scripts/prove_buy_void_epoch2_live_composition_native_candidate_lock_v5.py",
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
    git(["merge-base","--is-ancestor",SOURCE_HEAD,CANDIDATE_HEAD])
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
    with tempfile.TemporaryDirectory(prefix="void-e2-native-lock-v5-") as td:
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
    if value.get("marker")!="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_V5":
        raise AssertionError("candidate_marker_invalid")
    if value.get("version")!=5:
        raise AssertionError("candidate_version_invalid")
    if value.get("candidate_id")!=EXPECTED_CANDIDATE_ID:
        raise AssertionError("candidate_id_invalid")
    if value.get("status")!="candidate_only_unaccepted":
        raise AssertionError("candidate_status_invalid")

    trust=value.get("trust_root")
    if not isinstance(trust,dict):
        raise AssertionError("candidate_trust_root_missing")
    if trust.get("source_parent")!=SOURCE_HEAD:
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

    if runner.get("sha256")!="f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889":
        raise AssertionError("candidate_runner_sha_invalid")
    if runner.get("bytes")!=40616 or runner.get("install_mode")!="0444":
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
    return {
      "schema":"void_buy_void_epoch2_live_composition_native_candidate_lock_v5",
      "marker":"VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V5",
      "version":5,
      "repository":"6ZoSo9/void-node",
      "source_head":SOURCE_HEAD,
      "candidate_head":CANDIDATE_HEAD,
      "candidate_hosted_evidence":{
        "workflow_run":38899596489,
        "source_proof_job":116968267827,
        "derive_job_a":116968416516,
        "derive_job_b":116968416479,
        "derive_job_c":116968416566,
        "artifact_a":12045477538,
        "artifact_b":12045312506,
        "artifact_c":12045492448,
        "compare_job":116968592392,
        "three_report_byte_identity_verified":True,
        "independent_rederivation_verified":True,
      },
      "candidate_report":{
        "bytes":EXPECTED_REPORT_BYTES,
        "sha256":EXPECTED_REPORT_SHA256,
        "git_blob_sha1":EXPECTED_REPORT_GIT_BLOB_SHA1,
        "candidate_id":EXPECTED_CANDIDATE_ID,
        "source_parent":SOURCE_HEAD,
        "candidate_script_git_blob_sha1":EXPECTED_BLOBS[CANDIDATE_REL],
        "candidate_workflow_git_blob_sha1":EXPECTED_BLOBS[CANDIDATE_WORKFLOW_REL],
        "source_proof_git_blob_sha1":EXPECTED_BLOBS[
            "scripts/prove_buy_void_epoch2_live_composition_native_preentry_v3_source.py"
        ],
        "source_workflow_git_blob_sha1":EXPECTED_BLOBS[
            ".github/workflows/buy-void-epoch2-live-composition-native-preentry-v3-source.yml"
        ],
        "native_source_git_blob_sha1":EXPECTED_BLOBS[
            "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
        ],
        "runner_source_git_blob_sha1":EXPECTED_BLOBS[
            "ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
        ],
        "sealed_v2_git_blob_sha1":EXPECTED_BLOBS[
            "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs"
        ],
        "native_binary_sha256":
            "85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8",
        "native_binary_bytes":726976,
        "runner_sha256":
            "f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889",
        "runner_bytes":40616,
        "toolchain_closure_bound":True,
        "static_no_interp":True,
        "hostile_ld_preload_blocked":True,
      },
      "candidate_accepted":True,
      "native_binary_identity_accepted":True,
      "runner_identity_accepted":True,
      "protected_install_authorized":False,
      "live_execution_authorized":False,
      "credential_access_authorized":False,
      "private_key_access_authorized":False,
      "signing_authorized":False,
      "transaction_authorized":False,
      "payment_acceptance_authorized":False,
      "public_presale_activation_authorized":False,
      "wc_void_market_activation_authorized":False,
      "treasury_liquidity_action_authorized":False,
      "funds_movement_authorized":False,
      "production_host_evidence_authority":False,
      "next_gate":"void_buy_void_epoch2_live_composition_native_protected_install_v3",
    }

def derive_lock()->bytes:
    verify_repository()
    _,candidate=derive_candidate_report()
    verify_candidate(candidate)
    body=lock_body()
    lock_id="voidbuye2nativecandlock5_"+sha256(canonical(body))
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
    print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V5_GREEN")
    print("lock_id="+EXPECTED_LOCK_ID)
    print("candidate_report_sha256="+EXPECTED_REPORT_SHA256)
    print("candidate_report_git_blob_sha1="+EXPECTED_REPORT_GIT_BLOB_SHA1)
    print("candidate_id="+EXPECTED_CANDIDATE_ID)
    print("native_binary_sha256=85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8")
    print("native_binary_bytes=726976")
    print("runner_sha256=f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889")
    print("runner_bytes=40616")
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
    print("next_gate=void_buy_void_epoch2_live_composition_native_protected_install_v3")

if __name__=="__main__":
    main()

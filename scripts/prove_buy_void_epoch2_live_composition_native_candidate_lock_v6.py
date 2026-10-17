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

LOCK_REL="ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6.json"
LOCK=ROOT/LOCK_REL
CANDIDATE_REL="scripts/prove_buy_void_epoch2_live_composition_native_candidate_v6.py"
CANDIDATE=ROOT/CANDIDATE_REL
CANDIDATE_WORKFLOW_REL=".github/workflows/buy-void-epoch2-live-composition-native-candidate-v6.yml"

SOURCE_HEAD="d85f1a7c65ff5997009bfaf3357b6cbf09b9569e"
CANDIDATE_HEAD="9fff4238090e861b5bd766478999771f42341fcf"
LOCK_BASE=CANDIDATE_HEAD

EXPECTED_LOCK_ID=(
    "voidbuye2nativecandlock6_"
    "016c2764d5d33c9078fd5120addd2ff7ef25c8d6bf30d5d6741b05a5036a1f22"
)
EXPECTED_REPORT_BYTES=59709
EXPECTED_REPORT_SHA256="7cbaa48b6b7aab75555fd9d55e1f1f1600a4653df35feed6b709c621256784fb"
EXPECTED_REPORT_GIT_BLOB_SHA1="00534c145fd07fbd4c5adafb404a6928c9e8ee20"
EXPECTED_CANDIDATE_ID=(
    "voidbuye2nativecand6_"
    "06aa80d52c84e6e466dc4c43ed21dcf1de79e1d69f0280ba9e3ffb8212404a53"
)

EXPECTED_BLOBS={
    CANDIDATE_REL:"8abbe3956d6b2a6f5599e3efa18010f622569e61",
    CANDIDATE_WORKFLOW_REL:"8e3879df85e6cb40e96b5905b6a72ca771f735de",
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
}

EXPECTED_SCOPE=tuple(sorted((
    ".github/workflows/buy-void-epoch2-live-composition-native-candidate-lock-v6.yml",
    "docs/operators/buy-void-epoch2-live-composition-native-candidate-lock-v6.md",
    LOCK_REL,
    "scripts/prove_buy_void_epoch2_live_composition_native_candidate_lock_v6.py",
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
    if value.get("marker")!="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_V6":
        raise AssertionError("candidate_marker_invalid")
    if value.get("version")!=6:
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
    return {
      "schema":"void_buy_void_epoch2_live_composition_native_candidate_lock_v6",
      "marker":"VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V6",
      "version":6,
      "repository":"6ZoSo9/void-node",
      "source_head":SOURCE_HEAD,
      "candidate_head":CANDIDATE_HEAD,
      "candidate_hosted_evidence":{
        "workflow_run":38912148111,
        "source_proof_job":117010396036,
        "derive_job_a":117010548739,
        "derive_job_b":117010548620,
        "derive_job_c":117010548525,
        "artifact_a":12050572961,
        "artifact_b":12051066274,
        "artifact_c":12051071169,
        "compare_job":117011425585,
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
            "7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94",
        "runner_bytes":45147,
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
      "next_gate":"void_buy_void_epoch2_live_composition_native_protected_install_v4",
    }

def derive_lock()->bytes:
    verify_repository()
    _,candidate=derive_candidate_report()
    verify_candidate(candidate)
    body=lock_body()
    lock_id="voidbuye2nativecandlock6_"+sha256(canonical(body))
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
    print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V6_GREEN")
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
    print("next_gate=void_buy_void_epoch2_live_composition_native_protected_install_v4")

if __name__=="__main__":
    main()

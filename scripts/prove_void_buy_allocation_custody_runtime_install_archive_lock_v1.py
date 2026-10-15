#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parent.parent
CANDIDATE_HEAD="b2257bcf7e28e22e0f90d6fa674798eeef9f7024"
TOOL_REL="tools/void-buy-allocation-custody-runtime-install-archive-v1.py"
TOOL_BLOB="169ce118eda9d0910990f019052372b72cfa0f80"
PARENT_PROOF_REL="scripts/prove_void_buy_allocation_custody_runtime_install_archive_v1.py"
PARENT_PROOF_BLOB="c86f9a70dc9ea49d479ece5c92a6122cc7e80fd5"
PARENT_WORKFLOW_REL=".github/workflows/buy-void-allocation-custody-runtime-install-archive-v1.yml"
PARENT_WORKFLOW_BLOB="ca5d22a48da4c2f28f5cdea270c831bfca5394e0"
LOCK_REL="ops/security/buy-void-allocation-custody-runtime-install-archive-lock-v1.json"
RUNTIME_LOCK_REL="ops/security/buy-void-allocation-custody-runtime-bundle-lock-v1.json"
RUNTIME_LOCK_BLOB="acb5da31527ab42919d411695b475a94af29abb1"
RUNTIME_LOCK_SHA256="998b1e211c78cd11b65224a51868687f7cdd76afcd07224482cf8ce862af1eec"
ARCHIVE_ID="voidbuycustodyarchive1_5685b87bba1987b7365909eb4bd684b89695f7d5e1253d59dcd63ff390732333"
ARCHIVE_BYTES=256000
ARCHIVE_SHA256="1fec540e1bac3f728bfa438512a6e0149eea1cda2ae5f2a05f4ec9f19a5a5c9d"
RUNTIME_BUNDLE_ID="voidbuycustodybundle1_2339d565cc1c298a3f7ca9cae2ef163831288007bb32d9e7c37c01880aaee704"
WORKFLOW_RUN=38672815457
ARTIFACTS={22:11945096600,24:11944836579,26:11945221437}
EXPECTED_DELTA=sorted([
    ".github/workflows/buy-void-allocation-custody-runtime-install-archive-lock-v1.yml",
    "docs/architecture/buy-void-allocation-custody-runtime-install-archive-lock-v1.md",
    LOCK_REL,
    "scripts/prove_void_buy_allocation_custody_runtime_install_archive_lock_v1.py",
])

spec=importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_install_archive_v1",
    ROOT/TOOL_REL,
)
assert spec is not None and spec.loader is not None
archive_module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive_module)

def run_git(*args:str)->str:
    p=subprocess.run(
        ["/usr/bin/git","--no-replace-objects","-C",str(ROOT),*args],
        text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        env={
            "PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C",
            "GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null",
            "GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1",
            "GIT_OPTIONAL_LOCKS":"0","GIT_TERMINAL_PROMPT":"0",
        },
        check=True,
    )
    return p.stdout.strip()

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def direct(path:Path)->bytes:
    st=path.lstat()
    assert path.is_file() and not path.is_symlink() and st.st_nlink==1
    return path.read_bytes()

def expected_lock()->dict:
    return {
        "schema":"void_buy_void_custody_runtime_install_archive_lock_v1",
        "marker":"VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_LOCK_V1",
        "version":1,
        "repository":"6ZoSo9/void-node",
        "candidate_head":CANDIDATE_HEAD,
        "candidate_hosted_evidence":{
            "workflow_run":WORKFLOW_RUN,
            "node22_artifact_id":ARTIFACTS[22],
            "node24_artifact_id":ARTIFACTS[24],
            "node26_artifact_id":ARTIFACTS[26],
            "cross_node_byte_identity_verified":True,
        },
        "candidate_evidence":{
            "candidate_id":ARCHIVE_ID,
            "bytes":ARCHIVE_BYTES,
            "sha256":ARCHIVE_SHA256,
            "runtime_file_count":10,
            "derivation_tool_path":TOOL_REL,
            "derivation_tool_git_blob_sha1":TOOL_BLOB,
            "candidate_proof_path":PARENT_PROOF_REL,
            "candidate_proof_git_blob_sha1":PARENT_PROOF_BLOB,
            "candidate_workflow_git_blob_sha1":PARENT_WORKFLOW_BLOB,
        },
        "accepted_runtime_bundle":{
            "lock_path":RUNTIME_LOCK_REL,
            "lock_git_blob_sha1":RUNTIME_LOCK_BLOB,
            "lock_sha256":RUNTIME_LOCK_SHA256,
            "candidate_id":RUNTIME_BUNDLE_ID,
        },
        "archive_candidate_accepted":True,
        "immutable_root_install":False,
        "install_target_selected":False,
        "existing_target_replaced":False,
        "node_binary_identity_verified":False,
        "request_root_selected":False,
        "shared_directory_selected":False,
        "service_unit_installed":False,
        "service_started":False,
        "service_restarted":False,
        "runtime_integration":False,
        "reserve_method_enabled":False,
        "recover_method_enabled":False,
        "payment_acceptance":False,
        "public_presale_activation":False,
        "production_gate_ready":False,
        "funds_movement":False,
    }

def wire(value:dict)->bytes:
    return (json.dumps(value,indent=2,ensure_ascii=True)+"\n").encode("utf-8")

def verify()->bytes:
    assert run_git("merge-base","--is-ancestor",CANDIDATE_HEAD,"HEAD")==""
    changed=sorted(x for x in run_git("diff","--name-only",CANDIDATE_HEAD,"HEAD","--").splitlines() if x)
    assert changed==EXPECTED_DELTA,("lock_branch_scope_drift",changed)
    assert run_git("rev-parse","HEAD:"+TOOL_REL)==TOOL_BLOB
    assert run_git("rev-parse","HEAD:"+PARENT_PROOF_REL)==PARENT_PROOF_BLOB
    assert run_git("rev-parse","HEAD:"+PARENT_WORKFLOW_REL)==PARENT_WORKFLOW_BLOB
    assert run_git("rev-parse","HEAD:"+RUNTIME_LOCK_REL)==RUNTIME_LOCK_BLOB

    runtime_lock=direct(ROOT/RUNTIME_LOCK_REL)
    assert sha256(runtime_lock)==RUNTIME_LOCK_SHA256
    runtime=json.loads(runtime_lock)
    assert runtime["candidate_accepted"] is True
    assert runtime["candidate_evidence"]["candidate_id"]==RUNTIME_BUNDLE_ID

    raw,record=archive_module.source_archive()
    assert record["archive_candidate_id"]==ARCHIVE_ID
    assert len(raw)==ARCHIVE_BYTES
    assert sha256(raw)==ARCHIVE_SHA256
    assert record["authority"]["archive_candidate_accepted"] is False

    with tempfile.TemporaryDirectory(prefix="void-custody-archive-lock-") as td:
        parent=Path(td); os.chmod(parent,0o700)
        archive=parent/archive_module.ARCHIVE_BASENAME
        archive_module.write_create_only(archive,raw)
        inspected=archive_module.inspect_archive(archive)
        assert inspected["archive_candidate_id"]==ARCHIVE_ID
        assert inspected["archive_bytes"]==ARCHIVE_BYTES
        assert inspected["archive_sha256"]==ARCHIVE_SHA256
        assert inspected["runtime_files_exact"]==10
        assert inspected["archive_candidate_accepted"] is False

    expected=wire(expected_lock())
    committed=direct(ROOT/LOCK_REL)
    assert committed==expected,"committed_lock_not_exact"
    return expected

def main()->None:
    p=argparse.ArgumentParser()
    p.add_argument("--derive",action="store_true")
    p.add_argument("--self-test",action="store_true")
    args=p.parse_args()
    raw=verify()
    if args.derive:
        os.write(1,raw)
        return
    print("VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_LOCK_V1_GREEN")
    print("archive_candidate_id="+ARCHIVE_ID)
    print("archive_bytes="+str(ARCHIVE_BYTES))
    print("archive_sha256="+ARCHIVE_SHA256)
    print("archive_candidate_accepted=true")
    print("immutable_root_install=false")
    print("existing_target_replaced=false")
    print("node_binary_identity_verified=false")
    print("runtime_integration=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("production_gate_ready=false")
    print("funds_movement=false")

if __name__=="__main__":
    main()

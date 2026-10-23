#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import stat
import subprocess
import sys
import tempfile
from typing import Any

MARKER="VOID_V7_V5_SOURCE_RECEIPT_STAGE_PAIR_QUALIFIER_V2"

SOURCE_STAGE=pathlib.Path("/opt/.void-buy-void-v7-reviewed-v1.stage-v5")
SOURCE_INTERNAL_STAGE=pathlib.Path("/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1")
FIXED_V4_SOURCE=pathlib.Path("/opt/void-buy-void-v7-reviewed-v1")
SOURCE_PREDECESSOR=pathlib.Path("/opt/void-buy-void-v7-reviewed-v1.predecessor-v4")

RECEIPT_STAGE=pathlib.Path(
    "/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5"
)
FIXED_V4_RECEIPT=pathlib.Path(
    "/var/lib/void-source-finality-v7/deployment-receipt.json"
)
RECEIPT_PREDECESSOR=pathlib.Path(
    "/var/lib/void-source-finality-v7/deployment-receipt-v4-predecessor.json"
)

V5_HEAD="3dc143bb16d7c1d1d5e0f674881cf12621818661"
V5_TREE="21e7fae2d3dfeb6a918c11799ae6644c6ca70a64"
V5_PARENT="b9d8ad7aec19592b104d47da4a496710d4fde8db"
V5_REACHABLE_COMMITS=18390

V4_HEAD="75927cae2c7ed0b4273e6218937dedf69824f64c"
V4_TREE="51fcfacd0303ae6e1c5aa8f4505fbff24ded3371"

V4_RECEIPT_ID=(
    "voidbsfdep1_3f128abf9c9d9c2fc97c8d3620be212b12542b0e57a149672bdb988efee1d5a1"
)
V4_RECEIPT_SHA256=(
    "da43b974970fdfee00f914d61064bee86d192ad9b67769f52696e1fbd05bfa87"
)
V4_RECEIPT_BYTES=1136

V5_RECEIPT_ID=(
    "voidbsfdep1_351215ea3296d4935a4ae845d8f975166a8da20723ce9a56f94d9f4c21f25244"
)
V5_RECEIPT_SHA256=(
    "2990e9bdef4793cc02f1dc0d502c1854f321f40202774e1e94939be9248efba6"
)
V5_RECEIPT_BYTES=1136

SHA40=re.compile(r"^[0-9a-f]{40}$")

class QualifyError(RuntimeError):
    pass

def run(
    argv:list[str],
    *,
    timeout:int=120,
    env:dict[str,str]|None=None,
)->subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=timeout,
        env=env,
    )

def git(root:pathlib.Path,*args:str,timeout:int=120)->str:
    cp=run(
        [
            "/usr/bin/git",
            "--no-replace-objects",
            "-c","core.hooksPath=/dev/null",
            "-c","core.fsmonitor=false",
            "-c","core.untrackedCache=false",
            "-c","submodule.recurse=false",
            "-c","pack.writeReverseIndex=false",
            "-c","safe.directory="+str(root),
            "-C",str(root),
            *args,
        ],
        timeout=timeout,
        env={
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
            "GIT_ASKPASS":"/bin/false",
            "GIT_NO_LAZY_FETCH":"1",
            "GIT_PROTOCOL_FROM_USER":"0",
            "GIT_ALLOW_PROTOCOL":"",
            "GIT_PAGER":"",
        },
    )
    if cp.returncode!=0 or cp.stderr:
        raise QualifyError("git_failed:"+(args[0] if args else "unknown"))
    return cp.stdout.decode("utf-8","strict").strip()

def meta(path:pathlib.Path)->dict[str,Any]:
    try:st=path.lstat()
    except FileNotFoundError:return {"exists":False}
    return {
        "exists":True,
        "kind":(
            "directory" if stat.S_ISDIR(st.st_mode)
            else "regular" if stat.S_ISREG(st.st_mode)
            else "symlink" if stat.S_ISLNK(st.st_mode)
            else "other"
        ),
        "dev":st.st_dev,"ino":st.st_ino,"uid":st.st_uid,"gid":st.st_gid,
        "mode":stat.S_IMODE(st.st_mode),"nlink":st.st_nlink,"size":st.st_size,
        "mtime_ns":st.st_mtime_ns,"ctime_ns":st.st_ctime_ns,
    }

def same_generation(a:dict[str,Any],b:dict[str,Any],label:str)->None:
    for key in ("dev","ino","uid","gid","mode","nlink","size","mtime_ns","ctime_ns"):
        if a.get(key)!=b.get(key):
            raise QualifyError(label+"_generation_changed:"+key)

def read_regular(path:pathlib.Path,max_bytes:int,label:str)->bytes:
    before=meta(path)
    if (
        not before.get("exists") or before.get("kind")!="regular"
        or before.get("nlink")!=1 or before.get("size",0)<=0
        or before.get("size",0)>max_bytes
    ):
        raise QualifyError(label+"_shape_invalid")
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        opened=os.fstat(fd)
        opened_meta={
            "dev":opened.st_dev,"ino":opened.st_ino,"uid":opened.st_uid,
            "gid":opened.st_gid,"mode":stat.S_IMODE(opened.st_mode),
            "nlink":opened.st_nlink,"size":opened.st_size,
            "mtime_ns":opened.st_mtime_ns,"ctime_ns":opened.st_ctime_ns,
        }
        same_generation(before,opened_meta,label+"_open")
        raw=bytearray()
        offset=0
        while offset<opened.st_size:
            part=os.pread(fd,min(64*1024,opened.st_size-offset),offset)
            if not part:raise QualifyError(label+"_short_read")
            raw.extend(part);offset+=len(part)
        if os.pread(fd,1,opened.st_size):
            raise QualifyError(label+"_grew")
        after=os.fstat(fd)
        after_meta={
            "dev":after.st_dev,"ino":after.st_ino,"uid":after.st_uid,
            "gid":after.st_gid,"mode":stat.S_IMODE(after.st_mode),
            "nlink":after.st_nlink,"size":after.st_size,
            "mtime_ns":after.st_mtime_ns,"ctime_ns":after.st_ctime_ns,
        }
        visible=meta(path)
        same_generation(opened_meta,after_meta,label+"_fd")
        same_generation(after_meta,visible,label+"_visible")
        return bytes(raw)
    finally:
        os.close(fd)

def verify_receipt(
    path:pathlib.Path,
    expected_id:str,
    expected_sha256:str,
    expected_bytes:int,
    label:str,
)->dict[str,Any]:
    raw=read_regular(path,64*1024,label)
    if len(raw)!=expected_bytes:
        raise QualifyError(label+"_bytes_mismatch")
    digest=hashlib.sha256(raw).hexdigest()
    if digest!=expected_sha256:
        raise QualifyError(label+"_sha256_mismatch")
    try:value=json.loads(raw.decode("utf-8","strict"))
    except (UnicodeError,json.JSONDecodeError) as exc:
        raise QualifyError(label+"_json_invalid") from exc
    if not isinstance(value,dict) or value.get("receipt_id")!=expected_id:
        raise QualifyError(label+"_id_mismatch")
    st=meta(path)
    if (
        st.get("uid")!=0 or st.get("gid")!=0
        or st.get("mode")!=0o444 or st.get("nlink")!=1
    ):
        raise QualifyError(label+"_custody_invalid")
    return {"receipt_id":expected_id,"sha256":digest,"bytes":len(raw),"metadata":st}

def verify_source(
    root:pathlib.Path,
    *,
    expected_head:str,
    expected_tree:str,
    expected_parent:str|None,
    expected_count:int|None,
    expected_root_mode:int|None,
    label:str,
)->dict[str,Any]:
    st=meta(root)
    if (
        not st.get("exists") or st.get("kind")!="directory"
        or st.get("uid")!=0 or st.get("gid")!=0
        or (
            st.get("mode")!=expected_root_mode
            if expected_root_mode is not None
            else bool(st.get("mode",0)&0o022)
        )
    ):
        raise QualifyError(label+"_root_custody_invalid")
    if root.resolve(strict=True)!=root:
        raise QualifyError(label+"_root_alias")
    head=git(root,"rev-parse","--verify","HEAD^{commit}")
    tree=git(root,"rev-parse","--verify","HEAD^{tree}")
    branch=git(root,"symbolic-ref","--quiet","--short","HEAD")
    status=git(root,"status","--porcelain=v1","--untracked-files=all")
    shallow=git(root,"rev-parse","--is-shallow-repository")
    if head!=expected_head:raise QualifyError(label+"_head_mismatch")
    if tree!=expected_tree:raise QualifyError(label+"_tree_mismatch")
    if branch!="main":raise QualifyError(label+"_branch_mismatch")
    if status!="":raise QualifyError(label+"_dirty")
    if expected_parent is not None:
        parents=git(root,"rev-list","--parents","-n","1","HEAD").split()
        if parents!=[expected_head,expected_parent]:
            raise QualifyError(label+"_parent_mismatch")
    if expected_count is not None:
        if shallow!="false":raise QualifyError(label+"_shallow")
        count=git(root,"rev-list","--count",expected_head)
        if count!=str(expected_count):
            raise QualifyError(label+"_reachable_commit_count_mismatch")
        missing=git(
            root,"rev-list","--objects","--missing=print",expected_head,
            timeout=180,
        )
        if any(line.startswith("?") for line in missing.splitlines()):
            raise QualifyError(label+"_missing_reachable_object")
        fsck=git(root,"fsck","--strict","--no-reflogs","--full",timeout=180)
        if fsck!="":
            raise QualifyError(label+"_fsck_output_nonempty")
    return {
        "path":str(root),"head":head,"tree":tree,"branch":branch,
        "clean":True,"shallow":shallow=="true",
        "reachable_commits":expected_count,
        "metadata":st,
    }

def self_test()->None:
    assert SHA40.fullmatch(V5_HEAD)
    assert SHA40.fullmatch(V5_TREE)
    assert SHA40.fullmatch(V5_PARENT)
    assert V5_REACHABLE_COMMITS==18390
    assert SOURCE_STAGE.name==".void-buy-void-v7-reviewed-v1.stage-v5"
    assert RECEIPT_STAGE.name==".deployment-receipt.json.stage-v5"
    assert len(V5_RECEIPT_SHA256)==64
    assert V5_RECEIPT_BYTES==1136
    with tempfile.TemporaryDirectory(prefix="void-v5-stage-pair-") as td:
        p=pathlib.Path(td)/"receipt"
        p.write_bytes(b"x")
        try:
            verify_receipt(p,"voidbsfdep1_"+"0"*64,"0"*64,1,"fixture")
        except QualifyError:
            pass
        else:
            raise AssertionError("bad_receipt_fixture_accepted")
    print(MARKER+"_SELF_TEST_GREEN")
    print("fixed_paths_only=true")
    print("source_stage_exact_v5_generation_required=true")
    print("source_stage_root_mode_0755_required=true")
    print("fixed_v4_source_root_owned_nonwritable_required=true")
    print("source_internal_stage_build_v1_required=true")
    print("receipt_stage_exact_v5_identity_required=true")
    print("fixed_v4_pair_unchanged_required=true")
    print("reserved_predecessor_paths_absent_required=true")
    print("journal_fence_path_selection_deferred=true")
    print("exchange_preconditions_complete=false")
    print("exchange_authority=false")
    print("runtime_cutover_authority=false")
    print("filesystem_mutation=false")
    print("service_mutation=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

def inspect()->int:
    if os.geteuid()==0:
        raise QualifyError("sudo_invocation_forbidden")
    if SOURCE_INTERNAL_STAGE.exists() or SOURCE_INTERNAL_STAGE.is_symlink():
        raise QualifyError("source_internal_stage_residual_present")
    if SOURCE_PREDECESSOR.exists() or SOURCE_PREDECESSOR.is_symlink():
        raise QualifyError("source_predecessor_present")
    if RECEIPT_PREDECESSOR.exists() or RECEIPT_PREDECESSOR.is_symlink():
        raise QualifyError("receipt_predecessor_present")

    fixed_source=verify_source(
        FIXED_V4_SOURCE,
        expected_head=V4_HEAD,
        expected_tree=V4_TREE,
        expected_parent=None,
        expected_count=None,
        expected_root_mode=None,
        label="fixed_v4_source",
    )
    fixed_receipt=verify_receipt(
        FIXED_V4_RECEIPT,V4_RECEIPT_ID,V4_RECEIPT_SHA256,V4_RECEIPT_BYTES,
        "fixed_v4_receipt",
    )
    v5_source=verify_source(
        SOURCE_STAGE,
        expected_head=V5_HEAD,
        expected_tree=V5_TREE,
        expected_parent=V5_PARENT,
        expected_count=V5_REACHABLE_COMMITS,
        expected_root_mode=0o755,
        label="v5_source_stage",
    )
    v5_receipt=verify_receipt(
        RECEIPT_STAGE,V5_RECEIPT_ID,V5_RECEIPT_SHA256,V5_RECEIPT_BYTES,
        "v5_receipt_stage",
    )

    if fixed_source["metadata"]["dev"]!=v5_source["metadata"]["dev"]:
        raise QualifyError("source_stage_not_same_filesystem_as_fixed_source")
    if fixed_receipt["metadata"]["dev"]!=v5_receipt["metadata"]["dev"]:
        raise QualifyError("receipt_stage_not_same_filesystem_as_fixed_receipt")

    print(MARKER+"_GREEN")
    print("read_only=true")
    print("sudo_invocation=false")
    print("filesystem_mutation=false")
    print("v5_source_stage_exact=true")
    print("v5_source_stage_mode_0755=true")
    print("fixed_v4_source_root_owned_nonwritable=true")
    print("v5_source_head="+V5_HEAD)
    print("v5_source_tree="+V5_TREE)
    print("v5_source_reachable_commits="+str(V5_REACHABLE_COMMITS))
    print("v5_receipt_stage_exact=true")
    print("v5_receipt_id="+V5_RECEIPT_ID)
    print("v5_receipt_sha256="+V5_RECEIPT_SHA256)
    print("v5_receipt_bytes="+str(V5_RECEIPT_BYTES))
    print("fixed_v4_source_unchanged=true")
    print("fixed_v4_receipt_unchanged=true")
    print("source_predecessor_absent=true")
    print("receipt_predecessor_absent=true")
    print("source_internal_stage_absent=true")
    print("source_same_filesystem=true")
    print("receipt_same_filesystem=true")
    print("staging_pair_exact=true")
    print("journal_fence_path_selection_deferred=true")
    print("exchange_preconditions_complete=false")
    print("fixed_source_exchange_authority=false")
    print("fixed_receipt_exchange_authority=false")
    print("runtime_cutover_authority=false")
    print("service_mutation=false")
    print("credential_wallet_signer_transaction_authority=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print("next_gate=DEFINE_HARDENED_EXCHANGE_IMPLEMENTATION_JOURNAL_AND_FENCE_PATHS")
    return 0

def main()->int:
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test",action="store_true")
    group.add_argument("--inspect",action="store_true")
    args=parser.parse_args()
    if args.self_test:self_test();return 0
    return inspect()

if __name__=="__main__":
    try:
        raise SystemExit(main())
    except (QualifyError,OSError,subprocess.SubprocessError,UnicodeError,json.JSONDecodeError) as exc:
        print(MARKER+"_HOLD")
        print("reason="+re.sub(r"[^A-Za-z0-9_:./-]","_",str(exc)[:500]))
        print("read_only=true")
        print("filesystem_mutation=false")
        print("staging_pair_exact=false")
        print("exchange_preconditions_complete=false")
        print("fixed_source_exchange_authority=false")
        print("fixed_receipt_exchange_authority=false")
        print("runtime_cutover_authority=false")
        print("service_mutation=false")
        print("credential_wallet_signer_transaction_authority=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import types

ROOT=Path(__file__).resolve().parents[1]
LOCK=ROOT/"ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
LOCK_BLOB="f5b03c6b81016edf21f605099e0ef8976f40e107"
LOCK_ID="voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"

CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_dormant_first_entry_bootstrap_v6_candidate_v1.py"
CANDIDATE_BLOB="b963ac9ef0b9c8ac685763b3a82375f970ef12df"

MANIFEST=ROOT/"ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
MANIFEST_BLOB="6e0630af72111bd9976dcc38cdcdada1904dd067"
MANIFEST_BYTES=2382
MANIFEST_SHA256="aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"

EXPECTED_CANDIDATE_ID="voidbuye2dormantbootstrapcand3_13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062"
EXPECTED_BINARY_BYTES=874608
EXPECTED_BINARY_SHA256="c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
EXPECTED_BINARY_GIT_BLOB="a91707c3e5803071fc73c3451c9bcb3b774f8b48"

MARKER="VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_MATERIALIZER_V1"
BOOTSTRAP_NAME="void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6"
MANIFEST_NAME="source-generation-v3.conf"
SUMS_NAME="SHA256SUMS_epoch2_dormant_first_entry_bootstrap_v6.txt"

class MaterializeError(RuntimeError):
    pass

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

def direct(path:Path,maximum:int)->bytes:
    before=path.lstat()
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or before.st_nlink!=1 or before.st_size<1 or before.st_size>maximum:
        raise MaterializeError("source_metadata_invalid:"+str(path))
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    try:
        opened=os.fstat(fd)
        if (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns)!=(opened.st_dev,opened.st_ino,opened.st_size,opened.st_mtime_ns,opened.st_ctime_ns):
            raise MaterializeError("source_rebound:"+str(path))
        out=bytearray()
        while len(out)<before.st_size:
            chunk=os.read(fd,min(1024*1024,before.st_size-len(out)))
            if not chunk: raise MaterializeError("source_short_read:"+str(path))
            out.extend(chunk)
        if os.read(fd,1): raise MaterializeError("source_grew:"+str(path))
        after=os.fstat(fd); visible=path.lstat()
        for field in ("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns"):
            if getattr(opened,field)!=getattr(after,field) or getattr(after,field)!=getattr(visible,field):
                raise MaterializeError("source_changed:"+str(path))
    finally:
        os.close(fd)
    return bytes(out)

def accepted_inputs()->tuple[bytes,bytes,bytes,dict]:
    lock_raw=direct(LOCK,128*1024)
    candidate_raw=direct(CANDIDATE,256*1024)
    manifest_raw=direct(MANIFEST,64*1024)
    if git_blob(lock_raw)!=LOCK_BLOB: raise MaterializeError("accepted_lock_blob_mismatch")
    if git_blob(candidate_raw)!=CANDIDATE_BLOB: raise MaterializeError("candidate_tool_blob_mismatch")
    if git_blob(manifest_raw)!=MANIFEST_BLOB or len(manifest_raw)!=MANIFEST_BYTES or sha256(manifest_raw)!=MANIFEST_SHA256:
        raise MaterializeError("manifest_identity_mismatch")
    try:
        lock=json.loads(lock_raw)
    except json.JSONDecodeError as exc:
        raise MaterializeError("accepted_lock_json_invalid") from exc
    required={
        "lock_id":LOCK_ID,
        "candidate_accepted":True,
        "native_binary_identity_accepted":True,
        "source_generation_identity_accepted":True,
        "protected_install_authorized":False,
        "live_execution_authorized":False,
        "credential_access_authorized":False,
        "signing_authorized":False,
        "transaction_authorized":False,
        "rpc_call_authorized":False,
        "funds_movement_authorized":False,
        "next_gate":"void_buy_void_epoch2_dormant_first_entry_bootstrap_v6_materializer_v1",
    }
    for key,want in required.items():
        if lock.get(key)!=want: raise MaterializeError("accepted_lock_field_mismatch:"+key)
    report=lock.get("candidate_report")
    binary=lock.get("native_binary")
    if not isinstance(report,dict) or not isinstance(binary,dict):
        raise MaterializeError("accepted_lock_candidate_identity_missing")
    if report.get("candidate_id")!=EXPECTED_CANDIDATE_ID or report.get("candidate_script_git_blob_sha1")!=CANDIDATE_BLOB:
        raise MaterializeError("accepted_lock_candidate_mismatch")
    if (
        report.get("compiler_logical_source_name")!="stdin"
        or report.get("distinct_source_fd_numbers_exercised") is not True
        or report.get("descriptor_number_not_candidate_identity") is not True
    ):
        raise MaterializeError("accepted_lock_descriptor_independence_missing")
    if (
        binary.get("bytes")!=EXPECTED_BINARY_BYTES
        or binary.get("sha256")!=EXPECTED_BINARY_SHA256
        or binary.get("distinct_source_fd_builds_byte_identical") is not True
    ):
        raise MaterializeError("accepted_lock_binary_mismatch")
    sg=lock.get("source_generation")
    if not isinstance(sg,dict) or sg.get("manifest_git_blob_sha1")!=MANIFEST_BLOB or sg.get("manifest_sha256")!=MANIFEST_SHA256:
        raise MaterializeError("accepted_lock_source_generation_mismatch")
    return lock_raw,candidate_raw,manifest_raw,lock

def load_candidate(raw:bytes):
    module=types.ModuleType("void_epoch2_dormant_first_entry_bootstrap_v6_candidate_v1")
    module.__file__=os.fspath(CANDIDATE)
    module.__package__=""
    code=compile(raw,os.fspath(CANDIDATE),"exec",dont_inherit=True,optimize=0)
    exec(code,module.__dict__)
    derive=getattr(module,"derive",None)
    validate=getattr(module,"validate",None)
    if not callable(derive) or not callable(validate):
        raise MaterializeError("candidate_entry_missing")
    return module

def derive_material()->tuple[bytes,bytes]:
    _,candidate_raw,manifest_raw,_=accepted_inputs()
    module=load_candidate(candidate_raw)
    try:
        report,binary=module.derive()
        module.validate(report)
    except Exception as exc:
        raise MaterializeError("candidate_derivation_failed") from exc
    if not isinstance(report,dict) or report.get("candidate_id")!=EXPECTED_CANDIDATE_ID:
        raise MaterializeError("materialized_candidate_id_mismatch")
    if not isinstance(binary,bytes) or len(binary)!=EXPECTED_BINARY_BYTES or sha256(binary)!=EXPECTED_BINARY_SHA256:
        raise MaterializeError("materialized_binary_identity_mismatch")
    if report.get("binary",{}).get("sha256")!=EXPECTED_BINARY_SHA256 or report.get("binary",{}).get("bytes")!=EXPECTED_BINARY_BYTES:
        raise MaterializeError("materialized_report_binary_mismatch")
    if (
        report.get("build_input",{}).get("compiler_logical_source_name")!="stdin"
        or report.get("build_input",{}).get("distinct_source_fd_numbers_exercised") is not True
        or report.get("build_input",{}).get("descriptor_number_not_candidate_identity") is not True
        or report.get("binary",{}).get("distinct_source_fd_builds_byte_identical") is not True
    ):
        raise MaterializeError("materialized_descriptor_independence_missing")
    if git_blob(binary)!=EXPECTED_BINARY_GIT_BLOB:
        raise MaterializeError("materialized_binary_git_blob_mismatch")
    return binary,manifest_raw

def write_file(parent_fd:int,name:str,raw:bytes,mode:int)->None:
    try:
        fd=os.open(name,os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,mode,dir_fd=parent_fd)
    except FileExistsError as exc:
        raise MaterializeError("output_exists:"+name) from exc
    try:
        view=memoryview(raw); offset=0
        while offset<len(view):
            n=os.write(fd,view[offset:])
            if n<=0: raise MaterializeError("output_short_write:"+name)
            offset+=n
        os.fchmod(fd,mode); os.fsync(fd)
        st=os.fstat(fd)
        if not stat.S_ISREG(st.st_mode) or st.st_nlink!=1 or stat.S_IMODE(st.st_mode)!=mode or st.st_size!=len(raw):
            raise MaterializeError("output_metadata_invalid:"+name)
        os.lseek(fd,0,os.SEEK_SET)
        out=bytearray()
        while len(out)<len(raw):
            chunk=os.read(fd,min(1024*1024,len(raw)-len(out)))
            if not chunk: raise MaterializeError("output_short_read:"+name)
            out.extend(chunk)
        if os.read(fd,1) or bytes(out)!=raw:
            raise MaterializeError("output_readback_mismatch:"+name)
    finally:
        os.close(fd)

def write_dir(output:Path,binary:bytes,manifest:bytes)->None:
    output=Path(os.path.abspath(os.fspath(output)))
    parent=output.parent
    before=parent.lstat()
    if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode):
        raise MaterializeError("output_parent_invalid")
    parent_fd=os.open(parent,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW)
    out_fd=None
    try:
        opened=os.fstat(parent_fd)
        if (opened.st_dev,opened.st_ino)!=(before.st_dev,before.st_ino):
            raise MaterializeError("output_parent_rebound")
        try:
            os.mkdir(output.name,0o755,dir_fd=parent_fd)
        except FileExistsError as exc:
            raise MaterializeError("output_directory_exists") from exc
        out_fd=os.open(output.name,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,dir_fd=parent_fd)
        write_file(out_fd,BOOTSTRAP_NAME,binary,0o555)
        write_file(out_fd,MANIFEST_NAME,manifest,0o444)
        sums=(
            EXPECTED_BINARY_SHA256+"  "+BOOTSTRAP_NAME+"\n"+
            MANIFEST_SHA256+"  "+MANIFEST_NAME+"\n"
        ).encode("ascii")
        write_file(out_fd,SUMS_NAME,sums,0o444)
        os.fsync(out_fd); os.fsync(parent_fd)
        visible=os.stat(output.name,dir_fd=parent_fd,follow_symlinks=False)
        opened_out=os.fstat(out_fd)
        if (visible.st_dev,visible.st_ino)!=(opened_out.st_dev,opened_out.st_ino):
            raise MaterializeError("output_directory_generation_changed")
    finally:
        if out_fd is not None: os.close(out_fd)
        os.close(parent_fd)

def self_test()->None:
    accepted_inputs()
    assert EXPECTED_BINARY_BYTES==874608
    assert len(EXPECTED_BINARY_SHA256)==64
    assert LOCK_ID.startswith("voidbuye2dormantbootstraplock3_")
    print(MARKER+"_SELF_TEST_GREEN")
    print("accepted_bootstrap_v6_lock_bound=true")
    print("candidate_tool_verified_before_execution=true")
    print("source_generation_manifest_bound=true")
    print("candidate_binary_identity_accepted=true")
    print("descriptor_independent_candidate_bound=true")
    print("accepted_binary_git_blob_bound=true")
    print("artifact_publication_only=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("credential_access_authorized=false")
    print("signing_authorized=false")
    print("transaction_authorized=false")
    print("rpc_call_authorized=false")
    print("funds_movement=false")

def main()->int:
    ap=argparse.ArgumentParser()
    g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true")
    g.add_argument("--derive-dir")
    args=ap.parse_args()
    if args.self_test:
        self_test(); return 0
    binary,manifest=derive_material()
    write_dir(Path(args.derive_dir),binary,manifest)
    print(MARKER+"_DERIVE_GREEN")
    print("output="+os.fspath(Path(args.derive_dir).resolve()))
    print("binary_bytes="+str(len(binary)))
    print("binary_sha256="+sha256(binary))
    print("binary_git_blob_sha1="+git_blob(binary))
    print("descriptor_independent_candidate_bound=true")
    print("manifest_bytes="+str(len(manifest)))
    print("manifest_sha256="+sha256(manifest))
    print("accepted_lock_id="+LOCK_ID)
    print("candidate_id="+EXPECTED_CANDIDATE_ID)
    print("artifact_publication_only=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("funds_movement=false")
    return 0

if __name__=="__main__":
    try:
        raise SystemExit(main())
    except MaterializeError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason="+str(exc))
        print("protected_install_authorized=false")
        print("live_execution_authorized=false")
        print("credential_access_authorized=false")
        print("signing_authorized=false")
        print("transaction_authorized=false")
        print("rpc_call_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
import types

ROOT=Path(__file__).resolve().parents[1]
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6.json"
LOCK_BLOB="87d80770ce6c519ed18b2a5b7c2f653126acb3f9"
LOCK_ID="voidbuye2nativecandlock6_31dbb523118f5d0837ff6d245d91d4fd530313a7a69b42f1fb60417539e88281"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_live_composition_native_candidate_v6.py"
CANDIDATE_BLOB="8abbe3956d6b2a6f5599e3efa18010f622569e61"
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
SOURCE_BLOB="5021727f1def1ec11f870d735cab65acc1701a5e"
EXPECTED_BYTES=726976
EXPECTED_SHA256="85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V6_MATERIALIZER_V1"


class MaterializeError(RuntimeError):
    pass


def git_blob(raw:bytes)->str:
    h=hashlib.sha1()
    h.update(b"blob "+str(len(raw)).encode("ascii")+b"\0")
    h.update(raw)
    return h.hexdigest()


def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()


def direct(path:Path,maximum:int)->bytes:
    before=path.lstat()
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_nlink!=1 or before.st_size<1 or before.st_size>maximum
    ):
        raise MaterializeError("source_metadata_invalid:"+str(path))
    raw=path.read_bytes()
    after=path.lstat()
    for field in (
        "st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink",
        "st_size","st_mtime_ns","st_ctime_ns",
    ):
        if getattr(before,field)!=getattr(after,field):
            raise MaterializeError("source_generation_changed:"+str(path))
    if len(raw)!=before.st_size:
        raise MaterializeError("source_read_drift:"+str(path))
    return raw


def accepted_inputs()->tuple[bytes,bytes,bytes]:
    lock_raw=direct(LOCK,128*1024)
    candidate_raw=direct(CANDIDATE,256*1024)
    source_raw=direct(SOURCE,1024*1024)
    if git_blob(lock_raw)!=LOCK_BLOB:
        raise MaterializeError("accepted_lock_blob_mismatch")
    if git_blob(candidate_raw)!=CANDIDATE_BLOB:
        raise MaterializeError("candidate_tool_blob_mismatch")
    if git_blob(source_raw)!=SOURCE_BLOB:
        raise MaterializeError("native_source_blob_mismatch")
    try:
        lock=json.loads(lock_raw)
    except json.JSONDecodeError as exc:
        raise MaterializeError("accepted_lock_json_invalid") from exc
    required={
        "lock_id":LOCK_ID,
        "candidate_accepted":True,
        "native_binary_identity_accepted":True,
        "runner_identity_accepted":True,
        "protected_install_authorized":False,
        "live_execution_authorized":False,
        "public_presale_activation_authorized":False,
        "wc_void_market_activation_authorized":False,
        "treasury_liquidity_action_authorized":False,
        "funds_movement_authorized":False,
    }
    for key,want in required.items():
        if lock.get(key)!=want:
            raise MaterializeError("accepted_lock_field_mismatch:"+key)
    report=lock.get("candidate_report")
    if not isinstance(report,dict):
        raise MaterializeError("accepted_lock_candidate_report_missing")
    if (
        report.get("candidate_script_git_blob_sha1")!=CANDIDATE_BLOB or
        report.get("candidate_workflow_git_blob_sha1")!="8e3879df85e6cb40e96b5905b6a72ca771f735de" or
        report.get("native_source_git_blob_sha1")!=SOURCE_BLOB or
        report.get("native_binary_bytes")!=EXPECTED_BYTES or
        report.get("native_binary_sha256")!=EXPECTED_SHA256
    ):
        raise MaterializeError("accepted_lock_native_identity_mismatch")
    return lock_raw,candidate_raw,source_raw


def load_candidate(candidate_raw:bytes):
    module=types.ModuleType("void_epoch2_native_candidate_v6")
    module.__file__=os.fspath(CANDIDATE)
    code=compile(
        candidate_raw,
        os.fspath(CANDIDATE),
        "exec",
        dont_inherit=True,
        optimize=0,
    )
    exec(code,module.__dict__)
    compile_one=getattr(module,"compile_one",None)
    if not callable(compile_one):
        raise MaterializeError("candidate_compile_entry_missing")
    return module


def derive_binary()->bytes:
    _,candidate_raw,_=accepted_inputs()
    module=load_candidate(candidate_raw)
    with tempfile.TemporaryDirectory(
        prefix="void-buy-epoch2-native-v6-materialize-"
    ) as td:
        target=Path(td)/"preentry"
        try:
            binary,elf,build=module.compile_one(target)
        except Exception as exc:
            raise MaterializeError("candidate_compile_failed") from exc
    if not isinstance(binary,bytes):
        raise MaterializeError("candidate_binary_type_invalid")
    if len(binary)!=EXPECTED_BYTES or sha256(binary)!=EXPECTED_SHA256:
        raise MaterializeError("materialized_binary_identity_mismatch")
    if not isinstance(elf,dict) or (
        elf.get("pt_interp_absent") is not True or
        elf.get("static_link_required") is not True or
        elf.get("machine_x86_64") is not True
    ):
        raise MaterializeError("materialized_binary_elf_shape_invalid")
    if not isinstance(build,dict):
        raise MaterializeError("materialized_build_evidence_missing")
    trace=build.get("link_trace")
    if not isinstance(trace,dict) or trace.get("record_count",0)<2:
        raise MaterializeError("materialized_link_trace_missing")
    return binary


def write_create_only(output:Path,raw:bytes)->None:
    output=Path(os.path.abspath(os.fspath(output)))
    parent=output.parent
    before_parent=parent.lstat()
    if (
        not stat.S_ISDIR(before_parent.st_mode)
        or stat.S_ISLNK(before_parent.st_mode)
    ):
        raise MaterializeError("output_parent_invalid")

    parent_fd=os.open(
        parent,
        os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,
    )
    fd:int|None=None
    try:
        opened_parent=os.fstat(parent_fd)
        visible_parent=parent.lstat()
        if (
            visible_parent.st_dev!=opened_parent.st_dev
            or visible_parent.st_ino!=opened_parent.st_ino
            or visible_parent.st_dev!=before_parent.st_dev
            or visible_parent.st_ino!=before_parent.st_ino
        ):
            raise MaterializeError("output_parent_generation_changed")

        try:
            fd=os.open(
                output.name,
                os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,
                0o500,
                dir_fd=parent_fd,
            )
        except FileExistsError as exc:
            raise MaterializeError("output_exists") from exc

        created=os.fstat(fd)
        view=memoryview(raw)
        offset=0
        while offset<len(view):
            wrote=os.write(fd,view[offset:])
            if wrote<=0:
                raise MaterializeError("output_short_write")
            offset+=wrote
        os.fchmod(fd,0o555)
        os.fsync(fd)

        final=os.fstat(fd)
        if (
            not stat.S_ISREG(final.st_mode)
            or final.st_nlink!=1
            or stat.S_IMODE(final.st_mode)!=0o555
            or final.st_size!=EXPECTED_BYTES
            or final.st_dev!=created.st_dev
            or final.st_ino!=created.st_ino
        ):
            raise MaterializeError("output_metadata_invalid")

        os.lseek(fd,0,os.SEEK_SET)
        observed=b""
        while len(observed)<EXPECTED_BYTES:
            chunk=os.read(fd,min(1024*1024,EXPECTED_BYTES-len(observed)))
            if not chunk:
                break
            observed+=chunk
        if (
            len(observed)!=EXPECTED_BYTES
            or sha256(observed)!=EXPECTED_SHA256
            or os.read(fd,1)
        ):
            raise MaterializeError("output_descriptor_readback_mismatch")

        os.fsync(parent_fd)
        visible=os.stat(
            output.name,dir_fd=parent_fd,follow_symlinks=False
        )
        if (
            not stat.S_ISREG(visible.st_mode)
            or visible.st_dev!=created.st_dev
            or visible.st_ino!=created.st_ino
            or visible.st_nlink!=1
            or stat.S_IMODE(visible.st_mode)!=0o555
            or visible.st_size!=EXPECTED_BYTES
        ):
            raise MaterializeError("output_visible_generation_changed")
    finally:
        if fd is not None:
            try:
                os.close(fd)
            except OSError:
                pass
        os.close(parent_fd)


def self_test()->None:
    accepted_inputs()
    assert EXPECTED_BYTES==726976
    assert len(EXPECTED_SHA256)==64
    assert LOCK_ID.startswith("voidbuye2nativecandlock6_")
    with tempfile.TemporaryDirectory(
        prefix="void-buy-epoch2-native-v6-output-test-"
    ) as td:
        out=Path(td)/"tiny"
        raw=b"test"
        fd=os.open(
            out,
            os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,
            0o500,
        )
        os.write(fd,raw)
        os.close(fd)
        try:
            os.open(
                out,
                os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,
                0o500,
            )
        except FileExistsError:
            pass
        else:
            raise AssertionError("create-only output primitive overwrote existing file")
    print(MARKER+"_SELF_TEST_GREEN")
    print("accepted_v6_lock_bound=true")
    print("candidate_tool_verified_before_execution=true")
    print("native_source_blob_bound=true")
    print("create_only_output=true")
    print("output_descriptor_readback=true")
    print("output_parent_directory_fsync=true")
    print("output_failure_destructive_cleanup=false")
    print("candidate_binary_identity_accepted=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("treasury_liquidity_action_authorized=false")
    print("funds_movement=false")


def main()->int:
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test",action="store_true")
    mode.add_argument("--derive",type=Path)
    args=parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    raw=derive_binary()
    write_create_only(args.derive,raw)
    print(MARKER+"_DERIVE_GREEN")
    print("output="+os.fspath(Path(args.derive).resolve()))
    print("binary_bytes="+str(len(raw)))
    print("binary_sha256="+sha256(raw))
    print("accepted_lock_id="+LOCK_ID)
    print("output_descriptor_readback=true")
    print("output_parent_directory_fsync=true")
    print("output_failure_destructive_cleanup=false")
    print("candidate_binary_identity_accepted=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("treasury_liquidity_action_authorized=false")
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
        print("treasury_liquidity_action_authorized=false")
        print("funds_movement=false")
        raise SystemExit(2)

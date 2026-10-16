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
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v3.json"
LOCK_BLOB="57f965a944031eac90d69b4104b0f8f2473e66cc"
LOCK_ID="voidbuye2nativecandlock3_024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659"
CANDIDATE=ROOT/"scripts/prove_buy_void_epoch2_live_composition_native_candidate_v3.py"
CANDIDATE_BLOB="3b779a27cfd071c2569c438e3319b756b46c85c9"
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c"
SOURCE_BLOB="4aa091e7835b32aa5c4e7b8e4059651c69a64eb3"
EXPECTED_BYTES=726976
EXPECTED_SHA256="78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589"
MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V3_MATERIALIZER_V1"


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
        report.get("native_source_git_blob_sha1")!=SOURCE_BLOB or
        report.get("native_binary_bytes")!=EXPECTED_BYTES or
        report.get("native_binary_sha256")!=EXPECTED_SHA256
    ):
        raise MaterializeError("accepted_lock_native_identity_mismatch")
    return lock_raw,candidate_raw,source_raw


def load_candidate(candidate_raw:bytes):
    module=types.ModuleType("void_epoch2_native_candidate_v3")
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
        prefix="void-buy-epoch2-native-v3-materialize-"
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
    if output.exists():
        raise MaterializeError("output_exists")
    parent=output.parent
    st=parent.lstat()
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
        raise MaterializeError("output_parent_invalid")
    fd=os.open(
        output,
        os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,
        0o500,
    )
    try:
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
            not stat.S_ISREG(final.st_mode) or final.st_nlink!=1 or
            stat.S_IMODE(final.st_mode)!=0o555 or final.st_size!=EXPECTED_BYTES
        ):
            raise MaterializeError("output_metadata_invalid")
    except BaseException:
        try:
            os.close(fd)
        except OSError:
            pass
        try:
            os.unlink(output)
        except OSError:
            pass
        raise
    else:
        os.close(fd)
    raw_check=output.read_bytes()
    if len(raw_check)!=EXPECTED_BYTES or sha256(raw_check)!=EXPECTED_SHA256:
        raise MaterializeError("output_readback_mismatch")


def self_test()->None:
    accepted_inputs()
    assert EXPECTED_BYTES==726976
    assert len(EXPECTED_SHA256)==64
    assert LOCK_ID.startswith("voidbuye2nativecandlock3_")
    with tempfile.TemporaryDirectory(
        prefix="void-buy-epoch2-native-v3-output-test-"
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
    print("accepted_v3_lock_bound=true")
    print("candidate_tool_verified_before_execution=true")
    print("native_source_blob_bound=true")
    print("create_only_output=true")
    print("candidate_binary_identity_accepted=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
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
    print("candidate_binary_identity_accepted=true")
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
        print("funds_movement=false")
        raise SystemExit(2)

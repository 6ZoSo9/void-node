#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import struct
import subprocess
import tempfile

MARKER="VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_PREENTRY_BINARY_CANDIDATE_V1"
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"ops/xiphos/apollyon_live_custody_source_session_preentry_v2.c"
SOURCE_REL="ops/xiphos/apollyon_live_custody_source_session_preentry_v2.c"
EXPECTED_SOURCE_GIT_BLOB_SHA1="1d0d9893939d1a457970b3b1f16dae06e7fef067"
CC=Path("/usr/bin/cc")
MIN_BINARY_BYTES=4096
MAX_BINARY_BYTES=2*1024*1024
MAX_REPORT_BYTES=64*1024
HEX64=re.compile(r"^[0-9a-f]{64}$")
CANDIDATE_ID=re.compile(
    r"^apollyon_live_custody_source_session_preentry_binary_candidate_v1:[0-9a-f]{64}$"
)
COMPILE_FLAGS=(
    "-std=c11","-O2","-Wall","-Wextra","-Werror",
    "-D_FORTIFY_SOURCE=2","-fstack-protector-strong","-fno-ident",
    "-static","-fno-pie","-no-pie",
    "-Wl,-z,relro,-z,now","-Wl,--build-id=none",
)
ELF_PT_INTERP=3
ELF_MACHINE_X86_64=62
ELF_TYPE_EXEC=2
EXPECTED_SELF_TEST=(
    "VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_PREENTRY_V2_SELF_TEST=GREEN\n"
    "python_descriptor_execution=true\n"
    "setuid_setgid_rejected=true\n"
    "durable_attempt_claim=false\n"
    "training_execution=false\n"
)
ENV={
    "PATH":"/usr/bin:/bin",
    "LC_ALL":"C",
    "TZ":"UTC",
    "SOURCE_DATE_EPOCH":"0",
}

def canonical(value)->str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)

def sha256(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()

def git_blob_sha1(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

def exact_keys(value:dict,expected:tuple[str,...],label:str)->None:
    if not isinstance(value,dict) or set(value)!=set(expected):
        raise AssertionError(label+" schema invalid")

def bounded_file(path:Path,maximum:int,label:str)->bytes:
    st=path.lstat()
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_nlink!=1 or st.st_size<1 or st.st_size>maximum
    ):
        raise AssertionError(label+" metadata invalid")
    data=path.read_bytes()
    if len(data)!=st.st_size:
        raise AssertionError(label+" read drift")
    return data

def capture(argv:list[str],timeout:int=30)->str:
    result=subprocess.run(
        argv,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
        check=False,timeout=timeout,env=ENV,
    )
    if result.returncode!=0:
        raise AssertionError("command failed: "+repr(argv)+" "+result.stderr[-1000:])
    return result.stdout

def compiler_identity()->dict[str,str]:
    if not CC.exists():
        raise AssertionError("/usr/bin/cc missing")
    requested=Path(os.path.abspath(os.fspath(CC)))
    real=Path(os.path.realpath(requested))
    version=capture([os.fspath(requested),"--version"]).splitlines()
    if not version:
        raise AssertionError("compiler version missing")
    return {
        "requested_path":os.fspath(requested),
        "realpath":os.fspath(real),
        "version_line":version[0],
        "dumpmachine":capture([os.fspath(requested),"-dumpmachine"]).strip(),
        "dumpversion":capture(
            [os.fspath(requested),"-dumpfullversion","-dumpversion"]
        ).strip(),
    }

def inspect_static_elf(binary:bytes)->dict[str,bool|int]:
    if len(binary)<64 or binary[:4]!=b"\x7fELF":
        raise AssertionError("candidate ELF header invalid")
    if binary[4]!=2 or binary[5]!=1:
        raise AssertionError("candidate ELF must be 64-bit little-endian")
    e_type,e_machine=struct.unpack_from("<HH",binary,16)
    if e_type!=ELF_TYPE_EXEC or e_machine!=ELF_MACHINE_X86_64:
        raise AssertionError("candidate ELF executable identity invalid")
    phoff=struct.unpack_from("<Q",binary,32)[0]
    phentsize=struct.unpack_from("<H",binary,54)[0]
    phnum=struct.unpack_from("<H",binary,56)[0]
    if phentsize<56 or phnum<1 or phnum>128:
        raise AssertionError("candidate ELF program header shape invalid")
    if phoff<64 or phoff+phentsize*phnum>len(binary):
        raise AssertionError("candidate ELF program headers out of bounds")
    program_types=[
        struct.unpack_from("<I",binary,phoff+(index*phentsize))[0]
        for index in range(phnum)
    ]
    if ELF_PT_INTERP in program_types:
        raise AssertionError("candidate ELF PT_INTERP forbidden")
    return {
        "elf64_little_endian":True,
        "machine_x86_64":True,
        "executable_type":True,
        "pt_interp_absent":True,
        "static_link_required":True,
    }

def prove_loader_independence(candidate:Path)->dict[str,bool]:
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-live-session-preentry-loader-adversary-"
    ) as td:
        root=Path(td)
        sentinel=root/"preload-fired"
        preload_source=root/"preload.c"
        preload_source.write_text(
            "#include <fcntl.h>\n"
            "#include <unistd.h>\n"
            "__attribute__((constructor)) static void poison(void){\n"
            f"  int fd=open({json.dumps(os.fspath(sentinel))},"
            "O_WRONLY|O_CREAT|O_TRUNC,0600);\n"
            "  if(fd>=0){(void)write(fd,\"x\",1);close(fd);}\n"
            "}\n",
            encoding="utf-8",
        )
        preload=root/"preload.so"
        result=subprocess.run(
            [os.fspath(CC),"-shared","-fPIC","-O2","-Wall","-Wextra","-Werror",
             "-Wl,--build-id=none","-o",os.fspath(preload),os.fspath(preload_source)],
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=30,env=ENV,
        )
        if result.returncode!=0:
            raise AssertionError(
                "preload adversary compile failed: "+
                result.stderr.decode("utf-8","replace")[-1000:]
            )
        control_source=root/"control.c"
        control_source.write_text("int main(void){return 0;}\n",encoding="utf-8")
        control=root/"dynamic-control"
        result=subprocess.run(
            [os.fspath(CC),"-std=c11","-O2","-Wall","-Wextra","-Werror",
             "-Wl,--build-id=none","-o",os.fspath(control),os.fspath(control_source)],
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=30,env=ENV,
        )
        if result.returncode!=0:
            raise AssertionError("dynamic control compile failed")
        poisoned={**ENV,"LD_PRELOAD":os.fspath(preload)}
        control_run=subprocess.run(
            [os.fspath(control)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            check=False,timeout=15,env=poisoned,
        )
        if control_run.returncode!=0 or not sentinel.is_file():
            raise AssertionError("hostile LD_PRELOAD positive control did not execute")
        sentinel.unlink()
        preentry_run=subprocess.run(
            [os.fspath(candidate),"--self-test"],
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            check=False,timeout=15,env=poisoned,
        )
        if sentinel.exists():
            raise AssertionError("hostile LD_PRELOAD executed before preentry main")
        if preentry_run.returncode!=0:
            raise AssertionError("static preentry self-test failed under hostile LD_PRELOAD")
        if (
            preentry_run.stdout.decode("utf-8","strict")!=EXPECTED_SELF_TEST or
            preentry_run.stderr
        ):
            raise AssertionError("static preentry hostile-loader transcript mismatch")
    return {
        "hostile_ld_preload_positive_control":True,
        "hostile_ld_preload_preentry_blocked":True,
    }

def compile_one(output:Path)->tuple[bytes,dict[str,bool|int]]:
    result=subprocess.run(
        [os.fspath(CC),*COMPILE_FLAGS,"-o",os.fspath(output),os.fspath(SOURCE)],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=30,env=ENV,
    )
    if result.returncode!=0:
        raise AssertionError(
            "compile failed: "+result.stderr.decode("utf-8","replace")[-2000:]
        )
    binary=bounded_file(output,MAX_BINARY_BYTES,"candidate ELF")
    if len(binary)<MIN_BINARY_BYTES or not binary.startswith(b"\x7fELF"):
        raise AssertionError("candidate ELF invalid")
    elf=inspect_static_elf(binary)
    test=subprocess.run(
        [os.fspath(output),"--self-test"],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=15,env=ENV,
    )
    if test.returncode!=0:
        raise AssertionError(
            "preentry self-test failed: "+
            test.stderr.decode("utf-8","replace")[-1000:]
        )
    stdout=test.stdout.decode("utf-8","strict")
    if stdout!=EXPECTED_SELF_TEST or test.stderr:
        raise AssertionError("preentry self-test transcript mismatch")
    return binary,elf

def material(report:dict)->dict:
    return {k:v for k,v in report.items() if k!="candidate_id"}

def derive()->dict:
    source=bounded_file(SOURCE,1024*1024,"preentry source")
    if git_blob_sha1(source)!=EXPECTED_SOURCE_GIT_BLOB_SHA1:
        raise AssertionError("preentry source Git blob mismatch")
    compiler=compiler_identity()
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-live-session-preentry-candidate-"
    ) as td:
        root=Path(td)
        first,first_elf=compile_one(root/"preentry-a")
        second,second_elf=compile_one(root/"preentry-b")
        loader=prove_loader_independence(root/"preentry-a")
    if first!=second or first_elf!=second_elf:
        raise AssertionError("two local builds were not byte-identical")
    base={
        "marker":MARKER,
        "version":1,
        "status":"candidate_only_unaccepted",
        "source":{
            "path":SOURCE_REL,
            "git_blob_sha1":EXPECTED_SOURCE_GIT_BLOB_SHA1,
            "sha256":sha256(source),
        },
        "compiler":compiler,
        "compile_recipe":{
            "argv_prefix":[os.fspath(CC),*COMPILE_FLAGS],
            "source_date_epoch":"0",
            "build_id_disabled":True,
            "static_link_required":True,
            "no_pie_required":True,
        },
        "binary":{
            "bytes":len(first),
            "sha256":sha256(first),
            "elf_magic_verified":True,
            **first_elf,
            **loader,
            "two_builds_byte_identical":True,
        },
        "self_test":{
            "stdout_sha256":sha256(EXPECTED_SELF_TEST.encode("utf-8")),
            "exact_transcript_verified":True,
            "stderr_empty":True,
        },
        "authority":{
            "source_only_candidate":True,
            "candidate_report_filesystem_write":True,
            "candidate_binary_identity_accepted":False,
            "host_installation":False,
            "live_source_session_execution":False,
            "durable_attempt_claim":False,
            "training_execution":False,
            "candidate_weight_mutation":False,
            "service_action":False,
            "operator_private_key_access":False,
            "wallet_access":False,
            "transaction_signing":False,
            "funds_movement":False,
        },
        "next_gate":"apollyon_live_custody_source_session_preentry_binary_lock_v1",
    }
    return {
        **base,
        "candidate_id":
            "apollyon_live_custody_source_session_preentry_binary_candidate_v1:"+
            sha256(canonical(base).encode("utf-8")),
    }

def validate(report:dict)->None:
    exact_keys(
        report,
        (
            "authority","binary","candidate_id","compile_recipe","compiler",
            "marker","next_gate","self_test","source","status","version",
        ),
        "candidate report",
    )
    if type(report["version"]) is not int or report["version"]!=1:
        raise AssertionError("candidate version invalid")
    if report["marker"]!=MARKER or report["status"]!="candidate_only_unaccepted":
        raise AssertionError("candidate marker/status invalid")
    if report["next_gate"]!="apollyon_live_custody_source_session_preentry_binary_lock_v1":
        raise AssertionError("candidate next gate invalid")

    exact_keys(report["source"],("git_blob_sha1","path","sha256"),"source")
    current=bounded_file(SOURCE,1024*1024,"preentry source")
    if (
        report["source"]["path"]!=SOURCE_REL or
        report["source"]["git_blob_sha1"]!=EXPECTED_SOURCE_GIT_BLOB_SHA1 or
        report["source"]["git_blob_sha1"]!=git_blob_sha1(current) or
        report["source"]["sha256"]!=sha256(current)
    ):
        raise AssertionError("candidate source identity invalid")

    exact_keys(
        report["compiler"],
        ("dumpmachine","dumpversion","realpath","requested_path","version_line"),
        "compiler",
    )
    if report["compiler"]!=compiler_identity():
        raise AssertionError("candidate compiler identity invalid")

    exact_keys(
        report["compile_recipe"],
        (
            "argv_prefix","build_id_disabled","no_pie_required",
            "source_date_epoch","static_link_required",
        ),
        "compile recipe",
    )
    if (
        report["compile_recipe"]["argv_prefix"]!=[os.fspath(CC),*COMPILE_FLAGS] or
        report["compile_recipe"]["source_date_epoch"]!="0" or
        report["compile_recipe"]["build_id_disabled"] is not True or
        report["compile_recipe"]["static_link_required"] is not True or
        report["compile_recipe"]["no_pie_required"] is not True
    ):
        raise AssertionError("compile recipe invalid")

    exact_keys(
        report["binary"],
        (
            "bytes","elf64_little_endian","elf_magic_verified","executable_type",
            "hostile_ld_preload_positive_control",
            "hostile_ld_preload_preentry_blocked","machine_x86_64",
            "pt_interp_absent","sha256","static_link_required",
            "two_builds_byte_identical",
        ),
        "binary",
    )
    binary=report["binary"]
    if (
        type(binary["bytes"]) is not int or
        binary["bytes"]<MIN_BINARY_BYTES or binary["bytes"]>MAX_BINARY_BYTES or
        not isinstance(binary["sha256"],str) or
        HEX64.fullmatch(binary["sha256"]) is None or
        binary["elf_magic_verified"] is not True or
        binary["elf64_little_endian"] is not True or
        binary["machine_x86_64"] is not True or
        binary["executable_type"] is not True or
        binary["pt_interp_absent"] is not True or
        binary["static_link_required"] is not True or
        binary["hostile_ld_preload_positive_control"] is not True or
        binary["hostile_ld_preload_preentry_blocked"] is not True or
        binary["two_builds_byte_identical"] is not True
    ):
        raise AssertionError("candidate binary invalid")

    exact_keys(
        report["self_test"],
        ("exact_transcript_verified","stderr_empty","stdout_sha256"),
        "self-test",
    )
    if (
        report["self_test"]["stdout_sha256"]!=sha256(
            EXPECTED_SELF_TEST.encode("utf-8")
        ) or
        report["self_test"]["exact_transcript_verified"] is not True or
        report["self_test"]["stderr_empty"] is not True
    ):
        raise AssertionError("self-test identity invalid")

    exact_keys(
        report["authority"],
        (
            "candidate_binary_identity_accepted",
            "candidate_report_filesystem_write","candidate_weight_mutation",
            "durable_attempt_claim","funds_movement","host_installation",
            "live_source_session_execution","operator_private_key_access",
            "service_action","source_only_candidate","training_execution",
            "transaction_signing","wallet_access",
        ),
        "authority",
    )
    authority=report["authority"]
    if (
        authority["source_only_candidate"] is not True or
        authority["candidate_report_filesystem_write"] is not True
    ):
        raise AssertionError("candidate positive authority invalid")
    for key in authority:
        if key in ("source_only_candidate","candidate_report_filesystem_write"):
            continue
        if authority[key] is not False:
            raise AssertionError("candidate authority overclaim: "+key)

    cid=report["candidate_id"]
    if not isinstance(cid,str) or CANDIDATE_ID.fullmatch(cid) is None:
        raise AssertionError("candidate id invalid")
    expected=(
        "apollyon_live_custody_source_session_preentry_binary_candidate_v1:"+
        sha256(canonical(material(report)).encode("utf-8"))
    )
    if cid!=expected:
        raise AssertionError("candidate id content binding invalid")

def derive_to(output:Path)->None:
    report=derive()
    validate(report)
    payload=(canonical(report)+"\n").encode("utf-8")
    if len(payload)>MAX_REPORT_BYTES:
        raise AssertionError("candidate report too large")
    output=Path(os.path.abspath(os.fspath(output)))
    if output.exists():
        raise AssertionError("candidate output already exists")
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open("xb") as handle:
        handle.write(payload)
        handle.flush()
        os.fsync(handle.fileno())
    print(MARKER+"_DERIVE_GREEN")
    print("candidate_id="+report["candidate_id"])
    print("binary_bytes="+str(report["binary"]["bytes"]))
    print("binary_sha256="+report["binary"]["sha256"])
    print("static_link_required=true")
    print("pt_interp_absent=true")
    print("hostile_ld_preload_positive_control=true")
    print("hostile_ld_preload_preentry_blocked=true")
    print("candidate_binary_identity_accepted=false")
    print("host_installation=false")
    print("training_execution=false")

def compare_dir(directory:Path)->None:
    root=Path(os.path.abspath(os.fspath(directory)))
    paths=sorted(root.rglob("candidate.json"))
    if len(paths)!=3:
        raise AssertionError("expected exactly three candidate reports")
    payloads=[bounded_file(p,MAX_REPORT_BYTES,"hosted candidate") for p in paths]
    if not all(payload==payloads[0] for payload in payloads[1:]):
        raise AssertionError("hosted candidate reports not byte-identical")
    report=json.loads(payloads[0])
    validate(report)
    if canonical(report)+"\n"!=payloads[0].decode("utf-8"):
        raise AssertionError("hosted report not canonical")
    local=derive()
    if report["binary"]!=local["binary"]:
        raise AssertionError("hosted binary identity differs from local re-derivation")
    print(MARKER+"_THREE_RUN_GREEN")
    print("candidate_id="+report["candidate_id"])
    print("binary_bytes="+str(report["binary"]["bytes"]))
    print("binary_sha256="+report["binary"]["sha256"])
    print("three_run_report_bytes_identical=true")
    print("comparison_rederived_elf=true")
    print("static_link_required=true")
    print("pt_interp_absent=true")
    print("hostile_ld_preload_positive_control=true")
    print("hostile_ld_preload_preentry_blocked=true")
    print("candidate_binary_identity_accepted=false")
    print("training_execution=false")

def self_test()->None:
    valid=derive()
    validate(valid)

    bad=json.loads(canonical(valid))
    bad["version"]=True
    bad["candidate_id"]=(
        "apollyon_live_custody_source_session_preentry_binary_candidate_v1:"+
        sha256(canonical(material(bad)).encode("utf-8"))
    )
    try:
        validate(bad)
    except AssertionError as exc:
        if "version invalid" not in str(exc):
            raise
    else:
        raise AssertionError("boolean version unexpectedly admitted")

    forged=json.loads(canonical(valid))
    digest=forged["binary"]["sha256"]
    forged["binary"]["sha256"]=("0" if digest[0]!="0" else "1")+digest[1:]
    forged["candidate_id"]=(
        "apollyon_live_custody_source_session_preentry_binary_candidate_v1:"+
        sha256(canonical(material(forged)).encode("utf-8"))
    )
    validate(forged)
    with tempfile.TemporaryDirectory(prefix="void-apollyon-forged-candidate-") as td:
        root=Path(td)
        payload=(canonical(forged)+"\n").encode("utf-8")
        for lane in ("a","b","c"):
            d=root/lane
            d.mkdir()
            (d/"candidate.json").write_bytes(payload)
        try:
            compare_dir(root)
        except AssertionError as exc:
            if "local re-derivation" not in str(exc):
                raise
        else:
            raise AssertionError("consistently forged hosted reports unexpectedly admitted")

    print(MARKER+"_SELF_TEST=GREEN")
    print("source_blob_bound=true")
    print("two_local_builds_required=true")
    print("three_hosted_reports_required=true")
    print("comparison_rederives_elf=true")
    print("static_link_required=true")
    print("pt_interp_absent=true")
    print("hostile_ld_preload_positive_control=true")
    print("hostile_ld_preload_preentry_blocked=true")
    print("candidate_binary_identity_accepted=false")
    print("host_installation=false")
    print("training_execution=false")

def main()->None:
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--derive",type=Path)
    group.add_argument("--compare-dir",type=Path)
    group.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    if args.derive is not None:
        derive_to(args.derive)
    elif args.compare_dir is not None:
        compare_dir(args.compare_dir)
    else:
        self_test()

if __name__=="__main__":
    main()

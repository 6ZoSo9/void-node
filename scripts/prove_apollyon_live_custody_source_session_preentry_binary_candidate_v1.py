#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
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
MAX_TOOLCHAIN_FILE_BYTES=64*1024*1024
HEX64=re.compile(r"^[0-9a-f]{64}$")
CANDIDATE_ID=re.compile(
    r"^apollyon_live_custody_source_session_preentry_binary_candidate_v1:[0-9a-f]{64}$"
)
COMPILE_FLAGS=(
    "-std=c11","-O2","-Wall","-Wextra","-Werror",
    "-D_FORTIFY_SOURCE=2","-fstack-protector-strong","-fno-ident",
    "-fno-pie",
)
LINK_FLAGS=(
    "-static","-fno-pie","-no-pie",
    "-Wl,-z,relro,-z,now","-Wl,--build-id=none",
)
PREPROCESS_FLAGS=(
    "-std=c11","-O2","-D_FORTIFY_SOURCE=2",
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

def regular_file_identity(path:Path,label:str)->dict[str,str|int]:
    canonical=Path(os.path.realpath(os.path.abspath(os.fspath(path))))
    st=canonical.lstat()
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_size<1 or st.st_size>MAX_TOOLCHAIN_FILE_BYTES
    ):
        raise AssertionError(label+" metadata invalid")
    data=canonical.read_bytes()
    if len(data)!=st.st_size:
        raise AssertionError(label+" read drift")
    return {
        "path":os.fspath(canonical),
        "bytes":st.st_size,
        "sha256":sha256(data),
    }

def resolve_compiler_program(name:str)->Path:
    raw=capture([os.fspath(CC),"-print-prog-name="+name]).strip()
    if not raw:
        raise AssertionError("compiler program missing: "+name)
    if os.path.isabs(raw):
        candidate=Path(raw)
    else:
        found=shutil.which(raw,path=ENV["PATH"])
        if not found:
            raise AssertionError("compiler program unresolved: "+name)
        candidate=Path(found)
    return Path(os.path.realpath(candidate))

def static_toolchain_identity()->dict:
    executables={}
    requested=Path(os.path.abspath(os.fspath(CC)))
    executables["cc"]=regular_file_identity(
        Path(os.path.realpath(requested)),"toolchain cc"
    )
    for name in ("cc1","as","collect2","ld"):
        executables[name]=regular_file_identity(
            resolve_compiler_program(name),"toolchain "+name
        )
    specs=capture([os.fspath(CC),"-dumpspecs"]).encode("utf-8")
    search=capture([os.fspath(CC),"-print-search-dirs"]).encode("utf-8")
    return {
        "executables":executables,
        "gcc_specs_sha256":sha256(specs),
        "gcc_search_dirs_sha256":sha256(search),
    }

def preprocessed_source_identity()->dict[str,str|int]:
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-live-session-preentry-preprocessed-"
    ) as td:
        output=Path(td)/"preentry.i"
        result=subprocess.run(
            [os.fspath(CC),*PREPROCESS_FLAGS,"-E","-P","-o",os.fspath(output),os.fspath(SOURCE)],
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=30,env=ENV,
        )
        if result.returncode!=0:
            raise AssertionError(
                "preprocess failed: "+result.stderr.decode("utf-8","replace")[-2000:]
            )
        data=bounded_file(output,4*1024*1024,"preprocessed translation unit")
    return {
        "bytes":len(data),
        "sha256":sha256(data),
    }

def trace_link_inputs(raw:bytes,object_path:Path)->list[dict[str,str|int]]:
    object_real=os.path.realpath(os.fspath(object_path))
    discovered={}
    text=raw.decode("utf-8","replace")
    for line in text.splitlines():
        token=line.strip()
        if not token or not os.path.isabs(token):
            continue
        candidate=Path(token)
        try:
            real=os.path.realpath(os.fspath(candidate))
            if real==object_real:
                continue
            p=Path(real)
            if not p.is_file():
                continue
            identity=regular_file_identity(p,"link input")
        except (OSError,AssertionError):
            continue
        discovered[identity["path"]]=identity
    if not discovered:
        raise AssertionError("static linker trace did not yield regular inputs")
    return [discovered[key] for key in sorted(discovered)]

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
            "  if(fd>=0){ssize_t n=write(fd,\"x\",1);if(n!=1){close(fd);return;}close(fd);}\n"
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

def compile_one(output:Path)->tuple[bytes,dict[str,bool|int],dict]:
    obj=output.with_suffix(".o")
    compile_result=subprocess.run(
        [os.fspath(CC),*COMPILE_FLAGS,"-c","-o",os.fspath(obj),os.fspath(SOURCE)],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=30,env=ENV,
    )
    if compile_result.returncode!=0:
        raise AssertionError(
            "compile failed: "+compile_result.stderr.decode("utf-8","replace")[-2000:]
        )
    object_bytes=bounded_file(obj,MAX_BINARY_BYTES,"candidate object")
    link_result=subprocess.run(
        [os.fspath(CC),*LINK_FLAGS,"-Wl,-t","-o",os.fspath(output),os.fspath(obj)],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=30,env=ENV,
    )
    if link_result.returncode!=0:
        raise AssertionError(
            "link failed: "+link_result.stderr.decode("utf-8","replace")[-2000:]
        )
    link_inputs=trace_link_inputs(
        link_result.stdout+b"\n"+link_result.stderr,obj
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
    return binary,elf,{
        "compile_object":{
            "bytes":len(object_bytes),
            "sha256":sha256(object_bytes),
        },
        "link_inputs":link_inputs,
    }

def material(report:dict)->dict:
    return {k:v for k,v in report.items() if k!="candidate_id"}

def derive()->dict:
    source=bounded_file(SOURCE,1024*1024,"preentry source")
    if git_blob_sha1(source)!=EXPECTED_SOURCE_GIT_BLOB_SHA1:
        raise AssertionError("preentry source Git blob mismatch")
    compiler=compiler_identity()
    toolchain_base=static_toolchain_identity()
    preprocessed=preprocessed_source_identity()
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-live-session-preentry-candidate-"
    ) as td:
        root=Path(td)
        first,first_elf,first_build=compile_one(root/"preentry-a")
        second,second_elf,second_build=compile_one(root/"preentry-b")
        loader=prove_loader_independence(root/"preentry-a")
    if (
        first!=second or first_elf!=second_elf or
        first_build!=second_build
    ):
        raise AssertionError("two local builds/toolchain closures were not byte-identical")
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
            "compile_argv_prefix":[os.fspath(CC),*COMPILE_FLAGS],
            "link_argv_prefix":[os.fspath(CC),*LINK_FLAGS],
            "preprocess_argv_prefix":[os.fspath(CC),*PREPROCESS_FLAGS,"-E","-P"],
            "source_date_epoch":"0",
            "build_id_disabled":True,
            "static_link_required":True,
            "no_pie_required":True,
        },
        "toolchain":{
            **toolchain_base,
            "preprocessed_translation_unit":preprocessed,
            "compile_object":first_build["compile_object"],
            "link_inputs":first_build["link_inputs"],
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
            "marker","next_gate","self_test","source","status","toolchain","version",
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
            "build_id_disabled","compile_argv_prefix","link_argv_prefix",
            "no_pie_required","preprocess_argv_prefix",
            "source_date_epoch","static_link_required",
        ),
        "compile recipe",
    )
    if (
        report["compile_recipe"]["compile_argv_prefix"]!=[os.fspath(CC),*COMPILE_FLAGS] or
        report["compile_recipe"]["link_argv_prefix"]!=[os.fspath(CC),*LINK_FLAGS] or
        report["compile_recipe"]["preprocess_argv_prefix"]!=[os.fspath(CC),*PREPROCESS_FLAGS,"-E","-P"] or
        report["compile_recipe"]["source_date_epoch"]!="0" or
        report["compile_recipe"]["build_id_disabled"] is not True or
        report["compile_recipe"]["static_link_required"] is not True or
        report["compile_recipe"]["no_pie_required"] is not True
    ):
        raise AssertionError("compile recipe invalid")

    exact_keys(
        report["toolchain"],
        (
            "compile_object","executables","gcc_search_dirs_sha256",
            "gcc_specs_sha256","link_inputs","preprocessed_translation_unit",
        ),
        "toolchain",
    )
    current_base=static_toolchain_identity()
    if (
        report["toolchain"]["executables"]!=current_base["executables"] or
        report["toolchain"]["gcc_specs_sha256"]!=current_base["gcc_specs_sha256"] or
        report["toolchain"]["gcc_search_dirs_sha256"]!=current_base["gcc_search_dirs_sha256"] or
        report["toolchain"]["preprocessed_translation_unit"]!=preprocessed_source_identity()
    ):
        raise AssertionError("candidate static toolchain identity invalid")
    compile_object=report["toolchain"]["compile_object"]
    exact_keys(compile_object,("bytes","sha256"),"compile object")
    if (
        type(compile_object["bytes"]) is not int or
        compile_object["bytes"]<1 or compile_object["bytes"]>MAX_BINARY_BYTES or
        not isinstance(compile_object["sha256"],str) or
        HEX64.fullmatch(compile_object["sha256"]) is None
    ):
        raise AssertionError("candidate compile object invalid")
    link_inputs=report["toolchain"]["link_inputs"]
    if not isinstance(link_inputs,list) or not link_inputs:
        raise AssertionError("candidate link input closure invalid")
    previous=""
    for index,entry in enumerate(link_inputs):
        exact_keys(entry,("bytes","path","sha256"),"link input")
        path_text=entry["path"]
        if (
            not isinstance(path_text,str) or not os.path.isabs(path_text) or
            os.path.realpath(path_text)!=path_text or path_text<=previous
        ):
            raise AssertionError("candidate link input path invalid")
        previous=path_text
        current_identity=regular_file_identity(
            Path(path_text),"link input "+str(index)
        )
        if entry!=current_identity:
            raise AssertionError("candidate link input identity drift")
    for digest_key in ("gcc_specs_sha256","gcc_search_dirs_sha256"):
        digest=report["toolchain"][digest_key]
        if not isinstance(digest,str) or HEX64.fullmatch(digest) is None:
            raise AssertionError("candidate toolchain digest invalid")

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
    print("static_toolchain_closure_bound=true")
    print("static_toolchain_closure_bound=true")
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
    if (
        report["binary"]!=local["binary"] or
        report["toolchain"]!=local["toolchain"]
    ):
        raise AssertionError("hosted binary/toolchain identity differs from local re-derivation")
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
    print("static_toolchain_closure_bound=true")
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

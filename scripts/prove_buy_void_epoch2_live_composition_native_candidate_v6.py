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

MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_V6"
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
SOURCE_REL="ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c"
EXPECTED_SOURCE_GIT_BLOB_SHA1="5021727f1def1ec11f870d735cab65acc1701a5e"
CC=Path("/usr/bin/cc")
STRIP=Path("/usr/bin/strip")
RUNNER=ROOT/"ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
RUNNER_REL="ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
EXPECTED_RUNNER_GIT_BLOB_SHA1="499df9b94b5b89354837570da0c7e47ec280025d"
SOURCE_PROOF_REL="scripts/prove_buy_void_epoch2_live_composition_native_preentry_v3_source.py"
EXPECTED_SOURCE_PROOF_GIT_BLOB_SHA1="b48972c0f930f5a33754a390bd2289853fc93c93"
SOURCE_WORKFLOW_REL=".github/workflows/buy-void-epoch2-live-composition-native-preentry-v3-source.yml"
EXPECTED_SOURCE_WORKFLOW_GIT_BLOB_SHA1="428bd68439ab5b7251632107839346d6b18fc769"
SEALED_V2_REL="scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs"
EXPECTED_SEALED_V2_GIT_BLOB_SHA1="14cbe81e27d04fee77cbe75225ce308bf8561a7b"
SOURCE_PARENT="8aeabf286a99d2dc9d11a489c6052d4914198cf3"
MIN_BINARY_BYTES=4096
MAX_BINARY_BYTES=2*1024*1024
MAX_REPORT_BYTES=64*1024
MAX_TOOLCHAIN_FILE_BYTES=64*1024*1024
HEX64=re.compile(r"^[0-9a-f]{64}$")
CANDIDATE_ID=re.compile(r"^voidbuye2nativecand6_[0-9a-f]{64}$")
COMPILE_FLAGS=(
    "-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident","-fno-pie",
)
LINK_FLAGS=(
    "-static","-fno-pie","-no-pie","-Wl,--build-id=none",
)
PREPROCESS_FLAGS=COMPILE_FLAGS
ELF_PT_INTERP=3
ELF_MACHINE_X86_64=62
ELF_TYPE_EXEC=2
EXPECTED_SELF_TEST=(
    "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_SELF_TEST_GREEN\n"
    "native_first_instruction=true\n"
    "fixed_self_path=true\n"
    "fixed_runner_path=true\n"
    "fixed_node_path=true\n"
    "root_owned_policy_required=true\n"
    "runner_sha256_policy_bound=true\n"
    "node_sha256_policy_bound=true\n"
    "expected_head_policy_bound=true\n"
    "runner_descriptor_retained=true\n"
    "node_descriptor_fexecve=true\n"
    "native_parent_retained_for_child_lifetime=true\n"
    "parent_child_start_ticks_bound=true\n"
    "installed_preentry_runner_generation_bound=true\n"
    "private_parent_proof_channel=true\n"
    "stdin_javascript_source_forbidden=true\n"
    "loader_environment_sanitized=true\n"
    "credential_content_access=false\n"
    "transaction=false\n"
    "public_presale_activation=false\n"
    "funds_movement=false\n"
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
    executables["strip"]=regular_file_identity(STRIP,"toolchain strip")
    specs=capture([os.fspath(CC),"-dumpspecs"]).encode("utf-8")
    search=capture([os.fspath(CC),"-print-search-dirs"]).encode("utf-8")
    return {
        "executables":executables,
        "gcc_specs_sha256":sha256(specs),
        "gcc_search_dirs_sha256":sha256(search),
    }

def preprocessed_source_identity()->dict[str,str|int]:
    with tempfile.TemporaryDirectory(
        prefix="void-buy-epoch2-native-v6-preprocessed-"
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

ARCHIVE_MEMBER_PREFIX_RE=re.compile(r"^\((/[^()\x00\r\n]+)\)([^()\x00\r\n]+)$")
ARCHIVE_MEMBER_SUFFIX_RE=re.compile(r"^(/[^()\x00\r\n]+)\(([^()\x00\r\n]+)\)$")

def parse_link_trace(raw:bytes,object_path:Path)->dict:
    try:
        text=raw.decode("utf-8","strict")
    except UnicodeDecodeError as exc:
        raise AssertionError("linker trace is not canonical UTF-8") from exc
    if "\x00" in text or "\r" in text:
        raise AssertionError("linker trace contains forbidden control bytes")

    object_real=os.path.realpath(os.fspath(object_path))
    file_identities={}
    records=[]
    raw_normalized=[]
    candidate_object_count=0
    archive_member_count=0

    def bind_file(raw_path:str,label:str)->str:
        try:
            real=os.path.realpath(raw_path)
            p=Path(real)
            if not p.is_file():
                raise AssertionError(label+" is not a regular file: "+raw_path)
            identity=regular_file_identity(p,label)
        except OSError as exc:
            raise AssertionError(label+" identity failed: "+raw_path) from exc
        file_identities[identity["path"]]=identity
        return identity["path"]

    for line in text.splitlines():
        if line=="":
            continue
        if line!=line.strip():
            raise AssertionError("linker trace record has surrounding whitespace")
        token=line

        if os.path.isabs(token) and "(" not in token and ")" not in token:
            real=os.path.realpath(token)
            if real==object_real:
                candidate_object_count+=1
                records.append({"kind":"candidate_object"})
                raw_normalized.append("<candidate-object>")
                continue
            canonical_path=bind_file(token,"traced linker file")
            records.append({"kind":"file","path":canonical_path})
            raw_normalized.append(token)
            continue

        member_match=ARCHIVE_MEMBER_PREFIX_RE.fullmatch(token)
        syntax="prefix"
        if member_match is None:
            member_match=ARCHIVE_MEMBER_SUFFIX_RE.fullmatch(token)
            syntax="suffix"
        if member_match is not None:
            archive_raw=member_match.group(1)
            member=member_match.group(2)
            if (
                not member or member in (".","..") or
                "\x00" in member or "\n" in member or "\r" in member
            ):
                raise AssertionError("linker archive member name invalid")
            archive_path=bind_file(archive_raw,"traced linker archive")
            records.append({
                "kind":"archive_member",
                "archive_path":archive_path,
                "member":member,
                "syntax":syntax,
            })
            archive_member_count+=1
            raw_normalized.append(token)
            continue

        raise AssertionError("unrecognized nonempty linker trace record: "+token)

    if candidate_object_count!=1:
        raise AssertionError(
            "linker trace candidate object cardinality invalid: "+
            str(candidate_object_count)
        )
    if not file_identities:
        raise AssertionError("static linker trace did not yield regular inputs")
    if archive_member_count<1:
        raise AssertionError("static linker trace did not expose archive members")

    normalized_bytes=("\n".join(raw_normalized)+"\n").encode("utf-8")
    return {
        "raw_normalized_bytes":len(normalized_bytes),
        "raw_normalized_sha256":sha256(normalized_bytes),
        "record_count":len(records),
        "candidate_object_record_count":candidate_object_count,
        "archive_member_record_count":archive_member_count,
        "records":records,
        "file_identities":[
            file_identities[key] for key in sorted(file_identities)
        ],
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
        prefix="void-buy-epoch2-native-v6-loader-adversary-"
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
            raise AssertionError("static Epoch-2 native preentry self-test failed under hostile LD_PRELOAD")
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
        [os.fspath(CC),*LINK_FLAGS,"-Wl,-t,-t","-o",os.fspath(output),os.fspath(obj)],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=30,env=ENV,
    )
    if link_result.returncode!=0:
        raise AssertionError(
            "link failed: "+link_result.stderr.decode("utf-8","replace")[-2000:]
        )
    if link_result.stderr:
        raise AssertionError(
            "successful linker trace produced stderr: "+
            link_result.stderr.decode("utf-8","replace")[-2000:]
        )
    link_trace=parse_link_trace(link_result.stdout,obj)
    strip_result=subprocess.run(
        [os.fspath(STRIP),"--strip-all",os.fspath(output)],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=30,env=ENV,
    )
    if strip_result.returncode!=0 or strip_result.stdout or strip_result.stderr:
        raise AssertionError("strip failed or produced unexpected output")
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
            "Epoch-2 native preentry self-test failed: "+
            test.stderr.decode("utf-8","replace")[-1000:]
        )
    stdout=test.stdout.decode("utf-8","strict")
    if stdout!=EXPECTED_SELF_TEST or test.stderr:
        raise AssertionError("Epoch-2 native preentry self-test transcript mismatch")
    return binary,elf,{
        "compile_object":{
            "bytes":len(object_bytes),
            "sha256":sha256(object_bytes),
        },
        "link_trace":link_trace,
    }

def material(report:dict)->dict:
    return {k:v for k,v in report.items() if k!="candidate_id"}

def derive()->dict:
    source=bounded_file(SOURCE,1024*1024,"Epoch-2 native preentry source")
    if git_blob_sha1(source)!=EXPECTED_SOURCE_GIT_BLOB_SHA1:
        raise AssertionError("Epoch-2 native preentry source Git blob mismatch")
    runner=bounded_file(RUNNER,4*1024*1024,"Epoch-2 live runner")
    if git_blob_sha1(runner)!=EXPECTED_RUNNER_GIT_BLOB_SHA1:
        raise AssertionError("Epoch-2 live runner Git blob mismatch")
    trust_files={}
    for relative,expected in (
        (SOURCE_PROOF_REL,EXPECTED_SOURCE_PROOF_GIT_BLOB_SHA1),
        (SOURCE_WORKFLOW_REL,EXPECTED_SOURCE_WORKFLOW_GIT_BLOB_SHA1),
        (SEALED_V2_REL,EXPECTED_SEALED_V2_GIT_BLOB_SHA1),
    ):
        data=bounded_file(ROOT/relative,4*1024*1024,"trust root "+relative)
        if git_blob_sha1(data)!=expected:
            raise AssertionError("trust root Git blob mismatch: "+relative)
        trust_files[relative]={"git_blob_sha1":expected,"sha256":sha256(data),"bytes":len(data)}
    compiler=compiler_identity()
    toolchain_base=static_toolchain_identity()
    preprocessed=preprocessed_source_identity()
    with tempfile.TemporaryDirectory(
        prefix="void-buy-epoch2-native-v6-candidate-"
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
        "version":6,
        "status":"candidate_only_unaccepted",
        "source":{
            "path":SOURCE_REL,
            "git_blob_sha1":EXPECTED_SOURCE_GIT_BLOB_SHA1,
            "sha256":sha256(source),
        },
        "runner":{
            "path":RUNNER_REL,
            "git_blob_sha1":EXPECTED_RUNNER_GIT_BLOB_SHA1,
            "sha256":sha256(runner),
            "bytes":len(runner),
            "install_mode":"0444",
        },
        "trust_root":{
            "source_parent":SOURCE_PARENT,
            "source_proof":trust_files[SOURCE_PROOF_REL],
            "source_workflow":trust_files[SOURCE_WORKFLOW_REL],
            "sealed_v2":trust_files[SEALED_V2_REL],
            "proof_generation_repaired":True,
        },
        "compiler":compiler,
        "compile_recipe":{
            "compile_argv_prefix":[os.fspath(CC),*COMPILE_FLAGS],
            "link_argv_prefix":[os.fspath(CC),*LINK_FLAGS,"-Wl,-t,-t"],
            "preprocess_argv_prefix":[os.fspath(CC),*PREPROCESS_FLAGS,"-E","-P"],
            "strip_argv":[os.fspath(STRIP),"--strip-all"],
            "source_date_epoch":"0",
            "build_id_disabled":True,
            "static_link_required":True,
            "no_pie_required":True,
        },
        "toolchain":{
            **toolchain_base,
            "preprocessed_translation_unit":preprocessed,
            "compile_object":first_build["compile_object"],
            "link_trace":first_build["link_trace"],
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
            "candidate_accepted":False,
            "native_binary_identity_accepted":False,
            "runner_identity_accepted":False,
            "protected_install_authorized":False,
            "live_execution_authorized":False,
            "credential_access":False,
            "private_key_access":False,
            "signing_authorized":False,
            "transaction":False,
            "payment_acceptance":False,
            "public_presale_activation":False,
            "wc_void_market_activation":False,
            "funds_movement":False,
        },
        "next_gate":"void_buy_void_epoch2_live_composition_native_candidate_lock_v6",
    }
    return {
        **base,
        "candidate_id":
            "voidbuye2nativecand6_"+sha256(canonical(base).encode("utf-8")),
    }

def validate(report:dict)->None:
    exact_keys(
        report,
        (
            "authority","binary","candidate_id","compile_recipe","compiler",
            "marker","next_gate","runner","self_test","source","status","toolchain",
            "trust_root","version",
        ),
        "candidate report",
    )
    if type(report["version"]) is not int or report["version"]!=6:
        raise AssertionError("candidate version invalid")
    if report["marker"]!=MARKER or report["status"]!="candidate_only_unaccepted":
        raise AssertionError("candidate marker/status invalid")
    if report["next_gate"]!="void_buy_void_epoch2_live_composition_native_candidate_lock_v6":
        raise AssertionError("candidate next gate invalid")

    exact_keys(report["source"],("git_blob_sha1","path","sha256"),"source")
    current=bounded_file(SOURCE,1024*1024,"Epoch-2 native preentry source")
    if (
        report["source"]["path"]!=SOURCE_REL or
        report["source"]["git_blob_sha1"]!=EXPECTED_SOURCE_GIT_BLOB_SHA1 or
        report["source"]["git_blob_sha1"]!=git_blob_sha1(current) or
        report["source"]["sha256"]!=sha256(current)
    ):
        raise AssertionError("candidate source identity invalid")

    exact_keys(
        report["runner"],
        ("bytes","git_blob_sha1","install_mode","path","sha256"),
        "runner",
    )
    current_runner=bounded_file(RUNNER,4*1024*1024,"Epoch-2 live runner")
    if (
        report["runner"]["path"]!=RUNNER_REL or
        report["runner"]["git_blob_sha1"]!=EXPECTED_RUNNER_GIT_BLOB_SHA1 or
        report["runner"]["git_blob_sha1"]!=git_blob_sha1(current_runner) or
        report["runner"]["sha256"]!=sha256(current_runner) or
        report["runner"]["bytes"]!=len(current_runner) or
        report["runner"]["install_mode"]!="0444"
    ):
        raise AssertionError("candidate runner identity invalid")

    exact_keys(
        report["trust_root"],
        ("proof_generation_repaired","sealed_v2","source_parent","source_proof","source_workflow"),
        "trust root",
    )
    if report["trust_root"]["source_parent"]!=SOURCE_PARENT or report["trust_root"]["proof_generation_repaired"] is not True:
        raise AssertionError("candidate trust root generation invalid")
    for key,relative,expected in (
        ("source_proof",SOURCE_PROOF_REL,EXPECTED_SOURCE_PROOF_GIT_BLOB_SHA1),
        ("source_workflow",SOURCE_WORKFLOW_REL,EXPECTED_SOURCE_WORKFLOW_GIT_BLOB_SHA1),
        ("sealed_v2",SEALED_V2_REL,EXPECTED_SEALED_V2_GIT_BLOB_SHA1),
    ):
        data=bounded_file(ROOT/relative,4*1024*1024,"trust root "+relative)
        want={"git_blob_sha1":expected,"sha256":sha256(data),"bytes":len(data)}
        if report["trust_root"][key]!=want:
            raise AssertionError("candidate trust root identity invalid: "+key)

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
            "no_pie_required","preprocess_argv_prefix","source_date_epoch",
            "static_link_required","strip_argv",
        ),
        "compile recipe",
    )
    if (
        report["compile_recipe"]["compile_argv_prefix"]!=[os.fspath(CC),*COMPILE_FLAGS] or
        report["compile_recipe"]["link_argv_prefix"]!=[os.fspath(CC),*LINK_FLAGS,"-Wl,-t,-t"] or
        report["compile_recipe"]["preprocess_argv_prefix"]!=[os.fspath(CC),*PREPROCESS_FLAGS,"-E","-P"] or
        report["compile_recipe"]["strip_argv"]!=[os.fspath(STRIP),"--strip-all"] or
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
            "gcc_specs_sha256","link_trace","preprocessed_translation_unit",
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
    link_trace=report["toolchain"]["link_trace"]
    exact_keys(
        link_trace,
        (
            "archive_member_record_count","candidate_object_record_count",
            "file_identities","raw_normalized_bytes","raw_normalized_sha256",
            "record_count","records",
        ),
        "link trace",
    )
    if (
        type(link_trace["raw_normalized_bytes"]) is not int or
        link_trace["raw_normalized_bytes"]<1 or
        link_trace["raw_normalized_bytes"]>MAX_REPORT_BYTES or
        not isinstance(link_trace["raw_normalized_sha256"],str) or
        HEX64.fullmatch(link_trace["raw_normalized_sha256"]) is None or
        type(link_trace["record_count"]) is not int or
        link_trace["record_count"]<2 or
        link_trace["candidate_object_record_count"]!=1 or
        type(link_trace["archive_member_record_count"]) is not int or
        link_trace["archive_member_record_count"]<1
    ):
        raise AssertionError("candidate raw linker trace identity invalid")

    identities=link_trace["file_identities"]
    if not isinstance(identities,list) or not identities:
        raise AssertionError("candidate linker file identity closure invalid")
    identity_paths=set()
    previous=""
    for index,entry in enumerate(identities):
        exact_keys(entry,("bytes","path","sha256"),"link file identity")
        path_text=entry["path"]
        if (
            not isinstance(path_text,str) or not os.path.isabs(path_text) or
            os.path.realpath(path_text)!=path_text or path_text<=previous
        ):
            raise AssertionError("candidate linker file identity path invalid")
        previous=path_text
        if entry!=regular_file_identity(
            Path(path_text),"link file identity "+str(index)
        ):
            raise AssertionError("candidate linker file identity drift")
        identity_paths.add(path_text)

    records=link_trace["records"]
    if (
        not isinstance(records,list) or
        len(records)!=link_trace["record_count"]
    ):
        raise AssertionError("candidate linker record closure invalid")
    candidate_records=0
    archive_records=0
    for index,entry in enumerate(records):
        if not isinstance(entry,dict) or "kind" not in entry:
            raise AssertionError("candidate linker record invalid")
        kind=entry["kind"]
        if kind=="candidate_object":
            exact_keys(entry,("kind",),"candidate object record")
            candidate_records+=1
            continue
        if kind=="file":
            exact_keys(entry,("kind","path"),"link file record")
            if entry["path"] not in identity_paths:
                raise AssertionError("link file record lacks bound identity")
            continue
        if kind=="archive_member":
            exact_keys(
                entry,
                ("archive_path","kind","member","syntax"),
                "archive member record",
            )
            if entry["archive_path"] not in identity_paths:
                raise AssertionError("archive member lacks bound archive identity")
            if (
                entry["syntax"] not in ("prefix","suffix") or
                not isinstance(entry["member"],str) or
                not entry["member"] or
                "\x00" in entry["member"] or
                "\n" in entry["member"] or
                "\r" in entry["member"]
            ):
                raise AssertionError("archive member record value invalid")
            archive_records+=1
            continue
        raise AssertionError(
            "unknown candidate linker record kind at "+str(index)
        )
    if (
        candidate_records!=1 or
        archive_records!=link_trace["archive_member_record_count"]
    ):
        raise AssertionError("candidate linker record counts invalid")
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
            "candidate_accepted","candidate_report_filesystem_write",
            "credential_access","funds_movement","live_execution_authorized",
            "native_binary_identity_accepted","payment_acceptance",
            "private_key_access","protected_install_authorized",
            "public_presale_activation","runner_identity_accepted",
            "signing_authorized","source_only_candidate","transaction",
            "wc_void_market_activation",
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
"voidbuye2nativecand6_"+sha256(canonical(material(report)).encode("utf-8"))
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
    print("traced_absolute_link_inputs_fail_closed=true")
    print("linker_trace_closed_grammar=true")
    print("linker_archive_member_records_bound=true")
    print("raw_linker_trace_identity_bound=true")
    print("unknown_nonempty_linker_trace_records_hold=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")

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
        report["toolchain"]!=local["toolchain"] or
        report["runner"]!=local["runner"] or
        report["trust_root"]!=local["trust_root"]
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
    print("traced_absolute_link_inputs_fail_closed=true")
    print("linker_trace_closed_grammar=true")
    print("linker_archive_member_records_bound=true")
    print("raw_linker_trace_identity_bound=true")
    print("unknown_nonempty_linker_trace_records_hold=true")
    print("candidate_accepted=false")
    print("live_execution_authorized=false")

def self_test()->None:
    valid=derive()
    validate(valid)

    bad=json.loads(canonical(valid))
    bad["version"]=True
    bad["candidate_id"]=(
        "voidbuye2nativecand6_"+sha256(canonical(material(bad)).encode("utf-8"))
    )
    try:
        validate(bad)
    except AssertionError as exc:
        if "version invalid" not in str(exc):
            raise
    else:
        raise AssertionError("boolean version unexpectedly admitted")

    try:
        parse_link_trace(b"relative-link-input.a\n",Path("/tmp/own.o"))
    except AssertionError as exc:
        if "unrecognized nonempty linker trace record" not in str(exc):
            raise
    else:
        raise AssertionError("relative traced linker input unexpectedly skipped")

    with tempfile.TemporaryDirectory(prefix="void-epoch2-link-trace-negative-") as td:
        root=Path(td)
        own=root/"own.o"
        own.write_bytes(b"own-object")
        library=root/"libfixture.a"
        library.write_bytes(b"fixture-archive")
        raw=(
            os.fspath(own)+"\n"+
            os.fspath(library)+"\n"+
            "("+os.fspath(library)+")member.o\n"
        ).encode("utf-8")
        parsed=parse_link_trace(raw,own)
        if (
            parsed["candidate_object_record_count"]!=1 or
            parsed["archive_member_record_count"]!=1 or
            not any(
                record.get("kind")=="archive_member" and
                record.get("archive_path")==os.path.realpath(library) and
                record.get("member")=="member.o" and
                record.get("syntax")=="prefix"
                for record in parsed["records"]
            )
        ):
            raise AssertionError("archive-member trace grammar self-test failed")

        try:
            parse_link_trace(
                (os.fspath(own)+"\nrelative-or-unknown.o\n").encode("utf-8"),
                own,
            )
        except AssertionError as exc:
            if "unrecognized nonempty linker trace record" not in str(exc):
                raise
        else:
            raise AssertionError(
                "unknown nonabsolute linker trace record unexpectedly skipped"
            )

        missing=os.path.join(td,"missing-link-input.a")
        try:
            parse_link_trace(
                (os.fspath(own)+"\n"+missing+"\n").encode("utf-8"),
                own,
            )
        except AssertionError as exc:
            if "traced linker file" not in str(exc):
                raise
        else:
            raise AssertionError(
                "missing traced absolute linker input unexpectedly skipped"
            )

    forged=json.loads(canonical(valid))
    digest=forged["binary"]["sha256"]
    forged["binary"]["sha256"]=("0" if digest[0]!="0" else "1")+digest[1:]
    forged["candidate_id"]=(
        "voidbuye2nativecand6_"+sha256(canonical(material(forged)).encode("utf-8"))
    )
    validate(forged)
    with tempfile.TemporaryDirectory(prefix="void-epoch2-forged-candidate-v6-") as td:
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
    print("static_toolchain_closure_bound=true")
    print("traced_absolute_link_inputs_fail_closed=true")
    print("linker_trace_closed_grammar=true")
    print("linker_archive_member_records_bound=true")
    print("raw_linker_trace_identity_bound=true")
    print("unknown_nonempty_linker_trace_records_hold=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")

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

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile

MARKER="VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_BINARY_CANDIDATE_V2"
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"ops/precision/void_buy_void_epoch2_v6r3_plan_first_entry_v1.c"
SOURCE_REL="ops/precision/void_buy_void_epoch2_v6r3_plan_first_entry_v1.c"
EXPECTED_SOURCE_GIT_BLOB_SHA1="8d06482b5cc313cc1609371493112e737f89abc2"
CC=Path("/usr/bin/cc")
FILE=Path("/usr/bin/file")
READELF=Path("/usr/bin/readelf")
MIN_BINARY_BYTES=64*1024
MAX_BINARY_BYTES=4*1024*1024
MAX_SOURCE_BYTES=1024*1024
MAX_REPORT_BYTES=64*1024
HEX40=re.compile(r"^[0-9a-f]{40}$")
HEX64=re.compile(r"^[0-9a-f]{64}$")
CANDIDATE_ID=re.compile(r"^voidbuye2v6r3planfirstentrybincand2_[0-9a-f]{64}$")
COMPILE_FLAGS=(
    "-std=c11","-O2","-Wall","-Wextra","-Werror",
    "-D_FORTIFY_SOURCE=2","-fstack-protector-strong",
    "-static","-Wl,-z,relro,-z,now","-Wl,--build-id=none",
)
ENV={
    "PATH":"/usr/bin:/bin",
    "HOME":"/nonexistent",
    "LANG":"C","LC_ALL":"C","TZ":"UTC",
    "SOURCE_DATE_EPOCH":"0",
}
EXPECTED_SELF_TEST=(
    "VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_V1_SELF_TEST_GREEN\n"
    "planner_git_blob=19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff\n"
    "planner_sha256=95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627\n"
    "planner_bytes=49025\n"
    "root_static_first_entry_required=true\n"
    "standard_fds_reserved_before_trusted_opens=true\n"
    "trusted_stdout_stderr_nonfile_sinks_required=true\n"
    "mapped_planner_fd3_revalidated=true\n"
    "runtime_uid_gid_1000_required=true\n"
    "runtime_securebits_default_required=true\n"
    "runtime_capability_sets_zero_required=true\n"
    "runtime_supplementary_groups_empty_required=true\n"
    "permanent_uid_gid_drop_before_python=true\n"
    "runtime_dumpable_disabled_before_python=true\n"
    "planner_retained_descriptor_required=true\n"
    "planner_sealed_memfd_execution=true\n"
    "python_sealed_memfd_fexecve=true\n"
    "sealed_memfd_write_rejected=true\n"
    "python_retained_descriptor_fexecve_required=true\n"
    "isolated_python_required=true\n"
    "python_site_import_disabled=true\n"
    "caller_stdin_python_source_authority=false\n"
    "filesystem_write=false\n"
    "credential_access=false\n"
    "signing=false\n"
    "transaction=false\n"
    "funds_movement=false\n"
)

def canonical(value:object)->str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=True)

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

def exact_bytes(path:Path,maximum:int,label:str)->bytes:
    before=path.lstat()
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode)
        or before.st_nlink!=1 or before.st_size<1 or before.st_size>maximum
    ):
        raise AssertionError(label+"_metadata_invalid")
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        opened=os.fstat(fd)
        fields=("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns")
        if any(getattr(before,k)!=getattr(opened,k) for k in fields):
            raise AssertionError(label+"_open_generation_changed")
        chunks=[];remaining=opened.st_size
        while remaining:
            chunk=os.read(fd,min(65536,remaining))
            if not chunk: raise AssertionError(label+"_short_read")
            chunks.append(chunk);remaining-=len(chunk)
        if os.read(fd,1)!=b"": raise AssertionError(label+"_grew")
        after=os.fstat(fd);visible=path.lstat()
        if any(getattr(opened,k)!=getattr(after,k) or getattr(after,k)!=getattr(visible,k) for k in fields):
            raise AssertionError(label+"_generation_changed")
        return b"".join(chunks)
    finally:
        os.close(fd)

def run(argv:list[str],*,timeout:int=60)->subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        env=ENV,timeout=timeout,check=False,
    )

def require_success(cp:subprocess.CompletedProcess[bytes],label:str)->None:
    if cp.returncode!=0:
        raise AssertionError(
            label+"_failed rc="+str(cp.returncode)+
            " stderr="+cp.stderr.decode("utf-8","replace")[-2000:]
        )

def capture(argv:list[str])->str:
    cp=run(argv)
    require_success(cp,"capture")
    if cp.stderr:
        raise AssertionError("capture_stderr_nonempty")
    return cp.stdout.decode("utf-8","strict")

def compiler_identity()->dict[str,object]:
    requested=Path(os.path.abspath(os.fspath(CC)))
    real=Path(os.path.realpath(requested))
    if not real.is_absolute() or not real.is_file():
        raise AssertionError("compiler_realpath_invalid")
    raw=exact_bytes(real,128*1024*1024,"compiler")
    version=capture([os.fspath(requested),"--version"]).splitlines()
    machine=capture([os.fspath(requested),"-dumpmachine"]).strip()
    dumpversion=capture([os.fspath(requested),"-dumpfullversion","-dumpversion"]).strip()
    if not version or not machine or not dumpversion:
        raise AssertionError("compiler_identity_incomplete")
    return {
        "requested_path":os.fspath(requested),
        "realpath":os.fspath(real),
        "bytes":len(raw),
        "sha256":sha256(raw),
        "version_line":version[0],
        "dumpmachine":machine,
        "dumpversion":dumpversion,
    }

def source_contract(source:str)->dict[str,bool]:
    required={
        "root_static_first_entry_required":"root_static_first_entry_required",
        "permanent_uid_gid_drop_before_python":"setresuid((uid_t)REQUIRED_UID",
        "supplementary_groups_cleared":"setgroups(0,NULL)",
        "no_new_privileges_before_python":"PR_SET_NO_NEW_PRIVS",
        "planner_sealed_memfd_execution":"planner_sealed_snapshot_invalid",
        "python_sealed_memfd_fexecve":"fexecve(python_fd,child_argv,child_env);",
        "isolated_python_i_b_s":'policy.python_realpath,"-I","-B","-S"',
        "caller_stdin_replaced":"devnull_stdin_descriptor_invalid",
        "close_range_unshare_required":"SYS_close_range",
        "root_opened_output_sink_rejected":"require_safe_output_sinks(false);",
        "inherited_securebits_checked":"PR_GET_SECUREBITS",
        "postdrop_capsets_cleared":"SYS_capset",
        "inherited_fd_census_required":"assert_no_unneeded_fds",
        "fixed_planner_digest_bound":'#define PLANNER_SHA256 "95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627"',
    }
    result={key:(needle in source) for key,needle in required.items()}
    if not all(result.values()):
        raise AssertionError("source_contract_incomplete")
    if any(x in source for x in ("system(","popen(","execvp(","execlp(")):
        raise AssertionError("source_path_search_or_shell_present")
    return result

def compile_one(output:Path)->bytes:
    if output.exists(): raise AssertionError("candidate_output_preexisting")
    cp=run([os.fspath(CC),*COMPILE_FLAGS,os.fspath(SOURCE),"-o",os.fspath(output)],timeout=120)
    require_success(cp,"candidate_compile")
    if cp.stdout or cp.stderr:
        raise AssertionError("candidate_compile_output_nonempty")
    raw=exact_bytes(output,MAX_BINARY_BYTES,"candidate_binary")
    if len(raw)<MIN_BINARY_BYTES or not raw.startswith(b"\x7fELF"):
        raise AssertionError("candidate_binary_shape_invalid")
    cp=run([os.fspath(FILE),os.fspath(output)])
    require_success(cp,"candidate_file")
    if b"statically linked" not in cp.stdout.lower():
        raise AssertionError("candidate_not_static")
    cp=run([os.fspath(READELF),"-l",os.fspath(output)])
    require_success(cp,"candidate_readelf")
    if b" INTERP " in cp.stdout:
        raise AssertionError("candidate_pt_interp_present")
    cp=run([os.fspath(output),"--self-test"],timeout=30)
    require_success(cp,"candidate_self_test")
    if cp.stderr:
        raise AssertionError("candidate_self_test_stderr")
    if cp.stdout.decode("utf-8","strict")!=EXPECTED_SELF_TEST:
        raise AssertionError("candidate_self_test_transcript_mismatch")
    return raw

def candidate_material(report:dict)->dict:
    return {k:v for k,v in report.items() if k!="candidate_id"}

def derive()->dict:
    source_raw=exact_bytes(SOURCE,MAX_SOURCE_BYTES,"source")
    if git_blob(source_raw)!=EXPECTED_SOURCE_GIT_BLOB_SHA1:
        raise AssertionError("source_git_blob_mismatch")
    source_text=source_raw.decode("utf-8","strict")
    compiler=compiler_identity()
    with tempfile.TemporaryDirectory(prefix="void-e2-v6r3-plan-first-entry-bin-cand-") as td:
        root=Path(td)
        first=compile_one(root/"launcher-a")
        second=compile_one(root/"launcher-b")
    if first!=second:
        raise AssertionError("two_local_builds_not_identical")
    body={
        "marker":MARKER,
        "version":2,
        "status":"candidate_only_unaccepted",
        "source":{
            "path":SOURCE_REL,
            "git_blob_sha1":git_blob(source_raw),
            "sha256":sha256(source_raw),
            "bytes":len(source_raw),
        },
        "source_contract":source_contract(source_text),
        "compiler":compiler,
        "compile_recipe":{
            "argv_prefix":[os.fspath(CC),*COMPILE_FLAGS],
            "source_date_epoch":"0",
            "static_link_required":True,
            "pt_interp_absent_required":True,
            "build_id_disabled":True,
        },
        "binary":{
            "bytes":len(first),
            "sha256":sha256(first),
            "elf_magic_verified":True,
            "static_link_verified":True,
            "pt_interp_absent":True,
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
            "protected_install_authorized":False,
            "installed_binary_identity_proven":False,
            "host_plan_authorized":False,
            "service_mutation":False,
            "credential_access":False,
            "private_key_access":False,
            "signing":False,
            "transaction":False,
            "rpc_call":False,
            "payment_acceptance":False,
            "public_presale_activation":False,
            "wc_void_market_activation":False,
            "treasury_liquidity_action":False,
            "funds_movement":False,
        },
        "next_gate":"void_buy_void_epoch2_v6r3_plan_first_entry_binary_candidate_lock_v2",
    }
    return {
        **body,
        "candidate_id":"voidbuye2v6r3planfirstentrybincand2_"+sha256(canonical(body).encode("ascii")),
    }

def exact_keys(value:dict,expected:set[str],label:str)->None:
    if not isinstance(value,dict) or set(value)!=expected:
        raise AssertionError(label+"_schema_invalid")

def validate(report:dict)->None:
    exact_keys(report,{
        "marker","version","status","source","source_contract","compiler",
        "compile_recipe","binary","self_test","authority","next_gate","candidate_id",
    },"report")
    if report["marker"]!=MARKER or report["version"]!=2 or report["status"]!="candidate_only_unaccepted":
        raise AssertionError("report_header_invalid")
    if report["next_gate"]!="void_buy_void_epoch2_v6r3_plan_first_entry_binary_candidate_lock_v2":
        raise AssertionError("next_gate_invalid")
    source_raw=exact_bytes(SOURCE,MAX_SOURCE_BYTES,"source")
    if report["source"]!={
        "path":SOURCE_REL,"git_blob_sha1":EXPECTED_SOURCE_GIT_BLOB_SHA1,
        "sha256":sha256(source_raw),"bytes":len(source_raw),
    }:
        raise AssertionError("source_identity_invalid")
    if report["source_contract"]!=source_contract(source_raw.decode("utf-8","strict")):
        raise AssertionError("source_contract_invalid")
    if report["compiler"]!=compiler_identity():
        raise AssertionError("compiler_identity_invalid")
    if report["compile_recipe"]!={
        "argv_prefix":[os.fspath(CC),*COMPILE_FLAGS],
        "source_date_epoch":"0","static_link_required":True,
        "pt_interp_absent_required":True,"build_id_disabled":True,
    }:
        raise AssertionError("compile_recipe_invalid")
    binary=report["binary"]
    exact_keys(binary,{
        "bytes","sha256","elf_magic_verified","static_link_verified",
        "pt_interp_absent","two_builds_byte_identical",
    },"binary")
    if (
        not isinstance(binary["bytes"],int) or not MIN_BINARY_BYTES<=binary["bytes"]<=MAX_BINARY_BYTES
        or not isinstance(binary["sha256"],str) or HEX64.fullmatch(binary["sha256"]) is None
        or any(binary[k] is not True for k in (
            "elf_magic_verified","static_link_verified","pt_interp_absent","two_builds_byte_identical"
        ))
    ):
        raise AssertionError("binary_identity_invalid")
    if report["self_test"]!={
        "stdout_sha256":sha256(EXPECTED_SELF_TEST.encode("utf-8")),
        "exact_transcript_verified":True,"stderr_empty":True,
    }:
        raise AssertionError("self_test_identity_invalid")
    authority=report["authority"]
    exact_keys(authority,{
        "source_only_candidate","candidate_report_filesystem_write",
        "candidate_binary_identity_accepted","protected_install_authorized",
        "installed_binary_identity_proven","host_plan_authorized","service_mutation",
        "credential_access","private_key_access","signing","transaction","rpc_call",
        "payment_acceptance","public_presale_activation","wc_void_market_activation",
        "treasury_liquidity_action","funds_movement",
    },"authority")
    if authority["source_only_candidate"] is not True or authority["candidate_report_filesystem_write"] is not True:
        raise AssertionError("positive_authority_invalid")
    for key,value in authority.items():
        if key in ("source_only_candidate","candidate_report_filesystem_write"): continue
        if value is not False: raise AssertionError("authority_overclaim:"+key)
    cid=report["candidate_id"]
    if not isinstance(cid,str) or CANDIDATE_ID.fullmatch(cid) is None:
        raise AssertionError("candidate_id_invalid")
    expected="voidbuye2v6r3planfirstentrybincand2_"+sha256(
        canonical(candidate_material(report)).encode("ascii")
    )
    if cid!=expected:
        raise AssertionError("candidate_id_content_binding_invalid")

def derive_to(output:Path)->None:
    report=derive();validate(report)
    payload=(canonical(report)+"\n").encode("ascii")
    if len(payload)>MAX_REPORT_BYTES: raise AssertionError("report_too_large")
    output=Path(os.path.abspath(os.fspath(output)))
    if output.exists(): raise AssertionError("report_preexisting")
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open("xb") as h:
        h.write(payload);h.flush();os.fsync(h.fileno())
    if exact_bytes(output,MAX_REPORT_BYTES,"report")!=payload:
        raise AssertionError("report_readback_mismatch")
    print(MARKER+"_DERIVE_GREEN")
    print("candidate_id="+report["candidate_id"])
    print("binary_sha256="+report["binary"]["sha256"])
    print("binary_bytes="+str(report["binary"]["bytes"]))
    print("candidate_binary_identity_accepted=false")
    print("protected_install_authorized=false")
    print("host_plan_authorized=false")
    print("funds_movement=false")

def compare_dir(directory:Path)->None:
    root=Path(os.path.abspath(os.fspath(directory)))
    paths=sorted(root.rglob("candidate.json"))
    if len(paths)!=3: raise AssertionError("expected_three_reports")
    payloads=[exact_bytes(p,MAX_REPORT_BYTES,"hosted_report") for p in paths]
    if not all(x==payloads[0] for x in payloads[1:]):
        raise AssertionError("hosted_reports_not_identical")
    report=json.loads(payloads[0])
    validate(report)
    if payloads[0]!=(canonical(report)+"\n").encode("ascii"):
        raise AssertionError("report_not_canonical")
    print(MARKER+"_THREE_RUN_GREEN")
    print("candidate_id="+report["candidate_id"])
    print("binary_sha256="+report["binary"]["sha256"])
    print("binary_bytes="+str(report["binary"]["bytes"]))
    print("three_run_report_bytes_identical=true")
    print("candidate_binary_identity_accepted=false")
    print("protected_install_authorized=false")
    print("host_plan_authorized=false")
    print("funds_movement=false")

def self_test()->None:
    valid=derive();validate(valid)
    tampered=json.loads(canonical(valid))
    tampered["candidate_id"]="voidbuye2v6r3planfirstentrybincand2_"+("0"*64)
    try: validate(tampered)
    except AssertionError as exc:
        assert "content_binding" in str(exc)
    else: raise AssertionError("tampered_candidate_id_admitted")
    over=json.loads(canonical(valid))
    over["authority"]["host_plan_authorized"]=True
    material=candidate_material(over)
    over["candidate_id"]="voidbuye2v6r3planfirstentrybincand2_"+sha256(canonical(material).encode("ascii"))
    try: validate(over)
    except AssertionError as exc:
        assert "authority_overclaim" in str(exc)
    else: raise AssertionError("authority_overclaim_admitted")
    print(MARKER+"_SELF_TEST_GREEN")
    print("closed_report_schema=true")
    print("candidate_id_recomputed=true")
    print("authority_overclaim_rejected=true")
    print("source_blob_bound=true")
    print("compiler_binary_identity_recorded=true")
    print("static_no_interp_required=true")

def main()->int:
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--derive",type=Path)
    group.add_argument("--compare-dir",type=Path)
    group.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    if args.derive is not None: derive_to(args.derive)
    elif args.compare_dir is not None: compare_dir(args.compare_dir)
    else: self_test()
    return 0

if __name__=="__main__":
    raise SystemExit(main())

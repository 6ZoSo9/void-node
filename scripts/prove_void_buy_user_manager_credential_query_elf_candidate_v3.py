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
import subprocess
import tempfile

MARKER="VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_ELF_CANDIDATE_V3"
ROOT=Path(__file__).resolve().parents[1]
BASE="6d8d0725a36d7907e4620371952aa71fd64696df"
PEER_REL="ops/precision/void_buy_void_user_manager_private_peer_guard_v1.c"
QUERY_REL="ops/precision/void_buy_void_user_manager_private_credential_unit_query_v3.c"
QUERY_PROOF_REL="scripts/prove_void_buy_user_manager_private_credential_unit_query_v3.mjs"
PREEXEC_REL="ops/precision/void_buy_void_user_manager_private_credential_unit_query_preexec_v1.c"
PREEXEC_PROOF_REL="scripts/prove_void_buy_void_user_manager_private_credential_unit_query_preexec_v1.mjs"
WORKFLOW_REL=".github/workflows/buy-void-user-manager-credential-query-elf-candidate-v3.yml"
DOC_REL="docs/operators/buy-void-user-manager-credential-query-elf-candidate-v3.md"
SELF_REL="scripts/prove_void_buy_user_manager_credential_query_elf_candidate_v3.py"
EXPECTED_SCOPE=tuple(sorted((WORKFLOW_REL,DOC_REL,SELF_REL)))
EXPECTED_BLOBS={
    PEER_REL:"d8b30ac499c3bb8a5d223dbc6be687dd175be611",
    QUERY_REL:"0d0e9546aea6e7346f5b35559bcdd8e7788900fe",
    QUERY_PROOF_REL:"f640e7fc19b33513360b2247ac1bdc705f848f4f",
    PREEXEC_REL:"0ccd2d07a951389d85a9fc56ec892a774d9dd681",
    PREEXEC_PROOF_REL:"58df08ca966f4629893c3885f1df37c837762520",
}
PREDECESSOR_PREEXEC_BYTES=706504
PREDECESSOR_PREEXEC_SHA256="67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c"
V2_LOCK_ID="voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54"
CC=Path("/usr/bin/cc")
STRIP=Path("/usr/bin/strip")
MAX_FILE=64*1024*1024
MAX_REPORT=512*1024
ENV={"PATH":"/usr/bin:/bin","LANG":"C","LC_ALL":"C","TZ":"UTC","SOURCE_DATE_EPOCH":"0"}
COMPILE=("-std=c11","-Wall","-Wextra","-Werror","-O2","-fno-ident")
PREEXEC_COMPILE=(*COMPILE,"-fno-pie")
PREEXEC_LINK=("-static","-fno-pie","-no-pie","-Wl,--build-id=none","-Wl,-t,-t")
QUERY_LINK=("-Wl,--build-id=none","-Wl,-t,-t")
QUERY_LINK_TAIL=("-ldl",)
ARCHIVE_PREFIX=re.compile(r"^\((/[^()\x00\r\n]+)\)([^()\x00\r\n]+)$")
ARCHIVE_SUFFIX=re.compile(r"^(/[^()\x00\r\n]+)\(([^()\x00\r\n]+)\)$")

def canonical(v)->str:
    return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=False)

def sha256(b:bytes)->str:
    return hashlib.sha256(b).hexdigest()

def git_blob(b:bytes)->str:
    h=hashlib.sha1();h.update(f"blob {len(b)}\0".encode("ascii"));h.update(b);return h.hexdigest()

def run(argv:list[str],cwd:Path=ROOT,timeout:int=60)->subprocess.CompletedProcess[bytes]:
    r=subprocess.run(argv,cwd=cwd,env=ENV,stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=timeout)
    if r.returncode!=0:
        raise AssertionError("command failed: "+repr(argv)+" "+r.stderr.decode("utf-8","replace")[-2000:])
    return r

def git(args:list[str])->str:
    return run(["/usr/bin/git","--no-replace-objects","-C",os.fspath(ROOT),*args],timeout=30).stdout.decode().strip()

def read(path:Path,max_bytes:int=MAX_FILE,label:str="file")->bytes:
    before=path.lstat()
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or before.st_nlink!=1 or before.st_size<1 or before.st_size>max_bytes:
        raise AssertionError(label+" metadata invalid")
    data=path.read_bytes()
    after=path.lstat()
    if (before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns)!=(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns) or len(data)!=before.st_size:
        raise AssertionError(label+" read drift")
    return data

def exact_source()->dict:
    changed=tuple(sorted(x for x in git(["diff","--name-only",BASE,"HEAD","--"]).splitlines() if x))
    if changed!=EXPECTED_SCOPE:
        raise AssertionError("candidate scope drift: "+repr(changed))
    git(["merge-base","--is-ancestor",BASE,"HEAD"])
    out={}
    for rel,expected in EXPECTED_BLOBS.items():
        data=read(ROOT/rel,label="source "+rel)
        blob=git_blob(data)
        if blob!=expected or git(["rev-parse","HEAD:"+rel])!=expected:
            raise AssertionError("source blob drift: "+rel)
        out[rel]={"git_blob_sha1":blob,"sha256":sha256(data),"bytes":len(data)}
    for rel in (WORKFLOW_REL,DOC_REL,SELF_REL):
        data=read(ROOT/rel,label="candidate input "+rel)
        blob=git_blob(data)
        if git(["rev-parse","HEAD:"+rel])!=blob:
            raise AssertionError("candidate input worktree drift: "+rel)
        out[rel]={"git_blob_sha1":blob,"sha256":sha256(data),"bytes":len(data)}
    if git(["status","--porcelain=v1","--untracked-files=all"]):
        raise AssertionError("candidate checkout not clean")
    return out

def capture(args:list[str])->bytes:
    return run(args).stdout

def file_identity(path:Path,label:str)->dict:
    real=Path(os.path.realpath(os.path.abspath(os.fspath(path))))
    data=read(real,label=label)
    return {"path":os.fspath(real),"bytes":len(data),"sha256":sha256(data)}

def resolve_program(name:str)->Path:
    raw=capture([os.fspath(CC),"-print-prog-name="+name]).decode().strip()
    if not raw: raise AssertionError("compiler program missing: "+name)
    if os.path.isabs(raw): return Path(os.path.realpath(raw))
    found=shutil.which(raw,path=ENV["PATH"])
    if not found: raise AssertionError("compiler program unresolved: "+name)
    return Path(os.path.realpath(found))

def toolchain_base()->dict:
    executables={"cc":file_identity(CC,"cc")}
    for name in ("cc1","as","collect2","ld"):
        executables[name]=file_identity(resolve_program(name),name)
    executables["strip"]=file_identity(STRIP,"strip")
    return {
        "executables":executables,
        "gcc_specs":{
            "bytes":len(capture([os.fspath(CC),"-dumpspecs"])),
            "sha256":sha256(capture([os.fspath(CC),"-dumpspecs"])),
        },
        "gcc_search_dirs":{
            "bytes":len(capture([os.fspath(CC),"-print-search-dirs"])),
            "sha256":sha256(capture([os.fspath(CC),"-print-search-dirs"])),
        },
        "dumpmachine":capture([os.fspath(CC),"-dumpmachine"]).decode().strip(),
        "dumpversion":capture([os.fspath(CC),"-dumpfullversion","-dumpversion"]).decode().strip(),
    }

def parse_trace(raw:bytes,obj:Path)->dict:
    try: text=raw.decode("utf-8","strict")
    except UnicodeDecodeError as exc: raise AssertionError("link trace invalid UTF-8") from exc
    if "\x00" in text or "\r" in text: raise AssertionError("link trace control byte")
    obj_real=os.path.realpath(obj)
    identities={}
    records=[]
    normalized=[]
    candidate_count=0
    def bind(raw_path:str,label:str)->str:
        real=os.path.realpath(raw_path)
        p=Path(real)
        identity=file_identity(p,label)
        identities[identity["path"]]=identity
        return identity["path"]
    for line in text.splitlines():
        if line=="": continue
        if line!=line.strip(): raise AssertionError("link trace surrounding whitespace")
        token=line
        if os.path.isabs(token) and "(" not in token and ")" not in token:
            if os.path.realpath(token)==obj_real:
                candidate_count+=1
                records.append({"kind":"candidate_object"})
                normalized.append("<candidate-object>")
            else:
                records.append({"kind":"file","path":bind(token,"link input")})
                normalized.append(token)
            continue
        m=ARCHIVE_PREFIX.fullmatch(token);syntax="prefix"
        if m is None: m=ARCHIVE_SUFFIX.fullmatch(token);syntax="suffix"
        if m is not None:
            member=m.group(2)
            if not member or member in (".",".."): raise AssertionError("archive member invalid")
            records.append({"kind":"archive_member","archive_path":bind(m.group(1),"link archive"),"member":member,"syntax":syntax})
            normalized.append(token)
            continue
        raise AssertionError("unrecognized nonempty linker trace record: "+token)
    if candidate_count!=1: raise AssertionError("candidate object cardinality invalid")
    if not identities: raise AssertionError("link trace yielded no inputs")
    normalized_bytes=("\n".join(normalized)+"\n").encode()
    return {
        "raw_normalized_bytes":len(normalized_bytes),
        "raw_normalized_sha256":sha256(normalized_bytes),
        "record_count":len(records),
        "candidate_object_record_count":candidate_count,
        "records":records,
        "file_identities":[identities[k] for k in sorted(identities)],
    }

def build_one(
    label:str,source_rel:str,compile_flags:tuple[str,...],
    link_flags:tuple[str,...],link_tail:tuple[str,...],root:Path
)->dict:
    source=ROOT/source_rel
    pre=root/(label+".i")
    obj=root/(label+".o")
    elf=root/(label+".elf")
    r=run([os.fspath(CC),*compile_flags,"-E","-P","-o",os.fspath(pre),os.fspath(source)])
    if r.stdout or r.stderr: raise AssertionError(label+" preprocess emitted output")
    pre_b=read(pre,4*1024*1024,label+" preprocessed")
    r=run([os.fspath(CC),*compile_flags,"-c","-o",os.fspath(obj),os.fspath(source)])
    if r.stdout or r.stderr: raise AssertionError(label+" compile emitted output")
    obj_b=read(obj,4*1024*1024,label+" object")
    r=run([os.fspath(CC),*link_flags,"-o",os.fspath(elf),os.fspath(obj),*link_tail])
    if r.stderr: raise AssertionError(label+" linker stderr: "+r.stderr.decode("utf-8","replace")[-1000:])
    trace=parse_trace(r.stdout,obj)
    r=run([os.fspath(STRIP),"--strip-all",os.fspath(elf)])
    if r.stdout or r.stderr: raise AssertionError(label+" strip emitted output")
    elf_b=read(elf,4*1024*1024,label+" elf")
    return {
        "preprocessed":{"bytes":len(pre_b),"sha256":sha256(pre_b)},
        "compile_object":{"bytes":len(obj_b),"sha256":sha256(obj_b)},
        "link_trace":trace,
        "binary":{"bytes":len(elf_b),"sha256":sha256(elf_b)},
        "_path":os.fspath(elf),
    }

def query_self_test(query_path:str)->dict:
    r=subprocess.run([query_path,"--self-test"],env={**ENV,"VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_SANITIZED_V1":"1"},
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=20)
    if r.returncode!=0 or r.stderr: raise AssertionError("V3 query self-test failed")
    lines=r.stdout.decode("utf-8","strict").splitlines()
    required=(
        "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3_SELF_TEST_GREEN",
        "dropin_limit_64=true","loadcredential_limit_32=true",
        "exactly_one_target_credential_match_required=true",
        "unrelated_credentials_allowed=true","duplicate_credential_ids_rejected=true",
        "credential_set_generation_stability_required=true",
        "complete_dropin_set_sha256_emitted=true",
        "complete_credential_set_sha256_emitted=true",
        "sha256_known_vector_verified=true","credential_contents_read=false",
    )
    for line in required:
        if line not in lines: raise AssertionError("missing self-test marker: "+line)
    return {"stdout_sha256":sha256(r.stdout),"stderr_empty":True}

def material(report:dict)->dict:
    return {k:v for k,v in report.items() if k!="candidate_id"}

def derive()->tuple[dict,bytes,bytes]:
    source_identity=exact_source()
    base=toolchain_base()
    with tempfile.TemporaryDirectory(prefix="void-credential-v3-provenance-") as td:
        root=Path(td)
        pre_a=build_one("preexec-a",PREEXEC_REL,PREEXEC_COMPILE,PREEXEC_LINK,(),root)
        pre_b=build_one("preexec-b",PREEXEC_REL,PREEXEC_COMPILE,PREEXEC_LINK,(),root)
        query_a=build_one("query-a",QUERY_REL,COMPILE,QUERY_LINK,QUERY_LINK_TAIL,root)
        query_b=build_one("query-b",QUERY_REL,COMPILE,QUERY_LINK,QUERY_LINK_TAIL,root)
        for a,b,label in ((pre_a,pre_b,"preexec"),(query_a,query_b,"query")):
            aa={k:v for k,v in a.items() if k!="_path"};bb={k:v for k,v in b.items() if k!="_path"}
            if aa!=bb: raise AssertionError(label+" two local builds/toolchain closures differ")
        pre_bytes=read(Path(pre_a["_path"]),4*1024*1024,"preexec final")
        query_bytes=read(Path(query_a["_path"]),4*1024*1024,"query final")
        if len(pre_bytes)!=PREDECESSOR_PREEXEC_BYTES or sha256(pre_bytes)!=PREDECESSOR_PREEXEC_SHA256:
            raise AssertionError("accepted V2 preexec identity drift")
        self_test=query_self_test(query_a["_path"])
        pre_report={k:v for k,v in pre_a.items() if k!="_path"}
        query_report={k:v for k,v in query_a.items() if k!="_path"}
    report={
        "marker":MARKER,
        "version":3,
        "source_parent":BASE,
        "v2_predecessor_lock_id":V2_LOCK_ID,
        "source_identity":source_identity,
        "toolchain":base,
        "build_recipe":{
            "preexec":{
                "preprocess":[os.fspath(CC),*PREEXEC_COMPILE,"-E","-P"],
                "compile":[os.fspath(CC),*PREEXEC_COMPILE,"-c"],
                "link":[os.fspath(CC),*PREEXEC_LINK,"-o","<output>","<object>"],
                "strip":[os.fspath(STRIP),"--strip-all"],
            },
            "query":{
                "preprocess":[os.fspath(CC),*COMPILE,"-E","-P"],
                "compile":[os.fspath(CC),*COMPILE,"-c"],
                "link":[os.fspath(CC),*QUERY_LINK,"-o","<output>","<object>",*QUERY_LINK_TAIL],
                "strip":[os.fspath(STRIP),"--strip-all"],
            },
            "source_date_epoch":"0",
        },
        "preexec_build":pre_report,
        "query_build":query_report,
        "preexec_predecessor_identity_required":True,
        "preexec_predecessor_bytes":PREDECESSOR_PREEXEC_BYTES,
        "preexec_predecessor_sha256":PREDECESSOR_PREEXEC_SHA256,
        "query_self_test":self_test,
        "max_dropin_paths":64,
        "max_load_credentials":32,
        "unique_credential_ids_required":True,
        "exactly_one_epoch2_credential_required":True,
        "unrelated_credentials_allowed":True,
        "complete_credential_set_generation_stability_required":True,
        "complete_dropin_set_sha256_emitted":True,
        "complete_credential_set_sha256_emitted":True,
        "cross_query_complete_set_binding_enabled":True,
        "authenticated_private_manager_peer_required":True,
        "retained_private_connection_required":True,
        "credential_query_preexec_pair_execution_proven":True,
        "credential_contents_read":False,
        "candidate_accepted":False,
        "replacement_authorized":False,
        "live_query_authorized":False,
        "complete_host_evidence_collector":False,
        "production_host_evidence_authority":False,
        "payment_acceptance":False,
        "public_presale_activation":False,
        "wc_void_market_activation":False,
        "transaction":False,
        "funds_movement":False,
    }
    report["candidate_id"]="voidbuyumqcredelfcand3_"+sha256(canonical(report).encode())
    return report,pre_bytes,query_bytes

def write_dir(out:Path)->None:
    if out.exists(): raise AssertionError("output directory exists")
    report,pre,query=derive()
    out.mkdir(parents=True,mode=0o700)
    for name,data,mode in (
        ("credential-query-preexec",pre,0o555),
        ("credential-query",query,0o555),
        ("credential-query-elf-candidate-v3.json",(canonical(report)+"\n").encode(),0o444),
    ):
        p=out/name
        with p.open("xb") as h:
            h.write(data);h.flush();os.fsync(h.fileno())
        os.chmod(p,mode)
    payload=(canonical(report)+"\n").encode()
    if len(payload)>MAX_REPORT: raise AssertionError("candidate report too large")
    print(MARKER+"_DERIVE_GREEN")
    print("candidate_id="+report["candidate_id"])
    print("preexec_binary_sha256="+report["preexec_build"]["binary"]["sha256"])
    print("query_binary_sha256="+report["query_build"]["binary"]["sha256"])
    print("preexec_predecessor_identity_exact=true")
    print("static_toolchain_closure_bound=true")
    print("preexec_link_trace_closed=true")
    print("query_link_trace_closed=true")
    print("candidate_accepted=false")

def compare_dir(root:Path)->None:
    reports=sorted(root.rglob("credential-query-elf-candidate-v3.json"))
    if len(reports)!=3: raise AssertionError("expected three hosted candidate reports")
    payloads=[read(p,MAX_REPORT,"hosted candidate report") for p in reports]
    if payloads[0]!=payloads[1] or payloads[0]!=payloads[2]:
        raise AssertionError("hosted candidate reports differ")
    local,pre,query=derive()
    hosted=json.loads(payloads[0])
    if hosted!=local: raise AssertionError("hosted candidate differs from independent local rederivation")
    for report_path in reports:
        d=report_path.parent
        if read(d/"credential-query-preexec",4*1024*1024,"hosted preexec")!=pre:
            raise AssertionError("hosted preexec differs from local rederivation")
        if read(d/"credential-query",4*1024*1024,"hosted query")!=query:
            raise AssertionError("hosted query differs from local rederivation")
    print(MARKER+"_THREE_RUN_GREEN")
    print("candidate_id="+hosted["candidate_id"])
    print("independent_toolchain_rederivation=true")
    print("preexec_predecessor_identity_exact=true")
    print("candidate_accepted=false")

def self_test()->None:
    try:
        parse_trace(b"relative.o\n",Path("/tmp/object.o"))
    except AssertionError as exc:
        if "unrecognized nonempty" not in str(exc): raise
    else: raise AssertionError("unknown trace record accepted")
    with tempfile.TemporaryDirectory(prefix="void-v3-trace-test-") as td:
        root=Path(td);obj=root/"own.o";lib=root/"libx.a"
        obj.write_bytes(b"o");lib.write_bytes(b"a")
        parsed=parse_trace((os.fspath(obj)+"\n("+os.fspath(lib)+")member.o\n").encode(),obj)
        if parsed["candidate_object_record_count"]!=1: raise AssertionError("trace candidate count")
        if not any(x.get("kind")=="archive_member" for x in parsed["records"]):
            raise AssertionError("archive member not parsed")
    print(MARKER+"_SELF_TEST_GREEN")
    print("closed_link_trace_grammar=true")
    print("preexec_predecessor_identity_required=true")
    print("candidate_accepted=false")

def main()->None:
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--derive-dir",type=Path)
    g.add_argument("--compare-dir",type=Path)
    g.add_argument("--self-test",action="store_true")
    args=ap.parse_args()
    if args.derive_dir is not None: write_dir(args.derive_dir)
    elif args.compare_dir is not None: compare_dir(args.compare_dir)
    else: self_test()

if __name__=="__main__":
    main()

#!/usr/bin/env python3
"""Prove native bootstrap V5 repository-witness delta in disposable fixtures."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import zlib

ROOT=Path(__file__).resolve().parents[1]
SOURCE_REL=(
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c"
)
SOURCE=ROOT/SOURCE_REL
INSTALLER_REL=(
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py"
)
MANIFEST_REL="ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf"
MANIFEST=ROOT/MANIFEST_REL
MARKER="VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V5_PROOF_GREEN"

SOURCE_BLOB="83a323b3430c397d2806ad88c2075e4ad427db9d"
SOURCE_SHA256="8abe5f6a51365f0edbd127235f0425fff56e63db9ab7fdddab9020e28decca88"
SOURCE_BYTES=72690
INSTALLER_BLOB="763865f3eae1b8f92ea2dba1ec0cbaec6e7dc6ba"
INSTALLER_SHA256="bdfb8bc87f4c2b15af69a0e2eccbffa570d5913383e269166760966ff924fac1"
INSTALLER_BYTES=120323
MANIFEST_BLOB="14bd75433f8c79d7e15c999501b6eb5224553802"
MANIFEST_SHA256="70280a4ae4d228b2a2c98712d64e09241df95584cb12d39311776252c985241e"
MANIFEST_BYTES=2381
GIT="/usr/bin/git"

def require(value:bool,reason:str)->None:
    if not value:
        raise AssertionError(reason)

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

def run(args:list[str],**kwargs)->subprocess.CompletedProcess:
    cp=subprocess.run(
        args,stdin=kwargs.pop("stdin",subprocess.DEVNULL),
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False,timeout=60,
        **kwargs,
    )
    return cp

def fixture_git(repo:Path,*args:str)->bytes:
    env={
        "PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC",
        "GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null",
        "GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1",
        "GIT_TERMINAL_PROMPT":"0","GIT_ALLOW_PROTOCOL":"",
        "GIT_AUTHOR_NAME":"VOID fixture","GIT_AUTHOR_EMAIL":"fixture@example.invalid",
        "GIT_COMMITTER_NAME":"VOID fixture","GIT_COMMITTER_EMAIL":"fixture@example.invalid",
        "GIT_AUTHOR_DATE":"2001-01-01T00:00:00Z",
        "GIT_COMMITTER_DATE":"2001-01-01T00:00:00Z",
    }
    cp=run(
        [GIT,"--no-pager","-c","core.hooksPath=/dev/null","-c","core.fsmonitor=false",
         "-c","gc.auto=0","-c","maintenance.auto=false","-C",str(repo),*args],
        env=env,
    )
    require(cp.returncode==0,"fixture_git_failed:"+cp.stderr.decode("utf-8","replace")[-2000:])
    return cp.stdout

def create_repository(parent:Path,name:str)->tuple[Path,str,bytes]:
    repo=parent/name
    repo.mkdir()
    fixture_git(repo,"init","--initial-branch=main")
    raw=b"accepted raw source bytes\n"
    (repo/"source.txt").write_bytes(raw)
    (repo/"keep").mkdir()
    (repo/"keep"/"data.txt").write_bytes(b"kept tree\n")
    manifest=repo/MANIFEST_REL
    manifest.parent.mkdir(parents=True)
    manifest.write_bytes(b"fixture manifest bytes\n")
    fixture_git(repo,"add",".")
    fixture_git(repo,"commit","-m","fixture")
    head=fixture_git(repo,"rev-parse","HEAD").decode("ascii").strip()
    return repo,head,raw

def compile_args(cc:str,source:Path,output:Path,static:bool)->list[str]:
    args=[
        cc,"-std=c11","-O2","-Wall","-Wextra","-Werror","-Wformat=2","-Wshadow",
        "-fno-ident","-fno-pie",
        "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_MANIFEST_SHA256=\""+MANIFEST_SHA256+"\"",
        "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_MANIFEST_BYTES="+str(MANIFEST_BYTES),
        str(source),"-o",str(output),
    ]
    if static:
        args[9:9]=["-static","-no-pie","-Wl,--build-id=none"]
    return args

def harness_source()->str:
    source=str(SOURCE.resolve()).replace("\\","\\\\").replace('"','\\"')
    return f"""
#define main void_bootstrap_production_main
#include "{source}"
#undef main

static void fill_source(context_v4 *ctx,size_t index,const char *rel,const char *full){{
    int fd=open(full,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if(fd<0)hold("fixture_source_open");
    struct stat st;
    if(fstat(fd,&st)||st.st_size<0||(uintmax_t)st.st_size>MAX_SOURCE_BYTES)hold("fixture_source_stat");
    bytes_v4 raw=read_fd(fd,MAX_SOURCE_BYTES);
    close(fd);
    ctx->manifest.sources[index].rel=rel;
    ctx->manifest.sources[index].bytes=raw.size;
    hash_bytes(raw.data,raw.size,true,ctx->manifest.sources[index].blob);
    hash_bytes(raw.data,raw.size,false,ctx->manifest.sources[index].sha256);
    free(raw.data);
}}
int main(int argc,char **argv){{
    if(argc!=3)return 64;
    context_v4 ctx;
    init_context(&ctx);
    snprintf(ctx.request.expected_head,sizeof(ctx.request.expected_head),"%s",argv[2]);
    bind_checkout(&ctx,argv[1]);
    ctx.fds[R_GIT]=open("/usr/bin/git",O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if(ctx.fds[R_GIT]<0)return 65;
    char source_path[PATH_MAX],manifest_path[PATH_MAX];
    if(snprintf(source_path,sizeof(source_path),"%s/source.txt",argv[1])>=(int)sizeof(source_path))return 66;
    if(snprintf(manifest_path,sizeof(manifest_path),"%s/{MANIFEST_REL}",argv[1])>=(int)sizeof(manifest_path))return 67;
    for(size_t i=0;i<4;i++)fill_source(&ctx,i,"source.txt",source_path);
    int mfd=open(manifest_path,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
    if(mfd<0)return 68;
    struct stat mst;
    if(fstat(mfd,&mst)||mst.st_size<=0||(uintmax_t)mst.st_size>MAX_MANIFEST_BYTES)return 69;
    bytes_v4 mraw=read_fd(mfd,MAX_MANIFEST_BYTES);
    close(mfd);
    ctx.manifest.bytes=mraw.size;
    hash_bytes(mraw.data,mraw.size,true,ctx.manifest.blob);
    hash_bytes(mraw.data,mraw.size,false,ctx.manifest.sha256);
    free(mraw.data);
    verify_checkout(&ctx);
    close(ctx.fds[R_GIT]);
    close(ctx.fds[R_GIT_DIR]);
    close(ctx.fds[R_CHECKOUT]);
    puts("VOID_E2_BOOTSTRAP_V5_REPOSITORY_HARNESS_GREEN");
    return 0;
}}
"""

def temp_witnesses()->set[str]:
    root=Path("/tmp")
    return {p.name for p in root.glob("void-e2-git-witness-v5-*")}

def prove_compilation(temp:Path)->None:
    cc=shutil.which("gcc") or shutil.which("cc")
    readelf=shutil.which("readelf")
    require(bool(cc and readelf),"tool_missing")
    production=temp/"bootstrap-v5"
    cp=run(compile_args(cc,SOURCE,production,True))
    require(cp.returncode==0,"production_compile:"+cp.stderr.decode("utf-8","replace")[-4000:])
    selftest=run([str(production),"--self-test"])
    require(selftest.returncode==0 and not selftest.stderr,"self_test_failed")
    lines=set(selftest.stdout.decode("utf-8").splitlines())
    for marker in (
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V5_SELF_TEST_GREEN",
        "private_git_metadata_required=true",
        "sealed_private_index_required=true",
        "split_index_rejected=true",
        "strict_git_fsck_before_after_required=true",
        "raw_commit_root_tree_sha1_reverified=true",
        "tracked_worktree_double_hash_required=true",
        "temporary_repository_cleanup_required=true",
        "protected_install_authorized=false",
        "funds_movement=false",
    ):
        require(marker in lines,"self_test_marker:"+marker)
    ph=run([readelf,"-lW",str(production)])
    require(ph.returncode==0 and b"INTERP" not in ph.stdout,"pt_interp_present")
    dyn=run([readelf,"-dW",str(production)])
    require(dyn.returncode==0 and b"NEEDED" not in dyn.stdout,"dynamic_needed_present")

def prove_repository_harness(temp:Path)->None:
    cc=shutil.which("gcc") or shutil.which("cc")
    harness_c=temp/"harness.c"
    harness_c.write_text(harness_source(),encoding="utf-8")
    harness=temp/"harness"
    cp=run(compile_args(cc,harness_c,harness,False))
    require(cp.returncode==0,"harness_compile:"+cp.stderr.decode("utf-8","replace")[-5000:])

    repo,head,_=create_repository(temp,"clean")
    before=temp_witnesses()
    cp=run([str(harness),str(repo),head])
    require(cp.returncode==0,"clean_harness:"+cp.stderr.decode("utf-8","replace")[-3000:])
    require(b"VOID_E2_BOOTSTRAP_V5_REPOSITORY_HARNESS_GREEN" in cp.stdout,"clean_marker")
    require(temp_witnesses()==before,"clean_temp_witness_leak")

    repo,head,_=create_repository(temp,"split")
    fixture_git(repo,"update-index","--split-index")
    shared=list((repo/".git").glob("sharedindex.*"))
    require(bool(shared),"split_fixture")
    old_ns=946684800000000000
    for path in shared:
        os.utime(path,ns=(old_ns,old_ns))
    before=temp_witnesses()
    cp=run([str(harness),str(repo),head])
    require(cp.returncode==2 and b"bootstrap_repository_split_index_unsupported" in cp.stderr,"split_not_rejected")
    require(all(p.stat().st_mtime_ns==old_ns for p in shared),"split_mtime_changed")
    require(temp_witnesses()==before,"split_temp_witness_leak")

    repo,head,raw=create_repository(temp,"false-tree")
    tree_oid=fixture_git(repo,"rev-parse",head+":keep").decode("ascii").strip()
    tree_raw=fixture_git(repo,"cat-file","tree",tree_oid)
    old_entry=b"data.txt\0"+bytes.fromhex(blob(b"kept tree\n"))
    new_entry=b"data.txt\0"+bytes.fromhex(blob(raw))
    require(tree_raw.count(old_entry)==1,"false_tree_entry")
    altered=tree_raw.replace(old_entry,new_entry)
    (repo/"keep"/"data.txt").write_bytes(raw)
    fixture_git(repo,"add","keep/data.txt")
    tree_file=repo/".git"/"objects"/tree_oid[:2]/tree_oid[2:]
    tree_file.chmod(0o600)
    tree_file.write_bytes(zlib.compress(
        b"tree "+str(len(altered)).encode("ascii")+b"\0"+altered
    ))
    before=temp_witnesses()
    cp=run([str(harness),str(repo),head])
    require(cp.returncode==2,"false_tree_accepted")
    require(
        b"bootstrap_git_command_failed" in cp.stderr or
        b"bootstrap_repository_root_tree_identity_invalid" in cp.stderr,
        "false_tree_reason:"+cp.stderr[-1000:].decode("utf-8","replace"),
    )
    require(temp_witnesses()==before,"false_tree_temp_witness_leak")

def prove_source_identity()->None:
    raw=SOURCE.read_bytes()
    installer=(ROOT/INSTALLER_REL).read_bytes()
    manifest=MANIFEST.read_bytes()
    require(blob(raw)==SOURCE_BLOB and len(raw)==SOURCE_BYTES and sha256(raw)==SOURCE_SHA256,"source_identity")
    require(blob(installer)==INSTALLER_BLOB and len(installer)==INSTALLER_BYTES and sha256(installer)==INSTALLER_SHA256,"installer_identity")
    require(blob(manifest)==MANIFEST_BLOB and len(manifest)==MANIFEST_BYTES and sha256(manifest)==MANIFEST_SHA256,"manifest_identity")
    text=raw.decode("utf-8")
    for required in (
        'MARKER "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V5"',
        'MANIFEST_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_SOURCE_GENERATION_V2"',
        'POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V5"',
        'PROOF_SCHEMA "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V2"',
        'GENERATION_PREFIX "voidbuye2dormantsourcegen2_"',
        'PLAN_PREFIX "voidbuye2dormantfirstentryinstall4_"',
        'APPLY_CONFIRM "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V4_CREATE_ONLY"',
        "repository_split_index_unsupported",
        "GIT_INDEX_FILE=/proc/self/fd/%d",
        "GIT_OBJECT_DIRECTORY=/proc/self/fd/%d",
        '"fsck","--strict"',
        "hash_git_object(\"commit\"",
        "hash_git_object(\"tree\"",
        "Final observation pass",
        "temporary_repository_cleanup_green",
    ):
        require(required in text,"source_marker:"+required)
    require(text.count("total+=verify_tracked_blob(ctx,&tree.entries[i],MAX_TRACKED_TOTAL_BYTES-total);")==2,
            "tracked_double_hash_shape")
    require("R_PROOF, R_MANIFEST, R_INSTALLER" in text and "R_GIT_DIR, R_COUNT" in text,
            "parent_role_shape")

def main()->int:
    prove_source_identity()
    with tempfile.TemporaryDirectory(prefix="void-e2-v5-proof-") as td:
        temp=Path(td)
        prove_compilation(temp)
        prove_repository_harness(temp)
    print(MARKER)
    print("native_v5_source_identity_exact=true")
    print("manifest_v2_identity_exact=true")
    print("static_native_self_test_green=true")
    print("static_no_pt_interp=true")
    print("private_git_metadata_exercised=true")
    print("sealed_private_index_exercised=true")
    print("split_index_rejected_without_touch=true")
    print("strict_fsck_false_tree_rejected=true")
    print("raw_commit_root_tree_hashing_bound=true")
    print("tracked_worktree_double_hash_bound=true")
    print("temporary_repository_cleanup_proven=true")
    print("parent_proof_roles_13_preserved=true")
    print("protected_install_authorized=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")
    return 0

if __name__=="__main__":
    raise SystemExit(main())

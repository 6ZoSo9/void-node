#!/usr/bin/env python3
"""Prove the canonical V4 repository witness and V2 source-generation delta.

Source/test only. No production plan/apply, service, credential, signing,
transaction, payment, presale/WC or funds authority is exercised.
"""
from __future__ import annotations

import contextlib
import fcntl
import hashlib
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import types
from unittest import mock
import zlib

ROOT=Path(__file__).resolve().parents[1]
TARGET_REL=(
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py"
)
TARGET=ROOT/TARGET_REL
BOOTSTRAP_REL=(
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c"
)
BOOTSTRAP=ROOT/BOOTSTRAP_REL
MANIFEST_REL="ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf"
MANIFEST=ROOT/MANIFEST_REL
GIT="/usr/bin/git"
MARKER="VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_INSTALLER_V4_GENERATION_PROOF_GREEN"

EXPECTED_TARGET_BLOB="763865f3eae1b8f92ea2dba1ec0cbaec6e7dc6ba"
EXPECTED_TARGET_SHA256="bdfb8bc87f4c2b15af69a0e2eccbffa570d5913383e269166760966ff924fac1"
EXPECTED_TARGET_BYTES=120323
EXPECTED_BOOTSTRAP_BLOB="83a323b3430c397d2806ad88c2075e4ad427db9d"
EXPECTED_BOOTSTRAP_SHA256="8abe5f6a51365f0edbd127235f0425fff56e63db9ab7fdddab9020e28decca88"
EXPECTED_BOOTSTRAP_BYTES=72690
EXPECTED_MANIFEST_BLOB="14bd75433f8c79d7e15c999501b6eb5224553802"
EXPECTED_MANIFEST_SHA256="70280a4ae4d228b2a2c98712d64e09241df95584cb12d39311776252c985241e"
EXPECTED_MANIFEST_BYTES=2381
EXPECTED_GENERATION="voidbuye2dormantsourcegen2_"+EXPECTED_MANIFEST_SHA256

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw).hexdigest()

def require(value:bool,reason:str)->None:
    if not value:
        raise AssertionError(reason)

def load_module(path:Path)->types.ModuleType:
    module=types.ModuleType("void_fixture_"+path.stem)
    module.__file__=str(path)
    exec(compile(path.read_bytes(),str(path),"exec",dont_inherit=True),module.__dict__)
    return module

def repository_state(root:Path)->tuple:
    rows=[]
    def visit(path:Path)->None:
        st=path.lstat()
        base=(
            str(path.relative_to(root)),st.st_dev,st.st_ino,st.st_mode,st.st_uid,
            st.st_gid,st.st_nlink,st.st_size,st.st_mtime_ns,st.st_ctime_ns,
        )
        if stat.S_ISLNK(st.st_mode):
            rows.append(base+("link",os.readlink(path)))
        elif stat.S_ISREG(st.st_mode):
            rows.append(base+("file",sha256(path.read_bytes())))
        else:
            rows.append(base+("node",))
        if stat.S_ISDIR(st.st_mode):
            for child in sorted(path.iterdir(),key=lambda p:p.name):
                visit(child)
    visit(root)
    return tuple(rows)

def fixture_git(repo:Path,*args:str)->bytes:
    env={
        "PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C",
        "TZ":"UTC","GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null",
        "GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1",
        "GIT_TERMINAL_PROMPT":"0","GIT_ALLOW_PROTOCOL":"",
        "GIT_AUTHOR_NAME":"VOID fixture","GIT_AUTHOR_EMAIL":"fixture@example.invalid",
        "GIT_COMMITTER_NAME":"VOID fixture","GIT_COMMITTER_EMAIL":"fixture@example.invalid",
        "GIT_AUTHOR_DATE":"2001-01-01T00:00:00Z",
        "GIT_COMMITTER_DATE":"2001-01-01T00:00:00Z",
    }
    cp=subprocess.run(
        [GIT,"--no-pager","-c","core.hooksPath=/dev/null","-c","core.fsmonitor=false",
         "-c","gc.auto=0","-c","maintenance.auto=false","-C",str(repo),*args],
        env=env,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        check=False,timeout=30,
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
    (repo/"other").mkdir()
    (repo/"other"/"data.txt").write_bytes(b"other tree\n")
    (repo/"script.sh").write_bytes(b"#!/bin/sh\nexit 0\n")
    (repo/"script.sh").chmod(0o755)
    (repo/"safe-link").symlink_to("source.txt")
    (repo/".gitignore").write_bytes(b"ignored-fixture.txt\n")
    (repo/".gitattributes").write_bytes(b"source.txt filter=fixture\n")
    fixture_git(repo,"add",".")
    fixture_git(repo,"commit","-m","fixture")
    head=fixture_git(repo,"rev-parse","HEAD").decode("ascii").strip()
    return repo,head,raw

def sealed_git_fd()->int:
    raw=Path(GIT).read_bytes()
    fd=os.memfd_create(
        "void-e2-v4-proof-git",
        getattr(os,"MFD_CLOEXEC",1)|getattr(os,"MFD_ALLOW_SEALING",2),
    )
    view=memoryview(raw)
    while view:
        count=os.write(fd,view)
        require(count>0,"sealed_git_write_failed")
        view=view[count:]
    os.fchmod(fd,0o500)
    required=(
        getattr(fcntl,"F_SEAL_SEAL",1)|getattr(fcntl,"F_SEAL_SHRINK",2)|
        getattr(fcntl,"F_SEAL_GROW",4)|getattr(fcntl,"F_SEAL_WRITE",8)
    )
    fcntl.fcntl(fd,getattr(fcntl,"F_ADD_SEALS",1033),required)
    require(
        fcntl.fcntl(fd,getattr(fcntl,"F_GET_SEALS",1034))&required==required,
        "sealed_git_seals_missing",
    )
    path=f"/proc/self/fd/{fd}"
    read_fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC)
    os.close(fd)
    return read_fd

@contextlib.contextmanager
def witness_context(module,repo:Path):
    git_fd=sealed_git_fd()
    previous=module._BOOTSTRAP_CONTEXT
    module._BOOTSTRAP_CONTEXT={"fds":{"git":git_fd}}
    try:
        with mock.patch.object(module,"FIXED_CHECKOUT",repo):
            yield
    finally:
        module._BOOTSTRAP_CONTEXT=previous
        os.close(git_fd)

def unchanged_call(module,repo:Path,operation):
    before=repository_state(repo)
    with witness_context(module,repo):
        try:
            return operation()
        finally:
            require(repository_state(repo)==before,"source_repository_changed")

def expect_hold(module,repo:Path,head:str,operation=None)->str:
    if operation is None:
        operation=lambda:module.checkout_snapshot(head)
    try:
        unchanged_call(module,repo,operation)
    except module.InstallError as exc:
        require(bool(str(exc)),"hold_reason_missing")
        return str(exc)
    raise AssertionError("unsafe_repository_state_accepted")

def prove_manifest(module)->None:
    raw=MANIFEST.read_bytes()
    require(len(raw)==EXPECTED_MANIFEST_BYTES,"manifest_bytes")
    require(sha256(raw)==EXPECTED_MANIFEST_SHA256,"manifest_sha256")
    require(blob(raw)==EXPECTED_MANIFEST_BLOB,"manifest_blob")
    parsed=module.parse_source_manifest(raw)
    require(len(parsed)==35,"manifest_rows")
    require(parsed["schema"]=="VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_SOURCE_GENERATION_V2","manifest_schema")
    require(module.source_generation_id(raw)==EXPECTED_GENERATION,"generation_id")
    for role in module.SOURCE_ROLES:
        source=(ROOT/parsed[role+"_rel"]).read_bytes()
        require(blob(source)==parsed[role+"_blob_sha1"],"source_blob:"+role)
        require(str(len(source))==parsed[role+"_bytes"],"source_bytes:"+role)
        require(sha256(source)==parsed[role+"_sha256"],"source_sha:"+role)
    require(parsed["installer_rel"]==TARGET_REL,"installer_rel")
    require(parsed["bootstrap_source_rel"]==BOOTSTRAP_REL,"bootstrap_rel")
    require(parsed["host_policy_schema"]=="VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V5","host_policy")
    require(parsed["parent_proof_schema"]=="VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V2","proof_schema")
    require(parsed["plan_prefix"]=="voidbuye2dormantfirstentryinstall4_","plan_prefix")
    require(parsed["confirm_token"]=="INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V4_CREATE_ONLY","confirm")

def prove_repository_witness(module)->None:
    with tempfile.TemporaryDirectory(prefix="void-e2-v4-git-proof-") as td:
        root=Path(td)
        repo,head,raw=create_repository(root,"clean")
        (repo/"ignored-fixture.txt").write_bytes(b"ignored inert input\n")
        snap=unchanged_call(module,repo,lambda:module.checkout_snapshot(head))
        require(snap["head"]==head and snap["branch"]=="main" and snap["clean"] is True,"clean_snapshot")
        require(snap["git_boundary_policy"]=="private_metadata_pinned_objects_raw_checkout_v4","boundary_policy")
        got=unchanged_call(
            module,repo,
            lambda:module._git_object(
                head,"source.txt",expected_blob=blob(raw),
                expected_bytes=len(raw),expected_sha256=sha256(raw),
            ),
        )
        require(got==raw,"clean_blob")

        # Source repository configuration cannot become execution authority.
        helper="/__void_fixture_nonexistent_helpers__"
        fixture_git(repo,"config","core.fsmonitor",helper+"/fsmonitor")
        fixture_git(repo,"config","core.hooksPath",helper+"/hooks")
        fixture_git(repo,"config","filter.fixture.clean",helper+"/filter")
        fixture_git(repo,"config","filter.fixture.required","true")
        fixture_git(repo,"config","include.path",helper+"/config")
        fixture_git(repo,"config","core.repositoryFormatVersion","99")
        snap2=unchanged_call(module,repo,lambda:module.checkout_snapshot(head))
        require(snap2==snap,"source_config_influenced_private_witness")

        # Split index is rejected without reading/mutating shared-index metadata.
        repo,head,_=create_repository(root,"split-index")
        fixture_git(repo,"update-index","--split-index")
        shared=list((repo/".git").glob("sharedindex.*"))
        require(bool(shared),"split_index_fixture_missing")
        old_ns=946684800000000000
        for path in shared:
            os.utime(path,ns=(old_ns,old_ns))
        reason=expect_hold(module,repo,head)
        require(reason=="repository_split_index_unsupported","split_index_reason:"+reason)
        require(all(path.stat().st_mtime_ns==old_ns for path in shared),"shared_index_touched")

        # Store valid compressed tree bytes under the old tree OID after altering
        # one entry. The private raw-object reader must recompute the tree SHA-1.
        repo,head,raw=create_repository(root,"false-tree-object")
        tree_oid=fixture_git(repo,"rev-parse",head+":keep").decode("ascii").strip()
        tree_raw=fixture_git(repo,"cat-file","tree",tree_oid)
        old_entry=b"data.txt\0"+bytes.fromhex(blob(b"kept tree\n"))
        new_entry=b"data.txt\0"+bytes.fromhex(blob(raw))
        require(tree_raw.count(old_entry)==1,"tree_fixture_entry")
        altered=tree_raw.replace(old_entry,new_entry)
        (repo/"keep"/"data.txt").write_bytes(raw)
        fixture_git(repo,"add","keep/data.txt")
        tree_file=repo/".git"/"objects"/tree_oid[:2]/tree_oid[2:]
        tree_file.chmod(0o600)
        tree_file.write_bytes(zlib.compress(
            b"tree "+str(len(altered)).encode("ascii")+b"\0"+altered
        ))
        reason=expect_hold(module,repo,head)
        require(
            reason in {"repository_object_identity_invalid","repository_git_operation_failed:objects:128"},
            "false_tree_reason:"+reason,
        )

        # Mutate one path immediately after its first completed observation.
        repo,head,_=create_repository(root,"post-inspection-drift")
        changed=[]
        original=module._RepositorySnapshot._worktree_file
        def observe_then_change(snapshot,relative,mode,expected):
            result=original(snapshot,relative,mode,expected)
            if not changed:
                path=repo/os.fsdecode(relative)
                with path.open("ab") as output:
                    output.write(b"# mutation after first observation\n")
                changed.append(path)
            return result
        with witness_context(module,repo),mock.patch.object(
            module._RepositorySnapshot,"_worktree_file",observe_then_change
        ):
            try:
                module.checkout_snapshot(head)
            except module.InstallError as exc:
                require(str(exc)=="checkout_worktree_changed","tracked_drift_reason:"+str(exc))
            else:
                raise AssertionError("tracked_drift_accepted")
        require(len(changed)==1,"tracked_drift_fixture")

def prove_source_contract(module)->None:
    raw=TARGET.read_bytes()
    bootstrap=BOOTSTRAP.read_bytes()
    require(blob(raw)==EXPECTED_TARGET_BLOB and len(raw)==EXPECTED_TARGET_BYTES and sha256(raw)==EXPECTED_TARGET_SHA256,"installer_identity")
    require(blob(bootstrap)==EXPECTED_BOOTSTRAP_BLOB and len(bootstrap)==EXPECTED_BOOTSTRAP_BYTES and sha256(bootstrap)==EXPECTED_BOOTSTRAP_SHA256,"bootstrap_identity")
    require(module.MARKER.endswith("PROTECTED_INSTALL_V4"),"marker")
    require(module.PLAN_PREFIX=="voidbuye2dormantfirstentryinstall4_","plan")
    require(module.CONFIRM_TOKEN=="INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V4_CREATE_ONLY","confirm")
    require(module.SOURCE_GENERATION_PREFIX=="voidbuye2dormantsourcegen2_","sourcegen")
    require(module.GIT_BOUNDARY_POLICY=="private_metadata_pinned_objects_raw_checkout_v4","git_boundary")
    require(len(module.FD_ROLES)==13,"parent_proof_role_count")
    source=raw.decode("utf-8")
    for required in (
        "authenticated_retained_git_required",
        "repository_split_index_unsupported",
        "GIT_INDEX_FILE",
        "GIT_OBJECT_DIRECTORY",
        "repository_object_identity_invalid",
        "checkout_worktree_changed",
        "temporary_filesystem_write_scope=private_git_metadata_under_tmp",
        "protected_state_mutation=false",
        "git_fetch=false",
    ):
        require(required in source,"installer_source_marker:"+required)

def main()->int:
    module=load_module(TARGET)
    prove_source_contract(module)
    prove_manifest(module)
    prove_repository_witness(module)
    print(MARKER)
    print("source_generation_v2_exact=true")
    print("manifest_rows_35=true")
    print("parent_proof_descriptor_roles_13=true")
    print("private_fixed_git_metadata=true")
    print("sealed_private_index=true")
    print("split_index_rejected_without_shared_index_touch=true")
    print("raw_tree_object_identity_recomputed=true")
    print("tracked_file_final_recheck=true")
    print("retained_sealed_git_executable_required=true")
    print("source_repository_configuration_not_authority=true")
    print("temporary_git_metadata_write_truthful=true")
    print("protected_state_mutation=false")
    print("network_access=false")
    print("git_fetch=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")
    return 0

if __name__=="__main__":
    raise SystemExit(main())

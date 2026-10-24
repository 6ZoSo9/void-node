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
from typing import Any

MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3"
SCHEMA="void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3"
VERSION=1
PLAN_PREFIX="voidbuye2runnerpolupgradeplan6r3_"

FIXED_CHECKOUT=Path("/home/zoso/dev/void-node")
FIXED_GIT=Path("/usr/bin/git")
FIXED_NODE=Path("/usr/bin/node")

LOCK_REL="ops/security/buy-void-epoch2-live-composition-runner-policy-candidate-lock-v6r3.json"
LOCK_BLOB="d28ebbd3fe1d89a1940b039af64e10a6cb96065e"
LOCK_ID="voidbuye2runnerpollock6r3_0633e059bfdfb1209b80b090adacddae61795ca610a6bf7f79059cc997148f52"
CANDIDATE_ID="voidbuye2runnerpolcand6r3_0a3bfc00032b0feeb253fb0f295b4dacc1e3e66af35013676351ed11e3c119e1"

RUNNER_REL="ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
RUNNER_BLOB="2fa028824d71a22f4d228cdb7fcda738bce7b409"
NEW_RUNNER_SHA256="9b8497c813fc3899b745736da01929380b5f28f988f70790def1e0a98b35a261"
NEW_RUNNER_BYTES=84_928

QUALIFIER_REL="ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py"
QUALIFIER_BLOB="74c69fe8a95ed5f361a39971618f43f7c768c865"
QUALIFIER_REPLACEMENT_REL="ops/precision/void_buy_void_user_manager_credential_query_protected_replace_v3r.py"
QUALIFIER_REPLACEMENT_BLOB="98f8b9fda89e33c50e19008268d97655aad54e6d"
V6_QUALIFIER_REL="ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py"
V6_QUALIFIER_BLOB="83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc"
V6_REPLACEMENT_REL="ops/precision/void_buy_void_user_manager_query_protected_replace_v6.py"
V6_REPLACEMENT_BLOB="f81d9fbead60593258d17dbb8720e1efc867b20f"
CREDENTIAL_LOCK_V3R_REL="ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json"
CREDENTIAL_LOCK_V3R_BLOB="c4870f3178aebc9a0bb6557562f663b8480cfefa"
CREDENTIAL_LOCK_V2_REL="ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json"
CREDENTIAL_LOCK_V2_BLOB="b73415ce8fc95ff2d49cbde97a15d701ad5b7937"
V6_LOCK_REL="ops/security/buy-void-user-manager-query-elf-lock-v6.json"
V6_LOCK_BLOB="772945b639d138284fc18cc312f7b9115b10c748"
V4_PARSER_REL="tools/void-buy-allocation-custody-host-evidence-v4.mjs"
V4_PARSER_BLOB="223a8acf32f8c7961d61222b83c0db17075f86c6"
SEALED_REL="scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs"
SEALED_BLOB="14cbe81e27d04fee77cbe75225ce308bf8561a7b"

SOURCE_RUNTIME_DEPENDENCY_SPECS=(
    ("qualifier",QUALIFIER_REL,QUALIFIER_BLOB),
    ("replacement_v3r",QUALIFIER_REPLACEMENT_REL,QUALIFIER_REPLACEMENT_BLOB),
    ("qualifier_v6",V6_QUALIFIER_REL,V6_QUALIFIER_BLOB),
    ("replacement_v6",V6_REPLACEMENT_REL,V6_REPLACEMENT_BLOB),
    ("lock_v3r",CREDENTIAL_LOCK_V3R_REL,CREDENTIAL_LOCK_V3R_BLOB),
    ("lock_v2",CREDENTIAL_LOCK_V2_REL,CREDENTIAL_LOCK_V2_BLOB),
    ("lock_v6",V6_LOCK_REL,V6_LOCK_BLOB),
    ("parser_v4",V4_PARSER_REL,V4_PARSER_BLOB),
    ("sealed_v2",SEALED_REL,SEALED_BLOB),
)

RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
RUNTIME_TREE="de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
POLICY_SCHEMA="VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3"

INSTALL_PARENT=Path("/opt")
INSTALL_ROOT=INSTALL_PARENT/"void-buy-void-epoch2-live-composition-v3"
STAGE_ROOT=INSTALL_PARENT/".void-buy-void-epoch2-live-composition-v3.upgrade-v6r3.stage"
PREDECESSOR_V4_ROOT=INSTALL_PARENT/".void-buy-void-epoch2-live-composition-v3.predecessor-v4"
PREDECESSOR_V6R2_ROOT=INSTALL_PARENT/".void-buy-void-epoch2-live-composition-v3.predecessor-v6r2"

NATIVE_NAME="void_buy_void_epoch2_live_composition_native_preentry_v3"
RUNNER_NAME="void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
POLICY_NAME="policy-v3.conf"

NATIVE_SHA256="85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
NATIVE_BYTES=726_976
OLD_RUNNER_SHA256="7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94"
OLD_RUNNER_BYTES=45_147

V4_NATIVE_SHA256="09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4"
V4_NATIVE_BYTES=722_880
V4_RUNNER_SHA256="f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889"
V4_RUNNER_BYTES=40_616
V4_POLICY_SHA256="d410bd2ec83daca5f7ba6e45e03afda0606b2bf6ea62cbabb9a700caa141adcc"
V4_POLICY_BYTES=305

READY_STATE="EPOCH2_V6R3_RUNNER_POLICY_UPGRADE_READY"
GREEN_STATE="EPOCH2_V6R3_RUNNER_POLICY_ROOT_GREEN_WITH_V6R2_PREDECESSOR"

HEX40=re.compile(r"^[0-9a-f]{40}$")
MAX_GIT_OUTPUT=16*1024*1024
MAX_FILE_BYTES=512*1024*1024
RUNTIME_UID=1000
RUNTIME_GID=1000


class PlanError(RuntimeError):
    pass


# The host plan is restricted to the identity whose write access is audited.
# Access checks are effective-credential / ACL-aware rather than mode-bit only.
STAT_FIELDS=("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink",
             "st_size","st_mtime_ns","st_ctime_ns")

def _identity(st:os.stat_result)->tuple[int,...]:
    return tuple(getattr(st,field) for field in STAT_FIELDS)

def require_plan_identity()->None:
    if (
        os.getuid()!=RUNTIME_UID or os.geteuid()!=RUNTIME_UID
        or os.getgid()!=RUNTIME_GID or os.getegid()!=RUNTIME_GID
    ):
        raise PlanError("exact_runtime_identity_required_for_host_plan")

def _directory_chain(path:Path)->list[tuple[Path,tuple[int,...]]]:
    # Never resolve through an unauthenticated directory or symlink.
    if not path.is_absolute() or Path(os.path.abspath(os.fspath(path)))!=path:
        raise PlanError("noncanonical_protected_path")
    records=[]
    for ancestor in reversed((path,*path.parents)):
        try:
            st=ancestor.lstat()
        except OSError as exc:
            raise PlanError("protected_ancestor_unavailable:"+str(ancestor)) from exc
        if (
            not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode)
            or st.st_uid!=0 or st.st_gid!=0
            or stat.S_IMODE(st.st_mode)&0o022
            or os.access(ancestor,os.W_OK,effective_ids=True)
        ):
            raise PlanError("protected_ancestor_custody_invalid:"+str(ancestor))
        records.append((ancestor,_identity(st)))
    return records

def _revalidate_chain(records:list[tuple[Path,tuple[int,...]]])->None:
    for ancestor,expected in records:
        try:
            st=ancestor.lstat()
        except OSError as exc:
            raise PlanError("protected_ancestor_disappeared:"+str(ancestor)) from exc
        if (
            _identity(st)!=expected
            or not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode)
            or os.access(ancestor,os.W_OK,effective_ids=True)
        ):
            raise PlanError("protected_ancestor_generation_changed:"+str(ancestor))

def _trusted_file_before(path:Path,*,executable:bool)->os.stat_result:
    try:
        st=path.lstat()
    except OSError as exc:
        raise PlanError("trusted_file_unavailable:"+str(path)) from exc
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode)
        or st.st_uid!=0 or st.st_gid!=0 or st.st_nlink!=1
        or not 0<st.st_size<=MAX_FILE_BYTES
        or stat.S_IMODE(st.st_mode)&0o022
        or (executable and not stat.S_IMODE(st.st_mode)&0o111)
        or os.access(path,os.W_OK,effective_ids=True)
    ):
        raise PlanError("trusted_file_custody_invalid:"+str(path))
    return st

def _revalidate_trusted_file(path:Path,expected:tuple[int,...],*,executable:bool)->None:
    st=_trusted_file_before(path,executable=executable)
    if _identity(st)!=expected:
        raise PlanError("trusted_file_generation_changed:"+str(path))

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw:bytes)->str:
    return hashlib.sha1(
        b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw
    ).hexdigest()


def canonical(value:object)->bytes:
    return json.dumps(
        value,sort_keys=True,separators=(",",":"),ensure_ascii=True
    ).encode("ascii")


def clean_git_env()->dict[str,str]:
    return {
        "PATH":"/usr/bin:/bin",
        "HOME":"/home/zoso",
        "LANG":"C","LC_ALL":"C","TZ":"UTC",
        "GIT_CONFIG_NOSYSTEM":"1",
        "GIT_CONFIG_GLOBAL":"/dev/null",
        "GIT_CONFIG_SYSTEM":"/dev/null",
        "GIT_NO_REPLACE_OBJECTS":"1",
        "GIT_OPTIONAL_LOCKS":"0",
        "GIT_NO_LAZY_FETCH":"1",
        "GIT_TERMINAL_PROMPT":"0",
        "GIT_ASKPASS":"/bin/false",
        "GIT_PROTOCOL_FROM_USER":"0",
        "GIT_ALLOW_PROTOCOL":"",
        "GIT_PAGER":"",
    }


def git(args:list[str],*,binary:bool=False)->bytes|str:
    # Authenticate the exact Git ELF under root-owned, ACL-sealed ancestors.
    # The first child image is the retained fd, not a re-open by pathname.
    require_plan_identity()
    chain=_directory_chain(FIXED_GIT.parent)
    before=_trusted_file_before(FIXED_GIT,executable=True)
    try:
        tool_fd=os.open(FIXED_GIT,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC)
    except OSError as exc:
        raise PlanError("git_trusted_fd_open_failed") from exc
    try:
        opened=os.fstat(tool_fd)
        if _identity(opened)!=_identity(before):
            raise PlanError("git_trusted_fd_rebound")
        _revalidate_chain(chain)
        command=[
            "/proc/self/fd/"+str(tool_fd),
            "--git-dir="+str(FIXED_CHECKOUT/".git"),
            "--work-tree="+str(FIXED_CHECKOUT),
            "-c","core.worktree="+str(FIXED_CHECKOUT),
            "-c","core.fileMode=true",
            "-c","core.fsmonitor=false",
            "-c","core.hooksPath=/dev/null",
            "-c","core.untrackedCache=false",
            "-c","core.sparseCheckout=false",
            "-c","core.sparseCheckoutCone=false",
            "-c","submodule.recurse=false",
            *args,
        ]
        try:
            cp=subprocess.run(
                command,stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                env=clean_git_env(),cwd="/",timeout=20,check=False,
                pass_fds=(tool_fd,),
            )
        except (OSError,subprocess.SubprocessError) as exc:
            raise PlanError("git_execution_failed") from exc
        if _identity(os.fstat(tool_fd))!=_identity(opened):
            raise PlanError("git_trusted_fd_changed")
        _revalidate_trusted_file(FIXED_GIT,_identity(opened),executable=True)
        _revalidate_chain(chain)
    finally:
        os.close(tool_fd)
    if cp.returncode!=0:
        raise PlanError("git_failed:"+str(args[0] if args else "unknown"))
    if cp.stderr:
        raise PlanError("git_unexpected_stderr:"+str(args[0] if args else "unknown"))
    if len(cp.stdout)>MAX_GIT_OUTPUT:
        raise PlanError("git_stdout_limit")
    if binary:
        return cp.stdout
    try:
        return cp.stdout.decode("utf-8","strict")
    except UnicodeError as exc:
        raise PlanError("git_output_invalid") from exc

MAX_ACTUAL_ANCESTRY_COMMITS=4096
MAX_ACTUAL_COMMIT_PARENTS=64


def raw_commit_parents(oid:str)->list[str]:
    if HEX40.fullmatch(oid) is None:
        raise PlanError("source_runtime_actual_object_oid_invalid")
    kind=str(git(["cat-file","-t",oid])).strip()
    if kind!="commit":
        raise PlanError("source_runtime_actual_object_not_commit")
    raw=git(["cat-file","-p",oid],binary=True)
    assert isinstance(raw,bytes)
    header=raw.split(b"\n\n",1)[0]
    lines=header.split(b"\n")
    if not lines or not re.fullmatch(rb"tree [0-9a-f]{40}",lines[0]):
        raise PlanError("source_runtime_actual_object_commit_header_invalid")
    parents:list[str]=[]
    for line in lines:
        if not line.startswith(b"parent "):
            continue
        parent_raw=line[len(b"parent "):]
        try:
            parent=parent_raw.decode("ascii","strict")
        except UnicodeError as exc:
            raise PlanError("source_runtime_actual_object_parent_invalid") from exc
        if HEX40.fullmatch(parent) is None:
            raise PlanError("source_runtime_actual_object_parent_invalid")
        parents.append(parent)
        if len(parents)>MAX_ACTUAL_COMMIT_PARENTS:
            raise PlanError("source_runtime_actual_object_parent_bound_exceeded")
    return parents


def require_actual_object_ancestry(source_head:str)->None:
    if HEX40.fullmatch(source_head) is None:
        raise PlanError("source_runtime_actual_object_source_invalid")
    pending=[source_head]
    seen:set[str]=set()
    while pending:
        oid=pending.pop()
        if oid in seen:
            continue
        seen.add(oid)
        if len(seen)>MAX_ACTUAL_ANCESTRY_COMMITS:
            raise PlanError("source_runtime_actual_object_ancestry_bound_exceeded")
        if oid==RUNTIME_HEAD:
            return
        parents=raw_commit_parents(oid)
        for parent in reversed(parents):
            if parent not in seen:
                pending.append(parent)
    raise PlanError("source_runtime_actual_object_ancestry_not_found")


def source_snapshot()->dict[str,Any]:
    head=str(git(["rev-parse","--verify","HEAD"])).strip()
    tree=str(git(["rev-parse","--verify","HEAD^{tree}"])).strip()
    branch=str(git(["branch","--show-current"])).strip()
    if not HEX40.fullmatch(head) or not HEX40.fullmatch(tree):
        raise PlanError("source_generation_invalid")
    if branch!="main":
        raise PlanError("source_branch_not_main")
    if git(["status","--porcelain=v1","--untracked-files=no"])!="":
        raise PlanError("source_tracked_checkout_not_exact")
    require_actual_object_ancestry(head)

    expected={
        LOCK_REL:LOCK_BLOB,
        RUNNER_REL:RUNNER_BLOB,
    }
    for _label,relative,want in SOURCE_RUNTIME_DEPENDENCY_SPECS:
        prior=expected.get(relative)
        if prior is not None and prior!=want:
            raise PlanError("source_dependency_contract_conflict:"+relative)
        expected[relative]=want
    for relative,want in expected.items():
        current=str(git(["rev-parse","HEAD:"+relative])).strip()
        if current!=want:
            raise PlanError("source_blob_mismatch:"+relative)

    for _label,relative,want in SOURCE_RUNTIME_DEPENDENCY_SPECS:
        runtime=str(git(["rev-parse",RUNTIME_HEAD+":"+relative])).strip()
        current=str(git(["rev-parse","HEAD:"+relative])).strip()
        if runtime!=want or current!=want:
            raise PlanError("runtime_source_dependency_blob_mismatch:"+relative)

    runner=git(["show","HEAD:"+RUNNER_REL],binary=True)
    assert isinstance(runner,bytes)
    if (
        len(runner)!=NEW_RUNNER_BYTES
        or sha256(runner)!=NEW_RUNNER_SHA256
        or git_blob(runner)!=RUNNER_BLOB
    ):
        raise PlanError("runner_v4_git_object_identity_invalid")
    lock=git(["show","HEAD:"+LOCK_REL],binary=True)
    assert isinstance(lock,bytes)
    if git_blob(lock)!=LOCK_BLOB:
        raise PlanError("accepted_lock_git_object_identity_invalid")
    try:
        lock_value=json.loads(lock)
    except json.JSONDecodeError as exc:
        raise PlanError("accepted_lock_json_invalid") from exc
    sc=lock_value.get("candidate_report",{}).get("source_compatibility",{})
    forbidden_authority=(
        "protected_install_authorized","live_execution_authorized",
        "credential_access_authorized","private_key_access_authorized",
        "signing_authorized","transaction_authorized","rpc_call_authorized",
        "payment_acceptance_authorized","public_presale_activation_authorized",
        "wc_void_market_activation_authorized",
        "treasury_liquidity_action_authorized","funds_movement_authorized",
        "production_host_evidence_authority",
    )
    if (
        lock_value.get("version")!=8
        or lock_value.get("source_evidence_pr")!=3566
        or lock_value.get("integration_head")!="8729f4ca54543228ee99d5a50afc6a394c77bb28"
        or lock_value.get("lock_id")!=LOCK_ID
        or lock_value.get("candidate_report",{}).get("candidate_id")!=CANDIDATE_ID
        or lock_value.get("candidate_accepted") is not True
        or lock_value.get("runner_identity_accepted") is not True
        or lock_value.get("native_reuse_identity_accepted") is not True
        or lock_value.get("policy_template_accepted") is not True
        or lock_value.get("sealed_v3_identity_accepted") is not True
        or lock_value.get("retained_first_exec_identity_accepted") is not True
        or sc.get("actual_object_ancestry_required") is not True
        or sc.get("revision_walk_metadata_authority") is not False
        or sc.get("graft_ancestry_authority") is not False
        or sc.get("retained_setpriv_descriptor_first_exec_required") is not True
        or sc.get("retained_python_descriptor_first_exec_required") is not True
        or sc.get("retained_git_descriptor_execution_required") is not True
        or sc.get("retained_node_descriptor_execution_required") is not True
        or sc.get("retained_procfd_portable_cwd_required") is not True
        or sc.get("retained_procfd_missing_cwd_errno_distinguished") is not True
        or any(lock_value.get(key) is not False for key in forbidden_authority)
    ):
        raise PlanError("accepted_lock_contract_invalid")

    final_head=str(git(["rev-parse","--verify","HEAD"])).strip()
    final_tree=str(git(["rev-parse","--verify","HEAD^{tree}"])).strip()
    final_branch=str(git(["branch","--show-current"])).strip()
    if (
        final_head!=head or final_tree!=tree or final_branch!=branch
        or git(["status","--porcelain=v1","--untracked-files=no"])!=""
    ):
        raise PlanError("source_generation_changed_during_snapshot")

    return {
        "head":head,
        "tree":tree,
        "branch":branch,
        "runtime_head_ancestor":True,
        "runtime_head_actual_object_ancestor":True,
        "tracked_checkout_exact":True,
        "runtime_source_dependency_blob_equality":True,
        "runtime_source_dependency_count":len(SOURCE_RUNTIME_DEPENDENCY_SPECS),
        "runtime_source_complete_dependency_set_bound":True,
        "snapshot_terminal_revalidated":True,
        "untracked_paths_source_authority":False,
    }

def snapshot_host_file(path:Path,*,executable:bool)->dict[str,Any]:
    # Snapshot the entire executable ancestor chain before opening the leaf.
    chain=_directory_chain(path.parent)
    before=_trusted_file_before(path,executable=executable)
    try:
        fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    except OSError as exc:
        raise PlanError("host_file_open_failed:"+str(path)) from exc
    try:
        opened=os.fstat(fd)
        if _identity(opened)!=_identity(before) or not stat.S_ISREG(opened.st_mode):
            raise PlanError("host_file_rebound:"+str(path))
        digest=hashlib.sha256(); remaining=opened.st_size
        while remaining:
            chunk=os.read(fd,min(1024*1024,remaining))
            if not chunk:
                raise PlanError("host_file_short_read:"+str(path))
            digest.update(chunk); remaining-=len(chunk)
        if os.read(fd,1):
            raise PlanError("host_file_grew:"+str(path))
        if _identity(os.fstat(fd))!=_identity(opened):
            raise PlanError("host_file_fd_changed:"+str(path))
        _revalidate_trusted_file(path,_identity(opened),executable=executable)
        _revalidate_chain(chain)
        return {
            "path":str(path),"dev":opened.st_dev,"ino":opened.st_ino,
            "uid":opened.st_uid,"gid":opened.st_gid,
            "mode":format(stat.S_IMODE(opened.st_mode),"04o"),
            "nlink":opened.st_nlink,"bytes":opened.st_size,
            "sha256":digest.hexdigest(),
        }
    finally:
        os.close(fd)

def build_policy(
    *,
    runtime_head:str,
    runner_sha256:str,
    runner_bytes:int,
    node:dict[str,Any],
)->bytes:
    return (
        "schema="+POLICY_SCHEMA+"\n"
        "expected_head="+runtime_head+"\n"
        "runner_sha256="+runner_sha256+"\n"
        "runner_bytes="+str(runner_bytes)+"\n"
        "node_sha256="+str(node["sha256"])+"\n"
        "node_bytes="+str(node["bytes"])+"\n"
    ).encode("ascii")


def require_root_dir(path:Path)->list[tuple[Path,tuple[int,...]]]:
    chain=_directory_chain(path)
    try:
        leaf=path.lstat()
    except OSError as exc:
        raise PlanError("protected_root_unavailable:"+str(path)) from exc
    if _identity(leaf)!=chain[-1][1] or stat.S_IMODE(leaf.st_mode)!=0o755:
        raise PlanError("protected_root_metadata_invalid:"+str(path))
    return chain

def _open_verified_root_fd(path:Path,chain:list[tuple[Path,tuple[int,...]]])->int:
    try:
        fd=os.open(path,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC)
    except OSError as exc:
        raise PlanError("protected_root_open_failed:"+str(path)) from exc
    try:
        if _identity(os.fstat(fd))!=chain[-1][1]:
            raise PlanError("protected_root_rebound:"+str(path))
        _revalidate_chain(chain)
        return fd
    except BaseException:
        os.close(fd)
        raise

def require_protected_leaf_nonwritable(
    root_fd:int,name:str,expected:tuple[int,...],
)->None:
    """Reject effective runtime-UID write access to verified host leaves."""
    try:
        before=os.stat(name,dir_fd=root_fd,follow_symlinks=False)
        if not stat.S_ISREG(before.st_mode) or _identity(before)!=expected:
            raise PlanError("protected_leaf_acl_generation_changed:"+name)
        writable=os.access(
            name,os.W_OK,dir_fd=root_fd,effective_ids=True,
            follow_symlinks=False,
        )
        after=os.stat(name,dir_fd=root_fd,follow_symlinks=False)
        if not stat.S_ISREG(after.st_mode) or _identity(after)!=expected:
            raise PlanError("protected_leaf_acl_generation_changed:"+name)
    except (OSError,NotImplementedError,TypeError) as exc:
        raise PlanError("protected_leaf_acl_audit_unavailable:"+name) from exc
    if writable:
        raise PlanError("protected_leaf_runtime_writable:"+name)


def verify_file(
    root_fd:int,name:str,*,expected_bytes:int,expected_sha256:str,expected_mode:int,
)->None:
    try:
        before=os.stat(name,dir_fd=root_fd,follow_symlinks=False)
    except OSError as exc:
        raise PlanError("protected_file_unavailable:"+name) from exc
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode)
        or before.st_uid!=0 or before.st_gid!=0
        or stat.S_IMODE(before.st_mode)!=expected_mode
        or before.st_nlink!=1 or before.st_size!=expected_bytes
    ):
        raise PlanError("protected_file_metadata_invalid:"+name)
    require_protected_leaf_nonwritable(root_fd,name,_identity(before))
    try:
        fd=os.open(name,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK,dir_fd=root_fd)
    except OSError as exc:
        raise PlanError("protected_file_open_failed:"+name) from exc
    try:
        opened=os.fstat(fd)
        if not stat.S_ISREG(opened.st_mode) or _identity(opened)!=_identity(before):
            raise PlanError("protected_file_rebound:"+name)
        digest=hashlib.sha256(); remaining=expected_bytes
        while remaining:
            chunk=os.read(fd,min(1024*1024,remaining))
            if not chunk:
                raise PlanError("protected_file_short_read:"+name)
            digest.update(chunk); remaining-=len(chunk)
        if os.read(fd,1):
            raise PlanError("protected_file_grew:"+name)
        after=os.fstat(fd)
        visible=os.stat(name,dir_fd=root_fd,follow_symlinks=False)
        for field in ("st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink","st_size","st_mtime_ns","st_ctime_ns"):
            if getattr(opened,field)!=getattr(after,field) or getattr(after,field)!=getattr(visible,field):
                raise PlanError("protected_file_changed:"+name)
        if digest.hexdigest()!=expected_sha256:
            raise PlanError("protected_file_sha256_mismatch:"+name)
        require_protected_leaf_nonwritable(root_fd,name,_identity(opened))
    except OSError as exc:
        raise PlanError("protected_file_observation_unavailable:"+name) from exc
    finally:
        os.close(fd)


def verify_generation(
    root:Path,*,native_sha256:str,native_bytes:int,
    runner_sha256:str,runner_bytes:int,policy:bytes,
)->None:
    chain=require_root_dir(root)
    root_fd=_open_verified_root_fd(root,chain)
    try:
        # fd-bound listing closes pathname-list vs descriptor-open swaps.
        entries=sorted(os.listdir(root_fd))
        if entries!=sorted((NATIVE_NAME,RUNNER_NAME,POLICY_NAME)):
            raise PlanError("protected_root_entries_invalid:"+str(root))
        verify_file(root_fd,NATIVE_NAME,expected_bytes=native_bytes,expected_sha256=native_sha256,expected_mode=0o555)
        verify_file(root_fd,RUNNER_NAME,expected_bytes=runner_bytes,expected_sha256=runner_sha256,expected_mode=0o444)
        verify_file(root_fd,POLICY_NAME,expected_bytes=len(policy),expected_sha256=sha256(policy),expected_mode=0o444)
        if _identity(os.fstat(root_fd))!=chain[-1][1]:
            raise PlanError("protected_root_fd_changed:"+str(root))
        _revalidate_chain(chain)
    finally:
        os.close(root_fd)

def verify_v4_predecessor()->None:
    chain=require_root_dir(PREDECESSOR_V4_ROOT)
    root_fd=_open_verified_root_fd(PREDECESSOR_V4_ROOT,chain)
    try:
        entries=sorted(os.listdir(root_fd))
        if entries!=sorted((NATIVE_NAME,RUNNER_NAME,POLICY_NAME)):
            raise PlanError("v4_predecessor_entries_invalid")
        verify_file(root_fd,NATIVE_NAME,expected_bytes=V4_NATIVE_BYTES,expected_sha256=V4_NATIVE_SHA256,expected_mode=0o555)
        verify_file(root_fd,RUNNER_NAME,expected_bytes=V4_RUNNER_BYTES,expected_sha256=V4_RUNNER_SHA256,expected_mode=0o444)
        verify_file(root_fd,POLICY_NAME,expected_bytes=V4_POLICY_BYTES,expected_sha256=V4_POLICY_SHA256,expected_mode=0o444)
        if _identity(os.fstat(root_fd))!=chain[-1][1]:
            raise PlanError("v4_predecessor_fd_changed")
        _revalidate_chain(chain)
    finally:
        os.close(root_fd)

def classify_state(old_policy:bytes,new_policy:bytes)->str:
    # The parent custody barrier precedes any child pathname probe.
    parent_chain=require_root_dir(INSTALL_PARENT)
    if STAGE_ROOT.exists() or STAGE_ROOT.is_symlink():
        raise PlanError("v6r3_stage_root_present")
    if not INSTALL_ROOT.exists():
        raise PlanError("current_install_root_missing")
    verify_v4_predecessor()
    pred_v6r2_exists=PREDECESSOR_V6R2_ROOT.exists() or PREDECESSOR_V6R2_ROOT.is_symlink()
    if pred_v6r2_exists:
        verify_generation(
            PREDECESSOR_V6R2_ROOT,
            native_sha256=NATIVE_SHA256,native_bytes=NATIVE_BYTES,
            runner_sha256=OLD_RUNNER_SHA256,runner_bytes=OLD_RUNNER_BYTES,
            policy=old_policy,
        )
        verify_generation(
            INSTALL_ROOT,
            native_sha256=NATIVE_SHA256,native_bytes=NATIVE_BYTES,
            runner_sha256=NEW_RUNNER_SHA256,runner_bytes=NEW_RUNNER_BYTES,
            policy=new_policy,
        )
        _revalidate_chain(parent_chain)
        return GREEN_STATE
    verify_generation(
        INSTALL_ROOT,
        native_sha256=NATIVE_SHA256,native_bytes=NATIVE_BYTES,
        runner_sha256=OLD_RUNNER_SHA256,runner_bytes=OLD_RUNNER_BYTES,
        policy=old_policy,
    )
    _revalidate_chain(parent_chain)
    return READY_STATE

def _collect_plan_with_observers(
    *,
    source_snapshot_fn,
    snapshot_host_file_fn,
    classify_state_fn,
)->dict[str,Any]:
    source_before=source_snapshot_fn()
    node=snapshot_host_file_fn(FIXED_NODE,executable=True)
    old_policy=build_policy(
        runtime_head=RUNTIME_HEAD,
        runner_sha256=OLD_RUNNER_SHA256,
        runner_bytes=OLD_RUNNER_BYTES,
        node=node,
    )
    new_policy=build_policy(
        runtime_head=RUNTIME_HEAD,
        runner_sha256=NEW_RUNNER_SHA256,
        runner_bytes=NEW_RUNNER_BYTES,
        node=node,
    )
    if old_policy==new_policy or sha256(old_policy)==sha256(new_policy):
        raise PlanError("new_policy_not_distinct")
    state=classify_state_fn(old_policy,new_policy)
    # Reobserve the protected directory state and host Node before emitting
    # plan evidence; early valid observations cannot mask late drift.
    node_after=snapshot_host_file_fn(FIXED_NODE,executable=True)
    if node_after!=node:
        raise PlanError("host_node_generation_changed_during_plan")
    state_after=classify_state_fn(old_policy,new_policy)
    if state_after!=state:
        raise PlanError("protected_state_changed_during_plan")
    source_after=source_snapshot_fn()
    if source_after!=source_before:
        raise PlanError("source_generation_changed_during_plan")
    body={
        "schema":SCHEMA,"version":VERSION,
        "accepted_lock_id":LOCK_ID,
        "accepted_candidate_id":CANDIDATE_ID,
        "retained_first_exec_lock_bound":True,
        "source":source_after,
        "runtime_source_dependency_count":len(SOURCE_RUNTIME_DEPENDENCY_SPECS),
        "runtime_source_complete_dependency_set_bound":True,
        "source_terminal_revalidated":True,
        "host_node_terminal_revalidated":True,
        "protected_state_terminal_revalidated":True,
        "host_ancestor_acl_nonwritability_required":True,
        "host_root_descriptor_identity_required":True,
        "host_nonblocking_regular_file_open_required":True,
        "runtime_head":RUNTIME_HEAD,
        "runtime_tree":RUNTIME_TREE,
        "node":node,
        "native_sha256":NATIVE_SHA256,
        "native_bytes":NATIVE_BYTES,
        "native_reused":True,
        "old_runner_sha256":OLD_RUNNER_SHA256,
        "old_runner_bytes":OLD_RUNNER_BYTES,
        "new_runner_git_blob_sha1":RUNNER_BLOB,
        "new_runner_sha256":NEW_RUNNER_SHA256,
        "new_runner_bytes":NEW_RUNNER_BYTES,
        "old_policy_sha256":sha256(old_policy),
        "new_policy_sha256":sha256(new_policy),
        "policy_bytes":len(new_policy),
        "policy_runtime_expected_head":RUNTIME_HEAD,
        "protected_state":state,
        "stage_root":str(STAGE_ROOT),
        "current_root":str(INSTALL_ROOT),
        "predecessor_v4_root":str(PREDECESSOR_V4_ROOT),
        "predecessor_v6r2_root":str(PREDECESSOR_V6R2_ROOT),
        "full_root_stage_required":True,
        "atomic_root_exchange_required":True,
        "rename_exchange_required":True,
        "rename_noreplace_predecessor_required":True,
        "predecessor_v4_retention_required":True,
        "predecessor_v6r2_retention_required":True,
        "automatic_rollback_required":True,
        "native_mutation_authorized":False,
        "filesystem_write":False,
        "runner_execution":False,
        "native_execution":False,
        "live_composition_execution":False,
        "service_mutation":False,
        "systemd_mutation":False,
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
        "production_host_evidence_authority":False,
    }
    return {
        "body":body,
        "plan_id":PLAN_PREFIX+sha256(canonical(body)),
        "old_policy":old_policy,
        "new_policy":new_policy,
    }



def collect_plan()->dict[str,Any]:
    if os.geteuid()==0:
        raise PlanError("nonroot_required_for_plan")
    require_plan_identity()
    return _collect_plan_with_observers(
        source_snapshot_fn=source_snapshot,
        snapshot_host_file_fn=snapshot_host_file,
        classify_state_fn=classify_state,
    )

def source_plan()->None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("accepted_lock_id="+LOCK_ID)
    print("accepted_candidate_id="+CANDIDATE_ID)
    print("retained_first_exec_lock_bound=true")
    print("runtime_head="+RUNTIME_HEAD)
    print("new_runner_git_blob_sha1="+RUNNER_BLOB)
    print("new_runner_sha256="+NEW_RUNNER_SHA256)
    print("new_runner_bytes="+str(NEW_RUNNER_BYTES))
    print("native_sha256="+NATIVE_SHA256)
    print("native_bytes="+str(NATIVE_BYTES))
    print("native_reused=true")
    print("runtime_source_dependency_count="+str(len(SOURCE_RUNTIME_DEPENDENCY_SPECS)))
    print("runtime_source_complete_dependency_set_bound=true")
    print("source_runtime_actual_object_ancestry_required=true")
    print("terminal_source_revalidation_required=true")
    print("protected_ancestor_acl_custody_required=true")
    print("protected_directory_listing_fd_bound=true")
    print("trusted_git_first_exec_retained_fd_required=true")
    print("protected_leaf_runtime_acl_nonwritability_required=true")
    print("host_plan_exact_runtime_uid_gid_required=true")
    print("host_node_and_state_terminal_revalidation_required=true")
    print("full_root_stage_required=true")
    print("atomic_root_exchange_required=true")
    print("predecessor_v6r2_retention_required=true")
    print("filesystem_write=false")
    print("runner_execution=false")
    print("native_execution=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")
    print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R3_NONEXECUTING_HOST_PLAN")


def self_test()->None:
    # A writable ancestor is never eligible as a trusted path, regardless of
    # leaf uid/mode. /tmp is untrusted on Linux even if it is root-owned.
    try:
        _directory_chain(Path("/tmp"))
    except PlanError as exc:
        assert "protected_ancestor_custody_invalid" in str(exc)
    else:
        raise AssertionError("writable_directory_ancestor_accepted")
    assert hasattr(os,"O_NONBLOCK") and hasattr(os,"O_NOFOLLOW")
    # Hosted/disposable first-exec smoke test. No source checkout, live host
    # state, credential, service, wallet or transaction is accessed here.
    # The actual --plan still enforces the root/ACL/UID trust boundary.
    fixture_fd=os.open(
        FIXED_GIT,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC
    )
    try:
        cp=subprocess.run(
            ["/proc/self/fd/"+str(fixture_fd),"--version"],
            pass_fds=(fixture_fd,),cwd="/",env=clean_git_env(),
            stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            timeout=10,check=False,
        )
        assert cp.returncode==0,(cp.returncode,cp.stderr)
        assert cp.stdout.startswith(b"git version "),cp.stdout
        assert cp.stderr==b"",cp.stderr
    finally:
        os.close(fixture_fd)

    # Fixture-only leaf ACL proof. It does not touch any real protected path.
    fixture_leaf="__void_v6r3_acl_leaf_fixture__"
    fixture_fd=-9876
    stat_fixture=os.stat(__file__)
    fixture_identity=_identity(stat_fixture)
    saved_stat,saved_access=os.stat,os.access
    inject_write=[False]
    inject_unavailable=[False]
    def stat_fixture_observer(candidate,*args,**kwargs):
        if (candidate==fixture_leaf and
                kwargs.get("dir_fd")==fixture_fd and
                kwargs.get("follow_symlinks") is False):
            return stat_fixture
        return saved_stat(candidate,*args,**kwargs)
    def access_fixture_observer(candidate,mode,*args,**kwargs):
        if (candidate==fixture_leaf and mode==os.W_OK and
                kwargs.get("dir_fd")==fixture_fd and
                kwargs.get("effective_ids") is True and
                kwargs.get("follow_symlinks") is False):
            if inject_unavailable[0]:
                raise NotImplementedError("synthetic_leaf_acl_unavailable")
            return inject_write[0]
        return saved_access(candidate,mode,*args,**kwargs)
    os.stat,os.access=stat_fixture_observer,access_fixture_observer
    try:
        require_protected_leaf_nonwritable(
            fixture_fd,fixture_leaf,fixture_identity,
        )
        inject_write[0]=True
        try:
            require_protected_leaf_nonwritable(
                fixture_fd,fixture_leaf,fixture_identity,
            )
        except PlanError as exc:
            assert str(exc)=="protected_leaf_runtime_writable:"+fixture_leaf
        else:
            raise AssertionError("protected_leaf_acl_write_was_accepted")
        inject_write[0]=False
        inject_unavailable[0]=True
        try:
            require_protected_leaf_nonwritable(
                fixture_fd,fixture_leaf,fixture_identity,
            )
        except PlanError as exc:
            assert str(exc)=="protected_leaf_acl_audit_unavailable:"+fixture_leaf
        else:
            raise AssertionError("protected_leaf_acl_unavailable_was_accepted")
    finally:
        os.stat,os.access=saved_stat,saved_access
    print("protected_leaf_acl_write_rejected=true")
    print("protected_leaf_acl_unavailable_rejected=true")

    assert len(SOURCE_RUNTIME_DEPENDENCY_SPECS)==9
    assert [row[0] for row in SOURCE_RUNTIME_DEPENDENCY_SPECS]==[
        "qualifier","replacement_v3r","qualifier_v6","replacement_v6",
        "lock_v3r","lock_v2","lock_v6","parser_v4","sealed_v2",
    ]
    node={"sha256":"a"*64,"bytes":123456789}
    old_policy=build_policy(
        runtime_head=RUNTIME_HEAD,
        runner_sha256=OLD_RUNNER_SHA256,
        runner_bytes=OLD_RUNNER_BYTES,
        node=node,
    )
    new_policy=build_policy(
        runtime_head=RUNTIME_HEAD,
        runner_sha256=NEW_RUNNER_SHA256,
        runner_bytes=NEW_RUNNER_BYTES,
        node=node,
    )
    assert old_policy!=new_policy
    assert b"expected_head="+RUNTIME_HEAD.encode("ascii")+b"\n" in new_policy
    assert ("runner_sha256="+NEW_RUNNER_SHA256+"\n").encode("ascii") in new_policy
    assert ("runner_bytes="+str(NEW_RUNNER_BYTES)+"\n").encode("ascii") in new_policy
    body={
        "runtime_head":RUNTIME_HEAD,
        "new_runner_sha256":NEW_RUNNER_SHA256,
        "new_policy_sha256":sha256(new_policy),
        "filesystem_write":False,
    }
    first=PLAN_PREFIX+sha256(canonical(body))
    second=PLAN_PREFIX+sha256(canonical(dict(reversed(list(body.items())))))
    assert first==second
    assert LOCK_ID.startswith("voidbuye2runnerpollock6r3_")
    assert CANDIDATE_ID.startswith("voidbuye2runnerpolcand6r3_")

    source_base={
        "head":"b"*40,"tree":"c"*40,"branch":"main",
        "runtime_head_ancestor":True,
        "tracked_checkout_exact":True,
        "runtime_source_dependency_blob_equality":True,
        "runtime_source_dependency_count":9,
        "runtime_source_complete_dependency_set_bound":True,
        "snapshot_terminal_revalidated":True,
        "untracked_paths_source_authority":False,
    }
    stable_calls=0
    def stable_source():
        nonlocal stable_calls
        stable_calls+=1
        return dict(source_base)
    stable=_collect_plan_with_observers(
        source_snapshot_fn=stable_source,
        snapshot_host_file_fn=lambda _path,executable:dict(node),
        classify_state_fn=lambda _old,_new:READY_STATE,
    )
    assert stable_calls==2
    assert stable["body"]["source_terminal_revalidated"] is True
    assert stable["body"]["host_node_terminal_revalidated"] is True
    assert stable["body"]["protected_state_terminal_revalidated"] is True

    node_observations=0
    def drifting_node(_path,*,executable):
        nonlocal node_observations
        node_observations+=1
        value=dict(node)
        if node_observations==2:
            value["sha256"]="e"*64
        return value
    try:
        _collect_plan_with_observers(
            source_snapshot_fn=lambda:dict(source_base),
            snapshot_host_file_fn=drifting_node,
            classify_state_fn=lambda _old,_new:READY_STATE,
        )
    except PlanError as exc:
        assert str(exc)=="host_node_generation_changed_during_plan"
    else:
        raise AssertionError("host_node_terminal_drift_not_rejected")

    state_observations=0
    def drifting_state(_old,_new):
        nonlocal state_observations
        state_observations+=1
        return READY_STATE if state_observations==1 else GREEN_STATE
    try:
        _collect_plan_with_observers(
            source_snapshot_fn=lambda:dict(source_base),
            snapshot_host_file_fn=lambda _path,executable:dict(node),
            classify_state_fn=drifting_state,
        )
    except PlanError as exc:
        assert str(exc)=="protected_state_changed_during_plan"
    else:
        raise AssertionError("protected_state_terminal_drift_not_rejected")
    assert stable["body"]["runtime_source_dependency_count"]==9
    assert stable["body"]["runtime_source_complete_dependency_set_bound"] is True

    drift_calls=0
    def drifting_source():
        nonlocal drift_calls
        drift_calls+=1
        value=dict(source_base)
        if drift_calls==2:
            value["tree"]="d"*40
        return value
    try:
        _collect_plan_with_observers(
            source_snapshot_fn=drifting_source,
            snapshot_host_file_fn=lambda _path,executable:dict(node),
            classify_state_fn=lambda _old,_new:READY_STATE,
        )
    except PlanError as exc:
        assert str(exc)=="source_generation_changed_during_plan"
    else:
        raise AssertionError("late_source_drift_not_rejected")

    original_git=globals()["git"]
    graft_source="a"*40
    graft_parent="b"*40
    graft_tree="c"*40
    merge_base_called=False
    def graft_git(args:list[str],*,binary:bool=False):
        nonlocal merge_base_called
        if args[:2]==["cat-file","-t"]:
            value=b"commit\n" if binary else "commit\n"
            return value
        if args[:2]==["cat-file","-p"]:
            oid=args[2]
            if oid==graft_source:
                raw=(
                    "tree "+graft_tree+"\nparent "+graft_parent+
                    "\nauthor test <test@example.invalid> 0 +0000"+
                    "\ncommitter test <test@example.invalid> 0 +0000\n\nsource\n"
                ).encode("ascii")
            elif oid==graft_parent:
                raw=(
                    "tree "+graft_tree+
                    "\nauthor test <test@example.invalid> 0 +0000"+
                    "\ncommitter test <test@example.invalid> 0 +0000\n\nparent\n"
                ).encode("ascii")
            else:
                raise PlanError("graft_fixture_unexpected_oid")
            return raw if binary else raw.decode("ascii")
        if args and args[0]=="merge-base":
            merge_base_called=True
            return b"" if binary else ""
        raise PlanError("graft_fixture_unexpected_query")
    globals()["git"]=graft_git
    try:
        try:
            require_actual_object_ancestry(graft_source)
        except PlanError as exc:
            assert str(exc)=="source_runtime_actual_object_ancestry_not_found"
        else:
            raise AssertionError("graft_ancestry_not_rejected")
        assert merge_base_called is False
    finally:
        globals()["git"]=original_git

    print(MARKER+"_SELF_TEST_GREEN")
    print("runtime_policy_head_preserved=true")
    print("accepted_v6r3_lock_bound=true")
    print("accepted_v6r3_candidate_bound=true")
    print("native_v3_identity_reused=true")
    print("runner_v4_identity_bound=true")
    print("policy_node_identity_host_derived=true")
    print("runtime_source_complete_dependency_set_bound=true")
    print("source_runtime_actual_object_ancestry_required=true")
    print("runtime_source_dependency_count=9")
    print("terminal_source_revalidation_required=true")
    print("late_source_drift_rejected=true")
    print("host_node_terminal_drift_rejected=true")
    print("protected_state_terminal_drift_rejected=true")
    print("source_runtime_graft_ancestry_rejected=true")
    print("full_root_atomic_exchange_required=true")
    print("v4_predecessor_retained=true")
    print("v6r2_predecessor_retention_required=true")
    print("nonroot_host_plan_required=true")
    print("host_node_and_state_terminal_revalidation_required=true")
    print("host_plan_exact_runtime_uid_gid_required=true")
    print("protected_ancestor_acl_custody_required=true")
    print("protected_directory_listing_fd_bound=true")
    print("trusted_git_first_exec_retained_fd_required=true")
    print("protected_leaf_runtime_acl_nonwritability_required=true")
    print("trusted_git_procfd_first_exec_fixture_green=true")
    print("host_node_nonblocking_fd_required=true")
    print("writable_ancestor_rejected=true")
    print("filesystem_write=false")
    print("runner_execution=false")
    print("native_execution=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")

def emit_plan()->None:
    result=collect_plan(); body=result["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("nonroot_required=true")
    print("plan_id="+result["plan_id"])
    print("accepted_lock_id="+LOCK_ID)
    print("accepted_candidate_id="+CANDIDATE_ID)
    print("retained_first_exec_lock_bound=true")
    print("source_head="+str(body["source"]["head"]))
    print("source_tree="+str(body["source"]["tree"]))
    print("runtime_head="+RUNTIME_HEAD)
    print("protected_state="+str(body["protected_state"]))
    print("node_sha256="+str(body["node"]["sha256"]))
    print("node_bytes="+str(body["node"]["bytes"]))
    print("old_policy_sha256="+str(body["old_policy_sha256"]))
    print("new_policy_sha256="+str(body["new_policy_sha256"]))
    print("policy_bytes="+str(body["policy_bytes"]))
    print("native_sha256="+NATIVE_SHA256)
    print("native_bytes="+str(NATIVE_BYTES))
    print("new_runner_sha256="+NEW_RUNNER_SHA256)
    print("new_runner_bytes="+str(NEW_RUNNER_BYTES))
    print("runtime_source_dependency_count="+str(body["runtime_source_dependency_count"]))
    print("runtime_source_complete_dependency_set_bound=true")
    print("source_runtime_actual_object_ancestry_required=true")
    print("source_terminal_revalidated=true")
    print("host_node_terminal_revalidated=true")
    print("protected_state_terminal_revalidated=true")
    print("protected_ancestor_acl_custody_required=true")
    print("protected_directory_listing_fd_bound=true")
    print("trusted_git_first_exec_retained_fd_required=true")
    print("protected_leaf_runtime_acl_nonwritability_required=true")
    print("host_plan_exact_runtime_uid_gid_required=true")
    print("host_node_and_state_terminal_revalidation_required=true")
    print("full_root_stage_required=true")
    print("atomic_root_exchange_required=true")
    print("rename_exchange_required=true")
    print("rename_noreplace_predecessor_required=true")
    print("predecessor_v4_retention_required=true")
    print("predecessor_v6r2_retention_required=true")
    print("automatic_rollback_required=true")
    print("filesystem_write=false")
    print("runner_execution=false")
    print("native_execution=false")
    print("live_composition_execution=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("plan_body_json="+canonical(body).decode("ascii"))
    if body["protected_state"]==GREEN_STATE:
        print("already_upgraded=true")
        print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R3_INSTALLED_READ_ONLY_QUALIFICATION")
    else:
        print("already_upgraded=false")
        print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R3_RUNNER_POLICY_ATOMIC_UPGRADE")


def main()->int:
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test",action="store_true")
    mode.add_argument("--source-plan",action="store_true")
    mode.add_argument("--plan",action="store_true")
    args=parser.parse_args()
    if args.self_test:
        self_test(); return 0
    if args.source_plan:
        source_plan(); return 0
    emit_plan(); return 0


if __name__=="__main__":
    try:
        raise SystemExit(main())
    except PlanError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason="+re.sub(r"[^A-Za-z0-9_:./-]","_",str(exc)[:1000]))
        print("filesystem_write=false")
        print("runner_execution=false")
        print("native_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)

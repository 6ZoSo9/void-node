#!/usr/bin/env python3
from __future__ import annotations

import sys

def _require_isolated_python_startup()->None:
    flags=sys.flags
    if (
        flags.isolated!=1 or flags.ignore_environment!=1 or
        flags.no_user_site!=1 or flags.dont_write_bytecode!=1 or
        getattr(flags,"safe_path",0)!=1
    ):
        sys.stderr.write("HOLD=python_runtime_not_isolated\n")
        sys.stderr.write(
            "read_only=true\nfilesystem_write=false\nnetwork_access=false\n"
        )
        raise SystemExit(2)

_require_isolated_python_startup()

import argparse
from collections import deque
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import stat
import subprocess
from typing import Any

MARKER="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2"
TARGET_HOST="Xiphos"
PARENT_HEAD="9475035552881f34658a7c8f3a6b336199fda159"
PARENT_CONTRACT_BLOB_SHA1="bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc"
PARENT_STORE_POLICY_ID=(
    "apollyon_claim_store_policy_v2:"
    "e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137"
)

CLAIM_SERVICE_USER="voidapollyonclaim"
CLAIM_SERVICE_GROUP="voidapollyonclaim"
CLAIM_PUBLISHER_USER="voidapollyonclaimpub"
CLAIM_PUBLISHER_GROUP="voidapollyonclaimpub"
CLAIM_IPC_GROUP="voidapollyonclaimipc"

TRAINING_USER="voidapollyontrain"
CUSTODY_USER="voidapollyoncustody"
CUSTODY_IPC_GROUP="voidapollyonipc"
PUBLIC_RUNTIME_USER="zoso"
INTERACTIVE_OPERATOR_USER="zoso"

CLAIM_STATE_ROOT=Path("/var/lib/void-apollyon-attempt-claim-v2")
CLAIM_SOCKET_PARENT=Path("/run/void-apollyon-attempt-claim-v2")
CLAIM_SOCKET=CLAIM_SOCKET_PARENT/"claim.sock"
CLAIM_SERVICE_UNIT=Path("/etc/systemd/system/void-apollyon-attempt-claim-v2.service")
CLAIM_SERVICE_SOURCE_ROOT=Path("/opt/void-apollyon-attempt-claim-v2-reviewed-v1")
CLAIM_PUBLISHER_SOURCE_ROOT=Path("/opt/void-apollyon-attempt-claim-publisher-v2-reviewed-v1")

TRUSTED_EXISTING_PARENTS=(
    Path("/"),
    Path("/var"),
    Path("/var/lib"),
    Path("/run"),
    Path("/opt"),
    Path("/etc"),
    Path("/etc/systemd"),
    Path("/etc/systemd/system"),
)
TARGET_PATHS=(
    CLAIM_STATE_ROOT,
    CLAIM_SOCKET_PARENT,
    CLAIM_SERVICE_UNIT,
    CLAIM_SERVICE_SOURCE_ROOT,
    CLAIM_PUBLISHER_SOURCE_ROOT,
)
TARGET_USERS=(CLAIM_SERVICE_USER,CLAIM_PUBLISHER_USER)
TARGET_GROUPS=(CLAIM_SERVICE_GROUP,CLAIM_PUBLISHER_GROUP,CLAIM_IPC_GROUP)
MACHINE_ID_PATH=Path("/etc/machine-id")
NSSWITCH_PATH=Path("/etc/nsswitch.conf")
PASSWD_PATH=Path("/etc/passwd")
GROUP_PATH=Path("/etc/group")
LOGIN_DEFS_PATH=Path("/etc/login.defs")
PROC_ROOT=Path("/proc")
PROC_STATUS_MAX_BYTES=256*1024
PROC_STAT_MAX_BYTES=64*1024
PROC_MOUNTINFO_MAX_BYTES=1024*1024
MAX_PROC_ROWS=262144
MAX_KERNEL_ID=0xffff_ffff
PROC_PID_RE=re.compile(r"^[1-9][0-9]*$")
DEV_INO_RE=re.compile(r"^[1-9][0-9]*:[1-9][0-9]*$")
MACHINE_ID_RE=re.compile(r"^[0-9a-f]{32}$")
HASH64_RE=re.compile(r"^[0-9a-f]{64}$")
ACCOUNT_NAME_RE=re.compile(r"^[A-Za-z_][A-Za-z0-9_.-]{0,63}\$?$")
MAX_LOCAL_FILE_BYTES=4*1024*1024
MAX_LOCAL_ROWS=32768
MAX_ID=65533
GIT40_RE=re.compile(r"^[0-9a-f]{40}$")
GIT_BIN=Path("/usr/bin/git")
SOURCE_PATH=Path(__file__).absolute()
SOURCE_ROOT=SOURCE_PATH.parents[2]
PLANNER_REL=Path("ops/xiphos/apollyon_durable_attempt_claim_store_host_plan_v2.py")
PARENT_CONTRACT_REL=Path("tools/apollyon-durable-attempt-claim-store-contract-v2.mjs")
GIT_ENV={
    "PATH":"/usr/bin:/bin",
    "HOME":"/nonexistent",
    "LANG":"C",
    "LC_ALL":"C",
    "GIT_CONFIG_NOSYSTEM":"1",
    "GIT_CONFIG_GLOBAL":"/dev/null",
    "GIT_TERMINAL_PROMPT":"0",
    "GIT_OPTIONAL_LOCKS":"0",
    "GIT_NO_REPLACE_OBJECTS":"1",
    "GIT_NO_LAZY_FETCH":"1",
}

AUTHORITY={
    "source_contract":True,
    "designated_host_read_only_plan":True,
    "filesystem_read":True,
    "local_git_metadata_read":True,
    "source_generation_authentication_required":True,
    "isolated_python_startup_required":True,
    "reviewed_source_head_external_lease_required":True,
    "root_process_census_required":True,
    "host_pid_namespace_external_lease_required":True,
    "host_user_namespace_external_lease_required":True,
    "host_procfs_visibility_required":True,
    "process_credential_metadata_read":True,
    "filesystem_write":False,
    "account_mutation":False,
    "group_mutation":False,
    "systemd_mutation":False,
    "service_action":False,
    "network_access":False,
    "credential_access":False,
    "private_key_access":False,
    "signing":False,
    "wallet_access":False,
    "transaction":False,
    "funds_movement":False,
    "durable_attempt_claim":False,
    "training_execution":False,
    "candidate_weight_mutation":False,
}

class Hold(RuntimeError):
    pass

def hold(reason:str)->None:
    raise Hold(reason)

def canonical(value:Any)->str:
    return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=True)

def sha256_bytes(value:bytes)->str:
    return hashlib.sha256(value).hexdigest()

def git_blob_sha1(value:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(value)}\0".encode("ascii"))
    h.update(value)
    return h.hexdigest()

def same_file_identity(a:os.stat_result,b:os.stat_result)->bool:
    return (
        a.st_dev==b.st_dev and a.st_ino==b.st_ino and
        a.st_uid==b.st_uid and a.st_gid==b.st_gid and
        a.st_mode==b.st_mode and a.st_nlink==b.st_nlink and
        a.st_size==b.st_size and
        getattr(a,"st_mtime_ns",None)==getattr(b,"st_mtime_ns",None) and
        getattr(a,"st_ctime_ns",None)==getattr(b,"st_ctime_ns",None)
    )


def read_bound_repo_file(path:Path,*,max_bytes:int=MAX_LOCAL_FILE_BYTES)->tuple[bytes,dict[str,Any]]:
    try:
        before=os.lstat(path)
    except OSError as exc:
        raise Hold("source_file_unreadable:"+os.fspath(path)) from exc
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_size<1 or before.st_size>max_bytes or
        Path(os.path.realpath(path))!=path
    ):
        hold("source_file_invalid:"+os.fspath(path))
    try:
        fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|getattr(os,"O_NOFOLLOW",0))
    except OSError as exc:
        raise Hold("source_file_open_failed:"+os.fspath(path)) from exc
    try:
        opened=os.fstat(fd)
        if not same_file_identity(before,opened):
            hold("source_file_changed:"+os.fspath(path))
        chunks:list[bytes]=[]
        total=0
        while True:
            chunk=os.read(fd,min(65536,max_bytes+1-total))
            if not chunk:
                break
            total+=len(chunk)
            if total>max_bytes:
                hold("source_file_too_large:"+os.fspath(path))
            chunks.append(chunk)
        after=os.fstat(fd)
        visible=os.lstat(path)
        if (
            not same_file_identity(opened,after) or
            not same_file_identity(after,visible) or
            total!=after.st_size
        ):
            hold("source_file_changed:"+os.fspath(path))
        data=b"".join(chunks)
        return data,{
            "uid":after.st_uid,
            "gid":after.st_gid,
            "mode":f"{stat.S_IMODE(after.st_mode):04o}",
            "dev":str(after.st_dev),
            "ino":str(after.st_ino),
            "nlink":after.st_nlink,
            "size":after.st_size,
            "mtime_ns":getattr(after,"st_mtime_ns",None),
            "ctime_ns":getattr(after,"st_ctime_ns",None),
            "sha256":sha256_bytes(data),
            "git_blob_sha1":git_blob_sha1(data),
        }
    finally:
        os.close(fd)

def require_tracked_source_file(
    path:Path,
    tracked_blob_sha1:str,
    code:str,
)->dict[str,Any]:
    if not GIT40_RE.fullmatch(tracked_blob_sha1):
        hold(code)
    data,evidence=read_bound_repo_file(path)
    if git_blob_sha1(data)!=tracked_blob_sha1:
        hold(code)
    return evidence

def require_fixed_git_binary()->None:
    directories=[*reversed(GIT_BIN.parent.parents),GIT_BIN.parent]
    for directory in directories:
        try:
            parent=os.lstat(directory)
        except OSError as exc:
            raise Hold("source_git_binary_ancestor_unavailable") from exc
        if (
            not stat.S_ISDIR(parent.st_mode) or stat.S_ISLNK(parent.st_mode) or
            parent.st_uid!=0 or stat.S_IMODE(parent.st_mode)&0o022 or
            Path(os.path.realpath(directory))!=directory
        ):
            hold("source_git_binary_ancestor_untrusted")
    try:
        st=os.lstat(GIT_BIN)
    except OSError as exc:
        raise Hold("source_git_binary_unavailable") from exc
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or stat.S_IMODE(st.st_mode)&0o022 or
        Path(os.path.realpath(GIT_BIN))!=GIT_BIN
    ):
        hold("source_git_binary_untrusted")

def run_git(args:list[str],*,check:bool=True)->subprocess.CompletedProcess[str]:
    require_fixed_git_binary()
    if any(not isinstance(arg,str) or "\x00" in arg for arg in args):
        hold("source_git_argument_invalid")
    try:
        result=subprocess.run(
            [os.fspath(GIT_BIN),"-C",os.fspath(SOURCE_ROOT),*args],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=10,
            env=GIT_ENV,
        )
    except (OSError,subprocess.SubprocessError) as exc:
        raise Hold("source_git_command_failed") from exc
    if check and result.returncode!=0:
        hold("source_git_command_failed")
    return result

def tracked_blob_at_head(head:str,relative:Path)->str:
    rel=relative.as_posix()
    result=run_git(["ls-tree",head,"--",rel])
    line=result.stdout.rstrip("\n")
    expected_prefix="100644 blob "
    suffix="\t"+rel
    if (
        "\n" in line or not line.startswith(expected_prefix) or
        not line.endswith(suffix)
    ):
        hold("source_git_tree_entry_invalid:"+rel)
    blob=line[len(expected_prefix):-len(suffix)]
    if not GIT40_RE.fullmatch(blob):
        hold("source_git_tree_blob_invalid:"+rel)
    return blob


def raw_commit_parents(commit:str)->list[str]:
    if not GIT40_RE.fullmatch(commit):
        hold("source_git_commit_invalid")
    object_type=run_git(["cat-file","-t",commit]).stdout.strip()
    if object_type!="commit":
        hold("source_git_commit_object_type_invalid")
    result=run_git(["cat-file","-p",commit])
    parents:list[str]=[]
    tree_seen=False
    for line in result.stdout.splitlines():
        if line=="":
            break
        if line.startswith("tree "):
            if tree_seen or not GIT40_RE.fullmatch(line[5:]):
                hold("source_git_commit_object_invalid")
            tree_seen=True
            continue
        if line.startswith("parent "):
            parent=line[7:]
            if not GIT40_RE.fullmatch(parent):
                hold("source_git_commit_object_invalid")
            parents.append(parent)
            continue
        if line.startswith(("author ","committer ","encoding ","gpgsig ")):
            continue
        if line.startswith(" "):
            continue
        hold("source_git_commit_object_invalid")
    if not tree_seen:
        hold("source_git_commit_object_invalid")
    return parents

def raw_commit_ancestry_contains(
    descendant:str,
    ancestor:str,
    *,
    max_commits:int=4096,
)->bool:
    if not GIT40_RE.fullmatch(descendant) or not GIT40_RE.fullmatch(ancestor):
        hold("source_git_commit_invalid")
    # Breadth-first review prevents an unrelated deep merge parent from starving
    # a nearby reviewed ancestor. The same strict commit-object cap still applies.
    pending=deque([descendant])
    seen:set[str]=set()
    while pending:
        commit=pending.popleft()
        if commit in seen:
            continue
        seen.add(commit)
        if len(seen)>max_commits:
            hold("source_git_ancestry_limit_exceeded")
        if commit==ancestor:
            return True
        pending.extend(raw_commit_parents(commit))
    return False

def verify_source_generation(expected_source_head:str)->dict[str,Any]:
    if not GIT40_RE.fullmatch(expected_source_head):
        hold("expected_source_head_invalid")
    if SOURCE_PATH!=SOURCE_ROOT/PLANNER_REL or Path(os.path.realpath(SOURCE_PATH))!=SOURCE_PATH:
        hold("source_planner_path_invalid")
    toplevel=run_git(["rev-parse","--show-toplevel"]).stdout.strip()
    if toplevel!=os.fspath(SOURCE_ROOT):
        hold("source_git_toplevel_mismatch")
    observed_head=run_git(["rev-parse","HEAD"]).stdout.strip()
    if not GIT40_RE.fullmatch(observed_head) or observed_head!=expected_source_head:
        hold("source_head_mismatch")
    if not raw_commit_ancestry_contains(observed_head,PARENT_HEAD):
        hold("source_parent_not_ancestor")

    planner_blob=tracked_blob_at_head(observed_head,PLANNER_REL)
    planner_evidence=require_tracked_source_file(
        SOURCE_PATH,planner_blob,"source_planner_worktree_blob_mismatch"
    )

    contract_path=SOURCE_ROOT/PARENT_CONTRACT_REL
    contract_blob=tracked_blob_at_head(observed_head,PARENT_CONTRACT_REL)
    contract_evidence=require_tracked_source_file(
        contract_path,contract_blob,"source_parent_contract_worktree_blob_mismatch"
    )
    if contract_blob!=PARENT_CONTRACT_BLOB_SHA1:
        hold("source_parent_contract_blob_mismatch")

    return {
        "source_head":observed_head,
        "parent_head":PARENT_HEAD,
        "parent_head_ancestor":True,
        "planner_git_blob_sha1":planner_blob,
        "planner_file":planner_evidence,
        "parent_contract_git_blob_sha1":contract_blob,
        "parent_contract_file":contract_evidence,
        "fixed_git_binary":os.fspath(GIT_BIN),
        "fixed_git_retained_ancestry_protected":True,
        "git_environment_sanitized":True,
        "git_replace_objects_disabled":True,
        "git_lazy_fetch_disabled":True,
        "raw_commit_object_types_verified":True,
        "raw_commit_ancestry_verified":True,
        "git_network_access_performed":False,
        "reviewed_source_head_external_lease_required":True,
        "source_generation_authenticated":True,
        "isolated_python_startup_proven":True,
    }

def revalidate_source_generation(expected_source_head:str,expected:dict[str,Any])->None:
    observed=verify_source_generation(expected_source_head)
    if observed!=expected:
        hold("source_generation_changed_during_plan")

def read_bound_local_file(path:Path,*,max_bytes:int=MAX_LOCAL_FILE_BYTES)->tuple[bytes,dict[str,Any]]:
    try:
        before=os.lstat(path)
    except OSError as exc:
        raise Hold("local_identity_file_unreadable:"+os.fspath(path)) from exc
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_uid!=0 or stat.S_IMODE(before.st_mode)&0o022 or
        before.st_size<1 or before.st_size>max_bytes or
        Path(os.path.realpath(path))!=path
    ):
        hold("local_identity_file_invalid:"+os.fspath(path))
    try:
        fd=os.open(
            path,
            os.O_RDONLY|os.O_CLOEXEC|getattr(os,"O_NOFOLLOW",0),
        )
    except OSError as exc:
        raise Hold("local_identity_file_open_failed:"+os.fspath(path)) from exc
    try:
        opened=os.fstat(fd)
        if not same_file_identity(before,opened):
            hold("local_identity_file_changed:"+os.fspath(path))
        chunks:list[bytes]=[]
        total=0
        while True:
            chunk=os.read(fd,min(65536,max_bytes+1-total))
            if not chunk:
                break
            total+=len(chunk)
            if total>max_bytes:
                hold("local_identity_file_too_large:"+os.fspath(path))
            chunks.append(chunk)
        after=os.fstat(fd)
        visible=os.lstat(path)
        if (
            not same_file_identity(opened,after) or
            not same_file_identity(after,visible) or
            total!=after.st_size
        ):
            hold("local_identity_file_changed:"+os.fspath(path))
        data=b"".join(chunks)
        return data,{
            "path":os.fspath(path),
            "uid":after.st_uid,
            "gid":after.st_gid,
            "mode":f"{stat.S_IMODE(after.st_mode):04o}",
            "dev":str(after.st_dev),
            "ino":str(after.st_ino),
            "nlink":after.st_nlink,
            "size":after.st_size,
            "mtime_ns":getattr(after,"st_mtime_ns",None),
            "ctime_ns":getattr(after,"st_ctime_ns",None),
            "sha256":sha256_bytes(data),
        }
    finally:
        os.close(fd)

def revalidate_bound_local_file(path:Path,expected:dict[str,Any])->None:
    _,observed=read_bound_local_file(path)
    if observed!=expected:
        hold("local_identity_file_revalidation_failed:"+os.fspath(path))

def decode_local_file(data:bytes,code:str)->str:
    try:
        value=data.decode("utf-8","strict")
    except UnicodeError as exc:
        raise Hold(code) from exc
    if "\x00" in value:
        hold(code)
    return value

def parse_nsswitch_local_files_only(text:str)->dict[str,list[str]]:
    found:dict[str,list[str]]={}
    for raw in text.splitlines():
        line=raw.split("#",1)[0].strip()
        if not line:
            continue
        if ":" not in line:
            hold("nsswitch_line_invalid")
        database,source_text=line.split(":",1)
        database=database.strip()
        if database not in ("passwd","group"):
            continue
        if database in found:
            hold("nsswitch_duplicate_database:"+database)
        sources=source_text.split()
        if sources!=["files"]:
            hold("nsswitch_identity_source_not_files_only:"+database)
        found[database]=sources
    if set(found)!={"passwd","group"}:
        hold("nsswitch_identity_database_missing")
    return found

def parse_id(value:str,code:str)->int:
    if not value.isascii() or not value.isdigit():
        hold(code)
    number=int(value,10)
    if number<0 or number>MAX_ID:
        hold(code)
    return number

def parse_passwd_file(text:str)->list[dict[str,Any]]:
    rows:list[dict[str,Any]]=[]
    names:set[str]=set()
    for raw in text.splitlines():
        if raw=="":
            continue
        if len(rows)>=MAX_LOCAL_ROWS:
            hold("passwd_row_limit_exceeded")
        parts=raw.split(":")
        if len(parts)!=7:
            hold("passwd_row_invalid")
        name=parts[0]
        if not ACCOUNT_NAME_RE.fullmatch(name) or name in names:
            hold("passwd_name_invalid_or_duplicate")
        names.add(name)
        rows.append({
            "name":name,
            "uid":parse_id(parts[2],"passwd_uid_invalid"),
            "gid":parse_id(parts[3],"passwd_gid_invalid"),
        })
    if not rows:
        hold("passwd_empty")
    return rows

def parse_group_file(text:str)->list[dict[str,Any]]:
    rows:list[dict[str,Any]]=[]
    names:set[str]=set()
    for raw in text.splitlines():
        if raw=="":
            continue
        if len(rows)>=MAX_LOCAL_ROWS:
            hold("group_row_limit_exceeded")
        parts=raw.split(":")
        if len(parts)!=4:
            hold("group_row_invalid")
        name=parts[0]
        if not ACCOUNT_NAME_RE.fullmatch(name) or name in names:
            hold("group_name_invalid_or_duplicate")
        names.add(name)
        members=[] if parts[3]=="" else parts[3].split(",")
        if (
            any(not ACCOUNT_NAME_RE.fullmatch(member) for member in members) or
            len(set(members))!=len(members)
        ):
            hold("group_member_invalid_or_duplicate")
        rows.append({
            "name":name,
            "gid":parse_id(parts[2],"group_gid_invalid"),
            "members":members,
        })
    if not rows:
        hold("group_empty")
    return rows

def parse_login_defs(text:str)->dict[str,int]:
    wanted=("SYS_UID_MIN","SYS_UID_MAX","SYS_GID_MIN","SYS_GID_MAX")
    found:dict[str,int]={}
    for raw in text.splitlines():
        line=raw.split("#",1)[0].strip()
        if not line:
            continue
        parts=line.split()
        if len(parts)<2 or parts[0] not in wanted:
            continue
        key=parts[0]
        if key in found:
            hold("login_defs_duplicate:"+key)
        try:
            value=int(parts[1],10)
        except ValueError as exc:
            raise Hold("login_defs_invalid:"+key) from exc
        if value<=0 or value>65533:
            hold("login_defs_range_invalid:"+key)
        found[key]=value
    if set(found)!=set(wanted):
        hold("login_defs_required_keys_missing")
    if found["SYS_UID_MIN"]>found["SYS_UID_MAX"]:
        hold("login_defs_uid_range_invalid")
    if found["SYS_GID_MIN"]>found["SYS_GID_MAX"]:
        hold("login_defs_gid_range_invalid")
    return found


def parse_kernel_id(value:bytes,code:str)->int:
    if not value or not value.isascii() or not value.isdigit():
        hold(code)
    number=int(value,10)
    if number<0 or number>MAX_KERNEL_ID:
        hold(code)
    return number

def parse_proc_status_credentials(data:bytes,expected_pid:int)->dict[str,Any]:
    if not isinstance(expected_pid,int) or isinstance(expected_pid,bool) or expected_pid<=0:
        hold("process_pid_invalid")
    required={b"Pid",b"Uid",b"Gid",b"Groups"}
    found:dict[bytes,bytes]={}
    for raw in data.splitlines():
        if b":" not in raw:
            continue
        key,value=raw.split(b":",1)
        if key not in required:
            continue
        if key in found:
            hold("process_status_duplicate_field:"+key.decode("ascii"))
        found[key]=value.strip()
    if set(found)!=required:
        hold("process_status_required_field_missing")
    pid=parse_kernel_id(found[b"Pid"],"process_status_pid_invalid")
    if pid!=expected_pid:
        hold("process_status_pid_mismatch")
    uid_parts=found[b"Uid"].split()
    gid_parts=found[b"Gid"].split()
    group_parts=found[b"Groups"].split()
    if len(uid_parts)!=4:
        hold("process_status_uid_slots_invalid")
    if len(gid_parts)!=4:
        hold("process_status_gid_slots_invalid")
    uids=[parse_kernel_id(v,"process_status_uid_invalid") for v in uid_parts]
    gids=[parse_kernel_id(v,"process_status_gid_invalid") for v in gid_parts]
    groups=[parse_kernel_id(v,"process_status_group_invalid") for v in group_parts]
    if len(groups)!=len(set(groups)):
        hold("process_status_groups_duplicate")
    return {"pid":pid,"uids":uids,"gids":gids,"groups":groups}

def parse_proc_stat_start_ticks(data:bytes,expected_pid:int)->int:
    if not isinstance(expected_pid,int) or isinstance(expected_pid,bool) or expected_pid<=0:
        hold("process_pid_invalid")
    closing=data.rfind(b") ")
    if closing<1:
        hold("process_stat_malformed")
    prefix=data[:closing+1]
    first_space=prefix.find(b" ")
    if first_space<1:
        hold("process_stat_malformed")
    pid=parse_kernel_id(prefix[:first_space],"process_stat_pid_invalid")
    if pid!=expected_pid:
        hold("process_stat_pid_mismatch")
    tail=data[closing+2:].split()
    if len(tail)<20:
        hold("process_stat_malformed")
    start=parse_kernel_id(tail[19],"process_stat_start_ticks_invalid")
    if start<=0:
        hold("process_stat_start_ticks_invalid")
    return start

def read_bounded_proc_file(path:Path,max_bytes:int)->bytes:
    if not isinstance(max_bytes,int) or isinstance(max_bytes,bool) or max_bytes<1:
        hold("process_read_bound_invalid")
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|getattr(os,"O_NOFOLLOW",0))
    try:
        chunks:list[bytes]=[]
        total=0
        while True:
            chunk=os.read(fd,min(65536,max_bytes+1-total))
            if not chunk:
                break
            total+=len(chunk)
            if total>max_bytes:
                hold("process_file_too_large")
            chunks.append(chunk)
        return b"".join(chunks)
    finally:
        os.close(fd)

def process_pid_exists(proc_root:Path,pid:int)->bool:
    try:
        st=os.lstat(proc_root/str(pid))
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise Hold("process_pid_visibility_failed:"+str(pid)) from exc
    if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
        hold("process_pid_entry_invalid:"+str(pid))
    return True

def read_proc_start_ticks(proc_root:Path,pid:int)->int|None:
    path=proc_root/str(pid)/"stat"
    try:
        data=read_bounded_proc_file(path,PROC_STAT_MAX_BYTES)
    except FileNotFoundError:
        if process_pid_exists(proc_root,pid):
            hold("process_stat_missing_still_existing:"+str(pid))
        return None
    except OSError as exc:
        if process_pid_exists(proc_root,pid):
            raise Hold("process_stat_unreadable:"+str(pid)) from exc
        return None
    return parse_proc_stat_start_ticks(data,pid)

def read_stable_process_credentials(proc_root:Path,pid:int)->dict[str,Any]|None:
    before=read_proc_start_ticks(proc_root,pid)
    if before is None:
        return None
    status_path=proc_root/str(pid)/"status"
    try:
        status=read_bounded_proc_file(status_path,PROC_STATUS_MAX_BYTES)
    except FileNotFoundError:
        if process_pid_exists(proc_root,pid):
            hold("process_status_missing_still_existing:"+str(pid))
        return None
    except OSError as exc:
        if process_pid_exists(proc_root,pid):
            raise Hold("process_status_unreadable:"+str(pid)) from exc
        return None
    credentials=parse_proc_status_credentials(status,pid)
    after=read_proc_start_ticks(proc_root,pid)
    if after is None:
        return None
    if after!=before:
        hold("process_generation_changed_during_census:"+str(pid))
    return {**credentials,"start_ticks":str(after)}

def census_live_process_credentials(
    proc_root:Path,
)->tuple[set[int],set[int],dict[str,Any]]:
    try:
        names=[entry.name for entry in os.scandir(proc_root) if PROC_PID_RE.fullmatch(entry.name)]
    except OSError as exc:
        raise Hold("process_census_directory_unreadable") from exc
    if len(names)>MAX_PROC_ROWS:
        hold("process_census_pid_limit_exceeded")
    pids=sorted({int(name,10) for name in names})
    uid_values:set[int]=set()
    gid_values:set[int]=set()
    stable_records:list[dict[str,Any]]=[]
    for pid in pids:
        record=read_stable_process_credentials(proc_root,pid)
        if record is None:
            continue
        uid_values.update(record["uids"])
        gid_values.update(record["gids"])
        gid_values.update(record["groups"])
        stable_records.append({
            "pid":record["pid"],
            "start_ticks":record["start_ticks"],
            "uids":record["uids"],
            "gids":record["gids"],
            "groups":record["groups"],
        })
    return uid_values,gid_values,{
        "numeric_pid_entries_observed":len(pids),
        "stable_process_generations_observed":len(stable_records),
        "unique_uid_values_observed":len(uid_values),
        "unique_gid_values_observed":len(gid_values),
        "credential_generation_set_sha256":sha256_bytes(
            canonical(stable_records).encode("utf-8")
        ),
    }

def parse_dev_ino_lease(
    value:str,
    code:str="host_pid_namespace_lease_invalid",
)->tuple[int,int]:
    if not isinstance(value,str) or not DEV_INO_RE.fullmatch(value):
        hold(code)
    dev_text,ino_text=value.split(":",1)
    dev=int(dev_text,10)
    ino=int(ino_text,10)
    if dev<=0 or ino<=0:
        hold(code)
    return dev,ino

def verify_namespace_lease(
    self_ns:os.stat_result,
    init_ns:os.stat_result,
    expected:tuple[int,int],
    *,
    mismatch_code:str,
    lease_code:str,
)->tuple[int,int]:
    observed=(self_ns.st_dev,self_ns.st_ino)
    init_observed=(init_ns.st_dev,init_ns.st_ino)
    if observed!=init_observed:
        hold(mismatch_code)
    if observed!=expected:
        hold(lease_code)
    return observed

def parse_proc_mountinfo_host_view(data:bytes,proc_root:Path)->dict[str,Any]:
    try:
        text=data.decode("ascii","strict")
    except UnicodeError as exc:
        raise Hold("proc_mountinfo_encoding_invalid") from exc
    target=os.fspath(proc_root)
    matches=[]
    for raw in text.splitlines():
        parts=raw.split()
        if len(parts)<10 or parts[4]!=target:
            continue
        try:
            sep=parts.index("-")
        except ValueError:
            hold("proc_mountinfo_malformed")
        if sep<6 or len(parts)<=sep+3:
            hold("proc_mountinfo_malformed")
        matches.append({
            "root":parts[3],
            "mount_point":parts[4],
            "mount_options":parts[5].split(","),
            "fs_type":parts[sep+1],
            "source":parts[sep+2],
            "super_options":parts[sep+3].split(","),
        })
    if len(matches)!=1:
        hold("proc_mountinfo_procfs_cardinality_invalid")
    row=matches[0]
    if row["root"]!="/" or row["mount_point"]!=target or row["fs_type"]!="proc":
        hold("proc_mountinfo_procfs_identity_invalid")
    all_options=row["mount_options"]+row["super_options"]
    if any(option=="hidepid" or option.startswith("hidepid=") for option in all_options):
        hold("proc_mountinfo_hidepid_forbidden")
    return row

def require_authoritative_process_view(
    expected_host_pid_namespace_dev_ino:str,
    expected_host_user_namespace_dev_ino:str,
)->dict[str,Any]:
    if not hasattr(os,"geteuid") or os.geteuid()!=0:
        hold("root_required_for_host_process_census")
    proc_root=PROC_ROOT
    if proc_root!=Path("/proc") or Path(os.path.realpath(proc_root))!=proc_root:
        hold("proc_root_not_canonical")
    try:
        proc_st=os.lstat(proc_root)
    except OSError as exc:
        raise Hold("proc_root_unreadable") from exc
    if not stat.S_ISDIR(proc_st.st_mode) or stat.S_ISLNK(proc_st.st_mode) or proc_st.st_uid!=0:
        hold("proc_root_identity_invalid")
    expected_pid_namespace=parse_dev_ino_lease(
        expected_host_pid_namespace_dev_ino,
        "host_pid_namespace_lease_invalid",
    )
    expected_user_namespace=parse_dev_ino_lease(
        expected_host_user_namespace_dev_ino,
        "host_user_namespace_lease_invalid",
    )
    try:
        self_pid_ns=os.stat(proc_root/"self/ns/pid")
        init_pid_ns=os.stat(proc_root/"1/ns/pid")
    except OSError as exc:
        raise Hold("host_pid_namespace_unreadable") from exc
    observed_pid_namespace=verify_namespace_lease(
        self_pid_ns,
        init_pid_ns,
        expected_pid_namespace,
        mismatch_code="not_in_pid1_namespace",
        lease_code="host_pid_namespace_lease_mismatch",
    )
    try:
        self_user_ns=os.stat(proc_root/"self/ns/user")
        init_user_ns=os.stat(proc_root/"1/ns/user")
    except OSError as exc:
        raise Hold("host_user_namespace_unreadable") from exc
    observed_user_namespace=verify_namespace_lease(
        self_user_ns,
        init_user_ns,
        expected_user_namespace,
        mismatch_code="not_in_pid1_user_namespace",
        lease_code="host_user_namespace_lease_mismatch",
    )
    try:
        mountinfo=read_bounded_proc_file(proc_root/"self/mountinfo",PROC_MOUNTINFO_MAX_BYTES)
    except OSError as exc:
        raise Hold("proc_mountinfo_unreadable") from exc
    mount=parse_proc_mountinfo_host_view(mountinfo,proc_root)
    self_record=read_stable_process_credentials(proc_root,os.getpid())
    init_record=read_stable_process_credentials(proc_root,1)
    if self_record is None or init_record is None:
        hold("authoritative_process_anchor_disappeared")
    if set(self_record["uids"])!={0} or set(self_record["gids"])!={0}:
        hold("root_process_credentials_not_full_root")
    if set(init_record["uids"])!={0} or set(init_record["gids"])!={0}:
        hold("pid1_credentials_not_root")
    return {
        "profile":"reviewed_root_host_pid_user_namespace_procfs_v2",
        "root_execution_verified":True,
        "host_pid_namespace_external_lease_required":True,
        "host_pid_namespace_dev":str(observed_pid_namespace[0]),
        "host_pid_namespace_ino":str(observed_pid_namespace[1]),
        "pid1_namespace_matches_self":True,
        "host_user_namespace_external_lease_required":True,
        "host_user_namespace_dev":str(observed_user_namespace[0]),
        "host_user_namespace_ino":str(observed_user_namespace[1]),
        "pid1_user_namespace_matches_self":True,
        "procfs_root":mount["root"],
        "procfs_mount_point":mount["mount_point"],
        "procfs_hidepid_absent":True,
        "complete_process_visibility_required":True,
    }

def choose_highest_free(
    minimum:int,
    maximum:int,
    unavailable:set[int],
    count:int,
)->list[int]:
    if (
        not isinstance(minimum,int) or isinstance(minimum,bool) or
        not isinstance(maximum,int) or isinstance(maximum,bool) or
        not isinstance(count,int) or isinstance(count,bool) or
        minimum<=0 or maximum<minimum or maximum>65533 or count<1
    ):
        hold("candidate_selection_input_invalid")
    chosen=[]
    for value in range(maximum,minimum-1,-1):
        if value in unavailable:
            continue
        chosen.append(value)
        if len(chosen)==count:
            return chosen
    hold("candidate_selection_exhausted")

def require_trusted_directory(path:Path)->dict[str,Any]:
    try:
        st=os.lstat(path)
    except OSError as exc:
        raise Hold("trusted_parent_unreadable:"+os.fspath(path)) from exc
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or stat.S_IMODE(st.st_mode)&0o022 or
        Path(os.path.realpath(path))!=path
    ):
        hold("trusted_parent_invalid:"+os.fspath(path))
    return {
        "path":os.fspath(path),
        "uid":st.st_uid,
        "gid":st.st_gid,
        "mode":f"{stat.S_IMODE(st.st_mode):04o}",
        "dev":str(st.st_dev),
        "ino":str(st.st_ino),
    }

def require_absent(path:Path)->None:
    try:
        os.lstat(path)
    except FileNotFoundError:
        return
    except OSError as exc:
        raise Hold("target_path_census_failed:"+os.fspath(path)) from exc
    hold("target_path_preexists:"+os.fspath(path))

def require_user_absent(name:str,rows:list[dict[str,Any]])->None:
    if any(row["name"]==name for row in rows):
        hold("target_user_preexists:"+name)

def require_group_absent(name:str,rows:list[dict[str,Any]])->None:
    if any(row["name"]==name for row in rows):
        hold("target_group_preexists:"+name)

def existing_user(name:str,rows:list[dict[str,Any]])->dict[str,Any]:
    matches=[row for row in rows if row["name"]==name]
    if len(matches)!=1:
        hold("required_user_missing_or_ambiguous:"+name)
    row=matches[0]
    if row["uid"]<=0 or row["gid"]<=0:
        hold("required_user_identity_invalid:"+name)
    return {"name":name,"uid":row["uid"],"gid":row["gid"]}

def existing_group(name:str,rows:list[dict[str,Any]])->dict[str,Any]:
    matches=[row for row in rows if row["name"]==name]
    if len(matches)!=1:
        hold("required_group_missing_or_ambiguous:"+name)
    row=matches[0]
    if row["gid"]<=0:
        hold("required_group_identity_invalid:"+name)
    return {"name":name,"gid":row["gid"]}

def machine_id_sha256(data:bytes)->str:
    try:
        text=data.decode("ascii","strict").strip()
    except UnicodeError as exc:
        raise Hold("machine_id_unreadable") from exc
    if not MACHINE_ID_RE.fullmatch(text):
        hold("machine_id_invalid")
    return sha256_bytes(text.encode("ascii"))

def collect_plan(
    expected_parent_head:str,
    expected_source_head:str,
    expected_host_pid_namespace_dev_ino:str,
    expected_host_user_namespace_dev_ino:str,
)->dict[str,Any]:
    if expected_parent_head!=PARENT_HEAD:
        hold("expected_parent_head_mismatch")
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():
        hold("wrong_host")
    source_generation=verify_source_generation(expected_source_head)
    process_view_before=require_authoritative_process_view(
        expected_host_pid_namespace_dev_ino,
        expected_host_user_namespace_dev_ino,
    )
    live_uids,live_gids,process_census_before=census_live_process_credentials(PROC_ROOT)

    parents=[require_trusted_directory(path) for path in TRUSTED_EXISTING_PARENTS]
    for path in TARGET_PATHS:
        require_absent(path)

    bound_paths={
        "nsswitch":NSSWITCH_PATH,
        "passwd":PASSWD_PATH,
        "group":GROUP_PATH,
        "login_defs":LOGIN_DEFS_PATH,
    }
    raws:dict[str,bytes]={}
    evidence:dict[str,dict[str,Any]]={}
    for key,path in bound_paths.items():
        raw,row=read_bound_local_file(path)
        raws[key]=raw
        evidence[key]=row
    machine_raw,machine_evidence=read_bound_local_file(MACHINE_ID_PATH,max_bytes=4096)

    nss=parse_nsswitch_local_files_only(
        decode_local_file(raws["nsswitch"],"nsswitch_encoding_invalid")
    )
    passwd_rows=parse_passwd_file(
        decode_local_file(raws["passwd"],"passwd_encoding_invalid")
    )
    group_rows=parse_group_file(
        decode_local_file(raws["group"],"group_encoding_invalid")
    )
    ranges=parse_login_defs(
        decode_local_file(raws["login_defs"],"login_defs_encoding_invalid")
    )

    for name in TARGET_USERS:
        require_user_absent(name,passwd_rows)
    for name in TARGET_GROUPS:
        require_group_absent(name,group_rows)

    training=existing_user(TRAINING_USER,passwd_rows)
    custody=existing_user(CUSTODY_USER,passwd_rows)
    runtime=existing_user(PUBLIC_RUNTIME_USER,passwd_rows)
    operator=existing_user(INTERACTIVE_OPERATOR_USER,passwd_rows)
    custody_ipc=existing_group(CUSTODY_IPC_GROUP,group_rows)

    used_uids={row["uid"] for row in passwd_rows}
    used_gids={row["gid"] for row in group_rows}
    used_gids.update(row["gid"] for row in passwd_rows)
    protected_numbers={
        training["uid"],training["gid"],custody["uid"],custody["gid"],
        runtime["uid"],runtime["gid"],operator["uid"],operator["gid"],
        custody_ipc["gid"],
    }
    globally_unavailable=(
        used_uids|used_gids|protected_numbers|live_uids|live_gids|{0}
    )
    uid_candidates=choose_highest_free(
        ranges["SYS_UID_MIN"],ranges["SYS_UID_MAX"],globally_unavailable,2,
    )
    globally_unavailable.update(uid_candidates)
    gid_candidates=choose_highest_free(
        ranges["SYS_GID_MIN"],ranges["SYS_GID_MAX"],globally_unavailable,3,
    )
    if len(set(uid_candidates+gid_candidates))!=5:
        hold("candidate_numeric_slots_not_distinct")

    candidates={
        "claim_service_uid":uid_candidates[0],
        "claim_publisher_uid":uid_candidates[1],
        "claim_service_gid":gid_candidates[0],
        "claim_publisher_gid":gid_candidates[1],
        "claim_ipc_gid":gid_candidates[2],
    }

    process_view_after=require_authoritative_process_view(
        expected_host_pid_namespace_dev_ino,
        expected_host_user_namespace_dev_ino,
    )
    if process_view_after!=process_view_before:
        hold("process_view_authority_changed_during_plan")
    final_live_uids,final_live_gids,process_census_after=(
        census_live_process_credentials(PROC_ROOT)
    )
    selected_numeric=set(candidates.values())
    if selected_numeric&(final_live_uids|final_live_gids):
        hold("candidate_live_process_collision_after_selection")

    for key,path in bound_paths.items():
        revalidate_bound_local_file(path,evidence[key])
    revalidate_bound_local_file(MACHINE_ID_PATH,machine_evidence)
    revalidate_source_generation(expected_source_head,source_generation)

    material={
        "marker":MARKER,
        "version":2,
        "status":"xiphos_claim_store_preinstall_plan_ready",
        "target_host":TARGET_HOST,
        "machine_id_sha256":machine_id_sha256(machine_raw),
        "machine_id_file":machine_evidence,
        "parent_head":PARENT_HEAD,
        "parent_contract_blob_sha1":PARENT_CONTRACT_BLOB_SHA1,
        "source_generation":source_generation,
        "store_policy_id":PARENT_STORE_POLICY_ID,
        "fixed_names":{
            "claim_service_user":CLAIM_SERVICE_USER,
            "claim_service_group":CLAIM_SERVICE_GROUP,
            "claim_publisher_user":CLAIM_PUBLISHER_USER,
            "claim_publisher_group":CLAIM_PUBLISHER_GROUP,
            "claim_ipc_group":CLAIM_IPC_GROUP,
        },
        "fixed_paths":{
            "claim_state_root":os.fspath(CLAIM_STATE_ROOT),
            "claim_socket_parent":os.fspath(CLAIM_SOCKET_PARENT),
            "claim_socket":os.fspath(CLAIM_SOCKET),
            "claim_service_unit":os.fspath(CLAIM_SERVICE_UNIT),
            "claim_service_source_root":os.fspath(CLAIM_SERVICE_SOURCE_ROOT),
            "claim_publisher_source_root":os.fspath(CLAIM_PUBLISHER_SOURCE_ROOT),
        },
        "existing_identities":{
            "training":training,
            "custody":custody,
            "custody_ipc":custody_ipc,
            "public_runtime":runtime,
            "interactive_operator":operator,
        },
        "local_identity_authority":{
            "profile":"local_files_only_v2",
            "nsswitch_sources":nss,
            "files":evidence,
            "passwd_row_count":len(passwd_rows),
            "group_row_count":len(group_rows),
            "libc_nss_lookup_used":False,
            "remote_nss_provider_allowed":False,
            "identity_resolution_external_network_calls":False,
        },
        "system_id_ranges":ranges,
        "selected_candidates":candidates,
        "live_process_identity_authority":{
            **process_view_before,
            "initial_census":process_census_before,
            "final_census":process_census_after,
            "all_four_uid_slots_consumed":True,
            "all_four_gid_slots_consumed":True,
            "supplementary_groups_consumed":True,
            "candidate_slots_clear_in_final_process_census":True,
            "process_census_observation_only":True,
            "provisioning_recensus_required":True,
        },
        "trusted_parent_directories":parents,
        "target_names_absent":True,
        "target_paths_absent":True,
        "candidate_slots_selected_in_plan":True,
        "candidate_slots_globally_distinct":True,
        "candidate_slots_revalidation_required_before_provisioning":True,
        "candidate_slots_live_process_recensus_required_before_provisioning":True,
        "candidate_slots_host_user_namespace_recensus_required_before_provisioning":True,
        "candidate_slots_provisioning_ready":False,
        "source_generation_authenticated":True,
        "reviewed_source_head_external_lease_required":True,
        "claim_identity_provisioned":False,
        "publisher_identity_provisioned":False,
        "claim_ipc_group_provisioned":False,
        "claim_root_created":False,
        "claim_socket_parent_created":False,
        "claim_service_source_installed":False,
        "claim_publisher_source_installed":False,
        "claim_service_unit_installed":False,
        "claim_service_started":False,
        "protected_claim_store_proven":False,
        "durable_attempt_claim_performed":False,
        "training_execution_performed":False,
        "next_gate":"apollyon_durable_attempt_claim_store_service_source_candidate_v2",
        "authority":AUTHORITY,
    }
    return {
        **material,
        "plan_id":"apollyon_claim_store_host_plan_v2:"+
            sha256_bytes(canonical(material).encode("utf-8")),
    }

def self_test()->None:
    parsed=parse_login_defs(
        """
        SYS_UID_MIN 100
        SYS_UID_MAX 999
        SYS_GID_MIN 100
        SYS_GID_MAX 999
        """
    )
    assert parsed=={
        "SYS_UID_MIN":100,"SYS_UID_MAX":999,
        "SYS_GID_MIN":100,"SYS_GID_MAX":999,
    }
    assert choose_highest_free(100,105,{105,103},3)==[104,102,101]
    parsed_proc=parse_proc_status_credentials(
        b"Pid:\t42\nUid:\t101 102 103 104\n"
        b"Gid:\t201 202 203 204\nGroups:\t301 302\n",
        42,
    )
    assert parsed_proc["uids"]==[101,102,103,104]
    assert parsed_proc["gids"]==[201,202,203,204]
    assert parsed_proc["groups"]==[301,302]
    assert parse_dev_ino_lease("12:34")== (12,34)
    assert parse_dev_ino_lease(
        "56:78","host_user_namespace_lease_invalid"
    )==(56,78)
    fixture_ns=type("FixtureNamespace",(),{"st_dev":12,"st_ino":34})
    assert verify_namespace_lease(
        fixture_ns(),fixture_ns(),(12,34),
        mismatch_code="synthetic_namespace_mismatch",
        lease_code="synthetic_namespace_lease_mismatch",
    )==(12,34)
    try:
        verify_namespace_lease(
            fixture_ns(),
            type("DifferentNamespace",(),{"st_dev":12,"st_ino":35})(),
            (12,34),
            mismatch_code="synthetic_user_namespace_mismatch",
            lease_code="synthetic_user_namespace_lease_mismatch",
        )
    except Hold as exc:
        assert str(exc)=="synthetic_user_namespace_mismatch"
    else:
        raise AssertionError("user namespace mismatch must HOLD")
    sample_mount=(
        b"42 35 0:31 / /proc rw,nosuid,nodev,noexec,relatime "
        b"- proc proc rw\n"
    )
    assert parse_proc_mountinfo_host_view(sample_mount,Path("/proc"))["fs_type"]=="proc"
    nss=parse_nsswitch_local_files_only("passwd: files\ngroup: files\nhosts: files dns\n")
    assert nss=={"passwd":["files"],"group":["files"]}
    for bad,reason in (
        ("passwd: files sss\ngroup: files\n","nsswitch_identity_source_not_files_only:passwd"),
        ("passwd: ldap\ngroup: files\n","nsswitch_identity_source_not_files_only:passwd"),
        ("passwd: compat\ngroup: files\n","nsswitch_identity_source_not_files_only:passwd"),
        ("passwd: files\npasswd: files\ngroup: files\n","nsswitch_duplicate_database:passwd"),
        ("passwd: files\n","nsswitch_identity_database_missing"),
    ):
        try:
            parse_nsswitch_local_files_only(bad)
        except Hold as exc:
            assert str(exc)==reason
        else:
            raise AssertionError("unsafe NSS profile must HOLD")
    passwd_rows=parse_passwd_file(
        "root:x:0:0:root:/root:/bin/bash\n"
        "zoso:x:1000:1000:ZoSo:/home/zoso:/bin/bash\n"
        "voidapollyontrain:x:997:984::/nonexistent:/usr/sbin/nologin\n"
        "voidapollyoncustody:x:995:982::/nonexistent:/usr/sbin/nologin\n"
    )
    group_rows=parse_group_file(
        "root:x:0:\n"
        "zoso:x:1000:\n"
        "voidapollyontrain:x:984:\n"
        "voidapollyoncustody:x:982:\n"
        "voidapollyonipc:x:980:voidapollyoncustody\n"
    )
    assert existing_user("zoso",passwd_rows)["uid"]==1000
    assert existing_group("voidapollyonipc",group_rows)["gid"]==980
    require_user_absent("voidapollyonclaim",passwd_rows)
    require_group_absent("voidapollyonclaimipc",group_rows)
    try:
        choose_highest_free(100,101,{100,101},1)
    except Hold as exc:
        assert str(exc)=="candidate_selection_exhausted"
    else:
        raise AssertionError("candidate exhaustion must HOLD")
    sample={"b":2,"a":1}
    assert canonical(sample)=='{"a":1,"b":2}'
    assert git_blob_sha1(b"abc")==hashlib.sha1(b"blob 3\0abc").hexdigest()
    assert HASH64_RE.fullmatch("a"*64)
    assert PARENT_STORE_POLICY_ID==(
        "apollyon_claim_store_policy_v2:"
        "e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137"
    )
    assert len(set(TARGET_USERS))==len(TARGET_USERS)
    assert len(set(TARGET_GROUPS))==len(TARGET_GROUPS)
    assert CLAIM_SOCKET.parent==CLAIM_SOCKET_PARENT
    assert all(path.is_absolute() for path in TARGET_PATHS)
    assert AUTHORITY["filesystem_write"] is False
    assert AUTHORITY["local_git_metadata_read"] is True
    assert AUTHORITY["source_generation_authentication_required"] is True
    assert AUTHORITY["isolated_python_startup_required"] is True
    assert AUTHORITY["reviewed_source_head_external_lease_required"] is True
    assert AUTHORITY["service_action"] is False
    assert AUTHORITY["durable_attempt_claim"] is False
    assert AUTHORITY["training_execution"] is False
    print(MARKER+"_SELF_TEST_GREEN")
    print("read_only=true")
    print("fixed_identity_names_bound=true")
    print("fixed_paths_bound=true")
    print("candidate_slot_selection_deterministic=true")
    print("nsswitch_passwd_group_files_only_required=true")
    print("libc_nss_lookup_used=false")
    print("remote_nss_provider_rejected=true")
    print("identity_resolution_external_network_calls=false")
    print("candidate_slot_revalidation_required=true")
    print("root_host_process_census_required=true")
    print("host_pid_namespace_external_lease_required=true")
    print("host_user_namespace_external_lease_required=true")
    print("host_root_user_namespace_binding_required=true")
    print("all_uid_gid_slots_and_supplementary_groups_consumed=true")
    print("candidate_live_process_recensus_required_before_provisioning=true")
    print("candidate_slots_provisioning_ready=false")
    print("stable_store_policy_id_bound=true")
    print("source_generation_authentication_required=true")
    print("isolated_python_startup_required=true")
    print("reviewed_source_head_external_lease_required=true")
    print("host_installation_performed=false")
    print("durable_attempt_claim=false")
    print("training_execution=false")

def main()->int:
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test",action="store_true")
    mode.add_argument("--run",action="store_true")
    parser.add_argument("--expected-parent-head")
    parser.add_argument("--expected-source-head")
    parser.add_argument("--expected-host-pid-namespace-dev-ino")
    parser.add_argument("--expected-host-user-namespace-dev-ino")
    args=parser.parse_args()
    try:
        if args.self_test:
            self_test()
            return 0
        if args.expected_parent_head is None:
            hold("expected_parent_head_required")
        if args.expected_source_head is None:
            hold("expected_source_head_required")
        if args.expected_host_pid_namespace_dev_ino is None:
            hold("expected_host_pid_namespace_lease_required")
        if args.expected_host_user_namespace_dev_ino is None:
            hold("expected_host_user_namespace_lease_required")
        result=collect_plan(
            args.expected_parent_head,
            args.expected_source_head,
            args.expected_host_pid_namespace_dev_ino,
            args.expected_host_user_namespace_dev_ino,
        )
        sys.stdout.write(canonical(result)+"\n")
        return 0
    except Hold as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("read_only=true",file=sys.stderr)
        print("filesystem_write=false",file=sys.stderr)
        print("account_mutation=false",file=sys.stderr)
        print("systemd_mutation=false",file=sys.stderr)
        print("service_action=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())

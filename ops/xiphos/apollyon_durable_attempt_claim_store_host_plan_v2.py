#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import pwd
import grp
import re
import socket
import stat
import sys
from typing import Any

MARKER="VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2"
TARGET_HOST="Xiphos"
PARENT_HEAD="30183b8cd5f80d8c51fe069ce3d2a3dc08163ca0"
PARENT_CONTRACT_BLOB_SHA1="4bf474b8f282972b4dca4ab79eaf44260ce3ba54"

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
LOGIN_DEFS_PATH=Path("/etc/login.defs")
MACHINE_ID_RE=re.compile(r"^[0-9a-f]{32}$")
HASH64_RE=re.compile(r"^[0-9a-f]{64}$")

AUTHORITY={
    "source_contract":True,
    "designated_host_read_only_plan":True,
    "filesystem_read":True,
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

def require_user_absent(name:str)->None:
    try:
        pwd.getpwnam(name)
    except KeyError:
        return
    hold("target_user_preexists:"+name)

def require_group_absent(name:str)->None:
    try:
        grp.getgrnam(name)
    except KeyError:
        return
    hold("target_group_preexists:"+name)

def existing_user(name:str)->dict[str,Any]:
    try:
        row=pwd.getpwnam(name)
    except KeyError as exc:
        raise Hold("required_user_missing:"+name) from exc
    if row.pw_uid<=0 or row.pw_uid>65533 or row.pw_gid<=0 or row.pw_gid>65533:
        hold("required_user_identity_invalid:"+name)
    return {"name":name,"uid":row.pw_uid,"gid":row.pw_gid}

def existing_group(name:str)->dict[str,Any]:
    try:
        row=grp.getgrnam(name)
    except KeyError as exc:
        raise Hold("required_group_missing:"+name) from exc
    if row.gr_gid<=0 or row.gr_gid>65533:
        hold("required_group_identity_invalid:"+name)
    return {"name":name,"gid":row.gr_gid}

def machine_id_sha256()->str:
    try:
        text=MACHINE_ID_PATH.read_text(encoding="ascii").strip()
    except (OSError,UnicodeError) as exc:
        raise Hold("machine_id_unreadable") from exc
    if not MACHINE_ID_RE.fullmatch(text):
        hold("machine_id_invalid")
    return sha256_bytes(text.encode("ascii"))

def collect_plan(expected_parent_head:str)->dict[str,Any]:
    if expected_parent_head!=PARENT_HEAD:
        hold("expected_parent_head_mismatch")
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():
        hold("wrong_host")
    parents=[require_trusted_directory(path) for path in TRUSTED_EXISTING_PARENTS]
    for path in TARGET_PATHS:
        require_absent(path)
    for name in TARGET_USERS:
        require_user_absent(name)
    for name in TARGET_GROUPS:
        require_group_absent(name)

    training=existing_user(TRAINING_USER)
    custody=existing_user(CUSTODY_USER)
    runtime=existing_user(PUBLIC_RUNTIME_USER)
    operator=existing_user(INTERACTIVE_OPERATOR_USER)
    custody_ipc=existing_group(CUSTODY_IPC_GROUP)

    try:
        ranges=parse_login_defs(LOGIN_DEFS_PATH.read_text(encoding="utf-8"))
    except (OSError,UnicodeError) as exc:
        raise Hold("login_defs_unreadable") from exc

    all_users=pwd.getpwall()
    all_groups=grp.getgrall()
    used_uids={row.pw_uid for row in all_users if 0<=row.pw_uid<=65533}
    used_gids={row.gr_gid for row in all_groups if 0<=row.gr_gid<=65533}
    protected_numbers={
        training["uid"],training["gid"],custody["uid"],custody["gid"],
        runtime["uid"],runtime["gid"],operator["uid"],operator["gid"],
        custody_ipc["gid"],
    }
    globally_unavailable=used_uids|used_gids|protected_numbers|{0}
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
    material={
        "marker":MARKER,
        "version":2,
        "status":"xiphos_claim_store_preinstall_plan_ready",
        "target_host":TARGET_HOST,
        "machine_id_sha256":machine_id_sha256(),
        "parent_head":PARENT_HEAD,
        "parent_contract_blob_sha1":PARENT_CONTRACT_BLOB_SHA1,
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
        "system_id_ranges":ranges,
        "selected_candidates":candidates,
        "trusted_parent_directories":parents,
        "target_names_absent":True,
        "target_paths_absent":True,
        "candidate_slots_selected_in_plan":True,
        "candidate_slots_globally_distinct":True,
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
    assert len(set(TARGET_USERS))==len(TARGET_USERS)
    assert len(set(TARGET_GROUPS))==len(TARGET_GROUPS)
    assert CLAIM_SOCKET.parent==CLAIM_SOCKET_PARENT
    assert all(path.is_absolute() for path in TARGET_PATHS)
    assert AUTHORITY["filesystem_write"] is False
    assert AUTHORITY["service_action"] is False
    assert AUTHORITY["durable_attempt_claim"] is False
    assert AUTHORITY["training_execution"] is False
    print(MARKER+"_SELF_TEST_GREEN")
    print("read_only=true")
    print("fixed_identity_names_bound=true")
    print("fixed_paths_bound=true")
    print("candidate_slot_selection_deterministic=true")
    print("host_installation_performed=false")
    print("durable_attempt_claim=false")
    print("training_execution=false")

def main()->int:
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test",action="store_true")
    mode.add_argument("--run",action="store_true")
    parser.add_argument("--expected-parent-head")
    args=parser.parse_args()
    try:
        if args.self_test:
            self_test()
            return 0
        if args.expected_parent_head is None:
            hold("expected_parent_head_required")
        result=collect_plan(args.expected_parent_head)
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

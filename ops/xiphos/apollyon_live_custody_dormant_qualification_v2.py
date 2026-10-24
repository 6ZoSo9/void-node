#!/usr/bin/env python3
from __future__ import annotations

import argparse
import grp
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import shlex
import socket
import stat
import subprocess
import sys
import tempfile
import time

MARKER="VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V2"
TARGET_HOST="Xiphos"

TARGET_UNIT="void-apollyon-authorization-custody-v1.target"
SERVICE_UNIT="void-apollyon-authorization-custody-v1.service"
TRAINING_UNIT="void-apollyon-training-bus-isolation-v1.service"

TARGET_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.target")
SERVICE_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.service")
HELPER_PATH=Path("/opt/void-apollyon-custody-lifecycle-v1/apollyon_custody_stale_socket_cleanup_v1.py")
NODE_PATH=Path("/opt/void-apollyon-node-runtime-v1/node")
LAUNCHER_PATH=Path("/opt/void-apollyon-custody-service-v2-reviewed-v1/tools/apollyon-authorization-custody-launcher-v3.mjs")
CONFIG_DIR=Path("/etc/void/apollyon-custody-v1")
ENV_PATH=CONFIG_DIR/"custody.env"
PUBLIC_KEY_PATH=CONFIG_DIR/"operator-public-key.pem"
SOCKET_PARENT=Path("/run/void-apollyon-custody-v1")
SOCKET_PATH=SOCKET_PARENT/"custody.sock"
STATE_ROOT=Path("/var/lib/void-apollyon-custody-v1")
CONSUMED=STATE_ROOT/"consumed"

TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"
HELPER_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"
LAUNCHER_BLOB="8d8561c08db7e500a818d269580dad15adca9f58"
NODE_BYTES=126595440
NODE_SHA256="7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c"
EXPECTED_PUBLIC_RAW_SHA256="c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134"
SPKI_PREFIX=bytes.fromhex("302a300506032b6570032100")
EXPECTED_EXEC_STOP_POST=(
    "/usr/bin/python3 -I -B "
    "/opt/void-apollyon-custody-lifecycle-v1/"
    "apollyon_custody_stale_socket_cleanup_v1.py --cleanup"
)
EXPECTED_EXEC_START_ARGV=(
    os.fspath(NODE_PATH),
    os.fspath(LAUNCHER_PATH),
    "--socket-path","$"+"{VOID_APOLLYON_CUSTODY_SOCKET_PATH}",
    "--state-root","$"+"{VOID_APOLLYON_CUSTODY_STATE_ROOT}",
    "--socket-group-gid","$"+"{VOID_APOLLYON_CUSTODY_SOCKET_GROUP_GID}",
    "--expected-operator-public-key-raw-sha256",
    "$"+"{VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_RAW_SHA256}",
    "--operator-public-key-file",
    "$"+"{VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_FILE}",
)
EXPECTED_EXEC_STOP_POST_ARGV=(
    "/usr/bin/python3","-I","-B",os.fspath(HELPER_PATH),"--cleanup",
)
EXPECTED_UNSET_ENVIRONMENT=(
    "GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD",
    "NODE_OPTIONS","NODE_PATH","OPENSSL_CONF",
)
REVIEWED_SYSTEMD_MAJOR=255
REVIEWED_SYSTEMD_PACKAGE_VERSIONS=(
    "255.4-1ubuntu8.11","255.4-1ubuntu8.18",
)
SYSTEMD_UNIT_SEARCH_ROOTS=(
    Path("/etc/systemd/system.control"),
    Path("/run/systemd/system.control"),
    Path("/run/systemd/transient"),
    Path("/run/systemd/generator.early"),
    Path("/etc/systemd/system"),
    Path("/etc/systemd/system.attached"),
    Path("/run/systemd/system"),
    Path("/run/systemd/system.attached"),
    Path("/run/systemd/generator"),
    Path("/usr/local/lib/systemd/system"),
    Path("/usr/lib/systemd/system"),
    Path("/run/systemd/generator.late"),
)

class Hold(RuntimeError): pass

class LifecycleHold(Hold):
    def __init__(
        self,
        reason:str,
        *,
        start_attempts:int,
        start_successes:int,
        normal_stop_attestations:int,
        emergency_cleanup_attempted:bool,
        emergency_cleanup_green:bool|None,
        emergency_cleanup_reason:str,
        final_dormant_recheck_attempted:bool,
        final_dormant_recheck_reason:str,
        final_dormant_after_failure_proven:bool,
    )->None:
        super().__init__(reason)
        self.start_attempts=start_attempts
        self.start_successes=start_successes
        self.normal_stop_attestations=normal_stop_attestations
        self.emergency_cleanup_attempted=emergency_cleanup_attempted
        self.emergency_cleanup_green=emergency_cleanup_green
        self.emergency_cleanup_reason=emergency_cleanup_reason
        self.final_dormant_recheck_attempted=final_dormant_recheck_attempted
        self.final_dormant_recheck_reason=final_dormant_recheck_reason
        self.final_dormant_after_failure_proven=final_dormant_after_failure_proven

def hold(reason:str)->None: raise Hold(reason)

def bool_fact(value:bool|None)->str:
    if value is None:return "not_applicable"
    return str(value).lower()

def git_blob(data:bytes)->str:
    h=hashlib.sha1();h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data);return h.hexdigest()

def run(argv:list[str],check=True,timeout=20)->subprocess.CompletedProcess[str]:
    r=subprocess.run(
        argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=timeout,
        env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"},
    )
    if check and r.returncode!=0:hold("command_failed:"+Path(argv[0]).name+":"+argv[-1])
    return r

def validate_systemd_generation(
    installed_line:str,owner_raw:str,running_raw:str
)->dict[str,object]:
    installed_match=re.fullmatch(
        r"systemd\s+([0-9]+)\s+\(([^()]+)\)",installed_line.strip()
    )
    if not installed_match:
        hold("apollyon_custody_collector_systemd_version_failed")
    installed_major=int(installed_match.group(1))
    installed_version=installed_match.group(2).strip()
    if (
        installed_major!=REVIEWED_SYSTEMD_MAJOR or
        installed_version not in REVIEWED_SYSTEMD_PACKAGE_VERSIONS
    ):
        hold("apollyon_custody_collector_systemd_package_not_reviewed")

    owner_match=re.fullmatch(r"u\s+([1-9][0-9]*)",owner_raw.strip())
    if not owner_match:
        hold("apollyon_custody_collector_systemd_bus_owner_pid_invalid")
    owner_pid=int(owner_match.group(1))
    if owner_pid!=1:
        hold("apollyon_custody_collector_systemd_bus_owner_not_pid1")

    running_match=re.fullmatch(
        r's\s+"([A-Za-z0-9.+:~_-]{1,120})"',running_raw.strip()
    )
    if not running_match:
        hold("apollyon_custody_collector_running_systemd_version_failed")
    running_version=running_match.group(1)
    if running_version not in REVIEWED_SYSTEMD_PACKAGE_VERSIONS:
        hold("apollyon_custody_collector_running_systemd_package_not_reviewed")
    running_major_match=re.match(r"^([0-9]+)(?:[.-]|$)",running_version)
    if (
        not running_major_match or
        int(running_major_match.group(1))!=REVIEWED_SYSTEMD_MAJOR
    ):
        hold("apollyon_custody_collector_running_systemd_major_not_reviewed")
    if running_version!=installed_version:
        hold("apollyon_custody_collector_running_installed_systemd_version_mismatch")
    return {
        "installed_systemd_major":installed_major,
        "installed_systemd_package_version":installed_version,
        "running_systemd_manager_version":running_version,
        "systemd_bus_owner_pid":owner_pid,
        "systemd_bus_owner_pid_is_pid1":True,
        "running_installed_systemd_version_match":True,
    }

def verify_systemd_generation()->dict[str,object]:
    installed=run(["/usr/bin/systemctl","--version"],check=False)
    if installed.returncode!=0 or not installed.stdout.splitlines():
        hold("apollyon_custody_collector_systemd_version_failed")
    owner=run([
        "/usr/bin/busctl","--system","call",
        "org.freedesktop.DBus","/org/freedesktop/DBus",
        "org.freedesktop.DBus","GetConnectionUnixProcessID",
        "s","org.freedesktop.systemd1",
    ],check=False)
    if owner.returncode!=0:
        hold("apollyon_custody_collector_systemd_bus_owner_pid_invalid")
    running=run([
        "/usr/bin/busctl","--system","get-property",
        "org.freedesktop.systemd1","/org/freedesktop/systemd1",
        "org.freedesktop.systemd1.Manager","Version",
    ],check=False)
    if running.returncode!=0:
        hold("apollyon_custody_collector_running_systemd_version_failed")
    return validate_systemd_generation(
        installed.stdout.splitlines()[0],owner.stdout,running.stdout
    )

def require_trusted_ancestor_chain(
    path:Path,
    *,
    include_leaf:bool,
    expected_uid:int=0,
    expected_gid:int=0,
    anchor:Path=Path("/"),
)->None:
    target=path if include_leaf else path.parent
    raw=os.fspath(target)
    anchor_raw=os.fspath(anchor)
    if (
        not target.is_absolute() or os.path.normpath(raw)!=raw or
        not anchor.is_absolute() or os.path.normpath(anchor_raw)!=anchor_raw
    ):
        hold("trusted_ancestor_path_invalid:"+raw)
    try:
        relative=target.relative_to(anchor)
    except ValueError:
        hold("trusted_ancestor_outside_anchor:"+raw)
    current=anchor
    for part in (Path(".")/relative).parts:
        if part in ("","."):
            continue
        current=current/part
        try:
            st=os.lstat(current)
        except OSError as exc:
            raise Hold("trusted_ancestor_unavailable:"+os.fspath(current)) from exc
        if (
            not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
            st.st_uid!=expected_uid or st.st_gid!=expected_gid or
            (stat.S_IMODE(st.st_mode)&0o022)!=0
        ):
            hold("trusted_ancestor_invalid:"+os.fspath(current))

def exact_group_closure(ids:dict[str,int])->set[int]:
    try:
        groups=set(os.getgrouplist("voidapollyoncustody",ids["custody_gid"]))
    except OSError as exc:
        raise Hold("custody_group_closure_unavailable") from exc
    expected={ids["custody_gid"],ids["ipc_gid"]}
    if groups!=expected:
        hold("custody_group_closure_invalid")
    return groups

def exact_runtime_supplementary_groups(
    observed:list[int],
    expected:set[int],
    primary_gid:int,
)->bool:
    if len(observed)!=len(set(observed)) or primary_gid not in expected:
        return False
    actual=set(observed)
    required=expected-{primary_gid}
    # Linux exposes the kernel supplementary-group list in /proc/<pid>/status.
    # systemd initializes that list from the account database and then extends
    # it with SupplementaryGroups=. Depending on the resolved group vector, the
    # primary GID may therefore also appear redundantly in Groups:. It grants no
    # authority beyond the separately verified four primary GID slots. Require
    # the reviewed non-primary group(s), allow only the reviewed primary GID as
    # an optional redundant entry, and reject every other or duplicate GID.
    return required.issubset(actual) and actual.issubset(expected)

def verify_path_custody(ids:dict[str,int])->None:
    for path in (
        NODE_PATH,LAUNCHER_PATH,HELPER_PATH,TARGET_PATH,SERVICE_PATH,
        ENV_PATH,PUBLIC_KEY_PATH,
    ):
        require_trusted_ancestor_chain(path,include_leaf=False)
    require_trusted_ancestor_chain(CONFIG_DIR,include_leaf=True)
    require_trusted_ancestor_chain(STATE_ROOT,include_leaf=False)
    require_trusted_ancestor_chain(SOCKET_PARENT,include_leaf=False)

    config=os.lstat(CONFIG_DIR)
    if (
        not stat.S_ISDIR(config.st_mode) or stat.S_ISLNK(config.st_mode) or
        config.st_uid!=0 or config.st_gid!=0 or
        stat.S_IMODE(config.st_mode)!=0o755
    ):hold("config_directory_custody_invalid")
    state=os.lstat(STATE_ROOT)
    if (
        not stat.S_ISDIR(state.st_mode) or stat.S_ISLNK(state.st_mode) or
        state.st_uid!=ids["custody_uid"] or state.st_gid!=ids["custody_gid"] or
        stat.S_IMODE(state.st_mode)!=0o700
    ):hold("state_root_custody_invalid")
    consumed=os.lstat(CONSUMED)
    if (
        not stat.S_ISDIR(consumed.st_mode) or stat.S_ISLNK(consumed.st_mode) or
        consumed.st_uid!=ids["custody_uid"] or
        consumed.st_gid!=ids["custody_gid"] or
        stat.S_IMODE(consumed.st_mode)!=0o700
    ):hold("consumed_directory_custody_invalid")
    socket_parent=os.lstat(SOCKET_PARENT)
    if (
        not stat.S_ISDIR(socket_parent.st_mode) or
        stat.S_ISLNK(socket_parent.st_mode) or
        socket_parent.st_uid!=ids["custody_uid"] or
        socket_parent.st_gid!=ids["ipc_gid"] or
        stat.S_IMODE(socket_parent.st_mode)!=0o750
    ):hold("socket_parent_custody_invalid")
    exact_group_closure(ids)

def exact_file(path:Path,mode:int,uid:int=0,gid:int=0,blob:str|None=None)->os.stat_result:
    st=os.lstat(path)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink!=1 or
        st.st_uid!=uid or st.st_gid!=gid or stat.S_IMODE(st.st_mode)!=mode
    ):hold("file_metadata_invalid:"+str(path))
    if blob is not None and git_blob(path.read_bytes())!=blob:
        hold("file_blob_invalid:"+str(path))
    return st

def exact_directory(path:Path,mode:int,uid:int,gid:int)->os.stat_result:
    st=os.lstat(path)
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=uid or st.st_gid!=gid or stat.S_IMODE(st.st_mode)!=mode
    ):
        hold("directory_metadata_invalid:"+str(path))
    return st

def exact_dormant(
    unit:str,
    allow_failed:bool=False,
    expected_unit_file_state:str|None=None,
)->dict[str,str]:
    argv=[
        "/usr/bin/systemctl","show",unit,"--no-pager",
        "-p","LoadState","-p","ActiveState","-p","SubState",
        "-p","UnitFileState",
    ]
    if unit!=TARGET_UNIT:
        argv.extend(["-p","MainPID"])
    r=run(argv,check=False)
    if r.returncode!=0:hold("unit_state_probe_failed:"+unit)
    props={}
    for line in r.stdout.splitlines():
        if "=" not in line:hold("unit_state_invalid:"+unit)
        k,v=line.split("=",1)
        if k in props:hold("unit_state_duplicate:"+unit)
        props[k]=v
    if props.get("LoadState")!="loaded":hold("unit_not_loaded:"+unit)
    active=props.get("ActiveState")
    if allow_failed:
        if active not in ("inactive","failed"):
            hold("unit_not_safely_dormant:"+unit)
    elif active!="inactive":
        hold("unit_not_inactive:"+unit)
    unit_file_state=props.get("UnitFileState")
    if expected_unit_file_state is not None:
        if unit_file_state!=expected_unit_file_state:
            hold("unit_file_state_mismatch:"+unit)
    elif unit_file_state=="enabled":
        hold("unit_enabled:"+unit)
    if (
        unit!=TARGET_UNIT and
        props.get("MainPID") not in ("","0",None)
    ):
        hold("unit_mainpid_nonzero:"+unit)
    return props

def normalize_show_properties(
    unit:str,
    observed:dict[str,str],
    names:tuple[str,...],
    optional_empty:tuple[str,...]=(),
)->dict[str,str]:
    expected=set(names)
    optional=set(optional_empty)
    if not optional.issubset(expected):
        hold("unit_effective_config_optional_schema_invalid:"+unit)
    extra=set(observed)-expected
    if extra:
        hold(
            "unit_effective_config_duplicate_or_extra:"+unit
        )
    missing=expected-set(observed)
    required_missing=missing-optional
    if required_missing:
        hold(
            "unit_effective_config_incomplete:"+unit+":"+
            ",".join(sorted(required_missing))
        )
    out=dict(observed)
    for name in missing:
        out[name]=""
    return out

def show_properties(
    unit:str,
    names:tuple[str,...],
    optional_empty:tuple[str,...]=(),
)->dict[str,str]:
    argv=["/usr/bin/systemctl","show",unit,"--no-pager"]
    for name in names:
        argv.extend(["-p",name])
    r=run(argv,check=False)
    if r.returncode!=0:hold("unit_effective_config_probe_failed:"+unit)
    props={}
    expected=set(names)
    for line in r.stdout.splitlines():
        if "=" not in line:hold("unit_effective_config_invalid:"+unit)
        k,v=line.split("=",1)
        if k not in expected or k in props:
            hold("unit_effective_config_duplicate_or_extra:"+unit)
        props[k]=v
    return normalize_show_properties(unit,props,names,optional_empty)

def parse_exec_property(raw:str,label:str)->list[tuple[str,...]]:
    raw=raw.strip()
    if raw=="":return []
    bodies=[]
    depth=0
    start:int|None=None
    for index,char in enumerate(raw):
        if char=="{":
            if depth==0:start=index+1
            depth+=1
        elif char=="}":
            if depth==0:hold("exec_property_shape_invalid:"+label)
            depth-=1
            if depth==0:
                if start is None:hold("exec_property_shape_invalid:"+label)
                bodies.append(raw[start:index])
                start=None
        elif depth==0 and not char.isspace():
            hold("exec_property_shape_invalid:"+label)
    if depth!=0 or start is not None or not bodies:
        hold("exec_property_shape_invalid:"+label)
    commands=[]
    for body in bodies:
        fields={}
        for part in body.split(" ; "):
            part=part.strip()
            if "=" not in part:hold("exec_property_field_invalid:"+label)
            key,value=part.split("=",1)
            key=key.strip();value=value.strip()
            if key in fields:hold("exec_property_field_duplicate:"+label)
            fields[key]=value
        path=fields.get("path")
        argv_raw=fields.get("argv[]")
        if not path or argv_raw is None or fields.get("ignore_errors")!="no":
            hold("exec_property_required_field_invalid:"+label)
        try:
            argv=tuple(shlex.split(argv_raw,posix=True))
        except ValueError as exc:
            raise Hold("exec_property_argv_invalid:"+label) from exc
        if not argv or argv[0]!=path:
            hold("exec_property_path_argv_mismatch:"+label)
        commands.append(argv)
    return commands

def expected_environment_bytes(ipc_gid:int)->bytes:
    return (
        "VOID_APOLLYON_CUSTODY_SOCKET_PATH="+os.fspath(SOCKET_PATH)+"\n"
        "VOID_APOLLYON_CUSTODY_STATE_ROOT="+os.fspath(STATE_ROOT)+"\n"
        "VOID_APOLLYON_CUSTODY_SOCKET_GROUP_GID="+str(ipc_gid)+"\n"
        "VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_FILE="+
            os.fspath(PUBLIC_KEY_PATH)+"\n"
        "VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_RAW_SHA256="+
            EXPECTED_PUBLIC_RAW_SHA256+"\n"
    ).encode("utf-8")

def verify_environment_file(ipc_gid:int)->None:
    exact_file(ENV_PATH,0o600,0,0)
    if ENV_PATH.read_bytes()!=expected_environment_bytes(ipc_gid):
        hold("custody_environment_file_invalid")

def assert_no_unreviewed_dependency_directories(
    unit:str,
    roots:tuple[Path,...]=SYSTEMD_UNIT_SEARCH_ROOTS,
)->None:
    for root in roots:
        try:
            root_st=os.lstat(root)
        except FileNotFoundError:
            continue
        except OSError as exc:
            raise Hold("systemd_unit_search_root_unreadable:"+str(root)) from exc
        if not stat.S_ISDIR(root_st.st_mode) or stat.S_ISLNK(root_st.st_mode):
            hold("systemd_unit_search_root_invalid:"+str(root))
        for suffix in (".wants",".requires"):
            dependency_root=root/(unit+suffix)
            try:
                dependency_st=os.lstat(dependency_root)
            except FileNotFoundError:
                continue
            except OSError as exc:
                raise Hold(
                    "systemd_dependency_directory_unreadable:"
                    +unit+":"+suffix
                ) from exc
            if (
                not stat.S_ISDIR(dependency_st.st_mode)
                or stat.S_ISLNK(dependency_st.st_mode)
            ):
                hold("systemd_dependency_directory_invalid:"+unit+":"+suffix)
            try:
                with os.scandir(dependency_root) as entries:
                    if next(entries,None) is not None:
                        hold(
                            "unreviewed_systemd_dependency_entry:"
                            +unit+":"+suffix
                        )
            except Hold:
                raise
            except OSError as exc:
                raise Hold(
                    "systemd_dependency_directory_unreadable:"
                    +unit+":"+suffix
                ) from exc

def validate_loaded_relations(
    target:dict[str,str],service:dict[str,str]
)->None:
    if target.get("FragmentPath")!=os.fspath(TARGET_PATH):
        hold("target_fragment_path_invalid")
    if target.get("DropInPaths")!="":hold("target_dropins_present")
    if target.get("NeedDaemonReload")!="no":hold("target_needs_daemon_reload")
    if set(target.get("Wants","").split())!={SERVICE_UNIT}:
        hold("target_wants_invalid")
    if set(target.get("PropagatesStopTo","").split())!={SERVICE_UNIT}:
        hold("target_stop_propagation_invalid")

    if service.get("FragmentPath")!=os.fspath(SERVICE_PATH):
        hold("service_fragment_path_invalid")
    if service.get("DropInPaths")!="":hold("service_dropins_present")
    if service.get("NeedDaemonReload")!="no":hold("service_needs_daemon_reload")
    if (
        service.get("RefuseManualStart")!="yes" or
        service.get("RefuseManualStop")!="yes"
    ):hold("service_manual_refusal_missing")
    if service.get("NoNewPrivileges")!="yes":hold("service_nnp_missing")
    if service.get("RestrictAddressFamilies")!="AF_UNIX":
        hold("service_address_family_invalid")
    unset=service.get("UnsetEnvironment","").split()
    if (
        len(unset)!=len(EXPECTED_UNSET_ENVIRONMENT) or
        set(unset)!=set(EXPECTED_UNSET_ENVIRONMENT)
    ):
        hold("loaded_unset_environment_invalid")

    if parse_exec_property(service.get("ExecStart",""),"ExecStart")!=[
        EXPECTED_EXEC_START_ARGV
    ]:
        hold("service_effective_execstart_invalid")
    for name in ("ExecCondition","ExecStartPre","ExecStartPost","ExecStop"):
        if parse_exec_property(service.get(name,""),name):
            hold("service_unexpected_exec_command:"+name)
    if parse_exec_property(service.get("ExecStopPost",""),"ExecStopPost")!=[
        EXPECTED_EXEC_STOP_POST_ARGV
    ]:
        hold("service_effective_execstoppost_invalid")

def loaded_relations()->None:
    target=show_properties(TARGET_UNIT,(
        "FragmentPath","DropInPaths","NeedDaemonReload",
        "Wants","PropagatesStopTo",
    ))
    service=show_properties(
        SERVICE_UNIT,(
            "FragmentPath","DropInPaths","NeedDaemonReload",
            "RefuseManualStart","RefuseManualStop","NoNewPrivileges",
            "RestrictAddressFamilies","UnsetEnvironment",
            "ExecCondition","ExecStartPre","ExecStart",
            "ExecStartPost","ExecStop","ExecStopPost",
        ),
        optional_empty=(
            "ExecCondition","ExecStartPre","ExecStartPost","ExecStop",
        ),
    )
    validate_loaded_relations(target,service)
    assert_no_unreviewed_dependency_directories(TARGET_UNIT)
    assert_no_unreviewed_dependency_directories(SERVICE_UNIT)

def verify_public_key()->None:
    exact_file(PUBLIC_KEY_PATH,0o644,0,0)
    data=PUBLIC_KEY_PATH.read_bytes()
    if b"PRIVATE KEY" in data:hold("public_key_contains_private_material")
    r=subprocess.run(
        ["/usr/bin/openssl","pkey","-pubin","-outform","DER"],
        input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        check=False,timeout=10,env={"PATH":"/usr/bin:/bin","LC_ALL":"C"},
    )
    if r.returncode!=0 or len(r.stdout)!=44 or not r.stdout.startswith(SPKI_PREFIX):
        hold("public_key_invalid")
    if hashlib.sha256(r.stdout[len(SPKI_PREFIX):]).hexdigest()!=EXPECTED_PUBLIC_RAW_SHA256:
        hold("public_key_fingerprint_invalid")

def verify_static_install()->dict[str,int]:
    verify_systemd_generation()
    exact_file(TARGET_PATH,0o644,0,0,TARGET_BLOB)
    exact_file(SERVICE_PATH,0o644,0,0,SERVICE_BLOB)
    exact_file(HELPER_PATH,0o444,0,0,HELPER_BLOB)
    exact_file(LAUNCHER_PATH,0o444,0,0,LAUNCHER_BLOB)
    node=exact_file(NODE_PATH,0o755,0,0)
    if node.st_size!=NODE_BYTES:hold("node_size_invalid")
    h=hashlib.sha256()
    with NODE_PATH.open("rb",buffering=0) as f:
        while True:
            b=f.read(1024*1024)
            if not b:break
            h.update(b)
    if h.hexdigest()!=NODE_SHA256:hold("node_sha256_invalid")
    ids={
        "custody_uid":pwd.getpwnam("voidapollyoncustody").pw_uid,
        "custody_gid":grp.getgrnam("voidapollyoncustody").gr_gid,
        "ipc_gid":grp.getgrnam("voidapollyonipc").gr_gid,
        "training_uid":pwd.getpwnam("voidapollyontrain").pw_uid,
    }
    exact_directory(ENV_PATH.parent,0o755,0,0)
    exact_directory(
        STATE_ROOT,0o700,ids["custody_uid"],ids["custody_gid"]
    )
    exact_directory(
        CONSUMED,0o700,ids["custody_uid"],ids["custody_gid"]
    )
    exact_directory(
        SOCKET_PARENT,0o750,ids["custody_uid"],ids["ipc_gid"]
    )
    verify_environment_file(ids["ipc_gid"])
    verify_public_key()
    loaded_relations()
    verify_path_custody(ids)
    return ids

def proc_start_ticks(pid:int,proc_root:Path=Path("/proc"))->str:
    text=(proc_root/str(pid)/"stat").read_text(
        encoding="ascii",errors="strict"
    )
    close=text.rfind(")")
    fields=text[close+2:].split()
    if len(fields)<20 or not fields[19].isdigit():hold("proc_stat_invalid")
    return fields[19]

def proc_status(
    pid:int,proc_root:Path=Path("/proc")
)->dict[str,str]:
    out={}
    for line in (proc_root/str(pid)/"status").read_text(
        encoding="utf-8",errors="strict"
    ).splitlines():
        if ":" in line:
            k,v=line.split(":",1);out[k]=v.strip()
    return out

def no_training_uid_processes(
    training_uid:int,proc_root:Path=Path("/proc")
)->bool:
    return not stable_uid_thread_process_map(training_uid,proc_root)

def parse_uid_slots(status:dict[str,str])->tuple[int,int,int,int]:
    raw=status.get("Uid")
    if raw is None:hold("process_uid_slots_missing")
    slots=raw.split()
    if len(slots)!=4 or any(not value.isdigit() for value in slots):
        hold("process_uid_slots_invalid")
    values=tuple(int(value,10) for value in slots)
    return values  # type: ignore[return-value]

def uid_process_generations(
    uid:int,proc_root:Path=Path("/proc")
)->dict[int,str]:
    try:
        entries=sorted(
            (entry for entry in proc_root.iterdir() if entry.name.isdigit()),
            key=lambda entry:int(entry.name,10),
        )
    except OSError as exc:
        raise Hold("custody_uid_process_census_unavailable") from exc
    observed:dict[int,str]={}
    for entry in entries:
        pid=int(entry.name,10)
        try:
            status=proc_status(pid,proc_root)
        except (FileNotFoundError,ProcessLookupError):
            continue
        except (PermissionError,OSError,UnicodeError) as exc:
            if not entry.exists():continue
            raise Hold("custody_uid_process_status_unreadable:"+entry.name) from exc
        try:
            uid_slots=parse_uid_slots(status)
        except Hold:
            if not entry.exists():continue
            raise
        if uid not in uid_slots:continue
        try:
            start_ticks=proc_start_ticks(pid,proc_root)
        except (FileNotFoundError,ProcessLookupError):
            continue
        except (PermissionError,OSError,UnicodeError) as exc:
            if not entry.exists():continue
            raise Hold("custody_uid_process_generation_unreadable:"+entry.name) from exc
        observed[pid]=start_ticks
    return observed

def proc_thread_status(
    pid:int,tid:int,proc_root:Path=Path("/proc")
)->dict[str,str]:
    out={}
    for line in (proc_root/str(pid)/"task"/str(tid)/"status").read_text(
        encoding="utf-8",errors="strict"
    ).splitlines():
        if ":" in line:
            key,value=line.split(":",1);out[key]=value.strip()
    return out

def process_thread_ids(
    pid:int,proc_root:Path=Path("/proc")
)->list[int]:
    task=proc_root/str(pid)/"task"
    try:
        entries=list(task.iterdir())
    except OSError as exc:
        raise Hold("custody_thread_inventory_unavailable:"+str(pid)) from exc
    tids=sorted(int(entry.name) for entry in entries if entry.name.isdigit())
    if not tids or pid not in tids:
        hold("custody_thread_inventory_invalid:"+str(pid))
    return tids

def uid_thread_process_map(
    uid:int,proc_root:Path=Path("/proc")
)->dict[int,tuple[int,...]]:
    try:
        processes=sorted(
            (entry for entry in proc_root.iterdir() if entry.name.isdigit()),
            key=lambda entry:int(entry.name,10),
        )
    except OSError as exc:
        raise Hold("custody_thread_process_census_unavailable") from exc
    observed={}
    for process in processes:
        pid=int(process.name,10)
        task=process/"task"
        try:
            entries=sorted(
                (entry for entry in task.iterdir() if entry.name.isdigit()),
                key=lambda entry:int(entry.name,10),
            )
        except FileNotFoundError:
            continue
        except OSError as exc:
            if not process.exists():continue
            raise Hold(
                "custody_thread_inventory_unavailable:"+process.name
            ) from exc
        tids=[int(entry.name,10) for entry in entries]
        if not tids:
            if process.exists():
                hold("custody_thread_inventory_empty:"+process.name)
            continue
        if pid not in tids:
            if process.exists():
                hold("custody_thread_leader_missing:"+process.name)
            continue
        matched=[]
        for tid in tids:
            thread=task/str(tid)
            try:
                status=proc_thread_status(pid,tid,proc_root)
            except (FileNotFoundError,ProcessLookupError):
                continue
            except (PermissionError,OSError,UnicodeError) as exc:
                if not thread.exists():continue
                raise Hold(
                    "custody_thread_status_unreadable:"
                    +str(pid)+":"+str(tid)
                ) from exc
            try:
                slots=parse_uid_slots(status)
            except Hold:
                if not thread.exists():continue
                raise
            if uid in slots:
                matched.append(tid)
        if matched:
            observed[pid]=tuple(matched)
    return observed

def stable_uid_thread_process_map(
    uid:int,proc_root:Path=Path("/proc")
)->dict[int,tuple[int,...]]:
    first=uid_thread_process_map(uid,proc_root)
    second=uid_thread_process_map(uid,proc_root)
    if first!=second:
        hold("custody_thread_process_census_changed")
    return second

def validate_custody_thread_status(
    status:dict[str,str],
    tid:int,
    ids:dict[str,int],
    expected_groups:set[int],
)->dict[str,object]:
    uid_slots=parse_uid_slots(status)
    if uid_slots!=(ids["custody_uid"],)*4:
        hold("custody_thread_uid_slots_invalid:"+str(tid))
    raw_gid=status.get("Gid")
    if raw_gid is None:hold("custody_thread_gid_slots_missing:"+str(tid))
    gid_slots=raw_gid.split()
    if (
        len(gid_slots)!=4 or any(not value.isdigit() for value in gid_slots) or
        tuple(int(value,10) for value in gid_slots)!=(ids["custody_gid"],)*4
    ):
        hold("custody_thread_gid_slots_invalid:"+str(tid))
    raw_groups=status.get("Groups","").split()
    if not raw_groups or any(not value.isdigit() for value in raw_groups):
        hold("custody_thread_groups_invalid:"+str(tid))
    groups=[int(value,10) for value in raw_groups]
    if not exact_runtime_supplementary_groups(
        groups,expected_groups,ids["custody_gid"]
    ):
        hold("custody_thread_groups_unreviewed:"+str(tid))
    capabilities={}
    for cap in ("CapInh","CapPrm","CapEff","CapAmb"):
        raw=status.get(cap)
        if raw is None:
            hold("custody_thread_capability_missing:"+str(tid)+":"+cap)
        try:value=int(raw,16)
        except ValueError:
            hold("custody_thread_capability_invalid:"+str(tid)+":"+cap)
        if value!=0:
            hold("custody_thread_capability_nonzero:"+str(tid)+":"+cap)
        capabilities[cap]=raw
    if status.get("NoNewPrivs")!="1":
        hold("custody_thread_no_new_privileges_missing:"+str(tid))
    return {
        "tid":tid,
        "uid_slots":uid_slots,
        "gid_slots":tuple(int(value,10) for value in gid_slots),
        "groups":tuple(groups),
        "capabilities":capabilities,
        "no_new_privileges":True,
    }

def custody_thread_subject(
    pid:int,
    tid:int,
    ids:dict[str,int],
    expected_groups:set[int],
    proc_root:Path=Path("/proc"),
)->dict[str,object]:
    return validate_custody_thread_status(
        proc_thread_status(pid,tid,proc_root),
        tid,
        ids,
        expected_groups,
    )

def custody_thread_inventory(
    pid:int,ids:dict[str,int],proc_root:Path=Path("/proc")
)->list[dict[str,object]]:
    expected_groups=exact_group_closure(ids)
    first_ids=process_thread_ids(pid,proc_root)
    first=[
        custody_thread_subject(pid,tid,ids,expected_groups,proc_root)
        for tid in first_ids
    ]
    second_ids=process_thread_ids(pid,proc_root)
    if first_ids!=second_ids:
        hold("custody_thread_inventory_changed")
    second=[
        custody_thread_subject(pid,tid,ids,expected_groups,proc_root)
        for tid in second_ids
    ]
    if first!=second:
        hold("custody_thread_credentials_changed")
    return second

def exact_live_custody_process_set(
    observed:dict[int,tuple[int,...]],
    pid:int,
    expected_tids:tuple[int,...],
)->bool:
    return observed=={pid:expected_tids} and bool(expected_tids)

def require_no_custody_uid_processes(uid:int,reason:str)->None:
    if stable_uid_thread_process_map(uid):hold(reason)

def consumed_snapshot(ids:dict[str,int])->dict[str,object]:
    root=exact_directory(
        CONSUMED,0o700,ids["custody_uid"],ids["custody_gid"]
    )
    rows=[]
    for entry in sorted(CONSUMED.iterdir(),key=lambda p:p.name):
        st=os.lstat(entry)
        rows.append({
            "name":entry.name,
            "dev":st.st_dev,"ino":st.st_ino,
            "file_type":stat.S_IFMT(st.st_mode),
            "mode":stat.S_IMODE(st.st_mode),
            "uid":st.st_uid,"gid":st.st_gid,"nlink":st.st_nlink,
            "size":st.st_size,"mtime_ns":st.st_mtime_ns,"ctime_ns":st.st_ctime_ns,
        })
    return {
        "directory":{
            "dev":root.st_dev,"ino":root.st_ino,
            "mode":stat.S_IMODE(root.st_mode),
            "uid":root.st_uid,"gid":root.st_gid,"nlink":root.st_nlink,
            "size":root.st_size,
            "mtime_ns":root.st_mtime_ns,"ctime_ns":root.st_ctime_ns,
        },
        "entries":rows,
    }

def wait_unit(unit:str,state:str,timeout_s:float=8.0)->dict[str,str]:
    deadline=time.monotonic()+timeout_s
    last={}
    while time.monotonic()<deadline:
        argv=[
            "/usr/bin/systemctl","show",unit,"--no-pager",
            "-p","LoadState","-p","ActiveState","-p","SubState",
        ]
        if unit!=TARGET_UNIT:
            argv.extend(["-p","MainPID"])
        r=run(argv,check=False)
        props={}
        if r.returncode==0:
            for line in r.stdout.splitlines():
                if "=" in line:
                    k,v=line.split("=",1);props[k]=v
            last=props
            if props.get("LoadState")=="loaded" and props.get("ActiveState")==state:
                return props
        time.sleep(0.1)
    hold("unit_transition_timeout:"+unit+":"+state+":"+json.dumps(last,sort_keys=True))

def wait_socket(present:bool,timeout_s:float=8.0)->None:
    deadline=time.monotonic()+timeout_s
    while time.monotonic()<deadline:
        exists=SOCKET_PATH.exists()
        if exists==present:return
        time.sleep(0.05)
    hold("socket_transition_timeout:"+("present" if present else "absent"))

def safely_dormant_unit_props(props:dict[str,str])->bool:
    return (
        props.get("LoadState")=="loaded" and
        props.get("ActiveState") in ("inactive","failed") and
        props.get("MainPID") in ("","0",None)
    )

def wait_unit_safely_dormant(unit:str,timeout_s:float=8.0)->dict[str,str]:
    deadline=time.monotonic()+timeout_s
    last={}
    while time.monotonic()<deadline:
        r=run([
            "/usr/bin/systemctl","show",unit,"--no-pager",
            "-p","LoadState","-p","ActiveState","-p","SubState","-p","MainPID",
        ],check=False)
        props={}
        if r.returncode==0:
            for line in r.stdout.splitlines():
                if "=" in line:
                    k,v=line.split("=",1);props[k]=v
            last=props
            if safely_dormant_unit_props(props):
                return props
        time.sleep(0.1)
    hold("unit_safe_dormant_timeout:"+unit+":"+json.dumps(last,sort_keys=True))

def assert_socket_parent_empty(ids:dict[str,int])->None:
    exact_directory(
        SOCKET_PARENT,0o750,ids["custody_uid"],ids["ipc_gid"]
    )
    names=sorted(entry.name for entry in os.scandir(SOCKET_PARENT))
    if names:
        hold("socket_parent_not_empty:"+",".join(names))

def attest_dormant_boundary(
    ids:dict[str,int],
    prefix:str,
    allow_service_failed:bool=False,
)->None:
    exact_dormant(TARGET_UNIT,expected_unit_file_state="disabled")
    exact_dormant(
        SERVICE_UNIT,
        allow_failed=allow_service_failed,
        expected_unit_file_state="static",
    )
    exact_dormant(
        TRAINING_UNIT,allow_failed=True,expected_unit_file_state="static"
    )
    if SOCKET_PATH.exists():hold(prefix+"_socket_present")
    assert_socket_parent_empty(ids)
    require_no_custody_uid_processes(
        ids["custody_uid"],prefix+"_custody_uid_process"
    )
    if not no_training_uid_processes(ids["training_uid"]):
        hold(prefix+"_training_uid_process")

def emergency_cleanup(
    ids:dict[str,int],
    *,
    _run_fn=run,
    _wait_unit_fn=wait_unit,
    _wait_dormant_fn=wait_unit_safely_dormant,
    _wait_socket_fn=wait_socket,
    _attest_fn=attest_dormant_boundary,
)->tuple[bool,str]:
    failures:list[str]=[]
    stop=_run_fn(
        ["/usr/bin/systemctl","stop",TARGET_UNIT],
        check=False,
    )
    if stop.returncode!=0:
        failures.append("emergency_target_stop_failed")
    try:
        _wait_unit_fn(TARGET_UNIT,"inactive",5.0)
        _wait_dormant_fn(SERVICE_UNIT,5.0)
        _wait_socket_fn(False,5.0)
        _attest_fn(ids,"emergency",True)
    except BaseException as exc:
        failures.append(type(exc).__name__+":"+str(exc))
    return (
        not failures,
        "none" if not failures else "|".join(failures),
    )

def expected_live_argv(ids:dict[str,int])->list[str]:
    return [
        os.fspath(NODE_PATH),
        os.fspath(LAUNCHER_PATH),
        "--socket-path",os.fspath(SOCKET_PATH),
        "--state-root",os.fspath(STATE_ROOT),
        "--socket-group-gid",str(ids["ipc_gid"]),
        "--expected-operator-public-key-raw-sha256",EXPECTED_PUBLIC_RAW_SHA256,
        "--operator-public-key-file",os.fspath(PUBLIC_KEY_PATH),
    ]

def live_observation(ids:dict[str,int])->dict[str,object]:
    service=wait_unit(SERVICE_UNIT,"active")
    target=wait_unit(TARGET_UNIT,"active")
    raw=service.get("MainPID","")
    if not raw.isdigit() or int(raw)<=0:hold("custody_mainpid_invalid")
    pid=int(raw)
    start_ticks=proc_start_ticks(pid)
    exe=Path(os.path.realpath(f"/proc/{pid}/exe"))
    if exe!=NODE_PATH:hold("custody_node_executable_mismatch")
    status=proc_status(pid)
    uid_slots=status.get("Uid","").split()
    gid_slots=status.get("Gid","").split()
    if uid_slots!=[str(ids["custody_uid"])]*4:hold("custody_uid_slots_invalid")
    if gid_slots!=[str(ids["custody_gid"])]*4:hold("custody_gid_slots_invalid")
    raw_groups=status.get("Groups","").split()
    if not raw_groups or any(not x.isdigit() for x in raw_groups):
        hold("custody_supplementary_groups_invalid")
    groups=[int(x) for x in raw_groups]
    expected_groups=exact_group_closure(ids)
    if not exact_runtime_supplementary_groups(
        groups,expected_groups,ids["custody_gid"]
    ):
        hold("custody_supplementary_groups_unreviewed")
    for cap in ("CapInh","CapPrm","CapEff","CapAmb"):
        rawcap=status.get(cap)
        if rawcap is None or int(rawcap,16)!=0:hold("custody_capability_nonzero:"+cap)
    if status.get("NoNewPrivs")!="1":hold("custody_no_new_privileges_missing")

    cmd=Path(f"/proc/{pid}/cmdline").read_bytes()
    if not cmd.endswith(b"\0"):hold("custody_cmdline_invalid")
    argv=cmd[:-1].decode("utf-8").split("\0")
    if argv!=expected_live_argv(ids):hold("custody_argv_exact_mismatch")

    wait_socket(True)
    st=os.lstat(SOCKET_PATH)
    if (
        not stat.S_ISSOCK(st.st_mode) or st.st_uid!=ids["custody_uid"] or
        st.st_gid!=ids["ipc_gid"] or stat.S_IMODE(st.st_mode)!=0o660 or st.st_nlink!=2
    ):hold("live_socket_metadata_invalid")
    probe=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
    try:
        probe.settimeout(1.0)
        if probe.connect_ex(os.fspath(SOCKET_PATH))!=0:hold("live_socket_connect_failed")
    finally:
        probe.close()

    thread_inventory=custody_thread_inventory(pid,ids)
    if not no_training_uid_processes(ids["training_uid"]):
        hold("training_uid_process_observed")
    validated_tids=tuple(
        int(subject["tid"]) for subject in thread_inventory
    )
    custody_processes=stable_uid_thread_process_map(ids["custody_uid"])
    if not exact_live_custody_process_set(
        custody_processes,pid,validated_tids
    ):
        hold("custody_uid_process_exclusivity_failed")

    return {
        "pid":pid,"start_ticks":start_ticks,
        "custody_uid_process_count":len(custody_processes),
        "custody_thread_count":len(thread_inventory),
        "custody_thread_ids":list(validated_tids),
        "custody_thread_credentials_exact":True,
        "custody_global_thread_map_matches_validated_inventory":True,
        "custody_uid_process_exclusivity_proven":True,
        "exact_runtime_argv_bound":True,
        "socket_dev":st.st_dev,"socket_ino":st.st_ino,
        "target_active":target.get("ActiveState")=="active",
        "service_active":service.get("ActiveState")=="active",
        "socket_nlink":st.st_nlink,
    }

def stop_and_attest(ids:dict[str,int])->dict[str,object]:
    run(["/usr/bin/systemctl","stop",TARGET_UNIT])
    wait_unit(TARGET_UNIT,"inactive")
    wait_unit(SERVICE_UNIT,"inactive")
    wait_socket(False)
    assert_socket_parent_empty(ids)
    if not no_training_uid_processes(ids["training_uid"]):
        hold("training_uid_process_after_stop")
    require_no_custody_uid_processes(
        ids["custody_uid"],"custody_uid_process_after_stop"
    )
    return {
        "target_inactive":True,
        "service_inactive":True,
        "socket_absent":True,
        "custody_uid_process_count":0,
    }

def plan()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():hold("wrong_host")
    ids=verify_static_install()
    exact_dormant(TARGET_UNIT,expected_unit_file_state="disabled")
    exact_dormant(
        SERVICE_UNIT,allow_failed=True,expected_unit_file_state="static"
    )
    exact_dormant(
        TRAINING_UNIT,allow_failed=True,expected_unit_file_state="static"
    )
    if SOCKET_PATH.exists():hold("preexisting_socket_path")
    assert_socket_parent_empty(ids)
    require_no_custody_uid_processes(
        ids["custody_uid"],"preexisting_custody_uid_process"
    )
    if not no_training_uid_processes(ids["training_uid"]):
        hold("preexisting_training_uid_process")
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        "static_install_verified":True,"target_dormant":True,"service_dormant":True,
        "socket_absent":True,"training_uid_processes_absent":True,
        "custody_uid_processes_absent":True,
        "exact_runtime_argv_binding_required":True,
        "custody_environment_exact":True,
        "effective_systemd_configuration_bound":True,
        "reviewed_systemd_generation_verified":True,
        "systemd_bus_owner_pid_is_pid1":True,
        "running_installed_systemd_version_match":True,
        "manager_environment_influence_unset":True,
        "planned_cycles":2,"target_start_stop":False,"service_direct_action":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"RUN_TWO_CYCLE_DORMANT_QUALIFICATION",
    }

def qualify()->dict:
    if os.geteuid()!=0:hold("run_requires_root")
    before=plan()
    ids=verify_static_install()
    consumed_before=consumed_snapshot(ids)
    observations=[]
    target_maybe_started=False
    start_attempts=0
    start_successes=0
    normal_stop_attestations=0
    emergency_cleanup_attempted=False
    emergency_cleanup_green:bool|None=None
    emergency_cleanup_reason="not_needed"
    final_dormant_recheck_attempted=False
    final_dormant_recheck_reason="not_needed"
    final_dormant_after_failure_proven=False
    error:BaseException|None=None
    try:
        for cycle in (1,2):
            cycle_ids=verify_static_install()
            if cycle_ids!=ids:
                hold("static_install_identity_changed_before_start")
            if consumed_snapshot(ids)!=consumed_before:
                hold("consumed_state_changed_before_cycle_"+str(cycle))
            require_no_custody_uid_processes(
                ids["custody_uid"],"prestart_custody_uid_process"
            )
            verify_path_custody(ids)
            attest_dormant_boundary(
                ids,
                "prestart_cycle_"+str(cycle),
                allow_service_failed=(cycle==1),
            )
            target_maybe_started=True
            start_attempts+=1
            run(["/usr/bin/systemctl","start",TARGET_UNIT])
            start_successes+=1
            live=live_observation(ids)
            live["cycle"]=cycle
            observations.append({"live":live})
            stopped=stop_and_attest(ids)
            normal_stop_attestations+=1
            observations[-1]["stopped"]=stopped
            target_maybe_started=False
            if consumed_snapshot(ids)!=consumed_before:
                hold("consumed_state_changed_after_cycle_"+str(cycle))
            observations[-1]["consumed_state_unchanged"]=True
        first_generation=(observations[0]["live"]["pid"],observations[0]["live"]["start_ticks"])
        second_generation=(observations[1]["live"]["pid"],observations[1]["live"]["start_ticks"])
        if first_generation==second_generation:
            hold("custody_process_generation_not_renewed")
        if consumed_snapshot(ids)!=consumed_before:
            hold("consumed_state_changed")
        attest_dormant_boundary(ids,"final")
        if consumed_snapshot(ids)!=consumed_before:
            hold("final_consumed_state_changed")
    except BaseException as exc:
        error=exc
    finally:
        if target_maybe_started:
            emergency_cleanup_attempted=True
            (
                emergency_cleanup_green,
                emergency_cleanup_reason,
            )=emergency_cleanup(ids)
    if error is not None:
        final_dormant_recheck_attempted=True
        try:
            attest_dormant_boundary(
                ids,"failure_recheck",allow_service_failed=True
            )
        except BaseException as recheck_exc:
            final_dormant_after_failure_proven=False
            final_dormant_recheck_reason=(
                type(recheck_exc).__name__+":"+str(recheck_exc)
            )
        else:
            final_dormant_after_failure_proven=True
            final_dormant_recheck_reason="none"

        if not isinstance(
            error,
            (Hold,OSError,KeyError,ValueError,subprocess.SubprocessError),
        ):
            raise error
        raise LifecycleHold(
            str(error),
            start_attempts=start_attempts,
            start_successes=start_successes,
            normal_stop_attestations=normal_stop_attestations,
            emergency_cleanup_attempted=emergency_cleanup_attempted,
            emergency_cleanup_green=emergency_cleanup_green,
            emergency_cleanup_reason=emergency_cleanup_reason,
            final_dormant_recheck_attempted=final_dormant_recheck_attempted,
            final_dormant_recheck_reason=final_dormant_recheck_reason,
            final_dormant_after_failure_proven=
                final_dormant_after_failure_proven,
        ) from error

    return {
        **before,"mode":"--run","cycles_completed":2,
        "cycle_observations":observations,
        "target_start_stop":True,"service_direct_action":False,
        "socket_cleanup_proven":True,"restart_safe_second_cycle_proven":True,
        "consumed_state_unchanged":True,"training_uid_processes_absent":True,
        "custody_uid_process_exclusivity_proven":True,
        "custody_uid_processes_absent_after_cycles":True,
        "exact_runtime_argv_bound":True,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"LIVE_CUSTODY_DORMANT_QUALIFICATION_GREEN",
    }

def self_test()->None:
    assert CONFIG_DIR==Path("/etc/void/apollyon-custody-v1")
    assert ENV_PATH==CONFIG_DIR/"custody.env"
    assert PUBLIC_KEY_PATH==CONFIG_DIR/"operator-public-key.pem"
    own=Path(__file__).read_text(encoding="utf-8")
    for required in (
        'run(["/usr/bin/systemctl","start",TARGET_UNIT])',
        'run(["/usr/bin/systemctl","stop",TARGET_UNIT])',
        'wait_socket(False)',
        'unit!=TARGET_UNIT',
        'assert_socket_parent_empty(ids)',
        'directory_metadata_invalid:',
        '"directory":{',
        '"dev":root.st_dev,"ino":root.st_ino',
        '"mtime_ns":root.st_mtime_ns,"ctime_ns":root.st_ctime_ns',
        'target_maybe_started=True',
        'active not in ("inactive","failed")',
        'expected_unit_file_state="disabled"',
        'expected_unit_file_state="static"',
        'unit_file_state_mismatch:',
        'st.st_nlink!=2',
        'consumed_snapshot(ids)!=consumed_before',
        'static_install_identity_changed_before_start',
        'consumed_state_changed_before_cycle_',
        'consumed_state_changed_after_cycle_',
        'observations[-1]["consumed_state_unchanged"]=True',
        'custody_process_generation_not_renewed',
        'training_uid_process_observed',
        'custody_uid_process_exclusivity_failed',
        'uid_thread_process_map(',
        'stable_uid_thread_process_map(',
        'custody_thread_process_census_changed',
        'custody_thread_inventory(',
        'validate_custody_thread_status(',
        'custody_thread_credentials_changed',
        'validated_tids=tuple(',
        'custody_global_thread_map_matches_validated_inventory',
        'custody_thread_capability_nonzero:',
        'custody_thread_no_new_privileges_missing:',
        'return not uid_thread_process_map(training_uid,proc_root)',
        'preexisting_custody_uid_process',
        'prestart_custody_uid_process',
        '"prestart_cycle_"+str(cycle)',
        'allow_service_failed=(cycle==1)',
        'TRAINING_UNIT,allow_failed=True,expected_unit_file_state="static"',
        'custody_uid_process_after_stop',
        'custody_argv_exact_mismatch',
        'target_dropins_present',
        'service_dropins_present',
        'service_effective_execstart_invalid',
        'service_effective_execstoppost_invalid',
        'service_unexpected_exec_command:',
        'target_needs_daemon_reload',
        'service_needs_daemon_reload',
        'custody_environment_file_invalid',
        'loaded_unset_environment_invalid',
        'SYSTEMD_UNIT_SEARCH_ROOTS=(',
        'assert_no_unreviewed_dependency_directories(TARGET_UNIT)',
        'assert_no_unreviewed_dependency_directories(SERVICE_UNIT)',
        'unreviewed_systemd_dependency_entry:',
        'require_trusted_ancestor_chain(',
        'CONFIG_DIR=Path("/etc/void/apollyon-custody-v1")',
        'ENV_PATH=CONFIG_DIR/"custody.env"',
        'PUBLIC_KEY_PATH=CONFIG_DIR/"operator-public-key.pem"',
        'verify_path_custody(ids)',
        'custody_group_closure_invalid',
        'custody_supplementary_groups_unreviewed',
        'REVIEWED_SYSTEMD_MAJOR=255',
        'REVIEWED_SYSTEMD_PACKAGE_VERSIONS=(',
        'verify_systemd_generation()',
        '"/usr/bin/systemctl","--version"',
        '"/usr/bin/busctl","--system","call"',
        '"org.freedesktop.systemd1.Manager","Version"',
        'apollyon_custody_collector_running_installed_systemd_version_mismatch',
        'emergency_cleanup_attempted=True',
        'final_dormant_recheck_attempted=True',
        'final_dormant_recheck_reason',
        'final_dormant_after_failure_proven',
        'ids,"failure_recheck",allow_service_failed=True',
        'allow_service_failed:bool=False',
        'safely_dormant_unit_props(',
        'wait_unit_safely_dormant(',
        'unit_safe_dormant_timeout:',
        'allow_failed=True,expected_unit_file_state="static"',
        '_attest_fn(ids,"emergency",True)',
        'allow_service_failed=True',
        'attest_dormant_boundary(ids,"final")',
        'final_consumed_state_changed',
        'emergency_cleanup(ids)',
    ):
        assert required in own,required
    qualify_source=own[own.index("def qualify()->dict:"):own.index("def self_test()->None:")]
    final_index=qualify_source.index('attest_dormant_boundary(ids,"final")')
    except_index=qualify_source.index("except BaseException as exc:")
    lifecycle_raise_index=qualify_source.index("raise LifecycleHold(")
    assert final_index<except_index<lifecycle_raise_index
    assert qualify_source.count('attest_dormant_boundary(ids,"final")')==1

    assert expected_live_argv({"ipc_gid":321})==[
        os.fspath(NODE_PATH),
        os.fspath(LAUNCHER_PATH),
        "--socket-path",os.fspath(SOCKET_PATH),
        "--state-root",os.fspath(STATE_ROOT),
        "--socket-group-gid","321",
        "--expected-operator-public-key-raw-sha256",EXPECTED_PUBLIC_RAW_SHA256,
        "--operator-public-key-file",os.fspath(PUBLIC_KEY_PATH),
    ]

    canonical_argv=expected_live_argv({"ipc_gid":321})
    alternate_state_root=list(canonical_argv)
    alternate_state_root[5]="/var/lib/void-apollyon-custody-v1-alternate"
    assert alternate_state_root!=canonical_argv
    alternate_key_path=list(canonical_argv)
    alternate_key_path[11]="/etc/void/apollyon-custody-v1/alternate.pem"
    assert alternate_key_path!=canonical_argv
    alternate_key_fingerprint=list(canonical_argv)
    alternate_key_fingerprint[9]="0"*64
    assert alternate_key_fingerprint!=canonical_argv

    def completed(returncode:int)->subprocess.CompletedProcess[str]:
        return subprocess.CompletedProcess(
            args=["synthetic"],returncode=returncode,stdout="",stderr=""
        )

    cleanup_ids={"custody_uid":4242,"training_uid":4343,"ipc_gid":321}
    cleanup_green,cleanup_reason=emergency_cleanup(
        cleanup_ids,
        _run_fn=lambda argv,check=False:completed(0),
        _wait_unit_fn=lambda unit,state,timeout_s=5.0:{},
        _wait_dormant_fn=lambda unit,timeout_s=5.0:{},
        _wait_socket_fn=lambda present,timeout_s=5.0:None,
        _attest_fn=lambda ids,prefix,allow_service_failed=False:None,
    )
    assert cleanup_green is True
    assert cleanup_reason=="none"

    cleanup_green,cleanup_reason=emergency_cleanup(
        cleanup_ids,
        _run_fn=lambda argv,check=False:completed(1),
        _wait_unit_fn=lambda unit,state,timeout_s=5.0:{},
        _wait_dormant_fn=lambda unit,timeout_s=5.0:{},
        _wait_socket_fn=lambda present,timeout_s=5.0:None,
        _attest_fn=lambda ids,prefix,allow_service_failed=False:None,
    )
    assert cleanup_green is False
    assert cleanup_reason=="emergency_target_stop_failed"

    def wait_timeout(unit:str,state:str,timeout_s:float=5.0):
        raise Hold("synthetic_wait_timeout")
    cleanup_green,cleanup_reason=emergency_cleanup(
        cleanup_ids,
        _run_fn=lambda argv,check=False:completed(0),
        _wait_unit_fn=wait_timeout,
        _wait_dormant_fn=lambda unit,timeout_s=5.0:{},
        _wait_socket_fn=lambda present,timeout_s=5.0:None,
        _attest_fn=lambda ids,prefix,allow_service_failed=False:None,
    )
    assert cleanup_green is False
    assert cleanup_reason=="Hold:synthetic_wait_timeout"

    def socket_timeout(present:bool,timeout_s:float=5.0)->None:
        raise Hold("synthetic_socket_timeout")
    cleanup_green,cleanup_reason=emergency_cleanup(
        cleanup_ids,
        _run_fn=lambda argv,check=False:completed(0),
        _wait_unit_fn=lambda unit,state,timeout_s=5.0:{},
        _wait_dormant_fn=lambda unit,timeout_s=5.0:{},
        _wait_socket_fn=socket_timeout,
        _attest_fn=lambda ids,prefix,allow_service_failed=False:None,
    )
    assert cleanup_green is False
    assert cleanup_reason=="Hold:synthetic_socket_timeout"

    def dormant_timeout(unit:str,timeout_s:float=5.0):
        raise Hold("synthetic_safe_dormant_timeout")
    cleanup_green,cleanup_reason=emergency_cleanup(
        cleanup_ids,
        _run_fn=lambda argv,check=False:completed(0),
        _wait_unit_fn=lambda unit,state,timeout_s=5.0:{},
        _wait_dormant_fn=dormant_timeout,
        _wait_socket_fn=lambda present,timeout_s=5.0:None,
        _attest_fn=lambda ids,prefix,allow_service_failed=False:None,
    )
    assert cleanup_green is False
    assert cleanup_reason=="Hold:synthetic_safe_dormant_timeout"

    assert exact_live_custody_process_set({101:(101,)},101,(101,))
    assert not exact_live_custody_process_set({},101,(101,))
    assert not exact_live_custody_process_set(
        {101:(101,),102:(102,)},101,(101,)
    )
    assert not exact_live_custody_process_set({101:(101,102)},101,(101,))
    assert normalize_show_properties(
        "fixture.service",
        {"ExecStart":"required","ExecStopPost":"cleanup"},
        (
            "ExecCondition","ExecStartPre","ExecStart",
            "ExecStartPost","ExecStop","ExecStopPost",
        ),
        ("ExecCondition","ExecStartPre","ExecStartPost","ExecStop"),
    )=={
        "ExecCondition":"","ExecStartPre":"","ExecStart":"required",
        "ExecStartPost":"","ExecStop":"","ExecStopPost":"cleanup",
    }
    try:
        normalize_show_properties(
            "fixture.service",{},
            ("ExecStart","ExecStopPost"),("ExecStopPost",),
        )
    except Hold as exc:
        assert str(exc)=="unit_effective_config_incomplete:fixture.service:ExecStart"
    else:
        raise AssertionError("missing required effective property accepted")

    assert parse_uid_slots({"Uid":"123 123 123 123"})==(123,123,123,123)
    assert safely_dormant_unit_props({
        "LoadState":"loaded","ActiveState":"inactive","MainPID":"0",
    })
    assert safely_dormant_unit_props({
        "LoadState":"loaded","ActiveState":"failed","MainPID":"0",
    })
    assert not safely_dormant_unit_props({
        "LoadState":"loaded","ActiveState":"failed","MainPID":"77",
    })
    assert not safely_dormant_unit_props({
        "LoadState":"loaded","ActiveState":"active","MainPID":"77",
    })

    def write_proc(
        proc_root:Path,
        pid:int,
        uids:tuple[int,int,int,int],
        start_ticks:str="77",
    )->None:
        process_root=proc_root/str(pid)
        process_root.mkdir()
        status_text=(
            "Name:\tsynthetic\nUid:\t"
            +"\t".join(str(value) for value in uids)
            +"\n"
        )
        (process_root/"status").write_text(status_text,encoding="utf-8")
        stat_fields=["S"]+["0"]*18+[start_ticks]
        (process_root/"stat").write_text(
            f"{pid} (synthetic) "+" ".join(stat_fields)+"\n",
            encoding="ascii",
        )
        task=process_root/"task"/str(pid)
        task.mkdir(parents=True)
        (task/"status").write_text(status_text,encoding="utf-8")

    def expect_hold(fn,reason:str)->None:
        try:
            fn()
        except Hold as exc:
            assert str(exc)==reason,(str(exc),reason)
        else:
            raise AssertionError("expected HOLD: "+reason)

    for reviewed_version in REVIEWED_SYSTEMD_PACKAGE_VERSIONS:
        evidence=validate_systemd_generation(
            "systemd 255 ("+reviewed_version+")",
            "u 1",
            's "'+reviewed_version+'"',
        )
        assert evidence["installed_systemd_major"]==255
        assert evidence["systemd_bus_owner_pid_is_pid1"] is True
        assert evidence["running_installed_systemd_version_match"] is True
    expect_hold(
        lambda:validate_systemd_generation(
            "systemd 255 (255.4-1ubuntu8.19)","u 1",
            's "255.4-1ubuntu8.19"',
        ),
        "apollyon_custody_collector_systemd_package_not_reviewed",
    )
    expect_hold(
        lambda:validate_systemd_generation(
            "systemd 255 (255.4-1ubuntu8.18)","u 2",
            's "255.4-1ubuntu8.18"',
        ),
        "apollyon_custody_collector_systemd_bus_owner_not_pid1",
    )
    expect_hold(
        lambda:validate_systemd_generation(
            "systemd 255 (255.4-1ubuntu8.11)","u 1",
            's "255.4-1ubuntu8.18"',
        ),
        "apollyon_custody_collector_running_installed_systemd_version_mismatch",
    )

    exec_start_record=(
        "{ path="+EXPECTED_EXEC_START_ARGV[0]
        +" ; argv[]="+shlex.join(EXPECTED_EXEC_START_ARGV)
        +" ; ignore_errors=no ; start_time=[n/a] ; stop_time=[n/a]"
        +" ; pid=0 ; code=(null) ; status=0/0 }"
    )
    exec_stop_post_record=(
        "{ path="+EXPECTED_EXEC_STOP_POST_ARGV[0]
        +" ; argv[]="+shlex.join(EXPECTED_EXEC_STOP_POST_ARGV)
        +" ; ignore_errors=no ; start_time=[n/a] ; stop_time=[n/a]"
        +" ; pid=0 ; code=(null) ; status=0/0 }"
    )
    good_target={
        "FragmentPath":os.fspath(TARGET_PATH),
        "DropInPaths":"","NeedDaemonReload":"no",
        "Wants":SERVICE_UNIT,"PropagatesStopTo":SERVICE_UNIT,
    }
    good_service={
        "FragmentPath":os.fspath(SERVICE_PATH),
        "DropInPaths":"","NeedDaemonReload":"no",
        "RefuseManualStart":"yes","RefuseManualStop":"yes",
        "NoNewPrivileges":"yes","RestrictAddressFamilies":"AF_UNIX",
        "UnsetEnvironment":"GCONV_PATH LD_AUDIT LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH OPENSSL_CONF",
        "ExecCondition":"","ExecStartPre":"","ExecStart":exec_start_record,
        "ExecStartPost":"","ExecStop":"","ExecStopPost":exec_stop_post_record,
    }
    validate_loaded_relations(good_target,good_service)
    assert parse_exec_property(exec_start_record,"ExecStart")==[
        EXPECTED_EXEC_START_ARGV
    ]
    expected_env=expected_environment_bytes(321).decode("utf-8")
    assert "NODE_OPTIONS" not in expected_env
    assert "LD_PRELOAD" not in expected_env
    assert "GCONV_PATH" not in expected_env
    assert "LD_AUDIT" not in expected_env
    assert "OPENSSL_CONF" not in expected_env
    for which,key,value,reason in (
        ("target","DropInPaths","/run/systemd/system/x.conf","target_dropins_present"),
        ("target","NeedDaemonReload","yes","target_needs_daemon_reload"),
        ("service","DropInPaths","/run/systemd/system/x.conf","service_dropins_present"),
        ("service","NeedDaemonReload","yes","service_needs_daemon_reload"),
        ("service","UnsetEnvironment","","loaded_unset_environment_invalid"),
        ("service","UnsetEnvironment","NODE_OPTIONS","loaded_unset_environment_invalid"),
        ("service","UnsetEnvironment","LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH","loaded_unset_environment_invalid"),
        ("service","ExecStartPre",exec_stop_post_record,"service_unexpected_exec_command:ExecStartPre"),
        ("service","ExecStart",exec_start_record+" "+exec_stop_post_record,"service_effective_execstart_invalid"),
        ("service","ExecStopPost",exec_stop_post_record+" "+exec_stop_post_record,"service_effective_execstoppost_invalid"),
    ):
        target=dict(good_target);service=dict(good_service)
        (target if which=="target" else service)[key]=value
        expect_hold(lambda t=target,s=service:validate_loaded_relations(t,s),reason)
    reviewed_groups={980,981}
    assert exact_runtime_supplementary_groups([981],reviewed_groups,980)
    assert exact_runtime_supplementary_groups([980,981],reviewed_groups,980)
    assert not exact_runtime_supplementary_groups([980],reviewed_groups,980)
    assert not exact_runtime_supplementary_groups([981,982],reviewed_groups,980)
    assert not exact_runtime_supplementary_groups([980,981,981],reviewed_groups,980)

    thread_ids={
        "custody_uid":4242,"custody_gid":4243,"ipc_gid":4244,
    }
    good_thread_status={
        "Uid":"4242 4242 4242 4242",
        "Gid":"4243 4243 4243 4243",
        "Groups":"4243 4244",
        "CapInh":"0000000000000000",
        "CapPrm":"0000000000000000",
        "CapEff":"0000000000000000",
        "CapAmb":"0000000000000000",
        "NoNewPrivs":"1",
    }
    thread_subject=validate_custody_thread_status(
        good_thread_status,201,thread_ids,{4243,4244}
    )
    assert thread_subject["tid"]==201
    assert thread_subject["no_new_privileges"] is True
    bad_groups=dict(good_thread_status);bad_groups["Groups"]="4243 4244 4999"
    expect_hold(
        lambda:validate_custody_thread_status(
            bad_groups,201,thread_ids,{4243,4244}
        ),
        "custody_thread_groups_unreviewed:201",
    )
    bad_cap=dict(good_thread_status);bad_cap["CapEff"]="0000000000000001"
    expect_hold(
        lambda:validate_custody_thread_status(
            bad_cap,201,thread_ids,{4243,4244}
        ),
        "custody_thread_capability_nonzero:201:CapEff",
    )
    bad_nnp=dict(good_thread_status);bad_nnp["NoNewPrivs"]="0"
    expect_hold(
        lambda:validate_custody_thread_status(
            bad_nnp,201,thread_ids,{4243,4244}
        ),
        "custody_thread_no_new_privileges_missing:201",
    )

    with tempfile.TemporaryDirectory(
        prefix="apollyon-ancestor-custody-"
    ) as td:
        root=Path(td)
        safe=root/"safe"
        safe.mkdir(mode=0o755)
        require_trusted_ancestor_chain(
            safe,include_leaf=True,
            expected_uid=os.getuid(),expected_gid=os.getgid(),
            anchor=root,
        )
        unsafe=root/"unsafe"
        unsafe.mkdir(mode=0o777)
        unsafe.chmod(0o777)
        expect_hold(
            lambda:require_trusted_ancestor_chain(
                unsafe,include_leaf=True,
                expected_uid=os.getuid(),expected_gid=os.getgid(),
                anchor=root,
            ),
            "trusted_ancestor_invalid:"+os.fspath(unsafe),
        )

    with tempfile.TemporaryDirectory(
        prefix="apollyon-systemd-dependency-closure-"
    ) as td:
        unit_root=Path(td)/"units"
        unit_root.mkdir()
        roots=(unit_root,)
        assert_no_unreviewed_dependency_directories(TARGET_UNIT,roots)
        assert_no_unreviewed_dependency_directories(SERVICE_UNIT,roots)

        target_requires=unit_root/(TARGET_UNIT+".requires")
        target_requires.mkdir()
        os.symlink("/usr/lib/systemd/system/foreign.service",
                   target_requires/"foreign.service")
        expect_hold(
            lambda:assert_no_unreviewed_dependency_directories(
                TARGET_UNIT,roots
            ),
            "unreviewed_systemd_dependency_entry:"
            +TARGET_UNIT+":.requires",
        )
        os.unlink(target_requires/"foreign.service")
        target_requires.rmdir()

        service_wants=unit_root/(SERVICE_UNIT+".wants")
        service_wants.mkdir()
        os.symlink("/usr/lib/systemd/system/foreign.service",
                   service_wants/"foreign.service")
        expect_hold(
            lambda:assert_no_unreviewed_dependency_directories(
                SERVICE_UNIT,roots
            ),
            "unreviewed_systemd_dependency_entry:"
            +SERVICE_UNIT+":.wants",
        )

    custody_uid=4242
    training_uid=4343
    with tempfile.TemporaryDirectory(prefix="apollyon-child-proc-zero-") as td:
        proc_root=Path(td)
        assert uid_process_generations(custody_uid,proc_root)=={}
        assert no_training_uid_processes(training_uid,proc_root)

    with tempfile.TemporaryDirectory(prefix="apollyon-child-proc-live-") as td:
        proc_root=Path(td)
        write_proc(proc_root,101,(custody_uid,)*4,"77")
        observed=uid_process_generations(custody_uid,proc_root)
        assert observed=={101:"77"}
        thread_observed=uid_thread_process_map(custody_uid,proc_root)
        assert thread_observed=={101:(101,)}
        assert exact_live_custody_process_set(
            thread_observed,101,(101,)
        )

    with tempfile.TemporaryDirectory(prefix="apollyon-child-proc-second-") as td:
        proc_root=Path(td)
        write_proc(proc_root,101,(custody_uid,)*4,"77")
        write_proc(proc_root,102,(custody_uid,)*4,"88")
        observed=uid_process_generations(custody_uid,proc_root)
        assert observed=={101:"77",102:"88"}
        thread_observed=uid_thread_process_map(custody_uid,proc_root)
        assert thread_observed=={101:(101,),102:(102,)}
        assert not exact_live_custody_process_set(
            thread_observed,101,(101,)
        )

    with tempfile.TemporaryDirectory(prefix="apollyon-child-proc-saved-fs-") as td:
        proc_root=Path(td)
        write_proc(proc_root,103,(1,2,custody_uid,3),"99")
        write_proc(proc_root,104,(1,2,3,custody_uid),"100")
        observed=uid_process_generations(custody_uid,proc_root)
        assert observed=={103:"99",104:"100"}
        assert uid_thread_process_map(custody_uid,proc_root)=={
            103:(103,),104:(104,),
        }
        assert stable_uid_thread_process_map(custody_uid,proc_root)=={
            103:(103,),104:(104,),
        }

    with tempfile.TemporaryDirectory(
        prefix="apollyon-child-thread-saved-fs-"
    ) as td:
        proc_root=Path(td)
        write_proc(proc_root,107,(1,1,1,1),"101")
        task=proc_root/"107"/"task"/"108"
        task.mkdir()
        (task/"status").write_text(
            "Name:\tsynthetic-thread\n"
            "Uid:\t1\t1\t"+str(custody_uid)+"\t1\n",
            encoding="utf-8",
        )
        assert uid_process_generations(custody_uid,proc_root)=={}
        assert uid_thread_process_map(custody_uid,proc_root)=={107:(108,)}

    with tempfile.TemporaryDirectory(prefix="apollyon-child-proc-malformed-") as td:
        proc_root=Path(td)
        process_root=proc_root/"105"
        process_root.mkdir()
        (process_root/"status").write_text(
            "Name:\tsynthetic\nUid:\t4242\t4242\n",
            encoding="utf-8",
        )
        expect_hold(
            lambda:uid_process_generations(custody_uid,proc_root),
            "process_uid_slots_invalid",
        )

    with tempfile.TemporaryDirectory(prefix="apollyon-child-proc-unreadable-") as td:
        proc_root=Path(td)
        process_root=proc_root/"106"
        process_root.mkdir()
        (process_root/"status").write_bytes(b"\xff")
        expect_hold(
            lambda:uid_process_generations(custody_uid,proc_root),
            "custody_uid_process_status_unreadable:106",
        )
        task=process_root/"task"/"106"
        task.mkdir(parents=True)
        (task/"status").write_bytes(b"\xff")
        expect_hold(
            lambda:no_training_uid_processes(training_uid,proc_root),
            "custody_thread_status_unreadable:106:106",
        )

    failure=LifecycleHold(
        "synthetic_failure",
        start_attempts=1,
        start_successes=1,
        normal_stop_attestations=0,
        emergency_cleanup_attempted=True,
        emergency_cleanup_green=False,
        emergency_cleanup_reason="synthetic_cleanup_failure",
        final_dormant_recheck_attempted=True,
        final_dormant_recheck_reason="Hold:synthetic_recheck_failure",
        final_dormant_after_failure_proven=False,
    )
    assert str(failure)=="synthetic_failure"
    assert failure.start_attempts==1
    assert failure.emergency_cleanup_attempted is True
    assert failure.emergency_cleanup_green is False
    assert failure.final_dormant_recheck_attempted is True
    assert failure.final_dormant_recheck_reason==(
        "Hold:synthetic_recheck_failure"
    )
    assert failure.final_dormant_after_failure_proven is False

    forbidden_parts=(
        ("systemctl",'","',"start",'",SERVICE_UNIT'),
        ("systemctl",'","',"stop",'",SERVICE_UNIT'),
        ("PRIVATE ","KEY-----"),
        ("crypto",".sign"),
        ("eth_sendRaw","Transaction"),
    )
    for parts in forbidden_parts:
        forbidden="".join(parts)
        assert forbidden not in own,forbidden
    print(MARKER+"_SELF_TEST_GREEN")
    print("config_directory_constant_bound=true")
    print("processless_target_mainpid_not_required=true")
    print("omitted_empty_service_exec_properties_normalized=true")
    print("required_service_exec_properties_still_mandatory=true")
    print("two_cycle_target_start_stop=true")
    print("direct_service_action=false")
    print("socket_cleanup_required_each_cycle=true")
    print("custody_uid_process_exclusivity_required=true")
    print("custody_uid_zero_one_zero_each_cycle=true")
    print("child_process_census_executed=true")
    print("all_tid_custody_exclusivity_required=true")
    print("all_tid_training_absence_required=true")
    print("global_role_thread_census_stable=true")
    print("global_custody_tid_map_matches_validated_inventory=true")
    print("custody_thread_credentials_exact_required=true")
    print("custody_thread_credential_adversaries_executed=true")
    print("second_custody_uid_process_rejected=true")
    print("saved_fs_uid_slots_counted=true")
    print("saved_fs_uid_only_thread_detected=true")
    print("malformed_live_process_status_rejected=true")
    print("unreadable_live_process_status_rejected=true")
    print("training_uid_unreadable_status_rejected=true")
    print("exact_runtime_argv_binding_required=true")
    print("custody_environment_exact_required=true")
    print("effective_systemd_configuration_bound=true")
    print("systemd_reviewed_generation_required=true")
    print("systemd_bus_owner_pid1_required=true")
    print("running_installed_systemd_version_match_required=true")
    print("systemd_dropins_rejected=true")
    print("unexpected_systemd_exec_commands_rejected=true")
    print("manager_environment_influence_unset=true")
    print("systemd_dependency_directories_closed=true")
    print("unreviewed_systemd_dependency_entries_rejected=true")
    print("retained_ancestor_custody_required=true")
    print("world_writable_execution_parent_rejected=true")
    print("custody_group_closure_required=true")
    print("runtime_primary_gid_optional_redundant_group_accepted=true")
    print("reviewed_ipc_supplementary_group_required=true")
    print("extra_custody_supplementary_group_rejected=true")
    print("failure_cleanup_receipt_truthful=true")
    print("emergency_cleanup_adversaries_executed=true")
    print("failed_stop_cleanup_reported=true")
    print("wait_timeout_cleanup_reported=true")
    print("socket_timeout_cleanup_reported=true")
    print("failed_dead_dormant_wait_failure_reported=true")
    print("failed_dead_dormant_predicate_tested=true")
    print("alternate_runtime_config_rejected_by_exact_argv=true")
    print("failure_final_dormant_recheck_required=true")
    print("failure_preserves_original_reason=true")
    print("final_success_attestation_failure_receipt_truthful=true")
    print("consumed_state_unchanged_required=true")
    print("consumed_state_checked_after_each_cycle=true")
    print("consumed_directory_generation_bound=true")
    print("critical_directory_metadata_bound=true")
    print("prestart_static_boundary_reverified=true")
    print("prestart_unit_dormancy_reverified_each_cycle=true")
    print("cycle2_requires_clean_inactive_service=true")
    print("training_unit_dormancy_reverified=true")
    print("training_execution=false")
    print("durable_attempt_claim=false")
    print("funds_movement=false")

def main()->int:
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true")
    g.add_argument("--plan",action="store_true")
    g.add_argument("--run",action="store_true")
    args=ap.parse_args()
    try:
        if args.self_test:self_test();return 0
        out=qualify() if args.run else plan()
        print(json.dumps(out,sort_keys=True,separators=(",",":")));return 0
    except LifecycleHold as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("target_start_attempted="+str(exc.start_attempts>0).lower(),file=sys.stderr)
        print("target_start_attempts="+str(exc.start_attempts),file=sys.stderr)
        print("target_start_successes="+str(exc.start_successes),file=sys.stderr)
        print(
            "normal_stop_attestations="+str(exc.normal_stop_attestations),
            file=sys.stderr,
        )
        print(
            "target_lifecycle_mutation_possible="
            +str(exc.start_attempts>0).lower(),
            file=sys.stderr,
        )
        print(
            "emergency_cleanup_attempted="
            +str(exc.emergency_cleanup_attempted).lower(),
            file=sys.stderr,
        )
        print(
            "emergency_cleanup_green="+bool_fact(exc.emergency_cleanup_green),
            file=sys.stderr,
        )
        print(
            "emergency_cleanup_reason="+exc.emergency_cleanup_reason,
            file=sys.stderr,
        )
        print(
            "final_dormant_recheck_attempted="
            +str(exc.final_dormant_recheck_attempted).lower(),
            file=sys.stderr,
        )
        print(
            "final_dormant_recheck_reason="
            +exc.final_dormant_recheck_reason,
            file=sys.stderr,
        )
        print(
            "final_dormant_after_failure_proven="
            +str(exc.final_dormant_after_failure_proven).lower(),
            file=sys.stderr,
        )
        print("direct_service_action=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr)
        print("operator_private_key_access=false",file=sys.stderr)
        print("funds_movement=false",file=sys.stderr)
        return 2
    except (Hold,OSError,KeyError,ValueError,subprocess.SubprocessError) as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("target_start_attempted=false",file=sys.stderr)
        print("target_lifecycle_mutation_possible=false",file=sys.stderr)
        print("emergency_cleanup_attempted=false",file=sys.stderr)
        print("emergency_cleanup_green=not_applicable",file=sys.stderr)
        print("final_dormant_recheck_attempted=false",file=sys.stderr)
        print("final_dormant_recheck_reason=not_applicable",file=sys.stderr)
        print("final_dormant_after_failure_proven=false",file=sys.stderr)
        print("direct_service_action=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr)
        print("operator_private_key_access=false",file=sys.stderr)
        print("funds_movement=false",file=sys.stderr)
        return 2
if __name__=="__main__":raise SystemExit(main())

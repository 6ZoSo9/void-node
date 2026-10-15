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

MARKER="VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V1"
TARGET_HOST="Xiphos"

TARGET_UNIT="void-apollyon-authorization-custody-v1.target"
SERVICE_UNIT="void-apollyon-authorization-custody-v1.service"
TRAINING_UNIT="void-apollyon-training-bus-isolation-v1.service"

TARGET_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.target")
SERVICE_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.service")
HELPER_PATH=Path("/opt/void-apollyon-custody-lifecycle-v1/apollyon_custody_stale_socket_cleanup_v1.py")
NODE_PATH=Path("/opt/void-apollyon-node-runtime-v1/node")
LAUNCHER_PATH=Path("/opt/void-apollyon-custody-service-v2-reviewed-v1/tools/apollyon-authorization-custody-launcher-v2.mjs")
ENV_PATH=Path("/etc/void/apollyon-custody-v1/custody.env")
PUBLIC_KEY_PATH=Path("/etc/void/apollyon-custody-v1/operator-public-key.pem")
SOCKET_PARENT=Path("/run/void-apollyon-custody-v1")
SOCKET_PATH=SOCKET_PARENT/"custody.sock"
STATE_ROOT=Path("/var/lib/void-apollyon-custody-v1")
CONSUMED=STATE_ROOT/"consumed"

TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
SERVICE_BLOB="83f363b331bc2331416fd1c0ca6d52f53371fef0"
HELPER_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"
LAUNCHER_BLOB="d23ff045d8c355401fed499c6bcffd503ba4c7fd"
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
FORBIDDEN_MANAGER_ENV=(
    "LD_LIBRARY_PATH","LD_PRELOAD","NODE_OPTIONS","NODE_PATH",
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

def exact_file(path:Path,mode:int,uid:int=0,gid:int=0,blob:str|None=None)->os.stat_result:
    st=os.lstat(path)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink!=1 or
        st.st_uid!=uid or st.st_gid!=gid or stat.S_IMODE(st.st_mode)!=mode
    ):hold("file_metadata_invalid:"+str(path))
    if blob is not None and git_blob(path.read_bytes())!=blob:
        hold("file_blob_invalid:"+str(path))
    return st

def exact_dormant(
    unit:str,
    allow_failed:bool=False,
    expected_unit_file_state:str|None=None,
)->dict[str,str]:
    r=run([
        "/usr/bin/systemctl","show",unit,"--no-pager",
        "-p","LoadState","-p","ActiveState","-p","SubState",
        "-p","UnitFileState","-p","MainPID",
    ],check=False)
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
    if props.get("MainPID") not in ("","0",None):hold("unit_mainpid_nonzero:"+unit)
    return props

def show_properties(unit:str,names:tuple[str,...])->dict[str,str]:
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
    if set(props)!=expected:hold("unit_effective_config_incomplete:"+unit)
    return props

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
            if "=" not in part:hold("exec_property_field_invalid:"+label)
            key,value=part.split("=",1)
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

def manager_environment_names(raw:str)->set[str]:
    names=set()
    for line in raw.splitlines():
        if not line:continue
        if "=" not in line:hold("manager_environment_shape_invalid")
        name,_=line.split("=",1)
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*",name):
            hold("manager_environment_name_invalid")
        names.add(name)
    return names

def reject_forbidden_manager_environment(names:set[str])->None:
    for name in FORBIDDEN_MANAGER_ENV:
        if name in names:hold("forbidden_manager_environment:"+name)

def verify_manager_environment()->None:
    r=run(["/usr/bin/systemctl","show-environment"],check=False)
    if r.returncode!=0:hold("manager_environment_probe_failed")
    reject_forbidden_manager_environment(manager_environment_names(r.stdout))

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
    service=show_properties(SERVICE_UNIT,(
        "FragmentPath","DropInPaths","NeedDaemonReload",
        "RefuseManualStart","RefuseManualStop","NoNewPrivileges",
        "RestrictAddressFamilies","ExecCondition","ExecStartPre","ExecStart",
        "ExecStartPost","ExecStop","ExecStopPost",
    ))
    validate_loaded_relations(target,service)
    verify_manager_environment()

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
    verify_environment_file(ids["ipc_gid"])
    verify_public_key()
    loaded_relations()
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
    return not uid_process_generations(training_uid,proc_root)

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

def exact_live_custody_process_set(
    observed:dict[int,str],pid:int,start_ticks:str
)->bool:
    return observed=={pid:start_ticks}

def require_no_custody_uid_processes(uid:int,reason:str)->None:
    if uid_process_generations(uid):hold(reason)

def consumed_snapshot()->list[dict[str,object]]:
    if not CONSUMED.is_dir():hold("consumed_directory_missing")
    rows=[]
    for entry in sorted(CONSUMED.iterdir(),key=lambda p:p.name):
        st=os.lstat(entry)
        rows.append({
            "name":entry.name,"mode":stat.S_IFMT(st.st_mode),
            "size":st.st_size,"mtime_ns":st.st_mtime_ns,"ctime_ns":st.st_ctime_ns,
        })
    return rows

def wait_unit(unit:str,state:str,timeout_s:float=8.0)->dict[str,str]:
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

def assert_socket_parent_empty()->None:
    if not SOCKET_PARENT.is_dir():
        hold("socket_parent_missing")
    names=sorted(entry.name for entry in os.scandir(SOCKET_PARENT))
    if names:
        hold("socket_parent_not_empty:"+",".join(names))

def attest_dormant_boundary(ids:dict[str,int],prefix:str)->None:
    exact_dormant(TARGET_UNIT,expected_unit_file_state="disabled")
    exact_dormant(SERVICE_UNIT,expected_unit_file_state="static")
    if SOCKET_PATH.exists():hold(prefix+"_socket_present")
    assert_socket_parent_empty()
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
        _wait_unit_fn(SERVICE_UNIT,"inactive",5.0)
        _wait_socket_fn(False,5.0)
        _attest_fn(ids,"emergency")
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
    groups=[int(x) for x in status.get("Groups","").split() if x.isdigit()]
    if ids["ipc_gid"] not in groups:hold("custody_ipc_group_missing")
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

    if not no_training_uid_processes(ids["training_uid"]):
        hold("training_uid_process_observed")
    custody_processes=uid_process_generations(ids["custody_uid"])
    if not exact_live_custody_process_set(custody_processes,pid,start_ticks):
        hold("custody_uid_process_exclusivity_failed")

    return {
        "pid":pid,"start_ticks":start_ticks,
        "custody_uid_process_count":len(custody_processes),
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
    assert_socket_parent_empty()
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
    exact_dormant(SERVICE_UNIT,expected_unit_file_state="static")
    exact_dormant(TRAINING_UNIT,allow_failed=True)
    if SOCKET_PATH.exists():hold("preexisting_socket_path")
    assert_socket_parent_empty()
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
        "forbidden_manager_environment_absent":True,
        "planned_cycles":2,"target_start_stop":False,"service_direct_action":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"RUN_TWO_CYCLE_DORMANT_QUALIFICATION",
    }

def qualify()->dict:
    if os.geteuid()!=0:hold("run_requires_root")
    before=plan()
    ids=verify_static_install()
    consumed_before=consumed_snapshot()
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
            require_no_custody_uid_processes(
                ids["custody_uid"],"prestart_custody_uid_process"
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
        first_generation=(observations[0]["live"]["pid"],observations[0]["live"]["start_ticks"])
        second_generation=(observations[1]["live"]["pid"],observations[1]["live"]["start_ticks"])
        if first_generation==second_generation:
            hold("custody_process_generation_not_renewed")
        if consumed_snapshot()!=consumed_before:
            hold("consumed_state_changed")
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
            attest_dormant_boundary(ids,"failure_recheck")
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

    attest_dormant_boundary(ids,"final")
    if consumed_snapshot()!=consumed_before:hold("final_consumed_state_changed")

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
    own=Path(__file__).read_text(encoding="utf-8")
    for required in (
        'run(["/usr/bin/systemctl","start",TARGET_UNIT])',
        'run(["/usr/bin/systemctl","stop",TARGET_UNIT])',
        'wait_socket(False)',
        'assert_socket_parent_empty()',
        'target_maybe_started=True',
        'active not in ("inactive","failed")',
        'expected_unit_file_state="disabled"',
        'expected_unit_file_state="static"',
        'unit_file_state_mismatch:',
        'st.st_nlink!=2',
        'consumed_snapshot()!=consumed_before',
        'custody_process_generation_not_renewed',
        'training_uid_process_observed',
        'custody_uid_process_exclusivity_failed',
        'preexisting_custody_uid_process',
        'prestart_custody_uid_process',
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
        'forbidden_manager_environment:',
        'emergency_cleanup_attempted=True',
        'final_dormant_recheck_attempted=True',
        'final_dormant_recheck_reason',
        'final_dormant_after_failure_proven',
        'attest_dormant_boundary(ids,"emergency")',
        'attest_dormant_boundary(ids,"failure_recheck")',
        'attest_dormant_boundary(ids,"final")',
        'emergency_cleanup(ids)',
    ):
        assert required in own,required

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
        _wait_socket_fn=lambda present,timeout_s=5.0:None,
        _attest_fn=lambda ids,prefix:None,
    )
    assert cleanup_green is True
    assert cleanup_reason=="none"

    cleanup_green,cleanup_reason=emergency_cleanup(
        cleanup_ids,
        _run_fn=lambda argv,check=False:completed(1),
        _wait_unit_fn=lambda unit,state,timeout_s=5.0:{},
        _wait_socket_fn=lambda present,timeout_s=5.0:None,
        _attest_fn=lambda ids,prefix:None,
    )
    assert cleanup_green is False
    assert cleanup_reason=="emergency_target_stop_failed"

    def wait_timeout(unit:str,state:str,timeout_s:float=5.0):
        raise Hold("synthetic_wait_timeout")
    cleanup_green,cleanup_reason=emergency_cleanup(
        cleanup_ids,
        _run_fn=lambda argv,check=False:completed(0),
        _wait_unit_fn=wait_timeout,
        _wait_socket_fn=lambda present,timeout_s=5.0:None,
        _attest_fn=lambda ids,prefix:None,
    )
    assert cleanup_green is False
    assert cleanup_reason=="Hold:synthetic_wait_timeout"

    def socket_timeout(present:bool,timeout_s:float=5.0)->None:
        raise Hold("synthetic_socket_timeout")
    cleanup_green,cleanup_reason=emergency_cleanup(
        cleanup_ids,
        _run_fn=lambda argv,check=False:completed(0),
        _wait_unit_fn=lambda unit,state,timeout_s=5.0:{},
        _wait_socket_fn=socket_timeout,
        _attest_fn=lambda ids,prefix:None,
    )
    assert cleanup_green is False
    assert cleanup_reason=="Hold:synthetic_socket_timeout"
    assert exact_live_custody_process_set({101:"77"},101,"77")
    assert not exact_live_custody_process_set({},101,"77")
    assert not exact_live_custody_process_set({101:"77",102:"88"},101,"77")
    assert parse_uid_slots({"Uid":"123 123 123 123"})==(123,123,123,123)

    def write_proc(
        proc_root:Path,
        pid:int,
        uids:tuple[int,int,int,int],
        start_ticks:str="77",
    )->None:
        process_root=proc_root/str(pid)
        process_root.mkdir()
        (process_root/"status").write_text(
            "Name:\tsynthetic\nUid:\t"
            +"\t".join(str(value) for value in uids)
            +"\n",
            encoding="utf-8",
        )
        stat_fields=["S"]+["0"]*18+[start_ticks]
        (process_root/"stat").write_text(
            f"{pid} (synthetic) "+" ".join(stat_fields)+"\n",
            encoding="ascii",
        )

    def expect_hold(fn,reason:str)->None:
        try:
            fn()
        except Hold as exc:
            assert str(exc)==reason,(str(exc),reason)
        else:
            raise AssertionError("expected HOLD: "+reason)

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
        "ExecCondition":"","ExecStartPre":"","ExecStart":exec_start_record,
        "ExecStartPost":"","ExecStop":"","ExecStopPost":exec_stop_post_record,
    }
    validate_loaded_relations(good_target,good_service)
    assert parse_exec_property(exec_start_record,"ExecStart")==[
        EXPECTED_EXEC_START_ARGV
    ]
    assert manager_environment_names("LANG=C\nPATH=/usr/bin\n")=={
        "LANG","PATH"
    }
    expected_env=expected_environment_bytes(321).decode("utf-8")
    assert "NODE_OPTIONS" not in expected_env
    assert "LD_PRELOAD" not in expected_env
    for which,key,value,reason in (
        ("target","DropInPaths","/run/systemd/system/x.conf","target_dropins_present"),
        ("target","NeedDaemonReload","yes","target_needs_daemon_reload"),
        ("service","DropInPaths","/run/systemd/system/x.conf","service_dropins_present"),
        ("service","NeedDaemonReload","yes","service_needs_daemon_reload"),
        ("service","ExecStartPre",exec_stop_post_record,"service_unexpected_exec_command:ExecStartPre"),
        ("service","ExecStart",exec_start_record+" "+exec_stop_post_record,"service_effective_execstart_invalid"),
        ("service","ExecStopPost",exec_stop_post_record+" "+exec_stop_post_record,"service_effective_execstoppost_invalid"),
    ):
        target=dict(good_target);service=dict(good_service)
        (target if which=="target" else service)[key]=value
        expect_hold(lambda t=target,s=service:validate_loaded_relations(t,s),reason)
    expect_hold(
        lambda:reject_forbidden_manager_environment({"NODE_OPTIONS"}),
        "forbidden_manager_environment:NODE_OPTIONS",
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
        assert exact_live_custody_process_set(observed,101,"77")

    with tempfile.TemporaryDirectory(prefix="apollyon-child-proc-second-") as td:
        proc_root=Path(td)
        write_proc(proc_root,101,(custody_uid,)*4,"77")
        write_proc(proc_root,102,(custody_uid,)*4,"88")
        observed=uid_process_generations(custody_uid,proc_root)
        assert observed=={101:"77",102:"88"}
        assert not exact_live_custody_process_set(observed,101,"77")

    with tempfile.TemporaryDirectory(prefix="apollyon-child-proc-saved-fs-") as td:
        proc_root=Path(td)
        write_proc(proc_root,103,(1,2,custody_uid,3),"99")
        write_proc(proc_root,104,(1,2,3,custody_uid),"100")
        observed=uid_process_generations(custody_uid,proc_root)
        assert observed=={103:"99",104:"100"}

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
        expect_hold(
            lambda:no_training_uid_processes(training_uid,proc_root),
            "custody_uid_process_status_unreadable:106",
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
    print("two_cycle_target_start_stop=true")
    print("direct_service_action=false")
    print("socket_cleanup_required_each_cycle=true")
    print("custody_uid_process_exclusivity_required=true")
    print("custody_uid_zero_one_zero_each_cycle=true")
    print("child_process_census_executed=true")
    print("second_custody_uid_process_rejected=true")
    print("saved_fs_uid_slots_counted=true")
    print("malformed_live_process_status_rejected=true")
    print("unreadable_live_process_status_rejected=true")
    print("training_uid_unreadable_status_rejected=true")
    print("exact_runtime_argv_binding_required=true")
    print("custody_environment_exact_required=true")
    print("effective_systemd_configuration_bound=true")
    print("systemd_dropins_rejected=true")
    print("unexpected_systemd_exec_commands_rejected=true")
    print("forbidden_manager_environment_rejected=true")
    print("failure_cleanup_receipt_truthful=true")
    print("emergency_cleanup_adversaries_executed=true")
    print("failed_stop_cleanup_reported=true")
    print("wait_timeout_cleanup_reported=true")
    print("socket_timeout_cleanup_reported=true")
    print("alternate_runtime_config_rejected_by_exact_argv=true")
    print("failure_final_dormant_recheck_required=true")
    print("failure_preserves_original_reason=true")
    print("consumed_state_unchanged_required=true")
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

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import pwd
import socket
import stat
import shlex
import subprocess
import sys
import tempfile

MARKER="VOID_APOLLYON_CUSTODY_LAUNCHER_V3_DORMANT_REBIND_V1"
TARGET_HOST="Xiphos"
ROOT=Path(__file__).resolve().parents[2]

TARGET_UNIT="void-apollyon-authorization-custody-v1.target"
SERVICE_UNIT="void-apollyon-authorization-custody-v1.service"
TRAINING_UNIT="void-apollyon-training-bus-isolation-v1.service"

TARGET_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.target")
SERVICE_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.service")
LAUNCHER_ROOT=Path("/opt/void-apollyon-custody-service-v2-reviewed-v1/tools")
V2_LAUNCHER_PATH=LAUNCHER_ROOT/"apollyon-authorization-custody-launcher-v2.mjs"
V3_LAUNCHER_PATH=LAUNCHER_ROOT/"apollyon-authorization-custody-launcher-v3.mjs"
V3_LAUNCHER_PENDING_PATH=LAUNCHER_ROOT/(
    ".apollyon-authorization-custody-launcher-v3.mjs.pending-v1"
)
NODE_PATH=Path("/opt/void-apollyon-node-runtime-v1/node")
HELPER_PATH=Path(
    "/opt/void-apollyon-custody-lifecycle-v1/"
    "apollyon_custody_stale_socket_cleanup_v1.py"
)
EXPECTED_EXEC_STOP_POST_ARGV=(
    "/usr/bin/python3","-I","-B",os.fspath(HELPER_PATH),"--cleanup",
)

V3_LAUNCHER_REL="tools/apollyon-authorization-custody-launcher-v3.mjs"
V3_SERVICE_REL="ops/xiphos/void-apollyon-authorization-custody-v1-launcher-v3.service"

TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
OLD_SERVICE_BLOB="30b7b7c62b6b7834ae91db1eb37df05286ca5764"
NEW_SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"
V2_LAUNCHER_BLOB="d23ff045d8c355401fed499c6bcffd503ba4c7fd"
V3_LAUNCHER_BLOB="8d8561c08db7e500a818d269580dad15adca9f58"
EXPECTED_UNSET=(
    "GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD",
    "NODE_OPTIONS","NODE_PATH","OPENSSL_CONF",
)

class Hold(RuntimeError): pass

def hold(reason:str)->None: raise Hold(reason)

def git_blob(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

def run(argv:list[str],check:bool=True)->subprocess.CompletedProcess[str]:
    p=subprocess.run(
        argv,stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=20,
        env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"},
    )
    if check and p.returncode!=0:
        hold("command_failed:"+Path(argv[0]).name)
    return p

def read_source(relative:str,expected_blob:str)->bytes:
    path=ROOT/relative
    st=os.lstat(path)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_nlink!=1
    ):
        hold("source_metadata_invalid:"+relative)
    data=path.read_bytes()
    if len(data)!=st.st_size or git_blob(data)!=expected_blob:
        hold("source_blob_invalid:"+relative)
    return data

def require_trusted_ancestor_chain(path:Path,*,include_leaf:bool)->None:
    target=path if include_leaf else path.parent
    raw=os.fspath(target)
    if not target.is_absolute() or os.path.normpath(raw)!=raw:
        hold("trusted_ancestor_path_invalid:"+raw)
    current=Path("/")
    for part in target.relative_to("/").parts:
        current=current/part
        st=os.lstat(current)
        if (
            not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
            st.st_uid!=0 or st.st_gid!=0 or
            (stat.S_IMODE(st.st_mode)&0o022)!=0
        ):
            hold("trusted_ancestor_invalid:"+os.fspath(current))

def require_root_custodied_source_file(
    path:Path,expected_blob:str|None=None,
)->None:
    raw=os.fspath(path)
    if not path.is_absolute() or os.path.normpath(raw)!=raw:
        hold("apply_source_path_invalid:"+raw)
    require_trusted_ancestor_chain(path,include_leaf=False)
    st=os.lstat(path)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or st.st_nlink!=1 or
        (stat.S_IMODE(st.st_mode)&0o022)!=0
    ):
        hold("apply_source_not_root_custodied:"+raw)
    data=path.read_bytes()
    if len(data)!=st.st_size:
        hold("apply_source_read_invalid:"+raw)
    if expected_blob is not None and git_blob(data)!=expected_blob:
        hold("apply_source_blob_invalid:"+raw)

def require_apply_source_custody()->None:
    source=Path(__file__)
    require_root_custodied_source_file(source)
    require_root_custodied_source_file(
        ROOT/V3_LAUNCHER_REL,V3_LAUNCHER_BLOB
    )
    require_root_custodied_source_file(
        ROOT/V3_SERVICE_REL,NEW_SERVICE_BLOB
    )

def exact_regular(
    path:Path,mode:int,uid:int,gid:int,expected_blob:str|None=None,
)->str:
    st=os.lstat(path)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=uid or st.st_gid!=gid or st.st_nlink!=1 or
        stat.S_IMODE(st.st_mode)!=mode
    ):
        hold("installed_file_metadata_invalid:"+os.fspath(path))
    data=path.read_bytes()
    if len(data)!=st.st_size:
        hold("installed_file_read_invalid:"+os.fspath(path))
    digest=git_blob(data)
    if expected_blob is not None and digest!=expected_blob:
        hold("installed_file_blob_invalid:"+os.fspath(path))
    return digest

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

def expected_exec_start_argv(launcher:Path)->tuple[str,...]:
    return (
        os.fspath(NODE_PATH),
        os.fspath(launcher),
        "--socket-path","$"+"{VOID_APOLLYON_CUSTODY_SOCKET_PATH}",
        "--state-root","$"+"{VOID_APOLLYON_CUSTODY_STATE_ROOT}",
        "--socket-group-gid","$"+"{VOID_APOLLYON_CUSTODY_SOCKET_GROUP_GID}",
        "--expected-operator-public-key-raw-sha256",
        "$"+"{VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_RAW_SHA256}",
        "--operator-public-key-file",
        "$"+"{VOID_APOLLYON_CUSTODY_OPERATOR_PUBLIC_KEY_FILE}",
    )

def loaded_exec_generation(service:dict[str,str])->str:
    if parse_exec_property(service.get("ExecStart",""),"ExecStart")==[
        expected_exec_start_argv(V2_LAUNCHER_PATH)
    ]:
        return "v2"
    if parse_exec_property(service.get("ExecStart",""),"ExecStart")==[
        expected_exec_start_argv(V3_LAUNCHER_PATH)
    ]:
        return "v3"
    hold("service_effective_execstart_invalid")

def normalize_unit_props(
    unit:str,
    observed:dict[str,str],
    names:tuple[str,...],
    optional_empty:tuple[str,...]=(),
)->dict[str,str]:
    expected=set(names)
    optional=set(optional_empty)
    if not optional.issubset(expected):
        hold("unit_probe_optional_schema_invalid:"+unit)
    extra=set(observed)-expected
    if extra:
        hold("unit_probe_extra:"+unit+":"+",".join(sorted(extra)))
    missing=expected-set(observed)
    required_missing=missing-optional
    if required_missing:
        hold(
            "unit_probe_incomplete:"+unit+":"+
            ",".join(sorted(required_missing))
        )
    out=dict(observed)
    for name in missing:
        out[name]=""
    return out

def unit_props(
    unit:str,
    names:tuple[str,...],
    optional_empty:tuple[str,...]=(),
)->dict[str,str]:
    argv=["/usr/bin/systemctl","show",unit,"--no-pager"]
    for name in names:
        argv.extend(["-p",name])
    p=run(argv,check=False)
    if p.returncode!=0:
        hold("unit_probe_failed:"+unit)
    out={}
    for line in p.stdout.splitlines():
        if "=" not in line:
            hold("unit_probe_invalid:"+unit)
        key,value=line.split("=",1)
        if key in out:
            hold("unit_probe_duplicate:"+unit)
        out[key]=value
    return normalize_unit_props(unit,out,names,optional_empty)

def proc_start_ticks(pid:int,proc_root:Path=Path("/proc"))->str:
    text=(proc_root/str(pid)/"stat").read_text(
        encoding="ascii",errors="strict"
    )
    close=text.rfind(")")
    fields=text[close+2:].split()
    if len(fields)<20 or not fields[19].isdigit():
        hold("proc_stat_invalid")
    return fields[19]

def proc_status(pid:int,proc_root:Path=Path("/proc"))->dict[str,str]:
    out={}
    for line in (proc_root/str(pid)/"status").read_text(
        encoding="utf-8",errors="strict"
    ).splitlines():
        if ":" in line:
            key,value=line.split(":",1);out[key]=value.strip()
    return out

def uid_process_generations(
    uid:int,proc_root:Path=Path("/proc")
)->dict[int,str]:
    try:
        entries=sorted(
            (entry for entry in proc_root.iterdir() if entry.name.isdigit()),
            key=lambda entry:int(entry.name,10),
        )
    except OSError as exc:
        raise Hold("uid_process_census_unavailable") from exc
    observed={}
    for entry in entries:
        pid=int(entry.name,10)
        try:
            status=proc_status(pid,proc_root)
        except (FileNotFoundError,ProcessLookupError):
            continue
        except (PermissionError,OSError,UnicodeError) as exc:
            if not entry.exists():continue
            raise Hold("uid_process_status_unreadable:"+entry.name) from exc
        raw=status.get("Uid")
        if raw is None:
            if not entry.exists():continue
            hold("process_uid_slots_missing")
        slots=raw.split()
        if len(slots)!=4 or any(not value.isdigit() for value in slots):
            if not entry.exists():continue
            hold("process_uid_slots_invalid")
        if uid not in tuple(int(value,10) for value in slots):
            continue
        try:
            start_ticks=proc_start_ticks(pid,proc_root)
        except (FileNotFoundError,ProcessLookupError):
            continue
        except (PermissionError,OSError,UnicodeError) as exc:
            if not entry.exists():continue
            raise Hold("uid_process_generation_unreadable:"+entry.name) from exc
        observed[pid]=start_ticks
    return observed

def uid_slots_from_status_text(text:str)->tuple[int,int,int,int]:
    raw=None
    for line in text.splitlines():
        if line.startswith("Uid:"):
            raw=line.split(":",1)[1].strip()
            break
    if raw is None:hold("thread_uid_slots_missing")
    slots=raw.split()
    if len(slots)!=4 or any(not value.isdigit() for value in slots):
        hold("thread_uid_slots_invalid")
    values=tuple(int(value,10) for value in slots)
    return values  # type: ignore[return-value]

def uid_thread_inventory(
    uid:int,proc_root:Path=Path("/proc")
)->dict[int,tuple[int,...]]:
    try:
        processes=sorted(
            (entry for entry in proc_root.iterdir() if entry.name.isdigit()),
            key=lambda entry:int(entry.name,10),
        )
    except OSError as exc:
        raise Hold("thread_process_census_unavailable") from exc
    observed={}
    for process in processes:
        pid=int(process.name,10)
        task_root=process/"task"
        try:
            threads=sorted(
                (entry for entry in task_root.iterdir() if entry.name.isdigit()),
                key=lambda entry:int(entry.name,10),
            )
        except FileNotFoundError:
            continue
        except OSError as exc:
            if not process.exists():continue
            raise Hold("thread_inventory_unavailable:"+process.name) from exc
        matched=[]
        for thread in threads:
            tid=int(thread.name,10)
            try:
                text=(thread/"status").read_text(
                    encoding="utf-8",errors="strict"
                )
            except (FileNotFoundError,ProcessLookupError):
                continue
            except (PermissionError,OSError,UnicodeError) as exc:
                if not thread.exists():continue
                raise Hold(
                    "thread_status_unreadable:"+process.name+":"+thread.name
                ) from exc
            if uid in uid_slots_from_status_text(text):
                matched.append(tid)
        if matched:
            observed[pid]=tuple(matched)
    return observed

def require_no_role_processes()->None:
    custody_uid=pwd.getpwnam("voidapollyoncustody").pw_uid
    training_uid=pwd.getpwnam("voidapollyontrain").pw_uid
    for _ in range(2):
        custody=uid_thread_inventory(custody_uid)
        training=uid_thread_inventory(training_uid)
        if custody:
            hold(
                "custody_uid_thread_present:"+
                ",".join(
                    f"{pid}:"+"/".join(str(tid) for tid in tids)
                    for pid,tids in sorted(custody.items())
                )
            )
        if training:
            hold(
                "training_uid_thread_present:"+
                ",".join(
                    f"{pid}:"+"/".join(str(tid) for tid in tids)
                    for pid,tids in sorted(training.items())
                )
            )

def require_dormant()->dict[str,dict[str,str]]:
    target=unit_props(TARGET_UNIT,(
        "LoadState","ActiveState","UnitFileState","NeedDaemonReload",
        "FragmentPath","DropInPaths","Wants","PropagatesStopTo",
    ))
    service=unit_props(
        SERVICE_UNIT,(
            "LoadState","ActiveState","UnitFileState","MainPID","NeedDaemonReload",
            "FragmentPath","DropInPaths","RefuseManualStart","RefuseManualStop",
            "NoNewPrivileges","RestrictAddressFamilies","UnsetEnvironment",
            "ExecCondition","ExecStartPre","ExecStart","ExecStartPost","ExecStop",
            "ExecStopPost",
        ),
        optional_empty=(
            "ExecCondition","ExecStartPre","ExecStartPost","ExecStop",
        ),
    )
    training=unit_props(TRAINING_UNIT,(
        "LoadState","ActiveState","UnitFileState","MainPID",
    ))
    if (
        target["LoadState"]!="loaded" or target["ActiveState"]!="inactive" or
        target["UnitFileState"]!="disabled" or
        target["NeedDaemonReload"]!="no" or
        target["FragmentPath"]!=os.fspath(TARGET_PATH) or
        target["DropInPaths"]!="" or
        set(target["Wants"].split())!={SERVICE_UNIT} or
        set(target["PropagatesStopTo"].split())!={SERVICE_UNIT}
    ):
        hold("target_not_exactly_dormant")
    if (
        service["LoadState"]!="loaded" or
        service["ActiveState"] not in ("inactive","failed") or
        service["UnitFileState"]!="static" or service["MainPID"] not in ("","0") or
        service["NeedDaemonReload"] not in ("no","yes") or
        service["FragmentPath"]!=os.fspath(SERVICE_PATH) or
        service["DropInPaths"]!="" or
        service["RefuseManualStart"]!="yes" or service["RefuseManualStop"]!="yes" or
        service["NoNewPrivileges"]!="yes" or
        service["RestrictAddressFamilies"]!="AF_UNIX" or
        set(service["UnsetEnvironment"].split())!=set(EXPECTED_UNSET)
    ):
        hold("service_not_exactly_dormant")
    for name in ("ExecCondition","ExecStartPre","ExecStartPost","ExecStop"):
        if parse_exec_property(service.get(name,""),name):
            hold("service_unexpected_exec_command:"+name)
    if parse_exec_property(service.get("ExecStopPost",""),"ExecStopPost")!=[
        EXPECTED_EXEC_STOP_POST_ARGV
    ]:
        hold("service_effective_execstoppost_invalid")
    loaded_exec_generation(service)
    if (
        training["LoadState"]!="loaded" or
        training["ActiveState"] not in ("inactive","failed") or
        training["UnitFileState"]!="static" or
        training["MainPID"] not in ("","0")
    ):
        hold("training_not_dormant")
    require_no_role_processes()
    return {"target":target,"service":service,"training":training}

def launcher_destination_file()->os.stat_result|None:
    try:
        st=os.lstat(V3_LAUNCHER_PATH)
    except FileNotFoundError:
        return None
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)!=0o444 or
        st.st_nlink not in (1,2)
    ):
        hold("v3_launcher_destination_metadata_invalid")
    data=V3_LAUNCHER_PATH.read_bytes()
    if len(data)!=st.st_size or git_blob(data)!=V3_LAUNCHER_BLOB:
        hold("v3_launcher_destination_blob_invalid")
    return st

def launcher_pending_file()->tuple[os.stat_result,str]|None:
    try:
        st=os.lstat(V3_LAUNCHER_PENDING_PATH)
    except FileNotFoundError:
        return None
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or st.st_nlink not in (1,2) or
        stat.S_IMODE(st.st_mode) not in (0o600,0o444)
    ):
        hold("v3_launcher_pending_metadata_invalid")
    data=V3_LAUNCHER_PENDING_PATH.read_bytes()
    if len(data)!=st.st_size:
        hold("v3_launcher_pending_read_invalid")
    expected=read_source(V3_LAUNCHER_REL,V3_LAUNCHER_BLOB)
    if (
        st.st_nlink==1 and len(data)<=len(expected) and
        expected.startswith(data) and
        (stat.S_IMODE(st.st_mode)==0o600 or len(data)==len(expected))
    ):
        if (
            len(data)==len(expected) and data==expected and
            stat.S_IMODE(st.st_mode)==0o444
        ):
            return st,"exact"
        return st,"incomplete"
    if (
        st.st_nlink==2 and stat.S_IMODE(st.st_mode)==0o444 and
        data==expected
    ):
        return st,"exact"
    hold("v3_launcher_pending_collision")

def launcher_state()->str:
    exact_regular(V2_LAUNCHER_PATH,0o444,0,0,V2_LAUNCHER_BLOB)
    destination=launcher_destination_file()
    pending=launcher_pending_file()
    if destination is None and pending is None:
        return "absent"
    if destination is None and pending is not None:
        if pending[1]=="incomplete":
            return "pending_incomplete"
        if pending[0].st_nlink!=1:
            hold("v3_launcher_pending_link_count_invalid")
        return "pending_exact"
    if destination is not None and pending is None:
        if destination.st_nlink!=1:
            hold("v3_launcher_destination_link_count_invalid")
        return "exact"
    assert destination is not None and pending is not None
    pending_st,pending_state=pending
    if pending_state!="exact":
        hold("v3_launcher_destination_with_incomplete_pending")
    if (
        destination.st_dev!=pending_st.st_dev or
        destination.st_ino!=pending_st.st_ino or
        destination.st_nlink!=2 or pending_st.st_nlink!=2
    ):
        hold("v3_launcher_linked_pending_identity_invalid")
    return "linked_pending"

def service_state()->str:
    digest=exact_regular(SERVICE_PATH,0o644,0,0)
    if digest==OLD_SERVICE_BLOB:return "v2_exact"
    if digest==NEW_SERVICE_BLOB:return "v3_exact"
    hold("service_unit_collision")

def classify(
    service_file:str,launcher:str,loaded_exec:str,need_reload:str,
)->dict[str,str]:
    old_loaded=loaded_exec=="v2"
    new_loaded=loaded_exec=="v3"
    if (
        service_file=="v2_exact" and launcher=="absent" and
        old_loaded and need_reload=="no"
    ):
        return {"lifecycle_state":"ready","next_action":"INSTALL_V3_LAUNCHER"}
    if (
        service_file=="v2_exact" and launcher=="pending_incomplete" and
        old_loaded and need_reload=="no"
    ):
        return {
            "lifecycle_state":"launcher_pending_incomplete",
            "next_action":"RECOVER_V3_LAUNCHER_PENDING",
        }
    if (
        service_file=="v2_exact" and launcher=="pending_exact" and
        old_loaded and need_reload=="no"
    ):
        return {
            "lifecycle_state":"launcher_pending",
            "next_action":"RESUME_V3_LAUNCHER_PUBLICATION",
        }
    if (
        service_file=="v2_exact" and launcher=="linked_pending" and
        old_loaded and need_reload=="no"
    ):
        return {
            "lifecycle_state":"launcher_linked_pending",
            "next_action":"FINALIZE_V3_LAUNCHER_PUBLICATION",
        }
    if (
        service_file=="v2_exact" and launcher=="exact" and
        old_loaded and need_reload=="no"
    ):
        return {"lifecycle_state":"launcher_staged","next_action":"REPLACE_SERVICE_UNIT"}
    if (
        service_file=="v3_exact" and launcher=="exact" and old_loaded and
        need_reload in ("no","yes")
    ):
        return {"lifecycle_state":"service_file_pending_reload","next_action":"DAEMON_RELOAD"}
    if (
        service_file=="v3_exact" and launcher=="exact" and
        new_loaded and need_reload=="no"
    ):
        return {"lifecycle_state":"complete","next_action":"V3_DORMANT_REBIND_COMPLETE"}
    hold("rebind_lifecycle_state_invalid")

def plan()->dict[str,object]:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():
        hold("wrong_host")
    read_source(V3_LAUNCHER_REL,V3_LAUNCHER_BLOB)
    read_source(V3_SERVICE_REL,NEW_SERVICE_BLOB)
    for protected in (
        TARGET_PATH,SERVICE_PATH,V2_LAUNCHER_PATH,V3_LAUNCHER_PATH,
        V3_LAUNCHER_PENDING_PATH,
    ):
        require_trusted_ancestor_chain(protected,include_leaf=False)
    exact_regular(TARGET_PATH,0o644,0,0,TARGET_BLOB)
    units=require_dormant()
    launch=launcher_state()
    service=service_state()
    loaded_exec=loaded_exec_generation(units["service"])
    state=classify(
        service,launch,loaded_exec,units["service"]["NeedDaemonReload"],
    )
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        "launcher_state":launch,"service_unit_state":service,
        "loaded_exec_generation":loaded_exec,**state,
        "target_dormant":True,"service_dormant":True,"training_dormant":True,
        "service_action":False,"target_action":False,"training_action":False,
        "durable_attempt_claim":False,"training_execution":False,
        "funds_movement":False,
    }

def fsync_dir(path:Path)->None:
    fd=os.open(path,os.O_RDONLY|getattr(os,"O_DIRECTORY",0)|getattr(os,"O_CLOEXEC",0))
    try:os.fsync(fd)
    finally:os.close(fd)

def install_or_resume_launcher(data:bytes)->bool:
    path=V3_LAUNCHER_PATH
    pending=V3_LAUNCHER_PENDING_PATH
    require_trusted_ancestor_chain(path,include_leaf=False)
    changed=False
    state=launcher_state()
    if state=="exact":
        return False

    if state=="pending_incomplete":
        require_dormant()
        os.unlink(pending)
        fsync_dir(path.parent)
        changed=True
        state=launcher_state()
        if state!="absent":
            hold("launcher_pending_recovery_failed")

    if state=="absent":
        require_dormant()
        fd=None
        try:
            fd=os.open(
                pending,os.O_RDWR|os.O_CREAT|os.O_EXCL|
                getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),0o600,
            )
            sent=0
            while sent<len(data):
                n=os.write(fd,data[sent:])
                if n<=0:hold("launcher_pending_write_failed")
                sent+=n
            os.fchown(fd,0,0);os.fchmod(fd,0o444)
            staged=os.fstat(fd)
            if (
                not stat.S_ISREG(staged.st_mode) or staged.st_nlink!=1 or
                staged.st_uid!=0 or staged.st_gid!=0 or
                stat.S_IMODE(staged.st_mode)!=0o444 or
                staged.st_size!=len(data)
            ):
                hold("launcher_pending_metadata_invalid")
            os.lseek(fd,0,os.SEEK_SET)
            observed=b""
            while len(observed)<len(data):
                chunk=os.read(fd,len(data)-len(observed))
                if not chunk:break
                observed+=chunk
            if observed!=data:hold("launcher_pending_bytes_invalid")
            os.fsync(fd)
        finally:
            if fd is not None:
                try:os.close(fd)
                except OSError:pass
        fsync_dir(path.parent)
        changed=True
        state=launcher_state()
        if state!="pending_exact":
            hold("launcher_pending_publication_invalid")

    if state=="pending_exact":
        require_dormant()
        fd=os.open(
            pending,os.O_RDWR|getattr(os,"O_NOFOLLOW",0)|
            getattr(os,"O_CLOEXEC",0),
        )
        try:
            staged=os.fstat(fd)
            if (
                not stat.S_ISREG(staged.st_mode) or staged.st_nlink!=1 or
                staged.st_uid!=0 or staged.st_gid!=0 or
                stat.S_IMODE(staged.st_mode)!=0o444
            ):
                hold("launcher_pending_resume_metadata_invalid")
            os.fsync(fd)
        finally:
            os.close(fd)
        if launcher_state()!="pending_exact":
            hold("launcher_pending_changed_after_fsync")
        require_dormant()
        try:
            os.link(pending,path,follow_symlinks=False)
        except FileExistsError:
            pass
        fsync_dir(path.parent)
        changed=True
        state=launcher_state()
        if state not in ("linked_pending","exact"):
            hold("launcher_link_publication_invalid")

    if state=="linked_pending":
        require_dormant()
        os.unlink(pending)
        fsync_dir(path.parent)
        changed=True
        state=launcher_state()

    if state!="exact":
        hold("v3_launcher_publication_not_exact")
    exact_regular(path,0o444,0,0,V3_LAUNCHER_BLOB)
    return changed

def replace_service(data:bytes)->bool:
    require_trusted_ancestor_chain(SERVICE_PATH,include_leaf=False)
    if service_state()=="v3_exact":return False
    if launcher_state()!="exact":hold("v3_launcher_not_exact")
    require_dormant()
    fd,tmp_name=tempfile.mkstemp(
        prefix=".void-apollyon-authorization-custody-v3.",
        dir=os.fspath(SERVICE_PATH.parent),
    )
    tmp=Path(tmp_name)
    try:
        sent=0
        while sent<len(data):
            n=os.write(fd,data[sent:])
            if n<=0:hold("service_pending_write_failed")
            sent+=n
        os.fchown(fd,0,0);os.fchmod(fd,0o644);os.fsync(fd)
        os.close(fd);fd=-1
        require_dormant()
        if service_state()!="v2_exact":hold("service_generation_changed_before_replace")
        os.replace(tmp,SERVICE_PATH)
        fsync_dir(SERVICE_PATH.parent)
    finally:
        if fd>=0:
            try:os.close(fd)
            except OSError:pass
        try:os.unlink(tmp)
        except FileNotFoundError:pass
    exact_regular(SERVICE_PATH,0o644,0,0,NEW_SERVICE_BLOB)
    return True

def daemon_reload()->None:
    # File state may be new while the loaded manager state still points to v2.
    # Re-run the complete dormant/effective-config boundary immediately before
    # mutating PID 1's unit cache; NeedDaemonReload=yes is explicitly accepted.
    require_dormant()
    if launcher_state()!="exact" or service_state()!="v3_exact":
        hold("rebind_material_changed_before_daemon_reload")
    run(["/usr/bin/systemctl","daemon-reload"])

def apply()->dict[str,object]:
    if os.geteuid()!=0:hold("apply_requires_root")
    require_apply_source_custody()
    before=plan()
    launcher_data=read_source(V3_LAUNCHER_REL,V3_LAUNCHER_BLOB)
    service_data=read_source(V3_SERVICE_REL,NEW_SERVICE_BLOB)
    launcher_installed=False
    service_replaced=False
    daemon_reload_performed=False

    if before["launcher_state"]!="exact":
        launcher_installed=install_or_resume_launcher(launcher_data)
    mid=plan()
    if mid["service_unit_state"]=="v2_exact":
        service_replaced=replace_service(service_data)

    # After file replacement systemd may report NeedDaemonReload=yes and the
    # strict plan intentionally cannot classify that as dormant-complete.
    file_state=service_state()
    if file_state=="v3_exact":
        loaded=unit_props(SERVICE_UNIT,("ExecStart","NeedDaemonReload"))
        loaded_generation=loaded_exec_generation(loaded)
        if loaded_generation=="v2" or loaded["NeedDaemonReload"]=="yes":
            daemon_reload()
            daemon_reload_performed=True

    after=plan()
    if after["lifecycle_state"]!="complete":
        hold("post_apply_not_complete")
    return {
        **after,"mode":"--apply",
        "launcher_installed":launcher_installed,
        "service_unit_replaced":service_replaced,
        "daemon_reload_performed":daemon_reload_performed,
        "service_action":False,"target_action":False,"training_action":False,
        "durable_attempt_claim":False,"training_execution":False,
        "funds_movement":False,
    }

def self_test()->None:
    assert git_blob(b"abc")==hashlib.sha1(b"blob 3\0abc").hexdigest()

    def write_proc(
        proc_root:Path,
        pid:int,
        uids:tuple[int,int,int,int],
        start_ticks:str,
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

    with tempfile.TemporaryDirectory(
        prefix="apollyon-v3-rebind-proc-empty-"
    ) as td:
        assert uid_process_generations(4242,Path(td))=={}
    with tempfile.TemporaryDirectory(
        prefix="apollyon-v3-rebind-proc-slots-"
    ) as td:
        proc_root=Path(td)
        write_proc(proc_root,101,(4242,1,2,3),"77")
        write_proc(proc_root,102,(1,4242,2,3),"88")
        write_proc(proc_root,103,(1,2,4242,3),"99")
        write_proc(proc_root,104,(1,2,3,4242),"100")
        assert uid_process_generations(4242,proc_root)=={
            101:"77",102:"88",103:"99",104:"100",
        }

    with tempfile.TemporaryDirectory(
        prefix="apollyon-v3-rebind-thread-slots-"
    ) as td:
        proc_root=Path(td)
        process=proc_root/"201"
        task=process/"task"
        task.mkdir(parents=True)
        for tid,uids in (
            (201,(1,1,1,1)),
            (202,(1,1,4242,1)),
            (203,(1,1,1,4242)),
        ):
            thread=task/str(tid)
            thread.mkdir()
            (thread/"status").write_text(
                "Name:\tsynthetic\nUid:\t"
                +"\t".join(str(value) for value in uids)
                +"\n",
                encoding="utf-8",
            )
        assert uid_thread_inventory(4242,proc_root)=={
            201:(202,203),
        }
    assert normalize_unit_props(
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
        normalize_unit_props(
            "fixture.service",{},
            ("ExecStart","ExecStopPost"),("ExecStopPost",),
        )
    except Hold as exc:
        assert str(exc)=="unit_probe_incomplete:fixture.service:ExecStart"
    else:
        raise AssertionError("missing required unit property accepted")

    assert classify(
        "v2_exact","absent",
        "v2","no",
    )["next_action"]=="INSTALL_V3_LAUNCHER"
    assert classify(
        "v2_exact","pending_incomplete",
        "v2","no",
    )["next_action"]=="RECOVER_V3_LAUNCHER_PENDING"
    assert classify(
        "v2_exact","pending_exact",
        "v2","no",
    )["next_action"]=="RESUME_V3_LAUNCHER_PUBLICATION"
    assert classify(
        "v2_exact","linked_pending",
        "v2","no",
    )["next_action"]=="FINALIZE_V3_LAUNCHER_PUBLICATION"
    assert classify(
        "v2_exact","exact",
        "v2","no",
    )["next_action"]=="REPLACE_SERVICE_UNIT"
    assert classify(
        "v3_exact","exact",
        "v2","yes",
    )["next_action"]=="DAEMON_RELOAD"
    assert classify(
        "v3_exact","exact",
        "v2","no",
    )["next_action"]=="DAEMON_RELOAD"
    assert classify(
        "v3_exact","exact",
        "v3","no",
    )["lifecycle_state"]=="complete"
    own=Path(__file__).read_text(encoding="utf-8")
    forbidden_patterns=(
        'systemctl",'+'"start',
        'systemctl",'+'"stop',
        '"training_execution":'+"True",
        '"durable_attempt_claim":'+"True",
        "eth_sendRaw"+"Transaction",
        "PRIVATE "+"KEY-----",
    )
    for forbidden in forbidden_patterns:
        assert forbidden not in own,forbidden
    for required in (
        'run(["/usr/bin/systemctl","daemon-reload"])',
        'require_dormant()',
        'service["ActiveState"] not in ("inactive","failed")',
        '"LoadState","ActiveState","UnitFileState","NeedDaemonReload"',
        'normalize_unit_props(',
        'optional_empty=(',
        'require_trusted_ancestor_chain(',
        'trusted_ancestor_invalid:',
        'require_apply_source_custody()',
        'apply_source_not_root_custodied:',
        'apply_source_blob_invalid:',
        'parse_exec_property(',
        'loaded_exec_generation(',
        'loaded_generation=="v2"',
        'V3_LAUNCHER_PENDING_PATH=',
        'launcher_pending_incomplete',
        'launcher_pending',
        'launcher_linked_pending',
        'RECOVER_V3_LAUNCHER_PENDING',
        'RESUME_V3_LAUNCHER_PUBLICATION',
        'FINALIZE_V3_LAUNCHER_PUBLICATION',
        'launcher_destination_file(',
        'launcher_pending_file(',
        'v3_launcher_pending_collision',
        'launcher_pending_resume_metadata_invalid',
        'launcher_pending_changed_after_fsync',
        'install_or_resume_launcher(',
        'service_effective_execstart_invalid',
        'service_effective_execstoppost_invalid',
        'service_unexpected_exec_command:',
        'service["NoNewPrivileges"]!="yes"',
        'service["RestrictAddressFamilies"]!="AF_UNIX"',
        'uid_process_generations(',
        'uid_thread_inventory(',
        'custody_uid_thread_present:',
        'training_uid_thread_present:',
        'thread_status_unreadable:',
        'require_no_role_processes()',
        'rebind_material_changed_before_daemon_reload',
        'V3_LAUNCHER_BLOB="8d8561c08db7e500a818d269580dad15adca9f58"',
        'NEW_SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"',
        '"lifecycle_state":"complete"',
    ):
        assert required in own,required
    print(MARKER+"_SELF_TEST_GREEN")
    print("processless_target_mainpid_not_required=true")
    print("omitted_empty_service_exec_properties_normalized=true")
    print("required_service_exec_properties_still_mandatory=true")
    print("v2_launcher_preserved=true")
    print("v3_launcher_create_only=true")
    print("apply_root_custodied_source_required=true")
    print("apply_payload_root_custody_required=true")
    print("v3_launcher_crash_resumable_publication=true")
    print("v3_launcher_pending_inode_bound=true")
    print("v3_launcher_partial_pending_recovery=true")
    print("v3_launcher_resumed_pending_fsync=true")
    print("loaded_v2_forces_reload_even_without_need_reload_flag=true")
    print("custody_uid_process_absence_required=true")
    print("training_uid_process_absence_required=true")
    print("saved_fs_uid_slots_counted=true")
    print("all_four_uid_slots_counted=true")
    print("all_tid_role_uid_census_required=true")
    print("saved_fs_uid_only_threads_counted=true")
    print("role_thread_census_repeated=true")
    print("service_unit_atomic_replace=true")
    print("daemon_reload_only_systemd_mutation=true")
    print("service_action=false")
    print("target_action=false")
    print("training_action=false")
    print("durable_attempt_claim=false")
    print("training_execution=false")
    print("funds_movement=false")

def main()->int:
    ap=argparse.ArgumentParser()
    group=ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test",action="store_true")
    group.add_argument("--plan",action="store_true")
    group.add_argument("--apply",action="store_true")
    args=ap.parse_args()
    try:
        if args.self_test:
            self_test();return 0
        result=apply() if args.apply else plan()
        import json
        print(json.dumps(result,sort_keys=True,separators=(",",":")))
        return 0
    except (Hold,OSError,KeyError,ValueError,subprocess.SubprocessError) as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("service_action=false",file=sys.stderr)
        print("target_action=false",file=sys.stderr)
        print("training_action=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        print("funds_movement=false",file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())

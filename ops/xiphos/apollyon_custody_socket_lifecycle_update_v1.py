#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import stat
import subprocess
import sys

MARKER="VOID_APOLLYON_CUSTODY_SOCKET_LIFECYCLE_UPDATE_V1"
TARGET_HOST="Xiphos"
ROOT=Path(__file__).resolve().parents[2]

MANIFEST_REL="ops/xiphos/apollyon-custody-socket-lifecycle-update-v1.json"
MANIFEST_BLOB="76c58c05124e726eb1acee7f6841b2a371c5606b"
SERVICE_REL="ops/xiphos/void-apollyon-authorization-custody-v1.service"
OLD_SERVICE_BLOB="6ff5315f3ada3607d86c865742c34d9de3238659"
LIFECYCLE_SERVICE_BLOB="83f363b331bc2331416fd1c0ca6d52f53371fef0"
ENV4_SERVICE_BLOB="86ed25003c554dcfe3019e71d5a3a78851fcc50a"
NEW_SERVICE_BLOB="30b7b7c62b6b7834ae91db1eb37df05286ca5764"
PREDECESSOR_SERVICE_STATES={
    "old_exact":OLD_SERVICE_BLOB,
    "lifecycle_exact":LIFECYCLE_SERVICE_BLOB,
    "env4_exact":ENV4_SERVICE_BLOB,
}
TARGET_REL="ops/xiphos/void-apollyon-authorization-custody-v1.target"
TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
HELPER_REL="ops/xiphos/apollyon_custody_stale_socket_cleanup_v1.py"
HELPER_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"

SERVICE_UNIT="void-apollyon-authorization-custody-v1.service"
TARGET_UNIT="void-apollyon-authorization-custody-v1.target"
SERVICE_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.service")
TARGET_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.target")
LIFECYCLE_ROOT=Path("/opt/void-apollyon-custody-lifecycle-v1")
HELPER_PATH=LIFECYCLE_ROOT/"apollyon_custody_stale_socket_cleanup_v1.py"
EXPECTED_EXEC_STOP_POST=(
    "/usr/bin/python3 -I -B "
    "/opt/void-apollyon-custody-lifecycle-v1/"
    "apollyon_custody_stale_socket_cleanup_v1.py --cleanup"
)
ENV4_UNSET_ENVIRONMENT=(
    "LD_LIBRARY_PATH","LD_PRELOAD","NODE_OPTIONS","NODE_PATH",
)
EXPECTED_UNSET_ENVIRONMENT=(
    "GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD",
    "NODE_OPTIONS","NODE_PATH","OPENSSL_CONF",
)

class Hold(RuntimeError): pass

class ApplyHold(Hold):
    def __init__(self,reason:str,receipt:dict[str,object])->None:
        super().__init__(reason)
        self.receipt=receipt

def hold(reason:str)->None: raise Hold(reason)

def receipt_fact(value:object)->str:
    if value is None:return "not_applicable"
    if isinstance(value,bool):return str(value).lower()
    return str(value)

def git_blob(data:bytes)->str:
    h=hashlib.sha1();h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data);return h.hexdigest()

def read_source(relative:str,expected:str)->bytes:
    path=ROOT/relative
    st=os.lstat(path)
    if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink!=1:
        hold("source_metadata_invalid:"+relative)
    data=path.read_bytes()
    if len(data)!=st.st_size or git_blob(data)!=expected:
        hold("source_blob_mismatch:"+relative)
    return data

def load_manifest()->dict:
    value=json.loads(read_source(MANIFEST_REL,MANIFEST_BLOB))
    if value.get("marker")!=MARKER or value.get("version")!=1 or value.get("target_host")!=TARGET_HOST:
        hold("manifest_invalid")
    if (
        value.get("old_service_blob_sha1")!=OLD_SERVICE_BLOB or
        value.get("accepted_predecessor_service_blobs")!={
            "base":OLD_SERVICE_BLOB,
            "env4":ENV4_SERVICE_BLOB,
            "lifecycle":LIFECYCLE_SERVICE_BLOB,
        } or
        value.get("new_service_blob_sha1")!=NEW_SERVICE_BLOB or
        value.get("target_blob_sha1")!=TARGET_BLOB or
        value.get("cleanup_blob_sha1")!=HELPER_BLOB or
        value.get("exec_stop_post")!=EXPECTED_EXEC_STOP_POST or
        value.get("unset_environment")!=list(EXPECTED_UNSET_ENVIRONMENT) or
        value.get("cleanup_custody_uid_process_exclusivity_required") is not True or
        value.get("target_unit_file_state_required")!="disabled" or
        value.get("service_unit_file_state_required")!="static"
    ): hold("manifest_identity_invalid")
    return value

def run(argv:list[str],check=True)->subprocess.CompletedProcess[str]:
    r=subprocess.run(
        argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=20,
        env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"},
    )
    if check and r.returncode!=0:hold("command_failed:"+Path(argv[0]).name)
    return r

def exact_dormant(unit:str,expected_unit_file_state:str)->dict[str,str]:
    r=run([
        "/usr/bin/systemctl","show",unit,"--no-pager",
        "-p","LoadState","-p","ActiveState","-p","UnitFileState","-p","MainPID",
    ],check=False)
    if r.returncode!=0:hold("unit_state_probe_failed:"+unit)
    props={}
    for line in r.stdout.splitlines():
        if "=" not in line:hold("unit_state_probe_invalid:"+unit)
        k,v=line.split("=",1)
        if k in props:hold("unit_state_probe_duplicate:"+unit)
        props[k]=v
    if props.get("LoadState")!="loaded" or props.get("ActiveState")!="inactive":
        hold("unit_not_exactly_dormant:"+unit)
    if props.get("UnitFileState")!=expected_unit_file_state:
        hold("unit_file_state_unexpected:"+unit)
    if props.get("MainPID") not in ("","0",None):
        hold("unit_mainpid_nonzero:"+unit)
    return props

def installed_blob(path:Path,mode:int)->str:
    st=os.lstat(path)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink!=1 or
        st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)!=mode
    ): hold("installed_file_metadata_invalid:"+str(path))
    data=path.read_bytes()
    if len(data)!=st.st_size:hold("installed_file_read_invalid:"+str(path))
    return git_blob(data)

def service_state()->str:
    digest=installed_blob(SERVICE_PATH,0o644)
    for state,blob in PREDECESSOR_SERVICE_STATES.items():
        if digest==blob:return state
    if digest==NEW_SERVICE_BLOB:return "new_exact"
    hold("service_unit_collision")

def helper_state()->str:
    try:digest=installed_blob(HELPER_PATH,0o444)
    except FileNotFoundError:return "absent"
    if digest==HELPER_BLOB:return "exact"
    hold("cleanup_helper_collision")

def verify_target()->None:
    if installed_blob(TARGET_PATH,0o644)!=TARGET_BLOB:hold("target_blob_mismatch")
    props=exact_dormant(TARGET_UNIT,"disabled")
    r=run([
        "/usr/bin/systemctl","show",TARGET_UNIT,"--no-pager",
        "-p","Wants","-p","PropagatesStopTo",
    ])
    relation={}
    for line in r.stdout.splitlines():
        if "=" in line:
            k,v=line.split("=",1);relation[k]=v
    if SERVICE_UNIT not in relation.get("Wants","").split():hold("target_wants_missing")
    if SERVICE_UNIT not in relation.get("PropagatesStopTo","").split():hold("target_stop_propagation_missing")

def loaded_service_properties()->dict[str,str]:
    exact_dormant(SERVICE_UNIT,"static")
    names=(
        "FragmentPath","DropInPaths","NeedDaemonReload",
        "RefuseManualStart","RefuseManualStop","ExecStopPost","UnsetEnvironment",
    )
    argv=["/usr/bin/systemctl","show",SERVICE_UNIT,"--no-pager"]
    for name in names:argv.extend(["-p",name])
    r=run(argv,check=False)
    if r.returncode!=0:hold("loaded_service_probe_failed")
    props={}
    for line in r.stdout.splitlines():
        if "=" not in line:hold("loaded_service_probe_invalid")
        k,v=line.split("=",1)
        if k not in names or k in props:hold("loaded_service_probe_duplicate_or_extra")
        props[k]=v
    if set(props)!=set(names):hold("loaded_service_probe_incomplete")
    return props

def classify_loaded_service(file_state:str,props:dict[str,str])->str:
    if props.get("FragmentPath")!=str(SERVICE_PATH):
        hold("loaded_service_fragment_path_invalid")
    if props.get("DropInPaths")!="":hold("loaded_service_dropins_present")
    if props.get("RefuseManualStart")!="yes" or props.get("RefuseManualStop")!="yes":
        hold("service_manual_refusal_missing")
    need_reload=props.get("NeedDaemonReload")
    command=props.get("ExecStopPost","").strip()
    unset=props.get("UnsetEnvironment","").split()
    cleanup_shape=all(required in command for required in (
        "/usr/bin/python3","-I","-B",
        "/opt/void-apollyon-custody-lifecycle-v1/"
        "apollyon_custody_stale_socket_cleanup_v1.py",
        "--cleanup",
    ))
    base_shape=(command=="" and unset==[])
    lifecycle_shape=(cleanup_shape and unset==[])
    env4_shape=(
        cleanup_shape
        and len(unset)==len(ENV4_UNSET_ENVIRONMENT)
        and set(unset)==set(ENV4_UNSET_ENVIRONMENT)
    )
    new_shape=(
        cleanup_shape
        and len(unset)==len(EXPECTED_UNSET_ENVIRONMENT)
        and set(unset)==set(EXPECTED_UNSET_ENVIRONMENT)
    )
    predecessor_shapes={
        "old_exact":base_shape,
        "lifecycle_exact":lifecycle_shape,
        "env4_exact":env4_shape,
    }
    if (
        file_state in predecessor_shapes
        and need_reload=="no"
        and predecessor_shapes[file_state]
    ):
        return (
            "old_loaded" if file_state=="old_exact"
            else "predecessor_loaded"
        )
    if (
        file_state=="new_exact"
        and need_reload=="yes"
        and (base_shape or lifecycle_shape or env4_shape)
    ):
        return "new_file_pending_reload"
    if file_state=="new_exact" and need_reload=="no" and new_shape:
        return "new_loaded"
    hold("loaded_service_generation_mismatch")

def loaded_service_state(file_state:str)->str:
    return classify_loaded_service(file_state,loaded_service_properties())

def classify_lifecycle_state(
    service_file_state:str,cleanup_helper_state:str,loaded_state:str
)->dict[str,str]:
    table={
        ("old_exact","absent","old_loaded"):
            ("initial","APPLY_SOCKET_LIFECYCLE_UPDATE"),
        ("old_exact","exact","old_loaded"):
            ("helper_only","RESUME_SERVICE_PUBLICATION"),
        ("lifecycle_exact","exact","predecessor_loaded"):
            ("predecessor_ready","APPLY_SERVICE_UPGRADE"),
        ("env4_exact","exact","predecessor_loaded"):
            ("predecessor_ready","APPLY_SERVICE_UPGRADE"),
        ("new_exact","exact","new_file_pending_reload"):
            ("new_file_pending_reload","RESUME_DAEMON_RELOAD"),
        ("new_exact","exact","new_loaded"):
            ("complete","SOCKET_LIFECYCLE_ALREADY_EXACT"),
    }
    value=table.get((service_file_state,cleanup_helper_state,loaded_state))
    if value is None:hold("lifecycle_state_invalid")
    return {"lifecycle_state":value[0],"next_action":value[1]}

def host_lifecycle_state()->dict[str,str]:
    verify_target()
    service_file=service_state()
    helper=helper_state()
    loaded=loaded_service_state(service_file)
    state=classify_lifecycle_state(service_file,helper,loaded)
    return {
        "service_unit_state":service_file,
        "cleanup_helper_state":helper,
        "loaded_service_state":loaded,
        **state,
    }

def daemon_reload()->None:
    run(["/usr/bin/systemctl","daemon-reload"])

def ensure_root_dir()->None:
    try:st=os.lstat(LIFECYCLE_ROOT)
    except FileNotFoundError:
        LIFECYCLE_ROOT.mkdir(mode=0o755)
        os.chown(LIFECYCLE_ROOT,0,0);os.chmod(LIFECYCLE_ROOT,0o755)
        st=os.lstat(LIFECYCLE_ROOT)
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)!=0o755
    ):hold("lifecycle_root_collision")

def install_helper()->bool:
    data=read_source(HELPER_REL,HELPER_BLOB)
    state=helper_state()
    if state=="exact":return False
    ensure_root_dir()
    fd=os.open(
        HELPER_PATH,
        os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),
        0o444,
    )
    try:
        sent=0
        while sent<len(data):sent+=os.write(fd,data[sent:])
        os.fsync(fd);os.fchmod(fd,0o444);os.fchown(fd,0,0)
    finally:os.close(fd)
    if helper_state()!="exact":hold("cleanup_helper_install_failed")
    return True

def replace_service_unit()->bool:
    before_state=service_state()
    if before_state=="new_exact":return False
    if before_state not in PREDECESSOR_SERVICE_STATES:
        hold("service_unit_predecessor_invalid")
    new=read_source(SERVICE_REL,NEW_SERVICE_BLOB)
    old=os.lstat(SERVICE_PATH)
    temp=SERVICE_PATH.parent/(".void-apollyon-custody-service.new."+str(os.getpid()))
    fd=os.open(temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),0o600)
    try:
        sent=0
        while sent<len(new):sent+=os.write(fd,new[sent:])
        os.fsync(fd);os.fchmod(fd,0o644);os.fchown(fd,0,0)
    finally:os.close(fd)
    try:
        current=os.lstat(SERVICE_PATH)
        if (
            current.st_dev!=old.st_dev or current.st_ino!=old.st_ino or
            current.st_size!=old.st_size or service_state()!=before_state
        ):hold("service_unit_changed_before_replace")
        os.replace(temp,SERVICE_PATH)
        dfd=os.open(SERVICE_PATH.parent,os.O_RDONLY|getattr(os,"O_DIRECTORY",0))
        try:os.fsync(dfd)
        finally:os.close(dfd)
    finally:
        try:os.unlink(temp)
        except FileNotFoundError:pass
    if service_state()!="new_exact":hold("service_unit_replace_failed")
    return True

def apply_transition(
    before:dict[str,object],
    *,
    _install_helper_fn=install_helper,
    _replace_service_fn=replace_service_unit,
    _reload_fn=daemon_reload,
    _state_fn=host_lifecycle_state,
)->dict[str,object]:
    stage=str(before["lifecycle_state"])
    receipt:dict[str,object]={
        "helper_install_attempted":False,
        "helper_install_returned_success":False,
        "service_unit_replace_attempted":False,
        "service_unit_replace_returned_success":False,
        "daemon_reload_attempted":False,
        "daemon_reload_command_succeeded":None,
        "final_postcheck_attempted":False,
        "persistent_filesystem_mutation_possible":False,
        "recovery_snapshot_attempted":False,
        "recovery_snapshot_reason":"not_needed",
        "recovery_lifecycle_state":"not_needed",
        "recovery_cleanup_helper_state":"not_needed",
        "recovery_service_unit_state":"not_needed",
        "recovery_loaded_service_state":"not_needed",
        "recovery_next_action":"not_needed",
    }
    try:
        if stage=="initial":
            receipt["helper_install_attempted"]=True
            receipt["helper_install_returned_success"]=bool(_install_helper_fn())
        if stage in ("initial","helper_only","predecessor_ready"):
            receipt["service_unit_replace_attempted"]=True
            receipt["service_unit_replace_returned_success"]=bool(
                _replace_service_fn()
            )
        if stage in (
            "initial","helper_only","predecessor_ready",
            "new_file_pending_reload",
        ):
            receipt["daemon_reload_attempted"]=True
            _reload_fn()
            receipt["daemon_reload_command_succeeded"]=True
        elif stage!="complete":
            hold("apply_lifecycle_state_invalid:"+stage)
        receipt["final_postcheck_attempted"]=True
        after=_state_fn()
        if after.get("lifecycle_state")!="complete":
            hold("post_update_lifecycle_not_complete")
        return {**receipt,**after}
    except Exception as exc:
        receipt["persistent_filesystem_mutation_possible"]=bool(
            receipt["helper_install_attempted"]
            or receipt["service_unit_replace_attempted"]
        )
        if receipt["daemon_reload_attempted"] is True and (
            receipt["daemon_reload_command_succeeded"] is None
        ):
            receipt["daemon_reload_command_succeeded"]=False
        receipt["recovery_snapshot_attempted"]=True
        try:
            recovery=_state_fn()
        except Exception as recovery_exc:
            receipt["recovery_snapshot_reason"]=(
                type(recovery_exc).__name__+":"+str(recovery_exc)
            )
            receipt["recovery_lifecycle_state"]="unavailable"
            receipt["recovery_cleanup_helper_state"]="unavailable"
            receipt["recovery_service_unit_state"]="unavailable"
            receipt["recovery_loaded_service_state"]="unavailable"
            receipt["recovery_next_action"]="MANUAL_RECOVERY_REVIEW"
        else:
            receipt["recovery_snapshot_reason"]="none"
            receipt["recovery_lifecycle_state"]=recovery["lifecycle_state"]
            receipt["recovery_cleanup_helper_state"]=recovery["cleanup_helper_state"]
            receipt["recovery_service_unit_state"]=recovery["service_unit_state"]
            receipt["recovery_loaded_service_state"]=recovery["loaded_service_state"]
            receipt["recovery_next_action"]=recovery["next_action"]
        if isinstance(exc,(Hold,OSError,KeyError,ValueError,subprocess.SubprocessError)):
            raise ApplyHold(str(exc),receipt) from exc
        raise

def plan()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():hold("wrong_host")
    load_manifest()
    read_source(SERVICE_REL,NEW_SERVICE_BLOB)
    read_source(TARGET_REL,TARGET_BLOB)
    read_source(HELPER_REL,HELPER_BLOB)
    state=host_lifecycle_state()
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        **state,
        "target_stop_control_verified":True,
        "service_dormant":True,"target_dormant":True,
        "service_action":False,"target_action":False,"socket_mutation":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
    }

def apply()->dict:
    if os.geteuid()!=0:hold("apply_requires_root")
    before=plan()
    transition=apply_transition(before)
    return {
        **before,**transition,
        "mode":"--apply",
        "cleanup_helper_installed":
            transition["cleanup_helper_state"]=="exact",
        "service_unit_updated":
            transition["service_unit_replace_returned_success"],
        "daemon_reload_performed":
            transition["daemon_reload_command_succeeded"] is True,
        "service_action":False,"target_action":False,"socket_mutation":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"LIVE_CUSTODY_DORMANT_QUALIFICATION",
    }

def self_test()->None:
    m=load_manifest()
    assert m["cleanup_blob_sha1"]==HELPER_BLOB
    assert m["new_service_blob_sha1"]==NEW_SERVICE_BLOB
    assert m["accepted_predecessor_service_blobs"]=={
        "base":OLD_SERVICE_BLOB,
        "env4":ENV4_SERVICE_BLOB,
        "lifecycle":LIFECYCLE_SERVICE_BLOB,
    }
    assert m["target_blob_sha1"]==TARGET_BLOB
    assert m["exec_stop_post"]==EXPECTED_EXEC_STOP_POST
    assert m["unset_environment"]==list(EXPECTED_UNSET_ENVIRONMENT)
    service=read_source(SERVICE_REL,NEW_SERVICE_BLOB).decode()
    assert "ExecStopPost="+EXPECTED_EXEC_STOP_POST in service
    assert (
        "UnsetEnvironment=GCONV_PATH LD_AUDIT LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH OPENSSL_CONF"
        in service
    )
    own=Path(__file__).read_text(encoding="utf-8")
    assert 'exact_dormant(TARGET_UNIT,"disabled")' in own
    assert own.count('exact_dormant(SERVICE_UNIT,"static")')>=2
    assert 'props.get("UnitFileState")!=expected_unit_file_state' in own
    assert 'unit_file_state_unexpected:' in own
    for rejected_target_state in (
        "enabled","enabled-runtime","masked","static","linked",
        "linked-runtime","indirect","generated",
    ):
        assert rejected_target_state!="disabled"
    assert classify_lifecycle_state(
        "old_exact","absent","old_loaded"
    )["lifecycle_state"]=="initial"
    assert classify_lifecycle_state(
        "old_exact","exact","old_loaded"
    )["lifecycle_state"]=="helper_only"
    assert classify_lifecycle_state(
        "lifecycle_exact","exact","predecessor_loaded"
    )["lifecycle_state"]=="predecessor_ready"
    assert classify_lifecycle_state(
        "env4_exact","exact","predecessor_loaded"
    )["next_action"]=="APPLY_SERVICE_UPGRADE"
    assert classify_lifecycle_state(
        "new_exact","exact","new_file_pending_reload"
    )["next_action"]=="RESUME_DAEMON_RELOAD"
    assert classify_lifecycle_state(
        "new_exact","exact","new_loaded"
    )["lifecycle_state"]=="complete"

    def loaded_props(
        *,command:str="",unset:str="",need_reload:str="no"
    )->dict[str,str]:
        return {
            "FragmentPath":str(SERVICE_PATH),
            "DropInPaths":"",
            "NeedDaemonReload":need_reload,
            "RefuseManualStart":"yes",
            "RefuseManualStop":"yes",
            "ExecStopPost":command,
            "UnsetEnvironment":unset,
        }
    assert classify_loaded_service(
        "old_exact",loaded_props()
    )=="old_loaded"
    assert classify_loaded_service(
        "lifecycle_exact",loaded_props(command=EXPECTED_EXEC_STOP_POST)
    )=="predecessor_loaded"
    assert classify_loaded_service(
        "env4_exact",loaded_props(
            command=EXPECTED_EXEC_STOP_POST,
            unset=" ".join(ENV4_UNSET_ENVIRONMENT),
        )
    )=="predecessor_loaded"
    assert classify_loaded_service(
        "new_exact",loaded_props(
            command=EXPECTED_EXEC_STOP_POST,
            need_reload="yes",
        )
    )=="new_file_pending_reload"
    assert classify_loaded_service(
        "new_exact",loaded_props(
            command=EXPECTED_EXEC_STOP_POST,
            unset=" ".join(EXPECTED_UNSET_ENVIRONMENT),
        )
    )=="new_loaded"

    def synthetic_snapshot(state:dict[str,str])->dict[str,str]:
        return {
            "service_unit_state":state["service"],
            "cleanup_helper_state":state["helper"],
            "loaded_service_state":state["loaded"],
            **classify_lifecycle_state(
                state["service"],state["helper"],state["loaded"]
            ),
        }

    state={"service":"old_exact","helper":"absent","loaded":"old_loaded"}
    before=synthetic_snapshot(state)
    def helper_failure():
        state["helper"]="exact"
        raise Hold("synthetic_after_helper_creation")
    try:
        apply_transition(
            before,
            _install_helper_fn=helper_failure,
            _replace_service_fn=lambda:False,
            _reload_fn=lambda:None,
            _state_fn=lambda:synthetic_snapshot(state),
        )
    except ApplyHold as exc:
        assert str(exc)=="synthetic_after_helper_creation"
        assert exc.receipt["persistent_filesystem_mutation_possible"] is True
        assert exc.receipt["recovery_lifecycle_state"]=="helper_only"
        assert exc.receipt["recovery_next_action"]=="RESUME_SERVICE_PUBLICATION"
    else:
        raise AssertionError("synthetic_helper_failure_not_reported")

    def helper_resume_replace():
        state["service"]="new_exact"
        state["loaded"]="new_file_pending_reload"
        return True
    def helper_resume_reload():
        state["loaded"]="new_loaded"
    helper_resumed=apply_transition(
        synthetic_snapshot(state),
        _replace_service_fn=helper_resume_replace,
        _reload_fn=helper_resume_reload,
        _state_fn=lambda:synthetic_snapshot(state),
    )
    assert helper_resumed["lifecycle_state"]=="complete"

    state={
        "service":"lifecycle_exact","helper":"exact",
        "loaded":"predecessor_loaded",
    }
    before=synthetic_snapshot(state)
    def predecessor_replace_success():
        state["service"]="new_exact"
        state["loaded"]="new_file_pending_reload"
        return True
    def predecessor_reload_success():
        state["loaded"]="new_loaded"
    upgraded=apply_transition(
        before,
        _replace_service_fn=predecessor_replace_success,
        _reload_fn=predecessor_reload_success,
        _state_fn=lambda:synthetic_snapshot(state),
    )
    assert upgraded["lifecycle_state"]=="complete"
    assert upgraded["service_unit_replace_returned_success"] is True
    assert upgraded["daemon_reload_command_succeeded"] is True

    state={"service":"old_exact","helper":"exact","loaded":"old_loaded"}
    before=synthetic_snapshot(state)
    def replace_failure():
        state["service"]="new_exact"
        state["loaded"]="new_file_pending_reload"
        raise Hold("synthetic_after_service_replace_fsync")
    try:
        apply_transition(
            before,
            _replace_service_fn=replace_failure,
            _reload_fn=lambda:None,
            _state_fn=lambda:synthetic_snapshot(state),
        )
    except ApplyHold as exc:
        assert str(exc)=="synthetic_after_service_replace_fsync"
        assert exc.receipt["recovery_lifecycle_state"]=="new_file_pending_reload"
        assert exc.receipt["recovery_next_action"]=="RESUME_DAEMON_RELOAD"
    else:
        raise AssertionError("synthetic_service_replace_failure_not_reported")

    def replace_resume_reload():
        state["loaded"]="new_loaded"
    replace_resumed=apply_transition(
        synthetic_snapshot(state),
        _reload_fn=replace_resume_reload,
        _state_fn=lambda:synthetic_snapshot(state),
    )
    assert replace_resumed["lifecycle_state"]=="complete"

    state={
        "service":"new_exact","helper":"exact",
        "loaded":"new_file_pending_reload",
    }
    before=synthetic_snapshot(state)
    def reload_failure():
        raise Hold("synthetic_daemon_reload_failure")
    try:
        apply_transition(
            before,
            _reload_fn=reload_failure,
            _state_fn=lambda:synthetic_snapshot(state),
        )
    except ApplyHold as exc:
        assert str(exc)=="synthetic_daemon_reload_failure"
        assert exc.receipt["daemon_reload_attempted"] is True
        assert exc.receipt["daemon_reload_command_succeeded"] is False
        assert exc.receipt["persistent_filesystem_mutation_possible"] is False
        assert exc.receipt["recovery_lifecycle_state"]=="new_file_pending_reload"
    else:
        raise AssertionError("synthetic_reload_failure_not_reported")

    def reload_success():
        state["loaded"]="new_loaded"
    resumed=apply_transition(
        synthetic_snapshot(state),
        _reload_fn=reload_success,
        _state_fn=lambda:synthetic_snapshot(state),
    )
    assert resumed["lifecycle_state"]=="complete"
    assert resumed["daemon_reload_command_succeeded"] is True

    state={
        "service":"new_exact","helper":"exact",
        "loaded":"new_file_pending_reload",
    }
    before=synthetic_snapshot(state)
    postcheck_calls=0
    def reload_then_new():
        state["loaded"]="new_loaded"
    def flaky_postcheck():
        nonlocal postcheck_calls
        postcheck_calls+=1
        if postcheck_calls==1:
            raise Hold("synthetic_loaded_postcheck_failure")
        return synthetic_snapshot(state)
    try:
        apply_transition(
            before,
            _reload_fn=reload_then_new,
            _state_fn=flaky_postcheck,
        )
    except ApplyHold as exc:
        assert str(exc)=="synthetic_loaded_postcheck_failure"
        assert exc.receipt["final_postcheck_attempted"] is True
        assert exc.receipt["recovery_lifecycle_state"]=="complete"
        assert exc.receipt["recovery_next_action"]=="SOCKET_LIFECYCLE_ALREADY_EXACT"
    else:
        raise AssertionError("synthetic_postcheck_failure_not_reported")

    complete=apply_transition(
        synthetic_snapshot(state),
        _reload_fn=lambda:(_ for _ in ()).throw(
            AssertionError("reload_must_not_run_for_complete_state")
        ),
        _state_fn=lambda:synthetic_snapshot(state),
    )
    assert complete["lifecycle_state"]=="complete"
    assert complete["daemon_reload_attempted"] is False

    for forbidden_parts in (
        ("systemctl",'",',"start"),("systemctl",'",',"stop"),
        ("training_execution",'"',":True"),("durable_attempt_claim",'"',":True"),
        ("socket_mutation",'"',":True"),
    ):
        assert "".join(forbidden_parts) not in own
    print(MARKER+"_SELF_TEST_GREEN")
    print("cleanup_helper_blob="+HELPER_BLOB)
    print("service_unit_blob="+NEW_SERVICE_BLOB)
    print("target_stop_control_required=true")
    print("target_unit_file_state_disabled_required=true")
    print("service_unit_file_state_static_required=true")
    print("manager_environment_influence_unset=true")
    print("reviewed_predecessor_generations_accepted=true")
    print("deployed_lifecycle_predecessor_upgrade_proven=true")
    print("resumable_pending_reload_state=true")
    print("truthful_partial_mutation_receipt=true")
    print("failure_injection_after_helper_creation=true")
    print("failure_injection_after_service_replace=true")
    print("failure_injection_daemon_reload=true")
    print("failure_injection_loaded_postcheck=true")
    print("idempotent_resume_proven=true")
    print("service_action=false")
    print("target_action=false")
    print("socket_mutation=false")
    print("training_execution=false")
    print("durable_attempt_claim=false")

def main()->int:
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true");g.add_argument("--plan",action="store_true");g.add_argument("--apply",action="store_true")
    args=ap.parse_args()
    try:
        if args.self_test:self_test();return 0
        out=apply() if args.apply else plan()
        print(json.dumps(out,sort_keys=True,separators=(",",":")));return 0
    except ApplyHold as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        for key in (
            "helper_install_attempted","helper_install_returned_success",
            "service_unit_replace_attempted",
            "service_unit_replace_returned_success",
            "daemon_reload_attempted","daemon_reload_command_succeeded",
            "final_postcheck_attempted",
            "persistent_filesystem_mutation_possible",
            "recovery_snapshot_attempted","recovery_snapshot_reason",
            "recovery_lifecycle_state","recovery_cleanup_helper_state",
            "recovery_service_unit_state","recovery_loaded_service_state",
            "recovery_next_action",
        ):
            print(key+"="+receipt_fact(exc.receipt.get(key)),file=sys.stderr)
        print("service_action=false",file=sys.stderr);print("target_action=false",file=sys.stderr)
        print("socket_mutation=false",file=sys.stderr);print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr);print("funds_movement=false",file=sys.stderr)
        return 2
    except (Hold,OSError,KeyError) as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("persistent_filesystem_mutation_possible=false",file=sys.stderr)
        print("recovery_snapshot_attempted=false",file=sys.stderr)
        print("recovery_next_action=not_applicable",file=sys.stderr)
        print("service_action=false",file=sys.stderr);print("target_action=false",file=sys.stderr)
        print("socket_mutation=false",file=sys.stderr);print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr);print("funds_movement=false",file=sys.stderr)
        return 2
if __name__=="__main__":raise SystemExit(main())

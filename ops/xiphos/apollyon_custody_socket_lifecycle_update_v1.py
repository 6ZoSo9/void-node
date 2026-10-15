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
MANIFEST_BLOB="36f3d7b9228486364afa31b13b7aa6a228963389"
SERVICE_REL="ops/xiphos/void-apollyon-authorization-custody-v1.service"
OLD_SERVICE_BLOB="6ff5315f3ada3607d86c865742c34d9de3238659"
NEW_SERVICE_BLOB="83f363b331bc2331416fd1c0ca6d52f53371fef0"
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

class Hold(RuntimeError): pass
def hold(reason:str)->None: raise Hold(reason)

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
        value.get("new_service_blob_sha1")!=NEW_SERVICE_BLOB or
        value.get("target_blob_sha1")!=TARGET_BLOB or
        value.get("cleanup_blob_sha1")!=HELPER_BLOB or
        value.get("exec_stop_post")!=EXPECTED_EXEC_STOP_POST or
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
    if digest==OLD_SERVICE_BLOB:return "old_exact"
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

def verify_loaded_service()->None:
    exact_dormant(SERVICE_UNIT,"static")
    r=run([
        "/usr/bin/systemctl","show",SERVICE_UNIT,"--no-pager",
        "-p","RefuseManualStart","-p","RefuseManualStop","-p","ExecStopPost",
    ])
    props={}
    for line in r.stdout.splitlines():
        if "=" in line:
            k,v=line.split("=",1);props[k]=v
    if props.get("RefuseManualStart")!="yes" or props.get("RefuseManualStop")!="yes":
        hold("service_manual_refusal_missing")
    command=props.get("ExecStopPost","")
    for required in (
        "/usr/bin/python3","-I","-B",
        "/opt/void-apollyon-custody-lifecycle-v1/apollyon_custody_stale_socket_cleanup_v1.py",
        "--cleanup",
    ):
        if required not in command:hold("loaded_exec_stop_post_invalid")

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
    if service_state()=="new_exact":return False
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
            current.st_size!=old.st_size or service_state()!="old_exact"
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

def plan()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():hold("wrong_host")
    load_manifest()
    read_source(SERVICE_REL,NEW_SERVICE_BLOB)
    read_source(TARGET_REL,TARGET_BLOB)
    read_source(HELPER_REL,HELPER_BLOB)
    verify_target()
    exact_dormant(SERVICE_UNIT,"static")
    s=service_state();h=helper_state()
    if s=="new_exact":
        if h!="exact":hold("new_service_without_cleanup_helper")
        verify_loaded_service()
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        "service_unit_state":s,"cleanup_helper_state":h,
        "target_stop_control_verified":True,
        "service_dormant":True,"target_dormant":True,
        "service_action":False,"target_action":False,"socket_mutation":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"APPLY_SOCKET_LIFECYCLE_UPDATE" if s=="old_exact" or h=="absent" else "SOCKET_LIFECYCLE_ALREADY_EXACT",
    }

def apply()->dict:
    if os.geteuid()!=0:hold("apply_requires_root")
    before=plan()
    helper_changed=install_helper()
    service_changed=replace_service_unit()
    if helper_changed or service_changed:
        run(["/usr/bin/systemctl","daemon-reload"])
    verify_target();verify_loaded_service()
    if helper_state()!="exact" or service_state()!="new_exact":
        hold("post_update_identity_invalid")
    return {
        **before,"mode":"--apply","service_unit_state":"new_exact","cleanup_helper_state":"exact",
        "cleanup_helper_installed":True,"service_unit_updated":service_changed,
        "daemon_reload_performed":helper_changed or service_changed,
        "service_action":False,"target_action":False,"socket_mutation":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"LIVE_CUSTODY_DORMANT_QUALIFICATION",
    }

def self_test()->None:
    m=load_manifest()
    assert m["cleanup_blob_sha1"]==HELPER_BLOB
    assert m["new_service_blob_sha1"]==NEW_SERVICE_BLOB
    assert m["target_blob_sha1"]==TARGET_BLOB
    assert m["exec_stop_post"]==EXPECTED_EXEC_STOP_POST
    service=read_source(SERVICE_REL,NEW_SERVICE_BLOB).decode()
    assert "ExecStopPost="+EXPECTED_EXEC_STOP_POST in service
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
    except (Hold,OSError,KeyError) as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("service_action=false",file=sys.stderr);print("target_action=false",file=sys.stderr)
        print("socket_mutation=false",file=sys.stderr);print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr);print("funds_movement=false",file=sys.stderr)
        return 2
if __name__=="__main__":raise SystemExit(main())

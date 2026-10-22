#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import socket
import stat
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

V3_LAUNCHER_REL="tools/apollyon-authorization-custody-launcher-v3.mjs"
V3_SERVICE_REL="ops/xiphos/void-apollyon-authorization-custody-v1-launcher-v3.service"

TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
OLD_SERVICE_BLOB="30b7b7c62b6b7834ae91db1eb37df05286ca5764"
NEW_SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"
V2_LAUNCHER_BLOB="d23ff045d8c355401fed499c6bcffd503ba4c7fd"
V3_LAUNCHER_BLOB="ec9e1d2c01581ebdc5323056939f846e67692fe6"
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

def unit_props(unit:str,names:tuple[str,...])->dict[str,str]:
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
    if set(out)!=set(names):
        hold("unit_probe_incomplete:"+unit)
    return out

def require_dormant()->dict[str,dict[str,str]]:
    target=unit_props(TARGET_UNIT,(
        "LoadState","ActiveState","UnitFileState","MainPID","NeedDaemonReload",
        "FragmentPath","DropInPaths","Wants","PropagatesStopTo",
    ))
    service=unit_props(SERVICE_UNIT,(
        "LoadState","ActiveState","UnitFileState","MainPID","NeedDaemonReload",
        "FragmentPath","DropInPaths","RefuseManualStart","RefuseManualStop",
        "UnsetEnvironment","ExecStart",
    ))
    training=unit_props(TRAINING_UNIT,(
        "LoadState","ActiveState","UnitFileState","MainPID",
    ))
    if (
        target["LoadState"]!="loaded" or target["ActiveState"]!="inactive" or
        target["UnitFileState"]!="disabled" or
        target["MainPID"] not in ("","0") or
        target["NeedDaemonReload"]!="no" or
        target["FragmentPath"]!=os.fspath(TARGET_PATH) or
        target["DropInPaths"]!="" or
        set(target["Wants"].split())!={SERVICE_UNIT} or
        set(target["PropagatesStopTo"].split())!={SERVICE_UNIT}
    ):
        hold("target_not_exactly_dormant")
    if (
        service["LoadState"]!="loaded" or service["ActiveState"]!="inactive" or
        service["UnitFileState"]!="static" or service["MainPID"] not in ("","0") or
        service["NeedDaemonReload"] not in ("no","yes") or
        service["FragmentPath"]!=os.fspath(SERVICE_PATH) or
        service["DropInPaths"]!="" or
        service["RefuseManualStart"]!="yes" or service["RefuseManualStop"]!="yes" or
        set(service["UnsetEnvironment"].split())!=set(EXPECTED_UNSET)
    ):
        hold("service_not_exactly_dormant")
    if (
        training["LoadState"]!="loaded" or
        training["ActiveState"] not in ("inactive","failed") or
        training["UnitFileState"]!="static" or
        training["MainPID"] not in ("","0")
    ):
        hold("training_not_dormant")
    return {"target":target,"service":service,"training":training}

def launcher_state()->str:
    exact_regular(V2_LAUNCHER_PATH,0o444,0,0,V2_LAUNCHER_BLOB)
    try:
        digest=exact_regular(V3_LAUNCHER_PATH,0o444,0,0)
    except FileNotFoundError:
        return "absent"
    if digest!=V3_LAUNCHER_BLOB:
        hold("v3_launcher_collision")
    return "exact"

def service_state()->str:
    digest=exact_regular(SERVICE_PATH,0o644,0,0)
    if digest==OLD_SERVICE_BLOB:return "v2_exact"
    if digest==NEW_SERVICE_BLOB:return "v3_exact"
    hold("service_unit_collision")

def classify(
    service_file:str,launcher:str,exec_start:str,need_reload:str,
)->dict[str,str]:
    old_path=os.fspath(V2_LAUNCHER_PATH)
    new_path=os.fspath(V3_LAUNCHER_PATH)
    old_loaded=old_path in exec_start and new_path not in exec_start
    new_loaded=new_path in exec_start and old_path not in exec_start
    if (
        service_file=="v2_exact" and launcher=="absent" and
        old_loaded and need_reload=="no"
    ):
        return {"lifecycle_state":"ready","next_action":"INSTALL_V3_LAUNCHER"}
    if (
        service_file=="v2_exact" and launcher=="exact" and
        old_loaded and need_reload=="no"
    ):
        return {"lifecycle_state":"launcher_staged","next_action":"REPLACE_SERVICE_UNIT"}
    if (
        service_file=="v3_exact" and launcher=="exact" and
        old_loaded and need_reload=="yes"
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
    ):
        require_trusted_ancestor_chain(protected,include_leaf=False)
    exact_regular(TARGET_PATH,0o644,0,0,TARGET_BLOB)
    units=require_dormant()
    launch=launcher_state()
    service=service_state()
    state=classify(
        service,launch,units["service"]["ExecStart"],
        units["service"]["NeedDaemonReload"],
    )
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        "launcher_state":launch,"service_unit_state":service,**state,
        "target_dormant":True,"service_dormant":True,"training_dormant":True,
        "service_action":False,"target_action":False,"training_action":False,
        "durable_attempt_claim":False,"training_execution":False,
        "funds_movement":False,
    }

def fsync_dir(path:Path)->None:
    fd=os.open(path,os.O_RDONLY|getattr(os,"O_DIRECTORY",0)|getattr(os,"O_CLOEXEC",0))
    try:os.fsync(fd)
    finally:os.close(fd)

def create_exact(path:Path,data:bytes,mode:int)->bool:
    require_trusted_ancestor_chain(path,include_leaf=False)
    try:
        digest=exact_regular(path,mode,0,0)
    except FileNotFoundError:
        pass
    else:
        if digest!=git_blob(data):hold("existing_destination_collision:"+os.fspath(path))
        return False
    require_dormant()
    tmp=path.parent/("."+path.name+".pending."+str(os.getpid()))
    fd=None
    try:
        fd=os.open(
            tmp,os.O_RDWR|os.O_CREAT|os.O_EXCL|
            getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),0o600,
        )
        sent=0
        while sent<len(data):
            n=os.write(fd,data[sent:])
            if n<=0:hold("pending_write_failed")
            sent+=n
        os.fchown(fd,0,0);os.fchmod(fd,mode)
        os.fsync(fd)
        require_dormant()
        os.link(tmp,path,follow_symlinks=False)
        fsync_dir(path.parent)
        os.unlink(tmp);fsync_dir(path.parent)
    finally:
        if fd is not None:
            try:os.close(fd)
            except OSError:pass
        try:os.unlink(tmp)
        except FileNotFoundError:pass
    exact_regular(path,mode,0,0,git_blob(data))
    return True

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
    before=plan()
    launcher_data=read_source(V3_LAUNCHER_REL,V3_LAUNCHER_BLOB)
    service_data=read_source(V3_SERVICE_REL,NEW_SERVICE_BLOB)
    launcher_installed=False
    service_replaced=False
    daemon_reload_performed=False

    if before["launcher_state"]=="absent":
        launcher_installed=create_exact(V3_LAUNCHER_PATH,launcher_data,0o444)
    mid=plan()
    if mid["service_unit_state"]=="v2_exact":
        service_replaced=replace_service(service_data)

    # After file replacement systemd may report NeedDaemonReload=yes and the
    # strict plan intentionally cannot classify that as dormant-complete.
    file_state=service_state()
    if file_state=="v3_exact":
        loaded=unit_props(SERVICE_UNIT,("ExecStart","NeedDaemonReload"))
        if (
            os.fspath(V2_LAUNCHER_PATH) in loaded["ExecStart"] or
            loaded["NeedDaemonReload"]=="yes"
        ):
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
    assert classify(
        "v2_exact","absent",
        "/node "+os.fspath(V2_LAUNCHER_PATH)+" --socket-path /x","no",
    )["next_action"]=="INSTALL_V3_LAUNCHER"
    assert classify(
        "v2_exact","exact",
        "/node "+os.fspath(V2_LAUNCHER_PATH)+" --socket-path /x","no",
    )["next_action"]=="REPLACE_SERVICE_UNIT"
    assert classify(
        "v3_exact","exact",
        "/node "+os.fspath(V2_LAUNCHER_PATH)+" --socket-path /x","yes",
    )["next_action"]=="DAEMON_RELOAD"
    assert classify(
        "v3_exact","exact",
        "/node "+os.fspath(V3_LAUNCHER_PATH)+" --socket-path /x","no",
    )["lifecycle_state"]=="complete"
    own=Path(__file__).read_text(encoding="utf-8")
    for forbidden in (
        'systemctl","start','systemctl","stop',
        "training_execution":True","durable_attempt_claim":True",
        "eth_sendRawTransaction","PRIVATE KEY-----",
    ):
        assert forbidden not in own,forbidden
    for required in (
        'run(["/usr/bin/systemctl","daemon-reload"])',
        'require_dormant()',
        'require_trusted_ancestor_chain(',
        'trusted_ancestor_invalid:',
        'rebind_material_changed_before_daemon_reload',
        'V3_LAUNCHER_BLOB="ec9e1d2c01581ebdc5323056939f846e67692fe6"',
        'NEW_SERVICE_BLOB="51354b10da89413eb6991514496798c7a1b5d1e8"',
        '"lifecycle_state":"complete"',
    ):
        assert required in own,required
    print(MARKER+"_SELF_TEST_GREEN")
    print("v2_launcher_preserved=true")
    print("v3_launcher_create_only=true")
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

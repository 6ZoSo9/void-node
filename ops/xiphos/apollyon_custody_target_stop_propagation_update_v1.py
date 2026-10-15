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

MARKER="VOID_APOLLYON_CUSTODY_TARGET_STOP_PROPAGATION_UPDATE_V1"
TARGET_HOST="Xiphos"
ROOT=Path(__file__).resolve().parents[2]

MANIFEST_REL="ops/xiphos/apollyon-custody-target-stop-propagation-update-v1.json"
MANIFEST_BLOB="@UPDATE_MANIFEST_BLOB@"
TARGET_REL="ops/xiphos/void-apollyon-authorization-custody-v1.target"
OLD_TARGET_BLOB="d37ffefddb747d4c49f3ee70ea94a3612307a696"
NEW_TARGET_BLOB="@NEW_TARGET_BLOB@"

TARGET_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.target")
TARGET_UNIT="void-apollyon-authorization-custody-v1.target"
SERVICE_UNIT="void-apollyon-authorization-custody-v1.service"

class Hold(RuntimeError): pass
def hold(reason:str)->None: raise Hold(reason)

def git_blob(data:bytes)->str:
    h=hashlib.sha1();h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data);return h.hexdigest()

def run(argv:list[str],check=True)->subprocess.CompletedProcess[str]:
    r=subprocess.run(
        argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=20,
        env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"},
    )
    if check and r.returncode!=0:hold("command_failed:"+Path(argv[0]).name)
    return r

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
    data=read_source(MANIFEST_REL,MANIFEST_BLOB)
    value=json.loads(data)
    if value.get("marker")!=MARKER or value.get("version")!=1 or value.get("target_host")!=TARGET_HOST:
        hold("manifest_invalid")
    if value.get("old_blob_sha1")!=OLD_TARGET_BLOB or value.get("new_blob_sha1")!=NEW_TARGET_BLOB:
        hold("manifest_target_blob_invalid")
    if value.get("propagates_stop_to_service") is not True or value.get("restart_propagation") is not False:
        hold("manifest_stop_contract_invalid")
    return value

def installed_blob()->str:
    st=os.lstat(TARGET_PATH)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or st.st_nlink!=1 or
        stat.S_IMODE(st.st_mode)!=0o644
    ): hold("target_metadata_invalid")
    return git_blob(TARGET_PATH.read_bytes())

def state()->str:
    digest=installed_blob()
    if digest==OLD_TARGET_BLOB:return "old_exact"
    if digest==NEW_TARGET_BLOB:return "new_exact"
    hold("target_collision")

def inactive(unit:str)->bool:
    return run(["/usr/bin/systemctl","is-active",unit],check=False).stdout.strip()!="active"

def assert_dormant()->None:
    if not inactive(TARGET_UNIT):hold("activation_target_active")
    if not inactive(SERVICE_UNIT):hold("custody_service_active")

def verify_loaded_contract()->dict:
    target=run([
        "/usr/bin/systemctl","show",TARGET_UNIT,"--no-pager",
        "-p","LoadState","-p","ActiveState","-p","UnitFileState",
        "-p","Wants","-p","PropagatesStopTo",
    ])
    props={}
    for line in target.stdout.splitlines():
        if "=" in line:
            k,v=line.split("=",1);props[k]=v
    if props.get("LoadState")!="loaded":hold("target_not_loaded")
    if props.get("ActiveState")=="active":hold("target_active")
    if props.get("UnitFileState")=="enabled":hold("target_enabled")
    if SERVICE_UNIT not in props.get("Wants","").split():hold("target_wants_service_missing")
    if SERVICE_UNIT not in props.get("PropagatesStopTo","").split():hold("target_stop_propagation_missing")

    service=run([
        "/usr/bin/systemctl","show",SERVICE_UNIT,"--no-pager",
        "-p","ActiveState","-p","RefuseManualStart","-p","RefuseManualStop",
    ])
    sprops={}
    for line in service.stdout.splitlines():
        if "=" in line:
            k,v=line.split("=",1);sprops[k]=v
    if sprops.get("ActiveState")=="active":hold("custody_service_active")
    if sprops.get("RefuseManualStart")!="yes" or sprops.get("RefuseManualStop")!="yes":
        hold("service_manual_refusal_missing")
    return {**props,"ServiceRefuseManualStart":"yes","ServiceRefuseManualStop":"yes"}

def plan()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():hold("wrong_host")
    load_manifest(); assert_dormant()
    source=read_source(TARGET_REL,NEW_TARGET_BLOB)
    if b"PropagatesStopTo=void-apollyon-authorization-custody-v1.service\n" not in source:
        hold("source_stop_propagation_missing")
    current=state()
    loaded=None
    if current=="new_exact":loaded=verify_loaded_contract()
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        "target_state":current,"new_source_verified":True,
        "service_dormant":True,"target_dormant":True,
        "daemon_reload_required":current=="old_exact",
        "service_action":False,"target_action":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"APPLY_TARGET_STOP_PROPAGATION_UPDATE" if current=="old_exact" else "TARGET_STOP_PROPAGATION_ALREADY_EXACT",
    }

def apply()->dict:
    if os.geteuid()!=0:hold("apply_requires_root")
    before=plan()
    if before["target_state"]=="old_exact":
        new=read_source(TARGET_REL,NEW_TARGET_BLOB)
        old_stat=os.lstat(TARGET_PATH)
        temp=TARGET_PATH.parent/(".void-apollyon-target.new."+str(os.getpid()))
        fd=os.open(
            temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),0o600
        )
        try:
            sent=0
            while sent<len(new):sent+=os.write(fd,new[sent:])
            os.fsync(fd);os.fchmod(fd,0o644);os.fchown(fd,0,0)
        finally:os.close(fd)
        try:
            current=os.lstat(TARGET_PATH)
            if (
                current.st_dev!=old_stat.st_dev or current.st_ino!=old_stat.st_ino or
                current.st_size!=old_stat.st_size or installed_blob()!=OLD_TARGET_BLOB
            ):hold("target_changed_before_replace")
            os.replace(temp,TARGET_PATH)
            dfd=os.open(TARGET_PATH.parent,os.O_RDONLY|getattr(os,"O_DIRECTORY",0))
            try:os.fsync(dfd)
            finally:os.close(dfd)
        finally:
            try:os.unlink(temp)
            except FileNotFoundError:pass
        if state()!="new_exact":hold("target_post_replace_invalid")
        run(["/usr/bin/systemctl","daemon-reload"])
        reloaded=True
    else:
        reloaded=False
    assert_dormant()
    verify_loaded_contract()
    return {
        **before,"mode":"--apply","target_state":"new_exact",
        "daemon_reload_required":False,"daemon_reload_performed":reloaded,
        "stop_propagation_installed":True,
        "service_action":False,"target_action":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"LIVE_CUSTODY_DORMANT_QUALIFICATION",
    }

def self_test()->None:
    m=load_manifest()
    assert m["propagates_stop_to_service"] is True
    source=read_source(TARGET_REL,NEW_TARGET_BLOB).decode()
    assert "Wants=void-apollyon-authorization-custody-v1.service" in source
    assert "PropagatesStopTo=void-apollyon-authorization-custody-v1.service" in source
    for forbidden in ("systemctl\",\"start","systemctl\",\"stop","training_execution":True","durable_attempt_claim":True"):
        assert forbidden not in Path(__file__).read_text()
    print(MARKER+"_SELF_TEST_GREEN")
    print("target_start_indirect_via_wants=true")
    print("target_stop_propagates_to_service=true")
    print("direct_service_start_stop_refused=true")
    print("service_action=false")
    print("target_action=false")
    print("training_execution=false")
    print("durable_attempt_claim=false")

def main()->int:
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true");g.add_argument("--plan",action="store_true");g.add_argument("--apply",action="store_true")
    args=ap.parse_args()
    try:
        if args.self_test:self_test();return 0
        value=apply() if args.apply else plan()
        print(json.dumps(value,sort_keys=True,separators=(",",":")));return 0
    except (Hold,FileNotFoundError,KeyError) as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("service_action=false",file=sys.stderr);print("target_action=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr);print("durable_attempt_claim=false",file=sys.stderr);print("funds_movement=false",file=sys.stderr)
        return 2
if __name__=="__main__":raise SystemExit(main())

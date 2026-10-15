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
MANIFEST_BLOB="a515adddc24791a5f8e0fba555b62f80eb3079cc"
TARGET_REL="ops/xiphos/void-apollyon-authorization-custody-v1.target"
OLD_TARGET_BLOB="d37ffefddb747d4c49f3ee70ea94a3612307a696"
NEW_TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"

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

def dormant_observation_valid(returncode:int,stdout:str)->bool:
    if returncode!=0:return False
    props={}
    for line in stdout.splitlines():
        if "=" not in line:return False
        k,v=line.split("=",1)
        if k in props:return False
        props[k]=v
    return props=={"LoadState":"loaded","ActiveState":"inactive"}

def unit_dormant(unit:str)->bool:
    r=run([
        "/usr/bin/systemctl","show",unit,"--no-pager",
        "-p","LoadState","-p","ActiveState",
    ],check=False)
    return dormant_observation_valid(r.returncode,r.stdout)

def assert_dormant()->None:
    if not unit_dormant(TARGET_UNIT):hold("activation_target_not_exactly_inactive")
    if not unit_dormant(SERVICE_UNIT):hold("custody_service_not_exactly_inactive")

def parse_systemctl_properties(
    returncode:int,stdout:str,expected:tuple[str,...],code:str
)->dict[str,str]:
    if returncode!=0:hold(code+"_command_failed")
    props:dict[str,str]={}
    expected_set=set(expected)
    for line in stdout.splitlines():
        if "=" not in line:hold(code+"_malformed")
        k,v=line.split("=",1)
        if k not in expected_set or k in props:hold(code+"_malformed")
        props[k]=v
    if set(props)!=expected_set:hold(code+"_malformed")
    return props

def classify_loaded_contract_observation(
    target_returncode:int,target_stdout:str,
    service_returncode:int,service_stdout:str,
)->tuple[str,dict[str,str]]:
    props=parse_systemctl_properties(
        target_returncode,target_stdout,
        ("LoadState","ActiveState","UnitFileState","Wants","PropagatesStopTo"),
        "target_loaded_contract",
    )
    if props["LoadState"]!="loaded":hold("target_not_loaded")
    if props["ActiveState"]!="inactive":hold("target_not_exactly_inactive")
    if props["UnitFileState"]=="enabled":hold("target_enabled")
    wants=props["Wants"].split()
    if SERVICE_UNIT not in wants:hold("target_wants_service_missing")
    if wants!=[SERVICE_UNIT]:hold("target_wants_service_ambiguous")

    propagates=props["PropagatesStopTo"].split()
    if propagates==[SERVICE_UNIT]:
        loaded_state="exact"
    elif props["PropagatesStopTo"]=="":
        # The reviewed predecessor target differs from the new target only by
        # the missing PropagatesStopTo line. This is the one admissible
        # post-replace/pre-reload manager state.
        loaded_state="reload_required"
    else:
        hold("target_stop_propagation_ambiguous")

    sprops=parse_systemctl_properties(
        service_returncode,service_stdout,
        ("LoadState","ActiveState","RefuseManualStart","RefuseManualStop"),
        "custody_service_loaded_contract",
    )
    if sprops["LoadState"]!="loaded":hold("custody_service_not_loaded")
    if sprops["ActiveState"]!="inactive":hold("custody_service_not_exactly_inactive")
    if sprops["RefuseManualStart"]!="yes" or sprops["RefuseManualStop"]!="yes":
        hold("service_manual_refusal_missing")
    return loaded_state,{**props,"ServiceRefuseManualStart":"yes","ServiceRefuseManualStop":"yes"}

def observe_loaded_contract()->tuple[str,dict[str,str]]:
    target=run([
        "/usr/bin/systemctl","show",TARGET_UNIT,"--no-pager",
        "-p","LoadState","-p","ActiveState","-p","UnitFileState",
        "-p","Wants","-p","PropagatesStopTo",
    ],check=False)
    service=run([
        "/usr/bin/systemctl","show",SERVICE_UNIT,"--no-pager",
        "-p","LoadState","-p","ActiveState","-p","RefuseManualStart","-p","RefuseManualStop",
    ],check=False)
    return classify_loaded_contract_observation(
        target.returncode,target.stdout,service.returncode,service.stdout
    )

def verify_loaded_contract()->dict[str,str]:
    loaded_state,props=observe_loaded_contract()
    if loaded_state!="exact":hold("target_stop_propagation_missing")
    return props

def classify_plan_action(target_state:str,loaded_state:str|None)->str:
    if target_state=="old_exact" and loaded_state is None:return "replace_and_reload"
    if target_state=="new_exact" and loaded_state=="reload_required":return "reload_only"
    if target_state=="new_exact" and loaded_state=="exact":return "already_exact"
    hold("target_plan_state_invalid")

def mutation_profile(action:str)->dict[str,bool]:
    if action=="replace_and_reload":
        return {"replace_target":True,"daemon_reload":True}
    if action=="reload_only":
        return {"replace_target":False,"daemon_reload":True}
    if action=="already_exact":
        return {"replace_target":False,"daemon_reload":False}
    hold("target_apply_action_invalid")

def plan()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():hold("wrong_host")
    load_manifest(); assert_dormant()
    source=read_source(TARGET_REL,NEW_TARGET_BLOB)
    if b"PropagatesStopTo=void-apollyon-authorization-custody-v1.service\n" not in source:
        hold("source_stop_propagation_missing")
    current=state()
    loaded_state=None
    if current=="new_exact":
        loaded_state,_loaded=observe_loaded_contract()
    action=classify_plan_action(current,loaded_state)
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        "target_state":current,"new_source_verified":True,
        "loaded_contract_state":loaded_state or "not_checked_pre_replace",
        "plan_action":action,
        "service_dormant":True,"target_dormant":True,
        "daemon_reload_required":action in {"replace_and_reload","reload_only"},
        "reload_recovery_required":action=="reload_only",
        "service_action":False,"target_action":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":{
            "replace_and_reload":"APPLY_TARGET_STOP_PROPAGATION_UPDATE",
            "reload_only":"APPLY_DAEMON_RELOAD_RECOVERY",
            "already_exact":"TARGET_STOP_PROPAGATION_ALREADY_EXACT",
        }[action],
    }

def apply()->dict:
    if os.geteuid()!=0:hold("apply_requires_root")
    before=plan()
    action=before["plan_action"]
    profile=mutation_profile(action)
    if profile["replace_target"]:
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
    if state()!="new_exact":hold("target_changed_before_manager_recheck")
    if profile["daemon_reload"]:
        run(["/usr/bin/systemctl","daemon-reload"])
        reloaded=True
    else:
        reloaded=False
    if state()!="new_exact":hold("target_changed_during_manager_recheck")
    assert_dormant()
    verify_loaded_contract()
    return {
        **before,"mode":"--apply","target_state":"new_exact",
        "daemon_reload_required":False,"daemon_reload_performed":reloaded,
        "reload_recovery_required":False,
        "reload_recovery_performed":action=="reload_only",
        "target_file_replaced":profile["replace_target"],
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
    for returncode,stdout,expected in (
        (0,"LoadState=loaded\nActiveState=inactive\n",True),
        (1,"LoadState=loaded\nActiveState=inactive\n",False),
        (0,"",False),
        (0,"LoadState=not-found\nActiveState=inactive\n",False),
        (0,"LoadState=loaded\nActiveState=unknown\n",False),
        (0,"LoadState=loaded\nActiveState=active\n",False),
        (0,"LoadState=loaded\nActiveState=activating\n",False),
        (0,"LoadState=loaded\nActiveState=deactivating\n",False),
        (0,"LoadState=loaded\nActiveState=failed\n",False),
    ):
        assert dormant_observation_valid(returncode,stdout) is expected,(returncode,stdout)
    exact_target=(
        "LoadState=loaded\nActiveState=inactive\nUnitFileState=static\n"
        "Wants="+SERVICE_UNIT+"\nPropagatesStopTo="+SERVICE_UNIT+"\n"
    )
    stale_target=(
        "LoadState=loaded\nActiveState=inactive\nUnitFileState=static\n"
        "Wants="+SERVICE_UNIT+"\nPropagatesStopTo=\n"
    )
    service_exact=(
        "LoadState=loaded\nActiveState=inactive\n"
        "RefuseManualStart=yes\nRefuseManualStop=yes\n"
    )
    assert classify_loaded_contract_observation(0,exact_target,0,service_exact)[0]=="exact"
    assert classify_loaded_contract_observation(0,stale_target,0,service_exact)[0]=="reload_required"
    assert classify_plan_action("old_exact",None)=="replace_and_reload"
    assert classify_plan_action("new_exact","reload_required")=="reload_only"
    assert classify_plan_action("new_exact","exact")=="already_exact"
    assert mutation_profile("replace_and_reload")=={"replace_target":True,"daemon_reload":True}
    assert mutation_profile("reload_only")=={"replace_target":False,"daemon_reload":True}
    assert mutation_profile("already_exact")=={"replace_target":False,"daemon_reload":False}
    try:
        classify_loaded_contract_observation(
            0,stale_target.replace("PropagatesStopTo=\n","PropagatesStopTo=other.service\n"),
            0,service_exact,
        )
    except Hold as exc:
        assert str(exc)=="target_stop_propagation_ambiguous"
    else:
        raise AssertionError("ambiguous loaded propagation accepted")
    try:
        classify_loaded_contract_observation(
            0,stale_target.replace(
                "Wants="+SERVICE_UNIT+"\n",
                "Wants="+SERVICE_UNIT+" other.service\n",
            ),
            0,service_exact,
        )
    except Hold as exc:
        assert str(exc)=="target_wants_service_ambiguous"
    else:
        raise AssertionError("ambiguous loaded wants accepted")
    own=Path(__file__).read_text()
    forbidden_parts=(
        ("systemctl",'","',"start"),
        ("systemctl",'","',"stop"),
        ("training_execution",'"',":True"),
        ("durable_attempt_claim",'"',":True"),
    )
    for parts in forbidden_parts:
        forbidden="".join(parts)
        assert forbidden not in own,forbidden
    print(MARKER+"_SELF_TEST_GREEN")
    print("target_start_indirect_via_wants=true")
    print("target_stop_propagates_to_service=true")
    print("direct_service_start_stop_refused=true")
    print("dormant_state_fail_closed=true")
    print("reload_failure_resume_supported=true")
    print("new_exact_stale_manager_reload_only=true")
    print("reload_only_target_file_rewrite=false")
    print("target_revalidated_before_and_after_manager_recheck=true")
    print("ambiguous_loaded_contract_fails_closed=true")
    print("extra_loaded_wants_fails_closed=true")
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

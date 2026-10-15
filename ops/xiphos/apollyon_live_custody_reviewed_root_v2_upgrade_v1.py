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

MARKER="VOID_APOLLYON_LIVE_CUSTODY_REVIEWED_ROOT_V2_UPGRADE_V1"
TARGET_HOST="Xiphos"
ROOT=Path(__file__).resolve().parents[2]

UPGRADE_MANIFEST_REL="ops/xiphos/apollyon-live-custody-reviewed-root-v2-upgrade-v1.json"
UPGRADE_MANIFEST_BLOB="bdf89b4ea5ca39f3af5599fb2fbfbd45fbb54bd1"
OLD_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v1")
NEW_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v2")
FIXED_LAUNCHER=Path(
    "/opt/void-apollyon-live-custody-binding-v2-preentry-v1/"
    "apollyon_live_custody_source_session_launcher_v2.py"
)
LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_v2.py"
OLD_LAUNCHER_BLOB="e18124d3109ed63ff50da9c467fb1b798c300460"
NEW_LAUNCHER_BLOB="8e92a3337c9a4bba21fab6299e9e2ceb61d3e425"
CUSTODY_UNIT="void-apollyon-authorization-custody-v1.service"
TRAINING_UNIT="void-apollyon-training-bus-isolation-v1.service"

class Hold(RuntimeError): pass
def hold(reason:str)->None: raise Hold(reason)

def git_blob(data:bytes)->str:
    h=hashlib.sha1(); h.update(f"blob {len(data)}\0".encode("ascii")); h.update(data)
    return h.hexdigest()

def same_identity(a:os.stat_result,b:os.stat_result)->bool:
    return (
        a.st_dev==b.st_dev and a.st_ino==b.st_ino and
        a.st_uid==b.st_uid and a.st_gid==b.st_gid and
        a.st_mode==b.st_mode and a.st_nlink==b.st_nlink and
        a.st_size==b.st_size and
        getattr(a,"st_mtime_ns",None)==getattr(b,"st_mtime_ns",None) and
        getattr(a,"st_ctime_ns",None)==getattr(b,"st_ctime_ns",None)
    )

def read_source(relative:str,expected_blob:str)->bytes:
    path=ROOT/relative
    before=os.lstat(path)
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or before.st_nlink!=1:
        hold("source_metadata_invalid:"+relative)
    fd=os.open(path,os.O_RDONLY|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0))
    try:
        opened=os.fstat(fd)
        if not same_identity(before,opened): hold("source_open_drift:"+relative)
        chunks=[]; remaining=before.st_size
        while remaining:
            chunk=os.read(fd,min(64*1024,remaining))
            if not chunk: break
            chunks.append(chunk); remaining-=len(chunk)
        data=b"".join(chunks)
        after=os.fstat(fd); visible=os.lstat(path)
        if len(data)!=before.st_size or not same_identity(opened,after) or not same_identity(after,visible):
            hold("source_read_drift:"+relative)
    finally:
        os.close(fd)
    if git_blob(data)!=expected_blob: hold("source_blob_mismatch:"+relative)
    return data

def load_upgrade_manifest()->dict:
    data=read_source(UPGRADE_MANIFEST_REL,UPGRADE_MANIFEST_BLOB)
    value=json.loads(data)
    if value.get("marker")!=MARKER or value.get("version")!=1 or value.get("target_host")!=TARGET_HOST:
        hold("upgrade_manifest_invalid")
    if value["from"]["reviewed_root"]!=str(OLD_ROOT) or value["to"]["reviewed_root"]!=str(NEW_ROOT):
        hold("upgrade_manifest_root_invalid")
    if value["from"]["fixed_launcher_blob_sha1"]!=OLD_LAUNCHER_BLOB:
        hold("upgrade_manifest_old_launcher_invalid")
    if value["to"]["fixed_launcher_blob_sha1"]!=NEW_LAUNCHER_BLOB:
        hold("upgrade_manifest_new_launcher_invalid")
    return value

def run(argv:list[str],check=True)->subprocess.CompletedProcess[str]:
    r=subprocess.run(
        argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=20,
        env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"},
    )
    if check and r.returncode!=0: hold("command_failed:"+Path(argv[0]).name)
    return r

def active(unit:str)->bool:
    return run(["/usr/bin/systemctl","is-active",unit],check=False).stdout.strip()=="active"

def assert_services_dormant()->None:
    if active(CUSTODY_UNIT): hold("custody_service_active")
    if active(TRAINING_UNIT): hold("training_service_active")

def exact_root_dir(path:Path)->None:
    st=os.lstat(path)
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)!=0o755
    ): hold("reviewed_root_metadata_invalid:"+str(path))

def exact_installed_file(path:Path,expected_blob:str)->None:
    st=os.lstat(path)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or st.st_nlink!=1 or
        stat.S_IMODE(st.st_mode)!=0o444
    ): hold("installed_file_metadata_invalid:"+str(path))
    data=path.read_bytes()
    if len(data)!=st.st_size or git_blob(data)!=expected_blob:
        hold("installed_file_blob_mismatch:"+str(path))

def verify_tree(root:Path,mapping:dict[str,str])->None:
    exact_root_dir(root)
    expected=set()
    for rel,blob in mapping.items():
        path=root/rel; expected.add(path)
        exact_installed_file(path,blob)
    for dirpath,_,filenames in os.walk(root):
        current=Path(dirpath)
        for name in filenames:
            if current/name not in expected:
                hold("unexpected_reviewed_file:"+str(current/name))

def launcher_state()->str:
    try: st=os.lstat(FIXED_LAUNCHER)
    except FileNotFoundError: hold("fixed_launcher_missing")
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or st.st_nlink!=1 or
        stat.S_IMODE(st.st_mode)!=0o444
    ): hold("fixed_launcher_metadata_invalid")
    digest=git_blob(FIXED_LAUNCHER.read_bytes())
    if digest==OLD_LAUNCHER_BLOB:return "old_exact"
    if digest==NEW_LAUNCHER_BLOB:return "new_exact"
    hold("fixed_launcher_collision")

def ensure_root_dir(path:Path)->bool:
    if path==Path("/"): return False
    if not path.parent.exists(): ensure_root_dir(path.parent)
    try: st=os.lstat(path)
    except FileNotFoundError:
        path.mkdir(mode=0o755); os.chown(path,0,0); os.chmod(path,0o755)
        st=os.lstat(path); created=True
    else: created=False
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)!=0o755
    ): hold("directory_collision:"+str(path))
    return created

def install_file(path:Path,data:bytes)->None:
    try: st=os.lstat(path)
    except FileNotFoundError: st=None
    if st is not None:
        if (
            not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
            st.st_uid!=0 or st.st_gid!=0 or st.st_nlink!=1 or
            stat.S_IMODE(st.st_mode)!=0o444 or path.read_bytes()!=data
        ): hold("new_root_file_collision:"+str(path))
        return
    ensure_root_dir(path.parent)
    fd=os.open(
        path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),
        0o444,
    )
    try:
        sent=0
        while sent<len(data): sent+=os.write(fd,data[sent:])
        os.fsync(fd); os.fchmod(fd,0o444); os.fchown(fd,0,0)
    finally: os.close(fd)

def fsync_tree(root:Path)->None:
    directories=[]
    for dirpath,_,filenames in os.walk(root):
        current=Path(dirpath)
        directories.append(current)
        for name in filenames:
            path=current/name
            fd=os.open(path,os.O_RDONLY|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0))
            try:
                os.fsync(fd)
            finally:
                os.close(fd)
    for directory in sorted(directories,key=lambda p:len(p.parts),reverse=True):
        fd=os.open(directory,os.O_RDONLY|getattr(os,"O_DIRECTORY",0)|getattr(os,"O_CLOEXEC",0))
        try:
            os.fsync(fd)
        finally:
            os.close(fd)

def install_new_tree(mapping:dict[str,str])->None:
    if NEW_ROOT.exists():
        verify_tree(NEW_ROOT,mapping)
        return
    stage=NEW_ROOT.parent/(".void-apollyon-live-custody-binding-v2-reviewed-v2.new."+str(os.getpid()))
    if stage.exists():
        hold("new_root_stage_collision")
    ensure_root_dir(stage)
    try:
        for rel,blob in mapping.items():
            data=read_source(rel,blob)
            target=stage/rel
            install_file(target,data)
        verify_tree(stage,mapping)
        fsync_tree(stage)
        parent_fd=os.open(NEW_ROOT.parent,os.O_RDONLY|getattr(os,"O_DIRECTORY",0)|getattr(os,"O_CLOEXEC",0))
        try:
            if NEW_ROOT.exists():
                verify_tree(NEW_ROOT,mapping)
                return
            os.rename(stage,NEW_ROOT)
            os.fsync(parent_fd)
        finally:
            os.close(parent_fd)
        verify_tree(NEW_ROOT,mapping)
    finally:
        if stage.exists():
            import shutil
            shutil.rmtree(stage)

def replace_launcher(new_bytes:bytes)->bool:
    state=launcher_state()
    if state=="new_exact": return False
    before=os.lstat(FIXED_LAUNCHER)
    temp=FIXED_LAUNCHER.parent/(".launcher.new."+str(os.getpid()))
    fd=os.open(
        temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),
        0o600,
    )
    try:
        sent=0
        while sent<len(new_bytes): sent+=os.write(fd,new_bytes[sent:])
        os.fsync(fd); os.fchmod(fd,0o444); os.fchown(fd,0,0)
    finally: os.close(fd)
    try:
        current=os.lstat(FIXED_LAUNCHER)
        if not same_identity(before,current) or git_blob(FIXED_LAUNCHER.read_bytes())!=OLD_LAUNCHER_BLOB:
            hold("fixed_launcher_changed_before_replace")
        os.replace(temp,FIXED_LAUNCHER)
        dfd=os.open(FIXED_LAUNCHER.parent,os.O_RDONLY|getattr(os,"O_DIRECTORY",0))
        try: os.fsync(dfd)
        finally: os.close(dfd)
    finally:
        try: os.unlink(temp)
        except FileNotFoundError: pass
    if launcher_state()!="new_exact": hold("fixed_launcher_post_replace_invalid")
    return True

def plan()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold(): hold("wrong_host")
    manifest=load_upgrade_manifest()
    assert_services_dormant()
    verify_tree(OLD_ROOT,manifest["from"]["closure"])
    old_state=launcher_state()
    new_present=NEW_ROOT.exists()
    if new_present: verify_tree(NEW_ROOT,manifest["to"]["closure"])
    for rel,blob in manifest["to"]["closure"].items(): read_source(rel,blob)
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        "old_root_verified":True,"old_root_preserved":True,
        "new_root_present":new_present,"fixed_launcher_state":old_state,
        "new_closure_source_verified":True,
        "service_action":False,"systemd_mutation":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"APPLY_REVIEWED_ROOT_V2_UPGRADE" if old_state=="old_exact" or not new_present else "UPGRADE_ALREADY_EXACT",
    }

def apply()->dict:
    if os.geteuid()!=0: hold("apply_requires_root")
    before=plan()
    manifest=load_upgrade_manifest()
    install_new_tree(manifest["to"]["closure"])
    changed=replace_launcher(read_source(LAUNCHER_REL,NEW_LAUNCHER_BLOB))
    verify_tree(OLD_ROOT,manifest["from"]["closure"])
    verify_tree(NEW_ROOT,manifest["to"]["closure"])
    assert_services_dormant()
    return {
        **before,"mode":"--apply","new_root_present":True,
        "fixed_launcher_state":"new_exact","fixed_launcher_replaced":changed,
        "old_root_preserved":True,"reviewed_root_v2_upgrade_complete":True,
        "service_action":False,"systemd_mutation":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"LIVE_CUSTODY_DORMANT_QUALIFICATION",
    }

def self_test()->None:
    manifest=load_upgrade_manifest()
    assert manifest["to"]["systemd_reviewed_versions"]==["255.4-1ubuntu8.11","255.4-1ubuntu8.18"]
    assert manifest["to"]["closure"]["ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py"]=="2a285b5b1da2597a8b9eae6d08cd42d010bf7f71"
    assert manifest["to"]["closure"]["tools/apollyon-v2-raw-collector-adapter-v1.mjs"]=="9890285cde6a1ed4491d0eafb6c73b853ab6fad3"
    assert manifest["to"]["closure"][LAUNCHER_REL]==NEW_LAUNCHER_BLOB
    source=Path(__file__).read_text(encoding="utf-8")
    for forbidden_parts in (
        ("systemctl",'",',"start"),("systemctl",'",',"stop"),("systemctl",'",',"restart"),
        ("training_execution",":True"),("durable_attempt_claim",":True"),
        ("operator_private_key_access",":True"),("funds_movement",":True"),
    ):
        forbidden="".join(forbidden_parts)
        assert forbidden not in source,forbidden
    print(MARKER+"_SELF_TEST_GREEN")
    print("old_root_preserved=true")
    print("new_root=/opt/void-apollyon-live-custody-binding-v2-reviewed-v2")
    print("systemd_8_18_reviewed=true")
    print("service_action=false")
    print("training_execution=false")
    print("durable_attempt_claim=false")
    print("funds_movement=false")

def main()->int:
    ap=argparse.ArgumentParser()
    g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true")
    g.add_argument("--plan",action="store_true")
    g.add_argument("--apply",action="store_true")
    args=ap.parse_args()
    try:
        if args.self_test:self_test();return 0
        value=apply() if args.apply else plan()
        print(json.dumps(value,sort_keys=True,separators=(",",":")))
        return 0
    except (Hold,KeyError,FileNotFoundError) as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("service_action=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr)
        print("funds_movement=false",file=sys.stderr)
        return 2

if __name__=="__main__": raise SystemExit(main())

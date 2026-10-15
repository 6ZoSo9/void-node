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

MARKER="VOID_APOLLYON_NODE_RUNTIME_CREATE_ONLY_INSTALL_V1"
TARGET_HOST="Xiphos"
SOURCE_NODE=Path("/opt/nodejs/node-v24.21.0-linux-x64/bin/node")
DEST_ROOT=Path("/opt/void-apollyon-node-runtime-v1")
DEST_NODE=DEST_ROOT/"node"
EXPECTED_VERSION="v24.21.0"
EXPECTED_BYTES=126595440
EXPECTED_SHA256="7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c"
COPY_CHUNK=1024*1024

class Hold(RuntimeError):
    pass

def hold(reason:str)->None:
    raise Hold(reason)

def sha256_fd(fd:int)->tuple[int,str]:
    os.lseek(fd,0,os.SEEK_SET)
    h=hashlib.sha256()
    total=0
    while True:
        chunk=os.read(fd,COPY_CHUNK)
        if not chunk:
            break
        total+=len(chunk)
        h.update(chunk)
    return total,h.hexdigest()

def same_identity(a:os.stat_result,b:os.stat_result)->bool:
    return (
        a.st_dev==b.st_dev and a.st_ino==b.st_ino and
        a.st_uid==b.st_uid and a.st_gid==b.st_gid and
        a.st_mode==b.st_mode and a.st_nlink==b.st_nlink and
        a.st_size==b.st_size and
        getattr(a,"st_mtime_ns",None)==getattr(b,"st_mtime_ns",None) and
        getattr(a,"st_ctime_ns",None)==getattr(b,"st_ctime_ns",None)
    )

def open_source()->tuple[int,os.stat_result]:
    before=os.lstat(SOURCE_NODE)
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_nlink!=1 or before.st_size!=EXPECTED_BYTES or
        stat.S_IMODE(before.st_mode)&0o111==0
    ):
        hold("source_node_metadata_invalid")
    fd=os.open(
        SOURCE_NODE,
        os.O_RDONLY|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),
    )
    try:
        opened=os.fstat(fd)
        if not same_identity(before,opened):
            hold("source_node_open_generation_mismatch")
        size,digest=sha256_fd(fd)
        after=os.fstat(fd)
        visible=os.lstat(SOURCE_NODE)
        if (
            size!=EXPECTED_BYTES or digest!=EXPECTED_SHA256 or
            not same_identity(opened,after) or not same_identity(after,visible)
        ):
            hold("source_node_identity_mismatch")
        return fd,after
    except BaseException:
        os.close(fd)
        raise

def run_node(path:Path)->dict[str,str]:
    env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"}
    version=subprocess.run(
        [os.fspath(path),"--version"],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=15,env=env,
    )
    if version.returncode!=0 or version.stdout.strip()!=EXPECTED_VERSION:
        hold("node_version_probe_failed")
    builtin=subprocess.run(
        [
            os.fspath(path),"-e",
            "const c=require('node:crypto');"
            "process.stdout.write(c.createHash('sha256').update('void').digest('hex')+'\\n')",
        ],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=15,env=env,
    )
    if (
        builtin.returncode!=0 or
        builtin.stdout.strip()!="445be54d48a2e6294369c84c61cd0929209d4e1084536159bdf7002bddfe094b"
    ):
        hold("node_builtin_probe_failed")
    execpath=subprocess.run(
        [os.fspath(path),"-p","process.execPath"],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=15,env=env,
    )
    if execpath.returncode!=0:
        hold("node_execpath_probe_failed")
    return {
        "version":version.stdout.strip(),
        "builtin_crypto_sha256":builtin.stdout.strip(),
        "exec_path":execpath.stdout.strip(),
    }

def destination_exact()->bool:
    try:
        st=os.lstat(DEST_NODE)
    except FileNotFoundError:
        return False
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_nlink!=1 or st.st_uid!=0 or st.st_gid!=0 or
        stat.S_IMODE(st.st_mode)!=0o755 or st.st_size!=EXPECTED_BYTES
    ):
        hold("destination_node_collision")
    fd=os.open(
        DEST_NODE,
        os.O_RDONLY|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),
    )
    try:
        opened=os.fstat(fd)
        size,digest=sha256_fd(fd)
        after=os.fstat(fd)
        visible=os.lstat(DEST_NODE)
        if (
            size!=EXPECTED_BYTES or digest!=EXPECTED_SHA256 or
            not same_identity(opened,after) or not same_identity(after,visible)
        ):
            hold("destination_node_identity_mismatch")
    finally:
        os.close(fd)
    probe=run_node(DEST_NODE)
    if Path(probe["exec_path"])!=DEST_NODE:
        hold("destination_node_execpath_mismatch")
    return True

def ensure_dest_root()->bool:
    try:
        st=os.lstat(DEST_ROOT)
    except FileNotFoundError:
        DEST_ROOT.mkdir(mode=0o755)
        os.chown(DEST_ROOT,0,0)
        os.chmod(DEST_ROOT,0o755)
        st=os.lstat(DEST_ROOT)
        created=True
    else:
        created=False
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)!=0o755
    ):
        hold("destination_root_collision")
    return created

def copy_exact(source_fd:int)->None:
    if destination_exact():
        return
    ensure_dest_root()
    fd=os.open(
        DEST_NODE,
        os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0)|
        getattr(os,"O_CLOEXEC",0),
        0o755,
    )
    try:
        os.lseek(source_fd,0,os.SEEK_SET)
        h=hashlib.sha256()
        total=0
        while True:
            chunk=os.read(source_fd,COPY_CHUNK)
            if not chunk:
                break
            h.update(chunk)
            total+=len(chunk)
            view=memoryview(chunk)
            sent=0
            while sent<len(view):
                sent+=os.write(fd,view[sent:])
        if total!=EXPECTED_BYTES or h.hexdigest()!=EXPECTED_SHA256:
            hold("source_node_changed_during_copy")
        os.fsync(fd)
        os.fchmod(fd,0o755)
        os.fchown(fd,0,0)
    finally:
        os.close(fd)
    if not destination_exact():
        hold("destination_node_postinstall_invalid")
    dirfd=os.open(DEST_ROOT,os.O_RDONLY|getattr(os,"O_DIRECTORY",0))
    try:
        os.fsync(dirfd)
    finally:
        os.close(dirfd)

def plan()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():
        hold("wrong_host")
    source_fd,source_meta=open_source()
    try:
        source_probe=run_node(SOURCE_NODE)
    finally:
        os.close(source_fd)
    installed=destination_exact()
    return {
        "marker":MARKER,
        "mode":"--plan",
        "target_host":TARGET_HOST,
        "source_path":os.fspath(SOURCE_NODE),
        "source_uid":source_meta.st_uid,
        "source_gid":source_meta.st_gid,
        "source_ownership_trusted":False,
        "source_content_hash_verified":True,
        "source_version":source_probe["version"],
        "expected_bytes":EXPECTED_BYTES,
        "expected_sha256":EXPECTED_SHA256,
        "destination_path":os.fspath(DEST_NODE),
        "destination_existing_exact":installed,
        "create_only":True,
        "package_mutation":False,
        "systemd_mutation":False,
        "service_mutation":False,
        "network_access":False,
        "training_execution":False,
        "durable_attempt_claim":False,
        "funds_movement":False,
        "next_action":"APPLY_ROOT_CUSTODIED_NODE_COPY" if not installed else "NODE_RUNTIME_ALREADY_EXACT",
    }

def apply()->dict:
    if os.geteuid()!=0:
        hold("apply_requires_root")
    before=plan()
    source_fd,_=open_source()
    try:
        copy_exact(source_fd)
        source_after=os.fstat(source_fd)
        visible_after=os.lstat(SOURCE_NODE)
        if not same_identity(source_after,visible_after):
            hold("source_node_generation_changed_after_copy")
    finally:
        os.close(source_fd)
    probe=run_node(DEST_NODE)
    return {
        **before,
        "mode":"--apply",
        "destination_existing_exact":True,
        "destination_owner_uid":0,
        "destination_owner_gid":0,
        "destination_mode":"0755",
        "destination_version":probe["version"],
        "destination_exec_path":probe["exec_path"],
        "root_custodied_node_installed":True,
        "package_mutation":False,
        "systemd_mutation":False,
        "service_mutation":False,
        "network_access":False,
        "training_execution":False,
        "durable_attempt_claim":False,
        "funds_movement":False,
        "next_action":"CUSTODY_CREATE_ONLY_INSTALL_REQUALIFICATION",
    }

def self_test()->None:
    assert os.fspath(DEST_NODE)=="/opt/void-apollyon-node-runtime-v1/node"
    assert EXPECTED_VERSION=="v24.21.0"
    assert EXPECTED_BYTES==126595440
    assert EXPECTED_SHA256=="7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c"
    source=Path(__file__).read_text(encoding="utf-8")
    for forbidden in (
        "apt-get","apt ","dnf ","yum ","snap install",
        "systemctl","start","systemctl","enable","systemctl","restart",
        "curl ","wget ",'training_execution":True','durable_attempt_claim":True',
    ):
        assert forbidden not in source,forbidden
    print(MARKER+"_SELF_TEST_GREEN")
    print("source_ownership_trusted=false")
    print("source_content_hash_required=true")
    print("destination_path=/opt/void-apollyon-node-runtime-v1/node")
    print("node_version=v24.21.0")
    print("node_bytes=126595440")
    print("node_sha256="+EXPECTED_SHA256)
    print("package_mutation=false")
    print("systemd_mutation=false")
    print("service_mutation=false")
    print("training_execution=false")
    print("durable_attempt_claim=false")

def main()->int:
    ap=argparse.ArgumentParser()
    g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true")
    g.add_argument("--plan",action="store_true")
    g.add_argument("--apply",action="store_true")
    args=ap.parse_args()
    try:
        if args.self_test:
            self_test(); return 0
        value=apply() if args.apply else plan()
        import json
        print(json.dumps(value,sort_keys=True,separators=(",",":")))
        return 0
    except Hold as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("package_mutation=false",file=sys.stderr)
        print("systemd_mutation=false",file=sys.stderr)
        print("service_mutation=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr)
        print("funds_movement=false",file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())

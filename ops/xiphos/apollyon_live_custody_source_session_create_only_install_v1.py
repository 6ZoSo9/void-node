#!/usr/bin/env python3
from __future__ import annotations

import sys

def _require_isolated_python() -> None:
    # Before imports from the checkout or ambient interpreter search path.
    flags = sys.flags
    if not (
        flags.isolated == 1
        and flags.ignore_environment == 1
        and flags.no_user_site == 1
        and flags.dont_write_bytecode == 1
        and getattr(flags, "safe_path", 0) == 1
    ):
        sys.stderr.write("HOLD=python_runtime_not_isolated\n")
        sys.stderr.write("service_start=false\n")
        sys.stderr.write("training_execution=false\n")
        sys.stderr.write("funds_movement=false\n")
        raise SystemExit(2)

_require_isolated_python()

import argparse
import base64
import grp
import hashlib
import json
import os
from pathlib import Path
import pwd
import shutil
import socket
import stat
import subprocess
import tempfile
from typing import Any

MARKER="VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_CREATE_ONLY_INSTALL_V1"
TARGET_HOST="Xiphos"
ROOT=Path(__file__).resolve().parents[2]

TRAINING_USER="voidapollyontrain"
CUSTODY_USER="voidapollyoncustody"
CUSTODY_GROUP="voidapollyoncustody"
IPC_GROUP="voidapollyonipc"

MANIFEST_REL="ops/xiphos/apollyon-custody-deployment-manifest-v1.json"
MANIFEST_BLOB="2495dae4f20a9a224ed8be972748d45f3e066340"
UNIT_REL="ops/xiphos/void-apollyon-authorization-custody-v1.service"
UNIT_BLOB="30b7b7c62b6b7834ae91db1eb37df05286ca5764"
TARGET_REL="ops/xiphos/void-apollyon-authorization-custody-v1.target"
TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
ENV_TEMPLATE_REL="ops/xiphos/void-apollyon-authorization-custody-v1.env.template"
ENV_TEMPLATE_BLOB="8b5ccee9edb151ee9e704503e61b070bf4420263"
POLKIT_REL="ops/xiphos/00-void-apollyon-training-custody-deny-v1.rules"
POLKIT_BLOB="9d9e6890a35b6ae3bdc8e7a2f97abc61cff5360f"
TMPFILES_REL="ops/xiphos/void-apollyon-custody-v1.tmpfiles.conf"
TMPFILES_BLOB="5d3443c03821b403d52d10629571374325dc5598"
LIVE_LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"
LIVE_LAUNCHER_BLOB="352bd36f2b07091140b990de4170f708eb11fee6"
PREENTRY_SOURCE_REL="ops/xiphos/apollyon_live_custody_source_session_preentry_v2.c"
PREENTRY_SOURCE_BLOB="1d0d9893939d1a457970b3b1f16dae06e7fef067"
LIFECYCLE_REL="ops/xiphos/apollyon_custody_stale_socket_cleanup_v1.py"
LIFECYCLE_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"

EXPECTED_PUBLIC_RAW_SHA256="c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134"
NODE_RUNTIME=Path("/opt/void-apollyon-node-runtime-v1/node")
NODE_VERSION="v24.21.0"
NODE_BYTES=126595440
NODE_SHA256="7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c"
PREENTRY_BYTES=798736
PREENTRY_SHA256="2d705515d825051111b5fd9f99356466bf341056a0bf67d34b80a869a337d21d"
SPKI_PREFIX=bytes.fromhex("302a300506032b6570032100")
COMPILE_FLAGS=(
    "-std=c11","-O2","-Wall","-Wextra","-Werror",
    "-D_FORTIFY_SOURCE=2","-fstack-protector-strong","-fno-ident",
    "-static","-fno-pie","-no-pie",
    "-Wl,-z,relro,-z,now","-Wl,--build-id=none",
)
COMPILE_ENV={
    "PATH":"/usr/bin:/bin","LC_ALL":"C","TZ":"UTC","SOURCE_DATE_EPOCH":"0",
}

SYSTEMD_UNIT=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.service")
SYSTEMD_TARGET=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.target")
POLKIT_PATH=Path("/etc/polkit-1/rules.d/00-void-apollyon-training-custody-deny-v1.rules")
TMPFILES_PATH=Path("/usr/lib/tmpfiles.d/void-apollyon-custody-v1.conf")
CONFIG_DIR=Path("/etc/void/apollyon-custody-v1")
ENV_PATH=CONFIG_DIR/"custody.env"
PUBLIC_KEY_PATH=CONFIG_DIR/"operator-public-key.pem"
STATE_ROOT=Path("/var/lib/void-apollyon-custody-v1")
CONSUMED=STATE_ROOT/"consumed"
SOCKET_PARENT=Path("/run/void-apollyon-custody-v1")
CUSTODY_SOURCE_ROOT=Path("/opt/void-apollyon-custody-service-v2-reviewed-v1")
LIVE_SOURCE_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v2")
LIVE_PREENTRY_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-preentry-v1")
LIVE_PREENTRY=LIVE_PREENTRY_ROOT/"apollyon_live_custody_source_session_preentry_v2"
LIVE_LAUNCHER=LIVE_PREENTRY_ROOT/"apollyon_live_custody_source_session_launcher_v2.py"
LIFECYCLE_ROOT=Path("/opt/void-apollyon-custody-lifecycle-v1")
CLEANUP_HELPER=LIFECYCLE_ROOT/"apollyon_custody_stale_socket_cleanup_v1.py"

class Hold(RuntimeError):
    pass

def hold(reason:str)->None:
    raise Hold(reason)

def git_blob(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

def sha256(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()

def same_file_identity(a:os.stat_result,b:os.stat_result)->bool:
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
    st=os.lstat(path)
    if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink!=1:
        hold("source_metadata_invalid:"+relative)
    data=path.read_bytes()
    if len(data)!=st.st_size or git_blob(data)!=expected_blob:
        hold("source_blob_mismatch:"+relative)
    return data

def load_manifest()->dict[str,Any]:
    data=read_source(MANIFEST_REL,MANIFEST_BLOB)
    value=json.loads(data)
    if value.get("marker")!="VOID_APOLLYON_CUSTODY_DEPLOYMENT_MANIFEST_V1":
        hold("manifest_marker_invalid")
    if value.get("version")!=1:
        hold("manifest_version_invalid")
    if value.get("target_host")!="Xiphos":
        hold("manifest_host_invalid")
    required=value.get("required_operator_input",{})
    if required.get("expected_operator_public_key_raw_sha256")!=EXPECTED_PUBLIC_RAW_SHA256:
        hold("manifest_public_fingerprint_invalid")
    lock=value.get("preentry_lock",{})
    if lock.get("bytes")!=PREENTRY_BYTES or lock.get("sha256")!=PREENTRY_SHA256:
        hold("manifest_preentry_lock_invalid")
    socket_contract=value.get("socket_lifecycle_contract",{})
    if (
        socket_contract.get("custody_uid_process_exclusivity_required") is not True or
        socket_contract.get("custody_uid_process_census_uid_slots") !=
            ["real","effective","saved","filesystem"] or
        socket_contract.get("unclassifiable_process_status_holds") is not True
    ):
        hold("manifest_socket_lifecycle_contract_invalid")
    service_contract=value.get("service_contract",{})
    if (
        service_contract.get("activation_target_unit_file_state_required")!="disabled" or
        service_contract.get("custody_service_unit_file_state_required")!="static" or
        service_contract.get("unset_environment")!=[
            "GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD",
            "NODE_OPTIONS","NODE_PATH","OPENSSL_CONF",
        ]
    ):
        hold("manifest_unit_file_state_contract_invalid")
    return value

def run(argv:list[str],*,check:bool=True,timeout:int=30)->subprocess.CompletedProcess[str]:
    result=subprocess.run(
        argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=timeout,
        env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"},
    )
    if check and result.returncode!=0:
        hold("command_failed:"+Path(argv[0]).name)
    return result

def verify_node_runtime()->dict[str,Any]:
    before=os.lstat(NODE_RUNTIME)
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_nlink!=1 or before.st_uid!=0 or before.st_gid!=0 or
        stat.S_IMODE(before.st_mode)!=0o755 or before.st_size!=NODE_BYTES
    ):
        hold("node_runtime_metadata_invalid")
    fd=os.open(
        NODE_RUNTIME,
        os.O_RDONLY|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),
    )
    try:
        opened=os.fstat(fd)
        if not same_file_identity(before,opened):
            hold("node_runtime_open_generation_mismatch")
        h=hashlib.sha256()
        total=0
        while True:
            chunk=os.read(fd,1024*1024)
            if not chunk:
                break
            total+=len(chunk)
            h.update(chunk)
        after=os.fstat(fd)
        visible=os.lstat(NODE_RUNTIME)
        if (
            total!=NODE_BYTES or h.hexdigest()!=NODE_SHA256 or
            not same_file_identity(opened,after) or
            not same_file_identity(after,visible)
        ):
            hold("node_runtime_identity_mismatch")
    finally:
        os.close(fd)
    env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"}
    version=subprocess.run(
        [os.fspath(NODE_RUNTIME),"--version"],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=15,env=env,
    )
    if version.returncode!=0 or version.stdout.strip()!=NODE_VERSION:
        hold("node_runtime_version_mismatch")
    builtin=subprocess.run(
        [
            os.fspath(NODE_RUNTIME),"-e",
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
        hold("node_runtime_builtin_probe_failed")
    return {
        "path":os.fspath(NODE_RUNTIME),
        "version":version.stdout.strip(),
        "bytes":NODE_BYTES,
        "sha256":NODE_SHA256,
        "owner_uid":0,
        "owner_gid":0,
        "mode":"0755",
    }

def verify_public_key(path:Path)->bytes:
    absolute=Path(os.path.abspath(os.fspath(path)))
    visible_before=os.lstat(absolute)
    if (
        not stat.S_ISREG(visible_before.st_mode) or
        stat.S_ISLNK(visible_before.st_mode) or
        visible_before.st_nlink!=1 or
        visible_before.st_size<32 or visible_before.st_size>64*1024
    ):
        hold("public_key_metadata_invalid")
    fd=os.open(
        absolute,
        os.O_RDONLY|getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),
    )
    try:
        opened_before=os.fstat(fd)
        if not same_file_identity(visible_before,opened_before):
            hold("public_key_open_generation_mismatch")
        chunks=[]
        total=0
        maximum=visible_before.st_size+1
        while total<maximum:
            chunk=os.read(fd,min(64*1024,maximum-total))
            if not chunk:
                break
            chunks.append(chunk)
            total+=len(chunk)
        data=b"".join(chunks)
        if len(data)!=visible_before.st_size or b"PRIVATE KEY" in data:
            hold("public_key_input_invalid")

        # Parse the exact retained-generation bytes. OpenSSL never reopens the
        # caller-controlled pathname.
        result=subprocess.run(
            ["/usr/bin/openssl","pkey","-pubin","-outform","DER"],
            input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            check=False,timeout=10,
            env={"PATH":"/usr/bin:/bin","LC_ALL":"C"},
        )
        if result.returncode!=0:
            hold("public_key_parse_failed")

        opened_after=os.fstat(fd)
        visible_after=os.lstat(absolute)
        if (
            not same_file_identity(opened_before,opened_after) or
            not same_file_identity(opened_after,visible_after)
        ):
            hold("public_key_generation_changed")

        der=result.stdout
        if len(der)!=44 or not der.startswith(SPKI_PREFIX):
            hold("public_key_not_ed25519")
        raw=der[len(SPKI_PREFIX):]
        if sha256(raw)!=EXPECTED_PUBLIC_RAW_SHA256:
            hold("public_key_fingerprint_mismatch")
        return data
    finally:
        os.close(fd)

def ensure_safe_parent(path:Path)->None:
    parent=path.parent
    while parent!=Path("/"):
        if parent.exists():
            st=os.lstat(parent)
            if stat.S_ISLNK(st.st_mode) or not stat.S_ISDIR(st.st_mode):
                hold("unsafe_parent:"+os.fspath(parent))
        parent=parent.parent

def exact_file(path:Path,data:bytes,mode:int,uid:int=0,gid:int=0)->bool:
    try: st=os.lstat(path)
    except FileNotFoundError: return False
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_nlink!=1 or st.st_uid!=uid or st.st_gid!=gid or
        stat.S_IMODE(st.st_mode)!=mode or st.st_size!=len(data)
    ):
        hold("existing_file_collision:"+os.fspath(path))
    if path.read_bytes()!=data:
        hold("existing_file_bytes_mismatch:"+os.fspath(path))
    return True

def install_file(path:Path,data:bytes,mode:int,uid:int=0,gid:int=0)->bool:
    ensure_safe_parent(path)
    if exact_file(path,data,mode,uid,gid):
        return False
    fd=os.open(
        path,os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0),mode
    )
    try:
        total=0
        while total<len(data):
            total+=os.write(fd,data[total:])
        os.fsync(fd)
        os.fchmod(fd,mode)
        os.fchown(fd,uid,gid)
    finally:
        os.close(fd)
    if not exact_file(path,data,mode,uid,gid):
        hold("installed_file_verify_failed:"+os.fspath(path))
    return True

def ensure_dir(path:Path,mode:int,uid:int,gid:int)->bool:
    try: st=os.lstat(path)
    except FileNotFoundError:
        path.mkdir(mode=mode)
        os.chown(path,uid,gid)
        os.chmod(path,mode)
        st=os.lstat(path)
        created=True
    else:
        created=False
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=uid or st.st_gid!=gid or stat.S_IMODE(st.st_mode)!=mode
    ):
        hold("directory_collision:"+os.fspath(path))
    return created

def group_row(name:str):
    try:return grp.getgrnam(name)
    except KeyError:return None

def user_row(name:str):
    try:return pwd.getpwnam(name)
    except KeyError:return None

def ensure_group(name:str)->bool:
    row=group_row(name)
    if row is not None:return False
    run(["/usr/sbin/groupadd","--system",name])
    if group_row(name) is None:hold("group_create_failed:"+name)
    return True

def ensure_user()->bool:
    row=user_row(CUSTODY_USER)
    group=grp.getgrnam(CUSTODY_GROUP)
    if row is None:
        run([
            "/usr/sbin/useradd","--system","--gid",CUSTODY_GROUP,
            "--home-dir",os.fspath(STATE_ROOT),"--shell","/usr/sbin/nologin",
            "--no-create-home",CUSTODY_USER,
        ])
        row=user_row(CUSTODY_USER)
        if row is None:hold("custody_user_create_failed")
        created=True
    else:
        created=False
    if (
        row.pw_gid!=group.gr_gid or row.pw_dir!=os.fspath(STATE_ROOT) or
        row.pw_shell!="/usr/sbin/nologin"
    ):
        hold("custody_user_collision")
    return created

def ensure_membership(user:str,group:str)->bool:
    row=pwd.getpwnam(user)
    target=grp.getgrnam(group).gr_gid
    gids=set(os.getgrouplist(user,row.pw_gid))
    if target in gids:return False
    run(["/usr/sbin/usermod","--append","--groups",group,user])
    row=pwd.getpwnam(user)
    if target not in set(os.getgrouplist(user,row.pw_gid)):
        hold("group_membership_update_failed:"+user)
    return True

def ensure_root_dir(path:Path,mode:int=0o755)->bool:
    if path==Path("/"):return False
    if not path.parent.exists():
        ensure_root_dir(path.parent,0o755)
    return ensure_dir(path,mode,0,0)

def install_source_tree(root:Path,mapping:dict[str,str])->int:
    ensure_root_dir(root,0o755)
    changed=0
    expected_files=set()
    expected_dirs={root}
    for rel,blob in mapping.items():
        source=read_source(rel,blob)
        dest=root/rel
        expected_files.add(dest)
        cursor=dest.parent
        while cursor!=root.parent and cursor!=root:
            expected_dirs.add(cursor)
            cursor=cursor.parent
        for d in sorted(expected_dirs,key=lambda p:len(p.parts)):
            if d==root or root in d.parents:
                ensure_root_dir(d,0o755)
        if install_file(dest,source,0o444,0,0):changed+=1
    for dirpath,dirnames,filenames in os.walk(root):
        current=Path(dirpath)
        for name in filenames:
            if current/name not in expected_files:
                hold("unexpected_reviewed_file:"+os.fspath(current/name))
    return changed

def compile_preentry()->bytes:
    source=ROOT/PREENTRY_SOURCE_REL
    if git_blob(source.read_bytes())!=PREENTRY_SOURCE_BLOB:
        hold("preentry_source_blob_mismatch")
    with tempfile.TemporaryDirectory(prefix="void-apollyon-live-preentry-install-") as td:
        output=Path(td)/"preentry"
        result=subprocess.run(
            ["/usr/bin/cc",*COMPILE_FLAGS,"-o",os.fspath(output),os.fspath(source)],
            stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            check=False,timeout=30,env=COMPILE_ENV,
        )
        if result.returncode!=0:
            hold("preentry_compile_failed")
        data=output.read_bytes()
    if len(data)!=PREENTRY_BYTES or sha256(data)!=PREENTRY_SHA256:
        hold("preentry_compiled_identity_mismatch")
    return data

def make_env(ipc_gid:int)->bytes:
    template=read_source(ENV_TEMPLATE_REL,ENV_TEMPLATE_BLOB).decode("utf-8")
    text=template.replace("@IPC_GID@",str(ipc_gid)).replace(
        "@OPERATOR_PUBLIC_KEY_RAW_SHA256@",EXPECTED_PUBLIC_RAW_SHA256
    )
    if "@" in text:hold("environment_template_unresolved")
    return text.encode("utf-8")

def systemctl_state()->dict[str,str]:
    props={}
    service=run([
        "/usr/bin/systemctl","show","void-apollyon-authorization-custody-v1.service",
        "--no-pager","-p","LoadState","-p","ActiveState","-p","UnitFileState",
        "-p","MainPID",
    ],check=False)
    props["ServiceProbeReturncode"]=str(service.returncode)
    for line in service.stdout.splitlines():
        if "=" in line:
            k,v=line.split("=",1);props[k]=v

    target=run([
        "/usr/bin/systemctl","show","void-apollyon-authorization-custody-v1.target",
        "--no-pager","-p","LoadState","-p","ActiveState","-p","UnitFileState",
    ],check=False)
    props["TargetProbeReturncode"]=str(target.returncode)
    for line in target.stdout.splitlines():
        if "=" in line:
            k,v=line.split("=",1);props["Target"+k]=v
    return props

def require_exact_post_install_systemd_state(state:dict[str,str])->None:
    if state.get("ServiceProbeReturncode")!="0":
        hold("custody_service_state_probe_failed")
    if state.get("LoadState")!="loaded":
        hold("custody_unit_not_loaded")
    if state.get("ActiveState")!="inactive":
        hold("custody_service_not_inactive")
    if state.get("MainPID") not in ("","0",None):
        hold("custody_service_mainpid_nonzero")
    if state.get("UnitFileState")!="static":
        hold("custody_service_unit_file_state_not_static")
    if state.get("TargetProbeReturncode")!="0":
        hold("custody_target_state_probe_failed")
    if state.get("TargetLoadState")!="loaded":
        hold("custody_target_not_loaded")
    if state.get("TargetActiveState")!="inactive":
        hold("custody_target_not_inactive")
    if state.get("TargetUnitFileState")!="disabled":
        hold("custody_target_unit_file_state_not_disabled")

def verify_source_contract()->dict[str,Any]:
    manifest=load_manifest()
    read_source(UNIT_REL,UNIT_BLOB)
    read_source(TARGET_REL,TARGET_BLOB)
    read_source(ENV_TEMPLATE_REL,ENV_TEMPLATE_BLOB)
    read_source(POLKIT_REL,POLKIT_BLOB)
    read_source(TMPFILES_REL,TMPFILES_BLOB)
    read_source(LIVE_LAUNCHER_REL,LIVE_LAUNCHER_BLOB)
    read_source(PREENTRY_SOURCE_REL,PREENTRY_SOURCE_BLOB)
    read_source(LIFECYCLE_REL,LIFECYCLE_BLOB)
    for rel,blob in manifest["custody_service_closure"].items():
        read_source(rel,blob)
    for rel,blob in manifest["live_session_closure"].items():
        read_source(rel,blob)
    for rel,blob in manifest["host_lifecycle_closure"].items():
        read_source(rel,blob)
    return manifest

def plan(public_key:Path)->dict[str,Any]:
    manifest=verify_source_contract()
    node_runtime=verify_node_runtime()
    verify_public_key(public_key)
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():
        hold("wrong_host")
    training=user_row(TRAINING_USER)
    if training is None:hold("training_user_missing")
    existing={
        "custody_user_present":user_row(CUSTODY_USER) is not None,
        "custody_group_present":group_row(CUSTODY_GROUP) is not None,
        "ipc_group_present":group_row(IPC_GROUP) is not None,
        "custody_unit_path_present":SYSTEMD_UNIT.exists(),
        "custody_target_path_present":SYSTEMD_TARGET.exists(),
        "polkit_path_visible":POLKIT_PATH.exists(),
        "tmpfiles_path_present":TMPFILES_PATH.exists(),
        "state_root_present":STATE_ROOT.exists(),
        "live_preentry_present":LIVE_PREENTRY.exists(),
        "live_launcher_present":LIVE_LAUNCHER.exists(),
        "custody_socket_cleanup_present":CLEANUP_HELPER.exists(),
    }
    return {
        "marker":MARKER,
        "mode":"--plan",
        "target_host":TARGET_HOST,
        "public_key_raw_sha256":EXPECTED_PUBLIC_RAW_SHA256,
        "preentry_bytes":PREENTRY_BYTES,
        "preentry_sha256":PREENTRY_SHA256,
        "existing":existing,
        "source_contract_verified":True,
        "node_runtime_verified":True,
        "node_runtime_path":node_runtime["path"],
        "node_runtime_version":node_runtime["version"],
        "node_runtime_bytes":node_runtime["bytes"],
        "node_runtime_sha256":node_runtime["sha256"],
        "create_only":True,
        "daemon_reload_on_apply":True,
        "tmpfiles_create_on_apply":True,
        "service_start":False,
        "service_enable":False,
        "activation_target_start":False,
        "activation_target_enable":False,
        "training_execution":False,
        "durable_attempt_claim":False,
        "candidate_weight_mutation":False,
        "operator_private_key_access":False,
        "funds_movement":False,
        "next_action":"RUN_APPLY_WITH_EXPLICIT_PUBLIC_PEM",
    }

def apply(public_key:Path)->dict[str,Any]:
    if os.geteuid()!=0:hold("apply_requires_root")
    before=plan(public_key)
    initial_state=systemctl_state()
    if (
        initial_state.get("ActiveState")=="active" or
        initial_state.get("TargetActiveState")=="active"
    ):
        hold("custody_lifecycle_already_active")

    ensure_group(IPC_GROUP)
    ensure_group(CUSTODY_GROUP)
    ensure_user()
    ensure_membership(TRAINING_USER,IPC_GROUP)
    ensure_membership(CUSTODY_USER,IPC_GROUP)

    custody=pwd.getpwnam(CUSTODY_USER)
    ipc=grp.getgrnam(IPC_GROUP)
    training=pwd.getpwnam(TRAINING_USER)
    if ipc.gr_gid in {custody.pw_gid,training.pw_gid}:
        hold("ipc_primary_group_collision")
    if custody.pw_gid==training.pw_gid or custody.pw_uid==training.pw_uid:
        hold("custody_training_identity_collision")

    ensure_root_dir(Path("/etc/void"),0o755)
    ensure_dir(CONFIG_DIR,0o755,0,0)
    ensure_dir(STATE_ROOT,0o700,custody.pw_uid,custody.pw_gid)
    ensure_dir(CONSUMED,0o700,custody.pw_uid,custody.pw_gid)
    ensure_root_dir(CUSTODY_SOURCE_ROOT,0o755)
    ensure_root_dir(LIVE_SOURCE_ROOT,0o755)
    ensure_root_dir(LIVE_PREENTRY_ROOT,0o755)
    ensure_root_dir(LIFECYCLE_ROOT,0o755)

    manifest=load_manifest()
    install_source_tree(CUSTODY_SOURCE_ROOT,manifest["custody_service_closure"])
    install_source_tree(LIVE_SOURCE_ROOT,manifest["live_session_closure"])

    preentry=compile_preentry()
    install_file(LIVE_PREENTRY,preentry,0o755,0,0)
    live_launcher=read_source(LIVE_LAUNCHER_REL,LIVE_LAUNCHER_BLOB)
    install_file(LIVE_LAUNCHER,live_launcher,0o444,0,0)
    cleanup_helper=read_source(LIFECYCLE_REL,LIFECYCLE_BLOB)
    install_file(CLEANUP_HELPER,cleanup_helper,0o444,0,0)

    public_bytes=verify_public_key(public_key)
    install_file(PUBLIC_KEY_PATH,public_bytes,0o644,0,0)
    install_file(ENV_PATH,make_env(ipc.gr_gid),0o600,0,0)

    install_file(SYSTEMD_UNIT,read_source(UNIT_REL,UNIT_BLOB),0o644,0,0)
    install_file(SYSTEMD_TARGET,read_source(TARGET_REL,TARGET_BLOB),0o644,0,0)
    install_file(POLKIT_PATH,read_source(POLKIT_REL,POLKIT_BLOB),0o644,0,0)
    install_file(TMPFILES_PATH,read_source(TMPFILES_REL,TMPFILES_BLOB),0o644,0,0)

    run(["/usr/bin/systemd-tmpfiles","--create",os.fspath(TMPFILES_PATH)])
    sp=os.lstat(SOCKET_PARENT)
    if (
        not stat.S_ISDIR(sp.st_mode) or sp.st_uid!=custody.pw_uid or
        sp.st_gid!=ipc.gr_gid or stat.S_IMODE(sp.st_mode)!=0o750
    ):
        hold("socket_parent_tmpfiles_mismatch")

    run(["/usr/bin/systemctl","daemon-reload"])
    state=systemctl_state()
    require_exact_post_install_systemd_state(state)

    return {
        **before,
        "mode":"--apply",
        "custody_uid":custody.pw_uid,
        "custody_gid":custody.pw_gid,
        "ipc_gid":ipc.gr_gid,
        "training_uid":training.pw_uid,
        "training_gid":training.pw_gid,
        "training_ipc_membership":True,
        "custody_ipc_membership":True,
        "state_root_installed":True,
        "socket_parent_installed":True,
        "custody_reviewed_source_installed":True,
        "live_session_reviewed_source_installed":True,
        "live_preentry_installed":True,
        "live_launcher_installed":True,
        "custody_socket_cleanup_installed":True,
        "operator_public_key_installed":True,
        "custody_unit_installed":True,
        "custody_target_installed":True,
        "polkit_rule_installed":True,
        "tmpfiles_rule_installed":True,
        "daemon_reload_performed":True,
        "service_start":False,
        "service_enable":False,
        "activation_target_start":False,
        "activation_target_enable":False,
        "training_execution":False,
        "durable_attempt_claim":False,
        "candidate_weight_mutation":False,
        "operator_private_key_access":False,
        "funds_movement":False,
        "create_only_install_complete":True,
        "next_action":"INSTALLED_CUSTODY_AND_LIVE_SESSION_ATTESTATION",
    }

def self_test()->None:
    global EXPECTED_PUBLIC_RAW_SHA256
    manifest=verify_source_contract()
    assert manifest["required_operator_input"]["expected_operator_public_key_raw_sha256"]==EXPECTED_PUBLIC_RAW_SHA256
    assert manifest["preentry_lock"]["bytes"]==PREENTRY_BYTES
    assert manifest["preentry_lock"]["sha256"]==PREENTRY_SHA256
    assert manifest["paths"]["node_runtime"]==os.fspath(NODE_RUNTIME)
    assert manifest["paths"]["custody_stale_socket_cleanup"]==os.fspath(CLEANUP_HELPER)
    assert manifest["host_lifecycle_closure"][LIFECYCLE_REL]==LIFECYCLE_BLOB
    assert manifest["socket_lifecycle_contract"]["custody_uid_process_exclusivity_required"] is True
    assert manifest["socket_lifecycle_contract"]["custody_uid_process_census_uid_slots"]==["real","effective","saved","filesystem"]
    assert manifest["socket_lifecycle_contract"]["unclassifiable_process_status_holds"] is True
    assert manifest["service_contract"]["activation_target_unit_file_state_required"]=="disabled"
    assert manifest["service_contract"]["custody_service_unit_file_state_required"]=="static"
    assert manifest["service_contract"]["unset_environment"]==[
        "GCONV_PATH","LD_AUDIT","LD_LIBRARY_PATH","LD_PRELOAD",
        "NODE_OPTIONS","NODE_PATH","OPENSSL_CONF",
    ]
    unit=read_source(UNIT_REL,UNIT_BLOB).decode("utf-8")
    assert (
        "UnsetEnvironment=GCONV_PATH LD_AUDIT LD_LIBRARY_PATH LD_PRELOAD NODE_OPTIONS NODE_PATH OPENSSL_CONF"
        in unit
    )
    assert manifest["node_runtime_contract"]["version"]==NODE_VERSION
    assert manifest["node_runtime_contract"]["bytes"]==NODE_BYTES
    assert manifest["node_runtime_contract"]["sha256"]==NODE_SHA256

    good_state={
        "ServiceProbeReturncode":"0",
        "LoadState":"loaded",
        "ActiveState":"inactive",
        "UnitFileState":"static",
        "MainPID":"0",
        "TargetProbeReturncode":"0",
        "TargetLoadState":"loaded",
        "TargetActiveState":"inactive",
        "TargetUnitFileState":"disabled",
    }
    require_exact_post_install_systemd_state(good_state)
    for key,value,reason in (
        ("ServiceProbeReturncode","1","custody_service_state_probe_failed"),
        ("ActiveState","active","custody_service_not_inactive"),
        ("UnitFileState","masked","custody_service_unit_file_state_not_static"),
        ("TargetProbeReturncode","1","custody_target_state_probe_failed"),
        ("TargetActiveState","active","custody_target_not_inactive"),
        ("TargetUnitFileState","enabled-runtime","custody_target_unit_file_state_not_disabled"),
        ("TargetUnitFileState","masked","custody_target_unit_file_state_not_disabled"),
    ):
        bad=dict(good_state);bad[key]=value
        try:
            require_exact_post_install_systemd_state(bad)
        except Hold as exc:
            assert str(exc)==reason,(key,str(exc),reason)
        else:
            raise AssertionError("noncanonical_post_install_state_accepted:"+key+":"+value)

    compiled=compile_preentry()
    assert len(compiled)==PREENTRY_BYTES
    assert sha256(compiled)==PREENTRY_SHA256

    # Regression for the historical read-A / parse-visible-B pathname swap.
    # These are valid RFC 8032 Ed25519 public keys; no private key is created.
    raw_a=bytes.fromhex(
        "d75a980182b10ab7d54bfed3c964073a"
        "0ee172f3daa62325af021a68f707511a"
    )
    raw_b=bytes.fromhex(
        "3d4017c3e843895a92b70aa74d1b7ebc"
        "9c982ccf2ec4968cc0cd55f12af4660c"
    )
    def pem(raw:bytes)->bytes:
        encoded=base64.b64encode(SPKI_PREFIX+raw).decode("ascii")
        return (
            "-----BEGIN PUBLIC KEY-----\n"+
            "\n".join(encoded[i:i+64] for i in range(0,len(encoded),64))+
            "\n-----END PUBLIC KEY-----\n"
        ).encode("ascii")

    original_expected=EXPECTED_PUBLIC_RAW_SHA256
    original_run=subprocess.run
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-public-key-swap-"
    ) as td:
        key_path=Path(td)/"operator-public-key.pem"
        replacement=Path(td)/"approved-replacement.pem"
        key_path.write_bytes(pem(raw_a))
        replacement.write_bytes(pem(raw_b))
        EXPECTED_PUBLIC_RAW_SHA256=sha256(raw_b)
        swapped=False

        def swapping_run(argv,*args,**kwargs):
            nonlocal swapped
            if (
                not swapped and len(argv)>=3 and
                argv[0]=="/usr/bin/openssl" and
                argv[1:3]==["pkey","-pubin"]
            ):
                os.replace(replacement,key_path)
                swapped=True
            return original_run(argv,*args,**kwargs)

        subprocess.run=swapping_run
        try:
            try:
                verify_public_key(key_path)
            except Hold as exc:
                if str(exc) not in {
                    "public_key_generation_changed",
                    "public_key_fingerprint_mismatch",
                }:
                    raise
            else:
                raise AssertionError("public_key_path_swap_accepted")
            assert swapped
        finally:
            subprocess.run=original_run
            EXPECTED_PUBLIC_RAW_SHA256=original_expected

    env=make_env(980).decode("utf-8")
    assert "@IPC_GID@" not in env and "@OPERATOR_PUBLIC_KEY_RAW_SHA256@" not in env
    assert "VOID_APOLLYON_CUSTODY_SOCKET_GROUP_GID=980" in env
    assert EXPECTED_PUBLIC_RAW_SHA256 in env
    source=Path(__file__).read_text(encoding="utf-8")
    forbidden_parts=(
        ("systemctl",'","',"start"),
        ("systemctl",'","',"enable"),
        ("systemctl",'","',"restart"),
        ("training_","execution","=True"),
        ("durable_","attempt_claim","=True"),
        ("create","PrivateKey"),
        ("eth_sendRaw","Transaction"),
    )
    for parts in forbidden_parts:
        forbidden="".join(parts)
        assert forbidden not in source,forbidden
    print(MARKER+"_SELF_TEST_GREEN")
    print("create_only=true")
    print("source_contract_verified=true")
    print("public_key_raw_sha256="+EXPECTED_PUBLIC_RAW_SHA256)
    print("preentry_sha256="+PREENTRY_SHA256)
    print("node_runtime_required=true")
    print("node_runtime_path="+os.fspath(NODE_RUNTIME))
    print("node_runtime_sha256="+NODE_SHA256)
    print("preentry_static_rederived=true")
    print("public_key_retained_generation=true")
    print("public_key_path_swap_rejected=true")
    print("exact_post_install_unit_states_required=true")
    print("manager_environment_influence_unset=true")
    print("service_start=false")
    print("service_enable=false")
    print("training_execution=false")
    print("durable_attempt_claim=false")
    print("funds_movement=false")

def main()->int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--self-test",action="store_true")
    parser.add_argument("--plan",action="store_true")
    parser.add_argument("--apply",action="store_true")
    parser.add_argument("--public-key-pem",type=Path)
    args=parser.parse_args()
    selected=sum((args.self_test,args.plan,args.apply))
    if selected!=1:
        parser.error("choose exactly one mode")
    if args.self_test:
        self_test()
        return 0
    if args.public_key_pem is None:
        parser.error("--public-key-pem is required")
    try:
        result=apply(args.public_key_pem) if args.apply else plan(args.public_key_pem)
    except Hold as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("service_start=false",file=sys.stderr)
        print("service_enable=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr)
        print("operator_private_key_access=false",file=sys.stderr)
        print("funds_movement=false",file=sys.stderr)
        return 2
    print(json.dumps(result,sort_keys=True,separators=(",",":")))
    return 0

if __name__=="__main__":
    raise SystemExit(main())

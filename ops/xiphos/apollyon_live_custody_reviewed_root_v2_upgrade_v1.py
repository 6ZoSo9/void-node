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
        sys.stderr.write("service_action=false\n")
        sys.stderr.write("training_execution=false\n")
        sys.stderr.write("funds_movement=false\n")
        raise SystemExit(2)

_require_isolated_python()

import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import stat
import shutil
import subprocess
import tempfile
import time

MARKER="VOID_APOLLYON_LIVE_CUSTODY_REVIEWED_ROOT_V2_UPGRADE_V1"
TARGET_HOST="Xiphos"
ROOT=Path(__file__).resolve().parents[2]

UPGRADE_MANIFEST_REL="ops/xiphos/apollyon-live-custody-reviewed-root-v2-upgrade-v1.json"
UPGRADE_MANIFEST_BLOB="e78f1709c81775b881ab8f54291bd470ff9e1353"
OLD_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v1")
NEW_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v2")
PRIOR_V2_BACKUP_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v2-prior-v1")
CURRENT_STAGE=Path("/opt/.void-apollyon-live-custody-binding-v2-reviewed-v2.current-stage-v1")
FIXED_LAUNCHER=Path(
    "/opt/void-apollyon-live-custody-binding-v2-preentry-v1/"
    "apollyon_live_custody_source_session_launcher_v2.py"
)
LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"
REVIEWED_ROOT_LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_v2.py"
OLD_LAUNCHER_BLOB="e18124d3109ed63ff50da9c467fb1b798c300460"
PRIOR_V2_LAUNCHER_BLOB="b96f99d6c513405e6f8b87b8f5c3fb1b1cbbf9c7"
PRIOR_CURRENT_LAUNCHER_BLOB="820f7151c0f83280b7457f841cee14c3b0c274b6"
NEW_LAUNCHER_BLOB="352bd36f2b07091140b990de4170f708eb11fee6"
CUSTODY_UNIT="void-apollyon-authorization-custody-v1.service"
TRAINING_UNIT="void-apollyon-training-bus-isolation-v1.service"
FIXED_PREENTRY=Path(
    "/opt/void-apollyon-live-custody-binding-v2-preentry-v1/"
    "apollyon_live_custody_source_session_preentry_v2"
)
PROC_ROOT=Path("/proc")
PROC_CMDLINE_MAX_BYTES=256*1024
MAX_PROC_ROWS=262144
RUNNER_ARG_SUFFIX=b"/tools/apollyon-live-custody-source-session-runner-v2.mjs"
RUNNER_ARG_REL=b"tools/apollyon-live-custody-source-session-runner-v2.mjs"

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
    if (
        value["from"]["reviewed_root"]!=str(OLD_ROOT) or
        value["prior_v2"]["reviewed_root"]!=str(NEW_ROOT) or
        value["prior_current"]["reviewed_root"]!=str(NEW_ROOT) or
        value["to"]["reviewed_root"]!=str(NEW_ROOT) or
        value.get("prior_v2_backup_root")!=str(PRIOR_V2_BACKUP_ROOT)
    ):
        hold("upgrade_manifest_root_invalid")
    if value["from"]["fixed_launcher_blob_sha1"]!=OLD_LAUNCHER_BLOB:
        hold("upgrade_manifest_old_launcher_invalid")
    if value["prior_v2"]["fixed_launcher_blob_sha1"]!=PRIOR_V2_LAUNCHER_BLOB:
        hold("upgrade_manifest_prior_v2_launcher_invalid")
    if value["prior_current"]["fixed_launcher_blob_sha1"]!=PRIOR_CURRENT_LAUNCHER_BLOB:
        hold("upgrade_manifest_prior_current_launcher_invalid")
    if value["prior_current"].get("fixed_launcher_source_rel")!=REVIEWED_ROOT_LAUNCHER_REL:
        hold("upgrade_manifest_prior_current_launcher_source_invalid")
    if value["to"]["fixed_launcher_blob_sha1"]!=NEW_LAUNCHER_BLOB:
        hold("upgrade_manifest_new_launcher_invalid")
    if value["to"].get("fixed_launcher_source_rel")!=LAUNCHER_REL:
        hold("upgrade_manifest_new_launcher_source_invalid")
    if value["prior_current"].get("closure")!=value["to"].get("closure"):
        hold("upgrade_manifest_prior_current_closure_invalid")
    if (
        value["prior_v2"].get("systemd_reviewed_versions")!=
            value["prior_current"].get("systemd_reviewed_versions") or
        value["prior_current"].get("systemd_reviewed_versions")!=
            value["to"].get("systemd_reviewed_versions")
    ):
        hold("upgrade_manifest_systemd_versions_invalid")
    return value

def run(argv:list[str],check=True)->subprocess.CompletedProcess[str]:
    r=subprocess.run(
        argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=20,
        env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"},
    )
    if check and r.returncode!=0: hold("command_failed:"+Path(argv[0]).name)
    return r

def parse_service_state(text:str)->dict[str,str]:
    expected={"LoadState","ActiveState","SubState","MainPID"}
    observed:dict[str,str]={}
    for raw in text.splitlines():
        if not raw:
            continue
        if "=" not in raw:
            hold("service_state_shape_invalid")
        key,value=raw.split("=",1)
        if key not in expected or key in observed:
            hold("service_state_shape_invalid")
        observed[key]=value
    if set(observed)!=expected:
        hold("service_state_shape_invalid")
    return observed

def _read_proc_cmdline(path:Path)->list[bytes]|None:
    flags=os.O_RDONLY|getattr(os,"O_CLOEXEC",0)|getattr(os,"O_NOFOLLOW",0)
    try:
        fd=os.open(path,flags)
    except FileNotFoundError:
        return None
    except ProcessLookupError:
        return None
    except OSError as exc:
        raise Hold("live_session_process_cmdline_open_failed") from exc
    try:
        chunks:list[bytes]=[]
        total=0
        while True:
            try:
                chunk=os.read(fd,min(65536,PROC_CMDLINE_MAX_BYTES+1-total))
            except OSError as exc:
                raise Hold("live_session_process_cmdline_read_failed") from exc
            if not chunk:
                break
            total+=len(chunk)
            if total>PROC_CMDLINE_MAX_BYTES:
                hold("live_session_process_cmdline_too_large")
            chunks.append(chunk)
        raw=b"".join(chunks)
    finally:
        os.close(fd)
    if not raw:
        return []
    return [arg for arg in raw.split(b"\0") if arg]


def census_inflight_live_session_processes(
    proc_root:Path=PROC_ROOT,
    *,
    required_uid:int=0,
)->list[dict[str,object]]:
    try:
        entries=list(proc_root.iterdir())
    except OSError as exc:
        raise Hold("live_session_process_census_unavailable") from exc
    rows:list[dict[str,object]]=[]
    numeric_seen=0
    fixed_preentry=os.fsencode(FIXED_PREENTRY)
    fixed_launcher=os.fsencode(FIXED_LAUNCHER)
    for entry in entries:
        if not entry.name.isdigit() or entry.name=="0":
            continue
        numeric_seen+=1
        if numeric_seen>MAX_PROC_ROWS:
            hold("live_session_process_census_too_large")
        try:
            meta=entry.stat(follow_symlinks=False)
        except FileNotFoundError:
            continue
        except ProcessLookupError:
            continue
        except OSError as exc:
            raise Hold("live_session_process_metadata_unreadable") from exc
        # The reviewed preentry and launcher both require root. Restrict the
        # quiescence barrier to that authority domain so unprivileged argv
        # spoofing cannot indefinitely block retirement.
        if meta.st_uid!=required_uid:
            continue
        args=_read_proc_cmdline(entry/"cmdline")
        if args is None or not args:
            continue
        role:str|None=None
        if fixed_preentry in args:
            role="native_preentry"
        elif fixed_launcher in args:
            role="fixed_launcher"
        elif any(
            arg==RUNNER_ARG_REL or arg.endswith(RUNNER_ARG_SUFFIX)
            for arg in args
        ):
            role="private_runner"
        if role is not None:
            rows.append({"pid":int(entry.name),"role":role})
    return sorted(rows,key=lambda row:(int(row["pid"]),str(row["role"])))


def assert_no_inflight_live_session_processes(
    proc_root:Path=PROC_ROOT,
    *,
    settle_seconds:float=0.05,
    required_uid:int=0,
)->dict[str,object]:
    first=census_inflight_live_session_processes(
        proc_root,required_uid=required_uid
    )
    if first:
        hold("inflight_live_session_process_present")
    if settle_seconds>0:
        time.sleep(settle_seconds)
    second=census_inflight_live_session_processes(
        proc_root,required_uid=required_uid
    )
    if second:
        hold("inflight_live_session_process_present")
    return {
        "root_owned_live_session_processes_absent":True,
        "two_pass_process_census":True,
    }


def service_state(unit:str)->dict[str,str]:
    result=run([
        "/usr/bin/systemctl","show",unit,
        "-p","LoadState","-p","ActiveState","-p","SubState","-p","MainPID",
    ],check=True)
    return parse_service_state(result.stdout)

def require_exact_dormant_state(state:dict[str,str],label:str)->None:
    if state != {
        "LoadState":"loaded",
        "ActiveState":"inactive",
        "SubState":"dead",
        "MainPID":"0",
    }:
        hold(label+"_service_not_exactly_inactive")

def assert_services_dormant()->None:
    require_exact_dormant_state(service_state(CUSTODY_UNIT),"custody")
    require_exact_dormant_state(service_state(TRAINING_UNIT),"training")

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

def legacy_v1_root_state(manifest:dict)->str:
    try:
        os.lstat(OLD_ROOT)
    except FileNotFoundError:
        return "absent"
    except OSError as exc:
        raise Hold("legacy_v1_root_observation_failed") from exc
    try:
        verify_tree(OLD_ROOT,manifest["from"]["closure"])
    except (Hold,FileNotFoundError,OSError) as exc:
        raise Hold("legacy_v1_root_collision") from exc
    return "old_exact"

def path_is_absent(path:Path,label:str)->bool:
    try:
        os.lstat(path)
    except FileNotFoundError:
        return True
    except OSError as exc:
        raise Hold(label+"_observation_failed") from exc
    return False

def reviewed_v2_root_state(manifest:dict)->str:
    if path_is_absent(NEW_ROOT,"reviewed_v2_root"):
        return "absent"
    try:
        verify_tree(NEW_ROOT,manifest["to"]["closure"])
        return "current_exact"
    except (Hold,FileNotFoundError,OSError):
        pass
    try:
        verify_tree(NEW_ROOT,manifest["prior_v2"]["closure"])
        return "prior_v2_exact"
    except (Hold,FileNotFoundError,OSError) as exc:
        raise Hold("reviewed_v2_root_collision") from exc

def prior_v2_backup_state(manifest:dict)->str:
    if path_is_absent(PRIOR_V2_BACKUP_ROOT,"prior_v2_backup"):
        return "absent"
    try:
        verify_tree(PRIOR_V2_BACKUP_ROOT,manifest["prior_v2"]["closure"])
    except (Hold,FileNotFoundError,OSError) as exc:
        raise Hold("prior_v2_backup_collision") from exc
    return "prior_v2_exact"

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
    if digest==PRIOR_V2_LAUNCHER_BLOB:return "prior_v2_exact"
    if digest==PRIOR_CURRENT_LAUNCHER_BLOB:return "prior_current_exact"
    if digest==NEW_LAUNCHER_BLOB:return "new_exact"
    hold("fixed_launcher_collision")

def classify_upgrade_state(launcher:str,root:str,backup:str)->str:
    if launcher=="old_exact" and backup=="absent":
        if root=="absent": return "legacy_v1_pending"
        if root=="current_exact": return "legacy_v1_tree_installed"
    if (
        launcher=="prior_v2_exact" and
        root=="prior_v2_exact" and backup=="absent"
    ):
        return "prior_v2_pending"
    if (
        launcher=="prior_current_exact" and root=="current_exact" and
        backup in ("absent","prior_v2_exact")
    ):
        return "prior_current_pending"
    if launcher=="new_exact":
        if root=="prior_v2_exact" and backup=="absent":
            return "prior_v2_launcher_switched"
        if root=="absent" and backup=="prior_v2_exact":
            return "prior_v2_root_swap_resume"
        if root=="current_exact" and backup=="absent":
            return "current_exact"
        if root=="current_exact" and backup=="prior_v2_exact":
            return "current_exact_from_prior_v2"
    hold("unsupported_upgrade_state:"+launcher+":"+root+":"+backup)

def fsync_parent(path:Path)->None:
    fd=os.open(
        path.parent,
        os.O_RDONLY|getattr(os,"O_DIRECTORY",0)|getattr(os,"O_CLOEXEC",0),
    )
    try:
        os.fsync(fd)
    finally:
        os.close(fd)

def prepare_current_stage(mapping:dict[str,str])->None:
    if CURRENT_STAGE.exists():
        try:
            verify_tree(CURRENT_STAGE,mapping)
            return
        except (Hold,FileNotFoundError):
            exact_root_dir(CURRENT_STAGE)
            shutil.rmtree(CURRENT_STAGE)
            fsync_parent(CURRENT_STAGE)
    ensure_root_dir(CURRENT_STAGE)
    try:
        for rel,blob in mapping.items():
            data=read_source(rel,blob)
            install_file(CURRENT_STAGE/rel,data)
        verify_tree(CURRENT_STAGE,mapping)
        fsync_tree(CURRENT_STAGE)
        fsync_parent(CURRENT_STAGE)
    except BaseException:
        if CURRENT_STAGE.exists():
            try:
                exact_root_dir(CURRENT_STAGE)
                shutil.rmtree(CURRENT_STAGE)
                fsync_parent(CURRENT_STAGE)
            except Exception:
                pass
        raise

def install_new_tree(mapping:dict[str,str])->bool:
    if not path_is_absent(NEW_ROOT,"reviewed_v2_root"):
        verify_tree(NEW_ROOT,mapping)
        return False
    prepare_current_stage(mapping)
    if not path_is_absent(NEW_ROOT,"reviewed_v2_root"):
        verify_tree(NEW_ROOT,mapping)
        return False
    os.rename(CURRENT_STAGE,NEW_ROOT)
    fsync_parent(NEW_ROOT)
    verify_tree(NEW_ROOT,mapping)
    return True

def replace_launcher(new_bytes:bytes,allowed_from:tuple[str,...])->bool:
    state=launcher_state()
    if state=="new_exact": return False
    if state not in allowed_from:
        hold("fixed_launcher_unexpected_migration_source:"+state)
    expected_blob={
        "old_exact":OLD_LAUNCHER_BLOB,
        "prior_v2_exact":PRIOR_V2_LAUNCHER_BLOB,
        "prior_current_exact":PRIOR_CURRENT_LAUNCHER_BLOB,
    }.get(state)
    if expected_blob is None:
        hold("fixed_launcher_unexpected_migration_source:"+state)
    before=os.lstat(FIXED_LAUNCHER)
    temp=FIXED_LAUNCHER.parent/(".launcher.new."+str(os.getpid()))
    fd=os.open(
        temp,os.O_WRONLY|os.O_CREAT|os.O_EXCL|
        getattr(os,"O_NOFOLLOW",0)|getattr(os,"O_CLOEXEC",0),
        0o600,
    )
    try:
        sent=0
        while sent<len(new_bytes): sent+=os.write(fd,new_bytes[sent:])
        os.fsync(fd); os.fchmod(fd,0o444); os.fchown(fd,0,0)
    finally: os.close(fd)
    try:
        current=os.lstat(FIXED_LAUNCHER)
        if (
            not same_identity(before,current) or
            git_blob(FIXED_LAUNCHER.read_bytes())!=expected_blob
        ):
            hold("fixed_launcher_changed_before_replace")
        os.replace(temp,FIXED_LAUNCHER)
        fsync_parent(FIXED_LAUNCHER)
    finally:
        try: os.unlink(temp)
        except FileNotFoundError: pass
    if launcher_state()!="new_exact":
        hold("fixed_launcher_post_replace_invalid")
    return True

def migrate_prior_v2_tree(manifest:dict)->bool:
    current=reviewed_v2_root_state(manifest)
    backup=prior_v2_backup_state(manifest)
    if current=="current_exact" and backup=="prior_v2_exact":
        return False
    if backup=="absent":
        if current!="prior_v2_exact":
            hold("prior_v2_source_root_missing")
        verify_tree(CURRENT_STAGE,manifest["to"]["closure"])
        if not path_is_absent(PRIOR_V2_BACKUP_ROOT,"prior_v2_backup"):
            hold("prior_v2_backup_raced")
        os.rename(NEW_ROOT,PRIOR_V2_BACKUP_ROOT)
        fsync_parent(PRIOR_V2_BACKUP_ROOT)
        verify_tree(PRIOR_V2_BACKUP_ROOT,manifest["prior_v2"]["closure"])
        current="absent"
        backup="prior_v2_exact"
    if backup!="prior_v2_exact":
        hold("prior_v2_backup_unproven")
    if current=="prior_v2_exact":
        hold("prior_v2_duplicate_source_after_backup")
    if current=="absent":
        verify_tree(CURRENT_STAGE,manifest["to"]["closure"])
        if not path_is_absent(NEW_ROOT,"reviewed_v2_root"):
            hold("reviewed_v2_root_raced")
        os.rename(CURRENT_STAGE,NEW_ROOT)
        fsync_parent(NEW_ROOT)
    verify_tree(PRIOR_V2_BACKUP_ROOT,manifest["prior_v2"]["closure"])
    verify_tree(NEW_ROOT,manifest["to"]["closure"])
    return True

def plan()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold(): hold("wrong_host")
    manifest=load_upgrade_manifest()
    assert_services_dormant()
    old_root=legacy_v1_root_state(manifest)
    launcher=launcher_state()
    root=reviewed_v2_root_state(manifest)
    backup=prior_v2_backup_state(manifest)
    migration=classify_upgrade_state(launcher,root,backup)
    launcher_quiescence_proven=False
    if launcher=="new_exact":
        assert_no_inflight_live_session_processes()
        launcher_quiescence_proven=True
    if migration.startswith("legacy_v1") and old_root!="old_exact":
        hold("legacy_v1_source_root_missing")
    for rel,blob in manifest["to"]["closure"].items(): read_source(rel,blob)
    if migration.startswith("prior_v2") or migration=="current_exact_from_prior_v2":
        for rel,blob in manifest["prior_v2"]["closure"].items():
            if rel==LAUNCHER_REL:
                continue
            if not isinstance(blob,str) or len(blob)!=40:
                hold("prior_v2_manifest_blob_invalid:"+rel)
    if migration.startswith("legacy_v1"):
        next_action="APPLY_REVIEWED_ROOT_V2_UPGRADE"
    elif migration.startswith("prior_v2"):
        next_action="APPLY_PRIOR_V2_TO_CURRENT_V2_MIGRATION"
    elif migration=="prior_current_pending":
        next_action="APPLY_CANONICAL_FIXED_LAUNCHER_RETIREMENT"
    else:
        next_action="UPGRADE_ALREADY_EXACT"
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        "old_root_state":old_root,
        "old_root_verified":old_root=="old_exact",
        "old_root_preserved":old_root=="old_exact",
        "reviewed_v2_root_state":root,
        "prior_v2_backup_state":backup,
        "fixed_launcher_state":launcher,
        "migration_state":migration,
        "prior_v2_migration_source_bound":True,
        "prior_current_launcher_retirement_source_bound":True,
        "post_swap_launcher_quiescence_required":True,
        "launcher_quiescence_proven":launcher_quiescence_proven,
        "prior_v2_backup_root":str(PRIOR_V2_BACKUP_ROOT),
        "new_closure_source_verified":True,
        "service_action":False,"systemd_mutation":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":next_action,
    }

def apply()->dict:
    if os.geteuid()!=0: hold("apply_requires_root")
    before=plan()
    manifest=load_upgrade_manifest()
    migration=before["migration_state"]
    changed=False
    tree_changed=False
    if migration.startswith("legacy_v1"):
        tree_changed=install_new_tree(manifest["to"]["closure"])
        changed=replace_launcher(
            read_source(LAUNCHER_REL,NEW_LAUNCHER_BLOB),
            ("old_exact",),
        )
        assert_no_inflight_live_session_processes()
    elif migration in (
        "prior_v2_pending",
        "prior_v2_launcher_switched",
        "prior_v2_root_swap_resume",
    ):
        # Stage and fsync the complete current closure before changing the
        # launcher. A staging failure therefore leaves the still-compatible
        # prior launcher/root pair untouched.
        prepare_current_stage(manifest["to"]["closure"])
        if launcher_state()!="new_exact":
            changed=replace_launcher(
                read_source(LAUNCHER_REL,NEW_LAUNCHER_BLOB),
                ("prior_v2_exact",),
            )
        assert_no_inflight_live_session_processes()
        # Close the prior-launcher race before the first root rename. Once the
        # current launcher is visible, it fail-closes against a still-prior V2
        # reviewed root; this second observation proves no raced old session is
        # active before migration mutates the canonical root.
        assert_services_dormant()
        tree_changed=migrate_prior_v2_tree(manifest)
    elif migration=="prior_current_pending":
        changed=replace_launcher(
            read_source(LAUNCHER_REL,NEW_LAUNCHER_BLOB),
            ("prior_current_exact",),
        )
        assert_no_inflight_live_session_processes()
        assert_services_dormant()
        verify_tree(NEW_ROOT,manifest["to"]["closure"])
    elif migration in ("current_exact","current_exact_from_prior_v2"):
        pass
    else:
        hold("unsupported_apply_state:"+migration)
    final_old_root=legacy_v1_root_state(manifest)
    if final_old_root!=before["old_root_state"]:
        hold("legacy_v1_root_changed_during_upgrade")
    verify_tree(NEW_ROOT,manifest["to"]["closure"])
    final_backup=prior_v2_backup_state(manifest)
    if migration.startswith("prior_v2") and final_backup!="prior_v2_exact":
        hold("prior_v2_backup_missing_after_migration")
    assert_no_inflight_live_session_processes()
    assert_services_dormant()
    return {
        **before,"mode":"--apply",
        "reviewed_v2_root_state":"current_exact",
        "prior_v2_backup_state":final_backup,
        "fixed_launcher_state":"new_exact",
        "fixed_launcher_replaced":changed,
        "reviewed_v2_tree_replaced":tree_changed,
        "old_root_state":final_old_root,
        "old_root_verified":final_old_root=="old_exact",
        "old_root_preserved":final_old_root=="old_exact",
        "prior_v2_backup_preserved":final_backup=="prior_v2_exact",
        "reviewed_root_v2_upgrade_complete":True,
        "launcher_quiescence_proven":True,
        "service_action":False,"systemd_mutation":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"LIVE_CUSTODY_DORMANT_QUALIFICATION",
    }

def self_test()->None:
    manifest=load_upgrade_manifest()
    assert manifest["to"]["systemd_reviewed_versions"]==["255.4-1ubuntu8.11","255.4-1ubuntu8.18"]
    assert manifest["prior_v2"]["systemd_reviewed_versions"]==manifest["to"]["systemd_reviewed_versions"]
    assert manifest["prior_current"]["systemd_reviewed_versions"]==manifest["to"]["systemd_reviewed_versions"]
    assert manifest["prior_v2"]["fixed_launcher_blob_sha1"]==PRIOR_V2_LAUNCHER_BLOB
    assert manifest["prior_current"]["fixed_launcher_blob_sha1"]==PRIOR_CURRENT_LAUNCHER_BLOB
    assert manifest["prior_current"]["fixed_launcher_source_rel"]==REVIEWED_ROOT_LAUNCHER_REL
    assert manifest["prior_current"]["closure"]==manifest["to"]["closure"]
    assert manifest["to"]["fixed_launcher_source_rel"]==LAUNCHER_REL
    assert manifest["prior_v2_backup_root"]==str(PRIOR_V2_BACKUP_ROOT)
    assert manifest["to"]["closure"]["ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py"]=="2a285b5b1da2597a8b9eae6d08cd42d010bf7f71"
    assert manifest["to"]["closure"]["tools/apollyon-v2-raw-collector-adapter-v1.mjs"]=="1cce303c25317b66e5f264f1b3f8c05712879cfe"
    assert manifest["to"]["closure"][REVIEWED_ROOT_LAUNCHER_REL]==PRIOR_CURRENT_LAUNCHER_BLOB
    assert classify_upgrade_state("old_exact","absent","absent")=="legacy_v1_pending"
    assert classify_upgrade_state("old_exact","current_exact","absent")=="legacy_v1_tree_installed"
    assert classify_upgrade_state("prior_v2_exact","prior_v2_exact","absent")=="prior_v2_pending"
    assert classify_upgrade_state("prior_current_exact","current_exact","absent")=="prior_current_pending"
    assert classify_upgrade_state("prior_current_exact","current_exact","prior_v2_exact")=="prior_current_pending"
    assert classify_upgrade_state("new_exact","prior_v2_exact","absent")=="prior_v2_launcher_switched"
    assert classify_upgrade_state("new_exact","absent","prior_v2_exact")=="prior_v2_root_swap_resume"
    assert classify_upgrade_state("new_exact","current_exact","absent")=="current_exact"
    assert classify_upgrade_state("new_exact","current_exact","prior_v2_exact")=="current_exact_from_prior_v2"
    good_state={
        "LoadState":"loaded",
        "ActiveState":"inactive",
        "SubState":"dead",
        "MainPID":"0",
    }
    require_exact_dormant_state(good_state,"fixture")
    assert parse_service_state(
        "LoadState=loaded\nActiveState=inactive\nSubState=dead\nMainPID=0\n"
    )==good_state
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-upgrade-process-census-"
    ) as td:
        proc=Path(td)
        for pid,args in (
            ("101",[os.fsencode(FIXED_PREENTRY)]),
            ("102",[b"/usr/bin/python3",b"-I",b"-B",os.fsencode(FIXED_LAUNCHER)]),
            ("103",[b"/opt/void-apollyon-node-runtime-v1/node",
                    b"/run/private/tools/apollyon-live-custody-source-session-runner-v2.mjs"]),
            ("104",[b"/usr/bin/sleep",b"1"]),
        ):
            row=proc/pid
            row.mkdir()
            (row/"cmdline").write_bytes(b"\0".join(args)+b"\0")
        fixture_uid=os.geteuid()
        observed=census_inflight_live_session_processes(
            proc,required_uid=fixture_uid
        )
        assert [row["role"] for row in observed]==[
            "native_preentry","fixed_launcher","private_runner"
        ]
        try:
            assert_no_inflight_live_session_processes(
                proc,settle_seconds=0.0,required_uid=fixture_uid
            )
        except Hold as exc:
            assert str(exc)=="inflight_live_session_process_present",str(exc)
        else:
            raise AssertionError("in-flight live-session fixture accepted")
        for pid in ("101","102","103"):
            shutil.rmtree(proc/pid)
        empty=assert_no_inflight_live_session_processes(
            proc,settle_seconds=0.0,required_uid=fixture_uid
        )
        assert empty["root_owned_live_session_processes_absent"] is True
        assert empty["two_pass_process_census"] is True

    for bad_state in (
        {**good_state,"ActiveState":"active","SubState":"running","MainPID":"42"},
        {**good_state,"ActiveState":"activating","SubState":"start"},
        {**good_state,"ActiveState":"reloading","SubState":"reload"},
        {**good_state,"ActiveState":"deactivating","SubState":"stop"},
        {**good_state,"ActiveState":"failed","SubState":"failed"},
        {**good_state,"LoadState":"not-found"},
        {**good_state,"MainPID":"42"},
    ):
        try:
            require_exact_dormant_state(bad_state,"fixture")
        except Hold:
            pass
        else:
            raise AssertionError("non-dormant service state accepted")
    for bad in (
        ("old_exact","prior_v2_exact","absent"),
        ("prior_v2_exact","current_exact","absent"),
        ("new_exact","prior_v2_exact","prior_v2_exact"),
    ):
        try:
            classify_upgrade_state(*bad)
        except Hold:
            pass
        else:
            raise AssertionError("unsupported migration state accepted")
    source=Path(__file__).read_text(encoding="utf-8")
    prior_apply_index=source.index('elif migration in (\n        "prior_v2_pending",')
    stage_index=source.index(
        'prepare_current_stage(manifest["to"]["closure"])',
        prior_apply_index,
    )
    replace_index=source.index(
        "replace_launcher(\n"
        "                read_source(LAUNCHER_REL,NEW_LAUNCHER_BLOB),\n"
        '                ("prior_v2_exact",),',
        stage_index,
    )
    post_replace_dormant_index=source.index("assert_services_dormant()",replace_index)
    migrate_index=source.index("tree_changed=migrate_prior_v2_tree(manifest)",post_replace_dormant_index)
    post_replace_quiescence_index=source.index(
        "assert_no_inflight_live_session_processes()",
        replace_index,
    )
    assert (
        stage_index < replace_index < post_replace_quiescence_index <
        post_replace_dormant_index < migrate_index
    )
    apply_source_index=source.index("def apply()->dict:")
    prior_current_index=source.index(
        'elif migration=="prior_current_pending":',
        apply_source_index,
    )
    prior_current_replace=source.index(
        '("prior_current_exact",),',
        prior_current_index,
    )
    prior_current_dormant=source.index(
        "assert_services_dormant()",
        prior_current_replace,
    )
    prior_current_verify=source.index(
        'verify_tree(NEW_ROOT,manifest["to"]["closure"])',
        prior_current_dormant,
    )
    next_branch=source.index(
        'elif migration in ("current_exact","current_exact_from_prior_v2"):',
        prior_current_verify,
    )
    prior_current_body=source[prior_current_index:next_branch]
    prior_current_quiescence=source.index(
        "assert_no_inflight_live_session_processes()",
        prior_current_replace,
    )
    assert (
        prior_current_index < prior_current_replace <
        prior_current_quiescence < prior_current_dormant <
        prior_current_verify
    )
    assert "prepare_current_stage(" not in prior_current_body
    assert "migrate_prior_v2_tree(" not in prior_current_body
    for forbidden_parts in (
        ("systemctl",'",',"start"),("systemctl",'",',"stop"),("systemctl",'",',"restart"),
        ("training_execution",":True"),("durable_attempt_claim",":True"),
        ("operator_private_key_access",":True"),("funds_movement",":True"),
    ):
        forbidden="".join(forbidden_parts)
        assert forbidden not in source,forbidden
    print(MARKER+"_SELF_TEST_GREEN")
    print("legacy_v1_old_root_required_only_for_legacy_source=true")
    print("direct_prior_v2_old_root_absence_allowed=true")
    print("old_root_collision_rejected=true")
    print("dangling_new_root_symlink_rejected=true")
    print("dangling_prior_v2_backup_symlink_rejected=true")
    print("prior_v2_migration_source_bound=true")
    print("prior_current_launcher_retirement_source_bound=true")
    print("prior_current_launcher_only_migration=true")
    print("retired_fixed_launcher_blob_bound=true")
    print("post_swap_inflight_process_quiescence_required=true")
    print("root_owned_process_census_two_pass=true")
    print("prior_v2_launcher_b96_bound=true")
    print("prior_v2_backup_preserved=true")
    print("prior_v2_interrupted_states_resumable=true")
    print("current_stage_prepared_before_prior_launcher_swap=true")
    print("current_launcher_installed_before_prior_root_swap=true")
    print("post_launcher_dormancy_revalidated_before_prior_root_swap=true")
    print("exact_inactive_service_states_required=true")
    print("transitional_service_states_rejected=true")
    print("new_root=/opt/void-apollyon-live-custody-binding-v2-reviewed-v2")
    print("prior_v2_backup_root=/opt/void-apollyon-live-custody-binding-v2-reviewed-v2-prior-v1")
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

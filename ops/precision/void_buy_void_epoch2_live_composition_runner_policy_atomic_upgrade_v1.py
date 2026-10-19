#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile
from typing import Any

MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_ATOMIC_UPGRADE_V1"
CONFIRM_TOKEN="ATOMIC_EXCHANGE_EPOCH2_V6R3_RUNNER_POLICY_UPGRADE_V1"

FIXED_CHECKOUT=Path("/home/zoso/dev/void-node")
FIXED_PYTHON=Path("/usr/bin/python3")
FIXED_GIT=Path("/usr/bin/git")
FIXED_SETPRIV=Path("/usr/bin/setpriv")
RUNTIME_UID=1000
RUNTIME_GID=1000

PLAN_REL="ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"
PLAN_PATH=FIXED_CHECKOUT/PLAN_REL
PLAN_BLOB="96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f"

LOCK_ID="voidbuye2runnerpollock6r3_bdd3e0b6fe28f2a6873920cdb1436914183e817c02b4d4ac9da130e3ec14b365"
CANDIDATE_ID="voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d"
RUNNER_REL="ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs"
RUNNER_BLOB="7967778824f22baca976a59df75f9f808ebebfe2"
NEW_RUNNER_SHA256="a548ff17e37fc37d041a42faeaaf79645f843616e654700dafbf20ea652a0029"
NEW_RUNNER_BYTES=64_960

RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
POLICY_SCHEMA="VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3"

INSTALL_PARENT=Path("/opt")
INSTALL_NAME="void-buy-void-epoch2-live-composition-v3"
STAGE_NAME=".void-buy-void-epoch2-live-composition-v3.upgrade-v6r3.stage"
PREDECESSOR_V4_NAME=".void-buy-void-epoch2-live-composition-v3.predecessor-v4"
PREDECESSOR_V6R2_NAME=".void-buy-void-epoch2-live-composition-v3.predecessor-v6r2"
INSTALL_ROOT=INSTALL_PARENT/INSTALL_NAME
STAGE_ROOT=INSTALL_PARENT/STAGE_NAME
PREDECESSOR_V4_ROOT=INSTALL_PARENT/PREDECESSOR_V4_NAME
PREDECESSOR_V6R2_ROOT=INSTALL_PARENT/PREDECESSOR_V6R2_NAME

NATIVE_NAME="void_buy_void_epoch2_live_composition_native_preentry_v3"
RUNNER_NAME="void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
POLICY_NAME="policy-v3.conf"

NATIVE_SHA256="85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
NATIVE_BYTES=726_976
OLD_RUNNER_SHA256="7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94"
OLD_RUNNER_BYTES=45_147
V4_NATIVE_SHA256="09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4"
V4_NATIVE_BYTES=722_880
V4_RUNNER_SHA256="f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889"
V4_RUNNER_BYTES=40_616
V4_POLICY_SHA256="d410bd2ec83daca5f7ba6e45e03afda0606b2bf6ea62cbabb9a700caa141adcc"
V4_POLICY_BYTES=305

READY_STATE="EPOCH2_V6R3_RUNNER_POLICY_UPGRADE_READY"
GREEN_STATE="EPOCH2_V6R3_RUNNER_POLICY_ROOT_GREEN_WITH_V6R2_PREDECESSOR"

RENAME_NOREPLACE=1
RENAME_EXCHANGE=2
MAX_OUTPUT=4*1024*1024
MAX_FILE=512*1024*1024
HEX64=re.compile(r"^[0-9a-f]{64}$")

FORBIDDEN_ENV=(
    "LD_PRELOAD","LD_LIBRARY_PATH","LD_AUDIT","LD_DEBUG","GLIBC_TUNABLES",
    "PYTHONPATH","PYTHONHOME",
)


class UpgradeError(RuntimeError):
    pass


def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw:bytes)->str:
    return hashlib.sha1(
        b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw
    ).hexdigest()


def same_stat(a:os.stat_result,b:os.stat_result)->bool:
    return all(getattr(a,k)==getattr(b,k) for k in (
        "st_dev","st_ino","st_uid","st_gid","st_mode","st_nlink",
        "st_size","st_mtime_ns","st_ctime_ns",
    ))


def trusted_dir(path:Path,mode:int|None=None)->os.stat_result:
    try:
        st=path.lstat()
    except OSError as exc:
        raise UpgradeError("trusted_directory_unavailable:"+str(path)) from exc
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode)
        or st.st_uid!=0 or st.st_gid!=0 or (st.st_mode&0o022)!=0
        or (mode is not None and stat.S_IMODE(st.st_mode)!=mode)
    ):
        raise UpgradeError("trusted_directory_invalid:"+str(path))
    return st


def hash_exact_file(
    path:Path,*,expected_bytes:int,expected_sha256:str,expected_mode:int,
    expected_uid:int=0,expected_gid:int=0,
)->bytes:
    try:
        before=path.lstat()
    except OSError as exc:
        raise UpgradeError("file_unavailable:"+str(path)) from exc
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode)
        or before.st_uid!=expected_uid or before.st_gid!=expected_gid
        or stat.S_IMODE(before.st_mode)!=expected_mode or before.st_nlink!=1
        or before.st_size!=expected_bytes or before.st_size>MAX_FILE
    ):
        raise UpgradeError("file_metadata_invalid:"+str(path))
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    try:
        opened=os.fstat(fd)
        if not same_stat(before,opened):
            raise UpgradeError("file_rebound:"+str(path))
        digest=hashlib.sha256()
        chunks:list[bytes]=[]
        remaining=expected_bytes
        while remaining:
            chunk=os.read(fd,min(1024*1024,remaining))
            if not chunk:
                raise UpgradeError("file_short_read:"+str(path))
            digest.update(chunk); chunks.append(chunk); remaining-=len(chunk)
        if os.read(fd,1):
            raise UpgradeError("file_grew:"+str(path))
        after=os.fstat(fd); visible=path.lstat()
        if not same_stat(opened,after) or not same_stat(after,visible):
            raise UpgradeError("file_changed:"+str(path))
    finally:
        os.close(fd)
    if digest.hexdigest()!=expected_sha256:
        raise UpgradeError("file_sha256_mismatch:"+str(path))
    return b"".join(chunks)


def verify_root(
    root:Path,*,runner_sha256:str,runner_bytes:int,policy:bytes,
    native_sha256:str=NATIVE_SHA256,native_bytes:int=NATIVE_BYTES,
)->None:
    trusted_dir(root,0o755)
    if sorted(os.listdir(root))!=sorted((NATIVE_NAME,RUNNER_NAME,POLICY_NAME)):
        raise UpgradeError("root_entries_invalid:"+str(root))
    hash_exact_file(
        root/NATIVE_NAME,expected_bytes=native_bytes,
        expected_sha256=native_sha256,expected_mode=0o555,
    )
    hash_exact_file(
        root/RUNNER_NAME,expected_bytes=runner_bytes,
        expected_sha256=runner_sha256,expected_mode=0o444,
    )
    hash_exact_file(
        root/POLICY_NAME,expected_bytes=len(policy),
        expected_sha256=sha256(policy),expected_mode=0o444,
    )


def verify_v4_root()->None:
    trusted_dir(PREDECESSOR_V4_ROOT,0o755)
    if sorted(os.listdir(PREDECESSOR_V4_ROOT))!=sorted(
        (NATIVE_NAME,RUNNER_NAME,POLICY_NAME)
    ):
        raise UpgradeError("v4_predecessor_entries_invalid")
    hash_exact_file(
        PREDECESSOR_V4_ROOT/NATIVE_NAME,expected_bytes=V4_NATIVE_BYTES,
        expected_sha256=V4_NATIVE_SHA256,expected_mode=0o555,
    )
    hash_exact_file(
        PREDECESSOR_V4_ROOT/RUNNER_NAME,expected_bytes=V4_RUNNER_BYTES,
        expected_sha256=V4_RUNNER_SHA256,expected_mode=0o444,
    )
    hash_exact_file(
        PREDECESSOR_V4_ROOT/POLICY_NAME,expected_bytes=V4_POLICY_BYTES,
        expected_sha256=V4_POLICY_SHA256,expected_mode=0o444,
    )


def build_policy(body:dict[str,Any],runner_sha:str,runner_bytes:int)->bytes:
    node=body.get("node")
    if not isinstance(node,dict):
        raise UpgradeError("plan_node_missing")
    node_sha=node.get("sha256"); node_bytes=node.get("bytes")
    if not isinstance(node_sha,str) or HEX64.fullmatch(node_sha) is None:
        raise UpgradeError("plan_node_sha_invalid")
    if type(node_bytes) is not int or node_bytes<1:
        raise UpgradeError("plan_node_bytes_invalid")
    return (
        "schema="+POLICY_SCHEMA+"\n"
        "expected_head="+RUNTIME_HEAD+"\n"
        "runner_sha256="+runner_sha+"\n"
        "runner_bytes="+str(runner_bytes)+"\n"
        "node_sha256="+node_sha+"\n"
        "node_bytes="+str(node_bytes)+"\n"
    ).encode("ascii")


def clean_nonroot_env()->dict[str,str]:
    return {
        "PATH":"/usr/bin:/bin","HOME":"/home/zoso","LANG":"C","LC_ALL":"C","TZ":"UTC",
        "GIT_CONFIG_NOSYSTEM":"1","GIT_CONFIG_GLOBAL":"/dev/null",
        "GIT_CONFIG_SYSTEM":"/dev/null","GIT_NO_REPLACE_OBJECTS":"1",
        "GIT_OPTIONAL_LOCKS":"0","GIT_NO_LAZY_FETCH":"1",
        "GIT_TERMINAL_PROMPT":"0","GIT_ASKPASS":"/bin/false",
        "GIT_PROTOCOL_FROM_USER":"0","GIT_ALLOW_PROTOCOL":"","GIT_PAGER":"",
    }


def require_secure_context()->None:
    if os.geteuid()!=0:
        raise UpgradeError("root_required_for_atomic_upgrade")
    present=[k for k in FORBIDDEN_ENV if os.environ.get(k)]
    if present:
        raise UpgradeError("forbidden_apply_environment:"+",".join(present))
    trusted_dir(Path("/"))
    trusted_dir(Path("/usr"))
    trusted_dir(Path("/usr/bin"))
    trusted_dir(INSTALL_PARENT,0o755)
    for p in (FIXED_GIT,FIXED_SETPRIV):
        hash_exact_file_dynamic_executable(p)
    trusted_fixed_executable_allow_symlink(FIXED_PYTHON)


def trusted_fixed_executable_allow_symlink(path:Path)->dict[str,Any]:
    try:
        visible=path.lstat()
    except OSError as exc:
        raise UpgradeError("tool_identity_unavailable:"+str(path)) from exc
    if stat.S_ISLNK(visible.st_mode):
        if visible.st_uid!=0 or visible.st_gid!=0 or (visible.st_mode&0o022)!=0:
            raise UpgradeError("tool_symlink_invalid:"+str(path))
        try:
            resolved=path.resolve(strict=True)
        except OSError as exc:
            raise UpgradeError("tool_symlink_target_unavailable:"+str(path)) from exc
        if resolved.parent!=Path("/usr/bin"):
            raise UpgradeError("tool_symlink_target_outside_usr_bin:"+str(path))
        return hash_exact_file_dynamic_executable(resolved)
    return hash_exact_file_dynamic_executable(path)


def hash_exact_file_dynamic_executable(path:Path)->dict[str,Any]:
    before=path.lstat()
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode)
        or before.st_uid!=0 or before.st_gid!=0 or before.st_nlink!=1
        or (before.st_mode&0o022)!=0 or (before.st_mode&0o111)==0
        or before.st_size<1 or before.st_size>MAX_FILE
    ):
        raise UpgradeError("tool_identity_invalid:"+str(path))
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    try:
        opened=os.fstat(fd)
        if not same_stat(before,opened):
            raise UpgradeError("tool_rebound:"+str(path))
        h=hashlib.sha256()
        while True:
            c=os.read(fd,1024*1024)
            if not c: break
            h.update(c)
        after=os.fstat(fd); visible=path.lstat()
        if not same_stat(opened,after) or not same_stat(after,visible):
            raise UpgradeError("tool_changed:"+str(path))
    finally:
        os.close(fd)
    return {"sha256":h.hexdigest(),"bytes":before.st_size}


def run_nonroot(args:list[str],*,binary:bool=False)->bytes|str:
    command=[
        str(FIXED_SETPRIV),"--no-new-privs",
        "--reuid="+str(RUNTIME_UID),"--regid="+str(RUNTIME_GID),"--clear-groups",
        *args,
    ]
    try:
        cp=subprocess.run(
            command,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,cwd="/",env=clean_nonroot_env(),
            timeout=60,check=False,
        )
    except (OSError,subprocess.SubprocessError) as exc:
        raise UpgradeError("nonroot_execution_failed") from exc
    if cp.returncode!=0:
        raise UpgradeError("nonroot_execution_nonzero:"+str(cp.returncode))
    if cp.stderr:
        raise UpgradeError("nonroot_execution_stderr")
    if len(cp.stdout)>MAX_OUTPUT:
        raise UpgradeError("nonroot_output_limit")
    if binary: return cp.stdout
    try: return cp.stdout.decode("utf-8","strict")
    except UnicodeError as exc:
        raise UpgradeError("nonroot_output_invalid") from exc


def read_bound_plan_source()->bytes:
    raw=run_nonroot(
        [str(FIXED_GIT),"-C",str(FIXED_CHECKOUT),
         "-c","core.fsmonitor=false","-c","core.hooksPath=/dev/null",
         "show","HEAD:"+PLAN_REL],binary=True
    )
    assert isinstance(raw,bytes)
    if git_blob(raw)!=PLAN_BLOB:
        raise UpgradeError("plan_source_blob_mismatch")
    return raw


def current_plan()->tuple[str,dict[str,Any]]:
    read_bound_plan_source()
    stdout=run_nonroot([
        str(FIXED_PYTHON),"-I","-B",str(PLAN_PATH),"--plan",
    ])
    assert isinstance(stdout,str)
    rows=[line for line in stdout.splitlines() if line]
    values={}
    for line in rows:
        if "=" in line:
            k,v=line.split("=",1); values[k]=v
    plan_id=values.get("plan_id","")
    body_raw=values.get("plan_body_json","")
    if not plan_id.startswith("voidbuye2runnerpolupgradeplan6r3_"):
        raise UpgradeError("plan_id_invalid")
    try:
        body=json.loads(body_raw)
    except json.JSONDecodeError as exc:
        raise UpgradeError("plan_body_invalid") from exc
    if (
        body.get("accepted_lock_id")!=LOCK_ID
        or body.get("accepted_candidate_id")!=CANDIDATE_ID
        or body.get("runtime_head")!=RUNTIME_HEAD
        or body.get("new_runner_git_blob_sha1")!=RUNNER_BLOB
        or body.get("new_runner_sha256")!=NEW_RUNNER_SHA256
        or body.get("new_runner_bytes")!=NEW_RUNNER_BYTES
        or body.get("filesystem_write") is not False
        or body.get("credential_access") is not False
        or body.get("signing") is not False
        or body.get("transaction") is not False
        or body.get("funds_movement") is not False
    ):
        raise UpgradeError("plan_body_contract_invalid")
    return plan_id,body


def read_runner_source()->bytes:
    raw=run_nonroot(
        [str(FIXED_GIT),"-C",str(FIXED_CHECKOUT),
         "-c","core.fsmonitor=false","-c","core.hooksPath=/dev/null",
         "show","HEAD:"+RUNNER_REL],binary=True
    )
    assert isinstance(raw,bytes)
    if (
        len(raw)!=NEW_RUNNER_BYTES or sha256(raw)!=NEW_RUNNER_SHA256
        or git_blob(raw)!=RUNNER_BLOB
    ):
        raise UpgradeError("runner_source_identity_mismatch")
    return raw


def renameat2(dir_fd:int,source:str,target:str,flags:int)->None:
    libc=ctypes.CDLL(None,use_errno=True)
    fn=getattr(libc,"renameat2",None)
    if fn is None:
        raise UpgradeError("renameat2_unavailable")
    fn.argtypes=[ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint]
    fn.restype=ctypes.c_int
    rc=fn(dir_fd,source.encode(),dir_fd,target.encode(),flags)
    if rc!=0:
        err=ctypes.get_errno()
        raise UpgradeError("renameat2_failed:"+source+":"+target+":"+str(err))


def create_file(dir_fd:int,name:str,raw:bytes,mode:int)->None:
    fd=os.open(
        name,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,
        mode,dir_fd=dir_fd,
    )
    try:
        os.fchown(fd,0,0); os.fchmod(fd,mode)
        view=memoryview(raw)
        while view:
            n=os.write(fd,view)
            if n<=0: raise UpgradeError("stage_write_failed:"+name)
            view=view[n:]
        os.fsync(fd)
    finally:
        os.close(fd)


def cleanup_stage(opt_fd:int)->bool:
    try:
        stage_fd=os.open(
            STAGE_NAME,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
        try:
            for name in (NATIVE_NAME,RUNNER_NAME,POLICY_NAME):
                try: os.unlink(name,dir_fd=stage_fd)
                except FileNotFoundError: pass
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)
        os.rmdir(STAGE_NAME,dir_fd=opt_fd); os.fsync(opt_fd)
        return True
    except BaseException:
        return False


def authority()->None:
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("filesystem_mutation_possible=true")
    print("filesystem_mutation_performed_at_pre_mutation_boundary=false")
    print("atomic_root_exchange_authorized=true")
    print("predecessor_v6r2_retention_required=true")
    print("automatic_rollback_required=true")
    print("native_mutation_authorized=false")
    print("runner_execution=false")
    print("native_execution=false")
    print("live_composition_execution=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")


def source_plan()->None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("plan_source_blob="+PLAN_BLOB)
    print("accepted_lock_id="+LOCK_ID)
    print("accepted_candidate_id="+CANDIDATE_ID)
    print("runner_git_blob_sha1="+RUNNER_BLOB)
    print("runner_sha256="+NEW_RUNNER_SHA256)
    print("runner_bytes="+str(NEW_RUNNER_BYTES))
    print("confirm_token="+CONFIRM_TOKEN)
    print("host_write=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")


def apply(expected_plan_id:str,confirm:str)->None:
    authority()
    if confirm!=CONFIRM_TOKEN:
        raise UpgradeError("explicit_atomic_upgrade_confirmation_required")
    require_secure_context()

    plan_id,body=current_plan()
    if plan_id!=expected_plan_id:
        raise UpgradeError("expected_plan_id_mismatch")
    state=body.get("protected_state")
    if state==GREEN_STATE:
        print(MARKER)
        print("status=GREEN")
        print("already_upgraded=true")
        print("atomic_upgrade_performed=false")
        print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R3_INSTALLED_READ_ONLY_QUALIFICATION")
        return
    if state!=READY_STATE:
        raise UpgradeError("plan_state_not_upgrade_ready")

    old_policy=build_policy(body,OLD_RUNNER_SHA256,OLD_RUNNER_BYTES)
    new_policy=build_policy(body,NEW_RUNNER_SHA256,NEW_RUNNER_BYTES)
    if sha256(old_policy)!=body.get("old_policy_sha256"):
        raise UpgradeError("old_policy_plan_mismatch")
    if sha256(new_policy)!=body.get("new_policy_sha256"):
        raise UpgradeError("new_policy_plan_mismatch")

    verify_root(
        INSTALL_ROOT,runner_sha256=OLD_RUNNER_SHA256,
        runner_bytes=OLD_RUNNER_BYTES,policy=old_policy,
    )
    verify_v4_root()
    if STAGE_ROOT.exists() or PREDECESSOR_V6R2_ROOT.exists():
        raise UpgradeError("upgrade_namespace_not_clean")

    native_raw=hash_exact_file(
        INSTALL_ROOT/NATIVE_NAME,expected_bytes=NATIVE_BYTES,
        expected_sha256=NATIVE_SHA256,expected_mode=0o555,
    )
    runner_raw=read_runner_source()

    # Recompute the complete nonroot plan after all candidate bytes are retained.
    plan_id2,body2=current_plan()
    if plan_id2!=expected_plan_id or body2!=body:
        raise UpgradeError("plan_changed_before_mutation")

    opt_fd=os.open(INSTALL_PARENT,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW)
    stage_created=False
    published=False
    predecessor_retained=False
    rollback_attempted=False
    rollback_green=False
    try:
        os.mkdir(STAGE_NAME,0o755,dir_fd=opt_fd); stage_created=True
        stage_fd=os.open(
            STAGE_NAME,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
        try:
            os.fchown(stage_fd,0,0); os.fchmod(stage_fd,0o755)
            create_file(stage_fd,NATIVE_NAME,native_raw,0o555)
            create_file(stage_fd,RUNNER_NAME,runner_raw,0o444)
            create_file(stage_fd,POLICY_NAME,new_policy,0o444)
            os.fsync(stage_fd)
        finally:
            os.close(stage_fd)
        os.fsync(opt_fd)

        verify_root(
            STAGE_ROOT,runner_sha256=NEW_RUNNER_SHA256,
            runner_bytes=NEW_RUNNER_BYTES,policy=new_policy,
        )
        verify_root(
            INSTALL_ROOT,runner_sha256=OLD_RUNNER_SHA256,
            runner_bytes=OLD_RUNNER_BYTES,policy=old_policy,
        )
        verify_v4_root()

        # Last no-write source/node/root revalidation before publication.
        plan_id3,body3=current_plan()
        if plan_id3!=expected_plan_id or body3!=body:
            raise UpgradeError("plan_changed_at_publication_boundary")

        renameat2(opt_fd,STAGE_NAME,INSTALL_NAME,RENAME_EXCHANGE)
        published=True
        os.fsync(opt_fd)

        verify_root(
            INSTALL_ROOT,runner_sha256=NEW_RUNNER_SHA256,
            runner_bytes=NEW_RUNNER_BYTES,policy=new_policy,
        )
        verify_root(
            STAGE_ROOT,runner_sha256=OLD_RUNNER_SHA256,
            runner_bytes=OLD_RUNNER_BYTES,policy=old_policy,
        )
        verify_v4_root()

        renameat2(opt_fd,STAGE_NAME,PREDECESSOR_V6R2_NAME,RENAME_NOREPLACE)
        stage_created=False; predecessor_retained=True
        os.fsync(opt_fd)

        verify_root(
            PREDECESSOR_V6R2_ROOT,runner_sha256=OLD_RUNNER_SHA256,
            runner_bytes=OLD_RUNNER_BYTES,policy=old_policy,
        )
        verify_root(
            INSTALL_ROOT,runner_sha256=NEW_RUNNER_SHA256,
            runner_bytes=NEW_RUNNER_BYTES,policy=new_policy,
        )
        verify_v4_root()
    except BaseException:
        if published:
            rollback_attempted=True
            try:
                if predecessor_retained:
                    renameat2(
                        opt_fd,PREDECESSOR_V6R2_NAME,INSTALL_NAME,RENAME_EXCHANGE
                    )
                    renameat2(
                        opt_fd,PREDECESSOR_V6R2_NAME,STAGE_NAME,RENAME_NOREPLACE
                    )
                    predecessor_retained=False; stage_created=True
                else:
                    renameat2(opt_fd,STAGE_NAME,INSTALL_NAME,RENAME_EXCHANGE)
                os.fsync(opt_fd)
                verify_root(
                    INSTALL_ROOT,runner_sha256=OLD_RUNNER_SHA256,
                    runner_bytes=OLD_RUNNER_BYTES,policy=old_policy,
                )
                verify_v4_root()
                rollback_green=cleanup_stage(opt_fd) if stage_created else True
                stage_created=False
            except BaseException:
                rollback_green=False
        elif stage_created:
            rollback_attempted=True
            rollback_green=cleanup_stage(opt_fd); stage_created=False
        print("publication="+str(published).lower())
        if published:
            print(
                "publication_state="+(
                    "published_rolled_back_green"
                    if rollback_green else "published_needs_inspection"
                )
            )
            print("final_state_verified="+str(rollback_green).lower())
        else:
            print("publication_state=not_published")
            print("final_state_verified=false")
        print("automatic_rollback_attempted="+str(rollback_attempted).lower())
        print("automatic_rollback_green="+str(rollback_green).lower())
        raise
    finally:
        os.close(opt_fd)

    print(MARKER)
    print("status=GREEN")
    print("publication_state=atomic_root_exchange_verified")
    print("final_state_verified=true")
    print("atomic_upgrade_performed=true")
    print("native_reused=true")
    print("runner_policy_upgraded=true")
    print("predecessor_v6r2_retained=true")
    print("runner_execution=false")
    print("native_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("funds_movement=false")
    print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R3_INSTALLED_READ_ONLY_QUALIFICATION")


def self_test()->None:
    assert LOCK_ID.startswith("voidbuye2runnerpollock6r3_")
    assert CANDIDATE_ID.startswith("voidbuye2runnerpolcand6r3_")
    assert PLAN_BLOB=="96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f"
    assert NEW_RUNNER_BYTES==64_960
    assert HEX64.fullmatch(NEW_RUNNER_SHA256)
    with tempfile.TemporaryDirectory(prefix="void-v6r3-rename-self-test-") as td:
        root=Path(td)
        left=root/"left"; right=root/"right"
        left.write_text("left"); right.write_text("right")
        fd=os.open(root,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
        try:
            renameat2(fd,"left","right",RENAME_EXCHANGE)
        finally:
            os.close(fd)
        assert left.read_text()=="right" and right.read_text()=="left"
    print(MARKER+"_SELF_TEST_GREEN")
    print("plan_source_blob_bound=true")
    print("accepted_lock_bound=true")
    print("accepted_candidate_bound=true")
    print("runner_v4_identity_bound=true")
    print("full_root_stage_required=true")
    print("atomic_root_exchange_required=true")
    print("predecessor_v6r2_retention_required=true")
    print("automatic_rollback_required=true")
    print("operation_bound_plan_id_required=true")
    print("explicit_confirmation_required=true")
    print("runner_execution=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")


def main()->int:
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test",action="store_true")
    mode.add_argument("--source-plan",action="store_true")
    mode.add_argument("--apply",action="store_true")
    parser.add_argument("--expected-plan-id",default="")
    parser.add_argument("--confirm",default="")
    args=parser.parse_args()
    if args.self_test:
        self_test(); return 0
    if args.source_plan:
        source_plan(); return 0
    if not args.expected_plan_id:
        raise UpgradeError("expected_plan_id_required")
    apply(args.expected_plan_id,args.confirm)
    return 0


if __name__=="__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(MARKER)
        print("status=HOLD")
        reason=(
            str(exc) if isinstance(exc,UpgradeError)
            else type(exc).__name__+":"+str(exc)
        )
        print("reason="+re.sub(r"[^A-Za-z0-9_:./,-]","_",reason[:1000]))
        print("runner_execution=false")
        print("native_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)

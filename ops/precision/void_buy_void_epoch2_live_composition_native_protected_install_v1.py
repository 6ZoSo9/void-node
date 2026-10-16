#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import os
import pathlib
import re
import stat
import subprocess
import sys
from typing import Any

ROOT=pathlib.Path(__file__).resolve().parents[2]
LOCK_REL="ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v3.json"
LOCK_PATH=ROOT/LOCK_REL
LOCK_GIT_BLOB_SHA1="57f965a944031eac90d69b4104b0f8f2473e66cc"
LOCK_ID="voidbuye2nativecandlock3_024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659"
LOCK_MERGE_COMMIT="fab1f7feccc2d32313e6c2cc5c729c9ebe2dd492"

RUNNER_REL="ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs"
RUNNER_PATH=ROOT/RUNNER_REL
RUNNER_GIT_BLOB_SHA1="92e8c8696ea7e2bb81b6ef089db8baa657188935"
RUNNER_BYTES=30103
RUNNER_SHA256="2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73"

EXPECTED_HEAD_BLOBS={
    LOCK_REL:LOCK_GIT_BLOB_SHA1,
    RUNNER_REL:RUNNER_GIT_BLOB_SHA1,
    "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c":
        "4aa091e7835b32aa5c4e7b8e4059651c69a64eb3",
    "scripts/prove_buy_void_epoch2_live_composition_native_preentry_v1.mjs":
        "73062194b5b5ed304ff820d7fa33e66c5c8da436",
    ".github/workflows/buy-void-epoch2-live-composition-native-preentry-v1.yml":
        "85c28fdf03345240332cbf41d46fbda065958ec7",
    "scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs":
        "14cbe81e27d04fee77cbe75225ce308bf8561a7b",
    "scripts/prove_buy_void_epoch2_live_composition_native_candidate_v3.py":
        "3b779a27cfd071c2569c438e3319b756b46c85c9",
}

NATIVE_BYTES=726976
NATIVE_SHA256="78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589"
NODE_PATH=pathlib.Path("/usr/bin/node")
MAX_NODE_BYTES=512*1024*1024
MAX_READ_CHUNK=1024*1024

MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1"
INSTALL_PARENT=pathlib.Path("/opt")
INSTALL_NAME="void-buy-void-epoch2-live-composition-v2"
STAGE_NAME=".void-buy-void-epoch2-live-composition-v2.stage"
INSTALL_ROOT=INSTALL_PARENT/INSTALL_NAME
STAGE_ROOT=INSTALL_PARENT/STAGE_NAME
NATIVE_NAME="void_buy_void_epoch2_live_composition_native_preentry_v1"
RUNNER_NAME="void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs"
POLICY_NAME="policy-v1.conf"
POLICY_SCHEMA="VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1"

CONFIRM_TOKEN="INSTALL_ACCEPTED_EPOCH2_NATIVE_V3_CREATE_ONLY_V1"
RENAME_NOREPLACE=1
READY_STATE="EPOCH2_NATIVE_PROTECTED_ROOT_ABSENT_READY"
GREEN_STATE="EPOCH2_NATIVE_PROTECTED_ROOT_GREEN"
HEX40=re.compile(r"^[0-9a-f]{40}$")

FORBIDDEN_APPLY_ENV=(
    "LD_PRELOAD","LD_LIBRARY_PATH","LD_AUDIT","LD_DEBUG","GLIBC_TUNABLES",
    "NODE_OPTIONS","NODE_PATH","PYTHONPATH","PYTHONHOME",
)

GIT_ENV={
    "PATH":"/usr/bin:/bin",
    "HOME":"/nonexistent",
    "LANG":"C",
    "LC_ALL":"C",
    "TZ":"UTC",
    "GIT_CONFIG_NOSYSTEM":"1",
    "GIT_CONFIG_GLOBAL":"/dev/null",
    "GIT_CONFIG_SYSTEM":"/dev/null",
    "GIT_NO_REPLACE_OBJECTS":"1",
    "GIT_OPTIONAL_LOCKS":"0",
    "GIT_TERMINAL_PROMPT":"0",
}


class InstallError(RuntimeError):
    pass


class PublishedInstallError(InstallError):
    def __init__(
        self,
        reason:str,
        *,
        phase:str,
        parent_fsync_completed:bool|None,
        final_verification_completed:bool|None,
        original_failure_class:str,
        original_failure_reason:str,
    )->None:
        super().__init__(reason)
        self.phase=phase
        self.parent_fsync_completed=parent_fsync_completed
        self.final_verification_completed=final_verification_completed
        self.original_failure_class=original_failure_class
        self.original_failure_reason=original_failure_reason
        self.install_parent_close_completed:bool|None=None
        self.close_failure_class="none"
        self.close_failure_reason="none"


def git_blob_sha1(raw:bytes)->str:
    h=hashlib.sha1()
    h.update(b"blob "+str(len(raw)).encode("ascii")+b"\0")
    h.update(raw)
    return h.hexdigest()


def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()


def _same_identity(a:os.stat_result,b:os.stat_result)->bool:
    return all(
        getattr(a,name)==getattr(b,name)
        for name in (
            "st_dev","st_ino","st_mode","st_uid","st_gid","st_nlink",
            "st_size","st_mtime_ns","st_ctime_ns",
        )
    )


def _direct_repo_bytes(path:pathlib.Path,maximum:int=8*1024*1024)->bytes:
    before=path.lstat()
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_nlink!=1 or before.st_size<1 or before.st_size>maximum
    ):
        raise InstallError("repository_file_metadata_invalid:"+str(path))
    raw=path.read_bytes()
    after=path.lstat()
    if not _same_identity(before,after) or len(raw)!=before.st_size:
        raise InstallError("repository_file_changed:"+str(path))
    return raw


def accepted_lock()->dict[str,Any]:
    raw=_direct_repo_bytes(LOCK_PATH,128*1024)
    if git_blob_sha1(raw)!=LOCK_GIT_BLOB_SHA1:
        raise InstallError("accepted_lock_blob_mismatch")
    try:
        value=json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InstallError("accepted_lock_json_invalid") from exc
    if not isinstance(value,dict):
        raise InstallError("accepted_lock_shape_invalid")
    required={
        "schema":"void_buy_void_epoch2_live_composition_native_candidate_lock_v3",
        "marker":"VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V3",
        "version":3,
        "repository":"6ZoSo9/void-node",
        "source_merge_commit":"e7c5e20493e453053bc8c3d2c4fa85fbb994475b",
        "candidate_head":"ba8ecda0fe8051c7a18095b2488104761d783561",
        "candidate_accepted":True,
        "native_binary_identity_accepted":True,
        "runner_identity_accepted":True,
        "protected_install_authorized":False,
        "live_execution_authorized":False,
        "credential_access_authorized":False,
        "private_key_access_authorized":False,
        "signing_authorized":False,
        "transaction_authorized":False,
        "payment_acceptance_authorized":False,
        "public_presale_activation_authorized":False,
        "wc_void_market_activation_authorized":False,
        "funds_movement_authorized":False,
        "production_host_evidence_authority":False,
        "next_gate":"void_buy_void_epoch2_live_composition_native_protected_install_v1",
        "lock_id":LOCK_ID,
    }
    for key,want in required.items():
        if value.get(key)!=want:
            raise InstallError("accepted_lock_field_mismatch:"+key)
    report=value.get("candidate_report")
    if not isinstance(report,dict):
        raise InstallError("accepted_lock_candidate_report_missing")
    report_required={
        "bytes":59709,
        "sha256":"d17e765afaca21cbd980804dda51f5cd3886883fb628b2843bc5d72268b9769e",
        "git_blob_sha1":"35f341d6fb1e1ef2c43bb9a0d73dbe89ec14c649",
        "candidate_id":"voidbuye2nativecand3_0132a4cc390000f28fb2d2ed8071a1593d184f754d5e9700a2ff8f1cb620ab27",
        "native_binary_sha256":NATIVE_SHA256,
        "native_binary_bytes":NATIVE_BYTES,
        "runner_source_git_blob_sha1":RUNNER_GIT_BLOB_SHA1,
        "runner_sha256":RUNNER_SHA256,
        "runner_bytes":RUNNER_BYTES,
        "toolchain_closure_bound":True,
        "static_no_interp":True,
        "hostile_ld_preload_blocked":True,
    }
    for key,want in report_required.items():
        if report.get(key)!=want:
            raise InstallError("accepted_lock_candidate_field_mismatch:"+key)
    return value


def _git(args:list[str],*,allow_fail:bool=False)->subprocess.CompletedProcess[str]:
    cp=subprocess.run(
        [
            "/usr/bin/git",
            "-c","safe.directory="+os.fspath(ROOT),
            "--no-replace-objects",
            "-C",os.fspath(ROOT),
            *args,
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
        env=GIT_ENV,
    )
    if cp.returncode!=0 and not allow_fail:
        raise InstallError("git_command_failed:"+str(args[0] if args else "unknown"))
    return cp


def repository_identity(expected_head:str)->str:
    if HEX40.fullmatch(expected_head) is None:
        raise InstallError("expected_head_invalid")
    head=_git(["rev-parse","HEAD"]).stdout.strip()
    if head!=expected_head:
        raise InstallError("repository_head_mismatch")
    branch=_git(["symbolic-ref","--quiet","--short","HEAD"]).stdout.strip()
    if branch!="main":
        raise InstallError("repository_main_branch_required")
    if _git(["status","--porcelain=v1","--untracked-files=all"]).stdout!="":
        raise InstallError("repository_not_clean")
    ancestry=_git(
        ["merge-base","--is-ancestor",LOCK_MERGE_COMMIT,expected_head],
        allow_fail=True,
    )
    if ancestry.returncode!=0:
        raise InstallError("accepted_lock_merge_not_in_ancestry")
    for relative,expected_blob in EXPECTED_HEAD_BLOBS.items():
        if _git(["rev-parse","HEAD:"+relative]).stdout.strip()!=expected_blob:
            raise InstallError("repository_dependency_blob_mismatch:"+relative)
    return head


def _trusted_directory(path:pathlib.Path,*,exact_mode:int|None=None)->os.stat_result:
    try:
        st=path.lstat()
    except OSError as exc:
        raise InstallError("trusted_directory_unavailable:"+str(path)) from exc
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or (st.st_mode&0o022)!=0
    ):
        raise InstallError("trusted_directory_invalid:"+str(path))
    if exact_mode is not None and stat.S_IMODE(st.st_mode)!=exact_mode:
        raise InstallError("trusted_directory_mode_invalid:"+str(path))
    return st


def _stable_file_bytes(
    path:pathlib.Path,
    *,
    expected_bytes:int|None=None,
    expected_sha256:str|None=None,
    maximum:int=MAX_NODE_BYTES,
    root_owned:bool=False,
    executable:bool=False,
)->tuple[bytes,os.stat_result]:
    raw_path=str(path)
    if not path.is_absolute() or os.path.normpath(raw_path)!=raw_path:
        raise InstallError("file_path_not_normalized_absolute:"+raw_path)
    try:
        before=path.lstat()
    except OSError as exc:
        raise InstallError("file_lstat_failed:"+raw_path) from exc
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_nlink!=1 or before.st_size<1 or before.st_size>maximum or
        (before.st_mode&0o022)!=0 or (before.st_mode&0o6000)!=0
    ):
        raise InstallError("file_metadata_invalid:"+raw_path)
    if root_owned and (before.st_uid!=0 or before.st_gid!=0):
        raise InstallError("file_root_custody_invalid:"+raw_path)
    if executable and (before.st_mode&0o111)==0:
        raise InstallError("file_not_executable:"+raw_path)
    if expected_bytes is not None and before.st_size!=expected_bytes:
        raise InstallError("file_size_mismatch:"+raw_path)

    try:
        fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    except OSError as exc:
        raise InstallError("file_open_failed:"+raw_path) from exc
    try:
        opened=os.fstat(fd)
        if not _same_identity(before,opened):
            raise InstallError("file_identity_changed_before_read:"+raw_path)
        digest=hashlib.sha256()
        chunks=[]
        remaining=opened.st_size
        while remaining:
            chunk=os.read(fd,min(MAX_READ_CHUNK,remaining))
            if not chunk:
                raise InstallError("file_short_read:"+raw_path)
            digest.update(chunk)
            chunks.append(chunk)
            remaining-=len(chunk)
        if os.read(fd,1):
            raise InstallError("file_grew_during_read:"+raw_path)
        after_fd=os.fstat(fd)
        after_visible=path.lstat()
        if (
            not _same_identity(opened,after_fd) or
            not _same_identity(after_fd,after_visible)
        ):
            raise InstallError("file_identity_changed_during_read:"+raw_path)
    finally:
        os.close(fd)
    raw=b"".join(chunks)
    if expected_sha256 is not None and digest.hexdigest()!=expected_sha256:
        raise InstallError("file_sha256_mismatch:"+raw_path)
    return raw,opened


def runner_source()->bytes:
    raw=_direct_repo_bytes(RUNNER_PATH,4*1024*1024)
    if (
        len(raw)!=RUNNER_BYTES or sha256(raw)!=RUNNER_SHA256 or
        git_blob_sha1(raw)!=RUNNER_GIT_BLOB_SHA1
    ):
        raise InstallError("runner_source_identity_mismatch")
    return raw


def native_candidate(path:pathlib.Path)->bytes:
    raw,_=_stable_file_bytes(
        path,
        expected_bytes=NATIVE_BYTES,
        expected_sha256=NATIVE_SHA256,
        maximum=2*1024*1024,
    )
    if not raw.startswith(b"\x7fELF"):
        raise InstallError("native_candidate_elf_magic_invalid")
    return raw


def node_identity()->dict[str,Any]:
    for ancestor in (pathlib.Path("/"),pathlib.Path("/usr"),pathlib.Path("/usr/bin")):
        _trusted_directory(ancestor)
    raw,st=_stable_file_bytes(
        NODE_PATH,
        maximum=MAX_NODE_BYTES,
        root_owned=True,
        executable=True,
    )
    return {
        "bytes":len(raw),
        "sha256":sha256(raw),
        "dev":st.st_dev,
        "ino":st.st_ino,
        "uid":st.st_uid,
        "gid":st.st_gid,
        "mode":st.st_mode,
        "nlink":st.st_nlink,
        "size":st.st_size,
        "mtime_ns":st.st_mtime_ns,
        "ctime_ns":st.st_ctime_ns,
    }


def policy_bytes(expected_head:str,node:dict[str,Any])->bytes:
    if HEX40.fullmatch(expected_head) is None:
        raise InstallError("expected_head_invalid")
    raw=(
        "schema="+POLICY_SCHEMA+"\n"
        "expected_head="+expected_head+"\n"
        "runner_sha256="+RUNNER_SHA256+"\n"
        "runner_bytes="+str(RUNNER_BYTES)+"\n"
        "node_sha256="+str(node["sha256"])+"\n"
        "node_bytes="+str(node["bytes"])+"\n"
    ).encode("ascii")
    if len(raw)>=1024:
        raise InstallError("policy_too_large")
    return raw


def _fd_file_ok(
    dir_fd:int,
    name:str,
    *,
    expected_bytes:int,
    expected_sha256:str,
    expected_mode:int,
)->None:
    try:
        visible=os.stat(name,dir_fd=dir_fd,follow_symlinks=False)
    except OSError as exc:
        raise InstallError("installed_file_unavailable:"+name) from exc
    if (
        not stat.S_ISREG(visible.st_mode) or stat.S_ISLNK(visible.st_mode) or
        visible.st_uid!=0 or visible.st_gid!=0 or visible.st_nlink!=1 or
        stat.S_IMODE(visible.st_mode)!=expected_mode or
        visible.st_size!=expected_bytes
    ):
        raise InstallError("installed_file_metadata_invalid:"+name)
    fd=os.open(
        name,
        os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW,
        dir_fd=dir_fd,
    )
    try:
        opened=os.fstat(fd)
        if not _same_identity(visible,opened):
            raise InstallError("installed_file_rebound:"+name)
        digest=hashlib.sha256()
        remaining=expected_bytes
        while remaining:
            chunk=os.read(fd,min(MAX_READ_CHUNK,remaining))
            if not chunk:
                raise InstallError("installed_file_short_read:"+name)
            digest.update(chunk)
            remaining-=len(chunk)
        if os.read(fd,1):
            raise InstallError("installed_file_grew:"+name)
        after=os.fstat(fd)
        final_visible=os.stat(name,dir_fd=dir_fd,follow_symlinks=False)
        if not _same_identity(opened,after) or not _same_identity(after,final_visible):
            raise InstallError("installed_file_changed:"+name)
    finally:
        os.close(fd)
    if digest.hexdigest()!=expected_sha256:
        raise InstallError("installed_file_sha256_mismatch:"+name)


def _create_file(dir_fd:int,name:str,raw:bytes,mode:int)->None:
    fd=os.open(
        name,
        os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,
        0o400,
        dir_fd=dir_fd,
    )
    try:
        view=memoryview(raw)
        offset=0
        while offset<len(view):
            wrote=os.write(fd,view[offset:])
            if wrote<=0:
                raise InstallError("short_write:"+name)
            offset+=wrote
        os.fchown(fd,0,0)
        os.fchmod(fd,mode)
        st=os.fstat(fd)
        if (
            not stat.S_ISREG(st.st_mode) or st.st_uid!=0 or st.st_gid!=0 or
            st.st_nlink!=1 or stat.S_IMODE(st.st_mode)!=mode or
            st.st_size!=len(raw)
        ):
            raise InstallError("staged_file_metadata_invalid:"+name)
        os.fsync(fd)
    finally:
        os.close(fd)
    _fd_file_ok(
        dir_fd,
        name,
        expected_bytes=len(raw),
        expected_sha256=sha256(raw),
        expected_mode=mode,
    )


def _renameat2(dir_fd:int,source:str,target:str,flags:int)->None:
    libc=ctypes.CDLL(None,use_errno=True)
    fn=getattr(libc,"renameat2",None)
    if fn is None:
        raise InstallError("renameat2_unavailable")
    fn.argtypes=[
        ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint,
    ]
    fn.restype=ctypes.c_int
    rc=fn(
        dir_fd,source.encode("utf-8"),
        dir_fd,target.encode("utf-8"),
        flags,
    )
    if rc!=0:
        raise InstallError("renameat2_failed:"+str(ctypes.get_errno()))


def _name_absent(dir_fd:int,name:str,reason:str)->None:
    try:
        os.stat(name,dir_fd=dir_fd,follow_symlinks=False)
    except FileNotFoundError:
        return
    except OSError as exc:
        raise InstallError(reason+"_probe_failed") from exc
    raise InstallError(reason)


def _root_entries(dir_fd:int)->list[str]:
    try:
        return sorted(os.listdir(dir_fd))
    except OSError as exc:
        raise InstallError("installed_root_list_failed") from exc


def _open_final_root(opt_fd:int)->int:
    try:
        return os.open(
            INSTALL_NAME,
            os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
    except OSError as exc:
        raise InstallError("installed_root_open_failed") from exc


def _verify_final_root(
    opt_fd:int,
    *,
    expected_head:str,
    node:dict[str,Any],
)->None:
    root_fd=_open_final_root(opt_fd)
    try:
        st=os.fstat(root_fd)
        visible=os.stat(INSTALL_NAME,dir_fd=opt_fd,follow_symlinks=False)
        if (
            not _same_identity(st,visible) or not stat.S_ISDIR(st.st_mode) or
            st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)!=0o755
        ):
            raise InstallError("installed_root_metadata_invalid")
        if _root_entries(root_fd)!=sorted((NATIVE_NAME,RUNNER_NAME,POLICY_NAME)):
            raise InstallError("installed_root_entries_invalid")
        _fd_file_ok(
            root_fd,NATIVE_NAME,
            expected_bytes=NATIVE_BYTES,
            expected_sha256=NATIVE_SHA256,
            expected_mode=0o555,
        )
        _fd_file_ok(
            root_fd,RUNNER_NAME,
            expected_bytes=RUNNER_BYTES,
            expected_sha256=RUNNER_SHA256,
            expected_mode=0o444,
        )
        policy=policy_bytes(expected_head,node)
        _fd_file_ok(
            root_fd,POLICY_NAME,
            expected_bytes=len(policy),
            expected_sha256=sha256(policy),
            expected_mode=0o444,
        )
    finally:
        os.close(root_fd)


def protected_state(expected_head:str,node:dict[str,Any])->str:
    _trusted_directory(pathlib.Path("/"))
    _trusted_directory(INSTALL_PARENT)
    opt_fd=os.open(
        INSTALL_PARENT,
        os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,
    )
    try:
        _name_absent(opt_fd,STAGE_NAME,"staging_root_present")
        try:
            os.stat(INSTALL_NAME,dir_fd=opt_fd,follow_symlinks=False)
        except FileNotFoundError:
            return READY_STATE
        _verify_final_root(opt_fd,expected_head=expected_head,node=node)
        return GREEN_STATE
    finally:
        os.close(opt_fd)


def _same_node_identity(a:dict[str,Any],b:dict[str,Any])->bool:
    return all(a.get(key)==b.get(key) for key in (
        "bytes","sha256","dev","ino","uid","gid","mode","nlink",
        "size","mtime_ns","ctime_ns",
    ))


def _require_secure_apply_context()->None:
    if sys.flags.isolated!=1:
        raise InstallError("python_isolated_mode_required_for_apply")
    present=[name for name in FORBIDDEN_APPLY_ENV if name in os.environ]
    if present:
        raise InstallError("forbidden_apply_environment:"+",".join(present))


def _bounded_failure(exc:BaseException)->tuple[str,str]:
    if isinstance(exc,OSError):
        return "OSError","os_error_"+str(exc.errno if exc.errno is not None else "unknown")
    if isinstance(exc,InstallError):
        return "InstallError","install_error"
    return "BaseException","unexpected_failure"


def _published_failure(
    reason:str,
    *,
    phase:str,
    parent_fsync_completed:bool|None,
    final_verification_completed:bool|None,
    cause:BaseException,
)->PublishedInstallError:
    cls,why=_bounded_failure(cause)
    return PublishedInstallError(
        reason,
        phase=phase,
        parent_fsync_completed=parent_fsync_completed,
        final_verification_completed=final_verification_completed,
        original_failure_class=cls,
        original_failure_reason=why,
    )


def _post_publication_checks(
    opt_fd:int,
    *,
    expected_head:str,
    node:dict[str,Any],
    _fsync_fn:Any=os.fsync,
    _verify_fn:Any=_verify_final_root,
)->None:
    try:
        _fsync_fn(opt_fd)
    except BaseException as exc:
        raise _published_failure(
            "post_publication_parent_fsync_failed",
            phase="parent_fsync",
            parent_fsync_completed=False,
            final_verification_completed=False,
            cause=exc,
        ) from exc
    try:
        repository_identity(expected_head)
        current_node=node_identity()
        if not _same_node_identity(node,current_node):
            raise InstallError("node_generation_changed_after_publication")
        _verify_fn(opt_fd,expected_head=expected_head,node=node)
    except BaseException as exc:
        raise _published_failure(
            "post_publication_final_verification_failed",
            phase="final_verification",
            parent_fsync_completed=True,
            final_verification_completed=False,
            cause=exc,
        ) from exc


def _cleanup_stage(opt_fd:int,stage_fd:int|None)->bool:
    try:
        if stage_fd is not None:
            for name in _root_entries(stage_fd):
                if name not in (NATIVE_NAME,RUNNER_NAME,POLICY_NAME):
                    return False
                os.unlink(name,dir_fd=stage_fd)
            os.fsync(stage_fd)
        try:
            os.rmdir(STAGE_NAME,dir_fd=opt_fd)
        except FileNotFoundError:
            pass
        os.fsync(opt_fd)
        return True
    except (OSError,InstallError):
        return False


def _bool_fact(value:bool|None)->str:
    if value is None:
        return "unknown"
    return str(value).lower()


def failure_receipt(
    exc:InstallError,
    *,
    stage_created:bool=False,
    stage_cleanup_completed:bool|None=None,
)->dict[str,str]:
    if isinstance(exc,PublishedInstallError):
        return {
            "protected_install_performed":"true",
            "publication":"true",
            "publication_state":"published_needs_inspection",
            "final_state_verified":"false",
            "publication_failure_phase":exc.phase,
            "parent_fsync_completed":_bool_fact(exc.parent_fsync_completed),
            "final_verification_completed":_bool_fact(exc.final_verification_completed),
            "original_failure_class":exc.original_failure_class,
            "original_failure_reason":exc.original_failure_reason,
            "stage_created":"true",
            "stage_cleanup_completed":"not_applicable",
        }
    cls,why=_bounded_failure(exc)
    return {
        "protected_install_performed":"false",
        "publication":"false",
        "publication_state":"not_published",
        "final_state_verified":"false",
        "publication_failure_phase":"not_published",
        "parent_fsync_completed":"not_applicable",
        "final_verification_completed":"not_applicable",
        "original_failure_class":cls,
        "original_failure_reason":why,
        "stage_created":str(stage_created).lower(),
        "stage_cleanup_completed":(
            "not_applicable"
            if stage_cleanup_completed is None
            else str(stage_cleanup_completed).lower()
        ),
    }


def source_plan()->None:
    accepted_lock()
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("accepted_lock_id="+LOCK_ID)
    print("native_binary_sha256="+NATIVE_SHA256)
    print("native_binary_bytes="+str(NATIVE_BYTES))
    print("runner_sha256="+RUNNER_SHA256)
    print("runner_bytes="+str(RUNNER_BYTES))
    print("target_root="+str(INSTALL_ROOT))
    print("create_only=true")
    print("atomic_complete_root_publication_required=true")
    print("host_read=false")
    print("host_write=false")
    print("protected_install_performed=false")
    print("live_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")


def plan(native:pathlib.Path,expected_head:str)->None:
    accepted_lock()
    repository_identity(expected_head)
    runner_source()
    native_candidate(native)
    node=node_identity()
    state=protected_state(expected_head,node)
    print(MARKER)
    print("mode=plan")
    print("expected_head="+expected_head)
    print("accepted_lock_id="+LOCK_ID)
    print("native_candidate_verified=true")
    print("runner_source_verified=true")
    print("fixed_node_generation_verified=true")
    print("protected_state="+state)
    print("filesystem_write=false")
    print("protected_install_performed=false")
    print("live_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=SEPARATELY_AUTHORIZE_CREATE_ONLY_EPOCH2_NATIVE_INSTALL")


def apply(native:pathlib.Path,expected_head:str,confirm:str)->None:
    if confirm!=CONFIRM_TOKEN:
        raise InstallError("explicit_create_only_confirmation_required")
    if os.geteuid()!=0:
        raise InstallError("root_required_for_apply")
    _require_secure_apply_context()

    accepted_lock()
    repository_identity(expected_head)
    runner=runner_source()
    native_raw=native_candidate(native)
    node=node_identity()
    policy=policy_bytes(expected_head,node)

    _trusted_directory(pathlib.Path("/"))
    _trusted_directory(INSTALL_PARENT)
    opt_fd=os.open(
        INSTALL_PARENT,
        os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,
    )
    stage_fd:int|None=None
    stage_created=False
    published=False
    cleanup_completed:bool|None=None
    try:
        parent_before=os.fstat(opt_fd)
        _name_absent(opt_fd,STAGE_NAME,"staging_root_present")
        try:
            os.stat(INSTALL_NAME,dir_fd=opt_fd,follow_symlinks=False)
        except FileNotFoundError:
            pass
        else:
            _verify_final_root(opt_fd,expected_head=expected_head,node=node)
            print(MARKER)
            print("mode=apply")
            print("status=ALREADY_GREEN")
            print("protected_install_performed=false")
            print("publication=false")
            print("final_state_verified=true")
            print("expected_head="+expected_head)
            print("accepted_lock_id="+LOCK_ID)
            print("live_execution=false")
            print("credential_access=false")
            print("signing=false")
            print("transaction=false")
            print("payment_acceptance=false")
            print("public_presale_activation=false")
            print("wc_void_market_activation=false")
            print("funds_movement=false")
            return

        os.mkdir(STAGE_NAME,0o700,dir_fd=opt_fd)
        stage_created=True
        stage_fd=os.open(
            STAGE_NAME,
            os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,
            dir_fd=opt_fd,
        )
        os.fchown(stage_fd,0,0)
        os.fchmod(stage_fd,0o755)
        stage_st=os.fstat(stage_fd)
        if (
            not stat.S_ISDIR(stage_st.st_mode) or stage_st.st_uid!=0 or
            stage_st.st_gid!=0 or stat.S_IMODE(stage_st.st_mode)!=0o755
        ):
            raise InstallError("staging_root_metadata_invalid")

        _create_file(stage_fd,NATIVE_NAME,native_raw,0o555)
        _create_file(stage_fd,RUNNER_NAME,runner,0o444)
        _create_file(stage_fd,POLICY_NAME,policy,0o444)
        if _root_entries(stage_fd)!=sorted((NATIVE_NAME,RUNNER_NAME,POLICY_NAME)):
            raise InstallError("staging_root_entries_invalid")
        os.fsync(stage_fd)

        repository_identity(expected_head)
        current_node=node_identity()
        if not _same_node_identity(node,current_node):
            raise InstallError("node_generation_changed_before_publication")
        parent_visible=INSTALL_PARENT.lstat()
        parent_open=os.fstat(opt_fd)
        if (
            not _same_identity(parent_before,parent_open) or
            not _same_identity(parent_open,parent_visible)
        ):
            raise InstallError("install_parent_generation_changed")
        _name_absent(opt_fd,INSTALL_NAME,"create_only_target_exists")

        _renameat2(opt_fd,STAGE_NAME,INSTALL_NAME,RENAME_NOREPLACE)
        published=True
        stage_created=False
        stage_fd_to_close=stage_fd
        stage_fd=None
        try:
            os.close(stage_fd_to_close)
        except OSError as exc:
            raise _published_failure(
                "post_publication_stage_fd_close_failed",
                phase="stage_fd_close",
                parent_fsync_completed=None,
                final_verification_completed=False,
                cause=exc,
            ) from exc

        _post_publication_checks(
            opt_fd,
            expected_head=expected_head,
            node=node,
        )
    except PublishedInstallError:
        raise
    except BaseException as exc:
        if not published and stage_created:
            cleanup_completed=_cleanup_stage(opt_fd,stage_fd)
        if isinstance(exc,InstallError):
            setattr(exc,"stage_created",stage_created)
            setattr(exc,"stage_cleanup_completed",cleanup_completed)
            raise
        wrapped=InstallError("unexpected_prepublication_failure")
        setattr(wrapped,"stage_created",stage_created)
        setattr(wrapped,"stage_cleanup_completed",cleanup_completed)
        raise wrapped from exc
    finally:
        if stage_fd is not None:
            try:
                os.close(stage_fd)
            except OSError:
                pass
        try:
            os.close(opt_fd)
        except OSError as exc:
            if published and sys.exc_info()[0] is None:
                raise _published_failure(
                    "post_publication_install_parent_close_failed",
                    phase="install_parent_close",
                    parent_fsync_completed=True,
                    final_verification_completed=True,
                    cause=exc,
                ) from exc

    print(MARKER)
    print("mode=apply")
    print("status=GREEN")
    print("expected_head="+expected_head)
    print("accepted_lock_id="+LOCK_ID)
    print("protected_install_performed=true")
    print("publication=true")
    print("final_state_verified=true")
    print("native_sha256="+NATIVE_SHA256)
    print("native_bytes="+str(NATIVE_BYTES))
    print("runner_sha256="+RUNNER_SHA256)
    print("runner_bytes="+str(RUNNER_BYTES))
    print("node_sha256="+str(node["sha256"]))
    print("node_bytes="+str(node["bytes"]))
    print("live_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=INSTALLED_EPOCH2_NATIVE_ROOT_READ_ONLY_QUALIFICATION")


def self_test()->None:
    lock=accepted_lock()
    assert lock["candidate_accepted"] is True
    assert lock["native_binary_identity_accepted"] is True
    assert lock["runner_identity_accepted"] is True
    assert lock["protected_install_authorized"] is False
    assert INSTALL_ROOT==pathlib.Path(
        "/opt/void-buy-void-epoch2-live-composition-v2"
    )
    assert NATIVE_NAME=="void_buy_void_epoch2_live_composition_native_preentry_v1"
    assert RUNNER_NAME=="void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs"
    assert POLICY_NAME=="policy-v1.conf"
    fake_node={"sha256":"a"*64,"bytes":123}
    policy=policy_bytes("b"*40,fake_node)
    expected=(
        "schema="+POLICY_SCHEMA+"\n"
        "expected_head="+"b"*40+"\n"
        "runner_sha256="+RUNNER_SHA256+"\n"
        "runner_bytes="+str(RUNNER_BYTES)+"\n"
        "node_sha256="+"a"*64+"\n"
        "node_bytes=123\n"
    ).encode("ascii")
    assert policy==expected
    assert sha256(policy)==sha256(expected)
    print(MARKER+"_SELF_TEST_GREEN")
    print("accepted_v3_lock_bound=true")
    print("atomic_complete_root_publication_required=true")
    print("policy_expected_head_bound=true")
    print("policy_runner_identity_bound=true")
    print("policy_node_identity_bound=true")
    print("expected_head_dependency_generation_bound=true")
    print("post_publication_failure_receipt_truthful=true")
    print("create_only=true")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("funds_movement=false")


def main()->int:
    parser=argparse.ArgumentParser()
    modes=parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--self-test",action="store_true")
    modes.add_argument("--source-plan",action="store_true")
    modes.add_argument("--plan",action="store_true")
    modes.add_argument("--apply",action="store_true")
    parser.add_argument("--native-candidate",type=pathlib.Path)
    parser.add_argument("--expected-head",default="")
    parser.add_argument("--confirm",default="")
    args=parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if args.native_candidate is None:
        raise InstallError("native_candidate_required")
    if not args.expected_head:
        raise InstallError("expected_head_required")
    if args.plan:
        plan(args.native_candidate,args.expected_head)
        return 0
    apply(args.native_candidate,args.expected_head,args.confirm)
    return 0


if __name__=="__main__":
    try:
        raise SystemExit(main())
    except InstallError as exc:
        stage_created=bool(getattr(exc,"stage_created",False))
        cleanup=getattr(exc,"stage_cleanup_completed",None)
        receipt=failure_receipt(
            exc,
            stage_created=stage_created,
            stage_cleanup_completed=cleanup,
        )
        print(MARKER)
        print("status=HOLD")
        print("reason="+str(exc))
        for key,value in receipt.items():
            print(key+"="+value)
        print("live_execution=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("funds_movement=false")
        print("production_host_evidence_authority=false")
        raise SystemExit(2)

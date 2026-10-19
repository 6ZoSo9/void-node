#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import stat
import tempfile

MARKER="VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_QUERY_PROTECTED_INSTALL_V1"
GREEN_MARKER=MARKER+"_GREEN"
CONFIRM="CREATE_ONLY_PROTECTED_CLOUDFLARE_RETIREMENT_QUERY_V1"

INSTALL_ROOT=Path("/opt/void-cloudflare-user-tunnel-retirement-query-v1")
PREEXEC_NAME="void_cloudflare_historical_user_tunnel_retirement_preexec_v1"
QUERY_NAME="void_cloudflare_historical_user_tunnel_retirement_query_v1"
PREEXEC_TARGET=INSTALL_ROOT/PREEXEC_NAME
QUERY_TARGET=INSTALL_ROOT/QUERY_NAME

PREEXEC_SOURCE_REL="ops/public/void_cloudflare_historical_user_tunnel_retirement_preexec_v1.c"
PREEXEC_SOURCE_BLOB="59c1418593927f554208af1d464ab6574a690e0d"
QUERY_SOURCE_REL="ops/public/void_cloudflare_historical_user_tunnel_retirement_query_v1.c"
QUERY_SOURCE_BLOB="25c1747ddd6a121b1ba2dbc1590c33a149e9b87b"

PREEXEC_BYTES=785824
PREEXEC_SHA256="9852c4754de5daa901e67b05c612c1c906de107ac6684f620d41415a275c89cb"
QUERY_BYTES=40152
QUERY_SHA256="bd8703cdc7a0ee8e502ecc081dc2cbd3a825d426dbbfc9075bf07b424389c605"
HOSTED_RUN=38787746099
INSTALL_MODE=0o555

class InstallError(RuntimeError):
    pass

def _sha256(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()

def _stable_candidate(path:Path,expected_bytes:int,expected_sha256:str,label:str)->bytes:
    try:
        visible=path.lstat()
    except OSError as exc:
        raise InstallError(label+"_candidate_missing") from exc
    if (
        not stat.S_ISREG(visible.st_mode) or stat.S_ISLNK(visible.st_mode) or
        visible.st_nlink!=1 or visible.st_size!=expected_bytes or
        stat.S_IMODE(visible.st_mode)&(stat.S_ISUID|stat.S_ISGID)
    ):
        raise InstallError(label+"_candidate_metadata_invalid")
    flags=os.O_RDONLY|os.O_CLOEXEC
    if hasattr(os,"O_NOFOLLOW"):
        flags|=os.O_NOFOLLOW
    try:
        fd=os.open(path,flags)
    except OSError as exc:
        raise InstallError(label+"_candidate_open_failed") from exc
    try:
        before=os.fstat(fd)
        if (
            not stat.S_ISREG(before.st_mode) or before.st_nlink!=1 or
            before.st_size!=expected_bytes or
            before.st_dev!=visible.st_dev or before.st_ino!=visible.st_ino
        ):
            raise InstallError(label+"_candidate_generation_invalid")
        chunks=[]
        while True:
            chunk=os.read(fd,1024*1024)
            if not chunk:
                break
            chunks.append(chunk)
        data=b"".join(chunks)
        after=os.fstat(fd)
    finally:
        os.close(fd)
    try:
        revisible=path.lstat()
    except OSError as exc:
        raise InstallError(label+"_candidate_revisible_failed") from exc
    stable_fields=("st_dev","st_ino","st_size","st_mtime_ns","st_ctime_ns")
    if any(getattr(before,k)!=getattr(after,k) for k in stable_fields):
        raise InstallError(label+"_candidate_changed_during_read")
    if (
        revisible.st_dev!=before.st_dev or revisible.st_ino!=before.st_ino or
        revisible.st_size!=before.st_size or
        revisible.st_mtime_ns!=before.st_mtime_ns or
        revisible.st_ctime_ns!=before.st_ctime_ns
    ):
        raise InstallError(label+"_candidate_path_changed")
    if len(data)!=expected_bytes or _sha256(data)!=expected_sha256:
        raise InstallError(label+"_candidate_identity_invalid")
    return data

def _trusted_parent(path:Path)->None:
    try:
        st=path.lstat()
    except OSError as exc:
        raise InstallError("install_parent_unreadable") from exc
    if (
        not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode) or
        st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)&0o022
    ):
        raise InstallError("install_parent_custody_invalid")

def _open_install_root()->int:
    _trusted_parent(INSTALL_ROOT.parent)
    try:
        visible=INSTALL_ROOT.lstat()
    except OSError as exc:
        raise InstallError("install_root_unreadable") from exc
    if (
        not stat.S_ISDIR(visible.st_mode) or stat.S_ISLNK(visible.st_mode) or
        visible.st_uid!=0 or visible.st_gid!=0 or
        stat.S_IMODE(visible.st_mode)!=INSTALL_MODE
    ):
        raise InstallError("install_root_custody_invalid")
    flags=os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC
    if hasattr(os,"O_NOFOLLOW"):
        flags|=os.O_NOFOLLOW
    try:
        fd=os.open(INSTALL_ROOT,flags)
    except OSError as exc:
        raise InstallError("install_root_open_failed") from exc
    opened=os.fstat(fd)
    if (
        opened.st_dev!=visible.st_dev or opened.st_ino!=visible.st_ino or
        not stat.S_ISDIR(opened.st_mode) or opened.st_uid!=0 or opened.st_gid!=0 or
        stat.S_IMODE(opened.st_mode)!=INSTALL_MODE
    ):
        os.close(fd)
        raise InstallError("install_root_generation_invalid")
    return fd

def _installed_snapshot(path:Path,expected_bytes:int,expected_sha256:str,label:str)->dict:
    try:
        visible=path.lstat()
    except OSError as exc:
        raise InstallError(label+"_installed_missing") from exc
    if (
        not stat.S_ISREG(visible.st_mode) or stat.S_ISLNK(visible.st_mode) or
        visible.st_uid!=0 or visible.st_gid!=0 or
        stat.S_IMODE(visible.st_mode)!=INSTALL_MODE or
        visible.st_nlink!=1 or visible.st_size!=expected_bytes
    ):
        raise InstallError(label+"_installed_custody_invalid")
    flags=os.O_RDONLY|os.O_CLOEXEC
    if hasattr(os,"O_NOFOLLOW"):
        flags|=os.O_NOFOLLOW
    try:
        fd=os.open(path,flags)
    except OSError as exc:
        raise InstallError(label+"_installed_open_failed") from exc
    try:
        before=os.fstat(fd)
        if (
            not stat.S_ISREG(before.st_mode) or before.st_uid!=0 or before.st_gid!=0 or
            stat.S_IMODE(before.st_mode)!=INSTALL_MODE or before.st_nlink!=1 or
            before.st_size!=expected_bytes or before.st_dev!=visible.st_dev or
            before.st_ino!=visible.st_ino
        ):
            raise InstallError(label+"_installed_generation_invalid")
        h=hashlib.sha256()
        total=0
        while True:
            chunk=os.read(fd,1024*1024)
            if not chunk:
                break
            total+=len(chunk)
            h.update(chunk)
        after=os.fstat(fd)
    finally:
        os.close(fd)
    try:
        revisible=path.lstat()
    except OSError as exc:
        raise InstallError(label+"_installed_revisible_failed") from exc
    stable_fields=("st_dev","st_ino","st_size","st_mtime_ns","st_ctime_ns")
    if any(getattr(before,k)!=getattr(after,k) for k in stable_fields):
        raise InstallError(label+"_installed_changed_during_read")
    if (
        revisible.st_dev!=before.st_dev or revisible.st_ino!=before.st_ino or
        revisible.st_size!=before.st_size or
        revisible.st_mtime_ns!=before.st_mtime_ns or
        revisible.st_ctime_ns!=before.st_ctime_ns
    ):
        raise InstallError(label+"_installed_path_changed")
    if total!=expected_bytes or h.hexdigest()!=expected_sha256:
        raise InstallError(label+"_installed_identity_invalid")
    return {
        "dev":before.st_dev,"ino":before.st_ino,"uid":before.st_uid,
        "gid":before.st_gid,"mode":format(stat.S_IMODE(before.st_mode),"04o"),
        "nlink":before.st_nlink,"size":before.st_size,
        "sha256":"sha256:"+expected_sha256,
    }

def verify_installed()->dict:
    root_fd=_open_install_root()
    try:
        preexec=_installed_snapshot(
            PREEXEC_TARGET,PREEXEC_BYTES,PREEXEC_SHA256,"preexec"
        )
        query=_installed_snapshot(
            QUERY_TARGET,QUERY_BYTES,QUERY_SHA256,"query"
        )
        root_after=os.fstat(root_fd)
        if (
            root_after.st_uid!=0 or root_after.st_gid!=0 or
            stat.S_IMODE(root_after.st_mode)!=INSTALL_MODE
        ):
            raise InstallError("install_root_changed")
    finally:
        os.close(root_fd)
    return {
        "install_root":str(INSTALL_ROOT),
        "preexec":preexec,
        "query":query,
    }

def _write_create_only(root_fd:int,name:str,data:bytes)->None:
    flags=os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC
    if hasattr(os,"O_NOFOLLOW"):
        flags|=os.O_NOFOLLOW
    try:
        fd=os.open(name,flags,INSTALL_MODE,dir_fd=root_fd)
    except OSError as exc:
        raise InstallError("create_only_target_open_failed:"+name) from exc
    try:
        os.fchmod(fd,INSTALL_MODE)
        os.fchown(fd,0,0)
        offset=0
        while offset<len(data):
            written=os.write(fd,data[offset:])
            if written<=0:
                raise InstallError("target_short_write:"+name)
            offset+=written
        os.fsync(fd)
    finally:
        os.close(fd)

def apply(preexec_candidate:Path,query_candidate:Path,confirm:str)->dict:
    if os.geteuid()!=0:
        raise InstallError("root_required")
    if confirm!=CONFIRM:
        raise InstallError("explicit_confirmation_required")
    _trusted_parent(INSTALL_ROOT.parent)
    preexec=_stable_candidate(
        preexec_candidate,PREEXEC_BYTES,PREEXEC_SHA256,"preexec"
    )
    query=_stable_candidate(
        query_candidate,QUERY_BYTES,QUERY_SHA256,"query"
    )
    if INSTALL_ROOT.exists() or INSTALL_ROOT.is_symlink():
        raise InstallError("install_root_exists_create_only")
    try:
        os.mkdir(INSTALL_ROOT,INSTALL_MODE)
        os.chown(INSTALL_ROOT,0,0)
        os.chmod(INSTALL_ROOT,INSTALL_MODE)
    except OSError as exc:
        raise InstallError("install_root_create_failed") from exc
    root_fd=_open_install_root()
    try:
        _write_create_only(root_fd,PREEXEC_NAME,preexec)
        _write_create_only(root_fd,QUERY_NAME,query)
        os.fsync(root_fd)
    finally:
        os.close(root_fd)
    return verify_installed()

def plan()->None:
    print(MARKER)
    print("mode=plan")
    print("create_only=true")
    print("overwrite=false")
    print("root_required_for_apply=true")
    print("exact_preexec_identity_required=true")
    print("exact_query_identity_required=true")
    print("installed_root_owner_required=true")
    print("installed_mode_0555_required=true")
    print("installed_single_link_required=true")
    print("host_mutation=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("network_calls=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")

def self_test()->None:
    payload=b"candidate-self-test"
    expected=_sha256(payload)
    with tempfile.TemporaryDirectory(prefix="void-cloudflare-protected-install-") as td:
        root=Path(td)
        candidate=root/"candidate"
        candidate.write_bytes(payload)
        data=_stable_candidate(candidate,len(payload),expected,"selftest")
        if data!=payload:
            raise AssertionError("candidate_roundtrip_failed")
        link=root/"link"
        link.symlink_to(candidate.name)
        try:
            _stable_candidate(link,len(payload),expected,"symlink")
        except InstallError:
            pass
        else:
            raise AssertionError("symlink_candidate_accepted")
        try:
            _stable_candidate(candidate,len(payload),"0"*64,"forged")
        except InstallError:
            pass
        else:
            raise AssertionError("forged_candidate_accepted")
    print(MARKER+"_SELF_TEST_GREEN")
    print("candidate_symlink_rejected=true")
    print("forged_candidate_identity_rejected=true")
    print("create_only=true")
    print("overwrite=false")
    print("funds_movement=false")

def verify_cli()->None:
    state=verify_installed()
    print(GREEN_MARKER)
    print("installed_protected_pair=true")
    print("preexec_bytes="+str(state["preexec"]["size"]))
    print("preexec_sha256="+state["preexec"]["sha256"])
    print("query_bytes="+str(state["query"]["size"]))
    print("query_sha256="+state["query"]["sha256"])
    print("host_mutation=false")
    print("funds_movement=false")

def main()->int:
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--plan",action="store_true")
    group.add_argument("--self-test",action="store_true")
    group.add_argument("--verify-installed",action="store_true")
    group.add_argument("--apply",action="store_true")
    parser.add_argument("--preexec-candidate",type=Path)
    parser.add_argument("--query-candidate",type=Path)
    parser.add_argument("--confirm",default="")
    args=parser.parse_args()
    try:
        if args.plan:
            plan()
        elif args.self_test:
            self_test()
        elif args.verify_installed:
            verify_cli()
        else:
            if args.preexec_candidate is None or args.query_candidate is None:
                raise InstallError("candidate_paths_required")
            state=apply(args.preexec_candidate,args.query_candidate,args.confirm)
            print(GREEN_MARKER)
            print("mode=apply")
            print("installed_protected_pair=true")
            print("preexec_sha256="+state["preexec"]["sha256"])
            print("query_sha256="+state["query"]["sha256"])
            print("service_mutation=false")
            print("systemd_mutation=false")
            print("funds_movement=false")
    except (InstallError,OSError,ValueError) as exc:
        print(MARKER+"_HOLD")
        print("reason="+str(exc))
        return 2
    return 0

if __name__=="__main__":
    raise SystemExit(main())

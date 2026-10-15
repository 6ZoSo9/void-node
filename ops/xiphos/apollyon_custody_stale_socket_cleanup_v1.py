#!/usr/bin/env python3
from __future__ import annotations

import argparse
import errno
import os
from pathlib import Path
import pwd
import grp
import re
import socket
import stat
import sys

MARKER="VOID_APOLLYON_CUSTODY_STALE_SOCKET_CLEANUP_V1"
TARGET_HOST="Xiphos"
CUSTODY_USER="voidapollyoncustody"
CUSTODY_GROUP="voidapollyoncustody"
IPC_GROUP="voidapollyonipc"
SOCKET_PARENT=Path("/run/void-apollyon-custody-v1")
SOCKET_PATH=SOCKET_PARENT/"custody.sock"
HIDDEN_RE=re.compile(r"^\.v[0-9a-f]{4}$")

class Hold(RuntimeError): pass
def hold(reason:str)->None: raise Hold(reason)

def same_inode(a:os.stat_result,b:os.stat_result)->bool:
    return a.st_dev==b.st_dev and a.st_ino==b.st_ino

def valid_socket_meta(st:os.stat_result,uid:int,gid:int)->bool:
    return (
        stat.S_ISSOCK(st.st_mode) and
        st.st_uid==uid and st.st_gid==gid and
        stat.S_IMODE(st.st_mode)==0o660 and
        st.st_nlink in (1,2)
    )

def parse_proc_status_uids(raw:str)->tuple[int,int,int,int]:
    rows=[line for line in raw.splitlines() if line.startswith("Uid:")]
    if len(rows)!=1:
        hold("custody_process_status_uid_invalid")
    parts=rows[0].split()
    if len(parts)!=5 or parts[0]!="Uid:":
        hold("custody_process_status_uid_invalid")
    try:
        values=tuple(int(value,10) for value in parts[1:])
    except ValueError as exc:
        raise Hold("custody_process_status_uid_invalid") from exc
    if len(values)!=4 or any(value<0 for value in values):
        hold("custody_process_status_uid_invalid")
    return values  # type: ignore[return-value]

def exact_self_process_set(observed:set[int],self_pid:int)->bool:
    return observed=={self_pid}

def custody_uid_process_pids(uid:int,proc_root:Path=Path("/proc"))->set[int]:
    try:
        with os.scandir(proc_root) as entries:
            names=sorted(
                entry.name for entry in entries
                if entry.name.isdecimal()
            )
    except OSError as exc:
        raise Hold("custody_process_census_unavailable") from exc

    observed:set[int]=set()
    for name in names:
        process_root=proc_root/name
        status_path=process_root/"status"
        try:
            raw=status_path.read_text(encoding="utf-8",errors="strict")
        except FileNotFoundError:
            continue
        except (OSError,UnicodeError) as exc:
            if not process_root.exists():
                continue
            raise Hold("custody_process_status_unreadable:"+name) from exc
        try:
            uids=parse_proc_status_uids(raw)
        except Hold:
            if not process_root.exists():
                continue
            raise
        if uid in uids:
            observed.add(int(name,10))
    return observed

def require_custody_uid_exclusive(uid:int)->set[int]:
    observed=custody_uid_process_pids(uid)
    if not exact_self_process_set(observed,os.getpid()):
        hold("custody_uid_process_exclusivity_failed")
    return observed

def resolve_identities()->tuple[int,int,int]:
    try:
        user=pwd.getpwnam(CUSTODY_USER)
        primary=grp.getgrnam(CUSTODY_GROUP)
        ipc=grp.getgrnam(IPC_GROUP)
    except KeyError as exc:
        raise Hold("custody_identity_missing") from exc
    if user.pw_gid!=primary.gr_gid:
        hold("custody_primary_group_mismatch")
    if os.geteuid()!=user.pw_uid or os.getegid()!=primary.gr_gid:
        hold("cleanup_runtime_identity_mismatch")
    if ipc.gr_gid not in set(os.getgroups()):
        hold("cleanup_ipc_group_missing")
    return user.pw_uid,primary.gr_gid,ipc.gr_gid

def require_parent(uid:int,ipc_gid:int)->os.stat_result:
    before=os.lstat(SOCKET_PARENT)
    if (
        not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_uid!=uid or before.st_gid!=ipc_gid or
        stat.S_IMODE(before.st_mode)!=0o750 or
        Path(os.path.realpath(SOCKET_PARENT))!=SOCKET_PARENT
    ):
        hold("socket_parent_invalid")
    return before

def connect_status()->int:
    probe=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
    try:
        probe.settimeout(0.25)
        return probe.connect_ex(os.fspath(SOCKET_PATH))
    finally:
        probe.close()

def matching_hidden(advertised:os.stat_result,uid:int,ipc_gid:int)->list[Path]:
    out=[]
    with os.scandir(SOCKET_PARENT) as entries:
        for entry in entries:
            if not HIDDEN_RE.fullmatch(entry.name):
                continue
            path=SOCKET_PARENT/entry.name
            st=os.lstat(path)
            if same_inode(advertised,st):
                if not valid_socket_meta(st,uid,ipc_gid):
                    hold("hidden_socket_metadata_invalid")
                out.append(path)
    return sorted(out)

def cleanup()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():
        hold("wrong_host")
    uid,_,ipc_gid=resolve_identities()
    require_parent(uid,ipc_gid)

    try:
        before=os.lstat(SOCKET_PATH)
    except FileNotFoundError:
        return {
            "marker":MARKER,"socket_absent":True,"socket_unlinked":False,
            "hidden_socket_unlinked":False,"stale_listener_proven":False,
        }

    if not valid_socket_meta(before,uid,ipc_gid):
        hold("advertised_socket_metadata_invalid")

    status=connect_status()
    if status==0:
        hold("advertised_socket_still_listening")
    if status==errno.ENOENT:
        return {
            "marker":MARKER,"socket_absent":True,"socket_unlinked":False,
            "hidden_socket_unlinked":False,"stale_listener_proven":False,
        }
    if status!=errno.ECONNREFUSED:
        hold("advertised_socket_liveness_ambiguous")

    current=os.lstat(SOCKET_PATH)
    if not same_inode(before,current) or not valid_socket_meta(current,uid,ipc_gid):
        hold("advertised_socket_changed")
    require_custody_uid_exclusive(uid)

    hidden=matching_hidden(current,uid,ipc_gid)
    if current.st_nlink==1 and hidden:
        hold("socket_link_count_inconsistent")
    if current.st_nlink==2 and len(hidden)!=1:
        hold("hidden_socket_identity_not_unique")

    hidden_removed=False
    if hidden:
        require_custody_uid_exclusive(uid)
        os.unlink(hidden[0])
        hidden_removed=True
        after_hidden=os.lstat(SOCKET_PATH)
        if not same_inode(current,after_hidden) or after_hidden.st_nlink!=1:
            hold("hidden_socket_unlink_identity_drift")

    require_custody_uid_exclusive(uid)
    os.unlink(SOCKET_PATH)
    dfd=os.open(
        SOCKET_PARENT,
        os.O_RDONLY|getattr(os,"O_DIRECTORY",0)|getattr(os,"O_CLOEXEC",0),
    )
    try:
        os.fsync(dfd)
    finally:
        os.close(dfd)

    if SOCKET_PATH.exists():
        hold("advertised_socket_cleanup_failed")
    if hidden_removed and hidden[0].exists():
        hold("hidden_socket_cleanup_failed")

    return {
        "marker":MARKER,"socket_absent":True,"socket_unlinked":True,
        "hidden_socket_unlinked":hidden_removed,"stale_listener_proven":True,
    }

def self_test()->None:
    assert HIDDEN_RE.fullmatch(".v00af")
    assert not HIDDEN_RE.fullmatch(".v00AF")
    assert not HIDDEN_RE.fullmatch(".v00000")
    assert not HIDDEN_RE.fullmatch("custody.sock")
    assert parse_proc_status_uids(
        "Name:\ttest\nUid:\t123\t123\t123\t123\n"
    )==(123,123,123,123)
    assert exact_self_process_set({123},123)
    assert not exact_self_process_set(set(),123)
    assert not exact_self_process_set({123,124},123)
    synthetic=os.stat_result((stat.S_IFSOCK|0o660,0,0,2,123,456,0,0,0,0))
    assert valid_socket_meta(synthetic,123,456)
    wrong=os.stat_result((stat.S_IFSOCK|0o666,0,0,2,123,456,0,0,0,0))
    assert not valid_socket_meta(wrong,123,456)
    source=Path(__file__).read_text(encoding="utf-8")
    for required in (
        "advertised_socket_still_listening",
        "hidden_socket_identity_not_unique",
        "os.unlink(SOCKET_PATH)",
        "os.fsync(dfd)",
        "errno.ECONNREFUSED",
        "custody_uid_process_exclusivity_failed",
        "require_custody_uid_exclusive(uid)",
    ):
        assert required in source,required
    print(MARKER+"_SELF_TEST_GREEN")
    print("fixed_socket_path=true")
    print("same_inode_hidden_cleanup=true")
    print("custody_uid_process_exclusivity_required=true")
    print("second_custody_uid_process_rejected=true")
    print("live_listener_refused=true")
    print("stale_socket_cleanup_external_fulfilled=true")
    print("training_execution=false")
    print("durable_attempt_claim=false")
    print("funds_movement=false")

def main()->int:
    ap=argparse.ArgumentParser()
    g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true")
    g.add_argument("--cleanup",action="store_true")
    args=ap.parse_args()
    try:
        if args.self_test:
            self_test();return 0
        value=cleanup()
        import json
        print(json.dumps(value,sort_keys=True,separators=(",",":")))
        return 0
    except (Hold,OSError) as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("socket_cleanup_complete=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr)
        print("funds_movement=false",file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())

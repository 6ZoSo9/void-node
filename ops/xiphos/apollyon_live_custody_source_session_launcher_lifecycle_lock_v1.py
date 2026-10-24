#!/usr/bin/env python3
from __future__ import annotations

import fcntl
import hashlib
import os
import signal
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import time

MARKER="VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_LAUNCHER_V2"
NATIVE_PREENTRY_MARKER="VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_PREENTRY_V2"
FIXED_LAUNCHER=Path(
    "/opt/void-apollyon-live-custody-binding-v2-preentry-v1/"
    "apollyon_live_custody_source_session_launcher_v2.py"
)
INSTALLED_SOURCE_ROOT=Path(
    "/opt/void-apollyon-live-custody-binding-v2-reviewed-v2"
)
RUN_PARENT=Path("/run")
NODE=Path("/opt/void-apollyon-node-runtime-v1/node")
RUNNER_REL="tools/apollyon-live-custody-source-session-runner-v2.mjs"
TRAINING_LIFECYCLE_LOCK_PATH=(
    FIXED_LAUNCHER.parent/".void-apollyon-training-lifecycle-lock-v1"
)
TRAINING_UNIT="void-apollyon-training-bus-isolation-v1.service"
REVIEWED_FILES={
    RUNNER_REL:"8c2c92055ab05c074653cee971e095934b5cb85c",
    "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py":
        "1fdb495aafa136119d50f41410b015930d9fc90d",
    "ops/xiphos/apollyon_designated_host_custody_evidence_readonly_v2.py":
        "2a285b5b1da2597a8b9eae6d08cd42d010bf7f71",
    "tools/apollyon-candidate-training-preclaim-v2.mjs":
        "d062fe9d8f70f731e157c8d9f835d3f936ac5d59",
    "tools/apollyon-v2-raw-collector-adapter-v1.mjs":
        "1cce303c25317b66e5f264f1b3f8c05712879cfe",
    "tools/apollyon-candidate-training-attempt-claim-contract-v2.mjs":
        "fd671b3303946143d927473e4ed04e7cd5030bac",
    "tools/apollyon-live-custody-service-source-session-binding-v2.mjs":
        "5ee36c89275c29b008094ad030b8664ed9d7b60b",
    "tools/apollyon-authorization-custody-launcher-v2.mjs":
        "d23ff045d8c355401fed499c6bcffd503ba4c7fd",
    "tools/apollyon-designated-host-custody-live-qualification-v2.mjs":
        "435e23d26fa32405e36d5dad17b033ea4ec910e0",
    "tools/apollyon-custody-host-policy-qualification-v2.mjs":
        "db5493a513a42780865e7194580eec3b770dc8e1",
    "tools/apollyon-custody-host-policy-qualification-v1.mjs":
        "6f34e79d94c502e31ca4923fd78922d4875550a5",
    "tools/apollyon-authorization-custody-client-v1.mjs":
        "fb31dbbda76c94f0ad08e38094c151a24a78b486",
    "tools/apollyon-authorization-custody-service-v1.mjs":
        "8961572ba5834371b1229f790a1960940fc74935",
    "tools/apollyon-authorization-custody-core-v1.mjs":
        "f9f18db5bbfeea466202ef0d7babe08c3c401d66",
    "scripts/apollyon_operator_authorization_packet_v1.mjs":
        "c224ebc4fcb332b70e83900a8e086e0257f31670",
    "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs":
        "f97fafb0148527ae3a954e2752faef8c7fc9e88e",
}
MAX_FILE_BYTES=2*1024*1024
FORBIDDEN_ENV=(
    "NODE_OPTIONS","NODE_PATH","LD_PRELOAD","LD_LIBRARY_PATH",
    "PYTHONPATH","PYTHONSTARTUP",
)

class Hold(RuntimeError):
    pass

class LauncherTerminationLatch:
    def __init__(self)->None:
        self.signum:int|None=None

    def handler(self,signum:int,_frame:object)->None:
        if self.signum is None:
            self.signum=int(signum)

RUNNER_TERMINATION_SIGNALS=(signal.SIGHUP,signal.SIGTERM)

def _install_runner_termination_handlers(
    latch:LauncherTerminationLatch,
)->dict[int,object]:
    previous:dict[int,object]={}
    try:
        for sig in RUNNER_TERMINATION_SIGNALS:
            key=int(sig)
            previous[key]=signal.getsignal(sig)
            signal.signal(sig,latch.handler)
    except (OSError,ValueError) as exc:
        for key,handler in previous.items():
            try:
                signal.signal(key,handler)
            except (OSError,ValueError):
                pass
        raise Hold(
            "apollyon_live_session_launcher_termination_handler_install_failed"
        ) from exc
    return previous

def _restore_runner_termination_handlers(
    previous:dict[int,object],
)->None:
    failure:BaseException|None=None
    for key,handler in previous.items():
        try:
            signal.signal(key,handler)
        except (OSError,ValueError) as exc:
            if failure is None:
                failure=exc
    if failure is not None:
        raise Hold(
            "apollyon_live_session_launcher_termination_handler_restore_failed"
        ) from failure

def _runner_termination_reason(
    latch:LauncherTerminationLatch,
)->str|None:
    if latch.signum is None:
        return None
    try:
        name=signal.Signals(latch.signum).name
    except ValueError:
        name=str(latch.signum)
    return "apollyon_live_session_launcher_termination_signal_received:"+name

def hold(reason:str)->None:
    raise Hold(reason)

def git_blob_sha1(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
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

def assert_direct_ancestors(pathname:Path,*,root_owned:bool)->None:
    absolute=Path(os.path.abspath(os.fspath(pathname)))
    parts=absolute.parts
    current=Path(parts[0])
    if root_owned:
        root_meta=os.lstat(current)
        if root_meta.st_uid!=0 or stat.S_IMODE(root_meta.st_mode)&0o022:
            hold("apollyon_live_session_launcher_untrusted_ancestor")
    for part in parts[1:]:
        current=current/part
        metadata=os.lstat(current)
        if stat.S_ISLNK(metadata.st_mode):
            hold("apollyon_live_session_launcher_symlink_ancestor")
        if current!=absolute and not stat.S_ISDIR(metadata.st_mode):
            hold("apollyon_live_session_launcher_ancestor_not_directory")
        if root_owned and (
            metadata.st_uid!=0 or stat.S_IMODE(metadata.st_mode)&0o022
        ):
            hold("apollyon_live_session_launcher_untrusted_ancestor")

def open_trusted_executable(
    pathname:Path,
    *,
    require_root_custody:bool,
)->int:
    absolute=Path(os.path.abspath(os.fspath(pathname)))
    if absolute!=pathname:
        hold("apollyon_live_session_launcher_node_invalid")
    assert_direct_ancestors(absolute,root_owned=require_root_custody)
    before=os.lstat(absolute)
    mode=stat.S_IMODE(before.st_mode)
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_nlink!=1 or not (mode&0o111) or mode&0o022 or
        mode&(stat.S_ISUID|stat.S_ISGID)
    ):
        hold("apollyon_live_session_launcher_node_untrusted")
    if require_root_custody and before.st_uid!=0:
        hold("apollyon_live_session_launcher_node_untrusted")
    fd=os.open(absolute,os.O_RDONLY|getattr(os,"O_NOFOLLOW",0))
    try:
        opened=os.fstat(fd)
        visible=os.lstat(absolute)
        if (
            not stat.S_ISREG(opened.st_mode) or
            not same_identity(before,opened) or
            not same_identity(opened,visible)
        ):
            hold("apollyon_live_session_launcher_node_identity_drift")
        return fd
    except Exception:
        os.close(fd)
        raise

def acquire_training_lifecycle_lock(
    pathname:Path=TRAINING_LIFECYCLE_LOCK_PATH,
    *,
    require_root_custody:bool=True,
    expected_mode:int=0o600,
)->int:
    absolute=Path(os.path.abspath(os.fspath(pathname)))
    if absolute!=pathname or Path(os.path.realpath(absolute))!=absolute:
        hold("apollyon_live_session_launcher_training_lifecycle_path_invalid")
    assert_direct_ancestors(
        absolute,
        root_owned=require_root_custody,
    )
    before=os.lstat(absolute)
    expected_uid=0 if require_root_custody else os.geteuid()
    expected_gid=0 if require_root_custody else os.getegid()
    if (
        not stat.S_ISREG(before.st_mode) or
        stat.S_ISLNK(before.st_mode) or
        before.st_uid!=expected_uid or
        before.st_gid!=expected_gid or
        before.st_nlink!=1 or
        before.st_size!=0 or
        stat.S_IMODE(before.st_mode)!=expected_mode
    ):
        hold("apollyon_live_session_launcher_training_lifecycle_inode_invalid")
    fd=os.open(
        absolute,
        os.O_RDONLY|
        getattr(os,"O_CLOEXEC",0)|
        getattr(os,"O_NOFOLLOW",0),
    )
    try:
        opened=os.fstat(fd)
        visible=os.lstat(absolute)
        if (
            not stat.S_ISREG(opened.st_mode) or
            not same_identity(before,opened) or
            not same_identity(opened,visible)
        ):
            hold("apollyon_live_session_launcher_training_lifecycle_inode_drift")
        try:
            fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise Hold(
                "apollyon_live_session_launcher_training_lifecycle_busy"
            ) from exc
        except OSError as exc:
            raise Hold(
                "apollyon_live_session_launcher_training_lifecycle_lock_failed"
            ) from exc
        after=os.fstat(fd)
        visible_after=os.lstat(absolute)
        if (
            not same_identity(opened,after) or
            not same_identity(after,visible_after)
        ):
            hold("apollyon_live_session_launcher_training_lifecycle_inode_drift")
        return fd
    except BaseException:
        try:
            os.close(fd)
        except OSError:
            pass
        raise

def release_training_lifecycle_lock(fd:int)->None:
    try:
        os.close(fd)
    except OSError as exc:
        raise Hold(
            "apollyon_live_session_launcher_training_lifecycle_close_failed"
        ) from exc

def read_reviewed_file(
    source_root:Path,
    relative:str,
    expected_blob:str,
    *,
    require_root_custody:bool,
)->bytes:
    root=Path(os.path.abspath(os.fspath(source_root)))
    target=root/Path(relative)
    if target!=Path(os.path.abspath(os.fspath(target))):
        hold("apollyon_live_session_launcher_source_path_invalid")
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise Hold("apollyon_live_session_launcher_source_escape") from exc
    assert_direct_ancestors(target,root_owned=require_root_custody)
    before=os.lstat(target)
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or
        before.st_nlink!=1 or before.st_size<1 or before.st_size>MAX_FILE_BYTES
    ):
        hold("apollyon_live_session_launcher_source_file_invalid")
    if require_root_custody and (
        before.st_uid!=0 or stat.S_IMODE(before.st_mode)&0o022
    ):
        hold("apollyon_live_session_launcher_source_file_untrusted")
    fd=os.open(target,os.O_RDONLY|getattr(os,"O_NOFOLLOW",0))
    try:
        opened=os.fstat(fd)
        if not same_identity(before,opened):
            hold("apollyon_live_session_launcher_source_open_drift")
        data=os.read(fd,before.st_size+1)
        after=os.fstat(fd)
        visible=os.lstat(target)
        if (
            len(data)!=before.st_size or not same_identity(opened,after) or
            not same_identity(after,visible)
        ):
            hold("apollyon_live_session_launcher_source_read_drift")
    finally:
        os.close(fd)
    if git_blob_sha1(data)!=expected_blob:
        hold("apollyon_live_session_launcher_source_blob_mismatch:"+relative)
    return data

def fsync_directory(pathname:Path)->None:
    fd=os.open(pathname,os.O_RDONLY|getattr(os,"O_DIRECTORY",0))
    try:
        os.fsync(fd)
    finally:
        os.close(fd)

def write_private_file(
    root:Path,
    relative:str,
    data:bytes,
    expected_blob:str,
)->Path:
    target=root/Path(relative)
    target.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    cursor=root
    for part in Path(relative).parts[:-1]:
        cursor=cursor/part
        os.chmod(cursor,0o700)
    fd=os.open(
        target,
        os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0),
        0o400,
    )
    try:
        total=0
        while total<len(data):
            total+=os.write(fd,data[total:])
        os.fsync(fd)
        os.fchmod(fd,0o400)
    finally:
        os.close(fd)
    if git_blob_sha1(target.read_bytes())!=expected_blob:
        hold("apollyon_live_session_launcher_private_blob_mismatch:"+relative)
    fsync_directory(target.parent)
    return target

def cleanup_private_tree(pathname:Path,prefix:str)->None:
    try:
        shutil.rmtree(pathname)
    except Exception as exc:
        raise Hold(prefix+os.fspath(pathname)) from exc

def materialize_reviewed_closure(
    source_root:Path,
    target_parent:Path,
    *,
    require_root_custody:bool,
)->Path:
    source_root=Path(os.path.abspath(os.fspath(source_root)))
    target_parent=Path(os.path.abspath(os.fspath(target_parent)))
    if require_root_custody:
        assert_direct_ancestors(source_root,root_owned=True)
        root_meta=os.lstat(source_root)
        if (
            not stat.S_ISDIR(root_meta.st_mode) or root_meta.st_uid!=0 or
            stat.S_IMODE(root_meta.st_mode)&0o022
        ):
            hold("apollyon_live_session_launcher_source_root_untrusted")
    materials:dict[str,bytes]={}
    private_root:Path|None=None
    try:
        for relative,expected in REVIEWED_FILES.items():
            materials[relative]=read_reviewed_file(
                source_root,relative,expected,
                require_root_custody=require_root_custody,
            )
        private_root=Path(tempfile.mkdtemp(
            prefix=".void-apollyon-live-session-v2-",
            dir=target_parent,
        ))
        os.chmod(private_root,0o700)
        for relative,expected in REVIEWED_FILES.items():
            write_private_file(
                private_root,relative,materials[relative],expected
            )
        fsync_directory(private_root)
        result=private_root
        private_root=None
        return result
    except BaseException:
        if private_root is not None:
            cleanup_private_tree(
                private_root,
                "apollyon_live_session_launcher_materialization_cleanup_failed:",
            )
        raise
    finally:
        for key,data in list(materials.items()):
            materials[key]=b"\0"*len(data)

def assert_installed_launcher_identity()->None:
    current=Path(os.path.abspath(__file__))
    if current!=FIXED_LAUNCHER:
        hold("apollyon_live_session_launcher_fixed_path_required")
    assert_direct_ancestors(current,root_owned=True)
    metadata=os.lstat(current)
    if (
        not stat.S_ISREG(metadata.st_mode) or stat.S_ISLNK(metadata.st_mode) or
        metadata.st_uid!=0 or metadata.st_nlink!=1 or
        stat.S_IMODE(metadata.st_mode)&0o022
    ):
        hold("apollyon_live_session_launcher_identity_untrusted")

def sanitized_environment(private_root:Path)->dict[str,str]:
    for key in FORBIDDEN_ENV:
        if os.environ.get(key):
            hold("apollyon_live_session_launcher_loader_environment_forbidden")
    root=Path(os.path.abspath(os.fspath(private_root)))
    metadata=os.lstat(root)
    if (
        root!=private_root or not stat.S_ISDIR(metadata.st_mode) or
        stat.S_ISLNK(metadata.st_mode) or metadata.st_uid!=os.geteuid() or
        stat.S_IMODE(metadata.st_mode)!=0o700 or Path(os.path.realpath(root))!=root
    ):
        hold("apollyon_live_session_launcher_private_root_invalid")
    return {
        "PATH":"/usr/sbin:/usr/bin:/sbin:/bin",
        "LC_ALL":"C",
        "TMPDIR":os.fspath(root),
        "VOID_APOLLYON_LIVE_SESSION_PRIVATE_CLOSURE":
            "VOID_APOLLYON_LIVE_SESSION_PRIVATE_CLOSURE_V2",
    }

TRAINING_STATE_PROPERTIES=(
    "LoadState","ActiveState","SubState","MainPID","UnitFileState",
)
TRAINING_REVERSE_LIFECYCLE_PROPERTIES=(
    "RequiredBy","WantedBy","UpheldBy","BoundBy","TriggeredBy",
    "ConflictedBy","StopPropagatedFrom",
)

def _run_training_systemctl(
    args:list[str],
    *,
    check:bool=True,
)->subprocess.CompletedProcess[str]:
    result=subprocess.run(
        ["/usr/bin/systemctl",*args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=10,
        env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"},
    )
    if check and result.returncode!=0:
        hold("apollyon_live_session_launcher_training_systemctl_failed")
    return result

def _training_service_state()->dict[str,str]:
    args=["show",TRAINING_UNIT,"--no-pager"]
    for name in TRAINING_STATE_PROPERTIES:
        args.extend(("-p",name))
    result=_run_training_systemctl(args)
    values={}
    for line in result.stdout.splitlines():
        key,sep,value=line.partition("=")
        if (
            sep!="=" or key not in TRAINING_STATE_PROPERTIES or
            key in values
        ):
            hold("apollyon_live_session_launcher_training_state_invalid")
        values[key]=value
    if set(values)!=set(TRAINING_STATE_PROPERTIES):
        hold("apollyon_live_session_launcher_training_state_incomplete")
    return values

def _verify_training_reverse_lifecycle_dependencies_absent(
)->dict[str,str]:
    args=["show",TRAINING_UNIT,"--no-pager"]
    for name in TRAINING_REVERSE_LIFECYCLE_PROPERTIES:
        args.extend(("-p",name))
    result=_run_training_systemctl(args)
    values:dict[str,str]={}
    for line in result.stdout.splitlines():
        key,sep,value=line.partition("=")
        if (
            sep!="=" or
            key not in TRAINING_REVERSE_LIFECYCLE_PROPERTIES or
            key in values
        ):
            hold(
                "apollyon_live_session_launcher_training_reverse_dependency_invalid"
            )
        values[key]=value
    if set(values)!=set(TRAINING_REVERSE_LIFECYCLE_PROPERTIES):
        hold(
            "apollyon_live_session_launcher_training_reverse_dependency_incomplete"
        )
    for name in TRAINING_REVERSE_LIFECYCLE_PROPERTIES:
        if values[name].strip():
            hold(
                "apollyon_live_session_launcher_training_reverse_dependency_present:"+
                name
            )
    return values


def _training_exactly_dormant(state:dict[str,str])->bool:
    return (
        state.get("LoadState")=="loaded" and
        state.get("ActiveState")=="inactive" and
        state.get("SubState")=="dead" and
        state.get("MainPID")=="0" and
        state.get("UnitFileState")=="static"
    )

def _require_training_dormant_before_runner()->dict[str,str]:
    first=_training_service_state()
    if not _training_exactly_dormant(first):
        hold("apollyon_live_session_launcher_training_not_dormant_before_runner")
    second=_training_service_state()
    if second!=first or not _training_exactly_dormant(second):
        hold("apollyon_live_session_launcher_training_dormancy_unstable_before_runner")
    return second

def _stop_training_after_runner_loss(timeout_seconds:float=5.0)->dict[str,str]:
    stop=_run_training_systemctl(["stop",TRAINING_UNIT],check=False)
    if stop.returncode!=0:
        hold("apollyon_live_session_launcher_training_stop_failed")
    deadline=time.monotonic()+max(0.0,timeout_seconds)
    while True:
        first=_training_service_state()
        if _training_exactly_dormant(first):
            second=_training_service_state()
            if second==first and _training_exactly_dormant(second):
                return second
        if time.monotonic()>=deadline:
            hold("apollyon_live_session_launcher_training_shutdown_unproven")
        time.sleep(0.05)

def _emit_live_authority()->None:
    rows=(
        MARKER,
        "mode=live-retired",
        "host_filesystem_mutation=false",
        "private_closure_filesystem_mutation=false",
        "git_mutation=false",
        "git_fetch=false",
        "service_process_action=false",
        "service_start_stop=false",
        "systemd_mutation=false",
        "credential_access=false",
        "operator_private_key_access=false",
        "wallet_or_signer_access=false",
        "transaction_construction=false",
        "transaction_signing=false",
        "transaction_broadcast=false",
        "chain_mutation=false",
        "economic_activation=false",
        "funds_movement=false",
        "authority_receipt_before_retired_hold=true",
    )
    try:
        for row in rows:
            sys.stderr.write(row+"\n")
        sys.stderr.flush()
    except (OSError,BrokenPipeError) as exc:
        raise Hold(
            "apollyon_live_session_launcher_authority_receipt_emit_failed"
        ) from exc

def execute_live(argv:list[str])->int:
    del argv
    if os.geteuid()!=0:
        hold("apollyon_live_session_launcher_root_required")
    if os.environ.get("VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY")!=(
        NATIVE_PREENTRY_MARKER
    ):
        hold("apollyon_live_session_launcher_native_preentry_required")
    _emit_live_authority()
    hold(
        "apollyon_live_session_launcher_activation_retired_"
        "atomic_ownership_required"
    )

def self_test()->None:
    repo_root=Path(__file__).resolve().parents[2]
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-live-session-launcher-test-"
    ) as td:
        top=Path(td)
        prepared=materialize_reviewed_closure(
            repo_root,top,require_root_custody=False,
        )
        try:
            runner=prepared/RUNNER_REL
            hosted_node=shutil.which("node")
            if not hosted_node:
                raise AssertionError("Node missing")
            result=subprocess.run(
                [hosted_node,os.fspath(runner),"--self-test"],
                env={
                    "PATH":"/usr/sbin:/usr/bin:/sbin:/bin",
                    "LC_ALL":"C",
                    "VOID_APOLLYON_LIVE_SESSION_PRIVATE_CLOSURE":
                        "VOID_APOLLYON_LIVE_SESSION_PRIVATE_CLOSURE_V2",
                },
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=False,
                timeout=30,
            )
            if result.returncode!=0:
                raise AssertionError(
                    "private runner self-test failed: "+result.stderr[-1000:]
                )
            if (
                "VOID_APOLLYON_LIVE_CUSTODY_SOURCE_SESSION_RUNNER_V2_SELF_TEST=GREEN"
                not in result.stdout
            ):
                raise AssertionError("runner self-test marker missing")
        finally:
            shutil.rmtree(prepared)
    print(MARKER+"_SELF_TEST=GREEN")
    print("complete_reviewed_closure_bound=true")
    print("runner_blob_sha1="+REVIEWED_FILES[RUNNER_REL])
    print("live_worktree_invocation_supported=false")
    print("live_activation_retired=true")
    print("service_process_action=false")
    print("service_start_stop=false")
    print("runner_invocation_from_live_path=false")
    print("training_service_shared_lifecycle_lock_helper_bound=true")
    print("training_service_reverse_lifecycle_helper_bound=true")
    print("replacement_stable_lifecycle_lock_inode=true")
    print("root_only_lifecycle_lock_inode_required=true")
    print("launcher_authority_receipt_before_retired_hold=true")
    print("durable_attempt_claim=false")
    print("training_execution=false")

def main()->int:
    try:
        if sys.argv[1:]==["--self-test"]:
            self_test()
            return 0
        return execute_live(sys.argv[1:])
    except Hold:
        raise
    except (OSError,subprocess.SubprocessError) as exc:
        raise Hold(
            "apollyon_live_session_launcher_operational_failure:"+
            type(exc).__name__
        ) from exc

def _emit_hold(reason:str)->None:
    print("HOLD="+reason,file=sys.stderr)
    print("service_enable=false",file=sys.stderr)
    print("host_filesystem_mutation=false",file=sys.stderr)
    print("private_closure_filesystem_mutation=false",file=sys.stderr)
    print("service_process_action=false",file=sys.stderr)
    print("service_start_stop=false",file=sys.stderr)
    print("live_activation_retired=true",file=sys.stderr)
    print("durable_attempt_claim=false",file=sys.stderr)
    print("training_execution=false",file=sys.stderr)
    print("candidate_weight_mutation=false",file=sys.stderr)
    print("operator_private_key_access=false",file=sys.stderr)
    print("transaction_signing=false",file=sys.stderr)
    print("funds_movement=false",file=sys.stderr)

def cli()->int:
    try:
        return main()
    except Hold as exc:
        _emit_hold(str(exc))
        return 2
    except KeyboardInterrupt:
        _emit_hold("apollyon_live_session_launcher_interrupted")
        return 2
    except (OSError,subprocess.SubprocessError) as exc:
        _emit_hold(
            "apollyon_live_session_launcher_operational_failure:"+
            type(exc).__name__
        )
        return 2

if __name__=="__main__":
    raise SystemExit(cli())

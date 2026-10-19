#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import types
from typing import Any

MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_V6R3_INSTALLED_QUALIFICATION_V1"
VERSION=1
FIXED_CHECKOUT=Path("/home/zoso/dev/void-node")

EXECUTOR_REL="ops/precision/void_buy_void_epoch2_live_composition_runner_policy_atomic_upgrade_v1.py"
EXECUTOR_PATH=FIXED_CHECKOUT/EXECUTOR_REL
EXECUTOR_BLOB="f0a992c0d4880268ff4ad8f180f73109477dd90d"
EXECUTOR_MARKER="VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_ATOMIC_UPGRADE_V1"

PLAN_REL="ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"
PLAN_BLOB="96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f"

LOCK_ID="voidbuye2runnerpollock6r3_bdd3e0b6fe28f2a6873920cdb1436914183e817c02b4d4ac9da130e3ec14b365"
CANDIDATE_ID="voidbuye2runnerpolcand6r3_c82e554cbc92600aa4a91f6d25c43e437526c670b1509a2c6435c7e8edf55a0d"
RUNNER_BLOB="7967778824f22baca976a59df75f9f808ebebfe2"
RUNNER_SHA256="a548ff17e37fc37d041a42faeaaf79645f843616e654700dafbf20ea652a0029"
RUNNER_BYTES=64_960
NATIVE_SHA256="85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8"
NATIVE_BYTES=726_976
RUNTIME_HEAD="4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"

GREEN_STATE="EPOCH2_V6R3_RUNNER_POLICY_ROOT_GREEN_WITH_V6R2_PREDECESSOR"
NEXT_ACTION="IMPLEMENT_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_SOURCE_RUNTIME_COMPAT_V3"

MAX_SOURCE_BYTES=2*1024*1024
MAX_NATIVE_OUTPUT=64*1024
SELF_TEST_TIMEOUT=10
HEX40=re.compile(r"^[0-9a-f]{40}$")


class QualificationError(RuntimeError):
    pass


def git_blob(raw:bytes)->str:
    return hashlib.sha1(
        b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw
    ).hexdigest()


def same_stat(a:os.stat_result,b:os.stat_result)->bool:
    return all(getattr(a,k)==getattr(b,k) for k in (
        "st_dev","st_ino","st_uid","st_gid","st_mode","st_nlink",
        "st_size","st_mtime_ns","st_ctime_ns",
    ))


def direct_source_bytes(path:Path)->bytes:
    try:
        before=path.lstat()
    except OSError as exc:
        raise QualificationError("executor_source_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode)
        or before.st_nlink!=1 or before.st_size<1
        or before.st_size>MAX_SOURCE_BYTES
    ):
        raise QualificationError("executor_source_metadata_invalid")
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    try:
        opened=os.fstat(fd)
        if not same_stat(before,opened):
            raise QualificationError("executor_source_rebound")
        chunks=[]; remaining=before.st_size
        while remaining:
            chunk=os.read(fd,min(64*1024,remaining))
            if not chunk:
                raise QualificationError("executor_source_short_read")
            chunks.append(chunk); remaining-=len(chunk)
        if os.read(fd,1):
            raise QualificationError("executor_source_grew")
        after=os.fstat(fd); visible=path.lstat()
        if not same_stat(opened,after) or not same_stat(after,visible):
            raise QualificationError("executor_source_changed")
    finally:
        os.close(fd)
    raw=b"".join(chunks)
    if git_blob(raw)!=EXECUTOR_BLOB:
        raise QualificationError("executor_source_blob_mismatch")
    return raw


def load_executor()->types.ModuleType:
    raw=direct_source_bytes(EXECUTOR_PATH)
    module=types.ModuleType("void_v6r3_atomic_upgrade_exact")
    module.__file__=str(EXECUTOR_PATH)
    module.__package__=""
    try:
        exec(
            compile(raw,str(EXECUTOR_PATH),"exec",dont_inherit=True,optimize=0),
            module.__dict__,
        )
    except Exception as exc:
        raise QualificationError("executor_source_execution_failed") from exc
    required={
        "MARKER":EXECUTOR_MARKER,
        "PLAN_BLOB":PLAN_BLOB,
        "LOCK_ID":LOCK_ID,
        "CANDIDATE_ID":CANDIDATE_ID,
        "RUNNER_BLOB":RUNNER_BLOB,
        "NEW_RUNNER_SHA256":RUNNER_SHA256,
        "NEW_RUNNER_BYTES":RUNNER_BYTES,
        "NATIVE_SHA256":NATIVE_SHA256,
        "NATIVE_BYTES":NATIVE_BYTES,
        "RUNTIME_HEAD":RUNTIME_HEAD,
        "GREEN_STATE":GREEN_STATE,
    }
    for key,want in required.items():
        if getattr(module,key,None)!=want:
            raise QualificationError("executor_contract_mismatch:"+key)
    for name in (
        "current_plan","build_policy","verify_root","verify_v4_root",
        "hash_exact_file",
    ):
        if not callable(getattr(module,name,None)):
            raise QualificationError("executor_callable_missing:"+name)
    return module


def stat_record(st:os.stat_result)->dict[str,Any]:
    return {
        "dev":st.st_dev,"ino":st.st_ino,"uid":st.st_uid,"gid":st.st_gid,
        "mode":format(stat.S_IMODE(st.st_mode),"04o"),"nlink":st.st_nlink,
        "bytes":st.st_size,"mtime_ns":st.st_mtime_ns,"ctime_ns":st.st_ctime_ns,
    }


def file_record(path:Path,digest:str)->dict[str,Any]:
    return {**stat_record(path.lstat()),"sha256":digest}


def snapshot(executor:types.ModuleType,expected_source_head:str)->dict[str,Any]:
    try:
        plan_id,body=executor.current_plan()
    except Exception as exc:
        raise QualificationError("current_plan_failed") from exc
    if (
        not isinstance(body,dict)
        or body.get("accepted_lock_id")!=LOCK_ID
        or body.get("accepted_candidate_id")!=CANDIDATE_ID
        or body.get("runtime_head")!=RUNTIME_HEAD
        or body.get("new_runner_git_blob_sha1")!=RUNNER_BLOB
        or body.get("new_runner_sha256")!=RUNNER_SHA256
        or body.get("new_runner_bytes")!=RUNNER_BYTES
        or body.get("protected_state")!=GREEN_STATE
        or body.get("filesystem_write") is not False
        or body.get("runner_execution") is not False
        or body.get("credential_access") is not False
        or body.get("transaction") is not False
        or body.get("funds_movement") is not False
    ):
        raise QualificationError("current_plan_contract_invalid")
    source=body.get("source")
    if (
        not isinstance(source,dict)
        or source.get("head")!=expected_source_head
        or source.get("branch")!="main"
        or not isinstance(source.get("tree"),str)
        or HEX40.fullmatch(source["tree"]) is None
    ):
        raise QualificationError("source_generation_mismatch")

    new_policy=executor.build_policy(
        body,executor.NEW_RUNNER_SHA256,executor.NEW_RUNNER_BYTES
    )
    old_policy=executor.build_policy(
        body,executor.OLD_RUNNER_SHA256,executor.OLD_RUNNER_BYTES
    )
    if hashlib.sha256(new_policy).hexdigest()!=body.get("new_policy_sha256"):
        raise QualificationError("new_policy_plan_mismatch")
    if hashlib.sha256(old_policy).hexdigest()!=body.get("old_policy_sha256"):
        raise QualificationError("old_policy_plan_mismatch")

    try:
        executor.verify_root(
            executor.INSTALL_ROOT,
            runner_sha256=executor.NEW_RUNNER_SHA256,
            runner_bytes=executor.NEW_RUNNER_BYTES,
            policy=new_policy,
        )
        executor.verify_root(
            executor.PREDECESSOR_V6R2_ROOT,
            runner_sha256=executor.OLD_RUNNER_SHA256,
            runner_bytes=executor.OLD_RUNNER_BYTES,
            policy=old_policy,
        )
        executor.verify_v4_root()
    except Exception as exc:
        raise QualificationError("installed_root_verification_failed") from exc

    current_native=executor.INSTALL_ROOT/executor.NATIVE_NAME
    current_runner=executor.INSTALL_ROOT/executor.RUNNER_NAME
    current_policy=executor.INSTALL_ROOT/executor.POLICY_NAME
    p6_native=executor.PREDECESSOR_V6R2_ROOT/executor.NATIVE_NAME
    p6_runner=executor.PREDECESSOR_V6R2_ROOT/executor.RUNNER_NAME
    p6_policy=executor.PREDECESSOR_V6R2_ROOT/executor.POLICY_NAME
    p4_native=executor.PREDECESSOR_V4_ROOT/executor.NATIVE_NAME
    p4_runner=executor.PREDECESSOR_V4_ROOT/executor.RUNNER_NAME
    p4_policy=executor.PREDECESSOR_V4_ROOT/executor.POLICY_NAME

    return {
        "plan_id":plan_id,
        "source":source,
        "node":body["node"],
        "protected_state":GREEN_STATE,
        "policy_sha256":hashlib.sha256(new_policy).hexdigest(),
        "install_root":stat_record(executor.INSTALL_ROOT.lstat()),
        "native":file_record(current_native,NATIVE_SHA256),
        "runner":file_record(current_runner,RUNNER_SHA256),
        "policy":file_record(current_policy,hashlib.sha256(new_policy).hexdigest()),
        "predecessor_v6r2_root":stat_record(executor.PREDECESSOR_V6R2_ROOT.lstat()),
        "predecessor_v6r2_native":file_record(p6_native,NATIVE_SHA256),
        "predecessor_v6r2_runner":file_record(p6_runner,executor.OLD_RUNNER_SHA256),
        "predecessor_v6r2_policy":file_record(
            p6_policy,hashlib.sha256(old_policy).hexdigest()
        ),
        "predecessor_v4_root":stat_record(executor.PREDECESSOR_V4_ROOT.lstat()),
        "predecessor_v4_native":file_record(p4_native,executor.V4_NATIVE_SHA256),
        "predecessor_v4_runner":file_record(p4_runner,executor.V4_RUNNER_SHA256),
        "predecessor_v4_policy":file_record(p4_policy,executor.V4_POLICY_SHA256),
    }


def native_matches(expected:dict[str,Any],st:os.stat_result)->bool:
    return all((
        expected.get("dev")==st.st_dev,
        expected.get("ino")==st.st_ino,
        expected.get("uid")==st.st_uid,
        expected.get("gid")==st.st_gid,
        expected.get("mode")==format(stat.S_IMODE(st.st_mode),"04o"),
        expected.get("nlink")==st.st_nlink,
        expected.get("bytes")==st.st_size,
    ))


def hash_fd(fd:int,size:int)->str:
    h=hashlib.sha256(); remaining=size
    os.lseek(fd,0,os.SEEK_SET)
    while remaining:
        chunk=os.read(fd,min(1024*1024,remaining))
        if not chunk:
            raise QualificationError("native_retained_fd_short_read")
        h.update(chunk); remaining-=len(chunk)
    if os.read(fd,1):
        raise QualificationError("native_retained_fd_grew")
    os.lseek(fd,0,os.SEEK_SET)
    return h.hexdigest()


def run_native_self_test(
    executor:types.ModuleType,expected_native:dict[str,Any]
)->tuple[str,str]:
    path=executor.INSTALL_ROOT/executor.NATIVE_NAME
    try:
        visible_before=path.lstat()
        fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    except OSError as exc:
        raise QualificationError("native_self_test_open_failed") from exc
    try:
        opened=os.fstat(fd)
        if not same_stat(visible_before,opened) or not native_matches(
            expected_native,opened
        ):
            raise QualificationError("native_self_test_generation_mismatch")
        if hash_fd(fd,opened.st_size)!=NATIVE_SHA256:
            raise QualificationError("native_self_test_digest_mismatch")
        exec_path="/proc/self/fd/"+str(fd)
        try:
            cp=subprocess.run(
                [exec_path,"--self-test"],
                stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,text=True,encoding="utf-8",errors="strict",
                env={"PATH":"/usr/bin:/bin","LANG":"C","LC_ALL":"C"},
                cwd="/",timeout=SELF_TEST_TIMEOUT,check=False,
                close_fds=True,pass_fds=(fd,),
            )
        except (OSError,subprocess.SubprocessError,UnicodeError) as exc:
            raise QualificationError("native_self_test_execution_failed") from exc
        opened_after=os.fstat(fd); visible_after=path.lstat()
        if (
            not same_stat(opened,opened_after)
            or not same_stat(opened_after,visible_after)
            or not native_matches(expected_native,visible_after)
        ):
            raise QualificationError("native_generation_changed_during_self_test")
    finally:
        os.close(fd)
    if cp.returncode!=0:
        raise QualificationError("native_self_test_nonzero:"+str(cp.returncode))
    if cp.stderr!="":
        raise QualificationError("native_self_test_unexpected_stderr")
    encoded=cp.stdout.encode("utf-8")
    if len(encoded)<1 or len(encoded)>MAX_NATIVE_OUTPUT:
        raise QualificationError("native_self_test_output_invalid")
    required={
        "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_SELF_TEST_GREEN",
        "fixed_self_path=true","fixed_runner_path=true","fixed_node_path=true",
        "root_owned_policy_required=true","runner_sha256_policy_bound=true",
        "node_sha256_policy_bound=true","expected_head_policy_bound=true",
        "runner_descriptor_retained=true","node_descriptor_fexecve=true",
        "stdin_javascript_source_forbidden=true",
        "credential_content_access=false","transaction=false",
        "public_presale_activation=false","funds_movement=false",
    }
    missing=sorted(required-set(cp.stdout.splitlines()))
    if missing:
        raise QualificationError("native_self_test_marker_missing:"+missing[0])
    return cp.stdout,"sha256:"+hashlib.sha256(encoded).hexdigest()


def collect(expected_source_head:str)->dict[str,Any]:
    if os.geteuid()!=0:
        raise QualificationError("root_required_for_installed_qualification")
    if HEX40.fullmatch(expected_source_head) is None:
        raise QualificationError("expected_source_head_invalid")
    executor=load_executor()
    before=snapshot(executor,expected_source_head)
    first,first_sha=run_native_self_test(executor,before["native"])
    middle=snapshot(executor,expected_source_head)
    second,second_sha=run_native_self_test(executor,middle["native"])
    after=snapshot(executor,expected_source_head)
    if before!=middle or middle!=after:
        raise QualificationError("installed_generation_changed_during_qualification")
    if first!=second or first_sha!=second_sha:
        raise QualificationError("native_self_test_output_changed")
    return {
        "marker":MARKER,"version":VERSION,"read_only":True,
        "root_execution_required":True,
        "expected_source_head":expected_source_head,
        "runtime_head":RUNTIME_HEAD,
        "executor_source_git_blob_sha1":EXECUTOR_BLOB,
        "plan_source_git_blob_sha1":PLAN_BLOB,
        "accepted_lock_id":LOCK_ID,"accepted_candidate_id":CANDIDATE_ID,
        "plan_id":before["plan_id"],
        "protected_state":GREEN_STATE,
        "installed_generation_stable":True,
        "source_generation_bound":True,
        "node_generation_bound":True,
        "predecessor_v6r2_retained":True,
        "predecessor_v6r2_stable":True,
        "predecessor_v4_retained":True,
        "predecessor_v4_stable":True,
        "native_self_test_execution":True,
        "native_self_test_descriptor_bound":True,
        "native_self_test_count":2,
        "native_self_test_stable":True,
        "native_self_test_sha256":first_sha,
        "native_sha256":NATIVE_SHA256,"native_bytes":NATIVE_BYTES,
        "runner_git_blob_sha1":RUNNER_BLOB,
        "runner_sha256":RUNNER_SHA256,"runner_bytes":RUNNER_BYTES,
        "policy_sha256":before["policy_sha256"],
        "runner_execution":False,"live_composition_execution":False,
        "service_mutation":False,"systemd_mutation":False,
        "credential_access":False,"private_key_access":False,
        "wallet_or_signer_access":False,"signing":False,
        "transaction":False,"rpc_call":False,"payment_acceptance":False,
        "public_presale_activation":False,"wc_void_market_activation":False,
        "treasury_liquidity_action":False,"funds_movement":False,
        "production_host_evidence_authority":False,
        "next_action":NEXT_ACTION,
    }


def self_test()->None:
    assert EXECUTOR_BLOB=="f0a992c0d4880268ff4ad8f180f73109477dd90d"
    assert PLAN_BLOB=="96de5ac0c622f12d5ad44b6aafb5c195d5eaef4f"
    assert LOCK_ID.startswith("voidbuye2runnerpollock6r3_")
    assert CANDIDATE_ID.startswith("voidbuye2runnerpolcand6r3_")
    assert RUNNER_BYTES==64_960
    assert NEXT_ACTION.startswith("IMPLEMENT_EPOCH2_DORMANT_CANDIDATE_")
    print(MARKER+"_SELF_TEST_GREEN")
    print("executor_source_blob_bound=true")
    print("plan_source_blob_bound=true")
    print("accepted_lock_bound=true")
    print("accepted_candidate_bound=true")
    print("triple_installed_snapshot_required=true")
    print("double_descriptor_bound_native_self_test_required=true")
    print("v6r2_predecessor_verification_required=true")
    print("v4_predecessor_verification_required=true")
    print("runner_execution=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")


def plan()->None:
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("root_required_for_run=true")
    print("executor_source_blob="+EXECUTOR_BLOB)
    print("plan_source_blob="+PLAN_BLOB)
    print("accepted_lock_id="+LOCK_ID)
    print("accepted_candidate_id="+CANDIDATE_ID)
    print("runtime_head="+RUNTIME_HEAD)
    print("triple_installed_snapshot_required=true")
    print("double_descriptor_bound_native_self_test_required=true")
    print("runner_execution=false")
    print("live_composition_execution=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_V6R3_INSTALLED_READ_ONLY_QUALIFICATION")


def main()->int:
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test",action="store_true")
    mode.add_argument("--plan",action="store_true")
    mode.add_argument("--run",action="store_true")
    parser.add_argument("--expected-source-head",default="")
    args=parser.parse_args()
    if args.self_test:
        self_test(); return 0
    if args.plan:
        plan(); return 0
    if not args.expected_source_head:
        raise QualificationError("expected_source_head_required")
    result=collect(args.expected_source_head)
    print(MARKER)
    for key,value in result.items():
        if key=="marker": continue
        if isinstance(value,bool): rendered=str(value).lower()
        else: rendered=str(value)
        print(key+"="+rendered)
    print("result_json="+json.dumps(
        result,sort_keys=True,separators=(",",":"),ensure_ascii=True
    ))
    return 0


if __name__=="__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(MARKER)
        print("status=HOLD")
        reason=(
            str(exc) if isinstance(exc,QualificationError)
            else type(exc).__name__+":"+str(exc)
        )
        print("reason="+re.sub(r"[^A-Za-z0-9_:./,-]","_",reason[:1000]))
        print("native_self_test_execution_state=unknown_or_partial_if_started")
        print("runner_execution=false")
        print("live_composition_execution=false")
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

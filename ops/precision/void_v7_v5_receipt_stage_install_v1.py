#!/usr/bin/env python3
# Privileged apply must fail before importing any source-tree-shadowable module
# unless Python was entered through the reviewed isolated/safe-path boundary.
import sys as _bootstrap_sys

_BOOTSTRAP_MARKER="VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1"
if (
    _bootstrap_sys.flags.isolated != 1
    or not getattr(_bootstrap_sys.flags, "safe_path", False)
    or _bootstrap_sys.flags.optimize != 0
    or not __debug__
):
    if __name__ == "__main__":
        print(_BOOTSTRAP_MARKER)
        print("status=HOLD")
        print("reason=python_isolated_unoptimized_mode_required")
        print("filesystem_write=false")
        print("fixed_receipt_mutation=false")
        raise SystemExit(2)
    raise RuntimeError("python_isolated_unoptimized_mode_required")

import argparse
import hashlib
import json
import os
import pathlib
import re
import stat
from typing import Any

MARKER=_BOOTSTRAP_MARKER
PLAN_SCHEMA="void_v7_v5_receipt_stage_install_plan_v1"
PLAN_PREFIX="voidv7v5receiptstageinstall1_"
CONFIRM_TOKEN="INSTALL_VOID_V7_V5_RECEIPT_STAGE_V1_CREATE_ONLY"

ROOT=pathlib.Path(__file__).resolve().parents[2]
FIXED_RECEIPT=pathlib.Path(
    "/var/lib/void-source-finality-v7/deployment-receipt.json"
)
TARGET=pathlib.Path(
    "/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5"
)
RESERVED_PREDECESSOR=pathlib.Path(
    "/var/lib/void-source-finality-v7/deployment-receipt-v4-predecessor.json"
)

EXPECTED_FIXED_SHA256=(
    "da43b974970fdfee00f914d61064bee86d192ad9b67769f52696e1fbd05bfa87"
)
EXPECTED_FIXED_BYTES=1136
EXPECTED_FIXED_RECEIPT_ID=(
    "voidbsfdep1_3f128abf9c9d9c2fc97c8d3620be212b12542b0e57a149672bdb988efee1d5a1"
)

EXPECTED_V5_RECEIPT_ID=(
    "voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37"
)
EXPECTED_V5_SHA256=(
    "12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"
)
EXPECTED_V5_BYTES=1136

V5_RECEIPT_BYTES=b'''{
  "accepted_enforcement_lock_git_blob_sha1": "bc1b2f4095315861db7a257d4cc3c80a9f112530",
  "accepted_enforcement_lock_id": "voidbenfl1_562f6f5b48364b7c7af3817f0d26d11c50c318d831d0f40905a283eaadf07637",
  "accepted_enforcement_lock_sha256": "a0b334530db1c55c2e1be651f1ce8504c90c8e6a50722c2a0b0b2c6e440f0c4d",
  "accepted_enforcement_set_sha256": "e72f512b0006eef7cec7325f39c56823eb3c878d7f8452a08c717478b7c8ac45",
  "candidate_enforcement_identity_accepted": true,
  "complete_executable_closure_verified": true,
  "marker": "VOID_BUY_VOID_SOURCE_FINALITY_DEPLOYMENT_RECEIPT_V1",
  "process_source_branch": "main",
  "process_source_commit": "be2fbe41aaba291d3f874b9de52bcb87336307f5",
  "process_source_marker": "VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",
  "process_source_tree": "749877d2320ecee9d659720b32e4726a0c42d697",
  "reviewed_source_file_count": "10",
  "reviewed_source_files_sha256": "18d63ea70fc3a7a4d0ce3d427205717e2c72c40eb145fe677eb4ab6e869acb24",
  "status": "DEPLOYED_SOURCE_FINALITY_GENERATION_ACCEPTED",
  "version": 1,
  "receipt_id": "voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37"
}
'''

class StageError(RuntimeError):
    pass

def canonical(value:Any)->bytes:
    if value is None:return b"null"
    if value is True:return b"true"
    if value is False:return b"false"
    if isinstance(value,int) and not isinstance(value,bool):
        return str(value).encode("ascii")
    if isinstance(value,str):
        return json.dumps(value,ensure_ascii=True,separators=(",",":")).encode("ascii")
    if isinstance(value,list):
        return b"["+b",".join(canonical(x) for x in value)+b"]"
    if isinstance(value,dict):
        return b"{"+b",".join(
            canonical(k)+b":"+canonical(value[k]) for k in sorted(value)
        )+b"}"
    raise StageError("canonical_value_invalid")

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def _meta(path:pathlib.Path)->dict[str,Any]:
    try: st=path.lstat()
    except FileNotFoundError:return {"exists":False}
    return {
        "exists":True,
        "kind":(
            "regular" if stat.S_ISREG(st.st_mode)
            else "directory" if stat.S_ISDIR(st.st_mode)
            else "symlink" if stat.S_ISLNK(st.st_mode)
            else "other"
        ),
        "dev":st.st_dev,"ino":st.st_ino,"uid":st.st_uid,"gid":st.st_gid,
        "mode":stat.S_IMODE(st.st_mode),"nlink":st.st_nlink,"size":st.st_size,
        "mtime_ns":st.st_mtime_ns,"ctime_ns":st.st_ctime_ns,
    }

def _same_generation(a:dict[str,Any],b:dict[str,Any],label:str)->None:
    for key in ("dev","ino","uid","gid","mode","nlink","size","mtime_ns","ctime_ns"):
        if a.get(key)!=b.get(key):
            raise StageError(label+"_generation_changed:"+key)

def _read_direct_regular(path:pathlib.Path,max_bytes:int,label:str)->bytes:
    before=_meta(path)
    if (
        not before.get("exists") or before.get("kind")!="regular"
        or before.get("nlink")!=1 or before.get("size",0)<=0
        or before.get("size",0)>max_bytes
    ):
        raise StageError(label+"_shape_invalid")
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        opened=os.fstat(fd)
        opened_meta={
            "dev":opened.st_dev,"ino":opened.st_ino,"uid":opened.st_uid,
            "gid":opened.st_gid,"mode":stat.S_IMODE(opened.st_mode),
            "nlink":opened.st_nlink,"size":opened.st_size,
            "mtime_ns":opened.st_mtime_ns,"ctime_ns":opened.st_ctime_ns,
        }
        _same_generation(before,opened_meta,label+"_open")
        raw=bytearray()
        while len(raw)<opened.st_size:
            part=os.read(fd,min(64*1024,opened.st_size-len(raw)))
            if not part:raise StageError(label+"_short_read")
            raw.extend(part)
        if os.read(fd,1):raise StageError(label+"_grew")
        after=os.fstat(fd)
        after_meta={
            "dev":after.st_dev,"ino":after.st_ino,"uid":after.st_uid,
            "gid":after.st_gid,"mode":stat.S_IMODE(after.st_mode),
            "nlink":after.st_nlink,"size":after.st_size,
            "mtime_ns":after.st_mtime_ns,"ctime_ns":after.st_ctime_ns,
        }
        visible=_meta(path)
        _same_generation(opened_meta,after_meta,label+"_fd")
        _same_generation(after_meta,visible,label+"_visible")
        return bytes(raw)
    finally:
        os.close(fd)

def _validate_receipt_bytes(raw:bytes,expected_id:str,expected_sha:str,expected_bytes:int,label:str)->dict[str,Any]:
    if len(raw)!=expected_bytes:raise StageError(label+"_bytes_mismatch")
    if sha256(raw)!=expected_sha:raise StageError(label+"_sha256_mismatch")
    try:value=json.loads(raw.decode("utf-8","strict"))
    except (UnicodeError,json.JSONDecodeError) as exc:
        raise StageError(label+"_json_invalid") from exc
    if not isinstance(value,dict) or value.get("receipt_id")!=expected_id:
        raise StageError(label+"_receipt_id_mismatch")
    return value

def _verify_fixed_receipt()->dict[str,Any]:
    raw=_read_direct_regular(FIXED_RECEIPT,64*1024,"fixed_receipt")
    value=_validate_receipt_bytes(
        raw,EXPECTED_FIXED_RECEIPT_ID,EXPECTED_FIXED_SHA256,
        EXPECTED_FIXED_BYTES,"fixed_receipt",
    )
    meta=_meta(FIXED_RECEIPT)
    if (
        meta.get("uid")!=0 or meta.get("gid")!=0
        or meta.get("mode")!=0o444 or meta.get("nlink")!=1
    ):
        raise StageError("fixed_receipt_custody_invalid")
    return {"sha256":sha256(raw),"bytes":len(raw),"receipt_id":value["receipt_id"],"metadata":meta}

def _verify_target_exact()->dict[str,Any]:
    raw=_read_direct_regular(TARGET,64*1024,"target_receipt")
    value=_validate_receipt_bytes(
        raw,EXPECTED_V5_RECEIPT_ID,EXPECTED_V5_SHA256,
        EXPECTED_V5_BYTES,"target_receipt",
    )
    meta=_meta(TARGET)
    if (
        meta.get("uid")!=0 or meta.get("gid")!=0
        or meta.get("mode")!=0o444 or meta.get("nlink")!=1
    ):
        raise StageError("target_receipt_custody_invalid")
    return {"sha256":sha256(raw),"bytes":len(raw),"receipt_id":value["receipt_id"],"metadata":meta}

def _require_parent_custody(parent:pathlib.Path)->list[list[Any]]:
    rows=[]
    current=parent
    while True:
        meta=_meta(current)
        if (
            not meta.get("exists") or meta.get("kind")!="directory"
            or meta.get("uid")!=0 or meta.get("gid")!=0
            or int(meta.get("mode",0))&0o022
        ):
            raise StageError("ancestor_custody_invalid:"+os.fspath(current))
        rows.append([
            os.fspath(current),meta["dev"],meta["ino"],meta["uid"],meta["gid"],
            meta["mode"],meta["nlink"],
        ])
        if current==current.parent:break
        current=current.parent
    return rows

def _target_state()->str:
    if RESERVED_PREDECESSOR.exists() or RESERVED_PREDECESSOR.is_symlink():
        return "HOLD_RESERVED_PREDECESSOR_PRESENT"
    if not (TARGET.exists() or TARGET.is_symlink()):
        return "READY"
    try:_verify_target_exact()
    except (StageError,OSError,UnicodeError):
        return "HOLD_TARGET_CONFLICT"
    return "GREEN"

def collect_plan()->dict[str,Any]:
    fixed=_verify_fixed_receipt()
    parent_rows=_require_parent_custody(TARGET.parent)
    state=_target_state()
    body={
        "schema":PLAN_SCHEMA,
        "version":1,
        "fixed_receipt":{
            "path":os.fspath(FIXED_RECEIPT),
            "sha256":fixed["sha256"],
            "bytes":fixed["bytes"],
            "receipt_id":fixed["receipt_id"],
        },
        "target":os.fspath(TARGET),
        "reserved_predecessor":os.fspath(RESERVED_PREDECESSOR),
        "target_parent_custody":parent_rows,
        "expected_v5_receipt_id":EXPECTED_V5_RECEIPT_ID,
        "expected_v5_receipt_sha256":EXPECTED_V5_SHA256,
        "expected_v5_receipt_bytes":EXPECTED_V5_BYTES,
        "protected_state":state,
        "create_only":True,
        "fixed_receipt_mutation":False,
        "fixed_receipt_exchange_authority":False,
        "transition_journal_mutation":False,
        "consumer_fence_mutation":False,
        "service_mutation":False,
        "credential_access":False,
        "signing":False,
        "transaction":False,
        "payment_acceptance":False,
        "public_presale_activation":False,
        "funds_movement":False,
    }
    return {"body":body,"plan_id":PLAN_PREFIX+sha256(canonical(body))}

def _require_privileged_source_custody()->None:
    if os.getuid()!=0 or os.geteuid()!=0:
        raise StageError("root_required_for_apply")
    source_root=ROOT.resolve(strict=True)
    if source_root!=ROOT:
        raise StageError("privileged_source_root_alias_forbidden")
    current=source_root
    while True:
        meta=_meta(current)
        if (
            not meta.get("exists") or meta.get("kind")!="directory"
            or meta.get("uid")!=0 or meta.get("gid")!=0
            or int(meta.get("mode",0))&0o022
        ):
            raise StageError("privileged_source_ancestor_custody_invalid:"+os.fspath(current))
        if current==current.parent:break
        current=current.parent
    tool=pathlib.Path(__file__).resolve(strict=True)
    if ROOT not in tool.parents:
        raise StageError("privileged_tool_outside_source_root")
    meta=_meta(tool)
    if (
        meta.get("kind")!="regular" or meta.get("uid")!=0 or meta.get("gid")!=0
        or int(meta.get("mode",0))&0o022 or meta.get("nlink")!=1
    ):
        raise StageError("privileged_tool_custody_invalid")

def _install_create_or_exact_match()->tuple[bool,bool]:
    parent=TARGET.parent
    if not parent.is_dir() or parent.is_symlink():
        raise StageError("target_parent_invalid")
    _require_parent_custody(parent)
    if RESERVED_PREDECESSOR.exists() or RESERVED_PREDECESSOR.is_symlink():
        raise StageError("reserved_predecessor_present")
    if TARGET.exists() or TARGET.is_symlink():
        _verify_target_exact()
        return False,True

    leaf=TARGET.name
    if not re.fullmatch(r"[A-Za-z0-9._-]{3,160}",leaf):
        raise StageError("target_leaf_invalid")
    temp=parent/("."+leaf+".tmp-"+str(os.getpid()))
    if temp.exists() or temp.is_symlink():
        raise StageError("temp_preexisting")
    fd=-1
    try:
        fd=os.open(
            temp,
            os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,
            0o600,
        )
        view=memoryview(V5_RECEIPT_BYTES)
        offset=0
        while offset<len(view):
            wrote=os.write(fd,view[offset:])
            if wrote<=0:raise StageError("stage_short_write")
            offset+=wrote
        os.fsync(fd)
        os.fchown(fd,0,0)
        os.fchmod(fd,0o444)
        os.fsync(fd)
        os.close(fd);fd=-1
        try:
            os.link(temp,TARGET,follow_symlinks=False)
        except FileExistsError:
            _verify_target_exact()
            os.unlink(temp)
            dirfd=os.open(parent,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW)
            try:os.fsync(dirfd)
            finally:os.close(dirfd)
            return False,True
        os.unlink(temp)
        dirfd=os.open(parent,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW)
        try:os.fsync(dirfd)
        finally:os.close(dirfd)
        _verify_target_exact()
        return True,False
    finally:
        if fd>=0:os.close(fd)
        if temp.exists() and not temp.is_symlink():
            try:os.unlink(temp)
            except OSError:pass

def source_plan()->None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("trusted_root_launcher_required=true")
    print("target="+os.fspath(TARGET))
    print("create_or_exact_match_only=true")
    print("fixed_receipt_mutation=false")
    print("fixed_receipt_exchange_authority=false")
    print("transition_journal_mutation=false")
    print("consumer_fence_mutation=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("transaction=false")
    print("funds_movement=false")

def plan()->None:
    value=collect_plan()
    body=value["body"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("plan_id="+value["plan_id"])
    print("protected_state="+body["protected_state"])
    print("fixed_receipt_sha256="+body["fixed_receipt"]["sha256"])
    print("target="+body["target"])
    print("expected_v5_receipt_id="+EXPECTED_V5_RECEIPT_ID)
    print("expected_v5_receipt_sha256="+EXPECTED_V5_SHA256)
    print("expected_v5_receipt_bytes="+str(EXPECTED_V5_BYTES))
    print("filesystem_write=false")
    print("fixed_receipt_mutation=false")
    print("fixed_receipt_exchange_authority=false")
    print("transition_journal_mutation=false")
    print("consumer_fence_mutation=false")
    print("service_mutation=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print("next_action="+(
        "SEPARATELY_QUALIFY_V7_V5_RECEIPT_STAGE_V1" if body["protected_state"]=="GREEN"
        else "SEPARATELY_AUTHORIZE_V7_V5_RECEIPT_STAGE_V1_CREATE_ONLY_APPLY"
        if body["protected_state"]=="READY"
        else "HOLD_INSPECT_V7_V5_RECEIPT_STAGE_STATE"
    ))

def apply(expected_plan_id:str,confirm:str)->None:
    print(MARKER)
    print("mode=apply")
    print("authority_boundary=PRE_MUTATION")
    print("v5_receipt_stage_mutation_possible=true")
    print("fixed_receipt_mutation=false")
    print("service_mutation=false")
    print("funds_movement=false")
    sys.stdout.flush()

    if confirm!=CONFIRM_TOKEN:
        raise StageError("explicit_create_only_confirmation_required")
    if not expected_plan_id.startswith(PLAN_PREFIX):
        raise StageError("expected_plan_id_invalid")
    _require_privileged_source_custody()
    planned=collect_plan()
    if planned["plan_id"]!=expected_plan_id:
        raise StageError("expected_plan_id_mismatch")
    state=planned["body"]["protected_state"]
    if state=="GREEN":
        print("status=ALREADY_GREEN")
        print("filesystem_mutation=false")
        return
    if state!="READY":
        raise StageError("apply_state_not_ready:"+state)

    before=_verify_fixed_receipt()
    created,matching=_install_create_or_exact_match()
    after=_verify_fixed_receipt()
    if (
        before["sha256"]!=after["sha256"]
        or before["bytes"]!=after["bytes"]
        or before["receipt_id"]!=after["receipt_id"]
    ):
        raise StageError("fixed_receipt_changed_during_stage_apply")
    final=collect_plan()
    if final["body"]["protected_state"]!="GREEN":
        raise StageError("final_v5_receipt_stage_not_green")
    print(MARKER)
    print("status=V7_V5_RECEIPT_STAGE_V1_GREEN")
    print("plan_id="+expected_plan_id)
    print("receipt_stage_created="+str(created).lower())
    print("receipt_stage_already_matching="+str(matching).lower())
    print("fixed_receipt_mutation=false")
    print("fixed_receipt_exchange_authority=false")
    print("transition_journal_mutation=false")
    print("consumer_fence_mutation=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print("next_action=SEPARATELY_QUALIFY_V7_V5_SOURCE_RECEIPT_STAGE_PAIR")

def self_test()->None:
    if len(V5_RECEIPT_BYTES)!=EXPECTED_V5_BYTES:
        raise AssertionError("v5_receipt_bytes")
    if sha256(V5_RECEIPT_BYTES)!=EXPECTED_V5_SHA256:
        raise AssertionError("v5_receipt_sha256")
    value=json.loads(V5_RECEIPT_BYTES.decode("utf-8","strict"))
    if value.get("receipt_id")!=EXPECTED_V5_RECEIPT_ID:
        raise AssertionError("v5_receipt_id")
    if value.get("process_source_commit")!="be2fbe41aaba291d3f874b9de52bcb87336307f5":
        raise AssertionError("v5_receipt_source_commit")
    if value.get("process_source_tree")!="749877d2320ecee9d659720b32e4726a0c42d697":
        raise AssertionError("v5_receipt_source_tree")
    if value.get("candidate_enforcement_identity_accepted") is not True:
        raise AssertionError("v5_receipt_acceptance")
    print(MARKER+"_SELF_TEST_GREEN")
    print("isolated_python_entry_required=true")
    print("pre_guard_sibling_import_poison_rejected=true")
    print("exact_v5_receipt_bytes_bound=true")
    print("create_or_exact_match_only=true")
    print("trusted_root_launcher_required=true")
    print("fixed_receipt_mutation=false")
    print("fixed_receipt_exchange_authority=false")
    print("transition_journal_mutation=false")
    print("consumer_fence_mutation=false")
    print("service_mutation=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

def main()->int:
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test",action="store_true")
    mode.add_argument("--source-plan",action="store_true")
    mode.add_argument("--plan",action="store_true")
    mode.add_argument("--apply",action="store_true")
    parser.add_argument("--expected-plan-id",default="")
    parser.add_argument("--confirm",default="")
    args=parser.parse_args()
    if args.self_test:self_test();return 0
    if args.source_plan:source_plan();return 0
    if args.plan:plan();return 0
    if not args.expected_plan_id:raise StageError("expected_plan_id_required")
    apply(args.expected_plan_id,args.confirm)
    return 0

if __name__=="__main__":
    try:
        raise SystemExit(main())
    except (StageError,OSError,UnicodeError,json.JSONDecodeError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason="+re.sub(r"[^A-Za-z0-9_:./-]","_",str(exc)[:500]))
        print("automatic_retry=false")
        print("fixed_receipt_mutation=false")
        print("fixed_receipt_exchange_authority=false")
        print("transition_journal_mutation=false")
        print("consumer_fence_mutation=false")
        print("service_mutation=false")
        print("systemd_mutation=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("funds_movement=false")
        raise SystemExit(2)

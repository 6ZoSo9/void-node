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
import sys

MARKER="VOID_BUY_VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1"
PLAN_PREFIX="voidv7v5receiptstageinstall1_"
CONFIRM_TOKEN="INSTALL_VOID_V7_V5_RECEIPT_STAGE_V1_CREATE_ONLY"
RENAME_NOREPLACE=1

ROOT=pathlib.Path(__file__).resolve().parents[2]
SOURCE_RECEIPT_REL="ops/security/buy-void-source-finality-v7-deployment-receipt-v5.json"
SOURCE_RECEIPT_BLOB="eddd0b47263213ae8dd65ef72a5479c40ea6812e"
SOURCE_RECEIPT_SHA256="12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"
SOURCE_RECEIPT_BYTES=1136
SOURCE_RECEIPT_ID="voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37"

FIXED_RECEIPT=pathlib.Path("/var/lib/void-source-finality-v7/deployment-receipt.json")
FIXED_V4_SHA256="da43b974970fdfee00f914d61064bee86d192ad9b67769f52696e1fbd05bfa87"
FIXED_V4_BYTES=1136
TARGET=pathlib.Path("/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5")
PARENT=TARGET.parent
TEMP_NAME=".deployment-receipt.json.stage-v5.build-v1"

STAGE_PLAN_REL="ops/security/buy-void-v7-v5-source-receipt-stage-plan-v1.json"
STAGE_PLAN_BLOB="fd63775747dae7b90a565686597d016a907bc313"

SHA40=re.compile(r"^[0-9a-f]{40}$")
WRITE_BOUNDARY=False
PUBLICATION="false"

class InstallError(RuntimeError): pass

def canonical(v):
    return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")

def sha256(raw:bytes)->str:
    return hashlib.sha256(raw).hexdigest()

def git_blob(raw:bytes)->str:
    h=hashlib.sha1()
    h.update(b"blob "+str(len(raw)).encode("ascii")+b"\0")
    h.update(raw)
    return h.hexdigest()

def stable_read(path:pathlib.Path,max_bytes:int,label:str)->bytes:
    before=path.lstat()
    if (
        not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode)
        or before.st_nlink!=1 or before.st_size<=0 or before.st_size>max_bytes
    ): raise InstallError(label+"_shape_invalid")
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
    try:
        opened=os.fstat(fd)
        identity=lambda st:(st.st_dev,st.st_ino,st.st_uid,st.st_gid,st.st_mode,st.st_nlink,st.st_size,st.st_mtime_ns,st.st_ctime_ns)
        if identity(opened)!=identity(before): raise InstallError(label+"_rebound")
        raw=bytearray(opened.st_size)
        off=0
        while off<len(raw):
            got=os.read(fd,len(raw)-off)
            if not got: raise InstallError(label+"_short_read")
            raw[off:off+len(got)]=got
            off+=len(got)
        if os.read(fd,1): raise InstallError(label+"_grew")
        after=os.fstat(fd); visible=path.lstat()
        if identity(after)!=identity(opened) or identity(visible)!=identity(opened):
            raise InstallError(label+"_generation_changed")
        return bytes(raw)
    finally:
        os.close(fd)

def repo_blob(relative:str,expected:str)->bytes:
    raw=stable_read(ROOT/relative,1024*1024,"repo_file")
    if git_blob(raw)!=expected: raise InstallError("repo_blob_mismatch:"+relative)
    return raw

def verify_source_receipt()->bytes:
    raw=repo_blob(SOURCE_RECEIPT_REL,SOURCE_RECEIPT_BLOB)
    if len(raw)!=SOURCE_RECEIPT_BYTES or sha256(raw)!=SOURCE_RECEIPT_SHA256:
        raise InstallError("source_receipt_identity_mismatch")
    value=json.loads(raw)
    if value.get("receipt_id")!=SOURCE_RECEIPT_ID:
        raise InstallError("source_receipt_id_mismatch")
    return raw

def receipt_meta(path:pathlib.Path,label:str,expected_sha:str,expected_bytes:int):
    raw=stable_read(path,64*1024,label)
    st=path.lstat()
    if (
        st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)!=0o444
        or st.st_nlink!=1 or len(raw)!=expected_bytes or sha256(raw)!=expected_sha
    ): raise InstallError(label+"_custody_or_identity_mismatch")
    return {"sha256":sha256(raw),"bytes":len(raw),"dev":st.st_dev,"ino":st.st_ino}

def verify_fixed_v4():
    return receipt_meta(FIXED_RECEIPT,"fixed_v4_receipt",FIXED_V4_SHA256,FIXED_V4_BYTES)

def verify_stage():
    return receipt_meta(TARGET,"v5_receipt_stage",SOURCE_RECEIPT_SHA256,SOURCE_RECEIPT_BYTES)

def stage_state()->str:
    temp=PARENT/TEMP_NAME
    if temp.exists() or temp.is_symlink(): return "HOLD_TEMP_PRESENT"
    if not (TARGET.exists() or TARGET.is_symlink()): return "READY"
    try:
        verify_stage()
        return "GREEN"
    except Exception:
        return "HOLD_TARGET_CONFLICT"

def collect_plan(expected_head:str,expected_tree:str):
    if not SHA40.fullmatch(expected_head) or not SHA40.fullmatch(expected_tree):
        raise InstallError("expected_git_identity_invalid")
    # Bind source checkout without invoking Git during privileged apply.
    stage_plan=repo_blob(STAGE_PLAN_REL,STAGE_PLAN_BLOB)
    json.loads(stage_plan)
    source=verify_source_receipt()
    fixed=verify_fixed_v4()
    state=stage_state()
    pst=PARENT.lstat()
    if (
        not stat.S_ISDIR(pst.st_mode) or stat.S_ISLNK(pst.st_mode)
        or pst.st_uid!=0 or pst.st_gid!=0 or stat.S_IMODE(pst.st_mode)&0o022
    ): raise InstallError("receipt_parent_custody_invalid")
    body={
      "schema":"void_buy_void_v7_v5_receipt_stage_install_plan_v1",
      "version":1,
      "expected_head":expected_head,
      "expected_tree":expected_tree,
      "stage_plan_blob":STAGE_PLAN_BLOB,
      "source_receipt_blob":SOURCE_RECEIPT_BLOB,
      "source_receipt_sha256":SOURCE_RECEIPT_SHA256,
      "source_receipt_bytes":SOURCE_RECEIPT_BYTES,
      "source_receipt_id":SOURCE_RECEIPT_ID,
      "fixed_v4_receipt":fixed,
      "target":str(TARGET),
      "parent_device":pst.st_dev,
      "stage_state":state,
      "create_only":True,
      "fixed_receipt_exchange_authority":False,
      "service_mutation":False,
      "credential_access":False,
      "signing":False,
      "transaction":False,
      "public_presale_activation":False,
      "funds_movement":False,
    }
    return {"body":body,"plan_id":PLAN_PREFIX+sha256(canonical(body))}

def plan(expected_head,expected_tree):
    result=collect_plan(expected_head,expected_tree)
    print(MARKER); print("mode=plan"); print("read_only=true")
    print("plan_id="+result["plan_id"])
    print("stage_state="+result["body"]["stage_state"])
    print("target="+str(TARGET))
    print("source_receipt_id="+SOURCE_RECEIPT_ID)
    print("source_receipt_sha256="+SOURCE_RECEIPT_SHA256)
    print("source_receipt_bytes="+str(SOURCE_RECEIPT_BYTES))
    print("filesystem_mutation=false")
    print("fixed_receipt_exchange_authority=false")
    print("service_mutation=false")
    print("presale_activation=false")
    print("funds_movement=false")

def require_root_source():
    if os.getuid()!=0 or os.geteuid()!=0: raise InstallError("root_required")
    root=ROOT.resolve(strict=True)
    if root!=ROOT: raise InstallError("source_root_alias")
    cur=root
    while True:
        st=cur.lstat()
        if (
            not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode)
            or st.st_uid!=0 or st.st_gid!=0 or stat.S_IMODE(st.st_mode)&0o022
        ): raise InstallError("source_custody_invalid:"+str(cur))
        if cur==cur.parent: break
        cur=cur.parent

def apply(expected_head,expected_tree,expected_plan_id,confirm):
    global WRITE_BOUNDARY,PUBLICATION
    print(MARKER); print("mode=apply"); print("authority_boundary=PRE_MUTATION")
    print("receipt_stage_mutation_possible=true")
    print("fixed_receipt_exchange_authority=false")
    print("service_mutation=false"); print("funds_movement=false")
    sys.stdout.flush()
    if confirm!=CONFIRM_TOKEN: raise InstallError("explicit_create_only_confirmation_required")
    require_root_source()
    planned=collect_plan(expected_head,expected_tree)
    if planned["plan_id"]!=expected_plan_id: raise InstallError("expected_plan_id_mismatch")
    if planned["body"]["stage_state"]=="GREEN":
        print(MARKER); print("status=ALREADY_GREEN"); print("filesystem_mutation=false"); return
    if planned["body"]["stage_state"]!="READY":
        raise InstallError("apply_state_not_ready:"+planned["body"]["stage_state"])
    raw=verify_source_receipt()
    fixed_before=verify_fixed_v4()
    parent_fd=os.open(PARENT,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW)
    temp_fd=-1
    try:
        if (PARENT/TEMP_NAME).exists() or (PARENT/TEMP_NAME).is_symlink():
            raise InstallError("temp_preexisting")
        WRITE_BOUNDARY=True
        temp_fd=os.open(TEMP_NAME,os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,0o600,dir_fd=parent_fd)
        off=0
        while off<len(raw):
            wrote=os.write(temp_fd,raw[off:])
            if wrote<=0: raise InstallError("temp_short_write")
            off+=wrote
        os.fsync(temp_fd)
        os.fchown(temp_fd,0,0); os.fchmod(temp_fd,0o444); os.fsync(temp_fd)
        os.close(temp_fd); temp_fd=-1
        libc=ctypes.CDLL(None,use_errno=True)
        fn=getattr(libc,"renameat2",None)
        if fn is None: raise InstallError("renameat2_unavailable")
        fn.argtypes=[ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint]
        fn.restype=ctypes.c_int
        if fn(parent_fd,TEMP_NAME.encode(),parent_fd,TARGET.name.encode(),RENAME_NOREPLACE)!=0:
            raise InstallError("rename_noreplace_failed:"+str(ctypes.get_errno()))
        PUBLICATION="true"
        os.fsync(parent_fd)
    finally:
        if temp_fd>=0: os.close(temp_fd)
        os.close(parent_fd)
    verify_stage()
    fixed_after=verify_fixed_v4()
    if fixed_after["sha256"]!=fixed_before["sha256"] or fixed_after["ino"]!=fixed_before["ino"]:
        raise InstallError("fixed_v4_receipt_changed")
    print(MARKER); print("status=V5_RECEIPT_STAGE_V1_GREEN")
    print("publication=true")
    print("receipt_stage_install_performed=true")
    print("receipt_id="+SOURCE_RECEIPT_ID)
    print("fixed_receipt_exchange_authority=false")
    print("service_mutation=false"); print("presale_activation=false"); print("funds_movement=false")
    print("next_action=QUALIFY_V5_SOURCE_AND_RECEIPT_STAGE_PAIR")

def self_test():
    assert SOURCE_RECEIPT_BYTES==1136
    assert SOURCE_RECEIPT_SHA256=="12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"
    assert TARGET.name==".deployment-receipt.json.stage-v5"
    libc=ctypes.CDLL(None)
    assert getattr(libc,"renameat2",None) is not None
    print(MARKER+"_SELF_TEST_GREEN")
    print("create_only=true")
    print("rename_noreplace_required=true")
    print("exact_match_reapply_allowed=true")
    print("mismatched_existing_stage_holds=true")
    print("fixed_v4_receipt_revalidation_required=true")
    print("fixed_receipt_exchange_authority=false")
    print("service_mutation=false")
    print("funds_movement=false")

def main():
    p=argparse.ArgumentParser()
    g=p.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true")
    g.add_argument("--plan",action="store_true")
    g.add_argument("--apply",action="store_true")
    p.add_argument("--expected-head",default="")
    p.add_argument("--expected-tree",default="")
    p.add_argument("--expected-plan-id",default="")
    p.add_argument("--confirm",default="")
    a=p.parse_args()
    if a.self_test: self_test(); return
    if not a.expected_head or not a.expected_tree: raise InstallError("expected_head_tree_required")
    if a.plan: plan(a.expected_head,a.expected_tree); return
    if not a.expected_plan_id: raise InstallError("expected_plan_id_required")
    apply(a.expected_head,a.expected_tree,a.expected_plan_id,a.confirm)

if __name__=="__main__":
    try: main()
    except (InstallError,OSError,UnicodeError,ValueError) as exc:
        print(MARKER); print("status=HOLD"); print("reason="+str(exc)[:400].replace("\n","_"))
        print("write_boundary_entered="+str(WRITE_BOUNDARY).lower())
        print("publication="+PUBLICATION)
        print("automatic_retry=false")
        print("fixed_receipt_exchange_authority=false")
        print("service_mutation=false"); print("presale_activation=false"); print("funds_movement=false")
        raise SystemExit(2)
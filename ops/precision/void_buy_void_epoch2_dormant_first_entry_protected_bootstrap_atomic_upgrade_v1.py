#!/usr/bin/env python3
from __future__ import annotations
import argparse, ctypes, hashlib, json, os, pathlib, signal, stat, sys, types
from typing import Any

MARKER="VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_ATOMIC_UPGRADE_V1"
PLAN_PREFIX="voidbuye2bootstrapupgrade1_"
PLAN_SCHEMA="void_buy_void_epoch2_dormant_first_entry_protected_bootstrap_atomic_upgrade_plan_v1"
CONFIRM="ATOMIC_EXCHANGE_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_PREDECESSOR_TO_REPAIRED"
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUTER_REL="ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v6.py"
OUTER_BLOB="438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"
INSTALL_PARENT=pathlib.Path("/opt")
INSTALL_NAME="void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6"
INSTALL_ROOT=INSTALL_PARENT/INSTALL_NAME
STAGE_NAME="."+INSTALL_NAME+".upgrade-lock3-4d87f4ce.stage"
STAGE_ROOT=INSTALL_PARENT/STAGE_NAME
PREDECESSOR_NAME="."+INSTALL_NAME+".predecessor-lock3-5958d8e7"
PREDECESSOR_ROOT=INSTALL_PARENT/PREDECESSOR_NAME
BIN="bin"
BOOT="void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6"
MANIFEST="source-generation-v3.conf"
POLICY="policy-v1.conf"
OLD_LOCK="voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
NEW_LOCK="voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
NEW_CAND="voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
OLD_BOOT=(874608,"c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b","a91707c3e5803071fc73c3451c9bcb3b774f8b48")
NEW_BOOT=(874608,"618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c","b577d70666f98ac59a75b84b3dab741fe7b93a4b")
OLD_MAN=(2382,"aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662","6e0630af72111bd9976dcc38cdcdada1904dd067")
NEW_MAN=(2382,"8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9","de56bacb30bea0adc418e240cf3fb8d900b061ef")
READY="PROTECTED_BOOTSTRAP_V6_PREDECESSOR_READY_FOR_REPAIRED_ATOMIC_UPGRADE"
GREEN="PROTECTED_BOOTSTRAP_V6_REPAIRED_GREEN_WITH_PREDECESSOR"
RENAME_NOREPLACE=1
RENAME_EXCHANGE=2

class UpgradeError(RuntimeError): pass
class PublishedError(UpgradeError):
    def __init__(self,reason,cause):
        super().__init__(reason); self.cause=cause
        self.rollback_attempted=False; self.rollback_green=None
        self.rollback_final_state_verified=None; self.close_completed=None

def h(raw): return hashlib.sha256(raw).hexdigest()
def blob(raw): return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
def canon(v): return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=True).encode("ascii")
def rid(st): return {"dev":st.st_dev,"ino":st.st_ino,"uid":st.st_uid,"gid":st.st_gid,"mode":format(stat.S_IMODE(st.st_mode),"04o")}

def load_outer():
    path=ROOT/OUTER_REL; before=path.lstat()
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode) or before.st_nlink!=1: raise UpgradeError("outer_source_metadata_invalid")
    fd=os.open(path,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW)
    try:
        opened=os.fstat(fd); raw=os.read(fd,before.st_size+1); after=os.fstat(fd); visible=path.lstat()
    finally: os.close(fd)
    if len(raw)!=before.st_size or not (before.st_dev,before.st_ino,before.st_size)==(opened.st_dev,opened.st_ino,opened.st_size) or not (opened.st_dev,opened.st_ino,opened.st_size)==(after.st_dev,after.st_ino,after.st_size) or not (after.st_dev,after.st_ino,after.st_size)==(visible.st_dev,visible.st_ino,visible.st_size): raise UpgradeError("outer_source_generation_changed")
    if blob(raw)!=OUTER_BLOB: raise UpgradeError("outer_source_blob_mismatch")
    m=types.ModuleType("void_verified_bootstrap_outer_v6"); m.__file__=str(path); m.__package__=""
    exec(compile(raw,str(path),"exec",dont_inherit=True,optimize=0),m.__dict__)
    expected={"LOCK_ID":NEW_LOCK,"CANDIDATE_ID":NEW_CAND,"BOOTSTRAP_BYTES":NEW_BOOT[0],"BOOTSTRAP_SHA256":NEW_BOOT[1],"BOOTSTRAP_GIT_BLOB_SHA1":NEW_BOOT[2],"MANIFEST_BYTES":NEW_MAN[0],"MANIFEST_SHA256":NEW_MAN[1],"MANIFEST_GIT_BLOB_SHA1":NEW_MAN[2]}
    for k,v in expected.items():
        if getattr(m,k,None)!=v: raise UpgradeError("outer_generation_mismatch:"+k)
    if pathlib.Path(m.INSTALL_ROOT)!=INSTALL_ROOT: raise UpgradeError("outer_root_mismatch")
    return m

def verify_root(m,root,boot_id,man_id,policy,expected_id=None):
    m._trusted_directory(INSTALL_PARENT)
    st=m._trusted_directory(root,0o755)
    if expected_id is not None and rid(st)!=expected_id: raise UpgradeError("root_inode_changed:"+root.name)
    if sorted(os.listdir(root))!=sorted((BIN,MANIFEST,POLICY)): raise UpgradeError("root_entries_invalid:"+root.name)
    bp=root/BIN; m._trusted_directory(bp,0o755)
    if sorted(os.listdir(bp))!=[BOOT]: raise UpgradeError("bin_entries_invalid:"+root.name)
    m._verify_file(bp/BOOT,expected_bytes=boot_id[0],expected_sha256=boot_id[1],expected_git_blob=boot_id[2],expected_mode=0o555)
    m._verify_file(root/MANIFEST,expected_bytes=man_id[0],expected_sha256=man_id[1],expected_git_blob=man_id[2],expected_mode=0o444)
    m._verify_file(root/POLICY,expected_bytes=len(policy),expected_sha256=h(policy),expected_git_blob=None,expected_mode=0o444)
    return rid(st)

def old_root(m,root,policy,expected=None): return verify_root(m,root,OLD_BOOT,OLD_MAN,policy,expected)
def new_root(m,root,policy,expected=None): return verify_root(m,root,NEW_BOOT,NEW_MAN,policy,expected)
def exists(p):
    try: p.lstat(); return True
    except FileNotFoundError: return False

LAYOUT_READY="old_live_new_stage"
LAYOUT_EXCHANGED="new_live_old_stage"
LAYOUT_RETAINED="new_live_old_predecessor"
LAYOUT_ROLLBACK_SWAPPED="old_live_new_predecessor"

def root_kind(m,path,policy,old_id,new_id):
    if not exists(path): return "missing"
    try: old_root(m,path,policy,old_id); return "old"
    except Exception: pass
    try: new_root(m,path,policy,new_id); return "new"
    except Exception: return "other"

def root_layout(m,policy,old_id,new_id):
    kinds=(root_kind(m,INSTALL_ROOT,policy,old_id,new_id),root_kind(m,STAGE_ROOT,policy,old_id,new_id),root_kind(m,PREDECESSOR_ROOT,policy,old_id,new_id))
    known={
        ("old","new","missing"):LAYOUT_READY,
        ("new","old","missing"):LAYOUT_EXCHANGED,
        ("new","missing","old"):LAYOUT_RETAINED,
        ("old","missing","new"):LAYOUT_ROLLBACK_SWAPPED,
    }
    return known.get(kinds,"ambiguous:"+"/".join(kinds))

def published_inspection_error(reason,cause):
    e=PublishedError(reason,cause); e.rollback_attempted=False; e.rollback_green=False; e.rollback_final_state_verified=False
    return e

def observed_rename(m,opt_fd,source,target,flags,policy,old_id,new_id,outcome=None):
    caught=None; layout=None; inspection_error=None; rename_succeeded=False
    if outcome is not None: outcome["rename_succeeded"]=False
    previous=signal.pthread_sigmask(signal.SIG_BLOCK,{signal.SIGINT})
    try:
        try:
            m._renameat2(opt_fd,source,target,flags)
            rename_succeeded=True
            if outcome is not None: outcome["rename_succeeded"]=True
        except BaseException as exc: caught=exc
        try: layout=root_layout(m,policy,old_id,new_id)
        except BaseException as exc: inspection_error=exc
    finally:
        try: signal.pthread_sigmask(signal.SIG_SETMASK,previous)
        except BaseException as exc:
            if caught is None: caught=exc
    if inspection_error is not None:
        raise published_inspection_error("rename_outcome_needs_inspection",inspection_error) from inspection_error
    return layout,caught,rename_succeeded

def bindings(m,head):
    try:
        with m._RepositorySnapshot(head) as repo:
            b=m._bindings_snapshot(head,repository=repo)
            lock=m.accepted_lock(head,repository=repo)
            policy=m.build_policy(b["python"],b["git_tool"])
    except Exception as e: raise UpgradeError("outer_bindings_failed:"+type(e).__name__) from e
    rec=m.git_boundary_receipt()
    req={"temporary_git_metadata_write_performed":True,"temporary_git_metadata_cleanup_completed":True,"source_repository_mutation":False,"source_object_fetch":False,"repository_config_loaded":False,"repository_callback_execution":False,"native_parent_authority_claimed":False}
    for k,v in req.items():
        if rec.get(k)!=v: raise UpgradeError("git_boundary_mismatch:"+k)
    if lock.get("lock_id")!=NEW_LOCK or b.get("lock_id")!=NEW_LOCK: raise UpgradeError("accepted_lock_mismatch")
    return b,policy,rec

def artifact(m,path,ident,mode):
    raw,info=m._read_exact_path(path,expected_bytes=ident[0],expected_sha256=ident[1],expected_git_blob=ident[2],expected_mode=mode,require_root_owner=False)
    return raw,info

def state(m,policy):
    m._trusted_directory(pathlib.Path("/")); m._trusted_directory(INSTALL_PARENT)
    if exists(STAGE_ROOT): raise UpgradeError("upgrade_stage_present")
    if not exists(INSTALL_ROOT): raise UpgradeError("fixed_root_missing")
    if exists(PREDECESSOR_ROOT):
        try:
            cur=new_root(m,INSTALL_ROOT,policy); old_root(m,PREDECESSOR_ROOT,policy); return GREEN,cur
        except Exception as first:
            try: old_root(m,INSTALL_ROOT,policy); new_root(m,PREDECESSOR_ROOT,policy)
            except Exception: raise first
            raise UpgradeError("rollback_pending_state")
    return READY,old_root(m,INSTALL_ROOT,policy)

def collect(bootstrap,manifest,head):
    if len(head)!=40 or any(c not in "0123456789abcdef" for c in head): raise UpgradeError("expected_head_invalid")
    m=load_outer(); m._require_secure_apply_context()
    _,bi=artifact(m,bootstrap,NEW_BOOT,0o555); _,mi=artifact(m,manifest,NEW_MAN,0o444)
    b,policy,rec=bindings(m,head); st,root_id=state(m,policy)
    body={"schema":PLAN_SCHEMA,"version":1,"expected_head":head,"outer_blob":OUTER_BLOB,"old_lock_id":OLD_LOCK,"new_lock_id":NEW_LOCK,"new_candidate_id":NEW_CAND,"bootstrap":bi,"manifest":mi,"checkout":b["checkout"],"python":b["python"],"git_tool":b["git_tool"],"policy_sha256":h(policy),"policy_bytes":len(policy),"protected_state":st,"current_root_identity":root_id,"atomic_root_exchange_required":True,"predecessor_retention_required":True,"automatic_rollback_required":True,"service_mutation":False,"credential_access":False,"funds_movement":False}
    return {"body":body,"policy":policy,"git":rec,"plan_id":PLAN_PREFIX+h(canon(body))}

def source_plan():
    print(MARKER); print("mode=source-plan"); print("source_only=true"); print("host_read=false"); print("host_write=false")
    print("outer_installer_git_blob_sha1="+OUTER_BLOB); print("old_lock_id="+OLD_LOCK); print("new_lock_id="+NEW_LOCK); print("new_candidate_id="+NEW_CAND)
    print("atomic_root_exchange_required=true"); print("predecessor_retention_required=true"); print("automatic_rollback_required=true"); print("rename_outcome_reconciliation_required=true")
    print("bootstrap_execution=false"); print("inner_installer_execution=false"); print("service_mutation=false"); print("credential_access=false"); print("funds_movement=false")

def plan(bootstrap,manifest,head):
    r=collect(bootstrap,manifest,head); b=r["body"]
    print(MARKER); print("mode=plan"); print("plan_id="+r["plan_id"]); print("expected_head="+head); print("protected_state="+b["protected_state"])
    print("old_lock_id="+OLD_LOCK); print("new_lock_id="+NEW_LOCK); print("new_candidate_id="+NEW_CAND)
    print("bootstrap_candidate_verified=true"); print("manifest_candidate_verified=true"); print("policy_sha256="+b["policy_sha256"]); print("policy_bytes="+str(b["policy_bytes"]))
    print("atomic_root_exchange_required=true"); print("predecessor_retention_required=true"); print("automatic_rollback_required=true")
    print("filesystem_write=true"); print("protected_filesystem_mutation=false"); print("bootstrap_execution=false"); print("inner_installer_execution=false"); print("service_mutation=false"); print("credential_access=false"); print("private_key_access=false"); print("signing=false"); print("transaction=false"); print("rpc_call=false"); print("payment_acceptance=false"); print("public_presale_activation=false"); print("wc_void_market_activation=false"); print("treasury_liquidity_action=false"); print("funds_movement=false"); print("production_host_evidence_authority=false")
    for k,v in r["git"].items(): print(k+"="+(str(v).lower() if isinstance(v,bool) else str(v)))
    print("already_upgraded="+str(b["protected_state"]==GREEN).lower())
    print("next_action="+("SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_REPAIRED_INSTALLED_QUALIFICATION" if b["protected_state"]==GREEN else "SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_ATOMIC_REPAIR_UPGRADE"))

def stage(m,opt_fd,boot_raw,man_raw,policy,owned):
    os.mkdir(STAGE_NAME,0o755,dir_fd=opt_fd); fd=os.open(STAGE_NAME,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,dir_fd=opt_fd)
    try:
        os.fchown(fd,0,0); os.fchmod(fd,0o755); initial=os.fstat(fd); owned.append(initial)
        os.mkdir(BIN,0o755,dir_fd=fd); bfd=os.open(BIN,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,dir_fd=fd)
        try:
            os.fchown(bfd,0,0); os.fchmod(bfd,0o755); m._create_file(bfd,BOOT,boot_raw,mode=0o555,expected_sha256=NEW_BOOT[1]); os.fsync(bfd)
        finally: os.close(bfd)
        m._create_file(fd,MANIFEST,man_raw,mode=0o444,expected_sha256=NEW_MAN[1]); m._create_file(fd,POLICY,policy,mode=0o444,expected_sha256=h(policy)); os.fsync(fd)
    finally: os.close(fd)
    os.fsync(opt_fd); new_root(m,STAGE_ROOT,policy); return initial

def cleanup(m,opt_fd,expected):
    if not exists(STAGE_ROOT): return True
    try:
        fd=os.open(STAGE_NAME,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,dir_fd=opt_fd)
        try:
            opened=os.fstat(fd); visible=os.stat(STAGE_NAME,dir_fd=opt_fd,follow_symlinks=False)
            if not m._same_stage_directory(expected,opened) or not m._same_stat(opened,visible): return False
            entries=sorted(os.listdir(fd))
            if not set(entries).issubset({BIN,MANIFEST,POLICY}): return False
            if BIN in entries:
                bfd=os.open(BIN,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW,dir_fd=fd)
                try:
                    bst=os.fstat(bfd)
                    if not stat.S_ISDIR(bst.st_mode) or (bst.st_uid,bst.st_gid)!=(expected.st_uid,expected.st_gid) or stat.S_IMODE(bst.st_mode)!=0o755: return False
                    ben=sorted(os.listdir(bfd))
                    if not set(ben).issubset({BOOT}): return False
                    if BOOT in ben: os.unlink(BOOT,dir_fd=bfd)
                    os.fsync(bfd)
                finally: os.close(bfd)
                os.rmdir(BIN,dir_fd=fd)
            for n in (MANIFEST,POLICY):
                if n in entries: os.unlink(n,dir_fd=fd)
            os.fsync(fd)
        finally: os.close(fd)
        os.rmdir(STAGE_NAME,dir_fd=opt_fd); os.fsync(opt_fd); return True
    except Exception: return False

def rebind(bootstrap,manifest,head,body):
    try:
        m=load_outer(); m._require_secure_apply_context()
        _,bi=artifact(m,bootstrap,NEW_BOOT,0o555); _,mi=artifact(m,manifest,NEW_MAN,0o444); b,p,_=bindings(m,head)
        return bi==body["bootstrap"] and mi==body["manifest"] and b["checkout"]==body["checkout"] and b["python"]==body["python"] and b["git_tool"]==body["git_tool"] and b["lock_id"]==NEW_LOCK and h(p)==body["policy_sha256"] and len(p)==body["policy_bytes"]
    except Exception: return False

def rollback_published(m,opt_fd,policy,body,initial,bootstrap,manifest,head,old_id,new_id):
    try:
        layout=root_layout(m,policy,old_id,new_id)
        if layout==LAYOUT_RETAINED:
            layout,_,_=observed_rename(m,opt_fd,PREDECESSOR_NAME,INSTALL_NAME,RENAME_EXCHANGE,policy,old_id,new_id)
            if layout!=LAYOUT_ROLLBACK_SWAPPED: return False
            layout,_,_=observed_rename(m,opt_fd,PREDECESSOR_NAME,STAGE_NAME,RENAME_NOREPLACE,policy,old_id,new_id)
            if layout!=LAYOUT_READY: return False
        elif layout==LAYOUT_EXCHANGED:
            layout,_,_=observed_rename(m,opt_fd,STAGE_NAME,INSTALL_NAME,RENAME_EXCHANGE,policy,old_id,new_id)
            if layout!=LAYOUT_READY: return False
        elif layout!=LAYOUT_READY: return False
        old_root(m,INSTALL_ROOT,policy,body["current_root_identity"])
        return initial is not None and cleanup(m,opt_fd,initial) and not exists(PREDECESSOR_ROOT) and rebind(bootstrap,manifest,head,body)
    except BaseException:
        return False

def apply(bootstrap,manifest,head,expected_plan,confirm):
    print(MARKER); print("mode=apply"); print("authority_boundary=PRE_MUTATION"); print("protected_root_mutation_possible=true"); print("protected_root_mutation_performed=false"); print("bootstrap_execution=false"); print("inner_installer_execution=false"); print("service_mutation=false"); print("credential_access=false"); print("funds_movement=false"); sys.stdout.flush()
    if confirm!=CONFIRM: raise UpgradeError("explicit_atomic_upgrade_confirmation_required")
    if os.geteuid()!=0: raise UpgradeError("root_required_for_apply")
    m=load_outer(); m._require_secure_apply_context(); boot_raw,_=artifact(m,bootstrap,NEW_BOOT,0o555); man_raw,_=artifact(m,manifest,NEW_MAN,0o444)
    r=collect(bootstrap,manifest,head)
    if r["plan_id"]!=expected_plan: raise UpgradeError("expected_plan_id_mismatch")
    body=r["body"]; policy=r["policy"]
    if body["protected_state"]==GREEN:
        print(MARKER); print("mode=apply"); print("status=ALREADY_GREEN"); print("protected_upgrade_performed=false"); print("predecessor_retained=true"); return
    if body["protected_state"]!=READY: raise UpgradeError("apply_state_not_ready")
    opt_fd=os.open(INSTALL_PARENT,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC|os.O_NOFOLLOW)
    initial=None; owned=[]; exchanged=False; retained=False; publication=False; rollback=False
    exchange_attempted=False; retention_attempted=False; new_id=None
    exchange_outcome={"rename_succeeded":False}
    try:
        if exists(STAGE_ROOT) or exists(PREDECESSOR_ROOT): raise UpgradeError("upgrade_auxiliary_root_present")
        old_id=old_root(m,INSTALL_ROOT,policy,body["current_root_identity"])
        initial=stage(m,opt_fd,boot_raw,man_raw,policy,owned); new_id=rid(initial)
        if not rebind(bootstrap,manifest,head,body): raise UpgradeError("plan_bindings_changed_before_exchange")
        old_root(m,INSTALL_ROOT,policy,old_id); new_root(m,STAGE_ROOT,policy,new_id)
        if root_layout(m,policy,old_id,new_id)!=LAYOUT_READY: raise UpgradeError("pre_exchange_layout_invalid")
        exchange_attempted=True
        layout,handoff_error,rename_succeeded=observed_rename(m,opt_fd,STAGE_NAME,INSTALL_NAME,RENAME_EXCHANGE,policy,old_id,new_id,outcome=exchange_outcome)
        if rename_succeeded:
            publication=True
        if layout==LAYOUT_EXCHANGED:
            exchanged=True; publication=True
        elif layout!=LAYOUT_READY:
            publication=True
        if rename_succeeded and layout==LAYOUT_READY:
            raise published_inspection_error(
                "atomic_exchange_succeeded_but_layout_reverted",
                UpgradeError("successful_exchange_layout_reverted_before_observation"),
            )
        if handoff_error is not None: raise handoff_error
        if layout!=LAYOUT_EXCHANGED: raise UpgradeError("atomic_exchange_outcome_invalid:"+layout)
        os.fsync(opt_fd)
        new_root(m,INSTALL_ROOT,policy,new_id); old_root(m,STAGE_ROOT,policy,old_id)
        if not rebind(bootstrap,manifest,head,body): raise UpgradeError("plan_bindings_changed_after_exchange")
        retention_attempted=True
        layout,handoff_error,retention_succeeded=observed_rename(m,opt_fd,STAGE_NAME,PREDECESSOR_NAME,RENAME_NOREPLACE,policy,old_id,new_id)
        if layout==LAYOUT_RETAINED: retained=True
        elif layout!=LAYOUT_EXCHANGED: publication=True
        if handoff_error is not None: raise handoff_error
        if layout!=LAYOUT_RETAINED: raise UpgradeError("predecessor_retention_outcome_invalid:"+layout)
        os.fsync(opt_fd)
        new_root(m,INSTALL_ROOT,policy,new_id); old_root(m,PREDECESSOR_ROOT,policy,old_id)
        if exists(STAGE_ROOT) or not rebind(bootstrap,manifest,head,body): raise UpgradeError("final_state_or_bindings_invalid")
    except BaseException as exc:
        if isinstance(exc,PublishedError):
            try: os.close(opt_fd)
            except OSError: pass
            raise
        if publication:
            rollback=new_id is not None and rollback_published(m,opt_fd,policy,body,initial,bootstrap,manifest,head,old_id,new_id)
            try: os.close(opt_fd)
            except OSError: pass
            e=PublishedError("atomic_upgrade_rolled_back_after_failure" if rollback else "atomic_upgrade_rollback_failed",exc); e.rollback_attempted=True; e.rollback_green=rollback; e.rollback_final_state_verified=rollback
            raise e from exc
        if exchange_attempted and new_id is not None:
            try: layout=root_layout(m,policy,old_id,new_id)
            except BaseException as inspection_error:
                try: os.close(opt_fd)
                except OSError: pass
                raise published_inspection_error("atomic_upgrade_exchange_outcome_needs_inspection",inspection_error) from exc
            if exchange_outcome["rename_succeeded"] and layout==LAYOUT_READY:
                try: os.close(opt_fd)
                except OSError: pass
                raise published_inspection_error("atomic_upgrade_exchange_succeeded_ready_needs_inspection",exc) from exc
            if layout==LAYOUT_EXCHANGED:
                rollback=rollback_published(m,opt_fd,policy,body,initial,bootstrap,manifest,head,old_id,new_id)
                try: os.close(opt_fd)
                except OSError: pass
                e=PublishedError("atomic_upgrade_rolled_back_after_failure" if rollback else "atomic_upgrade_rollback_failed",exc)
                e.rollback_attempted=True; e.rollback_green=rollback; e.rollback_final_state_verified=rollback
                raise e from exc
            if layout not in (LAYOUT_READY,):
                try: os.close(opt_fd)
                except OSError: pass
                e=PublishedError("atomic_upgrade_exchange_outcome_ambiguous",exc); e.rollback_attempted=False; e.rollback_green=False; e.rollback_final_state_verified=False
                raise e from exc
        if initial is None and owned: initial=owned[0]
        if initial is not None: rollback=cleanup(m,opt_fd,initial)
        try: os.close(opt_fd)
        except OSError: pass
        raise UpgradeError("prepublication_failure:"+type(exc).__name__+":"+str(exc)+":cleanup_"+("green" if rollback else "not_green")) from exc
    else:
        try: os.close(opt_fd)
        except OSError as exc:
            e=PublishedError("install_parent_close_failed_after_upgrade",exc); e.close_completed=False; raise e from exc
    print(MARKER); print("mode=apply"); print("status=GREEN"); print("plan_id="+expected_plan); print("expected_head="+head); print("protected_upgrade_performed=true"); print("publication=true"); print("publication_state=atomic_exchange_verified"); print("final_state_verified=true"); print("atomic_root_exchange=true"); print("predecessor_retained=true"); print("rollback_available=true"); print("old_lock_id="+OLD_LOCK); print("new_lock_id="+NEW_LOCK); print("new_candidate_id="+NEW_CAND); print("installed_bootstrap_sha256="+NEW_BOOT[1]); print("installed_manifest_sha256="+NEW_MAN[1]); print("predecessor_bootstrap_sha256="+OLD_BOOT[1]); print("predecessor_manifest_sha256="+OLD_MAN[1]); print("bootstrap_execution=false"); print("inner_installer_execution=false"); print("service_mutation=false"); print("credential_access=false"); print("private_key_access=false"); print("signing=false"); print("transaction=false"); print("rpc_call=false"); print("payment_acceptance=false"); print("public_presale_activation=false"); print("wc_void_market_activation=false"); print("treasury_liquidity_action=false"); print("funds_movement=false"); print("production_host_evidence_authority=false"); print("next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_REPAIRED_INSTALLED_QUALIFICATION")

def self_test():
    assert OLD_BOOT[0]==NEW_BOOT[0]==874608 and OLD_BOOT[1]!=NEW_BOOT[1] and OLD_MAN[1]!=NEW_MAN[1] and OLD_LOCK!=NEW_LOCK
    assert STAGE_ROOT.parent==PREDECESSOR_ROOT.parent==INSTALL_PARENT and STAGE_ROOT!=PREDECESSOR_ROOT!=INSTALL_ROOT
    libc=ctypes.CDLL(None); assert getattr(libc,"renameat2",None) is not None
    import tempfile
    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-") as td:
        p=pathlib.Path(td); (p/"a").mkdir(); (p/"b").mkdir(); (p/"a"/"x").write_text("old"); (p/"b"/"x").write_text("new"); fd=os.open(p,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
        try:
            load_outer()._renameat2(fd,"a","b",RENAME_EXCHANGE); assert (p/"a"/"x").read_text()=="new" and (p/"b"/"x").read_text()=="old"; load_outer()._renameat2(fd,"b","pred",RENAME_NOREPLACE); assert (p/"pred"/"x").read_text()=="old"
        finally: os.close(fd)
    print(MARKER+"_SELF_TEST_GREEN"); print("old_generation_identity_bound=true"); print("repaired_generation_identity_bound=true"); print("outer_installer_source_blob_bound=true"); print("atomic_root_exchange_required=true"); print("predecessor_retention_required=true"); print("automatic_rollback_required=true"); print("rename_outcome_reconciliation_required=true"); print("bootstrap_execution=false"); print("inner_installer_execution=false"); print("service_mutation=false"); print("credential_access=false"); print("funds_movement=false")

def failure_receipt(exc):
    if isinstance(exc,PublishedError):
        state="published_rolled_back_green" if exc.rollback_green else "published_needs_inspection"
        if str(exc)=="install_parent_close_failed_after_upgrade": state="published_verified_close_failed"
        return {"publication":"true","publication_state":state,"final_state_verified":str(bool(exc.rollback_final_state_verified) or state=="published_verified_close_failed").lower(),"rollback_attempted":str(exc.rollback_attempted).lower(),"rollback_green":("unknown" if exc.rollback_green is None else str(exc.rollback_green).lower()),"rollback_final_state_verified":("unknown" if exc.rollback_final_state_verified is None else str(exc.rollback_final_state_verified).lower())}
    return {"publication":"false","publication_state":"not_published","final_state_verified":"false","rollback_attempted":"not_applicable","rollback_green":"not_applicable","rollback_final_state_verified":"not_applicable"}

def main():
    p=argparse.ArgumentParser(); g=p.add_mutually_exclusive_group(required=True); g.add_argument("--self-test",action="store_true"); g.add_argument("--source-plan",action="store_true"); g.add_argument("--plan",action="store_true"); g.add_argument("--apply",action="store_true"); p.add_argument("--bootstrap",type=pathlib.Path); p.add_argument("--manifest",type=pathlib.Path); p.add_argument("--expected-head",default=""); p.add_argument("--expected-plan-id",default=""); p.add_argument("--confirm",default=""); a=p.parse_args()
    if a.self_test: self_test(); return
    if a.source_plan: source_plan(); return
    if a.bootstrap is None or a.manifest is None or not a.expected_head: raise UpgradeError("bootstrap_manifest_expected_head_required")
    if a.plan: plan(a.bootstrap,a.manifest,a.expected_head); return
    if not a.expected_plan_id: raise UpgradeError("expected_plan_id_required")
    apply(a.bootstrap,a.manifest,a.expected_head,a.expected_plan_id,a.confirm)

if __name__=="__main__":
    try: main()
    except (UpgradeError,OSError,KeyboardInterrupt) as e:
        print(MARKER); print("status=HOLD"); print("reason="+str(e))
        for k,v in failure_receipt(e).items(): print(k+"="+v)
        print("automatic_retry=false"); print("bootstrap_execution=false"); print("inner_installer_execution=false"); print("service_mutation=false"); print("credential_access=false"); print("private_key_access=false"); print("signing=false"); print("transaction=false"); print("rpc_call=false"); print("payment_acceptance=false"); print("public_presale_activation=false"); print("wc_void_market_activation=false"); print("treasury_liquidity_action=false"); print("funds_movement=false"); print("production_host_evidence_authority=false")
        raise SystemExit(2)

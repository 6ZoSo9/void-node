#!/usr/bin/env python3
from __future__ import annotations
import contextlib
import ctypes
import hashlib
import importlib.util
import io
import os
import signal
from pathlib import Path
import stat
import tempfile

ROOT=Path(__file__).resolve().parents[1]
TARGET_REL="ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_bootstrap_atomic_upgrade_v1.py"
TARGET=ROOT/TARGET_REL
TARGET_BLOB="0c3f06b307d7b8733ff93a4211bea736aa54f003"

def git_blob(raw:bytes)->str:
    return hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()

raw=TARGET.read_bytes()
assert git_blob(raw)==TARGET_BLOB
text=raw.decode("utf-8")
for required in (
    "RENAME_NOREPLACE=1",
    "RENAME_EXCHANGE=2",
    "automatic_rollback_required",
    "predecessor_retention_required",
    "plan_bindings_changed_before_exchange",
    "plan_bindings_changed_after_exchange",
    "published_rolled_back_green",
    "rename_outcome_reconciliation_required=true",
    "rename_succeeded=False",
    "rename_succeeded=True",
    'outcome["rename_succeeded"]=True',
    "return layout,caught,rename_succeeded",
    "atomic_exchange_succeeded_but_layout_reverted",
    "exchange_attempted=False",
    "retention_attempted=False",
    "rollback_available=true",
    "protected_root_mutation_performed=false",
    "bootstrap_execution=false",
    "inner_installer_execution=false",
    "service_mutation=false",
    "credential_access=false",
    "funds_movement=false",
    "automatic_retry=false",
):
    assert required in text,required
for forbidden in ("import subprocess","subprocess.","os.system(","os.exec","systemctl"):
    assert forbidden not in text,forbidden

spec=importlib.util.spec_from_file_location("void_bootstrap_atomic_upgrade_v1",TARGET)
assert spec and spec.loader
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
m.self_test()

class FakeOuter:
    def _require_secure_apply_context(self): pass
    @staticmethod
    def _trusted_directory(path,exact_mode=None):
        st=Path(path).lstat()
        if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
            raise m.UpgradeError("synthetic_directory_invalid")
        if exact_mode is not None and stat.S_IMODE(st.st_mode)!=exact_mode:
            raise m.UpgradeError("synthetic_directory_mode_invalid")
        return st
    @staticmethod
    def _read_exact_path(path,*,expected_bytes,expected_sha256,expected_git_blob,expected_mode,require_root_owner):
        p=Path(path); st=p.lstat(); data=p.read_bytes()
        if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink!=1:
            raise m.UpgradeError("synthetic_input_invalid")
        if len(data)!=expected_bytes or hashlib.sha256(data).hexdigest()!=expected_sha256:
            raise m.UpgradeError("synthetic_input_identity_mismatch")
        if expected_git_blob is not None and git_blob(data)!=expected_git_blob:
            raise m.UpgradeError("synthetic_input_blob_mismatch")
        if stat.S_IMODE(st.st_mode)!=expected_mode:
            raise m.UpgradeError("synthetic_input_mode_mismatch")
        return data,{"path":os.path.abspath(os.fspath(p)),"dev":st.st_dev,"ino":st.st_ino,"uid":st.st_uid,"gid":st.st_gid,"mode":format(stat.S_IMODE(st.st_mode),"04o"),"nlink":st.st_nlink,"bytes":st.st_size,"mtime_ns":st.st_mtime_ns,"ctime_ns":st.st_ctime_ns,"sha256":expected_sha256,"git_blob_sha1":expected_git_blob}
    @staticmethod
    def _verify_file(path,*,expected_bytes,expected_sha256,expected_git_blob,expected_mode):
        p=Path(path); st=p.lstat(); data=p.read_bytes()
        if len(data)!=expected_bytes or hashlib.sha256(data).hexdigest()!=expected_sha256 or stat.S_IMODE(st.st_mode)!=expected_mode:
            raise m.UpgradeError("synthetic_installed_identity_mismatch")
        if expected_git_blob is not None and git_blob(data)!=expected_git_blob:
            raise m.UpgradeError("synthetic_installed_blob_mismatch")
    @staticmethod
    def _create_file(parent_fd,name,data,*,mode,expected_sha256):
        fd=os.open(name,os.O_RDWR|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW,0o400,dir_fd=parent_fd)
        try:
            os.write(fd,data); os.fchmod(fd,mode); os.fsync(fd)
        finally: os.close(fd)
        if hashlib.sha256(data).hexdigest()!=expected_sha256:
            raise m.UpgradeError("synthetic_stage_digest_mismatch")
    @staticmethod
    def _same_stat(a,b):
        return (a.st_dev,a.st_ino,a.st_mode,a.st_uid,a.st_gid,a.st_nlink,a.st_size,a.st_mtime_ns,a.st_ctime_ns)==(b.st_dev,b.st_ino,b.st_mode,b.st_uid,b.st_gid,b.st_nlink,b.st_size,b.st_mtime_ns,b.st_ctime_ns)
    @staticmethod
    def _same_stage_directory(a,b):
        return stat.S_ISDIR(a.st_mode) and stat.S_ISDIR(b.st_mode) and (a.st_dev,a.st_ino,a.st_mode,a.st_uid,a.st_gid)==(b.st_dev,b.st_ino,b.st_mode,b.st_uid,b.st_gid)
    @staticmethod
    def _renameat2(dir_fd,source,target,flags):
        libc=ctypes.CDLL(None,use_errno=True); fn=libc.renameat2
        fn.argtypes=[ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint]; fn.restype=ctypes.c_int
        rc=fn(dir_fd,source.encode(),dir_fd,target.encode(),flags)
        if rc: raise m.UpgradeError("synthetic_rename_failed:"+str(ctypes.get_errno()))

fake=FakeOuter()
policy=b"synthetic-policy\n"
receipt={"git_boundary_policy":"synthetic","temporary_git_metadata_write_required":True,"temporary_git_metadata_write_performed":True,"temporary_git_metadata_cleanup_completed":True,"source_repository_mutation":False,"source_object_fetch":False,"repository_config_loaded":False,"repository_callback_execution":False,"standalone_git_tool_admission":True,"native_parent_authority_claimed":False}

def fake_bindings(_outer,head):
    return ({"checkout":{"head":head,"branch":"main"},"lock_id":m.NEW_LOCK,"python":{"sha256":"1"*64,"bytes":1},"git_tool":{"sha256":"2"*64,"bytes":2}},policy,receipt)

def make_root(root:Path,boot:bytes,manifest:bytes):
    root.mkdir(mode=0o755); (root/m.BIN).mkdir(mode=0o755)
    b=root/m.BIN/m.BOOT; b.write_bytes(boot); b.chmod(0o555)
    f=root/m.MANIFEST; f.write_bytes(manifest); f.chmod(0o444)
    q=root/m.POLICY; q.write_bytes(policy); q.chmod(0o444)

def configure(td:Path):
    old_boot=b"old-bootstrap"; new_boot=b"new-bootstrap"
    old_man=b"old-manifest"; new_man=b"new-manifest"
    m.INSTALL_PARENT=td; m.INSTALL_NAME="fixed"; m.INSTALL_ROOT=td/"fixed"
    m.STAGE_NAME=".fixed.stage"; m.STAGE_ROOT=td/m.STAGE_NAME
    m.PREDECESSOR_NAME=".fixed.predecessor"; m.PREDECESSOR_ROOT=td/m.PREDECESSOR_NAME
    m.OLD_BOOT=(len(old_boot),hashlib.sha256(old_boot).hexdigest(),git_blob(old_boot))
    m.NEW_BOOT=(len(new_boot),hashlib.sha256(new_boot).hexdigest(),git_blob(new_boot))
    m.OLD_MAN=(len(old_man),hashlib.sha256(old_man).hexdigest(),git_blob(old_man))
    m.NEW_MAN=(len(new_man),hashlib.sha256(new_man).hexdigest(),git_blob(new_man))
    boot=td/"new-bootstrap"; boot.write_bytes(new_boot); boot.chmod(0o555)
    man=td/"new-manifest"; man.write_bytes(new_man); man.chmod(0o444)
    make_root(m.INSTALL_ROOT,old_boot,old_man)
    return boot,man,old_boot,new_boot,old_man,new_man

saved=(m.load_outer,m.bindings,m.os.geteuid,m.os.fchown,m.INSTALL_PARENT,m.INSTALL_NAME,m.INSTALL_ROOT,m.STAGE_NAME,m.STAGE_ROOT,m.PREDECESSOR_NAME,m.PREDECESSOR_ROOT,m.OLD_BOOT,m.NEW_BOOT,m.OLD_MAN,m.NEW_MAN,m.rebind)
try:
    m.load_outer=lambda: fake
    m.bindings=fake_bindings
    m.os.geteuid=lambda:0
    m.os.fchown=lambda fd,uid,gid: None
    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-success-") as d:
        td=Path(d); boot,man,old_boot,new_boot,old_man,new_man=configure(td)
        result=m.collect(boot,man,"a"*40)
        assert result["body"]["protected_state"]==m.READY
        cap=io.StringIO()
        with contextlib.redirect_stdout(cap):
            m.apply(boot,man,"a"*40,result["plan_id"],m.CONFIRM)
        out=cap.getvalue().splitlines()
        assert "status=GREEN" in out
        assert "publication_state=atomic_exchange_verified" in out
        assert "predecessor_retained=true" in out
        assert "rollback_available=true" in out
        assert (m.INSTALL_ROOT/m.BIN/m.BOOT).read_bytes()==new_boot
        assert (m.PREDECESSOR_ROOT/m.BIN/m.BOOT).read_bytes()==old_boot
        assert not m.STAGE_ROOT.exists()

    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-rollback-") as d:
        td=Path(d); boot,man,old_boot,new_boot,old_man,new_man=configure(td)
        result=m.collect(boot,man,"b"*40)
        real_rebind=m.rebind; calls={"n":0}
        def fail_after_exchange(*args,**kwargs):
            calls["n"]+=1
            return calls["n"]!=2
        m.rebind=fail_after_exchange
        try:
            m.apply(boot,man,"b"*40,result["plan_id"],m.CONFIRM)
        except m.PublishedError as exc:
            rec=m.failure_receipt(exc)
            assert rec["publication"]=="true"
            assert rec["publication_state"]=="published_rolled_back_green"
            assert rec["rollback_green"]=="true"
            assert (m.INSTALL_ROOT/m.BIN/m.BOOT).read_bytes()==old_boot
            assert not m.STAGE_ROOT.exists()
            assert not m.PREDECESSOR_ROOT.exists()
        else:
            raise AssertionError("post-exchange failure did not raise")
        finally:
            m.rebind=real_rebind

    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-interrupt-exchange-") as d:
        td=Path(d); boot,man,old_boot,new_boot,old_man,new_man=configure(td)
        result=m.collect(boot,man,"c"*40)
        real_rename=fake._renameat2; calls={"n":0}
        mask_before=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        def interrupt_after_exchange(*args,**kwargs):
            calls["n"]+=1
            real_rename(*args,**kwargs)
            if calls["n"]==1:
                os.kill(os.getpid(),signal.SIGINT)
        fake._renameat2=interrupt_after_exchange
        try:
            m.apply(boot,man,"c"*40,result["plan_id"],m.CONFIRM)
        except m.PublishedError as exc:
            rec=m.failure_receipt(exc)
            assert str(exc)=="atomic_upgrade_rolled_back_after_failure"
            assert rec["publication"]=="true"
            assert rec["publication_state"]=="published_rolled_back_green"
            assert rec["rollback_green"]=="true"
            assert (m.INSTALL_ROOT/m.BIN/m.BOOT).read_bytes()==old_boot
            assert not m.STAGE_ROOT.exists()
            assert not m.PREDECESSOR_ROOT.exists()
        else:
            raise AssertionError("interrupt after exchange did not reconcile publication")
        finally:
            fake._renameat2=real_rename
            assert signal.pthread_sigmask(signal.SIG_BLOCK,set())==mask_before

    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-interrupt-post-return-exchange-") as d:
        td=Path(d); boot,man,old_boot,new_boot,old_man,new_man=configure(td)
        result=m.collect(boot,man,"f"*40)
        real_observed=m.observed_rename; calls={"n":0}
        def interrupt_after_observation(*args,**kwargs):
            layout,handoff_error,rename_succeeded=real_observed(*args,**kwargs)
            calls["n"]+=1
            if calls["n"]==1:
                raise KeyboardInterrupt("synthetic_post_return_exchange_interrupt")
            return layout,handoff_error,rename_succeeded
        m.observed_rename=interrupt_after_observation
        try:
            m.apply(boot,man,"f"*40,result["plan_id"],m.CONFIRM)
        except m.PublishedError as exc:
            rec=m.failure_receipt(exc)
            assert str(exc)=="atomic_upgrade_rolled_back_after_failure"
            assert rec["publication"]=="true"
            assert rec["publication_state"]=="published_rolled_back_green"
            assert rec["rollback_attempted"]=="true"
            assert rec["rollback_green"]=="true"
            assert rec["rollback_final_state_verified"]=="true"
            assert (m.INSTALL_ROOT/m.BIN/m.BOOT).read_bytes()==old_boot
            assert not m.STAGE_ROOT.exists()
            assert not m.PREDECESSOR_ROOT.exists()
            assert calls["n"]>=2
        else:
            raise AssertionError("post-return exchange interrupt did not rollback")
        finally:
            m.observed_rename=real_observed

    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-success-reverted-before-observation-") as d:
        td=Path(d); boot,man,old_boot,new_boot,old_man,new_man=configure(td)
        result=m.collect(boot,man,"9"*40)
        real_layout=m.root_layout; calls={"n":0}
        mask_before=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        def restore_ready_before_observation(*args,**kwargs):
            calls["n"]+=1
            if calls["n"]==2:
                fd=os.open(m.INSTALL_PARENT,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
                try:
                    fake._renameat2(fd,m.STAGE_NAME,m.INSTALL_NAME,m.RENAME_EXCHANGE)
                finally:
                    os.close(fd)
            return real_layout(*args,**kwargs)
        m.root_layout=restore_ready_before_observation
        try:
            m.apply(boot,man,"9"*40,result["plan_id"],m.CONFIRM)
        except m.PublishedError as exc:
            rec=m.failure_receipt(exc)
            assert str(exc)=="atomic_exchange_succeeded_but_layout_reverted"
            assert rec["publication"]=="true"
            assert rec["publication_state"]=="published_needs_inspection"
            assert rec["rollback_attempted"]=="false"
            assert rec["rollback_green"]=="false"
            assert (m.INSTALL_ROOT/m.BIN/m.BOOT).read_bytes()==old_boot
            assert (m.STAGE_ROOT/m.BIN/m.BOOT).read_bytes()==new_boot
            assert not m.PREDECESSOR_ROOT.exists()
            assert calls["n"]==2
        else:
            raise AssertionError("successful exchange reverted to READY lost publication truth")
        finally:
            m.root_layout=real_layout
            assert signal.pthread_sigmask(signal.SIG_BLOCK,set())==mask_before

    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-interrupt-post-return-reverted-") as d:
        td=Path(d); boot,man,old_boot,new_boot,old_man,new_man=configure(td)
        result=m.collect(boot,man,"8"*40)
        real_observed=m.observed_rename; calls={"n":0}
        mask_before=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        def revert_ready_then_interrupt(*args,**kwargs):
            layout,handoff_error,rename_succeeded=real_observed(*args,**kwargs)
            calls["n"]+=1
            if calls["n"]==1:
                assert layout==m.LAYOUT_EXCHANGED and handoff_error is None and rename_succeeded is True
                fd=os.open(m.INSTALL_PARENT,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
                try:
                    fake._renameat2(fd,m.STAGE_NAME,m.INSTALL_NAME,m.RENAME_EXCHANGE)
                finally:
                    os.close(fd)
                os.kill(os.getpid(),signal.SIGINT)
                raise AssertionError("fresh SIGINT did not interrupt tuple assignment")
            return layout,handoff_error,rename_succeeded
        m.observed_rename=revert_ready_then_interrupt
        try:
            m.apply(boot,man,"8"*40,result["plan_id"],m.CONFIRM)
        except m.PublishedError as exc:
            rec=m.failure_receipt(exc)
            assert str(exc)=="atomic_upgrade_exchange_succeeded_ready_needs_inspection"
            assert rec["publication"]=="true"
            assert rec["publication_state"]=="published_needs_inspection"
            assert rec["rollback_attempted"]=="false"
            assert rec["rollback_green"]=="false"
            assert rec["rollback_final_state_verified"]=="false"
            assert (m.INSTALL_ROOT/m.BIN/m.BOOT).read_bytes()==old_boot
            assert (m.STAGE_ROOT/m.BIN/m.BOOT).read_bytes()==new_boot
            assert not m.PREDECESSOR_ROOT.exists()
            assert calls["n"]==1
        else:
            raise AssertionError("return-boundary reverted layout lost successful exchange truth")
        finally:
            m.observed_rename=real_observed
            assert signal.pthread_sigmask(signal.SIG_BLOCK,set())==mask_before

    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-interrupt-retention-") as d:
        td=Path(d); boot,man,old_boot,new_boot,old_man,new_man=configure(td)
        result=m.collect(boot,man,"d"*40)
        real_rename=fake._renameat2; calls={"n":0}
        mask_before=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        def interrupt_after_retention(*args,**kwargs):
            calls["n"]+=1
            real_rename(*args,**kwargs)
            if calls["n"]==2:
                os.kill(os.getpid(),signal.SIGINT)
        fake._renameat2=interrupt_after_retention
        try:
            m.apply(boot,man,"d"*40,result["plan_id"],m.CONFIRM)
        except m.PublishedError as exc:
            rec=m.failure_receipt(exc)
            assert str(exc)=="atomic_upgrade_rolled_back_after_failure"
            assert rec["publication"]=="true"
            assert rec["publication_state"]=="published_rolled_back_green"
            assert rec["rollback_green"]=="true"
            assert (m.INSTALL_ROOT/m.BIN/m.BOOT).read_bytes()==old_boot
            assert not m.STAGE_ROOT.exists()
            assert not m.PREDECESSOR_ROOT.exists()
        else:
            raise AssertionError("interrupt after retention did not reconcile publication")
        finally:
            fake._renameat2=real_rename
            assert signal.pthread_sigmask(signal.SIG_BLOCK,set())==mask_before

    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-layout-inspection-failure-") as d:
        td=Path(d); boot,man,old_boot,new_boot,old_man,new_man=configure(td)
        result=m.collect(boot,man,"e"*40)
        real_layout=m.root_layout; calls={"n":0}
        mask_before=signal.pthread_sigmask(signal.SIG_BLOCK,set())
        def unavailable_after_attempt(*args,**kwargs):
            calls["n"]+=1
            if calls["n"]>=2:
                raise OSError("synthetic_layout_unavailable")
            return real_layout(*args,**kwargs)
        m.root_layout=unavailable_after_attempt
        try:
            m.apply(boot,man,"e"*40,result["plan_id"],m.CONFIRM)
        except m.PublishedError as exc:
            rec=m.failure_receipt(exc)
            assert str(exc)=="rename_outcome_needs_inspection"
            assert rec["publication"]=="true"
            assert rec["publication_state"]=="published_needs_inspection"
            assert rec["rollback_attempted"]=="false"
            assert rec["rollback_green"]=="false"
            assert (m.INSTALL_ROOT/m.BIN/m.BOOT).read_bytes()==new_boot
            assert (m.STAGE_ROOT/m.BIN/m.BOOT).read_bytes()==old_boot
            assert not m.PREDECESSOR_ROOT.exists()
            assert calls["n"]==2
        else:
            raise AssertionError("layout inspection failure lost publication truth")
        finally:
            m.root_layout=real_layout
            assert signal.pthread_sigmask(signal.SIG_BLOCK,set())==mask_before

    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-upgrade-foreign-") as d:
        td=Path(d); boot,man,old_boot,new_boot,old_man,new_man=configure(td)
        fd=os.open(td,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
        try:
            os.mkdir(m.STAGE_NAME,0o755,dir_fd=fd)
            sfd=os.open(m.STAGE_NAME,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC,dir_fd=fd)
            try:
                expected=os.fstat(sfd)
                x=m.STAGE_ROOT/"foreign"; x.write_text("do-not-delete")
            finally: os.close(sfd)
            assert m.cleanup(fake,fd,expected) is False
            assert x.exists()
        finally: os.close(fd)
finally:
    (m.load_outer,m.bindings,m.os.geteuid,m.os.fchown,m.INSTALL_PARENT,m.INSTALL_NAME,m.INSTALL_ROOT,m.STAGE_NAME,m.STAGE_ROOT,m.PREDECESSOR_NAME,m.PREDECESSOR_ROOT,m.OLD_BOOT,m.NEW_BOOT,m.OLD_MAN,m.NEW_MAN,m.rebind)=saved

print("VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_ATOMIC_UPGRADE_V1_PROOF_GREEN")
print("target_blob_bound=true")
print("success_atomic_exchange_exercised=true")
print("predecessor_retention_exercised=true")
print("post_exchange_failure_rollback_exercised=true")
print("publication_truth_monotonic=true")
print("rename_outcome_layout_reconciled=true")
print("interrupt_after_exchange_reconciled=true")
print("interrupt_after_retention_reconciled=true")
print("pending_sigint_after_exchange_reconciled=true")
print("post_return_exchange_interrupt_rollback_exercised=true")
print("pending_sigint_after_retention_reconciled=true")
print("successful_exchange_reverted_layout_publication_aware=true")
print("successful_exchange_reverted_layout_prepublication_cleanup=false")
print("post_return_reverted_layout_interrupt_publication_aware=true")
print("layout_inspection_failure_publication_aware=true")
print("signal_mask_restored_after_layout_failure=true")
print("inspection_failure_automatic_retry_false=true")
print("foreign_stage_cleanup_refused=true")
print("bootstrap_execution=false")
print("inner_installer_execution=false")
print("service_mutation=false")
print("credential_access=false")
print("funds_movement=false")

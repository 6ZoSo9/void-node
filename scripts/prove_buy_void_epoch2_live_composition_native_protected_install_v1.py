#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
INSTALLER=ROOT/"ops/precision/void_buy_void_epoch2_live_composition_native_protected_install_v1.py"
LOCK=ROOT/"ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v3.json"
INSTALLER_BLOB="eea063dc6eddb6b5d1d8cd5812b7d5172cf6a2d9"
LOCK_BLOB="57f965a944031eac90d69b4104b0f8f2473e66cc"
LOCK_ID="voidbuye2nativecandlock3_024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659"
EXPECTED_NATIVE_SHA256="78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589"
EXPECTED_NATIVE_BYTES=726976
EXPECTED_RUNNER_SHA256="2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73"
EXPECTED_RUNNER_BYTES=30103


def git_blob(raw:bytes)->str:
    h=hashlib.sha1()
    h.update(b"blob "+str(len(raw)).encode("ascii")+b"\0")
    h.update(raw)
    return h.hexdigest()


def direct(path:Path)->bytes:
    before=path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
    assert before.st_nlink==1
    raw=path.read_bytes()
    after=path.lstat()
    assert (
        before.st_dev,before.st_ino,before.st_mode,before.st_uid,before.st_gid,
        before.st_nlink,before.st_size,before.st_mtime_ns,before.st_ctime_ns,
    )==(
        after.st_dev,after.st_ino,after.st_mode,after.st_uid,after.st_gid,
        after.st_nlink,after.st_size,after.st_mtime_ns,after.st_ctime_ns,
    )
    assert len(raw)==before.st_size
    return raw


installer_raw=direct(INSTALLER)
lock_raw=direct(LOCK)
assert git_blob(installer_raw)==INSTALLER_BLOB
assert git_blob(lock_raw)==LOCK_BLOB
source=installer_raw.decode("utf-8")
ast.parse(source)

spec=importlib.util.spec_from_file_location("epoch2_native_install_v1",INSTALLER)
assert spec is not None and spec.loader is not None
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

lock=json.loads(lock_raw)
assert lock["lock_id"]==LOCK_ID
assert lock["candidate_accepted"] is True
assert lock["native_binary_identity_accepted"] is True
assert lock["runner_identity_accepted"] is True
assert lock["protected_install_authorized"] is False
assert lock["live_execution_authorized"] is False
assert lock["public_presale_activation_authorized"] is False
assert lock["wc_void_market_activation_authorized"] is False
assert lock["funds_movement_authorized"] is False

accepted=module.accepted_lock()
assert accepted["lock_id"]==LOCK_ID
assert module.NATIVE_SHA256==EXPECTED_NATIVE_SHA256
assert module.NATIVE_BYTES==EXPECTED_NATIVE_BYTES
assert module.RUNNER_SHA256==EXPECTED_RUNNER_SHA256
assert module.RUNNER_BYTES==EXPECTED_RUNNER_BYTES
assert module.INSTALL_ROOT==Path("/opt/void-buy-void-epoch2-live-composition-v2")
assert module.STAGE_ROOT==Path("/opt/.void-buy-void-epoch2-live-composition-v2.stage")

policy=module.policy_bytes(
    "a"*40,
    {"sha256":"b"*64,"bytes":123456},
)
assert policy==(
    "schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1\n"
    "expected_head="+"a"*40+"\n"
    "runner_sha256="+EXPECTED_RUNNER_SHA256+"\n"
    "runner_bytes="+str(EXPECTED_RUNNER_BYTES)+"\n"
    "node_sha256="+"b"*64+"\n"
    "node_bytes=123456\n"
).encode("ascii")

create_at=source.index("def _create_file(")
chown_at=source.index("os.fchown(fd,0,0)",create_at)
chmod_at=source.index("os.fchmod(fd,mode)",chown_at)
file_fsync_at=source.index("os.fsync(fd)",chmod_at)
file_verify_at=source.index("_fd_file_ok(",file_fsync_at)
assert create_at<chown_at<chmod_at<file_fsync_at<file_verify_at

apply_at=source.index("def apply(")
repo_recheck_at=source.index("repository_identity(expected_head)",apply_at+1)
node_recheck_at=source.index("current_node=node_identity()",repo_recheck_at)
parent_recheck_at=source.index("parent_visible=INSTALL_PARENT.lstat()",node_recheck_at)
rename_at=source.index("_renameat2(opt_fd,STAGE_NAME,INSTALL_NAME,RENAME_NOREPLACE)",parent_recheck_at)
published_at=source.index("published=True",rename_at)
postcheck_at=source.index("_post_publication_checks(",published_at)
assert repo_recheck_at<node_recheck_at<parent_recheck_at<rename_at<published_at<postcheck_at
assert "os.replace(STAGE_ROOT,INSTALL_ROOT)" not in source
assert "shutil.rmtree(INSTALL_ROOT)" not in source
assert "os.rmdir(INSTALL_NAME" not in source
assert 'print("public_presale_activation=false")' in source
assert 'print("wc_void_market_activation=false")' in source
assert 'print("funds_movement=false")' in source

published=module.PublishedInstallError(
    "synthetic_post_publish",
    phase="parent_fsync",
    parent_fsync_completed=False,
    final_verification_completed=False,
    original_failure_class="OSError",
    original_failure_reason="os_error_5",
)
receipt=module.failure_receipt(published,stage_created=False)
assert receipt["protected_install_performed"]=="true"
assert receipt["publication"]=="true"
assert receipt["publication_state"]=="published_needs_inspection"
assert receipt["parent_fsync_completed"]=="false"
assert receipt["final_state_verified"]=="false"

pre=module.InstallError("synthetic_pre_publish")
pre_receipt=module.failure_receipt(
    pre,
    stage_created=True,
    stage_cleanup_completed=False,
)
assert pre_receipt["protected_install_performed"]=="false"
assert pre_receipt["publication"]=="false"
assert pre_receipt["stage_created"]=="true"
assert pre_receipt["stage_cleanup_completed"]=="false"

with tempfile.TemporaryDirectory(prefix="void-e2-native-install-proof-") as td:
    root=Path(td)
    tampered=root/"candidate"
    tampered.write_bytes(b"\x7fELF"+b"\0"*(EXPECTED_NATIVE_BYTES-4))
    tampered.chmod(0o444)
    try:
        module.native_candidate(tampered)
    except module.InstallError as exc:
        assert str(exc)=="file_sha256_mismatch:"+str(tampered)
    else:
        raise AssertionError("tampered native candidate unexpectedly admitted")

    target=root/"target"
    target.symlink_to(tampered)
    try:
        module.native_candidate(target)
    except module.InstallError as exc:
        assert "file_metadata_invalid" in str(exc)
    else:
        raise AssertionError("symlink native candidate unexpectedly admitted")

    stage=root/"stage"
    stage.mkdir()
    parent_fd=os.open(root,os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
    try:
        module._renameat2(parent_fd,"stage","final",module.RENAME_NOREPLACE)
        assert not stage.exists()
        assert (root/"final").is_dir()
        second=root/"stage2"
        second.mkdir()
        try:
            module._renameat2(
                parent_fd,"stage2","final",module.RENAME_NOREPLACE
            )
        except module.InstallError:
            pass
        else:
            raise AssertionError("rename_noreplace unexpectedly overwrote final root")
        assert second.is_dir()
    finally:
        os.close(parent_fd)

python="/usr/bin/python3"
self_test=subprocess.run(
    [python,"-I","-B",str(INSTALLER),"--self-test"],
    cwd=ROOT,stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
    check=False,timeout=30,
)
assert self_test.returncode==0,self_test.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1_SELF_TEST_GREEN",
    "accepted_v3_lock_bound=true",
    "atomic_complete_root_publication_required=true",
    "policy_expected_head_bound=true",
    "policy_runner_identity_bound=true",
    "policy_node_identity_bound=true",
    "post_publication_failure_receipt_truthful=true",
    "create_only=true",
    "protected_install_authorized=false",
    "live_execution_authorized=false",
    "funds_movement=false",
):
    assert line in self_test.stdout.splitlines(),line

source_plan=subprocess.run(
    [python,"-I","-B",str(INSTALLER),"--source-plan"],
    cwd=ROOT,stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
    check=False,timeout=30,
)
assert source_plan.returncode==0,source_plan.stderr
for line in (
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "protected_install_performed=false",
    "live_execution=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
):
    assert line in source_plan.stdout.splitlines(),line

missing_confirm=subprocess.run(
    [
        python,"-I","-B",str(INSTALLER),"--apply",
        "--native-candidate","/nonexistent/epoch2-native",
        "--expected-head","0"*40,
        "--confirm","WRONG",
    ],
    cwd=ROOT,stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
    check=False,timeout=30,
)
assert missing_confirm.returncode==2
assert "reason=explicit_create_only_confirmation_required" in missing_confirm.stdout.splitlines()
assert "protected_install_performed=false" in missing_confirm.stdout.splitlines()
assert "publication=false" in missing_confirm.stdout.splitlines()

if os.geteuid()!=0:
    root_required=subprocess.run(
        [
            python,"-I","-B",str(INSTALLER),"--apply",
            "--native-candidate","/nonexistent/epoch2-native",
            "--expected-head","0"*40,
            "--confirm",module.CONFIRM_TOKEN,
        ],
        cwd=ROOT,stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,
        check=False,timeout=30,
    )
    assert root_required.returncode==2
    assert "reason=root_required_for_apply" in root_required.stdout.splitlines()
    assert "protected_install_performed=false" in root_required.stdout.splitlines()

print("VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1_PROOF_GREEN")
print("accepted_v3_lock_blob_bound=true")
print("installer_blob_bound=true")
print("native_candidate_tamper_rejected=true")
print("native_candidate_symlink_rejected=true")
print("rename_noreplace_exercised=true")
print("final_metadata_fsync_before_publication_bound=true")
print("repository_node_parent_revalidated_before_publication=true")
print("atomic_complete_root_publication_bound=true")
print("truthful_post_publication_receipt_bound=true")
print("hosted_apply_execution=false")
print("live_execution_authorized=false")
print("public_presale_activation_authorized=false")
print("wc_void_market_activation_authorized=false")
print("funds_movement_authorized=false")

#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
import pathlib
import re
import subprocess
import sys
import tempfile

MARKER="VOID_V7_V5_STAGE_STATIC_LAUNCHER_QUALIFIER_V2_PROOF"
ROOT=pathlib.Path(__file__).resolve().parents[1]
LAUNCHER_REL="ops/precision/void_v7_v5_source_receipt_stage_root_launcher_v2.c"
LAUNCHER_BLOB="039a075868397080eb1baa149ef9addbb49a6441"
QUALIFIER_REL="ops/precision/void_v7_v5_source_receipt_stage_pair_qualifier_v2.py"
QUALIFIER_BLOB="f7ea902b7d145d4c770d76f41b0c2fb974ee3f3e"
PLAN_REL="ops/security/buy-void-v7-v5-stage-trusted-admission-plan-v2.json"
PLAN_BLOB="615ed3862c2a78fc26dcc9d26cb1171966cf0b24"

def run(argv:list[str],timeout:int=60)->subprocess.CompletedProcess[str]:
    return subprocess.run(
        argv,cwd=ROOT,stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,timeout=timeout,check=False,
    )

def git(*args:str)->str:
    cp=run(["/usr/bin/git","-C",str(ROOT),*args],30)
    if cp.returncode!=0 or cp.stderr:
        raise AssertionError("git_failed:"+args[0])
    return cp.stdout.strip()

def bind(relative:str,blob:str)->str:
    assert git("rev-parse","HEAD:"+relative)==blob,relative
    assert git("hash-object","--",relative)==blob,relative
    return (ROOT/relative).read_text("utf-8")

launcher=bind(LAUNCHER_REL,LAUNCHER_BLOB)
qualifier=bind(QUALIFIER_REL,QUALIFIER_BLOB)
bind(PLAN_REL,PLAN_BLOB)

for token in (
    '#define MARKER "VOID_V7_V5_SOURCE_RECEIPT_STAGE_ROOT_LAUNCHER_V2"',
    '#define FIXED_ROOT "/opt/void-v7-v5-source-receipt-stage-closed-tree-v2"',
    '#define PLAN_CONTRACT_ID "voidv7v5stageadmissionplan2_3e1b9c2c9cc112da764de6b68e7a4959d416cf286f3265759f331e1c5fd8c9fe"',
    '#define PLAN_CONTRACT_BLOB "615ed3862c2a78fc26dcc9d26cb1171966cf0b24"',
    '#define SOURCE_INSTALLER_REL "source/ops/precision/void_v7_v5_source_stage_install_v1.py"',
    '#define RECEIPT_INSTALLER_REL "source/ops/precision/void_v7_v5_receipt_stage_install_v1.py"',
    '#define SOURCE_INSTALLER_BYTES 126021U',
    '#define SOURCE_INSTALLER_SHA256 "588a665df3788b21465859ef99a5b58f09bfeb3fc0a5955c44eb6d6aee6cee25"',
    '#define RECEIPT_INSTALLER_BYTES 11645U',
    '#define RECEIPT_INSTALLER_SHA256 "0191532118f7d543ac0b9cf2ea287f5a22f4dbf686b6b433d0c45a3d896b3d09"',
    '#define IMPLEMENTATION_HEAD "f621ebb7b5e74ea1b34d30eff62bf6b66bb79b16"',
    '#define IMPLEMENTATION_TREE "b0affbc7f3553cef7f4ab46d7185c934b0013fe2"',
    '#define VOID_V7_V5_STAGE_V2_ACCEPTANCE_ID "UNACCEPTED"',
    '#define VOID_V7_V5_STAGE_V2_ACCEPTED_MANIFEST_SHA256 ""',
    '#define VOID_V7_V5_STAGE_V2_ACCEPTED_MANIFEST_BYTES 0U',
    'if(!production_manifest_lock_bound())hold("production_payload_manifest_lock_not_bound");',
    'source-stage-plan',
    'source-stage-apply',
    'receipt-stage-plan',
    'receipt-stage-apply',
    'plan_extra_authority_forbidden',
    'cross_operation_confirmation_rejected=true',
    'fexecve(python_fd,args,envp)',
    '"-I";args[n++]="-B";args[n++]="-S"',
    'caller_filesystem_path_authority=false',
    'caller_source_generation_authority=false',
    'caller_receipt_bytes_authority=false',
    'production_payload_manifest_lock_embedded=false',
    'root_execution_authorized=false',
    'source_stage_apply_authorized=false',
    'receipt_stage_apply_authorized=false',
    'fixed_source_exchange_authority=false',
    'fixed_receipt_exchange_authority=false',
    'service_mutation=false',
    'funds_movement=false',
):
    assert token in launcher,token

# Exact FD-to-Python binding: the reviewed installer is inherited rather than
# re-opened by path after the last receipt/identity validation.
for token in (
    'int selected_installer_fd=source?source_installer_fd:receipt_installer_fd;',
    'int unselected_installer_fd=source?receipt_installer_fd:source_installer_fd;',
    'if(close(unselected_installer_fd))hold("unselected_installer_close_failed");',
    'revalidate_file(selected_installer_path,selected_installer_fd,selected_installer_id);',
    'prepare_installer_script_fd(selected_installer_fd,installer_script,sizeof(installer_script));',
    'fcntl(fd,F_SETFD,flags&~FD_CLOEXEC)',
    '"/proc/self/fd/%d"',
    'args[n++]=installer_script;',
    'python_selected_installer_descriptor_inheritance_required=true',
):
    assert token in launcher,token
script_arguments=re.findall(r'args\[n\+\+\]\s*=\s*([^;]+);',launcher)
assert "installer_script" in script_arguments
assert not any(
    "FIXED_SOURCE_INSTALLER" in value or "FIXED_RECEIPT_INSTALLER" in value or
    "selected_installer_path" in value or "(char*)installer" in value
    for value in script_arguments
),script_arguments
assert 'close(source_installer_fd);close(receipt_installer_fd)' not in launcher

for forbidden in (
    "getenv(",
    "system(",
    "execvp(",
    "execlp(",
    "socket(",
    "connect(",
    "--candidate",
    "--receipt-bytes",
):
    assert forbidden not in launcher,forbidden

# --path exists only as an explicitly rejected negative self-test fixture.
assert launcher.count('"--path"')==1
# --expected-head is emitted by the launcher to the source installer, never parsed from caller input.
assert launcher.count('"--expected-head"')==1

# Four operation names should appear in request parser/self-test but there must be no exchange/service operation.
for forbidden in (
    "source-exchange",
    "receipt-exchange",
    "transition-journal",
    "consumer-fence",
    "service-restart",
):
    assert forbidden not in launcher,forbidden

for token in (
    'SOURCE_STAGE=pathlib.Path("/opt/.void-buy-void-v7-reviewed-v1.stage-v5")',
    'SOURCE_INTERNAL_STAGE=pathlib.Path("/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1")',
    'expected_root_mode=0o755',
    'expected_root_mode=None',
    'source_stage_root_mode_0755_required=true',
    'fixed_v4_source_root_owned_nonwritable_required=true',
    'RECEIPT_STAGE=pathlib.Path(',
    '"/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5"',
    'V5_HEAD="be2fbe41aaba291d3f874b9de52bcb87336307f5"',
    'V5_TREE="749877d2320ecee9d659720b32e4726a0c42d697"',
    'V5_PARENT="79081038cf4f03c2971bdcb32c54daf6a87fbabf"',
    'V5_REACHABLE_COMMITS=18357',
    'V5_RECEIPT_SHA256=(',
    '"12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"',
    'staging_pair_exact=true',
    'journal_fence_path_selection_deferred=true',
    'exchange_preconditions_complete=false',
    'fixed_source_exchange_authority=false',
    'fixed_receipt_exchange_authority=false',
    'runtime_cutover_authority=false',
    'filesystem_mutation=false',
    'funds_movement=false',
):
    assert token in qualifier,token

compile((ROOT/QUALIFIER_REL).read_bytes(),QUALIFIER_REL,"exec",dont_inherit=True,optimize=0)

with tempfile.TemporaryDirectory(prefix="void-v5-stage-launcher-proof-") as td:
    out=pathlib.Path(td)/"launcher"
    cc=run([
        "/usr/bin/gcc","-std=c11","-O2","-Wall","-Wextra","-Werror",
        str(ROOT/LAUNCHER_REL),"-o",str(out),
    ],120)
    assert cc.returncode==0,(cc.stdout,cc.stderr)
    st=run([str(out),"--self-test"],30)
    assert st.returncode==0,(st.stdout,st.stderr)
    assert st.stderr==""
    lines=st.stdout.splitlines()
    for marker in (
        "VOID_V7_V5_SOURCE_RECEIPT_STAGE_ROOT_LAUNCHER_V2_SELF_TEST_GREEN",
        "dual_installer_policy_binding_required=true",
        "four_fixed_operations_required=true",
        "python_selected_installer_descriptor_inheritance_required=true",
        "caller_filesystem_path_authority=false",
        "caller_source_generation_authority=false",
        "caller_receipt_bytes_authority=false",
        "production_payload_manifest_lock_embedded=false",
        "production_payload_manifest_accepted=false",
        "root_execution_authorized=false",
        "source_stage_apply_authorized=false",
        "receipt_stage_apply_authorized=false",
        "service_mutation=false",
        "funds_movement=false",
    ):
        assert marker in lines,marker

    hold=run([str(out),"source-stage-plan"],30)
    assert hold.returncode==2,(hold.stdout,hold.stderr)
    assert "production_payload_manifest_lock_not_bound" in hold.stderr
    assert "root_execution_authorized=false" not in hold.stdout # launcher HOLD receipt is stderr-only authority text

    # Non-root kernel behavior regression: a pathname swap must not change
    # which Python source bytes execute from the retained descriptor.
    fixture=pathlib.Path(td)/"verified_installer.py"
    fixture.write_text("print('VERIFIED_FD_BYTES')\n",encoding="utf-8")
    fd=os.open(fixture,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK|os.O_CLOEXEC)
    try:
        fixture.rename(pathlib.Path(td)/"original_installer.py")
        fixture.write_text("print('SWAPPED_PATH_BYTES')\n",encoding="utf-8")
        retained=subprocess.run(
            [sys.executable,"-I","-B","-S",f"/proc/self/fd/{fd}"],
            pass_fds=(fd,),cwd=ROOT,stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=30,
            check=False,
        )
        assert retained.returncode==0,(retained.stdout,retained.stderr)
        assert retained.stdout.strip()=="VERIFIED_FD_BYTES",retained.stdout
        assert retained.stderr=="",retained.stderr
        rebound=run([sys.executable,"-I","-B","-S",str(fixture)],30)
        assert rebound.returncode==0,(rebound.stdout,rebound.stderr)
        assert rebound.stdout.strip()=="SWAPPED_PATH_BYTES",rebound.stdout
    finally:
        os.close(fd)

q=run([sys.executable,"-I","-B",QUALIFIER_REL,"--self-test"],60)
assert q.returncode==0,(q.stdout,q.stderr)
assert q.stderr==""
for marker in (
    "VOID_V7_V5_SOURCE_RECEIPT_STAGE_PAIR_QUALIFIER_V2_SELF_TEST_GREEN",
    "fixed_paths_only=true",
    "source_stage_root_mode_0755_required=true",
    "fixed_v4_source_root_owned_nonwritable_required=true",
    "source_internal_stage_build_v1_required=true",
    "journal_fence_path_selection_deferred=true",
    "exchange_preconditions_complete=false",
    "exchange_authority=false",
    "runtime_cutover_authority=false",
    "filesystem_mutation=false",
    "service_mutation=false",
    "funds_movement=false",
):
    assert marker in q.stdout.splitlines(),marker

print(MARKER+"_GREEN")
print("launcher_blob="+LAUNCHER_BLOB)
print("qualifier_blob="+QUALIFIER_BLOB)
print("trusted_admission_plan_blob="+PLAN_BLOB)
print("launcher_compiles_with_werror=true")
print("launcher_self_test_green=true")
print("selected_installer_procfd_execution_bound=true")
print("path_substitution_cannot_change_executed_fd_bytes=true")
print("production_manifest_lock_unbound=true")
print("normal_launcher_operation_fail_closed=true")
print("four_fixed_operations_only=true")
print("caller_path_authority=false")
print("caller_source_generation_authority=false")
print("read_only_pair_qualifier_self_test_green=true")
print("source_stage_mode_0755_bound=true")
print("source_internal_stage_build_v1_bound=true")
print("predecessor_0555_tmp_v1_not_reused=true")
print("journal_fence_path_selection_deferred=true")
print("launcher_install_authorized=false")
print("root_execution_authorized=false")
print("source_stage_apply_authorized=false")
print("receipt_stage_apply_authorized=false")
print("fixed_source_exchange_authority=false")
print("fixed_receipt_exchange_authority=false")
print("service_mutation=false")
print("public_presale_activation=false")
print("funds_movement=false")
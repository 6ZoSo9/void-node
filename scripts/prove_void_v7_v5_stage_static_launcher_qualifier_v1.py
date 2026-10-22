#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import re
import subprocess
import sys
import tempfile

MARKER="VOID_V7_V5_STAGE_STATIC_LAUNCHER_QUALIFIER_V1_PROOF"
ROOT=pathlib.Path(__file__).resolve().parents[1]
LAUNCHER_REL="ops/precision/void_v7_v5_source_receipt_stage_root_launcher_v1.c"
LAUNCHER_BLOB="8ea02553776cf71dceb5a647e9bf0e69d3e2c978"
QUALIFIER_REL="ops/precision/void_v7_v5_source_receipt_stage_pair_qualifier_v1.py"
QUALIFIER_BLOB="c3ec29996876aa5b0f712988c4595c946d51868b"
PLAN_REL="ops/security/buy-void-v7-v5-stage-trusted-admission-plan-v1.json"
PLAN_BLOB="3762b757a21048d6eb891245559e7c277716cf93"

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
    '#define MARKER "VOID_V7_V5_SOURCE_RECEIPT_STAGE_ROOT_LAUNCHER_V1"',
    '#define FIXED_ROOT "/opt/void-v7-v5-source-receipt-stage-closed-tree-v1"',
    '#define SOURCE_INSTALLER_REL "source/ops/precision/void_v7_v5_source_stage_install_v1.py"',
    '#define RECEIPT_INSTALLER_REL "source/ops/precision/void_v7_v5_receipt_stage_install_v1.py"',
    '#define SOURCE_INSTALLER_BYTES 126640U',
    '#define SOURCE_INSTALLER_SHA256 "76380a0f22ae0767ccd21c7ab547ed0c012bf3341e6dcc491ee5936212353e4e"',
    '#define RECEIPT_INSTALLER_BYTES 19583U',
    '#define RECEIPT_INSTALLER_SHA256 "7ba422dc2bba18668e08ec3ff104e29ac630e886ef308acb21d07c04662c7af4"',
    '#define IMPLEMENTATION_HEAD "f171973a91056f9e0452cfbe06e760f411f62a72"',
    '#define IMPLEMENTATION_TREE "c03fe5f85d4a1d372c001595ae19d822ce55e3b8"',
    '#define VOID_V7_V5_STAGE_ACCEPTANCE_ID "UNACCEPTED"',
    '#define VOID_V7_V5_STAGE_ACCEPTED_MANIFEST_SHA256 ""',
    '#define VOID_V7_V5_STAGE_ACCEPTED_MANIFEST_BYTES 0U',
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
        "VOID_V7_V5_SOURCE_RECEIPT_STAGE_ROOT_LAUNCHER_V1_SELF_TEST_GREEN",
        "dual_installer_policy_binding_required=true",
        "four_fixed_operations_required=true",
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

q=run([sys.executable,"-I","-B",QUALIFIER_REL,"--self-test"],60)
assert q.returncode==0,(q.stdout,q.stderr)
assert q.stderr==""
for marker in (
    "VOID_V7_V5_SOURCE_RECEIPT_STAGE_PAIR_QUALIFIER_V1_SELF_TEST_GREEN",
    "fixed_paths_only=true",
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
print("production_manifest_lock_unbound=true")
print("normal_launcher_operation_fail_closed=true")
print("four_fixed_operations_only=true")
print("caller_path_authority=false")
print("caller_source_generation_authority=false")
print("read_only_pair_qualifier_self_test_green=true")
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
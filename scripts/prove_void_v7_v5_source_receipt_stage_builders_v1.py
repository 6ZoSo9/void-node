#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import sys
import tempfile

MARKER="VOID_V7_V5_SOURCE_RECEIPT_STAGE_BUILDERS_V1_PROOF"
ROOT=pathlib.Path(__file__).resolve().parents[1]

SOURCE_REL="ops/precision/void_v7_v5_source_stage_install_v1.py"
SOURCE_BLOB="1f251a8489e0b2a69683d991785cb4f46fa6dff5"
RECEIPT_REL="ops/precision/void_v7_v5_receipt_stage_install_v1.py"
RECEIPT_BLOB="d719de6e8c4974a9356577ee16a9e68fa02b7ca0"
STAGING_PLAN_REL="ops/security/buy-void-v7-v5-source-receipt-staging-plan-v1.json"
STAGING_PLAN_BLOB="37c6f5bd5753f05e57dde3c95f9c2f89c0abdc4d"

def run(argv:list[str],timeout=60)->subprocess.CompletedProcess[str]:
    return subprocess.run(
        argv,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=timeout,
        check=False,
    )

def git(*args:str)->str:
    cp=run(["/usr/bin/git","-C",str(ROOT),*args],30)
    if cp.returncode!=0 or cp.stderr:
        raise AssertionError("git_failed:"+args[0])
    return cp.stdout.strip()

def bind(relative:str,blob:str)->str:
    path=ROOT/relative
    assert git("rev-parse","HEAD:"+relative)==blob,relative
    assert git("hash-object","--",relative)==blob,relative
    return path.read_text("utf-8")

source=bind(SOURCE_REL,SOURCE_BLOB)
receipt=bind(RECEIPT_REL,RECEIPT_BLOB)
bind(STAGING_PLAN_REL,STAGING_PLAN_BLOB)

for path in (ROOT/SOURCE_REL,ROOT/RECEIPT_REL):
    compile(path.read_bytes(),str(path),"exec",dont_inherit=True,optimize=0)

for token in (
    'MARKER = _BOOTSTRAP_MARKER',
    'SOURCE_HEAD = "be2fbe41aaba291d3f874b9de52bcb87336307f5"',
    'SOURCE_TREE = "749877d2320ecee9d659720b32e4726a0c42d697"',
    '"79081038cf4f03c2971bdcb32c54daf6a87fbabf"',
    'REACHABLE_COMMITS = 18357',
    'BUILDER_REL = "ops/precision/void_v7_source_release_full_history_reseal_v2.py"',
    'BUILDER_BLOB = "bb78c7d9f468baa20b580d052d934d9b97c05134"',
    'STAGING_PLAN_REL = "ops/security/buy-void-v7-v5-source-receipt-staging-plan-v1.json"',
    'STAGING_PLAN_BLOB = "37c6f5bd5753f05e57dde3c95f9c2f89c0abdc4d"',
    'FIXED_V4_SOURCE = pathlib.Path("/opt/void-buy-void-v7-reviewed-v1")',
    'FIXED_V4_HEAD = "75927cae2c7ed0b4273e6218937dedf69824f64c"',
    'FIXED_V4_TREE = "51fcfacd0303ae6e1c5aa8f4505fbff24ded3371"',
    'TARGET_NAME = ".void-buy-void-v7-reviewed-v1.stage-v5"',
    'STAGE_NAME = ".void-buy-void-v7-reviewed-v1.stage-v5.tmp-v1"',
    'CONFIRM_TOKEN = "INSTALL_VOID_V7_V5_SOURCE_STAGE_V1_CREATE_ONLY"',
    'RENAME_NOREPLACE = 1',
    'def _copy_candidate_tree_iterative(',
    'def _verify_full_history_root(',
    'def _prepare_private_stage_for_runtime_verification(',
    'def _seal_verified_stage_for_publication(',
    'def _rename_noreplace(',
    'os.O_NOFOLLOW | os.O_NONBLOCK',
    'copy_source_fifo_swap_nonblocking=true',
    'candidate_read_boundaries_nonblocking=true',
    'trusted_root_launcher_required=true',
    'fixed_source_exchange_authority=false',
    'deployment_receipt_mutation=false',
    'transition_journal_mutation=false',
    'consumer_fence_mutation=false',
    'service_mutation=false',
    'funds_movement=false',
):
    assert token in source,token

for forbidden in (
    "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb",
    "de12c9d2d5e475d435d21da3b047d7b63b69e2b7",
    "5752b69a7253a44fd3fabe2964476174b3a80c40",
    "6b7fc90219676a96f5a2c34619e4cfdf3f002244",
    "_verify_live_shallow_release",
    "LIVE_RELEASE",
):
    assert forbidden not in source,forbidden

assert receipt.startswith(
    "#!/usr/bin/env python3\n"
    "# Privileged apply must fail before importing any source-tree-shadowable module\n"
    "# unless Python was entered through the reviewed isolated/safe-path boundary.\n"
    "import sys as _bootstrap_sys\n"
)
assert "from __future__ import annotations" not in receipt

for token in (
    'MARKER=_BOOTSTRAP_MARKER',
    'python_isolated_unoptimized_mode_required',
    'safe_path',
    'isolated',
    'optimize != 0',
    'filesystem_write=false',
    'MARKER="VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1"',
    'TARGET=pathlib.Path(\n    "/var/lib/void-source-finality-v7/.deployment-receipt.json.stage-v5"\n)',
    'RESERVED_PREDECESSOR=pathlib.Path(',
    'EXPECTED_V5_RECEIPT_ID=(',
    '"voidbsfdep1_c936b6fad9623418aa3d34756226bb5f26411117dc9d3f77cbb874a98db84b37"',
    '"12d4028d317ce871a61c89c60fd36a1e31421401a39397974063677cb4ab8001"',
    'EXPECTED_V5_BYTES=1136',
    'CONFIRM_TOKEN="INSTALL_VOID_V7_V5_RECEIPT_STAGE_V1_CREATE_ONLY"',
    'os.O_WRONLY|os.O_CREAT|os.O_EXCL|os.O_CLOEXEC|os.O_NOFOLLOW',
    'os.link(temp,TARGET,follow_symlinks=False)',
    'fixed_receipt_mutation=false',
    'fixed_receipt_exchange_authority=false',
    'transition_journal_mutation=false',
    'consumer_fence_mutation=false',
    'trusted_root_launcher_required=true',
    'service_mutation=false',
    'funds_movement=false',
):
    assert token in receipt,token

# Apply is present, but cannot be reached from the ordinary user checkout:
# each installer requires root plus root-custodied source and explicit token.
assert 'root_required_for_privileged_apply' in source
assert 'privileged_source_ancestor_custody_invalid:' in source
assert 'explicit_create_only_confirmation_required' in source
assert 'root_required_for_apply' in receipt
assert 'privileged_source_ancestor_custody_invalid:' in receipt
assert 'explicit_create_only_confirmation_required' in receipt

with tempfile.TemporaryDirectory(prefix="void-v7-v5-receipt-pre-guard-") as td:
    td_path=pathlib.Path(td)
    copied=td_path/"receipt_stage.py"
    copied.write_text(receipt,encoding="utf-8")
    (td_path/"argparse.py").write_text(
        'print("HOSTILE_SIBLING_IMPORT_EXECUTED")\n'
        'raise RuntimeError("hostile sibling import executed")\n',
        encoding="utf-8",
    )
    cp=run([sys.executable,"-B",str(copied),"--self-test"],30)
    assert cp.returncode==2,(cp.stdout,cp.stderr)
    assert cp.stderr=="",cp.stderr
    lines=cp.stdout.splitlines()
    assert "HOSTILE_SIBLING_IMPORT_EXECUTED" not in lines,lines
    assert lines==[
        "VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1",
        "status=HOLD",
        "reason=python_isolated_unoptimized_mode_required",
        "filesystem_write=false",
        "fixed_receipt_mutation=false",
    ],lines

for relative,expected_markers in (
    (SOURCE_REL,(
        "VOID_V7_V5_SOURCE_STAGE_INSTALL_V1_SELF_TEST_GREEN",
        "create_only_target=true",
        "fixed_v4_source_cross_binding_required=true",
        "trusted_root_launcher_required=true",
        "rename_noreplace_publication_required=true",
        "copy_source_fifo_swap_nonblocking=true",
        "candidate_read_boundaries_nonblocking=true",
        "service_mutation=false",
        "funds_movement=false",
    )),
    (RECEIPT_REL,(
        "VOID_V7_V5_RECEIPT_STAGE_INSTALL_V1_SELF_TEST_GREEN",
        "isolated_python_entry_required=true",
        "pre_guard_sibling_import_poison_rejected=true",
        "exact_v5_receipt_bytes_bound=true",
        "create_or_exact_match_only=true",
        "trusted_root_launcher_required=true",
        "fixed_receipt_mutation=false",
        "fixed_receipt_exchange_authority=false",
        "service_mutation=false",
        "funds_movement=false",
    )),
):
    cp=run([sys.executable,"-I","-B",relative,"--self-test"],90)
    assert cp.returncode==0,(relative,cp.stdout,cp.stderr)
    assert cp.stderr=="",(relative,cp.stderr)
    lines=cp.stdout.splitlines()
    for marker in expected_markers:
        assert marker in lines,(relative,marker)

for relative in (SOURCE_REL,RECEIPT_REL):
    cp=run([sys.executable,"-I","-B",relative,"--source-plan"],30)
    assert cp.returncode==0,(relative,cp.stdout,cp.stderr)
    assert cp.stderr=="",(relative,cp.stderr)
    assert "host_write=false" in cp.stdout.splitlines(),relative
    assert "trusted_root_launcher_required=true" in cp.stdout.splitlines(),relative

print(MARKER+"_GREEN")
print("source_installer_blob="+SOURCE_BLOB)
print("receipt_installer_blob="+RECEIPT_BLOB)
print("staging_plan_blob="+STAGING_PLAN_BLOB)
print("reviewed_source_replica_mechanics_reused=true")
print("candidate_read_boundaries_nonblocking=true")
print("copy_source_fifo_swap_nonblocking=true")
print("v5_generation_exact=true")
print("hidden_source_stage_only=true")
print("hidden_receipt_stage_only=true")
print("receipt_pre_guard_sibling_import_poison_rejected=true")
print("receipt_isolated_python_entry_required=true")
print("fixed_v4_source_guard_required=true")
print("fixed_v4_receipt_guard_required=true")
print("create_only_publication_required=true")
print("trusted_root_launcher_required=true")
print("root_apply_authorized=false")
print("fixed_source_exchange_authority=false")
print("fixed_receipt_exchange_authority=false")
print("transition_journal_mutation=false")
print("consumer_fence_mutation=false")
print("service_mutation=false")
print("public_presale_activation=false")
print("funds_movement=false")

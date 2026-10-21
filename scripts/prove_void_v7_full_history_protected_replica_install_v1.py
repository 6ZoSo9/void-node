#!/usr/bin/env python3
import sys
from pathlib import Path
import subprocess

MARKER = "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_INSTALL_V1_PROOF"
if sys.flags.isolated != 1 or sys.flags.optimize != 0 or not __debug__:
    print(MARKER)
    print("status=HOLD")
    print("reason=python_isolated_unoptimized_mode_required")
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_v7_full_history_protected_replica_install_v1.py"
TARGET_BLOB = "9ee50b7a44c615798e9b8df1595083b28643ff0d"

def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=30,
        check=False,
    )
    if cp.returncode != 0 or cp.stderr:
        raise RuntimeError("git_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()

assert git("hash-object", str(TARGET)) == TARGET_BLOB

raw = TARGET.read_bytes()
compile(raw, str(TARGET), "exec", dont_inherit=True, optimize=0)
text = raw.decode("utf-8")

for required in (
    'BASE_HEAD = "6011fc906a98cb005567f8dd1fa8a3ea184beb12"',
    'BUILDER_BLOB = "030182d544a92cd6c67868fa4c4f3e83188e4249"',
    'V4_BLOB = "6e187a9a6e782df13ecd423fc80c82b759a8f6db"',
    'ATOMIC_BLOB = "3fe1158a0fdf19fa4307c2a8122314b75ee36345"',
    'SOURCE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"',
    'SOURCE_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"',
    '"5752b69a7253a44fd3fabe2964476174b3a80c40"',
    '"6b7fc90219676a96f5a2c34619e4cfdf3f002244"',
    'REACHABLE_COMMITS = 17931',
    'CANDIDATE = pathlib.Path("/home/zoso/Downloads/void-v7-full-history-candidate-6011fc")',
    'LIVE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)',
    'TARGET_NAME = "void-v7-source-release-full-history-v1"',
    'STAGE_NAME = ".void-v7-source-release-full-history-v1.stage-v1"',
    'CONFIRM_TOKEN = "INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY"',
    'RENAME_NOREPLACE = 1',
    'def _verify_full_history_root(',
    'def _verify_live_shallow_release()',
    'def _copy_candidate_to_stage(',
    'def _rename_noreplace()',
    'def _reconcile_publication_receipt()',
    'def _require_privileged_source_custody()',
    'full_root_reachable_commit_count_mismatch',
    'full_root_missing_object',
    'full_root_fsck_output_nonempty',
    'live_release_parent_object_unexpectedly_present',
    'stage_content_digest_mismatch',
    'plan_binding_changed_before_publication',
    'final_protected_replica_not_green',
    'live_release_mutation=false',
    'trusted_root_launcher_required=true',
):
    assert required in text, required

# Privileged source apply must not become a supported mutable-checkout pattern.
assert 'root_required_for_privileged_apply' in text
assert 'privileged_source_ancestor_custody_invalid:' in text
assert 'privileged_source_ancestor_generation_changed:' in text
assert 'privileged_source_ancestor_generation_changed_terminal:' in text
assert 'privileged_source_owner_invalid:' in text
assert 'privileged_source_writable:' in text

# No live-root replacement primitive is allowed in this create-only lane.
assert "RENAME_EXCHANGE" not in text
assert 'os.unlink(LIVE_RELEASE' not in text
assert 'shutil.rmtree(LIVE_RELEASE' not in text
assert 'os.rename(LIVE_RELEASE' not in text

plain = subprocess.run(
    [sys.executable, "-B", str(TARGET), "--source-plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert plain.returncode == 2
assert "reason=python_isolated_unoptimized_mode_required" in plain.stdout.splitlines()

selftest = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--self-test"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert selftest.returncode == 0, selftest.stdout + selftest.stderr
assert selftest.stderr == ""
for marker in (
    "VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_INSTALL_V1_SELF_TEST_GREEN",
    "create_only_target=true",
    "live_release_mutation=false",
    "full_history_candidate_reauthentication_required=true",
    "live_shallow_runtime_cross_binding_required=true",
    "root_owned_immutable_stage_required=true",
    "rename_noreplace_publication_required=true",
    "trusted_root_launcher_required=true",
    "service_mutation=false",
    "credential_access=false",
    "transaction=false",
    "funds_movement=false",
):
    assert marker in selftest.stdout.splitlines(), marker

source_plan = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--source-plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
)
assert source_plan.returncode == 0, source_plan.stdout + source_plan.stderr
assert source_plan.stderr == ""
for marker in (
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "candidate_path=/home/zoso/Downloads/void-v7-full-history-candidate-6011fc",
    "live_release_path=/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb",
    "protected_replica_target=/opt/void-v7-source-release-full-history-v1",
    "create_only=true",
    "live_release_mutation=false",
    "trusted_root_launcher_required=true",
    "service_mutation=false",
    "credential_access=false",
    "transaction=false",
    "funds_movement=false",
):
    assert marker in source_plan.stdout.splitlines(), marker

print(MARKER + "_GREEN")
print("target_blob=" + TARGET_BLOB)
print("exact_reseal_dependency_bound=true")
print("full_history_candidate_contract_bound=true")
print("live_shallow_runtime_cross_binding_bound=true")
print("create_only_rename_noreplace_bound=true")
print("publication_reconciliation_bound=true")
print("direct_mutable_checkout_privileged_apply_forbidden=true")
print("live_release_replacement_forbidden=true")
print("source_plan_inert=true")
print("service_mutation=false")
print("credential_access=false")
print("transaction=false")
print("funds_movement=false")

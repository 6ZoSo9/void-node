#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
from pathlib import Path
import subprocess
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "current_head_plan_v1.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "1e6edd633328cec597f9ae3064e013ac62b69de4"
QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "installed_qualification_v1.py"
)
QUALIFIER_BLOB = "f0ca6d231ea787eee6b1f9be84000111ef9055a4"
INSTALLER_BLOB = "ce6930bc1be8239a3171d4922c44b96a50f5778b"
REPOSITORY_OBSERVER_BLOB = "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"
MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
    "CURRENT_HEAD_PLAN_V1"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def pin(path: Path, expected: str) -> bytes:
    raw = path.read_bytes()
    assert git_blob(raw) == expected, str(path)
    return raw


target_raw = pin(TARGET, TARGET_BLOB)
pin(ROOT / QUALIFIER_REL, QUALIFIER_BLOB)
source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True, optimize=0)

for required in (
    "CURRENT_HEAD_PLAN_V1",
    'PLAN_PREFIX = "voidbuye2dormantfirstentrycurrentheadplan1_"',
    QUALIFIER_BLOB,
    INSTALLER_BLOB,
    "installed_qualification_green=true",
    "future_argv_json=",
    "plan_body_json=",
    "PRIVILEGED_INSTALLER_PLAN_V1",
    '"privileged_execution_performed": False',
    '"launcher_execution": False',
    '"native_execution": False',
    '"binder_execution": False',
    '"credential_access": False',
    '"funds_movement": False',
    '"production_host_evidence_authority": False',
    '"installed_generation_evidence_authority": True',
):
    assert required in source, required

for forbidden in (
    "subprocess.",
    "os.exec",
    "os.system(",
    "--installer-apply",
    "systemctl",
    "CREDENTIALS_DIRECTORY",
    "LoadCredential",
    "eth_send",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source, filename=TARGET_REL)
function_nodes = [
    node for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
]
names = [node.name for node in function_nodes]
assert len(names) == len(set(names)), "duplicate_top_level_function"
assert names.count("main") == 1
functions = {node.name: node for node in function_nodes}
for name in (
    "repository_blob", "load_qualifier", "_require_qualification", "collect_plan",
    "emit_plan", "source_plan", "self_test", "main",
):
    assert name in functions, name

for mode, markers in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "exact_qualifier_generation_bound=true",
            "exact_installer_generation_bound=true",
            "installed_qualification_required=true",
            "installed_launcher_identity_required=true",
            "content_addressed_plan_required=true",
            "future_argv_emitted_only=true",
            "privileged_execution_performed=false",
            "launcher_execution=false",
            "native_execution=false",
            "binder_execution=false",
            "credential_access=false",
            "funds_movement=false",
            "production_host_evidence_authority=false",
            "installed_generation_evidence_authority=false",
            "privileged_execution_authorized=false",
        ),
    ),
    (
        "--source-plan",
        (
            MARKER,
            "mode=source-plan",
            "source_only=true",
            "host_read=false",
            "host_write=false",
            "qualifier_git_blob_sha1=" + QUALIFIER_BLOB,
            "installer_git_blob_sha1=" + INSTALLER_BLOB,
            "future_operation=installer_plan",
            "privileged_execution_performed=false",
            "launcher_execution=false",
            "native_execution=false",
            "binder_execution=false",
            "credential_access=false",
            "funds_movement=false",
            "production_host_evidence_authority=false",
            "installed_generation_evidence_authority=false",
            "privileged_execution_authorized=false",
        ),
    ),
):
    cp = subprocess.run(
        ["/usr/bin/python3", "-I", "-B", str(TARGET), mode],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
        env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"},
    )
    assert cp.returncode == 0, (mode, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)
    lines = set(cp.stdout.splitlines())
    for marker in markers:
        assert marker in lines, (mode, marker)

spec = importlib.util.spec_from_file_location("first_entry_current_head_plan_v1", TARGET)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

EXPECTED_HEAD = "a" * 40
EXPECTED_HEAD_2 = "b" * 40
LAUNCHER_META = {
    "dev": 1,
    "ino": 2,
    "uid": 0,
    "gid": 0,
    "mode": "0555",
    "nlink": 1,
    "bytes": 731072,
    "mtime_ns": 10,
    "ctime_ns": 11,
    "sha256": "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28",
    "git_blob_sha1": "798907b18c73ee2cc1dea0fe05b36f27ab4137a7",
}


def qualification(head: str) -> dict:
    return {
        "version": 1,
        "read_only_installed_state": True,
        "root_execution_required": True,
        "expected_head": head,
        "installer_source_git_blob_sha1": INSTALLER_BLOB,
        "repository_observer_source_git_blob_sha1": REPOSITORY_OBSERVER_BLOB,
        "accepted_lock_id": module.LOCK_ID,
        "candidate_id": module.CANDIDATE_ID,
        "protected_state": "DORMANT_FIRST_ENTRY_PROTECTED_ROOT_GREEN",
        "installed_identity_green": True,
        "checkout_generation_bound": True,
        "git_generation_bound": True,
        "python_generation_bound": True,
        "policy_generation_green": True,
        "installed_generation_stable": True,
        "triple_snapshot_required": True,
        "temporary_git_metadata_write_required": True,
        "temporary_git_metadata_write_performed": True,
        "temporary_git_metadata_cleanup_completed": True,
        "source_repository_mutation": False,
        "source_object_fetch": False,
        "repository_config_loaded": False,
        "repository_callback_execution": False,
        "standalone_git_tool_admission": True,
        "native_parent_authority_claimed": False,
        "protected_root_write": False,
        "repository_worktree_write": False,
        "launcher_execution": False,
        "native_execution": False,
        "binder_execution": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction": False,
        "rpc_call": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
        "installed_generation_evidence_authority": True,
        "installed": {
            "expected_head": head,
            "lock_id": module.LOCK_ID,
            "candidate_id": module.CANDIDATE_ID,
            "files": {"launcher": dict(LAUNCHER_META)},
        },
        "next_gate": "non_executing_current_head_plan",
        "privileged_execution_authorized": False,
    }


class FakeInstaller:
    LOCK_ID = module.LOCK_ID
    CANDIDATE_ID = module.CANDIDATE_ID
    LAUNCHER_TARGET = module.LAUNCHER_PATH
    LAUNCHER_BYTES = module.LAUNCHER_BYTES
    LAUNCHER_SHA256 = module.LAUNCHER_SHA256


class FakeQualifier:
    MARKER = (
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
        "INSTALLED_QUALIFICATION_V1"
    )
    INSTALLER_SOURCE_GIT_BLOB_SHA1 = INSTALLER_BLOB

    @staticmethod
    def collect(head: str):
        return qualification(head)

    @staticmethod
    def _load_installer():
        return FakeInstaller


original_loader = module.load_qualifier
original_geteuid = module.os.geteuid
try:
    module.load_qualifier = lambda: FakeQualifier
    module.os.geteuid = lambda: 0
    first = module.collect_plan(EXPECTED_HEAD)
    repeat = module.collect_plan(EXPECTED_HEAD)
    other = module.collect_plan(EXPECTED_HEAD_2)
    assert first == repeat
    assert first["plan_id"].startswith(module.PLAN_PREFIX)
    assert first["plan_id"] != other["plan_id"]
    body = first["body"]
    assert body["future_argv"] == [
        str(module.LAUNCHER_PATH), "--installer-plan", "--expected-head", EXPECTED_HEAD
    ]
    assert body["privileged_execution_performed"] is False
    assert body["launcher_execution"] is False
    assert body["native_execution"] is False
    assert body["binder_execution"] is False
    assert body["credential_access"] is False
    assert body["funds_movement"] is False
    assert body["production_host_evidence_authority"] is False
    assert body["installed_generation_evidence_authority"] is True
    assert body["privileged_execution_authorized"] is False

    # The merged pre-repair qualifier semantics must fail closed rather than
    # re-elevate installed evidence into production-host authority.
    class StaleAuthorityQualifier(FakeQualifier):
        @staticmethod
        def collect(head: str):
            result = qualification(head)
            result["production_host_evidence_authority"] = True
            result.pop("installed_generation_evidence_authority", None)
            return result

    module.load_qualifier = lambda: StaleAuthorityQualifier
    try:
        module.collect_plan(EXPECTED_HEAD)
    except module.PlanError as exc:
        assert str(exc) == (
            "qualification_field_mismatch:production_host_evidence_authority"
        )
    else:
        raise AssertionError("stale_qualification_authority_accepted")

    # Other qualification authority cannot be weakened or silently reclassified.
    class BadQualifier(FakeQualifier):
        @staticmethod
        def collect(head: str):
            result = qualification(head)
            result["credential_access"] = True
            return result

    module.load_qualifier = lambda: BadQualifier
    try:
        module.collect_plan(EXPECTED_HEAD)
    except module.PlanError as exc:
        assert str(exc) == "qualification_field_mismatch:credential_access"
    else:
        raise AssertionError("qualification_authority_drift_accepted")

    for field, invalid in (
        ("repository_observer_source_git_blob_sha1", "0" * 40),
        ("git_generation_bound", False),
        ("temporary_git_metadata_cleanup_completed", False),
        ("temporary_git_metadata_write_performed", False),
        ("repository_callback_execution", True),
        ("native_parent_authority_claimed", True),
        ("standalone_git_tool_admission", 1),
        ("source_repository_mutation", 0),
    ):
        invalid_receipt = qualification(EXPECTED_HEAD)
        invalid_receipt[field] = invalid
        try:
            module._require_qualification(invalid_receipt, EXPECTED_HEAD)
        except module.PlanError as exc:
            assert str(exc) == "qualification_field_mismatch:" + field
        else:
            raise AssertionError("invalid_repository_observer_receipt_accepted:" + field)

    module.load_qualifier = lambda: FakeQualifier
    module.os.geteuid = lambda: 1000
    try:
        module.collect_plan(EXPECTED_HEAD)
    except module.PlanError as exc:
        assert str(exc) == "root_required_for_current_head_plan"
    else:
        raise AssertionError("nonroot_current_head_plan_accepted")
finally:
    module.load_qualifier = original_loader
    module.os.geteuid = original_geteuid

print(MARKER + "_PROOF_GREEN")
print("target_blob_bound=true")
print("qualifier_blob_bound=true")
print("installer_blob_bound=true")
print("installed_qualification_contract_exercised=true")
print("stale_qualification_authority_rejected=true")
print("qualification_authority_drift_rejected=true")
print("repository_observer_contract_required=true")
print("repository_observer_receipt_drift_rejected=true")
print("qualification_receipt_types_strict=true")
print("installed_launcher_identity_bound=true")
print("current_head_plan_id_deterministic=true")
print("current_head_plan_id_head_sensitive=true")
print("future_privileged_argv_emitted_only=true")
print("privileged_execution_absent=true")
print("launcher_execution=false")
print("native_execution=false")
print("binder_execution=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")
print("installed_generation_evidence_authority=true")
print("privileged_execution_authorized=false")

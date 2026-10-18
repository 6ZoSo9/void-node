#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

MARKER = "VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V1"
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_presale_epoch2_installed_generation_host_evidence_v1.py"
)
TARGET_BLOB = "25206ece0d67b00391dbac4cdf096ee7c2d851fc"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py"
)
QUALIFIER_BLOB = "a04c2e7665294cdd142426e9eb01ee27c5292b8d"
QUALIFIER_PROOF_REL = (
    "scripts/"
    "prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py"
)
QUALIFIER_PROOF_BLOB = "c14ec00acffbc55630aa68db0013d97cac068ab3"

PARENT_PLAN_REL = "ops/security/buy-void-presale-host-evidence-collection-plan-v1.json"
PARENT_PLAN_BLOB = "ad68175e629fd1cf90180db3a904f84834314fdd"
PARENT_PLAN_ID = (
    "voidbuyhostevplan1_"
    "665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab"
)


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw), expected)
    return raw


source = pin(TARGET_REL, TARGET_BLOB).decode("utf-8", "strict")
qualifier_source = pin(QUALIFIER_REL, QUALIFIER_BLOB).decode("utf-8", "strict")
qualifier_proof = pin(QUALIFIER_PROOF_REL, QUALIFIER_PROOF_BLOB).decode(
    "utf-8", "strict"
)
pin(PARENT_PLAN_REL, PARENT_PLAN_BLOB)

compile(source, TARGET_REL, "exec", dont_inherit=True)

for required in (
    'QUALIFIER_BLOB = "' + QUALIFIER_BLOB + '"',
    'QUALIFIER_PROOF_BLOB = "' + QUALIFIER_PROOF_BLOB + '"',
    "qualifier.collect(expected_head)",
    '"epoch2_installed_generation_qualified": True',
    '"protected_upgrade_verified": True',
    '"installed_generation_stable": True',
    '"retained_predecessor_verified": True',
    '"native_self_test_execution_performed": True',
    '"native_self_test_descriptor_bound": True',
    '"native_self_test_stable": True',
    '"filesystem_write_performed": False',
    '"runner_execution": False',
    '"live_composition_execution": False',
    '"credential_access": False',
    '"payment_acceptance": False',
    '"public_presale_activation": False',
    '"funds_movement": False',
    '"production_host_evidence_authority": False',
    "stat.S_ISREG(before.st_mode)",
    "stat.S_ISLNK(before.st_mode)",
):
    assert required in source, required

for forbidden in (
    "qualifier.main(",
    "qualifier.plan(",
    "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3",
    "eth_sendRawTransaction",
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.O_EXCL",
    "os.mkdir(",
    "os.rename(",
    "os.replace(",
    "os.remove(",
    ".unlink(",
    "systemctl",
    "/usr/bin/sudo",
    "sudo ",
    "socket.",
    "urllib",
    "requests",
    "before.is_file()",
    "before.is_symlink()",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "_git",
    "checkout_snapshot",
    "exact_git_object",
    "load_qualifier",
    "validate_result",
    "collect",
    "self_test",
):
    assert name in functions, name

run_calls: list[str] = []
for name, fn in functions.items():
    for node in ast.walk(fn):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "subprocess"
            and node.func.attr == "run"
        ):
            run_calls.append(name)
assert run_calls == ["_git"], run_calls

collect_source = ast.get_source_segment(source, functions["collect"]) or ""
assert "os.geteuid() != 0" in collect_source
assert "checkout_snapshot(expected_head)" in collect_source
assert "load_qualifier(expected_head)" in collect_source
assert "qualifier.collect(expected_head)" in collect_source
assert "qualifier.main" not in collect_source
assert "subprocess." not in collect_source

validate_source = ast.get_source_segment(source, functions["validate_result"]) or ""
for required in (
    '"native_self_test_execution"',
    '"native_self_test_descriptor_bound"',
    '"native_self_test_stable"',
    '"runner_execution"',
    '"live_composition_execution"',
    '"credential_access"',
    '"payment_acceptance"',
    '"public_presale_activation"',
    '"funds_movement"',
    '"production_host_evidence_authority"',
):
    assert required in validate_source, required

# Bind the reviewed qualifier's own fail-closed execution model.
for required in (
    "before = _installed_snapshot(installer, expected_head)",
    'first_output, first_sha = _run_native_self_test(installer, before["native"])',
    "middle = _installed_snapshot(installer, expected_head)",
    'second_output, second_sha = _run_native_self_test(installer, middle["native"])',
    "after = _installed_snapshot(installer, expected_head)",
    'raise QualificationError("installed_generation_changed_during_qualification")',
    'raise QualificationError("native_self_test_output_changed")',
    '"runner_execution": False',
    '"live_composition_execution": False',
    '"credential_access": False',
    '"funds_movement": False',
):
    assert required in qualifier_source, required

for required in (
    "descriptor_bound_native_self_test_required=true",
    "pathname_swap_during_self_test_rejected=true",
    "retained_fd_executed_during_path_swap=true",
    "replacement_path_not_executed=true",
    "runner_execution=false",
    "live_composition_execution=false",
    "credential_access=false",
    "funds_movement=false",
):
    assert required in qualifier_proof, required

spec = importlib.util.spec_from_file_location(
    "void_presale_epoch2_host_evidence_v1",
    ROOT / TARGET_REL,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert module.PARENT_PLAN_ID == PARENT_PLAN_ID
assert module.PARENT_PLAN_ID == json.loads(
    pin(PARENT_PLAN_REL, PARENT_PLAN_BLOB).decode("utf-8", "strict")
)["plan_id"]

base = {
    "marker": "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V5",
    "version": 5,
    "read_only": True,
    "root_execution_required": True,
    "accepted_lock_id": "lock",
    "candidate_id": "candidate",
    "expected_head": "a" * 40,
    "protected_upgrade_verified": True,
    "installed_generation_stable": True,
    "predecessor_generation_retained": True,
    "predecessor_generation_stable": True,
    "node_generation_bound": True,
    "checkout_generation_bound": True,
    "git_generation_bound": True,
    "setpriv_generation_bound": True,
    "native_self_test_execution": True,
    "native_self_test_descriptor_bound": True,
    "native_self_test_stable": True,
    "native_self_test_sha256": "sha256:x",
    "native_sha256": "n",
    "native_bytes": 1,
    "runner_sha256": "r",
    "runner_bytes": 1,
    "policy_sha256": "p",
    "predecessor_native_sha256": "pn",
    "predecessor_native_bytes": 1,
    "predecessor_runner_sha256": "pr",
    "predecessor_runner_bytes": 1,
    "predecessor_policy_sha256": "pp",
    "predecessor_policy_bytes": 1,
    "node_sha256": "node",
    "node_bytes": 1,
    "runner_execution": False,
    "live_composition_execution": False,
    "credential_access": False,
    "private_key_access": False,
    "signing": False,
    "transaction": False,
    "payment_acceptance": False,
    "public_presale_activation": False,
    "wc_void_market_activation": False,
    "treasury_liquidity_action": False,
    "funds_movement": False,
    "production_host_evidence_authority": False,
    "next_action": "hold",
}
assert module.validate_result(dict(base), "a" * 40)["installed_generation_stable"] is True

for key in (
    "native_self_test_execution",
    "native_self_test_descriptor_bound",
    "installed_generation_stable",
):
    forged = dict(base)
    forged[key] = False
    try:
        module.validate_result(forged, "a" * 40)
    except module.EvidenceError:
        pass
    else:
        raise AssertionError("missing_required_true_accepted:" + key)

for key in (
    "runner_execution",
    "live_composition_execution",
    "credential_access",
    "payment_acceptance",
    "public_presale_activation",
    "funds_movement",
    "production_host_evidence_authority",
):
    forged = dict(base)
    forged[key] = True
    try:
        module.validate_result(forged, "a" * 40)
    except module.EvidenceError:
        pass
    else:
        raise AssertionError("authority_overclaim_accepted:" + key)

cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(ROOT / TARGET_REL), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert cp.returncode == 0, cp.stderr
assert cp.stderr == ""
for marker in (
    MARKER + "_SELF_TEST_GREEN",
    "parent_host_evidence_plan_bound=true",
    "exact_qualifier_source_and_proof_bound=true",
    "root_required_for_future_run=true",
    "installed_generation_before_middle_after_stability_required=true",
    "double_descriptor_bound_native_self_test_required=true",
    "native_self_test_execution_performed_by_future_host_run=true",
    "runner_execution=false",
    "live_composition_execution=false",
    "filesystem_write_performed=false",
    "service_mutation=false",
    "network_contact=false",
    "credential_access=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
):
    assert marker in cp.stdout.splitlines(), marker

print(MARKER + "_PROOF_GREEN")
print("parent_host_evidence_plan_bound=true")
print("exact_v5_qualifier_source_bound=true")
print("exact_v5_qualifier_proof_bound=true")
print("delegates_only_to_qualifier_collect=true")
print("before_middle_after_generation_stability_inherited=true")
print("double_descriptor_bound_native_self_test_inherited=true")
print("pathname_swap_adversary_inherited=true")
print("required_true_field_downgrade_rejected=true")
print("authority_overclaim_rejected=true")
print("filesystem_write_performed=false")
print("runner_execution=false")
print("live_composition_execution=false")
print("service_mutation=false")
print("network_contact=false")
print("credential_access=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")

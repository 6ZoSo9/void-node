#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

TARGET_REL = "scripts/void_buy_void_presale_independent_host_evidence_collection_plan_v1.py"
TARGET_BLOB = "20ae993f9e5d9fec124bf2a38bb626e36cdaed52"

DEPENDENCIES = {
    "scripts/void_buy_void_presale_source_freeze_host_install_qualification_v2.py":
        "1c8299cb38e3a02c5e65c3d38d4863e8ee0c1005",
    "scripts/prove_buy_void_presale_source_freeze_host_install_qualification_v2.py":
        "15813299b38ac146dd4b82b109fef72fbfb868c3",
    "ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts":
        "d47a6f99870f385c1bc938adbef74535b78eba1f",
    "src/economic/buy_void_source_finality_generation_provenance_v7.ts":
        "390ff1a2ff0437cd8c8693e7807c12275df42573",
    "src/economic/buy_void_source_finality_live_process_binding_v2.ts":
        "987c97568a4d1b9814218603df48a65dbfeed18f",
    "tools/void-buy-allocation-custody-host-evidence-v1.mjs":
        "ce2892d50a1e5e2a31fc1dd7d8b9974a9034a712",
    "docs/architecture/buy-void-allocation-custody-host-evidence-v1.md":
        "10a95c941da517a0ba2e071c6845b17cebf0f708",
    "ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py":
        "a04c2e7665294cdd142426e9eb01ee27c5292b8d",
    "scripts/prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py":
        "c14ec00acffbc55630aa68db0013d97cac068ab3",
}

MARKER = "VOID_BUY_VOID_PRESALE_INDEPENDENT_HOST_EVIDENCE_COLLECTION_PLAN_V1"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


target_raw = (ROOT / TARGET_REL).read_bytes()
assert git_blob(target_raw) == TARGET_BLOB
source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)

for relative, expected in DEPENDENCIES.items():
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw))

for required in (
    MARKER,
    "SEPARATELY_AUTHORIZE_PRESALE_INDEPENDENT_HOST_EVIDENCE_COLLECTION_V1",
    "receipt_publisher_excluded",
    "selector_process_execution_performed",
    "process_environment_read_performed",
    "filesystem_write_performed",
    "VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_CONFIG_JSON",
    "native_self_test_execution",
    "native_self_test_descriptor_bound",
    "host_execution_authorized",
    "payment_acceptance_authorized",
    "public_presale_activation_authorized",
    "funds_movement_authorized",
    "source-finality-live-process-plan-v1.json",
    "allocation-custody-host-evidence-v1.json",
    "epoch2-installed-qualification-v5.json",
):
    assert required in source, required

for forbidden in (
    "receipt_publish_v1.ts",
    "subprocess.run(",
    "subprocess.Popen",
    "os.system(",
    "os.execv",
    "os.execve",
    "socket.",
    "requests.",
    "urllib.",
    "open(",
    "Path.write",
    "write_text(",
    "write_bytes(",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
imports = {
    alias.name
    for node in tree.body
    if isinstance(node, ast.Import)
    for alias in node.names
}
imports |= {
    node.module or ""
    for node in tree.body
    if isinstance(node, ast.ImportFrom)
}
for forbidden_import in ("os", "subprocess", "socket", "urllib", "requests"):
    assert forbidden_import not in imports, forbidden_import

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
for line in (
    MARKER + "_SELF_TEST_GREEN",
    "three_independent_evidence_domains=true",
    "receipt_publisher_excluded=true",
    "receipt_collection_is_root_sensitive=true",
    "custody_collection_is_read_only=true",
    "epoch2_native_self_test_execution_disclosed=true",
    "host_execution_authorized=false",
    "payment_acceptance_authorized=false",
    "public_presale_activation_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in cp.stdout.splitlines(), line

expected_head = "a" * 40
cp = subprocess.run(
    [
        "/usr/bin/python3",
        "-I",
        "-B",
        str(ROOT / TARGET_REL),
        "--plan",
        "--expected-head",
        expected_head,
        "--runtime-uid",
        "1000",
        "--runtime-gid",
        "1000",
    ],
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
lines = cp.stdout.splitlines()
assert MARKER in lines
assert "status=PLAN_GREEN" in lines
assert "host_execution_authorized=false" in lines
assert "receipt_publication_authorized=false" in lines
assert "payment_acceptance_authorized=false" in lines
assert "public_presale_activation_authorized=false" in lines
assert "funds_movement_authorized=false" in lines

plan_line = next(line for line in lines if line.startswith("plan_json="))
plan = json.loads(plan_line.removeprefix("plan_json="))
assert plan["expected_repository_head"] == expected_head
assert plan["authority"]["collection_plan_only"] is True
assert plan["authority"]["host_execution_authorized"] is False
assert plan["receipt_live_process_evidence"]["receipt_publisher_excluded"] is True
assert plan["receipt_live_process_evidence"]["receipt_publication_authorized"] is False
assert plan["receipt_live_process_evidence"]["filesystem_write_performed"] is False
assert plan["allocation_custody_evidence"]["read_only_host_observation"] is True
assert plan["allocation_custody_evidence"]["host_mutation_performed"] is False
assert plan["epoch2_installed_generation_evidence"]["native_self_test_execution"] is True
assert plan["epoch2_installed_generation_evidence"]["runner_execution"] is False
assert plan["epoch2_installed_generation_evidence"]["credential_access"] is False
assert plan["parent_host_classifier"]["host_install_qualified"] is False
assert plan["next_gate"] == (
    "SEPARATELY_AUTHORIZE_PRESALE_INDEPENDENT_HOST_EVIDENCE_COLLECTION_V1"
)

for bad in (
    "A" * 40,
    "a" * 39,
    "g" * 40,
):
    test = subprocess.run(
        [
            "/usr/bin/python3", "-I", "-B", str(ROOT / TARGET_REL),
            "--plan", "--expected-head", bad,
            "--runtime-uid", "1000", "--runtime-gid", "1000",
        ],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert test.returncode == 2, bad
    assert "host_execution_authorized=false" in test.stdout
    assert "payment_acceptance_authorized=false" in test.stdout
    assert "funds_movement_authorized=false" in test.stdout

print(MARKER + "_PROOF_GREEN")
print("parent_host_classifier_bound=true")
print("receipt_collection_source_bound=true")
print("deployment_receipt_verifier_bound=true")
print("live_process_receipt_verifier_bound=true")
print("allocation_custody_host_collector_bound=true")
print("epoch2_installed_qualifier_bound=true")
print("receipt_publisher_excluded=true")
print("host_execution_absent=true")
print("filesystem_write_absent=true")
print("network_client_absent=true")
print("host_execution_authorized=false")
print("payment_acceptance_authorized=false")
print("public_presale_activation_authorized=false")
print("funds_movement_authorized=false")

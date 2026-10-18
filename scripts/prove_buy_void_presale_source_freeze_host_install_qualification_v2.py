#!/usr/bin/env python3
from __future__ import annotations

import ast
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = "scripts/void_buy_void_presale_source_freeze_host_install_qualification_v2.py"
TARGET_BLOB = "1c8299cb38e3a02c5e65c3d38d4863e8ee0c1005"
CENSUS_REL = "scripts/void_buy_void_precision_source_freeze_host_metadata_census_v3.py"
CENSUS_BLOB = "d8ea2966d81e43c273d3692f5778143259431f08"
CENSUS_PROOF_REL = "scripts/void_buy_void_precision_source_freeze_host_metadata_census_v3_proof.py"
CENSUS_PROOF_BLOB = "9dd55390b75bb6c6075efb053b0491b23a52fe60"
CENSUS_DOC_REL = "docs/operators/buy-void-precision-source-freeze-host-metadata-census-v3.md"
CENSUS_DOC_BLOB = "1e7927cfcace8e5823985bff88bb13a9db6c87cc"
CENSUS_WORKFLOW_REL = ".github/workflows/buy-void-precision-source-freeze-host-metadata-census-v3.yml"
CENSUS_WORKFLOW_BLOB = "20106d90410490dc4e82055c871f90654cd5d0b0"
ACCEPTANCE_REL = "ops/security/buy-void-presale-source-freeze-acceptance-v2.json"
ACCEPTANCE_BLOB = "174d536807f03fd7b6ff44820d4e378c7055150e"
SUCCESSOR_REL = "ops/security/buy-void-presale-current-source-enforcement-successor-v1.json"
SUCCESSOR_BLOB = "774db38ccb771f393b44d589a455144b99d36f6b"
FREEZE_REL = "ops/security/buy-void-presale-source-freeze-candidate-v2.json"
FREEZE_BLOB = "ca9c42e2d3ab4c50ac54badadb9efde6180ad241"

MARKER = "VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_HOST_INSTALL_QUALIFICATION_V2"


def git_blob(raw: bytes) -> str:
    import hashlib
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, relative
    return raw


source = pin(TARGET_REL, TARGET_BLOB).decode("utf-8", "strict")
pin(CENSUS_REL, CENSUS_BLOB)
pin(CENSUS_PROOF_REL, CENSUS_PROOF_BLOB)
pin(CENSUS_DOC_REL, CENSUS_DOC_BLOB)
pin(CENSUS_WORKFLOW_REL, CENSUS_WORKFLOW_BLOB)
pin(ACCEPTANCE_REL, ACCEPTANCE_BLOB)
pin(SUCCESSOR_REL, SUCCESSOR_BLOB)
pin(FREEZE_REL, FREEZE_BLOB)
compile(source, TARGET_REL, "exec", dont_inherit=True)

for required in (
    MARKER,
    "HOST_INSTALL_QUALIFICATION_HOLD_METADATA_NOT_ALIGNED",
    "HOST_INSTALL_QUALIFICATION_HOLD_INDEPENDENT_EVIDENCE_REQUIRED",
    "deployment_receipt_metadata_is_not_authenticity",
    "custody_mount_metadata_is_not_custody_qualification",
    "epoch2_root_metadata_is_not_installed_generation_qualification",
    "authenticated_source_finality_deployment_and_live_process_receipt_evidence",
    "allocation_custody_host_and_storage_qualification_evidence",
    "epoch2_installed_live_composition_generation_qualification_evidence",
    '"host_install_qualified": False',
    '"installed_receipt_authenticity_verified": False',
    '"allocation_custody_qualified": False',
    '"epoch2_installed_generation_qualified": False',
    '"payment_rail_policy_accepted": False',
    '"customer_payment_acceptance_authorized": False',
    '"public_presale_activation": False',
    '"wc_void_market_activation": False',
    '"funds_movement": False',
    "forged_census_authority_accepted",
    "PATH_METADATA_KEYS",
    "CUSTODY_PATH_METADATA_KEYS",
    "PATH_METADATA_STATES",
    "def _validate_path_metadata_entry(",
    "source_finality_deployment_receipt_keys_invalid",
    "allocation_custody_mount_mountpoint_type_invalid",
    "allocation_custody_mount_nondirectory_mountpoint_must_be_false",
    "epoch2_live_composition_root_directory_bytes_invalid",
    "malformed_nested_metadata_accepted:",
    "os.O_NOFOLLOW",
    "os.O_CLOEXEC",
    "os.O_NONBLOCK",
    "os.fstat(",
    "os.read(",
    "input_grew_during_read",
    "RecursionError",
    "MemoryError",
):
    assert required in source, required

for forbidden in (
    "urllib",
    "requests",
    "socket.",
    "subprocess.",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "systemctl",
    "/usr/bin/sudo",
    "sudo ",
    "Path.home()",
    "/var/lib/",
    "/opt/",
    "/proc/",
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.mkdir(",
    "os.rename(",
    "os.replace(",
    "os.remove(",
    ".unlink(",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
calls = []
os_open_calls = []
for node in ast.walk(tree):
    if isinstance(node, ast.Call):
        name = ast.unparse(node.func)
        if name == "os.open":
            os_open_calls.append(node)
        elif name.startswith(("open", "Path.write", "subprocess", "socket")):
            calls.append(name)
assert calls == [], calls
assert len(os_open_calls) == 1, len(os_open_calls)

spec = importlib.util.spec_from_file_location("host_install_q_v2", ROOT / TARGET_REL)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.CENSUS_SOURCE_BLOB == CENSUS_BLOB
assert module.CENSUS_PROOF_BLOB == CENSUS_PROOF_BLOB
assert module.CENSUS_DOC_BLOB == CENSUS_DOC_BLOB
assert module.CENSUS_WORKFLOW_BLOB == CENSUS_WORKFLOW_BLOB
assert module.ACCEPTANCE_BLOB == ACCEPTANCE_BLOB
assert module.SUCCESSOR_BLOB == SUCCESSOR_BLOB
assert module.FREEZE_BLOB == FREEZE_BLOB

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
    "metadata_alignment_classifier=true",
    "closed_nested_metadata_schema=true",
    "malformed_nested_metadata_rejected=true",
    "state_dependent_mode_bytes_validated=true",
    "json_safe_integer_byte_domain=true",
    "max_safe_integer_boundary_tested=true",
    "regular_size_range_hold_accepted_as_hold=true",
    "custody_mountpoint_type_validated=true",
    "metadata_presence_never_becomes_authenticity=true",
    "independent_receipt_evidence_required=true",
    "independent_custody_evidence_required=true",
    "independent_epoch2_installed_evidence_required=true",
    "host_install_qualified=false",
    "payment_rail_policy_accepted=false",
    "customer_payment_acceptance_authorized=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
):
    assert line in cp.stdout.splitlines(), line

with tempfile.TemporaryDirectory(prefix="void-host-q-v2-proof-") as td:
    root = Path(td)
    target = root / "census.json"
    target.write_text("{}", encoding="utf-8")

    link = root / "link.json"
    link.symlink_to(target)
    cp = subprocess.run(
        ["/usr/bin/python3", "-I", "-B", str(ROOT / TARGET_REL), "--census-json", str(link)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert cp.returncode == 2
    assert cp.stderr == ""
    assert "status=HOST_INSTALL_QUALIFICATION_HOLD_INVALID_INPUT" in cp.stdout
    assert "reason=input_unavailable" in cp.stdout
    assert "host_install_qualified=false" in cp.stdout
    assert "funds_movement=false" in cp.stdout

    fifo = root / "fifo.json"
    os.mkfifo(fifo, 0o600)
    cp = subprocess.run(
        ["/usr/bin/python3", "-I", "-B", str(ROOT / TARGET_REL), "--census-json", str(fifo)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=5,
    )
    assert cp.returncode == 2
    assert cp.stderr == ""
    assert "status=HOST_INSTALL_QUALIFICATION_HOLD_INVALID_INPUT" in cp.stdout
    assert "reason=input_metadata_invalid" in cp.stdout

    deep = root / "deep.json"
    deep.write_text("[" * 1200 + "0" + "]" * 1200, encoding="utf-8")
    cp = subprocess.run(
        ["/usr/bin/python3", "-I", "-B", str(ROOT / TARGET_REL), "--census-json", str(deep)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert cp.returncode == 2
    assert cp.stderr == ""
    assert "status=HOST_INSTALL_QUALIFICATION_HOLD_INVALID_INPUT" in cp.stdout
    assert "reason=input_json_invalid" in cp.stdout
    assert "host_install_qualified=false" in cp.stdout
    assert "public_presale_activation=false" in cp.stdout
    assert "funds_movement=false" in cp.stdout

print(MARKER + "_PROOF_GREEN")
print("census_source_generation_bound=true")
print("census_behavioral_proof_bound=true")
print("accepted_freeze_generation_bound=true")
print("current_enforcement_successor_bound=true")
print("offline_input_only=true")
print("host_access_absent=true")
print("network_access_absent=true")
print("filesystem_mutation_absent=true")
print("metadata_cannot_grant_authenticity=true")
print("descriptor_bound_input_read_proved=true")
print("input_symlink_rejected_before_read=true")
print("input_fifo_rejected_without_blocking=true")
print("recursive_json_maps_to_invalid_input=true")
print("closed_nested_metadata_schema_proved=true")
print("malformed_nested_metadata_regressions_proved=true")
print("custody_mountpoint_type_contract_proved=true")
print("independent_receipt_evidence_required=true")
print("independent_custody_evidence_required=true")
print("independent_epoch2_installed_evidence_required=true")
print("host_install_qualified=false")
print("public_presale_activation=false")
print("funds_movement=false")

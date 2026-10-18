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
TARGET_BLOB = "89e2075fff8640f176d1e4338a9f70f4ebf169e1"
CENSUS_REL = "scripts/void_buy_void_precision_source_freeze_host_metadata_census_v3.py"
CENSUS_BLOB = "266fe91ee8563efff6116be7f890f19340a0de4c"
CENSUS_PROOF_REL = "scripts/void_buy_void_precision_source_freeze_host_metadata_census_v3_proof.py"
CENSUS_PROOF_BLOB = "9a8446a3d1f02d94277606c2858ec7abd30b3b94"
ACCEPTANCE_REL = "ops/security/buy-void-presale-source-freeze-acceptance-v2.json"
ACCEPTANCE_BLOB = "5d437a37703a83908a7fa78b78da92151aa1aa99"
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
    "sudo",
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
for node in ast.walk(tree):
    if isinstance(node, ast.Call):
        name = ast.unparse(node.func)
        if name.startswith(("open", "Path.write", "os.open", "subprocess", "socket")):
            calls.append(name)
assert calls == [], calls

spec = importlib.util.spec_from_file_location("host_install_q_v2", ROOT / TARGET_REL)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.CENSUS_SOURCE_BLOB == CENSUS_BLOB
assert module.CENSUS_PROOF_BLOB == CENSUS_PROOF_BLOB
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
    assert "reason=input_metadata_invalid" in cp.stdout

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
print("independent_receipt_evidence_required=true")
print("independent_custody_evidence_required=true")
print("independent_epoch2_installed_evidence_required=true")
print("host_install_qualified=false")
print("public_presale_activation=false")
print("funds_movement=false")

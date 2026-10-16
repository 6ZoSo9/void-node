#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_void_user_manager_credential_query_installed_qualification_v3.py"
)
REPLACEMENT = (
    ROOT
    / "ops/precision/"
    "void_buy_void_user_manager_credential_query_protected_replace_v3r.py"
)
V6 = (
    ROOT
    / "ops/precision/"
    "void_buy_void_user_manager_query_live_qualification_v6.py"
)
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-user-manager-credential-query-elf-lock-v3r.json"
)

TARGET_BLOB = "988508dc576bd70081d7ba71a3c59e3fbd5eaa77"
REPLACEMENT_BLOB = "df103c1439dd054d98132c3beee226f3d8222314"
V6_BLOB = "83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc"
LOCK_BLOB = "c4870f3178aebc9a0bb6557562f663b8480cfefa"

LOCK_ID = (
    "voidbuyumqcredelflock3r_"
    "8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34"
)
V2_LOCK_ID = (
    "voidbuyumqcredelflock2_"
    "c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54"
)

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()

for path, expected in (
    (TARGET, TARGET_BLOB),
    (REPLACEMENT, REPLACEMENT_BLOB),
    (V6, V6_BLOB),
    (LOCK, LOCK_BLOB),
):
    assert git_blob(path.read_bytes()) == expected, str(path)

source = TARGET.read_text("utf-8")
tree = ast.parse(source, filename=str(TARGET))

for required in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V3",
    "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3_GREEN",
    "CREDENTIAL_QUERY_V3_GREEN_WITH_V1_V2_PREDECESSORS",
    LOCK_ID,
    V2_LOCK_ID,
    "DropInPathsCanonicalSHA256",
    "LoadCredentialCanonicalSHA256",
    "LoadCredentialTargetMatchCount",
    "MAX_DROPIN_PATHS = 64",
    "MAX_LOAD_CREDENTIALS = 32",
    "complete_dropin_set_stable",
    "complete_credential_set_stable",
    "unrelated_dropins_allowed",
    "unrelated_credentials_allowed",
    "credential_metadata_same_generation_as_v6_security",
    "v6_security_qualification_composed",
    "credential_contents_read",
    "production_host_evidence_authority",
    "SEPARATELY_AUTHORIZE_CREDENTIAL_QUERY_V3_READ_ONLY_QUALIFICATION",
    "BIND_V3_AUTHENTICATED_CREDENTIAL_METADATA_IN_EPOCH2_LIVE_COMPOSITION_SUCCESSOR",
):
    assert required in source, required

for forbidden in (
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "wallet.sign",
    "private_key",
    "systemctl",
):
    assert forbidden not in source, forbidden

imports = {
    node.names[0].name
    for node in ast.walk(tree)
    if isinstance(node, ast.Import) and node.names
}
assert "requests" not in imports
assert "urllib" not in imports

self_test = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    encoding="utf-8",
    errors="strict",
    check=True,
    timeout=30,
    env={
        "PATH": "/usr/bin:/bin",
        "HOME": "/tmp",
        "LANG": "C",
        "LC_ALL": "C",
    },
)
self_lines = set(self_test.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V3_SELF_TEST_GREEN",
    "complete_dropin_set_hash_required=true",
    "complete_credential_set_hash_required=true",
    "unrelated_credentials_allowed=true",
    "credential_contents_read=false",
    "funds_movement=false",
):
    assert line in self_lines, line

plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    encoding="utf-8",
    errors="strict",
    check=True,
    timeout=30,
    env={
        "PATH": "/usr/bin:/bin",
        "HOME": "/tmp",
        "LANG": "C",
        "LC_ALL": "C",
    },
)
plan_lines = set(plan.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V3",
    "mode=plan",
    "credential_lock_id=" + LOCK_ID,
    "v2_predecessor_lock_id=" + V2_LOCK_ID,
    "credential_v3_generation_verification_required=true",
    "v1_predecessor_verification_required=true",
    "v2_predecessor_verification_required=true",
    "credential_installed_generation_stability_required=true",
    "double_credential_query_required=true",
    "complete_dropin_set_hash_required=true",
    "complete_credential_set_hash_required=true",
    "v6_security_qualification_required=true",
    "same_manager_mainpid_generation_composition_required=true",
    "credential_contents_read=false",
    "query_execution=false",
    "host_mutation=false",
    "filesystem_write=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "external_network_calls=false",
    "private_key_access=false",
    "wallet_or_signer_access=false",
    "request_or_payment_contents_read=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "transaction=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "next_action=SEPARATELY_AUTHORIZE_CREDENTIAL_QUERY_V3_READ_ONLY_QUALIFICATION",
):
    assert line in plan_lines, line

print(
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_"
    "INSTALLED_QUALIFICATION_V3_PROOF_GREEN"
)
print("target_blob=" + TARGET_BLOB)
print("replacement_v3r_blob=" + REPLACEMENT_BLOB)
print("v6_qualifier_blob=" + V6_BLOB)
print("accepted_v3r_lock_blob=" + LOCK_BLOB)
print("accepted_v3r_lock_id=" + LOCK_ID)
print("v2_predecessor_lock_id=" + V2_LOCK_ID)
print("v3_generation_required=true")
print("v1_predecessor_required=true")
print("v2_predecessor_required=true")
print("double_credential_query_required=true")
print("complete_dropin_set_hash_required=true")
print("complete_credential_set_hash_required=true")
print("unrelated_credentials_allowed=true")
print("v6_security_composition_required=true")
print("credential_contents_read=false")
print("private_key_access=false")
print("wallet_or_signer_access=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("transaction=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")

#!/usr/bin/env python3
from __future__ import annotations

import ast
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (
    "ops/precision/"
    "void_buy_void_user_manager_credential_query_installed_qualification_v2.py"
)
V3_REPLACER = (
    "ops/precision/"
    "void_buy_void_user_manager_credential_query_protected_replace_v3r.py"
)
V6_QUALIFIER = (
    "ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py"
)
V3_LOCK = "ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json"

EXPECTED = {
    SOURCE: "5bfe0cd43ca130e869772a83432bde8836a70707",
    V3_REPLACER: "df103c1439dd054d98132c3beee226f3d8222314",
    V6_QUALIFIER: "83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc",
    V3_LOCK: "c4870f3178aebc9a0bb6557562f663b8480cfefa",
}

def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
        },
        timeout=120,
        check=True,
    )

def git_blob(path: str) -> str:
    return run(
        "/usr/bin/git",
        "--no-replace-objects",
        "-C",
        str(ROOT),
        "rev-parse",
        "HEAD:" + path,
    ).stdout.strip()

for path, expected in EXPECTED.items():
    assert git_blob(path) == expected, "blob_drift:" + path

source = (ROOT / SOURCE).read_text(encoding="utf-8")
tree = ast.parse(source, filename=SOURCE)

for needle in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V2",
    "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3_GREEN",
    "voidbuyumqcredelflock3r_",
    "8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34",
    "DropInPathsCanonicalSHA256",
    "LoadCredentialTargetMatchCount",
    "LoadCredentialCanonicalBytes",
    "LoadCredentialCanonicalSHA256",
    "installer._base_state()",
    "installer.V1_PREDECESSOR_TARGET",
    "installer.V2_PREDECESSOR_TARGET",
    "dropin_count_unbounded",
    "load_credential_count_unbounded",
    "load_credential_target_match_count_invalid",
    "native_sha256_invalid:",
    "double_credential_query_stable",
    "credential_metadata_same_generation_as_v6_security",
    "v6_security_qualification_composed",
    "complete_metadata_generation_sha256_required=true",
    "query_execution=false",
    "credential_contents_read=false",
    "production_host_evidence_authority=false",
):
    assert needle in source, needle

for forbidden in (
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "renameat2",
    "systemctl",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
):
    assert forbidden not in source, forbidden

self_test = run(
    "/usr/bin/python3", "-I", "-B", str(ROOT / SOURCE), "--self-test"
).stdout
assert (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V2_SELF_TEST_GREEN"
    in self_test.splitlines()
)

plan = run(
    "/usr/bin/python3", "-I", "-B", str(ROOT / SOURCE), "--plan"
).stdout
for line in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V2",
    "mode=plan",
    "credential_lock_id=voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34",
    "v3_current_query_required=true",
    "v1_predecessor_required=true",
    "v2_predecessor_required=true",
    "complete_metadata_generation_sha256_required=true",
    "double_credential_query_required=true",
    "v6_security_qualification_required=true",
    "credential_contents_read=false",
    "query_execution=false",
    "host_mutation=false",
    "filesystem_write=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "external_network_calls=false",
    "private_key_access=false",
    "wallet_or_signer_access=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "transaction=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "next_action=SEPARATELY_AUTHORIZE_CREDENTIAL_QUERY_READ_ONLY_QUALIFICATION",
):
    assert line in plan.splitlines(), line

print("VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V2_PROOF_GREEN")
print("source_blob=5bfe0cd43ca130e869772a83432bde8836a70707")
print("v3_replacer_blob=df103c1439dd054d98132c3beee226f3d8222314")
print("v6_qualifier_blob=83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc")
print("v3_lock_blob=c4870f3178aebc9a0bb6557562f663b8480cfefa")
print("complete_metadata_generation_sha256_required=true")
print("bounded_unrelated_credentials_allowed=true")
print("exactly_one_target_credential_required=true")
print("exactly_one_target_dropin_required=true")
print("v3_v1_v2_installed_generation_bound=true")
print("double_credential_query_required=true")
print("v6_security_generation_composition_required=true")
print("live_execution_authorized=false")
print("credential_contents_read=false")
print("host_mutation=false")
print("funds_movement=false")

#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
PARENT = "376aaf6c682fdf25fd6b6609a148ad92308052dc"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_user_manager_credential_query_installed_qualification_v1.py"
)
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_user_manager_credential_query_protected_install_v1.py"
)
LOCK_REL = "ops/security/buy-void-user-manager-credential-query-elf-lock-v1.json"
V6_QUALIFIER_REL = (
    "ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py"
)
QUERY_REL = (
    "ops/precision/"
    "void_buy_void_user_manager_private_credential_unit_query_v1.c"
)
PREEXEC_REL = (
    "ops/precision/"
    "void_buy_void_user_manager_private_credential_unit_query_preexec_v1.c"
)
SELF_REL = (
    "scripts/"
    "prove_void_buy_void_user_manager_credential_query_installed_qualification_v1.py"
)
DOC_REL = (
    "docs/operators/"
    "buy-void-user-manager-credential-query-installed-qualification-v1.md"
)
WORKFLOW_REL = (
    ".github/workflows/"
    "buy-void-user-manager-credential-query-installed-qualification-v1.yml"
)

EXPECTED_SCOPE = sorted((
    QUALIFIER_REL,
    SELF_REL,
    DOC_REL,
    INSTALLER_REL,
    "scripts/prove_void_buy_void_user_manager_credential_query_protected_install_v1.py",
    "docs/operators/buy-void-user-manager-credential-query-protected-install-v1.md",
))
EXPECTED_BLOBS = {
    QUALIFIER_REL: "8dc5d53dfcc52c261a3da0ee692f3a4fcc0bfc4c",
    INSTALLER_REL: "0fb7abc266dd4b66dd9f087d4c0c2acff29a8014",
    LOCK_REL: "a434fa671c5a1ca3237efcb51f16223cc27cf4fa",
    V6_QUALIFIER_REL: "83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc",
    QUERY_REL: "e12e0b16df6e6eb5fd912a6dbf6ae970673246f9",
    PREEXEC_REL: "0ccd2d07a951389d85a9fc56ec892a774d9dd681",
}

LOCK_ID = (
    "voidbuyumqcredelflock1_"
    "65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c"
)


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def run(command: str, args: list[str]) -> str:
    completed = subprocess.run(
        [command, *args],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=60,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_NO_REPLACE_OBJECTS": "1",
        },
    )
    assert completed.returncode == 0, completed.stderr + completed.stdout
    return completed.stdout


def git(args: list[str]) -> str:
    return run(
        "/usr/bin/git",
        ["--no-replace-objects", "-C", str(ROOT), *args],
    ).strip()


git(["merge-base", "--is-ancestor", PARENT, "HEAD"])
changed = sorted(
    line
    for line in git(["diff", "--name-only", PARENT, "HEAD", "--"]).split("\n")
    if line
)
assert changed == EXPECTED_SCOPE, ("qualification_scope_drift", changed)

for relative, expected in EXPECTED_BLOBS.items():
    path = ROOT / relative
    before = path.lstat()
    assert path.is_file() and not path.is_symlink(), relative
    assert before.st_nlink == 1 and before.st_size > 0, relative
    raw = path.read_bytes()
    after = path.lstat()
    assert before.st_dev == after.st_dev and before.st_ino == after.st_ino
    assert before.st_size == after.st_size
    assert before.st_mtime_ns == after.st_mtime_ns
    assert git_blob(raw) == expected, "blob_drift:" + relative

source = (ROOT / QUALIFIER_REL).read_text("utf-8")
compile(source, QUALIFIER_REL, "exec", dont_inherit=True)

for token in (
    'LOCK_ID = (',
    '"voidbuyumqcredelflock1_"',
    '"65a1839c14b692349dda8cccdbe8657a9485754c5d10ffa5b57421ce87e3753c"',
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1",
    "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V1_GREEN",
    "double_credential_query_stable",
    "credential_metadata_same_generation_as_v6_security",
    "v6_security_qualification_composed",
    "same_manager_mainpid_generation_composition_required=true",
    "credential_contents_read",
    "NeedDaemonReload",
    "DropInPathCount",
    "CredentialDropInMatchCount",
    "LoadCredentialCount",
    "LoadCredentialId",
    "LoadCredentialSource",
    "private_socket_peer_authenticated",
    "same_retained_private_connection",
    "manager_generation_reverified",
    "service_generation_reverified",
    "production_host_evidence_authority",
):
    assert token in source, token

cmd = [sys.executable, "-I", "-B", str(ROOT / QUALIFIER_REL)]

self_test = subprocess.run(
    cmd + ["--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr + self_test.stdout
assert (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1_SELF_TEST_GREEN"
    in self_test.stdout.splitlines()
)

plan = subprocess.run(
    cmd + ["--plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert plan.returncode == 0, plan.stderr + plan.stdout
lines = set(plan.stdout.splitlines())
for line in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1",
    "mode=plan",
    "root_required_for_run=true",
    "credential_lock_id=" + LOCK_ID,
    "credential_installed_pair_verification_required=true",
    "credential_installed_generation_stability_required=true",
    "double_credential_query_required=true",
    "v6_security_qualification_required=true",
    "same_manager_mainpid_generation_composition_required=true",
    "credential_contents_read=false",
    "query_execution=false",
    "host_mutation=false",
    "filesystem_write=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "transaction=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "next_action=SEPARATELY_AUTHORIZE_CREDENTIAL_QUERY_READ_ONLY_QUALIFICATION",
):
    assert line in lines, line

print(
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V1_PROOF_GREEN"
)
print("accepted_credential_lock_bound=true")
print("installed_pair_generation_required=true")
print("double_credential_query_required=true")
print("v6_security_qualification_required=true")
print("same_manager_mainpid_generation_composition_required=true")
print("credential_contents_read=false")
print("query_execution_in_plan=false")
print("host_mutation=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("transaction=false")
print("funds_movement=false")

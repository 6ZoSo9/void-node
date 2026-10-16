#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_void_user_manager_credential_query_installed_qualification_v3r.py"
)
REPLACEMENT = (
    ROOT
    / "ops/precision/"
    "void_buy_void_user_manager_credential_query_protected_replace_v3r.py"
)
V6 = ROOT / "ops/precision/void_buy_void_user_manager_query_live_qualification_v6.py"
LOCK = ROOT / "ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json"

TARGET_BLOB = "74c69fe8a95ed5f361a39971618f43f7c768c865"
REPLACEMENT_BLOB = "98f8b9fda89e33c50e19008268d97655aad54e6d"
V6_BLOB = "83bfd3f3baf5c9d2a9e21852b0f752f27d7749bc"
LOCK_BLOB = "c4870f3178aebc9a0bb6557562f663b8480cfefa"


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


for path, expected in (
    (TARGET, TARGET_BLOB),
    (REPLACEMENT, REPLACEMENT_BLOB),
    (V6, V6_BLOB),
    (LOCK, LOCK_BLOB),
):
    assert git_blob_sha1(path.read_bytes()) == expected, str(path)

spec = importlib.util.spec_from_file_location(
    "credential_query_v3r_installed_qualification",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_QUALIFICATION_V3R"
)
assert module.NATIVE_MARKER == (
    "VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3_GREEN"
)
assert module.LOCK_ID == (
    "voidbuyumqcredelflock3r_"
    "8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34"
)
assert module.MAX_DROPIN_PATHS == 64
assert module.MAX_DROPIN_CANONICAL_BYTES == 64 * 1024
assert module.MAX_LOAD_CREDENTIALS == 32
assert module.MAX_LOAD_CREDENTIAL_CANONICAL_BYTES == 64 * 1024

source = TARGET.read_text("utf-8")
for required in (
    "credential_v3r_generation_verified",
    "credential_v1_predecessor_verified",
    "credential_v2_predecessor_verified",
    "double_credential_query_stable",
    "complete_dropin_set_hash_stable",
    "complete_credential_set_hash_stable",
    "DropInPathsCanonicalSHA256",
    "LoadCredentialCanonicalSHA256",
    "LoadCredentialTargetMatchCount",
    "credential_metadata_same_generation_as_v6_security",
    "v6_security_qualification_composed",
    "BIND_V3R_AUTHENTICATED_CREDENTIAL_METADATA_IN_EPOCH2_LIVE_COMPOSITION_SUCCESSOR",
):
    assert required in source, required

assert "void_buy_void_user_manager_credential_query_installed_qualification_v1.py" not in source
assert "public_user_bus_used" in source
assert "credential_contents_read" in source
assert 'completed.stderr != ""' in source

parsed = module.parse_native_output(module.synthetic_native_output())
assert parsed["CredentialDropInMatchCount"] == "1"
assert parsed["LoadCredentialTargetMatchCount"] == "1"
assert parsed["DropInPathsCanonicalSHA256"] == "a" * 64
assert parsed["LoadCredentialCanonicalSHA256"] == "b" * 64

for label, old, new in (
    ("dropin_limit", "DropInPathCount=2", "DropInPathCount=65"),
    ("credential_limit", "LoadCredentialCount=4", "LoadCredentialCount=33"),
    (
        "dropin_target_cardinality",
        "CredentialDropInMatchCount=1",
        "CredentialDropInMatchCount=2",
    ),
    (
        "credential_target_cardinality",
        "LoadCredentialTargetMatchCount=1",
        "LoadCredentialTargetMatchCount=2",
    ),
    (
        "dropin_sha",
        "DropInPathsCanonicalSHA256=" + "a" * 64,
        "DropInPathsCanonicalSHA256=" + "g" * 64,
    ),
    (
        "credential_sha",
        "LoadCredentialCanonicalSHA256=" + "b" * 64,
        "LoadCredentialCanonicalSHA256=" + "0" * 63,
    ),
):
    bad = module.synthetic_native_output().replace(old, new)
    try:
        module.parse_native_output(bad)
    except module.QualificationError:
        pass
    else:
        raise AssertionError("adversary accepted:" + label)

good_security = {
    "runtime_uid": 1000,
    "manager_pid": 2693,
    "manager_start_ticks": "1409",
    "main_pid": 4242,
    "service_start_ticks": "998877",
    "protected_v6_generation_verified": True,
    "installed_generation_stable": True,
    "authenticated_private_manager_peer": True,
    "same_authenticated_connection_unit_query": True,
    "runtime_main_pid_kernel_bound": True,
    "private_users_false_verified": True,
    "kernel_active_capabilities_zero_verified": True,
    "cap_last_cap_projection_contract_verified": True,
    "kernel_cap_last_cap_stable": True,
    "configured_kernel_bounding_set_equal_verified": True,
    "double_authenticated_query_stable": True,
    "production_host_evidence_authority": False,
}
module._require_security_composition(parsed, good_security)
bad_security = dict(good_security)
bad_security["main_pid"] = 4243
try:
    module._require_security_composition(parsed, bad_security)
except module.QualificationError:
    pass
else:
    raise AssertionError("mismatched V6 generation accepted")


class FakeV6Hold:
    class QualificationError(RuntimeError):
        pass

    @staticmethod
    def collect():
        raise FakeV6Hold.QualificationError("protected_v6_generation_not_green")


try:
    module._collect_v6_security(FakeV6Hold)
except module.QualificationError as exc:
    assert str(exc) == (
        "v6_security_qualification_hold:protected_v6_generation_not_green"
    )
else:
    raise AssertionError("nested V6 QualificationError escaped V3R HOLD mapping")


class FakeV6Bug:
    class QualificationError(RuntimeError):
        pass

    @staticmethod
    def collect():
        raise ValueError("unexpected_v6_bug")


try:
    module._collect_v6_security(FakeV6Bug)
except ValueError as exc:
    assert str(exc) == "unexpected_v6_bug"
else:
    raise AssertionError("unexpected V6 bug was incorrectly masked as HOLD")

env = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/tmp",
    "LANG": "C",
    "LC_ALL": "C",
}

self_test = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
    env=env,
)
assert self_test.stderr == ""
assert (
    module.MARKER + "_SELF_TEST_GREEN"
) in set(self_test.stdout.splitlines())

plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
    env=env,
)
assert plan.stderr == ""
plan_lines = set(plan.stdout.splitlines())
for line in (
    module.MARKER,
    "mode=plan",
    "root_required_for_run=true",
    "credential_v3r_generation_required=true",
    "credential_v1_predecessor_required=true",
    "credential_v2_predecessor_required=true",
    "double_credential_query_required=true",
    "complete_dropin_set_hash_stability_required=true",
    "complete_credential_set_hash_stability_required=true",
    "v6_security_qualification_required=true",
    "credential_contents_read=false",
    "query_execution=false",
    "host_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "transaction=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
    "next_action=SEPARATELY_AUTHORIZE_CREDENTIAL_QUERY_V3R_READ_ONLY_QUALIFICATION",
):
    assert line in plan_lines, line

print(
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_INSTALLED_"
    "QUALIFICATION_V3R_PROOF_GREEN"
)
print("v3r_lock_bound=true")
print("v3r_protected_generation_required=true")
print("v1_predecessor_required=true")
print("v2_predecessor_required=true")
print("double_credential_query_required=true")
print("complete_dropin_set_hash_stability_required=true")
print("complete_credential_set_hash_stability_required=true")
print("exactly_one_epoch2_credential_required=true")
print("unrelated_credentials_allowed=true")
print("v6_security_generation_composition_required=true")
print("nested_v6_hold_reason_propagation=true")
print("unexpected_v6_bug_not_masked=true")
print("credential_contents_read=false")
print("host_mutation=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("transaction=false")
print("funds_movement=false")

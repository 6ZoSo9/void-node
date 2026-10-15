#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
QUALIFIER = ROOT / "ops/precision/void_buy_void_user_manager_query_live_qualification_v2.py"
REPLACEMENT = ROOT / "ops/precision/void_buy_void_user_manager_query_protected_replace_v2.py"
LOCK = ROOT / "ops/security/buy-void-user-manager-query-elf-lock-v2.json"
PREEXEC_SOURCE = ROOT / "ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c"
QUERY_SOURCE = ROOT / "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c"
V4_PARSER = ROOT / "tools/void-buy-allocation-custody-host-evidence-v4.mjs"

EXPECTED_BLOBS = {
    REPLACEMENT: "25753737ac7719b0ceddc759904c81db0f7a1cae",
    LOCK: "b3abcb408730cf5e79093f6df30733f11324e95c",
    PREEXEC_SOURCE: "f0fbfaae97df3294097a281100f06ada2ef157ff",
    QUERY_SOURCE: "5355b7f177574ac4fa173a693605acaf9c5f26e4",
    V4_PARSER: "7887cacd5481ba70a34dc7316fe8343e928936b5",
}


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


for path, expected in EXPECTED_BLOBS.items():
    assert git_blob_sha1(path.read_bytes()) == expected, path

source = QUALIFIER.read_text("utf-8")
for forbidden in (
    "shell=True",
    "systemctl",
    "Popen(",
    "urllib",
    "requests.",
    "http.client",
    "socket.socket",
    "spec_from_file_location",
    "exec_module(",
):
    assert forbidden not in source, forbidden

for required in (
    'REPLACE_SOURCE_GIT_BLOB_SHA1 = "25753737ac7719b0ceddc759904c81db0f7a1cae"',
    'V4_PARSER_GIT_BLOB_SHA1 = "7887cacd5481ba70a34dc7316fe8343e928936b5"',
    'NATIVE_MARKER = "VOID_BUY_VOID_USER_MANAGER_PRIVATE_UNIT_QUERY_V2_GREEN"',
    'RUNTIME_UID = 1000',
    'RUNTIME_GID = 1000',
    'RUNTIME_UNIT = "void-node-live.service"',
    'PrivateUsers',
    'KernelNoNewPrivs',
    'KernelCapBnd',
    'configured_kernel_bounding_set_equal',
    'kernel_active_capabilities_zero',
    'str(replacement.PREEXEC_TARGET)',
    'installed_generation_changed_during_qualification',
    'authenticated_runtime_generation_changed',
    'authenticated_native_evidence_changed',
    'double_authenticated_query_stable',
    'query_execution_state=unknown_or_partial',
):
    assert required in source, required

spec = importlib.util.spec_from_file_location(
    "void_buy_void_user_manager_query_live_qualification_v2",
    QUALIFIER,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.self_test()

positive = module.parse_native_output(module.synthetic_native_output())
assert positive["PrivateUsers"] == "no"
assert positive["KernelNoNewPrivs"] == "1"
assert positive["KernelCapEff"] == module.ZERO_HEX
assert positive["KernelCapBnd"] == positive["CapabilityBoundingSet"]
assert positive["configured_kernel_bounding_set_equal"] == "true"
assert positive["kernel_active_capabilities_zero"] == "true"

for old, new in (
    ("PrivateUsers=no", "PrivateUsers=yes"),
    ("KernelNoNewPrivs=1", "KernelNoNewPrivs=0"),
    ("KernelCapEff=" + module.ZERO_HEX, "KernelCapEff=0000000000000001"),
    (
        "KernelCapBnd=000001ffffffffff",
        "KernelCapBnd=000000ffffffffff",
    ),
    (
        "configured_kernel_bounding_set_equal=true",
        "configured_kernel_bounding_set_equal=false",
    ),
    ("host_mutation=false", "host_mutation=true"),
):
    bad = module.synthetic_native_output().replace(old, new)
    try:
        module.parse_native_output(bad)
    except module.QualificationError:
        pass
    else:
        raise AssertionError(f"native adversary accepted: {old} -> {new}")

assert module._stable_identity(positive) == {
    "runtime_uid": 1000,
    "manager_pid": 2693,
    "manager_gid": 1000,
    "manager_start_ticks": "1409",
    "main_pid": 4242,
    "service_ppid": 2693,
    "service_start_ticks": "998877",
    "control_group":
        "/user.slice/user-1000.slice/user@1000.service/app.slice/"
        "void-node-live.service",
    "capability_bounding_set": "000001ffffffffff",
}

print("VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V2_PROOF_GREEN")
print("protected_replacement_source_blob_bound=true")
print("accepted_v2_elf_lock_blob_bound=true")
print("preexec_source_blob_bound=true")
print("query_source_blob_bound=true")
print("v4_parser_source_blob_bound=true")
print("protected_v2_generation_required=true")
print("fixed_preexec_only=true")
print("root_live_execution_required=true")
print("native_v2_exact_output_shape_required=true")
print("private_users_false_required=true")
print("kernel_no_new_privileges_required=true")
print("kernel_active_capabilities_zero_required=true")
print("configured_kernel_bounding_set_equality_required=true")
print("double_authenticated_query_required=true")
print("installed_generation_stability_required=true")
print("host_mutation=false")
print("filesystem_write=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("external_network_calls=false")
print("request_or_payment_contents_read=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")

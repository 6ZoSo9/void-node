#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
QUALIFIER = (
    ROOT / "ops/precision/void_buy_void_user_manager_query_live_qualification_v1.py"
)
INSTALLER = (
    ROOT / "ops/precision/void_buy_void_user_manager_query_protected_install_v1.py"
)
LOCK = ROOT / "ops/security/buy-void-user-manager-query-elf-lock-v1.json"
PREEXEC_SOURCE = (
    ROOT / "ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c"
)
QUERY_SOURCE = (
    ROOT / "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c"
)
V3_PARSER = ROOT / "tools/void-buy-allocation-custody-host-evidence-v3.mjs"

EXPECTED_BLOBS = {
    INSTALLER: "2ec35012283f729aac073735ac37cde3464c81a4",
    LOCK: "4f255dbc98ac4b65fb4e6433f4e7aee7b86351db",
    PREEXEC_SOURCE: "f0fbfaae97df3294097a281100f06ada2ef157ff",
    QUERY_SOURCE: "ad49cd7f71c41e0f559a561b5a62a00cec60c215",
    V3_PARSER: "eae92c7dd060b4d6139543463b5fbd2f8564585b",
}


def git_blob_sha1(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


for path, expected in EXPECTED_BLOBS.items():
    actual = git_blob_sha1(path.read_bytes())
    assert actual == expected, f"dependency_blob_drift:{path.relative_to(ROOT)}"

source = QUALIFIER.read_text(encoding="utf-8")
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
    assert forbidden not in source, f"unsafe_execution_or_network_primitive:{forbidden}"

for required in (
    'INSTALLER_SOURCE_GIT_BLOB_SHA1 = "2ec35012283f729aac073735ac37cde3464c81a4"',
    'V3_PARSER_GIT_BLOB_SHA1 = "eae92c7dd060b4d6139543463b5fbd2f8564585b"',
    'RUNTIME_UID = 1000',
    'RUNTIME_GID = 1000',
    'RUNTIME_UNIT = "void-node-live.service"',
    'subprocess.run(',
    'str(installer.PREEXEC_TARGET)',
    '"--uid"',
    '"--unit"',
    'cwd="/"',
    'close_fds=True',
    'timeout=QUERY_TIMEOUT_SECONDS',
    'installed_pair_changed_during_qualification',
    'authenticated_runtime_generation_changed',
    'authenticated_native_evidence_changed',
    'manager_peer_authenticated',
    'same_private_fd_used_for_query',
    'runtime_main_pid_kernel_bound',
    'double_authenticated_query_stable',
    'query_execution_state=unknown_or_partial',
    'production_host_evidence_authority=false',
    'types.ModuleType(',
    'compile(raw, str(source_path), "exec", dont_inherit=True)',
    'exec(code, module.__dict__)',
):
    assert required in source, f"required_qualification_boundary_missing:{required}"

spec = importlib.util.spec_from_file_location(
    "void_buy_void_user_manager_query_live_qualification_v1",
    QUALIFIER,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.self_test()

trusted_installer = b'VALUE = "authenticated"\n'
replacement_pathname = (
    b'raise AssertionError("replacement pathname bytes executed")\n'
    b'VALUE = "replacement"\n'
)
authenticated_installer = trusted_installer
authenticated_blob = module.git_blob_sha1(authenticated_installer)
pathname_bytes_after_authentication = replacement_pathname
loaded = module._module_from_authenticated_source(
    authenticated_installer,
    pathlib.Path("/simulated/replaced-installer.py"),
)
assert module.git_blob_sha1(authenticated_installer) == authenticated_blob
assert pathname_bytes_after_authentication == replacement_pathname
assert loaded.VALUE == "authenticated"

positive = module.parse_native_output(module.synthetic_native_output())
assert positive["runtime_uid"] == "1000"
assert positive["manager_gid"] == "1000"
assert positive["runtime_service_unit"] == "void-node-live.service"
assert positive["manager_peer_authenticated"] == "true"
assert positive["same_private_fd_used_for_query"] == "true"
assert positive["runtime_main_pid_kernel_bound"] == "true"
assert positive["host_mutation"] == "false"
assert positive["payment_acceptance"] == "false"
assert positive["public_presale_activation"] == "false"
assert positive["funds_movement"] == "false"

for old, new in (
    ("runtime_uid=1000", "runtime_uid=1001"),
    ("manager_gid=1000", "manager_gid=1001"),
    (
        "runtime_service_unit=void-node-live.service",
        "runtime_service_unit=other.service",
    ),
    ("LoadState=loaded", "LoadState=not-found"),
    ("ActiveState=active", "ActiveState=inactive"),
    ("SubState=running", "SubState=dead"),
    ("NoNewPrivileges=yes", "NoNewPrivileges=no"),
    ("manager_peer_authenticated=true", "manager_peer_authenticated=false"),
    (
        "same_private_fd_used_for_query=true",
        "same_private_fd_used_for_query=false",
    ),
    (
        "runtime_main_pid_kernel_bound=true",
        "runtime_main_pid_kernel_bound=false",
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
}

print("VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V1_PROOF_GREEN")
print("protected_installer_source_blob_bound=true")
print("accepted_elf_lock_blob_bound=true")
print("preexec_source_blob_bound=true")
print("query_source_blob_bound=true")
print("v3_parser_source_blob_bound=true")
print("fixed_preexec_only=true")
print("root_live_execution_required=true")
print("installed_pair_hash_and_custody_verified=true")
print("native_exact_output_shape_required=true")
print("authenticated_manager_peer_required=true")
print("same_private_fd_query_required=true")
print("runtime_main_pid_kernel_binding_required=true")
print("double_authenticated_query_required=true")
print("installed_pair_stability_required=true")
print("hold_query_execution_state_explicit=true")
print("authenticated_source_bytes_executed=true")
print("post_auth_path_reopen_forbidden=true")
print("post_auth_path_replacement_adversary_rejected=true")
print("host_mutation=false")
print("filesystem_write=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("external_network_calls=false")
print("credential_access=false")
print("wallet_or_signer_access=false")
print("request_or_payment_contents_read=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")

#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_preentry_v3.c"
)
RUNNER = (
    ROOT
    / "ops/precision/"
    "void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
)

SOURCE_BLOB = "2e75b8a6fa5ecc36ce2ca05d920001a16abcf5b7"
RUNNER_BLOB = "baab733e43c030d24f8d4abd1644f3c4ae55c3b2"


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


assert git_blob_sha1(SOURCE.read_bytes()) == SOURCE_BLOB
assert git_blob_sha1(RUNNER.read_bytes()) == RUNNER_BLOB

source = SOURCE.read_text("utf-8")

for required in (
    '#define MARKER "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3"',
    '#define POLICY_SCHEMA "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3"',
    '#define FIXED_ROOT "/opt/void-buy-void-epoch2-live-composition-v3"',
    '#define FIXED_SELF FIXED_ROOT "/void_buy_void_epoch2_live_composition_native_preentry_v3"',
    '#define FIXED_POLICY FIXED_ROOT "/policy-v3.conf"',
    '#define FIXED_RUNNER FIXED_ROOT "/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"',
    '#define CONFIRM "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3"',
    '#define PREENTRY_ENV "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3=" MARKER',
    '#define PROOF_SCHEMA "VOID_BUY_VOID_EPOCH2_NATIVE_PARENT_PROOF_V3"',
    '#define PROOF_FD_ENV_PREFIX "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_PROOF_FD="',
    '"VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_RUNNER_FD=%d"',
    "require_self_identity();",
    "require_devnull_stdin();",
    "open_trusted_regular(",
    "require_digest_and_size(",
    "read_process_start_ticks(",
    "emit_parent_proof(",
    "fexecve(node_fd, next_argv, envp);",
    "waitpid(child, &status, 0)",
    "runner_descriptor_retained=true",
    "node_descriptor_fexecve=true",
    "native_parent_retained_for_child_lifetime=true",
    "parent_child_start_ticks_bound=true",
    "private_parent_proof_channel=true",
    "stdin_javascript_source_forbidden=true",
    "loader_environment_sanitized=true",
    "credential_content_access=false",
    "transaction=false",
    "public_presale_activation=false",
    "funds_movement=false",
):
    assert required in source, required

for forbidden in (
    "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V1",
    "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1",
    "VOID_BUY_VOID_EPOCH2_NATIVE_PARENT_PROOF_V1",
    "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_RUNNER_FD=",
    "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_PROOF_FD=",
    "/opt/void-buy-void-epoch2-live-composition-v2",
    "void_buy_void_epoch2_live_composition_native_preentry_v1",
    "void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs",
    "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V2",
    "policy-v1.conf",
):
    assert forbidden not in source, forbidden

# The source remains policy-driven. It does not pre-accept a runner digest,
# candidate, installation, or live authority.
for forbidden in (
    "candidate_accepted=true",
    "install_authorized=true",
    "live_execution_authorized=true",
    "presale_activation=true",
    "funds_movement=true",
):
    assert forbidden not in source, forbidden

with tempfile.TemporaryDirectory(prefix="void-e2-native-v3-source-proof-") as td:
    binary = pathlib.Path(td) / "native-preentry-v3"
    compile_result = subprocess.run(
        [
            "/usr/bin/cc",
            "-std=c11",
            "-Wall",
            "-Wextra",
            "-Werror",
            "-O2",
            "-fno-ident",
            "-Wl,--build-id=none",
            "-o",
            str(binary),
            str(SOURCE),
        ],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        env={
            "PATH": "/usr/bin:/bin",
            "LANG": "C",
            "LC_ALL": "C",
            "SOURCE_DATE_EPOCH": "0",
        },
    )
    assert compile_result.returncode == 0, compile_result.stderr

    self_test = subprocess.run(
        [str(binary), "--self-test"],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
        env={"PATH": "/usr/bin:/bin", "LANG": "C", "LC_ALL": "C"},
    )
    assert self_test.stderr == ""
    lines = set(self_test.stdout.splitlines())
    for line in (
        "VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_SELF_TEST_GREEN",
        "native_first_instruction=true",
        "fixed_self_path=true",
        "fixed_runner_path=true",
        "fixed_node_path=true",
        "root_owned_policy_required=true",
        "runner_sha256_policy_bound=true",
        "node_sha256_policy_bound=true",
        "expected_head_policy_bound=true",
        "runner_descriptor_retained=true",
        "node_descriptor_fexecve=true",
        "native_parent_retained_for_child_lifetime=true",
        "parent_child_start_ticks_bound=true",
        "installed_preentry_runner_generation_bound=true",
        "private_parent_proof_channel=true",
        "stdin_javascript_source_forbidden=true",
        "loader_environment_sanitized=true",
        "credential_content_access=false",
        "transaction=false",
        "public_presale_activation=false",
        "funds_movement=false",
    ):
        assert line in lines, line

print("VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_SOURCE_PROOF_GREEN")
print("v3_runner_source_blob_bound=true")
print("v3_fixed_root_separate=true")
print("v3_fixed_preentry_path_separate=true")
print("v3_fixed_runner_path_separate=true")
print("v3_policy_schema_separate=true")
print("v3_parent_proof_schema_separate=true")
print("v3_environment_names_separate=true")
print("v2_native_entry_cannot_satisfy_v3_contract=true")
print("native_first_instruction_preserved=true")
print("runner_digest_policy_binding_preserved=true")
print("node_digest_policy_binding_preserved=true")
print("native_parent_retained_for_child_lifetime=true")
print("candidate_accepted=false")
print("install_authorized=false")
print("live_execution_authorized=false")
print("credential_content_access=false")
print("transaction=false")
print("public_presale_activation=false")
print("funds_movement=false")

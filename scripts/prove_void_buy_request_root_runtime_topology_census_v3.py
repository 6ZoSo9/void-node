#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v2.py"

PARENT_BLOBS = {
    "ops/precision/void_buy_request_root_runtime_topology_census_v1.py":
        "9ca9cb948a08973d0d874c5473ad2743de14140c",
    "scripts/prove_buy_void_allocation_custody_witness_live_read_qualification_v1.ts":
        "f9a6c9cb6059cb6869468e2f46da1e7c21d5c264",
    "tools/void-buy-stable-request-root-policy-v1.mjs":
        "681adb6bb7b6bc942b8cef690e45649dd38cada5",
    "src/economic/buy_void_request_custody_read_policy_v1.ts":
        "8885957e3f9ff983724c7944e0d4f181e6e834c1",
    "src/economic/buy_void_public_request_under_launch_lock_v1.ts":
        "8fe4fa53953683fa0804f24ede838c22ec18cae0",
    "src/economic/buy_void_verified_payment_capacity_admission_v1.ts":
        "d1320be22fe55af24017b84f0655fbcde82dbee9",
}


def git_blob(relative: str) -> str:
    result = subprocess.run(
        ["/usr/bin/git", "--no-replace-objects", "-C", str(ROOT),
         "rev-parse", "HEAD:" + relative],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
        },
        check=True,
    )
    return result.stdout.strip()


for relative, expected in PARENT_BLOBS.items():
    assert git_blob(relative) == expected, ("parent_blob_drift", relative)

spec = importlib.util.spec_from_file_location(
    "void_buy_request_root_runtime_topology_census_v2", TARGET
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == "VOID_BUY_VOID_REQUEST_ROOT_RUNTIME_TOPOLOGY_CENSUS_V2"
assert module.PROFILE_ID == "custody_readable_request_root_0750_0640_v1"
assert str(module.TARGET_ROOT) == "/var/lib/void-buy-request-journal-v1"
assert module.IPC_GROUP == "void-buy-custody-ipc"
assert module.EXPECTED_HOSTNAME == "zoso-Precision-Tower-7810"
assert module.EXPECTED_USER == "zoso"
assert module.EXPECTED_UID == 1000
assert module.EXPECTED_MACHINE_ID_SHA256 == (
    "11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"
)
assert module.AUTHENTICATED_USER_MANAGER_BINDING_VERIFIED is False
assert module.authenticated_live_binding(True, False) is False
assert module.authenticated_live_binding(False, True) is False
assert module.authenticated_live_binding(True, True) is True

source = TARGET.read_text(encoding="utf-8")
for required in (
    "target_live_binding_qualified",
    "authenticated_user_manager_binding_verified",
    "authenticated_live_binding",
    "unauthenticated_runtime_candidate_observed",
    "AUTHENTICATED_USER_MANAGER_BINDING_REQUIRED",
    "target_metadata_generation_stable",
    "machine_id_stable",
    "machine_id_matches_expected",
    "ipc_group_stable",
    "runtime_http_listener_stable",
    "confirmed_closeout_status_stable",
    "legacy_candidate_exists_count",
    "legacy_metadata_qualified_candidate_count",
    "historical_request_history_disposition_proven",
    "migration_authorized",
    "production_gate_ready",
    "TARGET_LIVE_BINDING_OBSERVED_HISTORY_DISPOSITION_REQUIRED",
    "TARGET_NOT_PROVISIONED_HISTORY_DISPOSITION_REQUIRED_BEFORE_APPLY",
    'target = result["target_request_root"]',
    'target.get("exists")',
    'target.get("metadata_qualified")',
):
    assert required in source, required

for forbidden in (
    "/environ",
    ".read_bytes(",
    "requests.jsonl\").read",
    "operator-events.jsonl\").read",
    "mkdir(",
    "chmod(",
    "chown(",
    "unlink(",
    "rename(",
    "systemctl restart",
    "systemctl start",
    "systemctl stop",
    "systemctl enable",
    "systemctl disable",
    "sudo ",
):
    assert forbidden not in source, forbidden

main_source = source[source.index("def main() -> int:"):]
assert 'target_before.get("exists")' not in main_source
assert 'target_before.get("metadata_qualified")' not in main_source
module.self_test()

print("VOID_BUY_VOID_REQUEST_ROOT_RUNTIME_TOPOLOGY_CENSUS_V3_PROOF_GREEN")
print("accepted_stable_request_root_policy_blob_bound=true")
print("accepted_custody_readable_source_blobs_bound=true")
print("v1_read_primitives_blob_bound=true")
print("double_census_stability_required=true")
print("designated_machine_id_binding_required=true")
print("authenticated_user_manager_binding_verified=false")
print("target_live_binding_fail_closed_until_authenticated_manager=true")
print("request_payment_contents_read=false")
print("historical_request_history_disposition_proven=false")
print("migration_authorized=false")
print("production_gate_ready=false")

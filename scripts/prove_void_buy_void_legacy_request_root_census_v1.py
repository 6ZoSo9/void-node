#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import importlib.util
import pathlib
import subprocess
import tempfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/"ops/precision/void_buy_void_legacy_request_root_census_v1.py"
V1=ROOT/"ops/precision/void_buy_request_root_runtime_topology_census_v1.py"
AUTH=ROOT/"ops/precision/void_buy_void_user_manager_query_live_qualification_v1.py"
INSTALLER=ROOT/"ops/precision/void_buy_void_user_manager_query_protected_install_v1.py"
PARSER=ROOT/"tools/void-buy-allocation-custody-host-evidence-v3.mjs"
LOCK=ROOT/"ops/security/buy-void-user-manager-query-elf-lock-v1.json"
EXPECTED_DEPENDENCY_BLOBS={
    V1:"9ca9cb948a08973d0d874c5473ad2743de14140c",
    AUTH:"e0d3a583030a5465cc793f740c04f4b33f84eba6",
    INSTALLER:"2ec35012283f729aac073735ac37cde3464c81a4",
    PARSER:"eae92c7dd060b4d6139543463b5fbd2f8564585b",
    LOCK:"4f255dbc98ac4b65fb4e6433f4e7aee7b86351db",
}

def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob "+str(len(raw)).encode("ascii")+b"\0"+raw
    ).hexdigest()

for dependency, expected in EXPECTED_DEPENDENCY_BLOBS.items():
    assert git_blob_sha1(dependency.read_bytes()) == expected, (
        "dependency_blob_drift:"+str(dependency.relative_to(ROOT))
    )


spec=importlib.util.spec_from_file_location("legacy_request_root_census_v1",TARGET)
assert spec is not None and spec.loader is not None
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER=="VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1"
assert str(module.STABLE_ROOT)=="/var/lib/void-buy-request-journal-v1"
assert module.EXPECTED_HOSTNAME=="zoso-Precision-Tower-7810"
assert module.EXPECTED_USER=="zoso"
assert module.EXPECTED_UID==1000
assert str(module.REPO_ROOT)=="/home/zoso/dev/void-node"
assert module.EXPECTED_MACHINE_ID_SHA256=="11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"

source=TARGET.read_text(encoding="utf-8")
for required in (
    "candidate_set_completeness_proven",
    "bounded_current_candidate_set_observed",
    "EMPTY_DIRECTORY_OBSERVED_EXTERNAL_ANCHOR_REQUIRED",
    "ZERO_LENGTH_FIXED_JOURNALS_OBSERVED_EXTERNAL_ANCHOR_REQUIRED",
    "SURVIVING_HISTORY_METADATA_OBSERVED",
    "historical_request_history_disposition_proven",
    "historical_origin_authenticated",
    "filesystem_rollback_prevention_proven",
    "EXPLICIT_LEGACY_HISTORY_DISPOSITION_AND_EXTERNAL_WITNESS_REQUIRED",
    "process_environment_access",
    "loopback_get_only",
    "runtime_process_generation_stable",
    "runtime_http_listener_stable",
    "confirmed_closeout_request_root_status_stable",
    "immutable_release_inventory_stable",
    "candidate_observations_stable",
    "auth.run_authenticated_query",
    "_load_authenticated_installer",
    "authenticated_user_manager_query_stable",
    "installed_authenticated_query_pair_stable",
    "unit_working_directory_authenticated",
    "designated_host_identity_verified",
    "root_required_for_authenticated_manager_query",
    "designated_runtime_user_matches",
):
    assert required in source, required

plan_marker="\ndef plan() -> None:"
production_source = (
    source[:source.index("def self_test()")]
    + source[source.index(plan_marker)+1:]
)

for forbidden in (
    "requests.jsonl\").read",
    "operator-events.jsonl\").read",
    "fetch(",
    "http.request",
    "urllib",
    "mkdir(",
    "chmod(",
    "chown(",
    "unlink(",
    "rename(",
    "/proc/{pid}/environ",
    "targeted_live_process_request_env",
    "env={**os.environ",
    "subprocess.run",
    "v1.run_systemctl",
    "systemctl",
    "DBUS_SESSION_BUS_ADDRESS",
    "unit_working_directory_default",
    "V2_PATH =",
    "v2 = _load_authenticated",
    "auth._load_installer()",
):
    assert forbidden not in production_source, forbidden

cp=subprocess.run(
    ["/usr/bin/python3","-I","-B",str(TARGET),"--self-test"],
    cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=True,env={"PATH":"/usr/bin:/bin","HOME":"/tmp","LANG":"C","LC_ALL":"C"},
)
with tempfile.TemporaryDirectory(prefix="void-legacy-release-inventory-") as td:
    prior_root = module.RELEASES_ROOT
    module.RELEASES_ROOT = pathlib.Path(td)
    release = module.RELEASES_ROOT / ("a" * 40)
    release.mkdir()
    paths, complete = module._release_inventory()
    assert complete is True
    assert paths == [release / module.DEFAULT_RELATIVE]
    (module.RELEASES_ROOT / ("b" * 40)).symlink_to(release)
    _, complete_with_symlink = module._release_inventory()
    assert complete_with_symlink is False
    module.RELEASES_ROOT = prior_root

assert "VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1_SELF_TEST_GREEN" in cp.stdout
assert "empty_metadata_is_not_genesis_proof=true" in cp.stdout
assert "zero_length_fixed_journals_are_not_genesis_proof=true" in cp.stdout
assert "historical_request_history_disposition_proven=false" in cp.stdout
assert "authenticated_dependency_sources_bound=true" in cp.stdout
assert "unauthenticated_user_manager_not_authority=true" in cp.stdout
assert "nested_repository_path_execution_forbidden=true" in cp.stdout
assert "machine_id_descriptor_bound_local=true" in cp.stdout

print("VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1_PROOF_GREEN")
print("v1_topology_dependency_blob_bound=true")
print("machine_id_reader_local=true")
print("installer_lock_and_parser_dependency_blobs_bound=true")
print("authenticated_user_manager_query_dependency_blob_bound=true")
print("authenticated_mainpid_required=true")
print("unit_working_directory_not_trusted=true")
print("fake_user_bus_not_authority=true")
print("nested_repository_path_execution_forbidden=true")
print("machine_id_descriptor_bound_local=true")
print("designated_runtime_user_bound=true")
print("ambient_home_not_used_for_repo_candidate=true")
print("stable_release_inventory_required=true")
print("repeat_candidate_observation_required=true")
print("process_environment_access=false")
print("external_network_calls=false")
print("loopback_get_only=true")
print("stable_runtime_status_binding_required=true")
print("metadata_only=true")
print("empty_shape_not_promoted_to_genesis=true")
print("candidate_set_completeness_proven=false")
print("historical_request_history_disposition_proven=false")
print("external_witness_required=true")
print("production_gate_ready=false")

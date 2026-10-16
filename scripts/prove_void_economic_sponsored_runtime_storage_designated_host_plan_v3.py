#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_economic_sponsored_runtime_storage_designated_host_plan_v3.py"
PREDECESSOR = ROOT / "ops/precision/void_economic_sponsored_runtime_storage_designated_host_plan_v2.py"
EXPECTED_PREDECESSOR_BLOB = "2cb05a9873de9e6bf359e025721867edce43684b"


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


spec = importlib.util.spec_from_file_location(
    "void_economic_sponsored_runtime_storage_designated_host_plan_v3",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V3"
assert module.PREDECESSOR_V2_GIT_BLOB_SHA1 == EXPECTED_PREDECESSOR_BLOB
assert git_blob_sha1(PREDECESSOR.read_bytes()) == EXPECTED_PREDECESSOR_BLOB
assert module.REVIEWED_SYSTEMD_MAJOR == 255
assert module.SYSTEMCTL == pathlib.Path("/usr/bin/systemctl")
assert module.BUSCTL == pathlib.Path("/usr/bin/busctl")

module.self_test()

unit_path = module.parse_systemd_unit_path(
    'as 4 "/etc/systemd/system" "/usr/local/lib/systemd/system" '
    '"/run/systemd/transient" "/usr/lib/systemd/system"\n'
)
assert unit_path == [
    "/etc/systemd/system",
    "/usr/local/lib/systemd/system",
    "/run/systemd/transient",
    "/usr/lib/systemd/system",
]

max_unit_path = "as " + str(module.MAX_UNIT_PATHS) + " " + " ".join(
    f'"/synthetic/systemd/unit-path-{index}"'
    for index in range(module.MAX_UNIT_PATHS)
)
assert len(module.parse_systemd_unit_path(max_unit_path)) == module.MAX_UNIT_PATHS
max_plus_one_unit_path = "as " + str(module.MAX_UNIT_PATHS + 1) + " " + " ".join(
    f'"/synthetic/systemd/unit-path-{index}"'
    for index in range(module.MAX_UNIT_PATHS + 1)
)
oversized_count = "9" * 5000

manager_absence = module.parse_systemd_unit_absence(
    "LoadState=not-found\nFragmentPath=\nSourcePath=\n"
)
assert manager_absence["manager_unit_name_absence_verified"] is True


def state(path: str, selected_exists: bool) -> dict:
    return {
        "path": path,
        "root_exists": True,
        "nearest_existing_ancestor": path,
        "trusted_root_generation": True,
        "ancestor_generations": [],
        "selected_unit_path": str(pathlib.Path(path) / module.SERVICE_UNIT),
        "selected_unit_exists": selected_exists,
        "selected_unit_kind": "regular" if selected_exists else "absent",
    }


def expect_hold(fn, code: str) -> None:
    try:
        fn()
    except module.PlanError as exc:
        assert str(exc) == code, (str(exc), code)
    else:
        raise AssertionError("expected HOLD: " + code)


for loaded_state in (
    "LoadState=loaded\nFragmentPath=/run/systemd/transient/"
    + module.SERVICE_UNIT
    + "\nSourcePath=\n",
    "LoadState=masked\nFragmentPath=/etc/systemd/system/"
    + module.SERVICE_UNIT
    + "\nSourcePath=\n",
):
    expect_hold(
        lambda value=loaded_state: module.parse_systemd_unit_absence(value),
        "selected_systemd_unit_loaded_or_known",
    )

for collision_root in (
    "/usr/local/lib/systemd/system",
    "/run/systemd/transient",
):
    rows = [state(path, path == collision_root) for path in unit_path]
    expect_hold(
        lambda rows=rows: module.classify_unit_path_states(unit_path, rows),
        "selected_systemd_unit_already_exists",
    )

for bad, code in (
    ('as 2 "/etc/systemd/system" "/etc/systemd/system"\n',
     "systemd_unit_path_entry_invalid"),
    ('as 1 "run/systemd/transient"\n',
     "systemd_unit_path_entry_invalid"),
    ('as 1 "/missing/../etc/systemd/system"\n',
     "systemd_unit_path_entry_invalid"),
    ('as 1 "/etc/./systemd/system"\n',
     "systemd_unit_path_entry_invalid"),
    ('as 01 "/run/systemd/system"\n',
     "systemd_unit_path_shape_invalid"),
    ('as ١ "/run/systemd/system"\n',
     "systemd_unit_path_shape_invalid"),
    ('as 2 "/run/systemd/system"\n',
     "systemd_unit_path_count_invalid"),
    (max_plus_one_unit_path,
     "systemd_unit_path_count_invalid"),
    ("as " + oversized_count + ' "/run/systemd/system"\n',
     "systemd_unit_path_count_invalid"),
):
    expect_hold(lambda value=bad: module.parse_systemd_unit_path(value), code)

manager = {
    "systemd_bus_owner_pid": 1,
    "running_systemd_manager_version": "255.4-1ubuntu8.11",
    "unit_path": unit_path,
}
module._require_manager_stable(manager, dict(manager))
for changed in (
    {**manager, "systemd_bus_owner_pid": 2},
    {**manager, "running_systemd_manager_version": "255.4-other"},
    {**manager, "unit_path": list(reversed(unit_path))},
):
    expect_hold(
        lambda changed=changed: module._require_manager_stable(manager, changed),
        "systemd_manager_generation_changed",
    )

stable_states = module.classify_unit_path_states(
    unit_path,
    [state(path, False) for path in unit_path],
)
module._require_unit_path_evidence_stable(stable_states, dict(stable_states))
changed_states = {
    **stable_states,
    "roots": [*stable_states["roots"]],
}
changed_states["roots"][0] = {
    **changed_states["roots"][0],
    "nearest_existing_ancestor": "/",
}
expect_hold(
    lambda: module._require_unit_path_evidence_stable(stable_states, changed_states),
    "systemd_unit_path_root_generation_changed",
)

source = TARGET.read_text(encoding="utf-8")
for required in (
    "GetConnectionUnixProcessID",
    "org.freedesktop.systemd1.Manager",
    '"UnitPath"',
    "systemd_bus_owner_pid1_verified",
    "unit_name_absence_bound_to_authenticated_manager_unit_path",
    "unit_name_absence_bound_to_running_manager_state",
    "parse_systemd_unit_absence",
    "systemd_unit_path_stability_verified",
    "systemd_unit_path_root_generations_revalidated",
    "PREDECESSOR_V2_GIT_BLOB_SHA1",
    "_revalidate_local_identity_authority(identity_authority)",
    "_revalidate_systemd_tool_authority(systemd_tools_before)",
):
    assert required in source, required

for forbidden in (
    "import pwd",
    "import grp",
    "from pwd import",
    "from grp import",
    "pwd.getpwall",
    "grp.getgrall",
    "pwd.getpwnam",
    "pwd.getpwuid",
    "grp.getgrnam",
    "grp.getgrgid",
):
    assert forbidden not in source, forbidden

assert re.search(
    r'systemd_manager_before\s*=\s*_systemd_manager_snapshot\(\)',
    source,
)
assert re.search(
    r'systemd_manager_after\s*=\s*_systemd_manager_snapshot\(\)',
    source,
)
assert source.index("systemd_manager_before = _systemd_manager_snapshot()") < source.index(
    'unit_path_before = _unit_path_absence_evidence('
)
assert source.index("_revalidate_local_identity_authority(identity_authority)") < source.index(
    "systemd_manager_after = _systemd_manager_snapshot()"
)

print("VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V3_PROOF_GREEN")
print("predecessor_v2_blob_bound=true")
print("local_files_nss_v2_preserved=true")
print("systemd_bus_owner_pid1_bound=true")
print("systemd_running_installed_version_match_required=true")
print("manager_unit_path_exact_array_bound=true")
print("all_manager_unit_path_roots_observed=true")
print("manager_loaded_unit_rejected=true")
print("usr_local_unit_collision_rejected=true")
print("transient_unit_collision_rejected=true")
print("unit_path_reorder_rejected=true")
print("manager_generation_change_rejected=true")
print("unit_path_root_generation_change_rejected=true")
print("systemd_mutation=false")
print("filesystem_mutation=false")
print("funds_movement=false")

#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_economic_sponsored_runtime_storage_designated_host_plan_v1.py"
SELECTION = ROOT / "ops/mainnet0/economic-sponsored-runtime-storage-production-selection-v1.json"

TARGET_BLOB = "90fbe18958d9d4a8f1739bcb22c4a9c8d611b108"
SELECTION_BLOB = "2d609f5fdcd10be767ad5518bc3188dff45d1fea"


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


assert git_blob_sha1(TARGET.read_bytes()) == TARGET_BLOB
assert git_blob_sha1(SELECTION.read_bytes()) == SELECTION_BLOB

source = TARGET.read_text("utf-8")

for required in (
    'EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"',
    'EXPECTED_OPERATOR = "zoso"',
    'EXPECTED_OPERATOR_UID = 1000',
    'EXPECTED_MACHINE_ID_SHA256 = (',
    '"/etc/login.defs"',
    '"/etc/machine-id"',
    'SERVICE_UNIT = "void-economic-sponsored-runtime-v1.service"',
    'SERVICE_USER = "void-sponsored-runtime"',
    'SERVICE_GROUP = "void-sponsored-runtime"',
    '"/etc/systemd/system/void-economic-sponsored-runtime-v1.service"',
    '"/var/lib/void-economic-sponsored-runtime-v1"',
    'pwd.getpwnam(SERVICE_USER)',
    'grp.getgrnam(SERVICE_GROUP)',
    'pwd.getpwall()',
    'grp.getgrall()',
    'pwd.getpwuid(candidate)',
    'grp.getgrgid(candidate)',
    'choose_shared_system_id',
    'range(high, low - 1, -1)',
    '"candidate_runtime_uid_gid_selected_in_plan": True',
    '"production_runtime_uid_gid_selected": False',
    '"production_runtime_uid_gid_provisioned": False',
    '"runtime_account_creation_authorized": False',
    '"storage_provisioning_authorized": False',
    '"designated_host_identity_verified": True',
    '"host_plan_read_only": True',
    '"account_name_absence_verified": True',
    '"unit_name_absence_verified": True',
    '"selected_storage_paths_absent_verified": True',
    '"trusted_parent_ancestry_verified": True',
    '"candidate_runtime_uid_gid_free_verified": True',
    '"process_environment_access": False',
    '"external_network_calls": False',
    '"SEPARATELY_AUTHORIZE_SPONSORED_RUNTIME_STORAGE_BOOTSTRAP_V1"',
):
    assert required in source, required

for forbidden in (
    "os.mkdir(",
    "os.makedirs(",
    "os.chown(",
    "os.fchown(",
    "os.chmod(",
    "os.fchmod(",
    "os.unlink(",
    "os.remove(",
    "os.rename(",
    "os.replace(",
    "O_WRONLY",
    "O_RDWR",
    "O_CREAT",
    "O_TRUNC",
    "useradd",
    "groupadd",
    "systemctl",
    "loginctl",
    "sudo",
    "subprocess.Popen",
    "socket.socket(",
    "urllib",
    "requests.",
    "/proc/",
    "os.environ",
):
    assert forbidden not in source, forbidden

# Fixed git is the only subprocess boundary and is read-only.
assert 'GIT = "/usr/bin/git"' in source
assert "subprocess.run(" in source
assert '["status", "--porcelain=v1", "--untracked-files=all"]' in source
assert '["rev-parse", "HEAD:" + SELECTION_REL]' in source

# The host-plan output must never call the host candidate a provisioned identity.
assert '"candidate_runtime_uid": candidate' in source
assert '"candidate_runtime_gid": candidate' in source
assert '"production_runtime_uid_gid_selected": False' in source
assert '"runtime_account_creation_authorized": False' in source
assert '"storage_provisioning_authorized": False' in source

cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
    env={
        "PATH": "/usr/bin:/bin",
        "HOME": "/tmp",
        "LANG": "C",
        "LC_ALL": "C",
    },
)
self_lines = set(cp.stdout.splitlines())
for line in (
    "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V1_SELF_TEST_GREEN",
    "login_defs_bounds_parser=true",
    "highest_free_shared_system_id_deterministic=true",
    "numeric_identity_host_derived=true",
    "plan_content_addressed=true",
    "host_mutation=false",
    "filesystem_mutation=false",
    "systemd_mutation=false",
    "funds_movement=false",
):
    assert line in self_lines, line

plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=True,
    env={
        "PATH": "/usr/bin:/bin",
        "HOME": "/tmp",
        "LANG": "C",
        "LC_ALL": "C",
    },
)
plan_lines = set(plan.stdout.splitlines())
for line in (
    "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V1",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_mutation=false",
    "selection_id=voidsponsoredstoreselect1_0224ed5a5cb20670e4b12259f0871357ebb8b52478702a98dd80edbf1d3ae938",
    "expected_hostname=zoso-Precision-Tower-7810",
    "service_unit=void-economic-sponsored-runtime-v1.service",
    "service_user=void-sponsored-runtime",
    "service_group=void-sponsored-runtime",
    "parent_root=/var/lib/void-economic-sponsored-runtime-v1",
    "time_root=/var/lib/void-economic-sponsored-runtime-v1/time",
    "reservation_root=/var/lib/void-economic-sponsored-runtime-v1/reservation",
    "replay_root=/var/lib/void-economic-sponsored-runtime-v1/replay",
    "production_runtime_uid_gid_selected=false",
    "runtime_account_creation_authorized=false",
    "storage_provisioning_authorized=false",
    "live_host_evidence_verified=false",
    "storage_bootstrap=false",
    "service_installation=false",
    "service_start=false",
    "systemd_mutation=false",
    "filesystem_mutation=false",
    "runtime_integration=false",
    "gas_sponsorship_performed=false",
    "public_presale_activation=false",
    "work_credit_write=false",
    "funds_movement=false",
    "next_action=RUN_READ_ONLY_DESIGNATED_HOST_PLAN",
):
    assert line in plan_lines, line

print("VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V1_PROOF_GREEN")
print("selection_blob_bound=true")
print("precision_hostname_bound=true")
print("precision_machine_id_bound=true")
print("operator_uid_bound=true")
print("nss_account_collision_check_required=true")
print("login_defs_system_range_bound=true")
print("highest_free_shared_uid_gid_required=true")
print("candidate_nss_resolution_rejected=true")
print("systemd_unit_collision_scan_required=true")
print("selected_storage_path_absence_required=true")
print("trusted_root_parent_ancestry_required=true")
print("repository_main_clean_expected_head_required=true")
print("process_environment_access=false")
print("external_network_calls=false")
print("host_mutation=false")
print("filesystem_mutation=false")
print("systemd_mutation=false")
print("runtime_account_creation_authorized=false")
print("storage_provisioning_authorized=false")
print("production_runtime_uid_gid_selected=false")
print("funds_movement=false")

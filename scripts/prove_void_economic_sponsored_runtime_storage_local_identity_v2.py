#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = (
    ROOT
    / "ops/precision/"
    / "void_economic_sponsored_runtime_storage_designated_host_plan_v2.py"
)
V1 = (
    ROOT
    / "ops/precision/"
    / "void_economic_sponsored_runtime_storage_designated_host_plan_v1.py"
)
SELECTION = (
    ROOT
    / "ops/mainnet0/"
    / "economic-sponsored-runtime-storage-production-selection-v1.json"
)

EXPECTED_V2_BLOB = "2cb05a9873de9e6bf359e025721867edce43684b"
EXPECTED_V1_BLOB = "90fbe18958d9d4a8f1739bcb22c4a9c8d611b108"
EXPECTED_SELECTION_BLOB = "2d609f5fdcd10be767ad5518bc3188dff45d1fea"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_V2_BLOB
assert git_blob(V1.read_bytes()) == EXPECTED_V1_BLOB
assert git_blob(SELECTION.read_bytes()) == EXPECTED_SELECTION_BLOB

spec = importlib.util.spec_from_file_location(
    "void_economic_sponsored_runtime_storage_designated_host_plan_v2",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V2"
)
assert module.PREDECESSOR_V1_GIT_BLOB_SHA1 == EXPECTED_V1_BLOB
assert module.SELECTION_GIT_BLOB_SHA1 == EXPECTED_SELECTION_BLOB
module.self_test()

source = TARGET.read_text(encoding="utf-8")
for forbidden in (
    "import pwd",
    "import grp",
    "from pwd",
    "from grp",
    "pwd.getpwnam",
    "pwd.getpwuid",
    "pwd.getpwall",
    "grp.getgrnam",
    "grp.getgrgid",
    "grp.getgrall",
):
    assert forbidden not in source, forbidden

for required in (
    'NSSWITCH = pathlib.Path("/etc/nsswitch.conf")',
    'PASSWD_FILE = pathlib.Path("/etc/passwd")',
    'GROUP_FILE = pathlib.Path("/etc/group")',
    'LOGIN_DEFS = pathlib.Path("/etc/login.defs")',
    'profile": "local_files_only_v2"',
    '"libc_nss_lookup_used": False',
    '"remote_nss_provider_allowed": False',
    '"identity_resolution_external_network_calls": False',
    '"predecessor_v1_live_run_accepted": False',
    "_revalidate_local_identity_authority(identity_authority)",
):
    assert required in source, required

assert source.index("_local_identity_authority()") < source.index(
    "_unit_collision_paths()"
)
assert source.index("_local_identity_authority()") < source.index(
    '"external_network_calls": False'
)
assert source.index("_revalidate_local_identity_authority(identity_authority)") < source.index(
    '"external_network_calls": False'
)

accepted_nss = """
passwd: files
group: files
hosts: files dns
"""
assert module.parse_nsswitch_local_files_only(accepted_nss) == {
    "passwd": ["files"],
    "group": ["files"],
}

for text, reason in (
    (
        "passwd: files systemd\ngroup: files\n",
        "nsswitch_identity_source_not_files_only:passwd",
    ),
    (
        "passwd: files sss\ngroup: files\n",
        "nsswitch_identity_source_not_files_only:passwd",
    ),
    (
        "passwd: files ldap\ngroup: files\n",
        "nsswitch_identity_source_not_files_only:passwd",
    ),
    (
        "passwd: nis\ngroup: files\n",
        "nsswitch_identity_source_not_files_only:passwd",
    ),
    (
        "passwd: compat\ngroup: files\n",
        "nsswitch_identity_source_not_files_only:passwd",
    ),
    (
        "passwd: files [SUCCESS=return]\ngroup: files\n",
        "nsswitch_identity_source_not_files_only:passwd",
    ),
    (
        "passwd: files\npasswd: files\ngroup: files\n",
        "nsswitch_duplicate_database:passwd",
    ),
    (
        "passwd: files\n",
        "nsswitch_identity_database_missing",
    ),
):
    try:
        module.parse_nsswitch_local_files_only(text)
    except module.PlanError as exc:
        assert str(exc) == reason, (str(exc), reason)
    else:
        raise AssertionError("remote/ambiguous NSS profile accepted: " + reason)

passwd_text = "\n".join(
    (
        "root:x:0:0:root:/root:/bin/bash",
        "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
        "zoso:x:1000:1000:ZoSo:/home/zoso:/bin/bash",
    )
) + "\n"
group_text = "\n".join(
    (
        "root:x:0:",
        "daemon:x:1:",
        "zoso:x:1000:",
    )
) + "\n"
login_defs_text = "\n".join(
    (
        "SYS_UID_MIN 100",
        "SYS_UID_MAX 999",
        "SYS_GID_MIN 100",
        "SYS_GID_MAX 999",
    )
) + "\n"

passwd_rows = module.parse_passwd_file(passwd_text)
group_rows = module.parse_group_file(group_text)
bounds = module.parse_login_defs(login_defs_text)
derived = module.derive_local_identity_plan(passwd_rows, group_rows, bounds)
assert derived["operator_name"] == "zoso"
assert derived["operator_uid"] == 1000
assert derived["operator_local_files_unique"] is True
assert derived["candidate_runtime_uid"] == 999
assert derived["candidate_runtime_gid"] == 999
assert derived["candidate_local_identity_namespace_free_verified"] is True

remote_names = ("systemd-network", "sssd", "ldap", "nis", "compat")
for name in remote_names:
    assert name not in {
        row["name"] for row in passwd_rows
    }, name

plan = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--source-plan"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    encoding="utf-8",
    errors="strict",
    timeout=10,
    check=False,
)
assert plan.returncode == 0, plan.stderr
assert plan.stderr == ""
for line in (
    "VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V2",
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "predecessor_v1_live_run_accepted=false",
    "identity_resolution_profile=local_files_only_v2",
    "nsswitch_passwd_group_files_only_required=true",
    "libc_nss_lookup_used=false",
    "remote_nss_provider_allowed=false",
    "production_runtime_uid_gid_selected=false",
    "runtime_account_creation_authorized=false",
    "storage_provisioning_authorized=false",
    "funds_movement=false",
):
    assert line in plan.stdout.splitlines(), line

held = subprocess.run(
    [sys.executable, "-I", "-B", str(TARGET), "--run"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    encoding="utf-8",
    errors="strict",
    timeout=10,
    check=False,
)
assert held.returncode == 2
assert held.stderr == ""
for line in (
    "status=HOLD",
    "reason=expected_head_required",
    "host_mutation=false",
    "filesystem_mutation=false",
    "systemd_mutation=false",
    "runtime_account_creation_authorized=false",
    "storage_provisioning_authorized=false",
    "public_presale_activation=false",
    "funds_movement=false",
):
    assert line in held.stdout.splitlines(), line

assert re.search(
    r'def _read_regular_direct\([\s\S]+?os\.O_NOFOLLOW',
    source,
)
assert "candidate_local_identity_namespace_free_verified" in source
assert "identity_authority_generation_changed:" in source

print("VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_LOCAL_IDENTITY_V2_PROOF_GREEN")
print("predecessor_v1_live_run_accepted=false")
print("libc_nss_lookup_used=false")
print("nsswitch_passwd_group_files_only_required=true")
print("remote_nss_provider_rejected=true")
print("identity_files_descriptor_bound=true")
print("identity_authority_generation_revalidated=true")
print("operator_identity_local_files_unique=true")
print("candidate_local_identity_namespace_free_verified=true")
print("identity_resolution_external_network_calls=false")
print("live_host_run_performed=false")
print("host_mutation=false")
print("filesystem_mutation=false")
print("systemd_mutation=false")
print("public_presale_activation=false")
print("funds_movement=false")

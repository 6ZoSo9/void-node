#!/usr/bin/env python3
from __future__ import annotations

import gzip
import hashlib
import importlib.util
import os
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_v7_fsverity_capability_census_v1.py"
TARGET_BLOB = "60a86dc3f8cbb73511de51f5e82209f78babb9f1"
MARKER = "VOID_BUY_VOID_V7_FSVERITY_CAPABILITY_CENSUS_V1_PROOF"


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


raw = TARGET.read_bytes()
assert git_blob_sha1(raw) == TARGET_BLOB

spec = importlib.util.spec_from_file_location("void_v7_fsverity_capability_census_v1", TARGET)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == "VOID_BUY_VOID_V7_FSVERITY_CAPABILITY_CENSUS_V1"
assert module.EXPECTED_HOSTNAME == "zoso-Precision-Tower-7810"
assert str(module.TARGET) == "/opt"
assert module.EXT4_FEATURE_RO_COMPAT_VERITY == 0x8000
assert module.EXT4_FEATURE_INCOMPAT_EXTENTS == 0x0040
assert module.EXT4_SUPER_MAGIC == 0xEF53
assert module.SUPPORTED_FS_TYPES == frozenset({"ext4", "f2fs", "btrfs"})

source = raw.decode("utf-8")
for required in (
    'MARKER = "VOID_BUY_VOID_V7_FSVERITY_CAPABILITY_CENSUS_V1"',
    'EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"',
    'TARGET = pathlib.Path("/opt")',
    'EXT4_FEATURE_RO_COMPAT_VERITY = 0x8000',
    'EXT4_FEATURE_INCOMPAT_EXTENTS = 0x0040',
    'EXT4_SUPER_MAGIC = 0xEF53',
    'def _parse_mountinfo(',
    'def _canonical_target(',
    'target_symlink_forbidden',
    'target_path_alias_forbidden',
    'target_generation_changed',
    'target_path_generation_changed',
    'target_mount_device_mismatch',
    'target_mount_selection_ambiguous',
    'def _mount_for_target(',
    'def _kernel_config_value(',
    'def _gzip_decompress_bounded(',
    'stream.read(maximum + 1)',
    'kernel_config_uncompressed_limit',
    'kernel_config_decompression_invalid',
    'kernel_config_decompression_memory_error',
    'def _parse_major_minor(',
    'mount_source_device_number_mismatch',
    'ext4_opened_device_number_mismatch',
    'def _classify_ext4_dax_policy(',
    'ext4_dax_inode_policy_unproven',
    'dax_admission_requires_explicit_never=true',
    'def _read_ext4_superblock(',
    'os.pread(fd, EXT4_SUPERBLOCK_BYTES, EXT4_SUPERBLOCK_OFFSET)',
    'os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK',
    'root_execution_forbidden_for_untrusted_checkout_census',
    'host_fsverity_capability_green',
    'target_generation_stable',
    'mount_generation_stable',
    'target_mount_generation_changed',
    'ext4_verity_feature_enabled',
    'ext4_extents_feature_enabled',
    'permission_denied_read',
    'feature_probe_error',
    'HOLD_PRIVILEGED_FEATURE_PROBE_REQUIRES_TRUSTED_FIRST_INSTRUCTION',
    'block_device_write=false',
    'fsverity_enablement=false',
    'protected_host_install=false',
    'protected_v4_apply=false',
    'next_action=RUN_UNPRIVILEGED_READ_ONLY_FSVERITY_CAPABILITY_CENSUS_ON_PRECISION',
):
    assert required in source, required

for forbidden in (
    "import subprocess",
    "from subprocess",
    "subprocess.",
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.write(",
    "mkdir(",
    "makedirs(",
    "chmod(",
    "chown(",
    "unlink(",
    "rename(",
    "replace(",
    "mount(",
    "umount(",
    "fcntl.ioctl",
    "FS_IOC_ENABLE_VERITY",
    "tune2fs",
    "fsverity enable",
):
    assert forbidden not in source, forbidden

mountinfo = (
    "36 25 8:2 / / rw,relatime shared:1 - ext4 /dev/sda2 rw,errors=remount-ro\n"
    "40 36 8:3 / /opt rw,nosuid,nodev - ext4 /dev/sda3 rw\n"
)
rows = module._parse_mountinfo(mountinfo)
selected = module._mount_for_target(
    rows, pathlib.Path("/opt/void-test"), os.makedev(8, 3)
)
assert selected["mount_point"] == "/opt"
assert selected["fstype"] == "ext4"
assert selected["source"] == "/dev/sda3"
assert module._parse_major_minor(selected["major_minor"]) == (8, 3)

stacked = module._parse_mountinfo(
    "36 25 8:2 / / rw - ext4 /dev/sda2 rw\n"
    "40 36 8:3 / /opt rw - ext4 /dev/sda3 rw\n"
    "41 36 0:42 / /opt rw - tmpfs tmpfs rw\n"
)
visible = module._mount_for_target(
    stacked, pathlib.Path("/opt/void-test"), os.makedev(0, 42)
)
assert visible["mount_id"] == "41"
assert visible["fstype"] == "tmpfs"

ambiguous_mounts = module._parse_mountinfo(
    "36 25 8:2 / / rw - ext4 /dev/sda2 rw\n"
    "40 36 8:3 / /opt rw - ext4 /dev/sda3 rw\n"
    "41 36 8:3 / /opt rw - ext4 /dev/sda3 rw\n"
)
try:
    module._mount_for_target(
        ambiguous_mounts, pathlib.Path("/opt/void-test"), os.makedev(8, 3)
    )
except module.CensusError as exc:
    assert str(exc) == "target_mount_selection_ambiguous", str(exc)
else:
    raise AssertionError("ambiguous_stacked_mount_not_rejected")

with tempfile.TemporaryDirectory(prefix="void-v7-fsverity-target-") as td:
    td_path = pathlib.Path(td)
    real = td_path / "real"
    real.mkdir()
    link = td_path / "link"
    os.symlink(real, link, target_is_directory=True)
    try:
        module._canonical_target(link)
    except module.CensusError as exc:
        assert str(exc) == "target_symlink_forbidden", str(exc)
    else:
        raise AssertionError("target_symlink_not_rejected")

try:
    module._parse_major_minor("8")
except module.CensusError:
    pass
else:
    raise AssertionError("invalid_major_minor_not_rejected")

escaped = module._parse_mountinfo(
    "1 0 8:1 / / rw - ext4 /dev/root rw\n"
    "2 1 8:2 / /opt\\040space rw - ext4 /dev/sdb rw\n"
)
assert escaped[1]["mount_point"] == "/opt space"

default_dax = module._classify_ext4_dax_policy((), ())
assert default_dax["policy"] == "inode"
assert default_dax["policy_source"] == "default"
assert default_dax["disabled_proven"] is False
never_dax = module._classify_ext4_dax_policy(("dax=never",), ())
assert never_dax["policy"] == "never"
assert never_dax["disabled_proven"] is True
assert module._classify_ext4_dax_policy(("dax",), ())["policy"] == "always"
assert module._classify_ext4_dax_policy(("dax=always",), ())["policy"] == "always"
assert module._classify_ext4_dax_policy(("dax=inode",), ())["disabled_proven"] is False
assert module._classify_ext4_dax_policy(
    ("dax=never",), ("dax=always",)
)["policy"] == "ambiguous"
assert module._classify_ext4_dax_policy(("dax=future",), ())["policy"] == "unknown"

good = module._parse_ext4_superblock_bytes(
    module._synthetic_ext4_superblock(verity=True, extents=True)
)
assert good == {
    "magic_valid": True,
    "block_size": 4096,
    "extents_enabled": True,
    "verity_feature_enabled": True,
}

no_verity = module._parse_ext4_superblock_bytes(
    module._synthetic_ext4_superblock(verity=False, extents=True)
)
assert no_verity["magic_valid"] is True
assert no_verity["extents_enabled"] is True
assert no_verity["verity_feature_enabled"] is False

no_extents = module._parse_ext4_superblock_bytes(
    module._synthetic_ext4_superblock(verity=True, extents=False)
)
assert no_extents["magic_valid"] is True
assert no_extents["verity_feature_enabled"] is True
assert no_extents["extents_enabled"] is False

compressed_limit_adversary = gzip.compress(
    b"A" * (module.MAX_CONFIG_BYTES + 1),
    compresslevel=9,
)
assert len(compressed_limit_adversary) < module.MAX_CONFIG_BYTES
try:
    module._gzip_decompress_bounded(
        compressed_limit_adversary, module.MAX_CONFIG_BYTES
    )
except module.CensusError as exc:
    assert str(exc) == "kernel_config_uncompressed_limit", str(exc)
else:
    raise AssertionError("high_ratio_gzip_expansion_not_rejected")

malformed_deflate = (
    b"\x1f\x8b\x08\x00\x00\x00\x00\x00\x00\xff"
    + b"\x07"
    + b"\x00" * 8
)
try:
    module._gzip_decompress_bounded(
        malformed_deflate, module.MAX_CONFIG_BYTES
    )
except module.CensusError as exc:
    assert str(exc) == "kernel_config_decompression_invalid", str(exc)
else:
    raise AssertionError("malformed_deflate_not_normalized_to_hold")

assert module._kernel_config_value("CONFIG_FS_VERITY=y\n", "CONFIG_FS_VERITY") == "y"
assert module._kernel_config_value("CONFIG_FS_VERITY=m\n", "CONFIG_FS_VERITY") == "m"
assert module._kernel_config_value("# CONFIG_FS_VERITY is not set\n", "CONFIG_FS_VERITY") == "n"
assert module._kernel_config_value(None, "CONFIG_FS_VERITY") == "unknown"

self_test = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
    env={
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
    },
)
assert self_test.returncode == 0, self_test.stderr
assert self_test.stderr == "", self_test.stderr
self_lines = set(self_test.stdout.splitlines())
for required in (
    "VOID_BUY_VOID_V7_FSVERITY_CAPABILITY_CENSUS_V1_SELF_TEST_GREEN",
    "target_canonical_path_required=true",
    "terminal_target_generation_revalidation_required=true",
    "target_mount_st_dev_binding_required=true",
    "stacked_mount_ambiguity_rejected=true",
    "mountinfo_longest_prefix_selection_proven=true",
    "mountinfo_escape_decoding_proven=true",
    "mountinfo_device_number_binding_required=true",
    "terminal_mountinfo_revalidation_required=true",
    "ext4_superblock_magic_bound=true",
    "ext4_verity_ro_compat_bit_bound=true",
    "ext4_extents_incompat_bit_bound=true",
    "kernel_config_fsverity_parser_bound=true",
    "ext4_dax_policy_fail_closed=true",
    "kernel_config_gzip_output_bounded=true",
    "kernel_config_malformed_deflate_hold=true",
    "external_subprocess=false",
    "ioctl_invocation=false",
    "read_only=true",
    "filesystem_write=false",
    "block_device_write=false",
    "fsverity_enablement=false",
    "protected_host_install=false",
    "protected_v4_apply=false",
    "funds_movement=false",
):
    assert required in self_lines, required

plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    timeout=30,
    check=False,
    env={
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
    },
)
assert plan.returncode == 0, plan.stderr
assert plan.stderr == "", plan.stderr
plan_lines = set(plan.stdout.splitlines())
for required in (
    "VOID_BUY_VOID_V7_FSVERITY_CAPABILITY_CENSUS_V1",
    "mode=--plan",
    "read_only=true",
    "filesystem_write=false",
    "sudo_required=false",
    "root_execution_forbidden=true",
    "target_canonical_path_required=true",
    "terminal_target_generation_revalidation_required=true",
    "external_subprocess=false",
    "ioctl_invocation=false",
    "ext4_superblock_read_only_feature_probe=true",
    "dax_admission_requires_explicit_never=true",
    "fsverity_enablement=false",
    "protected_host_install=false",
    "protected_v4_apply=false",
    "next_action=RUN_UNPRIVILEGED_READ_ONLY_FSVERITY_CAPABILITY_CENSUS_ON_PRECISION",
):
    assert required in plan_lines, required

print(MARKER + "_GREEN")
print("target_blob=" + TARGET_BLOB)
print("designated_precision_host_bound=true")
print("unprivileged_read_only_feature_probe_bound=true")
print("root_execution_forbidden=true")
print("target_symlink_adversary_rejected=true")
print("target_canonical_path_required=true")
print("terminal_target_generation_revalidation_required=true")
print("target_mount_st_dev_binding_required=true")
print("stacked_mount_ambiguity_rejected=true")
print("mountinfo_descriptor_read_only_bound=true")
print("kernel_config_fsverity_observation_bound=true")
print("kernel_config_gzip_output_bounded=true")
print("high_ratio_gzip_expansion_rejected=true")
print("malformed_deflate_normalized_to_hold=true")
print("ext4_superblock_magic_bound=true")
print("ext4_verity_ro_compat_bit_bound=true")
print("ext4_extents_incompat_bit_bound=true")
print("ext4_dax_policy_fail_closed=true")
print("dax_never_required_for_green=true")
print("no_external_subprocess=true")
print("no_ioctl_invocation=true")
print("no_fsverity_enablement=true")
print("no_filesystem_write=true")
print("no_mount_mutation=true")
print("no_protected_host_install=true")
print("no_protected_v4_apply=true")
print("no_service_mutation=true")
print("no_credential_access=true")
print("no_signing=true")
print("no_payment_activation=true")
print("no_funds_movement=true")

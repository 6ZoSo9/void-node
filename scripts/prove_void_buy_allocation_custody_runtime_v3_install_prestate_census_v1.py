#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_install_prestate_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "e32ebd94ad09cd80e03489079e74657aab159d7a"

def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()

assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_install_prestate_census_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALL_PRESTATE_CENSUS_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_install_prestate_census_v1"
)
assert module.VERSION == 1
assert module.ARCHIVE_LOCK_REL == (
    "ops/security/"
    "buy-void-allocation-custody-runtime-install-archive-lock-v3.json"
)
assert module.ARCHIVE_LOCK_GIT_BLOB == (
    "edb4ea2b833373ab387762e45ba7da4032c860f3"
)
assert module.ARCHIVE_LOCK_SHA256 == (
    "ab96f16d93895b42c977fd26aef2c008115580e3ce31927275ed92986c86f8e7"
)
assert module.ARCHIVE_ID == (
    "voidbuycustodyarchive3_"
    "0b1c997cb4649be6b6eaf161712230ad3ee1a0b69720133d3adc4875bae322cb"
)
assert module.ARCHIVE_BYTES == 266240
assert module.ARCHIVE_SHA256 == (
    "5c77db938bcfd353e72628088f1e02c4b22d73814cbae555b9c13ce3ba3a95d1"
)
assert module.INSTALL_PARENT == Path("/opt")
assert module.TARGET == Path("/opt/void-buy-allocation-custody-runtime-v1")
assert module.MAX_TREE_ENTRIES == 32768
assert module.MAX_FILE_BYTES == 64 * 1024 * 1024
assert module.MAX_TOTAL_REGULAR_BYTES == 512 * 1024 * 1024

lock = module.verify_archive_lock()
assert lock["archive_candidate_accepted"] is True
for key in (
    "immutable_root_install",
    "install_target_selected",
    "existing_target_replaced",
    "node_binary_identity_verified",
    "service_unit_installed",
    "service_started",
    "service_restarted",
    "runtime_integration",
    "reserve_method_enabled",
    "recover_method_enabled",
    "payment_acceptance",
    "public_presale_activation",
    "production_gate_ready",
    "funds_movement",
):
    assert lock[key] is False, key

# Successful production JSON must carry the same production-scoped authority
# keys documented and emitted by HOLD/self-test paths. Exercise this without
# touching /opt by replacing the two host-observation helpers in memory only.
_original_verify_archive_lock = module.verify_archive_lock
_original_collect_prestate = module.collect_prestate
try:
    module.verify_archive_lock = lambda: {"archive_candidate_accepted": True}
    module.collect_prestate = lambda *args, **kwargs: {"synthetic": True}
    receipt = module.census()
    assert receipt["read_only"] is True
    assert receipt["filesystem_explicit_write"] is False
    assert receipt["filesystem_write_free"] is False
    assert receipt["atime_write_possible"] is True
    assert receipt["production_census_read_only"] is True
    assert receipt["production_census_explicit_filesystem_write"] is False
    assert receipt["production_census_filesystem_write_free"] is False
    assert receipt["production_census_atime_write_possible"] is True
finally:
    module.verify_archive_lock = _original_verify_archive_lock
    module.collect_prestate = _original_collect_prestate

with tempfile.TemporaryDirectory(
    prefix="void-custody-v3-prestate-proof-"
) as tmp:
    parent = Path(tmp) / "opt"
    parent.mkdir(mode=0o700)

    absent = module.collect_prestate(
        parent,
        module.TARGET_NAME,
        module.PROPOSED_STAGE_NAME,
        module.PROPOSED_ROLLBACK_NAME,
        require_root_owned_parent=False,
    )
    assert absent["target"]["state"] == "ABSENT"
    assert absent["create_only_install_candidate"] is True
    assert absent["rollback_rename_candidate"] is False
    assert absent["same_filesystem_rename_candidate"] is False

    target = parent / module.TARGET_NAME
    target.mkdir(mode=0o700)
    (target / "one").write_bytes(b"one\n")
    nested = target / "nested"
    nested.mkdir(mode=0o700)
    (nested / "two").write_bytes(b"two\n")

    present = module.collect_prestate(
        parent,
        module.TARGET_NAME,
        module.PROPOSED_STAGE_NAME,
        module.PROPOSED_ROLLBACK_NAME,
        require_root_owned_parent=False,
    )
    assert present["target"]["state"] == "PRESENT_SCANNED"
    assert present["target"]["replacement_required"] is True
    assert present["target"]["tree"]["regular_files"] == 2
    assert present["target"]["tree"]["directories"] == 1
    assert present["target"]["tree"]["regular_bytes"] == 8
    assert len(
        present["target"]["tree"]["metadata_sha256"]
    ) == 64
    assert present["same_filesystem_rename_candidate"] is True
    assert present["parent"]["mount_id"] == present["target"]["root"]["mount_id"]
    assert present["rollback_rename_candidate"] is True
    assert present["create_only_install_candidate"] is False

    link = target / "opaque-link"
    link.symlink_to("../credential-token-DO-NOT-READ")
    linked = module.collect_prestate(
        parent,
        module.TARGET_NAME,
        module.PROPOSED_STAGE_NAME,
        module.PROPOSED_ROLLBACK_NAME,
        require_root_owned_parent=False,
    )
    assert linked["target"]["tree"]["symlinks"] == 1
    link.unlink()

    fifo = target / "secret-token\nforged_authority=true"
    os.mkfifo(fifo, 0o600)
    try:
        module.collect_prestate(
            parent,
            module.TARGET_NAME,
            module.PROPOSED_STAGE_NAME,
            module.PROPOSED_ROLLBACK_NAME,
            require_root_owned_parent=False,
        )
    except module.CensusHold as exc:
        reason = str(exc)
        assert reason == (
            "custody_runtime_v3_install_prestate_"
            "target_tree_special_file_forbidden"
        )
        assert "secret-token" not in reason
        assert "\n" not in reason
    else:
        raise AssertionError("FIFO target entry was accepted")
    fifo.unlink()

    # Exercise pre-sort enumeration enforcement without creating tens of
    # thousands of CI fixtures. Production constants are asserted above.
    overflow = target / "overflow"
    overflow.mkdir(mode=0o700)
    saved_tree_limit = module.MAX_TREE_ENTRIES
    module.MAX_TREE_ENTRIES = 8
    try:
        for index in range(9):
            (overflow / f"entry-{index:05d}").touch()
        try:
            module.collect_prestate(
                parent,
                module.TARGET_NAME,
                module.PROPOSED_STAGE_NAME,
                module.PROPOSED_ROLLBACK_NAME,
                require_root_owned_parent=False,
            )
        except module.CensusHold as exc:
            assert "target_tree_entry_limit_exceeded" in str(exc)
        else:
            raise AssertionError("oversized directory enumerated past entry budget")
    finally:
        module.MAX_TREE_ENTRIES = saved_tree_limit
        for child in overflow.iterdir():
            child.unlink()
        overflow.rmdir()

    # MAX_FILE_BYTES is metadata-only: prove the bound with a sparse file
    # without reading or allocating its declared body.
    oversized_file = target / "oversized-metadata-only.bin"
    with oversized_file.open("wb") as stream:
        stream.truncate(module.MAX_FILE_BYTES + 1)
    try:
        module.collect_prestate(
            parent,
            module.TARGET_NAME,
            module.PROPOSED_STAGE_NAME,
            module.PROPOSED_ROLLBACK_NAME,
            require_root_owned_parent=False,
        )
    except module.CensusHold as exc:
        assert "target_file_size_out_of_bounds" in str(exc)
    else:
        raise AssertionError("oversized regular-file metadata limit not enforced")
    oversized_file.unlink()

    rollback = parent / module.PROPOSED_ROLLBACK_NAME
    rollback.mkdir(mode=0o700)
    collision = module.collect_prestate(
        parent,
        module.TARGET_NAME,
        module.PROPOSED_STAGE_NAME,
        module.PROPOSED_ROLLBACK_NAME,
        require_root_owned_parent=False,
    )
    assert collision["proposed_rollback"]["present"] is True
    assert collision["rollback_rename_candidate"] is False

module.self_test()

without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--self-test"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=10,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2, without_b
assert (
    "reason=python_isolated_unoptimized_nobytecode_mode_required"
    in without_b.stdout
), without_b.stdout
assert "production_census_explicit_filesystem_write=false" in without_b.stdout
assert "production_census_filesystem_write_free=false" in without_b.stdout
assert "production_census_atime_write_possible=true" in without_b.stdout
assert "self_test_temporary_filesystem_write=false" in without_b.stdout

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for required in (
    "_fd_mount_id",
    "open_bound_directory",
    "read_bound_regular",
    "scan_target_at",
    "os.scandir(fd)",
    "_observe_symlink_at",
    "_observe_regular_at",
    "metadata_sha256",
    "target_tree_cross_device_entry_forbidden",
    "target_tree_cross_mount_directory_forbidden",
    "target_tree_cross_mount_file_forbidden",
    "rollback_rename_candidate",
    "create_only_install_candidate",
    "request_history_read",
    "custody_data_read",
    "process_environment_read",
    "process_arguments_read",
    "service_state_checked",
    "install_target_selected",
    "existing_target_replaced",
    "runtime_integration",
    "payment_acceptance",
    "public_presale_activation",
    "funds_movement",
):
    assert required in source, required

for forbidden in (
    "os.readlink(",
    "subprocess",
    "systemctl",
    "sudo ",
    "os.write(",
    "os.pwrite(",
    "os.chown(",
    "os.fchown(",
    "os.chmod(",
    "os.fchmod(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "shutil",
    "tarfile",
):
    assert forbidden not in pre_self_test, forbidden

assert "O_NOFOLLOW" in pre_self_test
assert "O_NONBLOCK" in pre_self_test
assert "follow_symlinks=False" in pre_self_test
assert "link_target_bytes" not in pre_self_test
assert "link_target_sha256" not in pre_self_test

scan_source = pre_self_test.split("def _scan_dir(", 1)[1].split(
    "def scan_target_at(", 1
)[0]
assert "with os.scandir(fd) as iterator:" in scan_source
assert "names: list[str]" not in scan_source
assert "names.sort()" not in scan_source
assert scan_source.index('totals["entries"] += 1') < scan_source.index("_scan_dir(")
for leaked in (
    '"target_tree_cross_device_entry_forbidden:" + relative',
    '"target_directory_rebound:" + relative',
    '"target_directory_generation_changed:"',
    '"target_tree_special_file_forbidden:" + relative',
    '"target_directory_changed_during_scan:" + relative_prefix',
):
    assert leaked not in scan_source, leaked

regular_observer = pre_self_test.split("def _observe_regular_at(", 1)[1].split(
    "def _scan_dir(", 1
)[0]
assert "os.read(" not in regular_observer
assert "hashlib.sha256" not in regular_observer
assert "Legacy runtime files are intentionally content-blind" in regular_observer

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALL_PRESTATE_CENSUS_V1_PROOF_GREEN")
print("archive_lock_exact=true")
print("descriptor_bound_tree_scan=true")
print("target_tree_metadata_digest=true")
print("legacy_regular_file_content_read=false")
print("nested_mount_rejection_bound=true")
print("mount_id_boundary_bound=true")
print("symlink_target_content_read=false")
print("hold_reason_untrusted_entry_names_redacted=true")
print("absent_target_create_only_candidate_proven=true")
print("present_target_rollback_candidate_proven=true")
print("special_file_rejection=true")
print("collision_fail_closed=true")
print("entry_budget_enforced_before_sort=true")
print("streaming_tree_enumeration_global_budget=true")
print("exact_source_blob_asserted=true")
print("host_census_not_executed_in_ci=true")
print("production_census_read_only=true")
print("production_receipt_scoped_authority_keys=true")
print("python_no_bytecode_mode_required=true")
print("without_dash_b_bootstrap_hold=true")
print("production_census_explicit_filesystem_write=false")
print("production_census_filesystem_write_free=false")
print("production_census_atime_write_possible=true")
print("test_fixture_filesystem_write=true")
print("legacy_tree_entry_limit=32768")
print("legacy_file_metadata_size_limit=67108864")
print("legacy_total_regular_bytes_limit=536870912")
print("archive_extraction=false")
print("service_state_checked=false")
print("service_mutation=false")
print("request_history_read=false")
print("custody_data_read=false")
print("credential_access=false")
print("wallet_or_signer_access=false")
print("install_target_selected=false")
print("existing_target_replaced=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")

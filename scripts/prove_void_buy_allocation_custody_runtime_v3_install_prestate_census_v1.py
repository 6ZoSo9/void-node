#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import stat
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
    "void_buy_allocation_custody_runtime_v3_install_prestate_census_v1.py"
)
EXPECTED_SOURCE_BLOB = "ccaa7ffc6b82c7cca3d6bea1268dc72ea25d28ca"

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
        present["target"]["tree"]["content_metadata_sha256"]
    ) == 64
    assert present["same_filesystem_rename_candidate"] is True
    assert present["rollback_rename_candidate"] is True
    assert present["create_only_install_candidate"] is False

    link = target / "opaque-link"
    link.symlink_to("../outside-do-not-follow")
    linked = module.collect_prestate(
        parent,
        module.TARGET_NAME,
        module.PROPOSED_STAGE_NAME,
        module.PROPOSED_ROLLBACK_NAME,
        require_root_owned_parent=False,
    )
    assert linked["target"]["tree"]["symlinks"] == 1
    link.unlink()

    fifo = target / "bad-fifo"
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
        assert "target_tree_special_file_forbidden" in str(exc)
    else:
        raise AssertionError("FIFO target entry was accepted")
    fifo.unlink()

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

source = TARGET.read_text(encoding="utf-8")
pre_self_test = source.split("def self_test()", 1)[0]

for required in (
    "open_bound_directory",
    "read_bound_regular",
    "scan_target_at",
    "_hash_symlink_at",
    "content_metadata_sha256",
    "target_tree_cross_device_entry_forbidden",
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

print("VOID_BUY_VOID_CUSTODY_RUNTIME_V3_INSTALL_PRESTATE_CENSUS_V1_PROOF_GREEN")
print("archive_lock_exact=true")
print("descriptor_bound_tree_scan=true")
print("target_tree_content_metadata_digest=true")
print("nested_mount_rejection_bound=true")
print("symlink_opaque_identity_bound=true")
print("absent_target_create_only_candidate_proven=true")
print("present_target_rollback_candidate_proven=true")
print("special_file_rejection=true")
print("collision_fail_closed=true")
print("host_census_not_executed_in_ci=true")
print("read_only=true")
print("filesystem_write=false")
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

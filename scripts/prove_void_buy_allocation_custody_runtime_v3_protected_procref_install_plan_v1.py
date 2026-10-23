#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
      "void_buy_allocation_custody_runtime_v3_protected_procref_install_plan_v1.py"
)
EXPECTED_SOURCE_BLOB = "ddbc7d99e5c08fbd51332541316b1d24c3fbcc6c"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


raw = TARGET.read_bytes()
assert git_blob(raw) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_protected_procref_install_plan_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_PROCREF_INSTALL_PLAN_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_protected_procref_install_plan_v1"
)
assert module.LOCK_BLOB == "3eacfe0dec5144ba8c1e4c743bf3e8025f58f88a"
assert module.LOCK_PARENT_HEAD == (
    "e709726c6a7d2af1e61956fa2e60f6fb0904c653"
)
assert module.SOURCE_BLOB == "0567991abb05c121722d47485ab9e7410b8b8126"
assert module.SOURCE_BYTES == 31062
assert module.SOURCE_SHA256 == (
    "c9de40bc6b6b25ded246a06d04560326541fdeee5a815a12f8fc40922226d90c"
)
assert module.INSTALL_ROOT == Path(
    "/opt/void-buy-allocation-custody-procref-v1"
)
assert module.STAGE_ROOT == Path(
    "/opt/.void-buy-allocation-custody-procref-v1.stage-v1"
)
assert module.STAGE_BUILD_MODE == "0700"
assert module.FINAL_ROOT_MODE == "0755"
assert module.FINAL_SOURCE_MODE == "0444"

verified = module.verify_lock_and_source()
assert verified["source_bytes"] == module.SOURCE_BYTES
assert verified["source_sha256"] == module.SOURCE_SHA256
assert verified["lock"]["candidate_source_accepted"] is True
assert verified["lock"]["protected_install_authorized"] is False
assert verified["lock"]["protected_source_installed"] is False
assert verified["lock"]["live_privileged_census_authorized"] is False
assert verified["lock"]["replacement_apply_authorized"] is False

module.self_test()

absent_install = {"path": str(module.INSTALL_ROOT), "state": "absent"}
absent_stage = {"path": str(module.STAGE_ROOT), "state": "absent"}
present_install = {
    "path": str(module.INSTALL_ROOT),
    "state": "present",
    "kind": "directory",
    "uid": 0,
    "gid": 0,
    "mode": "0755",
    "dev": 1,
    "ino": 2,
}
present_stage = {
    "path": str(module.STAGE_ROOT),
    "state": "present",
    "kind": "directory",
    "uid": 0,
    "gid": 0,
    "mode": "0700",
    "dev": 1,
    "ino": 3,
}

clean = module.classify_prestate(absent_install, absent_stage)
assert clean == {
    "install_root_absent_observed": True,
    "stage_root_absent_observed": True,
    "create_only_prestate_candidate": True,
    "protected_install_ready": False,
    "protected_install_authorized": False,
}
assert module.classify_prestate(
    present_install,
    absent_stage,
)["create_only_prestate_candidate"] is False
assert module.classify_prestate(
    absent_install,
    present_stage,
)["create_only_prestate_candidate"] is False

source = raw.decode("utf-8")
production = source.split("def self_test()", 1)[0]

for forbidden in (
    "subprocess",
    "shutil",
    "tarfile",
    "tempfile",
    "os.mkdir(",
    "os.makedirs(",
    "os.write(",
    "os.pwrite(",
    "os.rename(",
    "os.replace(",
    "os.unlink(",
    "os.remove(",
    "os.chmod(",
    "os.chown(",
    "os.fchmod(",
    "os.fchown(",
    "os.fsync(",
    "sudo ",
):
    assert forbidden not in production, forbidden

assert 'group.add_argument("--self-test"' in source
assert 'group.add_argument("--plan"' in source
assert '"--apply"' not in source
assert "apply(preexec" not in source
assert "def apply(" not in source

for required in (
    '"apply_implemented": False',
    '"separate_explicit_authorization_required": True',
    '"private_stage_create_only_required": True',
    '"stage_root_mode_0700_during_build_required": True',
    '"source_leaf_create_only_nofollow_required": True',
    '"source_leaf_root_root_0444_required": True',
    '"source_leaf_single_link_required": True',
    '"source_leaf_fsync_required": True',
    '"source_leaf_exact_sha256_reverification_required": True',
    '"stage_directory_fsync_required": True',
    '"stage_final_mode_0755_required": True',
    '"renameat2_noreplace_publication_required": True',
    '"opt_directory_fsync_after_publication_required": True',
    '"final_tree_exact_reverification_required": True',
    '"post_publication_automatic_cleanup_forbidden": True',
    '"service_mutation_forbidden": True',
    '"legacy_runtime_target_mutation_forbidden": True',
    '"filesystem_write": False',
    '"apply_available": False',
    '"protected_install_authorized": False',
    '"protected_install_performed": False',
    '"live_privileged_census_authorized": False',
    '"live_privileged_census_executed": False',
    '"legacy_runtime_target_mutation": False',
    '"existing_target_replaced": False',
    '"replacement_apply_authorized": False',
    '"runtime_integration": False',
    '"payment_acceptance": False',
    '"public_presale_activation": False',
    '"funds_movement": False',
):
    assert required in source, required

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_PROCREF_INSTALL_PLAN_V1_PROOF_GREEN"
)
print("exact_source_blob_asserted=true")
print("accepted_lock_exact=true")
print("candidate_source_git_blob_exact=true")
print("candidate_source_sha256_exact=true")
print("candidate_source_bytes_exact=true")
print("create_only_prestate_positive_tested=true")
print("existing_install_root_rejected=true")
print("existing_stage_root_rejected=true")
print("production_mutation_primitives_absent=true")
print("apply_cli_absent=true")
print("apply_implemented=false")
print("apply_available=false")
print("read_only=true")
print("filesystem_write=false")
print("protected_install_authorized=false")
print("protected_install_performed=false")
print("live_privileged_census_authorized=false")
print("live_privileged_census_executed=false")
print("legacy_runtime_target_mutation=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")

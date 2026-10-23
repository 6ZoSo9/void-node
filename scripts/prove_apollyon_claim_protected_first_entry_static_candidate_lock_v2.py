#!/usr/bin/env python3
from __future__ import annotations

import copy
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
LOCK_PATH = (
    ROOT
    / "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_lock_v2.py"
)

spec = importlib.util.spec_from_file_location("apollyon_static_lock_v2", LOCK_PATH)
assert spec is not None and spec.loader is not None
lockmod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = lockmod
spec.loader.exec_module(lockmod)


def readdress(row: dict) -> dict:
    value = copy.deepcopy(row)
    value.pop("lock_id", None)
    value["lock_id"] = (
        lockmod.LOCK_ID_PREFIX
        + lockmod.sha256(lockmod.canonical(value))
    )
    return value


def expect_hold(row: dict, reason: str) -> None:
    try:
        lockmod.validate_lock(row)
    except lockmod.LockError as exc:
        assert str(exc) == reason, (str(exc), reason)
    else:
        raise AssertionError("expected HOLD:" + reason)


lock = lockmod.derive_lock()
lockmod.validate_lock(lock)

assert lock["marker"] == lockmod.MARKER
assert lock["version"] == 2
assert lock["parent_candidate"]["head"] == lockmod.PARENT_HEAD
assert lock["parent_candidate"]["candidate_id"] == lockmod.EXPECTED_CANDIDATE_ID
assert (
    lock["parent_candidate"]["candidate_json_sha256"]
    == lockmod.EXPECTED_CANDIDATE_JSON_SHA256
)
assert (
    lock["parent_candidate"]["hosted_artifact_archive_sha256"]
    == lockmod.HOSTED_ARTIFACT_ARCHIVE_SHA256
)
assert lock["binary"]["bytes"] == 808472
assert lock["binary"]["sha256"] == lockmod.EXPECTED_BINARY_SHA256
assert lock["binary"]["git_blob_sha1"] == lockmod.EXPECTED_BINARY_GIT_BLOB_SHA1
assert lock["authority"]["candidate_accepted"] is True
assert lock["authority"]["binary_identity_accepted"] is True
assert lock["authority"]["protected_install_authorized"] is False
assert lock["authority"]["training_execution_authorized"] is False
assert lock["authority"]["funds_movement"] is False

round_trip = __import__("json").loads(lockmod.canonical(lock).decode("ascii"))
lockmod.validate_lock(round_trip)
assert round_trip == lock

extra = copy.deepcopy(lock)
extra["unexpected"] = True
expect_hold(readdress(extra), "candidate_lock_keys_invalid")

candidate_drift = copy.deepcopy(lock)
candidate_drift["parent_candidate"]["candidate_id"] = (
    "apollyon_claim_protected_first_entry_static_candidate_v2:"
    + "0" * 64
)
expect_hold(readdress(candidate_drift), "candidate_lock_parent_identity_invalid")

json_drift = copy.deepcopy(lock)
json_drift["parent_candidate"]["candidate_json_sha256"] = "0" * 64
expect_hold(readdress(json_drift), "candidate_lock_parent_identity_invalid")

artifact_drift = copy.deepcopy(lock)
artifact_drift["parent_candidate"]["hosted_artifact_archive_sha256"] = "0" * 64
expect_hold(readdress(artifact_drift), "candidate_lock_parent_identity_invalid")

run_drift = copy.deepcopy(lock)
run_drift["parent_candidate"]["hosted_run_id"] += 1
expect_hold(readdress(run_drift), "candidate_lock_parent_identity_invalid")

binary_drift = copy.deepcopy(lock)
binary_drift["binary"]["sha256"] = "0" * 64
expect_hold(readdress(binary_drift), "candidate_lock_binary_identity_invalid")

binary_extra = copy.deepcopy(lock)
binary_extra["binary"]["unexpected"] = False
expect_hold(readdress(binary_extra), "candidate_lock_binary_identity_invalid")

install_overclaim = copy.deepcopy(lock)
install_overclaim["authority"]["protected_install_authorized"] = True
expect_hold(readdress(install_overclaim), "candidate_lock_authority_invalid")

training_overclaim = copy.deepcopy(lock)
training_overclaim["authority"]["training_execution_authorized"] = True
expect_hold(readdress(training_overclaim), "candidate_lock_authority_invalid")

funds_overclaim = copy.deepcopy(lock)
funds_overclaim["authority"]["funds_movement"] = True
expect_hold(readdress(funds_overclaim), "candidate_lock_authority_invalid")

acceptance_rollback = copy.deepcopy(lock)
acceptance_rollback["authority"]["candidate_accepted"] = False
expect_hold(readdress(acceptance_rollback), "candidate_lock_authority_invalid")

numeric_bool = copy.deepcopy(lock)
numeric_bool["authority"]["protected_install_authorized"] = 0
expect_hold(readdress(numeric_bool), "candidate_lock_authority_invalid")

boolean_version = copy.deepcopy(lock)
boolean_version["version"] = True
expect_hold(readdress(boolean_version), "candidate_lock_identity_invalid")

next_gate = copy.deepcopy(lock)
next_gate["next_gate"] = "FORGED_GATE"
expect_hold(readdress(next_gate), "candidate_lock_next_gate_invalid")

print(lockmod.MARKER + "_PROOF_GREEN")
print("parent_source_blobs_bound=4")
print("hosted_candidate_receipt_bound=true")
print("hosted_artifact_digest_bound=true")
print("candidate_id_bound=true")
print("candidate_json_sha256_bound=true")
print("binary_identity_bound=true")
print("readdressed_extra_top_key_rejected=true")
print("readdressed_candidate_id_drift_rejected=true")
print("readdressed_candidate_json_drift_rejected=true")
print("readdressed_artifact_digest_drift_rejected=true")
print("readdressed_run_identity_drift_rejected=true")
print("readdressed_binary_drift_rejected=true")
print("readdressed_binary_extra_key_rejected=true")
print("readdressed_install_overclaim_rejected=true")
print("readdressed_training_overclaim_rejected=true")
print("readdressed_funds_overclaim_rejected=true")
print("readdressed_acceptance_rollback_rejected=true")
print("numeric_authority_boolean_rejected=true")
print("boolean_version_rejected=true")
print("readdressed_next_gate_drift_rejected=true")
print("candidate_accepted=true")
print("binary_identity_accepted=true")
print("protected_install_authorized=false")
print("xiphos_host_qualification_performed=false")
print("durable_attempt_claim_authorized=false")
print("trainer_release_authorized=false")
print("training_execution_authorized=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("funds_movement=false")

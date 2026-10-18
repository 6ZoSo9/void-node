#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_lock_v1.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "25050af68e00dae01eaf19d1c6f3dc184bd384de"

EXPECTED_PARENT_HEAD = "2aec1d7a30e9c6b20b7d1cf0831f34c240674727"
EXPECTED_CANDIDATE_ID = (
    "apollyon_claim_protected_first_entry_static_candidate_v1:"
    "2a1fde88ced23606a3e0b6b10bb1205217915b36a0332ee89b5ec81181b32e23"
)
EXPECTED_BINARY_SHA256 = (
    "9c414a6aac9bbfc1b07175908e130993141255b132359ccae23ae49ecf5f7b6d"
)
EXPECTED_BINARY_BYTES = 808472
EXPECTED_BINARY_GIT_BLOB_SHA1 = "0eaedceb79f39829fbde9f06e454f45b9aeb8912"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


raw = TARGET.read_bytes()
assert git_blob(raw) == TARGET_BLOB

module = types.ModuleType("apollyon_static_candidate_lock_v1_verified")
module.__file__ = str(TARGET)
module.__package__ = None
exec(
    compile(
        raw.decode("utf-8", "strict"),
        TARGET_REL,
        "exec",
        dont_inherit=True,
        optimize=0,
    ),
    module.__dict__,
)

lock, binary = module.derive_lock()
parent, parent_report, rederived_binary = module.derive_parent_candidate()
assert binary == rederived_binary
module.validate_lock(lock, parent, parent_report, binary)

assert lock["marker"] == module.MARKER
assert lock["version"] == 1
assert lock["repository"]["parent_candidate_head"] == EXPECTED_PARENT_HEAD
assert lock["parent_candidate"]["head"] == EXPECTED_PARENT_HEAD
assert lock["parent_candidate"]["candidate_id"] == EXPECTED_CANDIDATE_ID
assert lock["binary"]["bytes"] == EXPECTED_BINARY_BYTES
assert lock["binary"]["sha256"] == EXPECTED_BINARY_SHA256
assert lock["binary"]["git_blob_sha1"] == EXPECTED_BINARY_GIT_BLOB_SHA1
assert lock["binary"]["expected_install_mode"] == "0555"
assert lock["authority"]["candidate_accepted"] is True
assert lock["authority"]["binary_identity_accepted"] is True
assert (
    lock["authority"]["static_first_instruction_candidate_evidence_accepted"]
    is True
)
assert lock["authority"]["protected_install_authorized"] is False
assert lock["authority"]["xiphos_host_qualification_performed"] is False
assert lock["authority"]["protected_expected_source_origin_proven"] is False
assert lock["authority"]["durable_attempt_claim_authorized"] is False
assert lock["authority"]["trainer_release_authorized"] is False
assert lock["authority"]["training_execution_authorized"] is False
assert lock["authority"]["funds_movement"] is False


def readdress(value):
    result = json.loads(json.dumps(value))
    result.pop("lock_id", None)
    result["lock_id"] = (
        "apollyon_claim_protected_first_entry_static_candidate_lock_v1:"
        + module.sha256(module.canonical(result))
    )
    return result


def expect_rejected(value, reason: str) -> None:
    try:
        module.validate_lock(value, parent, parent_report, binary)
    except module.LockError as exc:
        assert str(exc) == reason, (str(exc), reason)
    else:
        raise AssertionError("forged lock accepted: " + reason)


extra_top = json.loads(json.dumps(lock))
extra_top["protected_install_authorized"] = False
expect_rejected(readdress(extra_top), "candidate_lock_keys_invalid")

wrong_parent = json.loads(json.dumps(lock))
wrong_parent["parent_candidate"]["head"] = "0" * 40
expect_rejected(
    readdress(wrong_parent),
    "candidate_lock_parent_identity_invalid",
)

wrong_candidate = json.loads(json.dumps(lock))
wrong_candidate["parent_candidate"]["candidate_id"] = (
    "apollyon_claim_protected_first_entry_static_candidate_v1:" + "0" * 64
)
expect_rejected(
    readdress(wrong_candidate),
    "candidate_lock_parent_identity_invalid",
)

wrong_binary = json.loads(json.dumps(lock))
wrong_binary["binary"]["sha256"] = "0" * 64
expect_rejected(
    readdress(wrong_binary),
    "candidate_lock_binary_identity_invalid",
)

binary_extra = json.loads(json.dumps(lock))
binary_extra["binary"]["candidate_accepted"] = True
expect_rejected(
    readdress(binary_extra),
    "candidate_lock_binary_keys_invalid",
)

install_overclaim = json.loads(json.dumps(lock))
install_overclaim["authority"]["protected_install_authorized"] = True
expect_rejected(
    readdress(install_overclaim),
    "candidate_lock_authority_invalid",
)

acceptance_rollback = json.loads(json.dumps(lock))
acceptance_rollback["authority"]["candidate_accepted"] = False
expect_rejected(
    readdress(acceptance_rollback),
    "candidate_lock_authority_invalid",
)

next_gate_drift = json.loads(json.dumps(lock))
next_gate_drift["next_gate"] = "FORGED_GATE"
expect_rejected(
    readdress(next_gate_drift),
    "candidate_lock_next_gate_invalid",
)

source = TARGET.read_text(encoding="utf-8")
for required in (
    'PARENT_HEAD = "2aec1d7a30e9c6b20b7d1cf0831f34c240674727"',
    '"2ff81973b10c176523b0bf172a14fe1495a83986"',
    '"4d31e52fe32a7ca9567bf7c2f0f8e6228caf9bea"',
    '"fc7cf98be5b907729f95021d16139e455413d787"',
    '"a38a8c2d70d77be554af32f225e4d9d8491aea7e"',
    '"apollyon_claim_protected_first_entry_static_candidate_v1:"',
    '"2a1fde88ced23606a3e0b6b10bb1205217915b36a0332ee89b5ec81181b32e23"',
    EXPECTED_BINARY_SHA256,
    EXPECTED_BINARY_GIT_BLOB_SHA1,
    '"candidate_accepted": True',
    '"binary_identity_accepted": True',
    '"protected_install_authorized": False',
    '"xiphos_host_qualification_performed": False',
    '"protected_expected_source_origin_proven": False',
    '"training_execution_authorized": False',
    '"funds_movement": False',
    'module.repository_lineage = lambda:',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "/etc/systemd",
    "/var/lib/void-apollyon",
    "eth_send",
    "createPrivateKey",
    '"protected_install_authorized": True',
    '"training_execution_authorized": True',
    '"funds_movement": True',
):
    assert forbidden not in source, forbidden

print(
    "VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_LOCK_V1_PROOF_GREEN"
)
print("lock_source_blob_bound=true")
print("historical_parent_candidate_rederived=true")
print("parent_head_bound=true")
print("parent_candidate_id_bound=true")
print("parent_candidate_report_bound=true")
print("binary_bytes_sha_git_blob_bound=true")
print("expected_install_mode_0555_bound=true")
print("readdressed_extra_top_key_rejected=true")
print("readdressed_parent_head_drift_rejected=true")
print("readdressed_candidate_id_drift_rejected=true")
print("readdressed_binary_drift_rejected=true")
print("readdressed_binary_extra_key_rejected=true")
print("readdressed_install_overclaim_rejected=true")
print("readdressed_acceptance_rollback_rejected=true")
print("readdressed_next_gate_drift_rejected=true")
print("candidate_accepted=true")
print("binary_identity_accepted=true")
print("protected_install_authorized=false")
print("xiphos_host_qualification_performed=false")
print("protected_expected_source_origin_proven=false")
print("durable_attempt_claim_authorized=false")
print("trainer_release_authorized=false")
print("training_execution_authorized=false")
print("funds_movement=false")

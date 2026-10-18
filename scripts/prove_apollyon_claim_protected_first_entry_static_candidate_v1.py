#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_v1.py"
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "2ff81973b10c176523b0bf172a14fe1495a83986"
FIXED_SELF = (
    "/opt/void-apollyon-claim-protected-first-entry-v1/bin/"
    "apollyon_claim_protected_first_entry_v1"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


raw = TARGET.read_bytes()
assert git_blob(raw) == TARGET_BLOB

module = types.ModuleType("apollyon_static_candidate_v1_verified")
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

module.self_test()

report_a, binary_a = module.derive()
report_b, binary_b = module.derive()

assert binary_a == binary_b
assert module.canonical(report_a) == module.canonical(report_b)
module.validate(report_a, binary_a)
module.validate(report_b, binary_b)

assert binary_a.startswith(b"\x7fELF")
assert FIXED_SELF.encode("ascii") in binary_a
assert report_a["binary"]["three_builds_byte_identical"] is True
assert report_a["binary"]["elf_static_no_interp"] is True
assert report_a["binary"]["elf_dynamic_needed_absent"] is True
assert report_a["binary"]["elf_type_exec"] is True
assert report_a["binary"]["elf_machine_x86_64"] is True
assert report_a["binary"]["validator_reinspected_supplied_binary"] is True
assert report_a["binary"]["validator_independent_rebuild_byte_identical"] is True
assert report_a["compile_contract"]["required_uid"] == 0
assert report_a["compile_contract"]["required_gid"] == 0
assert report_a["compile_contract"]["compile_time_test_overrides"] is False
assert report_a["candidate_semantics"]["protected_expected_source_origin_proven"] is False

for key, value in report_a["authority"].items():
    if key in (
        "source_only_candidate",
        "candidate_report_filesystem_write",
        "static_binary_build_performed",
    ):
        assert value is True, key
    else:
        assert value is False, key


def readdress(report):
    value = json.loads(json.dumps(report))
    value.pop("candidate_id", None)
    value["candidate_id"] = (
        "apollyon_claim_protected_first_entry_static_candidate_v1:"
        + module.sha256(module.canonical(value))
    )
    return value


def expect_rejected(
    report, expected_reason: str, supplied_binary: bytes = binary_a
) -> None:
    try:
        module.validate(report, supplied_binary)
    except module.CandidateError as exc:
        assert str(exc) == expected_reason, (str(exc), expected_reason)
    else:
        raise AssertionError("forged candidate report accepted: " + expected_reason)


forged_source = json.loads(json.dumps(report_a))
forged_source["source_generation"][0]["git_blob_sha1"] = "0" * 40
expect_rejected(readdress(forged_source), "candidate_source_generation_invalid")

forged_toolchain = json.loads(json.dumps(report_a))
forged_toolchain["toolchain"]["gcc"]["sha256"] = "0" * 64
expect_rejected(
    readdress(forged_toolchain),
    "candidate_toolchain_generation_invalid",
)

forged_binary = json.loads(json.dumps(report_a))
forged_binary["binary"]["sha256"] = "0" * 64
expect_rejected(readdress(forged_binary), "candidate_binary_identity_invalid")

forged_binary_extra_key = json.loads(json.dumps(report_a))
forged_binary_extra_key["binary"]["candidate_accepted"] = True
expect_rejected(
    readdress(forged_binary_extra_key),
    "candidate_binary_keys_invalid",
)

forged_authority = json.loads(json.dumps(report_a))
forged_authority["authority"]["candidate_accepted"] = True
expect_rejected(readdress(forged_authority), "candidate_authority_invalid")

forged_gate = json.loads(json.dumps(report_a))
forged_gate["next_gate"] = "FORGED_GATE"
expect_rejected(readdress(forged_gate), "candidate_next_gate_invalid")

non_elf = b"not an ELF candidate"
forged_non_elf = json.loads(json.dumps(report_a))
forged_non_elf["binary"]["bytes"] = len(non_elf)
forged_non_elf["binary"]["sha256"] = module.sha256(non_elf)
forged_non_elf["binary"]["git_blob_sha1"] = module.git_blob(non_elf)
expect_rejected(
    readdress(forged_non_elf),
    "candidate_supplied_binary_shape_invalid",
    non_elf,
)

mutated_elf = bytearray(binary_a)
mutated_elf[-1] ^= 1
mutated_elf = bytes(mutated_elf)
forged_mutated = json.loads(json.dumps(report_a))
forged_mutated["binary"]["bytes"] = len(mutated_elf)
forged_mutated["binary"]["sha256"] = module.sha256(mutated_elf)
forged_mutated["binary"]["git_blob_sha1"] = module.git_blob(mutated_elf)
expect_rejected(
    readdress(forged_mutated),
    "candidate_independent_rebuild_mismatch",
    mutated_elf,
)

source = TARGET.read_text(encoding="utf-8")
for required in (
    'PARENT_HEAD = "a149fe2fbac4cb8bb11ed049dfb12a1d0110bfae"',
    'PREDECESSOR_PROOF_BLOB = "598c195252a17b7e4839763387c1970ea13c3b45"',
    '"-static"',
    '"-no-pie"',
    '"-Wl,--build-id=none"',
    '"required_uid": 0',
    '"required_gid": 0',
    '"production_defaults_used": True',
    '"three_builds_byte_identical": True',
    '"validator_reinspected_supplied_binary": True',
    '"validator_independent_rebuild_byte_identical": True',
    '"static_first_instruction_candidate_evidence": True',
    '"candidate_accepted": False',
    '"protected_install_authorized": False',
    '"protected_expected_source_origin_proven": False',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "sudo",
    "/etc/systemd",
    '"durable_attempt_claim_performed": True',
    '"training_execution_performed": True',
    "eth_send",
    "crypto.sign",
):
    assert forbidden not in source, forbidden

print("VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_V1_PROOF_GREEN")
print("candidate_tool_blob_bound=true")
print("candidate_tool_executed_from_verified_bytes=true")
print("accepted_parent_bound=true")
print("predecessor_proof_blob_bound=true")
print("two_full_derivations_byte_identical=true")
print("three_builds_per_derivation_byte_identical=true")
print("production_fixed_self_embedded=true")
print("production_uid_gid_defaults_bound=true")
print("static_no_interp=true")
print("dynamic_needed_absent=true")
print("readdressed_source_drift_rejected=true")
print("readdressed_toolchain_drift_rejected=true")
print("readdressed_binary_drift_rejected=true")
print("readdressed_binary_extra_key_rejected=true")
print("readdressed_authority_overclaim_rejected=true")
print("readdressed_next_gate_drift_rejected=true")
print("forged_non_elf_bytes_rejected=true")
print("forged_mutated_elf_rebuild_mismatch_rejected=true")
print("validator_reinspected_supplied_binary=true")
print("validator_independent_rebuild_byte_identical=true")
print("candidate_accepted=false")
print("protected_install_authorized=false")
print("protected_expected_source_origin_proven=false")
print("xiphos_host_qualification_performed=false")
print("durable_attempt_claim_performed=false")
print("training_execution_performed=false")
print("funds_movement=false")

#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_v2.py"
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "74b45b9f23ce3307b59a98fa9703d5c0a2494bad"
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

module = types.ModuleType("apollyon_static_candidate_v2_verified")
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


def expect_hold(fn, reason: str) -> None:
    try:
        fn()
    except module.CandidateError as exc:
        assert str(exc) == reason, (str(exc), reason)
    else:
        raise AssertionError("expected HOLD: " + reason)


with tempfile.TemporaryDirectory(prefix="apollyon-static-v2-retained-read-") as td:
    fixture = Path(td) / "source.c"
    fixture.write_bytes(b"int x;\n")
    assert module._read_retained_regular(
        fixture, 1024, label="fixture"
    ) == b"int x;\n"

with tempfile.TemporaryDirectory(prefix="apollyon-static-v2-fifo-race-") as td:
    fixture = Path(td) / "source.c"
    old = Path(td) / "source.old"
    fixture.write_bytes(b"bounded-source\n")
    real_open = module.os.open
    swapped = [False]

    def open_then_fifo(path, flags, *args, **kwargs):
        name = os.fspath(path)
        if (
            isinstance(name, str)
            and name.startswith("/proc/self/fd/")
            and not swapped[0]
        ):
            swapped[0] = True
            fixture.rename(old)
            os.mkfifo(fixture, 0o600)
        return real_open(path, flags, *args, **kwargs)

    module.os.open = open_then_fifo
    try:
        expect_hold(
            lambda: module._read_retained_regular(
                fixture, 1024, label="fixture"
            ),
            "fixture_generation_changed",
        )
    finally:
        module.os.open = real_open
    assert swapped[0]

with tempfile.TemporaryDirectory(prefix="apollyon-static-v2-growth-race-") as td:
    fixture = Path(td) / "source.c"
    fixture.write_bytes(b"12345678")
    real_read = module.os.read
    grew = [False]

    def read_then_grow(fd, amount):
        if not grew[0]:
            grew[0] = True
            with fixture.open("ab") as handle:
                handle.write(b"X" * 256)
                handle.flush()
        return real_read(fd, amount)

    module.os.read = read_then_grow
    try:
        expect_hold(
            lambda: module._read_retained_regular(
                fixture, 64, label="fixture"
            ),
            "fixture_oversized",
        )
    finally:
        module.os.read = real_read
    assert grew[0]

with tempfile.TemporaryDirectory(prefix="apollyon-static-v2-close-race-") as td:
    fixture = Path(td) / "source.c"
    fixture.write_bytes(b"close-test\n")
    real_close = module.os.close
    close_calls = []

    def close_data_then_fail(fd):
        close_calls.append(fd)
        real_close(fd)
        if len(close_calls) == 1:
            raise OSError(5, "simulated EIO after real close")

    module.os.close = close_data_then_fail
    try:
        expect_hold(
            lambda: module._read_retained_regular(
                fixture, 1024, label="fixture"
            ),
            "fixture_data_close_uncertain",
        )
    finally:
        module.os.close = real_close
    assert len(close_calls) == 2, close_calls

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
assert report_a["candidate_semantics"]["historical_v1_binary_identity_preserved"] is True
assert report_a["candidate_semantics"]["historical_v1_candidate_id"] == (
    "apollyon_claim_protected_first_entry_static_candidate_v1:"
    "81613bf7887ef287f6aa7cbb4a1bbe8ed0f180981fb8fe9538f6f0ab122855d9"
)
assert report_a["binary"]["accepted_v1_binary_identity_preserved"] is True
assert len(binary_a) == 808472
assert hashlib.sha256(binary_a).hexdigest() == (
    "9c414a6aac9bbfc1b07175908e130993141255b132359ccae23ae49ecf5f7b6d"
)
assert git_blob(binary_a) == "0eaedceb79f39829fbde9f06e454f45b9aeb8912"

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
        "apollyon_claim_protected_first_entry_static_candidate_v2:"
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
    "candidate_binary_identity_invalid",
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
    "candidate_binary_identity_invalid",
    mutated_elf,
)

source = raw.decode("utf-8", "strict")
for required in (
    'PARENT_HEAD = "09760e597668d2888fe6df15ea692873b81840fc"',
    'PREDECESSOR_PROOF_BLOB = "8348bba0a6a8b6c30ffdcc3a12658f20e99b8592"',
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
    '"historical_v1_binary_identity_preserved": True',
    '"accepted_v1_binary_identity_preserved": True',
    'def _read_retained_regular(',
    '"/proc/self/fd/" + str(path_fd)',
    'os.O_RDONLY | os.O_CLOEXEC | os.O_NONBLOCK',
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

print("VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_V2_PROOF_GREEN")
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
print("forged_non_elf_rejected_at_immutable_v1_identity=true")
print("forged_mutated_elf_rejected_at_immutable_v1_identity=true")
print("validator_reinspected_supplied_binary=true")
print("validator_independent_rebuild_byte_identical=true")
print("accepted_v1_binary_identity_preserved=true")
print("retained_regular_positive_read=true")
print("regular_to_fifo_race_rejected_without_blocking=true")
print("growing_source_bounded_rejected=true")
print("double_close_uncertainty_attempts_both_fds=true")
print("candidate_accepted=false")
print("protected_install_authorized=false")
print("protected_expected_source_origin_proven=false")
print("xiphos_host_qualification_performed=false")
print("durable_attempt_claim_performed=false")
print("training_execution_performed=false")
print("funds_movement=false")

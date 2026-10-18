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
TARGET_BLOB = "0aede98a070309ca9052badcea28923c44219536"

EXPECTED_PARENT_HEAD = "2aec1d7a30e9c6b20b7d1cf0831f34c240674727"
EXPECTED_CANDIDATE_ID = (
    "apollyon_claim_protected_first_entry_static_candidate_v1:"
    "2a1fde88ced23606a3e0b6b10bb1205217915b36a0332ee89b5ec81181b32e23"
)
EXPECTED_REPORT_CANONICAL_SHA256 = (
    "8e96b53161b0b5447e5b02499537803ffd680b5f01d6520ec1653fee52c75649"
)
EXPECTED_REPORT_RAW_SHA256 = (
    "dffdd2ce32fcf9dee765f8a6d17b455e100022012c7cd17d9cec1f5d436b484a"
)
EXPECTED_ARTIFACT_INNER_TAR_SHA256 = (
    "ca21d9f28b66c408f857ee00480a63585080025a6a76a84efca472e188390944"
)
EXPECTED_ARTIFACT_WRAPPER_SHA256 = (
    "ae1a062c6bd6a74d446a4cc7bf25242e11f2638f2c17c30dc1b2ae08017fc417"
)
EXPECTED_BINARY_SHA256 = (
    "9c414a6aac9bbfc1b07175908e130993141255b132359ccae23ae49ecf5f7b6d"
)
EXPECTED_BINARY_BYTES = 808472
EXPECTED_BINARY_GIT_BLOB_SHA1 = "0eaedceb79f39829fbde9f06e454f45b9aeb8912"
EXPECTED_GCC_SHA256 = (
    "1b99826121ae6682a634e5efe09bd3e3df58ce58e0b28f849114ab5b89139c26"
)
EXPECTED_READELF_SHA256 = (
    "64c58e15274bbbb5153f31078e455e9e77ee5f51489e709bba5bb788ce9df2b0"
)


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

# Acceptance must be independent of the mutable hosted compiler/linker image.
# The only child process allowed during lock derivation is local read-only git
# used to authenticate repository ancestry and exact parent source blobs.
original_run = module.run
observed_commands: list[tuple[str, ...]] = []


def guarded_run(argv: list[str], *, timeout: int = 120):
    observed_commands.append(tuple(argv))
    assert argv and argv[0] == "/usr/bin/git", argv
    return original_run(argv, timeout=timeout)


module.run = guarded_run
lock = module.derive_lock()
module.validate_lock(lock)
assert observed_commands
assert all(argv[0] == "/usr/bin/git" for argv in observed_commands)

assert lock["marker"] == module.MARKER
assert lock["version"] == 1
assert lock["repository"]["parent_candidate_head"] == EXPECTED_PARENT_HEAD
assert lock["parent_candidate"]["head"] == EXPECTED_PARENT_HEAD
assert lock["parent_candidate"]["candidate_id"] == EXPECTED_CANDIDATE_ID
assert (
    lock["parent_candidate"]["candidate_report_canonical_sha256"]
    == EXPECTED_REPORT_CANONICAL_SHA256
)
assert (
    lock["parent_candidate"]["candidate_report_raw_sha256"]
    == EXPECTED_REPORT_RAW_SHA256
)
assert (
    lock["parent_candidate"]["artifact_inner_tar_sha256"]
    == EXPECTED_ARTIFACT_INNER_TAR_SHA256
)
assert (
    lock["parent_candidate"]["artifact_wrapper_sha256"]
    == EXPECTED_ARTIFACT_WRAPPER_SHA256
)
build = lock["parent_candidate"]["accepted_build_evidence"]
assert build["runner_image"] == "ubuntu24/20261012.334"
assert build["gcc"]["sha256"] == EXPECTED_GCC_SHA256
assert build["gcc_dumpmachine"] == "x86_64-linux-gnu"
assert build["gcc_dumpversion"] == "13.3.0"
assert (
    build["gcc_version_line"]
    == "gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0"
)
assert build["readelf"]["sha256"] == EXPECTED_READELF_SHA256
assert build["toolchain_revalidated_after_build"] is True

assert lock["binary"]["bytes"] == EXPECTED_BINARY_BYTES
assert lock["binary"]["sha256"] == EXPECTED_BINARY_SHA256
assert lock["binary"]["git_blob_sha1"] == EXPECTED_BINARY_GIT_BLOB_SHA1
assert lock["binary"]["expected_install_mode"] == "0555"
assert lock["authority"]["historical_parent_candidate_rederived"] is False
assert lock["authority"]["accepted_parent_evidence_identity_bound"] is True
assert lock["authority"]["accepted_parent_toolchain_identity_bound"] is True
assert lock["authority"]["mutable_runner_toolchain_used"] is False
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
        module.validate_lock(value)
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

wrong_report = json.loads(json.dumps(lock))
wrong_report["parent_candidate"]["candidate_report_canonical_sha256"] = "0" * 64
expect_rejected(
    readdress(wrong_report),
    "candidate_lock_parent_identity_invalid",
)

wrong_artifact = json.loads(json.dumps(lock))
wrong_artifact["parent_candidate"]["artifact_inner_tar_sha256"] = "0" * 64
expect_rejected(
    readdress(wrong_artifact),
    "candidate_lock_parent_identity_invalid",
)

wrong_toolchain = json.loads(json.dumps(lock))
wrong_toolchain["parent_candidate"]["accepted_build_evidence"]["gcc"]["sha256"] = (
    "0" * 64
)
expect_rejected(
    readdress(wrong_toolchain),
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

aliased_authority_attack = module.derive_lock()
assert aliased_authority_attack["authority"] is not module.AUTHORITY
aliased_authority_attack["authority"]["protected_install_authorized"] = True
expect_rejected(
    readdress(aliased_authority_attack),
    "candidate_lock_authority_invalid",
)
assert module.AUTHORITY["protected_install_authorized"] is False
fresh_after_alias_attack = module.derive_lock()
assert fresh_after_alias_attack["authority"]["protected_install_authorized"] is False
module.validate_lock(fresh_after_alias_attack)

install_overclaim = json.loads(json.dumps(lock))
install_overclaim["authority"]["protected_install_authorized"] = True
expect_rejected(
    readdress(install_overclaim),
    "candidate_lock_authority_invalid",
)

rederive_overclaim = json.loads(json.dumps(lock))
rederive_overclaim["authority"]["historical_parent_candidate_rederived"] = True
expect_rejected(
    readdress(rederive_overclaim),
    "candidate_lock_authority_invalid",
)

mutable_toolchain_overclaim = json.loads(json.dumps(lock))
mutable_toolchain_overclaim["authority"]["mutable_runner_toolchain_used"] = True
expect_rejected(
    readdress(mutable_toolchain_overclaim),
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
    EXPECTED_CANDIDATE_ID.split(":", 1)[1],
    EXPECTED_REPORT_CANONICAL_SHA256,
    EXPECTED_REPORT_RAW_SHA256,
    EXPECTED_ARTIFACT_INNER_TAR_SHA256,
    EXPECTED_ARTIFACT_WRAPPER_SHA256,
    EXPECTED_BINARY_SHA256,
    EXPECTED_BINARY_GIT_BLOB_SHA1,
    EXPECTED_GCC_SHA256,
    EXPECTED_READELF_SHA256,
    '"runner_image": "ubuntu24/20261012.334"',
    '"historical_parent_candidate_rederived": False',
    '"accepted_parent_evidence_identity_bound": True',
    '"accepted_parent_toolchain_identity_bound": True',
    '"mutable_runner_toolchain_used": False',
    '"candidate_accepted": True',
    '"binary_identity_accepted": True',
    '"protected_install_authorized": False',
    '"xiphos_host_qualification_performed": False',
    '"protected_expected_source_origin_proven": False',
    '"training_execution_authorized": False',
    '"funds_movement": False',
    'def expected_authority() -> dict[str, bool]:',
    '"authority": expected_authority(),',
    'lock.get("authority") != expected_authority()',
):
    assert required in source, required

for forbidden in (
    "parent.derive()",
    "parent.validate(",
    "types.ModuleType",
    "module.repository_lineage = lambda:",
    '"historical_parent_candidate_rederived": True',
    '"mutable_runner_toolchain_used": True',
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
print("historical_parent_candidate_rederived=false")
print("accepted_parent_evidence_identity_bound=true")
print("accepted_parent_report_digest_bound=true")
print("accepted_parent_artifact_digest_bound=true")
print("accepted_parent_toolchain_identity_bound=true")
print("mutable_runner_toolchain_used=false")
print("compiler_execution_during_lock=false")
print("readelf_execution_during_lock=false")
print("parent_head_bound=true")
print("parent_candidate_id_bound=true")
print("binary_bytes_sha_git_blob_bound=true")
print("expected_install_mode_0555_bound=true")
print("readdressed_extra_top_key_rejected=true")
print("readdressed_parent_head_drift_rejected=true")
print("readdressed_candidate_id_drift_rejected=true")
print("readdressed_report_digest_drift_rejected=true")
print("readdressed_artifact_digest_drift_rejected=true")
print("readdressed_toolchain_identity_drift_rejected=true")
print("readdressed_binary_drift_rejected=true")
print("readdressed_binary_extra_key_rejected=true")
print("derived_authority_alias_attack_rejected=true")
print("authority_oracle_isolated=true")
print("readdressed_install_overclaim_rejected=true")
print("readdressed_rederivation_overclaim_rejected=true")
print("readdressed_mutable_toolchain_overclaim_rejected=true")
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

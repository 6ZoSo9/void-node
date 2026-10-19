#!/usr/bin/env python3
from __future__ import annotations

import errno
import hashlib
import json
import os
from pathlib import Path
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_lock_v1.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "7462e0e90fa8ec068bd82039c9c07a3359c0d6de"

EXPECTED_PARENT_HEAD = "bf8bfed5b5a4b08a7ebe80139987366b8f4eb94c"
EXPECTED_CANDIDATE_ID = (
    "apollyon_claim_protected_first_entry_static_candidate_v1:"
    "81613bf7887ef287f6aa7cbb4a1bbe8ed0f180981fb8fe9538f6f0ab122855d9"
)
EXPECTED_REPORT_CANONICAL_SHA256 = (
    "6696b52bc43c451af576814d452c827ad89644a14803cab9d24affabb82c189c"
)
EXPECTED_REPORT_RAW_SHA256 = (
    "4bb7a70116da4021a9975f6e8c15c666ba32f5c62d3cedf4a618b22aecf76731"
)
EXPECTED_ARTIFACT_INNER_TAR_SHA256 = (
    "89c3edf89d15f9e263d8d8dd603dd7b068a7eb64380c59852e1000e614a0607a"
)
EXPECTED_ARTIFACT_WRAPPER_SHA256 = (
    "9e9dacf414025479b04a2a4026b305a2b7e40131cfbdb30b95e2cbc70af2d0b3"
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


def expect_source_hold(fn, reason: str) -> None:
    try:
        fn()
    except module.LockError as exc:
        assert str(exc) == reason, (str(exc), reason)
    else:
        raise AssertionError("parent source read unexpectedly accepted: " + reason)


original_root = module.ROOT
original_git = module.git
original_open = module.os.open
original_read = module.os.read
original_close = module.os.close
with tempfile.TemporaryDirectory(prefix="apollyon-lock-parent-read-") as td:
    temp_root = Path(td)
    relative = "parent.py"
    fixture = temp_root / relative
    payload = b"# exact parent fixture\n"
    blob = git_blob(payload)
    module.ROOT = temp_root
    module.git = lambda *args: blob
    fixture.write_bytes(payload)

    opened_flags: list[int] = []
    opened_paths: list[str] = []

    def tracking_open(path, flags, *args, **kwargs):
        opened_flags.append(flags)
        opened_paths.append(os.fspath(path))
        return original_open(path, flags, *args, **kwargs)

    module.os.open = tracking_open
    assert module.stable_file(relative, blob) == payload
    assert len(opened_flags) == 2
    o_path = getattr(os, "O_PATH", 0)
    assert o_path != 0
    assert opened_paths[0] == os.fspath(fixture)
    assert opened_flags[0] & o_path
    assert opened_flags[0] & os.O_NOFOLLOW
    assert opened_flags[0] & os.O_CLOEXEC
    assert opened_paths[1].startswith("/proc/self/fd/")
    assert not (opened_flags[1] & o_path)
    assert opened_flags[1] & os.O_CLOEXEC
    assert opened_flags[1] & os.O_NONBLOCK
    module.os.open = original_open

    expect_source_hold(
        lambda: module.stable_file("../escape", blob),
        "parent_source_path_invalid:../escape",
    )

    fixture.unlink()
    target = temp_root / "target.py"
    target.write_bytes(payload)
    fixture.symlink_to(target)
    expect_source_hold(
        lambda: module.stable_file(relative, blob),
        "parent_source_metadata_invalid:" + relative,
    )

    fixture.unlink()
    os.mkfifo(fixture)
    expect_source_hold(
        lambda: module.stable_file(relative, blob),
        "parent_source_metadata_invalid:" + relative,
    )

    fixture.unlink()
    fixture.write_bytes(payload)

    pathname_data_opens = [0]
    replaced = [False]

    def replacing_open(path, flags, *args, **kwargs):
        text_path = os.fspath(path)
        o_path = getattr(os, "O_PATH", 0)
        if Path(text_path) == fixture and not (flags & o_path):
            pathname_data_opens[0] += 1
        if text_path.startswith("/proc/self/fd/") and not replaced[0]:
            fixture.unlink()
            os.mkfifo(fixture, 0o600)
            replaced[0] = True
        return original_open(path, flags, *args, **kwargs)

    module.os.open = replacing_open
    expect_source_hold(
        lambda: module.stable_file(relative, blob),
        "parent_source_generation_changed:" + relative,
    )
    module.os.open = original_open
    assert replaced[0] is True
    assert pathname_data_opens[0] == 0
    fixture.unlink()

    fixture.write_bytes(payload)
    first_read = True

    def growing_read(fd, count):
        nonlocal_marker = growing_read.__dict__
        data = original_read(fd, count)
        if not nonlocal_marker.get("grown", False):
            nonlocal_marker["grown"] = True
            with fixture.open("ab") as stream:
                stream.write(b"x")
        return data

    module.os.read = growing_read
    expect_source_hold(
        lambda: module.stable_file(relative, blob),
        "parent_source_grew:" + relative,
    )
    module.os.read = original_read

    fixture.write_bytes(payload)

    def close_then_error(fd):
        original_close(fd)
        raise OSError(errno.EIO, "synthetic close failure")

    module.os.close = close_then_error
    expect_source_hold(
        lambda: module.stable_file(relative, blob),
        "parent_source_close_failed:" + relative,
    )
    module.os.close = original_close

module.ROOT = original_root
module.git = original_git
module.os.open = original_open
module.os.read = original_read
module.os.close = original_close

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

aliased_build_attack = module.derive_lock()
assert (
    aliased_build_attack["parent_candidate"]["accepted_build_evidence"]
    is not module.EXPECTED_PARENT_BUILD_EVIDENCE
)
aliased_build_attack["parent_candidate"]["accepted_build_evidence"]["gcc"][
    "sha256"
] = "0" * 64
expect_rejected(
    readdress(aliased_build_attack),
    "candidate_lock_parent_identity_invalid",
)
assert (
    module.EXPECTED_PARENT_BUILD_EVIDENCE["gcc"]["sha256"]
    == EXPECTED_GCC_SHA256
)
fresh_after_build_alias_attack = module.derive_lock()
assert (
    fresh_after_build_alias_attack["parent_candidate"]["accepted_build_evidence"][
        "gcc"
    ]["sha256"]
    == EXPECTED_GCC_SHA256
)
module.validate_lock(fresh_after_build_alias_attack)

boolean_version = json.loads(json.dumps(lock))
boolean_version["version"] = True
expect_rejected(
    readdress(boolean_version),
    "candidate_lock_identity_invalid",
)

parent_boolean_type = json.loads(json.dumps(lock))
parent_boolean_type["parent_candidate"]["accepted_build_evidence"][
    "toolchain_revalidated_after_build"
] = 1
expect_rejected(
    readdress(parent_boolean_type),
    "candidate_lock_parent_identity_invalid",
)

parent_numeric_type = json.loads(json.dumps(lock))
parent_numeric_type["parent_candidate"]["accepted_build_evidence"]["gcc"][
    "bytes"
] = float(
    parent_numeric_type["parent_candidate"]["accepted_build_evidence"]["gcc"][
        "bytes"
    ]
)
expect_rejected(
    readdress(parent_numeric_type),
    "candidate_lock_parent_identity_invalid",
)

binary_boolean_type = json.loads(json.dumps(lock))
binary_boolean_type["binary"]["elf_static_no_interp"] = 1
expect_rejected(
    readdress(binary_boolean_type),
    "candidate_lock_binary_identity_invalid",
)

binary_numeric_type = json.loads(json.dumps(lock))
binary_numeric_type["binary"]["bytes"] = float(binary_numeric_type["binary"]["bytes"])
expect_rejected(
    readdress(binary_numeric_type),
    "candidate_lock_binary_identity_invalid",
)

numeric_true_authority = json.loads(json.dumps(lock))
numeric_true_authority["authority"]["candidate_accepted"] = 1
expect_rejected(
    readdress(numeric_true_authority),
    "candidate_lock_authority_invalid",
)

numeric_false_authority = json.loads(json.dumps(lock))
numeric_false_authority["authority"]["protected_install_authorized"] = 0
expect_rejected(
    readdress(numeric_false_authority),
    "candidate_lock_authority_invalid",
)

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
    'PARENT_HEAD = "bf8bfed5b5a4b08a7ebe80139987366b8f4eb94c"',
    '"99a1823f4b8349b6f65f210c59e1dbce4a4578f0"',
    '"2f518fb95e4fc6ff55a4a41d60f085a5f9576b60"',
    '"d3c27cbf63249695d45e47b3dc0ff98f75a961bb"',
    '"e4251199373f4290b873d818b5a07447232eb663"',
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
    'observed_authority = lock.get("authority")',
    'set(observed_authority) != set(expected)',
    'any(type(observed_authority[key]) is not bool for key in expected)',
    'observed_authority != expected',
    'def expected_parent_build_evidence() -> dict[str, Any]:',
    '"accepted_build_evidence": expected_parent_build_evidence(),',
    'type(version) is not int',
    'def exact_typed_equal(observed: object, expected: object) -> bool:',
    'type(observed) is not type(expected)',
    'not exact_typed_equal(observed_parent, expected_parent)',
    'not exact_typed_equal(observed_binary, expected_binary)',
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
print("parent_source_descriptor_bound=true")
print("parent_source_opath_admission=true")
print("parent_source_visible_replacement_not_data_opened=true")
print("parent_source_symlink_fifo_rejected=true")
print("parent_source_replacement_race_rejected=true")
print("parent_source_growth_rejected=true")
print("parent_source_close_failure_machine_readable=true")
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
print("build_evidence_alias_attack_rejected=true")
print("build_evidence_oracle_isolated=true")
print("boolean_version_rejected=true")
print("parent_evidence_boolean_type_rejected=true")
print("parent_evidence_numeric_type_rejected=true")
print("binary_boolean_type_rejected=true")
print("binary_numeric_type_rejected=true")
print("exact_nested_evidence_types=true")
print("numeric_authority_boolean_rejected=true")
print("authority_boolean_types_exact=true")
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

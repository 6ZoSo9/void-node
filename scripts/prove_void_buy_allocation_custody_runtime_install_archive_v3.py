#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "tools/void-buy-allocation-custody-runtime-install-archive-v3.py"

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_install_archive_v3",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.VERSION == 3
assert module.MARKER == "VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_V3"
assert module.SCHEMA == "void_buy_void_custody_runtime_install_archive_v3"
assert module.LOCK_REL == "ops/security/buy-void-allocation-custody-runtime-bundle-lock-v3.json"
assert module.LOCK_GIT_BLOB == "9e371ebc4ba1dcf494e55823eddb8a183c31d69f"
assert module.LOCK_SHA256 == "bfa65de5e4b3735bf32b46c0595a442d8979dd5768caebbfe563e568723fabfc"
assert module.LOCK_BYTES == 2387
assert module.CANDIDATE_ID == (
    "voidbuycustodybundle3_"
    "dae3764e1f1b660235d17ad933e32ed0d4f67d8fc4cd322286d34c5d9f0dbe32"
)
assert module.CANDIDATE_SHA256 == (
    "0d1be868aab98debdf0785c59cf45954ae68b2e1ebd0687ee56206b10b02ac67"
)
assert module.CANDIDATE_GIT_BLOB == "3474174b68995eacd1c516bc9bc5190ff04757b6"
assert module.CANDIDATE_BYTES == 12379
assert module.RUNTIME_FILE_COUNT == 10
assert module.ARCHIVE_BASENAME == "void-buy-allocation-custody-runtime-install-v3.tar"

lock_raw, lock = module.read_lock()
assert len(lock_raw) == 2387
assert module.git_blob(lock_raw) == module.LOCK_GIT_BLOB
assert module.sha256(lock_raw) == module.LOCK_SHA256
assert lock["candidate_accepted"] is True
assert lock["runtime_integration"] is False
assert lock["payment_acceptance"] is False
assert lock["funds_movement"] is False

candidate_raw, candidate = module.derive_runtime_candidate()
assert len(candidate_raw) == module.CANDIDATE_BYTES
assert module.sha256(candidate_raw) == module.CANDIDATE_SHA256
assert module.git_blob(candidate_raw) == module.CANDIDATE_GIT_BLOB
assert candidate["candidate_id"] == module.CANDIDATE_ID
assert candidate["candidate_accepted"] is False
assert candidate["runtime_integration"] is False
assert candidate["public_presale_activation"] is False
assert candidate["funds_movement"] is False

expected_records = module.normalized_runtime_records(candidate)
assert len(expected_records) == 10
assert len({row["path"] for row in expected_records}) == 10
assert sum(row["runtime_kind"] == "compiled_typescript" for row in expected_records) == 6
assert sum(row["runtime_kind"] == "tracked_source" for row in expected_records) == 4
assert all(isinstance(row["imports"], list) for row in expected_records)

raw, record = module.source_archive()
assert record["marker"] == module.MARKER
assert record["schema"] == module.SCHEMA
assert record["version"] == 3
assert record["accepted_lock"]["git_blob_sha1"] == module.LOCK_GIT_BLOB
assert record["accepted_lock"]["sha256"] == module.LOCK_SHA256
assert record["runtime_candidate"]["candidate_id"] == module.CANDIDATE_ID
assert record["runtime_candidate"]["sha256"] == module.CANDIDATE_SHA256
assert record["runtime_candidate"]["git_blob_sha1"] == module.CANDIDATE_GIT_BLOB
assert record["runtime_files"] == expected_records
assert record["authority"]["archive_candidate_accepted"] is False
assert record["authority"]["immutable_root_install"] is False
assert record["authority"]["install_target_selected"] is False
assert record["authority"]["existing_target_replaced"] is False
assert record["authority"]["node_binary_identity_verified"] is False
assert record["authority"]["runtime_integration"] is False
assert record["authority"]["payment_acceptance"] is False
assert record["authority"]["public_presale_activation"] is False
assert record["authority"]["production_gate_ready"] is False
assert record["authority"]["funds_movement"] is False

with tempfile.TemporaryDirectory(prefix="void-custody-v3-archive-proof-") as tmp:
    parent = Path(tmp)
    os.chmod(parent, 0o700)
    archive_path = parent / module.ARCHIVE_BASENAME
    original_fsync = module.os.fsync
    successful_fsync_kinds: list[int] = []

    def record_success_fsync(fd: int) -> None:
        successful_fsync_kinds.append(stat.S_IFMT(module.os.fstat(fd).st_mode))
        original_fsync(fd)

    module.os.fsync = record_success_fsync
    try:
        module.write_create_only(archive_path, raw)
    finally:
        module.os.fsync = original_fsync
    assert stat.S_IFREG in successful_fsync_kinds
    assert stat.S_IFDIR in successful_fsync_kinds
    assert stat.S_IMODE(archive_path.stat().st_mode) & 0o077 == 0

    inspected = module.inspect_archive(archive_path)
    assert inspected["archive_candidate_id"] == record["archive_candidate_id"]
    assert inspected["archive_sha256"] == hashlib.sha256(raw).hexdigest()
    assert inspected["archive_bytes"] == len(raw)
    assert inspected["runtime_files_exact"] == 10
    assert inspected["archive_candidate_accepted"] is False
    assert inspected["immutable_root_install"] is False
    assert inspected["runtime_integration"] is False
    assert inspected["payment_acceptance"] is False
    assert inspected["public_presale_activation"] is False
    assert inspected["production_gate_ready"] is False
    assert inspected["funds_movement"] is False

    try:
        module.write_create_only(archive_path, raw)
    except FileExistsError:
        pass
    else:
        raise AssertionError("create-only archive output overwrote existing file")

    partial_path = parent / "partial-write-proof.tar"
    original_write = module.os.write
    write_calls = [0]

    def fail_after_partial_write(fd: int, data: bytes) -> int:
        if write_calls[0] == 0:
            write_calls[0] += 1
            return original_write(fd, data[: min(64, len(data))])
        raise OSError("synthetic_partial_archive_write_failure")

    module.os.write = fail_after_partial_write
    try:
        try:
            module.write_create_only(partial_path, raw)
        except OSError:
            pass
        else:
            raise AssertionError("partial write failure was not surfaced")
    finally:
        module.os.write = original_write
    assert not partial_path.exists(), "partial write left a discoverable output path"

    failed_publish = parent / "failed-validation-proof.tar"
    original_inspect_bytes = module.inspect_archive_bytes

    def fail_prepublication_inspection(_raw: bytes) -> dict:
        raise module.ArchiveHold("synthetic_prepublication_validation_failure")

    module.inspect_archive_bytes = fail_prepublication_inspection
    try:
        try:
            module.package(failed_publish)
        except module.ArchiveHold:
            pass
        else:
            raise AssertionError("failed validation published final archive")
    finally:
        module.inspect_archive_bytes = original_inspect_bytes
    assert not failed_publish.exists(), "failed validation left final archive"

    published_path = parent / "published-proof.tar"
    packaged = module.package(published_path)
    assert published_path.is_file()
    assert packaged["archive_candidate_id"] == record["archive_candidate_id"]

    moving_parent = parent / "moving-output-parent-proof"
    moved_parent = parent / "moved-output-parent-proof"
    moving_parent.mkdir(mode=0o700)
    rebound_output = moving_parent / "rebound.tar"
    original_write_rebind = module.os.write
    rebound = [False]

    def rebind_parent_during_write(fd: int, data: bytes) -> int:
        written = original_write_rebind(fd, data)
        if not rebound[0]:
            moving_parent.rename(moved_parent)
            moving_parent.mkdir(mode=0o700)
            rebound[0] = True
        return written

    module.os.write = rebind_parent_during_write
    try:
        try:
            module.write_create_only(rebound_output, raw)
        except module.ArchiveHold:
            pass
        else:
            raise AssertionError("output parent rebind was accepted")
    finally:
        module.os.write = original_write_rebind
    assert rebound[0], "output parent rebind adversary was not exercised"
    assert not rebound_output.exists()
    assert not (moved_parent / "rebound.tar").exists(), (
        "retained parent cleanup left a partial archive after pathname rebind"
    )

    real_parent = parent / "real-output-parent"
    real_parent.mkdir(mode=0o700)
    linked_parent = parent / "linked-output-parent"
    linked_parent.symlink_to(real_parent, target_is_directory=True)
    try:
        module.write_create_only(linked_parent / "redirected.tar", raw)
    except module.ArchiveHold:
        pass
    else:
        raise AssertionError("symlink output parent was accepted")
    assert not (real_parent / "redirected.tar").exists()

    trailing = parent / "trailing.tar"
    trailing.write_bytes(raw + b"X")
    try:
        module.inspect_archive(trailing)
    except module.ArchiveHold:
        pass
    else:
        raise AssertionError("trailing archive bytes were accepted")

    members: dict[str, bytes] = {}
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as archive_reader:
        for member in archive_reader:
            handle = archive_reader.extractfile(member)
            assert handle is not None
            members[member.name] = handle.read()

    manifest_name = module.PREFIX + "review/manifest.json"
    forged_record = json.loads(members[manifest_name].decode("utf-8"))
    forged_records = copy.deepcopy(forged_record["runtime_files"])
    forged_records[0]["bytes"] += 1
    forged_records[0]["sha256"] = hashlib.sha256(
        b"X" * forged_records[0]["bytes"]
    ).hexdigest()
    forged_record["runtime_files"] = forged_records
    forged_body = dict(forged_record)
    forged_body.pop("archive_candidate_id", None)
    forged_record["archive_candidate_id"] = (
        "voidbuycustodyarchive3_" + module.sha256(module.canonical(forged_body))
    )
    forged_members = dict(members)
    forged_members[manifest_name] = module.canonical(forged_record)
    payload_name = module.PREFIX + "payload/" + forged_records[0]["path"]
    forged_members[payload_name] = b"X" * forged_records[0]["bytes"]
    forged_raw = module.canonical_archive(forged_members)
    forged_path = parent / "forged-runtime.tar"
    forged_path.write_bytes(forged_raw)
    try:
        module.inspect_archive(forged_path)
    except module.ArchiveHold as exc:
        assert "archive_manifest_runtime_identity_not_accepted" in str(exc)
    else:
        raise AssertionError("forged runtime record and payload were accepted")

    lock_name = module.PREFIX + "review/accepted-runtime-bundle-lock-v3.json"
    forged_lock = json.loads(members[lock_name].decode("utf-8"))
    forged_lock["candidate_accepted"] = False
    forged_lock_members = dict(members)
    forged_lock_members[lock_name] = (
        json.dumps(forged_lock, indent=2, ensure_ascii=True).encode("utf-8") + b"\n"
    )
    forged_lock_raw = module.canonical_archive(forged_lock_members)
    forged_lock_path = parent / "forged-lock.tar"
    forged_lock_path.write_bytes(forged_lock_raw)
    try:
        module.inspect_archive(forged_lock_path)
    except module.ArchiveHold as exc:
        assert "archive_lock_identity_invalid" in str(exc)
    else:
        raise AssertionError("forged accepted lock member was accepted")

source = TARGET.read_text(encoding="utf-8")
for required in [
    "tarfile.USTAR_FORMAT",
    "accepted-runtime-bundle-lock-v3.json",
    "archive_noncanonical_wire_bytes",
    "runtime_payload_identity_mismatch",
    "archive_manifest_runtime_identity_not_accepted",
    "descriptor_bound_source_reads",
    "open_bound_private_directory",
    "inspect_archive_bytes",
    "partial_output_cleanup_on_failure=true",
    "archive_bytes_validated_before_final_publication=true",
    "failed_validation_final_path_absent=true",
    "single_create_only_final_publication_after_validation=true",
    "successful_output_parent_fsync=true",
    "retained_parent_cleanup_survives_path_rebind=true",
    "output_parent_not_private_or_bound",
    "archive_candidate_accepted",
    "existing_target_replaced",
    "node_binary_identity_verified",
]:
    assert required in source, required

for forbidden in [
    "systemctl",
    "sudo ",
    "os.chown(",
    "eth_sendRawTransaction",
    '"payment_acceptance": True',
    '"public_presale_activation": True',
    '"funds_movement": True',
]:
    assert forbidden not in source, forbidden

print("VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_V3_PROOF_GREEN")
print("archive_candidate_id=" + record["archive_candidate_id"])
print("archive_bytes=" + str(len(raw)))
print("archive_sha256=" + hashlib.sha256(raw).hexdigest())
print("runtime_files_exact=10")
print("deterministic_ustar=true")
print("full_runtime_record_identity_bound=true")
print("accepted_v3_bundle_lock_bound=true")
print("descriptor_bound_source_reads=true")
print("descriptor_bound_create_only_output=true")
print("partial_output_cleanup_on_failure=true")
print("archive_bytes_validated_before_final_publication=true")
print("failed_validation_final_path_absent=true")
print("single_create_only_final_publication_after_validation=true")
print("successful_output_parent_fsync=true")
print("retained_parent_cleanup_survives_path_rebind=true")
print("symlink_output_parent_rejected=true")
print("fifo_substitution_rejected_without_blocking=true")
print("forged_runtime_record_and_payload_rejected=true")
print("forged_accepted_lock_member_rejected=true")
print("archive_candidate_accepted=false")
print("immutable_root_install=false")
print("existing_target_replaced=false")
print("node_binary_identity_verified=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("production_gate_ready=false")
print("funds_movement=false")

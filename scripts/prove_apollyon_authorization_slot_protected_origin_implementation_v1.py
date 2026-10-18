#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/xiphos/apollyon_authorization_slot_protected_origin_implementation_v1.py"
SOURCE_BLOB = "7fe674a726b7437656942fa07f4df57f91147c73"

PARENT_CONTRACT = ROOT / "tools/apollyon-authorization-slot-protected-origin-contract-v1.mjs"
PARENT_CONTRACT_BLOB = "04ade367f7fbfa5915b29648ff051f08b56c306d"
PARENT_SLOT = ROOT / "tools/apollyon-durable-attempt-claim-authorization-slot-v1.mjs"
PARENT_SLOT_BLOB = "93582c324ca85aeff56eb61f82b32f1e4c18dfe9"
CANONICALIZER = ROOT / "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs"
CANONICALIZER_BLOB = "f97fafb0148527ae3a954e2752faef8c7fc9e88e"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(raw)}\0".encode("ascii"))
    h.update(raw)
    return h.hexdigest()


assert git_blob(TARGET.read_bytes()) == SOURCE_BLOB
assert git_blob(PARENT_CONTRACT.read_bytes()) == PARENT_CONTRACT_BLOB
assert git_blob(PARENT_SLOT.read_bytes()) == PARENT_SLOT_BLOB
assert git_blob(CANONICALIZER.read_bytes()) == CANONICALIZER_BLOB

spec = importlib.util.spec_from_file_location("protected_origin_impl", TARGET)
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

mod.self_test()


def slot_record() -> dict[str, object]:
    authorization_id = "apollyon_authz_v1:" + "1" * 64
    slot_id = mod.derive_slot_id(authorization_id)
    material = {
        "marker": "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_AUTHORIZATION_SLOT_RECORD_V1",
        "version": 1,
        "status": "authorization_slot_bound_to_exact_durable_claim_candidate",
        "store_policy_id": mod.STORE_POLICY_ID,
        "authorization_id": authorization_id,
        "authorization_slot_id": slot_id,
        "store_contract_id": "apollyon_claim_store_contract_v2:" + "2" * 64,
        "store_generation_id": "apollyon_claim_store_generation_v2:" + "3" * 64,
        "terminal_receipt_id": "apollyon_terminal_receipt_v2:" + "4" * 64,
        "claim_record_id": "apollyon_attempt_claim_record_v2:" + "5" * 64,
        "claim_record_sha256": "6" * 64,
        "publish_request_sha256": "7" * 64,
        "attempt_limit": 1,
        "automatic_retry_authorized": False,
    }
    return {
        **material,
        "authorization_slot_record_id":
            "apollyon_attempt_claim_auth_slot_record_v1:"
            + mod.sha256(mod.canonical(material).encode("utf-8")),
    }


def canonical_bytes(record: dict[str, object]) -> bytes:
    return (mod.canonical(record) + "\n").encode("utf-8")


def create_fixture(base: Path, record: dict[str, object]) -> tuple[Path, Path, Path]:
    root = base / "claim-root"
    root.mkdir(mode=0o700)
    root.chmod(0o700)
    slots = root / mod.SLOT_DIRECTORY_LEAF
    slots.mkdir(mode=0o700)
    slots.chmod(0o700)
    leaf = slots / mod.slot_leaf(str(record["authorization_slot_id"]))
    leaf.write_bytes(canonical_bytes(record))
    leaf.chmod(0o600)
    return root, slots, leaf


def expect_hold(fn, reason: str) -> None:
    try:
        fn()
    except mod.Hold as exc:
        assert str(exc) == reason, (str(exc), reason)
    else:
        raise AssertionError("expected Hold: " + reason)


uid = os.geteuid()
gid = os.getegid()
assert uid > 0
assert gid > 0

record = slot_record()
with tempfile.TemporaryDirectory(prefix="void-apollyon-slot-origin-reader-") as td:
    root, slots, leaf = create_fixture(Path(td), record)
    receipt = mod.observe_protected_slot(
        root_path=root,
        claim_uid=uid,
        claim_gid=gid,
        authorization_slot_id=str(record["authorization_slot_id"]),
        require_trusted_ancestors=False,
    )
    assert receipt["authorization_slot_record_id"] == record["authorization_slot_record_id"]
    assert receipt["authorization_slot_record_sha256"] == mod.sha256(canonical_bytes(record))
    assert receipt["protected_authorization_slot_store_proven"] is True
    assert receipt["same_protected_claim_root_proven"] is True
    assert receipt["descriptor_stable_slot_reread_performed"] is True
    assert receipt["exact_slot_record_canonical_bytes_proven"] is True
    assert receipt["authorization_slot_revalidation_performed"] is True
    assert receipt["claim_service_write_boundary_metadata_proven"] is True
    assert receipt["claim_service_identity_external_lease_required"] is True
    assert receipt["claim_service_only_writer_proven"] is False
    assert receipt["protected_authorization_slot_origin_proven"] is False
    assert receipt["current_store_generation_revalidation_performed"] is False
    assert receipt["exact_claim_record_revalidation_performed"] is False
    assert receipt["exact_terminal_receipt_revalidation_performed"] is False
    assert receipt["exact_publish_request_revalidation_performed"] is False
    assert receipt["activation_capability_issuance_authorized"] is False
    assert receipt["training_start_consumption_authorized"] is False
    assert receipt["training_execution_authorized"] is False
    assert receipt["filesystem_read"] is True
    assert receipt["filesystem_write"] is False
    assert receipt["service_action"] is False
    assert receipt["funds_movement"] is False

# Root mode must be protected.
with tempfile.TemporaryDirectory(prefix="void-apollyon-slot-origin-root-mode-") as td:
    root, _, _ = create_fixture(Path(td), record)
    root.chmod(0o750)
    expect_hold(
        lambda: mod.observe_protected_slot(
            root_path=root,
            claim_uid=uid,
            claim_gid=gid,
            authorization_slot_id=str(record["authorization_slot_id"]),
            require_trusted_ancestors=False,
        ),
        "claim_root_metadata_invalid",
    )

# Slot directory must remain private.
with tempfile.TemporaryDirectory(prefix="void-apollyon-slot-origin-dir-mode-") as td:
    root, slots, _ = create_fixture(Path(td), record)
    slots.chmod(0o750)
    expect_hold(
        lambda: mod.observe_protected_slot(
            root_path=root,
            claim_uid=uid,
            claim_gid=gid,
            authorization_slot_id=str(record["authorization_slot_id"]),
            require_trusted_ancestors=False,
        ),
        "slot_directory_metadata_invalid",
    )

# Final slot must be owner-only mode 0600.
with tempfile.TemporaryDirectory(prefix="void-apollyon-slot-origin-file-mode-") as td:
    root, _, leaf = create_fixture(Path(td), record)
    leaf.chmod(0o640)
    expect_hold(
        lambda: mod.observe_protected_slot(
            root_path=root,
            claim_uid=uid,
            claim_gid=gid,
            authorization_slot_id=str(record["authorization_slot_id"]),
            require_trusted_ancestors=False,
        ),
        "slot_file_metadata_invalid",
    )

# Hard-linked finals are forbidden.
with tempfile.TemporaryDirectory(prefix="void-apollyon-slot-origin-hardlink-") as td:
    root, slots, leaf = create_fixture(Path(td), record)
    os.link(leaf, slots / "extra-link")
    expect_hold(
        lambda: mod.observe_protected_slot(
            root_path=root,
            claim_uid=uid,
            claim_gid=gid,
            authorization_slot_id=str(record["authorization_slot_id"]),
            require_trusted_ancestors=False,
        ),
        "slot_file_metadata_invalid",
    )

# Symlinked finals are forbidden.
with tempfile.TemporaryDirectory(prefix="void-apollyon-slot-origin-symlink-") as td:
    root, slots, leaf = create_fixture(Path(td), record)
    target = Path(td) / "elsewhere.json"
    target.write_bytes(leaf.read_bytes())
    target.chmod(0o600)
    leaf.unlink()
    leaf.symlink_to(target)
    expect_hold(
        lambda: mod.observe_protected_slot(
            root_path=root,
            claim_uid=uid,
            claim_gid=gid,
            authorization_slot_id=str(record["authorization_slot_id"]),
            require_trusted_ancestors=False,
        ),
        "slot_file_symlink_forbidden",
    )

# Canonical framing is exact.
with tempfile.TemporaryDirectory(prefix="void-apollyon-slot-origin-canonical-") as td:
    root, _, leaf = create_fixture(Path(td), record)
    leaf.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    leaf.chmod(0o600)
    expect_hold(
        lambda: mod.observe_protected_slot(
            root_path=root,
            claim_uid=uid,
            claim_gid=gid,
            authorization_slot_id=str(record["authorization_slot_id"]),
            require_trusted_ancestors=False,
        ),
        "slot_record_framing_invalid",
    )

# Content-derived slot ID must match authorization.
with tempfile.TemporaryDirectory(prefix="void-apollyon-slot-origin-slot-id-") as td:
    bad = dict(record)
    bad["authorization_slot_id"] = "apollyon_attempt_claim_auth_slot_v1:" + "a" * 64
    root, _, _ = create_fixture(Path(td), bad)
    expect_hold(
        lambda: mod.observe_protected_slot(
            root_path=root,
            claim_uid=uid,
            claim_gid=gid,
            authorization_slot_id=str(bad["authorization_slot_id"]),
            require_trusted_ancestors=False,
        ),
        "slot_record_slot_id_mismatch",
    )

# Readdressing a drifted parent record does not make it valid.
bad = dict(record)
bad["authorization_slot_record_id"] = (
    "apollyon_attempt_claim_auth_slot_record_v1:" + "b" * 64
)
expect_hold(
    lambda: mod.parse_slot_record(canonical_bytes(bad)),
    "slot_record_content_address_mismatch",
)

# Same-byte path replacement after the first descriptor read is detected.
with tempfile.TemporaryDirectory(prefix="void-apollyon-slot-origin-replace-") as td:
    root, slots, leaf = create_fixture(Path(td), record)
    real_pread = mod.os.pread
    calls = 0

    def racing_pread(fd: int, amount: int, offset: int) -> bytes:
        nonlocal_calls[0] += 1
        raw = real_pread(fd, amount, offset)
        if nonlocal_calls[0] == 1:
            replacement = slots / ".replacement"
            replacement.write_bytes(raw)
            replacement.chmod(0o600)
            os.replace(replacement, leaf)
        return raw

    nonlocal_calls = [0]
    mod.os.pread = racing_pread
    try:
        expect_hold(
            lambda: mod.observe_protected_slot(
                root_path=root,
                claim_uid=uid,
                claim_gid=gid,
                authorization_slot_id=str(record["authorization_slot_id"]),
                require_trusted_ancestors=False,
            ),
            "protected_slot_generation_changed",
        )
    finally:
        mod.os.pread = real_pread

source = TARGET.read_text(encoding="utf-8")
for required in (
    'CLAIM_STATE_ROOT = Path("/var/lib/void-apollyon-attempt-claim-v2")',
    'SLOT_DIRECTORY_LEAF = "authorization-slots-v1"',
    '"protected_authorization_slot_origin_proven": False',
    '"activation_capability_issuance_authorized": False',
    '"training_start_consumption_authorized": False',
    'os.open(leaf, READ_FLAGS, dir_fd=directory_fd)',
    'os.pread(fd, MAX_SLOT_RECORD_BYTES + 1, 0)',
    'require_no_posix_acl',
):
    assert required in source, required

for forbidden in (
    "os.write(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "os.mkdir(",
    "subprocess",
    "systemctl",
    "createPrivateKey",
    "signing=True",
    '"filesystem_write": True',
    '"service_action": True',
    '"funds_movement": True',
):
    assert forbidden not in source, forbidden

print("VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_IMPLEMENTATION_V1_PROOF_GREEN")
print("fixed_claim_state_root=true")
print("fixed_authorization_slot_directory=true")
print("descriptor_relative_slot_read=true")
print("protected_root_mode_0700_required=true")
print("slot_directory_mode_0700_required=true")
print("slot_file_mode_0600_nlink_one_required=true")
print("extended_posix_acl_rejected=true")
print("exact_canonical_slot_bytes_required=true")
print("exact_parent_slot_content_address_revalidated=true")
print("same_bytes_path_replacement_rejected=true")
print("descriptor_stable_slot_reread=true")
print("claim_service_identity_external_lease_required=true")
print("claim_service_only_writer_proven=false")
print("protected_authorization_slot_origin_proven=false")
print("activation_capability_issuance_authorized=false")
print("training_start_consumption_authorized=false")
print("training_execution_authorized=false")
print("filesystem_write=false")
print("service_action=false")
print("funds_movement=false")

#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "tools/void-buy-allocation-custody-runtime-install-archive-v1.py"

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_install_archive_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

module.self_test()

assert module.LOCK_GIT_BLOB == "acb5da31527ab42919d411695b475a94af29abb1"
assert module.LOCK_SHA256 == "998b1e211c78cd11b65224a51868687f7cdd76afcd07224482cf8ce862af1eec"
assert module.CANDIDATE_ID == "voidbuycustodybundle1_2339d565cc1c298a3f7ca9cae2ef163831288007bb32d9e7c37c01880aaee704"
assert module.CANDIDATE_SHA256 == "5ee2b5e5fc25a7cec8313c7cb7c4cd8bb675e3652ab18dc614577a25376f2279"
assert module.RUNTIME_FILE_COUNT == 10
assert module.ARCHIVE_BASENAME == "void-buy-allocation-custody-runtime-install-v1.tar"

lock_raw, lock = module.read_lock()
assert module.git_blob(lock_raw) == module.LOCK_GIT_BLOB
assert module.sha256(lock_raw) == module.LOCK_SHA256
assert lock["candidate_accepted"] is True
assert lock["immutable_root_install"] is False
assert lock["node_binary_identity_verified"] is False

raw, record = module.source_archive()
assert record["marker"] == module.MARKER
assert record["schema"] == module.SCHEMA
assert record["runtime_candidate"]["candidate_id"] == module.CANDIDATE_ID
assert record["runtime_candidate"]["sha256"] == module.CANDIDATE_SHA256
assert record["runtime_candidate"]["runtime_file_count"] == 10
assert len(record["runtime_files"]) == 10
assert record["authority"]["archive_candidate_accepted"] is False
assert record["authority"]["immutable_root_install"] is False
assert record["authority"]["existing_target_replaced"] is False
assert record["authority"]["node_binary_identity_verified"] is False
assert record["authority"]["runtime_integration"] is False
assert record["authority"]["payment_acceptance"] is False
assert record["authority"]["public_presale_activation"] is False
assert record["authority"]["production_gate_ready"] is False
assert record["authority"]["funds_movement"] is False

with tempfile.TemporaryDirectory(
    prefix="void-custody-install-archive-proof-"
) as tmp:
    parent = Path(tmp)
    os.chmod(parent, 0o700)
    archive = parent / module.ARCHIVE_BASENAME
    module.write_create_only(archive, raw)
    assert stat.S_IMODE(archive.stat().st_mode) & 0o077 == 0

    inspected = module.inspect_archive(archive)
    assert inspected["archive_candidate_id"] == record["archive_candidate_id"]
    assert inspected["archive_sha256"] == hashlib.sha256(raw).hexdigest()
    assert inspected["archive_bytes"] == len(raw)
    assert inspected["runtime_files_exact"] == 10
    assert inspected["archive_candidate_accepted"] is False
    assert inspected["immutable_root_install"] is False
    assert inspected["node_binary_identity_verified"] is False
    assert inspected["runtime_integration"] is False
    assert inspected["payment_acceptance"] is False
    assert inspected["public_presale_activation"] is False
    assert inspected["production_gate_ready"] is False
    assert inspected["funds_movement"] is False

    try:
        module.write_create_only(archive, raw)
    except FileExistsError:
        pass
    else:
        raise AssertionError("create-only archive output overwrote existing file")

    trailing = parent / "void-buy-allocation-custody-runtime-install-v1.trailing.tar"
    trailing.write_bytes(raw + b"X")
    try:
        module.inspect_archive(trailing)
    except module.ArchiveHold:
        pass
    else:
        raise AssertionError("trailing archive bytes were accepted")

source = TARGET.read_text(encoding="utf-8")
for required in [
    "tarfile.USTAR_FORMAT",
    "accepted-runtime-bundle-lock-v1.json",
    "archive_noncanonical_wire_bytes",
    "runtime_payload_identity_mismatch",
    "archive_candidate_accepted",
    "existing_target_replaced",
    "node_binary_identity_verified",
]:
    assert required in source, required

for forbidden in [
    "systemctl",
    "sudo ",
    "chown(",
    "chmod(0o755",
    "eth_sendRawTransaction",
    "presale_activation=True",
    "payment_acceptance=True",
]:
    assert forbidden not in source, forbidden

print("VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_V1_PROOF_GREEN")
print("archive_candidate_id=" + record["archive_candidate_id"])
print("archive_bytes=" + str(len(raw)))
print("archive_sha256=" + hashlib.sha256(raw).hexdigest())
print("runtime_files_exact=10")
print("deterministic_ustar=true")
print("archive_candidate_accepted=false")
print("immutable_root_install=false")
print("existing_target_replaced=false")
print("node_binary_identity_verified=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("production_gate_ready=false")
print("funds_movement=false")

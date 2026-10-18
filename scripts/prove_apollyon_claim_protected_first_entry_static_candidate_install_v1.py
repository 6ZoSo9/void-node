#!/usr/bin/env python3
"""Hosted-only adversaries for read-only accepted static archive admission."""
from __future__ import annotations

import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import copy

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_install_v1.py"
SOURCE_BLOB = "f1b685caa10bed7611f8feb5c1c88304ce7f9892"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\x00")
    h.update(raw)
    return h.hexdigest()


assert git_blob(TARGET.read_bytes()) == SOURCE_BLOB
spec = importlib.util.spec_from_file_location("accepted_artifact_admission", TARGET)
assert spec is not None and spec.loader is not None
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
assert mod.MAX_ARCHIVE_BYTES <= 4 * 1024 * 1024

real_lock = mod.load_accepted_parent_lock()
assert real_lock["authority"]["candidate_accepted"] is True
assert real_lock["authority"]["binary_identity_accepted"] is True
assert real_lock["authority"]["protected_install_authorized"] is False
assert real_lock["authority"]["training_execution_authorized"] is False
assert real_lock["binary"]["bytes"] == 808472
assert real_lock["binary"]["expected_install_mode"] == "0555"

# These deliberately synthetic BytesIO fixtures are never accepted production
# bytes; only the public CLI sources the real immutable lock before verifying
# a supplied file. The internal verifier gets an explicitly synthetic oracle.
fake_elf = b"\x7fELF" + b"not-a-production-binary"
fake_report = {
    "candidate_id": real_lock["parent_candidate"]["candidate_id"],
    "binary": {
        "bytes": len(fake_elf),
        "sha256": mod.digest(fake_elf),
        "git_blob_sha1": mod.git_blob(fake_elf),
    },
    "authority": {
        "candidate_accepted": False,
        "protected_install_authorized": False,
    },
}
report_bytes = mod.canonical(fake_report) + b"\n"
manifest_bytes = (
    mod.digest(report_bytes) + "  candidate-v1.json\n"
    + mod.digest(fake_elf) + "  " + mod.ACCEPTED_BINARY + "\n"
).encode("ascii")
normal_members = {
    "candidate-v1.json": (report_bytes, 0o644, tarfile.REGTYPE),
    mod.ACCEPTED_BINARY: (fake_elf, 0o555, tarfile.REGTYPE),
    "SHA256SUMS.txt": (manifest_bytes, 0o644, tarfile.REGTYPE),
    "source-head.txt": (
        (mod.ACCEPTED_CANDIDATE_HEAD + "\n").encode("ascii"),
        0o644,
        tarfile.REGTYPE,
    ),
}


def make_archive(entries: dict[str, tuple[bytes, int, bytes]]) -> bytes:
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:", format=tarfile.USTAR_FORMAT) as tf:
        for name, (data, mode, typ) in entries.items():
            info = tarfile.TarInfo(name)
            info.type = typ
            info.mode = mode
            info.uid = 0
            info.gid = 0
            info.mtime = 0
            if typ != tarfile.REGTYPE:
                info.linkname = "unexpected-link"
                info.size = 0
                tf.addfile(info)
            else:
                info.size = len(data)
                tf.addfile(info, io.BytesIO(data))
    return output.getvalue()


def make_fixture_lock(archive: bytes) -> dict:
    fixture = copy.deepcopy(real_lock)
    fixture["parent_candidate"]["artifact_inner_tar_sha256"] = mod.digest(archive)
    fixture["parent_candidate"]["candidate_report_canonical_sha256"] = (
        mod.digest(report_bytes[:-1])
    )
    fixture["parent_candidate"]["candidate_report_raw_sha256"] = mod.digest(
        report_bytes
    )
    fixture["binary"]["bytes"] = len(fake_elf)
    fixture["binary"]["sha256"] = mod.digest(fake_elf)
    fixture["binary"]["git_blob_sha1"] = mod.git_blob(fake_elf)
    return fixture


positive_tar = make_archive(normal_members)
fixture_lock = make_fixture_lock(positive_tar)
receipt = mod.verify_archive_bytes(positive_tar, fixture_lock)
assert receipt["status"] == "exact_archive_verified_install_blocked"
assert receipt["archive_verified"] is True
assert receipt["binary_identity_verified"] is True
assert receipt["expected_install_mode"] == "0555"
assert receipt["candidate_id"] == real_lock["parent_candidate"]["candidate_id"]
assert receipt["protected_install_authorized"] is False
assert receipt["archive_extracted"] is False
assert receipt["xiphos_host_qualification_performed"] is False
assert receipt["trainer_release_authorized"] is False
assert receipt["training_execution_authorized"] is False
assert receipt["funds_movement"] is False
material = {k: v for k, v in receipt.items() if k != "handoff_id"}
assert receipt["handoff_id"].endswith(mod.digest(mod.canonical(material)))


def expect_hold(archive: bytes, expected: str, *, rebind_digest: bool = True) -> None:
    fixture = make_fixture_lock(archive if rebind_digest else positive_tar)
    try:
        mod.verify_archive_bytes(archive, fixture)
    except mod.Hold as exc:
        assert str(exc) == expected, (str(exc), expected)
    else:
        raise AssertionError("malformed archive admitted: " + expected)


corrupted = bytearray(positive_tar)
corrupted[1024] ^= 1
expect_hold(bytes(corrupted), "archive_digest_mismatch", rebind_digest=False)
expect_hold(b"not-tar", "archive_digest_mismatch", rebind_digest=False)

wrong_mode = dict(normal_members)
wrong_mode[mod.ACCEPTED_BINARY] = (fake_elf, 0o644, tarfile.REGTYPE)
expect_hold(make_archive(wrong_mode), "archive_member_metadata_invalid")

symlink = dict(normal_members)
symlink[mod.ACCEPTED_BINARY] = (b"", 0o555, tarfile.SYMTYPE)
expect_hold(make_archive(symlink), "archive_member_metadata_invalid")

extra = dict(normal_members)
extra["extra-hidden-payload"] = (b"X", 0o644, tarfile.REGTYPE)
expect_hold(make_archive(extra), "archive_extra_member")

missing = dict(normal_members)
missing.pop("source-head.txt")
expect_hold(make_archive(missing), "archive_members_missing")

wrong_source_head = dict(normal_members)
wrong_source_head["source-head.txt"] = (b"0" * 40 + b"\n", 0o644, tarfile.REGTYPE)
expect_hold(make_archive(wrong_source_head), "archive_source_head_invalid")

wrong_manifest = dict(normal_members)
wrong_manifest["SHA256SUMS.txt"] = (b"forged\n", 0o644, tarfile.REGTYPE)
expect_hold(make_archive(wrong_manifest), "archive_manifest_invalid")

wrong_report = dict(normal_members)
wrong_report["candidate-v1.json"] = (report_bytes + b" ", 0o644, tarfile.REGTYPE)
expect_hold(make_archive(wrong_report), "archive_report_identity_invalid")

wrong_binary = dict(normal_members)
wrong_binary[mod.ACCEPTED_BINARY] = (fake_elf + b"X", 0o555, tarfile.REGTYPE)
expect_hold(make_archive(wrong_binary), "archive_member_metadata_invalid")

nonmember = dict(normal_members)
nonmember["source-head.txt/"] = nonmember.pop("source-head.txt")
expect_hold(make_archive(nonmember), "archive_members_invalid")

# Verify that a real accepted lock does not accept the synthetic positive tar.
try:
    mod.verify_archive_bytes(positive_tar, real_lock)
except mod.Hold as exc:
    assert str(exc) == "archive_digest_mismatch"
else:
    raise AssertionError("synthetic fixture promoted to accepted artifact")

source = TARGET.read_text(encoding="utf-8")
for required in (
    "_require_isolated_python()",
    "def load_accepted_parent_lock()",
    "git_blob(raw) != PARENT_BLOB",
    "exec(compile(raw, os.fspath(target), \"exec\")",
    "def read_untrusted_tar(path: Path)",
    "def verify_archive_bytes(raw: bytes, lock: dict[str, Any])",
    "digest(raw) != parent[\"artifact_inner_tar_sha256\"]",
    "member.mode != required_mode",
    "member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE)",
    "archive_extracted\": False",
    "protected_install_authorized\": False",
):
    assert required in source, required

for forbidden in (
    "os.rename(",
    "os.replace(",
    "os.chmod(",
    "os.chown(",
    "subprocess.Popen(",
    "systemctl",
    "tarfile.extractall",
    "tf.extract(",
    "execute_training",
    "eth_send",
    "createPrivateKey",
):
    assert forbidden not in source, forbidden

print("VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_INSTALL_V1_PROOF_GREEN")
print("accepted_parent_lock_bound=true")
print("read_only_tar_validation=true")
print("synthetic_positive_fixture_verified=true")
print("synthetic_fixture_not_accepted_by_production_lock=true")
print("changed_tar_digest_rejected=true")
print("wrong_elf_mode_rejected=true")
print("symlink_member_rejected=true")
print("extra_member_rejected=true")
print("missing_member_rejected=true")
print("wrong_source_head_rejected=true")
print("manifest_drift_rejected=true")
print("report_drift_rejected=true")
print("binary_size_drift_rejected=true")
print("archive_not_extracted=true")
print("host_installation=false")
print("protected_install_authorized=false")
print("training_execution_authorized=false")
print("funds_movement=false")

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import tempfile
import zipfile


MARKER = "WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1"
CLI_MARKER = "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1"
CLI_SOURCE = Path("ops/mainnet0/wc-public-earning-participant-v1.sh")
LICENSE_SOURCE = Path("LICENSE")
ARCHIVE_NAME = "void-wc-public-earning-participant-cli-v1.zip"
RELEASE_NAME = "void-wc-public-earning-participant-cli-v1.release.json"
CHECKSUM_NAME = "WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1_SHA256SUMS.txt"
SOURCE_MANIFEST_NAME = "SOURCE.json"
README_NAME = "README.txt"
CLI_ARCHIVE_NAME = "wc-public-earning-participant-v1.sh"
FIXED_TIMESTAMP = (1980, 1, 1, 0, 0, 0)

README = """VOID WC Public Earning Participant CLI V1

This archive contains the exact reviewed participant CLI from 6ZoSo9/void-node.

CURRENT REQUIREMENTS
- a compatible local VOID executor node already running;
- bash, curl, jq, python3, sha256sum, stat, mktemp, date, chmod, rm,
  mkdir, awk, grep, and tr;
- one fresh ticket file;
- the exact trusted coordinator base URL and 32-hex node ID.

The current pilot awards exactly 3 WC only after one ticket-bound job completes
and the trusted coordinator accepts the verified receipt. Downloading or
running --help does not earn WC. This archive does not install or activate a
node, issue a ticket, enable a coordinator or executor, or guarantee work.

VERIFY
1. Verify the outer checksum file supplied beside this ZIP.
2. Inspect SOURCE.json and compare the embedded source hashes.
3. Run: bash -n wc-public-earning-participant-v1.sh
4. Run: ./wc-public-earning-participant-v1.sh --help

The ticket contains a capability secret. Keep it mode 600. The CLI deletes the
ticket only after exact-green completion and retains a sanitized receipt.
"""


class Hold(RuntimeError):
    pass


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode()


def read_regular(path: Path, label: str) -> bytes:
    try:
        mode = path.lstat().st_mode
    except FileNotFoundError as error:
        raise Hold(f"missing {label}: {path}") from error
    if not stat.S_ISREG(mode) or path.is_symlink():
        raise Hold(f"{label} must be a non-symlink regular file: {path}")
    return path.read_bytes()


def source_snapshot(root: Path) -> tuple[bytes, bytes]:
    try:
        mode = root.lstat().st_mode
    except FileNotFoundError as error:
        raise Hold(f"source root is missing: {root}") from error
    if not stat.S_ISDIR(mode) or root.is_symlink():
        raise Hold(f"source root must be a non-symlink directory: {root}")
    cli = read_regular(root / CLI_SOURCE, "participant CLI")
    license_bytes = read_regular(root / LICENSE_SOURCE, "license")
    try:
        cli_text = cli.decode("utf-8")
    except UnicodeDecodeError as error:
        raise Hold("participant CLI must be UTF-8") from error
    for anchor in (
        CLI_MARKER,
        "fixed_award_wc == 3",
        "wcPublicEarningPilotExecuteLocal",
        "trusted-coordinator-node-id",
        "ticket_deleted=1",
    ):
        if anchor not in cli_text:
            raise Hold(f"participant CLI anchor missing: {anchor}")
    for forbidden in ('echo "$TOKEN"', "set -x", "--arg capability_token"):
        if forbidden in cli_text:
            raise Hold(f"participant CLI contains forbidden token pattern: {forbidden}")
    if not license_bytes.startswith(b"VOID Community License"):
        raise Hold("license marker mismatch")
    return cli, license_bytes


def archive_bytes(
    cli: bytes,
    license_bytes: bytes,
    source_commit: str,
) -> tuple[bytes, dict[str, object]]:
    source_manifest = {
        "marker": MARKER,
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "source_commit": source_commit,
        "network": {"chain_id": 2050, "identity": "mainnet0"},
        "source_files": [
            {"path": str(CLI_SOURCE), "bytes": len(cli), "sha256": sha256_bytes(cli)},
            {
                "path": str(LICENSE_SOURCE),
                "bytes": len(license_bytes),
                "sha256": sha256_bytes(license_bytes),
            },
        ],
        "runtime_requirements": {
            "local_void_executor_required": True,
            "fresh_ticket_required": True,
            "trusted_coordinator_identity_required": True,
            "fixed_award_wc": 3,
        },
        "authority": {
            "ticket_issuance": False,
            "coordinator_enablement": False,
            "executor_enablement": False,
            "work_execution": False,
            "wc_ledger_write": False,
            "void_settlement": False,
            "payment_execution": False,
            "wallet_or_signer_access": False,
            "runtime_mutation": False,
            "fund_movement": False,
        },
    }
    entries = {
        "LICENSE": (license_bytes, 0o644),
        README_NAME: (README.encode(), 0o644),
        SOURCE_MANIFEST_NAME: (canonical_json(source_manifest), 0o644),
        CLI_ARCHIVE_NAME: (cli, 0o755),
    }
    with tempfile.TemporaryDirectory(prefix="void-wc-participant-release-") as temporary:
        archive_path = Path(temporary) / ARCHIVE_NAME
        with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_STORED) as archive:
            archive.comment = b""
            for name in sorted(entries):
                value, permissions = entries[name]
                info = zipfile.ZipInfo(name, FIXED_TIMESTAMP)
                info.compress_type = zipfile.ZIP_STORED
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | permissions) << 16
                info.internal_attr = 0
                info.extra = b""
                info.comment = b""
                archive.writestr(info, value)
        return archive_path.read_bytes(), source_manifest


def atomic_write(path: Path, value: bytes, mode: int = 0o644) -> None:
    if path.exists() and (path.is_symlink() or not path.is_file()):
        raise Hold(f"output path is not a regular file: {path}")
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(value)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def build(root: Path, output_dir: Path, source_commit: str) -> dict[str, object]:
    if not re.fullmatch(r"[0-9a-f]{40}", source_commit):
        raise Hold("source commit must be exactly 40 lowercase hexadecimal characters")
    cli, license_bytes = source_snapshot(root)
    archive, source_manifest = archive_bytes(cli, license_bytes, source_commit)
    if output_dir.exists() and (output_dir.is_symlink() or not output_dir.is_dir()):
        raise Hold(f"output directory is not a non-symlink directory: {output_dir}")
    output_dir.mkdir(parents=True, mode=0o755, exist_ok=True)
    release = {
        "marker": MARKER,
        "version": 1,
        "status": "unsigned_review_artifact",
        "source": source_manifest,
        "archive": {
            "path": ARCHIVE_NAME,
            "bytes": len(archive),
            "sha256": sha256_bytes(archive),
            "entries": sorted(("LICENSE", README_NAME, SOURCE_MANIFEST_NAME, CLI_ARCHIVE_NAME)),
            "compression": "stored",
            "timestamp": "1980-01-01T00:00:00Z",
        },
    }
    release_bytes = canonical_json(release)
    checksums = (
        f"{sha256_bytes(archive)}  {ARCHIVE_NAME}\n"
        f"{sha256_bytes(release_bytes)}  {RELEASE_NAME}\n"
    ).encode()
    atomic_write(output_dir / ARCHIVE_NAME, archive)
    atomic_write(output_dir / RELEASE_NAME, release_bytes)
    atomic_write(output_dir / CHECKSUM_NAME, checksums)
    return release


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the deterministic WC participant CLI pack")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--source-commit", required=True)
    arguments = parser.parse_args()
    try:
        release = build(arguments.root, arguments.output_dir, arguments.source_commit)
    except Hold as error:
        print(f"HOLD: {error}", file=__import__("sys").stderr)
        return 1
    print(MARKER)
    print(f"archive={arguments.output_dir / ARCHIVE_NAME}")
    print(f"archive_sha256={release['archive']['sha256']}")
    print(f"release_manifest={arguments.output_dir / RELEASE_NAME}")
    print(f"checksums={arguments.output_dir / CHECKSUM_NAME}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

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


MARKER = "VOID_BROWSER_AGENT_ACCESS_KIT_RELEASE_PACK_V1"
SOURCE_ROOT = Path("integrations/browser/void-browser-agent-access-kit-v1")
SOURCE_FILES = (
    "README.md",
    "clearweb-origin-binding-v1.mjs",
    "core.mjs",
    "manifest.json",
    "popup.css",
    "popup.html",
    "popup.mjs",
    "trust-pins.json",
)
ARCHIVE_NAME = "void-browser-agent-access-kit-v1.zip"
RELEASE_NAME = "void-browser-agent-access-kit-v1.release.json"
CHECKSUM_NAME = "VOID_BROWSER_AGENT_ACCESS_KIT_RELEASE_PACK_V1_SHA256SUMS.txt"
SOURCE_MANIFEST_NAME = "SOURCE.json"
LICENSE_ARCHIVE_NAME = "LICENSE"
FIXED_TIMESTAMP = (1980, 1, 1, 0, 0, 0)


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


def source_snapshot(root: Path) -> tuple[dict[str, bytes], bytes, dict[str, object]]:
    extension_root = root / SOURCE_ROOT
    try:
        mode = extension_root.lstat().st_mode
    except FileNotFoundError as error:
        raise Hold(f"extension source root is missing: {extension_root}") from error
    if not stat.S_ISDIR(mode) or extension_root.is_symlink():
        raise Hold(f"extension source root must be a non-symlink directory: {extension_root}")

    actual_names = sorted(path.name for path in extension_root.iterdir())
    if actual_names != sorted(SOURCE_FILES):
        raise Hold(
            "extension source file set mismatch: "
            f"expected={sorted(SOURCE_FILES)} actual={actual_names}"
        )

    sources = {
        name: read_regular(extension_root / name, f"extension source {name}")
        for name in SOURCE_FILES
    }
    license_bytes = read_regular(root / "LICENSE", "license")

    try:
        manifest = json.loads(sources["manifest.json"].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise Hold("manifest.json must be canonical UTF-8 JSON") from error
    if not isinstance(manifest, dict):
        raise Hold("manifest.json must contain an object")
    if manifest.get("manifest_version") != 3:
        raise Hold("extension must remain Manifest V3")
    if manifest.get("name") != "VOID Browser Agent Access Kit":
        raise Hold("extension name mismatch")
    if manifest.get("version") != "1.2.0":
        raise Hold("extension version must be exactly 1.2.0 for this release lane")
    if manifest.get("permissions") != ["storage"]:
        raise Hold("extension permissions must remain exactly storage")
    if manifest.get("optional_host_permissions") != ["http://*.onion/*"]:
        raise Hold("extension optional host permission must remain onion-only")
    if "background" in manifest or "content_scripts" in manifest:
        raise Hold("background and content scripts must remain absent")
    if manifest.get("content_security_policy") != {
        "extension_pages": "script-src 'self'; object-src 'none'"
    }:
        raise Hold("extension content security policy mismatch")
    gecko = manifest.get("browser_specific_settings", {}).get("gecko", {})
    if gecko.get("id") != "void-browser-agent-access-kit-v1@voidchain.io":
        raise Hold("Firefox extension ID mismatch")

    try:
        trust_pins = json.loads(sources["trust-pins.json"].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise Hold("trust-pins.json must be UTF-8 JSON") from error
    expected_trust_pins = {
        "marker": "VOID_BROWSER_AGENT_TRUST_PINS_V1",
        "version": 1,
        "network": {"chain_id": 2050, "identity": "mainnet0"},
        "source": {
            "repository": "6ZoSo9/void-node",
            "base_commit": "3c5ae398366a959c198096f2051ae37cd64e4e7e",
            "profile_path": "config/void-tor-agent-access-client-v1.json",
        },
        "trust": {
            "onion_hostname": (
                "r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion"
            ),
            "node_id": "9d89483769e469e0473b489dc50dba96",
            "public_key_fingerprint_sha256": (
                "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b"
            ),
            "binding_sha256": (
                "f625a192b3f97a29513603b2a433e4acc86f15fb81f9fa536cc44541e5873521"
            ),
            "binding_expires_at": "2027-01-26T08:39:09.089Z",
        },
    }
    if trust_pins != expected_trust_pins:
        raise Hold("trust-pins.json does not match the reviewed canonical identity")

    for name in (
        "clearweb-origin-binding-v1.mjs",
        "core.mjs",
        "popup.mjs",
        "popup.html",
        "README.md",
    ):
        try:
            sources[name].decode("utf-8")
        except UnicodeDecodeError as error:
            raise Hold(f"{name} must be UTF-8") from error

    core = sources["core.mjs"].decode("utf-8")
    for anchor in (
        "VOID_NODE_ONION_BINDING_V1",
        "intersectReadOnlyCapabilities",
        "fetchBoundedJsonDocument",
        'credentials: "omit"',
        'redirect: "error"',
    ):
        if anchor not in core:
            raise Hold(f"core.mjs anchor missing: {anchor}")
    for forbidden in (
        '"http://*/*"',
        '"https://*/*"',
        "wallet.sign",
        "eth_sendRawTransaction",
    ):
        if forbidden in core:
            raise Hold(f"core.mjs contains forbidden authority pattern: {forbidden}")

    clearweb = sources["clearweb-origin-binding-v1.mjs"].decode("utf-8")
    for anchor in (
        "VOID_BROWSER_CLEARWEB_ORIGIN_BINDING_V1",
        "verifySignedClearwebOriginBinding",
        "same_origin_only",
        "payment_authority: false",
        "wallet_or_signer_access: false",
    ):
        if anchor not in clearweb:
            raise Hold(f"clearweb-origin-binding-v1.mjs anchor missing: {anchor}")

    popup = sources["popup.mjs"].decode("utf-8")
    for anchor in (
        "VOID_BROWSER_AGENT_VERIFIED_READ_V1",
        "credentials_sent: false",
        "redirects_followed: false",
        "wallet_or_signer_access: false",
    ):
        if anchor not in popup:
            raise Hold(f"popup.mjs anchor missing: {anchor}")
    for forbidden in (
        "mutation_authority: true",
        "payment_authority: true",
        "wallet_or_signer_access: true",
    ):
        if forbidden in popup:
            raise Hold(f"popup.mjs contains forbidden authority pattern: {forbidden}")
    expected_popup_authority_counts = {
        "mutation_authority: false": 2,
        "payment_authority: false": 2,
        "wallet_or_signer_access: false": 1,
    }
    for anchor, expected_count in expected_popup_authority_counts.items():
        actual_count = popup.count(anchor)
        if actual_count != expected_count:
            raise Hold(
                "popup.mjs authority anchor count mismatch: "
                f"{anchor} expected={expected_count} actual={actual_count}"
            )

    source_manifest = {
        "marker": MARKER,
        "version": 1,
        "repository": "6ZoSo9/void-node",
        "network": {"chain_id": 2050, "identity": "mainnet0"},
        "extension": {
            "name": manifest["name"],
            "version": manifest["version"],
            "manifest_version": manifest["manifest_version"],
            "gecko_id": gecko["id"],
            "permissions": manifest["permissions"],
            "optional_host_permissions": manifest["optional_host_permissions"],
        },
        "trust_profile": {
            "marker": trust_pins["marker"],
            "version": trust_pins["version"],
            "node_id": trust_pins["trust"]["node_id"],
            "onion_hostname": trust_pins["trust"]["onion_hostname"],
            "public_key_fingerprint_sha256": (
                trust_pins["trust"]["public_key_fingerprint_sha256"]
            ),
            "binding_sha256": trust_pins["trust"]["binding_sha256"],
            "binding_expires_at": trust_pins["trust"]["binding_expires_at"],
        },
        "source_files": [
            {
                "path": str(SOURCE_ROOT / name),
                "bytes": len(sources[name]),
                "sha256": sha256_bytes(sources[name]),
            }
            for name in SOURCE_FILES
        ] + [
            {
                "path": "LICENSE",
                "bytes": len(license_bytes),
                "sha256": sha256_bytes(license_bytes),
            }
        ],
        "runtime_requirements": {
            "explicit_user_origin_permission_required": True,
            "tor_capable_browser_environment_required_for_onion": True,
            "temporary_or_unpacked_install_required_until_store_signing": True,
        },
        "authority": {
            "background_service": False,
            "content_scripts": False,
            "clearweb_host_permission": False,
            "arbitrary_resource_input": False,
            "credential_forwarding": False,
            "redirect_following": False,
            "wallet_or_signer_access": False,
            "transaction_submission": False,
            "payment_execution": False,
            "work_credit_write": False,
            "void_settlement": False,
            "node_runtime_mutation": False,
            "operator_control": False,
            "deployment": False,
            "fund_movement": False,
        },
    }
    return sources, license_bytes, source_manifest


def archive_bytes(
    sources: dict[str, bytes],
    license_bytes: bytes,
    source_manifest: dict[str, object],
    source_commit: str,
) -> tuple[bytes, dict[str, object]]:
    manifest = dict(source_manifest)
    manifest["source_commit"] = source_commit
    entries: dict[str, tuple[bytes, int]] = {
        LICENSE_ARCHIVE_NAME: (license_bytes, 0o644),
        SOURCE_MANIFEST_NAME: (canonical_json(manifest), 0o644),
    }
    for name in SOURCE_FILES:
        entries[name] = (sources[name], 0o644)

    with tempfile.TemporaryDirectory(prefix="void-browser-agent-release-") as temporary:
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
        return archive_path.read_bytes(), manifest


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
    sources, license_bytes, source_manifest = source_snapshot(root)
    archive, embedded_source = archive_bytes(
        sources,
        license_bytes,
        source_manifest,
        source_commit,
    )
    if output_dir.exists() and (output_dir.is_symlink() or not output_dir.is_dir()):
        raise Hold(f"output directory is not a non-symlink directory: {output_dir}")
    output_dir.mkdir(parents=True, mode=0o755, exist_ok=True)

    release = {
        "marker": MARKER,
        "version": 1,
        "status": "unsigned_review_artifact",
        "source": embedded_source,
        "archive": {
            "path": ARCHIVE_NAME,
            "bytes": len(archive),
            "sha256": sha256_bytes(archive),
            "entries": sorted(
                (LICENSE_ARCHIVE_NAME, SOURCE_MANIFEST_NAME, *SOURCE_FILES)
            ),
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
    parser = argparse.ArgumentParser(
        description="Build the deterministic VOID Browser Agent Access Kit pack"
    )
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

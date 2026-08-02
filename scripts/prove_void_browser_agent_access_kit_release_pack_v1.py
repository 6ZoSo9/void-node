#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile


ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "scripts" / "build_void_browser_agent_access_kit_release_pack_v1.py"
SOURCE_ROOT = ROOT / "integrations" / "browser" / "void-browser-agent-access-kit-v1"
LICENSE = ROOT / "LICENSE"
SOURCE_COMMIT = "0123456789abcdef0123456789abcdef01234567"
ARCHIVE_NAME = "void-browser-agent-access-kit-v1.zip"
RELEASE_NAME = "void-browser-agent-access-kit-v1.release.json"
CHECKSUM_NAME = "VOID_BROWSER_AGENT_ACCESS_KIT_RELEASE_PACK_V1_SHA256SUMS.txt"
SOURCE_FILES = [
    "README.md",
    "clearweb-origin-binding-v1.mjs",
    "core.mjs",
    "manifest.json",
    "popup.css",
    "popup.html",
    "popup.mjs",
    "trust-pins.json",
]
EXPECTED_ENTRIES = sorted(["LICENSE", "SOURCE.json", *SOURCE_FILES])


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_builder(
    root: Path,
    output: Path,
    *,
    success: bool = True,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        [
            sys.executable,
            str(BUILDER),
            "--root",
            str(root),
            "--source-commit",
            SOURCE_COMMIT,
            "--output-dir",
            str(output),
        ],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
    )
    if success and result.returncode != 0:
        raise AssertionError(f"builder failed: {result.stdout}{result.stderr}")
    if not success and result.returncode == 0:
        raise AssertionError("builder unexpectedly accepted invalid source")
    return result


for name in ("clearweb-origin-binding-v1.mjs", "core.mjs", "popup.mjs"):
    syntax = subprocess.run(
        ["node", "--check", str(SOURCE_ROOT / name)],
        cwd=ROOT,
        check=False,
    )
    assert syntax.returncode == 0, name

manifest = json.loads((SOURCE_ROOT / "manifest.json").read_text(encoding="utf-8"))
assert manifest["manifest_version"] == 3
assert manifest["version"] == "1.2.0"
assert manifest["permissions"] == ["storage"]
assert manifest["optional_host_permissions"] == ["http://*.onion/*"]
assert "content_scripts" not in manifest
assert "background" not in manifest

trust_pins = json.loads((SOURCE_ROOT / "trust-pins.json").read_text(encoding="utf-8"))
assert trust_pins["marker"] == "VOID_BROWSER_AGENT_TRUST_PINS_V1"
assert trust_pins["version"] == 1
assert trust_pins["network"] == {"chain_id": 2050, "identity": "mainnet0"}
assert trust_pins["trust"]["node_id"] == "9d89483769e469e0473b489dc50dba96"
assert trust_pins["trust"]["onion_hostname"].endswith(".onion")

with tempfile.TemporaryDirectory(prefix="void-browser-agent-release-proof-") as temporary_name:
    temporary = Path(temporary_name)
    output_a = temporary / "a"
    output_b = temporary / "b"
    run_builder(ROOT, output_a)
    run_builder(ROOT, output_b)

    for name in (ARCHIVE_NAME, RELEASE_NAME, CHECKSUM_NAME):
        assert (output_a / name).read_bytes() == (output_b / name).read_bytes(), name

    checksums = (output_a / CHECKSUM_NAME).read_text(encoding="utf-8").splitlines()
    assert checksums == [
        f"{sha256(output_a / ARCHIVE_NAME)}  {ARCHIVE_NAME}",
        f"{sha256(output_a / RELEASE_NAME)}  {RELEASE_NAME}",
    ]

    release = json.loads((output_a / RELEASE_NAME).read_text(encoding="utf-8"))
    assert release["marker"] == "VOID_BROWSER_AGENT_ACCESS_KIT_RELEASE_PACK_V1"
    assert release["status"] == "unsigned_review_artifact"
    assert release["source"]["source_commit"] == SOURCE_COMMIT
    assert release["source"]["extension"] == {
        "gecko_id": "void-browser-agent-access-kit-v1@voidchain.io",
        "manifest_version": 3,
        "name": "VOID Browser Agent Access Kit",
        "optional_host_permissions": ["http://*.onion/*"],
        "permissions": ["storage"],
        "version": "1.2.0",
    }
    assert release["source"]["trust_profile"] == {
        "binding_expires_at": "2027-01-26T08:39:09.089Z",
        "binding_sha256": (
            "f625a192b3f97a29513603b2a433e4acc86f15fb81f9fa536cc44541e5873521"
        ),
        "marker": "VOID_BROWSER_AGENT_TRUST_PINS_V1",
        "node_id": "9d89483769e469e0473b489dc50dba96",
        "onion_hostname": (
            "r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion"
        ),
        "public_key_fingerprint_sha256": (
            "2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b"
        ),
        "version": 1,
    }
    assert release["source"]["runtime_requirements"] == {
        "explicit_user_origin_permission_required": True,
        "temporary_or_unpacked_install_required_until_store_signing": True,
        "tor_capable_browser_environment_required_for_onion": True,
    }
    assert set(release["source"]["authority"].values()) == {False}
    assert release["archive"]["sha256"] == sha256(output_a / ARCHIVE_NAME)
    assert release["archive"]["entries"] == EXPECTED_ENTRIES

    with zipfile.ZipFile(output_a / ARCHIVE_NAME, "r") as archive:
        assert archive.namelist() == EXPECTED_ENTRIES
        assert archive.comment == b""
        assert archive.testzip() is None
        for info in archive.infolist():
            assert info.date_time == (1980, 1, 1, 0, 0, 0)
            assert info.compress_type == zipfile.ZIP_STORED
            assert info.flag_bits & 0x1 == 0
            assert info.extra == b""
            assert info.comment == b""
            assert stat.S_IMODE(info.external_attr >> 16) == 0o644
        for name in SOURCE_FILES:
            assert archive.read(name) == (SOURCE_ROOT / name).read_bytes()
        assert archive.read("LICENSE") == LICENSE.read_bytes()
        embedded_source = json.loads(archive.read("SOURCE.json"))
        assert embedded_source == release["source"]
        embedded_manifest = json.loads(archive.read("manifest.json"))
        assert embedded_manifest["manifest_version"] == 3
        assert embedded_manifest["optional_host_permissions"] == ["http://*.onion/*"]
        assert "content_scripts" not in embedded_manifest
        assert "background" not in embedded_manifest
        embedded_trust_pins = json.loads(archive.read("trust-pins.json"))
        assert embedded_trust_pins == trust_pins
        clearweb = archive.read("clearweb-origin-binding-v1.mjs").decode("utf-8")
        assert "VOID_BROWSER_CLEARWEB_ORIGIN_BINDING_V1" in clearweb
        assert "verifySignedClearwebOriginBinding" in clearweb
        assert "payment_authority: false" in clearweb
        popup = archive.read("popup.mjs").decode("utf-8")
        assert "VOID_BROWSER_AGENT_VERIFIED_READ_V1" in popup
        assert "credentials_sent: false" in popup
        assert "redirects_followed: false" in popup
        assert popup.count("mutation_authority: false") == 2
        assert popup.count("payment_authority: false") == 2
        assert popup.count("wallet_or_signer_access: false") == 1
        assert "mutation_authority: true" not in popup
        assert "payment_authority: true" not in popup
        assert "wallet_or_signer_access: true" not in popup

    symlink_root = temporary / "symlink-root"
    target = symlink_root / "integrations" / "browser" / "void-browser-agent-access-kit-v1"
    target.mkdir(parents=True)
    for name in SOURCE_FILES:
        if name == "core.mjs":
            (target / name).symlink_to(SOURCE_ROOT / name)
        else:
            shutil.copyfile(SOURCE_ROOT / name, target / name)
    shutil.copyfile(LICENSE, symlink_root / "LICENSE")
    symlink_result = run_builder(
        symlink_root,
        temporary / "symlink-out",
        success=False,
    )
    assert "non-symlink regular file" in symlink_result.stderr

    unexpected_root = temporary / "unexpected-root"
    unexpected_target = (
        unexpected_root
        / "integrations"
        / "browser"
        / "void-browser-agent-access-kit-v1"
    )
    shutil.copytree(SOURCE_ROOT, unexpected_target)
    shutil.copyfile(LICENSE, unexpected_root / "LICENSE")
    (unexpected_target / "background.mjs").write_text(
        "console.log('unreviewed');\n",
        encoding="utf-8",
    )
    unexpected_result = run_builder(
        unexpected_root,
        temporary / "unexpected-out",
        success=False,
    )
    assert "source file set mismatch" in unexpected_result.stderr

    broad_root = temporary / "broad-root"
    broad_target = broad_root / "integrations" / "browser" / "void-browser-agent-access-kit-v1"
    shutil.copytree(SOURCE_ROOT, broad_target)
    shutil.copyfile(LICENSE, broad_root / "LICENSE")
    broad_manifest = json.loads((broad_target / "manifest.json").read_text(encoding="utf-8"))
    broad_manifest["optional_host_permissions"] = ["http://*/*", "https://*/*"]
    (broad_target / "manifest.json").write_text(
        json.dumps(broad_manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    broad_result = run_builder(
        broad_root,
        temporary / "broad-out",
        success=False,
    )
    assert "onion-only" in broad_result.stderr

    altered_pins_root = temporary / "altered-pins-root"
    altered_pins_target = (
        altered_pins_root
        / "integrations"
        / "browser"
        / "void-browser-agent-access-kit-v1"
    )
    shutil.copytree(SOURCE_ROOT, altered_pins_target)
    shutil.copyfile(LICENSE, altered_pins_root / "LICENSE")
    altered_pins = json.loads(
        (altered_pins_target / "trust-pins.json").read_text(encoding="utf-8")
    )
    altered_pins["trust"]["node_id"] = "0" * 32
    (altered_pins_target / "trust-pins.json").write_text(
        json.dumps(altered_pins, indent=2) + "\n",
        encoding="utf-8",
    )
    altered_pins_result = run_builder(
        altered_pins_root,
        temporary / "altered-pins-out",
        success=False,
    )
    assert "reviewed canonical identity" in altered_pins_result.stderr

    elevated_root = temporary / "elevated-root"
    elevated_target = (
        elevated_root
        / "integrations"
        / "browser"
        / "void-browser-agent-access-kit-v1"
    )
    shutil.copytree(SOURCE_ROOT, elevated_target)
    shutil.copyfile(LICENSE, elevated_root / "LICENSE")
    popup_path = elevated_target / "popup.mjs"
    popup_path.write_text(
        popup_path.read_text(encoding="utf-8").replace(
            "payment_authority: false",
            "payment_authority: true",
            1,
        ),
        encoding="utf-8",
    )
    elevated_result = run_builder(
        elevated_root,
        temporary / "elevated-out",
        success=False,
    )
    assert (
        "popup.mjs contains forbidden authority pattern: payment_authority: true"
        in elevated_result.stderr
    )

print("VOID_BROWSER_AGENT_ACCESS_KIT_RELEASE_PACK_V1_PROOF_GREEN")
print("archive_byte_reproducible=true")
print("extension_source_exact=true")
print("manifest_v3=true")
print("onion_permission_only=true")
print("verified_read_console_included=true")
print("clearweb_origin_binding_source_included=true")
print("trust_pins_included=true")
print("altered_trust_pins_rejected=true")
print("checksum_manifest_verified=true")
print("symlink_source_rejected=true")
print("unexpected_source_rejected=true")
print("broad_host_permission_rejected=true")
print("elevated_payment_authority_rejected=true")
print("popup_authority_counts_enforced=true")
print("content_scripts=false")
print("background_service=false")
print("wallet_or_signer_access=false")
print("payment_execution=false")
print("fund_movement=false")

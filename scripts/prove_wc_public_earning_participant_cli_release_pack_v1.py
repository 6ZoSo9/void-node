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
BUILDER = ROOT / "scripts" / "build_wc_public_earning_participant_cli_release_pack_v1.py"
CLI = ROOT / "ops" / "mainnet0" / "wc-public-earning-participant-v1.sh"
LICENSE = ROOT / "LICENSE"
SOURCE_COMMIT = "0123456789abcdef0123456789abcdef01234567"
ARCHIVE_NAME = "void-wc-public-earning-participant-cli-v1.zip"
RELEASE_NAME = "void-wc-public-earning-participant-cli-v1.release.json"
CHECKSUM_NAME = "WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1_SHA256SUMS.txt"
EXPECTED_ENTRIES = [
    "LICENSE",
    "README.txt",
    "SOURCE.json",
    "wc-public-earning-participant-v1.sh",
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_builder(root: Path, output: Path, success: bool = True) -> subprocess.CompletedProcess[str]:
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


syntax = subprocess.run(["bash", "-n", str(CLI)], cwd=ROOT, check=False)
assert syntax.returncode == 0
help_result = subprocess.run(
    ["bash", str(CLI), "--help"],
    cwd=ROOT,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    check=False,
)
assert help_result.returncode == 0
assert "trusted-coordinator-base" in help_result.stdout
assert "exact 3 WC canonical delta" in help_result.stdout

with tempfile.TemporaryDirectory(prefix="void-wc-participant-release-proof-") as temporary_name:
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
    assert release["marker"] == "WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1"
    assert release["status"] == "unsigned_review_artifact"
    assert release["source"]["source_commit"] == SOURCE_COMMIT
    assert release["source"]["runtime_requirements"] == {
        "fixed_award_wc": 3,
        "fresh_ticket_required": True,
        "local_void_executor_required": True,
        "trusted_coordinator_identity_required": True,
    }
    assert set(release["source"]["authority"].values()) == {False}
    assert release["archive"]["sha256"] == sha256(output_a / ARCHIVE_NAME)

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
            expected_mode = 0o755 if info.filename.endswith(".sh") else 0o644
            assert stat.S_IMODE(info.external_attr >> 16) == expected_mode
        assert archive.read("wc-public-earning-participant-v1.sh") == CLI.read_bytes()
        assert archive.read("LICENSE") == LICENSE.read_bytes()
        readme = archive.read("README.txt").decode("utf-8")
        normalized_readme = " ".join(readme.split())
        assert "compatible local VOID executor node already running" in normalized_readme
        assert "Downloading or running --help does not earn WC" in normalized_readme
        assert "does not install or activate a node" in normalized_readme
        embedded_source = json.loads(archive.read("SOURCE.json"))
        assert embedded_source == release["source"]

    symlink_root = temporary / "symlink-root"
    (symlink_root / "ops" / "mainnet0").mkdir(parents=True)
    shutil.copyfile(LICENSE, symlink_root / "LICENSE")
    (symlink_root / "ops" / "mainnet0" / "wc-public-earning-participant-v1.sh").symlink_to(CLI)
    symlink_result = run_builder(symlink_root, temporary / "symlink-out", success=False)
    assert "non-symlink regular file" in symlink_result.stderr

    altered_root = temporary / "altered-root"
    (altered_root / "ops" / "mainnet0").mkdir(parents=True)
    shutil.copyfile(LICENSE, altered_root / "LICENSE")
    (altered_root / "ops" / "mainnet0" / "wc-public-earning-participant-v1.sh").write_text(
        "#!/usr/bin/env bash\necho unreviewed\n",
        encoding="utf-8",
    )
    altered_result = run_builder(altered_root, temporary / "altered-out", success=False)
    assert "participant CLI anchor missing" in altered_result.stderr

print("WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1_PROOF_GREEN")
print("archive_byte_reproducible=true")
print("participant_cli_source_exact=true")
print("license_source_exact=true")
print("checksum_manifest_verified=true")
print("local_executor_requirement_disclosed=true")
print("fixed_award_wc_disclosed=true")
print("symlink_source_rejected=true")
print("altered_source_rejected=true")
print("ticket_issuance=false")
print("work_execution=false")
print("wc_ledger_write=false")
print("payment_execution=false")
print("fund_movement=false")

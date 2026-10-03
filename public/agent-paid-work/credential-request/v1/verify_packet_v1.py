#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import stat
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "manifest-v1.json"
CHECKSUMS = ROOT / "SHA256SUMS.txt"

EXPECTED_FILES = {
    "README.md",
    "applicant_auth_v1.py",
    "credential-request-draft-v1.example.json",
    "credential_request_client_v1.py",
    "manifest-v1.json",
    "verify_packet_v1.py",
}


def sha(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as handle:
        for chunk in iter(
            lambda: handle.read(1024 * 1024),
            b"",
        ):
            digest.update(chunk)

    return digest.hexdigest()


if not ROOT.is_dir() or ROOT.is_symlink():
    raise SystemExit(
        "HOLD: packet root must be a directory"
    )

for relative in EXPECTED_FILES | {
    "SHA256SUMS.txt"
}:
    path = ROOT / relative
    metadata = path.lstat()

    if (
        path.is_symlink()
        or not stat.S_ISREG(
            metadata.st_mode
        )
        or stat.S_IMODE(
            metadata.st_mode
        )
        & 0o022
    ):
        raise SystemExit(
            f"HOLD: unsafe packet file: {relative}"
        )

manifest = json.loads(
    MANIFEST.read_text(
        encoding="utf-8"
    )
)

if (
    manifest.get("marker")
    != (
        "VOID_EXTERNAL_AGENT_CREDENTIAL_REQUEST_PACKET_V1"
    )
    or manifest.get("version") != 1
    or manifest.get("activation_state")
    != "public_review_request_live"
    or manifest.get("credential_created")
    is not False
    or manifest.get("applicant_auth_required")
    is not True
    or manifest.get("applicant_auth_header")
    != "x-void-applicant-auth-v1"
    or manifest.get("applicant_auth_algorithm")
    != "Ed25519"
    or manifest.get("applicant_auth_marker")
    != (
        "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V1"
    )
    or manifest.get("applicant_auth_ttl_seconds")
    != 30
    or manifest.get(
        "applicant_auth_ttl_seconds_maximum"
    )
    != 60
    or manifest.get("applicant_identity_scheme")
    != "void-agent:ed25519"
    or manifest.get(
        "applicant_identity_must_match_inner_agent_id"
    )
    is not True
    or manifest.get(
        "applicant_identity_private_key_required_by_client"
    )
    is not True
    or manifest.get(
        "applicant_identity_private_key_is_wallet_key"
    )
    is not False
    or manifest.get(
        "applicant_auth_forwarded_to_review_gateway"
    )
    is not False
):
    raise SystemExit(
        "HOLD: packet manifest identity mismatch"
    )

endpoint = urlsplit(
    str(
        manifest.get(
            "submission_endpoint"
        )
        or ""
    )
)

if (
    endpoint.scheme != "https"
    or endpoint.hostname
    != (
        "zoso-precision-tower-7810."
        "taila47fd.ts.net"
    )
    or endpoint.port != 10000
    or endpoint.path
    != (
        "/__void/agents/paid-work/"
        "credential-requests/v1"
    )
    or endpoint.query
    or endpoint.fragment
):
    raise SystemExit(
        "HOLD: packet submission endpoint mismatch"
    )

lines = CHECKSUMS.read_text(
    encoding="utf-8"
).splitlines()
seen: set[str] = set()

for line in lines:
    expected, relative = line.split(
        "  ",
        1,
    )

    if relative in seen:
        raise SystemExit(
            f"HOLD: duplicate checksum entry: {relative}"
        )

    seen.add(relative)

    if relative not in EXPECTED_FILES:
        raise SystemExit(
            f"HOLD: unexpected checksum path: {relative}"
        )

    if sha(ROOT / relative) != expected:
        raise SystemExit(
            f"HOLD: checksum mismatch: {relative}"
        )

if seen != EXPECTED_FILES:
    raise SystemExit(
        "HOLD: checksum file set mismatch"
    )

print(
    "VOID_EXTERNAL_AGENT_CREDENTIAL_REQUEST_PACKET_V1_VERIFIED=true"
)
print(
    "activation_state=public_review_request_live"
)
print(
    "credential_created=false"
)
print(
    "raw_token_required=false"
)
print(
    "applicant_auth_required=true"
)
print(
    "applicant_identity_scheme=void-agent:ed25519"
)
print(
    "applicant_identity_private_key_is_wallet_key=false"
)

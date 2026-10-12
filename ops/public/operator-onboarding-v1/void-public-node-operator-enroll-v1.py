#!/usr/bin/env python3
"""Create a signed, sanitized VOID public-node operator submission bundle."""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import hashlib
import ipaddress
import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Any

MARKER = "VOID_PUBLIC_NODE_OPERATOR_RECORD_V1"
SUBMISSION_MARKER = "VOID_PUBLIC_NODE_OPERATOR_SUBMISSION_V1"
NETWORK = "Mainnet-0"
NAMESPACE = "void-public-node-manifest-v1"
SCHEME = "sshsig-ed25519-v1"
CANONICALIZATION = "void-canonical-json-v1"
PREFIX = b"VOID-PUBLIC-NODE-MANIFEST-V1\n"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{1,63}$")
RESERVED_NODE_KEYS = {"precision", "nimo", "alienware"}
BANNED_FIELD_TOKENS = {
    "address", "endpoint", "hostname", "host", "ip", "url", "uri", "credential",
    "password", "secret", "token", "private", "privatekey", "seed", "mnemonic",
    "wallet", "ssh", "tls", "api", "apikey",
}


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def public_key_line(raw: str) -> str:
    parts = raw.strip().split()
    if len(parts) < 2 or parts[0] != "ssh-ed25519":
        raise ValueError("only OpenSSH Ed25519 public keys are supported")
    return " ".join(parts[:2])


def fingerprint(pub_line: str) -> str:
    with tempfile.TemporaryDirectory(prefix="void-operator-key-") as temp:
        path = Path(temp) / "key.pub"
        path.write_text(public_key_line(pub_line) + "\n", encoding="utf-8")
        cp = subprocess.run(
            ["ssh-keygen", "-lf", str(path), "-E", "sha256"],
            text=True,
            capture_output=True,
            check=False,
        )
        if cp.returncode != 0:
            raise RuntimeError(cp.stderr.strip() or "unable to fingerprint public key")
        match = re.search(r"(SHA256:[A-Za-z0-9+/=]+)", cp.stdout)
        if not match:
            raise RuntimeError("OpenSSH fingerprint unavailable")
        return match.group(1)


def private_string(value: str) -> bool:
    text = value.strip()
    if not text:
        return False
    lowered = text.lower()
    if any(token in lowered for token in ("http://", "https://", "ssh://", "file://", "tailscale://")):
        return True
    if text.startswith(("/", "~/", "\\")) or re.match(r"^[A-Za-z]:[\\/]", text):
        return True
    if re.search(r"\b[^\s@]+@[^\s@]+\.[^\s@]+\b", text):
        return True
    if re.search(r"\b(?:localhost|[A-Za-z0-9._-]+\.(?:local|lan|internal|ts\.net))(?::\d{1,5})?\b", lowered):
        return True
    for candidate in re.findall(
        r"(?<![A-Za-z0-9])(?:\[[0-9A-Fa-f:.]+\]|[0-9A-Fa-f:.]*:[0-9A-Fa-f:.]+|(?:\d{1,3}\.){3}\d{1,3})(?![A-Za-z0-9])",
        text,
    ):
        try:
            ipaddress.ip_address(candidate.strip("[]"))
            return True
        except ValueError:
            pass
    return False


def forbidden_paths(value: Any, path: str = "$") -> list[str]:
    findings: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = str(key).lower().replace("-", "_")
            tokens = {token for token in re.split(r"[^a-z0-9]+", normalized) if token}
            if normalized in BANNED_FIELD_TOKENS or tokens.intersection(BANNED_FIELD_TOKENS):
                findings.append(f"{path}.{key}")
            findings.extend(forbidden_paths(child, f"{path}.{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value[:256]):
            findings.extend(forbidden_paths(child, f"{path}[{index}]"))
    elif isinstance(value, str) and private_string(value):
        findings.append(path)
    return findings[:32]


def canonical_bytes(document: dict[str, Any]) -> bytes:
    clone = copy.deepcopy(document)
    provenance = clone.get("provenance")
    if isinstance(provenance, dict):
        provenance.pop("signature", None)
        provenance.pop("verification", None)
        provenance.pop("verified_at", None)
    encoded = json.dumps(
        clone,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")
    return PREFIX + encoded


def verify_with_public_key(document: dict[str, Any], public_key: str) -> None:
    operator_id = document["operator_id"]
    provenance = document["provenance"]
    with tempfile.TemporaryDirectory(prefix="void-operator-self-verify-") as temp:
        temp_dir = Path(temp)
        signature = temp_dir / "manifest.sig"
        allowed = temp_dir / "allowed_signers"
        signature.write_text(provenance["signature"].strip() + "\n", encoding="utf-8")
        allowed.write_text(
            f'{operator_id} namespaces="{NAMESPACE}" {public_key_line(public_key)}\n',
            encoding="utf-8",
        )
        cp = subprocess.run(
            [
                "ssh-keygen", "-Y", "verify", "-f", str(allowed), "-I", operator_id,
                "-n", NAMESPACE, "-s", str(signature),
            ],
            input=canonical_bytes(document),
            capture_output=True,
            check=False,
        )
        if cp.returncode != 0:
            raise RuntimeError(cp.stderr.decode("utf-8", "replace").strip() or "self-verification failed")


def zip_write_bytes(archive: zipfile.ZipFile, name: str, data: bytes, mode: int = 0o644) -> None:
    info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = (mode & 0xFFFF) << 16
    info.create_system = 3
    archive.writestr(info, data)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--operator-id", required=True)
    parser.add_argument("--node-key", required=True)
    parser.add_argument("--label", required=True)
    parser.add_argument("--operator-label", required=True)
    parser.add_argument("--region-label", default="")
    parser.add_argument("--description", required=True)
    parser.add_argument("--key-dir", default=str(Path.home() / ".config/void/operator-keys"))
    parser.add_argument("--output-dir", default=".")
    parser.add_argument("--force-new-key", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if shutil.which("ssh-keygen") is None:
        raise SystemExit("ssh-keygen is required")
    operator_id = args.operator_id.strip().lower()
    node_key = args.node_key.strip().lower()
    if not ID_RE.fullmatch(operator_id):
        raise SystemExit("operator id must match [a-z0-9][a-z0-9._-]{1,63}")
    if not ID_RE.fullmatch(node_key) or node_key in RESERVED_NODE_KEYS:
        raise SystemExit("node key is invalid or reserved")
    for label, value, limit in (
        ("label", args.label, 80),
        ("operator label", args.operator_label, 80),
        ("region label", args.region_label, 48),
        ("description", args.description, 120),
    ):
        if not value.strip() and label != "region label":
            raise SystemExit(f"{label} is required")
        if len(value) > limit or private_string(value):
            raise SystemExit(f"{label} is unsafe or exceeds {limit} characters")

    key_dir = Path(args.key_dir).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()
    key_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    if key_dir.is_symlink() or output_dir.is_symlink():
        raise SystemExit("refusing symlinked key or output directory")
    key_dir.chmod(0o700)
    output_dir.chmod(0o700)
    private_key = key_dir / f"{operator_id}.ed25519"
    public_key_path = Path(str(private_key) + ".pub")
    if private_key.exists() and not args.force_new_key:
        raise SystemExit(f"private key already exists: {private_key}")
    if args.force_new_key:
        for path in (private_key, public_key_path):
            try:
                path.unlink()
            except FileNotFoundError:
                pass

    subprocess.run(
        [
            "ssh-keygen", "-q", "-t", "ed25519", "-N", "",
            "-C", f"void-operator:{operator_id}", "-f", str(private_key),
        ],
        check=True,
    )
    private_key.chmod(0o600)
    public_key = public_key_line(public_key_path.read_text(encoding="utf-8"))
    key_id = fingerprint(public_key)
    signed_at = now_utc()

    document: dict[str, Any] = {
        "marker": MARKER,
        "read_only": True,
        "network": NETWORK,
        "operator_id": operator_id,
        "node": {
            "key": node_key,
            "label": args.label.strip(),
            "operator_label": args.operator_label.strip(),
            "region_label": args.region_label.strip() or None,
            "description": args.description.strip(),
            "role": "node",
            "role_label": "Network node",
            "roles": ["operator"],
            "capabilities": ["relay"],
            "validator": False,
            "source_kind": "operator_manifest_file",
            "source_complete": False,
            "observed_at": signed_at,
            "ready": None,
            "txroot_live": None,
            "reasons": ["readiness_not_published"],
            "chain_head": None,
            "peer_count": None,
            "expected_peer_count": None,
        },
        "provenance": {
            "scheme": SCHEME,
            "namespace": NAMESPACE,
            "canonicalization": CANONICALIZATION,
            "operator_id": operator_id,
            "key_id": key_id,
            "signed_at": signed_at,
        },
    }
    findings = forbidden_paths(document)
    if findings:
        raise SystemExit("manifest failed public-safety validation: " + ", ".join(findings))

    with tempfile.TemporaryDirectory(prefix="void-operator-sign-") as temp:
        payload = Path(temp) / "manifest.payload"
        payload.write_bytes(canonical_bytes(document))
        cp = subprocess.run(
            [
                "ssh-keygen", "-Y", "sign", "-f", str(private_key),
                "-n", NAMESPACE, "-O", "hashalg=sha512", str(payload),
            ],
            text=True,
            capture_output=True,
            check=False,
        )
        if cp.returncode != 0:
            raise SystemExit(cp.stderr.strip() or "ssh-keygen signing failed")
        signature_path = Path(str(payload) + ".sig")
        document["provenance"]["signature"] = signature_path.read_text(encoding="utf-8").strip()

    verify_with_public_key(document, public_key)

    manifest_bytes = (
        json.dumps(document, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    ).encode("utf-8")
    metadata = {
        "marker": SUBMISSION_MARKER,
        "schema_version": 1,
        "created_at": now_utc(),
        "operator_id": operator_id,
        "node_key": node_key,
        "key_id": key_id,
        "public_key_algorithm": "ssh-ed25519",
        "manifest_file": "operator-manifest-v1.json",
        "public_key_file": "operator-public-key-v1.pub",
        "authority": {
            "key_control_proof_only": True,
            "trust_admission_performed": False,
            "validator_admission_performed": False,
            "ledger_authority": False,
            "wallet_authority": False,
            "settlement_authority": False,
            "mutation_authority": False,
        },
    }
    metadata_bytes = (json.dumps(metadata, indent=2, sort_keys=True) + "\n").encode("utf-8")
    public_key_bytes = (public_key + "\n").encode("utf-8")
    checksums = {
        "operator-manifest-v1.json": hashlib.sha256(manifest_bytes).hexdigest(),
        "operator-public-key-v1.pub": hashlib.sha256(public_key_bytes).hexdigest(),
        "operator-submission-v1.json": hashlib.sha256(metadata_bytes).hexdigest(),
    }
    sums_bytes = "".join(
        f"{digest}  {name}\n" for name, digest in sorted(checksums.items())
    ).encode("utf-8")

    bundle = output_dir / f"void-operator-submission-{operator_id}-{node_key}.zip"
    if bundle.exists():
        raise SystemExit(f"submission bundle already exists: {bundle}")
    with zipfile.ZipFile(bundle, "w") as archive:
        zip_write_bytes(archive, "operator-manifest-v1.json", manifest_bytes, 0o600)
        zip_write_bytes(archive, "operator-public-key-v1.pub", public_key_bytes, 0o644)
        zip_write_bytes(archive, "operator-submission-v1.json", metadata_bytes, 0o644)
        zip_write_bytes(archive, "SHA256SUMS.txt", sums_bytes, 0o644)

    with zipfile.ZipFile(bundle) as archive:
        names = sorted(archive.namelist())
    expected = [
        "SHA256SUMS.txt",
        "operator-manifest-v1.json",
        "operator-public-key-v1.pub",
        "operator-submission-v1.json",
    ]
    if names != expected or any("private" in name.lower() for name in names):
        bundle.unlink(missing_ok=True)
        raise SystemExit("submission archive boundary failed")

    bundle_sha256 = hashlib.sha256(bundle.read_bytes()).hexdigest()
    print(json.dumps({
        "ok": True,
        "marker": SUBMISSION_MARKER,
        "bundle": str(bundle),
        "bundle_sha256": bundle_sha256,
        "operator_id": operator_id,
        "node_key": node_key,
        "key_id": key_id,
        "private_key": str(private_key),
        "private_key_in_bundle": False,
        "validator_admission_performed": False,
        "trust_admission_performed": False,
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

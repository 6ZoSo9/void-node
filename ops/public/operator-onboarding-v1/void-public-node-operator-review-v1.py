#!/usr/bin/env python3
"""Review a VOID signed operator submission without modifying the trust store."""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import hashlib
import ipaddress
import json
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Any

MARKER = "VOID_PUBLIC_NODE_OPERATOR_RECORD_V1"
SUBMISSION_MARKER = "VOID_PUBLIC_NODE_OPERATOR_SUBMISSION_V1"
REVIEW_MARKER = "VOID_PUBLIC_NODE_OPERATOR_REVIEW_V1"
NETWORK = "Mainnet-0"
NAMESPACE = "void-public-node-manifest-v1"
SCHEME = "sshsig-ed25519-v1"
CANONICALIZATION = "void-canonical-json-v1"
PREFIX = b"VOID-PUBLIC-NODE-MANIFEST-V1\n"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{1,63}$")
EXPECTED_FILES = {
    "SHA256SUMS.txt",
    "operator-manifest-v1.json",
    "operator-public-key-v1.pub",
    "operator-submission-v1.json",
}
BANNED_FIELD_TOKENS = {
    "address", "endpoint", "hostname", "host", "ip", "url", "uri", "credential",
    "password", "secret", "token", "private", "privatekey", "seed", "mnemonic",
    "wallet", "ssh", "tls", "api", "apikey",
}


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def parse_time(value: Any) -> dt.datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc)
    except ValueError:
        return None


def public_key_line(raw: str) -> str:
    parts = raw.strip().split()
    if len(parts) < 2 or parts[0] != "ssh-ed25519":
        raise ValueError("only OpenSSH Ed25519 public keys are supported")
    return " ".join(parts[:2])


def fingerprint(pub_line: str) -> str:
    with tempfile.TemporaryDirectory(prefix="void-review-key-") as temp:
        path = Path(temp) / "key.pub"
        path.write_text(public_key_line(pub_line) + "\n", encoding="utf-8")
        cp = subprocess.run(
            ["ssh-keygen", "-lf", str(path), "-E", "sha256"],
            text=True,
            capture_output=True,
            check=False,
        )
        if cp.returncode:
            raise RuntimeError(cp.stderr.strip() or "fingerprint failed")
        match = re.search(r"(SHA256:[A-Za-z0-9+/=]+)", cp.stdout)
        if not match:
            raise RuntimeError("fingerprint unavailable")
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
    return PREFIX + json.dumps(
        clone,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"JSON object required: {path.name}")
    return value


def parse_sums(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        match = re.fullmatch(r"([0-9a-f]{64})  ([A-Za-z0-9._-]+)", line)
        if not match:
            raise ValueError("invalid SHA256SUMS format")
        result[match.group(2)] = match.group(1)
    return result


def safe_extract(bundle: Path, destination: Path) -> None:
    if bundle.is_dir():
        names = {path.name for path in bundle.iterdir() if path.is_file()}
        if names != EXPECTED_FILES:
            raise ValueError(f"bundle directory file set mismatch: {sorted(names)}")
        for name in EXPECTED_FILES:
            shutil.copy2(bundle / name, destination / name)
        return
    if not zipfile.is_zipfile(bundle):
        raise ValueError("bundle must be a ZIP or extracted directory")
    with zipfile.ZipFile(bundle) as archive:
        names = set(archive.namelist())
        if names != EXPECTED_FILES:
            raise ValueError(f"ZIP member set mismatch: {sorted(names)}")
        for info in archive.infolist():
            if info.is_dir() or Path(info.filename).name != info.filename or info.file_size > 131072:
                raise ValueError("unsafe ZIP member")
            (destination / info.filename).write_bytes(archive.read(info))


def verify_signature(document: dict[str, Any], public_key: str) -> None:
    operator_id = document["operator_id"]
    provenance = document["provenance"]
    with tempfile.TemporaryDirectory(prefix="void-review-signature-") as temp:
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
        if cp.returncode:
            raise ValueError(cp.stderr.decode("utf-8", "replace").strip() or "signature verification failed")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", required=True)
    parser.add_argument("--output")
    parser.add_argument("--max-age-hours", type=float, default=72.0)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if shutil.which("ssh-keygen") is None:
        raise SystemExit("ssh-keygen is required")
    bundle = Path(args.bundle).expanduser().resolve()
    failures: list[str] = []
    checks: dict[str, Any] = {}
    operator_id = None
    node_key = None
    key_id = None

    try:
        with tempfile.TemporaryDirectory(prefix="void-operator-review-") as temp:
            root = Path(temp)
            safe_extract(bundle, root)
            sums = parse_sums(root / "SHA256SUMS.txt")
            expected_sum_names = EXPECTED_FILES - {"SHA256SUMS.txt"}
            if set(sums) != expected_sum_names:
                raise ValueError("checksum member set mismatch")
            for name, expected in sums.items():
                actual = hashlib.sha256((root / name).read_bytes()).hexdigest()
                if actual != expected:
                    raise ValueError(f"checksum mismatch: {name}")
            checks["checksums"] = True

            document = load_json(root / "operator-manifest-v1.json")
            metadata = load_json(root / "operator-submission-v1.json")
            public_key = public_key_line(
                (root / "operator-public-key-v1.pub").read_text(encoding="utf-8")
            )
            if (
                document.get("marker") != MARKER
                or document.get("read_only") is not True
                or document.get("network") != NETWORK
            ):
                raise ValueError("manifest boundary mismatch")

            operator_id = document.get("operator_id")
            node = document.get("node")
            node_key = node.get("key") if isinstance(node, dict) else None
            provenance = document.get("provenance")
            if not isinstance(operator_id, str) or not ID_RE.fullmatch(operator_id):
                raise ValueError("invalid operator identity")
            if not isinstance(node_key, str) or not ID_RE.fullmatch(node_key):
                raise ValueError("invalid node identity")
            if (
                not isinstance(node, dict)
                or node.get("validator") is not False
                or node.get("source_complete") is not False
            ):
                raise ValueError("manifest authority/readiness boundary mismatch")
            if forbidden_paths(document):
                raise ValueError("manifest contains private or endpoint-like fields/values")

            if (
                metadata.get("marker") != SUBMISSION_MARKER
                or metadata.get("operator_id") != operator_id
                or metadata.get("node_key") != node_key
            ):
                raise ValueError("submission metadata identity mismatch")

            authority = metadata.get("authority")
            if not isinstance(authority, dict) or authority.get("key_control_proof_only") is not True:
                raise ValueError("submission authority boundary missing")
            for field in (
                "trust_admission_performed",
                "validator_admission_performed",
                "ledger_authority",
                "wallet_authority",
                "settlement_authority",
                "mutation_authority",
            ):
                if authority.get(field) is not False:
                    raise ValueError(f"authority boundary violated: {field}")

            if not isinstance(provenance, dict):
                raise ValueError("provenance object missing")
            if (
                provenance.get("scheme") != SCHEME
                or provenance.get("namespace") != NAMESPACE
                or provenance.get("canonicalization") != CANONICALIZATION
            ):
                raise ValueError("provenance schema mismatch")
            if (
                provenance.get("operator_id") != operator_id
                or not isinstance(provenance.get("signature"), str)
            ):
                raise ValueError("provenance identity/signature mismatch")

            key_id = fingerprint(public_key)
            if provenance.get("key_id") != key_id or metadata.get("key_id") != key_id:
                raise ValueError("public-key fingerprint mismatch")

            signed_at = parse_time(provenance.get("signed_at"))
            if signed_at is None:
                raise ValueError("signed_at missing or invalid")
            now = dt.datetime.now(dt.timezone.utc)
            age_hours = (now - signed_at).total_seconds() / 3600
            if age_hours < -(5 / 60):
                raise ValueError("signature timestamp is in the future")
            if age_hours > max(1.0, args.max_age_hours):
                raise ValueError("submission signature is too old for review")

            verify_signature(document, public_key)
            checks.update({
                "structure": True,
                "public_safety": True,
                "identity_binding": True,
                "signature_valid": True,
                "signature_age_hours": round(age_hours, 6),
                "private_key_absent": True,
            })
    except Exception as error:
        failures.append(str(error))

    passed = not failures
    report = {
        "marker": REVIEW_MARKER,
        "reviewed_at": now_utc(),
        "bundle": bundle.name,
        "bundle_sha256": hashlib.sha256(bundle.read_bytes()).hexdigest() if bundle.is_file() else None,
        "operator_id": operator_id,
        "node_key": node_key,
        "key_id": key_id,
        "status": "passed" if passed else "failed",
        "checks": checks,
        "failures": failures,
        "decision_boundary": {
            "cryptographic_key_control_proven": passed,
            "trust_admission_performed": False,
            "validator_admission_performed": False,
            "ledger_authority": False,
            "wallet_authority": False,
            "settlement_authority": False,
            "mutation_authority": False,
            "recommended_next_action": (
                "manual operator review before any trust-add"
                if passed
                else "reject or request corrected submission"
            ),
        },
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        output = Path(args.output).expanduser().resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded, encoding="utf-8")
    print(encoded, end="")
    return 0 if passed else 2


if __name__ == "__main__":
    raise SystemExit(main())

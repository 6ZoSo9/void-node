#!/usr/bin/env python3
"""Create or verify a signed VOID public-node operator evidence attestation."""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import hashlib
import ipaddress
import json
import re
import shutil
import stat
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Any

ATTESTATION_MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_V1"
SUBMISSION_MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_SUBMISSION_V1"
REVIEW_MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_REVIEW_V1"
NETWORK = "Mainnet-0"
NAMESPACE = "void-public-node-evidence-attestation-v1"
SCHEME = "sshsig-ed25519-v1"
CANONICALIZATION = "void-canonical-json-v1"
PREFIX = b"VOID-PUBLIC-NODE-EVIDENCE-ATTESTATION-V1\n"

PACK_MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1"
PACK_REVIEW_MARKER = "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_REVIEW_V1"
ROOT = Path(__file__).resolve().parents[3]
PACK_REVIEW_TOOL = ROOT / "tools/public-node-operator-evidence-pack-review-v1.mjs"

ID_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{1,63}$")
EXPECTED_PACK_FILES = {
    "SHA256SUMS.txt",
    "operator-evidence-pack-v1.json",
    "operator-self-check-receipt-review-v1.json",
    "operator-self-check-v1.json",
}
EXPECTED_BUNDLE_FILES = {
    "SHA256SUMS.txt",
    "operator-evidence-attestation-metadata-v1.json",
    "operator-evidence-attestation-v1.json",
    "operator-public-key-v1.pub",
}
AUTHORITY_FALSE_FIELDS = (
    "trust_admission_performed",
    "validator_admission_performed",
    "ledger_authority",
    "wallet_authority",
    "settlement_authority",
    "mutation_authority",
    "peer_state_write_authority",
    "ticket_claim_authority",
    "buy_void_fulfillment_authority",
)


def now_utc() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def parse_time(value: Any) -> dt.datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def load_json(path: Path, label: str) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be a JSON object")
    return value


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def public_key_line(raw: str) -> str:
    parts = raw.strip().split()
    if len(parts) < 2 or parts[0] != "ssh-ed25519":
        raise ValueError("only OpenSSH Ed25519 public keys are supported")
    return " ".join(parts[:2])


def derive_public_key(private_key: Path) -> str:
    cp = subprocess.run(
        ["ssh-keygen", "-y", "-f", str(private_key)],
        text=True,
        capture_output=True,
        check=False,
    )
    if cp.returncode != 0:
        raise RuntimeError(cp.stderr.strip() or "unable to derive public key")
    return public_key_line(cp.stdout)


def fingerprint(public_key: str) -> str:
    with tempfile.TemporaryDirectory(prefix="void-evidence-attest-key-") as temp:
        key_path = Path(temp) / "key.pub"
        key_path.write_text(public_key_line(public_key) + "\n", encoding="utf-8")
        cp = subprocess.run(
            ["ssh-keygen", "-lf", str(key_path), "-E", "sha256"],
            text=True,
            capture_output=True,
            check=False,
        )
        if cp.returncode != 0:
            raise RuntimeError(cp.stderr.strip() or "unable to fingerprint key")
        match = re.search(r"(SHA256:[A-Za-z0-9+/=]+)", cp.stdout)
        if not match:
            raise RuntimeError("OpenSSH fingerprint unavailable")
        return match.group(1)


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


def private_string(value: str) -> bool:
    text = value.strip()
    if not text:
        return False
    lowered = text.lower()
    if any(token in lowered for token in (
        "http://", "https://", "ssh://", "file://", "tailscale://"
    )):
        return True
    if text.startswith(("/", "~/", "\\")) or re.match(r"^[A-Za-z]:[\\/]", text):
        return True
    if re.search(r"\b[^\s@]+@[^\s@]+\.[^\s@]+\b", text):
        return True
    if re.search(r"-----BEGIN (?:OPENSSH|RSA|EC|PRIVATE) KEY-----", text):
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


def public_safety_findings(value: Any, path: str = "$") -> list[str]:
    findings: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = str(key).lower().replace("-", "_")
            if normalized in {
                "address", "endpoint", "hostname", "host", "ip", "url", "uri",
                "credential", "password", "secret", "token", "private",
                "private_key", "seed", "mnemonic", "wallet",
            }:
                findings.append(f"{path}.{key}")
            findings.extend(public_safety_findings(child, f"{path}.{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value[:512]):
            findings.extend(public_safety_findings(child, f"{path}[{index}]"))
    elif isinstance(value, str) and private_string(value):
        findings.append(path)
    return findings[:32]


def validate_private_key(path: Path) -> None:
    expanded = path.expanduser()
    if expanded.is_symlink():
        raise ValueError("private key must be a regular non-symlink file")
    resolved = expanded.resolve()
    stat_result = resolved.lstat()
    if not stat.S_ISREG(stat_result.st_mode):
        raise ValueError("private key must be a regular non-symlink file")
    if stat_result.st_mode & 0o077:
        raise ValueError("private key permissions must not allow group or other access")


def validate_pack_directory(pack_dir: Path) -> None:
    expanded = pack_dir.expanduser()
    if expanded.is_symlink():
        raise ValueError("pack directory must be a real directory")
    resolved = expanded.resolve()
    stat_result = resolved.lstat()
    if not stat.S_ISDIR(stat_result.st_mode):
        raise ValueError("pack directory must be a real directory")
    names = {child.name for child in resolved.iterdir()}
    if names != EXPECTED_PACK_FILES:
        raise ValueError(f"evidence pack member set mismatch: {sorted(names)}")


def run_pack_review(pack_dir: Path, allow_hold: bool) -> dict[str, Any]:
    if not PACK_REVIEW_TOOL.is_file():
        raise ValueError("merged evidence-pack reviewer is missing")
    with tempfile.TemporaryDirectory(prefix="void-evidence-pack-review-") as temp:
        output = Path(temp) / "review.json"
        command = [
            "node",
            str(PACK_REVIEW_TOOL),
            "--pack-dir",
            str(pack_dir),
            "--output",
            str(output),
        ]
        if not allow_hold:
            command.append("--require-green")
        cp = subprocess.run(command, text=True, capture_output=True, check=False)
        if cp.returncode != 0:
            detail = (cp.stderr or cp.stdout).strip()
            raise ValueError(
                f"evidence-pack review failed with exit {cp.returncode}"
                + (f": {detail[:500]}" if detail else "")
            )
        report = load_json(output, "evidence-pack review")
    if (
        report.get("marker") != PACK_REVIEW_MARKER
        or report.get("accepted") is not True
        or report.get("offline") is not True
    ):
        raise ValueError("evidence-pack review contract mismatch")
    if not allow_hold and report.get("pack_status") != "green":
        raise ValueError("green evidence pack required")
    return report


def evidence_facts(pack_dir: Path, review: dict[str, Any]) -> dict[str, Any]:
    manifest_path = pack_dir / "operator-evidence-pack-v1.json"
    receipt_path = pack_dir / "operator-self-check-v1.json"
    receipt_review_path = pack_dir / "operator-self-check-receipt-review-v1.json"
    checksums_path = pack_dir / "SHA256SUMS.txt"

    manifest = load_json(manifest_path, "evidence-pack manifest")
    if manifest.get("marker") != PACK_MARKER:
        raise ValueError("evidence-pack manifest marker mismatch")
    status = manifest.get("status")
    if status not in {"green", "hold"}:
        raise ValueError("evidence-pack status invalid")
    if review.get("pack_status") != status:
        raise ValueError("evidence-pack review status mismatch")
    source_contracts = manifest.get("source_contracts")
    if not isinstance(source_contracts, dict):
        raise ValueError("evidence-pack source contracts missing")

    facts = {
        "pack_marker": PACK_MARKER,
        "status": status,
        "gate": manifest.get("gate"),
        "created_at": manifest.get("created_at"),
        "allow_hold": manifest.get("allow_hold"),
        "artifacts": {
            "manifest": {
                "name": manifest_path.name,
                "sha256": sha256_file(manifest_path),
            },
            "receipt": {
                "name": receipt_path.name,
                "sha256": sha256_file(receipt_path),
            },
            "receipt_review": {
                "name": receipt_review_path.name,
                "sha256": sha256_file(receipt_review_path),
            },
            "checksums": {
                "name": checksums_path.name,
                "sha256": sha256_file(checksums_path),
            },
        },
        "bindings": {
            "pack_review_accepted": True,
            "pack_review_offline": True,
            "review_receipt_sha256_matches": (
                manifest.get("bindings", {}).get(
                    "review_receipt_sha256_matches"
                ) is True
            ),
            "receipt_status_matches_review": (
                manifest.get("bindings", {}).get(
                    "receipt_status_matches_review"
                ) is True
            ),
        },
        "source_contracts": source_contracts,
        "safety": {
            "raw_target_included": False,
            "raw_pack_path_included": False,
            "artifact_bodies_included": False,
            "credentials_included": False,
            "mutation_attempted": False,
        },
    }
    if any(value is not True for value in facts["bindings"].values()):
        raise ValueError("evidence-pack binding facts are not all true")
    findings = public_safety_findings(facts)
    if findings:
        raise ValueError(
            "evidence facts failed public-safety validation: "
            + ", ".join(findings)
        )
    return facts


def sign_document(document: dict[str, Any], private_key: Path) -> str:
    with tempfile.TemporaryDirectory(prefix="void-evidence-attest-sign-") as temp:
        payload = Path(temp) / "attestation.payload"
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
            raise RuntimeError(cp.stderr.strip() or "ssh-keygen signing failed")
        return Path(str(payload) + ".sig").read_text(encoding="utf-8").strip()


def verify_signature(
    document: dict[str, Any], public_key: str, operator_id: str
) -> None:
    with tempfile.TemporaryDirectory(prefix="void-evidence-attest-verify-") as temp:
        temp_dir = Path(temp)
        signature = temp_dir / "attestation.sig"
        allowed = temp_dir / "allowed_signers"
        signature.write_text(
            str(document["provenance"]["signature"]).strip() + "\n",
            encoding="utf-8",
        )
        allowed.write_text(
            f'{operator_id} namespaces="{NAMESPACE}" '
            f'{public_key_line(public_key)}\n',
            encoding="utf-8",
        )
        cp = subprocess.run(
            [
                "ssh-keygen", "-Y", "verify", "-f", str(allowed),
                "-I", operator_id, "-n", NAMESPACE, "-s", str(signature),
            ],
            input=canonical_bytes(document),
            capture_output=True,
            check=False,
        )
        if cp.returncode != 0:
            detail = cp.stderr.decode("utf-8", "replace").strip()
            raise ValueError(detail or "attestation signature verification failed")


def zip_write_bytes(
    archive: zipfile.ZipFile, name: str, data: bytes, mode: int = 0o644
) -> None:
    info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = (mode & 0xFFFF) << 16
    info.create_system = 3
    archive.writestr(info, data)


def parse_sums(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        match = re.fullmatch(r"([0-9a-f]{64})  ([A-Za-z0-9._-]+)", line)
        if not match:
            raise ValueError("invalid SHA256SUMS format")
        if match.group(2) in result:
            raise ValueError("duplicate SHA256SUMS member")
        result[match.group(2)] = match.group(1)
    return result


def safe_extract(bundle: Path, destination: Path) -> None:
    if not zipfile.is_zipfile(bundle):
        raise ValueError("attestation bundle must be a ZIP")
    with zipfile.ZipFile(bundle) as archive:
        names = set(archive.namelist())
        if names != EXPECTED_BUNDLE_FILES:
            raise ValueError(f"attestation ZIP member set mismatch: {sorted(names)}")
        for info in archive.infolist():
            if (
                info.is_dir()
                or Path(info.filename).name != info.filename
                or info.file_size > 512 * 1024
            ):
                raise ValueError("unsafe attestation ZIP member")
            (destination / info.filename).write_bytes(archive.read(info))


def validate_authority(authority: Any) -> None:
    if not isinstance(authority, dict):
        raise ValueError("authority boundary missing")
    if authority.get("key_control_proof_only") is not True:
        raise ValueError("key-control-only boundary missing")
    for field in AUTHORITY_FALSE_FIELDS:
        if authority.get(field) is not False:
            raise ValueError(f"authority boundary violated: {field}")


def create_attestation(args: argparse.Namespace) -> int:
    if shutil.which("ssh-keygen") is None:
        raise SystemExit("ssh-keygen is required")
    operator_id = args.operator_id.strip().lower()
    node_key = args.node_key.strip().lower()
    if not ID_RE.fullmatch(operator_id):
        raise SystemExit("operator id must match [a-z0-9][a-z0-9._-]{1,63}")
    if not ID_RE.fullmatch(node_key):
        raise SystemExit("node key must match [a-z0-9][a-z0-9._-]{1,63}")

    private_key = Path(
        args.private_key
        or (Path.home() / ".config/void/operator-keys" / f"{operator_id}.ed25519")
    ).expanduser().resolve()
    validate_private_key(private_key)
    public_key = derive_public_key(private_key)
    key_id = fingerprint(public_key)

    pack_dir = Path(args.pack_dir).expanduser().resolve()
    validate_pack_directory(pack_dir)
    pack_review = run_pack_review(pack_dir, args.allow_hold)
    facts = evidence_facts(pack_dir, pack_review)

    signed_at = now_utc()
    authority = {
        "key_control_proof_only": True,
        **{field: False for field in AUTHORITY_FALSE_FIELDS},
    }
    document: dict[str, Any] = {
        "marker": ATTESTATION_MARKER,
        "schema_version": 1,
        "read_only": True,
        "network": NETWORK,
        "operator_id": operator_id,
        "node_key": node_key,
        "evidence": facts,
        "authority": authority,
        "provenance": {
            "scheme": SCHEME,
            "namespace": NAMESPACE,
            "canonicalization": CANONICALIZATION,
            "operator_id": operator_id,
            "key_id": key_id,
            "signed_at": signed_at,
        },
    }
    findings = public_safety_findings(document)
    if findings:
        raise SystemExit(
            "attestation failed public-safety validation: "
            + ", ".join(findings)
        )

    document["provenance"]["signature"] = sign_document(document, private_key)
    verify_signature(document, public_key, operator_id)

    attestation_bytes = (
        json.dumps(document, indent=2, sort_keys=True, ensure_ascii=False)
        + "\n"
    ).encode("utf-8")
    public_key_bytes = (public_key + "\n").encode("utf-8")
    metadata = {
        "marker": SUBMISSION_MARKER,
        "schema_version": 1,
        "created_at": now_utc(),
        "operator_id": operator_id,
        "node_key": node_key,
        "key_id": key_id,
        "public_key_algorithm": "ssh-ed25519",
        "attestation_file": "operator-evidence-attestation-v1.json",
        "public_key_file": "operator-public-key-v1.pub",
        "authority": authority,
        "private_key_in_bundle": False,
        "evidence_pack_in_bundle": False,
    }
    metadata_bytes = (
        json.dumps(metadata, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")
    checksums = {
        "operator-evidence-attestation-v1.json": sha256_bytes(attestation_bytes),
        "operator-public-key-v1.pub": sha256_bytes(public_key_bytes),
        "operator-evidence-attestation-metadata-v1.json": sha256_bytes(
            metadata_bytes
        ),
    }
    sums_bytes = "".join(
        f"{digest}  {name}\n" for name, digest in sorted(checksums.items())
    ).encode("utf-8")

    output_candidate = Path(args.output_dir).expanduser()
    if output_candidate.is_symlink():
        raise SystemExit("refusing symlinked output directory")
    output_dir = output_candidate.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    output_dir.chmod(0o700)
    bundle = output_dir / (
        f"void-operator-evidence-attestation-{operator_id}-{node_key}.zip"
    )
    if bundle.exists():
        raise SystemExit(f"attestation bundle already exists: {bundle}")

    with zipfile.ZipFile(bundle, "w") as archive:
        zip_write_bytes(
            archive, "operator-evidence-attestation-v1.json",
            attestation_bytes, 0o644
        )
        zip_write_bytes(
            archive, "operator-public-key-v1.pub", public_key_bytes, 0o644
        )
        zip_write_bytes(
            archive,
            "operator-evidence-attestation-metadata-v1.json",
            metadata_bytes,
            0o644,
        )
        zip_write_bytes(archive, "SHA256SUMS.txt", sums_bytes, 0o644)
    bundle.chmod(0o600)

    print(json.dumps({
        "ok": True,
        "marker": SUBMISSION_MARKER,
        "bundle": str(bundle),
        "bundle_sha256": sha256_file(bundle),
        "operator_id": operator_id,
        "node_key": node_key,
        "key_id": key_id,
        "evidence_status": facts["status"],
        "namespace": NAMESPACE,
        "private_key_in_bundle": False,
        "evidence_pack_in_bundle": False,
        "mutation_authority": False,
    }, indent=2, sort_keys=True))
    return 0


def verify_attestation(args: argparse.Namespace) -> int:
    if shutil.which("ssh-keygen") is None:
        raise SystemExit("ssh-keygen is required")

    bundle = Path(args.bundle).expanduser().resolve()
    pack_dir = Path(args.pack_dir).expanduser().resolve()
    failures: list[str] = []
    checks: dict[str, Any] = {}
    operator_id: str | None = None
    node_key: str | None = None
    key_id: str | None = None
    evidence_status: str | None = None

    try:
        validate_pack_directory(pack_dir)
        pack_review = run_pack_review(pack_dir, args.allow_hold)
        expected_facts = evidence_facts(pack_dir, pack_review)

        with tempfile.TemporaryDirectory(
            prefix="void-evidence-attestation-review-"
        ) as temp:
            root = Path(temp)
            safe_extract(bundle, root)
            sums = parse_sums(root / "SHA256SUMS.txt")
            expected_sum_names = EXPECTED_BUNDLE_FILES - {"SHA256SUMS.txt"}
            if set(sums) != expected_sum_names:
                raise ValueError("attestation checksum member set mismatch")
            for name, expected in sums.items():
                if sha256_file(root / name) != expected:
                    raise ValueError(f"attestation checksum mismatch: {name}")

            document = load_json(
                root / "operator-evidence-attestation-v1.json", "attestation"
            )
            metadata = load_json(
                root / "operator-evidence-attestation-metadata-v1.json",
                "attestation metadata",
            )
            public_key = public_key_line(
                (root / "operator-public-key-v1.pub").read_text(
                    encoding="utf-8"
                )
            )

            if (
                document.get("marker") != ATTESTATION_MARKER
                or document.get("schema_version") != 1
                or document.get("read_only") is not True
                or document.get("network") != NETWORK
            ):
                raise ValueError("attestation boundary mismatch")

            operator_id = document.get("operator_id")
            node_key = document.get("node_key")
            if not isinstance(operator_id, str) or not ID_RE.fullmatch(operator_id):
                raise ValueError("invalid operator identity")
            if not isinstance(node_key, str) or not ID_RE.fullmatch(node_key):
                raise ValueError("invalid node identity")

            validate_authority(document.get("authority"))
            provenance = document.get("provenance")
            if not isinstance(provenance, dict):
                raise ValueError("attestation provenance missing")
            if (
                provenance.get("scheme") != SCHEME
                or provenance.get("namespace") != NAMESPACE
                or provenance.get("canonicalization") != CANONICALIZATION
                or provenance.get("operator_id") != operator_id
                or not isinstance(provenance.get("signature"), str)
            ):
                raise ValueError("attestation provenance mismatch")

            key_id = fingerprint(public_key)
            if (
                provenance.get("key_id") != key_id
                or metadata.get("key_id") != key_id
                or metadata.get("operator_id") != operator_id
                or metadata.get("node_key") != node_key
                or metadata.get("marker") != SUBMISSION_MARKER
                or metadata.get("schema_version") != 1
                or metadata.get("attestation_file")
                    != "operator-evidence-attestation-v1.json"
                or metadata.get("public_key_file")
                    != "operator-public-key-v1.pub"
                or metadata.get("private_key_in_bundle") is not False
                or metadata.get("evidence_pack_in_bundle") is not False
            ):
                raise ValueError("attestation identity/metadata mismatch")
            validate_authority(metadata.get("authority"))

            signed_at = parse_time(provenance.get("signed_at"))
            if signed_at is None:
                raise ValueError("attestation signed_at missing or invalid")
            age_hours = (
                dt.datetime.now(dt.timezone.utc) - signed_at
            ).total_seconds() / 3600
            if age_hours < -(5 / 60):
                raise ValueError("attestation timestamp is in the future")
            if age_hours > max(1.0, args.max_age_hours):
                raise ValueError("attestation signature is too old")

            if document.get("evidence") != expected_facts:
                raise ValueError("attestation does not bind the supplied pack")
            evidence_status = expected_facts["status"]

            findings = public_safety_findings(document)
            if findings:
                raise ValueError(
                    "attestation public-safety validation failed: "
                    + ", ".join(findings)
                )
            verify_signature(document, public_key, operator_id)
            checks.update({
                "structure": True,
                "checksums": True,
                "public_safety": True,
                "identity_binding": True,
                "separate_signature_domain": True,
                "signature_valid": True,
                "signature_age_hours": round(age_hours, 6),
                "pack_review_accepted": True,
                "pack_hash_binding": True,
                "private_key_absent": True,
                "evidence_pack_absent": True,
            })
    except Exception as error:
        failures.append(str(error))

    passed = not failures
    report = {
        "marker": REVIEW_MARKER,
        "reviewed_at": now_utc(),
        "bundle_name": bundle.name,
        "bundle_sha256": sha256_file(bundle) if bundle.is_file() else None,
        "operator_id": operator_id,
        "node_key": node_key,
        "key_id": key_id,
        "evidence_status": evidence_status,
        "namespace": NAMESPACE,
        "status": "passed" if passed else "failed",
        "checks": checks,
        "failures": failures,
        "decision_boundary": {
            "cryptographic_key_control_proven": passed,
            "evidence_pack_binding_proven": passed,
            "trust_admission_performed": False,
            "validator_admission_performed": False,
            "ledger_authority": False,
            "wallet_authority": False,
            "settlement_authority": False,
            "mutation_authority": False,
            "recommended_next_action": (
                "manual operator review before any trust-add"
                if passed
                else "reject or request corrected attestation"
            ),
        },
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        output = Path(args.output).expanduser().resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded, encoding="utf-8")
        output.chmod(0o600)
    print(encoded, end="")
    return 0 if passed else 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser("create")
    create.add_argument("--pack-dir", required=True)
    create.add_argument("--operator-id", required=True)
    create.add_argument("--node-key", required=True)
    create.add_argument("--private-key")
    create.add_argument("--output-dir", default=".")
    create.add_argument("--allow-hold", action="store_true")
    create.set_defaults(handler=create_attestation)

    verify = subparsers.add_parser("verify")
    verify.add_argument("--bundle", required=True)
    verify.add_argument("--pack-dir", required=True)
    verify.add_argument("--output")
    verify.add_argument("--allow-hold", action="store_true")
    verify.add_argument("--max-age-hours", type=float, default=168.0)
    verify.set_defaults(handler=verify_attestation)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    return int(args.handler(args))


if __name__ == "__main__":
    raise SystemExit(main())

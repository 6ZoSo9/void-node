#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
from typing import Any

MARKER = "VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_V1"
CONTRACT_MARKER = (
    "VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_CONTRACT_V1"
)
SELF_TEST_MARKER = (
    "VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_SELF_TEST_V1_GREEN"
)

CHECKPOINT_TAG = (
    "ckpt-validator-positive-readiness-wallet-recovery-v11-"
    "final-closeout-exact-green-20260720T070906Z"
)
CHECKPOINT_TARGET_COMMIT = "8b961e919148e4035d03e32e20b12685df119beb"

RECEIPT_SPECS: dict[str, dict[str, Any]] = {
    "positive_readiness_core": {
        "sha256": "ff4bd98d306af268d1d42817489d2f071a9ddc428c73afe50ebada4f47b181c2",
        "required": (
            "[ok] proof-mode status proves wallet + signer + payload readiness without live execution",
            "[ok] submit-live remains kill-switched even while proof-mode status is ready",
            "[ok] positive status proof did not reserve a submit intent",
            "[ok] validator registration positive-readiness proof green",
        ),
    },
    "wallet_recovery_v11": {
        "sha256": "7ade6714c8559642ea4fad8e24c5253871dfd11daa868645751b827f9d58cebe",
        "required": (
            "production_wallet_store_restored_exact=true",
            "original_44_record_production_backup_promoted=true",
            "v1_proof_wallet_absent_from_restored_production_store=true",
            "journal_written_by_recovery=false",
            "transaction_signing_or_broadcast_performed=false",
            "validator_registration_or_admission_performed=false",
            "active_validator_set_mutation_performed=false",
            "VOID_VALIDATOR_POSITIVE_READINESS_V1_WALLET_SWAP_RECOVERY_V11_EXACT_GREEN",
        ),
    },
    "wallet_recovery_final_closeout": {
        "sha256": "af4a2e3e99a401a5616feab5e2d09169319e9ec3592024d72caeb712a7d51c21",
        "required": (
            "production_wallet_json_file_count=44",
            "proof_account_wallet_absent=true",
            "temporary_recovery_artifacts_absent=true",
            "validator_live_execution_final=false",
            "validator_signer_path_selected_final=false",
            "validator_status_proof_mode_final=false",
            "journal_entries_final=4",
            "remote_boxes_green=true",
            "checkpoint_tag_created=false",
            "VOID_VALIDATOR_POSITIVE_READINESS_V1_WALLET_RECOVERY_V11_FINAL_CLOSEOUT_EXACT_GREEN",
        ),
    },
    "runtime_checkpoint_tag": {
        "sha256": "6242e5ecf3cfc829962e20778383622455ebee6a83dd65fce8fbf59af821cad3",
        "required": (
            f"checkpoint_tag={CHECKPOINT_TAG}",
            f"checkpoint_target_commit={CHECKPOINT_TARGET_COMMIT}",
            "runtime_checkpoint_targets_deployed_service_commit=true",
            "checkpoint_does_not_claim_remote_main_deployment=true",
            "annotated_runtime_checkpoint_tag_exact=true",
            "local_remote_tag_objects_match=true",
            "checkpoint_tag_created_or_verified=true",
            "VOID_VALIDATOR_POSITIVE_READINESS_V1_WALLET_RECOVERY_V11_CHECKPOINT_TAG_EXACT_GREEN",
        ),
    },
}

PUBLIC_CLAIMS = {
    "positive_readiness_core_proof_green": True,
    "positive_readiness_wrapper_exact_green": False,
    "wrapper_cleanup_failure_recovered": True,
    "proof_status_mode_read_only": True,
    "readiness_gates_green_during_proof": True,
    "submit_live_kill_switch_remained_off": True,
    "submit_live_transaction_sent": False,
    "double_submit_reservation_created": False,
    "production_wallet_store_restored_exact": True,
    "production_wallet_json_file_count": 44,
    "proof_wallet_absent_after_recovery": True,
    "temporary_recovery_artifacts_absent": True,
    "validator_live_execution_final": False,
    "validator_signer_selected_final": False,
    "validator_status_proof_mode_final": False,
    "submit_intent_journal_entries_final": 4,
    "submit_intent_journal_changed_by_recovery": False,
    "transaction_signing_or_broadcast_performed": False,
    "validator_registration_or_admission_performed": False,
    "active_validator_set_mutation_performed": False,
    "remote_boxes_green_at_final_closeout": True,
    "runtime_checkpoint_tag_verified": True,
    "checkpoint_claims_remote_main_deployed": False,
    "public_validator_registration_enabled_by_this_evidence": False,
}

FORBIDDEN_OUTPUT_KEYS = {
    "account",
    "address",
    "private_key",
    "privatekey",
    "signer_file",
    "wallet_path",
    "receipt_path",
    "filesystem_path",
    "passphrase",
    "mnemonic",
    "seed",
    "token",
}


class EvidenceError(RuntimeError):
    pass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_receipt(path: Path, label: str) -> tuple[bytes, str]:
    if not path.is_file() or path.is_symlink():
        raise EvidenceError(f"{label}: receipt must be a regular non-symlink file")
    data = path.read_bytes()
    return data, sha256_bytes(data)


def verify_receipt(path: Path, label: str) -> dict[str, Any]:
    spec = RECEIPT_SPECS[label]
    data, actual_sha = read_receipt(path, label)
    if actual_sha != spec["sha256"]:
        raise EvidenceError(
            f"{label}: SHA-256 mismatch; expected {spec['sha256']}, got {actual_sha}"
        )

    text = data.decode("utf-8", "replace")
    missing = [marker for marker in spec["required"] if marker not in text]
    if missing:
        raise EvidenceError(f"{label}: required receipt markers missing: {missing}")

    return {
        "kind": label,
        "sha256": actual_sha,
        "receipt_contract_green": True,
    }


def contract_document() -> dict[str, Any]:
    return {
        "marker": CONTRACT_MARKER,
        "schema_version": 1,
        "subject": "validator_registration_positive_readiness_without_live_execution",
        "checkpoint": {
            "tag": CHECKPOINT_TAG,
            "target_commit": CHECKPOINT_TARGET_COMMIT,
            "targets_exact_deployed_runtime": True,
            "claims_remote_main_deployed": False,
        },
        "receipt_sha256": {
            label: spec["sha256"]
            for label, spec in sorted(RECEIPT_SPECS.items())
        },
        "public_claims": dict(sorted(PUBLIC_CLAIMS.items())),
        "generator_authority": {
            "filesystem_read_explicit_receipts": True,
            "filesystem_write_explicit_output_only": True,
            "network_access": False,
            "rpc_call": False,
            "wallet_access": False,
            "signer_access": False,
            "service_control": False,
            "git_mutation": False,
            "transaction_signing": False,
            "transaction_broadcast": False,
            "validator_registration": False,
            "validator_admission": False,
            "active_validator_set_mutation": False,
        },
    }


def public_evidence(receipts: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "marker": MARKER,
        "schema_version": 1,
        "subject": "validator_registration_positive_readiness_without_live_execution",
        "status": "exact_green_with_recovered_wrapper_cleanup_failure",
        "checkpoint": {
            "tag": CHECKPOINT_TAG,
            "target_commit": CHECKPOINT_TARGET_COMMIT,
            "targets_exact_deployed_runtime": True,
            "claims_remote_main_deployed": False,
        },
        "claims": dict(sorted(PUBLIC_CLAIMS.items())),
        "evidence": sorted(receipts, key=lambda row: row["kind"]),
        "interpretation": {
            "proves": "positive readiness could be observed without enabling live execution",
            "does_not_prove": "public validator registration is enabled",
        },
    }


def validate_public_shape(value: Any, path: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key).lower() in FORBIDDEN_OUTPUT_KEYS:
                raise EvidenceError(f"forbidden public output key at {path}.{key}")
            validate_public_shape(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            validate_public_shape(child, f"{path}[{index}]")
    elif isinstance(value, str):
        if value.startswith("/home/") or value.startswith("/tmp/"):
            raise EvidenceError(f"filesystem path leaked at {path}")


def canonical_json(value: Any) -> str:
    validate_public_shape(value)
    return json.dumps(value, indent=2, sort_keys=True) + "\n"


def write_atomic(path: Path, text: str) -> None:
    if path.exists() and path.is_symlink():
        raise EvidenceError("output path must not be a symlink")

    resolved = path.expanduser().resolve()
    forbidden_parts = {".git", ".secrets", "node_modules", "data_a"}
    if forbidden_parts.intersection(resolved.parts):
        raise EvidenceError("refusing to write inside a sensitive or generated directory")

    resolved.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(
        prefix=f".{resolved.name}.",
        suffix=".tmp",
        dir=str(resolved.parent),
    )

    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, resolved)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def self_test() -> None:
    contract_a = canonical_json(contract_document())
    contract_b = canonical_json(contract_document())
    if contract_a != contract_b:
        raise EvidenceError("contract output is not deterministic")

    synthetic = public_evidence(
        [
            {
                "kind": label,
                "sha256": spec["sha256"],
                "receipt_contract_green": True,
            }
            for label, spec in RECEIPT_SPECS.items()
        ]
    )
    encoded_a = canonical_json(synthetic)
    encoded_b = canonical_json(synthetic)
    if encoded_a != encoded_b:
        raise EvidenceError("public evidence output is not deterministic")

    parsed = json.loads(encoded_a)
    if parsed["claims"]["transaction_signing_or_broadcast_performed"] is not False:
        raise EvidenceError("transaction safety claim changed")
    if parsed["claims"]["positive_readiness_wrapper_exact_green"] is not False:
        raise EvidenceError("wrapper cleanup honesty claim changed")
    if parsed["claims"]["wrapper_cleanup_failure_recovered"] is not True:
        raise EvidenceError("wrapper recovery claim changed")
    if (
        parsed["claims"]["public_validator_registration_enabled_by_this_evidence"]
        is not False
    ):
        raise EvidenceError("public enablement overclaim detected")

    print(SELF_TEST_MARKER)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Emit deterministic, redacted public evidence for the sealed VOID "
            "validator positive-readiness milestone."
        )
    )
    parser.add_argument("--positive-readiness-receipt", type=Path)
    parser.add_argument("--recovery-receipt", type=Path)
    parser.add_argument("--closeout-receipt", type=Path)
    parser.add_argument("--checkpoint-receipt", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--describe-contract", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.self_test:
        self_test()
        return 0

    if args.describe_contract:
        print(canonical_json(contract_document()), end="")
        return 0

    selected = {
        "positive_readiness_core": args.positive_readiness_receipt,
        "wallet_recovery_v11": args.recovery_receipt,
        "wallet_recovery_final_closeout": args.closeout_receipt,
        "runtime_checkpoint_tag": args.checkpoint_receipt,
    }
    missing = [label for label, path in selected.items() if path is None]
    if missing:
        raise EvidenceError(f"missing required receipt arguments: {missing}")

    receipts = [
        verify_receipt(path, label)
        for label, path in selected.items()
        if path is not None
    ]
    output = canonical_json(public_evidence(receipts))

    if args.out is None:
        print(output, end="")
    else:
        write_atomic(args.out, output)
        print(f"output={args.out.expanduser().resolve()}")
        print(f"output_sha256={sha256_bytes(output.encode('utf-8'))}")
        print(MARKER)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EvidenceError as exc:
        print(f"HOLD: {exc}", file=sys.stderr)
        raise SystemExit(1)

#!/usr/bin/env python3
import json
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
receipt = root / "docs/public/operator-provenance/signed-operator-provenance-canary-v1.json"
value = json.loads(receipt.read_text(encoding="utf-8"))

assert value["marker"] == "VOID_SIGNED_OPERATOR_PROVENANCE_CANARY_PUBLIC_RECEIPT_V1"
assert value["status"] == "passed"
assert value["source_receipt"]["sha256"] == "d5546b2139f2d913ff986f8771761ce249ffcc11c94b405c5977ba0476ad0b06"
assert value["source_receipt"]["raw_receipt_committed"] is False
assert value["canary"]["expected_sequence"] == ["verified", "invalid", "revoked", "expired"]
assert value["canary"]["observed_sequence"] == ["verified", "invalid", "revoked", "expired"]
assert value["canary"]["cleanup"] == {
    "public_manifest_absent": True,
    "temporary_private_key_removed": True,
    "temporary_trust_record_removed": True,
}
assert value["canary"]["read_only_boundary"] == {
    "GET_HEAD_only": True,
    "public_POST_status": 405,
}
assert value["authority"]["cryptographic_key_control_proven"] is True
for field in (
    "trust_admission_performed",
    "validator_admission_performed",
    "ledger_authority",
    "wallet_authority",
    "settlement_authority",
    "mutation_authority",
):
    assert value["authority"][field] is False

encoded = receipt.read_text(encoding="utf-8").lower()
for forbidden in (
    '"private_key":',
    '"private_key_path":',
    "-----begin openssh private key-----",
    "-----begin ssh signature-----",
    "/home/zoso",
):
    assert forbidden not in encoded

kit = root / "ops/public/operator-onboarding-v1"
required = {
    "README.md",
    "void-public-node-operator-enroll-v1.py",
    "void-public-node-operator-review-v1.py",
}
assert required == {path.name for path in kit.iterdir() if path.is_file()}

enroll = (kit / "void-public-node-operator-enroll-v1.py").read_text(encoding="utf-8")
review = (kit / "void-public-node-operator-review-v1.py").read_text(encoding="utf-8")
for token in (
    "void-public-node-manifest-v1",
    "sshsig-ed25519-v1",
    "VOID_PUBLIC_NODE_OPERATOR_SUBMISSION_V1",
    "private_key_in_bundle",
):
    assert token in enroll
for token in (
    "VOID_PUBLIC_NODE_OPERATOR_REVIEW_V1",
    "trust_admission_performed",
    "validator_admission_performed",
    "signature_valid",
):
    assert token in review

assert "--validator" not in enroll
assert '"validator_admission_performed": True' not in enroll + review
print("VOID_SIGNED_OPERATOR_PROVENANCE_CANARY_SEAL_AND_ONBOARDING_V1_GREEN")

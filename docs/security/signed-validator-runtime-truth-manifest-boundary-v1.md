# Signed Validator Runtime Truth Manifest Boundary v1

Status: green

Marker:

```text
VOID_SIGNED_VALIDATOR_RUNTIME_TRUTH_MANIFEST_BOUNDARY_AUDIT_V1_GREEN
```

## Purpose

Close the next bounded hole after validator runtime truth proposer binding.

The runtime truth file can define the expected proposer, but the file itself must have provenance. This lane adds a strict signed-runtime-truth mode that verifies the runtime truth manifest signature and binds the signer to a trusted runtime truth authority key.

## Runtime controls

```text
VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED=1
VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE=signed_runtime_truth
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE=/path/to/validator-runtime-truth.json
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE=/path/to/trusted-signer-pubkey.pem
VOID_BLOCK_PROPOSER_EPOCH=0
```

Inline trusted signer is also supported:

```text
VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY=<spki-pem>
```

## Signed fixture shape

```json
{
  "marker": "VOID_SIGNED_VALIDATOR_RUNTIME_TRUTH_FIXTURE_V1",
  "epoch": "0",
  "schedule": [
    { "slot": 0, "proposer": "<node-id>" }
  ],
  "signature": {
    "alg": "ed25519",
    "key_id": "<signer-id>",
    "signer_pubkey": "<spki-pem>",
    "sig": "<128-hex-ed25519-signature-over-canonical-body>"
  }
}
```

The signature is over a canonical stable JSON encoding of the manifest body with the signature block removed.

## Implemented boundary

When authority source is `signed_runtime_truth`, `validateBlockForAppend()` requires:

- runtime truth file present and parseable
- runtime truth manifest signature present
- Ed25519 signature shape valid
- manifest signer public key equals trusted runtime truth signer public key
- manifest signature verifies over canonical manifest body
- scheduled proposer matches block proposer
- block signature still cryptographically verifies against proposer public key

## Proof coverage

`scripts/prove_signed_validator_runtime_truth_manifest_boundary.ts` proves:

- signed runtime truth from trusted signer accepts scheduled proposer
- unsigned runtime truth is rejected
- tampered runtime truth is rejected
- wrong signer is rejected
- missing trusted signer is rejected
- inline trusted signer can validate a signed truth manifest

## Explicit limitation

This is a signed local manifest boundary, not chain-derived validator-set truth, fork choice, or multi-peer quorum.

The next lane should bind signed runtime truth to an epoch manifest root or chain-derived validator-set commitment.

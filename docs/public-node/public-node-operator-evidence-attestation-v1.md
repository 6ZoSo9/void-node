# Public Node Operator Evidence Attestation v1

Marker: `VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_V1`

## Purpose

This tool lets a previously identified public-node operator cryptographically
bind their Ed25519 identity key to an exact operator evidence pack.

It uses the existing OpenSSH Ed25519 and SSHSIG machinery, but deliberately
uses a **separate signature domain**:

```text
namespace: void-public-node-evidence-attestation-v1
prefix: VOID-PUBLIC-NODE-EVIDENCE-ATTESTATION-V1\n
scheme: sshsig-ed25519-v1
canonicalization: void-canonical-json-v1
```

The separate namespace and prefix prevent an operator-manifest signature from
being replayed as an evidence attestation, or vice versa.

## Create

```bash
python3 \
  ops/public/operator-onboarding-v1/void-public-node-operator-evidence-attest-v1.py \
  create \
  --pack-dir ./void-public-node-operator-evidence-pack-v1 \
  --operator-id example-operator \
  --node-key example-node \
  --private-key ~/.config/void/operator-keys/example-operator.ed25519 \
  --output-dir ./attestations
```

When `--private-key` is omitted, the default is:

```text
~/.config/void/operator-keys/<operator-id>.ed25519
```

The private key must be a regular non-symlink file with no group or other
permissions. The private key is never copied into the output bundle.

By default, the evidence pack must be green. `--allow-hold` permits a valid
hold pack to be attested as diagnostic evidence.

## Verify

```bash
python3 \
  ops/public/operator-onboarding-v1/void-public-node-operator-evidence-attest-v1.py \
  verify \
  --bundle ./attestations/void-operator-evidence-attestation-example-operator-example-node.zip \
  --pack-dir ./void-public-node-operator-evidence-pack-v1 \
  --output ./attestation-review-v1.json
```

Verification independently:

- checks the evidence pack with the merged offline pack reviewer
- validates the exact four-file attestation bundle
- verifies bundle checksums
- verifies the Ed25519 SSHSIG signature
- enforces the evidence-specific namespace and prefix
- verifies the key fingerprint and operator/node identity
- enforces signature age
- compares every signed pack hash and sanitized manifest fact to the supplied pack
- proves the private key and evidence pack are absent from the bundle
- keeps trust, validator, wallet, settlement, ledger, peer, ticket, and Buy VOID authority false

## Bundle

The ZIP contains exactly:

```text
operator-evidence-attestation-v1.json
operator-public-key-v1.pub
operator-evidence-attestation-metadata-v1.json
SHA256SUMS.txt
```

It contains no private key and no evidence-pack artifact bodies.

The attestation signs only:

- operator and node identifiers
- evidence-pack status and gate
- canonical artifact names and SHA-256 values
- true receipt/review bindings
- source-tool contracts already present in the pack manifest
- false authority and mutation boundaries

It does not sign or publish the pack path, raw target URL, IP address, wallet,
credential, secret, or artifact body.

## Proof

```bash
npx --yes tsx \
  scripts/prove_public_node_operator_evidence_attest_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_V1_PROOF_GREEN
```

The proof covers signed bundle creation, signature verification, exact pack
binding, the separate signature domain, mode-0600 private outputs, and tampered
pack rejection.

## Authority boundary

A valid attestation proves only:

1. control of the referenced Ed25519 key;
2. intent to bind that identity to the exact evidence-pack hashes;
3. successful offline validation of the supplied evidence pack.

It does not perform trust admission, validator admission, staking, wallet
connection, settlement, ledger writes, peer changes, Work Credit claims,
Buy VOID fulfillment, or any network mutation.

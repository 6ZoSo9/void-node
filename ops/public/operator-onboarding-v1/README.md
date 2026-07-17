# VOID External Operator Onboarding v1

This package creates a **signed, read-only public-node operator submission** for manual review.

It proves control of an Ed25519 signing key and binds that key to a sanitized operator manifest. It does **not** grant validator admission, settlement authority, ledger access, wallet authority, rewards, or mutation rights.

## Operator: create a submission bundle

Requirements: Python 3.10+ and OpenSSH `ssh-keygen` with SSHSIG support.

```bash
python3 void-public-node-operator-enroll-v1.py \
  --operator-id example-operator \
  --node-key example-node-1 \
  --label "Example public node" \
  --operator-label "Example Operator" \
  --region-label "US East" \
  --description "Independent read-only Mainnet-0 node status publication"
```

The command creates:

- a private Ed25519 key under `~/.config/void/operator-keys/` with mode `0600`;
- a public submission ZIP containing only the signed manifest, public key, metadata, and checksums.

The private key is never placed in the submission ZIP.

## Maintainer: review a submission bundle

```bash
python3 void-public-node-operator-review-v1.py \
  --bundle ./void-operator-submission-example-operator-example-node-1.zip \
  --output ./review-report.json
```

A green review proves only that:

- the bundle is structurally valid and sanitized;
- its checksum set matches;
- the Ed25519 SSHSIG signature verifies;
- the manifest identity matches the public key submission metadata;
- the signature is recent enough for review.

Trust-store admission is a separate manual decision. Validator admission is outside this package entirely.

## Boundary

The manifest deliberately contains no IP address, hostname, URL, wallet, credential, token, endpoint, or private key. Runtime readiness remains unknown until independently observed by the network telemetry lane.

# Authenticated paid-work fresh direct quote signing handoff v1

## Purpose

This lane adds a hardened operator CLI around the canonical preparation
implementation in
`scripts/authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.ts`.

The canonical implementation materializes a fresh work order and quote, prepares
provider and requester signing requests, verifies externally produced Ed25519
signatures, and creates a direct-authentication preparation packet. This wrapper
does not duplicate that security-sensitive core.

The wrapper exists to provide a practical file handoff for an operator or an
outside signer while preserving the source contract's authority boundaries.

## Commands

### Prepare the provider request

```bash
npx tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  prepare \
  preparation-input.json \
  provider-request.json
```

The output contains the canonical provider signing bytes and SHA-256 digest. It
does not contain or request a private key.

### Verify the provider signature and prepare the requester request

```bash
npx tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  advance \
  preparation-input.json \
  provider-request.json \
  provider-signature.json \
  requester-request.json
```

The provider signature file must contain exactly:

```json
{
  "marker": "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_V1",
  "version": 1,
  "signer_role": "provider",
  "key_id": "ed25519:<64 lowercase hexadecimal characters>",
  "signing_bytes_sha256": "<64 lowercase hexadecimal characters>",
  "signature_base64": "<canonical 64-byte Ed25519 signature in base64>"
}
```

The wrapper binds the role, key ID, signing digest, and canonical signature
encoding before passing the submission to the canonical verifier.

### Verify the requester signature and finalize preparation

```bash
npx tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  finalize \
  preparation-input.json \
  provider-request.json \
  provider-signature.json \
  requester-request.json \
  requester-signature.json \
  final-preparation.json
```

The requester signature file uses the same closed shape with
`"signer_role": "requester"` and the requester key ID and signing digest.

### Verify an existing final packet

```bash
npx tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  verify-final \
  preparation-input.json \
  provider-request.json \
  provider-signature.json \
  requester-request.json \
  requester-signature.json \
  final-preparation.json
```

Every stage recomputes and verifies the canonical upstream packet. A stale,
tampered, wrong-role, wrong-key, wrong-digest, malformed, or noncanonical input
fails closed.

## File safety

All JSON inputs are opened once with `O_NOFOLLOW`, validated through the opened
file descriptor with `fstat`, and read through that same descriptor with a
32 MiB hard limit. This avoids checking one filesystem object and then reopening
a different object by pathname.

Directories, symlinks, oversized files, malformed JSON, and files that grow
past the bound while being read are rejected.

All outputs are create-only and use mode `0600`. Existing output paths are not
overwritten. The caller remains responsible for choosing an owner-private,
non-shared output directory.

## Signing boundary

The CLI never:

- accepts a private key field;
- reads a signer, wallet, seed phrase, or credential store;
- generates a production key;
- performs provider or requester signing;
- submits signing material over HTTP;
- sends files to an external service.

The provider and requester sign only the exact base64-decoded bytes exposed by
the canonical request packets. The returned signature files are public evidence,
not secret keys.

## Activation boundary

A successful final packet is eligible only for later review under the existing
`direct_authentication_packet` persistence mode. It does not perform quote
acceptance or payment-authority persistence.

The next gate remains separate atomic persistence with current replay snapshots,
current-main verification, reviewed runtime evidence, and ZoSo's fresh
operation-bound confirmation.

Payment execution, payment-destination resolution, transaction construction,
transaction broadcast, work authorization, work dispatch, Work Credit writes,
wallet access, deployment, service restart, and money movement remain separate
and false.

## Verification

The focused workflow runs:

```bash
npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext \
  --strict --skipLibCheck \
  scripts/authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.ts \
  scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  scripts/prove_authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  scripts/prove_authenticated_paid_work_fresh_direct_quote_file_io_hardening_v1.ts

npx tsx scripts/prove_authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts
npx tsx scripts/prove_authenticated_paid_work_fresh_direct_quote_file_io_hardening_v1.ts
```

Expected markers:

```text
VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_V1_PROOF_GREEN=true
VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_FILE_IO_HARDENING_V1_PROOF_GREEN=true
```

# DataNet Content Commitment Opaque Signed Receipt Verification v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_OPAQUE_SIGNED_RECEIPT_VERIFICATION_V1`

Status: application-side verification only. This module verifies a domain-separated publisher-wallet attestation over an opaque external signing receipt. It does not receive raw signed transaction bytes and does not invoke a signer or broadcaster.

## Why the receipt needs a cryptographic attestation

Opaque metadata alone is not proof.

V1 therefore requires the external signer/custodian to return a receipt body plus an EIP-191 publisher-wallet attestation.

The attested body binds:

- exact #1707 signing-request ID;
- exact external-signing idempotency key;
- authorization ID;
- consumption-record ID;
- final-review ID;
- exact unsigned-transaction fingerprint;
- exact publisher address;
- signed-transaction hash;
- custody-handle SHA-256 fingerprint;
- external signing timestamp;
- no raw signed transaction included;
- no broadcast performed; and
- no Chain-2050 write performed.

The application recovers the wallet address from the attestation and requires it to equal the exact publisher.

## Signing-request verification

Before receipt verification, V1 independently rederives:

- the #1707 signing-request content ID;
- unsigned transaction candidate fingerprint;
- exact transaction summary; and
- all no-sign/no-broadcast authority boundaries.

A forged signing request is rejected before receipt acceptance.

## Time boundary

The external receipt timestamp must be:

- at or after the signing request construction timestamp; and
- strictly before the Sovereign authorization expiry.

This is evidence that the external signer attested a signing event inside the authorized window.

## What this does and does not prove

GREEN proves the exact publisher wallet cryptographically attested the receipt metadata.

GREEN does **not** mean the application independently decoded or verified raw signed transaction bytes, because those bytes remain outside the application boundary.

The receipt explicitly reports:

`raw_signed_transaction_verified_by_application=false`

A trusted external custody inspection path remains responsible for the opaque payload bytes.

## Authority boundary

This gate performs:

- no private-key access;
- no signer access;
- no signing;
- no filesystem mutation;
- no RPC;
- no broadcast;
- no Chain-2050 write.

A valid signed receipt still grants no broadcast authority.

## Next gate

`explicit_sovereign_broadcast_authorization_for_exact_opaque_signed_receipt_v1`

Any future broadcast authorization must bind at least:

- exact signed-receipt verification ID;
- exact signing-request ID;
- signed-transaction hash;
- custody-handle fingerprint;
- original unsigned-transaction fingerprint; and
- publisher identity.

Broadcast execution remains separate.

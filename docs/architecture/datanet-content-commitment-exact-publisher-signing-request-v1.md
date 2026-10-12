# DataNet Content Commitment Exact Publisher Signing Request v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_EXACT_PUBLISHER_SIGNING_REQUEST_V1`

Status: source-only signing-request construction. This gate stops before any private key, wallet, transaction signer, signature, or raw signed transaction is accessed.

## Purpose

The merged consume-first gate proves that one exact Sovereign authorization has been durably burned.

This lane converts that durable evidence into one content-addressed request contract for an **external opaque signer** without implementing or invoking the signer.

## Admission

Before a signing request can exist, V1:

1. re-verifies the Sovereign Ed25519 authorization;
2. re-checks that authorization is still within its signing window;
3. validates the exact private 0700 state-store realpath;
4. requires its separately supplied canonical state-store SHA-256 fingerprint;
5. validates the complete #1705 consumption receipt;
6. reads the exact immutable 0600 consumption record from disk;
7. rederives the consumption-record content ID;
8. rederives the unsigned transaction candidate fingerprint; and
9. rederives the exact transaction summary.

No state is mutated by this gate.

## External signer contract

The output binds a deterministic external-signing idempotency key.

A compatible external signer must provide:

- `prepare_once` semantics under that exact key;
- `inspect_prepared` semantics for later verification;
- signer address exactly equal to the publisher;
- exact unsigned-transaction fingerprint binding;
- a second expiry check at the actual external signing instant;
- opaque custody of raw signed bytes;
- no raw signed transaction returned to the application.

Only a signed-transaction hash and custody-handle fingerprint may later cross back into the application boundary.

## Authority boundary

This module has no:

- private-key API;
- Wallet construction;
- transaction-signer access;
- signing call;
- raw signed-transaction input/output;
- filesystem mutation;
- RPC call;
- broadcast authorization;
- broadcast;
- Chain-2050 write.

Its output is a request contract, not a signature.

## Next boundary

`external_opaque_signer_execution_and_signed_receipt_verification_outside_application_v1`

The application-side repository can verify a returned opaque receipt, but actual private-key signing must remain outside this application boundary. Any future broadcast still requires its own explicit Sovereign authorization because #1704 set `transaction_broadcast=false`.

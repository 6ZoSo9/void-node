# VOID Canonical Remote Credential Issuance V1

Marker: `VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_ISSUANCE_V1`.

This source-only contract closes the incompatibility between the legacy fresh
canary live-stage command and the strict canonical paid-work credential
registry.

The legacy command requires a credential ID before token generation and writes
legacy aliases such as `token_hash` and `scopes: ["submit"]`. The canonical
registry instead derives `voidapwc1_...` only after the token SHA-256 is known
and accepts exactly `token_sha256`, scope `agent_paid_work_submit`, issuance and
expiration timestamps, and nullable revocation state.

## Sequence

1. `prepare-request` writes a sanitized request on Precision. It contains no
   credential ID and no token digest.
2. `generate-token-local` runs on Nimo after the exact token-generation
   confirmation. Nimo generates the raw token, keeps it in owner-private
   storage, computes the canonical credential ID through the existing registry
   implementation, and emits a sanitized hash-only response.
3. `prepare-review` writes an explicit sanitized approval after the exact
   review confirmation.
4. `stage-issue` validates the current strict registry and creates one
   content-addressed candidate registry. It performs no registry write.
5. `apply-issue` requires the exact apply confirmation and exact registry
   prestate. It atomically installs the candidate registry and writes a receipt.
6. The existing binding lifecycle may later use the resulting
   `issuance_preparation_id` and `review_decision_id` in a separately staged and
   confirmed binding operation.

## Security boundaries

- The raw token is generated and retained only on Nimo.
- Precision receives only the token SHA-256, canonical credential ID, and a
  SHA-256 of the private Nimo path.
- The request cannot authorize token generation.
- Token generation, review approval, registry apply, receiver restart, and WC
  binding are separate confirmations.
- The apply command never reads the raw token.
- The receiver restart remains separate. A successful apply reports
  `receiver_restart_required=true` and `live_effect=false`.
- No command submits paid work, accepts a quote, authorizes or executes
  payment, dispatches work, writes Work Credits, settles WC to VOID, accesses a
  wallet or signer, signs, broadcasts a transaction, restarts a service,
  deploys code, or moves money.

## Recovery and idempotence

Nimo private state is keyed by the sanitized request ID. Token generation and
private-registry replacement run under one exclusive owner-private generation
lock so concurrent requests cannot lose each other's registry updates. Replaying
the exact request verifies the existing token file's owner, mode, bounded
single-token format, path SHA-256, and token SHA-256 before reconstructing the
same sanitized response. A missing, changed, or orphaned token is fail-closed
and never returned to Precision.

Request preparation uses the live clock by default, while the exported function
accepts an explicit evaluation timestamp for deterministic synthetic proof.
Staging is append-once. Applying accepts either the exact staged prestate or the
exact final registry. Exact replay performs no second registry write and does
not rewrite the original receipt.

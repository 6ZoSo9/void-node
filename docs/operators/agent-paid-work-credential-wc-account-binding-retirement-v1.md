# VOID Agent Paid-Work Credential-to-WC-Account Binding Retirement V1

Marker: `VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_RETIREMENT_V1`.

This source-only contract closes the missing lifecycle transition between an
expired or revoked submit credential and a later fresh credential bound to the
same Work Credit account. The existing binding contract intentionally permits
one active credential per account, but it exposes only `inspect`, `stage-bind`,
and `apply`. This contract adds a narrowly bounded retirement transition without
editing the existing binding implementation.

## Commands

- `inspect` verifies one exact active binding and reports whether its credential
  is expired or revoked and whether the binding validity window has ended.
- `stage-retire` creates one content-addressed, prepare-only mutation. Staging
  writes no registry.
- `apply-retire` requires the exact confirmation
  `retire-agent-paid-work-credential-wc-account-binding-v1` and a private
  operation-lock path supplied with `--lock`.

Only the reason `credential_expired_rotation` is accepted in V1. The credential
must already be expired or revoked at `retired_at`, and the binding's
`valid_until` must already have passed. Canonical UTC values may use either
second precision (`YYYY-MM-DDTHH:MM:SSZ`) or millisecond precision
(`YYYY-MM-DDTHH:MM:SS.sssZ`) because the live credential registry uses seconds
while the historical binding lifecycle commonly uses milliseconds.

## Registry validation

Before staging or applying, the contract validates the complete
content-addressed credential registry and binding registry, not only the target
IDs. Credential IDs, registry IDs, binding IDs, token hashes, scopes, validity
windows, uniqueness keys, source fields, and authority boundaries must all be
exact. Duplicate IDs and multiple active bindings for one credential or one WC
account are rejected.

Every operator-state input must be a direct owner-controlled regular file with
mode `0600`; output directories must be direct owner-controlled directories
with mode `0700`.

## Exclusive operation lock

`apply-retire` creates the supplied lock file with `O_EXCL`, records the exact
staged mutation, process identity, kernel boot ID, and acquisition time, and
holds that lock across all prestate checks and both registry replacements.
The binding registry is re-read under the lock immediately before replacement.
A concurrent live lock is rejected before either registry is changed.

A process crash may leave a stale lock, which is fail-closed. Recovery requires
the separate exact confirmation
`recover-stale-agent-paid-work-credential-wc-account-binding-retirement-lock-v1`.
The contract verifies that the recorded process identity is no longer live
before removing the stale lock and continuing. The lock is removed and its
parent directory fsynced after success, exact replay, or a handled failure.

## Safe write ordering

A successful apply writes retirement evidence first. Only after that file is
read back with its exact expected SHA-256 does the contract atomically replace
the active binding registry with the target binding removed.

An interrupted apply can therefore leave the destination account still blocked,
but it cannot free the slot without durable retirement evidence. Re-running the
same staged mutation completes that partial state as `recovered`. An already
completed transaction performs no registry write.

When the original receipt path is reused, exact replay returns the original
committed receipt with `operation_status=duplicate`, `exact_replay=true`, and
`receipt_write_performed=false`; its bytes remain unchanged. A distinct receipt
path may receive a separate `duplicate` observation receipt, also without a
registry write.

The retirement record preserves the complete original binding and its canonical
SHA-256. The active binding registry contains active bindings only; the
retirement registry is the historical record.

## Rotation boundary

Retirement does not create, select, request, review, activate, or bind a
replacement credential. After retirement, the existing binding lifecycle may be
used in a separate explicitly confirmed operation to bind one fresh credential.
The fresh credential token remains outside this contract.

## Authority boundary

This contract never reads a bearer token or private key. It cannot submit paid
work, retry a submission, alter a quote, accept a quote, authorize or execute a
payment, authorize or dispatch work, write Work Credits, settle WC to VOID,
access a wallet or signer, sign, broadcast a transaction, restart a service,
deploy code, or move money.

The focused proof uses temporary synthetic registries only. GitHub Actions never
touches operator state.

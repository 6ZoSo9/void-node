# Epoch-2 known signed transaction lineages v1

Marker: `VOID_ECONOMIC_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1`

Status: repository-evidence baseline only. Global pending-signed-transaction
census remains `HOLD`.

## Purpose

The frozen epoch-1 nonce census proves exact final account nonces, but it does
not by itself enumerate every raw transaction that may have been signed and
retained off-chain.

This registry binds every distinct signed Chain-2050 transaction lineage
currently evidenced by canonical `ops/mainnet0` records:

1. role-authority deployment — signer nonce 0, frozen final nonce 1;
2. sovereign-owner gas funding — signer nonce 129, frozen final nonce 130; and
3. sovereign genesis registry append — signer nonce 0, frozen final nonce 1.

All three were included by the frozen block-37392 snapshot and are stale under
exact nonce continuity.

## What this does not prove

Repository evidence is not an exhaustive census of every signed artifact that
may exist on Precision, Nimo, encrypted backup media, or another authorized
operator store.

Therefore this registry explicitly records:

`pending_legacy_signed_transaction_census_complete=false`

The next operator proof must compare controlled signed-artifact stores against
this baseline and identify any additional Chain-2050 signed transaction whose
nonce could still be valid under the successor state.

No arbitrary home-directory or credential scan is authorized by this source
registry.

## Authority boundary

This lane reads checked-in evidence only. It performs no filesystem census,
credential access, wallet/key access, signing, broadcast, Chain-2050 write,
token/funds movement, migration, or public activation.

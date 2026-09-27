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

1. role-authority deployer gas funding — mined at block 37378 from the dev
   funding signer; exact transaction nonce is not published in repository
   evidence; frozen final signer nonce is 130;
2. role-authority deployment — signer nonce 0, frozen final nonce 1;
3. sovereign-owner gas funding — signer nonce 129, frozen final nonce 130; and
4. sovereign genesis registry append — signer nonce 0, frozen final nonce 1.

All four were included by the frozen block-37392 snapshot and are stale under
exact nonce continuity. For the deployer-funding lineage, the proof does not
invent the missing nonce: it binds the mined receipt, exact signer, pre-freeze
block, and that signer's frozen final nonce 130.

The proof recursively parses every checked-in JSON file under `ops/mainnet0`,
collects every canonical `signed_transaction_hash` field, and requires that the
distinct discovered set equal these three registry hashes exactly. A newly
checked-in signed transaction hash therefore fails this proof until the registry
is deliberately reconciled. Any encountered
`signed_transaction_hash` key whose value is not canonical lowercase
`0x` + 64-hex fails the proof rather than being skipped.

The census also recognizes `funding_transaction_hash` only at three exact
reviewed marker/path pairs: root-level fresh pre-sign revalidation, root-level
single-transaction signing authorization, and
`$.lineage.funding_transaction_hash` in sovereign genesis-append request
evidence. The
append request echoes the already-bound sovereign-owner funding hash rather than
creating a new lineage. An unknown schema introducing that key fails closed
until the extraction policy is explicitly reviewed.

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

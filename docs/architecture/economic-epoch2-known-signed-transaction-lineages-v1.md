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

1. confirmed Buy VOID delivery — block 37370;
2. Buy VOID fulfillment deployment — block 37373;
3. Buy VOID treasury send-to-ops — block 37376;
4. Buy VOID ops spend to fulfillment — block 37377;
5. role-authority deployer gas funding — mined at block 37378 from the dev
   funding signer; exact transaction nonce is not published in repository
   evidence; frozen final signer nonce is 130;
6. role-authority deployment — signer nonce 0, frozen final nonce 1;
7. sovereign-owner gas funding — signer nonce 129, frozen final nonce 130; and
8. sovereign genesis registry append — signer nonce 0, frozen final nonce 1.

All eight were included by the frozen block-37392 snapshot and are stale under
exact nonce continuity. For lineages whose repository evidence does not publish
the signer/transaction nonce, the registry leaves those fields null and relies
only on exact confirmed pre-freeze inclusion; it does not invent missing
transaction metadata.

The proof recursively parses every checked-in JSON file under `ops/mainnet0`
using a closed extraction policy for reviewed signed-transaction evidence:

- every canonical `signed_transaction_hash` field;
- `funding_transaction_hash` at three exact reviewed marker/path pairs;
- `transaction_hash` at the three exact Buy VOID activation paths
  (`deployment`, `send_to_ops`, and `ops_spend`); and
- `delivery_transaction_hash` at the exact private-chain production-selector
  checkpoint path.

The distinct discovered set must equal the **eight** registry hashes exactly.
Malformed values at reviewed paths fail closed, and an unreviewed path inside a
reviewed schema also fails closed. Any newly introduced key whose name ends in
`transaction_hash` (other than explicitly unsigned transaction hashes) also
fails until its schema/path is reviewed and either added to the lineage baseline
or explicitly classified.

The sovereign genesis-append request's nested funding hash echoes the already
bound sovereign-owner funding transaction rather than creating a new lineage.
Repository evidence can therefore contain multiple reviewed references to one
signed transaction while the registry remains deduplicated by exact hash.

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

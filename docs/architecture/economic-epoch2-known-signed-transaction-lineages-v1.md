# Epoch-2 known signed transaction lineages v1

Marker: `VOID_ECONOMIC_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1`

Status: repository-evidence baseline only. Global pending-signed-transaction
census remains `HOLD`.

## Purpose

The frozen epoch-1 nonce census proves exact final account nonces, but it does
not by itself enumerate every raw transaction that may have been signed and
retained off-chain.

This registry binds every distinct known Chain-2050 transaction hash currently
evidenced by canonical reviewed repository sources. Eleven belong to retained
or frozen epoch-1 history:

1. private-chain economic-recovery sequence — block 37368;
2. private-chain economic-recovery sequence — block 37369;
3. confirmed Buy VOID delivery / recovery-sequence member — block 37370;
4. private-chain economic-recovery sequence — block 37371;
5. Buy VOID fulfillment deployment — block 37373;
6. Buy VOID treasury send-to-ops — block 37376;
7. Buy VOID ops spend to fulfillment — block 37377;
8. role-authority deployer gas funding — block 37378; exact transaction nonce
   is not published; frozen final signer nonce is 130;
9. role-authority deployment — signer nonce 0, frozen final nonce 1;
10. sovereign-owner gas funding — nonce 129, frozen signer nonce 130; and
11. sovereign genesis registry append — nonce 0, frozen signer nonce 1.

Those eleven are included by the frozen block-37392 snapshot and stale under
retained-state continuity. Five additional hashes belong to superseded cross-recovery owner-test canaries: the Base/Ethereum send-to-ops and spend transactions from the guarded 102.46-VOID test, plus the 2,500-VOID delivery from the legacy 25-USDC test. Canonical premine reconciliation
states those deliveries are absent from retained current Chain-2050 history, so
their signer, nonce, retained block, and replay staleness are not inferred.
They are recorded with `replay_staleness_proven=false`.

Two additional reviewed Chain-2050 transactions are also bound but are **not**
promoted into the stale set because their checked-in public evidence lacks the
complete nonce/block metadata needed for that proof:

- the historical OpsTreasury seed transaction
  `0x98288e5a34ea28d63aa2ab396ef83a21c4fcc55747b7acebc53122591ed86fb2`,
  sourced from
  `ops/mainnet/mainnet0-ops-treasury-seed-live.20260524-115943.md`; its
  legacy treasury-admin signer is known and has frozen final nonce 9, but the
  transaction nonce/block number are not published in that artifact; and
- the first public WC→VOID settlement transaction
  `0xaccef593ae1cab3f99ff786a26913b0d873ee789dfb96056007dd9dab9f3e717`,
  sourced from
  `docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.json`;
  the public receipt intentionally redacts signer identity and does not publish
  the transaction nonce/block number.

Both use
`historical_disposition=REVIEWED_CHAIN2050_HISTORY_RETENTION_OR_NONCE_STALENESS_UNPROVEN`
and `replay_staleness_proven=false`.

For retained lineages whose repository evidence does not publish the
signer/transaction nonce, the registry leaves those fields null and relies only
on exact confirmed pre-freeze inclusion; it does not invent missing metadata.

The proof recursively parses every checked-in JSON file under `ops/mainnet0`
using a closed extraction policy for reviewed signed-transaction evidence, and
also parses the authoritative four-hash incident sequence in
`tools/void-private-chain2050-economic-recovery-contract-v1.mjs`:

- every canonical `signed_transaction_hash` field;
- `funding_transaction_hash` at three exact reviewed marker/path pairs;
- `transaction_hash` at the three exact Buy VOID activation paths
  (`deployment`, `send_to_ops`, and `ops_spend`); and
- `delivery_transaction_hash` at the exact private-chain production-selector
  checkpoint path.

The independent equation is exact: eight distinct hashes come from reviewed
`ops/mainnet0/**/*.json`; the four-hash recovery-contract sequence adds three
new hashes because block 37370 overlaps that JSON set, yielding eleven retained
hashes; `buy-void-fulfillment-10246-live.md` contributes four guarded
cross-recovery hashes;
`buy-void-real-fulfillment-closeout-proof.sh` contributes the legacy 25-USDC
delivery hash; `mainnet0-ops-treasury-seed-live.20260524-115943.md` contributes
the reviewed OpsTreasury seed hash; and the redacted public WC→VOID settlement
receipt contributes the reviewed settlement hash. The union must equal the
**eighteen** registry hashes exactly.

Known non-lineage hash locations are classified explicitly instead of being
silently ignored:

- the Buy VOID and Datanet compiled-identity
  `$.unresolved.deployment_transaction_hash` fields are reviewed null
  placeholders and fail if they become non-null;
- the role-authority signing authorization
  `$.exact_unsigned_transaction_hash` is shape-validated as an unsigned
  transaction identity and excluded from the signed-lineage set; and
- the epoch-2 Besu free-gas
  `$.transaction_proof.transaction_hash` is shape-validated as successor-only
  test evidence and excluded from the frozen epoch-1 lineage set.

Malformed values at reviewed paths fail closed, and an unreviewed path inside a
reviewed schema also fails closed. Any newly introduced key whose name ends in
`transaction_hash` (other than the existing explicit unsigned form) fails
until its schema/path is reviewed and either added to the lineage baseline or
explicitly classified.

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

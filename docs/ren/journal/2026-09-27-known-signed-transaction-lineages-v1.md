# 2026-09-27 — Known Signed Transaction Lineages V1

Marker: `VOID_REN_EPOCH2_KNOWN_SIGNED_TRANSACTION_LINEAGES_V1`

## Canonical base

`ae72c8e9cf90edc7c1fc0ee3ad5da3d708b95d04`

## Why this lane exists

Exact frozen nonce continuity already proves the known retained deployment raw
transaction is stale, but the migration replay wall correctly refuses to infer
that every possible off-repo signed transaction has been censused.

A repository evidence sweep now binds twenty distinct reviewed Chain-2050
transaction hashes. Eleven belong to retained/frozen epoch-1 history:

- private-chain recovery sequence at blocks 37368 and 37369;
- confirmed Buy VOID delivery / recovery member at block 37370;
- private-chain recovery sequence at block 37371;
- Buy VOID fulfillment deployment at block 37373;
- Buy VOID treasury send-to-ops at block 37376;
- Buy VOID ops spend to fulfillment at block 37377;
- role-authority deployer gas funding at block 37378;
- role-authority deployment at block 37379;
- sovereign-owner gas funding at block 37391; and
- sovereign genesis registry append at block 37392.

Those eleven are included by the block-37392 freeze and stale under retained
state continuity. Five additional hashes come from superseded cross-recovery owner-test canaries: four from the guarded 102.46-VOID branch plus the legacy 25-USDC / 2,500-VOID delivery. Because canonical
premine reconciliation says those deliveries are absent from retained current
history, their replay staleness remains unproven rather than inferred.

Two additional reviewed transactions are now bound without overclaiming
staleness: the historical OpsTreasury seed hash from the May-24 live execution
record and the first public WC→VOID settlement hash from its redacted receipt.
Their checked-in evidence lacks sufficient nonce/block detail for a staleness
proof, so both remain `replay_staleness_proven=false`.

The historical participant WC→VOID status contributes two additional
Precision-local 8545 devnet hashes (approve + swap). That source explicitly
marks local-Anvil-only mutation with a temporary proof wallet. They are bound
as reviewed local-devnet history but remain outside the retained stale set.

The proof builds the eleven-hash reviewed repository baseline from two closed
inputs. First, it recursively sweeps reviewed signed-transaction evidence
locations under `ops/mainnet0/**/*.json`: canonical
`signed_transaction_hash` fields, three exact funding-hash locations, three
exact Buy VOID `transaction_hash` paths, and one exact selector
`delivery_transaction_hash` path. That JSON sweep contributes eight distinct
lineages. Second, it parses the authoritative four-hash block-37368..37371
sequence from
`tools/void-private-chain2050-economic-recovery-contract-v1.mjs`; block 37370
is already present in the JSON set, so this contributes three additional
distinct hashes. The proof also parses four successful guarded-102.46 historical send/spend hashes from
`ops/mainnet0/buy-void-fulfillment-10246-live.md` and binds their
`SUPERSEDED_BY_RECOVERY` / not-retained classification from
`ops/mainnet/mainnet0-premine-allocation.current.json`. It additionally binds the legacy 25-USDC delivery hash from `ops/mainnet0/buy-void-real-fulfillment-closeout-proof.sh`. The proof additionally binds the OpsTreasury seed Markdown and public WC→VOID
redacted receipt as two reviewed non-stale-proven lineages. The combined
distinct set plus the two reviewed local-devnet WC hashes must equal the twenty
registry hashes exactly.

Reviewed non-lineage locations are separately shape-bound: two null deployment
placeholders, one exact unsigned role-authority transaction hash, and the
successor-only Besu free-gas transaction hash. Unknown hash-like paths still
fail closed.

## Boundary

The registry is a baseline for the later operator census, not the census
completion itself.

It keeps:

- `pending_legacy_signed_transaction_census_complete=false`;
- `privileged_signer_nonce_or_key_replay_fence_proven=false`;
- `cross_epoch_replay_protection_proven=false`.

No arbitrary filesystem scan, credential read, wallet/key access, signing,
broadcast, chain write, migration, activation, or funds movement occurs.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.

# 2026-09-25 — Economic Execution Simplification and Fund-Safety V1

Marker: `VOID_REN_ECONOMIC_EXECUTION_SIMPLIFICATION_V1`

## Decision

ZoSo authorized Ren to simplify the private economic EVM architecture while
keeping funds safe and preserving the fresh Mainnet-0 ceremony key lineage.

The chosen direction is now:

```text
epoch-1 private Anvil EVM
  -> immutable Economic Genesis Archive

final live economic value + live obligations
  -> clean non-Anvil epoch-2 successor
```

The migration preserves value and obligations, not the entire historical
bootstrap/governance contract graph.

## Funds and supply

The reconciled premine reference remains `333,333,333 VOID`, but that value is
not a forever-hardcoded migration total.

At eventual freeze:

```text
successor VoidToken.totalSupply()
  == final live source VoidToken.totalSupply()
  <= 666,666,666 VOID
```

Every ordinary holder keeps the same address and same `VoidToken` balance.

Contract-held value is preserved only through an explicit migration manifest.
No retired contract may retain unmapped or orphaned `VoidToken`.

The funded presale inventory, validator stake value/accounting, market
inventory, and any other live obligation discovered at freeze must be conserved
exactly.

## Ceremony-key continuity

The May 23 Mainnet-0 key ceremony remains the privileged-key continuity source.

The repository records public addresses only; secret material remains off-repo
and the verified VOIDKEY2 backup remains part of continuity evidence.

Successor privileged roles must use the recorded ceremony addresses unless a
later separate explicit authorization approves a new key.

Old Anvil/dev privileged keys receive no successor write authority.

## AdminGate / ConfigGate / relayer

AdminGate and ConfigGate are not required in the successor and remain archived
by default.

Historical bootstrap source did not show treasury dependence on AdminGate and
explicitly said `AdminGate.systemContracts` keys were not yet wired there.

The legacy WC relayer is an off-chain/dev loopback service and receives no
migration authority.

Any old contract migrates only when final live-state evidence proves that live
economic value or a live obligation would otherwise become inaccessible.

## Canonical VoidToken

The successor keeps the canonical `VoidToken` identity/address.

Balances, total supply, and ordinary holder ownership remain exact.

If the token has a privileged authority field that must change for epoch 2, the
change may target only a verified ceremony address under the explicit migration
manifest.

Participants do not swap into a new token merely because the execution layer
changes.

## Fund-safety lock

Migration preparation itself may not move funds.

The migration mechanism is an offline successor state build/import, not a chain
of live treasury transfers.

Before any later live cutover can be proposed:

1. source economic writes are frozen;
2. accepted transactions are finalized;
3. two independent read-only snapshot reconciliations agree;
4. all holders and live obligations are enumerated;
5. the successor is built offline;
6. source/successor holder, supply, and obligation equivalence is proven;
7. unmapped `VoidToken` is exactly zero;
8. orphaned contract-held `VoidToken` is exactly zero;
9. ceremony-key successor role mapping is verified; and
10. a separate explicit live-cutover authorization is granted.

## Source changes

- PR #1850 merged source safety at
  `0cc16633b103c6cc93eebd3d4456902a9737f843`, fail-closing participant-wallet
  mutation and retiring the legacy WC->VOID relayer route. Merge did not imply
  deployment/restart.
- PR #1846 was closed as superseded because participant self-paid native-gas
  assumptions no longer match the reviewed economic boundary.
- PR #1847 was closed as superseded by corrected BTC/VOID hardening in #1848.
- PR #1851 records the simplified value-preserving successor architecture and
  remains draft/HOLD.
- PR #1849 is linked to #1851 as the execution-layer resolution path.

## Prepared next live step

A source-only read-only census observer was added on the #1851 branch:

- `tools/void-economic-evm-final-value-census-v1.mjs`
- `scripts/prove_void_economic_evm_final_value_census_v1.mjs`

The observer is intended to reconstruct `VoidToken` holders from Transfer
history, reread every balance at one fixed block, prove holder-sum equals
`totalSupply`, identify contract-held balances, and observe presale inventory
accounting.

It is not executed by this journal entry.

It has no credential, wallet, signing, broadcast, chain-write, token-movement,
or funds authority.

## Current truth boundary

PRs #1837, #1848, #1849, and #1851 remained draft/open at this journal update.
Their focused CI queues were still pending/queued; queued checks are not treated
as green proof.

No economic migration, state export, wallet access, signing, broadcast, token
movement, presale activation, market activation, or funds movement occurred in
this pass.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.

# BTC/VOID Atomic Settlement State Invariants V1

Marker: `VOID_BTC_VOID_ATOMIC_SETTLEMENT_STATE_INVARIANTS_V1`

This Phase-0 source contract makes the planned native BTC/native VOID atomic
settlement state machine deterministic and fail-closed. It evaluates synthetic
traces only. It is not live market capability and does not construct a Bitcoin
or Chain-2050 transaction.

## Fixture boundary

Every accepted contract binds:

- official pair `native_btc/native_void` only;
- direction `BTC_TO_VOID` or `VOID_TO_BTC`;
- `bitcoin_regtest` and `isolated_chain_2050_test_v1` on Chain ID 2050;
- exact quote and reserve-snapshot identities;
- one SHA-256 hashlock; and
- asymmetric refund horizons with an explicit minimum safety margin.

For BTC-to-VOID, the Bitcoin refund horizon must be at least the VOID horizon
plus the safety margin. For VOID-to-BTC, the VOID horizon must be at least the
Bitcoin horizon plus the margin. This is a deterministic fixture invariant,
not proof of wall-clock or canonical-chain observation.

## State invariants

The only success path is:

```text
RESERVED -> HASH_BOUND -> SOURCE_FUNDED -> SOURCE_CONFIRMED
  -> COUNTERPARTY_LOCKED -> PREIMAGE_REVEALED
  -> BOTH_CLAIMS_OBSERVED -> SETTLED
```

Bounded terminal alternatives are `EXPIRED`, `REFUNDED`, `HELD`, and
`CANCELLED_BEFORE_FUNDING`. A terminal state cannot reopen and no terminal
state automatically retries.

Every transition is receipt-backed and content-addressed. An exact replay of
an already-applied event is idempotent and leaves the evaluation identity
unchanged. A different event, stale `from_phase`, skipped phase, changed
receipt, unknown field, wrong network identity, unsafe refund ordering, or
post-terminal event fails closed.

## Authority boundary

The evaluator does not persist a journal, reserve executable inventory, access
a wallet or signer, query either chain, construct or broadcast a transaction,
seed liquidity, mutate the Buy VOID presale, or move funds. The $0.50 presale
remains a separate temporary mechanism and must close under its own rules
before market activation.

This proof does not establish Bitcoin script correctness, Chain-2050 contract
correctness, canonical-chain membership, confirmations, restart recovery, or a
live settlement. Bitcoin regtest execution plus isolated Chain-2050 execution
remain the next separately reviewed Phase-1 proof gate after Phase-0 contracts
are complete.

## Local proof

```sh
node scripts/prove_void_btc_void_atomic_settlement_state_invariants_v1.mjs
```

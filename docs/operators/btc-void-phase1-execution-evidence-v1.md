# BTC/VOID Phase-1 execution evidence admission v1

Marker:

`VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_V1`

Status:

`PHASE1_EXECUTION_EVIDENCE_ADMITTED_NONPRODUCTION`

## Purpose

Merged BTC/VOID source invariants prove the settlement state machine, current
market-policy binding, integer conservation, replay/terminal rules, and
trade-funded fee policy. Those source proofs deliberately report:

```text
bitcoin_regtest_executed=false
chain2050_execution_performed=false
```

They are not execution evidence.

This contract defines the admission boundary for issue #2330. A later execution
harness must produce independent Bitcoin Core regtest and isolated Chain-2050
readback observations. This verifier binds those observations to the reviewed
source-model evaluation and fee quote without granting production authority.

## Reviewed source bindings

The v1 verifier pins the exact reviewed Git blobs for:

- BTC/VOID atomic-settlement state invariants;
- trade-funded fee policy;
- quote math;
- the Epoch-2 production-successor equivalence evidence; and
- the client-neutral Epoch-2 state manifest.

The atomic evaluation must additionally carry the exact reviewed dependency
blobs for quote math, reserve policy, buyback-journal transition, bounded
stdin, shared-market V2, and the canonical coupled-market candidate.

All 12 admitted cases must come from one atomic source HEAD **and one source
tree**. Mixing source generations or source trees in one Phase-1 suite fails
closed.

## Bitcoin execution identity

Every case requires an independent Bitcoin observation with:

- marker `VOID_BITCOIN_REGTEST_EXECUTION_OBSERVATION_V1`;
- `network=regtest`;
- the canonical Bitcoin Core regtest genesis hash
  `0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206`;
- bounded block/transaction identities;
- a content-addressed raw RPC transcript digest;
- `bitcoin_core_jsonrpc_readback_v1`; and
- explicit proof that no Bitcoin mainnet contact or mainnet transaction
  occurred.

The observation itself is content-addressed as `voidbtcp1btc1_<sha256>`.

## Isolated Chain-2050 identity

Every case requires a separate isolated execution observation with:

- marker `VOID_CHAIN2050_ISOLATED_EXECUTION_OBSERVATION_V1`;
- `chain_id=2050`;
- `execution_epoch=2`;
- environment `isolated_nonproduction_phase1`;
- client class `production_non_dev_evm_client`;
- Epoch-2 genesis block hash
  `0x8b522cd3dad5301f2d48c2fb1a750fca1e55dfcaa8bf699423bccdb5a061d01d`;
- Epoch-2 genesis state root
  `0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b2`;
- bounded transaction/receipt/block identities; and
- `production_rpc_contact=false` /
  `authoritative_production_write=false`.

The Phase-1 environment may perform isolated test writes. Those writes are not
production Chain-2050 authority.

## Required suite coverage

One suite must contain exactly one content-addressed case for each:

1. `btc_to_void_success`
2. `void_to_btc_success`
3. `btc_refund`
4. `chain2050_refund`
5. `wrong_preimage_rejected`
6. `wrong_amount_rejected`
7. `wrong_script_rejected`
8. `premature_claim_rejected`
9. `timeout_refund`
10. `replay_rejected`
11. `restart_recovery`
12. `reorg_reconciliation`

Success cases require the reviewed atomic evaluation to reach `SETTLED`.
Refund cases require `REFUNDED`. Rejection cases cannot present a settled
atomic evaluation and must include independent rejection evidence proving no
terminal value effect.

Restart evidence requires durable-state reload with the same contract identity
and zero duplicate terminal effects.

Reorg evidence requires an observed bounded regtest reorg, invalidation of the
orphaned observation, canonical reconfirmation, and no double settlement.

## Cross-rail binding

Each case content-addresses one cross-rail binding tying together:

- atomic settlement contract ID;
- hashlock/preimage domain;
- Bitcoin observation ID;
- isolated Chain-2050 observation ID; and
- reviewed trade-funded fee quote ID.

The binding explicitly records that the source-only atomic evaluation is not
execution evidence. The independent rail observations are required in addition.

## Deliberate first-slice boundary

This source slice does **not**:

- invoke `bitcoin-cli` or Bitcoin JSON-RPC;
- invoke Chain-2050 RPC;
- construct, sign, submit, or broadcast a transaction;
- access wallets, signers, private keys, or credentials;
- reserve production BTC/VOID inventory;
- contact Bitcoin mainnet;
- contact production Chain-2050;
- seed liquidity or treasury funds; or
- activate the BTC/VOID market or presale.

A later #2330 harness/action must execute the actual test cases and feed its
readback receipts into this verifier.

The verifier therefore reports evidence admission, not execution performed by
the verifier itself.

## CLI

The verifier reads one bounded JSON suite from stdin:

```bash
node tools/void-btc-void-phase1-execution-evidence-v1.mjs --pretty < phase1-suite.json
```

A valid result has a content-addressed ID:

```text
voidbtcp1ev1_<sha256>
```

## Authority

The emitted authority object keeps all of these false:

- Bitcoin regtest execution performed by the verifier;
- isolated Chain-2050 execution performed by the verifier;
- Bitcoin mainnet contact;
- production Chain-2050 contact;
- wallet/signer/private-key access;
- transaction construction/signing/broadcast;
- production inventory reservation;
- production liquidity/treasury action;
- market/presale activation; and
- production funds movement.

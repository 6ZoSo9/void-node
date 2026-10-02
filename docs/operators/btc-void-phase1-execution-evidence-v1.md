# BTC/VOID Phase-1 execution evidence structural preview v1

Marker:

`VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_PREVIEW_V1`

Status:

`PHASE1_EXECUTION_EVIDENCE_STRUCTURAL_PREVIEW_NOT_EXECUTION_VERIFIED`

## Purpose

Merged BTC/VOID source invariants prove the settlement state machine, current
market-policy binding, replay/terminal rules, and source-only fee policy. Those
source proofs deliberately report:

```text
bitcoin_regtest_executed=false
chain2050_execution_performed=false
```

They are not execution evidence.

This contract now serves only as a **structural preview / schema normalizer** for
issue #2330. It validates the closed 12-case shape, reviewed source identities,
content-addressed claim objects, regtest/isolated-2050 identity literals, and
cross-object references.

It does **not** prove that Bitcoin Core or an isolated Chain-2050 client produced
the supplied observations. In particular it does not replay raw RPC transcript
bytes, Chain-2050 receipt bytes, restart/reorg evidence bytes, executed
cross-rail preimages, fee-envelope arithmetic, or native-unit conservation.

Therefore caller-supplied or synthetic suites can produce only the preview
marker/status. Authoritative Phase-1 execution admission remains reserved for a
later #2330 execution harness/observer boundary that independently rederives
those semantics from exact evidence bytes.

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

## Bitcoin observation claim shape

Every preview case requires a structurally valid Bitcoin observation claim with:

- marker `VOID_BITCOIN_REGTEST_EXECUTION_OBSERVATION_V1`;
- `network=regtest`;
- the canonical Bitcoin Core regtest genesis hash
  `0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206`;
- bounded block/transaction identities;
- a content-addressed raw RPC transcript digest;
- `bitcoin_core_jsonrpc_readback_v1`; and
- explicit proof that no Bitcoin mainnet contact or mainnet transaction
  occurred.

The observation claim is content-addressed as `voidbtcp1btc1_<sha256>`. This proves only internal content identity; the referenced raw RPC transcript is not replayed by this preview.

## Isolated Chain-2050 observation claim shape

Every preview case requires a separate structurally valid isolated Chain-2050 observation claim with:

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

The later Phase-1 environment may perform isolated test writes. This preview only validates the claimed observation shape and does not verify receipt bytes or prove that a write occurred. Those future test writes are not production Chain-2050 authority.

## Required structural suite coverage

One structural preview must contain exactly one content-addressed claim for each:

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

Success claim objects must pair with a source-only atomic evaluation that reports `SETTLED`; refund claims pair with `REFUNDED`; rejection claims cannot pair with a settled evaluation and must carry the closed rejection-evidence shape. These are consistency checks, not proof that the rail events occurred.

Restart and reorg objects are likewise structural claims. Their `evidence_sha256` values are syntax/content references only; this preview does not consume or verify the referenced evidence bytes.

## Cross-rail binding

Each case content-addresses one structural cross-rail binding tying together:

- atomic settlement contract ID;
- hashlock/preimage domain;
- Bitcoin observation ID;
- isolated Chain-2050 observation ID; and
- reviewed trade-funded fee quote ID.

The binding explicitly records that the source-only atomic evaluation is not execution evidence. `same_preimage_domain=true` and the hashlock are claim fields here; this preview does not rederive them from executed rail artifacts.

## Deliberate preview boundary

This source slice does **not**:

- invoke `bitcoin-cli` or Bitcoin JSON-RPC;
- invoke Chain-2050 RPC;
- construct, sign, submit, or broadcast a transaction;
- access wallets, signers, private keys, or credentials;
- replay or verify raw Bitcoin RPC transcript bytes;
- replay or verify Chain-2050 receipt/state evidence bytes;
- verify restart/reorg/rejection evidence bytes;
- rederive cross-rail preimage/hashlock execution;
- rederive executed fee-envelope accounting;
- prove native-unit execution conservation;
- reserve production BTC/VOID inventory;
- contact Bitcoin mainnet;
- contact production Chain-2050;
- seed liquidity or treasury funds; or
- activate the BTC/VOID market or presale.

A later #2330 harness/action must execute the actual test cases and produce
reviewed observer receipts/evidence bytes. A later authority-bearing admission
step must independently rederive those receipts before any
`...EXECUTION_EVIDENCE_ADMITTED...` marker/status is allowed.

The current API intentionally produces a structural preview only, even when every
claim object is internally consistent and content-addressed.

## CLI

The preview validator reads one bounded JSON suite from stdin:

```bash
node tools/void-btc-void-phase1-execution-evidence-v1.mjs --pretty < phase1-suite.json
```

A structurally valid result has only a `preview_id`:

```text
voidbtcp1preview1_<sha256>
```

It does not emit the former authoritative-looking `evidence_suite_id` field.

## Authority

The emitted authority object explicitly states:

- `structural_preview_only=true`;
- `source_evidence_structural_validation_only=true`;
- `execution_evidence_verified=false`;
- `authoritative_execution_admission=false`.

Coverage additionally keeps these false:

- Bitcoin regtest execution evidence admitted;
- isolated Chain-2050 execution evidence admitted;
- raw RPC transcripts replayed;
- Chain-2050 receipts replayed;
- restart/reorg evidence bytes verified;
- cross-rail preimage execution rederived;
- executed fee-envelope accounting verified;
- native-unit execution conservation verified; and
- production authority granted.

The existing production safety boundary also remains false for Bitcoin mainnet
contact, production Chain-2050 contact, wallet/signer/private-key access,
transaction construction/signing/broadcast, production inventory reservation,
liquidity/treasury action, market/presale activation, and production funds
movement.

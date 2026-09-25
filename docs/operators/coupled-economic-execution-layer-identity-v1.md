# Coupled economic execution-layer identity v1

Marker: `VOID_COUPLED_ECONOMIC_EXECUTION_LAYER_IDENTITY_V1`

Status: source-only launch-safety audit. No deployment, service mutation, wallet
access, transaction, activation, or funds movement is authorized.

## Finding

The repository currently uses the name **Chain-2050** across two materially
different execution surfaces:

1. the public VOID node/P2P/block runtime; and
2. the private loopback EVM economic RPC used by current `VoidToken`,
   treasury, presale, registry, and market-contract tooling.

The deployed economic record points to:

```text
chainId=2050
source_of_truth_rpc=http://127.0.0.1:8545
VoidToken=0x470075B85352Eb86f7d089fb9ba88945f12AAd94
```

The private-RPC durability source explicitly identifies that endpoint as a
private Anvil Chain-2050 RPC. Its checkpoint machinery persists
`anvil_dumpState` state outside the repository.

Separately, the repository's newer canonical native-account value-transfer
store/block-executor is explicitly source-only and unmounted.

Current audited source does **not** prove that the private Anvil block/state
history is the same history as the public P2P/block runtime, nor does it prove a
cryptographic state-root/checkpoint anchor from the private EVM history into the
public block history.

That ambiguity is acceptable for guarded development. It is not acceptable as
an implicit assumption for public money intake.

## Launch invariant

Before public presale or WC/VOID activation, the project must explicitly resolve
the economic execution-layer model.

At minimum the reviewed decision must answer:

- Which history is canonical for `VoidToken` ownership and economic contracts?
- How does that history relate to the public VOID-node block/P2P history?
- Can an outside participant independently verify a `VoidToken` balance,
  transaction receipt, contract code, and finalized state without trusted
  access to an operator-private loopback RPC?
- What is the native EVM gas currency economically?
- What creates, destroys, credits, or replenishes native gas balances?
- Is native gas part of the capped VOID supply, a separate operational
  accounting asset, or temporary private-execution infrastructure?
- If the private EVM remains authoritative, what is its public
  verification/finality/durability and disaster-recovery contract?
- If economic state migrates to the public chain/native execution model, what
  exact migration and conservation proof binds old `VoidToken` state to the
  successor?

## Acceptable resolution classes

This gate does not force one design.

### A. Explicit economic EVM layer

A private/current EVM lineage may become a reviewed economic execution layer
only after its role is named explicitly and participants receive independently
verifiable state/receipt evidence. Its relationship to the public VOID chain,
finality, durability, native gas, and supply accounting must be explicit.

### B. Canonical-chain migration

Economic contracts/state may instead migrate into a future canonical public
execution path. That path must preserve exact `VoidToken` supply/custody and
payment/settlement history under a reviewed migration and conservation proof.

## Current HOLDs

Until one resolution is exact-green:

```text
economic_execution_layer_identity_resolved=false
economic_execution_layer_public_verification_ready=false
native_gas_currency_supply_accounting_ready=false
```

These are coupled launch gates for both presale and WC/VOID.

They are intentionally distinct from ordinary RPC availability. A healthy
loopback Anvil endpoint does not by itself prove public economic verifiability.

## Historical evidence

Existing private Chain-2050 Anvil receipts/checkpoints remain exact evidence of
their own execution history. This audit does not rewrite or invalidate them.

Likewise, the public VOID node block history remains evidence of its own
history. This gate exists precisely to prevent documentation from silently
claiming those histories are identical without a reviewed binding.

## Authority boundary

This audit performs no RPC call, state export, checkpoint operation, chain
write, deployment, migration, wallet/signer access, transaction construction,
transaction broadcast, inventory movement, market activation, presale
activation, or funds movement.

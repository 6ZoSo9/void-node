# VOID private Chain-2050 production selector deployment v1

Marker: `VOID_PRIVATE_CHAIN2050_PRODUCTION_SELECTOR_DEPLOYMENT_V1`

## Purpose

This source-only lane closes the V10 preflight blocker
`production_selector_driven_launcher_not_deployed` without exercising production
authority.

The existing selector, checkpoint, startup integration, durability gate, and
Mainnet-0 wrapper remain canonical. This lane does **not** create another startup
implementation. It seals the exact shape that a later, separately authorized
operator preparation must materialize before ZoSo can make the P0-D production
promotion decision.

## V10 truth being closed

The read-only V10 preflight established:

- production `8545` is healthy but still runs the pinned epoch127 deployment
  runner at block `37367`;
- the finalized block-`37371` recovery checkpoint remains exact and
  isolated-real-start green;
- the production checkpoint root is separate and empty;
- the selector/startup dry run is exact green for minimum `37371`;
- Buy VOID apply/submission surfaces are disabled and unresolved durability debt
  is zero; and
- no production mutation occurred.

Therefore the remaining pre-promotion source gap is not another recovery or
selector primitive. It is an immutable production deployment binding for the
already-reviewed selector wrapper.

## Source packet

The packet consists of:

- `ops/mainnet0/void-private-chain2050-production-selector-deployment-v1.json`
- `ops/systemd/user/void-private-chain2050-rpc-selected-durable-v1.service.example`

The deployment contract is anchored to source commit
`1b3429b9e938b4c590ecc1601677394d8d7081cb`.

The future immutable deployment root is:

```text
/home/zoso/.local/share/void-private-chain2050-rpc-v1/deployments/selector-37371-main-1b3429b9-v1
```

The source packet copies only reviewed selector/startup artifacts into that root.
The manifest pins each repository path to its exact Git blob at the reviewed
anchor. It also pins the existing Foundry v1.5.1 Anvil binary by SHA-256.

## Baseline normalization

The currently deployed epoch127 snapshot is a JSON string wrapper around the
`anvil_dumpState` hexadecimal gzip payload. The selector accepts raw
`anvil_dump_state_hex`, not that JSON-string wrapper.

P0-C3 therefore must:

1. require the exact existing wrapper at `/home/zoso/.local/share/void-private-chain2050-rpc-v1/deployments/anvil-v1.5.1-epoch127-20260723T210919Z/state/epoch127.snapshot.json`;
2. require wrapper SHA-256 `bb58dee389c8129ad68369f413a1469521a95c5eaf224488011ca140834a69c9`;
3. JSON-decode the wrapper to its string value only;
4. write those exact ASCII `0x...` bytes as the private normalized baseline;
5. require normalized SHA-256 `02afeb49a6eced1c1f3889d62f308f07df099c0c75699226e89d60fdb434ede7`;
6. preserve mode `0600`.

Normalization does **not** inflate gzip, parse chain state, replay a transaction,
or alter the existing production baseline.

## Recovery checkpoint promotion shape

The exact recovery source remains:

```text
/home/zoso/.local/state/void-private-chain2050-rpc-v1/recovery-candidate-checkpoints-v6
```

The canonical production checkpoint root remains:

```text
/home/zoso/.local/state/void-private-chain2050-rpc-v1/checkpoints-v1
```

The future P0-D checkpoint step is create-only and content-preserving for the
exact block-37371 state, manifest, and finalization marker named in the manifest.
The state SHA-256 is fixed at
`88937f269bfadb150821794cae874ea312b6b5525b8b81b40bb0b7102b3aa248`.
The marker text is fixed exactly.

The source lane does not perform this copy. P0-C3 must additionally pin the
recovery manifest file SHA-256 before P0-D, because that digest is runtime
evidence rather than repository source.

## Selector-driven service shape

The service template points `ExecStart` only at the copied immutable
`mainnet0-start-8545-selected-durable-state.sh`. Its environment fixes:

- baseline block/hash: `37367` / exact ancestor hash;
- production checkpoint root: `/home/zoso/.local/state/void-private-chain2050-rpc-v1/checkpoints-v1`;
- independent minimum: `37371`;
- derived root: `/home/zoso/.local/state/void-private-chain2050-rpc-v1/startup-derived-v1`;
- RPC: `http://127.0.0.1:8545/`;
- mode: `apply`;
- confirmation: `startPrivateChain2050FromSelectedDurableState`.

The production checkpoint trio is also expressed as `ConditionPathExists`
requirements, so an installed future unit cannot silently start from the stale
baseline when the required promoted checkpoint is absent.

The template deliberately contains one unresolved sentinel:

```text
__SEALED_NODE_BIN__
```

P0-C3 must replace it only after resolving an absolute Node executable and
pinning its SHA-256. Source review does not guess that operator runtime value.

## Fail-closed semantics

The deployment contract requires:

- minimum block `37371`;
- zero generated/unlocked accounts through the inherited startup contract;
- normal transaction automining, with no implicit interval mining;
- no stale baseline fallback;
- no automatic rollback to block `37367`;
- HOLD with the production economic lane disabled on failed promotion/startup;
- separate checkpoint, derived, durability, and Buy VOID journal roots.

The service template has no credential directive, wallet material, transaction
submission command, checkpoint-copy command, package install, systemd mutation,
or fallback launcher.

## Authority boundary

This lane is source, documentation, deterministic proof, workflow, branch, and
draft-PR metadata only.

It does **not**:

- materialize the private deployment root;
- normalize the live baseline;
- copy/promote the recovery checkpoint;
- install or alter a systemd unit;
- start/stop/restart/reload/signal `8545`;
- access credentials, private keys, wallets, or signers;
- submit or replay a transaction;
- re-enable Buy VOID;
- mutate Work Credits, validators, treasury, or funds.

## Next gate

After review and merge, P0-C3 is a separate operator-seal/preparation gate. It
may create a private staging deployment, pin the Node executable, normalize the
baseline, and prove the candidate unit/checkpoint-copy plan while still leaving
the installed production unit, production checkpoint root, and `8545` untouched.

Only after P0-C3 is exact green does the sovereign P0-D production-promotion
decision become eligible.

Refs #1182, #1185, #1186.

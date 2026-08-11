# VOID private Chain-2050 production selector deployment v1

Marker: `VOID_PRIVATE_CHAIN2050_PRODUCTION_SELECTOR_DEPLOYMENT_V1`

## Purpose

This source-only lane closes the production selector-deployment gap without
exercising production authority.

The existing selector, checkpoint, startup integration, durability gate, and
Mainnet-0 wrapper remain canonical. This lane does **not** create another startup
implementation. It seals the exact shape that a later, separately authorized
operator preparation must materialize before ZoSo can make the P0-D production
promotion decision.

## Recovery and preflight truth

The read-only production preflight established:

- production `8545` is healthy but still runs the pinned epoch127 deployment
  runner at block `37367`;
- the finalized block-`37371` recovery checkpoint remains exact and
  isolated-real-start green;
- the production checkpoint root is separate and empty;
- the selector/startup dry run is exact green for minimum `37371`;
- Buy VOID apply/submission surfaces are disabled and unresolved durability debt
  is zero; and
- no production mutation occurred.

The first P0-C3 seal attempt then found a source-contract blocker before staging:
the deployment packet SHA-pinned Anvil v1.5.1, but the startup tool still used
bare `spawn("anvil", ...)`, leaving the executable selected by ambient `PATH`.

The V13 repair closes that mismatch in the existing canonical startup path.

## Source packet

The packet consists of:

- `ops/mainnet0/void-private-chain2050-production-selector-deployment-v1.json`
- `ops/systemd/user/void-private-chain2050-rpc-selected-durable-v1.service.example`

The deployment contract now anchors its selector/startup source files to commit
`b7e77da1bb540c242e59e18191972aca8d717293`, the first exact commit containing
the V13 fixed wrapper/tool bytes. Each staged source path is also pinned by its
exact Git blob.

The future immutable deployment root remains:

```text
/home/zoso/.local/share/void-private-chain2050-rpc-v1/deployments/selector-37371-main-1b3429b9-v1
```

The packet also pins the existing Foundry v1.5.1 Anvil binary by SHA-256:

```text
b47362d2159aa0f2f575320e5e529bb5a91093cb62dc6bd30c0022018aa9f738
```

and requires it at the exact staged path:

```text
/home/zoso/.local/share/void-private-chain2050-rpc-v1/deployments/selector-37371-main-1b3429b9-v1/bin/anvil
```

## Exact Anvil executable binding

The canonical startup integration now accepts:

```text
--anvil-bin ABSOLUTE_PATH
--anvil-sha256 SHA256
```

The Mainnet-0 wrapper requires the corresponding closed operator inputs:

```text
VOID_MAINNET0_8545_ANVIL_BIN
VOID_MAINNET0_8545_ANVIL_SHA256
```

A supplied Anvil executable must be:

- an absolute canonical path;
- free of symlink components;
- a regular file owned by the current operator uid;
- owner-executable;
- free of group/other write permission and setuid/setgid bits;
- bounded in size; and
- byte-exact to the expected SHA-256.

Dry-run plans supplied with a binding expose the exact absolute executable path,
SHA-256, and observed mode. Apply with the correct existing startup confirmation
still fails closed if the Anvil binding is absent.

After selected-state materialization and Anvil-argument validation, the startup
tool revalidates the exact executable path and SHA-256 immediately before process
creation and calls `spawn()` with that absolute path. It never falls back to a
bare `anvil` command or ambient `PATH` resolution.

This revalidation closes the plan-to-start drift case: changing the executable
after planning causes a digest HOLD before spawn.

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
The state SHA-256 remains
`88937f269bfadb150821794cae874ea312b6b5525b8b81b40bb0b7102b3aa248`.

The source lane does not perform this copy. P0-C3 must additionally pin the
recovery manifest file SHA-256 before P0-D, because that digest is runtime
evidence rather than repository source.

## Selector-driven service shape

The service template points `ExecStart` only at the copied immutable
`mainnet0-start-8545-selected-durable-state.sh`. Its environment fixes:

- exact staged Anvil path and SHA-256;
- baseline block/hash: `37367` / exact ancestor hash;
- production checkpoint root: `/home/zoso/.local/state/void-private-chain2050-rpc-v1/checkpoints-v1`;
- independent minimum: `37371`;
- derived root: `/home/zoso/.local/state/void-private-chain2050-rpc-v1/startup-derived-v1`;
- RPC: `http://127.0.0.1:8545/`;
- mode: `apply`; and
- confirmation: `startPrivateChain2050FromSelectedDurableState`.

The staged Anvil path and the production checkpoint trio are expressed as
`ConditionPathExists` requirements. Missing checkpoint authority therefore cannot
silently downgrade startup to the stale baseline.

The template deliberately retains one unresolved sentinel:

```text
__SEALED_NODE_BIN__
```

P0-C3 must replace it only after resolving an absolute Node executable and
pinning its SHA-256. Source review does not guess that operator runtime value.

## Proof wall

`prove_void_private_chain2050_anvil_executable_binding_v1.mjs` covers:

- non-absolute and non-canonical path rejection;
- missing executable rejection;
- symlink rejection;
- non-executable and unsafe-mode rejection;
- wrong SHA-256 rejection;
- exact plan binding;
- apply-without-binding HOLD before materialization;
- post-plan binary-change rejection;
- absolute-path spawn source contract; and
- removal of ambient `PATH` Anvil resolution.

The production deployment workflow runs this proof and the existing selector,
startup, checkpoint, and Mainnet-0 wrapper regressions on Node.js 22, 24, and 26.

## Fail-closed semantics

The deployment contract continues to require:

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

After review and merge, P0-C3 is retried as a separate operator-seal/preparation
gate. It may create the private staging deployment, pin Node, copy the exact
pinned Anvil binary, normalize the baseline, seal the recovery-manifest digest,
and prove the candidate unit/checkpoint-copy plan while still leaving the
installed production unit, production checkpoint root, and `8545` untouched.

Only after P0-C3 is exact green does the sovereign P0-D production-promotion
decision become eligible.

Refs #1182, #1185, #1186, #1209.

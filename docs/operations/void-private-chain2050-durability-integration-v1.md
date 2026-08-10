# VOID private Chain-2050 durability integration v1

## Purpose

This lane composes the merged private Chain-2050 durability primitives into the actual Buy VOID mutation and startup boundaries.

It addresses two distinct failure modes:

1. a Buy VOID native transaction can change the private Chain-2050 Anvil state and later be confirmed while the newer state still exists only in memory; and
2. a later Anvil start can load a valid but stale baseline instead of the highest durable state required by economic truth.

Parent primitives:

- #1177 — crash-consistent, finalized `anvil_dumpState` checkpoint capture;
- #1180 — fail-closed durable-state startup selection.

This integration remains source-only. It does not capture production state, install or restart a service, load a real wallet credential, broadcast a transaction, move funds, or change the live `127.0.0.1:8545` process.

## Why checkpointing cannot happen at broadcast acceptance

Broadcast acceptance does not yet establish the canonical delivery block.

The existing native delivery receipt reconciler later reads only:

1. `eth_chainId`;
2. `eth_getTransactionReceipt`; and
3. `eth_blockNumber`.

Only after that reconciliation validates the transaction and reaches the configured confirmation floor does the existing execution-attempt journal contain a canonical confirmed record with:

- delivery chain `2050`;
- exact delivery transaction hash; and
- exact delivery block number.

The checkpoint minimum must therefore be bound to the confirmed delivery block, not guessed immediately after submission.

## Mutation durability debt

`src/economic/buy_void_chain2050_durability_gate_v1.ts` introduces a private append-only debt history plus one atomic active-debt claim.

Default durability root:

```text
<VOID_BUY_VOID_RUNTIME_DIR>/chain2050-durability-v1
```

The operator may instead configure:

```text
VOID_BUY_VOID_CHAIN2050_DURABILITY_ROOT=/ABSOLUTE/PRIVATE/PATH
```

The history contains private mode-`0600` records under mode-`0700` directories:

```text
debts/
resolutions/
satisfactions/
```

The root may also contain one hard-linked active claim:

```text
active-debt-v1.json
```

No raw signed transaction is persisted.

### Atomic broadcast boundary

The production dependency injector wraps the Chain-2050 broadcaster.

For every signed transaction it:

1. computes the exact transaction hash from the signed bytes;
2. create-only persists and fsyncs the transaction-specific debt record;
3. atomically hard-links that exact debt record to `active-debt-v1.json`;
4. fsyncs the durability root;
5. verifies that the active file and debt history are the same inode; and only then
6. invokes the underlying broadcaster.

Only one active claim can exist. A second concurrent request cannot cross the active-claim boundary while another mutation is unresolved.

### Interrupted pre-claim write

A crash can happen after the transaction-specific debt history is fsynced but before the active hard link is acquired.

That record is **pre-claim debris**, not mutation authority.

The broadcaster is never called until the active hard link is durably acquired, so an unclaimed debt record is counted but does not block startup or imply that a transaction may have been submitted.

### Accepted or unknown broadcast

If submission is accepted, the active debt remains unresolved.

If transport fails or the broadcaster reports that submission may have occurred, the active debt also remains unresolved.

Later automatic broadcasts are blocked while that debt remains active.

### Definitive no-broadcast

The debt may be resolved without a checkpoint only when the broadcaster explicitly returns both:

```text
accepted=false
submission_may_have_occurred=false
```

That path writes a durable `definitive_not_broadcast` resolution before releasing the active claim.

No ambiguous transport result may use this path.

## Production dependency injection gate

`src/economic/buy_void_native_delivery_runtime_dependencies_v1.ts` remains the common production dependency boundary for both native delivery and the one-request native execution runtime.

When:

```text
VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED=1
```

it now also requires:

```text
VOID_BUY_VOID_CHAIN2050_DURABILITY_GATE_ENABLED=1
```

If the durability gate is not enabled, the process initializer returns:

```text
chain2050_durability_gate_required
```

before loading the fulfillment-wallet credential or publishing signer/broadcaster dependencies.

This prevents production source configuration from exposing the mutation dependency while bypassing the durability gate.

The programmatic dependency-construction function retains an explicit injected gate option for deterministic tests; the process initializer is the production environment boundary.

## Confirmed checkpoint discharge

`src/economic/buy_void_chain2050_durability_runtime_v1.ts` mounts loopback-only operator routes:

```text
GET  /__void/operator/buy-void-chain2050-durability-v1/status
POST /__void/operator/buy-void-chain2050-durability-v1/command
```

Apply is disabled by default through:

```text
VOID_BUY_VOID_CHAIN2050_DURABILITY_RUNTIME_ENABLED=0
```

The command accepts only an `attempt_id`, `apply`, and confirmation field. It does not accept an RPC URL, checkpoint path, private key, signer, wallet, raw transaction, or arbitrary policy.

For apply it requires the exact confirmation:

```text
buyVoidSealConfirmedChain2050Checkpoint
```

The runtime then:

1. requires exactly one active unresolved durability debt;
2. loads the exact server-side Buy VOID execution attempt;
3. requires that attempt to be `confirmed`;
4. binds the active debt to the confirmed Chain-2050 transaction hash;
5. reads the confirmed delivery block number;
6. invokes the merged #1177 checkpoint tool against the server-controlled loopback Chain-2050 RPC;
7. passes the confirmed delivery block as `--minimum-block-number`;
8. requires a finalized checkpoint on chain `2050` at or above that block; and
9. append-only records debt satisfaction before the active claim can be reused.

If checkpoint capture or satisfaction fails, the active debt remains blocking. A later successful retry may reuse the content-addressed checkpoint generated by an earlier partial run.

The checkpoint runtime itself does not sign or broadcast a transaction and does not move money.

## Server-controlled path separation

The following paths are intentionally distinct:

```text
VOID_BUY_VOID_RUNTIME_DIR
VOID_BUY_VOID_CHAIN2050_DURABILITY_ROOT
VOID_PRIVATE_CHAIN2050_CHECKPOINT_ROOT
```

A custom durability root is never inferred to be the Buy VOID journal root.

The updated systemd example keeps all three explicit and remains disabled by default.

## Selector-driven startup

`tools/void-private-chain2050-startup-integration-v1.mjs` is the source-side canonical routine-start launcher for private Chain-2050 state.

It requires the operator to pin the immutable baseline identity and provide the checkpoint root plus independently required minimum block.

The launcher delegates selection to merged #1180. It therefore cannot silently choose a valid state below the required minimum and cannot treat unfinalized checkpoint debris as authority.

### Dry run

Dry run is the default.

It:

- validates the pinned baseline;
- validates finalized checkpoints;
- selects the highest unambiguous durable state meeting the minimum; and
- returns the selection and required apply confirmation.

Dry run does not create a derived state file, load Anvil state, start a process, replay a transaction, or mutate a service.

### Dump-state materialization

Anvil `anvil_dumpState` bytes are stored by #1177 exactly as returned.

When #1180 selects an `anvil_dump_state_hex` checkpoint, apply may convert the gzip-encoded dump to a private canonical CLI-state JSON file under:

```text
~/.local/state/void-private-chain2050-rpc-v1/startup-derived-v1
```

or an explicitly configured private derived root.

The derived directory is mode `0700`; the content-addressed state file is mode `0600` and create-only/idempotent.

Materialization occurs only **after** the exact apply confirmation:

```text
startPrivateChain2050FromSelectedDurableState
```

### Apply and post-load truth

Apply starts only:

```text
anvil --chain-id 2050 --load-state <exact selected/materialized state>
```

on a numeric loopback RPC address.

Before the wrapper considers startup verified, it independently requires:

- `eth_chainId == 2050`;
- the exact selected block number to exist;
- that block's hash to equal the selector's pinned block hash; and
- the live head to be at or above the selected block.

If verification fails, the newly started Anvil child is terminated.

The startup integration performs no transaction replay or historical reconstruction.

## Crash matrix

| Failure point | Durable interpretation | Next mutation allowed? |
|---|---|---|
| before debt history | no mutation claim | yes |
| after debt history, before active hard link | pre-claim debris; broadcaster not called | yes |
| after active hard link, before/during broadcaster | submission may have occurred | no |
| definitive broadcaster rejection with `submission_may_have_occurred=false` | durable no-broadcast resolution | yes |
| broadcast accepted/unknown, before receipt confirmation | active durability debt | no |
| receipt confirmed, before checkpoint | active durability debt bound to confirmed block | no |
| checkpoint written, satisfaction write fails | active debt remains; checkpoint may be reused | no |
| satisfaction durable | finalized checkpoint covers confirmed block | yes |
| restart with only stale baseline below required minimum | startup HOLD | n/a |
| restart with safe unfinalized checkpoint debris | debris ignored; cannot satisfy minimum | n/a |
| restart with finalized checkpoint at/above minimum | exact state selected and post-load verified | n/a |

## Source verification

Focused proof:

```bash
npx tsx scripts/prove_buy_void_chain2050_durability_integration_v1.ts
```

Expected marker:

```text
VOID_BUY_VOID_CHAIN2050_DURABILITY_INTEGRATION_V1_PROOF_GREEN
```

Startup proof:

```bash
node scripts/prove_void_private_chain2050_startup_integration_v1.mjs
```

Expected marker:

```text
VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_V1_PROOF_GREEN
```

The focused workflow also re-runs the merged checkpoint and startup-selector proofs plus existing native delivery dependency and receipt-runtime regressions.

## Deployment boundary

Merging this source does **not** change the running private Chain-2050 RPC.

Deployment remains a separately authorized P0-A gate and must include, at minimum:

1. inspect the current real 8545 service/launcher and its exact loaded baseline;
2. establish the independently required durable minimum from existing economic receipts;
3. configure private runtime, durability, checkpoint, and derived-state paths;
4. deploy the selector-driven startup path rather than a fixed stale snapshot path;
5. enable the durability gate before enabling signer/broadcaster dependency injection;
6. capture/seal any required current durable checkpoint before allowing new mutation;
7. restart only under a separately reviewed operator action; and
8. prove post-restart chain ID, selected block hash, current head, Buy VOID journals, service identity, and no stale fallback.

No historical receipt should be rewritten to pretend that previously lost in-memory state had been durably captured.

## Authority boundary

This lane authorizes source, proof, documentation, CI, branch publication, and draft-PR metadata only.

It does not authorize a live checkpoint, Anvil start/stop/restart, systemd mutation, package installation, credential/private-key access, wallet access, signing, transaction construction/broadcast, Buy VOID fulfillment, inventory movement, Work Credit mutation, validator mutation, treasury action, or fund movement.

Refs #1177, #1180, and capability-closure plan #1182.

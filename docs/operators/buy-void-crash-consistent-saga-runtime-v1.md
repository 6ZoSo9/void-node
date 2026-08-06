# Buy VOID crash-consistent saga runtime v1

Marker:

`VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1`

Decision:

`SOURCE_ONLY_NON_MONEY_RUNTIME_COMPOSITION_READY_FOR_REVIEW_MONEY_STAGES_REMAIN_UNMOUNTED`

## Problem

The crash-consistent fulfillment saga was merged as a standalone tool and proof contract. The mounted Buy VOID runtime still wrote the legacy claim, inventory, and execution-attempt journals without making the saga the durable restart coordinator.

A naive dual write would create a split-brain crash window. The process could commit a legacy projection and terminate before the saga append, or append the saga event before the legacy write. Retrying blindly could duplicate a payment claim, inventory reservation, or execution attempt.

## Runtime surface

This lane adds the action:

```text
run_crash_consistent_saga_stage
```

through the existing loopback-only parent routes:

```text
GET  /__void/operator/buy-void-runtime-v1/status
POST /__void/operator/buy-void-runtime-v1/command
```

Both the parent runtime and this child runtime remain disabled by default. This child requires:

```text
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED=1
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION=<server policy ID>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS=<positive integer>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS=<positive integer>
```

The fixed pool identity is `void-fixed-price-pool-v1`. Capacity, per-reservation limit, root directory, request directory, saga binding, lease owner, fencing token, and canonical request snapshot are server controlled.

## First implementation boundary

Only three non-money saga actions are mounted:

1. `claim_payment`
2. `reserve_inventory`
3. `reserve_execution_attempt`

Each invocation advances at most one business stage. The first successful invocation may also create the saga's initialization event; initialization is not a business mutation.

The runtime does not mount:

- transaction preparation;
- wallet or signer access;
- signing;
- RPC submission;
- broadcast or rebroadcast;
- receipt acceptance;
- inventory decrement;
- public fulfilled closeout; or
- money movement.

Once the saga reaches `attempt_reserved`, the next action is `prepare_transaction`. This runtime returns a fail-closed hold because that stage remains outside the authorized boundary.

## Canonical binding

The binding is derived from server evidence, never from caller input:

```text
request_id
canonical_payment_identity
request_key_sha256
payment_key_sha256
delivery_address
void_amount_units
chain_id=2050
pool_id=void-fixed-price-pool-v1
```

Before the first claim exists, the runtime uses the existing pipeline's dry-run decision to derive the candidate binding. The applied claim is then reread from the canonical fulfillment journal and must produce the exact same binding.

## Restart reconciliation

The saga is the restart coordinator. Its existing filesystem store supplies:

- a per-saga lease;
- a monotonically increasing fencing token;
- append-only hash-chained events;
- atomic event persistence; and
- exact current-head validation before append.

For every stage, the adapter first reads the legacy durable projection:

- an existing matching claim completes `claim_payment` without claiming again;
- an existing matching inventory reservation completes `reserve_inventory` without reserving again; and
- an existing matching attempt completes `reserve_execution_attempt` without creating another attempt.

This handles termination after a legacy projection commits but before the corresponding saga event appends. A retry backfills the missing saga event from validated server evidence.

The opposite ordering is prevented: the saga does not append a business event until the delegated legacy operation returns and the resulting canonical projection has been reread and validated.

## Conflict behavior

The runtime holds with zero further writes when it sees:

- more than one claim for the request;
- more than one inventory reservation matching the request or payment;
- more than one execution attempt;
- an attempt without a canonical inventory reservation;
- an inventory reservation without a canonical claim;
- a saga, claim, reservation, or attempt binding mismatch;
- a malformed, symlinked, oversized, or non-object canonical request file;
- a caller-supplied path, binding, snapshot, intent, inventory policy, lease value, credential, wallet, RPC URL, or transaction material; or
- a stage beyond the three non-money actions.

Automatic retry is false. The operator must make a new explicitly confirmed invocation after reviewing the returned state.

## Proof

The focused real-filesystem proof injects failure immediately after each delegated durable projection write:

- claim write;
- inventory-reservation write; and
- execution-attempt write.

A fresh invocation then recovers from the persisted projection and appends the missing saga event without calling the delegated mutation a second time. The final chain is exactly:

```text
saga_initialized
claim_committed
inventory_reserved
attempt_reserved
```

The proof also verifies increasing fencing tokens, dry-run zero writes, loopback enforcement, default-off behavior, server-controlled binding and inventory policy, malformed and symlinked request rejection, conflicting projection zero-write behavior, the parent runtime dispatch, and Node.js 22, 24, and 26 compatibility.

Expected marker:

```text
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1_PROOF_GREEN
```

## Authority boundary

This lane changes source, documentation, proof, and CI only. It does not deploy or restart a service, enable a runtime, inspect or mutate live requests, access credentials, wallets, private keys, or signers, construct or prepare a transaction, call an RPC, sign, broadcast, decrement inventory, mark a public request fulfilled, issue or settle Work Credits, mutate validators, or move funds.

Runtime enablement, any live operator invocation, transaction preparation, wallet or signer access, signing, broadcast, receipt reconciliation, fulfillment closeout, deployment, and money movement remain separate explicit gates.

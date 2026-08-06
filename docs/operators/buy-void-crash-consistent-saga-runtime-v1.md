# Buy VOID crash-consistent saga runtime v1

Marker:

`VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1`

Decision:

`SOURCE_ONLY_NON_MONEY_RUNTIME_COMPOSITION_WITH_SERVER_CONTROLLED_POLICY_READY_FOR_REVIEW`

## Problem

The crash-consistent fulfillment saga was merged as a standalone tool and proof contract. The mounted Buy VOID runtime still wrote the legacy claim, inventory-reservation, and execution-attempt journals without making the saga the durable restart coordinator.

A naive dual write would create a split-brain crash window. The process could commit a legacy projection and terminate before the saga append, or append the saga event before the legacy write. Retrying blindly could duplicate a payment claim, inventory reservation, or execution attempt.

The first runtime composition also accepted verification, fulfillment, and execution policies inside caller-supplied `stage_command`. Those policies determine accepted payment rails, confirmations, receive address, rate, inventory ceiling, execution chain, wallet allowlist, and attempt cap. Loopback transport is not policy authority, so durable state must never be created under caller-selected economic policy.

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

Both the parent runtime and this child runtime remain disabled by default.

## Server-controlled policy

The runtime constructs all durable policy from bounded server configuration. It rejects caller-supplied verification, fulfillment, inventory, execution, rate, chain, confirmation, receive-address, wallet-allowlist, and attempt-cap fields before any journal or saga write.

Required configuration:

```text
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED=1
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CHAIN=<payment chain>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_USDC_CONTRACT=<USDC contract>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_RECEIVE_ADDRESS=<payment receiver>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_CURRENT_BLOCK_NUMBER=<current chain head>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PAYMENT_MIN_CONFIRMATIONS=<minimum confirmations>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR=<VOID units numerator>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR=<payment units denominator>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION=<policy identifier>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS=<positive integer>
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS=<positive integer>
VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS=<fulfillment wallet address>
```

Fixed policy:

- execution chain ID: `2050`;
- execution-attempt cap: `1`;
- inventory pool ID: `void-fixed-price-pool-v1`; and
- exact payment: required.

The public runtime status exposes only policy fingerprints and address fingerprints. It does not reveal raw wallet, payment-receiver, or contract addresses through the policy summary.

## Policy fingerprints

The server-policy module produces separate fingerprints for:

- stable payment-verification rules;
- the changing chain-head observation;
- fulfillment and rate policy;
- inventory policy;
- execution-attempt policy; and
- the combined stable policy.

The current block number is an observation, not a stable policy rule. Advancing the chain head changes the observation fingerprint but does not change the combined stable policy fingerprint or invalidate an in-progress saga.

Every dry run returns the required stable policy fingerprint. Apply requires an exact echo of that fingerprint. The saga initialization event binds it through:

```text
policy_id=void-buy-void-saga-runtime-policy-v1-<combined-policy-sha256>
```

Existing claim, inventory, attempt, and saga projections are checked against the current stable server policy. A changed rate, payment contract, receive address, confirmation floor, inventory policy, wallet allowlist, execution chain, or attempt cap causes a fail-closed hold rather than silently continuing under mixed policy.

## Caller input boundary

Before a claim exists, caller input is limited to:

```json
{
  "stage_command": {
    "receipt": {}
  }
}
```

The request and all policy are reconstructed server-side. After the claim is durable, `stage_command` is forbidden for inventory and execution-attempt stages because those stages require no caller-selected policy or execution material.

The caller cannot supply:

- a policy or policy fragment;
- a saga binding, intent, request snapshot, root, or request directory;
- a private key, mnemonic, seed, keystore, wallet secret, RPC URL, or broadcaster URL;
- a raw or signed transaction; or
- a transaction plan.

Input traversal is bounded and fails closed when nesting exceeds the documented maximum.

## First implementation boundary

Only three non-money saga actions are mounted:

1. `claim_payment`
2. `reserve_inventory`
3. `reserve_execution_attempt`

Each invocation advances at most one business stage. The first successful invocation may also create the saga initialization event; initialization is not a business mutation.

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

Once the saga reaches `attempt_reserved`, its next action is `prepare_transaction`. This runtime returns a fail-closed hold because that stage remains outside this lane.

## Canonical binding

The saga binding is derived from server evidence, never from caller input:

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

Before the first claim exists, the runtime uses the existing pipeline dry run with the server verification and fulfillment policies to derive the candidate binding. The applied claim is reread from the canonical fulfillment journal and must produce the same binding and remain valid under the same stable server policy.

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

- caller-supplied policy or execution material;
- a missing or mismatched stable policy fingerprint;
- more than one claim for the request;
- more than one inventory reservation matching the request or payment;
- more than one execution attempt;
- an attempt without a canonical inventory reservation;
- an inventory reservation without a canonical claim;
- a saga, claim, reservation, attempt, or server-policy binding mismatch;
- a malformed, symlinked, oversized, or non-object canonical request file; or
- a stage beyond the three non-money actions.

Automatic retry is false. The operator must make a new explicitly confirmed invocation after reviewing the returned state.

## Proof

The focused real-filesystem proof rejects caller attempts to substitute:

- payment chain;
- confirmation floor;
- exchange rate;
- payment receive address;
- fulfillment-wallet allowlist; and
- attempt cap.

Every substitution produces zero claim, inventory, attempt, and saga writes.

The proof also injects failure immediately after each delegated durable projection write:

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

Additional verification covers:

- stable and observation policy fingerprints;
- exact policy-fingerprint echo before apply;
- immutable saga policy binding;
- increasing fencing tokens;
- dry-run zero writes;
- loopback enforcement and default-off behavior;
- malformed and symlinked request rejection;
- conflicting projection zero-write behavior;
- parent runtime dispatch; and
- Node.js 22, 24, and 26 compatibility.

Expected markers:

```text
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_V1_PROOF_GREEN
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1_PROOF_GREEN
VOID_BUY_VOID_RUNTIME_INPUT_DEPTH_FAIL_CLOSED_V1_PROOF_GREEN
```

## Authority boundary

This lane changes source, documentation, proof, and CI only. It does not deploy or restart a service, enable a runtime, inspect or mutate live requests, access credentials, wallets, private keys, or signers, construct or prepare a transaction, call an RPC, sign, broadcast, decrement inventory, mark a public request fulfilled, issue or settle Work Credits, mutate validators, or move funds.

Runtime enablement, any live operator invocation, transaction preparation, wallet or signer access, signing, broadcast, receipt reconciliation, fulfillment closeout, deployment, and money movement remain separate explicit gates.

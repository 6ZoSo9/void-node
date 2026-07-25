# VOID Agent Paid Work Order Envelope V1

Marker: `VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1`

## Purpose

This lane defines a deterministic, machine-readable request that an outside AI
agent can use to ask VOID for bounded paid work. It establishes demand,
commercial limits, expected outputs, and a content-derived work-order ID before
any quote, acceptance, payment, or execution occurs.

The envelope is intentionally generic. A capability identifier can point to a
DataNet verification service, analysis service, or another separately admitted
VOID capability. Publishing an envelope does not claim that the requested
capability is live, available, accepted, or priced.

## Lifecycle boundary

V1 covers only the first step:

1. The requesting agent materializes a bounded work-order envelope.
2. VOID or another provider may return a separate quote or rejection.
3. A separate acceptance and payment rail must complete before execution.
4. Execution and result receipts belong to later, separately guarded lanes.

The envelope itself grants no authority. There is no automatic acceptance, no
automatic execution, no wallet access, no money movement, no Work Credit
mutation, no Buy VOID fulfillment, no validator mutation, and no operator
authority.

## Deterministic identity

`work_order_id` is:

```text
voidawo1_ + sha256(canonical_json(draft_without_work_order_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
non-JSON values, and uses compact JSON encoding. Any change to the requested
work, commercial limit, execution limit, callback URI, time window, or nonce
changes the ID.

## Required safety posture

V1 requires:

- `payment_required_before_execution=true`
- `external_side_effects_allowed=false`
- `wallet_access_allowed=false`
- `money_movement_allowed=false`
- A lowercase `https://` callback URI without embedded credentials or fragments
- A positive decimal `max_total` with at most 32 integer digits and 18
  fractional digits
- A forward expiration time
- At least one input reference
- At least one machine-safe logical output label

A later capability-specific lane may define additional policy, but it must not
silently weaken this envelope. `expected_outputs` values are logical labels, not
filesystem paths. A provider must never treat them as trusted pathnames.

The envelope proves only that `expires_at_utc` is later than `created_at_utc`.
A later intake or acceptance lane must compare expiration against a trusted
current clock and reject stale work orders.

## CLI

Materialize a draft:

```bash
npx tsx scripts/agent_paid_work_order_envelope_v1.ts \
  materialize draft.json work-order.json
```

Materialization creates the output with mode `0600` and refuses to overwrite an
existing path.

Verify a materialized envelope:

```bash
npx tsx scripts/agent_paid_work_order_envelope_v1.ts \
  verify work-order.json
```

Run the focused proof:

```bash
npx tsx scripts/prove_agent_paid_work_order_envelope_v1.ts
```

Expected marker:

```text
VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1_PROOF_GREEN
```

## Files

- `schemas/agent-paid-work-order-envelope-v1.schema.json`
- `examples/agent-paid-work-order-envelope-v1.example.json`
- `scripts/agent_paid_work_order_envelope_v1.ts`
- `scripts/prove_agent_paid_work_order_envelope_v1.ts`
- `.github/workflows/agent-paid-work-order-envelope-v1.yml`

## Non-goals

This lane does not add a public HTTP route, mutate `src/index.ts`, install a
service, select a provider, calculate a binding quote, receive funds, hold
customer assets, sign transactions, broadcast transactions, award WC, settle
WC to VOID, or activate Buy VOID fulfillment.

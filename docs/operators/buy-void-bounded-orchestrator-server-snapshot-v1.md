# Buy VOID bounded orchestrator server snapshot V1

## Purpose

This lane removes the client-supplied lifecycle snapshot from the bounded Buy
VOID planning surface. The operator submits only an exact `request_id`; the
node derives the request's lifecycle state from server-owned files and durable
journals.

The runtime remains disabled by default and dry-run-only. This lane does not
enable stage application, wallet access, signing, transaction broadcasting, or
money movement.

## Server-owned sources

The derived snapshot combines:

1. The immutable public request base record.
2. Append-only operator events, ordered by `marked_at_ms`.
3. The durable fulfillment claim journal.
4. The execution-attempt journal.
5. The broadcast-outcome journal.
6. The confirmed-state journal.

The public status projection validates the complete `prior_status` chain.
Multiple claims, duplicate attempt numbers, conflicting payment identities,
missing broadcast truth for broadcast/confirmed attempts, multiple confirmed
states, and fulfilled public status without confirmed state all hold.

## Runtime request

The existing loopback-only pipeline command accepts:

```json
{
  "action": "run_bounded_auto_fulfillment_stage",
  "request_id": "buyvoid_..."
}
```

The following are rejected:

- Any client-supplied `snapshot`
- Client-supplied runtime or request roots
- Missing or malformed request IDs
- Execution secrets or raw signed transactions
- `apply: true`

## Derived fields

The server snapshot produces:

- `request_id`
- `public_status`
- `canonical_payment_identity`, when claimed
- `claim_status`
- `attempt_id`, when reserved
- `attempt_status`
- `broadcast_status`

The orchestrator uses this derived snapshot to select exactly one next stage
for planning. No stage mutation is mounted by this lane.

## Safety contract

- Request-ID-only selector
- One request per invocation
- One stage transition per invocation
- Server-controlled roots
- Read-only filesystem access
- No RPC calls
- No wallet access
- No signing
- No transaction broadcast
- No money movement
- No automatic retry
- No background loop
- No startup execution

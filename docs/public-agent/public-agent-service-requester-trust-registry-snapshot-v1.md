# Public Agent Service Requester Trust Registry Snapshot V1

## Purpose

This contract verifies an operator-signed requester snapshot against a
separately pinned expected requester trust-root ID.

The snapshot contains deterministic requester acceptance key bindings for the
`agent_paid_work_accept` authority scope. A verified live snapshot can resolve
one active requester binding for a specific requester agent and timestamp.

## Trust model

The caller supplies the pinned expected requester trust-root ID separately from
the snapshot. The verifier requires exact equality with the root embedded in
the snapshot and verifies:

- deterministic trust-root, snapshot, binding, and authentication IDs;
- the Ed25519 signature over canonical snapshot and authentication bodies;
- canonical requester ordering;
- unique requester IDs, binding IDs, and requester key IDs;
- requester binding key derivation and authority scope;
- trust-root, snapshot, binding, and revocation windows; and
- one exact active requester binding at resolution time.

An `operator_signed_snapshot_verified` packet proves snapshot provenance. It
does not approve requesters by itself. Approval status is evidence inside the
signed snapshot and is not created or mutated by this verifier.

## Authentication gate

A live packet may report:

```text
eligible_for_requester_authentication=true
```

That means a later composition may resolve the exact requester key binding and
verify requester acceptance-authentication evidence against it.

This contract does not authenticate a requester. It does not consume
authentication IDs, write replay state, or create an acceptance. It does not
accept a quote. It does not authorize payment or execution.

## Snapshot continuity

Production use still requires external stateful enforcement for:

- snapshot replay protection;
- monotonically increasing registry sequence;
- continuity with `previous_snapshot_id`; and
- independently controlled trust-root pinning and rotation.

This verifier reports those requirements but performs no state write.

## Authority boundary

The adapter does not create, rotate, or revoke requester trust roots. It does
not create, approve, rotate, revoke, or write requester key bindings.

It does not select providers, publish quotes, authorize payment or execution,
dispatch work, award or settle Work Credits, access wallets or signers,
broadcast transactions, submit HTTP mutations, change credentials, deploy,
restart services, mutate runtime state, or move money.

## Verification

Run:

```bash
npx tsx scripts/prove_public_agent_service_requester_trust_registry_snapshot_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_AGENT_SERVICE_REQUESTER_TRUST_REGISTRY_SNAPSHOT_V1_EXACT_GREEN
```

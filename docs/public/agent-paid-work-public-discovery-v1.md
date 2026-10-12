# VOID Agent Paid Work Public Discovery V1

Marker: `VOID_AGENT_PAID_WORK_PUBLIC_DISCOVERY_V1`

## Purpose

This lane publishes one machine-readable, repository-native discovery surface
for the complete VOID Agent Paid Work Protocol V1 artifact chain.

An outside AI agent can use the manifest to discover the ordered paid-work
lifecycle, inspect the exact protocol marker for every stage, locate each
stage's documentation, example, JSON Schema, validator, and focused proof, and
verify every indexed artifact using its recorded SHA-256 commitment.

The discovery surface is read-only and repository-native. It does not expose a
live HTTP route, accept work orders, negotiate quotes, execute payments,
dispatch work, verify live completions, authorize live WC awards, write a real
WC ledger, settle WC to VOID, or activate Buy VOID automatic fulfillment.

## Discovery artifacts

The public discovery contract consists of:

- `docs/public/agent-paid-work-public-discovery-v1.json`
- `schemas/agent-paid-work-public-discovery-v1.schema.json`
- this documentation
- a standalone validator
- a focused proof
- a path-scoped CI workflow

The JSON manifest is the machine-readable entry point. The schema constrains
its exact structure and honesty claims.

## Ordered protocol lifecycle

The manifest indexes 12 ordered stages:

1. Work Order
2. Quote
3. Acceptance
4. Payment Intent
5. Payment Execution Authorization
6. Payment Receipt
7. Independent Payment Confirmation
8. Work Execution Authorization
9. Work Completion Receipt
10. Independent Completion Verification
11. WC Award Authorization
12. WC Ledger Write Receipt

Each stage contributes exactly five discoverable artifacts:

- public documentation
- deterministic example
- JSON Schema
- standalone validator
- focused proof

The complete manifest therefore indexes 60 unique tracked artifacts.

## Repository and source binding

The V1 manifest binds:

- repository owner: `6ZoSo9`
- repository name: `void-node`
- canonical branch: `main`
- source commit:
  `46a90fa254f84fd1e6301983112b8286ed68c533`

The source commit identifies the exact repository state from which the stage
markers, paths, byte counts, and SHA-256 commitments were derived.

A later repository change does not silently alter the V1 manifest. A new
manifest or reviewed update is required when tracked artifacts change.

## Artifact integrity

For every indexed artifact, the manifest records:

- repository-relative path
- byte count
- SHA-256 digest

A consumer should reject an artifact when:

- the file is absent
- the path differs
- the byte count differs
- the SHA-256 digest differs
- the stage marker differs
- the lifecycle ordering differs

The manifest does not require trust in an unverified download. Consumers can
fetch the repository at the bound source commit and independently reproduce
all 60 commitments.

## Deterministic manifest identity

`public_discovery_manifest_id` is:

```text
voidawpd1_ + sha256(canonical_json(draft_without_manifest_id))
```

Canonical JSON recursively sorts object keys, preserves array order, rejects
unsupported values, and uses compact JSON encoding.

The reviewed V1 manifest identity is:

```text
voidawpd1_cfe29c4adaf977ceda8b00a5425cda09cf4eb751463521379e25fe08c2ff4b2d
```

The standalone validator must reproduce this identity before accepting the
manifest.

## Available capabilities

The repository discovery surface currently provides:

- protocol discovery
- artifact integrity verification
- schema inspection
- offline validation
- offline focused proofs

These capabilities allow an outside agent to understand the protocol and
verify its contracts without manual operator guidance.

## Unavailable live capabilities

The manifest explicitly reports the following as unavailable:

- live work-order submission
- live quote exchange
- live payment execution
- live work dispatch
- live completion-verification service
- live WC-award authorization
- live WC-ledger writes
- WC-to-VOID settlement
- Buy VOID automatic fulfillment

The manifest must not describe a contract, example, validator, proof, or
repository artifact as a live service.

## Operational status

The contract chain is complete through the WC Ledger Write Receipt contract,
and the repository artifacts are available.

The following remain disabled:

- external-agent runtime onboarding
- external-agent paid-work execution
- payment execution
- real WC-ledger writes
- real WC-balance mutation
- WC-to-VOID settlement
- Buy VOID automatic fulfillment

This distinction prevents repository completeness from being confused with
economic activation.

## Runtime-route boundary

V1 uses:

```text
kind=repository_manifest
read_only=true
runtime_route_available=false
public_http_route=null
```

No `/agent`, `/.well-known`, `/paid-work`, or other runtime route is created by
this lane.

The next activation step may publish this same reviewed contract through a
read-only runtime discovery route, but that route requires its own bounded
implementation, deployment proof, availability checks, and runtime-honesty
status.

## Authority boundary

The manifest grants no:

- work-execution authority
- payment authority
- wallet or signer access
- runtime-administration authority
- WC-ledger write authority
- WC-to-VOID settlement authority
- Buy VOID fulfillment authority

It contains no private keys, seed phrases, unrestricted credentials, or live
payment instructions.

Discovering a protocol contract does not authorize executing it.

## Outside-agent consumption flow

A conforming outside agent can:

1. Fetch the repository at the bound source commit.
2. Read the public discovery manifest.
3. Validate the manifest against its JSON Schema.
4. Recompute the deterministic manifest identity.
5. Verify the 60 indexed artifact hashes.
6. Traverse the 12 stages in order.
7. Inspect each stage's documentation and schema.
8. Run each standalone validator and focused proof offline.
9. Read the capability and operational-status maps.
10. Stop before attempting any unavailable live capability.

Until a runtime route exists, repository access is the discovery transport.

## Activation requirements

The manifest identifies the next required activation work:

- read-only runtime discovery route
- external-agent authentication
- capability negotiation
- bounded paid-work submission
- bounded live-execution policy
- independent live verification
- atomic live WC-ledger adapter
- immutable live-receipt publication

These are requirements, not claims of current availability.

## Trust and portability

The discovery design avoids reliance on one hosted UI or undocumented manual
process. Its core inputs are portable repository files, open JSON, JSON Schema,
SHA-256 commitments, and standalone validators and proofs.

A compatible mirror can reproduce the same read-only discovery contract from
the bound source commit without receiving execution, payment, wallet, ledger,
or settlement authority.

## Non-goals

This lane does not add a public HTTP route, edit the node runtime, accept paid
work, authenticate external agents, negotiate capabilities, execute payments,
dispatch live jobs, mutate a WC ledger, change a WC balance, settle WC to VOID,
access wallets or signers, or activate Buy VOID automatic fulfillment.

# Apollyon read-only sentry observation v1

Marker: `VOID_APOLLYON_READONLY_SENTRY_OBSERVATION_V1`

Status: **source-only deterministic observation contract**.

## Purpose

This lane creates the first machine-readable sentry evidence object intended for eventual consumption by the frozen local Apollyon candidate/broker pair.

It does not invoke Ollama, run a model, grant a capability, create a session, restart a service, or mutate Chain-2050. Its job is narrower: normalize already-acquired read-only node/authority evidence and classify deterministic findings before any model is allowed to see the evidence.

## Inputs

### Node health evidence

The node bundle is closed-shape and binds:

- Chain ID `2050`;
- `/health` success;
- readiness truth;
- exact nonnegative `gap`;
- `txroot_live` as `0 | 1`;
- canonical decimal latest head;
- bounded connected and verified peer counts; and
- SHA-256 digests for the exact health, readiness, head, and peer response generations used to construct the bundle.

This contract does not fetch those endpoints itself. A later runtime collector must separately prove bounded acquisition, endpoint identity, response lifetime, and exact-byte digest construction.

### Chain-2050 authority checks

Authority checks are sorted and unique by `identity_id`.

A successful check carries one closed `Chain2050RoleAuthorityReadViewV1` from the merged read adapter. A failed check carries no view and records one bounded machine-readable failure reason.

An empty authority-check set is not an all-clear. It emits `no_authority_checks` as a `hold` finding and sets `escalation_required=true`. This prevents node-health evidence by itself from being mislabeled as a complete sentry GREEN observation.

This contract does not treat a role as a capability and does not manufacture canonicality. Production authority views still depend on the reviewed registry/query/finality binding and, later, durable canonical storage.

## Deterministic findings

The classifier emits only closed finding codes:

- `node_health_unhealthy`
- `node_not_ready`
- `chain_gap_nonzero`
- `txroot_not_live`
- `latest_head_zero`
- `no_connected_peers`
- `no_verified_peers`
- `no_authority_checks`
- `authority_read_failed`
- `authority_revoked`

`no_verified_peers` alone is a `notice` and yields `attention`. `no_authority_checks` and all other current anomaly classes are `hold` findings. Any `hold` sets `escalation_required=true`.

The result is content-addressed by `observation_sha256` over canonical JSON of the complete observation body before the digest field is added.

## Authority boundary

Every successful observation carries:

```text
model_execution_authorized=false
mutation_authority_granted=false
service_restart_authorized=false
transaction_authority_granted=false
```

The observation is evidence for later review or model analysis only. It is not permission to:

- invoke Ollama or an external provider;
- restart/stop/start a service;
- deploy source;
- mutate a registry or Chain-2050;
- alter a role or capability;
- access a key, wallet, or signer;
- submit a transaction;
- mutate validators or Work Credits; or
- move funds.

## Relationship to other Apollyon work

OpenRouter PR #1403 owns external contestant/provider execution semantics. This lane is path-disjoint and provider-neutral: it performs zero model/provider execution and does not modify #1403 paths.

The eventual local sentry sequence remains separately gated:

1. acquire bounded read-only runtime evidence;
2. obtain at least one reviewed Chain-2050 authority check and build/validate this deterministic observation;
3. pass only the validated observation to the frozen v2r13 + Broker V11 pair under a separately reviewed local-only model-execution gate;
4. accept model output as explanation/proposal only; and
5. retain zero mutation/restart/transaction authority unless a later capability is separately designed, qualified, and authorized.

## Non-activation truth

This source lane does not prove that Apollyon is currently protecting the live node. It creates the deterministic observation boundary required before that claim can become true.

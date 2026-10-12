# VOID Public Agent Service Acceptance Persistence Runtime Binding V1

## Purpose

This lane composes the sealed authenticated-acceptance transition with the
sealed immutable-generation persistence adapter behind a disabled-by-default
runtime boundary.

The binding can:

1. load the current replay-state snapshot from the server-controlled
   persistence store;
2. materialize and verify an authenticated acceptance against trusted catalog,
   work-order, and quote context;
3. return a dry-run plan without writing state; or
4. after exact enablement and confirmation, commit the acceptance document,
   requester-authentication replay consumption, provider-authentication replay
   consumption, and acceptance-ID replay consumption through the sealed
   persistence adapter.

## Sealed dependencies

The source contract is pinned to:

- source-evidence pack SHA-256:
  `4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec`;
- transition merge:
  `525e1c8f6200f1a590de42270d5a08ad21c6281b`;
- transition checkpoint:
  `ckpt-public-agent-service-acceptance-materialization-replay-consumer-v1-pr800-post-merge-exact-green-525e1c8f6200`;
- persistence-adapter merge:
  `b6354ff1c8b15a51e3f6379077982355b5a4b258`;
- persistence-adapter checkpoint:
  `ckpt-public-agent-service-acceptance-persistence-adapter-v1-pr804-post-merge-exact-green-b6354ff1c8b1`.

The default dependency table binds the exact merged functions for replay-state
identity, store inspection, transition planning, deterministic verification,
and persistence.

## Disabled-by-default environment

The runtime remains disabled unless the server sets:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_RUNTIME_ENABLED=1
```

The persistence root is server controlled:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ROOT=/var/lib/void-agent-paid-work-acceptance-persistence-v1
```

The command cannot provide or override the root directory, generation bounds,
recovery policy, or adapter confirmation.

When disabled, execution returns before command validation, store inspection,
trusted-context loading, transition planning, or persistence.

## Confirmation ordering

An applied command requires the exact runtime confirmation:

```text
persistAuthenticatedAcceptanceRuntimeV1
```

The confirmation is checked before store inspection and before the trusted
context provider is called. The binding then injects the sealed adapter
confirmation internally:

```text
persistVerifiedAcceptanceReplayTransitionV1
```

A dry-run command requires an empty confirmation and never invokes the
persistence adapter.

## Trusted context boundary

The command carries the signed requester-authentication input and acceptance
draft. Catalog, work-order, and quote values are supplied through a separate
trusted-context provider owned by the future runtime integration.

The binding derives the replay-state snapshot and expected revision from the
server store. A client cannot select the replay state, expected revision,
persistence root, or generation policy.

## Result boundary

The result exposes deterministic identifiers and state revisions, not the full
signed authentication input or private runtime configuration.

Applied results preserve the adapter status:

- `committed` becomes runtime status `persisted`;
- `duplicate` remains `duplicate`;
- `recovered` remains `recovered`.

The binding grants only acceptance persistence and the three replay writes
necessary to record quote acceptance. It grants no payment authorization,
payment execution, execution authorization, work dispatch, credential change,
provider selection, wallet access, production signing, transaction broadcast,
Work Credit write, HTTP submission, runtime mutation, or money movement.

## Source-only boundary

This lane does not edit `src/index.ts`, mount an HTTP route, install a systemd
drop-in, create the production store, restart the node, or invoke persistence
against a production path.

The proof uses deterministic injected dependencies to verify short-circuiting,
confirmation ordering, server-side state selection, dry-run behavior, applied
status mapping, and authority containment. The already sealed adapter proof
remains the source of truth for crash-consistent filesystem persistence.

A later runtime-integration lane must separately bind trusted record lookup,
mount a loopback operator route, provision the state directory, deploy with the
enable flag set to `0`, and prove disabled behavior before any live canary.

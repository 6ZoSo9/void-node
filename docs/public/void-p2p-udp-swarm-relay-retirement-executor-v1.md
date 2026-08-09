# VOID P2P UDP Swarm Relay Retirement Executor v1

## Purpose

Define the smallest one-shot, fail-closed mutation boundary that may consume the sustained direct-route health authorization from the current UDP Swarm stack and invoke an exact retained-relay retirement callback.

This lane is intentionally additive. It does **not** mount into `src/node_core.ts`, does not own a socket, and does not retire any live relay by itself. A later Node mount must supply both exact runtime revalidation and the exact relay-retirement callback.

## Parent contract

This executor is stacked directly on the exact-green Node health mount from PR #1137.

The parent already provides:

- an authenticated promoted UDP direct route;
- an exact retained relay fallback bound to session / peer / relay node / relay stream;
- one health probe and one fail-closed health observer per promoted route; and
- the #1131 current policy decision that can authorize relay retirement only after sustained successful direct-route health.

The parent deliberately stops at read-only authorization. This executor is the next isolated seam.

## Immutable binding

Each executor is constructed for one exact frozen tuple:

- promotion session ID;
- expected authenticated peer node ID;
- relay node ID; and
- relay stream ID.

Malformed bindings fail construction. The callback receives the exact frozen binding held by the executor rather than caller-supplied replacement values.

## Synchronous revalidation gate

Before any retirement callback can run, `execute()` calls the supplied `revalidate()` function and requires all of the following at that moment:

1. session / expected peer / relay node / relay stream still exactly match the executor binding;
2. authenticated peer identity still equals the expected peer;
3. the promoted direct route is still live;
4. the promoted route still uses direct transport;
5. the host reports the exact promoted direct-route object binding is still live;
6. the retained relay fallback is still live;
7. the host reports the exact retained relay object/stream binding is still live; and
8. the current #1131 health-policy decision is exactly `authorize_relay_retirement`, with all of that policy's mutation-performed fields still false.

Any missing, stale, changed, contradictory, or throwing revalidation fails closed **before** the retirement callback is invoked.

The `exact_*_binding_live` booleans are host assertions. The later Node mount must derive them from exact object identity and current map membership; endpoint strings alone are not sufficient.

## One-shot mutation semantics

The executor calls `retireExactRelayFallback(binding)` at most once.

The host callback contract is intentionally narrow: it must retire only the exact retained relay fallback identified by the frozen binding and must not mutate the promoted direct route.

Callback outcomes are treated as follows:

- `true`: terminal `retired`; relay retirement is recorded as performed;
- `false`: terminal `callback_rejected`; the callback contract states that no retirement was performed;
- throw: terminal `callback_indeterminate`; the executor reports relay-retirement state as `null` rather than falsely claiming success or failure.

After any callback attempt, the executor is terminal and never calls the callback again. This prevents automatic replay when a side effect may already have happened.

Precondition/revalidation rejection does **not** consume the executor because no mutation callback was attempted. A later call may succeed if the same exact binding remains live and a fresh current health decision authorizes retirement.

## Direct-route preservation

The executor never receives a direct-route mutation callback and fixes these authority fields to false:

- `direct_route_mutation_performed`;
- `verified_direct_evidence_persisted`; and
- `production_udp_activation_performed`.

A later Node mount must remove the retained fallback record from failback eligibility before closing the exact relay socket/stream, while leaving the promoted direct peer as the normal route. This additive primitive does not implement that Node-specific operation.

## Truth boundary for callback failure

A thrown mutation callback is not reported as `relay_retirement_performed=false`. Once an external side-effect callback begins, a throw can be ambiguous. The executor therefore enters `callback_indeterminate`, returns `relay_retirement_performed=null`, and permanently blocks automatic retry.

This is deliberate fail-closed behavior: an operator or a higher-level reconciliation path must inspect actual runtime state before any further action.

## Proof

Run:

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_relay_retirement_executor_v1.ts
```

The synthetic proof covers:

- malformed construction rejection;
- exact binding immutability;
- stale health authorization rejection;
- changed session / peer / relay / stream rejection;
- authenticated-identity mismatch;
- dead or non-direct promoted route rejection;
- exact-direct-binding loss rejection;
- dead relay fallback rejection;
- exact-relay-binding loss rejection;
- throwing revalidation without callback execution;
- successful one-shot retirement callback;
- replay rejection after success;
- terminal callback-false handling; and
- terminal indeterminate handling after callback throw.

Expected marker:

```text
VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_EXECUTOR_V1_PROOF_GREEN
```

## Next seam

After this primitive is exact-head green, a separate Node-integration child may mount it into the #1137 promoted-route state. That mount must synchronously derive the exact revalidation booleans from current `Peer` object identity and retained-fallback state, remove the exact fallback from failback eligibility before socket destruction, and prove that direct routing remains untouched.

## Authority boundary

This PR is source, documentation, synthetic proof, and read-only CI only.

It performs no live relay retirement, no live socket close, no Node route mutation, no verified-direct persistence, no public/production UDP activation, no deployment/restart, no router/firewall/DNS/interface mutation, no credential/private-key access, no wallet/signer/validator/Work Credit authority, no transaction action, no broadcast, and no fund movement.

# Public Agent Service Trusted Requester Acceptance Persistence Composition V1

## Purpose

This contract closes the reviewed same-process boundary between:

1. the provenance-verified trusted requester acceptance replay-plan verifier; and
2. the immutable-generation acceptance persistence adapter.

The composition does not rebuild requester or provider trust from a lower-level
runtime command. It validates the full trusted-requester replay-plan input,
derives the current replay-state snapshot from the operator-owned persistence
store, runs the trusted-requester replay-plan materializer and verifier, and
passes that verifier's returned `acceptance_replay_plan_packet` directly to the
sealed persistence adapter through an in-process provider function.

## Disabled-by-default boundary

The operator-owned composition configuration contains:

- `enabled`;
- the sealed persistence adapter configuration; and
- the absolute persistence root and all generation limits inside that adapter
  configuration.

When `enabled=false`, the composition returns `disabled` before command
validation, input-provider invocation, store inspection, replay planning, or
persistence.

The command never contains `allowed_root`, replay state, generation limits,
recovery policy, catalog, work order, quote, signed requester evidence, or the
sealed adapter confirmation.

## Confirmation ordering

A dry run requires:

```text
apply=false
confirmation=""
```

It may inspect the operator-owned store, inject its current replay state into the
trusted replay-plan input, and validate the complete provenance-to-replay chain.
It does not call the persistence adapter and grants no persistence authority.

An applied call requires the exact composition confirmation:

```text
persistTrustedRequesterAcceptanceReplayPlanV1
```

This confirmation is checked before the trusted-input provider or persistence
store is accessed. The composition then constructs the sealed adapter request
internally with:

```text
persistVerifiedAcceptanceReplayTransitionV1
```

The client or trusted-input provider cannot supply or replace that adapter
confirmation.

## Same-process verified-packet boundary

For external evidence the composition:

1. validates the trusted replay-plan input;
2. replaces only the lower replay-state snapshot and expected revision with the
   current server-store state;
3. materializes the trusted requester replay-plan packet;
4. runs the deterministic trusted requester replay-plan verifier;
5. validates the returned lower packet with the persistence adapter's read-only
   packet validator; and
6. on apply, passes that exact returned lower packet directly to
   `persistVerifiedPublicAgentServiceAcceptanceV1` in the same process.

The lower packet must retain the trusted requester and provider authentication
IDs, handoff, quote, work order, requester, provider, acceptance nonce, plan ID,
acceptance ID, transaction ID, exact before/after states, one revision advance,
one atomic three-ID transition, and one active acceptance per quote.

## Result statuses

The composition reports:

- `disabled` when the operator configuration is disabled;
- `example_only` for the committed non-authoritative fixture;
- `planned` for a complete dry-run transition;
- `persisted` when the adapter receipt is `committed`;
- `duplicate` when the adapter suppresses the exact transition; and
- `recovered` when the adapter recovers an exact orphaned generation.

The in-process result may include the operator root realpath. A future HTTP
surface must continue to fingerprint or redact that path.

## Persistence authority

A successful temporary or production apply records atomically:

- the canonical acceptance;
- requester-authentication replay consumption;
- provider-authentication replay consumption;
- acceptance-ID replay consumption; and
- quote acceptance through the active-acceptance map.

Applied results therefore report only these narrow authority fields as true:

```text
acceptance_persistence=true
quote_acceptance_recorded=true
requester_authentication_replay_write=true
provider_authentication_replay_write=true
acceptance_replay_write=true
```

It grants no payment authorization, payment execution, execution authorization,
work dispatch, credential mutation, provider selection, wallet or signer access,
production signing, transaction broadcast, Work Credit writes or settlement,
HTTP submission, runtime mutation, service restart, deployment, and money
movement remain false.

## Example boundary

The committed fixture uses the upstream example-only trusted replay-plan input.
It does not inspect a root, construct a persistence request, supply either
confirmation, invoke persistence, create a durable acceptance, write replay
state, consume IDs, or record quote acceptance.

An example fixture cannot be applied.

## Proof scope

The repository proof:

- verifies exact default dependency identity;
- verifies disabled short-circuiting;
- verifies wrong confirmation rejection before provider or store access;
- verifies the committed example-only result;
- builds a complete ephemeral provider/requester/registry trust chain;
- verifies a dry run against a newly created empty temporary root;
- proves dry mode leaves that root unchanged;
- applies the trusted packet to a newly created disposable root;
- proves the persistence provider receives the exact lower packet returned by
  the trusted replay-plan verifier;
- proves the internally supplied sealed adapter confirmation;
- verifies the persisted acceptance and replay revision;
- proves exact duplicate status mapping with a deterministic injected
  pre-commit inspection;
- rejects client-supplied persistence configuration in the command;
- verifies all temporary roots are removed before exit; and
- reports production persistence as false.

The crash-consistency, compare-and-swap, symlink, lock, fsync, recovery, and
generation-bound properties remain enforced by the sealed persistence adapter
and its independent proof.

## Source-only boundary

This lane does not:

- modify `src/index.ts`;
- mount or enable an HTTP route;
- create a listener;
- provision or choose a production persistence root;
- install or restart a service;
- deploy the node;
- authorize or execute payment;
- authorize or dispatch work;
- write or settle Work Credits;
- access a wallet or signer;
- broadcast a transaction; or
- mutate production runtime state.

## Verification

Run:

```bash
npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_persistence_composition_v1.ts
```

Expected marker:

```text
VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_COMPOSITION_V1_EXACT_GREEN
```

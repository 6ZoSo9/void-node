# Authenticated paid-work production activation execution packet v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1`

## Purpose

This packet converts the completed source-readiness chain into one canonical,
non-secret handoff for a later operator execution lane. It removes ambiguity
about ordering and required evidence without authorizing activation.

The packet now binds the reviewed chain through exact main
`32cd4883b95354ab979d12640ffd2e2ac1279e57`. That includes:

- the fresh direct quote and authentication preparation merged in PR #949 at
  `a371372213782e8b55d678d28dc5291559ad02ee`;
- the hardened provider/requester signing-handoff CLI merged in PR #946 at
  `32cd4883b95354ab979d12640ffd2e2ac1279e57`;
- the earlier activation configuration, rollback, service-unit, credential
  metadata, replay, confirmation, canary, authentication, and atomic
  persistence contracts.

This source binding documents reviewed prerequisites. A future execution run
must still capture and revalidate the then-current `origin/main`; this packet
does not pre-authorize a future commit.

## Exact source-binding correction

A read-only post-merge audit found two source-binding defects in the first
execution-packet publication:

- `activation_configuration_instance` incorrectly referenced
  `44d9a95e335e9ebabd65e60f7e388385e0d14abe`, an unrelated read-only WC
  participant preflight commit;
- `trusted_context_reference_metadata` was required by the execution gates but
  omitted from `required_source_commits`.

This correction binds the activation configuration instance to its actual
reviewed commit:

`27dc14a7e59967744ef5c65e6b28e84b265b1565`

It also binds the reviewed trusted-context reference metadata:

`ac074d53ab937d302c69b6bff54f02d064e37d57`

The packet now contains twelve exact semantic source bindings. The proof locks
the complete key-to-commit map rather than checking only the count and the two
newest signing commits.

This correction is source-only. Execution remains
`SOURCE_READY_EXECUTION_NOT_AUTHORIZED`.

## Current decision

`SOURCE_READY_EXECUTION_NOT_AUTHORIZED`

The source prerequisites are present. Runtime state is deliberately unresolved.
The packet contains no credential, token, trusted-context path, provider or
requester signature, final authentication packet, confirmation, execution-plan
digest, fresh quote, or permission to mutate a host.

## Required execution sequence

A later operator lane must perform the packet's eighteen gates in order.

Before an execution plan can be formed, it must use the merged hardened
signing-handoff CLI to:

1. materialize the canonical fresh provider signing request;
2. verify the externally produced provider signature and materialize the
   requester signing request;
3. verify the externally produced requester signature and finalize the fresh
   direct-authentication preparation packet;
4. independently recompute and verify that final packet.

Provider and requester private keys remain external. The execution lane may
handle only the exact public signature evidence required by the reviewed
contract.

After the fresh authentication packet is verified, the lane must build a
canonical non-secret execution plan, compute its SHA-256 digest, and obtain a
fresh operation-bound confirmation from ZoSo. Any drift after the plan digest
invalidates confirmation and stops before the first mutation.

The expired first-live quote must never be reused.

## Fail-closed additions

The packet now explicitly stops before activation when:

- provider or requester role, key ID, signing digest, or signature binding
  mismatches;
- the final direct-authentication packet does not independently recompute;
- the quote is stale, expired, or previously consumed;
- current main, runtime prestate, replay state, trusted context, credential
  metadata, or any reviewed source artifact drifts.

## Separation of authority

This source artifact does not authorize deployment, service start, credential
access, production signing, quote acceptance, payment authority, payment
execution, work dispatch, Work Credit writes, wallet or signer access,
transaction broadcast, or movement of funds.

A future execution lane must remain one-shot, evidence-producing, and bounded
by the already reviewed rollback and canary contracts. Post-execution readiness
is a separate decision and cannot be inferred from a successful source merge.

## Files

- packet: `config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json`
- proof: `scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs`
- workflow: `.github/workflows/authenticated-paid-work-production-activation-execution-packet-v1.yml`

## Verification

```bash
python3 -m json.tool \
  config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json

node --check \
  scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs

node \
  scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true
```

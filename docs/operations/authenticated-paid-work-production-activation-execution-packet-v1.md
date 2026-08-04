# Authenticated paid-work production activation execution packet v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1`

## Purpose

This packet converts the reviewed authenticated paid-work source-readiness chain
into one canonical, non-secret handoff for a later operator execution lane. It
fixes ordering and evidence requirements without authorizing activation.

The packet records the reviewed repository baseline through exact canonical
`main`:

`621c8d6d59af774b1bcd617505fe75f6bc172c68`

That commit is the squash merge of PR #963. It is later than the paid-work
metadata merge and adds a disjoint, default-off Buy VOID non-money runtime apply
lane. Recording it as `reviewed_source_main` means the packet identifies the
actual reviewed main tree rather than silently stopping at an earlier semantic
prerequisite.

The paid-work credential metadata remains separately bound to the PR #961 merge
commit:

`cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa`

PR #961 records sanitized evidence that the receiver loaded the verified
nine-record credential registry while preserving `HOLD`, no live
authentication, and no current-runtime-freshness claim.

The packet's twelve `required_source_commits` remain semantic prerequisite
bindings. Unrelated commits present in the same main tree do not become
activation prerequisites merely because they share the reviewed baseline. The
proof requires `reviewed_source_main` to remain distinct from the semantic
credential-metadata binding so these two meanings cannot collapse again.

A future execution run must capture and revalidate its then-current
`origin/main`. This source packet does not pre-authorize a future commit or
runtime state.

## Post-restart credential metadata reconciliation

The packet now binds credential-reference metadata to merged PR #961:

`cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa`

The previously bound pre-restart metadata commit was:

`9a8cfcbab14d5439e853d19575009ed3245e8b66`

The reconciled non-secret source truth is:

- credential/reference ID:
  `voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1`;
- target registry ID:
  `voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f`;
- registry SHA-256:
  `92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e`;
- credential count: 9;
- receiver classification: `RECEIVER_ACTIVE_TARGET_REGISTRY`;
- receiver loaded target registry: true;
- receiver restart required: false;
- receiver configuration revalidation required: true;
- receiver health observed in the reviewed evidence: true, HTTP 200;
- live authentication observed: false;
- current runtime freshness proven by source: false.

The restart requirement is removed because canonical source now records the
target registry loaded. This is point-in-time reviewed operator evidence, not a
permanent runtime attestation. The later execution lane must still privately
revalidate the registry, selected credential identity, scope, validity,
revocation, configuration, trusted context, and replay state before forming an
execution plan.

The packet and proof reject both the expired credential metadata commit
`1c0d4d842210158aeac466deb8e0918aa7443997` and the pre-restart metadata commit
`9a8cfcbab14d5439e853d19575009ed3245e8b66`.

## Preserved source-binding correction

The packet continues to bind:

- activation configuration instance:
  `27dc14a7e59967744ef5c65e6b28e84b265b1565`;
- trusted-context reference metadata:
  `ac074d53ab937d302c69b6bff54f02d064e37d57`.

It continues to reject the unrelated WC participant-preflight commit
`44d9a95e335e9ebabd65e60f7e388385e0d14abe`.

The proof locks the complete twelve-entry semantic key-to-commit map, separately
locks the reviewed current-main baseline, and requires the packet's runtime
truth to exactly mirror the merged credential metadata.

## Current decision

`SOURCE_READY_EXECUTION_NOT_AUTHORIZED`

The source binding is reconciled, but all execution-time evidence remains
unresolved. The packet contains no credential, token, private registry path,
trusted-context path, provider or requester signature, final authentication
packet, execution-plan digest, fresh quote, confirmation, or permission to
mutate a host.

## Required execution sequence

A later operator lane must perform the packet's eighteen gates in order.

Before an execution plan can be formed, it must use the reviewed signing-handoff
CLI to:

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
fresh operation-bound confirmation from ZoSo. Any drift after that digest
invalidates confirmation and stops before the first mutation.

The earlier quote must never be reused. The selected credential must fail closed
if it is expired, revoked, rotated, mismatched, or not loaded at the fresh
runtime inspection. The reviewed target-registry observation does not waive any
of those checks.

## Fail-closed conditions

The packet stops before activation when:

- current main or any reviewed source artifact drifts;
- runtime preimage or replay state is unexpected;
- trusted-context or credential-reference evidence mismatches;
- the credential is stale, expired, revoked, rotated, or not loaded;
- provider or requester role, key ID, signing digest, or signature binding
  mismatches;
- the final direct-authentication packet does not independently recompute;
- the quote is stale, expired, or previously consumed;
- confirmation is missing, expired, or bound to a different execution plan;
- any unreviewed mutation would be required.

## Separation of authority

This source artifact does not authorize deployment, service start or restart,
credential access, production signing, quote acceptance, payment authority,
payment execution, work dispatch, Work Credit writes, wallet or signer access,
transaction construction or broadcast, VOID settlement, or movement of funds.

A future execution lane must remain one-shot, evidence-producing, and bounded by
the reviewed rollback and canary contracts. Post-execution readiness is a
separate decision and cannot be inferred from a successful source merge.

## Files

- packet: `config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json`
- proof: `scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs`
- workflow: `.github/workflows/authenticated-paid-work-production-activation-execution-packet-v1.yml`
- document: `docs/operations/authenticated-paid-work-production-activation-execution-packet-v1.md`

## Verification

```bash
python3 -m json.tool \
  config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json

node --check \
  scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs

node \
  scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs
```

Expected markers:

```text
reviewed_main_and_semantic_prerequisite_distinct=true
VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true
```

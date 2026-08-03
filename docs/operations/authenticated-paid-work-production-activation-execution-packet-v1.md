# Authenticated paid-work production activation execution packet v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1`

## Purpose

This packet converts the completed source-readiness chain into one canonical,
non-secret handoff for a later operator execution lane. It removes ambiguity
about ordering and required evidence without authorizing activation.

The packet now binds the reviewed repository baseline through exact `main`:

`c9a6478a08fcbdcbeb1d6f8c2fa0b41c8eee0444`

The semantic activation prerequisites remain the packet's twelve exact
`required_source_commits`. Unrelated commits present in the reviewed main tree do
not become activation prerequisites merely because they share the same base.

This source binding documents reviewed prerequisites. A future execution run
must still capture and revalidate the then-current `origin/main`; this packet
does not pre-authorize a future commit.

## Fresh credential metadata reconciliation

PR #955 replaced the expired credential-reference metadata with the separately
issued, reviewed, and Work-Credit-bound fresh credential at:

`9a8cfcbab14d5439e853d19575009ed3245e8b66`

The execution packet previously remained pinned to the pre-refresh credential
metadata commit:

`1c0d4d842210158aeac466deb8e0918aa7443997`

This repair replaces that stale source binding with the PR #955 merge commit and
locks the packet to the following non-secret metadata truth:

- credential/reference ID:
  `voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1`;
- target registry ID:
  `voidapwcr1_d5dafad265dc38237b11654142b9690c967f06e106e931d47dba2cf1eec996e5`;
- receiver classification: `RECEIVER_ACTIVE_STALE_REGISTRY`;
- receiver loaded target registry: false;
- receiver restart required: true;
- receiver configuration revalidation required: true;
- live authentication observed: false;
- current runtime freshness proven by source: false.

These facts are evidence and fail-closed inputs. They do not authorize reading a
credential, restarting a service, activating the receiver, or claiming that the
fresh registry is live.

## Exact source-binding correction

A prior read-only audit found two defects in the first execution-packet
publication:

- `activation_configuration_instance` incorrectly referenced
  `44d9a95e335e9ebabd65e60f7e388385e0d14abe`, an unrelated read-only WC
  participant preflight commit;
- `trusted_context_reference_metadata` was required by the execution gates but
  omitted from `required_source_commits`.

The existing correction remains preserved:

- activation configuration instance:
  `27dc14a7e59967744ef5c65e6b28e84b265b1565`;
- trusted-context reference metadata:
  `ac074d53ab937d302c69b6bff54f02d064e37d57`.

The packet contains twelve exact semantic source bindings. The proof locks the
complete key-to-commit map, rejects both the unrelated WC preflight commit and
the stale credential-metadata commit, and verifies that the packet's runtime
truth exactly mirrors the refreshed credential metadata.

## Current decision

`SOURCE_READY_EXECUTION_NOT_AUTHORIZED`

The source bindings are reconciled. Runtime state remains deliberately
unresolved and fail-closed. The packet contains no credential, token,
trusted-context path, provider or requester signature, final authentication
packet, confirmation, execution-plan digest, fresh quote, or permission to
mutate a host.

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

The expired first-live quote must never be reused. The receiver's stale-registry
state must also be privately revalidated before any separately authorized
restart or activation action.

## Fail-closed conditions

The packet stops before activation when:

- current main or any reviewed source artifact drifts;
- runtime preimage or replay state is unexpected;
- trusted-context or credential-reference evidence mismatches;
- the credential is stale, expired, revoked, or not loaded by the receiver;
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
transaction broadcast, or movement of funds.

A future execution lane must remain one-shot, evidence-producing, and bounded by
the already reviewed rollback and canary contracts. Post-execution readiness is
a separate decision and cannot be inferred from a successful source merge.

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

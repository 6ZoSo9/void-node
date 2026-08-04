# Authenticated paid-work runtime revalidation receipt v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_RECEIPT_V1`

## Purpose

This contract defines the sanitized evidence boundary for the private read-only
runtime revalidation required after the authenticated paid-work execution packet
merged in PR #964.

It does not inspect a host by itself. A separately authorized operator survey may
produce a receipt that this zero-dependency verifier checks before any signing,
quote, execution-plan, confirmation, service mutation, or canary action.

## Exact source binding

The receipt is bound to:

- reviewed source main and execution-packet merge:
  `a6a8757b11828a30899b54eed6c261462681c916`;
- credential metadata prerequisite:
  `cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa`;
- receiver service:
  `void-agent-paid-work-submission-receiver-v1.service`;
- loopback listener: `127.0.0.1:4187`;
- selected credential:
  `voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1`;
- target registry:
  `voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f`;
- registry SHA-256:
  `92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e`;
- expected registry credential count: `9`.

A changed source baseline, registry, credential, host, service, listener, or
credential validity window requires a separately reviewed contract update.

## Required successful observation

A valid receipt requires evidence that:

- the target service is active with a positive main PID;
- health returned HTTP 200;
- the listener is loopback-only;
- the exact nine-record target registry is loaded;
- no restart is required and configuration revalidation completed;
- the exact selected credential identity, agent, and scope were verified;
- the synchronized observation time falls inside the credential validity window;
- revocation was checked and the credential is not revoked or consumed;
- replay state was checked and classified acceptable;
- trusted-context and credential-reference revalidation completed; and
- the observation is no older than the declared 1–900 second policy.

The verifier derives the relative age from the two supplied timestamps and fails
closed on mismatch or staleness.

## Exact trusted-context binding requirement

The base receipt's `trusted_context_reference_verified=true` field is not enough
for registry-facing acceptance by itself. It does not identify which metadata,
bundle digest, or private path fingerprint was checked.

Registry-facing review must also call
`verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(...)` with
the companion
`VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_V1`
record. That guard binds the receipt to source commit
`ac074d53ab937d302c69b6bff54f02d064e37d57`, the exact trusted-context bundle
SHA-256, the exact private path fingerprint SHA-256, and the same evaluated
observation time.

See
`docs/operations/authenticated-paid-work-runtime-revalidation-trusted-context-binding-v1.md`.

## Secret and mutation boundary

The receipt must state that no raw token was read, no secret material or service
environment value was disclosed, and no service mutation occurred.

It also requires false for live authentication, payment execution, work
dispatch, Work Credit writes, wallet or signer access, transaction broadcast,
and fund movement.

The receipt stores no token, path, authorization header, signature, quote,
transaction payload, wallet identifier, or private evidence bytes.

## Decision boundary

A successful receipt may mark the bounded runtime-revalidation step satisfied,
but the only valid decision is:

`HOLD_PENDING_SIGNATURES_QUOTE_PLAN_AND_CONFIRMATION`

Provider and requester signatures, a fresh quote, the final authentication
packet, an exact execution-plan digest, and fresh ZoSo confirmation remain
unresolved. `execution_authorized` must remain false.

## Evidence limitations

The `voidapwrr1_` identifier is an unkeyed content address. It proves exact
receipt bytes, not the identity or truthfulness of the producer. The checked-in
example is synthetic and does not prove current runtime state.

A later operator lane must retain private evidence independently and may publish
only the sanitized receipt after review. Production use may add a separately
reviewed operator signature or attestation layer without weakening this closed
contract.

## Verification

```bash
node --check \
  integrations/agents/authenticated-paid-work-runtime-revalidation-v1/index.mjs
node --check \
  integrations/agents/authenticated-paid-work-runtime-revalidation-v1/trusted-context-binding-guard-v1.mjs
node --check \
  scripts/prove_authenticated_paid_work_runtime_revalidation_receipt_v1.mjs
node --check \
  scripts/prove_authenticated_paid_work_runtime_revalidation_trusted_context_binding_v1.mjs
node scripts/prove_authenticated_paid_work_runtime_revalidation_receipt_v1.mjs
node scripts/prove_authenticated_paid_work_runtime_revalidation_trusted_context_binding_v1.mjs
```

Expected markers:

```text
VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_RECEIPT_V1_PROOF_GREEN
VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_V1_PROOF_GREEN
```

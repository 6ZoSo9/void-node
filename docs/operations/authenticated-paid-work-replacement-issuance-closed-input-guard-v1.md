# Authenticated paid-work replacement issuance closed input guard v1

Marker:
`VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_GUARD_V1_PROOF_GREEN`

## Purpose

The replacement issuance preparation builder validates the credential-rotation,
runtime-revalidation, and trusted-context records that it consumes, then emits a
sanitized content-addressed preparation packet.

Its lower-level JavaScript entrypoint historically accepted an ordinary object
and ignored unknown top-level fields. The emitted packet remained closed, but a
caller could mistakenly attach a resolved credential identifier, registry-write
flag, raw-token field, or widened authority and still receive a valid packet.
That creates an audit ambiguity because the ignored field has no effect even
though the caller may believe it was accepted.

This guard defines the mandatory operator-facing and registry-facing builder
entrypoint for any input that did not originate inside an already reviewed
closed-data path.

## Closed input contract

`validateAuthenticatedPaidWorkReplacementIssuanceClosedInputV1(...)` accepts
exactly six own enumerable data properties:

- `rotation_plan`;
- `rotation_runtime_binding`;
- `runtime_receipt`;
- `trusted_context_binding`;
- `proposed_not_before_utc`; and
- `proposed_expires_at_utc`.

The guard rejects before invoking the underlying preparation builder when the
input contains:

- any additional or missing string key;
- any symbol key;
- a custom or inherited prototype;
- a non-enumerable expected field; or
- a getter or setter in place of an expected data field.

Key ordering uses explicit ECMAScript UTF-16 code-unit comparison. It does not
use locale-sensitive collation.

## Mandatory entrypoint

Untrusted, decoded, operator-supplied, registry-supplied, or cross-process input
must use:

```text
buildAuthenticatedPaidWorkReplacementIssuancePreparationFromClosedInputV1
```

The wrapper closes the top-level input shape first and only then delegates to the
existing builder, which performs the full rotation, runtime receipt,
trusted-context, validity-window, packet-content, and authority validation.

The existing builder remains a deterministic lower-level primitive for callers
that already prove the same closed input contract. Its acceptance of an ordinary
JavaScript object must not be interpreted as acceptance of undeclared fields.

## Security and authority boundary

The guard does not inspect, log, copy, or authorize credential material. It does
not create a credential, approve a review, write a registry, restart a receiver,
retire or create a Work Credit binding, authenticate, sign, acquire or accept a
quote, construct an execution plan, execute payment, dispatch work, write Work
Credits, access a wallet, broadcast a transaction, or move funds.

Unknown fields fail before downstream evidence validation. The decision remains
`HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION`, and execution authority
remains false.

## Verification

```bash
node --check \
  integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/closed-input-guard-v1.mjs
node --check \
  scripts/prove_authenticated_paid_work_replacement_issuance_closed_input_guard_v1.mjs
node \
  scripts/prove_authenticated_paid_work_replacement_issuance_closed_input_guard_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_CLOSED_INPUT_GUARD_V1_PROOF_GREEN
```

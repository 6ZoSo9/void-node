# Paid-work credential rotation runtime-revalidation binding v1

Marker:
`VOID_AUTHENTICATED_PAID_WORK_CREDENTIAL_ROTATION_RUNTIME_REVALIDATION_BINDING_V1`

## Purpose

The base rotation plan was built from reviewed main
`a6a8757b11828a30899b54eed6c261462681c916`. While that plan was being opened,
PR #966 merged the sanitized paid-work runtime-revalidation receipt and exact
trusted-context companion contracts at
`d12b4620cb5a6e199a6a59f21dfae6dd434c550a`.

This companion preserves the original content-addressed rotation plan while
binding it to the new current-main evidence contracts. It prevents replacement
issuance preparation from proceeding merely because the older semantic plan is
valid.

## Exact binding

The content-addressed `voidapwcrrb1_` companion binds:

- rotation plan ID
  `voidapwcrp1_bf56e97e7bb2143c79babafed556a41637e2a071d151436aeac9efbf43d3dde0`;
- base reviewed main `a6a8757b11828a30899b54eed6c261462681c916`;
- current main and runtime-revalidation merge
  `d12b4620cb5a6e199a6a59f21dfae6dd434c550a`;
- the sanitized receipt validator; and
- the exact trusted-context binding guard.

The required gate is:

```text
verify_sanitized_runtime_revalidation_receipt_and_trusted_context_binding_before_replacement_issuance
```

The wrapper first validates the complete base credential-rotation plan, then
validates the companion and exact plan/main linkage.

## Evidence boundary

The source contract identifies the required validators. It does not produce a
runtime receipt, inspect Precision, read the trusted-context bundle, authenticate
a credential, or establish that current runtime state is healthy.

A real private survey must later produce a sanitized receipt and exact
trusted-context companion under the merged PR #966 contracts. Those evidence
bytes remain separately reviewed inputs.

## Decision and authority

The only valid decision is:

`HOLD_PENDING_RUNTIME_REVALIDATION_AND_ROTATION`

Runtime-revalidation evidence remains mandatory and credential rotation remains
unauthorized. All issuance, registry-write, restart, retirement, replacement
binding, and live-canary authority fields are false.

The companion does not authorize token generation, credential creation,
credential or binding registry mutation, service restart, authentication, paid
work, payment, Work Credit mutation, wallet or signer access, transaction
activity, or fund movement.

## Verification

The focused proof demonstrates:

- exact fixture and content-address equality;
- complete base-plan validation;
- exact base/current-main linkage;
- rejection of a stale current-main binding;
- rejection of the wrong runtime-revalidation merge;
- rejection when evidence is made optional;
- rejection of credential-rotation authority; and
- rejection of binding-ID tampering.

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_CREDENTIAL_ROTATION_RUNTIME_REVALIDATION_BINDING_V1_PROOF_GREEN
```

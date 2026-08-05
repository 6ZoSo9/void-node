# Authenticated paid-work post-expiry recovery preparation v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_POST_EXPIRY_RECOVERY_PREPARATION_V1`

## Purpose

The selected authenticated paid-work credential and its Work Credit account
binding expired at `2026-08-05T00:00:00.000Z`. The complete private
runtime-revalidation receipt required by the merged replacement-preparation
contract was not produced before that boundary.

The expired credential cannot now produce a valid pre-expiry receipt. This
contract defines a separate fail-closed source path for recording that evidence
gap and preparing only sanitized post-expiry recovery metadata.

It does not reinterpret the expired credential as valid, invent a historical
runtime receipt, fabricate a trusted-context binding, or force the credential
rotation plan ID into the legacy canonical-issuance `voidapwnlp1_...` field.

## Exact source binding

The content-addressed packet binds:

- recovery source main
  `68e3ef3a7c15cf5b3623555979766fadf8b670fe`;
- merged replacement-preparation commit
  `1f4b6b29fc426b0435668022e8f8162c0fef55ef`;
- merged credential-rotation commit
  `9d860b668e21c98ad19e63b2c32b463025f05310`;
- merged runtime-revalidation contract commit
  `d12b4620cb5a6e199a6a59f21dfae6dd434c550a`;
- rotation plan
  `voidapwcrp1_bf56e97e7bb2143c79babafed556a41637e2a071d151436aeac9efbf43d3dde0`;
- rotation runtime companion
  `voidapwcrrb1_bbc79c19f8b74b5bbbce1246fa147aa553f9edd3b93ec5fb76a963fe12d5523c`;
- expired credential
  `voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1`;
- expired Work Credit binding
  `voidapwcb1_77b02c3c54223062915d1d6b4d9ee0464c575899c164c52502391fff492abf56`;
- the existing agent, submit scope, and destination Work Credit account; and
- the exact shared expiration boundary.

The builder invokes the merged rotation-plan and runtime-companion validators
and verifies their complete linkage before deriving expiry.

## Evidence-gap contract

A valid recovery input must state all of the following:

- the observation occurred at or after the shared expiration boundary;
- no complete pre-expiry runtime-revalidation receipt is available;
- current runtime state is not established;
- producer authentication is not established; and
- the replacement validity proposal begins no earlier than the recovery
  observation and remains within the 30-day policy cap.

The output records:

```text
gap_classification=credential_expired_before_complete_runtime_revalidation
runtime_receipt_id=null
trusted_context_binding_id=null
current_runtime_state_established=false
producer_authentication_established=false
```

This is an explicit evidence limitation, not a substitute receipt.

## Protocol separation

The merged credential rotation plan uses:

```text
voidapwcrp1_<sha256>
```

The legacy canonical remote issuance request expects a different protocol:

```text
voidapwnlp1_<sha256>
```

This recovery packet therefore requires:

```text
canonical_issuance_plan_id=null
canonical_issuance_plan_binding_required=true
rotation_plan_id_not_accepted_as_canonical_issuance_plan=true
sanitized_canonical_issuance_request_prepared=false
```

A later source contract must explicitly bind this recovery packet to a reviewed
canonical-issuance plan. No caller may invent an identifier merely to satisfy
the legacy regular expression.

## Closed input boundary

The builder reuses the merged replacement-preparation descriptor-only snapshot
guard before reading semantic fields.

It rejects:

- root or nested proxies before proxy traps execute;
- accessors without invoking getters or setters;
- custom prototypes, symbols, hidden fields, sparse or augmented arrays;
- cycles, shared references, non-JSON values, and resource-bound violations; and
- unknown top-level input fields.

The returned packet is content-addressed with prefix `voidapwperp1_`.

## Ordered gates

The exact gate sequence:

1. validates the merged rotation plan;
2. validates its runtime-revalidation companion contract;
3. proves the expiration boundary has elapsed;
4. proves the old credential and binding are expired;
5. records the missing pre-expiry receipt;
6. rejects claims of current runtime state or authenticated evidence;
7. prepares sanitized recovery metadata;
8. holds for a reviewed canonical-issuance plan binding;
9. holds for Nimo-only private credential generation;
10. holds for fresh review and append-only registry apply;
11. holds for receiver restart and replacement revalidation;
12. holds for durable expired-binding retirement evidence;
13. holds for replacement Work Credit binding and closeout; and
14. holds for fresh signatures, quote, execution-plan digest, and ZoSo
    confirmation.

Reordering or skipping any gate fails closed.

## Decision and authority

The only valid status is:

```text
HOLD_PENDING_CANONICAL_ISSUANCE_PLAN_BINDING_AND_PRIVATE_ROTATION
```

The packet may report only:

```text
expired_boundary_verified=true
post_expiry_recovery_metadata_prepared=true
```

It must keep false for:

- canonical issuance-plan resolution;
- canonical issuance-request preparation;
- private credential generation;
- replacement identity resolution;
- credential-registry writes;
- receiver revalidation;
- old-binding retirement;
- replacement binding;
- downstream signatures, quote, plan, and confirmation readiness; and
- execution authorization.

All operational authority fields are fixed to false.

## Verification

```bash
node --check \
  integrations/agents/authenticated-paid-work-post-expiry-recovery-preparation-v1/index.mjs
node --check \
  scripts/prove_authenticated_paid_work_post_expiry_recovery_preparation_v1.mjs
node -e 'const fs=require("node:fs"); for (const file of process.argv.slice(1)) JSON.parse(fs.readFileSync(file,"utf8"));' \
  integrations/agents/authenticated-paid-work-post-expiry-recovery-preparation-v1/package.json \
  fixtures/agents/authenticated-paid-work-post-expiry-recovery-preparation-v1.example.json \
  schemas/authenticated-paid-work-post-expiry-recovery-preparation-v1.schema.json
node scripts/prove_authenticated_paid_work_post_expiry_recovery_preparation_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_POST_EXPIRY_RECOVERY_PREPARATION_V1_PROOF_GREEN
```

## Operational truth

This source contract performs no host inspection, network request, token or
private-bundle read, credential generation, review approval, registry write,
service restart, binding retirement, replacement binding, authentication,
paid-work submission, quote acceptance, payment, work dispatch, Work Credit
write, wallet or signer access, signing, transaction construction or broadcast,
deployment, or fund movement.

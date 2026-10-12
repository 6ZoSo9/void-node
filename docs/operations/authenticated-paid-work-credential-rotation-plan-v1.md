# Authenticated paid-work credential rotation plan v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_CREDENTIAL_ROTATION_PLAN_V1`

## Purpose

The selected authenticated paid-work canary credential and its active Work
Credit account binding both end at `2026-08-05T00:00:00Z`. The existing fresh
canary lifecycle cannot be reused for this account because it requires zero
active bindings. The existing binding lifecycle also deliberately permits only
one active credential per destination account.

This plan closes the missing source-level sequence for rotating that credential
without overlapping two active WC-account bindings or retiring the current
binding early.

## Bound current state

The content-addressed plan binds:

- reviewed source main `a6a8757b11828a30899b54eed6c261462681c916`;
- credential metadata commit
  `cfca0c06a82e8e6cee8c0bf360b4a307a054f4aa`;
- current credential
  `voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1`;
- target nine-record registry
  `voidapwcr1_ce24175f3144131773f730d4989113b949998d79c48c3ddbd9752390122aac4f`;
- registry SHA-256
  `92e3149e560f7fa159d8fb5c59cd680cb6547a8a8f8010036bc02c4aa8d6e00e`;
- current binding
  `voidapwcb1_77b02c3c54223062915d1d6b4d9ee0464c575899c164c52502391fff492abf56`;
- destination account `void-external-agent-e2e-fulfillment-canary-v1`; and
- the shared credential and binding boundary `2026-08-05T00:00:00Z`.

## Rotation model

The replacement credential may be prepared, reviewed, generated on Nimo,
appended to the credential registry, loaded by the receiver, and revalidated
before the old credential expires. Its identity remains unresolved in this
source plan because no token or credential has been generated.

The old WC-account binding cannot be retired before its validity boundary unless
a separately reviewed revocation condition is established. The replacement
credential cannot be bound to the destination account until the old binding has
been retired with durable evidence.

This ordering preserves the one-credential-per-account invariant. A failed
replacement bind can leave the account temporarily unbound, but the plan never
permits two active bindings or paid-work submission before closeout.

## Exact ordered gates

1. Capture current `origin/main`.
2. Verify the current credential and binding identities.
3. Prepare a sanitized canonical remote issuance request.
4. Generate the replacement token only on Nimo with the exact confirmation.
5. Prepare the sanitized review decision.
6. Stage a distinct append-only credential registry candidate.
7. Apply the exact registry append with separate confirmation.
8. Restart the receiver under separate authority.
9. Revalidate the replacement credential as loaded, active, unrevoked, and
   unconsumed.
10. Wait until the old credential and binding are expired or separately revoked.
11. Retire the old WC binding with the exact retirement confirmation.
12. Bind the replacement credential to the same WC account with the exact bind
    confirmation.
13. Revalidate one active binding and capture sanitized closeout evidence.
14. Obtain fresh ZoSo confirmation for a separately reviewed paid-work canary.

The deterministic proof requires exact array equality. Reordering the retirement
and replacement-binding gates fails closed.

## Existing contracts reused

- `scripts/agent_paid_work_canonical_remote_credential_issuance_v1.mjs`
- `scripts/agent_paid_work_credential_wc_account_binding_lifecycle_v1.mjs`
- `scripts/agent_paid_work_credential_wc_account_binding_retirement_v1.mjs`
- `fixtures/agent-paid-work/credential-request-review-policy-v1.example.json`

The review policy permits at most 30 days. The actual replacement expiration must
be selected by a fresh review; this plan does not choose or pre-approve it.

## Confirmation boundaries

The plan records the existing exact confirmations for:

- Nimo token generation;
- review approval;
- credential registry apply;
- old-binding retirement; and
- replacement binding.

Receiver restart and the final canary require separate operation-bound authority.
No confirmation is consumed by this source artifact.

## Evidence and authority boundary

The plan contains no raw token, token digest, private path, credential response,
review decision, registry mutation, or live runtime evidence. It does not create
or select a replacement credential.

Every authority field is false. The plan does not authorize token generation,
registry writes, receiver restart, binding retirement, replacement binding, live
authentication, paid-work submission, quote acceptance, payment, work dispatch,
Work Credit writes, wallet or signer access, signing, transaction construction or
broadcast, or fund movement.

The only decision is:

`HOLD_PENDING_REPLACEMENT_CREDENTIAL_AND_BINDING`

## Verification

```bash
node --check \
  integrations/agents/authenticated-paid-work-credential-rotation-v1/index.mjs
node --check \
  scripts/prove_authenticated_paid_work_credential_rotation_plan_v1.mjs
python3 -m json.tool \
  fixtures/agents/authenticated-paid-work-credential-rotation-plan-v1.example.json
python3 -m json.tool \
  schemas/authenticated-paid-work-credential-rotation-plan-v1.schema.json
node scripts/prove_authenticated_paid_work_credential_rotation_plan_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_CREDENTIAL_ROTATION_PLAN_V1_PROOF_GREEN
```

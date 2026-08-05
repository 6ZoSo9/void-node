# Authenticated paid-work private runtime revalidation plan v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1`

## Status

This document now distinguishes two source artifacts:

1. the original immutable private runtime-revalidation plan prepared on source
   main `68e3ef3a7c15cf5b3623555979766fadf8b670fe`; and
2. the current-main reconciliation overlay prepared on
   `0a33693e23981457ebccde4d109571c49c9344ea` after the post-expiry recovery
   and listener-cgroup binding contracts merged.

The original plan remains byte-for-byte unchanged with SHA-256:

```text
19017e95bb521d5a077fe30aa96e2d23372c0dd1cdfb1c77270565756bc8ddca
```

The current reconciliation is:

```text
voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c
```

The current decision is:

```text
HOLD_PENDING_CANONICAL_ISSUANCE_PLAN_PRIVATE_ROTATION_AND_COMPOSED_RUNTIME_REVALIDATION
```

No credential, service, Work Credit, wallet, transaction, payment, or execution
authority is granted.

## Original immutable source plan

The original plan commit is:

```text
fe5e6706d955b68d7758810d280569eaadb9ea4c
```

Its parent is:

```text
68e3ef3a7c15cf5b3623555979766fadf8b670fe
```

The original semantic replacement-issuance prerequisite is merged PR #972:

- reviewed head `548e7cd8842ae618eed679c7d0e59528c1a08f92`;
- merge commit `1f4b6b29fc426b0435668022e8f8162c0fef55ef`;
- preparation packet
  `voidapwrip1_1610badfc75ba1998e5057a427361b60958e053e38391bca33f177774bf0c40d`;
- original decision `HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION`.

The original intervening commits were:

- PR #969 Buy VOID idempotency hardening at
  `ac3449d113012c0d37a8b5f099e41f9d081d0279`; and
- PR #973 inactive node-hosted paid-work origin bridge at
  `68e3ef3a7c15cf5b3623555979766fadf8b670fe`.

Neither scope owns the original plan paths. The public bridge remains
source-only and grants no gateway override, SSH forwarding, service restart,
public preflight, or authenticated submission authority.

## Expired legacy credential boundary

The selected credential and active Work Credit binding expired at:

```text
2026-08-05T00:00:00.000Z
```

That boundary has passed. The expired credential cannot now create a valid
current runtime-revalidation receipt, and no source artifact may reinterpret it
as active.

The original replacement-preparation packet remains source-only evidence:

```text
contracts_validated=true
producer_authentication_established=false
current_runtime_state_established=false
replacement_credential_id=null
private_credential_material_generated=false
credential_registry_write_completed=false
execution_authorized=false
```

Its bounded validity proposal was not authorization to generate, issue, review,
register, load, or use a credential.

## Current-main post-expiry reconciliation

PR #975 merged the authenticated paid-work post-expiry recovery-preparation
contract at:

```text
19a637eaa5d3c4986c922dea214a7c66ed824ca3
```

That contract establishes that a complete pre-expiry runtime receipt can no
longer be produced. Current recovery must instead bind:

- a post-expiry recovery packet with prefix `voidapwperp1_`;
- a separately reviewed canonical issuance plan with prefix `voidapwnlp1_`;
- Nimo-only replacement private-material generation evidence;
- append-only credential-registry application evidence; and
- later replacement runtime and Work Credit binding evidence.

The credential-rotation plan ID uses prefix `voidapwcrp1_` and is **not** a
canonical issuance-plan ID. It cannot be inserted into a `voidapwnlp1_` field to
satisfy a shape check.

The post-expiry recovery decision remains:

```text
HOLD_PENDING_CANONICAL_ISSUANCE_PLAN_BINDING_AND_PRIVATE_ROTATION
```

## Current-main listener and service ownership reconciliation

PR #976 merged the runtime listener-to-systemd-cgroup binding contract at:

```text
dfb74b694628d66aa943e20bc97b93dede9071ae
```

A future sanitized receipt with prefix `voidapwrlcb1_` must bind:

- `void-agent-paid-work-submission-receiver-v1.service`;
- its systemd user cgroup membership;
- the exact process start identities;
- the exact `127.0.0.1:4187` listener and socket inode;
- the listener owner process;
- matching network namespace identity; and
- the absence of wildcard, non-loopback, or foreign target listeners.

That receipt is required but insufficient alone. It must not independently
claim:

```text
producer_authentication_established=true
current_runtime_state_established=true
complete_runtime_revalidation_established=true
replacement_credential_validity_established=true
trusted_context_binding_established=true
execution_authorized=true
```

The listener-cgroup contract decision remains:

```text
HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION
```

## Reconciled composed-evidence requirements

Before any authenticated paid-work execution decision, the complete composed
evidence set must include:

1. a valid post-expiry recovery packet `voidapwperp1_...`;
2. a reviewed canonical issuance plan `voidapwnlp1_...`;
3. Nimo-only replacement private-material generation evidence without secret
   output;
4. append-only replacement credential-registry apply evidence;
5. a valid listener-cgroup receipt `voidapwrlcb1_...`;
6. a replacement runtime-revalidation receipt `voidapwrr1_...`;
7. a replacement trusted-context binding `voidapwrtcb1_...`;
8. durable expired-binding retirement evidence;
9. a replacement single-active-Work-Credit-binding closeout;
10. fresh provider and requester signatures;
11. fresh quote and execution-plan digests; and
12. fresh ZoSo confirmation.

Listener ownership, credential validity, trusted context, producer
authentication, replay state, signatures, quote, execution plan, and final
confirmation must all refer to the same replacement identity and current source
state.

## Reconciled ordered gates

1. verify current main and original-plan ancestry;
2. verify the original plan bytes and SHA-256 remain unchanged;
3. verify PR #975 and its exact post-expiry recovery contract;
4. verify PR #976 and its exact listener-cgroup contract;
5. reject the expired credential for current runtime revalidation;
6. require the post-expiry recovery packet;
7. require a reviewed canonical issuance-plan binding;
8. obtain separate private replacement-issuance authorization;
9. generate replacement private material on Nimo only;
10. review and apply the append-only replacement credential-registry update;
11. collect authenticated listener-cgroup evidence;
12. compose replacement runtime-revalidation and trusted-context evidence;
13. retire the expired old binding with durable evidence;
14. bind the replacement credential and prove one active Work Credit binding;
15. capture fresh signatures, quote, execution-plan digest, and ZoSo
    confirmation; and
16. make a separate execution-readiness decision.

No gate may be skipped or inferred from the presence of a source file.

## Authority boundary

The original plan authority map remains all false. The reconciliation overlay
also keeps all operational authority fields false, including:

- private runtime survey;
- credential or private-path access;
- private-material generation;
- credential-registry mutation;
- service restart;
- old-binding retirement;
- replacement binding;
- live authentication;
- paid-work submission;
- quote acceptance or payment execution;
- work dispatch or Work Credit writes;
- wallet or signer access;
- signing, transaction construction, or transaction broadcast; and
- fund movement.

Restacking the source branch, proving the overlay, marking the PR ready, or
merging the PR does not authorize any of those operations.

## Verification

```bash
python3 -m json.tool \
  config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-plan-v1.json \
  >/dev/null
python3 -m json.tool \
  config/activation-candidates/authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation-v1.json \
  >/dev/null
python3 -m json.tool \
  schemas/authenticated-paid-work-private-runtime-revalidation-plan-v1.schema.json \
  >/dev/null
python3 -m json.tool \
  schemas/authenticated-paid-work-private-runtime-revalidation-current-main-reconciliation-v1.schema.json \
  >/dev/null
node --check \
  scripts/prove_authenticated_paid_work_private_runtime_revalidation_plan_v1.mjs
node --check \
  scripts/prove_authenticated_paid_work_private_runtime_revalidation_current_main_reconciliation_v1.mjs
node scripts/prove_authenticated_paid_work_private_runtime_revalidation_plan_v1.mjs
node scripts/prove_authenticated_paid_work_private_runtime_revalidation_current_main_reconciliation_v1.mjs
npm run typecheck
```

Expected markers:

```text
VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_PLAN_V1_PROOF_GREEN=true
VOID_AUTHENTICATED_PAID_WORK_PRIVATE_RUNTIME_REVALIDATION_CURRENT_MAIN_RECONCILIATION_V1_PROOF_GREEN
```

## Operational truth

This plan and reconciliation perform no host inspection, private path or token
read, credential generation, registry write, service restart, binding mutation,
authentication, paid-work submission, quote acceptance, payment, work dispatch,
Work Credit write, wallet or signer access, signing, transaction construction or
broadcast, deployment, or fund movement.

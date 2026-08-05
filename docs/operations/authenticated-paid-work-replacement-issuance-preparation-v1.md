# Authenticated paid-work replacement issuance preparation v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_PREPARATION_V1`

## Purpose

The selected authenticated paid-work credential and its Work Credit account binding reach their shared boundary at `2026-08-05T00:00:00Z`. The merged credential-rotation plan defines the full lifecycle, but intentionally leaves the replacement identity unresolved and grants no issuance authority.

This contract closes the next source-only step: constructing one sanitized, content-addressed replacement issuance preparation packet after validating the merged rotation plan, its runtime-revalidation companion, a supplied sanitized runtime-revalidation receipt, and the exact trusted-context companion binding.

The packet does not generate private credential material. It does not resolve a replacement credential ID, approve a request, append a registry record, restart the receiver, retire the old Work Credit binding, create the replacement binding, authenticate, submit paid work, accept a quote, or authorize execution.

## Exact source and rotation binding

The packet binds:

- preparation and rotation merge commit `9d860b668e21c98ad19e63b2c32b463025f05310`;
- runtime-revalidation merge commit `d12b4620cb5a6e199a6a59f21dfae6dd434c550a`;
- rotation plan `voidapwcrp1_bf56e97e7bb2143c79babafed556a41637e2a071d151436aeac9efbf43d3dde0`;
- rotation runtime companion `voidapwcrrb1_bbc79c19f8b74b5bbbce1246fa147aa553f9edd3b93ec5fb76a963fe12d5523c`;
- current credential `voidapwc1_13005c1ccf30c2fa0112eeb8801e5cd0186f3fc228fc4a41dda2f73ffed339f1`;
- agent `void-external-agent-e2e-fulfillment-canary-agent-v1`;
- scope `agent_paid_work_submit`; and
- destination Work Credit account `void-external-agent-e2e-fulfillment-canary-v1`.

The builder invokes the existing validators rather than trusting supplied IDs. It verifies the complete rotation plan and companion, validates the complete runtime receipt, and verifies its exact trusted-context binding before producing the sanitized packet.

## Replacement request boundary

A packet may select a proposed validity window, but the window must begin no earlier than the runtime evidence observation, end after its proposed start, remain at or below the reviewed 30-day lifetime cap, and leave the replacement credential ID unresolved.

The request preserves the existing `nimo_private_only` storage policy and canonical remote-issuance marker. Private material generation, review approval, and append-only registry application remain later gates with their own exact confirmations.

The checked-in example selects a full 30-day proposed window solely to prove the boundary calculation. It is synthetic source evidence, not a live credential request or a statement that the old runtime observation remains current.

## Evidence limitations

The runtime receipt and trusted-context companion are unkeyed content-addressed records. The builder proves that their shapes, links, and digests satisfy the merged source contracts. It does not authenticate their producer and does not make historical runtime evidence current.

The packet therefore requires:

```text
contracts_validated=true
producer_authentication_established=false
current_runtime_state_established=false
```

It also requires false for private-path, bundle-content, and secret-material disclosure. A real operator issuance lane must supply independently retained current sanitized evidence and revalidate runtime state again before any registry write or receiver change. The checked-in synthetic fixture cannot satisfy that operator evidence requirement by itself.

## Ordered hold gates

The exact sequence validates the merged contracts, prepares only sanitized issuance metadata, then holds for:

1. private credential-material generation on Nimo;
2. fresh review and append-only registry application;
3. receiver restart and replacement credential revalidation;
4. the old binding retirement boundary;
5. replacement Work Credit binding and closeout; and
6. fresh signatures, quote, execution-plan digest, and ZoSo confirmation.

Changing the order, skipping retirement before replacement binding, or claiming later readiness is complete fails closed.

## Decision and authority

The only valid decision is `HOLD_PENDING_PRIVATE_REPLACEMENT_ISSUANCE_AND_ROTATION`.

The packet records that the evidence contracts and sanitized request were validated. Every operational result remains false, including private material generation, resolved replacement identity, registry write, receiver revalidation, old-binding retirement, replacement binding, downstream signature/quote/plan readiness, and execution authorization.

All nineteen authority fields are fixed to false. This lane grants no credential issuance, registry mutation, restart, authentication, paid-work, quote, payment, Work Credit, wallet, signing, transaction, or fund-movement authority.

## Verification

```bash
node --check integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/index.mjs
node --check scripts/prove_authenticated_paid_work_replacement_issuance_preparation_v1.mjs
node -e 'const fs=require("node:fs"); for (const file of process.argv.slice(1)) JSON.parse(fs.readFileSync(file,"utf8"));' \
  integrations/agents/authenticated-paid-work-replacement-issuance-preparation-v1/package.json \
  fixtures/agents/authenticated-paid-work-replacement-issuance-preparation-v1.example.json \
  schemas/authenticated-paid-work-replacement-issuance-preparation-v1.schema.json
node scripts/prove_authenticated_paid_work_replacement_issuance_preparation_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_REPLACEMENT_ISSUANCE_PREPARATION_V1_PROOF_GREEN
```

## Operational truth

This is source-only. It reads no host, private registry, private path, token, credential material, wallet, key, or signer. It makes no network request, creates no credential, writes no registry, restarts no service, retires or creates no binding, authenticates no request, submits no paid work, accepts or executes no payment, dispatches no work, writes no Work Credits, signs or broadcasts no transaction, and moves no funds.

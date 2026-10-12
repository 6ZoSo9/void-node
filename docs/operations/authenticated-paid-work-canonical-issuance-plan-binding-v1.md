# Authenticated paid-work canonical issuance plan binding v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_CANONICAL_ISSUANCE_PLAN_BINDING_V1`

## Problem

The merged post-expiry recovery packet correctly leaves `canonical_issuance_plan_id=null`, while the legacy canonical remote issuance CLI accepts any syntactically valid `voidapwnlp1_<64 hex>` value. Its historical proof uses a placeholder and validates only the prefix and digest width. Passing the credential-rotation `voidapwcrp1_...` identifier is rejected, but inventing another well-formed `voidapwnlp1_...` value would still provide no evidence of what the plan authorizes or binds.

The merged private runtime-revalidation reconciliation names the next gate explicitly: build or select a reviewed canonical issuance plan bound to the post-expiry recovery packet.

## Closed plan

This lane derives exactly one content-addressed plan:

- plan ID: `voidapwnlp1_3ae7ca2e7275d8aa323bca06d0cb2a931a7d6fd31c80f6501ce8d84bed6c0fe5`;
- source main: `66bb6113f0164872a9a40dd4837bdfe9dc9c7e6b`;
- post-expiry recovery packet: `voidapwperp1_aac6114795a5b97a8f79034ca67ae2c98a54298bdab7ba9055fcb9346cf8892f`;
- private runtime reconciliation: `voidapwprmr1_e3d676f29fe53fd322a75e15c20b9dcc1208c16fe0c849ab48be2eac8a6ef35c`;
- exact agent: `void-external-agent-e2e-fulfillment-canary-agent-v1`;
- exact scope: `agent_paid_work_submit`;
- exact Work Credit destination account: `void-external-agent-e2e-fulfillment-canary-v1`;
- proposed validity window: `2026-08-05T02:00:00.000Z` through `2026-08-12T02:00:00.000Z`;
- canonical request expiration: `2026-08-12T02:00:00Z`;
- expected private-generation host: `zoso-N153B`;
- maximum lifetime: 30 days; and
- old-binding retirement required before replacement binding.

The plan ID is the SHA-256 content address of the complete closed plan body. It cannot be selected independently from the evidence, agent, account, scope, validity window, confirmations, decision, or authority map.

## Guarded request adapter

`buildSanitizedCanonicalRemoteCredentialRequestFromPlanV1(...)`:

1. validates the complete plan and its content address;
2. rebuilds the plan from the exact post-expiry packet and private-runtime reconciliation;
3. requires exact equality with the supplied plan;
4. requires evaluation at or after the proposed not-before instant and before expiration;
5. constructs the canonical `VOID_AGENT_PAID_WORK_CANONICAL_REMOTE_CREDENTIAL_REQUEST_V1` object in memory;
6. derives the canonical `voidapwcir1_...` request ID through the existing issuance implementation; and
7. reruns the existing canonical request validator.

The adapter writes no file. The request contains no credential ID, token hash, raw token, authorization header, private path, or secret material. Its complete canonical-issuance authority map remains false.

## Protocol separation

The lane requires:

```text
rotation_plan_id_accepted_as_canonical_issuance_plan=false
pre_expiry_runtime_receipt_available=false
current_runtime_state_established=false
producer_authentication_established=false
replacement_credential_id=null
private_credential_material_generated=false
```

A syntactically valid but invented `voidapwnlp1_...`, a `voidapwcrp1_...` substitution, changed agent, changed account, changed scope, changed validity window, or authority grant fails even if the altered plan is resealed.

## Decision

```text
HOLD_PENDING_SANITIZED_REQUEST_MATERIALIZATION_AND_PRIVATE_ROTATION
```

The source request contract is ready, but no operator request file has been written. Request materialization, Nimo private material generation, credential review, registry apply, receiver restart, old-binding retirement, replacement binding, authentication, paid-work submission, signatures, quote, execution-plan digest, and fresh ZoSo confirmation remain separate gates.

## Authority boundary

All 24 authority fields are false. This lane does not inspect a host, read or create credential material, write a request or registry file, restart a service, retire or create a binding, authenticate, submit paid work, accept or execute payment, dispatch work, write or settle Work Credits, access a wallet or signer, sign, construct or broadcast a transaction, deploy, or move funds.

## Focused proof

The proof requires deterministic fixture construction and rejects:

- a changed or forged post-expiry packet;
- a current-runtime claim;
- a resealed reconciliation that permits rotation-plan substitution;
- an invented but well-formed `voidapwnlp1_...` plan ID;
- changed agent or scope;
- any authority grant;
- request construction before not-before or at expiration;
- root proxies before any proxy trap executes;
- accessor-backed reconciliation data before any getter executes; and
- raw credential material in public artifacts.

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_CANONICAL_ISSUANCE_PLAN_BINDING_V1_PROOF_GREEN
```

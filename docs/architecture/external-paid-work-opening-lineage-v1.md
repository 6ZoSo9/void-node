# External paid-work opening lineage v1

Marker: `VOID_EXTERNAL_PAID_WORK_OPENING_LINEAGE_V1`.

Issue: #2382.

## Purpose

This source-only lineage binds the current credentialed external paid-work path
needed by the existing WC/VOID opening-eligibility policy. It does **not** change
that policy and does not claim the path is deployed or publicly ready.

The opening-eligible lineage remains:

```text
credential request
  -> operator review
  -> scoped credential issuance
  -> active credential registry
  -> credential/WC-account binding
  -> authenticated paid-work submission
  -> bounded fulfillment/execution evidence
  -> return-package acceptance
  -> agent-paid-work WC earning adapter receipt
  -> canonical +3 WC acceptance evidence
  -> opening-capacity provenance census
```

The fixed credential scope is `agent_paid_work_submit`. The earning adapter
award remains exactly **3 WC**.

## Public ingress composition

Two different public-ingress trust classes are intentionally preserved.

### Credential request

`POST /__void/agents/paid-work/credential-requests/v1`

remains in the reviewed source-authenticated Cloudflare/443 sensitive-route
composition. It is operator-review intake only; the public request does not issue
a credential.

### Authenticated paid-work submission

`POST /__void/agents/paid-work/submissions/v1`

is not promoted into the transport-source-sensitive Cloudflare set. It uses the
ordinary frontdoor transport, then the public composition gateway admits this
**exact** path before a fail-closed `/__void/agents` namespace wall. Every
sibling path under that namespace is rejected instead of being generically
proxied.

The composition edge forwards only the exact submission path to the bounded
AI-agent public gateway. That gateway and the submission receiver both require
the reviewed bearer-credential contract, bounded JSON body handling, and the
submission route identity.

The outer frontdoor remains a generic transport for ordinary public traffic.
That fact is explicitly recorded and must not be confused with generic mutation
authority: the agents namespace is exact-route-gated downstream.

## Credential and account authority

The bound sources preserve:

- intake status `accepted_for_review`;
- operator review before issuance preparation;
- one `agent_paid_work_submit` scope;
- active/expiry/revocation checks in the credential registry;
- one active credential-to-WC-account binding;
- binding-registry generation checks before mutation;
- authenticated submission receipts with no WC-award authority.

This source contract issues no credential and does not read credential-token
bytes.

## Fulfillment and WC provenance

The lineage binds the current fresh-canary transport/lifecycle source, fulfillment
orchestrator, executor receive/run contract, return-package acceptance, adapter
CLI/core, and opening-capacity census.

The adapter receipt remains
`VOID_AGENT_PAID_WORK_WC_EARNING_ADAPTER_RECEIPT_V1`, persisted under the
reviewed `adapter-execution-receipt-v1.json` name. The opening-capacity census
uses the canonical
`validateAgentPaidWorkWcEarningAdapterReceiptV1(...)` validator and separately
records that current credential-binding revalidation is not performed by that
read-only census.

## Current public truth

The bound public discovery still reports these live capabilities as unavailable:

- live work-order submission;
- live work dispatch;
- live WC-award authorization;
- live WC-ledger write.

Therefore the only accepted status for this contract is:

`SOURCE_LINEAGE_QUALIFIED_NOT_LIVE`.

A later live readiness gate must re-observe runtime configuration, public HTTPS
reachability, credential-request review/issuance availability, authenticated
submission, execution/verification, and WC-adapter acceptance. Source existence
does not satisfy #2376's requirement for a genuinely external participant.

## Authority boundary

Source/test/CI only.

No credential issuance, credential-registry mutation, token/secret/private-key
access, work dispatch, live work execution, Work Credit write, wallet/signer
access, transaction construction/signing/broadcast, Chain-2050 mutation,
presale/market activation, treasury/liquidity action, or funds movement is
authorized or performed.

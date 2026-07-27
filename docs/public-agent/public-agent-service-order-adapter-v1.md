# VOID Public Agent Service Order Adapter V1

Marker: `VOID_PUBLIC_AGENT_SERVICE_ORDER_ADAPTER_V1`
Request marker: `VOID_PUBLIC_AGENT_SERVICE_ORDER_REQUEST_V1`

## Purpose

The adapter connects the machine-readable Public Agent Services Catalog V1 to
the existing Agent Paid Work Order Envelope V1.

An outside agent selects a catalog `service_id` and supplies a bounded
objective, input references, expected outputs, budget ceiling, time window,
callback URI, and resource limits. The adapter derives the existing paid-work
`capability_id`, materializes the canonical work-order envelope, and verifies
that the envelope remains bound to the original catalog-aware request.

## Orderable service

V1 permits only catalog entries that are verifiable work, contract-defined,
contract-only, represented by a `work_type`, quote-based, externally
unavailable, mutation-free, and deterministically verifiable.

Under the current catalog this selects:

```text
service_id:    void.datanet.fetch-verify.v1
capability_id: datanet.fetch_verify
```

Discovery, credential-request, and submission-intake catalog entries are not
work services and are rejected.

## Safety transformation

The caller cannot set execution-authority booleans. The adapter writes:

```text
payment_required_before_execution=true
external_side_effects_allowed=false
wallet_access_allowed=false
money_movement_allowed=false
```

A materialized order is only a request for a quote or rejection. It does not
select a provider, issue credentials, authorize execution, execute payment,
access a wallet, sign, broadcast, dispatch work, award Work Credits, or move
money.

## Request

The request schema is:

```text
schemas/public-agent-service-order-request-v1.schema.json
```

The request binds the exact catalog fingerprint so a stale service selection
cannot silently materialize against a changed catalog contract.

## CLI

Materialize an Agent Paid Work Order Envelope V1:

```bash
npx tsx scripts/public_agent_service_order_adapter_v1.ts \
  materialize \
  examples/public-agent-service-order-request-v1.example.json \
  /tmp/public-agent-service-work-order.json
```

Verify the catalog/request/order binding:

```bash
npx tsx scripts/public_agent_service_order_adapter_v1.ts \
  verify \
  examples/public-agent-service-order-request-v1.example.json \
  /tmp/public-agent-service-work-order.json
```

## Verification

```bash
npx tsx scripts/prove_public_agent_service_order_adapter_v1.ts
```

The proof covers catalog fingerprint binding, deterministic service-to-
capability mapping, work-order identity, rejection of non-orderable catalog
entries, unsafe callback and output rejection, order tamper rejection,
full-history CI, and all false authority boundaries.

## Files

- `schemas/public-agent-service-order-request-v1.schema.json`
- `examples/public-agent-service-order-request-v1.example.json`
- `docs/public-agent/public-agent-service-order-adapter-v1.md`
- `scripts/public_agent_service_order_adapter_v1.ts`
- `scripts/prove_public_agent_service_order_adapter_v1.ts`
- `.github/workflows/public-agent-service-order-adapter-v1.yml`

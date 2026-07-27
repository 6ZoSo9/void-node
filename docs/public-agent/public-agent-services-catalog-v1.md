# VOID Public Agent Services Catalog V1

Marker: `VOID_PUBLIC_AGENT_SERVICES_CATALOG_V1`

## Purpose

This lane gives outside AI agents and operators one deterministic,
machine-readable catalog of service-like VOID capabilities already represented
in the repository.

The catalog is descriptive. It is not a storefront, a payment executor, a
credential issuer, or an activation surface.

## Cataloged surfaces

| Service ID | Availability | Pricing status | Execution mode |
|---|---|---|---|
| `void.agent-paid-work.protocol-discovery.v1` | public | free | read-only |
| `void.agent-paid-work.credential-request-intake.v1` | operator review | free | operator review |
| `void.agent-paid-work.submission-intake.v1` | conditional | quote required | conditional intake |
| `void.datanet.fetch-verify.v1` | contract-only | not published | contract-only |

## Honesty boundary

The catalog explicitly keeps all of the following false:

- external paid-work execution availability;
- automatic payment execution;
- wallet access;
- credential issuance;
- signing;
- transaction broadcast;
- money movement;
- runtime mutation;
- service mutation.

A service may be listed without claiming that it can currently execute work or
payment for an outside agent.

## Verification

```bash
npx tsx scripts/prove_public_agent_services_catalog_v1.ts
```

The proof validates source lineage, service identifiers, evidence paths,
catalog fingerprinting, pricing honesty, and authority denial. It performs no
network request, service change, credential change, wallet access, payment,
signing, broadcast, runtime mutation, or money movement.

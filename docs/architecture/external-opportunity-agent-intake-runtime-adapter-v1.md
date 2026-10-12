# External Opportunity Agent Intake Runtime Adapter V1

Marker: `VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_V1`

## Purpose

This lane adds a framework-structural adapter around the merged pure handler for:

`/.well-known/void-agent-intake-capability-v1.json`

The adapter converts a node application request into the pure discovery request, applies the deterministic status and headers to the response, and sends or ends the exact body.

## Registration contract

A mount call performs exactly one structural application registration:

- application method: `all`
- canonical path: `/.well-known/void-agent-intake-capability-v1.json`
- GET and HEAD behavior delegated to the merged pure handler
- unsupported methods delegated to the pure handler and returned as `405`
- direct noncanonical handler invocation returned as `404`

The adapter intentionally uses structural TypeScript interfaces rather than importing Express. This keeps the contract testable without creating a listener or coupling it to a particular framework package.

## Deferred production integration

This lane does not edit or import:

- `src/ai-agent-discovery-runtime-route-v1.ts`
- `src/local-multibox-runtime-route-v1.ts`
- `src/index.ts`
- any public `.well-known` artifact

Production mounting remains deferred because the active Official Network Authenticity well-known lane owns the existing runtime-discovery host.

## Safety boundary

The adapter does not create a network listener, make an outbound request, access credentials, read or write a journal, access wallets or keys, construct or submit transactions, submit paid work, award Work Credits, mutate runtime or service state, install a scheduler, deploy, or enable live execution.

# External Opportunity Agent Intake Runtime Integration V1

## Purpose

Bind the merged framework-neutral agent-intake runtime adapter into VOID's
existing AI-agent discovery runtime host at:

`/.well-known/void-agent-intake-capability-v1.json`

This is a read-only discovery surface. It exposes the deterministic capability
manifest already proven by the capability, pure-handler, and runtime-adapter
lanes.

## Integration surface

The runtime host imports and mounts exactly one adapter:

- host: `src/ai-agent-discovery-runtime-route-v1.ts`
- adapter: `src/external_opportunity/agent_intake_runtime_adapter_v1.ts`
- baseline proof: `scripts/prove_void_ai_agent_discovery_runtime_route_v1.ts`

`src/index.ts` remains unchanged. The existing local-multibox runtime host
continues to mount the AI-agent discovery module.

## HTTP behavior

The integrated route preserves the pure-handler contract:

- `GET` returns `200` and the exact capability-manifest bytes;
- `HEAD` returns `200`, identical representation headers, and no body;
- matching strong, weak, list, or wildcard `If-None-Match` returns `304`;
- unsupported methods return `405` with `Allow: GET, HEAD`;
- only the canonical path is registered;
- the response includes the strong capability ETag, public five-minute cache
  policy, CORS origin `*`, content type, and content length.

The six existing file-backed agent and authenticity routes remain unchanged.

## Authority boundary

This source integration grants no mutation, journal, credential, wallet,
signing, transaction, paid-work, Work Credit, validator, scheduler, or
economic authority.

The build and pull-request lanes do not deploy the source, restart a service,
or change the running node. Loopback listeners and loopback HTTP requests are
permitted only inside deterministic proofs. External network requests are not
part of the integration.

A later deployment lane must separately verify the exact merged commit,
runtime service state, public route behavior, and absence of mutation
authority before restarting or replacing a live process.

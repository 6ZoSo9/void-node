# AI-Agent Public Ingress Isolated Gateway V1

## Purpose

This gateway is the narrow public-facing boundary for VOID AI-agent discovery,
capability negotiation, and authentication-contract discovery. It is separate
from the main node service and does not proxy the node's general HTTP surface.

## Exact surface

The gateway binds to loopback only and serves twelve repository-backed JSON documents.

Discovery:

- `/public-node/agents/discovery-v1.json`
- `/public-node/agents/discovery-v1.schema.json`
- `/.well-known/void-agent-discovery.json`
- `/.well-known/void-agent-discovery.schema.json`

Capability negotiation:

- `/public-node/agents/capabilities-v1.json`
- `/public-node/agents/capabilities-v1.schema.json`
- `/.well-known/void-agent-capabilities.json`
- `/.well-known/void-agent-capabilities.schema.json`

Authentication contract:

- `/public-node/agents/authentication-v1.json`
- `/public-node/agents/authentication-v1.schema.json`
- `/.well-known/void-agent-authentication.json`
- `/.well-known/void-agent-authentication.schema.json`

Only `GET` and `HEAD` are accepted. Unknown paths return `404`. Other methods
return `405` with `Allow: GET, HEAD`.

Capability negotiation remains client-side intersection. The authentication
contract is published for interoperability, but there is no authentication verifier runtime, no session issuance, no challenge endpoint, no protected route, no authorization-header intake, and no signed-envelope intake.

## Authority boundary

The gateway has:

- no transaction submission;
- no active authentication or credential intake;
- no signed request-envelope intake;
- no payment or paid-work submission;
- no automatic Work Credit award;
- no Buy VOID automatic fulfillment;
- no wallet, treasury, validator, or ledger authority;
- no upstream HTTP proxy authority;
- no secret or operator-key access;
- no ability to expose the main node's port `4100`.

The service reads the twelve JSON files at startup and serves their exact bytes.

## Deployment sequence

This repository lane builds and proves the expanded loopback gateway. It does
not install or restart the production gateway, configure Tailscale, alter
Funnel, restart VOID, access a remote machine, or touch Nimo.

Deployment and independent public verification remain separate gated
operations after merge.

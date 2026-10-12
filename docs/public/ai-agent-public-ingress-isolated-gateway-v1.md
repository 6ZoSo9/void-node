# AI-Agent Public Ingress Isolated Gateway V1

## Purpose

This gateway is the narrow public-facing boundary for VOID AI-agent discovery,
capability negotiation, and authentication-contract discovery. It is separate
from the main node service and does not proxy the node's general HTTP surface.

## Exact surface

The gateway binds to loopback only and serves fourteen repository-backed JSON documents.

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

Discovery, capability, and authentication routes accept only `GET` and `HEAD`. The only mutation-method exceptions are exact authenticated `POST /__void/operator-notifications/v1/candidate` and exact authenticated `POST /__void/agents/paid-work/submissions/v1`. Each remains disabled unless its own loopback receiver upstream is explicitly configured. Unknown paths return `404`; non-exact methods return `405`. The exceptions grant no generic mutation, wallet, signing, transaction-broadcast, RPC-mutation, payment, work-dispatch, WC-ledger-write, or money-movement authority.

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

### Operator-notification exception

The route is implemented in `ops/void-ai-agent-public-gateway-v1.mjs` and is
disabled by default. The example systemd drop-in only provides the loopback
upstream after explicit activation approval.

Marker: `VOID_OPERATOR_WEBHOOK_RECEIVER_AI_GATEWAY_SOURCE_INTEGRATION_V1`

### Agent paid-work submission exception

The paid-work submission route is implemented in
`ops/void-ai-agent-public-gateway-v1.mjs` as a bounded proxy to a separate
loopback-only receiver. It is disabled by default and accepts only bearer-bound,
SHA-256-bound JSON requests. A source merge does not install the receiver,
create credentials, restart the gateway, or activate the public route.

Marker: `VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_GATEWAY_SOURCE_V1`

## Paid-work discovery routes

The gateway also serves these repository-backed, read-only discovery surfaces:

- `GET`/`HEAD /public-node/agents/paid-work-v1.json`
- `GET`/`HEAD /public-node/agents/paid-work-v1.schema.json`

These routes publish protocol and schema metadata only. They do not submit paid
work, authenticate a paid-work request, collect payment, execute work, award
Work Credits, access a wallet or signer, or grant mutation authority.

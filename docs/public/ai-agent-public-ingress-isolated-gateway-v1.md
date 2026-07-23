# AI-Agent Public Ingress Isolated Gateway V1

## Purpose

This gateway is the narrow public-facing boundary for VOID AI-agent discovery.
It is intentionally separate from the main node service and does not proxy the
node's general HTTP surface.

## Exact surface

The gateway binds to loopback only and serves four repository-backed JSON
documents:

- `/public-node/agents/discovery-v1.json`
- `/public-node/agents/discovery-v1.schema.json`
- `/.well-known/void-agent-discovery.json`
- `/.well-known/void-agent-discovery.schema.json`

Only `GET` and `HEAD` are accepted. Unknown paths return `404`. Other methods
return `405` with `Allow: GET, HEAD`.

## Authority boundary

The gateway has:

- no transaction submission;
- no wallet, treasury, validator, ledger, or Work Credit authority;
- no upstream HTTP proxy authority;
- no secret or operator-key access;
- no ability to expose the main node's port `4100`.

The service reads the four JSON files at startup and serves their exact bytes.

## Deployment sequence

This repository lane only builds and proves the loopback gateway. It does not
install the systemd unit, start the gateway, configure Tailscale, enable Funnel,
restart VOID, access a remote machine, or touch Nimo.

Deployment and public ingress are separate gated operations after merge.

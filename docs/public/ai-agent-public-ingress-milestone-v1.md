# VOID AI-Agent Public Ingress Milestone V1

## Milestone

VOID Network now exposes a bounded AI-agent discovery surface over public HTTPS:

`https://zoso-precision-tower-7810.taila47fd.ts.net:8443`

The public endpoint was independently verified from a GitHub-hosted Ubuntu
runner outside the operator Tailnet. Default TLS trust, exact response bytes,
GET/HEAD behavior, JSON headers, and the deny surface all passed.

## Exact public surface

The gateway serves only these four repository-backed documents:

- `/public-node/agents/discovery-v1.json`
- `/public-node/agents/discovery-v1.schema.json`
- `/.well-known/void-agent-discovery.json`
- `/.well-known/void-agent-discovery.schema.json`

Only `GET` and `HEAD` are accepted. Unknown paths return an empty `404`.
Unsupported methods return an empty `405` with `Allow: GET, HEAD`.

## Containment

The standalone gateway binds only to `127.0.0.1:4112`. Raw port `4112` is not
exposed through the Tailnet or public internet. The main node port is not
exposed by this milestone. Private Tailnet HTTPS remains available separately.

The gateway has no upstream proxy authority and cannot reach the node's general
HTTP surface.

## Authority boundary

This milestone grants discovery only. It does not grant transaction or mutation
authority, wallet or treasury authority, validator activation, ledger mutation,
automatic Work Credit awards, automatic Buy VOID fulfillment, operator
credentials, or secrets.

## Independent verification

- Provider: GitHub Actions
- Runner: GitHub-hosted `ubuntu-latest`
- Workflow run: `30057397052`
- Job: `89371891151`
- Artifact: `void-ai-agent-public-gateway-external-proof-v1`
- Exact routes verified: `4`
- Forbidden paths verified: `4`
- Forbidden methods verified: `5`
- Verdict: `AI_AGENT_PUBLIC_GATEWAY_INDEPENDENT_PUBLIC_NETWORK_EXACT_GREEN`

## Repository checkpoint

The milestone is grounded at main commit:

`462e460147da4b60682351160ba5290846cba9a4`

After this milestone record merges, create the permanent annotated checkpoint
tag using:

`ckpt-ai-agent-public-ingress-independent-external-v1-<MERGE_SHORT>-20260724`

## Next lane

The next bounded lane is **AI-agent capability negotiation v1**:

1. Publish machine-readable supported capabilities.
2. Separate unauthenticated discovery from authenticated requests.
3. Define signed bounded request envelopes.
4. Preserve dry-by-default mutation behavior.
5. Prepare bounded paid work and Work Credit earning.

Authenticated mutation, automatic Buy VOID fulfillment, validator activation,
wallet or treasury control, and automatic Work Credit awards remain disabled.

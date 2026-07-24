# VOID AI-Agent Capability Negotiation V1

Marker: `VOID_AI_AGENT_CAPABILITY_NEGOTIATION_V1`

## Purpose

This lane gives an external AI agent a deterministic way to determine which
VOID capabilities it may use without submitting a negotiation request or
receiving implied authority.

Negotiation is a **client-side intersection**. The agent fetches the advertised
catalog, supplies a local list of desired capability IDs, and grants itself only
entries that satisfy every fail-closed requirement:

- state is `live`;
- enabled is `true`;
- access is `anonymous`;
- authority is `read_only`;
- every HTTP method is `GET` or `HEAD`;
- every path is same-origin.

Unknown, disabled, planned, guarded, authenticated, ambiguous, malformed, or
unverifiable capabilities resolve to `not_granted`.

## Public documents

Canonical catalog:

```text
/public-node/agents/capabilities-v1.json
/public-node/agents/capabilities-v1.schema.json
```

Stable well-known pointer:

```text
/.well-known/void-agent-capabilities.json
/.well-known/void-agent-capabilities.schema.json
```

The canonical discovery document advertises:

```text
entrypoints.capability_negotiation =
  /public-node/agents/capabilities-v1.json
```

## Live grants

V1 grants only:

- `public_discovery`
- `capability_negotiation`

Both are anonymous, read-only, same-origin, and limited to `GET` and `HEAD`.

## Explicitly not granted

The public catalog does not enable:

- public network or DataNet read access through the isolated gateway;
- authenticated agent sessions;
- signed request envelopes;
- paid-work submission;
- automatic Work Credit awards;
- Buy VOID automatic fulfillment;
- validator activation;
- wallet, treasury, or ledger mutation.

The existing Work Credit pilot remains operator-coordinated and is not granted
through this public catalog.

## Safe client

```bash
node tools/void-ai-agent-capability-client-v1.mjs \
  --base https://your-node.example \
  --want public_discovery,capability_negotiation
```

A fail-closed example:

```bash
node tools/void-ai-agent-capability-client-v1.mjs \
  --base https://your-node.example \
  --want public_discovery,bounded_paid_work_submission
```

The first capability is granted. The second returns `not_granted`.

The client performs same-origin GET-only requests, rejects redirects, sends no
credentials, and never interprets route visibility as mutation authority.

## Next lane

After this read-only contract is live and externally verified, the next lane is
an expiry-bounded authentication contract with signed request-envelope
discovery. That future lane must remain read-only first and must not enable paid
work, Work Credit awards, Buy VOID fulfillment, or other mutation merely by
advertising an authentication mechanism.

## Collision boundary

This lane modifies only the existing canonical discovery document, isolated
gateway allowlist/proof/documentation, and adds the capability catalog, client,
documentation, and focused proof. It does not modify the main node runtime,
wallet, treasury, validator, ledger, Work Credit mutation, Buy VOID fulfillment,
Tailscale configuration, systemd configuration, or Nimo state.

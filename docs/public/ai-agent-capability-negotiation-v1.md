# VOID AI-Agent Capability Negotiation V1

Marker: `VOID_AI_AGENT_CAPABILITY_NEGOTIATION_V1`

## Purpose

This contract gives an external AI agent a deterministic, fail-closed method
for deciding which VOID capabilities it may use.

Negotiation remains a **client-side intersection**. The agent fetches the
catalog, supplies a local list of desired capability IDs, and grants itself only
entries that satisfy every requirement:

- state is `live`;
- enabled is `true`;
- access is `anonymous`;
- authority is `read_only`;
- every HTTP method is `GET` or `HEAD`;
- every path is same-origin.

Unknown, disabled, guarded, operator-coordinated, ambiguous, malformed, or
unverifiable entries resolve to `not_granted`.

## Public documents

Capability catalog:

```text
/public-node/agents/capabilities-v1.json
/public-node/agents/capabilities-v1.schema.json
/.well-known/void-agent-capabilities.json
/.well-known/void-agent-capabilities.schema.json
```

Published authentication contract:

```text
/public-node/agents/authentication-v1.json
/public-node/agents/authentication-v1.schema.json
/.well-known/void-agent-authentication.json
/.well-known/void-agent-authentication.schema.json
```

## Live grants

V1 grants:

- `public_discovery`
- `capability_negotiation`
- `authentication_contract_discovery`

All three are anonymous, read-only, same-origin, and limited to `GET` and
`HEAD`.

`authentication_contract_discovery` grants only the ability to fetch and
validate the published identity and signed-envelope profile. It does not grant
an authenticated session.

## Explicitly not granted

The catalog does not enable:

- `public_readonly_network_data`;
- `authenticated_readonly_agent_session`;
- `bounded_paid_work_submission`;
- public Work Credit earning or automatic Work Credit awards;
- Buy VOID automatic fulfillment;
- validator activation;
- wallet, treasury, or ledger mutation.

The authentication contract is published, while these runtime flags remain
false:

```text
authentication_active
signed_request_envelopes_active
payment_submission_active
work_credit_awards_active
buy_void_automatic_fulfillment_active
```

## Safe capability client

```bash
node tools/void-ai-agent-capability-client-v1.mjs \
  --base https://your-node.example \
  --want \
  public_discovery,capability_negotiation,authentication_contract_discovery
```

A fail-closed request:

```bash
node tools/void-ai-agent-capability-client-v1.mjs \
  --base https://your-node.example \
  --want \
  authentication_contract_discovery,authenticated_readonly_agent_session
```

The discovery contract is granted. The authenticated session returns
`not_granted`.

## Next lane

The next bounded lane is **AI-agent read-only verifier runtime v1**. It must
run as a separate isolated process, enforce signature expiry and nonce replay,
accept authenticated `GET` and `HEAD` only, and grant no paid-work, Work Credit
award, Buy VOID fulfillment, validator, wallet, treasury, or ledger authority.

## Collision boundary

This contract modifies only AI-agent discovery, capability, authentication,
isolated-gateway, proof, tool, and documentation files. It does not modify the
main node runtime, Buy VOID request handling, wallet, treasury, validator,
ledger, Work Credit mutation, Tailscale configuration, systemd configuration,
or Nimo state.

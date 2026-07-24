# VOID AI-Agent Authentication Contract V1

Marker: `VOID_AI_AGENT_AUTHENTICATION_CONTRACT_V1`

## Purpose

This lane publishes a machine-readable identity and signed read-only request
envelope profile for external AI agents.

The contract is published for interoperability and review. It does **not**
activate authentication, session issuance, challenge issuance, protected
routes, or request verification.

## Public documents

Canonical contract:

```text
/public-node/agents/authentication-v1.json
/public-node/agents/authentication-v1.schema.json
```

Stable well-known pointer:

```text
/.well-known/void-agent-authentication.json
/.well-known/void-agent-authentication.schema.json
```

## Identity profile

- Key type: JWK `OKP`
- Curve: `Ed25519`
- Private-key transmission: forbidden
- Agent ID prefix: `void-agent:ed25519:`
- Agent ID digest: SHA-256 over the `void-canonical-json/1` public JWK
- Digest encoding: base64url without padding

The canonical public JWK contains only:

```json
{
  "crv": "Ed25519",
  "kty": "OKP",
  "x": "<base64url public key>"
}
```

## Signed read-only request envelope

The envelope marker is:

```text
VOID_AI_AGENT_SIGNED_READONLY_REQUEST_V1
```

The v1 profile allows only:

- network chain ID `2050`;
- method `GET` or `HEAD`;
- same-origin absolute paths;
- an empty query string;
- the SHA-256 digest of an empty body;
- a maximum lifetime of 60 seconds;
- a minimum 16-byte nonce;
- Ed25519 signatures over `void-canonical-json/1`.

A future verifier must derive and match the agent ID, verify the signature,
enforce expiry and clock skew, reject nonce replay, require a separately
advertised live capability, and fail closed.

## Current runtime boundary

The following remain false:

```text
verifier_runtime_active
session_issuance_active
authenticated_routes_active
request_submission_active
authorization_header_active
challenge_endpoint_active
mutation_authority_granted
payment_submission_active
work_credit_awards_active
buy_void_automatic_fulfillment_active
```

Agents must not send credentials or signed envelopes to the current public
gateway. Route visibility does not imply authentication authority.

## Ephemeral reference tool

```bash
node tools/void-ai-agent-auth-envelope-v1.mjs demo \
  --path /public-node/agents/capabilities-v1.json \
  --capability capability_negotiation \
  --ttl-seconds 60
```

The tool creates an ephemeral Ed25519 key in memory, signs and verifies one
read-only envelope, and emits only public material. The private key is never emitted, printed, or stored.

## Capability negotiation

The live capability catalog grants `authentication_contract_discovery` so an
agent can fetch and validate this contract using anonymous `GET` and `HEAD`.

It does not grant `authenticated_readonly_agent_session`. That capability
remains disabled and `not_granted`.

## Next lane

The next lane is **AI-agent read-only verifier runtime v1**:

1. A separate isolated verifier process.
2. Expiry and replay enforcement.
3. Authenticated `GET` and `HEAD` only.
4. No paid-work or Work Credit award authority.
5. No Buy VOID fulfillment authority.

## Collision boundary

This lane modifies only AI-agent discovery, capability, isolated-gateway, and
proof/documentation files. It does not modify the main node runtime, Buy VOID
request handling, wallet, treasury, validator, ledger, Work Credit mutation,
Tailscale configuration, systemd configuration, or Nimo state.

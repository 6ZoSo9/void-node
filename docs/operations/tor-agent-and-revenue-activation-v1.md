# Tor agent and revenue activation v1

## Stage 1 outcome

An external AI agent can discover VOID's canonical onion identity and connect to
the existing read-only MCP service through the same Tor v3 onion origin.

The public endpoint is:

```text
http://<signed-onion-hostname>/mcp
```

Machine discovery is available at:

```text
/.well-known/void-agent-mcp-onion-v1.json
/public-node/agents/mcp-tor-v1.json
```

The existing Tor transport descriptor also advertises the MCP descriptor and
endpoint under `agent_surfaces.mcp_readonly_v1`.

## Authority boundary

Stage 1 exposes the existing MCP HTTP server only in its enforced read-only
configuration. The server registers:

- `void_bootstrap_network`;
- `void_probe_paid_work`;
- `void_prepare_paid_work_submission`;
- read-only discovery, service-catalog, and capability-status resources.

It does not register `void_submit_paid_work`. Stage 1 does not activate paid
submission, Buy VOID fulfillment, Work Credit writes, Datanet writes, wallet or
signer access, validator mutation, or operator control.

HTTP `POST` is required by MCP Streamable HTTP for JSON-RPC messages. It does
not grant application mutation authority.

## Network boundary

Tor continues to own virtual port 80 and continues to forward it to the existing
loopback onion backend. No `torrc`, hidden-service key, listener, or systemd
change is part of this source lane.

The onion backend bridges only the exact `/mcp` path to the fixed upstream:

```text
127.0.0.1:4114/mcp
```

There is no caller-controlled upstream host, port, scheme, or path and no
generic reverse proxy.

## Request controls

The bridge:

- accepts only `GET`, `POST`, and `DELETE` on exact `/mcp`;
- rejects query strings and non-matching hosts;
- requires the signed node-to-onion binding to verify on every request;
- rejects `Authorization`, `Proxy-Authorization`, `Cookie`, and `Origin`;
- forwards only MCP protocol headers from an allowlist;
- replaces the upstream `Host` and `User-Agent`;
- bounds JSON request bodies;
- bounds non-streaming responses and byte-limits event streams;
- limits concurrent requests;
- applies an upstream timeout;
- maps pre-response upstream failures to deterministic JSON-RPC errors.

Static files, Tor descriptors, and node-binding routes remain GET/HEAD-only.

## Discovery identity

The MCP onion descriptor is available only when the canonical Ed25519
node-to-onion binding verifies. It includes:

- the Tor v3 endpoint;
- supported MCP protocol versions;
- the exact HTTP methods;
- the signed node identity summary;
- explicit non-mutation authority;
- resource, body, concurrency, and timeout limits;
- links to the Tor transport descriptor and signed binding.

This makes the MCP endpoint signature-bound without modifying or regenerating
the Tor hidden-service key.

## Proof boundary

The proof uses temporary fixture files, an ephemeral signed binding, an
ephemeral onion hostname, an ephemeral mock MCP upstream, and an ephemeral
backend listener. It proves:

- signed discovery and descriptor linkage;
- exact host, path, method, origin, and credential guards;
- header allowlisting;
- POST, GET event-stream, and DELETE forwarding;
- request and response byte bounds;
- deterministic timeout and unavailable-upstream errors;
- fail-closed behavior when the signed binding is invalid;
- preservation of the existing static surface;
- the existing MCP HTTP source still forbids submission credentials and
  mutation-bearing configuration.

The proof does not touch the live service, live Tor configuration, hidden
service key, wallet, Work Credit ledger, Datanet state, Buy VOID state, or
funds.

## Deferred stages

After Stage 1 is merged and deployed with live evidence:

1. authenticated paid-work submission over onion;
2. verifiable receipt retrieval over onion;
3. read-only Datanet access;
4. read-only Work Credit status;
5. Buy VOID checkout and fulfillment status;
6. redundant onion identities, rotation, and bounded recovery.

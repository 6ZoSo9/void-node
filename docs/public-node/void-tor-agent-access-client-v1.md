# VOID Tor Agent Access Client V1

## Purpose

`tools/void-tor-agent-access-client-v1.mjs` gives an outside AI agent a bounded, one-command way to inspect the canonical VOID public onion service through a local Tor SOCKS proxy.

The client does not trust an onion URL merely because it responds. It verifies the signed VOID node-to-onion binding, validates the Tor v3 address checksum, confirms both binding aliases, confirms both transport-descriptor aliases, and checks exact SHA-256 pins for the required DataNet public contracts.

## Command

Run from the repository root while a local Tor SOCKS listener is available at `127.0.0.1:19050`:

```bash
node tools/void-tor-agent-access-client-v1.mjs \
  --profile config/void-tor-agent-access-client-v1.json \
  --pretty
```

Write the receipt privately:

```bash
node tools/void-tor-agent-access-client-v1.mjs \
  --profile config/void-tor-agent-access-client-v1.json \
  --pretty \
  --output "$HOME/void-tor-agent-access-client-v1-receipt.json"
```

A different local Tor SOCKS port may be selected without changing the identity trust profile:

```bash
node tools/void-tor-agent-access-client-v1.mjs \
  --profile config/void-tor-agent-access-client-v1.json \
  --socks-port 9050 \
  --pretty
```

Only `127.0.0.1` and `::1` are accepted as SOCKS proxy hosts. This prevents the client from silently handing onion destinations to an untrusted remote proxy.

## Trust model

The checked-in profile pins:

- the expected Tor v3 onion hostname;
- the canonical VOID node ID;
- the SHA-256 fingerprint of the Ed25519 node public key;
- the exact current signed binding body SHA-256;
- the binding expiration timestamp;
- the exact required DataNet index, quote, and quote-schema body hashes.

The client then verifies:

1. SOCKS5 `CONNECT` uses address type `DOMAINNAME` (`ATYP=3`). The operating system is never asked to resolve the `.onion` hostname.
2. The onion hostname is a valid Tor v3 address with a correct checksum and version byte.
3. Both public binding aliases return HTTP 200 and byte-identical bodies.
4. The binding body matches the pinned SHA-256.
5. The embedded public key matches the pinned fingerprint.
6. The Ed25519 signature over `VOID_NODE_ONION_BINDING_V1\0<canonical-json>` is valid.
7. The binding is active, unexpired, and grants read-only authority only.
8. Both Tor transport descriptors are valid and semantically identical. Their dynamic `generated_at` values may differ.
9. Required public DataNet contracts return their exact pinned bodies.
10. Transient SOCKS or circuit failures are retried only within the profile's strict attempt and delay bounds.

The onion address authenticates the Tor service. The signed binding connects that onion identity to the canonical VOID node identity. The fingerprint pin prevents a malicious service from substituting a new key and self-signing a replacement binding.

## Agent-facing output

A successful run emits `VOID_TOR_AGENT_ACCESS_CLIENT_V1_RECEIPT` JSON containing:

- transport and SOCKS5h properties;
- verified node and onion identity;
- the effective profile hash;
- exact required-route results;
- observed optional discovery surfaces;
- advertised read-only MCP metadata, when present;
- an explicit discovery-parity classification;
- an authority statement showing that no mutation authority was granted.

Optional routes are reported honestly:

- `available`: HTTP 200 and any configured marker/hash checks passed;
- `unavailable`: an accepted absence response such as HTTP 404;
- `degraded`: timeout, unexpected status, malformed JSON, or marker/hash mismatch.

Missing optional routes do not become implied capabilities.

## Current V1 boundary

V1 is a client and verifier. It does **not** add server routes and it does not claim full onion agent-discovery parity.

It may report the read-only MCP descriptor as `advertised`; that means the descriptor verified. It does not mean an MCP session or tool call was executed. Read-only MCP execution is a separate proof lane.

V1 never:

- sends credentials, cookies, authorization headers, wallet material, or operator keys;
- follows redirects;
- performs local `.onion` DNS resolution;
- accepts a caller-selected remote HTTP upstream;
- submits paid work;
- writes Work Credits;
- executes a payment;
- moves funds;
- mutates the node, Tor service, validator set, wallet, or ledger.

## Binding renewal

The current binding expires at the timestamp pinned in `config/void-tor-agent-access-client-v1.json`. Renewal requires a reviewed profile update containing the new exact binding SHA and expiration. A new key fingerprint or onion hostname is a separate identity-change event and must not be accepted as routine renewal.

## Proof

Run:

```bash
node scripts/prove_void_tor_agent_access_client_v1.mjs
```

The proof creates an in-process HTTP fixture and SOCKS5 proxy. It demonstrates remote hostname resolution, signed-binding validation, dynamic descriptor timestamp handling, exact required-route hash enforcement, honest reporting of absent optional capabilities, and rejection of tampered identity or route data.

# Apollyon read-only sentry node collector v1

Marker: `VOID_APOLLYON_READONLY_SENTRY_NODE_COLLECTOR_V1`

Status: **source-only GET-only loopback evidence collector**.

## Purpose

This contract acquires the exact live-node evidence needed by `apollyon_readonly_sentry_observation_v1` without giving Apollyon, Ollama, or a caller any mutation authority.

It is deliberately narrower than a generic HTTP client. The origin and paths are fixed in source:

```text
http://127.0.0.1:4100/health
http://127.0.0.1:4100/__void/ready.json
http://127.0.0.1:4100/blocks/latest/number2.json
http://127.0.0.1:4100/p2p/peers
```

No caller-supplied host, scheme, port, path, query string, headers, credential, or method is accepted.

## Transport boundary

One collector call starts exactly four concurrent GET requests under one shared `1500 ms` snapshot deadline.

Every response must:

- resolve to the exact requested URL;
- report `redirected=false`;
- return HTTP `200`;
- use JSON content type when a content type is present;
- advertise only a canonical decimal `Content-Length` when present;
- stay within `64 KiB` both by declared length and streamed bytes;
- decode as fatal UTF-8; and
- parse as JSON.

Requests use `redirect=error`, `credentials=omit`, `Accept: application/json`, and no authorization/cookie header.

The collector persists no response body. It hashes the exact bounded raw bytes with SHA-256 and places only the extracted health values plus the four response digests in the returned node-evidence object.

## Extracted evidence

### Health

`/health` must expose boolean `ok`. A valid HTTP/JSON response with `ok=false` is still successfully collected evidence; the later sentry classifier turns it into a HOLD.

### Readiness

`/__void/ready.json` must expose:

- boolean `ready`;
- nonnegative bounded safe-integer `gap`; and
- `txroot_live` exactly `0 | 1`.

### Latest head

`/blocks/latest/number2.json` must expose `number` as either a nonnegative safe integer or canonical unsigned-decimal uint64 string. It is normalized to canonical decimal text.

### Peer state

`/p2p/peers` must return `ok=true`, a bounded `connected` array, and a bounded `verifiedPeers` array.

The runtime source defines these differently:

- `connected[].id` is the currently authenticated live peer node ID;
- `verifiedPeers[].node_id` comes from the verified-peer cache and can include offline historical peers.

Therefore `verified_peer_count` in sentry evidence is **not** `verifiedPeers.length`. It is the set intersection of current connected IDs and verified-cache node IDs. This keeps stale cache history from inflating a live-health signal.

Duplicate or malformed peer IDs fail closed.

## Relationship to the sentry observation

The collector returns only `ApollyonNodeHealthEvidenceV1`. It does not construct an all-clear by itself.

The sentry observation contract separately requires Chain-2050 authority coverage. After the #1429 repair, an empty authority-check set deterministically produces `no_authority_checks` as a HOLD. This means a healthy node collection cannot masquerade as complete sentry GREEN while the live authority source is still unbound.

## Remaining gates

This collector is a prerequisite, not live protection by itself. Remaining separately reviewed gates include:

1. deploy/fetch the source on the intended host;
2. run one read-only live collector canary and compare its digests/values with operator evidence;
3. bind reviewed production Chain-2050 authority reads so the sentry has non-empty authority coverage;
4. construct the deterministic sentry observation; and
5. only then consider a local-only model-consumption gate for the frozen v2r13 + Broker V11 pair.

## Non-activation boundary

This source lane does not:

- invoke Ollama or another model/provider;
- send credentials;
- perform POST/PUT/PATCH/DELETE;
- persist response bodies;
- open a listener;
- deploy or restart a service;
- mutate Chain-2050 or a registry;
- activate a capability or office;
- access keys, wallets, or signers;
- mutate validators or Work Credits;
- submit transactions; or
- move funds.

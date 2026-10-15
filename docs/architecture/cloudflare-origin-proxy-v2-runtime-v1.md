# Cloudflare origin PROXY-v2 loopback runtime v1

Marker: `VOID_CLOUDFLARE_ORIGIN_PROXY_V2_RUNTIME_V1`

Issue: #2984.

## Purpose

This source-runtime candidate mounts the merged
`VOID_CLOUDFLARE_ORIGIN_PROXY_V2_SOURCE_V1` translation contract on one
IPv4-loopback listener while preserving VOID's signed public origin
`https://seed.nullfeed.org`.

It accepts only the three already-reviewed sensitive POST routes:

- `/__void/agents/paid-work/credential-requests/v1`;
- `/wc/public-earning-pilot-v1/claim-ticket`;
- `/wc/public-earning-pilot-v1/submit-result`.

Ordinary public traffic remains outside this adapter and continues to belong to
the existing frontdoor.

This change does **not** make `CF-Connecting-IP` trusted. The runtime is only a
source candidate until host policy proves that the listener is reachable
exclusively through the intended cloudflared service identity and current Tunnel
configuration.

## Input boundary

The runtime listens only on `127.0.0.1` and reads one bounded HTTP request per
TCP connection.

It:

- bounds HTTP headers to 32 KiB;
- rejects obsolete folding;
- rejects duplicate authority-sensitive fields through the merged translator;
- rejects `Transfer-Encoding`, `Expect`, `Upgrade`, and
  `Proxy-Connection`;
- requires one canonical decimal `Content-Length`;
- requires `application/json`;
- rejects bytes already buffered beyond the declared request body;
- pauses the client read side immediately after one request is classified so
  later bytes cannot become a second request in this runtime;
- delegates exact Host / route / `CF-Connecting-IP` / Pseudo-IPv4 checks to
  the merged #3006 translator.

The adapter never accepts an ordinary public route and never converts source
identity into a trusted HTTP forwarding header.

## Existing route ceilings preserved

The candidate deliberately does not invent larger limits.

Credential request:

- maximum request body: 64 KiB;
- downstream timeout: 15 seconds;
- maximum downstream response body: 4 MiB;
- requires the existing `X-Void-Payload-Sha256` shape;
- does not forward caller Authorization.

Public Earn:

- claim maximum request body: 64 KiB;
- submit maximum request body: 512 KiB;
- downstream timeout: 30 seconds;
- maximum downstream response body: 1 MiB;
- preserves ordinary Authorization only for the Earn path so the reviewed
  downstream claim/submit capability rules remain authoritative.

## Downstream construction

For an admitted request the runtime:

1. calls the merged Cloudflare source translator;
2. receives one strict TCP4/TCP6 PROXY-v2 preface with source port 0 and
   destination port 443;
3. reconstructs a narrow HTTP request with only:
   - `Host: seed.nullfeed.org`;
   - `Accept: application/json`;
   - validated `Content-Type`;
   - exact `Content-Length`;
   - `Connection: close`;
   - credential payload SHA-256 when required;
   - Earn Authorization when present;
4. prepends the PROXY-v2 preface;
5. sends the resulting bytes only to the configured IPv4-loopback public-443
   dispatcher.

Caller `Forwarded`, `X-Forwarded-*`, `X-Real-IP`,
`True-Client-IP`, `CF-Connecting-IP`, other `CF-*` metadata, Cookie,
and unrelated headers are not copied downstream.

The dispatcher response must be bounded, Content-Length framed, non-chunked and
wire-length exact before it is returned to the client.

## Focused proof

The disposable proof starts:

- the real candidate adapter on an ephemeral loopback port; and
- a mock loopback dispatcher that runs the existing strict PROXY-v2 parser and
  public-443 dispatcher classifier.

It proves:

- split request delivery survives;
- IPv4 and IPv6 visitor identity becomes strict PROXY-v2 source identity;
- source port remains 0 and destination port remains 443;
- credential and Earn routes classify to their exact existing dispatcher
  destinations;
- spoofable forwarding, Cloudflare and Cookie headers do not reach downstream;
- Earn submit Authorization survives;
- ordinary routes, aliases, wrong methods/Host, duplicate CF source fields,
  Pseudo-IPv4 auxiliaries and transfer encoding fail before downstream;
- missing Content-Length and wrong media type fail locally;
- the 64 KiB claim ceiling is enforced before downstream;
- already-buffered trailing request bytes are rejected;
- the read side is paused once one request is classified;
- oversized downstream responses and unavailable dispatcher fail closed.

## Required host/runtime evidence still missing

This PR does not establish the trust precondition for Cloudflare source
identity. Before production use, #2984 must separately prove at least:

- exact installed cloudflared process/service identity;
- a local isolation mechanism that prevents every untrusted local process from
  reaching this adapter;
- exact listener ownership;
- Tunnel public-hostname/path rules route only the three sensitive paths here;
- ordinary site/status/read paths still route to the existing frontdoor;
- no active Worker/subrequest route can rewrite `CF-Connecting-IP`;
- Pseudo IPv4 overwrite is disabled or separately reviewed;
- adapter -> dispatcher exclusive reachability;
- dispatcher -> credential/Earn edge reachability remains under the reviewed
  local isolation policies;
- restart/rollback behavior;
- external two-source acceptance and rate-isolation evidence.

The current historical cloudflared user-service arrangement must not be treated
as UID isolation merely because this candidate listens on loopback.

## Authority

Source/test/CI only.

These remain false:

- `cloudflare_header_transport_trusted=false`;
- `cloudflared_uid_isolation_proven=false`;
- `cloudflare_worker_route_absence_proven=false`;
- `pseudo_ipv4_overwrite_disabled_proven=false`;
- `tunnel_path_ownership_verified=false`;
- `dispatcher_exclusive_reachability_proven=false`;
- `production_service_installed=false`;
- `runtime_integration=false`.

No Tunnel/DNS/systemd/nftables/network mutation, credential issuance, paid-work
dispatch, Work Credit write, wallet/key/signer access, payment/transaction,
presale/market activation, treasury/liquidity action or funds movement is
authorized or performed.

**PROTECT THE CORE.**

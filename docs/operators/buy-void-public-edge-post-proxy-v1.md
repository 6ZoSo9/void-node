# Buy VOID public-edge POST proxy v1

## Purpose

The public Tailscale Funnel terminates at the VOID public app composition
gateway on `127.0.0.1:8082`. That gateway serves the Buy VOID checkout page
and read-only configuration routes, but historically rejected every non-GET
method before the request reached the live node on port `4100`.

This lane adds one narrow exception:

```text
POST /__void/buy-void/request
```

The exact request body is forwarded to `VOID_NODE_UPSTREAM`, whose existing
Buy VOID request contract remains authoritative for validation, idempotency,
one-active-request enforcement, sale limits, receiver binding, and journal
persistence.

## Boundary

The gateway does not gain a general mutation proxy.

- Only the exact POST path above is forwarded.
- All unrelated POST requests remain blocked.
- Legacy `GET /__void/buy-void/request.json` remains outside the new
  allowlist; the deployed checkout runtime proof remains authoritative for
  its existing `405` behavior.
- `OPTIONS /__void/buy-void/request` remains blocked because the checkout is
  same-origin and does not require CORS preflight.
- Request bodies are capped at 65,536 bytes.
- The upstream POST and its full JSON response have a fixed **8-second
  total deadline**. The upstream is contacted with redirects forbidden.
- Upstream responses must be JSON; the maximum accepted response body is
  **131,072 bytes**. Declared oversized responses are refused before
  streaming; unannounced oversized bodies stop at the byte ceiling.
- A refused or timed-out upstream result becomes a generic **502** with
  no checkout request, transaction identity, private data, or payment
  instructions in the edge-generated response.
- A 502 does **not** establish that no request was recorded upstream.
  A client MUST keep the attempted intent uncertain and must not
  automatically resubmit or send funds; only reviewed request recovery
  can establish an already-committed outcome.
- The response is always marked `Cache-Control: no-store` and
  `X-Content-Type-Options: nosniff`, regardless of upstream headers.
- Automatic fulfillment remains disabled.
- This code change does not deploy or restart any live service.
- This code change does not create a request, access a wallet, send USDC,
  sign a transaction, broadcast a transaction, or deliver VOID.

## Verification

`scripts/prove_buy_void_public_edge_post_proxy_v1.mjs` starts an isolated fake
node upstream and a temporary composition gateway. It proves that the exact
POST route preserves method, body, upstream status, and application response,
while every non-allowlisted mutation remains blocked. It also
tests the exact maximum accepted JSON reply, declared/streamed oversize,
non-JSON and redirect refusal, and a fake upstream that sends headers but
never finishes the body. Those isolated fixture checks do not establish an
installed public-network endpoint or prove a request was not committed
upstream on a timeout.


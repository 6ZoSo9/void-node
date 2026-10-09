# Buy VOID payment RPC total-deadline boundary v1

## Purpose

The Base Buy VOID payment-verification route now delegates RPC observation to
`src/economic/buy_void_payment_rpc_observer_v1.ts` instead of issuing raw
`fetch` calls.

That observer already bounded response bytes and configured Node's request
timeout. However Node's request timeout is inactivity-based: a peer that sends a
small amount of data often enough can keep the connection active indefinitely.
For an operator-facing payment verification path, that is not a complete
resource bound.

This change adds a separate **total wall-clock deadline** using the same bounded
timeout policy. The request is destroyed with
`payment_observer_rpc_deadline_exceeded` if the full RPC response has not
finished by that deadline, even while bytes continue arriving.

The existing inactivity timeout remains in place as an independent guard.

## Content-type boundary

The observer also tightens JSON response admission. A response is accepted only
when the normalized content type is exactly `application/json`, optionally
followed by a parameter delimiter such as
`application/json; charset=utf-8`.

Prefix lookalikes such as `application/jsonp` are rejected.

## Deterministic proof

`scripts/prove_buy_void_payment_rpc_total_deadline_v1.ts` starts a synthetic
HTTP server bound only to `127.0.0.1`. It never contacts an external RPC.

Against the actual reviewed transport it proves:

- a normal JSON-RPC response succeeds;
- `application/jsonp` is rejected;
- a mismatched JSON-RPC response ID is rejected;
- a response exceeding the configured byte cap is rejected;
- a response that terminates prematurely after headers/body prefix is rejected
  through the explicit response-abort path;
- a drip-feed response that remains active inside the inactivity window still
  hits the total wall-clock deadline.

The same proof must pass byte-identically on Node 22, 24 and 26.

## Authority boundary

This is transport hardening only. It does not mount a new route or service,
change a payment decision, submit a transaction, access a wallet/private key or
signer, mutate Chain-2050/WC, activate presale/market state, or move funds.

The observer remains RPC-read-only. The route still requires the existing
operator capability and mutation intent boundary and the downstream verified
payment policy.

**PROTECT THE CORE.**

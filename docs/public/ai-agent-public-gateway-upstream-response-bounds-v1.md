# AI-agent public gateway upstream response bounds v1

Marker: `VOID_AI_AGENT_PUBLIC_GATEWAY_UPSTREAM_RESPONSE_BOUNDS_V1`

## Outcome

Bound the two existing POST proxy upstream responses in `ops/void-ai-agent-public-gateway-v1.mjs` before full buffering, bind their receiver transport to the reviewed loopback contract, and keep rejected or timed-out upstream teardown owned until a bounded terminal state:

- operator webhook candidate forwarding; and
- authenticated paid-work submission forwarding.

This lane does not add a new proxy protocol or widen authority. It makes the existing response ceilings, receiver trust boundary, and route deadline enforceable on the actual gateway path.

## Reviewed upstream transport

A configured receiver base is accepted only in the exact form:

```text
http://127.0.0.1:<safe-port>
```

The gateway rejects malformed URLs, HTTPS/public hosts, non-loopback addresses, IPv6 loopback, userinfo, paths, queries, fragments, and trailing-slash variants before the server reports ready. The gateway appends only the fixed reviewed receiver route after that admission check. Therefore a bearer authorization header and request body cannot be forwarded to an arbitrary configured origin merely because an environment variable is non-empty.

The reviewed deployment examples remain:

- operator webhook receiver: `http://127.0.0.1:4186`;
- paid-work submission receiver: `http://127.0.0.1:4187`.

## Response and lifetime contract

For each upstream response, the gateway:

1. validates a present `Content-Length` as one canonical nonnegative safe integer;
2. rejects a declared response larger than the route's configured maximum before accumulating body bytes;
3. requires a readable response body for responses admitted for forwarding;
4. reads the body incrementally and checks the accumulated byte count before retaining bytes beyond the configured maximum;
5. creates an owned `AbortController` for each proxied upstream request and composes it with the route's total timeout;
6. actively aborts that owned request as soon as invalid length, oversize, unusable body state, timeout, or admitted-body read failure is known;
7. routes admitted-body read/timeout failures through the same bounded teardown path as explicit rejection;
8. waits at most 300 ms for response/reader cancellation settlement, preserving the primary route rejection or timeout if cleanup rejects or does not settle; and
9. performs exactly one teardown path for streamed overflow/read failure before propagating the authoritative error.

The response-size limits remain independently configurable through:

- `VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES`; and
- `VOID_AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES`.

Cleanup is not a second success criterion. A cleanup rejection is logged; a cleanup promise that does not settle within the bounded teardown window is logged as a timeout after the owned upstream request has already been aborted.

## Acceptance proof

The focused proofs start the real AI gateway plus real loopback upstreams and cover both POST routes. They prove:

- valid small responses still forward normally;
- unsafe receiver-base configurations fail before gateway readiness and before any bearer/body forwarding;
- declared and streamed oversized responses fail closed before unbounded buffering;
- rejected upstream connections close after owned abort;
- an otherwise valid response that sends a small admitted prefix and then stalls through the route deadline returns the primary gateway failure only after bounded teardown ownership is exercised;
- cancellation promises that reject or never settle cannot replace the primary error or hold the public operation indefinitely; and
- the operator-webhook and paid-work integration/guard regressions remain green.

The old `arrayBuffer()`-then-check pattern, arbitrary upstream-base forwarding, fire-and-forget rejected-body teardown, and admitted-timeout teardown escape are forbidden for these two proxy paths.

## Authority boundary

This is source, proof, documentation, and CI only. It does not activate either proxy, deploy or restart the gateway, read credentials, authenticate to a live receiver, submit live paid work, write Work Credits, use wallets or signers, construct or broadcast transactions, mutate validators, take treasury or liquidity action, or move funds.

Source completion is not deployment or external acceptance. Any live gateway activation remains a separate operation-bound gate.

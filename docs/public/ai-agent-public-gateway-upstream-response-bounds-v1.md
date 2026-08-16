# AI-agent public gateway upstream response bounds v1

Marker: `VOID_AI_AGENT_PUBLIC_GATEWAY_UPSTREAM_RESPONSE_BOUNDS_V1`

## Outcome

Bound the two existing POST proxy upstream responses in `ops/void-ai-agent-public-gateway-v1.mjs` before full buffering and keep rejected upstream teardown owned until a bounded terminal state:

- operator webhook candidate forwarding; and
- authenticated paid-work submission forwarding.

The configured response ceilings already existed. This lane makes those ceilings real streaming limits instead of post-buffer checks and prevents an already-rejected upstream connection from being left alive solely because response cancellation is deferred, rejecting, or non-settling.

## Contract

For each upstream response, the gateway:

1. validates a present `Content-Length` as one canonical nonnegative safe integer;
2. rejects a declared response larger than the route's configured maximum before accumulating body bytes;
3. requires a readable response body for responses that are admitted for forwarding;
4. reads the body incrementally and checks the accumulated byte count before retaining bytes beyond the configured maximum;
5. creates an owned `AbortController` for each proxied upstream request and composes it with the route's existing total timeout;
6. actively aborts that owned upstream request as soon as a response is rejected for invalid length, oversize, or unusable body state;
7. waits only a bounded 300 ms for response/reader cancellation settlement, preserving the primary rejection if cleanup rejects or does not settle; and
8. keeps the route timeout active through complete body consumption, so a normally admitted stalled response remains bounded as well.

The response-size limits remain independently configurable through:

- `VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES`; and
- `VOID_AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES`.

Rejected-body cleanup is not a second success criterion and cannot replace the route's authoritative size/format failure. A cleanup rejection is logged; a cleanup promise that does not settle within the bounded teardown window is logged as a timeout after the owned upstream request has already been aborted.

## Acceptance proof

The focused proof starts the real AI gateway and a real loopback upstream. For both POST routes it proves:

- a valid small upstream response is still forwarded;
- an oversized declared `Content-Length` returns the existing fail-closed upstream error before full buffering;
- a chunked response that crosses the configured ceiling returns the existing fail-closed upstream error without waiting for upstream completion;
- the rejected upstream connection closes after the gateway actively aborts its owned request;
- a proof-mode cancellation promise that never settles cannot hold the public request beyond the bounded teardown window; and
- a proof-mode cancellation promise that rejects cannot replace the primary route failure.

The proof-mode cancellation hooks alter only cancellation-promise settlement after real abort/cancel initiation; the upstream remains a real loopback HTTP server and the gateway still has to terminate the underlying connection.

The old `arrayBuffer()`-then-check pattern and fire-and-forget rejected-body teardown are forbidden for these two proxy response paths.

## Authority boundary

This is source, proof, documentation, and CI only. It does not activate either proxy, deploy or restart the gateway, read credentials, authenticate to a live receiver, submit live paid work, write Work Credits, use wallets or signers, construct or broadcast transactions, mutate validators, take treasury or liquidity action, or move funds.

Source completion is not deployment or external acceptance. Any live gateway activation remains a separate operation-bound gate.

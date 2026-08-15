# AI-agent public gateway upstream response bounds v1

Marker: `VOID_AI_AGENT_PUBLIC_GATEWAY_UPSTREAM_RESPONSE_BOUNDS_V1`

## Outcome

Bound the two existing POST proxy upstream responses in `ops/void-ai-agent-public-gateway-v1.mjs` before full buffering:

- operator webhook candidate forwarding; and
- authenticated paid-work submission forwarding.

The configured response ceilings already existed. This lane makes those ceilings real streaming limits instead of post-buffer checks.

## Contract

For each upstream response, the gateway:

1. validates a present `Content-Length` as one canonical nonnegative safe integer;
2. rejects a declared response larger than the route's configured maximum before accumulating body bytes;
3. requires a readable response body for responses that are admitted for forwarding;
4. reads the body incrementally and checks the accumulated byte count before retaining bytes beyond the configured maximum;
5. best-effort cancels an already-rejected body without waiting for cleanup to replace or delay the primary size rejection; and
6. keeps the existing fetch `AbortSignal` active through body consumption, so the route timeout still owns a stalled response body.

The response-size limits remain independently configurable through:

- `VOID_OPERATOR_WEBHOOK_RECEIVER_MAX_RESPONSE_BYTES`; and
- `VOID_AGENT_PAID_WORK_SUBMISSION_MAX_RESPONSE_BYTES`.

## Acceptance proof

The focused proof starts the real AI gateway and a real loopback upstream. For both POST routes it proves:

- a valid small upstream response is still forwarded;
- an oversized declared `Content-Length` returns the existing fail-closed upstream error promptly even when the upstream does not complete the declared body;
- a chunked response that crosses the configured ceiling returns the existing fail-closed upstream error promptly without waiting for the upstream to finish; and
- rejection triggers best-effort upstream response disposal.

The old `arrayBuffer()`-then-check pattern is forbidden for these two proxy response paths.

## Authority boundary

This is source, proof, documentation, and CI only. It does not activate either proxy, deploy or restart the gateway, read credentials, authenticate to a live receiver, submit live paid work, write Work Credits, use wallets or signers, construct or broadcast transactions, mutate validators, take treasury or liquidity action, or move funds.

Source completion is not deployment or external acceptance. Any live gateway activation remains a separate operation-bound gate.

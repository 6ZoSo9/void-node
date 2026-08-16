# VOID AI Agent Paid Work Client Response Bounds V1

Marker: `VOID_AI_AGENT_PAID_WORK_CLIENT_RESPONSE_BOUNDS_V1`

## Outcome

Make the existing portable paid-work client enforce its configured response-byte ceiling before full buffering while preserving its existing HTTPS/loopback-only, same-origin, redirect-rejecting, no-retry, private-token-file, and authority-zero contract.

The client already exposed `--max-response-bytes` with a default of 1 MiB and a hard maximum of 4 MiB. Previously, a valid declared `Content-Length` larger than the limit was rejected early, but chunked or misleading responses were first consumed with `response.arrayBuffer()` and only checked after complete buffering. The advertised limit therefore did not bound memory retained from an untrusted coordinator response.

## Bounded response contract

For discovery, route probing, and authenticated submission responses, the client now:

- validates a present `Content-Length` as a canonical nonnegative safe integer;
- rejects malformed or declared-oversize lengths before body accumulation;
- requires a readable response body;
- consumes the body with a stream reader and counts bytes before retaining beyond the configured limit;
- actively aborts the owned request as soon as redirect, malformed length, or oversize evidence is known;
- attempts response/reader cancellation but waits for it only within a 250 ms teardown ceiling and never beyond the original request deadline;
- preserves the primary redirect/size error when cancellation rejects or does not settle; and
- keeps the original AbortController deadline active through admitted body consumption and bounded rejection teardown.

The same internal bounded fetch path is used by read-only `probe` requests and token-authenticated `submit` requests. No token value is returned, printed, persisted to result output, or placed in command arguments.

## Executable falsification boundary

`scripts/prove_void_ai_agent_paid_work_client_response_bounds_v1.mjs` exercises the real paid-work client through its public probe API with synthetic WHATWG responses and requires:

- valid bounded discovery plus submission-route probing still succeeds;
- declared oversize rejects before full buffering and cancels/aborts the rejected response;
- malformed declared length fails closed;
- chunked/streamed oversize rejects at the accumulated-byte ceiling;
- a cancellation promise that never settles cannot extend the already-known oversize result beyond the bounded teardown window;
- a rejecting cancellation cannot replace the primary oversize result;
- a response that sends a small prefix and then stalls remains bounded by the original request deadline; and
- payment, work-execution, Work Credit, wallet/signer, transaction, and Buy VOID authority remain false.

Falsify this repair if any paid-work-client response can still retain bytes beyond `--max-response-bytes` before rejection, if known rejection cleanup can indefinitely delay or replace the primary HOLD, or if an admitted stalled body escapes the configured request deadline.

## Authority boundary

Source/proof/docs/CI only. This repair does not create or dispatch paid work, authorize payment, award or write Work Credits, access credentials beyond the client's existing caller-supplied private token file, use wallets/signers, construct or broadcast transactions, mutate validators, deploy/restart services, change runtime/network state, take treasury/liquidity action, or move funds.

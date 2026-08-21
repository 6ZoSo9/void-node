# VOID Browser Agent Access Kit Response Bounds V1

Marker: `VOID_BROWSER_AGENT_ACCESS_KIT_RESPONSE_BOUNDS_V1`

This source-only hardening closes the browser access kit's verified-read response-memory and rejected-body lifetime boundary without adding authority.

## Contract

Every browser-kit JSON read used for signed binding, same-origin discovery, capability negotiation, trust pins, or a participant-selected verified read keeps one total request deadline active through complete body consumption. A response is accepted only when it preserves the exact requested final URL, is not redirected, returns successful JSON, and remains within the caller's reviewed byte ceiling.

`Content-Length`, when present, must be canonical non-negative decimal syntax and must not exceed the reviewed maximum. Unknown-length and chunked bodies are streamed and counted before retention; the first byte beyond the ceiling causes HOLD rather than allowing `arrayBuffer()`-style prebuffering.

The access kit owns at most one admitted response generation per exact response origin. That origin lease begins before fetch and is released on normal terminal settlement. If a rejected response leaves an admitted body read or cancellation generation unresolved after the caller-visible timeout/250 ms teardown terminal, the exact requested URL remains quarantined and the origin lease remains held until every retained generation settles. A retry against the same URL fails on the exact quarantine; a different resource on the same origin fails before starting another fetch/read generation. Late read bytes are discarded. Ownership is released exactly once after all retained work settles, after which one clean same-origin request may proceed. Different origins remain independent so local extension evidence can still be read while a remote origin is quarantined.

Once a response is known to be rejected, the access kit aborts the owned request and attempts reader/body cancellation. Rejecting or never-settling cleanup cannot replace or indefinitely delay the primary validation, size, provenance, or deadline HOLD.

## Acceptance / falsification

The adversarial proof must demonstrate:

- a small valid JSON response succeeds;
- declared oversize is rejected before any body read and initiates body disposal;
- malformed declared length fails closed and initiates body disposal;
- chunked/unknown-length overflow is rejected on the first over-limit chunk;
- a stalled admitted body terminates under the reviewed deadline;
- rejecting cleanup preserves the original HOLD;
- never-settling cleanup remains owned through the bounded caller-visible teardown terminal and then retains exact-URL quarantine plus the per-origin lease;
- at least three same-URL retries while a prior admitted read/cancel generation remains unresolved start zero replacement fetch generations;
- multiple distinct resource URLs on that same origin also start zero replacement fetch/read generations while the lease is held;
- an independent healthy origin remains usable while the remote origin is quarantined;
- late stale read bytes cannot become accepted evidence and late settlement releases quarantine and the origin lease exactly once;
- one clean different-resource request succeeds after the retained generation settles;
- no raw empty promise catch is introduced to suppress late asynchronous failures;
- a mismatched final URL and a followed redirect are rejected before body evidence is trusted; and
- the runtime path never uses whole-response `arrayBuffer()` prebuffering.

Falsify this contract if any untrusted response can force retention beyond the reviewed maximum before rejection, if distinct-resource retries can accumulate more than one unresolved admitted response generation for a verified origin, if late bytes from a timed-out generation can become accepted evidence, if cleanup errors replace the primary HOLD, if one unhealthy origin blocks unrelated origins, or if redirected/mismatched-origin bytes can become verified VOID evidence.

## Authority boundary

This repair is GET-only browser-client source. It grants no mutation, payment, wallet/signer, Work Credit, validator, transaction, runtime, deployment, operator-control, treasury, liquidity, or funds authority. Origin permission remains explicit and user-granted.

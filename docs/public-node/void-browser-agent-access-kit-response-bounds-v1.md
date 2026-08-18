# VOID Browser Agent Access Kit Response Bounds V1

Marker: `VOID_BROWSER_AGENT_ACCESS_KIT_RESPONSE_BOUNDS_V1`

This source-only hardening closes the browser access kit's verified-read response-memory and rejected-body lifetime boundary without adding authority.

## Contract

Every browser-kit JSON read used for signed binding, same-origin discovery, capability negotiation, trust pins, or a participant-selected verified read keeps one total request deadline active through complete body consumption. A response is accepted only when it preserves the exact requested final URL, is not redirected, returns successful JSON, and remains within the caller's reviewed byte ceiling.

`Content-Length`, when present, must be canonical non-negative decimal syntax and must not exceed the reviewed maximum. Unknown-length and chunked bodies are streamed and counted before retention; the first byte beyond the ceiling causes HOLD rather than allowing `arrayBuffer()`-style prebuffering.

Once a response is known to be rejected, the access kit aborts the owned request and attempts reader/body cancellation. Caller-visible cleanup remains bounded to 250 ms, but an admitted body read or cancellation generation that is still unresolved after that terminal remains quarantined by exact requested URL. A retry against that URL fails closed instead of spawning a replacement fetch/read generation. Late read bytes are discarded; ownership is released exactly once only after every quarantined generation settles. Rejecting or never-settling cleanup cannot replace or indefinitely delay the primary validation, size, provenance, or deadline HOLD.

The quarantine is deliberately fail-closed. A peer that never settles an admitted body generation may keep that exact URL unavailable, but it cannot create an unbounded number of outstanding generations through repeated retries. Other URLs remain independent.

## Acceptance / falsification

The adversarial proof must demonstrate:

- a small valid JSON response succeeds;
- declared oversize is rejected before any body read and initiates body disposal;
- malformed declared length fails closed and initiates body disposal;
- chunked/unknown-length overflow is rejected on the first over-limit chunk;
- a stalled admitted body terminates under the reviewed deadline;
- rejecting cleanup preserves the original HOLD;
- never-settling cleanup remains owned only through the bounded caller-visible teardown terminal and then retains exact-URL quarantine;
- at least three retries while a prior admitted read/cancel generation remains unresolved start zero replacement fetch generations;
- late stale read bytes cannot become accepted evidence and late settlement releases quarantine exactly once;
- one clean request succeeds after the quarantined read and cancellation generations settle;
- no raw empty promise catch is introduced to suppress late asynchronous failures;
- a mismatched final URL and a followed redirect are rejected before body evidence is trusted; and
- the runtime path never uses whole-response `arrayBuffer()` prebuffering.

Falsify this contract if any untrusted response can force retention beyond the reviewed maximum before rejection, if repeated retries can accumulate unresolved read/cancel generations, if late bytes from a timed-out generation can become accepted evidence, if cleanup errors replace the primary HOLD, or if redirected/mismatched-origin bytes can become verified VOID evidence.

## Authority boundary

This repair is GET-only browser-client source. It grants no mutation, payment, wallet/signer, Work Credit, validator, transaction, runtime, deployment, operator-control, treasury, liquidity, or funds authority. Origin permission remains explicit and user-granted.

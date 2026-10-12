# VOID AI Agent Paid Work Client Response Bounds V1

Marker: `VOID_AI_AGENT_PAID_WORK_CLIENT_RESPONSE_BOUNDS_V1`

## Outcome

Make the existing portable paid-work client enforce its configured response-byte ceiling before full buffering while preserving its existing HTTPS/loopback-only, same-origin, redirect-rejecting, no-retry, private-token-file, and authority-zero contract.

The client already exposed `--max-response-bytes` with a default of 1 MiB and a hard maximum of 4 MiB. Previously, a valid declared `Content-Length` larger than the limit was rejected early, but chunked or misleading responses were first consumed with `response.arrayBuffer()` and only checked after complete buffering. The advertised limit therefore did not bound memory retained from an untrusted coordinator response.

## Bounded response contract

For discovery, route probing, and authenticated submission responses, the client now:

- validates a present `Content-Length` as a canonical nonnegative safe integer;
- rejects malformed or declared-oversize lengths before body accumulation;
- requires a readable response body and fails unavailable/non-readable bodies closed only after aborting the owned request and attempting bounded cancellation when the body exposes `cancel()`;
- consumes the body with a stream reader and counts bytes before retaining beyond the configured limit;
- actively aborts the owned request as soon as redirect, malformed length, oversize, unavailable/non-readable body, or admitted read failure is known;
- retains one exact admitted `response.body` reference through all header checks, `getReader()` acquisition and cancellation. A mutable body getter cannot substitute `null` or a different stream after acquisition fails; an initially throwing getter retains the origin generation as unverifiable;
- reserves the original per-origin generation while **any** rejected response body or reader has unconfirmed cancellation, including declared/streamed oversize, invalid length, redirect, non-deadline reader errors and failed `getReader()` acquisition; an unresolved, throwing-property or rejected cancellation cannot silently become a new fetch allowance;
- retains request ownership through bounded reader/body cancellation for every terminal body failure, including timeout/read rejection after response headers;
- gives cleanup a separate maximum 250 ms teardown window so a deadline-triggered read error cannot return while teardown is completely unowned;
- preserves the primary redirect/size/body/read/timeout error when cancellation rejects or does not settle;
- keeps the original AbortController request deadline active through admitted body consumption, with only the bounded teardown window allowed after terminal failure;
- races every admitted reader operation against that owned deadline even when a custom reader ignores the abort signal;
- reserves a single per-origin fetch/read generation before the first asynchronous request operation, rejecting simultaneous same-origin callers while that generation remains in flight;
- races response-header fetch settlement against the original AbortController deadline even when an injected/custom fetch implementation ignores the abort signal; a fetch-specific rejection from an earlier abort listener cannot replace the owned deterministic `AbortError`;
- retains that generation after a timed-out unfinished fetch until the late fetch rejects or returns a response whose body can actually be cancelled; uncertain, rejected, or never-settling late cleanup remains fail-closed;
- retains a timed-out reader lock until its pending read eventually settles, preserving the original generation's quarantine even after the initiating request times out;
- refuses to treat a **partial late read** (`done:false`) or rejected read as stream termination when cancellation is unconfirmed; and
- clears quarantine only after a terminal `done:true` read or a confirmed successful reader cancellation **and** settled outstanding read, with successful reader-lock release. Rejected, absent or never-settling cleanup stays HOLD.

The same internal bounded fetch path is used by read-only `probe` requests and token-authenticated `submit` requests. No token value is returned, printed, persisted to result output, or placed in command arguments.

## Executable falsification boundary

`scripts/prove_void_ai_agent_paid_work_client_response_bounds_v1.mjs` exercises the real paid-work client through its public probe API with synthetic WHATWG and response-like objects and requires:

- valid bounded discovery plus submission-route probing still succeeds;
- declared oversize rejects before full buffering and cancels/aborts the rejected response;
- malformed declared length fails closed;
- chunked/streamed oversize rejects at the accumulated-byte ceiling;
- a cancellation promise that never settles cannot extend the already-known oversize result beyond the bounded teardown window;
- a rejecting cancellation cannot replace the primary oversize result;
- a response that sends a small prefix and then stalls remains bounded by the request deadline plus the explicit teardown ceiling;
- a signal-ignoring read returns one deterministic `response_body_read_timeout`, receives exactly one cancellation attempt, and blocks same-origin replacement generations while unresolved;
- twelve concurrent same-origin calls begun before any response headers are admitted cannot launch a second fetch/read generation, while a late-settling first read restores healthy future calls;
- a never-settling fetch that ignores abort returns bounded `response_fetch_timeout` to its original caller without unblocking duplicate fetches;
- a custom fetch that rejects synchronously from its own AbortSignal listener still returns the owned `response_fetch_timeout`, not the custom rejection, and releases its slot after the original rejection settles;
- a reader whose earlier-installed AbortSignal listener rejects before the client deadline handler still returns the owned `response_body_read_timeout` and releases its lock exactly once after rejection;
- a late response cannot reopen its origin until its owned body cancellation settles successfully, while a late fetch rejection safely retires the same original generation;
- a late-settling timed-out read releases its retained lock and restores clean same-origin use;
- a partial late read with rejected cancellation leaves its reader lock and origin quarantined with zero replacement fetches;
- declared-oversize body with rejected cancellation, malformed `Content-Length` with permanently pending cancellation, and oversize streamed chunk with rejected reader cancellation each retain their original generation and refuse repeated same-origin calls;
- a throwing synthetic `getReader()` with failed cancellation, and a real locked WHATWG `Response.body`, each refuse another same-origin fetch while the original reader/body remains unresolved;
- a response whose `body` getter changes after the first observation still cancels only the admitted original body (one getter read), and a throwing first body/cancel getter preserves the primary error and retains quarantine;
- a body cancellation that succeeds only after the bounded caller teardown later retires the exact original generation, permitting new clean requests;
- when a previously pending cancellation later succeeds after a partial read settles, exactly one lock release restores same-origin admission;
- a permanently non-settling read remains quarantined across repeated calls without additional fetches or cancellation attempts;
- an admitted read that fails when the deadline aborts still attempts exactly one bounded cancellation before request ownership is released;
- deferred/non-settling and rejecting cancellation after admitted read failure preserve the original `AbortError`;
- a non-readable admitted body with non-settling or rejecting cancellation preserves `response_body_unavailable` and reaches the same bounded teardown contract;
- a null body fails promptly after the owned request is aborted without inventing a readable fallback; and
- payment, work-execution, Work Credit, wallet/signer, transaction, and Buy VOID authority remain false.

Falsify this repair if any paid-work-client response can still retain bytes beyond `--max-response-bytes` before rejection, if terminal response cleanup can indefinitely delay or replace the primary HOLD, if a timed-out/read-error or unavailable/non-readable response can release request ownership without a bounded teardown attempt when cleanup is available, or if admitted body processing escapes the request deadline plus teardown ceiling.

## Authority boundary

Source/proof/docs/CI only. This repair does not create or dispatch paid work, authorize payment, award or write Work Credits, access credentials beyond the client's existing caller-supplied private token file, use wallets/signers, construct or broadcast transactions, mutate validators, deploy/restart services, change runtime/network state, take treasury/liquidity action, or move funds.

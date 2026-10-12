# Buy VOID RPC total-response deadline — bounded transport V1

## Scope and reason

The existing `createBuyVoidPaymentHttpTransportV1` uses
`ClientRequest.timeout`, which bounds **socket inactivity**, not the
total wall-clock duration of a JSON-RPC request/response. A source-RPC
endpoint can emit small chunks frequently enough to prevent an idle
timeout, indefinitely delaying an operator payment observation.

I independently reproduced this with an inert Node 22.16.0 loopback
server: an HTTP response with small chunks took about **465 ms**
despite a configured **100 ms socket timeout**. The reproduction
did not access any real VOID RPC or customer data.

## Exact source-only correction

This Draft changes only the existing reviewed transport module,
`src/economic/buy_void_payment_rpc_observer_v1.ts`, plus a new synthetic
proof, focused workflow and this note.

The transport now installs a separate **wall-clock total deadline**
measured from before network transmission. It records a monotonic acceptance
deadline in addition to arming the transport timer. All error/abort paths settle
once and clear that timer; timer expiry rejects with
`payment_observer_rpc_total_deadline_exceeded` and destroys the client request.

Success is independently gated by the monotonic deadline at the single
settlement fence. This matters when the JavaScript event loop is delayed:
buffered socket I/O cannot resolve successfully after the wall-clock deadline
merely because the response `end` callback is delivered before an already-due
timer callback. JSON parsing and all envelope checks occur before that final
success settlement, so CPU work that crosses the deadline also fails closed.

The existing idle timeout, response-byte cap, 2xx status, exact
`application/json` media type (parameters allowed), JSON-RPC
`jsonrpc: "2.0"` and numeric request ID binding, method allowlist, result
presence, and any-error-member rejection remain intact. A response error,
abort, or incomplete close also rejects fail-closed.

The synthetic proof compiles the **actual edited source** and starts
only ephemeral `127.0.0.1` HTTP fixture listeners. No external DNS,
real RPC, user service, wallet, signer or customer record is accessed.
It tests valid observations, rejected write methods, a continuously
dripping response that stays below the socket idle limit, oversized body, a
prematurely aborted partial response, non-2xx forged JSON, mismatched ID,
invalid/JSON-prefixed media types, mixed result+error envelopes, disabled
observer, and external cleartext-URL rejection.

A separate child-process loopback responder also completes a valid response
after the configured deadline while the client event loop is intentionally
blocked across that deadline. The client must still return the total-deadline
HOLD after it resumes. This specifically falsifies timer-delivery ordering as
an acceptance authority.

The Node 22/24/26 matrix compiles the exact unmerged head and checks
each synthetic proof plus byte-identical deterministic evidence in a
separate cross-node job. All recorded production, signer and money
movement flags must remain false.

## Composition and release hold

This is **NOT** the complete production operator-route repair.
Integration Draft #2675 now consumes this exact total-deadline successor
through a two-parent source merge that retains the reviewed owner lineage. Its
V6 reviewed-source record advances to observer blob
`0073818ad6f6418e895bf794024c9d678b3bef86` at source commit
`9df9648f546eb9320259eae1d3930a7c132a6511`. That source rollover requires a
fresh V6 reviewed-source digest plus compiled V4, enforcement and packaged
successor evidence; historical identities are not repinned or waived.

Changing this shared RPC observer also changes a reviewed economic
source and its emitted compiled artifact. Historical V5 source,
compiled V3, enforcement and packaged identities must **NOT** be
repinned or skipped just to make previous-generation CI green.
Independent composed source/compiled/enforcement/stopped-image and
deployed runtime generations are required after any integration.

The actual payment_verified-to-allocation_reserved dispatcher is still
UNMOUNTED, custody reserve/recover and antirollback cross-UID high-water
remain unqualified, and no coupled WC/VOID presale release is authorized.
No Ready/merge/deploy/restart, operator credential, customer evidence,
wallet/key/signer, transaction/broadcast, Chain-2050/WC, treasury or
funds action occurs in this Draft.

**PROTECT THE CORE.**

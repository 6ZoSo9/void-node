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
measured from before network transmission. All success/error/abort
paths settle once and clear that timer; deadline expiration rejects
with `payment_observer_rpc_total_deadline_exceeded` and destroys the
client request, even when response data continues arriving. The
existing idle timeout, response-byte cap, 2xx status, JSON media type,
JSON-RPC `jsonrpc: "2.0"` and numeric request ID binding, method
allowlist and result checks remain intact. A response error or abort
also rejects fail-closed, rather than silently hanging after headers.

The synthetic proof compiles the **actual edited source** and starts
only ephemeral `127.0.0.1` HTTP fixture listeners. No external DNS,
real RPC, user service, wallet, signer or customer record is accessed.
It tests valid observations, rejected write methods, a continuously
dripping response that stays below the socket idle limit, oversized
body, a prematurely aborted partial response, non-2xx forged JSON,
mismatched ID, invalid content-type, disabled observer, and external
cleartext-URL rejection.

The Node 22/24/26 matrix compiles the exact unmerged head and checks
each synthetic proof plus byte-identical deterministic evidence in a
separate cross-node job. All recorded production, signer and money
movement flags must remain false.

## Composition and release hold

This is **NOT** the complete production operator-route repair.
Current [integration Draft #2675](https://github.com/6ZoSo9/void-node/pull/2675)
has separately removed the ad-hoc `__voidBuyVoidRpcV1` helper and routes
Base payment observation through the reviewed payment observer. However #2675
still consumes the historical V6-pinned observer blob
`eb924f8e5376d0ed62c11456b46f1915eccd32fc`; it does **not** consume this
total-deadline successor. Composing this source change therefore requires a new
reviewed source-finality / compiled / enforcement generation rather than a
silent repin inside #2675.

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

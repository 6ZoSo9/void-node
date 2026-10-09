# Buy VOID canonical payment RPC rail guard V1 — unmounted source-only

## Problem and exact reviewed lineage

This versioned source-only Draft is stacked on
[Draft #2687](https://github.com/6ZoSo9/void-node/pull/2687),
at the exact reviewed absolute-deadline transport head
`1e312ffdde99088cdf6bfd9fdfc0bc356d2f6a25`.
The imported V1 transport source blob is
`0073818ad6f6418e895bf794024c9d678b3bef86`, and MUST remain
unchanged. Its independent response timer, response-byte cap, HTTP/media,
JSON-RPC envelope and request ID defenses are retained exactly.

The original `normalizePolicy()` accepts `source_chain="base"`
paired with **any positive chain ID**, including Ethereum mainnet `1`;
an injected RPC fixture that honestly reports chain ID 1 can be
returned as `source_chain:"base", chain_id:"1"` in the standalone
`observeBuyVoidPaymentV1` observation result. This is a POLICY
misconfiguration consistency risk, **not** proof of an erroneous verified
USDC payment. The V6 source-finality adapter already checks canonical
rail IDs, and the integrated Base operator route configures 8453.
These independent downstream defenses must remain.

Canonical public checkout rails are ONLY:
- Base Mainnet `base`, EVM chain ID `8453`.
- Ethereum Mainnet `ethereum`, EVM chain ID `1`.

## Additive independent guard

`src/economic/buy_void_canonical_payment_rpc_rail_guard_v1.ts`
exports a fail-closed pure `classifyBuyVoidCanonicalPaymentRpcRailV1`
and an **unmounted** adapter `observeBuyVoidCanonicalRailPaymentV1`.
The classifier binds `source_chain` to its unique numeric/string
decimal chain ID, refuses aliases, fractional/negative/zero/hex,
wrong-typed values or disabled policies, and runs *before any transport
or RPC operation*.

The adapter first snapshots the server-controlled RPC policy into one frozen,
plain primitive object. Proxy policies and accessors are rejected before their
traps/getters can execute; unknown policy keys and non-primitive transport
configuration are rejected. The canonical rail check and the legacy observer
then consume the **same policy snapshot**, closing a validate-then-reread
TOCTOU.

It separately snapshots the caller payment-observation identity to exact own
primitive `source_chain` and `tx_hash` data properties. Request Proxies,
accessors and aliases are rejected before RPC. The same frozen request identity
is passed to the legacy observer, so mutation of the original request or policy
after admission cannot relabel the chain, change the transaction hash or
redirect the RPC URL seen by the observer.

No new RPC parser, credential, signing, ledger, provider, or receipt schema is
introduced.

The synthetic proof:
- Binds exact Git blobs of both reviewed V1 observer and new guard.
- Demonstrates the original V1 **source-only gap** with an
  **injected in-memory** Ethereum RPC fixture falsely labelled as Base;
  no actual network/socket is used.
- Requires that the new adapter rejects the identical fixture and
  invokes the RPC fixture **zero** times.
- Proves Base=8453 and Ethereum=1 are accepted with integer or exact
  decimal-string IDs, their synthetic receipt chain IDs observed by
  the original V1 observer, and no other RPC methods called.
- Requires malformed rail/policy combinations and mismatched request rail to
  HOLD before any provider call.
- Proves policy getters and Proxy traps are rejected without invocation.
- Proves request identity getters and Proxy traps are rejected without
  invocation.
- Mutates the original policy and request during the first synthetic RPC call
  and proves the observer still uses the admitted Base/8453 URL policy and the
  original transaction hash from the frozen snapshots.
- Runs independently on Node 22, 24 and 26 after exact source build,
  preserving byte-identical deterministic output receipts.

## Boundary: NOT current production integration

This guard is **not mounted into `src/index.ts`**. It is now carried by the
full current-main [integration #2675](https://github.com/6ZoSo9/void-node/pull/2675)
as source-only evidence, without changing the mounted operator route.
The V6 finality adapter already binds canonical chain IDs, and
none of these synthetic observations are a source-quorum or verified
payment authorization. Any future real route adoption must be
independently reviewed, keep the native-USDC token/receiver/original
request/finality checks, compose the absolute RPC deadline into the
same trusted runtime source generation, requalify compiled/enforcement/
stopped-image identity, and preserve original buyer/payment and
allocation custody's exact-once lock/replay requirements.

`runtime_route_mount=false`,
`production_payment_authority_ready=false`,
`deployed_artifact_generation_verified=false`,
`wallet_access=false`, `signer_access=false`, `funds_moved=false`.

No Ready/merge/deployment, live provider/customer record, credentials,
wallet/key/signer, chain transaction, Chain-2050/Work Credit, inventory,
treasury/liquidity, presale/market activation or funds movement.

**PROTECT THE CORE.**

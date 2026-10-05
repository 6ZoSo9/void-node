# Buy VOID native delivery receipt reconciler v1

This source-only worker closes the gap between a Chain-2050 native VOID
delivery broadcast and the existing confirmed-closeout path.

It selects one server-owned execution attempt, requires that attempt to be in
the exact `broadcast` state, and reads only:

- `eth_chainId`;
- `eth_getTransactionReceipt` for the attempt's bound delivery hash;
- `eth_blockNumber`.

The RPC URL is server controlled and both the source reconciler and mounted
operator runtime require a numeric loopback HTTP literal: `127.0.0.1` or
`[::1]`. Hostnames such as `localhost` and alternate IPv4 spellings such as
`127.1`, `2130706433`, or `0x7f000001` are rejected at runtime-policy
configuration and again by the reconciler so DNS or hosts-file changes cannot
widen RPC authority. The worker rejects
redirect-capable public endpoints, URL credentials, non-2050 chains, receipt
hash/address mismatches, malformed status or block fields, and observations
below the configured confirmation floor.

## Outcomes

For a successful receipt, the worker delegates to the existing pipeline's
`record_confirmed` action. This persists the execution-attempt confirmation,
broadcast confirmation, and confirmed buyer state that the existing confirmed
closeout requires.

For a failed receipt, it delegates to `record_reverted`. This records the
definitive reverted outcome and the retryable post-broadcast failure state.

An absent receipt remains a non-mutating hold. An already-confirmed attempt is
returned as terminal without another RPC call or journal write.

## Apply wall

Dry run is the default. Applied reconciliation requires the exact confirmation:

`buyVoidReconcileNativeDeliveryReceipt`

The confirmation is checked before filesystem or RPC access. Applied mode can
write only through the existing pipeline journals. This worker does not
decrement inventory or write the public Buy VOID request journal; those remain
the responsibility of the existing confirmed-closeout path.

## Authority boundary

This lane adds no runtime route, integration mount, service configuration,
background loop, automatic retry, wallet or secret access, signing,
transaction construction, broadcast, raw transaction handling, inventory
decrement, public request write, service restart, or money movement. It is not
deployed or activated by this source lane.

## Proof

```bash
npx tsx scripts/prove_buy_void_native_delivery_receipt_reconciler_v1.ts
```

The proof covers disabled and confirmation gates, exact RPC method order,
wrong-chain and pending holds, confirmation depth, dry-run immutability,
successful and reverted persistence, terminal duplicate handling, and
loopback-only RPC policy.

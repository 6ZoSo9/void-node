# Buy VOID native delivery receipt runtime v1

This operator runtime mounts the native Chain-2050 delivery receipt reconciler
behind loopback-only status and command routes. It closes the runtime wiring gap
between a journaled Buy VOID broadcast attempt and the existing confirmed or
reverted pipeline transitions.

## Routes

- `GET /__void/operator/buy-void-native-delivery-receipt-v1/status`
- `POST /__void/operator/buy-void-native-delivery-receipt-v1/command`

Both routes are operator loopback-only. The command accepts exactly one
server-journaled `attempt_id`, plus optional `apply` and `confirmation` fields.
The caller cannot supply the journal root, intent, policy, RPC URL, wallet,
credential, signer, or transport.

## Server policy

The runtime is disabled by default. Its server-controlled policy uses:

- `VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_RUNTIME_ENABLED`;
- `VOID_BUY_VOID_RUNTIME_DIR`;
- `VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL`;
- `VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS`;
- `VOID_BUY_VOID_NATIVE_DELIVERY_RECEIPT_MIN_CONFIRMATIONS`.

The RPC URL must be loopback HTTP. Status output exposes only its SHA-256
fingerprint, never the URL itself.

## Dry-run and apply walls

Dry-run reconciliation remains available while the runtime is disabled. This
allows a disabled deployment to prove journal reconstruction, exact receipt
binding, confirmation depth, and the three read-only RPC calls without a
journal write.

Applied reconciliation requires both:

1. the runtime enable flag; and
2. the exact confirmation `buyVoidReconcileNativeDeliveryReceipt`.

These gates are checked before filesystem or RPC access. Each command handles
one attempt and performs no automatic retry or background polling.

## Outcomes

- A sufficiently deep successful receipt delegates to `record_confirmed`.
- A sufficiently deep failed receipt delegates to `record_reverted`.
- A pending or shallow receipt returns a non-mutating hold.
- A terminal confirmed duplicate returns without another RPC call or write.

## Authority boundary

No wallet, credential, secret, signing, transaction broadcast, raw signed
transaction, inventory decrement, public request-journal write, automatic
retry, startup execution, or background loop is authorized. This source lane
also performs no deployment, no service restart, and no money movement.

Confirmed inventory decrement and buyer-visible public closeout remain in the
existing confirmed-closeout runtime and require their separate explicit gate.

## Proof

```bash
npx tsx scripts/prove_buy_void_native_delivery_receipt_runtime_v1.ts
npx tsx scripts/prove_buy_void_native_delivery_receipt_runtime_guard_v1.ts
```

After merge, the next operational step is a disabled deployment followed by a
dry-run against one server-owned journal fixture. A value-bearing canary remains
a separate, explicitly authorized operation.

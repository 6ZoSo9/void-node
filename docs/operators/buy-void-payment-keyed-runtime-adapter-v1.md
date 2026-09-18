# Buy VOID payment-keyed runtime adapter v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_ADAPTER_V1`

Status: standalone, default-off, preflight-only operator adapter.

This module is not imported by the canonical Buy VOID parent runtime. Source merge
therefore does not expose a new parent action and does not perform any RPC.

## Routes

If this module is deliberately imported by a future server composition, it can
mount two loopback-only routes:

- `/__void/operator/buy-void-payment-keyed-runtime-v1/status`
- `/__void/operator/buy-void-payment-keyed-runtime-v1/command`

The command body has exactly one allowed key:

```json
{"attempt_id":"<64 lowercase hex characters>"}
```

Any additional key is rejected. This includes `apply`, `saga_id`,
`plan_reservation_id`, policy, RPC URL, signer, broadcaster, transaction plan,
raw transaction, or signed transaction material.

## Default-off network boundary

The command refuses before policy construction or RPC unless:

`VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_PREFLIGHT_ENABLED=1`

There is no apply mode in this adapter.

When explicitly enabled, the adapter constructs a server-owned policy from the
canonical presale policy plus dedicated payment-keyed Chain-2050 settings:

- `VOID_BUY_VOID_PAYMENT_KEYED_CHAIN2050_RPC_URL`
- `VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS`
- `VOID_BUY_VOID_PAYMENT_KEYED_GAS_LIMIT_MULTIPLIER_BPS`
- `VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT`
- `VOID_BUY_VOID_PAYMENT_KEYED_FEE_MULTIPLIER_BPS`
- `VOID_BUY_VOID_PAYMENT_KEYED_MAX_FEE_PER_GAS_WEI`
- `VOID_BUY_VOID_PAYMENT_KEYED_MAX_PRIORITY_FEE_PER_GAS_WEI`

Optional transport bounds:

- `VOID_BUY_VOID_PAYMENT_KEYED_RPC_TIMEOUT_MS`
- `VOID_BUY_VOID_PAYMENT_KEYED_RPC_MAX_RESPONSE_BYTES`

The fulfillment wallet and maximum reservation amount are taken from the
canonical server economic policy rather than from operator input.

## Preflight flow

The adapter invokes the merged payment-keyed runtime preflight with:

- server-controlled root directory;
- caller-selected attempt ID only;
- server-owned policy; and
- the server environment for existing source-finality policy.

That preflight derives the exact intent, inventory reservation, plan reservation,
saga ID, source-finality payment key, fulfillment calldata, and payment-keyed
execution dry run.

## Explicit non-authority

This adapter has no route or parameter for apply. It performs no filesystem
write, credential or signer access, signing, durable submission claim,
transaction broadcast, receipt acceptance, saga mutation, inventory mutation,
public fulfillment closeout, deployment, service restart, or money movement.

Its only possible external activity, after explicit enablement, is the reviewed
read-only source-finality and Chain-2050 planning RPC surface below the preflight.

## Parent-runtime boundary

The canonical `buy_void_runtime_integration_v1.ts` does not import this module
and does not dispatch its command route. Parent mounting is a later, separately
reviewed gate.

The next dangerous boundary remains payment-keyed crash-consistent apply:
projection of preparation/broadcast outcomes into the existing attempt and saga
journals without reusing the legacy ERC-20 transaction semantics.

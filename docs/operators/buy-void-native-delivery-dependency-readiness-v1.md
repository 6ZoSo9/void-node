# Buy VOID native-delivery dependency readiness V1

Marker: `VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_READINESS_V1`

## Purpose

This lane adds the missing read-only operational probe between the already
deployed-disabled Buy VOID native-execution runtime and a future one-request
canary. It verifies that the dedicated fulfillment credential derives the
server-policy wallet address and that the loopback JSON-RPC endpoint reports
Chain ID 2050.

The probe is disabled by default. Default execution performs no credential
read and no RPC request.

## Explicit probe

The read-only probe requires both `--probe` and the exact confirmation:

`probeBuyVoidNativeDeliveryDependenciesReadOnlyV1`

It accepts the existing server-policy inputs:

- systemd `CREDENTIALS_DIRECTORY`;
- `VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS`;
- `VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL`.

The RPC URL remains restricted by the existing broadcaster policy to loopback
HTTP. The only RPC method used is `eth_chainId`.

```bash
npx tsx scripts/buy_void_native_delivery_dependency_readiness_v1.ts \
  --probe \
  --confirm probeBuyVoidNativeDeliveryDependenciesReadOnlyV1
```

The JSON result includes only wallet-address and RPC-URL SHA-256 fingerprints.
It does not expose the raw wallet address, credential content, signer, or
broadcaster.

## Authority boundary

This probe reads the dedicated systemd credential only after exact operator
confirmation so it can derive and compare the wallet address. It does not sign
a transaction, does not broadcast a transaction, does not assign runtime
dependencies, does not enable the dependency injector, does not enable the
native-delivery or native-execution runtime, does not restart a service, and
does not move VOID or any other funds.

`status=ready` means only that the credential-to-policy address binding and
loopback Chain-2050 identity check passed. It is not activation authority and
does not claim that the wallet is funded, that a candidate is selected, or that
a live canary is approved.

## Verification

```bash
npx tsx scripts/prove_buy_void_native_delivery_dependency_readiness_v1.ts
npx tsx scripts/prove_buy_void_native_delivery_dependency_readiness_guard_v1.ts
npx tsx scripts/buy_void_native_delivery_dependency_readiness_v1.ts
npm run build
```

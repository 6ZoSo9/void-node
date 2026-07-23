# Buy VOID native-delivery runtime dependencies v1

Marker: `VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_DEPENDENCIES_V1`

## Purpose

Provide the missing production composition boundary between the existing
Buy VOID native-delivery runtime and its signer and Chain-2050 broadcaster.

This implementation remains disabled by default. It does not activate the
native-delivery runtime, sign a transaction at startup, broadcast a transaction
at startup, restart a service, create a wallet, fund a wallet, or move VOID.

## Credential boundary

The signer reads exactly one systemd credential:

`buy-void-native-fulfillment-wallet-v1`

The source module accepts only `CREDENTIALS_DIRECTORY`; it does not accept an
arbitrary key path, request-body secret, environment private key, mnemonic,
`NODE_PRIVKEY_PATH`, validator identity key, node identity key, treasury key,
or cold-reserve key.

The credential must be a regular non-symlink file with no group or world
permissions. Its content is a single 32-byte EVM private key in hexadecimal
form. The key is never returned, logged, persisted by the signer, or written to
the repository.

The derived signer address must exactly match the server-controlled
`VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS` policy value.

## Broadcaster boundary

The dependency injector constructs the existing Chain-2050 broadcaster from
the server-controlled `VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL`.

The broadcaster accepts loopback HTTP only, requires Chain ID 2050, performs a
read-only startup `eth_chainId` probe, repeats the identity probe before each
broadcast, and permits only `eth_sendRawTransaction` as a mutating RPC method.

## Dependency injection

When and only when
`VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED=1`, the injector:

1. loads and validates the dedicated systemd credential;
2. proves the signer address matches policy;
3. probes the loopback endpoint for Chain ID 2050;
4. assigns the signer and broadcaster to
   `__void_buy_void_native_delivery_runtime_dependencies_v1`.

The runtime itself remains independently controlled by
`VOID_BUY_VOID_NATIVE_DELIVERY_RUNTIME_INTEGRATION_ENABLED`.

This separation permits a future readiness deployment where dependencies are
configured while money movement remains disabled.

## Activation boundary

A future operator deployment must still:

1. create a new dedicated balance-capped fulfillment wallet locally;
2. install its private key through systemd `LoadCredential`;
3. bind a live loopback Chain-2050 endpoint;
4. set bounded server-controlled fee, gas, and amount policy;
5. deploy with the dependency injector enabled but native delivery disabled;
6. verify signer and broadcaster readiness without moving funds;
7. fund the dedicated wallet only with the bounded canary amount;
8. activate native delivery through a separate explicit checkpoint.

No step in this source lane performs those operational actions.

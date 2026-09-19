# Buy VOID payment-keyed dormant systemd policy v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DORMANT_SYSTEMD_POLICY_V1`

This gate records the production payment-keyed configuration as a **dormant**
systemd drop-in example. It exists to make the Precision host configuration
reproducible without granting runtime or apply authority.

## Authority boundary

The example requires:

```text
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
```

It does not:

- add or modify `LoadCredential=`;
- set `CREDENTIALS_DIRECTORY`;
- start, stop, restart, or reload a service;
- read a credential;
- sign or broadcast a transaction;
- mutate Chain-2050;
- move funds;
- expose a public payment-keyed route.

The existing fixed systemd credential binding remains the only credential
source. systemd supplies `CREDENTIALS_DIRECTORY` dynamically to the service
process when the credential is materialized. The static production candidate's
credential-directory value is therefore not copied into the host drop-in.

## Canonical production values

The example binds:

```text
chain RPC                     http://127.0.0.1:8545/
fulfillment contract          0xa40a43adfd174f88309173cb3daa6e09c10154a7
VOID token                    0x470075b85352eb86f7d089fb9ba88945f12aad94
fulfillment wallet            0xc884f631c3881b8b672bfcbf019c856146cd7f73
gas multiplier                15000 bps
max gas limit                 320000
fee multiplier                20000 bps
max fee                       3000000000 wei
max priority fee              1000000000 wei
receipt confirmations         3
canonical pool                buy-void-presale-v1
policy version                presale-v1
pool capacity                 10000000000000 units
max reservation               10000000000000 units
rate numerator                2
rate denominator              1
RPC timeout                   5000 ms
RPC max response              65536 bytes
credential binding evidence   20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495
```

The proof requires the drop-in Environment map to equal the accepted production
candidate after removing only `CREDENTIALS_DIRECTORY`. It also requires the
canonical presale constants and credential-binding evidence to match the source
contracts.

## Host installation sequence

A host installer must fail closed unless all of these are already true:

1. the service is running the expected exact source commit and clean `main`;
2. the payment-keyed child and apply gates are disabled;
3. the canonical pool accounting carry-forward has been completed and verified;
4. the existing systemd credential binding for
   `buy-void-native-fulfillment-wallet-v1` is present;
5. the process has a systemd-provided absolute `CREDENTIALS_DIRECTORY`;
6. the credential file can be stat'ed as a direct private file without reading
   its contents.

The host installer may then install the exact Environment values, daemon-reload,
restart, and require the replacement process to remain on the same source
commit with both child flags still zero.

Acceptance after restart requires the payment-keyed status route to report:

```text
enabled=false
apply_enabled=false
policy_configured=true
signing_dependency_env_configured=true
automatic_retry_allowed=false
```

This gate is configuration staging only. Runtime enablement and apply authority
remain separate later gates.

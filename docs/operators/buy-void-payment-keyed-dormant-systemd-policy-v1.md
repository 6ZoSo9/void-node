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
history carrier root           32649ce8d7edf089d4078d97fd72832d0b44da4736b5d58cdf3cde969a33ab1a
carrier attestation            voidbvhca1_0b7f99cbbf4dfbd8c3673d8915350b1d972bf1579d3798a52ab052eb3acb3465
```

The proof requires the drop-in Environment map to equal the accepted production
candidate after removing only `CREDENTIALS_DIRECTORY` and then adding exactly
one host-only accepted-history field:

```text
VOID_BUY_VOID_HISTORY_CARRIER_ROOT_SHA256=32649ce8d7edf089d4078d97fd72832d0b44da4736b5d58cdf3cde969a33ab1a
```

That value must match the accepted carrier attestation at
`ops/mainnet0/buy-void-production-history-carrier-attestation-v1.json` and the
server-controlled carrier-root environment name exported by the accepted #1669
terminal projection, including the exact legacy-alias compatibility accepted in
#1744. The historical production candidate is not rewritten.

The composed source preparation is recorded at:

```text
ops/mainnet0/buy-void-payment-keyed-dormant-host-preparation-v1.json
```

with preparation ID:

```text
voidbvhdp1_1777bd1058b987a886d03d686eb471dd9d6dd356e3d100b039c9587b5ce093f0
```

The preparation binds the exact drop-in SHA-256, canonical environment-map
SHA-256, production candidate, activation evidence, accepted carrier
attestation, the #1669 terminal-projection origin, and the #1744 accepted
legacy-alias compatibility source bytes. The current terminal projection blob is
`836f9a5d8ee8f121fc1c5b04ec7e3b8a5dcd295d`; its accepted compatibility merge
is `3d0385bf5b115b9d962a423d44f3ec5f98679f0a`.

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

The carrier root in this drop-in is a **dormant snapshot pin only**. It is safe
only while both payment-keyed child flags remain zero. Live carrier page/root
custody and rotation remain owned by #1683 and are required before any enable or
apply transition that can admit new payment history.

This source gate performs no host mutation. Installing the prepared drop-in,
daemon-reload, and restart on Precision require a separately reviewed exact
operator script and explicit execution. Runtime enablement and apply authority
remain separate later gates.

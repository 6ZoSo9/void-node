# Buy VOID allocation-custody runtime bundle lock v1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_LOCK_V1`.

Status: **source identity acceptance only**.

## Accepted candidate identity

Parent #3013 independently derived the same package-free custody V2 runtime
candidate on Node 22, 24 and 26 and its hosted compare job required the three
candidate JSON files to be byte-identical.

This lock accepts exactly:

```text
source head:
b532e1e3214cee298ecbf25f15568b2ee9758399

candidate ID:
voidbuycustodybundle1_2339d565cc1c298a3f7ca9cae2ef163831288007bb32d9e7c37c01880aaee704

candidate JSON SHA-256:
5ee2b5e5fc25a7cec8313c7cb7c4cd8bb675e3652ab18dc614577a25376f2279

candidate bytes:
9930

hosted workflow run:
38664821990
```

The runtime bundle remains exactly ten files: four tracked MJS runtime sources
and six generated JavaScript modules. No third-party runtime packages or
`node_modules` runtime files are admitted.

## Re-derivation requirement

The lock does not trust the JSON values by themselves.

Hosted qualification on this child must independently, on Node 22/24/26:

1. install the exact lockfile with lifecycle scripts disabled;
2. compile using locked TypeScript 5.9.3;
3. re-run the parent #3013 candidate derivation;
4. verify the derived candidate;
5. require its exact content ID, SHA-256, byte count, runtime counts and compiler
   version to equal this lock.

The child diff is restricted to the lock JSON, proof, documentation and focused
workflow; parent candidate source bytes are not modified.

## Promotion boundary

Only:

```text
runtime_bundle_candidate_identity_accepted=true
```

is promoted.

The parent candidate itself remains correctly marked
`candidate_accepted=false`; this successor is the separate acceptance
authority.

All production facts remain false:

```text
immutable_root_install=false
node_binary_identity_verified=false
request_root_selected=false
shared_directory_selected=false
service_unit_installed=false
service_started=false
service_restarted=false
runtime_integration=false
reserve_method_enabled=false
recover_method_enabled=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

## Relationship to #2452

This removes the source identity ambiguity for the future custody ExecStart
bundle. It does **not** install the bundle.

The next host-facing composition still needs:

- #3003 stable custody-readable request root;
- #3009 socket RuntimeDirectory policy;
- installed #3005 user-runtime hardening;
- exact protected root-owned bundle installation;
- exact `/usr/bin/node` identity;
- custody service unit installation/start and socket evidence;
- effective Polkit denial;
- independent rollback/monotonic custody;
- reserve/recover and payment-to-allocation integration.

## Authority boundary

Source/test/CI only. No host/service/systemd/storage/request/payment/credential,
key, wallet, signer, RPC, transaction, Chain-2050/WC, presale/market,
inventory/treasury/liquidity or funds mutation.

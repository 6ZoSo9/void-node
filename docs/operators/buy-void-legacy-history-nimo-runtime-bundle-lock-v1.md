# Buy VOID legacy-history Nimo runtime bundle lock v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_LOCK_V1`.

Status: **accepted source/runtime-bundle identity only; no Nimo installation or live authority**.

## Accepted generation

Canonical source merge:

`357a406c5a5a6075937d8801ebd76d47205e48d8`

Final candidate head:

`f5b801e094b4ad1fc0e49e211aebe987391ec9eb`

Parent install-plan head:

`a89523ac7f6e6d013a86054e998fcb51f051ec51`

Parent install-plan blob:

`3d41834140eaaca46fb9f5a771278bed49384c65`.

## Accepted candidate

Three independent Node 22/24/26 hosted derivations produced byte-identical
canonical candidate JSON.

- workflow run: `38842429738`;
- candidate ID:
  `voidblrhnrb1_f68df654aee9f534a0cecee80444c55ec70ef8cd1914b9eef4e09f6020b438e4`;
- bytes: `12369`;
- SHA-256:
  `b082a0262cf7db5d49f000642913ddcd2914c59c5faae7878005cfa30e2981c7`.

Hosted artifacts:

- Node 22: artifact `12021374767`;
- Node 24: artifact `12021791725`;
- Node 26: artifact `12021703515`.

The lock also records each artifact archive digest.

## Runtime closure

The accepted candidate binds exactly:

- 14 runtime files;
- 9 compiled TypeScript runtime files;
- 5 tracked runtime-source files;
- TypeScript 5.9.3;
- zero third-party runtime packages;
- zero node_modules runtime files.

The final candidate verifier does not trust candidate self-consistency alone. It
rederives the actual package-free runtime graph and installed compiler identity
from the checkout and requires exact canonical equality. Resealing a modified
runtime SHA or compiler SHA under a newly computed candidate ID is rejected.

## Lock identity

`voidblrhnrblock1_9b48f82fdc5dce5cf7baa792d2b999333aecfc33b76991ddfb6081dc3700f863`

The lock ID is SHA-256 over the canonical lock body excluding `lock_id`.

## Authority boundary

This lock changes source acceptance only.

It sets:

- `candidate_accepted=true`;
- `runtime_bundle_lock_created=true`.

It keeps all host/economic authority false:

- `protected_runtime_install_authorized=false`;
- `live_nimo_installed=false`;
- `authorized_keys_mutation_authorized=false`;
- `public_key_selected=false`;
- `private_key_access=false`;
- `external_transport_authenticated=false`;
- `witness_read_performed=false`;
- `witness_append_performed=false`;
- `sovereign_signing=false`;
- `payment_acceptance=false`;
- `transaction=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`.

No Nimo/SSH/filesystem/authorized_keys/witness/key/signing/payment/transaction
or market action occurs.

Next source gate:

`void_buy_void_legacy_history_nimo_protected_runtime_install_plan_v1`.

PROTECT THE CORE.

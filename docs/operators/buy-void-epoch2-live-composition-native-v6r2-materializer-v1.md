# Buy VOID Epoch-2 V6R2 materializer v1

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_V6R2_MATERIALIZER_V1`.

Status: **hosted install-input artifact materialization only; no protected install and no live execution**.

## Purpose

This is the third source stage of #3327 after:

1. canonical operator-preservation repair #3318;
2. fresh V6R2 candidate #3331;
3. fresh V6R2 acceptance lock #3332.

It must not consume the quarantined historical V6 lock/materializer identity.

## Accepted inputs

Fresh lock:
- Git blob: `bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b`;
- ID: `voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`.

Fresh candidate tool:
- Git blob: `c4ac12562f1ce396d7b584ad10a5e86742d49d1a`;
- candidate ID: `voidbuye2nativecand6r2_5d643422fb1c53686edd9386d6a65f000d9f399538bf94cca98b232fdfb15e8d`.

Canonical repaired provenance:
- #3318 merge: `a3896576a0a716337f679deb26de36dc039219e0`;
- parent tree: `7f9fe7beb108368039fdc97ee58b1c6dfb4a69eb`;
- preservation workflow blob: `c66c1cd21ce762a128d7a25be8cec22686bca993`;
- `historical_candidate_identity_reused=false`;
- `historical_v6_lock_reused=false`.

Native source:
- Git blob: `5021727f1def1ec11f870d735cab65acc1701a5e`.

Repaired V3 runner:
- Git blob: `499df9b94b5b89354837570da0c7e47ec280025d`;
- bytes: `45147`;
- SHA-256: `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`.

## Materialization contract

The materializer authenticates the exact lock, candidate tool and native source
before candidate code is compiled/executed.

The candidate tool then compiles the exact reviewed native source through its
accepted static-toolchain recipe. The materializer requires:
- 726,976-byte ELF;
- SHA-256 `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- static x86-64 executable;
- no `PT_INTERP`;
- reviewed linker-trace evidence.

Native output publication is create-only under a retained direct parent
descriptor, with final mode `0555`, file fsync, descriptor readback, parent
directory fsync and visible-generation verification.

The independent proof performs two materializations and requires byte equality,
exact ELF identity, no `PT_INTERP`, and create-only replay rejection.

Hosted CI separately copies the exact repaired V3 runner as mode `0444`,
fsyncs it, verifies bytes/hash, and publishes native + runner + SHA256SUMS only
as temporary workflow artifacts.

## Authority boundary

Even a green hosted artifact remains:

```text
artifact_publication_only=true
candidate_binary_identity_accepted=true
protected_install_authorized=false
live_execution_authorized=false
credential_access=false
private_key_access=false
signing_authorized=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action_authorized=false
funds_movement=false
```

No Precision filesystem mutation, policy installation, service/systemd action,
credential/private-key access, signature, transaction/RPC, payment acceptance,
presale/WC activation, treasury/liquidity action, or funds movement is
authorized.

## Next gate

Only after this materializer reaches exact-head source/CI/review acceptance may
#3327 advance to a **fresh V6R2 protected upgrade** generation.

Historical V6 upgrade/install generations are not current retry authority.

PROTECT THE CORE.

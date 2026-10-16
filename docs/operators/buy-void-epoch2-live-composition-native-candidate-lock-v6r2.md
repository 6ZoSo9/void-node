# Buy VOID Epoch-2 live-composition native candidate lock V6R2

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_CANDIDATE_LOCK_V6R2`.

Status: **fresh post-#3318 candidate identity acceptance only; not installed and not authorized for live execution**.

## Purpose

This is the acceptance lock required by #3327 after canonical operator-entry
preservation repair #3318.

It does not reuse the historical V6 candidate/lock/materializer lineage from
#3317/#3322/#3324. Equal native and runner payload bytes do not imply equal
provenance or authority.

## Fresh accepted candidate

Canonical repaired source parent:

`a3896576a0a716337f679deb26de36dc039219e0`

Canonical parent tree:

`7f9fe7beb108368039fdc97ee58b1c6dfb4a69eb`

Canonical #3318 preservation workflow Git blob:

`c66c1cd21ce762a128d7a25be8cec22686bca993`

Fresh candidate source head:

`26a06fe84f93ba48107809a9bd14263c34fa961e`

Candidate merge on main:

`01dfaa59faa3e9779c6f4fd4cce4a470002954db`

Candidate ID:

`voidbuye2nativecand6r2_5d643422fb1c53686edd9386d6a65f000d9f399538bf94cca98b232fdfb15e8d`

Candidate report:
- bytes: `60020`;
- SHA-256: `b5bd9b236cfdf821e7fbef4a97ad8e64632aa01503fa4f5a1daf0d1db2535c5f`;
- Git blob: `ae6cc402d821fa5e3a37716f37285a1d600dfa18`.

Native ELF:
- bytes: `726976`;
- SHA-256: `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- static ELF64 x86-64 executable;
- no `PT_INTERP`;
- hostile `LD_PRELOAD` blocked before native main.

Repaired V3 runner:
- Git blob: `499df9b94b5b89354837570da0c7e47ec280025d`;
- bytes: `45147`;
- SHA-256: `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`;
- future install mode: `0444`.

## Hosted evidence

Candidate workflow run:

`38917039455`

Jobs:
- source proof: `117027051388`;
- derive A: `117027209906`;
- derive B: `117027209789`;
- derive C: `117027210285`;
- independent compare: `117027434340`.

Artifacts:
- A: `12053625069`;
- B: `12052617917`;
- C: `12053430439`.

All three candidate reports were byte-identical and the compare job independently
rederived the ELF and complete static compiler/link-input closure.

## Lock identity

`voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`

The suffix is SHA-256 over canonical JSON of the complete lock body excluding
`lock_id`.

The lock explicitly records:
- `historical_candidate_identity_reused=false`;
- `historical_v6_lock_reused=false`.

## Authority boundary

This lock changes candidate identity acceptance only:

```text
candidate_accepted=true
native_binary_identity_accepted=true
runner_identity_accepted=true
protected_install_authorized=false
live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

No Precision installation, policy publication, credential/private-key access,
signature, transaction/RPC, service/systemd mutation, payment acceptance,
presale/WC activation, treasury/liquidity action, or funds movement is
authorized here.

## Next gate

The next separately versioned gate is the **fresh V6R2 install-input
materializer**:

`void_buy_void_epoch2_live_composition_native_candidate_materializer_v6r2`

Do not jump directly to the historical V6 protected upgrader.

PROTECT THE CORE.

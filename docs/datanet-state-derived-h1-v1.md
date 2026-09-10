# DataNet state-derived H1 reducer v1

Marker: `VOID_DATANET_STATE_DERIVED_H1_V1`

Status: source/proof only. This is a bounded implementation cut for the #1352 V25 recovery rule; it is not full cold-storage acceptance and does not publish payload bytes.

## Implemented

`src/storage/datanet_state_derived_h1_v1.ts` owns two narrow pieces of the selected design:

1. canonical object quota-key derivation:

   `K = SHA256("VOID-DATANET-OBJECT-QUOTA-V1\\0" || chain_id_u64_be || genesis_hash_32 || commitment_type_u16_be || H_32)`

2. the fresh state reducer used after mutation-capable H0 custody has retired.

The reducer accepts only exact state fields. Campaign IDs, attempt IDs, peer labels, receipt IDs, schedule labels, process ancestry and remembered crash history are not inputs and cannot select a branch.

For one exact prebound root/K/H/length tuple:

- verified canonical S0 with S1 missing => `AUTHORIZE_H1`;
- verified canonical distinct S0+S1 => `DENY_H1`;
- missing/invalid/foreign S0, invalid/foreign S1, binding mismatch, aliasing, active mutation custody or any extra leaf => `HOLD`.

This makes ordinary E0 and crash-cut R0 reconstruct to the same result when their durable observations are identical.

## Deliberately not implemented here

This cut does **not** manufacture a fake exclusive-admission capability. In particular, it does not accept a caller boolean, receipt, cache entry or process label as proof that cross-supervisor exclusion exists.

The following remain required before S1 publication can be implemented or accepted:

- one kernel-enforced exclusive capability bound to the exact prebound root identity and K;
- crash release and fresh acquisition proof;
- noninheritance / no capability transfer proof;
- unique-admission and exclusion proof across independent supervisors;
- full reservation proof before payload allocation;
- no-follow fixed S0/S1 namespace inventory with exact inode/length/EOF/full-H verification;
- anonymous allocation plus create-only/no-replace S1 publication;
- EEXIST/conflict revalidation and fail-closed behavior;
- fixed-call payload I/O accounting from V25;
- source-distinct aggregate verification;
- retained ext4 fixture provenance, cold remount, physical-power-loss and public-peer evidence required by the wider #1352 acceptance contract.

Until those gates exist, an `AUTHORIZE_H1` classification is only a local state decision. It is neither a publication capability nor Chain-2050 authority.

## Focused proof

`scripts/prove_datanet_state_derived_h1_v1.ts` runs 19 deterministic cases, including:

- one fixed K derivation vector;
- paired byte-identical E0/R0 S0-only classifications;
- cap reached at distinct S0+S1;
- inode alias rejection;
- custody-active and third-leaf rejection;
- missing, invalid and foreign S0/S1 rejection;
- expected hash/length binding failures;
- rejection of schedule/history and campaign metadata as reducer inputs; and
- u64/u16 K-domain bounds.

`.github/workflows/datanet-state-derived-h1-v1.yml` executes the focused typecheck and proof on natural Node 22, 24 and 26 against the exact checked-out PR head.

## Authority boundary

This lane performs no deployment, restart, production filesystem mutation, network operation, Chain-2050 mutation, key/wallet/signer access, transaction, Work Credit action, validator action, inventory funding, presale activation, treasury/liquidity action or funds movement.

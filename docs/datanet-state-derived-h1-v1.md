# DataNet state-derived H1 reducer v1

Markers: `VOID_DATANET_STATE_DERIVED_H1_V1`, `VOID_DATANET_H1_FILESYSTEM_CLASSIFIER_V1`

Status: source/proof only. This is a bounded implementation cut for the #1352 V25/V27 recovery rule; it is not full cold-storage acceptance and it does not publish payload bytes.

## Implemented

`src/storage/datanet_state_derived_h1_v1.ts` owns:

1. canonical object quota-key derivation:

   `K = SHA256("VOID-DATANET-OBJECT-QUOTA-V1\\0" || chain_id_u64_be || genesis_hash_32 || commitment_type_u16_be || H_32)`

2. exact V27 flat leaf names:

   - `S0 = datanet-<lowercase hex64 K>-s0.v1`
   - `S1 = datanet-<lowercase hex64 K>-s1.v1`

3. canonical store-root identity as unsigned decimal `st_dev:st_ino`; and
4. the fresh state reducer used after mutation-capable H0 custody has retired.

The reducer accepts only exact state fields. Campaign IDs, attempt IDs, peer labels, receipt IDs, schedule labels, process ancestry and remembered crash history are not inputs and cannot select a branch.

For one exact prebound root/K/H/length tuple:

- verified canonical S0 with S1 missing => `AUTHORIZE_H1`;
- verified canonical distinct S0+S1 => `DENY_H1`;
- missing/invalid/foreign S0, invalid/foreign S1, binding mismatch, aliasing, active mutation custody or any extra same-K leaf => `HOLD`.

This makes ordinary E0 and crash-cut R0 reconstruct to the same result when their durable observations are identical.

`src/storage/datanet_h1_filesystem_classifier_v1.ts` now constructs that observation from the filesystem without mutation. It deliberately accepts a **prebound directory FD**, not a pathname. It:

- requires the caller's trusted parent directory FD plus the exact expected `(dev,ino)` identity;
- verifies that FD is a directory and that its identity matches the prebound identity;
- duplicates that exact directory authority through `/proc/self/fd/<caller-fd>` and verifies the duplicate inode before reading children;
- derives only the two exact K leaf names below the retained duplicate FD;
- inventories before and after classification and rejects namespace changes;
- treats any additional same-K prefix name as extra conflicting state while ignoring unrelated K namespaces;
- opens leaves read-only with `O_NOFOLLOW`;
- compares opened and namespace inode identity;
- requires a regular current-UID inode with one link and no group/world write bit;
- requires exact length;
- reads positioned 65,536-byte blocks with no source-level retry, followed by one one-byte EOF probe at the exact length;
- hashes all returned payload bytes against immutable H;
- compares inode/size/mode/link/uid/gid/mtime/ctime metadata before and after the read; and
- emits exact read-call/requested/returned counters beside the reducer classification.

The classifier input is exact-key parsed; schedule/history metadata cannot be smuggled in and ignored. Lexical pathname and symlink resolution are outside this classifier's authority. The proof opens both a direct path and a symlink alias externally and shows that, when both yield the exact same prebound directory inode, classification is identical; the lexical spelling itself never enters K or the reducer.

## Deliberately not implemented here

This cut does **not** manufacture a fake exclusive-admission capability. In particular, it does not accept a caller boolean, receipt, cache entry or process label as proof that cross-supervisor exclusion exists.

The following remain required before S1 publication can be implemented or accepted:

- one kernel-enforced exclusive capability bound to the exact prebound root identity and K;
- crash release and fresh acquisition proof;
- noninheritance / no capability transfer proof;
- unique-admission and exclusion proof across independent supervisors;
- full reservation proof before payload allocation;
- source-bound injected short/zero/EINTR/offset failure controls for the fixed read state machine;
- anonymous allocation plus create-only/no-replace S1 publication;
- EEXIST/conflict revalidation and fail-closed behavior;
- the complete V25 64 MiB read/write ledger and deadlines;
- source-distinct aggregate verification; and
- retained ext4 fixture provenance, cold remount, physical-power-loss and public-peer evidence required by the wider #1352 acceptance contract.

Until those gates exist, an `AUTHORIZE_H1` classification is only a local state decision. It is neither a publication capability nor Chain-2050 authority.

## Focused proofs

`scripts/prove_datanet_state_derived_h1_v1.ts` runs 21 deterministic reducer/namespace cases, including the fixed K vector, paired E0/R0 state equality, exact 78-byte S0/S1 names, canonical root identity, cap/alias/foreign/binding failures and rejection of history metadata.

`scripts/prove_datanet_h1_filesystem_classifier_v1.ts` runs 15 filesystem cases on disposable roots, including exact read accounting, S0-only authorization, S0+S1 cap, unrelated-K coexistence, same-K third-path HOLD, symlink/hard-link/nonregular occupants, wrong hash/length, two externally opened lexical aliases bound to one root inode, prebound-root mismatch, mode failure, custody-active HOLD and exact classifier-input rejection.

`.github/workflows/datanet-state-derived-h1-v1.yml` typechecks both source modules and both proofs, then executes both proof suites on natural Node 22, 24 and 26 against the exact checked-out PR head.

## Authority boundary

This lane performs no deployment, restart, production filesystem mutation, network operation, Chain-2050 mutation, key/wallet/signer access, transaction, Work Credit action, validator action, inventory funding, presale activation, treasury/liquidity action or funds movement.

# Apollyon protected-store Xiphos machine identity binding V1

Marker: `VOID_APOLLYON_PROTECTED_STORE_MACHINE_IDENTITY_BINDING_V1`.

Status: **source/test/CI identity binding only**. This generation does not perform the protected-store host pass, read protected records, create a writer capability, publish a claim or consumption record, release or start training, access credentials, sign, transact, or move funds.

## Purpose

Parent Draft #3749 deliberately remained machine-identity UNBOUND even after its metadata-safe first-host evidence plan reached 18/18 GREEN and a clean exact-head review. Its next gate required separately authenticated Xiphos machine evidence before any host pass could be authorized.

The operator then performed a read-only Xiphos measurement. The command:

- observed hostname `Xiphos`;
- read only `/etc/machine-id`;
- required a regular, non-symlink file with bounded size;
- retained descriptor/visible generation equality through the read;
- decoded strict ASCII, stripped surrounding whitespace and required exactly 32 lowercase hexadecimal characters;
- SHA-256 hashed those normalized 32 ASCII bytes;
- printed only the digest, never the raw machine ID;
- performed no filesystem/service/training/credential/funds mutation.

Exact bound digest:

```text
543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057
```

The raw machine ID is intentionally absent from repository evidence.

## Exact parent

- parent PR: #3749
- parent head: `4bb11c7469b47b25810390b762709bd93a7184e3`
- parent plan blob: `110c8a6bb4f8ec89514cfd9ef4cdc3218fa2a4ca`
- parent proof blob: `533b8357caea9c77c5c73aba95233712824b65d9`
- parent document blob: `4b055837dd4e150fb2573947ff11f0b2f455622e`
- parent workflow blob: `f533256a7b2b2a75b1f9aa8298ac43692b5af9d7`

This child does not rewrite the historical green unbound #3749 generation at
`4bb11c7469b47b25810390b762709bd93a7184e3`. The cumulative PR branch may
subsequently update the first-host **workflow** so that it watches and pins this
binding successor, but that current worktree workflow is not allowed to replace
the historical parent identity.

The binding proof therefore authenticates all four parent blobs from the exact
`4bb11c...` Git tree. It does **not** require the current worktree copy of the
first-host workflow to retain the historical blob. This keeps parent evidence
immutable while permitting a one-way cumulative successor workflow.

## Binding semantics

Only this authority advances:

```text
machine_identity_bound=true
```

The future first-host pass must independently reread `/etc/machine-id` using the same normalization and require exact SHA-256 equality. Hostname `Xiphos` alone is insufficient. Unreadable, malformed, changing, or mismatched machine identity must HOLD.

The binding does **not** imply that the protected store exists, belongs to the expected service, matches the reviewed source/runtime generation, or contains current winner/claim/consumption state.

These remain false:

```text
host_pass_performed=false
protected_store_origin_proven=false
current_store_generation_revalidation_performed=false
authorization_winner_reread_performed=false
durable_claim_record_reread_performed=false
consumption_slot_classification_performed=false
writer_directory_capability_origin_proven=false
writer_invocation_authorized=false
consumption_publication_authorized=false
trainer_release_authorized=false
training_execution_authorized=false
credential_access=false
signing=false
transaction=false
funds_movement=false
```

## Preserved first-host safety boundary

The later, separately authorized host pass remains metadata-safe and read-only. It must not:

- read protected record contents or enumerate protected record names;
- read process environment or raw process arguments;
- access credentials, keys, wallets, or signers;
- mutate the filesystem;
- start, stop, restart, enable, install, or reload services;
- create or transfer a writer capability;
- publish a claim or consumption record;
- release or start the trainer;
- contact mutation-capable RPC/transaction paths;
- move funds.

Root privilege, if separately authorized and required for otherwise-hidden metadata, does not widen the allowed data surface.

## Content identity

Binding ID:

`voidapollyonhostidbind1_84b546de51ba3f22cd1f5775eb0230d5683e53254d3d3426b9a97fc2d3037f1d`

The proof rejects duplicate JSON keys and non-finite JSON constants before content addressing, pins every parent blob, mutates every binding requirement and negative authority independently, and rejects any change to the target host, identity kind, normalization, digest, raw-ID secrecy, read-only observation facts, parent generation, next gate, or binding ID.

Next gate:

`SEPARATE_AUTHORIZATION_THEN_READ_ONLY_METADATA_SAFE_XIPHOS_FIRST_PASS`

**PROTECT THE CORE.**

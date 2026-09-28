# Epoch-2 public migration evidence v1

Marker: `VOID_ECONOMIC_EPOCH2_PUBLIC_MIGRATION_EVIDENCE_V1`

Status: the content-addressed public migration **summary/reference** is
source-ready. The exact successor state/genesis artifact bytes, public VOID
state-root anchoring, and the live balance/receipt/code read gateway remain
`HOLD`.

## Public packet

The canonical public packet is:

`public/public-node/evidence/economic-epoch2-migration-manifest-v1.json`

Public route identity:

`/public-node/evidence/economic-epoch2-migration-manifest-v1.json`

Its migration material is canonical-JSON SHA-256 addressed as:

`7793624324ce6b171f43c1f8089af7edfbbc8c5144eefe911688128600847572`

The content-addressed material binds three groups by reviewed hashes, identities,
counts, and state-root metadata. The frozen epoch-1 source snapshot and custody
destination manifest are additionally bound by raw-file SHA-256 so their holder
address/balance maps cannot drift behind unchanged path references. The client-neutral
and Besu nonce-continuity evidence wrappers are also raw-file SHA-256 bound, including
the semantic-equivalence predicates they carry. It does **not** publish the exact private/local
client-neutral manifest or nonce-overlay genesis bytes.

### Final epoch-1 source

- final block: `37392`;
- final block hash:
  `0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52`;
- frozen state SHA-256:
  `94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505`;
- archive manifest SHA-256:
  `4d8b4f6df9c06cadcd27fd89606e846c83e8303fed9ca45c2b64f65c3baf4a1c`; and
- complete archive identity SHA-256:
  `191c2d2fdc55bdc099569c2bd96719fb6fafe5baa99ea61459fcc8d9b4330dbf`.

### Epoch-2 successor state

- execution epoch `2`, Chain ID `2050`;
- pinned Besu `26.8.1`;
- client-neutral state manifest file SHA-256
  `affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9`;
- latest nonce-overlay genesis block hash
  `0x59ef190bdbd42268a497edca4237446665deb0f1fa98f54ac85ed461bdd282a7`;
- latest nonce-overlay genesis state root
  `0x7aef6c030a691569cdb0d033f1b9333c1a07cdc9de0c0fbfb952fddbd96cc2b`;
- 156 allocations, including 154 preserved nonzero epoch-1 nonces;
- 1,268 verified economic storage readbacks;
- canonical VoidToken
  `0x470075b85352eb86f7d089fb9ba88945f12aad94`;
- total supply `333333333000000000000000000` atoms; and
- three nonzero successor token holders.

The packet deliberately uses the later nonce-continuity Besu genesis rather
than the earlier pre-nonce-overlay state-equivalence genesis.

### Economic custody mapping

The packet binds the reviewed successor custody manifest:

- treasury: `0x26c501a1edca3614f214face2d9b7be2aa7c864b`;
- staking: `0x77dfeedd19a4741f299c902ad5bbe0de917a9e59`; and
- presale: `0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce`.

Supply delta remains zero and no live token transfer is part of the migration
plan.

## Gates closed

This static publication closes only:

- `migration_manifest_content_addressed=true`.

This packet deliberately did **not** close full successor-state artifact
publication at the time it was created; its embedded publication snapshot
therefore remains
`successor_genesis_or_state_manifest_public_evidence_ready=false`.

The follow-on exact state artifact has since been committed and independently
retrieved byte-for-byte through the live Precision public composition/Funnel
path. Current candidate truth is now
`successor_genesis_or_state_manifest_public_evidence_ready=true`. The older
packet is preserved unchanged as historical evidence rather than rewritten.

## Gates deliberately not closed

This packet is not a public VOID truth-layer anchor. Therefore:

`successor_state_root_public_void_anchor_ready=false`

It is also not the participant read-only runtime gateway for arbitrary balance,
receipt, contract-code, state/checkpoint, or migration queries. Therefore:

`public_balance_receipt_code_verification_ready=false`

Those are separate source/runtime gates.

## Authority boundary

The packet and verifier are read-only source evidence. They perform no RPC,
runtime mutation, signer/key access, transaction construction/signing/
submission/broadcast, Chain-2050 write, token movement, funds movement,
migration activation, or public activation.

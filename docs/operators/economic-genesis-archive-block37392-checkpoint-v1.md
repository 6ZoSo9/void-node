# Economic Genesis Archive block-37392 checkpoint v1

Marker: `VOID_ECONOMIC_GENESIS_ARCHIVE_BLOCK37392_CHECKPOINT_V1`

Precision captured a finalized, fsynced, content-addressed private state export
for the reconciled epoch-1 economic state at block `37392`.

Exact identity:

- chain ID: `2050`;
- block: `37392`;
- block hash:
  `0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52`;
- checkpoint ID:
  `c251d3d92a0f3729f008fb7911243da0e4e2939af73f98fab2234a050c95a906`;
- state SHA-256:
  `94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505`;
- state bytes: `161576656`;
- manifest SHA-256:
  `4d8b4f6df9c06cadcd27fd89606e846c83e8303fed9ca45c2b64f65c3baf4a1c`;
- finalization marker SHA-256:
  `191c2d2fdc55bdc099569c2bd96719fb6fafe5baa99ea61459fcc8d9b4330dbf`.

The capture used the existing closed read-only checkpoint RPC contract, including
`anvil_dumpState`, and required zero unlocked RPC accounts plus an unchanged
head/hash around the export.

The checkpoint was written under a separate Economic Genesis Archive quarantine
root. It did **not** mutate the production startup checkpoint root and did not
change restart selection.

This checkpoint plus the merged reconciliation A/B pair makes block 37392 a
durable **final-candidate** economic snapshot. It is not yet promoted to the
irreversible final migration snapshot because epoch-1 write authority has not
yet been proven frozen.

No service action, credentials, keys, wallets, signing, broadcast, Chain-2050
write, token movement, or funds movement occurred.

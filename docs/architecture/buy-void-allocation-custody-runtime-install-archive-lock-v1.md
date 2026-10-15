# Buy VOID allocation-custody runtime install archive lock v1

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_INSTALL_ARCHIVE_LOCK_V1`.

Status: **source/CI acceptance of one exact install archive only**.

## Exact hosted candidate

Parent #3031 exact head:

`b2257bcf7e28e22e0f90d6fa674798eeef9f7024`

Hosted run `38672815457` independently derived the complete archive on Node
22/24/26. The compare job required the complete tar bytes and package receipts
to be byte-identical.

Accepted archive identity:
- ID `voidbuycustodyarchive1_5685b87bba1987b7365909eb4bd684b89695f7d5e1253d59dcd63ff390732333`;
- bytes `256000`;
- SHA-256 `1fec540e1bac3f728bfa438512a6e0149eea1cda2ae5f2a05f4ec9f19a5a5c9d`;
- runtime files `10`;
- Node 22 artifact `11945096600`;
- Node 24 artifact `11944836579`;
- Node 26 artifact `11945221437`.

The archive contains the already-accepted runtime-bundle lock, a canonical
content-addressed review manifest, and exactly the ten accepted runtime files.

## Acceptance model

This lock does not merely copy the hosted output fields. On every supported
Node major the proof:
1. binds the exact #3031 parent and parent tool/proof/workflow Git blobs;
2. requires the already-merged custody runtime-bundle acceptance lock;
3. recompiles the exact source tree;
4. rederives the complete canonical archive;
5. requires exact hosted ID, byte count and SHA-256;
6. re-inspects the archive with the parent independent inspector;
7. compares the deterministic lock bytes to the committed lock.

Only:

`archive_candidate_accepted=true`

advances.

## Remaining host boundary

The lock does not select or replace the live `/opt` target. It does not
authenticate the live Node binary, provision the request root, install/start the
custody system service/socket, install Polkit, mount payment→allocation, enable
reserve/recover, accept payment, activate presale/WC or move funds.

Those remain false in the lock and require separate host evidence/authorization.

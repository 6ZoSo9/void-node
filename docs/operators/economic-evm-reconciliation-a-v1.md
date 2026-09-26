# Economic EVM reconciliation A v1

Marker: `VOID_ECONOMIC_EVM_RECONCILIATION_A_V1`

Status: read-only reconciliation A is green. This is **not** yet the final
migration snapshot.

Precision executed the merged read-only observer against loopback Chain-2050 at
block `37392`.

Observed:

- block hash `0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52`;
- canonical `VoidToken`
  `0x470075b85352eb86f7d089fb9ba88945f12aad94`;
- total supply `333333333000000000000000000` atoms;
- 131 addresses discovered from Transfer history;
- exactly 3 nonzero holders;
- all 3 nonzero holders are contracts;
- holder-balance sum equals total supply exactly;
- presale contract
  `0xa40a43adfd174f88309173cb3daa6e09c10154a7` still holds the full
  10,000,000-VOID inventory;
- presale remaining inventory is 10,000,000 VOID;
- fulfilled amount is zero; and
- presale accounting identity holds.

The local receipt was not imported into the repository. Its operator-reported
SHA-256 is:

`38fa278d7e1c6a9ace0bdcbad131c1e0d5c0572de01bd0e64d340c256e45879b`

This advances one read-only reconciliation only. It does not prove the archive
write freeze, does not promote block 37392 to the irreversible final migration
snapshot, and does not satisfy the required second independent reconciliation.

No credentials, wallet/private keys, signing, broadcast, Chain-2050 write,
token movement, or funds movement occurred.

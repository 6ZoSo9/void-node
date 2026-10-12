# Economic EVM reconciliation pair v1

Marker: `VOID_ECONOMIC_EVM_RECONCILIATION_PAIR_V1`

Two independent read-only paths agree exactly on archive block `37392` and
hash `0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52`.

The second path did not import the first observer or `ethers`; it used raw
loopback JSON-RPC, manual selectors, and a distinct Transfer-log chunk size.

Exact value census:

| Holder | Balance atoms | Meaning |
|---|---:|---|
| `0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514` | `323207333000000000000000000` | VoidTreasury |
| `0x77dfeedd19a4741f299c902ad5bbe0de917a9e59` | `126000000000000000000000` | contract-held stake/value |
| `0xa40a43adfd174f88309173cb3daa6e09c10154a7` | `10000000000000000000000000` | Buy VOID presale inventory |

The sum is exactly `333333333000000000000000000` atoms, equal to
`VoidToken.totalSupply()`.

The presale inventory remains untouched: 10,000,000 VOID remaining,
0 fulfilled, 10,000,000 VOID maximum.

This pair satisfies the two-independent-read-only-reconciliation requirement
for the observed state. It does **not** yet prove that epoch-1 write authority
is frozen, so block 37392 is not yet promoted to the irreversible final
migration snapshot.

No keys, wallet access, signing, broadcast, Chain-2050 mutation, token movement,
or funds movement occurred.

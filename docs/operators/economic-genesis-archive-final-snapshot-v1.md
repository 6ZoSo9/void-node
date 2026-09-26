# Economic Genesis Archive final snapshot v1

Marker: `VOID_ECONOMIC_GENESIS_ARCHIVE_FINAL_SNAPSHOT_V1`

Epoch-1 economic execution is now frozen and block `37392` is the canonical
final source snapshot for the epoch-2 migration.

## Final source identity

```text
chain_id=2050
execution_epoch=1
block_number=37392
block_hash=0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52
VoidToken=0x470075b85352eb86f7d089fb9ba88945f12aad94
VoidToken_runtime_sha256=1360507ef5816f53cf32179736190a5c7a3ce605aaee7d0e06bb8a5da7351198
total_supply_atoms=333333333000000000000000000
```

Two independent read-only reconciliations agreed exactly on this state before
the freeze. The durable archive checkpoint is finalized and fsynced with state
SHA-256
`94b25d36990d32616a7328f5419f5075fee757c15a955617c79ef30497a14505`.

The epoch-1 RPC service is inactive and disabled, loopback port `8545` has no
listener, and a persistent systemd condition guard prevents ordinary automatic
restart while the archive freeze marker exists.

## Exact nonzero value holders

| Holder | Role | VOID atoms |
|---|---|---:|
| `0x554ecc7be6f0b7cc3d1c578c2bb848e535c02514` | VoidTreasury | `323207333000000000000000000` |
| `0x77dfeedd19a4741f299c902ad5bbe0de917a9e59` | UpgradeStaking | `126000000000000000000000` |
| `0xa40a43adfd174f88309173cb3daa6e09c10154a7` | PresaleFulfillment | `10000000000000000000000000` |

The three balances sum exactly to total supply.

Presale state at the final source snapshot is untouched:

```text
remaining_inventory=10000000 VOID
fulfilled=0 VOID
maximum_inventory=10000000 VOID
```

## What this closes

The successor candidate may now treat these gates as proven:

- final epoch-1 snapshot identity;
- durable source state identity;
- final source total supply;
- all nonzero `VoidToken` holders enumerated;
- source holder sum equals final supply;
- two independent snapshot reconciliations;
- epoch-1 write RPC disabled; and
- source snapshot public evidence available.

## What remains HOLD

This snapshot does **not** prove the epoch-2 successor.

Still required are:

- complete live-obligation census, especially UpgradeStaking beneficiary/state
  obligations;
- exact destination manifest for all three contract-held value buckets;
- reviewed successor custody contracts;
- ceremony-role mapping and backup continuity;
- offline epoch-2 build;
- source/successor balance, supply, and obligation equivalence;
- zero unmapped/orphaned VOID;
- native-gas/system-sponsorship model;
- pending legacy signed-transaction census and cross-epoch replay wall;
- public read/submission gateway;
- successor state-root anchor; and
- separately authorized canary/cutover.

No token movement or funds movement is authorized by final-snapshot promotion.

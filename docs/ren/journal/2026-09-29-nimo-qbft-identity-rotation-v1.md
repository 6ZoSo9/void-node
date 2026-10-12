# Nimo QBFT identity rotation v1

Marker: `VOID_REN_NIMO_QBFT_IDENTITY_ROTATION_V1`

On 2026-09-29, the canonical Nimo Besu QBFT private node key was found missing
from its expected local custody path.

A recovery census searched the plausible local VOID, Downloads, and mounted
media key locations without printing private-key contents:

```text
candidate_file_count=1
matching_key_count=0
recovery_candidate_found=false
```

At the time of rotation, the production validator set remained unbound,
offline successor equivalence remained false, and migration/public activation
remained unauthorized.

Nimo therefore generated a fresh local Besu node key while preserving its VOID
node ID:

```text
void_node_id=12babb04b0f88de7b74e17d04b343007
old_besu_validator_address=0x95cd9f9b57a53e1fc86411d52092051611282904
new_besu_validator_address=0x02f967953386188397b992c208239d3a25180db6
new_public_attestation_sha256=f7480b1a1086fe62328528e108c7cde9588e9c3b26a8277e88169aa486fd9ab2
```

The new node key remains local with mode `600`. Its private content was not
printed, exported, or recorded in the repository.

The old public identity is preserved in Git history and in the canonical
rotation receipt:

`ops/mainnet0/economic-epoch2-qbft-node-identity-nimo-rotation-v1.json`

No validator-set mutation, authoritative Chain-2050 write, migration,
activation, or funds movement was authorized by this rotation.

Memory for context. Repo for truth. Brood journal for continuity.

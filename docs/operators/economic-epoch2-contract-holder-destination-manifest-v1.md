# Epoch-2 contract-holder destination manifest v1

Marker: `VOID_ECONOMIC_EPOCH2_CONTRACT_HOLDER_DESTINATION_MANIFEST_V1`

The frozen epoch-1 source has exactly three nonzero `VoidToken` contract
holders. This manifest assigns every bucket exactly one epoch-2 destination
without live token transfers.

## Deterministic predeploy identity

New epoch-2 custody contracts use fixed genesis-predeploy addresses:

```text
address = lower_20_bytes(SHA256(UTF8(label)))
```

This is an address-allocation convention for the offline successor genesis. It
is not CREATE/CREATE2 and has no deployer nonce or private-key dependency.

| Label | Epoch-2 address |
|---|---|
| `VOID_EPOCH2_TREASURY_CUSTODY_V1` | `0x26c501a1edca3614f214face2d9b7be2aa7c864b` |
| `VOID_EPOCH2_PRESALE_FULFILLMENT_V1` | `0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce` |

## Value mapping

### VoidTreasury — REMAP

The frozen treasury admin is legacy and outside the May 23 ceremony set.

The full 323,207,333 VOID balance is therefore assigned offline to
`VoidEpoch2TreasuryCustodyV1`.

Its fixed authority is the ceremony
`premine_treasury_primary` address:

`0x54ded2daa618a257093556a5f54c43805b9bd516`.

The old treasury receives zero successor `VoidToken`.

### UpgradeStaking — PRESERVE

`ValidatorStakingV2` is preserved at the exact address with exact code/storage.

The frozen obligation census proved:

- 126 validators;
- all 126 active;
- 126,000 VOID attributed stake;
- zero unbond liability;
- exact controller/reward reverse mappings.

The contract has per-validator controller ownership and no global admin in the
reviewed source. Preserving it avoids remapping 126 individual validator
obligations.

### PresaleFulfillment — REMAP

The epoch-1 presale fulfiller is immutable and outside the ceremony set.

Because the final source state has zero fulfilled inventory, epoch 2 starts a
clean fulfillment registry with:

- the same canonical `VoidToken`;
- 10,000,000 VOID inventory;
- total fulfilled = 0;
- no predecessor;
- ceremony `launch_operator_signer` as fulfiller:
  `0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`.

The old presale contract receives zero successor `VoidToken`.

## Supply conservation

Planned epoch-2 nonzero holders are:

- new treasury custody: 323,207,333 VOID;
- preserved UpgradeStaking: 126,000 VOID;
- new presale fulfillment: 10,000,000 VOID.

Total remains exactly 333,333,333 VOID.

No migration mint/burn or live transfer is part of this plan.

## Separate token-owner gate

The canonical `VoidToken` itself remains at its exact address/runtime with
supply and balance state preserved. Its frozen owner is outside the ceremony
set and must not migrate.

The final successor token-owner ceremony role is deliberately **not** selected
by this manifest. That remains a separate authority-mapping proof.

This manifest therefore closes the contract-holder destination design, not the
offline successor equivalence or live-cutover gates.

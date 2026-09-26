# Epoch-2 ceremony role map v1

Marker: `VOID_ECONOMIC_EPOCH2_CEREMONY_ROLE_MAP_V1`

The frozen authority census proved that the epoch-1 token owner, treasury admin,
OpsTreasury admin, and presale fulfiller are all outside the May 23 ceremony
address set. None receives epoch-2 write power.

The successor map is:

| Surface | Ceremony role | Address |
|---|---|---|
| `VoidToken.owner` | `premine_treasury_primary` | `0x54ded2daa618a257093556a5f54c43805b9bd516` |
| epoch-2 treasury authority | `premine_treasury_primary` | `0x54ded2daa618a257093556a5f54c43805b9bd516` |
| epoch-2 presale fulfiller | `launch_operator_signer` | `0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a` |
| preserved ValidatorStakingV2 global admin | none | none |

## Why token owner maps to premine_treasury_primary

Retained bootstrap source constructs the token as:

```solidity
new VoidToken(R.selectedPremineVault)
```

and immediately reads `VoidToken.owner()`. Token ownership therefore belongs
to the premine-vault authority family in the retained design, not to AdminGate
or UpdateGate.

The May 23 ceremony's explicit replacement for that authority family is
`premine_treasury_primary`.

## Why presale maps to launch_operator_signer

Presale fulfillment is a bounded execution role: it processes verified
payment-delivery identities and transfers only from the presale's finite
inventory. The ceremony role explicitly named for live launch operations is
`launch_operator_signer`.

## Backup boundary

The public VOIDKEY2 receipt proves that the ceremony workspace was backed up and
SHA-256 verified at ceremony time, but this source role map does not inspect
private material or assert current secret accessibility.

Therefore ceremony-role mapping is source-verified while
`ceremony_backup_continuity_verified` remains a separate gate.

No authority transfer is performed by this artifact.

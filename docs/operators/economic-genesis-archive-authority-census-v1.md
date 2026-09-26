# Economic Genesis Archive authority census v1

Marker: `VOID_ECONOMIC_GENESIS_ARCHIVE_AUTHORITY_CENSUS_V1`

The frozen block-`37392` state was replayed only on an isolated local port and
its privileged getters were compared with the May 23 ceremony address set.

## Frozen authority truth

| Surface | Frozen authority | In May 23 ceremony set |
|---|---|---|
| `VoidToken.owner()` | `0x0d66fcdf95d38f7db6b4206bf183f34cd816c2aa` | no |
| `VoidTreasury.admin()` | `0x4e77786f32d41e40e7cef28389068d6f31f1d6a2` | no |
| `OpsTreasury.admin()` | `0x11debfb674b8a477894524419ec8ac06be6be956` | no |
| `PresaleFulfillment.fulfiller()` | `0xc884f631c3881b8b672bfcbf019c856146cd7f73` | no |

The presale predecessor is zero.

Therefore none of these legacy privileged authorities may receive epoch-2 write
power merely because their contracts existed in epoch 1.

## Disposition consequence

- `ValidatorStakingV2`: preserve exact address/code/storage is a valid
  candidate because validator economic control is per-controller and the frozen
  census found no global admin surface.
- `VoidTreasury`: remap the 323,207,333-VOID reserve into reviewed epoch-2
  custody rather than preserve legacy treasury admin authority.
- `PresaleFulfillment`: remap the untouched 10,000,000-VOID inventory into a
  successor fulfillment contract because the old fulfiller is immutable and
  outside the ceremony set.
- `VoidToken`: preserve canonical address/runtime/balance/supply identity, but
  do not carry the legacy owner into epoch 2. The exact successor owner role
  remains a separate ceremony-role verification gate.

The ceremony contains suitable public-role candidates for treasury custody and
the launch operator, but this census alone does not authorize an authority
transfer or select the final `VoidToken` owner role.

No key access, signing, transaction submission, token movement, or funds
movement occurred.

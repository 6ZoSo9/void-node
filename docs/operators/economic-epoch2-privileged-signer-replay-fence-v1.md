# Epoch-2 privileged signer replay fence v1

Marker: `VOID_ECONOMIC_EPOCH2_PRIVILEGED_SIGNER_REPLAY_FENCE_V1`

This gate protects the **successor privileged ceremony authorities** from
Epoch-1 raw-transaction/key reuse. It is narrower than the complete cross-epoch
raw-transaction replay wall.

## Evidence

The successor privileged role map has two unique authority addresses:

- `premine_treasury_primary`:
  `0x54ded2daa618a257093556a5f54c43805b9bd516`;
- `launch_operator_signer`:
  `0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`.

Neither address appears in the frozen 154-account nonzero-nonce census.
Therefore both have exact frozen Epoch-1 nonce zero.

The frozen authority census separately proves the legacy token owner, treasury
admin, OpsTreasury admin, and presale fulfiller are outside the May-23 ceremony
set. No legacy privileged authority is reused by the selected successor roles.

The signed-artifact census is complete across the designated Precision, Nimo,
and encrypted VOID_AUTHORITY lanes. Each host lane found exactly three
serialized signed Chain-2050 transactions, every discovered transaction was
stale under exact nonce continuity, and zero operator follow-up remained.

Because the selected successor privileged addresses have frozen nonce zero, no
nonnegative legacy transaction nonce from those addresses can satisfy the
staleness relation used by the census. The completed stale-artifact census
therefore contains no replayable serialized transaction from either successor
privileged authority.

Two reviewed historical hashes whose global staleness remains unproved are also
separated from successor authority:

- the historical OpsTreasury seed explicitly used legacy treasury admin
  `0x4e77786f32d41e40e7cef28389068d6f31f1d6a2`;
- the first WC→VOID public receipt hashes its sender after lowercase address
  normalization. Its published hash equals
  `sha256("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")`, the retired Anvil funding
  account with frozen nonce 130, not a ceremony authority.

## Gate

This evidence promotes exactly:

```text
privileged_signer_nonce_or_key_replay_fence_proven=true
```

The prior signed-artifact closeout remains historically correct and unchanged;
it did not itself promote this later gate.

## Deliberate HOLD

This does **not** prove that every possible legacy raw Chain-2050 transaction is
globally unreplayable. The general runtime/consensus bypass wall remains:

```text
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
```

Raw public RPC remains forbidden and later cross-epoch protection must still
prove the production submission/runtime boundary.

No wallet/private-key access, credential decryption, signing, transaction
construction/submission/broadcast, authoritative Chain-2050 write, token
movement, migration, activation, or funds movement is authorized.

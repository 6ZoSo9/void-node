# Buy VOID Epoch-2 V6R2 policy head rebind V1

Marker: `VOID_BUY_VOID_EPOCH2_V6R2_POLICY_HEAD_REBIND_V1`.

Status: **source/test/CI only**. This PR does not mutate Precision.

## Purpose

The installed V6R2 native and repaired runner bytes are already correct, but the
protected `policy-v3.conf` is bound to reviewed head
`65b4515b78e467afb399b510037e8c64256e87a5`.

After the V6R2 upgrade-publication truth repair and installed-qualification V5
became canonical, the next live execution generation must bind the protected
policy to the exact reviewed execution head used by the live service process.

This lane changes only that policy binding. It does **not** replace the native
or runner.

## Required starting state

The host plan/apply requires:

- current V6R2 native: 726976 bytes,
  SHA-256 `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- current repaired runner: 45147 bytes,
  SHA-256 `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`;
- current policy: 305 bytes,
  SHA-256 `dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9`;
- the exact retained historical V4 predecessor generation;
- repaired V5 upgrader source Git blob
  `fd7a06490ccf6fb14831d8b0372a892e2764c9dc`;
- exact clean checkout and fixed Git/setpriv/Node generations.

## Atomic rebind

A future separately authorized apply:

1. derives the new 305-byte policy from the exact reviewed `expected_head`
   and fixed Node generation;
2. creates the new policy create-only under `/opt`;
3. revalidates checkout, Git/setpriv/Node, current V6R2 root, and V4 predecessor;
4. atomically exchanges the staged policy with the live
   `policy-v3.conf` using `renameat2(RENAME_EXCHANGE)`;
5. retains the old policy at
   `/opt/.void-buy-void-epoch2-live-composition-v3.policy-predecessor-65b4515b`
   using `RENAME_NOREPLACE`;
6. fsyncs and revalidates all protected generations.

Any failure after exchange attempts to restore the exact old policy and remove
the exact new staged policy. A rollback that cannot be proven green fails
closed.

### Monotonic failure receipt

The apply transcript separates the initial authority declaration from final
operation evidence. Before mutation it emits only the scoped fact
`filesystem_mutation_performed_at_pre_mutation_boundary=false`.

If apply later fails, it emits one `FINAL_FAILURE_RECEIPT` before returning
HOLD. That receipt binds:

- the exact failure phase;
- whether the live policy exchange/publication occurred;
- whether rollback was attempted;
- whether rollback was proven green; and
- whether the final protected state was independently reclassified as exact
  READY or exact GREEN.

Once the live policy exchange succeeds,
`policy_publication_performed=true` is monotonic even when rollback later
restores the old policy. If rollback or final-state verification is uncertain,
the receipt reports that uncertainty rather than reverting to a pre-mutation
`false` claim.

Focused proof covers failure immediately after exchange, failure after backup
retention, and rollback/final-state uncertainty.

## Authority boundary

This lane does not authorize or perform:

- native replacement;
- repaired-runner replacement;
- live native/runner execution;
- credential/private-key access;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale or WC/VOID activation;
- service/systemd mutation;
- treasury/liquidity action;
- funds movement.

After a future GREEN policy rebind, the installed V6R2 qualification V5 must be
run against the same exact head before any service-generation refresh or live
composition retry.

PROTECT THE CORE.

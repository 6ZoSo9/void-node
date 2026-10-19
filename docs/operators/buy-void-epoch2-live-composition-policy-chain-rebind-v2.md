# Buy VOID Epoch-2 V6R2 policy chain rebind V2

Marker: `VOID_BUY_VOID_EPOCH2_V6R2_POLICY_CHAIN_REBIND_V2`.

Status: **source/test/CI only**. This PR does not mutate Precision.

## Purpose

The first policy-head rebind generation was intentionally one-hop. After it
retained the original `65b4515b...` policy, its GREEN classifier assumed that
the live policy must equal the HEAD supplied to that same invocation.

Precision now has a valid later state:

- protected V6R2 native: 726,976 bytes, SHA-256
  `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`;
- protected repaired runner: 45,147 bytes, SHA-256
  `7d67e3490b7066c089418eb1da9412570a39db2b422cdc1c62afb2482bf2bd94`;
- live `policy-v3.conf`: canonical 305-byte policy for reviewed HEAD
  `b92ba19cf16ea5f147c441e15de12b9932ca94c3`, SHA-256
  `9d18271055dc430335a6607a426c3082f950148087b87a6bc790a818d8b6286d`;
- retained original policy witness
  `/opt/.void-buy-void-epoch2-live-composition-v3.policy-predecessor-65b4515b`,
  exact SHA-256
  `dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9`;
- no interrupted policy-rebind stage.

V1 cannot classify this state against a newer HEAD because presence of the
original backup selects its already-GREEN branch and compares the live policy
directly to the newly requested policy.

V2 is a narrowly scoped second-hop successor. It does not accept arbitrary
historical policies.

## Exact lineage

Original policy witness:

- HEAD: `65b4515b78e467afb399b510037e8c64256e87a5`;
- bytes: 305;
- SHA-256:
  `dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9`;
- retained path:
  `.void-buy-void-epoch2-live-composition-v3.policy-predecessor-65b4515b`.

Immediate live predecessor:

- HEAD: `b92ba19cf16ea5f147c441e15de12b9932ca94c3`;
- bytes: 305;
- SHA-256:
  `9d18271055dc430335a6607a426c3082f950148087b87a6bc790a818d8b6286d`.

The target policy is derived only from the separately supplied exact reviewed
`expected_head`, the unchanged accepted V6R2 runner identity, and the fixed
Node generation.

### Worktree source-dependency boundary

The V2 implementation executes the reviewed V1 atomic primitive from a retained
in-memory source buffer. Precision's Git checkout may materialize ordinary
tracked source files as mode `0664`; that incidental worktree mode is not
source authority.

The loader therefore matches the established V1 boundary:

- the dependency path must be a regular non-symlink file;
- link count must be exactly one;
- size must be positive and bounded;
- device/inode/mode/uid/gid/link-count/size/mtime/ctime must remain unchanged
  across the read;
- the retained bytes must match the exact pinned Git blob before compilation.

A group-write bit does not substitute for, bypass, or weaken the exact Git-blob
check. Wrong bytes, symlinks, rebinding, or generation changes still HOLD.

This worktree rule does **not** relax any protected `/opt` ownership or mode
requirement.

## READY state

`EPOCH2_V6R2_POLICY_B92_READY_FOR_CHAIN_REBIND` requires all of:

1. no V2 stage;
2. original `65b...` policy backup exists and is exact;
3. retained V4 protected-generation predecessor is exact;
4. no `b92...` policy backup exists yet;
5. current V6R2 native and runner are exact;
6. live `policy-v3.conf` is exactly the canonical `b92...` policy;
7. checkout, Git, setpriv and Node generations bind to the requested HEAD.

Any other host state HOLDS.

## Atomic second hop

A future separately authorized apply:

1. creates the new current-HEAD policy at the unique V2 stage path;
2. revalidates exact checkout/tool/native/runner/V4/original-policy witnesses;
3. atomically exchanges the staged policy with live `policy-v3.conf` using
   `RENAME_EXCHANGE`;
4. verifies the new live policy and the displaced exact `b92...` policy;
5. publishes the displaced `b92...` policy create-only at
   `.void-buy-void-epoch2-live-composition-v3.policy-predecessor-b92ba19c`;
6. fsyncs and verifies the final two-policy witness chain plus the retained V4
   protected predecessor.

The original `65b...` backup is never renamed, overwritten or deleted.

## GREEN state

`EPOCH2_V6R2_POLICY_HEAD_REBOUND_WITH_65B_AND_B92_POLICIES_RETAINED`
requires:

- current live policy exactly matches the requested HEAD;
- exact original `65b...` backup remains present;
- exact `b92...` backup is present;
- retained V4 protected predecessor remains exact;
- no V2 stage exists.

## Rollback and failure truth

If failure occurs after the live exchange, V2 reverses the exact current-policy
exchange back to the `b92...` generation and removes only the newly staged
current policy after identity verification.

If the `b92...` backup was already published, rollback exchanges that exact
backup with the live policy, then removes the displaced new policy from the
`b92...` backup pathname. The original `65b...` witness is untouched.

Publication truth is monotonic. Any failure after exchange reports that policy
publication occurred even when rollback later returns to READY. An unproven
rollback reports UNKNOWN final state and never authorizes automatic retry.

## Authority boundary

This lane does not authorize or perform:

- native or runner replacement;
- live native/runner execution;
- credential or private-key access;
- signing;
- transaction construction/submission/broadcast;
- RPC calls;
- payment acceptance;
- public presale activation;
- WC/VOID market activation;
- service/systemd mutation;
- treasury/liquidity action;
- funds movement.

After a separately authorized GREEN second-hop rebind, V5 installed
qualification must run against the same exact HEAD before the already-authorized
V3R dormant-candidate live-binding proof is retried.

PROTECT THE CORE.

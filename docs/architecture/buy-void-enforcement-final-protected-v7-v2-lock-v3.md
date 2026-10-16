# Buy VOID final protected V7/V2 enforcement acceptance lock v3

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V3`.

Status: **source/CI acceptance of one exact protected V7/V2 V3 candidate only**.

## Exact candidate

This lock consumes the exact unaccepted V3 candidate from #3247 at
`c40710aab6bbd86fccce2385c7dfb3f64d454e57`.

Hosted run `38846038425` produced byte-identical candidate output on Node
22/24/26:

- Node 22 artifact `12022239687`;
- Node 24 artifact `12023296743`;
- Node 26 artifact `12022978712`;
- candidate bytes `18142`;
- candidate SHA-256
  `163feaeb76d185c3bce1cf13e9189cacb3848eb3fc676882dfbd799d7959306b`;
- candidate Git blob SHA-1
  `33188cccf898f5f8f785039415c083e9a69a66f6`;
- candidate enforcement-set SHA-256
  `e3430aee5444c8c45bea682d8bad8f7fc5b99d0eeaad002f4fd10b1a5201dd45`.

The candidate is rooted in protected census V5
`voidbefv7c5_15bb0ac8cfebf0f70b20442dd80bb84ea4bef4e0b50eefff71363237a0bf6c47`
and records exact current-head revalidation at the accepted candidate head.

## Candidate-head re-execution

Unlike the historical V2 candidate, V3 intentionally records the exact
repository head/tree used for its current census revalidation. Therefore a child
lock branch must **not** redefine the candidate by re-running the V3 proof at the
child HEAD.

The V3 lock proof instead:

1. requires candidate head `c40710aa...` to be an ancestor;
2. pins the exact V3 derivation-proof Git blob;
3. creates a detached Git worktree at the exact candidate head;
4. reuses only the already-built dependency/dist trees from the lock checkout;
5. re-executes the candidate proof there;
6. requires exact hosted bytes/hash/Git-blob/enforcement-set identity; and
7. requires the committed candidate object to be byte-identical.

This preserves the parent candidate identity while independently re-executing
its derivation.

## Provider truth binding

The accepted V3 candidate explicitly distinguishes:

```text
historical_lock_proof_reexecuted=false
current_content_semantics_requalified=true
```

The lock carries both facts as part of the accepted provider identity. It does
not convert current-content requalification into a false claim that a historical
parent proof ran successfully.

## Acceptance boundary

Only these facts are promoted:

```text
complete_executable_closure_verified=true
current_enforcement_tracked_source_inventory_verified=true
candidate_enforcement_identity_accepted=true
```

These remain false:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

The existing deployment-receipt planner is used only in `--plan` mode to prove
that the generic accepted-lock contract can consume this V3 lock while
recomputing the current 49-path protected inventory. No deployment receipt is
applied.

Historical V1/V2 candidate/lock evidence remains frozen and is not repinned.

## Authority

Source/test/CI only.

No Precision install/apply, runtime/service/RPC mutation, credential/key/wallet
or signer access, transaction construction/signing/broadcast, Chain-2050 or WC
mutation, payment acceptance, presale/market activation, validator action,
inventory/treasury/liquidity action, or funds movement is authorized or
performed.

**PROTECT THE CORE.**

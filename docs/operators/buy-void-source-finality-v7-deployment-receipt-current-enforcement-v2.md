# Buy VOID V7 deployment receipt — exact current-enforcement plan V2

## Purpose

This successor composes the settled #2945 create-once root custody semantics with
the current accepted recursion-free V7 enforcement lock, while closing the
stale-lock to newer-runtime authority gap.

The accepted lock is not sufficient merely because its JSON and candidate files
are still tracked. Before a deployment plan exists, the unprivileged prepare
phase executes the exact reviewed
`scripts/prove_buy_void_enforcement_post2933_candidate_v2.mjs --derive`
against the exact deployment source generation and requires its output bytes to
equal the committed accepted candidate byte-for-byte.

Current accepted evidence:

- candidate Git blob:
  `622807eaf246cae558186bbd1922aebda9025f72`;
- candidate SHA-256:
  `1472ac34b6bd6b2bcf24ef3934e95121fa95b3b8406e20c7e0160d3faabc0b6f`;
- accepted enforcement set:
  `f1f3fbdd0a015fdabf8da924a53a87174663d38cdde182cdc036cf0f9a3407bd`;
- source inventory:
  `4e86bb6f22dbd0e8908697291b78309c295cd316603532a3eb7ccfcc877749d5`;
- artifact inventory:
  `cf36522638c099f7b8c5036fb32d943d6fe543329a36519e69cf2d9fb0105dd0`;
- accepted lock Git blob:
  `af89fe4f852a1480da4e5e72ddf2ccd3be46aed3`.

## Two-phase boundary

### Unprivileged prepare

`--plan`:

1. binds exact main commit/tree and clean state;
2. rederives the complete 27-source/27-artifact candidate using the pinned V2
   proof;
3. requires exact byte equality with the committed accepted candidate;
4. verifies the exact accepted V2 lock/candidate tuple;
5. derives the V7 deployment receipt; and
6. emits one content-addressed `voidbsfdplan1_...` plan containing process
   identity, candidate/lock/source/artifact identities, receipt ID/bytes hash and
   fixed destination.

Changing any watched enforcement source/build/package/provider/saga member,
including a member outside the narrow V7 reviewed-source subset, prevents plan
issuance while the old candidate/lock remains.

### Privileged publication

`--apply` accepts only:

- an exact absolute plan file;
- its separately reviewed expected plan ID and exact file SHA-256; and
- the explicit receipt-create confirmation.

Apply does not inspect Git, execute the candidate proof, run package discovery,
or decide whether the enforcement candidate is current. It validates the closed
plan/content IDs and performs only the settled #2945 descriptor-bound,
create-once publication.

## Custody

Publication preserves the settled #2945 protections: descriptor-relative parent
custody, grandparent fsync for newly created parent directories, immediate temp
inode capture, exact-inode cleanup, foreign-substitution preservation,
observable cleanup failures, no-clobber publication, and O_NOFOLLOW
descriptor-bound final readback.

## Authority

Source/CI only. No deployment receipt is installed on Precision by this change.
No protected source installation, service/config/RPC mutation,
credential/key/wallet/signer access, payment, transaction, Chain-2050/WC,
inventory/treasury/liquidity, presale activation or funds movement occurs.

A later protected-source/privileged-launcher lane remains separately required.

PROTECT THE CORE.

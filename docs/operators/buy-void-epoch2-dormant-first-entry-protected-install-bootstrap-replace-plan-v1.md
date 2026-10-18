# Buy VOID Epoch-2 repaired V6 bootstrap atomic-replacement plan V1

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_REPLACE_PLAN_V1`.

Status: **read-only replacement planning only; no replacement/apply authority**.

## Purpose

Merged #3483 repaired the V6 repository observer so standard Git cruft-pack
`pack-<oid>.mtimes` metadata is admitted as non-authoritative auxiliary
metadata.

The repaired V6 source/candidate/lock/materializer/install/qualification/planner
generation is source/CI-green, but Precision may already contain the preceding
V6 root at the same fixed pathname. The existing create-only installer must not
be misused as overwrite authority.

This gate proves whether that exact old protected root is eligible for a future
versioned atomic replacement with the repaired generation.

It does **not** implement or execute the replacement.

## Canonical repaired target

Merged source generation:

`main@aee763c1bcf66d0852fb670e80c1011767946cc8`

Accepted repaired lock:

`voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`

Repaired candidate:

`voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`

Target V6 ELF:

- bytes: `874608`;
- SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`;
- Git blob:
  `b577d70666f98ac59a75b84b3dab741fe7b93a4b`.

Target source-generation V3 manifest:

- bytes: `2382`;
- SHA-256:
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`;
- Git blob:
  `de56bacb30bea0adc418e240cf3fb8d900b061ef`.

## Exact predecessor required

The plan admits only the exact pre-cruft V6 generation already protected by the
same V6 root contract.

Expected live bootstrap:

- bytes: `874608`;
- SHA-256:
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`;
- Git blob:
  `a91707c3e5803071fc73c3451c9bcb3b774f8b48`.

Expected live source-generation manifest:

- bytes: `2382`;
- SHA-256:
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`;
- Git blob:
  `6e0630af72111bd9976dcc38cdcdada1904dd067`.

Historical accepted lock:

`voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`.

Any other installed generation HOLDs. The planner does not infer upgrade
eligibility from pathname existence alone.

## Fixed root and policy

The live root remains:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6`

Exact entries remain:

```text
bin/
  void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6
source-generation-v3.conf
policy-v1.conf
```

The predecessor policy uses the same V6 schema as the repaired target:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6`

The plan requires the installed policy to be exactly five ordered,
newline-terminated rows:

```text
schema=...
python_sha256=...
python_bytes=...
git_sha256=...
git_bytes=...
```

Its Python/Git identities must still equal the current root-protected fixed
`/usr/bin/python3` and `/usr/bin/git` targets. The repaired target policy
must then reproduce exactly the same bytes.

A changed host tool generation therefore HOLDs instead of silently carrying an
obsolete policy into the replacement.

## Replacement auxiliary namespace

The future replacement design is reserved to:

```text
/opt/.void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6.repair-mtimes.stage
/opt/.void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6.predecessor-precruft
```

Both must be absent at plan time. The legacy create-only stage must also be
absent.

These names are planning evidence only; this gate never creates them.

## Git/check-out authority

The planner reuses the exact merged #3483 install helper at Git blob:

`438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84`.

That supplies the reviewed V6 private Git observation boundary, clean-current
HEAD/tree checks, root-protected Git/Python snapshots, canonical manifest
object check, and exact repaired accepted-lock verification.

The plan may create only the helper's private temporary Git metadata used for
read-only repository observation. It must report:

```text
source_repository_mutation=false
temporary_git_metadata_write_required=true
protected_filesystem_mutation=false
target_root_mutation=false
```

No protected root or source-repository bytes are changed.

## Plan identity

The returned plan is content-addressed:

`voidbuye2bootstrapreplaceplan1_<sha256(canonical plan body)>`

The body binds:

- explicit clean current HEAD/tree;
- repaired accepted lock/candidate;
- repaired bootstrap/manifest input generations;
- exact predecessor installed generation;
- current Python/Git tool generations;
- exact unchanged V6 policy;
- live/stage/predecessor root names;
- future replacement semantics.

A GREEN plan requires:

```text
create_only=false
atomic_root_exchange_required=true
predecessor_retention_required=true
automatic_rollback_required=true
replacement_apply_authorized=false
```

## Future exchange design

This plan intentionally grants no mutation authority.

A separately reviewed future apply gate may use the repository's existing
reviewed protected atomic-upgrade pattern:

1. stage the repaired generation under the reserved hidden stage;
2. revalidate plan bindings and predecessor immediately before mutation;
3. atomically exchange stage and live root with
   `renameat2(RENAME_EXCHANGE)`;
4. verify repaired live root and exact old generation now at the stage name;
5. retain the old generation under the reserved predecessor name using
   create-only rename;
6. on any post-exchange failure, atomically restore the predecessor, verify the
   rollback, and truthfully report publication/rollback/close state.

That future protocol requires its own source proof and separate host
authorization.

## Deliberate non-execution

This gate contains no `--apply` mode and no `apply()` function.

It does not:

- create/remove/exchange protected paths;
- execute either V6 bootstrap;
- execute the inner installer;
- mutate services/systemd;
- touch credentials/private keys;
- sign or submit transactions;
- accept payments;
- activate presale/WC;
- move treasury/liquidity/funds.

A GREEN plan advances only to:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_V6_ATOMIC_REPLACEMENT_V1`

**PROTECT THE CORE.**

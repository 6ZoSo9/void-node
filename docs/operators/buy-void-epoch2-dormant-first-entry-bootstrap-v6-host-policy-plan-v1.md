# Buy VOID Epoch-2 dormant first-entry bootstrap V6 host-policy plan V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_HOST_POLICY_PLAN_V1`.

Status: **source/test/CI plus future read-only Precision planning only**.

## Purpose

Accepted #3461 materializes the exact dormant first-entry bootstrap V6 ELF and
source-generation V3 manifest, but deliberately excludes the host policy because
that policy must bind the real Precision generations of:

- `/usr/bin/python3`;
- `/usr/bin/git`.

This gate derives that policy and a content-addressed create-only installation
plan without executing the bootstrap and without writing `/opt`.

## Exact parent generation

Stacked parent:

`#3461 @ 9cde0dc5aa579d31d404759a1652e501c640d561`.

Bound materializer generation:

- materializer Git blob:
  `3a937c756a91ad2565897f1ae5d881f9fa2f41c6`;
- proof Git blob:
  `58ae5cb2c3c4f47aa56744e4202c0b45db1416ef`;
- workflow Git blob:
  `5347246d7aec42377a366058c5156f3d7e8cc2d9`;
- operator-doc Git blob:
  `0d141b39670de03cba791504d1d27ee56f588db5`.

Accepted bootstrap lock:

`voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`.

Accepted candidate:

`voidbuye2dormantbootstrapcand3_13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062`.

## Accepted install inputs

Bootstrap V6:

- bytes: `874608`;
- SHA-256:
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`;
- Git blob:
  `a91707c3e5803071fc73c3451c9bcb3b774f8b48`;
- materialized mode: `0555`.

Source-generation V3 manifest:

- bytes: `2382`;
- SHA-256:
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`;
- Git blob:
  `6e0630af72111bd9976dcc38cdcdada1904dd067`;
- materialized mode: `0444`.

The plan reopens both supplied artifact paths with `O_NOFOLLOW`, retains the
descriptors during hashing, and requires the visible path to remain the same
generation through the read.

## Precision host-tool measurement

A real future `--plan` is deliberately non-root.

It verifies the clean current `main` checkout at the exact supplied HEAD and
then measures the fixed host aliases:

```text
/usr/bin/python3
/usr/bin/git
```

For each tool it requires:

- root-owned alias;
- root-owned, non-group/world-writable ancestry;
- canonical root-owned executable target;
- single-link regular target;
- no setuid/setgid;
- retained descriptor identity across the read;
- unchanged alias and canonical target generation;
- exact byte count and SHA-256.

No host write occurs.

## Exact V6 host policy

The plan derives exactly these five ordered rows with one final LF:

```text
schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6
python_sha256=<64 lowercase hex>
python_bytes=<positive decimal>
git_sha256=<64 lowercase hex>
git_bytes=<positive decimal>
```

The plan binds policy byte count, SHA-256 and Git-blob identity.

No caller-supplied policy bytes are accepted.

## Create-only installation contract

The future installation target is fixed:

```text
/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6/
  bin/
    void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6
  source-generation-v3.conf
  policy-v1.conf
```

Planned ownership/modes:

- root directory: `root:root 0755`;
- `bin/`: `root:root 0755`;
- bootstrap: `root:root 0555`;
- manifest: `root:root 0444`;
- policy: `root:root 0444`.

The read-only plan requires the final root to be absent and classifies it only as:

`ABSENT_READY_FOR_CREATE_ONLY_INSTALL`.

It does not overwrite, replace, repair or adopt an existing root.

## Plan identity

The plan ID namespace is:

`voidbuye2dormantbootstraphostplan1_<sha256>`.

The digest covers:

- exact current checkout head/tree;
- accepted source/lock/materializer identities;
- exact source artifact generations;
- measured Python and Git generations;
- exact policy bytes and identities;
- fixed create-only installation contract;
- all false authority flags.

Any host-tool, checkout, artifact or policy change therefore creates a different
plan identity or fails closed.

## CI boundary

CI runs only:

- exact stacked-scope/dependency checks;
- Python syntax;
- static proof;
- `--self-test`;
- `--source-plan`;
- diff hygiene.

CI does **not** run production `--plan` because only real Precision tool
generations are valid for that evidence.

## Authority boundary

This gate authorizes none of the following:

- `/opt` mutation;
- bootstrap installation or execution;
- inner protected-installer apply;
- service/systemd mutation;
- credential/private-key access;
- signing;
- RPC or transaction action;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

A future GREEN Precision `--plan` is still only read-only evidence.

The next separately authorized gate is:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_BOOTSTRAP_V6_CREATE_ONLY_INSTALL`.

**PROTECT THE CORE.**

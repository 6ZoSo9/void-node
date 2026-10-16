# Buy VOID Epoch-2 native V3 protected create-only install v1

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V1`.

Status: **source/CI installer contract only; no Precision installation or live
credential/signing invocation authorized or performed**.

## Purpose

Consume the exact accepted V3 identity lock merged through #3218 and define the
first complete protected installation root required by the native Epoch-2
credential-composition preentry.

Accepted lock:

`voidbuye2nativecandlock3_024c9e3818a40616fc8b198f605721bf76ed43d6d4f186bf02a202d46860a659`

Lock Git blob:

`57f965a944031eac90d69b4104b0f8f2473e66cc`

This lane does not execute the accepted native candidate. It only defines a
future separately authorized create-only installation transaction.

## Fixed protected root

A successful future apply publishes exactly:

```text
/opt/void-buy-void-epoch2-live-composition-v2/
  void_buy_void_epoch2_live_composition_native_preentry_v1
  void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs
  policy-v1.conf
```

Accepted native identity:

- 726,976 bytes;
- SHA-256
  `78a5159f7286dd107cb34568fe12e9758563123e8bda8c8cccc96eaf6c37c589`;
- future installed mode 0555.

Accepted V2 runner identity:

- source Git blob `92e8c8696ea7e2bb81b6ef089db8baa657188935`;
- 30,103 bytes;
- SHA-256
  `2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73`;
- future installed mode 0444.

The ELF bytes are **not** committed to the repository. A future operator must
supply one normalized absolute candidate path whose retained descriptor read is
single-link, non-symlink, non-group/world-writable, exactly 726,976 bytes and
matches the accepted SHA-256.

## Policy binding

The installed policy has exactly six newline-terminated fields:

```text
schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1
expected_head=<exact clean main HEAD>
runner_sha256=2ba779e98b76cd24c6b24de38b77dfded5ce7dd35869b8dd99490d3aa653af73
runner_bytes=30103
node_sha256=<descriptor-stable /usr/bin/node SHA-256>
node_bytes=<descriptor-stable /usr/bin/node bytes>
```

The installer does not accept caller-supplied Node hashes. It reads fixed
`/usr/bin/node` itself and requires direct, root-owned, root-group,
single-link, non-group/world-writable, non-setid executable custody beneath
trusted `/`, `/usr` and `/usr/bin`.

The expected head is not a free policy label. Plan/apply require:

- exact current checkout HEAD equality;
- symbolic branch `main`;
- clean tracked/untracked state;
- accepted #3218 merge in ancestry;
- exact accepted lock and runner Git objects.

The same repository head and Node generation are revalidated immediately before
publication and again after publication before GREEN.

## Atomic create-only publication

The fixed final root and fixed staging root must both begin absent.

A future apply requires:

- root;
- Python isolated mode;
- exact confirmation
  `INSTALL_ACCEPTED_EPOCH2_NATIVE_V3_CREATE_ONLY_V1`;
- reviewed loader/Python/Node injection variables absent.

Apply retains a no-follow descriptor for `/opt`, creates only the fixed staging
directory, then creates all three accepted leaves there using exclusive
no-follow creation.

For every staged leaf:

1. exact bytes are written;
2. final root ownership and final mode are applied;
3. descriptor metadata is checked;
4. the finalized file is fsynced;
5. the installed bytes are reopened/rechecked by retained-directory-relative
   name.

The staging directory must contain exactly the three reviewed leaves and is
fsynced before publication.

Immediately before publication, apply revalidates the exact repository
generation, exact `/usr/bin/node` generation, retained/visible `/opt`
identity, and final-root absence.

The whole staging directory is then published with Linux
`renameat2(RENAME_NOREPLACE)`. It never intentionally exposes a partial final
root and never overwrites an existing final root.

## Failure truth and recovery boundary

Pre-publication failure may remove only the staging directory created by that
invocation. The receipt says whether staging existed and whether bounded cleanup
completed.

After the no-replace rename succeeds, the final root is never automatically
deleted. Parent fsync, current-main/Node revalidation and exact final-root
verification occur after the publication boundary.

Any failure after publication reports:

```text
protected_install_performed=true
publication=true
publication_state=published_needs_inspection
```

and records the bounded failure phase plus parent-fsync/final-verification facts.
It must never reinterpret a published root as no mutation.

An already-existing exact final root is idempotently reported
`status=ALREADY_GREEN`; unknown, partial, extra-entry, policy-drift, Node-drift
or source-head-drift state HOLDS.

## Hosted proof boundary

Hosted CI performs only:

- Python syntax/AST checks;
- exact source/lock identity checks;
- installer `--self-test`;
- inert `--source-plan`;
- native candidate tamper/symlink rejection in `/tmp`;
- Linux no-replace rename exercise in `/tmp`;
- missing confirmation and unprivileged root-required refusal.

Hosted CI never invokes production `--apply`, writes `/opt`, reads
credentials/private keys, starts/stops services, signs, constructs/broadcasts a
transaction, accepts payment, or activates presale/WC.

## Authority boundary

Even source/CI GREEN keeps false:

- Precision protected install performed;
- live execution;
- credential/private-key access;
- signing;
- transaction construction/submission/broadcast;
- payment acceptance;
- public presale activation;
- WC/VOID market activation;
- production-host evidence authority;
- funds movement.

The next gate after a separately authorized successful installation is an
**installed-root read-only qualification** binding the exact protected native,
runner, policy, Node and source-head generations before any live credential
composition can be considered.

PROTECT THE CORE.

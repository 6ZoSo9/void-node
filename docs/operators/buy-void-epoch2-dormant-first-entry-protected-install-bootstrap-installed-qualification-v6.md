# Buy VOID Epoch-2 protected-bootstrap installed qualification V6

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6`.

Status: **read-only qualification definition; no host installation or protected-installer apply authority**.

## Purpose

Qualify the installed V6 dormant first-entry bootstrap root after a separately
authorized create-only installation.

The qualifier is bound to the merged V6 installer source Git blob:

`c9dd842b620f2ed7c3fdd5876c222a419b6b0c68`.

It uses that installer as the canonical definition of:

- accepted V6 lock and candidate identity;
- fixed protected root and exact three-file layout;
- accepted bootstrap ELF identity;
- source-generation V3 manifest identity;
- root-custodied Python and Git snapshots;
- exact host policy bytes.

## Required installed generation

Fixed root:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6`

Exact layout:

- root: `0755 root:root`;
- `bin/`: `0755 root:root`;
- bootstrap: `0555 root:root`, 874608 bytes,
  SHA-256
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`,
  Git blob `a91707c3e5803071fc73c3451c9bcb3b774f8b48`;
- `source-generation-v3.conf`: `0444 root:root`, 2382 bytes,
  SHA-256
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`,
  Git blob `6e0630af72111bd9976dcc38cdcdada1904dd067`;
- `policy-v1.conf`: `0444 root:root`, byte-identical to the policy
  rederived from the current protected targets of `/usr/bin/python3` and
  `/usr/bin/git`.

The checkout must be clean exact `main` at the explicit expected head.

## Descriptor-bound self-test

The read-only qualification opens the installed bootstrap with
`O_NOFOLLOW`, verifies its full generation, hashes the retained descriptor,
and executes only:

`/proc/self/fd/<retained-fd> --self-test`.

The bootstrap self-test is reached before its root-only operational path. It
does not run an installer plan or apply.

The qualifier performs this descriptor-bound self-test twice. Complete
installed snapshots are collected before, between and after the executions.
All three snapshots and both self-test transcripts must be byte-for-byte
stable.

The proof includes a pathname-swap adversary. Replacing the visible bootstrap
after the FD is retained cannot redirect execution, and visible generation
drift still causes qualification HOLD.

## Authority boundary

The V6 installed qualification permits only the bootstrap's inert self-test.

It does **not** perform:

- bootstrap operational plan/apply execution;
- inner V5 installer execution;
- protected-installer apply;
- filesystem writes;
- service/systemd mutation;
- credential/private-key access;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale/WC activation;
- treasury/liquidity action;
- funds movement.

A GREEN host qualification advances only to:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_V6_PLAN`.

That later gate is plan-only and remains separate from the inner protected
installer apply.

PROTECT THE CORE.

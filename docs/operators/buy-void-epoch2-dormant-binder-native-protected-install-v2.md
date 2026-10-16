# Buy VOID Epoch-2 dormant binder native protected install V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2`.

Status: **source/test/CI only**. This source does not install anything on
Precision.

## Purpose

Install the exact accepted post-#3363 dormant-binder generation under the
fixed root required by the native first-entry contract:

`/opt/void-buy-void-epoch2-dormant-v3r-binding-v2`.

The accepted V3 lock is:

`voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`.

It accepts:

- candidate ID
  `voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d`;
- static native ELF: 726,976 bytes,
  SHA-256 `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`;
- binder source Git blob
  `9c29eb4716077e459b9154f39d0f30cf2e56729f`;
- binder source: 39,391 bytes,
  SHA-256 `afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e`.

## Installed generation

The protected root contains exactly two files:

```text
/opt/void-buy-void-epoch2-dormant-v3r-binding-v2/
  void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2
  void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs
```

Required ownership/modes:

- root directory: `root:root 0755`;
- native preentry: `root:root 0555`;
- binder source: `root:root 0444`.

The existing protected V6R2 policy and fixed `/usr/bin/node` remain outside
this install root and are independently checked by the native preentry at live
execution time.

## Create-only publication

A future separately authorized apply:

1. verifies the exact accepted V3 lock;
2. verifies exact clean `main` at the supplied expected head;
3. retains the exact accepted native candidate bytes in memory;
4. reads the exact binder bytes from the supplied head's Git object;
5. creates a hidden root-owned stage under `/opt`;
6. writes and fsyncs the exact native and binder files;
7. verifies the complete two-file staged root;
8. revalidates checkout, candidate, and binder identities;
9. publishes the complete directory with
   `renameat2(RENAME_NOREPLACE)`;
10. fsyncs `/opt` and verifies the exact installed generation.

An existing target root is never replaced.

## Failure truth and rollback

The authority receipt before mutation is explicitly scoped to the
`PRE_MUTATION` boundary.

The implementation keeps a monotonic `publication_occurred` fact. Once the
complete staged directory is published, a later failure cannot revert that
truth to false even if automatic rollback restores the pre-install state.

Before publication, cleanup may remove only the exact stage created by this
operation.

After publication, rollback may rename only the exact installed generation back
to the exact stage name, verify it, then remove those exact two files and the
stage directory.

Every failure emits a `FINAL_FAILURE_RECEIPT` with failure phase,
publication truth, rollback truth, and independently classified final protected
state.

## Authority boundary

Source existence, hosted proof, or a future install does **not** authorize:

- service or systemd mutation;
- native/binder live execution;
- credential or private-key access;
- signing;
- RPC or transaction construction/submission/broadcast;
- payment acceptance;
- public presale activation;
- WC/VOID activation;
- treasury/liquidity action;
- funds movement.

The next gate after a future GREEN install is a separately authorized
**read-only installed qualification** for the exact two-file protected
generation.

PROTECT THE CORE.

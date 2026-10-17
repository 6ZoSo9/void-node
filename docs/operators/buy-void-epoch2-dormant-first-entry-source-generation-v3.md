# Buy VOID Epoch-2 dormant first-entry source generation V3

Status: **source/CI-only immutable generation; not installed and not executed**.

## Purpose

Source-generation V3 supersedes V2 only for future install authority. Historical
V1/V2 source generations remain byte-frozen evidence.

The V2 generation still bound the stale first-entry launcher V1. V3 replaces
that single authority dependency with the accepted runtime-head launcher V2
from #3450/#3451 while retaining the frozen child protocol, payload namespace,
native candidate, runtime installer, private-Git witness, descriptor custody,
terminal-truth, cleanup and publication protections.

## Immutable generation

Manifest:

`ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf`

Exact identity:

- Git blob: `6e0630af72111bd9976dcc38cdcdada1904dd067`
- bytes: `2382`
- SHA-256:
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`
- source-generation ID:
  `voidbuye2dormantsourcegen3_aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`

## Current application sources

Inner installer V5:

- path:
  `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v5.py`
- Git blob: `ce6930bc1be8239a3171d4922c44b96a50f5778b`
- bytes: `127528`
- SHA-256:
  `c9fbb7ce1c1788b52837635243c6393fc731ef12a7217cc9155d6ff86bd97bfb`

Native bootstrap V6:

- path:
  `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6.c`
- Git blob: `a317d3dce324337f107909bd6e33e98622b3ef09`
- bytes: `106764`
- SHA-256:
  `c87110d83029c5c475a6ed1033dfaa1d94c3c173fe7c2e81c4a0daed88e81088`

## Launcher V2 authority

V3 binds the canonical runtime-head first-entry launcher V2:

- lock path:
  `ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.json`
- lock Git blob:
  `227c2fa449abf1387925373c706ecd07775d5898`
- lock bytes: `4548`
- lock SHA-256:
  `7c4c207fb01d9bb4d8f6ab72b458464bf258373c7601e40e7a8e2719e3b4630a`
- lock ID:
  `voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`
- candidate ID:
  `voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`
- launcher bytes: `731072`
- launcher SHA-256:
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`

Inner installer V5 requires the lock itself to prove:

- `runtime_head_contract_accepted=true`
- `canonical_main_candidate_authority=true`
- `superseded_v1_lock_install_authority=false`
- `runtime_expected_head_compile_bound=false`
- strict lowercase runtime-head admission
- unchanged runtime-head forwarding
- repository HEAD absent from the launcher ELF
- frozen-child launcher path compatibility preserved

A matching hash without those semantics is insufficient.

## Frozen child compatibility

The runtime child protocol deliberately remains V1-compatible:

- protected payload root:
  `/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1`
- payload policy schema:
  `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1`
- parent-proof schema:
  `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V1`

This is compatibility, not stale authority. Launcher V2 preserves those fixed
paths/protocol values while moving repository HEAD to authenticated runtime
input.

## Other bound inputs

Runtime installer remains:

- blob `f3d6b1559be7490303cf36338c4bfa38fdaa390a`
- bytes `57255`
- SHA-256
  `602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9`

Accepted native candidate remains:

- bytes `726976`
- SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`

Root-custodied host tools remain `/usr/bin/python3` and `/usr/bin/git`.

## V6 production namespace

The future V6 bootstrap root is:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6`

Its fixed inputs are:

- `bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6`
- `source-generation-v3.conf`
- `policy-v1.conf`

Host policy schema:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6`

The future policy binds exact host Python and Git generations.

## Operation namespace

- source generation prefix: `voidbuye2dormantsourcegen3_`
- plan prefix: `voidbuye2dormantfirstentryinstall5_`
- confirmation:
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V5_CREATE_ONLY`

## Proof boundary

The focused proofs preserve the V2-generation adversarial coverage:

- exact closed 35-row manifest grammar;
- all bound source and payload identities;
- raw Git tree/index/worktree comparison;
- private Git metadata and no object fetch;
- source witness lifetime through final parent validation;
- descriptor substitution and generation drift rejection;
- hostile environment / unsafe Python flag rejection;
- child resource clamping and cleanup;
- terminal state, stage identity, publication-aware receipts and close failures;
- V6 static native self-test, parser/candidate/checkout helper tests;
- dirty, staged, untracked, split-index, storage redirect, mode/symlink and
  missing-object rejection.

Earlier V1/V2/V4/V5 source generations are explicitly frozen in the proofs.

## Authority

This generation performs no production plan/apply and grants none.

Still false:

- configured helper execution;
- production bootstrap execution;
- protected install/apply;
- service/systemd mutation;
- credential/private-key access;
- signing;
- transaction/RPC;
- payment acceptance;
- presale/WC activation;
- treasury/liquidity action;
- funds movement.

A later candidate/lock/materializer/install lifecycle is required for V6.

**PROTECT THE CORE.**

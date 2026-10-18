# Buy VOID Epoch-2 repaired protected-bootstrap install V3

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V3`.

Status: **source/CI-only create-only install definition; no Precision apply authority**.

## Purpose

V3 is the create-only root-custody install successor to the repaired bootstrap V3
materialized by #3433.

It binds canonical acceptance lock V4 and repaired inner protected installer V2.
Historical V2R/V2/V1 install generations remain unchanged and non-authoritative.

## Canonical accepted generation

- lock ID:
  `voidbuye2bootstraplock4_6568c1cd0195405d49001fbf6cb9a086364e401f78f3bfcf1d6cbb080947cb67`
- lock Git blob: `57ecc08d465fe2a3c395546d349864312cd08a3f`
- candidate head: `78875f7379c2dd995e1b545dd0543c934e59907a`
- candidate tree: `a2c1b6b9989ceb11c4fbea3f2fc4ecf64eb50176`
- candidate ID:
  `voidbuye2bootstrapcand3_9e914f52eb3cde5a5fef42fbdf065b375f89fdabb768034b09615861bba67ce3`
- accepted ELF: 731072 bytes
- ELF SHA-256:
  `904e6b05df45bc9212be7689ea0617ccfbf65d5edf8535a381abcbb588f236cd`
- ELF Git blob:
  `69e3bf6db7baf614eb0b7d8c5e93aafce0deab46`

The V3 bootstrap source is blob
`2c3c9ed120cc9949a0528e43be886354aa25da5a`, 19765 bytes, SHA-256
`06c805fd24a777716c2ec78ed24b9116019ac29ae3adc42ba14b13f32d507d4e`.

Its fixed inner installer is repaired protected installer V2:
- blob `69a018c0eccedf3782055c56725579d02463b05e`;
- bytes `58454`;
- SHA-256
  `6db5c9520af7070056acfd854d79219053fbcb561f63e7530423974ddd80562a`.

## Materializer generation

Merged #3433 source/test generation:
- materializer blob `a62dc7c4e7ac4cde63c3473d0040c355aa28508e`;
- proof blob `f23a60dcd7ff0c3538cc2fef0929086c169365da`;
- materializer doc blob `1a0819831ce975c06a5c07da2e24ece26f7124b6`;
- materializer workflow blob `690aea8166d78ccd19a09a23bedf9e617ca34987`;
- hosted run `39013335476`;
- artifact `12094035689`.

Artifact naming is not authority. The installer independently re-hashes the
supplied bootstrap input before any publication.

## Fixed V3 namespace

Final root:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v3`

Exact entries:
- `bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3`
  — root:root, mode 0555;
- `policy-v1.conf` — root:root, mode 0444.

The policy schema is
`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V3`
and binds the exact root-protected `/usr/bin/python3` SHA-256 and byte count.

## Runtime-head model

The accepted V3 bootstrap is not compile-bound to repository HEAD.

Required accepted evidence:
```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_bootstrap=true
canonical_main_candidate_authority=true
superseded_v3_lock_install_authority=false
superseded_v2_lock_install_authority=false
superseded_v1_lock_install_authority=false
```

The installer itself still requires an explicit clean-main `--expected-head`
for plan/apply and fails closed on drift.

## Create-only publication

The V2R terminal-truth protocol is preserved:

1. exact read-only plan and operation-bound plan ID;
2. explicit V3 create-only confirmation;
3. root + isolated-Python apply context;
4. stage creation under trusted `/opt`;
5. stage dev/ino captured immediately;
6. `O_EXCL|O_NOFOLLOW` file creation;
7. root ownership/final modes/fsync;
8. checkout/Python/accepted-lock/bootstrap-input revalidation;
9. complete stage verification;
10. `renameat2(..., RENAME_NOREPLACE)`;
11. parent fsync and final verification;
12. no postpublication rollback.

Prepublication cleanup is allowed only for the exact stage generation created by
the same invocation. Unknown/replaced state fails closed.

Any close failure after publication remains publication-aware and may not
regress to `publication=false`.

## Deliberate non-execution

This installer never executes:
- the V3 bootstrap;
- repaired inner installer V2;
- dormant-binder native/binder code;
- services/systemd.

Source CI runs only syntax, static/adversarial proof and `--source-plan`. It
does not run sudo or `--apply`.

## Authority

This source gate does not authorize Precision apply.

All remain false:
- bootstrap execution;
- protected-installer apply;
- live execution;
- credential/private-key access;
- signing;
- transaction/RPC;
- payment acceptance;
- presale/WC activation;
- treasury/liquidity action;
- funds movement.

After a separately authorized GREEN install, next gate:

`SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_BOOTSTRAP_INSTALLED_READ_ONLY_QUALIFICATION_V3`.

**PROTECT THE CORE.**

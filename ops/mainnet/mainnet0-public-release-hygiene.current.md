# VOID Mainnet-0 Public Release Hygiene

status: planned_not_released
launch_state: not_go_for_public_mainnet0
launch_approval: false
mutation_allowed: false
money_step: last
operator_label: zoso

## Purpose

This document records the public release hygiene gate for Mainnet-0.

It is not launch approval.
It is not a release artifact.
It is not a funding artifact.
It does not authorize validator admission.
It does not authorize authority transfer.
It does not authorize publication of secret-bearing files.

## Current proven baseline

- current_cross_box_commit: e7b01dca
- current_cross_box_tag: ckpt-mainnet0-key-ceremony-result-template-green-20260521-024745
- key_ceremony_plan: green
- key_ceremony_result_template: green
- final_gonogo_map: NO_GO
- public_validator_admission: candidate_only_for_mainnet0
- public_active_admission_enabled: false

## Required before public release

Before any public Mainnet-0 release/export:

1. The public release tree must be rebuilt from the current intended release commit.
2. Secret-bearing paths must be excluded.
3. Runtime artifacts must be excluded unless explicitly marked public-safe.
4. Local proof logs must be excluded.
5. Wallet files, keystores, private keys, mnemonic phrases, passphrases, and seed material must be excluded.
6. Devnet, testnet, Anvil, and throwaway credentials must be excluded.
7. Public release tree secret scan must pass.
8. Mainnet-0 current baseline proof must pass.
9. Mainnet-0 final go/no-go map proof must pass.
10. Mainnet-0 key ceremony plan proof must pass.
11. Mainnet-0 key ceremony result template proof must pass.
12. Public validator admission must remain candidate_only_for_mainnet0 unless separately approved.
13. Public active validator admission must remain disabled unless separately approved.
14. Buy VOID claim/send must remain blocked unless explicitly verified and recorded.
15. Launch approval must remain false unless a separate explicit launch approval artifact is written and proved.

## Must never be included in public export

- .secrets/
- private key files
- mnemonic or seed phrase files
- keystore JSON
- passphrase files
- local wallet files
- .env files containing secrets
- runtime private artifacts
- proof logs containing sensitive paths or private data
- cache/
- out/
- node_modules/
- local database files
- local operator-only scripts containing live credentials

## Required public-safe release contents

The public release may include:

- source code intended for public review
- public docs
- public proof scripts
- public-safe plan artifacts
- public-safe templates
- public ABI and interface files
- public Mainnet-0 NO-GO status docs
- public launch blockers docs
- public validator candidate-only policy docs

## Current decision

NO-GO.

- Public release export is gitleaks-clean at 72f536d0 / ckpt-public-release-export-gitleaks-clean-green-20260523-091412 with gitleaks_rc=0 and findings=0.
This hygiene lane prepares the public release boundary. It does not publish, approve, fund, or mutate anything.

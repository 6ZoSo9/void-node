# VOID Mainnet-0 Public Release Hygiene

status: public_live_release_hygiene_green
launch_state: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
launch_approval: true
mutation_allowed: true
mutation_allowed_scope: launch_state_public_surface_status_only
money_step: ops_seed_complete_future_spend_guarded
operator_label: zoso

## Purpose

This document records the public release hygiene gate for Mainnet-0 after public-live promotion.

It is not a new launch approval.
It is not a funding artifact.
It does not authorize validator admission.
It does not authorize authority transfer.
It does not authorize publication of secret-bearing files.
It does not authorize additional treasury spend.

## Current proven baseline

- current_cross_box_commit: 6afa564c
- current_cross_box_tag: ckpt-root-readme-public-docs-green-20260524-084138
- public_live_closeout: 6c8fa0df / ckpt-mainnet0-public-live-closeout-green-20260524-075712
- public_docs_index: 96ab31f7 / ckpt-mainnet0-public-docs-index-green-20260524-082202
- public_announcement_pack: 718519c1 / ckpt-mainnet0-public-announcement-pack-green-20260524-083654
- root_readme_public_docs: 6afa564c / ckpt-root-readme-public-docs-green-20260524-084138
- final_gonogo_map: GO_PUBLIC_MAINNET0
- public_validator_admission: candidate_only_for_mainnet0
- public_active_admission_enabled: false
- vault126_onboarding_executed: false
- future_treasury_spend: separately_guarded

## Required for public release hygiene

For this public-live release state:

1. The public release tree must be rebuilt from the current intended release commit.
2. Secret-bearing paths must be excluded.
3. Runtime private artifacts must be excluded unless explicitly marked public-safe.
4. Local proof logs must be excluded.
5. Wallet files, keystores, private keys, mnemonic phrases, passphrases, and seed material must be excluded.
6. Devnet, testnet, Anvil, and throwaway credentials must be excluded.
7. Public release tree secret scan must pass.
8. Mainnet-0 current baseline proof must pass.
9. Mainnet-0 final go/no-go map proof must pass.
10. Mainnet-0 public onboarding pack proof must pass.
11. Mainnet-0 status smoke must pass.
12. Public validator admission must remain candidate_only_for_mainnet0 unless separately approved.
13. Public active validator admission must remain disabled unless separately approved.
14. Buy VOID claim/send must remain explicit, payment-verified, and tx-ref-recorded.
15. Additional treasury spend must remain blocked unless separately dry-run, broadcast, and post-state proved.

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
- public Mainnet-0 public-live status docs
- public launch notes and onboarding docs
- public validator candidate-only policy docs

## Current decision

PUBLIC-LIVE HYGIENE GREEN, subject to sanitized export passing.

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

Public active validator admission remains disabled.
Public validator registration remains candidate/waiting only.
Vault126 onboarding has not executed.
Future treasury spend remains separately guarded.

# VOID Network Mainnet-0 public launch/share checklist

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
base_checkpoint: d9c29433 / ckpt-current-status-public-release-summary-discoverability-pointer-green-20260603-132008
base_closeout: /tmp/current-status-public-release-summary-discoverability-pointer-crossbox-closeout-20260603-132655.log
summary_doc: docs/public/mainnet0-public-release-status-summary.md
participant_entry: /participant

## Purpose

Use this checklist before posting about VOID Network on Reddit, X/Twitter, Discord, GitHub, or any public channel.

The goal is simple: public posts should send people through the safe path only.

## Safe public path

1. Start from the root README.
2. Open the Mainnet-0 public release status summary.
3. Read what is safe now and what remains guarded.
4. Open the participant page.
5. Start with Wallet.
6. Use guided actions only.

Canonical path:

README.md -> docs/public/README.md -> docs/public/mainnet0-public-release-status-summary.md -> /participant

## Safe things to say publicly

- VOID Network Mainnet-0 is public-live.
- Users can run a node.
- Users can open the participant page.
- Users can create or unlock an Account Wallet.
- Users can earn WC through approved useful work.
- Users can use DataNet publish/read/verify flows.
- Users can create a guided Buy VOID request from the participant page.
- Users can preview staking and validator candidate/waiting status.
- The public trust-boundary stack is green.

## Required warnings in public posts

Include these boundaries when the post discusses money, staking, or onboarding:

- Buy VOID payment confirmation is not VOID fulfillment.
- VOID delivery requires operator verification and an explicit recorded VOID tx ref.
- Use the participant page before sending anything.
- Use a self-custody wallet.
- Blind deposits, exchange sends, and custodial sends are not supported.
- Wallet sends and WC-to-VOID swaps require explicit unlock/sign confirmation.
- Public validator registration is candidate/waiting only.
- Active validator admission remains capped, proof-backed, and operator-governed.

## Do not say

- Do not say exchange or custodial sends are supported.
- Do not say payment confirmation automatically sends VOID.
- Do not say public validator registration makes someone an active validator.
- Do not say wallet sends or swaps are automatic.
- Do not imply treasury spend or authority changes are unguarded.
- Do not ask users to send blind deposits.
- Do not paste private keys, secrets, seed phrases, or operator-only data.

## Short post footer

Safe path: start from the README, read the public release status summary, then use the participant page. Guided actions only. No blind deposits. Payment confirmation is not VOID fulfillment. Public validator registration is candidate/waiting only.

## Proof-backed safety line

public_release_summary_discoverability: green
public_trust_boundary_stack: green
root_readme_link: true
public_docs_readme_link: true
summary_doc: docs/public/mainnet0-public-release-status-summary.md
buy_void_fulfillment: false
validator_mutation: false
public_active_validator_admission: disabled
public_validator_registration: candidate_waiting_only
runtime_ready: true
runtime_gap: 0
txroot_live: 1

## Public share templates

- [Mainnet-0 public share posts](mainnet0-public-share-posts.md)

Use these templates after this checklist so public posts keep the safe path and required warnings.
